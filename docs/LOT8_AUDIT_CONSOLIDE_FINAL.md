# Lot 8 — Audit consolidé final : lifecycle candidat et compteurs formation

**Date** : 2026-04-14
**Statut** : AUDIT UNIQUEMENT — aucune modification de code
**Gate** : validation humaine requise avant toute implémentation
**Documents sources** : `LOT8_MINI_AUDIT_LIFECYCLE.md`, `LOT8_PREPARATION_DECISIONNELLE.md`

---

## 1. Résumé exécutif

**Tous les lots sauf le 8 sont terminés.** Le Lot 8 est bloqué par un mini-audit obligatoire.

Ce document consolide et finalise les deux audits précédents en un livrable unique, exploitable pour décision humaine. Aucune modification de code métier n'a été effectuée.

**Constat principal** : le service `CandidateLifecycleService` synchronise automatiquement les compteurs `inscrits_crif` / `inscrits_mp` des formations à chaque transition candidat. Parmi les 6 conditions qui déclenchent cette sync, **`inscrit_gespers`** crée un couplage direct entre une action GESPERS et des champs définis comme « saisie manuelle » par la migration V3.

**Question décisionnelle** : ce couplage doit-il être rompu, et si oui, quel est l'impact sur les données existantes ?

---

## 2. État du Lot 8

| Élément | Statut |
|---------|--------|
| Lots 0–7, 9, 10 | **Terminés** |
| Audit code lifecycle | **Terminé** — 3 passes de vérification |
| Cartographie des mutations | **Terminée** — 19 points d'entrée, 1 point de mutation central |
| Requêtes d'audit données | **Prêtes** — script Q1–Q7 complet |
| Scénarios de validation | **Rédigés** — V1–V6 |
| Plan de patch conditionnel | **Préparé** — Option B documentée |
| Plan de tests | **Préparé** — 3 tests à adapter, 9 nouveaux |
| **Exécution audit données** | **NON FAIT** — requiert environnement réel |
| **Décision humaine** | **EN ATTENTE** |
| **Implémentation** | **BLOQUÉE** |

---

## 3. Constats code

### 3.1 Fichiers audités

| Fichier | Rôle | Impact compteur |
|---------|------|-----------------|
| `rap_app/services/candidate_lifecycle_service.py` | Transitions candidat | **Direct** — ±1 sur `inscrits_crif`/`inscrits_mp` |
| `rap_app/services/candidate_bulk_service.py` | Bulk candidat | Indirect — délègue au lifecycle |
| `rap_app/api/viewsets/candidat_viewsets.py` | Actions API candidat | Indirect — appelle lifecycle |
| `rap_app/api/serializers/candidat_serializers.py` | Create/update candidat | Indirect — appelle `sync_candidate_formation_inscrits` |
| `rap_app/admin/candidat_admin.py` | Actions admin candidat | Indirect — appelle lifecycle |
| `rap_app/signals/formation_candidats_signals.py` | Signal post_save/delete Candidat | `nombre_candidats` seulement |
| `rap_app/api/serializers/formations_serializers.py` | Create/update formation | Saisie directe `inscrits_crif`/`inscrits_mp` |
| `rap_app/services/imports/handlers_lot3.py` | Import Excel | Saisie directe via sérialiseur |
| `rap_app/models/formations.py` | Modèle Formation | Champs + propriétés calculées |
| `rap_app/tests/tests_services/test_candidate_lifecycle_service.py` | Tests lifecycle | Couvre les mutations |

### 3.2 Point de mutation central

**`_counts_in_formation_inscrits`** (`candidate_lifecycle_service.py` l.55–69) :

```python
def _counts_in_formation_inscrits(cls, candidate):
    return bool(
        candidate.formation_id
        and (
            candidate.inscrit_gespers              # ← COUPLAGE GESPERS
            or candidate.date_validation_inscription
            or candidate.date_entree_formation_effective
            or candidate.parcours_phase in {
                INSCRIT_VALIDE,
                STAGIAIRE_EN_FORMATION,
                SORTI,
            }
        )
    )
```

Cette méthode retourne `True` si **au moins une** des 6 conditions est remplie. Elle est le **critère unique** qui détermine si un candidat incrémente ou décrémente les compteurs formation lors d'une transition.

### 3.3 Chaîne de mutation

