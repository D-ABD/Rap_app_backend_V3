# Lot 8 — Mini-audit lifecycle candidat et compteurs formation

**Date** : 2026-04-14
**Statut** : AUDIT UNIQUEMENT — aucune modification de code
**Gate** : validation humaine requise avant toute implémentation

---

## 1. Résumé exécutif

Le service `CandidateLifecycleService` synchronise automatiquement les compteurs `inscrits_crif` / `inscrits_mp` des formations à chaque transition candidat (inscription, entrée formation, set/clear GESPERS, etc.). Ce mécanisme crée une **double source d'écriture** sur des champs que la migration V3 définit comme « saisie manuelle ».

**Problème central** : un champ censé représenter la saisie métier (`inscrits_crif` / `inscrits_mp`) est aussi modifié programmatiquement par des transitions GESPERS et lifecycle, en contradiction potentielle avec la règle anti-régression V3.

**Impact potentiel** : si la sync est désactivée sans migration données, les compteurs formation divergeront progressivement du nombre réel d'inscrits. Si elle est conservée, la « saisie » reste partiellement dérivée de GESPERS.

---

## 2. Constats code

### 2.1 Point de mutation central

**Fichier** : `rap_app/services/candidate_lifecycle_service.py`

| Méthode | Lignes | Effet sur Formation |
|---------|--------|---------------------|
| `_adjust_formation_counter` | 78–91 | `select_for_update()` → modifie `inscrits_crif` ou `inscrits_mp` de ±delta |
| `_adjust_formation_inscrits` | 94–100 | Détermine CRIF vs MP via `_is_crif_formation`, délègue à `_adjust_formation_counter` |
| `_sync_formation_inscrits_from_transition` | 103–107 | Compare ancien/nouveau état "compté", ajuste de ±1 |
| `sync_candidate_formation_inscrits` | 110–140 | Gère changement de formation : -1 ancienne, +1 nouvelle |
| `_counts_in_formation_inscrits` | 55–69 | **Critère de comptage** : le candidat est "compté" si `inscrit_gespers=True` OU `date_validation_inscription` renseignée OU `date_entree_formation_effective` renseignée OU phase dans {INSCRIT_VALIDE, STAGIAIRE_EN_FORMATION, SORTI} |

### 2.2 Transitions qui déclenchent la sync

| Transition | Appelle sync ? | Impact compteur formation |
|------------|---------------|--------------------------|
| `validate_inscription` | Oui (l.167) | +1 si le candidat n'était pas compté |
| `start_formation` | Oui (l.238) | +1 si pas déjà compté |
| `cancel_start_formation` | Oui (l.275) | -1 si le candidat était compté |
| `complete_formation` | Oui (l.309) | +1 si pas déjà compté (reste compté en phase SORTI) |
| **`mark_gespers`** | **Oui (l.330)** | **+1 si pas déjà compté** — couplage GESPERS → saisie |
| **`clear_gespers`** | **Oui (l.351)** | **-1 si plus compté** — couplage GESPERS → saisie |
| `abandon` | **Non** | Aucun ajustement |
| `set_admissible` / `clear_admissible` | Non | Aucun impact |
| `set_accompagnement` / `clear_accompagnement` | Non | Aucun impact |
| `set_appairage` / `clear_appairage` | Non | Aucun impact |

### 2.3 Chemins d'écriture hors lifecycle

| Source | Fichier | Champs écrits |
|--------|---------|---------------|
| API REST (create/update formation) | `formations_serializers.py` | `inscrits_crif`, `inscrits_mp`, `nombre_candidats` |
| Import Excel | `handlers_lot3.py` | Idem via sérialiseur |
| Admin Django | `formations_admin.py` | Idem (formulaire admin) |
| Signal `candidat_post_save/delete` | `formation_candidats_signals.py` | `nombre_candidats` seulement (Count réel) |
| `FormationManager.increment_attendees` | `formations.py` | `inscrits_crif` ou `inscrits_mp` (non utilisé en prod) |
| Sérialiseur candidat (update) | `candidat_serializers.py` | Appelle `sync_candidate_formation_inscrits` |

### 2.4 Signal `nombre_candidats`

Le signal `formation_candidats_signals.py` recalcule `nombre_candidats = Count(candidats)` automatiquement à chaque ajout/suppression/réaffectation de candidat. Ce champ a donc **deux sources** :
1. Signal (Count ORM automatique)
2. Saisie manuelle (API, import, admin)

Le signal **écrase** silencieusement la valeur saisie.

---

## 3. Points de mutation identifiés

### 3.1 Couplage GESPERS → compteurs saisie (CRITIQUE)

```
mark_gespers(candidat)
  → inscrit_gespers = True
  → _sync_formation_inscrits_from_transition
    → _counts_in_formation_inscrits = True (car inscrit_gespers=True)
    → _adjust_formation_inscrits(delta=+1)
      → Formation.inscrits_crif += 1  (ou inscrits_mp)
```

