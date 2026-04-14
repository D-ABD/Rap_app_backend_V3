# Lot 8 — Préparation décisionnelle : lifecycle candidat et compteurs formation

**Date** : 2026-04-14
**Statut** : PRÉPARATION DÉCISIONNELLE — aucune modification de code
**Prérequis** : mini-audit code `docs/LOT8_MINI_AUDIT_LIFECYCLE.md` livré et relu
**Gate** : validation humaine requise avant toute implémentation

---

## 1. Résumé exécutif

Tous les lots sauf la mise en œuvre finale du Lot 8 sont terminés. Le Lot 8 est bloqué par une validation humaine.

Ce document prolonge le mini-audit livré avec :
- une **vérification de cohérence** entre l'audit et le code actuel ;
- une **cartographie exhaustive** de tous les chemins d'écriture vers les compteurs formation ;
- un **plan d'audit données exécutable** (management command prêt à copier-coller) ;
- un **plan de patch conditionnel** avec feature flag, rollback, et tests.

**Conclusion anticipée** : le code est cohérent avec l'audit. Le couplage `mark_gespers` → `inscrits_crif`/`inscrits_mp` est confirmé et documenté. L'Option B (retirer `inscrit_gespers` du critère de comptage) reste le meilleur compromis, mais nécessite un recalcul données préalable dont les requêtes sont fournies ci-dessous.

---

## 2. État du Lot 8

| Élément | Statut |
|---------|--------|
| Lots 0–7, 9, 10 | **Terminés** |
| Mini-audit code (LOT8_MINI_AUDIT_LIFECYCLE.md) | **Livré** |
| Requêtes d'audit données | **Proposées, non exécutées** |
| Vérification cohérence audit ↔ code | **Terminée** (ce document) |
| Cartographie exhaustive mutations | **Terminée** (ce document) |
| Management command d'audit données | **Préparé** (ce document, section 8) |
| Plan de patch conditionnel | **Préparé** (ce document, section 10) |
| Plan de tests Lot 8 | **Préparé** (ce document, section 11) |
| Exécution audit données | **NON FAIT** — requiert environnement réel |
| Décision humaine | **EN ATTENTE** |
| Implémentation Lot 8 | **BLOQUÉE** |

---

## 3. Lecture du mini-audit existant

Le document `LOT8_MINI_AUDIT_LIFECYCLE.md` identifie correctement :

1. Le **point de mutation central** : `_counts_in_formation_inscrits` (l.55–69) avec 6 conditions OR
2. Les **6 transitions** qui appellent `_sync_formation_inscrits_from_transition`
3. Le **couplage critique** `mark_gespers` → `inscrits_crif`/`inscrits_mp`
4. L'**anomalie `abandon`** qui ne décrémente pas les compteurs
5. Les **4 options** de migration (A–D)
6. La **recommandation** A avec préparation de B

**Qualité globale** : audit fidèle, cartographie correcte. Zones à compléter identifiées ci-dessous.

---

## 4. Validation / écarts entre audit et code

### 4.1 Constats confirmés (aucun écart)

| Constat de l'audit | Code vérifié | Verdict |
|-------------------|--------------|---------|
| `_adjust_formation_counter` fait `select_for_update` + `setattr` + `save` | `candidate_lifecycle_service.py` l.78–91 | **Conforme** |
| `mark_gespers` appelle `_sync_formation_inscrits_from_transition` | l.330 | **Conforme** |
| `clear_gespers` appelle `_sync_formation_inscrits_from_transition` | l.351 | **Conforme** |
| `abandon` n'appelle PAS la sync | l.420–443 | **Conforme** — pas d'appel |
| Signal `formation_candidats_signals` met à jour `nombre_candidats` uniquement | l.49 | **Conforme** |
| `sync_candidate_formation_inscrits` appelé dans le sérialiseur candidat | `candidat_serializers.py` l.840, l.939–945 | **Conforme** |
| Bulk service délègue au lifecycle 1-par-1 | `candidate_bulk_service.py` l.40–53 | **Conforme** |

### 4.2 Compléments identifiés

**A. Chemin d'écriture admin non mentionné explicitement dans l'audit** :

