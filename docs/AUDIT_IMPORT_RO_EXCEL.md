# Audit d'import — Fichier « RO 09042026.xlsx » vs RAP_APP

**Date** : 2026-04-17  
**Dernière mise à jour** : 2026-04-18 (vigilance libellés centre / type d’offre / statut)

---

## Objectif métier (priorité actuelle)

Créer des **formations avec un maximum de champs renseignés** à partir du fichier RO. Ce chemin **ne repose pas** sur l’import Excel « Lot 1 » (feuille Meta + Données) : **pas besoin de Meta** pour atteindre l’objectif — un **script dédié** lit directement l’onglet RO (ex. `09 Avril`) et construit les objets en base.

Concernant **GESPERS** (`Inscrits Gespers` dans le fichier) : si la donnée n’est pas exploitable (colonne absente, `#ERROR!`, choix de ne pas l’initialiser en saisie), **ce n’est pas bloquant** — on laisse `inscrits_crif` / `inscrits_mp` à **0** (ou on remplit le reste sans toucher aux inscrits). L’enrichissement ultérieur se fera en saisie manuelle ou par flux habituel.

---

## 1. Structure du fichier Excel source

### Onglets

| Onglet | Contenu | Utilisable ? |
|--------|---------|-------------|
| `08 janvier` à `19 mars` | Snapshots hebdomadaires avec en-tête fusionné (lignes 1-3) puis données ligne 4+ | NON directement — en-tête complexe |
| **`09 Avril`** | **Dernière mise à jour** — header en ligne 1, données en ligne 2+ | **OUI avec adaptation** |
| `MGO MEUD` / `MGO NTR` | Listes MGO par centre (format différent) | NON — format incompatible |

### Colonnes de l'onglet « 09 Avril » (le plus exploitable)

| Index | Colonne Excel | Type | Exemple |
|-------|--------------|------|---------|
| 0 | `Produits` | Texte multiligne | `"EAA Alt\nEmployé Administratif et d'Accueil"` |
| 1 | `CENTRE` | Texte | `NANTERRE`, `MEUDON` |
| 2 | `N° PRODUIT` | Float | `14680.0` |
| 3 | `Offre` | Float | `24047.0` |
| 4 | `Détail de l'offre` | Texte | `MP ALT` |
| 5 | `Date de début` | Datetime | `2025-04-14` |
| 6 | `Date de fin` | Datetime | `2026-06-05` |
| 7 | `Prévus Gesplan` | Float | `17.0` |
| 8 | `Inscrits Gespers` | Float | `16.0` |
| 9 | `A recruter` | Int/String | `1` ou `#ERROR!` |
| 10 | `Commentaires/Actions` | Texte long | (commentaires métier) |
| 11 | `Entrés en formation` | Float | `16.0` |
| 12 | `Présents en formation à date` | Float | `6.0` |
| 13 | `Numéro DOKELIO+ / KAIROS` | Texte | `SE_0001121828` |
| 14 | `Contact FT` | Texte | (souvent vide) |
| 15 | `Convoc ?` | Texte | (oui/non) |
| 16 | `Assistante` | Texte | (nom) |

---

## 2. Mapping vers le modèle RAP_APP

### Modèle `Formation` — champs importables