```
Transition (ex: mark_gespers)
  → snapshot was_counted = _counts_in_formation_inscrits(avant)
  → modifie le candidat (inscrit_gespers = True)
  → save candidat
  → is_counted = _counts_in_formation_inscrits(après)
  → si was_counted ≠ is_counted :
      → _adjust_formation_counter(delta = +1 ou -1)
        → Formation.select_for_update()
        → Formation.inscrits_crif += delta  (ou inscrits_mp)
        → Formation.save(update_fields=[field])
```

### 3.4 Transitions et impact

| Transition | Sync ? | Impact |
|------------|--------|--------|
| `validate_inscription` (l.167) | Oui | +1 si pas déjà compté |
| `start_formation` (l.238) | Oui | +1 si pas déjà compté |
| `cancel_start_formation` (l.275) | Oui | -1 si était compté |
| `complete_formation` (l.309) | Oui | +1 si nouveau (SORTI compté) |
| **`mark_gespers` (l.330)** | **Oui** | **+1 si pas déjà compté** |
| **`clear_gespers` (l.351)** | **Oui** | **-1 si plus compté** |
| `abandon` (l.420) | **Non** | Aucun |
| `set/clear_admissible` | Non | Aucun |
| `set/clear_accompagnement` | Non | Aucun |
| `set/clear_appairage` | Non | Aucun |

### 3.5 Constats additionnels vérifiés

| Constat | Statut |
|---------|--------|
| `_adjust_formation_counter` fait `select_for_update` + `max(val+delta, 0)` | **Confirmé** l.78–91 |
| `sync_candidate_formation_inscrits` appelé dans sérialiseur candidat `create`/`update` | **Confirmé** l.840, l.939–945 |
| Bulk service délègue 1-par-1 au lifecycle | **Confirmé** l.40–53 |
| Signal `formation_candidats_signals` ne touche que `nombre_candidats` | **Confirmé** l.49 |
| `abandon` n'appelle PAS `_sync_formation_inscrits_from_transition` | **Confirmé** l.420–443 |
| `_target_phase_without_live_training` utilise aussi `inscrit_gespers` | **Confirmé** l.49–52 — concerne la phase, pas le compteur |
| `clear_gespers` peut rétrograder en POSTULANT | **Confirmé** l.342–344 — géré par la sync en aval |
| Phase SORTI reste comptée indéfiniment | **Confirmé** — cohérent avec « inscrits ayant participé » |

---

## 4. Cartographie des points de mutation

### 4.1 Écritures sur `inscrits_crif` / `inscrits_mp`

**Lifecycle automatique (delta ±1)** — un seul point d'écriture :

```
_adjust_formation_counter (l.78–91)
  ← _adjust_formation_inscrits (l.94–100)
    ← _sync_formation_inscrits_from_transition (l.103–107)
    │   ← validate_inscription, start_formation, cancel_start_formation,
    │     complete_formation, mark_gespers, clear_gespers
    ← sync_candidate_formation_inscrits (l.110–140)
        ← candidat_serializers.py create() l.840
        ← candidat_serializers.py update() l.939–945
```

**Saisie directe (valeur absolue)** — 3 chemins :

| Chemin | Fichier |
|--------|---------|
| API REST create/update formation | `formations_serializers.py` l.697–708 |
| Import Excel formations | `handlers_lot3.py` l.405–412 |
| Admin Django formation | `formations_admin.py` |

**Hérité non utilisé en prod** :

| Chemin | Fichier |
|--------|---------|
| `FormationManager.increment_attendees` | `formations.py` l.266–276 — tests uniquement |

### 4.2 Points d'entrée utilisateur → mutation compteur

| Point d'entrée | Méthode | Impact |
|----------------|---------|--------|
| `POST /api/candidats/{pk}/set-gespers/` | `mark_gespers` | ±1 |
| `POST /api/candidats/{pk}/clear-gespers/` | `clear_gespers` | ±1 |
| `POST /api/candidats/bulk/set-gespers/` | `bulk_set_gespers` | ±N |
| `POST /api/candidats/bulk/clear-gespers/` | `bulk_clear_gespers` | ±N |
| `POST /api/candidats/{pk}/validate-inscription/` | `validate_inscription` | +1 |
| `POST /api/candidats/bulk/validate-inscription/` | `bulk_validate_inscription` | +N |
| `POST /api/candidats/{pk}/start-formation/` | `start_formation` | +1 |
| `POST /api/candidats/bulk/start-formation/` | `bulk_start_formation` | +N |
| `POST /api/candidats/{pk}/cancel-start-formation/` | `cancel_start_formation` | -1 |
| `POST /api/candidats/{pk}/complete-formation/` | `complete_formation` | +1* |
| `POST /api/candidats/` (create) | `serializer.create` | +1* |
| `PATCH /api/candidats/{pk}/` (update) | `serializer.update` | ±1* |
| Admin: "Inscrit GESPERS → Oui" | `mark_gespers` | ±1 |
| Admin: "Inscrit GESPERS → Non" | `clear_gespers` | ±1 |
| Admin: "Statut → En formation" | `start_formation` | +1 |
| Admin: "Statut → Abandon" | `abandon` | 0 |
| `PUT/PATCH /api/formations/{pk}/` | saisie directe | abs |
| Import Excel formations | saisie directe | abs |
| Admin formation | saisie directe | abs |