Les actions admin `act_gespers_on`/`act_gespers_off` (`candidat_admin.py` l.387–397) appellent directement `mark_gespers`/`clear_gespers` avec le même impact compteur. L'audit les mentionne dans la section "chemins hors lifecycle" mais sans les détailler comme point d'entrée API. **Impact** : nul (même chemin que l'API).

**B. `_target_phase_without_live_training` utilise `inscrit_gespers`** :

```python
# candidate_lifecycle_service.py l.49–52
def _target_phase_without_live_training(cls, candidate):
    if candidate.inscrit_gespers or candidate.date_validation_inscription:
        return Candidat.ParcoursPhase.INSCRIT_VALIDE
    return Candidat.ParcoursPhase.POSTULANT
```

Ce helper détermine la phase de retour après `cancel_start_formation`. Si `inscrit_gespers` est retiré du critère de comptage (Option B), cette méthode n'est PAS impactée car elle concerne la **phase**, pas le compteur. Mais si on envisage l'Option C (découplage total), cette méthode devrait aussi être revue.

**C. `clear_gespers` peut changer la phase en `POSTULANT`** :

```python
# candidate_lifecycle_service.py l.342–344
if candidate.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE \
        and not candidate.date_validation_inscription:
    candidate.parcours_phase = Candidat.ParcoursPhase.POSTULANT
```

Ce cas est subtil : un candidat en phase `INSCRIT_VALIDE` sans `date_validation_inscription` (uniquement par `inscrit_gespers`) sera rétrogradé en POSTULANT au `clear_gespers`. Cela impacte le critère de comptage car POSTULANT n'est pas dans les phases comptées → le compteur descend de -1. **Cet effet de bord est correctement géré par `_sync_formation_inscrits_from_transition` en aval.**

**D. `complete_formation` implique un candidat qui reste "compté" indéfiniment** :

La phase `SORTI` est dans les phases comptées. Un candidat qui termine sa formation reste compté dans `inscrits_crif`/`inscrits_mp` de façon permanente. C'est cohérent avec la sémantique "inscrits ayant participé à la formation".

### 4.3 Verdict

**Aucun écart structurel** entre le mini-audit et le code actuel. Les compléments ci-dessus sont des précisions, pas des corrections.

---

## 5. Cartographie précise des points de mutation

### 5.1 Écritures sur `inscrits_crif` / `inscrits_mp`

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ÉCRITURES inscrits_crif / inscrits_mp           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LIFECYCLE (±1 automatique)                                        │
│  ─────────────────────────                                         │
│  candidate_lifecycle_service.py                                     │
│  └── _adjust_formation_counter (l.78–91)                           │
│      └── appelé par _adjust_formation_inscrits (l.94–100)          │
│          └── appelé par _sync_formation_inscrits_from_transition   │
│              │   (l.103–107)                                       │
│              ├── validate_inscription  (l.167)  → +1               │
│              ├── start_formation       (l.238)  → +1               │
│              ├── cancel_start_formation(l.275)  → -1               │
│              ├── complete_formation    (l.309)  → +1 (si nouveau)  │
│              ├── mark_gespers         (l.330)  → +1 ⚠ COUPLAGE    │
│              └── clear_gespers        (l.351)  → -1 ⚠ COUPLAGE    │
│          └── appelé par sync_candidate_formation_inscrits          │
│              │   (l.110–140)                                       │
│              ├── candidat_serializers.py create() (l.840)          │
│              └── candidat_serializers.py update() (l.939–945)      │
│                                                                     │
│  SAISIE DIRECTE (valeur absolue)                                   │
│  ─────────────────────────────                                     │
│  formations_serializers.py                                          │
│  ├── BaseFormationWriteSerializer.create (l.697–701)               │
│  └── BaseFormationWriteSerializer.update (l.703–708)               │
│  handlers_lot3.py (import Excel) → même sérialiseur (l.405–412)   │
│  formations_admin.py → formulaire admin Django                     │
│                                                                     │
│  HÉRITÉ (non utilisé en production)                                │
│  ──────────────────────────────────                                │
│  FormationManager.increment_attendees (l.266–276) → tests only    │
│                                                                     │
│  ❌ JAMAIS modifié par                                              │
│  ──────────────────                                                │
│  Signal formation_candidats_signals → nombre_candidats seulement   │
│  abandon() → pas d'appel _sync                                    │
│  set/clear_admissible → pas d'impact                              │
│  set/clear_accompagnement → pas d'impact                          │
│  set/clear_appairage → pas d'impact                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Points d'entrée utilisateur → mutation compteur

```
┌──────────────────────────────────────────────────────────────────────┐
│  POINT D'ENTRÉE                          → CHEMIN → MUTATION        │
├──────────────────────────────────────────────────────────────────────┤
│ POST /api/candidats/{pk}/set-gespers/    → mark_gespers    → ±1    │
│ POST /api/candidats/{pk}/clear-gespers/  → clear_gespers   → ±1    │
│ POST /api/candidats/bulk/set-gespers/    → bulk_set_gespers → ±N   │
│ POST /api/candidats/bulk/clear-gespers/  → bulk_clear_gespers → ±N │
│ POST /api/candidats/{pk}/validate-inscription/ → validate   → +1   │
│ POST /api/candidats/bulk/validate-inscription/ → bulk_val   → +N   │
│ POST /api/candidats/{pk}/start-formation/→ start_formation → +1    │
│ POST /api/candidats/bulk/start-formation/→ bulk_start      → +N    │
│ POST /api/candidats/{pk}/cancel-start-formation/ → cancel  → -1    │
│ POST /api/candidats/{pk}/complete-formation/ → complete     → +1*  │
│ POST /api/candidats/ (create)            → serializer.create → +1* │
│ PATCH /api/candidats/{pk}/ (update)      → serializer.update → ±1* │
│ Admin: "Inscrit GESPERS → Oui"          → mark_gespers    → ±1    │
│ Admin: "Inscrit GESPERS → Non"          → clear_gespers   → ±1    │
│ Admin: "Statut → En formation"           → start_formation → +1    │
│ Admin: "Statut → Abandon"               → abandon         → 0     │
│ PUT/PATCH /api/formations/{pk}/ (update) → saisie directe  → abs   │
│ Import Excel formations                  → saisie directe  → abs   │
│ Admin formation formulaire               → saisie directe  → abs   │
├──────────────────────────────────────────────────────────────────────┤
│ * = seulement si le candidat n'était pas déjà "compté"              │
│ abs = valeur absolue (pas delta)                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Workflows dépendants

### 6.1 Workflows qui CASSENT si la sync est désactivée (Option C)

| # | Workflow | Comportement actuel | Conséquence sans sync |
|---|---------|--------------------|-----------------------|
| W1 | Inscription candidat → `validate_inscription` | `inscrits_crif` += 1 | La formation montre 0 inscrits tant que personne ne saisit manuellement |
| W2 | Entrée en formation → `start_formation` | `inscrits_crif` += 1 | Idem |
| W3 | Dashboard "taux de saturation" | Basé sur `inscrits_crif + inscrits_mp` / `total_places` | Taux = 0% malgré des candidats en formation |
| W4 | Dashboard "places disponibles" | Basé sur `total_places - total_inscrits` | Toutes les places apparaissent libres |
| W5 | Annulation entrée → `cancel_start_formation` | `inscrits_crif` -= 1 | Compteur ne redescend plus (déjà à 0) |
| W6 | Export XLSX colonnes "Inscrits (saisie)" | Affiche `inscrits_crif` / `inscrits_mp` | Valeurs gelées à l'état pré-désactivation |

### 6.2 Workflows qui CASSENT si seul `inscrit_gespers` est retiré du critère (Option B)

| # | Workflow | Comportement actuel | Conséquence Option B |
|---|---------|--------------------|-----------------------|
| W7 | Set GESPERS sur candidat POSTULANT (sans validation préalable) | +1 inscrits | **Pas d'incrément** — le candidat n'est compté que quand il est validé, en formation, ou sorti |
| W8 | Clear GESPERS sur candidat déjà validé | Compteur inchangé (reste compté par phase) | **Identique** — pas de changement |

**Impact Option B** : seul le cas W7 change de comportement. Un candidat marqué GESPERS sans avoir été validé ne sera plus compté. C'est **conforme à la cible V3** (la saisie GESPERS ne doit pas influencer les compteurs saisie).

### 6.3 Workflows NON impactés (toutes options)

| Workflow | Raison |
|---------|--------|
| Saisie manuelle `inscrits_crif`/`inscrits_mp` via API/import/admin | Chemin direct, pas via lifecycle |
| Signal `nombre_candidats` | Indépendant du lifecycle inscrits |
| Commentaires, PDF exports | Consomment `total_inscrits` (saisie), pas la sync |
| Stats candidats (`candidats-stats/`) | Comptent `inscrit_gespers` via Count ORM, indépendant des compteurs formation |

---

## 7. Plan d'audit données exécutable

### 7.1 Méthode d'échantillonnage

L'audit données doit répondre à 5 questions :

| # | Question | Requête |
|---|----------|---------|
| Q1 | Combien de formations ont `inscrits_crif + inscrits_mp` = Count(candidats GESPERS) ? | Corrélation parfaite → compteurs probablement 100% sync, pas de saisie manuelle |
| Q2 | Combien de formations ont un écart saisie > GESPERS ? | Excédent → saisie manuelle ou import avec valeurs supérieures |
| Q3 | Combien de formations ont un écart saisie < GESPERS ? | Déficit → sync partiellement absente ou compteur corrigé manuellement à la baisse |
| Q4 | Combien de formations ont des inscrits saisie > 0 mais 0 candidats GESPERS ? | Saisie pure — pas de dépendance lifecycle |
| Q5 | `nombre_candidats` est-il cohérent avec Count réel ? | Vérifie que le signal fonctionne correctement |

### 7.2 Critères de formation "à risque"

Une formation est **à risque** pour l'Option B si :
- `inscrits_crif + inscrits_mp > 0`
- ET elle possède des candidats dont le **seul** critère de comptage est `inscrit_gespers=True` (pas de `date_validation_inscription`, pas de phase comptée)

Ces formations verraient leur compteur **baisser** si on recalcule après retrait de `inscrit_gespers` du critère.

---

## 8. Requêtes proposées

### 8.1 Management command d'audit complet

Le script suivant est conçu pour être exécuté via `python manage.py shell` ou copié dans un management command. Il produit un rapport textuel complet.

```python
# =========================================================================
# LOT 8 — SCRIPT D'AUDIT DONNÉES
# À exécuter : python manage.py shell < ce_script.py
# OU copier-coller dans python manage.py shell
# NE MODIFIE AUCUNE DONNÉE (lecture seule)
# =========================================================================

from django.db.models import Count, Q, F, Value, IntegerField, Case, When
from django.db.models.functions import Coalesce
from rap_app.models.formations import Formation, HistoriqueFormation
from rap_app.models.candidat import Candidat

print("=" * 70)
print("LOT 8 — AUDIT DONNÉES FORMATIONS / INSCRITS / GESPERS")
print("=" * 70)

# ---------------------------------------------------------------
# Q1 : Corrélation parfaite saisie == GESPERS
# ---------------------------------------------------------------
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

perfect = qs.filter(inscrits_crif=F("gespers_crif"), inscrits_mp=F("gespers_mp"))
print(f"\n--- Q1 : Corrélation parfaite saisie == GESPERS ---")
print(f"Formations avec corrélation parfaite : {perfect.count()}")
for f in perfect.exclude(total_saisie=0)[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} crif_s={f.inscrits_crif} crif_g={f.gespers_crif} mp_s={f.inscrits_mp} mp_g={f.gespers_mp}")

# ---------------------------------------------------------------
# Q2 : Écart saisie > GESPERS (excédent saisie)
# ---------------------------------------------------------------
excess = qs.filter(total_saisie__gt=F("total_gespers")).exclude(total_saisie=0)
print(f"\n--- Q2 : Saisie > GESPERS (excédent saisie) ---")
print(f"Formations : {excess.count()}")
for f in excess[:25]:
    ecart = f.total_saisie - f.total_gespers
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} saisie={f.total_saisie} gespers={f.total_gespers} ecart=+{ecart}")

