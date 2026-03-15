# rap_app/api/viewsets/declic_viewset.py

from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone as dj_timezone
from django.utils.timezone import localdate
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ...api.roles import (
    is_admin_like,
    is_candidate,
    is_declic_staff,
    is_staff_or_staffread,
)
from ...models.centres import Centre
from ...models.declic import Declic, ObjectifDeclic
from ..permissions import IsDeclicStaffOrAbove
from ..serializers.declic_serializers import DeclicSerializer

# =====================================================================================
# 🔧 HELPERS SCOPE — (MANQUAIENT DANS TON FICHIER) → POUR L'AUTORISATION PAR CENTRES
# =====================================================================================


class ScopeMixin:
    """
    Mixin réutilisable pour toutes les ViewSets filtrant par centre.

    - Utilisé pour restreindre automatiquement les résultats d'un queryset selon les centres auxquels
      l'utilisateur a accès, selon son rôle.
    - La logique des droits d'accès précis dépend d'utilitaires (is_admin_like, is_candidate) fournis ailleurs,
      non documentés ici.
    """

    def _centre_ids_for_user(self, user):
        """
        Retourne la liste des centres accessibles selon le rôle.

        - Si l'utilisateur est admin (cf. is_admin_like), retourne None (accès complet sans filtre).
        - Sinon, tente de récupérer les centres via user.centres_acces ou user.centres et retourne leurs ids.
        - Si cette relation n'existe pas, retourne liste vide (aucun accès).
        """
        if is_admin_like(user):
            return None  # accès complet

        # déclic_staff = accès restreint à ses centres
        centres = getattr(user, "centres_acces", None) or getattr(user, "centres", None)

        if centres is not None:
            return list(centres.values_list("id", flat=True))

        return []  # par défaut aucun centre

    def _scope_qs_to_user_centres(self, qs):
        """
        Filtre un queryset sur les centres autorisés pour l'utilisateur courant.

        - Si l'utilisateur n'est pas authentifié OU est candidat : aucun résultat.
        - Si l'utilisateur est admin-like (cf. _centre_ids_for_user), aucun filtre appliqué.
        - Sinon, filtre les objets rattachés aux centres autorisés pour l'utilisateur.
        - Si aucun centre autorisé : aucun résultat.
        """
        user = self.request.user

        if not user.is_authenticated or is_candidate(user):
            return qs.none()

        centre_ids = self._centre_ids_for_user(user)

        if centre_ids is None:  # superadmin/admin
            return qs

        if len(centre_ids) == 0:
            return qs.none()

        return qs.filter(centre_id__in=centre_ids)


# =====================================================================================
# 📊 DÉCLIC VIEWSET — ATELIERS UNIQUEMENT
# =====================================================================================