\* = seulement si le candidat n'était pas déjà "compté" ; abs = valeur absolue

---

## 5. Workflows dépendants

### 5.1 Si seul `inscrit_gespers` est retiré du critère (Option B)

| Cas | Avant | Après | Commentaire |
|-----|-------|-------|-------------|
| Set GESPERS sur candidat **POSTULANT** (sans validation) | +1 inscrits | **Pas d'incrément** | Conforme cible V3 |
| Clear GESPERS sur candidat **déjà validé** | Inchangé | **Inchangé** | Pas d'impact |
| `validate_inscription` | +1 | +1 | **Inchangé** |
| `start_formation` | +1 | +1 | **Inchangé** |
| `cancel_start_formation` | -1 | -1 | **Inchangé** |
| `complete_formation` | +1* | +1* | **Inchangé** |
| Saisie directe formation | abs | abs | **Inchangé** |
| Import Excel | abs | abs | **Inchangé** |

**Seul le cas du candidat POSTULANT marqué GESPERS change de comportement.** Toutes les autres transitions restent identiques.

### 5.2 Si la sync est complètement désactivée (Option C)

| Workflow cassé | Conséquence |
|----------------|-------------|
| Inscription → compteur | Compteur reste à 0 |
| Entrée formation → compteur | Idem |
| Taux de saturation dashboard | Affiche 0% |
| Places disponibles | Toutes les places paraissent libres |
| Annulation entrée | Compteur ne redescend plus |
| Export XLSX inscrits | Valeurs gelées |

### 5.3 Workflows NON impactés (toutes options)

- Saisie manuelle `inscrits_crif`/`inscrits_mp` via API/import/admin
- Signal `nombre_candidats`
- Commentaires, PDF, XLSX exports
- Stats candidats (`candidats-stats/`)

---

## 6. Risques métier et techniques

| # | Risque | Si sync conservée | Si Option B | Si Option C |
|---|--------|-------------------|-------------|-------------|
| R1 | Compteurs modifiés par GESPERS (contradiction V3) | **Présent** | **Résolu** | **Résolu** |
| R2 | Saisie affichée inclut incréments auto | **Présent** | Partiellement résolu | **Résolu** |
| R3 | Confusion saisie/machine dans historique | **Présent** | Moindre | **Résolu** |
| R4 | Compteurs cessent de refléter transitions | Non applicable | Non applicable | **Présent** |
| R5 | Écart croissant compteurs ↔ réalité | Non applicable | Non applicable | **Présent** |
| R6 | Workflows places dispo cassés | Non applicable | Non applicable | **Présent** |
| R7 | Données historiques hybrides | **Présent** | **Présent** | **Présent** |
| R8 | Changement comportement candidats existants | Non applicable | **Ciblé** (GESPERS-only) | **Total** |

---

## 7. Hypothèses sur les données historiques

| # | Hypothèse | Conséquence |
|---|-----------|-------------|
| H1 | Les compteurs `inscrits_crif`/`inscrits_mp` sont un **mélange** de saisie humaine et d'incréments lifecycle | Pas de baseline « saisie pure » fiable |
| H2 | Formations avec corrélation parfaite (saisie == GESPERS) = **uniquement alimentées par la sync** | Jamais de saisie manuelle réelle |
| H3 | Formations importées par Excel = saisie pure à l'import | Valeurs possiblement écrasées ensuite par la sync |
| H4 | `nombre_candidats` est recalculé automatiquement par signal | De facto un Count(), pas une saisie |

---

## 8. Plan d'audit données exécutable

### 8.1 Questions auxquelles l'audit doit répondre