# ---------------------------------------------------------------
# Q3 : Écart saisie < GESPERS (déficit saisie)
# ---------------------------------------------------------------
deficit = qs.filter(total_saisie__lt=F("total_gespers"))
print(f"\n--- Q3 : Saisie < GESPERS (déficit saisie) ---")
print(f"Formations : {deficit.count()}")
for f in deficit[:25]:
    ecart = f.total_saisie - f.total_gespers
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} saisie={f.total_saisie} gespers={f.total_gespers} ecart={ecart}")

# ---------------------------------------------------------------
# Q4 : Saisie > 0, 0 candidats GESPERS
# ---------------------------------------------------------------
saisie_only = qs.filter(total_saisie__gt=0, total_gespers=0)
print(f"\n--- Q4 : Saisie > 0 mais 0 candidats GESPERS ---")
print(f"Formations : {saisie_only.count()}")
for f in saisie_only[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} saisie={f.total_saisie}")

# ---------------------------------------------------------------
# Q5 : nombre_candidats vs Count réel
# ---------------------------------------------------------------
divergent = Formation._base_manager.annotate(
    real_count=Count("candidats"),
).exclude(nombre_candidats=F("real_count"))
print(f"\n--- Q5 : nombre_candidats divergent du Count réel ---")
print(f"Formations divergentes : {divergent.count()}")
for f in divergent[:25]:
    print(f"  #{f.pk:>5} {f.nom[:50]:50s} stocké={f.nombre_candidats} réel={f.real_count}")

