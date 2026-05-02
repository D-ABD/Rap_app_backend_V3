"""
Service métier — parcours Prépa (ateliers nominatifs + champs historiques).

Source unique de vérité pour :
- le statut de parcours « simplifié » (`StatutParcoursCourant`) ;
- la dernière présence réelle ;
- la dernière étape lisible ;
- les dates calculées d'entrée et de fin pour l'UI ;
- l’action suivante recommandée ;
- l’historique des ateliers pour l’API ;
- les agrégats pipeline (synthèse).

Les statuts stockés sur `StagiairePrepa` (`statut_parcours`, booléens atelier) restent
exposés pour compatibilité ; le paradigme cible lit prioritairement les participations
et complète avec les flags lorsque les lignes nominatives sont absentes pour un type.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Iterable

from django.db import models
from django.db.models import Prefetch

from rap_app.models.prepa import IssueBilanPrepa, Prepa, PrepaPresenceStatut, PrepaStagiaireParticipation, StagiairePrepa


class StatutParcoursCourant(models.TextChoices):
    EN_ATTENTE_DEMARRAGE = "en_attente_demarrage", "En attente de démarrage"
    EN_ATTENTE_REPOSITIONNEMENT = "en_attente_repositionnement", "En attente de repositionnement"
    EN_ATTENTE_SUITE = "en_attente_suite", "En attente de suite"
    EN_ATTENTE_BILAN = "en_attente_bilan", "En attente de bilan"
    TERMINE = "termine", "Terminé"


ATELIER_TYPES_PARCOURS = frozenset(
    {
        Prepa.TypePrepa.ATELIER1,
        Prepa.TypePrepa.ATELIER2,
        Prepa.TypePrepa.ATELIER3,
        Prepa.TypePrepa.ATELIER4,
        Prepa.TypePrepa.ATELIER5,
        Prepa.TypePrepa.ATELIER6,
        Prepa.TypePrepa.AUTRE,
    }
)


ACTION_INSCRIRE_AT1 = "inscrire_atelier_1"
ACTION_REPOSITIONNER = "repositionner"
ACTION_DECIDER_SUITE = "decider_suite"
ACTION_PROPOSER_AT6 = "proposer_atelier_6"
ACTION_PROPOSER_BILAN = "proposer_bilan"
ACTION_FINALISER_BILAN = "finaliser_bilan"
ACTION_OUVRIR_BILAN_ABANDON = "ouvrir_bilan_abandon"
ACTION_AUCUNE = "aucune"
ETAPE_BILAN = "bilan"


def normalize_participation_statut(statut: str) -> str:
    """Normalise les anciens statuts vers la logique présent / absent / neutre."""

    if statut == PrepaPresenceStatut.TERMINE:
        return PrepaPresenceStatut.PRESENT
    if statut == PrepaPresenceStatut.A_REPOSITIONNER:
        return PrepaPresenceStatut.ABSENT
    return statut


def _is_present_like(statut: str) -> bool:
    return normalize_participation_statut(statut) == PrepaPresenceStatut.PRESENT


def _is_absent_like(statut: str) -> bool:
    return normalize_participation_statut(statut) == PrepaPresenceStatut.ABSENT


def est_bilan_cloture(stagiaire: StagiairePrepa) -> bool:
    """Parcours clos côté métier (issue de bilan renseignée ou équivalent historique)."""

    if getattr(stagiaire, "issue_bilan", None):
        return True
    if stagiaire.orientation_finale and stagiaire.date_bilan:
        return True
    return False


def has_at1_present_ever(stagiaire: StagiairePrepa) -> bool:
    """AT1 « réalisé » : présence réelle ou flag/dates hérités."""

    participations = _get_participations(stagiaire)
    for p in participations:
        if p.prepa and p.prepa.type_prepa == Prepa.TypePrepa.ATELIER1 and _is_present_like(p.statut):
            return True
    if stagiaire.atelier_1_realise:
        return True
    return False


def est_pret_pour_bilan(stagiaire: StagiairePrepa) -> bool:
    """Indique si la saisie bilan / orientation est autorisée (règle minimale Lot 6)."""

    if est_bilan_cloture(stagiaire):
        return True
    courant = compute_statut_parcours_courant(stagiaire)
    return courant == StatutParcoursCourant.EN_ATTENTE_BILAN and has_at1_present_ever(stagiaire)


@dataclass(frozen=True)
class ProgressionEvent:
    type_prepa: str
    effectif: str
    session_date: date | None


def _session_date(prepa: Prepa | None) -> date | None:
    if not prepa:
        return None
    return prepa.date_debut_atelier or prepa.date_prepa


def _get_participations(stagiaire: StagiairePrepa) -> list[PrepaStagiaireParticipation]:
    rel = getattr(stagiaire, "participations_prepa", None)
    if rel is not None:
        rows = list(rel.all())
    else:
        rows = list(
            PrepaStagiaireParticipation.objects.filter(stagiaire_prepa=stagiaire)
            .select_related("prepa")
            .order_by("prepa__date_debut_atelier", "prepa__date_prepa", "id")
        )
    out = []
    for p in rows:
        if not p.prepa or p.prepa.type_prepa not in ATELIER_TYPES_PARCOURS:
            continue
        out.append(p)
    out.sort(key=lambda x: (_session_date(x.prepa) or date.min, x.id))
    return out


def _legacy_synthetic_presents(stagiaire: StagiairePrepa, types_with_rows: set[str]) -> list[ProgressionEvent]:
    """Complète lorsque seuls les booléens historiques sont renseignés (sans ligne nominative pour ce type)."""

    events: list[ProgressionEvent] = []
    for type_prepa, (flag, date_field) in StagiairePrepa.atelier_flag_map().items():
        if type_prepa not in ATELIER_TYPES_PARCOURS:
            continue
        if type_prepa in types_with_rows:
            continue
        if not getattr(stagiaire, flag, False):
            continue
        d = getattr(stagiaire, date_field, None)
        events.append(ProgressionEvent(type_prepa=type_prepa, effectif=PrepaPresenceStatut.PRESENT, session_date=d))
    events.sort(key=lambda e: (e.session_date or date.min, e.type_prepa))
    return events


def collect_progression_events(stagiaire: StagiairePrepa) -> list[ProgressionEvent]:
    participations = _get_participations(stagiaire)
    types_with_rows = {p.prepa.type_prepa for p in participations if p.prepa}

    events: list[ProgressionEvent] = []
    covered_present_types: set[str] = set()

    for p in participations:
        raw = p.statut
        if _is_present_like(raw):
            eff = PrepaPresenceStatut.PRESENT
        elif _is_absent_like(raw):
            eff = PrepaPresenceStatut.ABSENT
        else:
            continue
        t = p.prepa.type_prepa
        events.append(ProgressionEvent(type_prepa=t, effectif=eff, session_date=_session_date(p.prepa)))
        if eff == PrepaPresenceStatut.PRESENT:
            covered_present_types.add(t)

    for leg in _legacy_synthetic_presents(stagiaire, types_with_rows):
        if leg.type_prepa not in covered_present_types:
            events.append(leg)

    events.sort(key=lambda e: (e.session_date or date.min, e.type_prepa))
    return events


def compute_statut_parcours_courant(stagiaire: StagiairePrepa) -> str:
    if est_bilan_cloture(stagiaire):
        return StatutParcoursCourant.TERMINE

    if stagiaire.statut_parcours == StagiairePrepa.StatutParcours.ABANDON:
        return StatutParcoursCourant.EN_ATTENTE_BILAN

    events = collect_progression_events(stagiaire)
    decisive = [e for e in events if e.effectif in (PrepaPresenceStatut.PRESENT, PrepaPresenceStatut.ABSENT)]
    at1_present = any(
        e.type_prepa == Prepa.TypePrepa.ATELIER1 and e.effectif == PrepaPresenceStatut.PRESENT for e in events
    )
    if not at1_present:
        return StatutParcoursCourant.EN_ATTENTE_DEMARRAGE

    last = decisive[-1]
    if last.effectif == PrepaPresenceStatut.ABSENT:
        return StatutParcoursCourant.EN_ATTENTE_REPOSITIONNEMENT
    if last.type_prepa == Prepa.TypePrepa.ATELIER6:
        return StatutParcoursCourant.EN_ATTENTE_BILAN
    return StatutParcoursCourant.EN_ATTENTE_SUITE


def compute_derniere_presence_reelle(stagiaire: StagiairePrepa) -> dict[str, Any] | None:
    events = collect_progression_events(stagiaire)
    presents = [e for e in events if e.effectif == PrepaPresenceStatut.PRESENT]
    if not presents:
        return None
    last = presents[-1]
    label = dict(Prepa.TypePrepa.choices).get(last.type_prepa, last.type_prepa)
    return {
        "type_prepa": last.type_prepa,
        "type_prepa_display": label,
        "date": last.session_date.isoformat() if last.session_date else None,
    }


def compute_date_entree_calculee(stagiaire: StagiairePrepa) -> str | None:
    """Date d'entrée métier : premier AT1 réellement présent, sinon héritage historique."""

    events = collect_progression_events(stagiaire)
    for event in events:
        if event.type_prepa == Prepa.TypePrepa.ATELIER1 and event.effectif == PrepaPresenceStatut.PRESENT:
            return event.session_date.isoformat() if event.session_date else None
    if stagiaire.date_atelier_1:
        return stagiaire.date_atelier_1.isoformat()
    if stagiaire.date_entree_parcours:
        return stagiaire.date_entree_parcours.isoformat()
    return None