| Colonne Excel | Champ Formation | Transformation nécessaire | Problèmes |
|---------------|----------------|--------------------------|-----------|
| `Produits` | `nom` | Extraire la première ligne (avant `\n`) | Texte multiligne, nettoyage nécessaire |
| `CENTRE` | `centre_id` (FK → Centre) | **Lookup** par nom : `Centre.objects.get(nom__icontains=...)` | Les noms Excel (`NANTERRE`, `MEUDON`) ne sont pas des ID mais des noms partiels. Nécessite correspondance avec les centres existants (`CRIF Nanterre`, `CRIF Meudon`...) |
| `N° PRODUIT` | `num_produit` | `int(float)` | OK |
| `Offre` (n° offre) | `num_offre` | `str(int(float))` | OK |
| `Détail de l'offre` | `type_offre_id` (FK → TypeOffre) | **Mapping** : `MP ALT` → `alternance`, `CRIF` → `crif`, `POEC` → `poec`, `POEI` → `poei` | Le fichier utilise des codes métier (`MP ALT`) au lieu des valeurs du modèle. Nécessite une table de correspondance. |
| `Date de début` | `start_date` | `.date()` sur le datetime | OK |
| `Date de fin` | `end_date` | `.date()` sur le datetime | OK |
| `Prévus Gesplan` | `prevus_crif` ou `prevus_mp` | `int(float)` — dispatch selon type offre | Une seule colonne : répartir selon le type d’offre (voir §5). |
| `Inscrits Gespers` | `inscrits_crif` / `inscrits_mp` (optionnel) | Si activé : même logique que les prévus (CRIF vs MP) | **Optionnel** : pour **remplir au max**, on *peut* initialiser la branche concernée depuis cette colonne (point de départ saisie). Si tu préfères **ne pas initialiser GESPERS**, laisser **0** — acceptable. |
| `Entrés en formation` | `entree_formation` | `int(float)` | OK |
| `Commentaires/Actions` | → Modèle `Commentaire` | Créer un commentaire lié à la formation | **Multi-modèle** : nécessite création séparée |
| `Numéro DOKELIO+ / KAIROS` | `num_kairos` | Texte direct | Parfois multiligne (`9201225021\nSE_0001274222`) |
| `Convoc ?` | `convocation_envoie` | Boolean (oui → True) | OK |
| `Assistante` | `assistante` | Texte direct | OK |

### Champs Formation **absents** du fichier Excel

| Champ obligatoire | Impact |
|-------------------|--------|
| `statut_id` (FK → Statut) | Pas dans le fichier → **défaut** `non_defini` ou statut « à recruter » selon règle simple (ex. si `A recruter` > 0) |
| `inscrits_crif` / `inscrits_mp` | Par défaut **0** ; **optionnel** : préremplir depuis `Inscrits Gespers` si souhaité ; sinon ignorer sans impact sur le reste du remplissage |
| `nombre_entretiens` | Absent — initialiser à 0 |
| `cap` | Absent — initialiser à `None` |

### Modèles liés à créer/résoudre

| Modèle | Logique |
|--------|---------|
| **Centre** | Lookup par nom partiel. Si `NANTERRE` → chercher `Centre` dont `nom` contient `Nanterre`. **Doit exister au préalable.** |
| **TypeOffre** | Mapping code → valeur : `MP ALT` → `alternance`, `CRIF` → `crif`, `POEC` → `poec`, `POEI` → `poei`, `TOSA` → `tosa`. **Doit exister au préalable.** |
| **Statut** | Non dans le fichier → attribuer un statut par défaut. |
| **Commentaire** | Colonne `Commentaires/Actions` → créer un `Commentaire` par formation. |

---

### Vigilance requise — libellés (centre, type d’offre, statut)

Les **identifiants stables** en base sont des **clés** (`Centre.id`, slugs `TypeOffre.nom`, `Statut.nom`), alors que le fichier RO fournit des **libellés ou codes métier** courts et variables. Une mauvaise correspondance = **mauvaise formation** (mauvais centre, mauvais type, mauvais indicateurs CRIF/MP). À traiter avec la même rigueur qu’un référentiel.

#### Centre (`CENTRE` dans Excel → `centre_id`)

| Risque | Exemple | Que faire |
|--------|---------|-----------|
| **Nom partiel vs nom complet en base** | Excel `NANTERRE` → en base souvent `CRIF Nanterre` ou libellé long | Ne pas se fier au seul `icontains` sans garde-fou : risque de **0 résultat** ou de **plusieurs** centres si la chaîne est ambiguë. |
| **Ambiguïté** | Deux centres contiennent « Nanterre » | **Refuser** la ligne ou exiger un **mapping explicite** (fichier YAML/JSON : `NANTERRE` → `id` ou code unique). |
| **Casse / accents** | `MEUDON` vs `Meudon` | Normaliser en **minuscules sans accent** pour la comparaison *après* mapping manuel des alias. |
| **Nouveau libellé dans le RO** | Colonne vide ou valeur jamais vue | Log **WARN** + ligne en « à traiter » plutôt qu’un match au hasard. |