**Conséquence** : chaque `set-gespers` sur un candidat **modifie** `inscrits_crif` ou `inscrits_mp` de la formation. Ce comportement est en **contradiction directe** avec la règle V3 « un champ saisie ne doit jamais être dérivé de GESPERS ».

### 3.2 Critère de comptage trop large

`_counts_in_formation_inscrits` retourne `True` pour **6 conditions** (OR) :
- `inscrit_gespers=True`
- `date_validation_inscription` renseignée
- `date_entree_formation_effective` renseignée
- phase `INSCRIT_VALIDE`
- phase `STAGIAIRE_EN_FORMATION`
- phase `SORTI`

Cela signifie que même un candidat non-GESPERS mais en phase INSCRIT_VALIDE est compté dans les inscrits formation. Le compteur ne reflète pas uniquement GESPERS, ni uniquement la saisie — c'est un **hybride**.

### 3.3 Abandon sans ajustement

`abandon()` ne décrémente **pas** les compteurs formation. Un candidat en SORTI (compté) qui passe en ABANDON reste compté dans `inscrits_crif`/`inscrits_mp`. C'est un **bug potentiel** ou une **décision métier non documentée**.

---

## 4. Workflows impactés

| Workflow | Déclencheur | Impact compteur | Risque si sync désactivée |
|----------|-------------|-----------------|--------------------------|
| Inscription candidat | API/admin → `validate_inscription` | +1 inscrits | Compteur ne monte plus à l'inscription |
| Entrée en formation | API/admin → `start_formation` | +1 si pas déjà compté | Idem |
| Set GESPERS (unitaire) | API `set-gespers/` | +1 inscrits | Plus de lien GESPERS → compteur |
| Set GESPERS (bulk) | API `bulk/set-gespers/` | +1 × N | Idem en masse |
| Clear GESPERS | API `clear-gespers/` | -1 si plus compté | Compteur ne descend plus |
| Annulation entrée formation | API → `cancel_start_formation` | -1 si était compté | Compteur reste gonflé |
| Sortie formation | API → `complete_formation` | +1 si pas compté (SORTI compté) | Moins critique (reste compté) |
| Abandon | API → `abandon` | **Aucun** | Pas de changement (déjà le cas) |
| Saisie manuelle | API/import/admin | Écrit directement | Continue de fonctionner |
| Import Excel | Upload XLSX | Écrit directement | Continue de fonctionner |
| Création candidat | API/admin | `nombre_candidats` via signal | Continue (signal indépendant) |

---

## 5. Risques métier et techniques

### Risques si la sync est CONSERVÉE (statu quo)
| # | Risque | Sévérité |
|---|--------|----------|
| R1 | `inscrits_crif`/`inscrits_mp` continuent d'être modifiés par GESPERS, contredisant la règle V3 | **Haute** |
| R2 | La « saisie » affichée aux utilisateurs inclut des incréments automatiques non-saisis | Moyenne |
| R3 | Confusion entre saisie humaine et sync machine dans les données historiques | Moyenne |

### Risques si la sync est DÉSACTIVÉE
| # | Risque | Sévérité |
|---|--------|----------|
| R4 | Les compteurs formation cessent de refléter le nombre réel d'inscrits par transition | **Haute** |
| R5 | Écart croissant entre `inscrits_crif + inscrits_mp` et le nombre réel de candidats en formation | **Haute** |
| R6 | Les workflows qui dépendent de la sync (inscription → places dispo) cessent de fonctionner | Haute |
| R7 | Les données historiques en base ont été influencées par la sync — pas de baseline « saisie pure » | Moyenne |

### Risques si la sync est MODIFIÉE (ex: ne plus compter `inscrit_gespers`)
| # | Risque | Sévérité |
|---|--------|----------|
| R8 | Modification du critère de comptage change le comportement pour tous les candidats existants | Haute |
| R9 | Les compteurs deviendraient incohérents avec l'historique sans migration de données | Haute |

---

## 6. Hypothèses sur les données historiques

| Hypothèse | Conséquence |
|-----------|-------------|
| H1 : Les compteurs `inscrits_crif`/`inscrits_mp` en base reflètent un **mélange** de saisie humaine et d'incréments lifecycle | Il n'existe pas de baseline « saisie pure » fiable en base |
| H2 : Les formations dont `inscrits_crif + inscrits_mp` corrèle exactement avec le nombre de candidats en formation ont probablement été **uniquement** alimentées par la sync | Ces formations n'ont peut-être jamais eu de saisie manuelle réelle |
| H3 : Les formations importées par Excel ont une valeur `inscrits_crif`/`inscrits_mp` qui est de la saisie pure | Ces valeurs ont pu être écrasées par la sync ensuite |
| H4 : `nombre_candidats` en base est recalculé automatiquement par le signal — la valeur « saisie » n'a jamais été préservée | Ce champ est de facto un Count automatique, pas une saisie |