# ---------------------------------------------------------------
# Q6 : Formations à risque (Option B)
# Candidats dont le SEUL critère de comptage est inscrit_gespers
# ---------------------------------------------------------------
print(f"\n--- Q6 : Candidats comptés UNIQUEMENT par inscrit_gespers ---")
gespers_only_counted = Candidat.objects.filter(
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
print(f"Candidats dans ce cas : {gespers_only_counted.count()}")
formation_ids = set(gespers_only_counted.values_list("formation_id", flat=True))
print(f"Formations impactées : {len(formation_ids)}")
for c in gespers_only_counted[:25]:
    print(f"  Candidat #{c.pk:>5} — Formation #{c.formation_id} — phase={c.parcours_phase}")

# Calcul de l'impact chiffré par formation
if formation_ids:
    print(f"\n  Impact par formation si Option B appliquée :")
    for fid in sorted(formation_ids)[:25]:
        n = gespers_only_counted.filter(formation_id=fid).count()
        fm = Formation._base_manager.filter(pk=fid).values("nom", "inscrits_crif", "inscrits_mp").first()
        if fm:
            print(f"    Formation #{fid:>5} {fm['nom'][:45]:45s} — compteur baisserait de -{n}")

# ---------------------------------------------------------------
# Q7 : Historique modifications compteurs
# ---------------------------------------------------------------
print(f"\n--- Q7 : Historique des modifications automatiques (dernières 50) ---")
auto = HistoriqueFormation.objects.filter(
    champ_modifie__in=["inscrits_crif", "inscrits_mp"],
).order_by("-created_at")[:50]
print(f"Entrées trouvées : {auto.count()}")
for h in auto:
    print(f"  Formation #{h.formation_id:>5} — {h.champ_modifie}: {h.ancienne_valeur} → {h.nouvelle_valeur} — {h.commentaire[:60]}")

# ---------------------------------------------------------------
# Résumé
# ---------------------------------------------------------------
total_formations = Formation._base_manager.count()
with_inscrits = qs.filter(total_saisie__gt=0).count()
print(f"\n{'=' * 70}")
print(f"RÉSUMÉ")
print(f"{'=' * 70}")
print(f"Formations totales                    : {total_formations}")
print(f"Formations avec inscrits > 0          : {with_inscrits}")
print(f"Corrélation parfaite saisie==GESPERS  : {perfect.exclude(total_saisie=0).count()}")
print(f"Excédent saisie > GESPERS             : {excess.count()}")
print(f"Déficit saisie < GESPERS              : {deficit.count()}")
print(f"Saisie pure (0 GESPERS)               : {saisie_only.count()}")
print(f"nombre_candidats divergent            : {divergent.count()}")
print(f"Candidats comptés UNIQUEMENT par GESPERS : {gespers_only_counted.count()}")
print(f"Formations impactées par Option B     : {len(formation_ids)}")
print(f"{'=' * 70}")
print(f"FIN AUDIT DONNÉES LOT 8")
```

### 8.2 Mode d'exécution

```bash
# Option 1 : copier-coller dans le shell Django
python manage.py shell
# puis coller le script ci-dessus

# Option 2 : depuis un fichier
python manage.py shell < docs/lot8_audit_data_script.py

# Option 3 : management command (si créé)
python manage.py lot8_audit_data
```

### 8.3 Interprétation des résultats

| Résultat Q6 | Interprétation | Action |
|-------------|---------------|--------|
| `gespers_only_counted = 0` | Aucun candidat n'est compté uniquement par GESPERS | **Option B safe** — le retrait de `inscrit_gespers` du critère ne change rien |
| `gespers_only_counted > 0, < 10` | Quelques cas marginaux | Option B safe avec recalcul ponctuel |
| `gespers_only_counted > 10` | Effet significatif | Option B nécessite une migration données (recalcul compteurs) |

---

## 9. Critères de décision GO / NO-GO

### 9.1 Grille de décision

| Critère | Condition GO | Condition NO-GO |
|---------|-------------|-----------------|
| Audit données exécuté | Résultats Q1–Q7 disponibles | Non exécuté |
| Candidats "GESPERS-only" (Q6) | Quantifié et < seuil acceptable | Non quantifié ou trop élevé sans plan de recalcul |
| Scénarios V1–V6 joués | Tous validés en environnement test | Non joués ou échecs non expliqués |
| Option choisie | Décision humaine explicite sur A, B, C ou D | Pas de décision |
| Plan de rollback validé | Feature flag ou stratégie de retour | Pas de stratégie de retour |
| Communication utilisateurs | Plan de communication si changement visible | Pas de communication prévue pour un changement visible |

### 9.2 Matrice de décision selon les résultats d'audit

```
Q6 = 0 candidats GESPERS-only
  → GO pour Option B sans migration données
  → Le retrait de inscrit_gespers du critère ne change aucun compteur

Q6 = 1–20 candidats GESPERS-only
  → GO pour Option B AVEC recalcul ciblé
  → Script de recalcul à préparer pour les formations impactées

Q6 > 20 candidats GESPERS-only
  → GO conditionnel pour Option B avec migration complète
  → Script de recalcul global + vérification manuelle sur échantillon

Q3 > 0 (saisie < GESPERS = déficit)
  → Signale un problème pré-existant indépendant de la migration
  → À investiguer séparément
```

---

## 10. Plan de patch futur conditionnel

### 10.1 Option B — Retirer `inscrit_gespers` du critère de comptage

**Périmètre exact** : 1 méthode à modifier, 1 fichier.

#### Fichier : `rap_app/services/candidate_lifecycle_service.py`

**Avant** (l.55–69) :
```python
@classmethod
def _counts_in_formation_inscrits(cls, candidate: Candidat) -> bool:
    return bool(
        candidate.formation_id
        and (
            candidate.inscrit_gespers                    # ← À RETIRER
            or candidate.date_validation_inscription
            or candidate.date_entree_formation_effective
            or candidate.parcours_phase
            in {
                Candidat.ParcoursPhase.INSCRIT_VALIDE,
                Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                Candidat.ParcoursPhase.SORTI,
            }
        )
    )
```

**Après** :
```python
@classmethod
def _counts_in_formation_inscrits(cls, candidate: Candidat) -> bool:
    return bool(
        candidate.formation_id
        and (
            candidate.date_validation_inscription
            or candidate.date_entree_formation_effective
            or candidate.parcours_phase
            in {
                Candidat.ParcoursPhase.INSCRIT_VALIDE,
                Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                Candidat.ParcoursPhase.SORTI,
            }
        )
    )
```

**Effet** : `mark_gespers`/`clear_gespers` n'incrémentent/décrémentent plus les compteurs formation SI c'est le seul critère actif pour le candidat. Les autres transitions (validation, entrée formation, etc.) continuent de fonctionner normalement.

#### Impact sur d'autres fichiers

| Fichier | Impact |
|---------|--------|
| `candidat_serializers.py` l.932 | Appelle `_counts_in_formation_inscrits` pour état "avant" → **automatiquement aligné** (même méthode) |
| `candidate_bulk_service.py` | Aucun — délègue au lifecycle |
| `formations_serializers.py` | Aucun — saisie directe non impactée |
| `formation_candidats_signals.py` | Aucun — gère `nombre_candidats`, pas `inscrits_*` |

### 10.2 Stratégie de feature flag

Si un déploiement progressif est souhaité :

```python
# settings.py ou config
LOT8_GESPERS_DECOUPLED = False  # Passer à True pour activer

# candidate_lifecycle_service.py
@classmethod
def _counts_in_formation_inscrits(cls, candidate: Candidat) -> bool:
    from django.conf import settings
    include_gespers = not getattr(settings, "LOT8_GESPERS_DECOUPLED", False)
    return bool(
        candidate.formation_id
        and (
            (include_gespers and candidate.inscrit_gespers)
            or candidate.date_validation_inscription
            or candidate.date_entree_formation_effective
            or candidate.parcours_phase
            in {
                Candidat.ParcoursPhase.INSCRIT_VALIDE,
                Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                Candidat.ParcoursPhase.SORTI,
            }
        )
    )
```

**Rollback** : remettre `LOT8_GESPERS_DECOUPLED = False` (ou supprimer le flag). Les compteurs ne sont pas recalculés automatiquement, mais les futures transitions redeviennent cohérentes.

### 10.3 Script de recalcul (si Q6 > 0)

À exécuter après activation de l'Option B pour réaligner les compteurs :

```python
# LOT 8 — Script de recalcul conditionnel
# NE PAS EXÉCUTER SANS VALIDATION HUMAINE

from django.db import transaction
from django.db.models import Count, Q
from rap_app.models.formations import Formation
from rap_app.models.candidat import Candidat

def recalcul_inscrits_option_b(dry_run=True):
    """
    Recalcule inscrits_crif / inscrits_mp selon le nouveau critère
    (sans inscrit_gespers).
    """
    formations = Formation._base_manager.all()
    changes = []

    for f in formations.iterator():
        candidats_comptes_crif = Candidat.objects.filter(
            formation=f,
        ).filter(
            Q(date_validation_inscription__isnull=False)
            | Q(date_entree_formation_effective__isnull=False)
            | Q(parcours_phase__in=[
                Candidat.ParcoursPhase.INSCRIT_VALIDE,
                Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                Candidat.ParcoursPhase.SORTI,
            ])
        )

        if f.type_offre and f.type_offre.nom == "CRIF":
            new_crif = candidats_comptes_crif.count()
            new_mp = 0
        else:
            new_crif = 0
            new_mp = candidats_comptes_crif.count()

        if new_crif != (f.inscrits_crif or 0) or new_mp != (f.inscrits_mp or 0):
            changes.append({
                "id": f.pk,
                "nom": f.nom,
                "old_crif": f.inscrits_crif,
                "new_crif": new_crif,
                "old_mp": f.inscrits_mp,
                "new_mp": new_mp,
            })
            if not dry_run:
                f.inscrits_crif = new_crif
                f.inscrits_mp = new_mp
                f.save(update_fields=["inscrits_crif", "inscrits_mp"])

    print(f"Formations à modifier : {len(changes)}")
    for c in changes:
        action = "MODIFIÉ" if not dry_run else "PRÉVU"
        print(
            f"  [{action}] #{c['id']} {c['nom'][:45]} — "
            f"crif: {c['old_crif']} → {c['new_crif']}, "
            f"mp: {c['old_mp']} → {c['new_mp']}"
        )
    return changes

# Exécution en dry-run (lecture seule)
recalcul_inscrits_option_b(dry_run=True)

# Pour appliquer réellement (après validation) :
# with transaction.atomic():
#     recalcul_inscrits_option_b(dry_run=False)
```

### 10.4 Stratégie de rollback complète

| Phase | Action | Réversibilité |
|-------|--------|---------------|
| Pre-deploy | Sauvegarder les valeurs actuelles `inscrits_crif`/`inscrits_mp` pour toutes les formations | Export CSV/JSON |
| Deploy Option B | Modifier `_counts_in_formation_inscrits` | Réversible (remettre la ligne) |
| Si Q6 > 0 : recalcul | Exécuter `recalcul_inscrits_option_b(dry_run=False)` | Réversible via backup |
| Rollback si problème | 1. Remettre `inscrit_gespers` dans le critère | Immédiat |
| | 2. Restaurer les compteurs depuis le backup | Script inverse |

---

## 11. Plan de tests Lot 8

### 11.1 Tests existants à adapter

| Fichier | Test | Adaptation nécessaire |
|---------|------|-----------------------|
| `test_candidate_lifecycle_service.py` | `test_mark_gespers_increments_formation_inscrits_for_crif` (l.207) | **Inverser l'assertion** : `inscrits_crif` ne doit PAS passer à 1 si le candidat est POSTULANT |
| Idem | `test_clear_gespers_decrements_formation_inscrits_without_going_negative` (l.230) | Adapter : le compteur ne descend pas si le candidat reste compté par phase |
| Idem | `test_mark_gespers_increments_mp_for_non_crif_formations` (l.255) | Même logique, MP cette fois |
| Idem | `test_mark_gespers_does_not_double_count_already_validated_candidate` (l.280) | **Inchangé** — le candidat est déjà compté par `date_validation_inscription` |
| Idem | `test_clear_gespers_keeps_count_when_candidate_stays_validated` (l.299) | **Inchangé** — le candidat reste compté par phase |

### 11.2 Nouveaux tests à ajouter

```python
# Plan de tests — à créer dans test_candidate_lifecycle_service.py
# NE PAS CRÉER MAINTENANT — en attente de validation humaine

class Lot8GespersDecouplingTests(TestCase):
    """Tests spécifiques au découplage GESPERS → compteurs formation."""

    def test_mark_gespers_on_postulant_does_not_increment_counter(self):
        """Un candidat POSTULANT marqué GESPERS ne doit pas incrémenter
        inscrits_crif (Option B)."""
        pass

    def test_clear_gespers_on_postulant_does_not_decrement_counter(self):
        """Un candidat POSTULANT non-GESPERS → compteur inchangé."""
        pass

    def test_mark_gespers_on_validated_candidate_does_not_change_counter(self):
        """Un candidat déjà INSCRIT_VALIDE → mark_gespers ne change rien
        au compteur (il est déjà compté par la phase)."""
        pass

    def test_validate_inscription_still_increments_counter(self):
        """validate_inscription continue d'incrémenter le compteur
        indépendamment de inscrit_gespers."""
        pass

    def test_start_formation_still_increments_counter(self):
        """start_formation continue d'incrémenter si pas déjà compté."""
        pass

    def test_cancel_start_formation_still_decrements_counter(self):
        """cancel_start_formation continue de décrémenter."""
        pass

    def test_bulk_set_gespers_does_not_change_counters_for_postulants(self):
        """bulk set-gespers sur N POSTULANTS → aucun changement compteurs."""
        pass

    def test_serializer_create_with_gespers_flag_does_not_count_without_phase(self):
        """Création candidat avec inscrit_gespers=True mais pas de phase comptée
        → compteur formation inchangé."""
        pass

    def test_serializer_update_gespers_flag_does_not_change_counter(self):
        """PATCH candidat inscrit_gespers=True → compteur formation inchangé
        si le candidat est POSTULANT."""
        pass
```

### 11.3 Tests de non-régression à vérifier

| Suite | Nb tests attendus | Impact Lot 8 |
|-------|-------------------|-------------|
| `test_candidate_lifecycle_service.py` | 12 | 3 à adapter, 9 inchangés |
| `test_formation_stats_json_contract.py` | ~25 | Aucun changement (consomment `inscrits_crif`/`inscrits_mp` tels quels) |
| `test_lot5_formation_filters.py` | ~5 | Potentiel impact si le filtre `places_disponibles` dépend de candidats GESPERS-only |
| `tests_candidat_write_path.py` | ~8 | À vérifier — écrit `inscrit_gespers=True` dans les fixtures |

---

## 12. Recommandation finale

### Verdict : NO-GO pour implémentation

Le code est cohérent avec l'audit. Le patch est **techniquement simple** (1 ligne à retirer dans `_counts_in_formation_inscrits`). Mais la **décision est bloquée** par l'absence de données d'audit.

### Actions requises avant GO

| # | Action | Responsable | Livrable |
|---|--------|------------|----------|
| 1 | Exécuter le script d'audit données (section 8.1) sur environnement réel | Humain | Résultats Q1–Q7, notamment Q6 |
| 2 | Interpréter les résultats selon la grille (section 9.2) | Humain | Décision sur l'option (A, B, C, D) |
| 3 | Jouer les scénarios V1–V6 sur environnement de test | Humain | Validation comportementale |
| 4 | Valider le plan de rollback (section 10.4) | Humain | Accord sur la stratégie de retour |
| 5 | Communiquer aux utilisateurs si changement visible | Humain | Message de communication |
| 6 | Donner le GO explicite | Humain | Message clair |

### Résumé décisionnel

```
SI Q6 = 0
  → Option B applicable immédiatement
  → Patch : retirer 1 ligne dans _counts_in_formation_inscrits
  → Tests : adapter 3 tests existants + ajouter 9 nouveaux
  → Rollback : remettre la ligne
  → Risque : minimal

SI Q6 > 0
  → Option B applicable avec recalcul
  → Patch + script de recalcul (section 10.3)
  → Backup préalable des compteurs
  → Rollback : restaurer depuis backup + remettre la ligne
  → Risque : modéré

SI décision = statu quo (Option A)
  → Aucun changement
  → Documenter la contradiction résiduelle avec la cible V3
  → Risque : dette technique acceptée
```

---

*Fin du document de préparation décisionnelle Lot 8.*
*Aucune modification de code métier n'a été effectuée.*
*En attente de validation humaine pour poursuivre.*