#### Type d’offre (`Détail de l'offre` → `type_offre_id`)

| Risque | Exemple | Que faire |
|--------|---------|-----------|
| **Code métier ≠ libellé affiché** | `MP ALT`, espaces, variantes (`MP-ALT`) | **Table de correspondance canonique** (clé RO normalisée → `TypeOffre.nom`). Toute valeur inconnue → log + défaut `non_defini` **uniquement** après accord, ou **skip** de la ligne. |
| **Évolution des codes** | Nouveau code dans un prochain RO | Versionner le mapping ; **dry-run** qui liste les **valeurs distinctes** du fichier non résolues. |
| **Impact chaîne** | Mauvais type → mauvais **prevus_crif / prevus_mp** | La vigilance sur le type d’offre influence aussi les prévus et (si option) les inscrits. |

#### Statut (`statut_id` — absent du RO)

| Risque | Exemple | Que faire |
|--------|---------|-----------|
| **Choix arbitraire** | Toujours `non_defini` alors que la formation est « à recruter » | Si tu déduis d’une colonne (ex. `A recruter`), **valider la règle** avec le métier : risque de statut faux pour les tableaux de bord. |
| **Libellé vs slug** | Écran affiche « À recruter » mais en base `a_recruter` | Le script doit utiliser le **slug** du modèle `Statut`, pas le libellé français. |

#### Bonnes pratiques recommandées pour le script `import_ro_excel`

1. **Fichier de mapping versionné** (ex. `rap_app/services/imports/ro_label_maps.yaml`) : alias centres, codes type d’offre, optionnel statut par défaut.
2. **Mode dry-run** : imprimer pour chaque valeur distincte (`CENTRE`, `Détail de l'offre`) la résolution **ID choisi** ou « **NON RÉSOLU** ».
3. **Règle stricte sur le centre** : si `QuerySet.count() != 1` après filtre → **ne pas deviner** ; log + skip ou mapping obligatoire.
4. **Journal d’import** : CSV des lignes importées avec `centre_id`, `type_offre_id`, `statut_id` **effectifs** pour contrôle humain ponctuel.
5. **Tests** : cas **ambigu**, cas **inconnu**, cas **mapping explicite** pour éviter les régressions quand le RO change.

---

## 3. Écart avec l'import Excel standard (sans être un blocage pour ton objectif)

### L'import Formation actuel (`FormationExcelHandler`) ne traite pas ce fichier tel quel

Pour ton usage (**créer des formations avec un max de données, sans workflow Meta**), ce constat sert seulement à expliquer pourquoi on utilise un **script RO** et non l’UI d’import Lot 1.

| Problème | Détail | Impact pour toi |
|----------|--------|-----------------|
| **Format Lot 1** | Feuille `Meta` + `Données`, colonnes = `FORMATION_COLUMNS` | **Ignoré** — tu n’as pas besoin de Meta ; le script RO lit l’onglet métier directement. |
| **Colonnes différentes** | Import attend `centre_id`, `type_offre_id` ; le RO a `CENTRE`, `Détail de l'offre` | Résolu par **lookup / mapping** dans le script (voir §5). |
| **Lignes d'en-tête fusionnées** | Onglets janvier–mars : 3 lignes avant les données | Utiliser l’onglet **récent** type `09 Avril` (header ligne 1) **ou** détection de ligne d’en-tête dans le script. |
| **GESPERS** | Champ fichier ≠ sémantique « saisie pure » V3 | **Non bloquant** : soit on **ne remplit pas** les inscrits (0), soit préremplissage optionnel — au choix. |
| **Multi-modèle** | Commentaires, résolution Centre / TypeOffre | Géré dans le **même** script (création `Commentaire` + FK résolues). |

---

## 4. Les 3 options pour importer ces données

### Option A — Script de conversion (management command) ⭐ RECOMMANDÉ

**Principe** : Un script Django dédié qui lit le fichier RO, résout les FK, et crée les formations via le serializer existant.

**Avantages** :
- Contrôle total sur le mapping
- Gestion des FK par lookup (Centre par nom, TypeOffre par code)
- Dry-run possible
- Logging détaillé
- Gestion des commentaires en même temps
- Pas besoin de reformater le fichier source