def compute_date_fin_calculee(stagiaire: StagiairePrepa) -> str | None:
    """Date de fin métier : date du bilan uniquement."""

    if getattr(stagiaire, "date_bilan", None):
        return stagiaire.date_bilan.isoformat()
    return None


def _label_for_parcours_step(value: str) -> str:
    if value == ETAPE_BILAN:
        return "Bilan"
    return dict(Prepa.TypePrepa.choices).get(value, value)


def compute_derniere_etape(stagiaire: StagiairePrepa) -> dict[str, str | None] | None:
    """Dernière étape lisible du parcours pour la synthèse UI."""

    date_fin = compute_date_fin_calculee(stagiaire)
    if date_fin:
        return {
            "value": ETAPE_BILAN,
            "label": "Bilan",
            "date": date_fin,
        }

    if not has_at1_present_ever(stagiaire):
        return {
            "value": Prepa.TypePrepa.ATELIER1,
            "label": "En attente de AT1",
            "date": None,
        }

    events = collect_progression_events(stagiaire)
    decisive = [e for e in events if e.effectif in (PrepaPresenceStatut.PRESENT, PrepaPresenceStatut.ABSENT)]
    if decisive:
        last = decisive[-1]
        return {
            "value": last.type_prepa,
            "label": _label_for_parcours_step(last.type_prepa),
            "date": last.session_date.isoformat() if last.session_date else None,
        }
    return None


