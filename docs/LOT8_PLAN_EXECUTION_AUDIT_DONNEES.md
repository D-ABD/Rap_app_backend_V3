# Lot 8 — Plan d'exécution de l'audit données

**Date** : 2026-04-14
**Statut** : PLAN D'EXÉCUTION — aucune modification de code métier
**Prérequis** : audit consolidé final validé (`docs/LOT8_AUDIT_CONSOLIDE_FINAL.md`)
**Objectif** : rendre Lot 8 décidable en exécutant l'audit données

---

## 1. Résumé exécutif

Tous les lots sauf l'exécution validée du Lot 8 sont terminés. Le Lot 8 est bloqué côté code métier.

Ce document décrit **comment exécuter l'audit données** et **comment interpréter les résultats** pour prendre la décision GO/NO-GO.

**Livrable opérationnel** : une management command `lot8_audit_data` a été créée dans `rap_app/management/commands/lot8_audit_data.py`. Elle exécute les 7 requêtes d'audit en **lecture seule** et produit un rapport structuré.

---

## 2. Documents Lot 8 — validation croisée

| Document | Contenu | Statut |
|----------|---------|--------|
| `LOT8_MINI_AUDIT_LIFECYCLE.md` | Audit code initial : points de mutation, transitions, risques | **Validé** — conforme au code |
| `LOT8_PREPARATION_DECISIONNELLE.md` | Cartographie exhaustive, plan de patch, plan de tests | **Validé** — conforme au code |
| `LOT8_AUDIT_CONSOLIDE_FINAL.md` | Consolidation des deux documents + script Q1–Q7 | **Validé** — conforme au code |
| `LOT8_PLAN_EXECUTION_AUDIT_DONNEES.md` | **Ce document** — plan d'exécution opérationnel | En cours |

**Vérifications effectuées** :
- `_counts_in_formation_inscrits` (l.55–69) : 6 conditions OR confirmées, `inscrit_gespers` en première position
- `_adjust_formation_counter` (l.78–91) : `select_for_update` + `max(val+delta, 0)` + `save`
- 6 transitions avec sync confirmées (validate_inscription, start_formation, cancel_start_formation, complete_formation, mark_gespers, clear_gespers)
- `abandon` sans sync confirmé
- 19 points d'entrée utilisateur confirmés
- Signal `formation_candidats_signals` ne touche que `nombre_candidats` confirmé

**Écarts ou angles morts identifiés** : aucun.

---

## 3. Plan d'exécution opérationnel

### 3.1 Prérequis techniques

| Prérequis | Vérification |
|-----------|-------------|
| Environnement Django fonctionnel | `python manage.py check --deploy` sans erreur bloquante |
| Base de données accessible | `python manage.py dbshell` ouvre la connexion |
| Virtualenv activé | `source env/bin/activate` |
| Management command disponible | `python manage.py lot8_audit_data --help` affiche l'aide |

### 3.2 Commandes à exécuter

**Étape 1 — Vérification rapide** :

```bash
cd /Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main
source env/bin/activate
python manage.py lot8_audit_data --help
```

**Étape 2 — Exécution audit texte (rapport complet)** :

```bash
python manage.py lot8_audit_data
```

**Étape 3 — Export JSON (archivable)** :

```bash
python manage.py lot8_audit_data --format=json > docs/lot8_audit_results.json
```

**Étape 4 — Export CSV (exploitable tableur)** :

```bash
python manage.py lot8_audit_data --format=csv > docs/lot8_audit_results.csv
```

### 3.3 Ordre des requêtes et rôle

| Ordre | Question | Rôle | Priorité |
|-------|----------|------|----------|
| 1 | **Q6** | **CLÉ DE DÉCISION** — candidats comptés uniquement par `inscrit_gespers` | **Critique** |
| 2 | Q1 | Corrélation parfaite saisie == GESPERS — mesure la dépendance à la sync | Haute |
| 3 | Q2 | Excédent saisie > GESPERS — détecte la saisie manuelle | Haute |
| 4 | Q3 | Déficit saisie < GESPERS — détecte des anomalies pré-existantes | Moyenne |
| 5 | Q4 | Saisie pure (0 GESPERS) — formations indépendantes du lifecycle | Moyenne |
| 6 | Q5 | Cohérence `nombre_candidats` vs Count réel — vérifie le signal | Basse |
| 7 | Q7 | Historique des modifications automatiques — traçabilité | Basse |