---

## 7. Requêtes / scripts d'audit proposés

### 7.1 Corrélation inscrits saisie vs candidats GESPERS

```python
# À exécuter dans un shell Django (python manage.py shell)
from django.db.models import Count, Q, F
from rap_app.models.formations import Formation

# Formations où les inscrits saisie == candidats GESPERS (corrélation parfaite)
formations = Formation._base_manager.annotate(
    gespers_crif=Count(
        "candidats", filter=Q(candidats__inscrit_gespers=True, type_offre__nom="CRIF")
    ),
    gespers_mp=Count(
        "candidats",
        filter=Q(candidats__inscrit_gespers=True) & ~Q(type_offre__nom="CRIF"),
    ),
).filter(
    inscrits_crif=F("gespers_crif"),
    inscrits_mp=F("gespers_mp"),
)
print(f"Formations avec corrélation parfaite saisie == GESPERS : {formations.count()}")
for f in formations[:20]:
    print(f"  #{f.pk} {f.nom} — crif={f.inscrits_crif} mp={f.inscrits_mp}")
```

### 7.2 Formations avec écart significatif

```python
from django.db.models import Count, Q, F, Value
from django.db.models.functions import Coalesce
from rap_app.models.formations import Formation

formations = Formation._base_manager.annotate(
    total_inscrits_saisis=F("inscrits_crif") + F("inscrits_mp"),
    total_gespers=Count("candidats", filter=Q(candidats__inscrit_gespers=True)),
    total_en_formation=Count(
        "candidats",
        filter=Q(candidats__parcours_phase__in=["INSCRIT_VALIDE", "STAGIAIRE_EN_FORMATION", "SORTI"]),
    ),
).exclude(
    total_inscrits_saisis=0, total_gespers=0
).order_by("-total_inscrits_saisis")

print(f"Formations avec inscrits > 0 : {formations.count()}")
for f in formations[:30]:
    print(
        f"  #{f.pk} {f.nom} — saisie={f.total_inscrits_saisis} "
        f"gespers={f.total_gespers} en_formation={f.total_en_formation} "
        f"ecart={f.total_inscrits_saisis - f.total_gespers}"
    )
```

### 7.3 Formations à risque (saisie > 0 mais aucun candidat GESPERS lié)

```python
from django.db.models import Count, Q, F
from rap_app.models.formations import Formation

at_risk = Formation._base_manager.annotate(
    total_gespers=Count("candidats", filter=Q(candidats__inscrit_gespers=True)),
    total_inscrits=F("inscrits_crif") + F("inscrits_mp"),
).filter(
    total_inscrits__gt=0,
    total_gespers=0,
)
print(f"Formations avec inscrits saisie > 0 mais 0 candidats GESPERS : {at_risk.count()}")
for f in at_risk[:20]:
    print(f"  #{f.pk} {f.nom} — saisie={f.total_inscrits}")
```

### 7.4 `nombre_candidats` vs Count réel (vérifier la cohérence signal)

```python
from django.db.models import Count, F
from rap_app.models.formations import Formation

divergent = Formation._base_manager.annotate(
    real_count=Count("candidats"),
).exclude(
    nombre_candidats=F("real_count"),
)
print(f"Formations où nombre_candidats != Count réel : {divergent.count()}")
for f in divergent[:20]:
    print(f"  #{f.pk} {f.nom} — stocké={f.nombre_candidats} réel={f.real_count}")
```

### 7.5 Historique des modifications automatiques de compteurs

```python
from rap_app.models.formations import HistoriqueFormation

auto_changes = HistoriqueFormation.objects.filter(
    champ_modifie__in=["inscrits_crif", "inscrits_mp", "nombre_candidats"],
    commentaire__icontains="signal",
).order_by("-created_at")[:50]

print(f"Dernières modifications auto des compteurs : {auto_changes.count()}")
for h in auto_changes:
    print(f"  Formation #{h.formation_id} — {h.champ_modifie}: {h.ancienne_valeur} -> {h.nouvelle_valeur} — {h.commentaire}")
```

---

## 8. Scénarios de validation (à exécuter après décision)

| # | Scénario | Vérification |
|---|----------|-------------- |
| V1 | Créer un candidat + `set-gespers` | Observer si `inscrits_crif`/`inscrits_mp` change |
| V2 | `clear-gespers` sur le même candidat | Observer si le compteur redescend |
| V3 | Saisir manuellement `inscrits_crif=5` puis `set-gespers` | Observer si la valeur passe à 6 |
| V4 | Import Excel avec `inscrits_crif=10` puis transitions candidats | Observer si la sync écrase la valeur importée |
| V5 | Abandon d'un candidat en formation | Vérifier que le compteur ne change pas (bug actuel ?) |
| V6 | `bulk/set-gespers` sur 50 candidats | Vérifier l'incrément en masse |