def compute_action_suivante_recommandee(stagiaire: StagiairePrepa) -> dict[str, str]:
    statut = compute_statut_parcours_courant(stagiaire)
    mapping: dict[str, tuple[str, str]] = {
        StatutParcoursCourant.EN_ATTENTE_DEMARRAGE: (ACTION_INSCRIRE_AT1, "Inscrire à l’atelier 1"),
        StatutParcoursCourant.EN_ATTENTE_REPOSITIONNEMENT: (ACTION_REPOSITIONNER, "Repositionner sur une séance"),
        StatutParcoursCourant.EN_ATTENTE_SUITE: (ACTION_DECIDER_SUITE, "Décider de la suite du parcours"),
        StatutParcoursCourant.EN_ATTENTE_BILAN: (
            ACTION_FINALISER_BILAN
            if stagiaire.statut_parcours != StagiairePrepa.StatutParcours.ABANDON
            else ACTION_OUVRIR_BILAN_ABANDON,
            "Finaliser le bilan"
            if stagiaire.statut_parcours != StagiairePrepa.StatutParcours.ABANDON
            else "Formaliser la sortie au bilan",
        ),
        StatutParcoursCourant.TERMINE: (ACTION_AUCUNE, "Aucune action requise"),
    }
    code, label = mapping.get(statut, (ACTION_AUCUNE, ""))

    events = collect_progression_events(stagiaire)
    last_present_types = [e.type_prepa for e in events if e.effectif == PrepaPresenceStatut.PRESENT]
    if statut == StatutParcoursCourant.EN_ATTENTE_SUITE and last_present_types:
        last_type = last_present_types[-1]
        if last_type == Prepa.TypePrepa.ATELIER5:
            code, label = ACTION_PROPOSER_AT6, "Proposer l’atelier 6"
        elif last_type == Prepa.TypePrepa.ATELIER6:
            code, label = ACTION_PROPOSER_BILAN, "Proposer le bilan"

    return {"code": code, "label": label}