**Inconvénients** :
- Code spécifique à écrire
- Maintenance si le format RO change

**Effort** : 2-4h de développement

### Option B — Reformater le fichier manuellement puis utiliser l'import existant

**Principe** : Créer un fichier Excel au format `FORMATION_COLUMNS` avec les bons ID.

**Avantages** :
- Utilise l'import existant tel quel

**Inconvénients** :
- Travail manuel important (résoudre les centre_id, type_offre_id, statut_id)
- Perte des commentaires
- Risque d'erreur humaine
- Pas de gestion GESPERS correcte
- À refaire à chaque nouveau fichier RO

**Effort** : 1-2h par fichier, non réutilisable

### Option C — Adapter l'import existant pour accepter les deux formats

**Principe** : Ajouter un handler `ROExcelHandler` dans le système d'import.

**Avantages** :
- Intégré à l'UI d'import
- Réutilisable

**Inconvénients** :
- Plus complexe à coder
- Doit gérer la détection automatique de format
- Les onglets multiples (snapshots) compliquent la logique

**Effort** : 4-8h de développement

---

## 5. Recommandation : Option A — Management command

### Ce que le script doit faire

```
python manage.py import_ro_excel "path/to/RO.xlsx" --sheet "09 Avril"
python manage.py import_ro_excel "path/to/RO.xlsx" --sheet "09 Avril" --apply
```

### Algorithme

```
1. Ouvrir le fichier Excel, onglet spécifié
2. Détecter la ligne d'en-tête (chercher la ligne contenant "Produits", "CENTRE", ...)
3. Pour chaque ligne de données :
   a. Extraire les valeurs
   b. Résoudre Centre par nom (NANTERRE → Centre existant)
   c. Résoudre TypeOffre par code (MP ALT → alternance)
   d. Attribuer Statut par défaut (non_defini)
   e. Construire le payload Formation
   f. Vérifier si la formation existe déjà (par num_offre ou num_produit + centre)
   g. Créer ou mettre à jour
   h. Créer un Commentaire si colonne non vide
4. Afficher le rapport
```

### Table de correspondance TypeOffre

| Code Excel | `TypeOffre.nom` |
|-----------|-----------------|
| `MP ALT` | `alternance` |
| `CRIF` | `crif` |
| `POEC` | `poec` |
| `POEI` | `poei` |
| `TOSA` | `tosa` |
| (autre) | `non_defini` |

### Table de correspondance Centre

| Nom Excel | Pattern de recherche |
|-----------|---------------------|
| `NANTERRE` | `Centre.objects.filter(nom__icontains="nanterre")` |
| `MEUDON` | `Centre.objects.filter(nom__icontains="meudon")` |
| (etc.) | Idem |

### Gestion des prévus

| Type offre | `prevus_crif` | `prevus_mp` |
|-----------|---------------|-------------|
| `crif` | `Prévus Gesplan` | 0 |
| `alternance`, `poei`, `poec` | 0 | `Prévus Gesplan` |

### Gestion des inscrits (alignée avec l’objectif « max data » / GESPERS non obligatoire)

| Mode | `inscrits_crif` / `inscrits_mp` | Quand l’utiliser |
|------|-------------------------------|-------------------|
| **Par défaut (recommandé si tu ne veux pas initialiser GESPERS)** | `0` | Simple ; le reste des champs (dates, prévus, entree_formation, commentaires, kairos, etc.) est quand même rempli au maximum. |
| **Enrichissement optionnel** | Remplir la branche CRIF ou MP selon le type d’offre, à partir de `Inscrits Gespers` | Uniquement si tu acceptes d’utiliser le fichier comme **point de départ** pour la colonne saisie concernée ; sinon rester en `0`. |

---