---

## 9. Options de migration futures

### Option A — Conserver la sync (statu quo documenté)
- **Avantage** : aucune régression, comportement connu
- **Inconvénient** : `inscrits_crif`/`inscrits_mp` ne sont pas de la « pure saisie » — contradiction avec la cible V3
- **Effort** : nul
- **Recommandation** : acceptable comme transition si bien documenté

### Option B — Retirer `inscrit_gespers` du critère de comptage
- **Modifier** `_counts_in_formation_inscrits` pour ne plus inclure `inscrit_gespers` dans la condition
- **Avantage** : découplage GESPERS → compteurs saisie
- **Inconvénient** : les autres critères (phase, dates) continuent de modifier les compteurs
- **Effort** : faible (1 ligne), mais nécessite migration données
- **Risque** : les compteurs deviennent incohérents sans recalcul

### Option C — Désactiver complètement la sync lifecycle → compteurs
- **Supprimer** les appels à `_sync_formation_inscrits_from_transition` dans toutes les transitions
- **Avantage** : les compteurs deviennent purement manuels (cible V3)
- **Inconvénient** : les compteurs ne reflètent plus les transitions candidats — nécessite que les utilisateurs saisissent manuellement
- **Effort** : modéré (6 transitions à modifier + recalcul initial)
- **Risque élevé** : perte de l'automatisation → surcharge utilisateur, écarts immédiats

### Option D — Séparer les compteurs (saisie + auto)
- **Ajouter** des champs `inscrits_crif_auto`/`inscrits_mp_auto` calculés par le lifecycle
- **Conserver** `inscrits_crif`/`inscrits_mp` comme saisie pure
- **Avantage** : pas d'ambiguïté, traçabilité complète
- **Inconvénient** : duplication de champs, migration données, impact front
- **Effort** : élevé (modèle + migration + serializers + front)

---

## 10. Recommandation

**Option recommandée : A (statu quo documenté) avec préparation de B.**

Justification :
1. La sync lifecycle est **fonctionnellement utile** — les utilisateurs s'attendent à ce que les compteurs bougent avec les transitions
2. Désactiver sans migration données (Option C) créerait une **régression immédiate** visible
3. L'Option B (retirer `inscrit_gespers` seul du critère) est le **compromis le plus ciblé** — elle découple GESPERS des compteurs tout en conservant la sync lifecycle pour les autres transitions
4. L'Option D est la cible idéale à long terme mais nécessite un chantier structurel hors scope actuel

### Actions recommandées (post-validation humaine)
1. Exécuter les requêtes d'audit (section 7) pour quantifier l'impact réel en base
2. Valider les scénarios V1–V6 en environnement de test
3. Si validation OK, implémenter l'Option B en lot séparé
4. Documenter la décision et l'asymétrie résiduelle

---

## 11. Go / No-Go pour modification lifecycle

| Critère | Statut |
|---------|--------|
| Audit code complété | **OK** |
| Points de mutation identifiés | **OK** |
| Requêtes d'audit données proposées | **OK** — à exécuter sur environnement réel |
| Requêtes d'audit exécutées | **NON** — environnement de production requis |
| Scénarios de validation rédigés | **OK** — à jouer sur environnement de test |
| Scénarios de validation exécutés | **NON** |
| Décision humaine sur l'option retenue | **EN ATTENTE** |

**Verdict : NO-GO pour modification lifecycle.**

Le mini-audit **code** est complet. L'audit **données** nécessite une exécution sur environnement réel (requêtes section 7). Aucune modification de code ne doit être effectuée avant validation humaine des résultats d'audit données + choix d'option de migration.

---

## 12. Fichiers à modifier si validation (prévisionnel)

| Fichier | Modification envisagée (Option B) |
|---------|-----------------------------------|
| `rap_app/services/candidate_lifecycle_service.py` | Retirer `candidate.inscrit_gespers` de `_counts_in_formation_inscrits` |
| `rap_app/tests/tests_services/test_candidate_lifecycle_service.py` | Adapter les tests de comptage |
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Vérifier cohérence post-changement |

| Fichier | Modification envisagée (Option C) |
|---------|-----------------------------------|
| `rap_app/services/candidate_lifecycle_service.py` | Supprimer les appels `_sync_formation_inscrits_from_transition` dans 6 transitions |
| Idem | Supprimer `sync_candidate_formation_inscrits` |
| `rap_app/api/serializers/candidat_serializers.py` | Retirer appel à `sync_candidate_formation_inscrits` dans `create`/`update` |
| Tests | Adapter en conséquence |

---

*Fin du mini-audit Lot 8 — document en attente de validation humaine.*
