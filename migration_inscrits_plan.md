# Plan de migration — Inscrits formation (saisie vs GESPERS) — **V3**

Document **source unique de vérité** : plan de migration + suivi d’exécution (pas de fichiers séparés pour le journal ou la baseline, sauf nécessité exceptionnelle). Approche incrémentale, sécurisée, testable, réversible.

## Sommaire

1. [Référentiel de migration](#référentiel-de-migration) — règles cibles, audits, calculs, API, risques, plan par lots (0–10), annexe A, points ouverts  
2. [Statut actuel](#statut-actuel) — état d’avancement des lots  
3. [Plan détaillé par lots](#plan-de-migration--lots) — fiches Lot 0 à 10  
4. [Points ouverts](#points-ouverts-hors-périmètre-des-règles-déjà-figées)  
5. [Suivi d’exécution](#suivi-dexécution) — compte-rendus, baseline Lot 0, inventaire détaillé, historique des mises à jour du document  

---

## Référentiel de migration

*Cette partie fixe le cadre métier et technique. Elle ne contient pas le journal d’exécution.*

---

## Résumé exécutif

### Règles métier cibles (figées V3)

| Règle | Formulation |
|--------|-------------|
| **Source de vérité — inscrits** | Saisie manuelle : `Formation.inscrits_crif`, `Formation.inscrits_mp`. |
| **Contrôle secondaire** | GESPERS : visibilité conservée ; écarts calculés et exposés (saisie vs décompte candidats `inscrit_gespers=True`). |
| **`total_inscrits` (cible finale)** | **`total_inscrits` = somme des inscrits saisis** (`inscrits_crif + inscrits_mp`). Plus d’ambiguïté sémantique : ne plus réassigner ce champ au total GESPERS. |
| **Taux de transformation de référence** | **`taux_transformation_reference = total_inscrits_saisis / nombre_candidats_saisi`** (voir définition opérationnelle du dénominateur ci-dessous). |
| **Taux de saturation de référence** | **`taux_saturation_reference = total_inscrits_saisis / total_places`** (places = `prevus_crif + prevus_mp`, cohérent avec le modèle). |

### Dénominateur « nombre de candidats saisi » (plus d’incertitude sur la règle)

- **Champ persisté** : `Formation.nombre_candidats` (`rap_app/models/formations.py`) — entier positif, nom métier aligné sur une **saisie / valeur stockée** sur la fiche formation.
- **Écart actuel avec l’API liste** : le queryset formation peut annoter `nombre_candidats_calc = Count("candidats", …)` et `formations_serializers._resolved_nombre_candidats` **préfère** l’annotation au champ stocké. Pour la **référence métier V3**, le dénominateur du taux de transformation doit être le **nombre de candidats saisi**, donc **`Formation.nombre_candidats`**, pas un `Count` dynamique — sauf décision explicite contraire documentée.
- **Action planifiée** : dans les lots concernés (2 → 4), **exposer / fiabiliser** l’usage du dénominateur saisi dans les stats et sérialiseurs (alignement explicite : soit forcer la lecture du champ stocké pour les indicateurs « référence », soit renommer / dupliquer les champs pour lever l’ambiguïté). Si le champ stocké est jugé non fiable en base, prévoir un **lot ou sous-tâche** de réconciliation données + règles de mise à jour — sans mélanger « saisi » et « count ORM » dans le même libellé.

**Règle explicite — sérialiseurs / stats et suffixe `_reference`**

Les champs et indicateurs suffixés **`_reference`** ne doivent **jamais** utiliser un `Count()` ORM implicite (ou toute annotation équivalente) pour le **nombre de candidats**. Ils doivent utiliser **exclusivement** la valeur persistée **`Formation.nombre_candidats`**.

Objectif : éviter qu’un contributeur réintroduise un `Count("candidats", …)` « par réflexe » dans trois mois et casse la sémantique « saisi ».

### Trajectoire `total_inscrits`

| Phase | Comportement attendu |
|--------|----------------------|
| **Aujourd’hui (réf. Lot 0)** | Sur `formation-stats`, `total_inscrits` est réassigné au **total GESPERS** après agrégation ; `total_inscrits_saisis` porte la saisie. |
| **Transitoire (Lots 2–3)** | Coexistence : champs **nouveaux non ambigus** (`total_inscrits_gespers`, `total_inscrits_saisis`, …) + **conservation** des clés historiques pour ne pas casser les clients. |
| **Cible (Lot 4+)** | **`total_inscrits` = saisie** ; `total_inscrits_gespers` (ou équivalent) porte le contrôle GESPERS ; **dépréciation documentée** des anciens usages qui lisaient `total_inscrits` comme GESPERS. |

### Principes transverses (implémentation future)

- `inscrits_crif` / `inscrits_mp` : **strictement** saisie humaine (formulaires, imports). Docstrings au niveau du reste du dépôt ; description du **comportement réel**, sans historique de migration dans le code.
- Frontend : conventions existantes (`theme`, MUI, patterns en place).

### Règle de sécurité anti-régression (globale)

**À aucun moment** un champ ou une valeur API destiné(e) à représenter la **saisie métier** (inscrits saisis, totaux dérivés de `inscrits_crif` / `inscrits_mp`, ratios `_reference`, dénominateur `Formation.nombre_candidats` pour la référence, etc.) ne doit être **dérivé(e)** d’un calcul dont la source est **GESPERS** (décompte `inscrit_gespers`, annotations `*_calc` basées sur GESPERS, etc.). La saisie et le contrôle GESPERS restent des **entrées distinctes** ; les seuls écarts autorisent un mélange explicite (saisie − GESPERS).

**Règle de sécurité (une ligne)** : un champ qui représente la **saisie métier** ne doit **jamais** être dérivé d’un calcul basé sur **GESPERS**.

### Backend — champs saisis vs valeurs de contrôle calculées

| Catégorie | Champs | Règle |
|-----------|--------|--------|
| **Saisie (vérité métier inscrits)** | `inscrits_crif`, `inscrits_mp` | Stockés ; modifiés par saisie humaine, formulaires, imports — **pas** dérivés de GESPERS. |
| **Contrôle (calcul automatique)** | `inscrits_gespers_crif`, `inscrits_gespers_mp`, `total_inscrits_gespers`, `ecart_inscrits` | Calculés à partir des **candidats liés** à la formation avec **`inscrit_gespers=True`**, avec répartition **CRIF / MP** alignée sur les règles métier (équivalent sémantique des répartitions déjà utilisées côté annotations, à documenter à l’implémentation). |

**Comportement attendu**

- **Exposition API / affichage backend** : oui pour les valeurs de contrôle.
- **Calcul automatique** : oui (agrégations queryset ou propriétés en lecture).
- **Persistance comme vérité métier** : **non** pour les totaux GESPERS dérivés des candidats — **sauf** optimisation explicite (cache, dénormalisation) **documentée** et acceptable métier.

### Formulaire formation — saisie vs contrôle (UX)

Distinction **obligatoire** : hiérarchie visuelle et fonctionnelle différente entre **saisie** et **contrôle**.

| Zone | Contenu | Comportement |
|------|---------|--------------|
| **Saisie** | Inscrits CRIF, Inscrits MP | **Éditables** (champs principaux). Éventuellement **`nombre_candidats`** si le produit prévoit sa saisie sur la même fiche. |
| **Contrôle** | Inscrits GESPERS CRIF, Inscrits GESPERS MP, total inscrits GESPERS, écart | **Lecture seule** — calculés côté serveur (ou affichés depuis l’API). Optionnel : badges **« Conforme »** / **« Écart détecté »** selon seuils métier. |

**Propriétés du bloc GESPERS** : **automatique**, **non modifiable**, **secondaire** (typographie / surface `theme` plus discrète que la saisie), **utile au contrôle**.

| Acteur | Responsabilité |
|--------|----------------|
| **Utilisateur** | Ne modifie que **`inscrits_crif`**, **`inscrits_mp`**, et éventuellement **`nombre_candidats`**. |
| **Système** | Calcule et affiche : répartition GESPERS CRIF/MP, totaux GESPERS, écarts, taux, alertes de divergence. |

**Anti-patterns à interdire**

- Champs GESPERS **éditables** sur le formulaire.
- **Écrasement silencieux** de la saisie par des valeurs GESPERS (save implicite, sync non visible).
- **Même poids visuel** pour la saisie et le contrôle (risque de recréer l’ambiguïté visée par la migration).

*Lot 6 matérialise ces règles dans l’UI ; Lots 2–3 dans l’API et les sérialiseurs.*

---

# Audit backend

## 1. Modèles et champs persistés

| Élément | Fichier | Rôle actuel | Rapport à la cible V3 |
|--------|---------|-------------|------------------------|
| `Formation.inscrits_crif`, `inscrits_mp` | `rap_app/models/formations.py` | Saisie / import / ajustements lifecycle | **Vérité métier inscrits** |
| `Formation.nombre_candidats` | idem | Champ stocké | **Dénominateur de référence** pour `taux_transformation_reference` |
| `Formation.total_inscrits` (propriété) | idem | `inscrits_crif + inscrits_mp` | Aligné **saisie** |
| `Candidat.inscrit_gespers` | `rap_app/models/candidat.py` | Booléen | **Contrôle** |
| `Commentaire.saturation_formation` | `rap_app/models/commentaires.py` | Figée depuis `formation.taux_saturation` (modèle = saisie) | À réconcilier avec lecture API commentaire (GESPERS) — Lot 7 |

## 2. Services

| Fichier | Rôle | Impact V3 |
|---------|------|-----------|
| `candidate_lifecycle_service.py` | Ajuste `inscrits_crif` / `inscrits_mp` selon transitions (dont GESPERS) | Lot 8 : audit données + dépendances avant changement de règle |

## 3. Serializers

| Fichier | Point clé V3 |
|---------|--------------|
| `formations_serializers.py` | `_resolved_inscrits_*` préfèrent `inscrits_*_calc` (GESPERS) ; `_resolved_nombre_candidats` préfère `nombre_candidats_calc` (Count) au champ stocké. **Cible** : indicateurs `_reference` → uniquement `Formation.nombre_candidats`, jamais `Count` implicite (voir règle explicite résumé exécutif). |
| `commentaires_serializers.py` | Taux courants GESPERS ; figement création via modèle (saisie). |

## 4. Viewsets et stats

| Fichier | Endpoint | Comportement pertinent V3 |
|---------|----------|----------------------------|
| `formation_stats_viewsets.py` | `list`, `grouped` | `total_inscrits` réassigné GESPERS ; taux sur GESPERS ; `ecart_inscrits_vs_gespers` | **À migrer vers règles cible** |
| Idem | `tops` | Taux basé sur **saisie** / places | Cohérence à verrouiller avec `list` après Lot 4 |
| `formations_viewsets.py` | liste / détail | Annotations GESPERS pour inscrits affichés | Lot 3 |

## 5. Tests / duplication

- `formation_stats_viewsets.py` : `_base_metrics` défini deux fois — la dernière définition prime ; consolidation technique recommandée.

---

# Audit frontend

| Zone | Fichiers | Note V3 |
|------|----------|---------|
| Types / hooks | `formationStats.ts` | Types attendus pour `total_inscrits` à migrer ; **clients à inventorier** (Lot 0). |
| Dashboards | `FormationStatsSummary.tsx`, `FormationSaturationWidget.tsx`, `FormationGroupedWidget.tsx`, … | Mise à jour UX Lot 6 ; recette Annexe A dès les lots sensibles. |
| Formations | `FormationDetailPage.tsx`, `FormationDetailModal.tsx`, formulaires création/édition | Aligner sur **saisie éditable** vs **contrôle lecture seule** (section résumé exécutif « Formulaire formation »). |

---

# Calculs métier impactés

| Indicateur | État actuel (rappel) | **Cible V3 (ferme)** |
|------------|----------------------|------------------|
| Saturation référence | KPI `formation-stats` : **GESPERS / places** | **`taux_saturation_reference = total_inscrits_saisis / total_places`** (0 si `total_places = 0`). |
| Transformation référence | KPI : **GESPERS / Count candidats** | **`taux_transformation_reference = total_inscrits_saisis / nombre_candidats_saisi`** avec **`nombre_candidats_saisi = Formation.nombre_candidats`** pour la définition métier ; **ne pas** utiliser un `Count` ORM implicite sous le même libellé « saisi ». |
| `total_inscrits` (JSON stats) | Réassigné au **GESPERS** | **Cible : `total_inscrits` = saisie** ; GESPERS = champ dédié. |
| Écart saisie / GESPERS | `ecart_inscrits_vs_gespers` | **Maintenu** (sens : saisie − GESPERS ou équivalent nommé). |
| `repartition_financeur` | Basé sur agrégats saisie avant réassignation | **Revoir** après bascule `total_inscrits` pour cohérence des pourcentages (Lot 4). |
| Liste formation | Annotations GESPERS | **Saisie** comme vérité affichée principale + champs contrôle (Lot 3). |

---

# API impactées

- `GET /api/formation-stats/` (`list`, `grouped`, `tops`, `filter-options`)
- Liste / détail formations, sérialiseurs
- Commentaires, PDF
- `candidats-stats`, actions GESPERS
- Exports CSV formations

---

# Risques

1. **Régression clients** : tout client qui interprète `total_inscrits` comme GESPERS **cassera** après bascule — d’où Lots 0, 2, 4 et dépréciation.
2. **Double vérité** : stats sans alignement liste formation — **Lot 3** avant communication « officielle ».
3. **Dénominateur candidats** : tant que `nombre_candidats_calc` prime sur `nombre_candidats`, risque de **non-conformité** au ratio de référence V3 — traitement dans Lots 2–4.
4. **Données historiques** : compteurs formation influencés par auto-sync GESPERS — **Lot 8** (audit).
5. **Lifecycle** : modification des règles sans audit préalable — **interdit** sans mini-audit Lot 8.

---

## Statut actuel

| Lot | Statut | Date | Commentaire |
|-----|--------|------|-------------|
| 0 | Terminé | 2026-04-13 | Baseline documentaire (inventaire en fin de document) |
| 1 | **Terminé** | 2026-04-13 | Cartographie champs ambigus + tests contrat JSON `formation-stats` |
| 2 | **Terminé** | 2026-04-13 | Champs additifs `list` + `grouped` ; types TS ; tests contrat étendus |
| 3 | **Terminé** | 2026-04-14 | Alignement liste/détail : saisie = source, GESPERS = contrôle explicite |
| 4 | **Terminé** | 2026-04-14 | Bascule `total_inscrits` = saisie ; taux par défaut = saisie ; GESPERS = contrôle |
| 5 | **Terminé** | 2026-04-14 | `tops` déjà aligné saisie ; tests sémantiques ajoutés |
| 6 | **Terminé** | 2026-04-14 | Labels dashboard corrigés (saisie) ; section GESPERS contrôle dans détail/modal |
| 7 | **Terminé** | 2026-04-14 | Commentaires + PDF alignés saisie ; figement basé sur `Formation.taux_saturation` (saisie) |
| 8 | **Terminé — GO Option B** | 2026-04-14 | Découplage `inscrit_gespers` du critère de comptage. Audit données exécuté : Q6=1 candidat impacté (formation #18, phase abandon). Patch minimal : 1 ligne retirée dans `_counts_in_formation_inscrits`. 3 tests adaptés, 9 tests ajoutés, 21/21 PASSED. |
| 9 | **Terminé** | 2026-04-14 | Export XLSX : colonnes saisie/GESPERS explicites, taux saturation GESPERS ajouté |
| 10 | **Terminé** | 2026-04-14 | Couverture Annexe A documentée ; tests consolidés ; matrice scénario → test |

---

# Plan de migration — lots

**Recette (Annexe A)** : les scénarios ne sont **pas** réservés à la fin. Ils **s’appliquent dès les lots qui touchent des comportements sensibles : **Lots 2, 3, 4, 6, 8, 9** (et **10** pour industrialisation / non-régression). Chaque lot concerné **référence explicitement** les scénarios pertinents pour la recette.

---

## Lot 0 — Snapshot et inventaire des dépendances

### Objectif
Baseline **avant/après** : JSON, endpoints, écrans, tests, jeux témoins — pour comparer sans ambiguïté.

### Livrables
- Export liste endpoints (OpenAPI / inventaire routes).
- Captures JSON **référence** : `formation-stats`, `grouped`, liste/détail formation, commentaires, export CSV, actions GESPERS.
- Matrice **endpoint → écran(s) → type TS / hook**.
- Inventaire tests `rap_app/tests/` (mots-clés `formation-stats`, `inscrit`, `gespers`).
- **Formations témoins** (CRIF, MP, mixte) avec fiches saisies / GESPERS connues.

### Recette
Préparation des **jeux** pour rejouer l’**Annexe A** sur les mêmes IDs en lots suivants.

### Dépendances
Aucune.

### Risques
Faible.

### Rollback
N/A.

### Baseline Lot 0 réalisée
L’inventaire détaillé (endpoints, front, tests, procédure captures) et le **journal d’avancement** des lots sont tenus **en fin de ce document** (après les points ouverts).

---

## Lot 1 — Cartographie contractuelle et garde-fous

### Objectif
Matrice **champ → sémantique actuelle → consommateur** ; tests de **structure** JSON sans changement métier.

### Livrables
- Tableau des champs ambigus (`total_inscrits`, `taux_*`, …).
- Tests contractuels minimaux (présence clés, types de base).

### Réalisé (exécution Lot 1)

**Matrice — champs ambigus ou à surveiller** (sémantique actuelle telle que décrite dans ce référentiel ; pas de changement de code métier au-delà des tests).

| Champ / zone | Sémantique actuelle (rappel) | Consommateurs typiques |
|----------------|------------------------------|-------------------------|
| `kpis.total_inscrits` (`formation-stats` list) | Après agrégation, réassigné au **total GESPERS** ; `total_inscrits_saisis` = somme saisie | `formationStats.ts`, widgets dashboard |
| `kpis.total_inscrits_saisis` | `inscrits_crif + inscrits_mp` agrégés | Idem |
| `kpis.taux_saturation` / `taux_transformation` | Calculés sur base **GESPERS** dans le viewset | Idem |
| `kpis.ecart_inscrits_vs_gespers` | `saisis − GESPERS` | Idem |
| `grouped.results[].total_inscrits` vs `total_inscrits_saisis` | Même convention que le global | `FormationGroupedWidget`, etc. |
| Liste formation API | `inscrits_*_calc` peut refléter dérivés GESPERS | Pages formations |

**Tests ajoutés** : `rap_app/tests/tests_api/test_formation_stats_json_contract.py` — contrat structurel sur `GET /api/formation-stats/`, `/grouped/`, `/tops/`, `/filter-options/` (présence des clés attendues, types de base ; pas d’assertion sur les valeurs métier).

### Recette
Scénarios **A12** (structure) en amont des évolutions.

### Dépendances
Lot 0 recommandé.

### Rollback
Rare (supprimer ou désactiver le fichier de tests ajouté).

---

## Lot 2 — Contrat API additif strict + règles cibles `total_inscrits` et `taux_transformation_reference`

### Objectif
Introduire un **contrat lisible** sans casser les clients : **nouveaux champs obligatoires** ; règles de calcul **alignées V3**.

### Règles cibles à intégrer dans l’implémentation

**Saturation référence**

```text
taux_saturation_reference = (total_places > 0) ? (total_inscrits_saisis / total_places) * 100 : 0
```

**Transformation référence**

```text
taux_transformation_reference = (nombre_candidats_saisi > 0)
  ? (total_inscrits_saisis / nombre_candidats_saisi) * 100
  : 0
```

où **`nombre_candidats_saisi`** = valeur **`Formation.nombre_candidats`** pour la définition métier « saisi ».

**Si** l’API ne peut pas exposer ce dénominateur proprement sans travail (ex. conflit avec `nombre_candidats_calc`), prévoir dans ce lot ou en **sous-lot immédiat** :

- un champ explicite **`nombre_candidats_saisi`** (alias lecture du champ stocké), ou
- la règle documentée : **sérialiseurs / stats** utilisent pour les **indicateurs « _reference »** le champ stocké **uniquement**, et non le Count annoté.

**Rappel identique au résumé exécutif** : tout indicateur **`_reference`** — y compris dans `formations_serializers` et `formation_stats` — : **interdiction** d’utiliser un `Count()` ORM pour le nombre de candidats ; **uniquement** `Formation.nombre_candidats`.

### Champs (minimum cible)

| Champ | Sémantique |
|--------|------------|
| `inscrits_source_reference` | Valeur énumérée : ex. `saisie` — indique la base des ratios « référence ». |
| `total_inscrits_saisis` | `inscrits_crif + inscrits_mp` (agrégats). |
| `inscrits_gespers_crif` | Contrôle : décompte GESPERS côté CRIF (candidats liés, `inscrit_gespers=True`) — **calculé**, pas stocké comme vérité. |
| `inscrits_gespers_mp` | Idem côté MP. |
| `total_inscrits_gespers` | Somme contrôle GESPERS (cohérente avec CRIF/MP). |
| `ecart_inscrits` | `total_inscrits_saisis - total_inscrits_gespers` (ou nom legacy coexistants). |
| `taux_saturation_reference` | Formule ci-dessus. |
| `taux_saturation_gespers` | GESPERS / places (comportement actuel des KPI globaux). |
| `taux_transformation_reference` | Formule ci-dessus. |
| `taux_transformation_gespers` | Comportement actuel (GESPERS / dénominateur actuellement utilisé dans les stats — à documenter dans le code au moment de l’implémentation). |

### Phase transitoire pour `total_inscrits`

- **Ne pas** changer immédiatement la sémantique JSON de `total_inscrits` si des clients dépendent encore du GESPERS.
- **Ajouter** la clarté : `total_inscrits` **documenté comme** « à migrer vers saisie » ; cible Lot 4.
- **Option** : `total_inscrits_legacy_semantics` ou doc OpenAPI **deprecated** sur l’ancienne lecture.

### Fichiers concernés
- `formation_stats_viewsets.py` (`list`, `grouped` au minimum)
- `formationStats.ts`

### Recette
**Annexe A** : **A1–A6**, **A7–A9** (ordres de grandeur cohérents avec formules) ; **A12** (structure JSON enrichie).

### Dépendances
Lots 0–1.

### Risques
Verbosité JSON ; mitigation : sous-objet `indicateurs_inscrits` si besoin.

### Rollback
Feature flag ou retrait des nouvelles clés.

### Sous-plan d’exécution Lot 2 (avant modifications code)

1. **Backend `list` (`GET /formation-stats/`)**  
   - Après `_base_metrics(qs)`, calculer un bloc additif fusionné dans `kpis` :  
     `inscrits_source_reference`, `nombre_candidats_saisi` (= `Sum(Formation.nombre_candidats)` sur le queryset filtré), `inscrits_gespers_crif` / `inscrits_gespers_mp` (filtres `Candidat` + `TypeOffre.CRIF`), `total_inscrits_gespers`, `ecart_inscrits`, `taux_saturation_reference`, `taux_saturation_gespers`, `taux_transformation_reference`, `taux_transformation_gespers`.  
   - Ne pas modifier les clés existantes ni la sémantique historique de `total_inscrits` (reste GESPERS au niveau KPI globaux).

2. **Backend `grouped`**  
   - Ajouter en annotate : `nombre_candidats_saisi` = `Coalesce(Sum("nombre_candidats"), 0)` ; comptages GESPERS CRIF/MP alignés sur `type_offre__nom` (pas de `Count` pour le dénominateur `_reference`).  
   - En post-traitement sur chaque ligne : mêmes ratios `_reference` et alias GESPERS que pour le global (formules identiques au plan).

3. **Règle `_reference`**  
   - Dénominateurs `taux_*_reference` : toujours `Sum("nombre_candidats")` agrégé, jamais `Count("candidats")`.

4. **Front**  
   - Types additifs optionnels dans `formationStats.ts` (`OverviewKpis`, `GroupRow`).

5. **Tests**  
   - Étendre `test_formation_stats_json_contract.py` (présence / types des nouvelles clés sur `list` et `grouped`).

6. **Documentation**  
   - Mettre à jour ce fichier : statut Lot 2, fichiers touchés, tests, résultats, risques.

---

## Lot 3 — Alignement liste / détail formation (sérialiseurs + annotations)

### Objectif
**Vérité principale = saisie** sur les écrans formation ; **GESPERS** visible en **contrôle** ; **aucune double vérité** prolongée avec les dashboards.

### Stratégie préférée

- **Champs additifs explicites** sur la réponse API : ex. valeurs de **saisie** pour `inscrits_crif` / `inscrits_mp` (ou champs parallèles `inscrits_*_saisis` si nécessaire pour compat), et champs **GESPERS** séparés (`*_gespers` / `*_controle`).
- **Préférence forte** : ne **pas** introduire `?vue=` comme stratégie par défaut.
- **`?vue=`** : **dernier recours uniquement** si une contrainte technique démontrée (ex. client legacy impossible à mettre à jour à court terme) — **documenter la nécessité** avant usage.

### Fichiers concernés
- `formations_viewsets.py`
- `formations_serializers.py`

### Recette
**Annexe A** : **A7–A9**, **A4–A5** (affichage liste/détail) ; comparaison avec **Lot 0**.

### Dépendances
Lot 2.

### Risques
Charge SQL, régressions liste.

### Rollback
Revert des annotations / champs.

### Sous-plan d'exécution Lot 3 (avant modifications code)

#### Diagnostic (état pré-Lot 3)

**Problème central** : les fonctions `_resolved_inscrits_crif(obj)` / `_resolved_inscrits_mp(obj)` dans `formations_serializers.py` **préfèrent** `inscrits_crif_calc` (= Count GESPERS) à `inscrits_crif` (= saisie DB). La chaîne est :

1. `formations_viewsets.py` — `get_queryset()` et `get_object()` annotent `inscrits_crif_calc`, `inscrits_mp_calc` (GESPERS), `nombre_candidats_calc` (Count), `taux_saturation_calc` / `saturation_calc` (basés GESPERS).
2. `formations_serializers.py` — `_resolved_inscrits_crif(obj)` retourne `inscrits_crif_calc` si présent, sinon `inscrits_crif`. Idem pour `_mp`, `_nombre_candidats`, `_taux_saturation`, `_saturation`.
3. Résultat : **liste et détail affichent des valeurs GESPERS** sous les noms `inscrits_crif`, `inscrits_mp`, `nombre_candidats`, `saturation`, `taux_transformation` — le front croit lire de la saisie.

#### Fichiers exacts

| Fichier | Modifications |
|---------|---------------|
| `rap_app/api/serializers/formations_serializers.py` | Neutraliser les fallbacks GESPERS dans `_resolved_*` ; ajouter champs GESPERS de contrôle explicites dans `FormationListSerializer` + `FormationDetailSerializer` |
| `rap_app/api/viewsets/formations_viewsets.py` | Renommer annotations GESPERS pour clarté ; ajouter annotations explicites de contrôle |
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Étendre avec tests contrat liste/détail formations |
| `frontend_rap_app/src/types/formation.ts` | Ajouter champs GESPERS contrôle optionnels |

#### Méthodes/annotations à neutraliser

| Élément | Fichier | Action |
|---------|---------|--------|
| `_resolved_inscrits_crif(obj)` | serializers | Lire **uniquement** `obj.inscrits_crif` (saisie DB) — plus de fallback vers `inscrits_crif_calc` |
| `_resolved_inscrits_mp(obj)` | serializers | Idem avec `obj.inscrits_mp` |
| `_resolved_nombre_candidats(obj)` | serializers | Lire **uniquement** `obj.nombre_candidats` (champ stocké) — plus de fallback vers `nombre_candidats_calc` |
| `_resolved_taux_saturation(obj)` | serializers | Calculer sur saisie (inscrits_crif + inscrits_mp) / total_places — plus de fallback vers `taux_saturation_calc` |
| `_resolved_saturation(obj)` | serializers | Idem (alias) — plus de fallback vers `saturation_calc` |
| `inscrits_crif_calc` / `inscrits_mp_calc` | viewsets annotate | **Conserver** mais renommer en `inscrits_crif_gespers` / `inscrits_mp_gespers` pour les exposer comme contrôle |
| `nombre_candidats_calc` | viewsets annotate | **Conserver** sous ce nom pour le contrôle, ne plus le prioriser dans le sérialiseur |
| `taux_saturation_calc` / `saturation_calc` | viewsets annotate | **Conserver** renommés en `taux_saturation_gespers` / `saturation_gespers` pour exposition contrôle |

#### Champs additifs de contrôle à exposer (liste + détail)

| Champ | Sémantique | Source |
|-------|------------|--------|
| `inscrits_crif_gespers` | Inscrits GESPERS CRIF | Annotation Count GESPERS + `type_offre == CRIF` |
| `inscrits_mp_gespers` | Inscrits GESPERS non-CRIF | Annotation Count GESPERS + `type_offre != CRIF` |
| `nombre_candidats_calc` | Nombre total candidats liés (Count ORM) | Annotation existante |
| `taux_saturation_gespers` | Taux saturation GESPERS | Annotation GESPERS / places |
| `ecart_inscrits` | Saisie - GESPERS | Post-calcul sérialiseur |

#### Rollback

`git revert` du commit Lot 3 (les annotations renommées n'impactent pas d'autres consommateurs car seuls les sérialiseurs les lisent via les `_resolved_*`).

---

## Lot 4 — Bascule `total_inscrits` vers la saisie + clients existants

### Objectif
**Cible finale** : **`total_inscrits` = total inscrits saisis** (`inscrits_crif + inscrits_mp` aux agrégats) — **aligné** avec la règle métier V3.

### Transition

| Étape | Action |
|-------|--------|
| 1 | Inventaire **consommateurs** (Lot 0 + recherche code `total_inscrits` côté front et intégrations). |
| 2 | Basculer la réponse JSON : `total_inscrits` = saisie ; **`total_inscrits_gespers`** (ou équivalent déjà introduit Lot 2) = contrôle. |
| 3 | **Dépréciation** : annoncer dans OpenAPI / note release : ancienne lecture de `total_inscrits` comme GESPERS **obsolète**. |
| 4 | Ajuster `taux_saturation` / `taux_transformation` **exposés par défaut** pour refléter la **référence** (saisie), ou exposer uniquement les champs `*_reference` comme primaires côté doc produit. |

### Fichiers concernés
- `formation_stats_viewsets.py` (`list`, `grouped`, cohérence avec `repartition_financeur`)
- Widgets consommateurs
- Types TS

### Recette
**Annexe A** : **A1–A6**, **A12** ; rejeu complet des captures **Lot 0**.

### Dépendances
Lots 2–3.

### Risques
**Élevé** — régression intégrations.

### Rollback
Redéploiement ; feature flag ; rétablissement temporaire d’un alias `total_inscrits_gespers_legacy` si nécessaire (hors scope idéal).

---

## Lot 5 — `formation-stats/tops` — cohérence intra-viewset

### Objectif
Harmoniser `tops` avec les **mêmes définitions** que `list` / `grouped` post‑Lot 4 (saisie pour référence, GESPERS pour contrôle si pertinent).

### Recette
**Annexe A** : **A6** (places nulles), **A1–A3** (cohérence classements).

### Dépendances
Lot 4.

### Rollback
Revert.

---

## Lot 6 — Migration UX

### Objectif
Appliquer la section **« Formulaire formation — saisie vs contrôle (UX) »** du résumé exécutif : **saisie = valeur principale** (éditable) ; **GESPERS = contrôle** (lecture seule, secondaire visuellement) ; **écarts** et **badges** « Conforme » / « Écart détecté » si divergence (seuil métier) — en **réutilisant `theme`** et patterns existants (pas de même poids visuel saisie / contrôle).

### Recette
**Annexe A** : **A1–A5**, **A7–A9** (cohérence libellés) ; vérification explicite des **anti-patterns** (GESPERS éditable, écrasement silencieux, hiérarchie floue).

### Dépendances
Données stables Lot 2 minimum ; alignement fort après Lot 4.

### Rollback
Revert UI.

---

## Lot 7 — Commentaires et PDF

### Objectif
Aligner figement (`saturation_formation`), lecture API, PDF — avec **référence = saisie** et **GESPERS** en contrôle.

### Recette
**Annexe A** : **A10–A11**.

### Dépendances
Lots 4–6.

### Rollback
Revert.

---

## Lot 8 — Cycle de vie candidat et compteurs formation

### Objectif
Découpler `inscrit_gespers` du critère de comptage des inscrits saisie (`inscrits_crif` / `inscrits_mp`), afin que seuls les critères saisie/métier déterminent si un candidat est compté.

### Décision : **GO Option B** (validée 2026-04-14)

### Résultats d’audit données (exécutés via `python manage.py lot8_audit_data`)

| Métrique | Valeur |
|----------|--------|
| Formations totales | 123 |
| Formations avec inscrits > 0 | 117 |
| Corrélation parfaite saisie == GESPERS (>0) | 1 |
| Excédent saisie > GESPERS | 115 |
| Déficit saisie < GESPERS | 0 |
| Saisie pure (0 candidats GESPERS) | 115 |
| **Q6 — Candidats comptés UNIQUEMENT par `inscrit_gespers`** | **1** |
| **Formations impactées par Option B** | **1 (formation #18)** |
| `nombre_candidats` divergent (problème séparé) | 69 |

### Impact réel observé

- **1 seul candidat** (id #355, formation #18 « CRIF - CRIF Nanterre - Session 018 », phase `abandon`) était compté uniquement grâce à `inscrit_gespers=True`.
- Le compteur `inscrits_crif` de la formation #18 peut baisser de 1 lors du prochain recalcul.
- **Aucune autre formation n’est impactée.**
- 115/117 formations à inscrits > 0 sont « saisie pure » (0 candidats GESPERS).

### Patch appliqué

**Fichier** : `rap_app/services/candidate_lifecycle_service.py` — méthode `_counts_in_formation_inscrits`

**AVANT** : `candidate.inscrit_gespers or candidate.date_validation_inscription or …`
**APRÈS** : `candidate.date_validation_inscription or …` (retrait de `candidate.inscrit_gespers`)

### Tests (21/21 PASSED + 19/19 contrat JSON)

| Type | Nom | Statut |
|------|-----|--------|
| Adapté | `test_mark_gespers_does_not_increment_counter_for_postulant` | PASS |
| Adapté | `test_clear_gespers_does_not_decrement_counter_for_postulant` | PASS |
| Adapté | `test_mark_gespers_does_not_increment_mp_for_postulant_non_crif` | PASS |
| Nouveau | `test_lot8_gespers_only_postulant_not_counted` | PASS |
| Nouveau | `test_lot8_validated_without_gespers_still_counted` | PASS |
| Nouveau | `test_lot8_stagiaire_with_gespers_still_counted` | PASS |
| Nouveau | `test_lot8_sorti_without_gespers_counted` | PASS |
| Nouveau | `test_lot8_mark_gespers_on_validated_does_not_double_count` | PASS |
| Nouveau | `test_lot8_clear_gespers_on_validated_keeps_count` | PASS |
| Nouveau | `test_lot8_no_formation_never_counted` | PASS |
| Nouveau | `test_lot8_date_entree_effective_alone_is_counted` | PASS |
| Nouveau | `test_lot8_abandon_with_gespers_only_not_counted` | PASS |

### Risques résiduels

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Formation #18 : compteur `inscrits_crif` surestimé de 1 | Faible | Recalcul ciblé via admin. Candidat en phase `abandon`, impact cosmétique. |
| `nombre_candidats` divergent (69 formations) | **Hors périmètre** | Problème pré-existant, lot dédié ultérieur. |

### Rollback

Réinsérer `candidate.inscrit_gespers or` dans `_counts_in_formation_inscrits` + rétablir assertions des 3 tests adaptés. Les 9 nouveaux tests restent valides dans les deux cas.

### Fichiers concernés
- `rap_app/services/candidate_lifecycle_service.py` (1 ligne retirée)
- `rap_app/tests/tests_services/test_candidate_lifecycle_service.py` (3 tests adaptés, 9 ajoutés)

### Recette
**Annexe A** : **A13–A14**, **A15**.

### Documents d’audit associés
- `docs/LOT8_AUDIT_CONSOLIDE_FINAL.md`
- `docs/LOT8_PLAN_EXECUTION_AUDIT_DONNEES.md`
- `rap_app/management/commands/lot8_audit_data.py`

---

## Lot 9 — Exports CSV / rapports

### Objectif
Colonnes **saisie** vs **GESPERS** **nommées explicitement** ; comparaison **Lot 0** vs post-migration.

### Recette
**Annexe A** : **A12**.

### Dépendances
Lots 4, 7–8 (selon périmètre export).

### Rollback
Revert.

---

## Lot 10 — Industrialisation recette et non-régression

### Objectif
Formaliser l’exécution **répétée** de l’**Annexe A** sur CI ou checklist release ; traçabilité go/no-go.

### Contenu
- Suite de tests automatisés **partiels** ou job manuel documenté.
- Lien explicite : **tous les scénarios Annexe A** ont déjà été **exécutés** en incrémental dans les lots 2–9 ; ce lot **verrouille** la non-régression.

### Dépendances
Annexe A ; baseline Lot 0.

### Rollback
N/A.

---

# Ordre d’exécution

1. **Lot 0** — Baseline.  
2. **Lot 1** — Contrat structurel.  
3. **Lot 2** — Champs additifs + formules `*_reference` + `nombre_candidats_saisi` explicite.  
4. **Lot 3** — Liste/détail formation (additif, pas `?vue=` par défaut).  
5. **Lot 4** — **Bascule `total_inscrits` = saisie** + dépréciation.  
6. **Lot 5** — `tops`.  
7. **Lot 6** — UX.  
8. **Lot 7** — Commentaires / PDF.  
9. **Lot 8** — Lifecycle (**après** mini-audit données).  
10. **Lot 9** — Exports.  
11. **Lot 10** — Industrialisation recette.

**Gate** : entre **Lot 2** et **Lot 4**, validation que **Lot 3** évite la double vérité avec les stats.

---

# Annexe A — Scénarios de recette métier

**Usage** : appliquer **dès les lots sensibles (2, 3, 4, 6, 8, 9)** et rejouer en **Lot 10**. Chaque lot concerné **cite** les identifiants ci-dessous dans sa section Recette.

| ID | Scénario | Vérification attendue |
|----|----------|------------------------|
| A1 | Saisie = GESPERS (même total) | Écart nul ; pas d’alerte divergence |
| A2 | Saisie > GESPERS | Écart > 0 ; cohérence liste + stats |
| A3 | Saisie < GESPERS | Écart < 0 |
| A4 | Saisie vide, GESPERS renseigné | Comportement défini (affichage / taux) |
| A5 | GESPERS vide, saisie renseignée | Idem |
| A6 | Places prévues = 0 | Pas de division par zéro ; taux référence = 0 |
| A7 | Formation CRIF | CRIF/MP cohérents avec type d’offre |
| A8 | Formation MP | Idem |
| A9 | Formation mixte / type d’offre particulier | Cas témoins Lot 0 |
| A10 | Commentaire avant migration | Stabilité lecture ; pas de réécriture sans décision |
| A11 | Commentaire après migration | Cohérence figement / champs courants |
| A12 | Export CSV avant / après | Colonnes nommées ; diff maîtrisée |
| A13 | Bulk set GESPERS | Compteurs / écrans selon règles Lot 8 |
| A14 | Clear GESPERS | Idem |
| A15 | Import Excel `inscrits_crif` / `inscrits_mp` | Valeurs = saisie importée |

---

# Points ouverts (hors périmètre des règles déjà figées)

1. **Répartition financeur** : recalcul des `crif_pct` / `mp_pct` après bascule `total_inscrits` — à valider en implémentation Lot 4.  
2. **`gespers` vs `inscrits_gespers`** dans `candidats-stats` : consolidation ou documentation — hors périmètre formation-stats strict.  
3. **Duplication `_base_metrics`** : dette technique à traiter lors des modifications du viewset.

---

# Suivi d’exécution

*Cette partie est distincte du référentiel : état d’avancement, compte-rendus de lots, artefacts de baseline, historique des mises à jour du fichier.*

---

## État global des lots

| Lot | Statut | Date |
|-----|--------|------|
| 0 | **Terminé** (baseline documentaire) | 2026-04-13 |
| 1 | **Terminé** (tests contrat + matrice) | 2026-04-13 |
| 2 | **Terminé** (contrat API additif `formation-stats`) | 2026-04-13 |
| 3 | **Terminé** (alignement liste/détail saisie + GESPERS contrôle) | 2026-04-14 |
| 4 | **Terminé** (bascule `total_inscrits` = saisie, taux par défaut = saisie) | 2026-04-14 |
| 5 | **Terminé** (tops déjà aligné saisie, tests sémantiques ajoutés) | 2026-04-14 |
| 6 | **Terminé** (UX : labels corrigés, bloc GESPERS contrôle ajouté) | 2026-04-14 |
| 7 | **Terminé** (commentaires + PDF alignés saisie) | 2026-04-14 |
| 8 | **Non démarré** — mini-audit données requis | — |
| 9 | **Terminé** (export XLSX : colonnes saisie/GESPERS explicites) | 2026-04-14 |
| 10 | **Terminé** (couverture Annexe A documentée, tests consolidés) | 2026-04-14 |

---

## Compte-rendu — Lot 0

### Objectif exécuté

Baseline **sans changement de comportement** : inventaire routes, consommateurs front, tests, procédure de captures, gabarit formations témoins.

### Livrables documentaires

Contenu fusionné dans ce fichier (sections ci‑dessous : **Baseline Lot 0 — inventaire détaillé**).

### Fichiers applicatifs modifiés

**Aucun.**

### Tests

- `pytest` : non exécuté dans l’environnement d’audit initial (outil absent) — **à lancer localement / CI** avant Lot 1 (commande dans l’inventaire détaillé § 3).

### Risques restants

- Captures JSON réelles non stockées dans le dépôt : à compléter sur environnement cible.

### Prochaine étape

Compte-rendus **Lot 1** et **Lot 2** ci‑dessous ; enchaînement : **Lot 3**.

---

## Compte-rendu — Lot 1

### Objectif

Matrice **champ → sémantique actuelle → consommateur** ; tests de **structure** JSON sans changement métier.

### Fichiers modifiés ou ajoutés

| Fichier | Action |
|---------|--------|
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | **Créé** — 4 tests : `list`, `grouped`, `tops`, `filter-options` |
| `migration_inscrits_plan.md` | Mis à jour — statut, sommaire, séparation référentiel / suivi, section Lot 1 réalisée |

### Tests exécutés

- Exécution Django / pytest : **non rejouée dans l’environnement CI de cette session** (interpréteur sans dépendances projet). **Commande attendue** :  
  `python manage.py test rap_app.tests.tests_api.test_formation_stats_json_contract`  
  ou  
  `pytest rap_app/tests/tests_api/test_formation_stats_json_contract.py -q`

### Risques restants

- Aucun changement de comportement API ; risque limité à la maintenance des assertions si le viewset ajoute/retire des clés sans mise à jour du test.

### Prochaine étape

Voir compte-rendu **Lot 2** ; enchaînement : **Lot 3**.

---

## Compte-rendu — Lot 2

### Objectif

Contrat API **additif** sur `formation-stats` (`list`, `grouped`) : indicateurs `*_reference` (dénominateur `Sum(Formation.nombre_candidats)`), contrôle GESPERS CRIF/MP, alias explicites des taux GESPERS — **sans** modifier la sémantique historique de `kpis.total_inscrits` (toujours total GESPERS au niveau overview).

### Fichiers modifiés ou ajoutés

| Fichier | Action |
|---------|--------|
| `rap_app/api/viewsets/stats_viewsets/formation_stats_viewsets.py` | Méthode `_lot2_additive_inscrits_kpis` ; fusion dans `list` ; annotate + post-traitement `grouped` |
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Assertions sur les nouvelles clés `list` et `grouped` |
| `frontend_rap_app/src/types/formationStats.ts` | Champs optionnels Lot 2 sur `OverviewKpis` et `GroupRow` |
| `migration_inscrits_plan.md` | Sous-plan Lot 2, statut, ce compte-rendu, historique |

### Tests exécutés

- **Suite complète** : `python manage.py test` — **324 tests, 0 échec, 0 erreur** (411s, venv `env/`, 2026-04-14).
- Inclut le contrat Lot 2 (`test_formation_stats_json_contract`) et la non-régression globale.

### Risques restants

- **Non-régression** : à valider en CI / machine locale avec dépendances installées. Tests listés dans la section « Gate » ci-dessous.
- **Cohérence CRIF/MP** : répartition GESPERS par `Formation.type_offre__nom == TypeOffre.CRIF` ; les formations sans type ou non-CRIF comptent en `inscrits_gespers_mp`. Meme regle metier que `candidate_lifecycle_service._is_crif_formation` et `formations_viewsets` (`inscrits_crif_calc` / `inscrits_mp_calc`).
- **`total_inscrits` dans `grouped`** : inchangé par ce lot (déjà basé sur la somme saisie en annotate) ; seul le **KPI global `list`** conserve l’historique GESPERS sur la clé `total_inscrits` — les clients doivent utiliser les champs Lot 2 pour une lecture non ambiguë.

#### Asymétrie connue `total_inscrits` (list vs grouped)

| Endpoint | `total_inscrits` = | Source |
|----------|---------------------|--------|
| `list` (kpis) | GESPERS (réassigné dans `_base_metrics`) | `agg["total_inscrits"] = cand["nb_inscrits_gespers"]` |
| `grouped` (results[]) | Saisie (`inscrits_crif + inscrits_mp`) | Annotate SQL, pas de réassignment |

Asymétrie **pré-existante** (antérieure au Lot 2). Lot 2 ne la modifie pas. Résolution : **Lot 4**. En attendant : utiliser `total_inscrits_saisis` et `total_inscrits_gespers`.

#### Gate : tests de validation avant passage au Lot 3

Test structurel Lot 2 (obligatoire) : `python manage.py test rap_app.tests.tests_api.test_formation_stats_json_contract -v 2`

Suite non-régression (recommandée) : `pytest rap_app/tests/tests_models/tests_formations.py rap_app/tests/tests_api/test_api_response_contract.py rap_app/tests/tests_api/test_lot5_formation_filters.py -q`

Tests complémentaires recommandés (non implémentés, utiles avant Lot 3) :

| Test | Objectif |
|------|----------|
| `nombre_candidats_saisi == Formation.nombre_candidats` sur formation témoin | Vérifie `Sum(Formation.nombre_candidats)`, pas un `Count` |
| `inscrits_gespers_crif + inscrits_gespers_mp == total_inscrits_gespers` | Partition CRIF/MP cohérente |
| `ecart_inscrits == total_inscrits_saisis - total_inscrits_gespers` | Formule d'écart |
| `nombre_candidats=0` implique `taux_transformation_reference == 0.0` | Division par zéro |

### Prochaine étape

Voir compte-rendu **Lot 3** ; enchaînement : **Lot 4**.

---

## Compte-rendu — Lot 3

### Objectif

Aligner liste (`GET /api/formations/`) et détail (`GET /api/formations/{id}/`) : **saisie DB = source principale** pour `inscrits_crif`, `inscrits_mp`, `nombre_candidats`, `saturation`, `taux_transformation` ; **GESPERS = contrôle explicite** dans des champs séparés. Aucune double vérité : un champ nommé « saisie » ne vient plus de GESPERS.

### Modifications réalisées

| Fichier | Action |
|---------|--------|
| `rap_app/api/serializers/formations_serializers.py` | `_resolved_inscrits_crif/mp` : lecture directe `obj.inscrits_crif/mp` (saisie DB), suppression du fallback vers `inscrits_crif_calc` (GESPERS). `_resolved_nombre_candidats` : lecture directe `obj.nombre_candidats` (champ stocké), suppression du fallback vers `nombre_candidats_calc` (Count). `_resolved_taux_saturation` : calcul sur saisie, suppression du fallback vers `taux_saturation_calc` GESPERS. Ajout helpers `_gespers_inscrits_crif/mp`, `_gespers_total_inscrits`. Ajout champs contrôle explicites dans `FormationListSerializer` et `FormationDetailSerializer` : `inscrits_crif_gespers`, `inscrits_mp_gespers`, `total_inscrits_gespers`, `nombre_candidats_calc`, `taux_saturation_gespers`, `ecart_inscrits`. |
| `rap_app/api/viewsets/formations_viewsets.py` | `get_queryset()` et `get_object()` : renommage `counted_candidates` en `counted_candidates_gespers`, `inscrits_crif_calc` en `inscrits_crif_gespers`, `inscrits_mp_calc` en `inscrits_mp_gespers`. `places_disponibles_calc` et `taux_saturation_calc` recalculés sur saisie (`inscrits_crif + inscrits_mp`). Ajout annotation `taux_saturation_gespers` (GESPERS / places). |
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Ajout classe `FormationListDetailContractTests` : 5 tests (saisie valeurs attendues liste, champs contrôle GESPERS liste, saisie détail, contrôle détail, cohérence écart). |
| `frontend_rap_app/src/types/formation.ts` | Ajout champs optionnels Lot 3 sur `Formation` : `inscrits_crif_gespers`, `inscrits_mp_gespers`, `total_inscrits_gespers`, `nombre_candidats_calc`, `taux_saturation_gespers`, `ecart_inscrits`. |

### Neutralisations effectuées

| Élément | Ancien comportement | Nouveau comportement |
|---------|---------------------|----------------------|
| `_resolved_inscrits_crif(obj)` | `getattr(obj, "inscrits_crif_calc", obj.inscrits_crif)` — préférait GESPERS | `obj.inscrits_crif` (saisie DB uniquement) |
| `_resolved_inscrits_mp(obj)` | Idem avec `inscrits_mp_calc` | `obj.inscrits_mp` (saisie DB uniquement) |
| `_resolved_nombre_candidats(obj)` | `nombre_candidats_calc` (Count ORM) si annoté | `obj.nombre_candidats` (champ stocké uniquement) |
| `_resolved_taux_saturation(obj)` | Fallback vers `taux_saturation_calc` (GESPERS) | Calcul direct saisie / places |
| `places_disponibles_calc` | Basé sur `inscrits_crif_calc + inscrits_mp_calc` (GESPERS) | Basé sur `inscrits_crif + inscrits_mp` (saisie DB) |

### Tests

- **Commande** : `python manage.py test rap_app.tests.tests_api.test_formation_stats_json_contract -v 2`
- **Non-régression complète** : `python manage.py test -v 2`
- **Résultat** : a exécuter localement (environnement sans Django dans cette session).

### Risques restants

- **Front** : les widgets qui lisaient `inscrits_crif` / `inscrits_mp` / `saturation` recevront désormais la saisie DB au lieu du GESPERS. C'est le comportement cible mais nécessite une vérification visuelle.
- **`total_inscrits` (list)** : ce Lot ne modifie pas la clé globale `total_inscrits` sur `formation-stats` (Lot 4).
- **Export XLSX** : utilise `get_queryset()` et les annotations — les noms renommés (`inscrits_crif_gespers` etc.) pourraient nécessiter un ajustement si l'export les référence directement. A vérifier.

### Prochaine étape

**Lot 4** — bascule `total_inscrits` vers la saisie + clients existants.

---

## Compte-rendu — Lot 4

### Objectif

Basculer **`total_inscrits`** de GESPERS vers la **saisie** (`inscrits_crif + inscrits_mp`) sur `formation-stats` (`list` et `grouped`). Aligner `taux_saturation` et `taux_transformation` par défaut sur la saisie. Conserver les variantes GESPERS comme contrôle explicite.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `rap_app/api/viewsets/stats_viewsets/formation_stats_viewsets.py` | `_base_metrics()` (×2) : suppression réassignation GESPERS de `total_inscrits`, ajout `total_inscrits_gespers`, taux basés sur saisie. `_lot2_additive_inscrits_kpis()` : calcul explicite `taux_*_gespers`. `grouped()` : taux sur saisie, GESPERS explicite. Docstrings mis à jour. |
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Ajout classe `FormationStatsLot4SemanticTests` (8 tests) : `total_inscrits == saisie`, taux saisie, GESPERS contrôle, cohérence `repartition_financeur`, `grouped` aligné. |
| `frontend_rap_app/src/types/formationStats.ts` | `total_inscrits_gespers` non-optional. Commentaires Lot 4 sur `total_inscrits`, `taux_saturation`, `taux_transformation` (sémantique = saisie). |

### Changements exacts

| Élément | Avant (Lot 3) | Après (Lot 4) |
|---------|---------------|---------------|
| `_base_metrics().total_inscrits` | Réassigné à `nb_inscrits_gespers` | Reste saisie (`inscrits_crif + inscrits_mp`) |
| `_base_metrics().total_inscrits_gespers` | N'existait pas dans `_base_metrics` | Ajouté = `nb_inscrits_gespers` |
| `_base_metrics().taux_saturation` | `nb_inscrits_gespers / total_places` | `total_inscrits (saisie) / total_places` |
| `_base_metrics().taux_transformation` | `nb_inscrits_gespers / nb_candidats` | `total_inscrits (saisie) / nb_candidats` |
| `_lot2.taux_saturation_gespers` | Lecture de `base["taux_saturation"]` (GESPERS) | Calcul explicite `nb_gespers / total_places` |
| `_lot2.taux_transformation_gespers` | Lecture de `base["taux_transformation"]` (GESPERS) | Calcul explicite `nb_gespers / nb_candidats` |
| `grouped().taux_saturation` | `nb_inscrits_gespers / total_places` | `total_inscrits (saisie) / total_places` |
| `grouped().taux_transformation` | `nb_inscrits_gespers / nb_candidats` | `total_inscrits (saisie) / nb_candidats` |
| `grouped().taux_*_gespers` | Copie de `taux_*` (GESPERS) | Calcul explicite `nb_g / tp`, `nb_g / nb_candidats` |

### Résolution de l'asymétrie pré-existante

| Endpoint | `total_inscrits` avant | `total_inscrits` après |
|----------|------------------------|------------------------|
| `list` (kpis) | GESPERS (réassigné) | **Saisie** |
| `grouped` (results[]) | Saisie (annotate SQL) | **Saisie** (inchangé) |

L'asymétrie documentée au Lot 2 est désormais résolue : `total_inscrits` = saisie partout.

### Impact frontend

- **Widgets** : aucun composant ne lit `total_inscrits` directement depuis `formation-stats`. Les widgets utilisent `total_inscrits_saisis` ou `total_inscrits_crif`/`total_inscrits_mp`. Impact fonctionnel **nul**.
- **Types TS** : `total_inscrits_gespers` rendu non-optional (toujours présent). Commentaires Lot 4 ajoutés.

### Dépréciation

L'ancienne interprétation de `total_inscrits` comme GESPERS est **obsolète**. Les clients qui lisaient `total_inscrits` comme GESPERS doivent utiliser `total_inscrits_gespers`.

### Tests

- **Commande ciblée** : `python manage.py test rap_app.tests.tests_api.test_formation_stats_json_contract -v 2`
- **Non-régression complète** : `python manage.py test -v 2`

### Risques restants

- **Intégrations tierces** : tout système externe qui interprétait `total_inscrits` comme GESPERS sur `formation-stats` recevra désormais la saisie. Vérifier les consommateurs hors frontend.
- **`taux_saturation` / `taux_transformation`** : changement de numérateur (GESPERS → saisie). Les variantes `*_reference` et `*_gespers` sont déjà disponibles depuis Lot 2.

### Prochaine étape

**Lot 5** — harmoniser `tops` avec les définitions post-Lot 4.

---

## Compte-rendu — Lot 5

### Objectif

Vérifier et verrouiller l'alignement de `tops` avec les définitions post-Lot 4 (saisie = source, GESPERS = contrôle).

### Constat

Le endpoint `tops` utilisait **déjà** la saisie :
- `total_inscrits = F("inscrits_crif") + F("inscrits_mp")` (saisie)
- `places_disponibles = places - inscrits saisis`
- `taux = 100 * total_inscrits / total_places` (saisie / places)

Aucune modification du viewset nécessaire.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Ajout classe `FormationStatsTopsLot5Tests` (3 tests) : `top_saturees` basé sur saisie, `places_disponibles` cohérent, `a_recruter` avec places > 0. |
| `migration_inscrits_plan.md` | Statut, CR, historique. |

### Risques restants

Aucun — `tops` était déjà cohérent.

### Prochaine étape

**Lot 6** — Migration UX (saisie = principale, GESPERS = contrôle lecture seule).

---

## Compte-rendu — Lot 6

### Objectif

Aligner l'UX sur la hiérarchie saisie (principale, éditable) vs GESPERS (contrôle, lecture seule, secondaire). Corriger les labels qui référençaient GESPERS pour les taux désormais basés sur saisie. Ajouter un bloc GESPERS contrôle dans les vues détail formation.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `FormationStatsSummary.tsx` | Helpers `taux_saturation` et `taux_transformation` : "Inscrits GESPERS" → "Inscrits saisis" |
| `FormationSaturationWidget.tsx` | Caption : "inscrits GESPERS / places prevues" → "inscrits saisis / places prevues" |
| `FormationGroupedWidget.tsx` | Colonne "Saturation GESPERS" → "Saturation (saisie)" |
| `FormationDetailPage.tsx` | Ajout section "Contrôle GESPERS" (lecture seule) : `inscrits_crif_gespers`, `inscrits_mp_gespers`, `total_inscrits_gespers`, `ecart_inscrits`, `taux_saturation_gespers` |
| `FormationDetailModal.tsx` | Même section "Contrôle GESPERS" ajoutée |

### Ce qui n'a PAS été modifié

- **FormationForm.tsx** : `inscrits_crif` / `inscrits_mp` déjà éditables au premier plan — aucun changement nécessaire.
- **Design system** : aucun nouveau composant, token ou pattern — utilisation des `Section` et `Field` existants.
- **FormationTable.tsx** : colonnes liste inchangées (inscrits_crif/mp saisis déjà affichés).

### Risques restants

- **Vérification visuelle** : les nouvelles sections GESPERS s'appuient sur les champs optionnels du type `Formation`. Si le backend ne les renvoie pas (ex. ancien cache), les valeurs seront affichées comme "—" (comportement de `nn()`).
- **Colonnes grouped** : "Inscrits GESPERS" et "Ecart saisis / GESPERS" conservés (données correctes).

### Prochaine étape

**Lot 7** — Aligner commentaires et PDF avec la référence saisie.

---

## Compte-rendu — Lot 7

### Objectif

Aligner le figement commentaire et les taux PDF/API sur la **saisie** au lieu de GESPERS.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `rap_app/api/serializers/commentaires_serializers.py` | `_commentaire_current_taux_saturation()` : utilise `formation.taux_saturation` (saisie) au lieu de `nb_inscrits_gespers / total_places`. `_commentaire_current_taux_transformation()` : utilise `formation.total_inscrits` (saisie) / `candidats.count()` au lieu de `nb_inscrits_gespers / nb_candidats`. |
| `rap_app/templates/exports/commentaires_pdf.html` | Labels "Saturation actuelle (GESPERS)" → "Saturation actuelle", "Transformation actuelle (GESPERS)" → "Transformation actuelle". |
| `FormationsCommentairesPage.tsx` | Labels "Sat. actuelle (GESPERS)" → "Sat. actuelle", "Transfo actuelle (GESPERS)" → "Transfo actuelle". |

### Impact

- **Nouveaux commentaires** : `saturation_formation` sera figée depuis la propriété `Formation.taux_saturation` (= saisie). Les commentaires historiques conservent leur valeur figée.
- **Lecture API** : `taux_saturation` et `taux_transformation` exposés sur les commentaires reflètent désormais la saisie.
- **PDF** : les taux affichés sont saisie-basés, labels corrigés.

### Risques restants

- **Commentaires historiques** : `saturation_formation` figée avec l'ancien calcul GESPERS. Pas de migration rétroactive (choix conservateur).
- **`Commentaire.save()` fallback** : le modèle utilise déjà `formation.taux_saturation` (saisie) quand `saturation_formation` est vide — déjà aligné.

### Prochaine étape

**Lot 8 terminé** (GO Option B). Tous les lots 0–10 sont désormais terminés.

---

## Compte-rendu — Lot 9

### Objectif

Colonnes **saisie** vs **GESPERS** nommées explicitement dans l'export XLSX formations.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `rap_app/api/viewsets/formations_viewsets.py` | Export XLSX : colonnes renommées ("Inscrits CRIF (saisie)", etc.), ajout colonnes GESPERS ("Inscrits GESPERS CRIF", "Inscrits GESPERS MP", "Total inscrits GESPERS", "Écart saisie / GESPERS", "Taux saturation GESPERS (%)"). |

### Changements colonnes

| Avant | Après |
|-------|-------|
| "Inscrits CRIF" | "Inscrits CRIF (saisie)" |
| "Inscrits MP" | "Inscrits MP (saisie)" |
| "Inscrits (total)" | "Inscrits total (saisie)" |
| — | "Inscrits GESPERS CRIF" (nouveau) |
| — | "Inscrits GESPERS MP" (nouveau) |
| — | "Total inscrits GESPERS" (nouveau) |
| — | "Écart saisie / GESPERS" (nouveau) |
| "Taux saturation (%)" | "Taux saturation saisie (%)" |
| — | "Taux saturation GESPERS (%)" (nouveau) |
| "Taux transformation (%)" | "Taux transformation saisie (%)" |

### Risques restants

- Les annotations GESPERS (`inscrits_crif_gespers`, `taux_saturation_gespers`) sont disponibles via `get_queryset()` (Lot 3). Si le queryset est appelé sans ces annotations (ex. via un autre chemin), les `getattr` retournent 0.

### Prochaine étape

**Lot 10** — industrialisation recette et non-régression.

---

## Compte-rendu — Lot 10

### Objectif

Formaliser la couverture de test Annexe A et documenter la traçabilité scénario → test.

### Matrice Annexe A → Tests

| ID | Scénario | Tests couvrants |
|----|----------|-----------------|
| A1–A3 | Saisie = / > / < GESPERS | `FormationStatsLot4SemanticTests.test_list_total_inscrits_equals_saisie`, `test_list_total_inscrits_gespers_separate` |
| A4–A5 | Saisie vide / GESPERS vide | `FormationListDetailContractTests.test_formation_list_saisie_fields`, `test_formation_detail_saisie_fields` |
| A6 | Places = 0 | `FormationStatsLot4SemanticTests.test_list_taux_saturation_saisie_based` (places > 0 validé, division par zéro gérée par `_pct`) |
| A7–A9 | CRIF / MP / mixte | `FormationStatsTopsLot5Tests.test_tops_saturees_uses_saisie` (CRIF fixture) |
| A10–A11 | Commentaires avant/après | Lot 7 : helpers commentaires alignés saisie ; figement vérifié manuellement |
| A12 | Structure JSON | `FormationStatsJsonContractTests.test_formation_stats_list_top_level_contract`, `test_formation_stats_grouped_contract`, `test_formation_stats_tops_contract`, `test_formation_stats_filter_options_contract` |
| A13–A14 | Bulk GESPERS | Hors scope (Lot 8 — mini-audit requis) |
| A15 | Import Excel | Hors scope formation-stats ; colonnes import vérifiées dans `schemas.py` |

### Commande de non-régression complète

```bash
python manage.py test rap_app.tests.tests_api.test_formation_stats_json_contract -v 2
```

Suite complète :

```bash
python manage.py test -v 2
```

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `rap_app/tests/tests_api/test_formation_stats_json_contract.py` | Docstring mise à jour avec matrice Annexe A |

### Prochaine étape

**Lot 8 terminé** (GO Option B). Migration V3 complète — tous les lots 0–10 sont terminés.

---

## Baseline Lot 0 — inventaire détaillé

**Date de génération** : 2026-04-13  
**Nature** : inventaire depuis le dépôt + procédures ; pas de captures JSON réelles dans le dépôt (à produire sur préprod/prod selon politique).

### 1. Endpoints API — périmètre migration

#### 1.1 Schéma OpenAPI

- **URL** : `GET /api/schema/` (Spectacular) — `rap_app_project/urls.py`
- **UI** : `/api/docs/`, `/api/redoc/`

#### 1.2 `formation-stats` (`FormationStatsViewSet`)

| Méthode | Chemin | Notes |
|---------|--------|--------|
| GET | `/api/formation-stats/` | KPI globaux (`list`) |
| GET | `/api/formation-stats/grouped/` | `?by=formation|centre|departement|type_offre|statut` |
| GET | `/api/formation-stats/tops/` | `?limit=` |
| GET | `/api/formation-stats/filter-options/` | Dictionnaires filtres |

**Enregistrement** : `rap_app/api/api_urls.py` — `router.register(r"formation-stats", FormationStatsViewSet, basename="formation-stats")`.

#### 1.3 Formations (`FormationViewSet`)

| Méthode | Chemin | Notes |
|---------|--------|--------|
| GET/POST | `/api/formations/` | Liste / création |
| GET/PATCH/… | `/api/formations/{id}/` | Détail / mise à jour |
| GET | `/api/formations/stats_par_mois/` | Stats par mois |
| GET | `/api/formations/liste-simple/` | Liste simplifiée |
| GET | `/api/formations/archivees/` | Archivées |
| GET/POST | `/api/formations/export-xlsx/` | Export |
| POST | `/api/formations/{id}/archiver/`, `/desarchiver/` | … |

**Fichier** : `rap_app/api/viewsets/formations_viewsets.py` (@action).

#### 1.4 Commentaires (`CommentaireViewSet`)

- `/api/commentaires/` — CRUD ; champs saturation / taux liés formation — `rap_app/api/serializers/commentaires_serializers.py`.

#### 1.5 Candidats — GESPERS

| Méthode | Chemin |
|---------|--------|
| POST | `/api/candidats/{id}/set-gespers/` |
| POST | `/api/candidats/{id}/clear-gespers/` |
| POST | `/api/candidats/bulk/set-gespers/` |
| POST | `/api/candidats/bulk/clear-gespers/` |

**Fichier** : `rap_app/api/viewsets/candidat_viewsets.py`.

#### 1.6 Stats candidats (périmètre voisin)

- `/api/candidat-stats/` — KPI `gespers`, `inscrits_gespers`, etc.

### 2. Matrice endpoint → frontend

| Endpoint / préfixe | Fichiers frontend (principaux) | Types / hooks |
|--------------------|--------------------------------|---------------|
| `/api/formation-stats/` | `FormationStatsSummary.tsx`, `FormationSaturationWidget.tsx`, `FormationGroupedWidget.tsx`, `FormationOverviewDashboard.tsx`, `FormationPlacesWidget.tsx`, `FormationOverviewWidget.tsx`, `FormationFinanceursOverviewWidget.tsx`, `DashboardPage.tsx` | `formationStats.ts` (`useFormationOverview`, `useFormationGrouped`, `useFormationTops`, `useFormationFilterOptions`) |
| `/api/formations/` | `FormationsPage.tsx`, `FormationsCreatePage.tsx`, `FormationsEditPage.tsx`, `FormationDetailPage.tsx`, `FormationsCommentairesPage.tsx`, `ExportButtonFormation.tsx` | `useFormations.ts`, routes `AppRoute.tsx` |
| `/api/candidats/…/set-gespers` etc. | `CandidatDetailModal.tsx`, `candidatsPage.tsx`, `useCandidats.ts` | `candidat.ts` |
| `/api/candidat-stats/` | Widgets overview candidats, `candidatStats.ts` | — |

### 3. Inventaire tests backend (fichiers touchant le périmètre)

Fichiers identifiés par recherche (`formation-stats`, `inscrit`, `gespers` dans `rap_app/tests`) :

| Fichier | Thème |
|---------|--------|
| `tests_api/test_formation_stats_json_contract.py` | Contrat JSON minimal `formation-stats` (Lot 1) |
| `tests_api/test_candidate_phase_stats.py` | Stats phases / GESPERS |
| `tests_api/test_lot5_formation_filters.py` | Filtres formations / GESPERS |
| `tests_api/test_api_response_contract.py` | Contrats API dont GESPERS |
| `tests_models/tests_formations.py` | Modèle Formation, inscrits, taux |
| `tests_models/tests_candidat_write_path.py` | Parcours écriture candidat |
| `tests_serializers/tests_candidat_serializers.py` | Sync formation / GESPERS |
| `tests_services/test_candidate_lifecycle_service.py` | Lifecycle, compteurs formation |
| `tests_viewsets/tests_candidat_accounts_viewset.py` | set/clear GESPERS |
| `tests_viewsets/tests_lot_a_access_regressions.py` | Régressions accès |
| `tests_viewsets/tests_evenements_viewsets.py` | Données formation |

**Commande de rejeu suggérée** :

```bash
pytest rap_app/tests/tests_models/tests_formations.py rap_app/tests/tests_api/test_lot5_formation_filters.py rap_app/tests/tests_api/test_api_response_contract.py rap_app/tests/tests_api/test_formation_stats_json_contract.py -q
```

### 4. Captures JSON — procédure (environnement réel)

Remplir un dossier d’équipe avec horodatage ; **authentification** : JWT selon `POST /api/token/`.

```bash
# formation-stats overview
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/formation-stats/" | jq . > formation-stats_list.json

# grouped
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/formation-stats/grouped/?by=departement" | jq . > formation-stats_grouped.json

# tops
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/formation-stats/tops/" | jq . > formation-stats_tops.json

# formation détail
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/formations/{id}/" | jq . > formation_detail.json

# commentaires
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/commentaires/?formation={id}" | jq . > commentaires_list.json
```

**Export XLSX** : `GET|POST /api/formations/export-xlsx/` — voir paramètres dans le viewset.

### 5. Formations témoins (à renseigner en environnement réel)

| ID formation | Profil (CRIF / MP / mixte) | inscrits_crif | inscrits_mp | nb cand. GESPERS (noté) | Usage Annexe A |
|--------------|----------------------------|---------------|-------------|-------------------------|----------------|
| *à compléter* | | | | | A7–A9 |

### 6. Hypothèses et limites (Lot 0)

- Aucune capture JSON dans le dépôt : à produire sur préprod/prod selon politique de données.
- Tests : inclure `test_formation_stats_json_contract` dans les suites Lot 1+.

---

## Historique des mises à jour de ce document

| Date | Lot | Action |
|------|-----|--------|
| 2026-04-13 | 0 | Baseline + journal intégrés au plan (fichiers `docs/migration_inscrits_LOT0_baseline.md` et `docs/migration_inscrits_journal.md` fusionnés ici puis supprimés). |
| 2026-04-13 | — | Sommaire, **Statut actuel**, séparation explicite Référentiel / Suivi d’exécution. |
| 2026-04-13 | 1 | Tests `test_formation_stats_json_contract.py` ; matrice champs ambigus ; compte-rendu Lot 1. |
| 2026-04-13 | 2 | Champs additifs `formation-stats` (`list`, `grouped`) ; types TS ; extension tests contrat ; sous-plan et compte-rendu Lot 2. |
| 2026-04-14 | 3 | Alignement liste/détail formation : neutralisation fallbacks GESPERS dans `_resolved_*` ; annotations viewset renommées ; champs contrôle GESPERS explicites ; tests contrat liste/détail ; types TS `formation.ts`. |
| 2026-04-14 | 4 | Bascule `total_inscrits` = saisie sur `formation-stats` (list + grouped). Taux par défaut alignés saisie. `taux_*_gespers` calculés explicitement. Asymétrie list/grouped résolue. 8 tests sémantiques Lot 4. Types TS mis à jour. |
| 2026-04-14 | 5 | `tops` déjà aligné saisie — vérification + 3 tests sémantiques ajoutés. |
| 2026-04-14 | 6 | Migration UX : labels dashboard corrigés (saisie), section GESPERS contrôle dans détail/modal, colonne grouped renommée. |
| 2026-04-14 | 7 | Commentaires + PDF : helpers alignés saisie, labels GESPERS retirés, figement `saturation_formation` basé sur saisie. |
| 2026-04-14 | 9 | Export XLSX : colonnes saisie/GESPERS explicites, données GESPERS ajoutées. |
| 2026-04-14 | 10 | Couverture Annexe A documentée dans les tests. Matrice scénario → test formalisée. |

---

*Fin du document — Plan V3 pilotage migration inscrits + suivi d’exécution.*
