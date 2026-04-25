"""
Service de requête des commentaires de formation pour l'UI Plan d'action.

Ce module est volontairement indépendant de ``CommentaireViewSet`` : il
reproduit le même cadrage de visibilité par centres (règles alignées sur
``get_queryset`` du viewset des commentaires) afin d'alimenter un endpoint
d'agrégation sans modifier l'API historique.
"""

from __future__ import annotations

from collections import OrderedDict
from datetime import date
from typing import Any

from django.db.models import QuerySet
from django.utils import timezone

from ..api.roles import is_admin_like, is_centre_scoped_staff, staff_centre_ids
from ..models.commentaires import Commentaire


def appliquer_scope_utilisateur_commentaires_formation(
    user,
    qs: QuerySet[Commentaire],
) -> QuerySet[Commentaire]:
    """
    Restreint le queryset aux commentaires visibles par l'utilisateur, comme
    le viewset des commentaires de formation (admin : pas de filtre centre,
    profils gérés par centre : filtre sur ``formation__centre_id`` ; autres :
    vide).

    Args:
        user: Utilisateur de la requête (authentifié).
        qs: Queryset de base sur ``Commentaire``.

    Returns:
        QuerySet[Commentaire]: Périmètre filtré, éventuellement vide.
    """
    if is_admin_like(user):
        return qs
    if is_centre_scoped_staff(user):
        centre_ids = staff_centre_ids(user)
        if not centre_ids:
            return Commentaire.objects.none()
        return qs.filter(formation__centre_id__in=centre_ids)
    return Commentaire.objects.none()


def construire_queryset_commentaires_plan_action(
    user,
    *,
    date_debut: date | None,
    date_fin: date | None,
    centre_id: int | None,
    centre_ids: list[int] | None,
    formation_id: int | None,
    formation_ids: list[int] | None,
    inclure_archives: bool,
) -> QuerySet[Commentaire]:
    """
    Construit le queryset de commentaires pour l'endpoint de regroupement
    journalier (filtre période, centre, formation, statut actif par défaut).

    Les paramètres ``date_debut`` / ``date_fin`` filtrent sur la **date
    calendaire** de ``created_at`` (côté serveur, cohérent avec
    l'indexation en base). Au moins l'un des deux doit être fourni en amont
    par l'appelant pour éviter un balayage complet de la table.

    Args:
        user: Utilisateur de la requête.
        date_debut: Borne basse (incluse) sur ``created_at__date`` ou ``None``.
        date_fin: Borne haute (incluse) sur ``created_at__date`` ou ``None``.
        centre_id: Filtre optionnel sur ``formation__centre_id`` (un seul id).
        centre_ids: Filtre optionnel sur plusieurs ``formation__centre_id`` (prioritaire sur ``centre_id`` si non vide).
        formation_id: Filtre optionnel sur un seul ``formation_id``.
        formation_ids: Filtre optionnel sur plusieurs ``formation_id`` (prioritaire sur ``formation_id`` si non vide).
        inclure_archives: Si False, exclut les commentaires archivés.

    Returns:
        Queryset ordonné par ``-created_at``, prêt à être compté puis limité.
    """
    qs: QuerySet[Commentaire] = (
        Commentaire.objects.select_related("formation", "formation__centre", "created_by")
        .order_by("-created_at")
        .all()
    )
    qs = appliquer_scope_utilisateur_commentaires_formation(user, qs)
    if date_debut is not None:
        qs = qs.filter(created_at__date__gte=date_debut)
    if date_fin is not None:
        qs = qs.filter(created_at__date__lte=date_fin)
    if centre_ids is not None and len(centre_ids) > 0:
        qs = qs.filter(formation__centre_id__in=centre_ids)
    elif centre_id is not None:
        qs = qs.filter(formation__centre_id=centre_id)
    if formation_ids is not None and len(formation_ids) > 0:
        qs = qs.filter(formation_id__in=formation_ids)
    elif formation_id is not None:
        qs = qs.filter(formation_id=formation_id)
    if not inclure_archives:
        qs = qs.filter(statut_commentaire=Commentaire.STATUT_ACTIF)
    return qs


def regrouper_commentaires_par_jour_local(
    commentaires: list[Commentaire],
) -> list[dict[str, Any]]:
    """
    Regroupe des instances ``Commentaire`` par jour calendaire (fuseau
    ``Europe/Paris`` via :func:`django.utils.timezone.localdate`).

    Chaque élément retourné contient la clé ``date`` (ISO), ``nombre`` et
    ``items`` (liste d'instances, ordre d'origine conservé par jour : du plus
    récent au plus ancien si l'entrée l'était déjà).

    Args:
        commentaires: Liste déjà tronquée / ordonnée du point de vue appelant.

    Returns:
        Liste de dictionnaires, triée par **date de jour** décroissante.
    """
    par_jour: "OrderedDict[date, list[Commentaire]]" = OrderedDict()
    for c in commentaires:
        d = timezone.localdate(c.created_at) if c.created_at else None
        if d is None:
            continue
        if d not in par_jour:
            par_jour[d] = []
        par_jour[d].append(c)

    jours_desc = sorted(par_jour.keys(), reverse=True)
    result: list[dict[str, Any]] = []
    for d in jours_desc:
        result.append(
            {
                "date": d.isoformat(),
                "nombre": len(par_jour[d]),
                "items": par_jour[d],
            }
        )
    return result