### 3.4 Structure attendue des résultats

Le rapport texte produit un bloc `RÉSUMÉ` de cette forme :

```
======================================================================
RÉSUMÉ
======================================================================
Formations totales                         : ???
Formations avec inscrits > 0               : ???
Corrélation parfaite saisie==GESPERS (>0)  : ???
Excédent saisie > GESPERS                  : ???
Déficit saisie < GESPERS                   : ???
Saisie pure (0 GESPERS)                    : ???
nombre_candidats divergent                 : ???
Candidats comptés UNIQUEMENT par GESPERS   : ???   ← CLÉ
Formations impactées par Option B          : ???   ← CLÉ
======================================================================
```

**Les deux lignes CLÉ** sont celles qui déterminent la décision.

---

## 4. Critères d'interprétation

### 4.1 Interprétation de Q6 (décision principale)

| Résultat Q6 | Signification | Décision |
|-------------|---------------|----------|
| **0** | Aucun candidat n'est compté uniquement par GESPERS | **GO Option B immédiat** — le retrait de `inscrit_gespers` du critère ne change aucun compteur existant |
| **1–20** | Quelques cas marginaux | **GO Option B avec recalcul ciblé** — script de recalcul sur les N formations impactées |
| **> 20** | Impact significatif | **GO conditionnel** — recalcul global + vérification manuelle sur échantillon |

### 4.2 Interprétation des autres questions

| Question | Si résultat élevé | Si résultat = 0 |
|----------|-------------------|-----------------|
| Q1 (corrélation parfaite) | Les compteurs sont alimentés principalement par la sync — changement = fort impact | Compteurs hybrides (sync + saisie) — changement = impact diffus |
| Q2 (excédent saisie) | Preuve de saisie manuelle active — les compteurs ne dépendent pas que de la sync | — |
| Q3 (déficit saisie) | **Anomalie** pré-existante à investiguer indépendamment | Pas d'anomalie |
| Q4 (saisie pure) | Formations indépendantes du lifecycle — pas de risque | — |
| Q5 (nombre_candidats divergent) | Signal cassé ou saisie manuelle qui écrase le signal | Signal fonctionne correctement |
| Q7 (historique) | Informatif — permet de tracer les modifications automatiques | Pas d'historisation des compteurs inscrits |

### 4.3 Risques de faux positifs / faux négatifs

| Risque | Description | Mitigation |
|--------|------------|------------|
| Faux positif Q6 | Un candidat `inscrit_gespers=True` + POSTULANT qui a en réalité été validé puis rétrogradé (cas rare) | Vérifier manuellement les candidats Q6 |
| Faux négatif Q6 | Un candidat qui était GESPERS-only mais a depuis été validé — son incrément historique reste dans le compteur | Impossible à détecter sans audit d'historique complet — accepté comme dette |
| Faux positif Q3 | Déficit dû à un import Excel antérieur qui a écrasé les compteurs à la baisse | Croiser avec Q7 (historique) pour identifier l'origine |
| Faux négatif Q1 | Corrélation parfaite masquée par un import Excel postérieur qui a remis les compteurs à la valeur GESPERS | Peu probable si les imports sont rares |

---

## 5. Grille de décision GO / NO-GO

### 5.1 Critères explicites

| # | Critère | Condition GO | Condition NO-GO |
|---|---------|-------------|-----------------|
| C1 | Script d'audit exécuté | Résultats Q1–Q7 disponibles | Non exécuté |
| C2 | Q6 quantifié | Nombre connu + formations identifiées | Non mesuré |
| C3 | Q3 = 0 ou expliqué | Pas d'anomalie non expliquée | Anomalies non investiguées |
| C4 | Scénarios V1–V6 joués | Tous validés en test | Non joués |
| C5 | Option choisie | Décision humaine explicite | Pas de décision |
| C6 | Plan de rollback validé | Stratégie de retour acceptée | Non validé |

