"""Synchronisation du compteur `nb_commentaires` sur les plans d'action formation.

La relation ManyToMany vers `Commentaire` n'embarque pas de comptage dérivé
automatique : un handler `m2m_changed` met à jour `nb_commentaires` après
chaque opération d'ajout, de retrait ou de vidage, pour les appels partant
du plan ou du commentaire.

En cas de `clear()` côté commentaire, `post_clear` ne fournit pas de `pk_set` :
les identifiants des plans concernés sont mémorisés en `pre_clear` sur
l'instance, puis rafraîchis en `post_clear`.
"""

import logging

from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from ..models.commentaires import Commentaire
from ..models.plan_action import PlanActionFormation

logger = logging.getLogger(__name__)

# Attribut transitoire sur `Commentaire` (pre_clear / post_clear de la M2M)
_ATTR_PRE_CLEAR_PLAN_PKS = "_paf_m2m_pre_clear_plans_pks"


@receiver(
    m2m_changed,
    sender=PlanActionFormation.commentaires.through,
    dispatch_uid="rap_app.plan_action.sync_nb_commentaires_m2m",
)
def sync_nb_commentaires_on_commentaires_m2m_changed(sender, instance, action, model, pk_set, **kwargs):
    """
    Recalcule `nb_commentaires` après modification de la M2M `commentaires`.

    Couvre `post_add`, `post_remove` et `post_clear`, que l'opération soit
    initiée côté `PlanActionFormation` (ex. `plan.commentaires.add(…)`) ou
    côté `Commentaire` (ex. `commentaire.plans_action_formation.add(…)`).
    """
    if action == "pre_clear" and isinstance(instance, Commentaire):
        setattr(
            instance,
            _ATTR_PRE_CLEAR_PLAN_PKS,
            list(instance.plans_action_formation.values_list("pk", flat=True)),
        )
        return

    if action not in ("post_add", "post_remove", "post_clear"):
        return

    if isinstance(instance, PlanActionFormation):
        if not instance.pk:
            return
        n = instance.commentaires.count()
        if PlanActionFormation.objects.filter(pk=instance.pk).update(nb_commentaires=n):
            logger.debug("Plan d'action #%s : nb_commentaires=%s", instance.pk, n)
        return

    if not isinstance(instance, Commentaire):
        return

    if action == "post_clear":
        pks = getattr(instance, _ATTR_PRE_CLEAR_PLAN_PKS, None) or []
        for attr in (_ATTR_PRE_CLEAR_PLAN_PKS,):
            if hasattr(instance, attr):
                delattr(instance, attr)
    else:
        pks = list(pk_set) if pk_set else []

    for plan_pk in pks:
        plan = PlanActionFormation.objects.filter(pk=plan_pk).first()
        if not plan:
            continue
        n = plan.commentaires.count()
        if PlanActionFormation.objects.filter(pk=plan_pk).update(nb_commentaires=n):
            logger.debug("Plan d'action #%s : nb_commentaires=%s (via commentaire #%s)", plan_pk, n, instance.pk)
