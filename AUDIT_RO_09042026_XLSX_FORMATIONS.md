# Audit — import formations depuis `RO 09042026.xlsx`

**Date d’audit** : 2026-04-24  
**Fichier source analysé** : `/Users/abd/Downloads/RO 09042026.xlsx` (lecture structure via archive Office Open XML — pas de dépendance `openpyxl` requise pour cet audit)  
**Périmètre** : possibilité d’alimenter le modèle Django **`Formation`** à partir de ce classeur, **sans** modifier le code applicatif (constat uniquement).  
**Référence interne (existant)** : `docs/AUDIT_IMPORT_RO_EXCEL.md` (détail mapping / risques — à croiser).

---

## 1. Conclusion (exécutif)

| Question | Réponse |
|----------|---------|
| **Peut-on utiliser ce Excel pour importer des formations ?** | **Oui, de façon réaliste**, à condition d’implémenter un **import dédié** (script ou commande de management) qui lit l’onglet cible, applique un **mapping Centre / Type d’offre / Statut** sur données métier, et gère les **règles de remplissage** des champs non présents dans le fichier. |
| **Le mécanisme d’import Excel « Lot 1 / Lot 3 » existant suffit-il ?** | **Non tel quel** : l’import packagé (`FormationExcelHandler`, feuille **Meta** + grilles alignées sur `SCHEMA_VERSION_LOT1`) ne correspond **pas** au format RO (libellés, pas d’`id` formation, onglets historiques, etc.). Voir §5. |
| **Prérequis** | **Centres** et **TypeOffre** (et en pratique **Statut**) doivent **exister** en base et être reliés via une **table de correspondance** fiable (alias RO → clés stables). |

---

## 2. Structure constatée du classeur (fichier fourni)

### 2.1 Onglets présents

| Onglet | Rôle (constat) |
|--------|----------------|
| `08 janvier` → `19 mars` | Snapshots périodiques : en-têtes de présentation (lignes 1–3) puis ligne d’en-tête colonnes (ligne 4) et données. |
| **`09 Avril`** | Dernière période fournie ici : **ligne 1 = en-têtes de colonnes**, **données à partir de la ligne 2** (format plus simple qu’un onglet « historique »). |
| `MGO MEUD` / `MGO NTR` | Autre usage (MGO) — **hors périmètre** import `Formation` standard. |

**Recommandation** : cibler l’import sur l’onglet **`09 Avril`** (ou, pour rejeu d’une date passée, un onglet historique **en adaptant** le numéro de ligne d’en-tête : 4 sur les anciens onglets vs 1 sur `09 Avril`).

### 2.2 Colonnes (ligne 1 de `09 Avril`)

Ordre cohérent avec l’audit `docs/AUDIT_IMPORT_RO_EXCEL.md` :

`Produits` · `CENTRE` · `N° PRODUIT` · `Offre` · `Détail de l'offre` · `Date de début` · `Date de fin` · `Prévus Gesplan` · `Inscrits Gespers` · `A recruter` · `Commentaires/Actions` · `Entrés en formation` · `Présents en formation à date` · `Numéro DOKELIO+ / KAIROS` · `Contact FT` · `Convoc ?` · `Assistante`

### 2.3 Volume

Sur l’onglet `09 Avril`, présence de données sur **l’ordre d’une centaine de lignes** (dernière ligne avec cellules : indicatif `max_row` ≈ **95** côté XML — à confirmer en dry-run avec `openpyxl` côté implémentation).

### 2.4 Types de cellules (technique)

- Champs texte : multilignes possibles (`Produits`, `Commentaires/Actions`, `Numéro DOKELIO+ / KAIROS`, etc.).  
- Dates : en Excel, souvent stockées en **sérial** ; une implémentation doit utiliser une librairie (ex. **`openpyxl`**, déjà présente côté API formations pour export) pour convertir **F** / **G** en `date` Python, pas seulement la valeur brute.  
- Valeurs d’erreur type `#ERROR!` : **à détecter** (rejet de ligne ou champ vide selon règle métier).

---

## 3. Adéquation avec le modèle `Formation` (Django)

Le modèle `rap_app.models.formations.Formation` expose notamment (liste non exhaustive) : `nom`, `centre`, `type_offre`, `statut`, `start_date`, `end_date`, `num_produit`, `num_offre`, `prevus_crif`, `prevus_mp`, `inscrits_crif`, `inscrits_mp`, `entree_formation`, `presents_en_formation`, `num_kairos`, `convocation_envoie`, `assistante`, etc.