### 5.2 Matrice de décision

```
C1=OK ET C2=OK ET Q6=0 ET C5=Option B
  → GO immédiat : patch 1 ligne + 12 tests
  → Risque : minimal
  → Rollback : remettre la ligne

C1=OK ET C2=OK ET Q6=1-20 ET C5=Option B
  → GO avec recalcul : patch 1 ligne + recalcul ciblé + 12 tests
  → Risque : faible
  → Rollback : remettre la ligne + restaurer backup compteurs

C1=OK ET C2=OK ET Q6>20 ET C5=Option B
  → GO conditionnel : patch + migration données complète + 12 tests
  → Risque : modéré
  → Rollback : remettre la ligne + restaurer backup global

C5=Option A (statu quo)
  → Pas de changement de code
  → Documenter la contradiction résiduelle avec la cible V3
  → Risque : dette technique acceptée

N'IMPORTE QUEL Cx=NON
  → NO-GO — compléter les critères manquants avant de décider
```

---

## 6. Plan conditionnel de patch futur (rappel)

### 6.1 Fichiers à modifier (Option B uniquement)

| # | Fichier | Modification | Effort |
|---|---------|-------------|--------|
| 1 | `rap_app/services/candidate_lifecycle_service.py` l.59 | Retirer `candidate.inscrit_gespers` du OR dans `_counts_in_formation_inscrits` | 1 ligne |

### 6.2 Ordre de patch

1. Sauvegarder les compteurs actuels (export JSON ou CSV)
2. Modifier `_counts_in_formation_inscrits`
3. Si Q6 > 0 : exécuter le script de recalcul (dry-run d'abord, puis réel)
4. Adapter les 3 tests existants
5. Ajouter les 9 nouveaux tests
6. Exécuter la suite complète (`pytest rap_app/tests/ -v`)
7. Mettre à jour le plan V3

### 6.3 Feature flag (optionnel)

```python
# settings.py
LOT8_GESPERS_DECOUPLED = False  # Passer à True pour activer
```

### 6.4 Rollback

| Étape | Action |
|-------|--------|
| 1 | Remettre `LOT8_GESPERS_DECOUPLED = False` (ou remettre `inscrit_gespers` dans le critère) |
| 2 | Restaurer les compteurs depuis le backup si recalcul a été exécuté |
| 3 | Ré-exécuter les tests pour confirmer le retour à l'état antérieur |

---

## 7. Plan de tests Lot 8 (rappel)

### 7.1 Pré-implémentation (baseline)

```bash
pytest rap_app/tests/tests_services/test_candidate_lifecycle_service.py -v
```

### 7.2 Post-implémentation

| Type | Fichier | Tests |
|------|---------|-------|
| Adaptés | `test_candidate_lifecycle_service.py` | 3 tests inversés (GESPERS ne modifie plus les compteurs pour POSTULANT) |
| Nouveaux | `test_candidate_lifecycle_service.py` | 9 tests `Lot8GespersDecouplingTests` |
| Non-régression | `test_formation_stats_json_contract.py` | Suite complète |
| Non-régression | `test_lot5_formation_filters.py` | Filtres formations |
| Non-régression | `tests_candidat_write_path.py` | Écriture candidat |

### 7.3 Commande complète

```bash
pytest rap_app/tests/ -v
```

---

## 8. Recommandation finale

### Verdict : le Lot 8 est **prêt à être décidé**, pas à être implémenté.

Tout le matériel nécessaire est en place :
- Audit code : **terminé** (3 passes, 0 écart)
- Management command : **prête** (`python manage.py lot8_audit_data`)
- Grille de décision : **documentée**
- Plan de patch : **préparé**
- Plan de tests : **préparé**
- Plan de rollback : **préparé**

### Prochaine action humaine requise

```bash
cd /Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main
source env/bin/activate
python manage.py lot8_audit_data
```

Transmettre le bloc **RÉSUMÉ** pour décision GO/NO-GO.

---

*Fin du plan d'exécution — aucune modification de code métier.*