| # | Question | Objectif |
|---|----------|----------|
| Q1 | Combien de formations ont saisie == GESPERS (corrélation parfaite) ? | Mesurer la dépendance à la sync |
| Q2 | Combien ont saisie > GESPERS (excédent) ? | Détecter la saisie manuelle |
| Q3 | Combien ont saisie < GESPERS (déficit) ? | Détecter des anomalies |
| Q4 | Combien ont saisie > 0 mais 0 candidats GESPERS ? | Mesurer la saisie pure |
| Q5 | `nombre_candidats` est-il cohérent avec Count réel ? | Vérifier le signal |
| Q6 | Combien de candidats sont comptés **UNIQUEMENT** par `inscrit_gespers` ? | **Clé de décision pour Option B** |
| Q7 | Quel est l'historique des modifications automatiques des compteurs ? | Traçabilité |

### 8.2 Critère de formation "à risque" pour Option B

Une formation est à risque si elle possède des candidats dont le **seul** critère de comptage est `inscrit_gespers=True` :
- `inscrit_gespers = True`
- `date_validation_inscription = NULL`
- `date_entree_formation_effective = NULL`
- `parcours_phase` NOT IN (`INSCRIT_VALIDE`, `STAGIAIRE_EN_FORMATION`, `SORTI`)

Ces formations verraient leur compteur **baisser** si Option B est appliquée.

---

## 9. Requêtes / scripts proposés

### 9.1 Script d'audit complet (lecture seule)

À exécuter via `python manage.py shell` ou `python manage.py shell < docs/lot8_audit_data_script.py`.