## 6. Risques

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Doublon de formation | Moyen | Vérifier unicité par `num_offre` + `centre` avant création |
| Centre introuvable ou **ambigu** (plusieurs matchs) | **Élevé** si non géré | Mapping explicite ; refus si `count() != 1` ; dry-run + liste des libellés |
| TypeOffre **mal interprété** (variante / nouveau code) | **Élevé** | Table canonique + dry-run des valeurs distinctes ; défaut `non_defini` seulement si validé |
| Statut **déduit** à tort (règle automatique) | Moyen | Documenter la règle ; préférer défaut unique et correction manuelle si besoin |
| `#ERROR!` dans colonnes calculées | Faible | Ignorer les colonnes avec `#ERROR!` (ex: `A recruter`) |
| Commentaires écrasés | Faible | Toujours créer un nouveau commentaire, ne pas écraser |

---

## 7. Prérequis avant import

1. **Les centres doivent exister** dans la base (`CRIF Nanterre`, `CRIF Meudon`, etc.)
2. **Les types d'offre doivent exister** (`crif`, `alternance`, `poec`, `poei`, `tosa`)
3. **Au moins un statut** doit exister (défaut : `non_defini`)
4. **GESPERS / inscrits** : aucune décision obligatoire — par défaut **0** ; préremplissage depuis `Inscrits Gespers` **uniquement en option** (`--fill-inscrits-from-gespers` si implémenté).

---

## 8. Plan proposé (nouveau) — « max de données », sans Meta

Objectif : **une commande Django** qui remplit le plus possible les champs `Formation` + commentaires liés, **sans** passer par la feuille Meta ni le schéma Lot 1.

| Étape | Action |
|-------|--------|
| **1** | Choisir l’onglet (par défaut le plus récent, ex. `09 Avril`) ou paramètre `--sheet`. |
| **2** | Implémenter `import_ro_excel` : openpyxl, détection ligne d’en-tête (`Produits`, `CENTRE`, …), lecture ligne à ligne. |
| **3** | Pour chaque ligne : résoudre **Centre** et **TypeOffre** via **mapping + règles anti-ambiguïté** (voir § vigilance libellés), **Statut** (défaut documenté ou règle validée métier), puis mapper **toutes les colonnes disponibles** (nom, dates, num_produit, num_offre, prévus, entree_formation, num_kairos, convocation, assistante, etc.). |
| **4** | **Commentaires** : si `Commentaires/Actions` non vide → créer un `Commentaire` lié à la formation créée. |
| **5** | **Inscrits** : par défaut **0** ; option future `--fill-inscrits-from-gespers` si tu veux préremplir depuis la colonne fichier (sinon ignorer volontairement). |
| **6** | **Dédup** : clé métier suggérée `(centre_id, num_offre)` ou `(centre_id, num_produit)` — **update** si existe, **create** sinon. |
| **7** | **Dry-run** puis **`--apply`** ; rapport CSV ou log des lignes skippées (centre introuvable, type inconnu). |
| **8** | Tests : fichier fixture minimal RO + 2–3 lignes, assertions sur champs renseignés. |

Ce plan **ne remplace pas** l’import Lot 1 pour les autres cas ; il **complète** l’outil pour les fichiers RO « métier » où l’objectif est la **création massive avec remplissage maximal**, Meta inutile, et **GESPERS facultatif**.

---

## 9. Résumé

| Question | Réponse |
|----------|---------|
| Peut-on utiliser ce fichier tel quel avec l'import existant ? | **NON** — format incompatible avec Lot 1 |
| Faut-il une feuille Meta ? | **NON** pour ton objectif — script RO direct |
| Quelle méthode utiliser ? | **Management command dédiée** (Option A / §8) |
| Faut-il un script serveur ? | **OUI** — ex. `python manage.py import_ro_excel` |
| GESPERS obligatoire ? | **NON** — laisser inscrits à 0 ou option de préremplissage |
| L'import touche plusieurs modèles ? | **OUI** — Formation + Centre (lookup) + TypeOffre (lookup) + Statut (défaut) + Commentaire (création) |
| Quel onglet utiliser ? | Le **plus récent** (ex. `09 Avril`) |
| Les onglets anciens sont-ils utiles ? | Snapshots historiques — **pas nécessaires** pour un import « état courant » |
| Libellés centre / type offre / statut | **Être vigilant** : mapping explicite, pas de guess si ambigu ; dry-run + journal (voir section vigilance) |