@extend_schema_view(
    list=extend_schema(
        summary="Lister tous les ateliers Déclic",
        description="Retourne uniquement les ateliers Déclic (Atelier 1 → 6 + Autre).",
        parameters=[
            OpenApiParameter(name="annee", type=int),
            OpenApiParameter(name="centre", type=int),
            OpenApiParameter(name="departement", type=str),
            OpenApiParameter(name="type_declic", type=str),
            OpenApiParameter(name="date_min", type=str),
            OpenApiParameter(name="date_max", type=str),
            OpenApiParameter(name="search", type=str),
        ],
        responses={200: DeclicSerializer},
    )
)
class DeclicViewSet(ScopeMixin, viewsets.ModelViewSet):
    """
    =============================================================
    📊 DeclicViewSet — Gestion des ateliers Déclic (IC supprimée)
    =============================================================

    ---
    🔒 Permissions globales :
    -------------------------
    - permission_classes = [IsDeclicStaffOrAbove]
        * L'accès est restreint selon la permission IsDeclicStaffOrAbove.
        * Le détail du contrôle (profils/admin/staff...) dépend de ce composant non visible ici.
        * Les helpers ScopeMixin ajoutent une restriction supplémentaire :
            - Si l'utilisateur est 'candidat' (cf. is_candidate), il n'accède à rien du tout (aucun résultat).
            - Les utilisateurs "admin-like" obtiennent tous les résultats (pas de filtrage par centre).
            - Les autres utilisateurs (ex : déclic_staff) voient seulement les données rattachées à leurs centres.

    ---
    🔎 Filtrage et QuerySet :
    ------------------------
    - Le queryset de base est tous les ateliers Déclic (Declic.objects.select_related('centre').all()).
    - Des restrictions additionnelles sont appliquées dans get_queryset (cf. ci-dessous).
    - Il n'y a pas de filter_backends déclarés explicitement : le filtrage repose sur des paramètres manuels dans get_queryset().

    - get_queryset() :
        * Applique le filtrage par centre selon le ScopeMixin (cf. _scope_qs_to_user_centres).
        * Prend en charge les paramètres de query string :
            - annee : filtre sur l'année de l'atelier (date_declic__year).
            - centre : filtre exact sur le centre_id.
            - departement : filtre si le centre dont le code postal ou le champ 'departement' commence par la valeur.
            - type_declic : filtre exact sur le type d'atelier.
            - date_min/date_max : bornes sur la date (incluse).
            - search : recherche insensible à la casse sur le nom du centre ou le commentaire associé.
            - ordering : champ de tri préféré. Défaut : -date_declic, -id.

    ---
    ⚡ Actions standard :
    ---------------------
    list (GET /declic/)
        - Intention : Lister les ateliers Déclic accessibles à l'utilisateur.
        - Filtrage : voir get_queryset. Prise en compte des restrictions par centre ou rôle utilisateur.
        - Serializer utilisé : DeclicSerializer.
        - Réponse : paginée, format DRF standard, contenu généré par DeclicSerializer. Le format exact dépend du serializer, non explicitement documenté ici.

    retrieve (GET /declic/{id}/)
        - Intention : Récupérer le détail d'un atelier en particulier si visible pour l'utilisateur.
        - Permission : même contrôle que pour list (restrictions ScopeMixin et IsDeclicStaffOrAbove).
        - Serializer utilisé : DeclicSerializer (instance unique).
        - Réponse : structure DRF standard issue du serializer, non détaillée explicitement ici.

    create (POST /declic/)
        - Intention : Créer un nouvel atelier Déclic.
        - Permission : requiert d'avoir accès à la création (IsDeclicStaffOrAbove, contrôle interne non visible ici).
        - Serializer utilisé : DeclicSerializer.
        - Réponse : format de DeclicSerializer pour l'instance créée, format JSON DRF par défaut (non précisé autrement dans ce code).

    update / partial_update (PUT/PATCH /declic/{id}/)
        - Intention : Mettre à jour un atelier existant.
        - Permission : contrôle identique, restreint par ScopeMixin.
        - Serializer utilisé : DeclicSerializer.
        - Réponse : format de DeclicSerializer pour l'instance modifiée (DRF standard).

    destroy (DELETE /declic/{id}/)
        - Intention : Supprimer un atelier.
        - Permission : dépend de la permission et du scope. Aucun log explicite ici, pas de format custom de réponse.
        - Réponse : format DRF standard (statut HTTP sans body).

    ---
    🧩 Actions personnalisées :
    ---------------------------

    filters (GET /declic/filters/)
      - Objectif : Fournir une liste d'options (années, départements, centres filtrés selon les droits, types ateliers) pour aider le front à construire les interfaces de filtres/menus déroulants.
      - Accès : soumis aux mêmes permissions/scopes que le ViewSet principal (restriction par centre via ScopeMixin).
      - Réponse : JSON contenant
        {
            "annees": [liste d'années disponibles int],
            "departements": [{"value": <code_dep>, "label": ...}],
            "centres": [
                {
                  "value": <id centre>, "label": <nom centre>, "departement": <dep>, "code_postal": <str>
                }
            ],
            "type_declic": [{"value": <code>, "label": <libellé>}]
        }

    stats-centres (GET /declic/stats-centres/?annee=YYYY)
      - Objectif : Retourner des statistiques (par centre) sur les accueillis à Déclic pour une année donnée (défaut année en cours).
      - Accès : soumis aux limitations ScopeMixin, résultats agrégés.
      - Réponse : Le format exact de la réponse JSON dépend de la méthode Declic.accueillis_par_centre(annee), qui n'est pas documentée ici.

    stats-departements (GET /declic/stats-departements/?annee=YYYY)
      - Objectif : Retourner des statistiques (par département) sur les accueillis pour une année donnée.
      - Même flux, même remarque : format JSON exact dépendant de la méthode appelée (Declic.accueillis_par_departement).

    export-xlsx (GET /declic/export-xlsx/?annee=YYYY)
      - Objectif métier : Exporter tous les ateliers visibles (selon scope et params fournis via get_queryset)
        dans un fichier Excel : 1 feuille 'Ateliers Déclic' contenant toutes les lignes visibles + agrégats.
      - Accès : soumis à ScopeMixin + droits globaux.
      - Réponse : Fichier attaché Excel (HTTP 200 avec Content-Disposition attachment ; content type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).
        Structure : 1 ligne d'en-têtes suivie de 1 ligne par atelier.
        Champs : [ID, Atelier, Date, Centre, Inscrits, Présents, Absents, Taux présence, Objectif annuel, Ateliers cumulés, Taux atteinte, Reste à faire, Commentaire].
      - Rendez-vous : aucun log, aucun format JSON custom en cas d'erreur n'est défini ici.

    ---
    LIMITES :
    - Les réponses de toutes les actions standard et personnalisées qui retournent des objets ou des listes reposent soit sur DeclicSerializer, soit sur des helpers non détaillés ici, donc les formats JSON précis ne sont pas explicitement garantis hors ce que la structure Response montre.
    - Les permissions détaillées dépendent de composants externes (IsDeclicStaffOrAbove, helpers 'roles'), le détail exact n'est donc pas contrôlable ici.

    """

    serializer_class = DeclicSerializer
    permission_classes = [IsDeclicStaffOrAbove]
    queryset = Declic.objects.select_related("centre").all()

    # -------------------------------------------------------------------------
    # 🎛️ OPTIONS FILTRES
    # -------------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="filters")
    def filters(self, request):
        """
        Point d'entrée : GET /declic/filters/

        Objectif métier : Fournir la liste ordonnée :
            - des années rencontrées dans date_declic des ateliers
            - des centres accessibles par l'utilisateur, chacun enrichi du code département et code postal
            - des départements rencontrés, pour menu déroulant
            - des types d'ateliers possibles, pour affichage

        Permissions & visibilité : cette action applique la restriction par centre via ScopeMixin, donc
        - un admin-like voit la liste complète ;
        - un staff ou assimilé ne voit que ses centres/autorisations ;
        - un "candidat" ne verra rien.

        Réponse : JSON contenant "annees", "departements", "centres", "type_declic"
        (voir exemple dans docstring de la classe).
        """
        annees = Declic.objects.order_by().values_list("date_declic__year", flat=True).distinct()
        annees = sorted([a for a in annees if a], reverse=True)

        centres_qs = self._scope_qs_to_user_centres(Centre.objects.all())

        centres = []
        deps = set()

        for c in centres_qs.order_by("nom"):
            # Le code département est soit le champ 'departement', soit les 2 premiers chiffres du code postal.
            dep = getattr(c, "departement", "") or (c.code_postal[:2] if c.code_postal else "")
            if dep:
                deps.add(dep)

            centres.append(
                {
                    "value": c.id,
                    "label": c.nom,
                    "departement": dep,
                    "code_postal": c.code_postal,
                }
            )

        # Liste des types atelier uniquement (tuple formaté value/label)
        types = [{"value": t[0], "label": t[1]} for t in Declic.TypeDeclic.choices]

        return Response(
            {
                "annees": annees,
                "departements": [{"value": d, "label": f"Département {d}"} for d in sorted(deps)],
                "centres": centres,
                "type_declic": types,
            }
        )

    # -------------------------------------------------------------------------
    # 🔍 QUERYSET PRINCIPAL
    # -------------------------------------------------------------------------
    def get_queryset(self):
        """
        Génère le queryset principal pour toutes les actions standard et d'export Excel/statistiques.

        Filtrage combiné :
        - Restriction par centres autorisés via ScopeMixin._scope_qs_to_user_centres, selon le rôle utilisateur
          (cf. docstring de la classe, dépendance à is_admin_like/is_candidate/custom logic).
        - Filtrages "manuels" sur paramètres query_string :
            * annee: filtrage par année (date_declic__year)
            * centre: filtrage par identifiant exact de centre
            * departement: filtre sur 'centre__departement' OU 'centre__code_postal', si commence par la valeur
            * type_declic: filtrage type atelier
            * date_min/date_max: inclusives sur date_declic
            * search: recherche sur centre__nom ou commentaire
            * ordering: tri principal (défaut: -date_declic, puis -id).

        Retourne uniquement les objets autorisés et filtrés.
        """
        qs = Declic.objects.select_related("centre")
        qs = self._scope_qs_to_user_centres(qs)

        p = self.request.query_params
        annee = p.get("annee")
        centre_id = p.get("centre")
        departement = p.get("departement")
        type_declic = p.get("type_declic")
        date_min = p.get("date_min")
        date_max = p.get("date_max")
        search = p.get("search")
        ordering = p.get("ordering")

        if annee:
            qs = qs.filter(date_declic__year=annee)
        if centre_id:
            qs = qs.filter(centre_id=centre_id)
        if type_declic:
            qs = qs.filter(type_declic=type_declic)

        if departement:
            departement = str(departement)
            qs = qs.filter(
                Q(centre__departement__startswith=departement) | Q(centre__code_postal__startswith=departement)
            )

        if date_min:
            qs = qs.filter(date_declic__gte=date_min)
        if date_max:
            qs = qs.filter(date_declic__lte=date_max)

        if search:
            qs = qs.filter(Q(centre__nom__icontains=search) | Q(commentaire__icontains=search))

        return qs.order_by(ordering or "-date_declic", "-id")

    # -------------------------------------------------------------------------
    # 💾 CREATE / UPDATE
    # -------------------------------------------------------------------------
    def perform_create(self, serializer):
        """
        Méthode d'infrastructure DRF pour la création (POST).

        Ajoute la sauvegarde de l'utilisateur ayant effectué l'action via save(user=...).
        Permissions : soumises au décorateur classe (cf. IsDeclicStaffOrAbove et ScopeMixin).
        """
        instance = serializer.save()
        instance.save(user=self.request.user)

    def perform_update(self, serializer):
        """
        Méthode d'infrastructure DRF pour la mise à jour (PUT/PATCH).

        Ajoute la sauvegarde de l'utilisateur ayant effectué l'action via save(user=...).
        """
        instance = serializer.save()
        instance.save(user=self.request.user)

    # -------------------------------------------------------------------------
    # 📊 STATISTIQUES
    # -------------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="stats-centres")
    def stats_centres(self, request):
        """
        Point d'entrée : GET /declic/stats-centres/?annee=YYYY

        Objectif métier : Statistiques sur le nombre de candidats accueillis, agrégées par centre,
        pour l'année demandée (ou année courante par défaut).

        Restrictions de visibilité : appliquées automatiquement via ScopeMixin et permissions.
        Structure de réponse : dépendante du résultat de Declic.accueillis_par_centre(annee).
        Aucun format JSON garanti visible ici.
        """
        annee = int(request.query_params.get("annee", localdate().year))
        data = Declic.accueillis_par_centre(annee)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="stats-departements")
    def stats_departements(self, request):
        """
        Point d'entrée : GET /declic/stats-departements/?annee=YYYY

        Objectif métier : Statistiques analogues au endpoint ci-dessus, mais agrégées par département.
        Restrictions et structure : idem.
        """
        annee = int(request.query_params.get("annee", localdate().year))
        data = Declic.accueillis_par_departement(annee)
        return Response(data)

    # -------------------------------------------------------------------------
    # 📤 EXPORT EXCEL ATELIERS UNIQUEMENT
    # -------------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request):
        """
        Point d'entrée : GET /declic/export-xlsx/?annee=YYYY

        Objectif métier : Exporter tous les ateliers accessibles, filtrés selon les droits et paramètres query string,
        dans un fichier Excel unique.

        Permissions : mêmes contrôles que le ViewSet principal.

        Détail Excel :
        - Lignes : 1 en-tête fixe puis une ligne par atelier, colonnes
          [ID, Atelier, Date, Centre, Inscrits, Présents, Absents, Taux présence, Objectif annuel,
           Ateliers cumulés, Taux atteinte, Reste à faire, Commentaire].
        - Statut HTTP : 200, Content-Type =
          application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        - Content-Disposition : attachment ; nom reprenant l'année exportée.

        Structure Excel stricte ; aucun retour JSON ni structure DRF dédiée.
        """
        qs = self.filter_queryset(self.get_queryset())
        annee = int(request.query_params.get("annee", localdate().year))

        wb = Workbook()
        ws = wb.active
        ws.title = "Ateliers Déclic"

        headers = [
            "ID",
            "Atelier",
            "Date",
            "Centre",
            "Inscrits",
            "Présents",
            "Absents",
            "Taux présence (%)",
            "Objectif annuel",
            "Ateliers cumulés",
            "Taux atteinte (%)",
            "Reste à faire",
            "Commentaire",
        ]
        ws.append(headers)

        border = Border(
            left=Side(style="thin"), right=Side(style="thin"), top=Side(style="thin"), bottom=Side(style="thin")
        )

        for s in qs:
            objectif = s.objectif_annuel

            realise = (
                Declic.objects.filter(
                    centre=s.centre,
                    date_declic__year=s.date_declic.year,
                ).aggregate(
                    total=Sum("nb_presents_declic")
                )["total"]
                or 0
            )

            taux = round((realise / objectif) * 100, 1) if objectif else 0

            ws.append(
                [
                    s.id,
                    s.get_type_declic_display(),
                    s.date_declic.strftime("%d/%m/%Y"),
                    s.centre.nom if s.centre else "",
                    s.nb_inscrits_declic,
                    s.nb_presents_declic,
                    s.nb_absents_declic,
                    s.taux_presence_declic,
                    objectif,
                    realise,
                    taux,
                    max(objectif - realise, 0),
                    (s.commentaire or "").replace("\n", " "),
                ]
            )

        buffer = BytesIO()
        wb.save(buffer)
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="declic_ateliers_{annee}.xlsx"'
        return response