```python
# =========================================================================
# LOT 8 — SCRIPT D'AUDIT DONNÉES (LECTURE SEULE)
# =========================================================================

from django.db.models import Count, Q, F
from rap_app.models.formations import Formation, HistoriqueFormation
from rap_app.models.candidat import Candidat

SEP = "=" * 70
print(SEP)
print("LOT 8 — AUDIT DONNÉES FORMATIONS / INSCRITS / GESPERS")
print(SEP)

qs = Formation._base_manager.annotate(
    gespers_crif=Count(
        "candidats",
        filter=Q(candidats__inscrit_gespers=True, type_offre__nom="CRIF"),
    ),
    gespers_mp=Count(
        "candidats",
        filter=Q(candidats__inscrit_gespers=True) & ~Q(type_offre__nom="CRIF"),
    ),
    total_saisie=F("inscrits_crif") + F("inscrits_mp"),
    total_gespers=Count("candidats", filter=Q(candidats__inscrit_gespers=True)),
)

# --- Q1 : Corrélation parfaite saisie == GESPERS ---
perfect = qs.filter(inscrits_crif=F("gespers_crif"), inscrits_mp=F("gespers_mp"))
perfect_nonzero = perfect.filter(total_saisie__gt=0)
print(f"\n--- Q1 : Corrélation parfaite saisie == GESPERS ---")
print(f"Total (y compris 0/0) : {perfect.count()}")
print(f"Avec inscrits > 0     : {perfect_nonzero.count()}")
for f in perfect_nonzero[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} crif_s={f.inscrits_crif} crif_g={f.gespers_crif}"
          f" mp_s={f.inscrits_mp} mp_g={f.gespers_mp}")

# --- Q2 : Écart saisie > GESPERS ---
excess = qs.filter(total_saisie__gt=F("total_gespers")).exclude(total_saisie=0)
print(f"\n--- Q2 : Saisie > GESPERS (excédent saisie) ---")
print(f"Formations : {excess.count()}")
for f in excess[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} saisie={f.total_saisie}"
          f" gespers={f.total_gespers} ecart=+{f.total_saisie - f.total_gespers}")

# --- Q3 : Écart saisie < GESPERS ---
deficit = qs.filter(total_saisie__lt=F("total_gespers"))
print(f"\n--- Q3 : Saisie < GESPERS (déficit saisie) ---")
print(f"Formations : {deficit.count()}")
for f in deficit[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} saisie={f.total_saisie}"
          f" gespers={f.total_gespers} ecart={f.total_saisie - f.total_gespers}")

# --- Q4 : Saisie > 0, 0 candidats GESPERS ---
saisie_only = qs.filter(total_saisie__gt=0, total_gespers=0)
print(f"\n--- Q4 : Saisie > 0 mais 0 candidats GESPERS ---")
print(f"Formations : {saisie_only.count()}")
for f in saisie_only[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} saisie={f.total_saisie}")

# --- Q5 : nombre_candidats vs Count réel ---
divergent = Formation._base_manager.annotate(
    real_count=Count("candidats"),
).exclude(nombre_candidats=F("real_count"))
print(f"\n--- Q5 : nombre_candidats divergent du Count réel ---")
print(f"Formations divergentes : {divergent.count()}")
for f in divergent[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} stocké={f.nombre_candidats} réel={f.real_count}")

# --- Q6 : Candidats comptés UNIQUEMENT par inscrit_gespers (CLÉ DE DÉCISION) ---
gespers_only = Candidat.objects.filter(
    inscrit_gespers=True,
    formation__isnull=False,
    date_validation_inscription__isnull=True,
    date_entree_formation_effective__isnull=True,
).exclude(
    parcours_phase__in=[
        Candidat.ParcoursPhase.INSCRIT_VALIDE,
        Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
        Candidat.ParcoursPhase.SORTI,
    ]
)
print(f"\n--- Q6 : Candidats comptés UNIQUEMENT par inscrit_gespers ---")
print(f"Candidats dans ce cas : {gespers_only.count()}")
formation_ids = set(gespers_only.values_list("formation_id", flat=True))
print(f"Formations impactées  : {len(formation_ids)}")
for c in gespers_only[:25]:
    print(f"  Candidat #{c.pk:>5} — Formation #{c.formation_id} — phase={c.parcours_phase}")
if formation_ids:
    print(f"\n  Impact par formation si Option B :")
    for fid in sorted(formation_ids)[:25]:
        n = gespers_only.filter(formation_id=fid).count()
        fm = Formation._base_manager.filter(pk=fid).values("nom", "inscrits_crif", "inscrits_mp").first()
        if fm:
            print(f"    #{fid:>5} {fm['nom'][:45]:45s} — compteur baisserait de -{n}")

# --- Q7 : Historique modifications compteurs ---
auto = HistoriqueFormation.objects.filter(
    champ_modifie__in=["inscrits_crif", "inscrits_mp"],
).order_by("-created_at")[:50]
print(f"\n--- Q7 : Historique modifications inscrits (dernières 50) ---")
print(f"Entrées trouvées : {auto.count()}")
for h in auto:
    print(f"  #{h.formation_id:>5} — {h.champ_modifie}: {h.ancienne_valeur} → "
          f"{h.nouvelle_valeur} — {h.commentaire[:60] if h.commentaire else '-'}")

# --- RÉSUMÉ ---
total = Formation._base_manager.count()
with_inscrits = qs.filter(total_saisie__gt=0).count()
print(f"\n{SEP}")
print(f"RÉSUMÉ")
print(f"{SEP}")
print(f"Formations totales                         : {total}")
print(f"Formations avec inscrits > 0               : {with_inscrits}")
print(f"Corrélation parfaite saisie==GESPERS (>0)  : {perfect_nonzero.count()}")
print(f"Excédent saisie > GESPERS                  : {excess.count()}")
print(f"Déficit saisie < GESPERS                   : {deficit.count()}")
print(f"Saisie pure (0 GESPERS)                    : {saisie_only.count()}")
print(f"nombre_candidats divergent                 : {divergent.count()}")
print(f"Candidats comptés UNIQUEMENT par GESPERS   : {gespers_only.count()}")
print(f"Formations impactées par Option B          : {len(formation_ids)}")
print(f"{SEP}")
print(f"FIN AUDIT — Transmettre ces résultats pour décision GO/NO-GO")
```

### 9.2 Comment exécuter

```bash
cd /Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main
python manage.py shell
# puis copier-coller le script ci-dessus
```

### 9.3 Interprétation

| Résultat Q6 | Signification | Action |
|-------------|---------------|--------|
| **0** | Aucun candidat compté uniquement par GESPERS | Option B safe immédiatement |
| **1–20** | Cas marginaux | Option B safe avec recalcul ponctuel |
| **> 20** | Impact significatif | Option B avec migration données |

---

## 10. Critères de décision GO / NO-GO

| Critère | GO | NO-GO |
|---------|-----|-------|
| Script d'audit données exécuté | Résultats Q1–Q7 disponibles | Non exécuté |
| Q6 quantifié | Nombre connu + formations identifiées | Non mesuré |
| Scénarios V1–V6 joués en environnement test | Tous validés | Non joués ou échecs |
| Option choisie | Décision humaine explicite (A, B, C ou D) | Pas de décision |
| Plan de rollback | Validé | Non validé |
| Communication utilisateurs | Planifiée si changement visible | Non prévue |

**Scénarios de validation** :