def build_historique_ateliers(stagiaire: StagiairePrepa) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for p in _get_participations(stagiaire):
        prepa = p.prepa
        rows.append(
            {
                "prepa_id": prepa.id,
                "type_prepa": prepa.type_prepa,
                "type_prepa_display": prepa.get_type_prepa_display(),
                "date": (_session_date(prepa).isoformat() if _session_date(prepa) else None),
                "statut_brut": p.statut,
                "statut_normalise": normalize_participation_statut(p.statut),
                "statut_display": p.get_statut_display(),
            }
        )
    return rows


def aggregate_pipeline_counts(stagiaires: Iterable[StagiairePrepa]) -> dict[str, int]:
    counts = {choice.value: 0 for choice in StatutParcoursCourant}
    bilans = 0
    at1_done = 0
    abandons_issue = 0
    orientes_afpa_issue = 0

    for s in stagiaires:
        counts[compute_statut_parcours_courant(s)] += 1
        if has_at1_present_ever(s):
            at1_done += 1
        if s.issue_bilan or (s.orientation_finale and s.date_bilan):
            bilans += 1
        if s.issue_bilan == IssueBilanPrepa.ABANDON:
            abandons_issue += 1
        if s.issue_bilan == IssueBilanPrepa.ORIENTE_AFPA:
            orientes_afpa_issue += 1

    out = {f"pipeline_{k}": v for k, v in counts.items()}
    out.update(
        {
            "nb_bilans": bilans,
            "nb_at1_realises": at1_done,
            "ecart_bilans": max(at1_done - bilans, 0),
            "bilans_abandon": abandons_issue,
            "bilans_orientes_afpa": orientes_afpa_issue,
        }
    )
    return out


def prefetch_parcours_dependencies(queryset):
    """Prefetch minimales pour calculer le parcours sans N+1."""

    return queryset.prefetch_related(
        Prefetch(
            "participations_prepa",
            queryset=PrepaStagiaireParticipation.objects.select_related("prepa"),
        ),
    )


def coerce_presence_statut_for_write(statut: str) -> str:
    """Uniformise les écritures vers les trois statuts cibles."""

    return normalize_participation_statut(statut)


def derive_issue_bilan_from_orientation(orientation: str | None) -> str | None:
    if orientation in (
        StagiairePrepa.OrientationFinale.AFPA,
        StagiairePrepa.OrientationFinale.AUTRE_CENTRE_AFPA,
    ):
        return IssueBilanPrepa.ORIENTE_AFPA
    if orientation == StagiairePrepa.OrientationFinale.HORS_AFPA:
        return IssueBilanPrepa.AUTRE_SORTIE
    return None