### 3.1 Mapping direct ou quasi direct

| Colonne RO (09 Avril) | Champ cible | Remarque |
|----------------------|------------|----------|
| `Produits` | `nom` | Prendre en général la **1re ligne** (avant `\n`) + éventuellement troncature 255. |
| `N° PRODUIT` | `num_produit` | Entier. |
| `Offre` | `num_offre` | Texte / normalisation (éviter `24047.0` en float brut). |
| `Date de début` / `Date de fin` | `start_date` / `end_date` | Conversion date Excel requise. |
| `Entrés en formation` | `entree_formation` | Entier. |
| `Présents en formation à date` | `presents_en_formation` | Entier. |
| `Numéro DOKELIO+ / KAIROS` | `num_kairos` | Texte ; éventuellement 1re ligne si multiligne. |
| `Convoc ?` | `convocation_envoie` | Booléen (ex. `Fait` / oui / non). |
| `Assistante` | `assistante` | Texte. |

### 3.2 Résolution de FK et répartition CRIF / MP

| Colonne / contexte | Champ(s) | Remarque |
|--------------------|------------|----------|
| `CENTRE` | `centre_id` | **Lookup** par table d’**alias** (ex. `NANTERRE` → id centre réel). Ne **pas** se fier seul à un `icontains` non verrouillé. |
| `Détail de l'offre` | `type_offre_id` | Codes métier (`MP ALT`, etc.) → mapping vers `TypeOffre` (souvent par **slug** / nom canonique en base). |
| *(absent du RO)* | `statut_id` | **Valeur par défaut** métier (ex. statut par défaut du projet) ou règle dérivée (ex. colonne `A recruter`). |
| `Prévus Gesplan` | `prevus_crif` + `prevus_mp` | Une seule colonne : **dispatch** selon le type d’offre (CRIF vs MP) — règle à figer avec le métier (voir `docs/AUDIT_IMPORT_RO_EXCEL.md` §5). |
| `Inscrits Gespers` | `inscrits_crif` / `inscrits_mp` | **Optionnel** : peut rester 0 si non fiable. |

### 3.3 Donnée liée `Commentaire`

- Colonne `Commentaires/Actions` : utile en tant que texte de **commentaire** lié à la formation, mais implique le modèle `Commentaire` (création en transaction avec la formation) — **hors simple “save Formation”** seul.

---

## 4. État des lieux dans le dépôt (import existant)

- Le package `rap_app.services.imports` gère l’import/export **symétrique** Lot 1–4 (`handlers_lot3.FormationExcelHandler`, schéma `SCHEMA_VERSION_LOT1`, lecture via `read_formation_import_workbook`).  
- **Aucune** `management command` spécifique « RO / revue d’offres » n’a été recensée : les commandes présentes (`fix_nombre_candidats`, `lot8_audit_data`, etc.) ne couvrent pas ce flux.  
- **OpenPyXL** est déjà une dépendance côté API (ex. `formations_viewsets` export) — cohérent pour un futur script d’import RO.

**Conclusion outillage** : un import RO = **nouveau code** (service + optionnellement `manage.py import_ro_formations` avec `--dry-run`).

---

## 5. Risques et garde-fous (rappel)

- **Unicité formation** : doublon possible sur (`num_offre`, `centre`, plage de dates) — stratégie **update vs create** à définir.  
- **Mapping centre / type d’offre** : point le plus **à risque** pour la qualité des données.  
- **Statut** : absent du RO ; impact tableaux de bord si mauvaise valeur par défaut.  
- **Onglets historiques** : en-têtes en ligne 4 (pas ligne 1) — paramétrage par onglet ou par date.

---

## 6. Pistes de mise en œuvre (hors scope actuel)

1. Commande : `import_ro_excel --file path --sheet "09 Avril" --dry-run` (liste des résolutions + lignes rejetées).  
2. Fichier YAML/JSON de **mapping** : alias centre, alias type d’offre, statut par défaut.  
3. Tests : jeu réduit (5 lignes) + vérification manuelle en base.  
4. **Ne pas** confondre avec l’import Lot 1 sans adaptation du fichier.

---

## 7. Synthèse

Le fichier **`RO 09042026.xlsx`** est **structuré de manière cohérente** pour nourrir le modèle **`Formation`**, notamment via l’onglet **`09 Avril`**, moyennant un **import dédié** et des **règles de correspondance** explicites. L’**import Excel existant (Lot 3)** n’est **pas** un substitut direct.

*Document d’audit — aucune modification de code effectuée lors de sa rédaction.*