| # | Scénario | Observation attendue |
|---|----------|---------------------|
| V1 | Créer candidat + `set-gespers` | `inscrits_crif`/`inscrits_mp` +1 |
| V2 | `clear-gespers` sur le même | Compteur -1 |
| V3 | Saisir manuellement `inscrits_crif=5` puis `set-gespers` | Passe à 6 |
| V4 | Import Excel `inscrits_crif=10` puis transitions | La sync écrase-t-elle ? |
| V5 | Abandon d'un candidat en formation | Compteur inchangé (pas de sync) |
| V6 | `bulk/set-gespers` sur N candidats | +N en masse |

---

## 11. Plan de patch futur conditionnel

### 11.1 Option recommandée : B (retirer `inscrit_gespers` du critère)

**1 méthode, 1 fichier** : retirer `candidate.inscrit_gespers` de la condition OR dans `_counts_in_formation_inscrits` (l.59).

**Effet** : `mark_gespers`/`clear_gespers` ne modifient plus les compteurs formation pour un candidat dont le seul critère de comptage est GESPERS. Toutes les autres transitions continuent normalement.

**Fichiers à modifier** :

| Fichier | Modification |
|---------|-------------|
| `candidate_lifecycle_service.py` l.59 | Retirer `candidate.inscrit_gespers` du OR |

**Tests à adapter** (3) :

| Test | Adaptation |
|------|-----------|
| `test_mark_gespers_increments_formation_inscrits_for_crif` | Inverser : compteur ne monte PAS pour un POSTULANT |
| `test_clear_gespers_decrements_formation_inscrits_without_going_negative` | Adapter : compteur ne descend PAS si candidat reste compté par phase |
| `test_mark_gespers_increments_mp_for_non_crif_formations` | Même logique, MP |

**Tests inchangés** (2) :

| Test | Raison |
|------|--------|
| `test_mark_gespers_does_not_double_count_already_validated_candidate` | Candidat déjà compté par phase |
| `test_clear_gespers_keeps_count_when_candidate_stays_validated` | Idem |

**Nouveaux tests** (9) : classe `Lot8GespersDecouplingTests` couvrant POSTULANT + mark/clear, candidat validé + mark, validate_inscription, start_formation, cancel_start_formation, bulk set-gespers, serializer create/update.

### 11.2 Feature flag optionnel

```python
# settings.py
LOT8_GESPERS_DECOUPLED = False  # Passer à True pour activer
```

Rollback = remettre `False`.

### 11.3 Stratégie de rollback

1. **Pre-deploy** : sauvegarder `inscrits_crif`/`inscrits_mp` pour toutes les formations (export JSON)
2. **Deploy** : modifier `_counts_in_formation_inscrits`
3. **Si Q6 > 0** : exécuter script de recalcul (dry-run d'abord)
4. **Si problème** : remettre `inscrit_gespers` dans le critère + restaurer backup

---

## 12. Plan de tests Lot 8

| Phase | Tests | Scope |
|-------|-------|-------|
| Pré-implémentation | Exécuter la suite actuelle — baseline verte | `python manage.py test rap_app.tests.tests_services.test_candidate_lifecycle_service -v 2` |
| Post-implémentation | 3 tests existants adaptés + 9 nouveaux | `test_candidate_lifecycle_service.py` |
| Non-régression | Suite complète formation-stats | `python manage.py test rap_app.tests.tests_api.test_formation_stats_json_contract -v 2` |
| Non-régression | Filtres formations | `python manage.py test rap_app.tests.tests_api.test_lot5_formation_filters -v 2` |
| Non-régression | Écriture candidat | `python manage.py test rap_app.tests.tests_models.tests_candidat_write_path -v 2` |

---

## 13. Recommandation finale

### Verdict : NO-GO pour implémentation tant que l'audit données n'est pas exécuté.

Le patch est **techniquement trivial** (1 ligne). La cartographie est **complète** (19 points d'entrée, 1 point de mutation). Le plan de tests est **prêt** (3 + 9 tests). La stratégie de rollback est **documentée**.

**Il manque une seule chose** : les résultats du script d'audit données (section 9.1), en particulier la réponse à **Q6** (combien de candidats sont comptés uniquement par `inscrit_gespers`).

### Prochaine étape concrète

```bash
cd /Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main
python manage.py shell
# copier-coller le script de la section 9.1
# transmettre le bloc "RÉSUMÉ" pour décision GO/NO-GO
```

---

*Fin de l'audit consolidé Lot 8 — aucune modification de code métier.*
*En attente de : (1) résultats audit données, (2) validation humaine, (3) GO explicite.*
