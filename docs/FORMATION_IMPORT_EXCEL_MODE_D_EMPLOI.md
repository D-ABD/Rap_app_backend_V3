# Import Excel des formations — fonctionnement réel et mode d'emploi

Ce document décrit le fonctionnement **actuel** de l'import Excel des formations, tel qu'il est implémenté dans le code.

Il répond à quatre questions :

1. comment lancer l'import ;
2. quels champs sont réellement obligatoires ;
3. quels champs peuvent rester vides ;
4. ce qui est possible ou non aujourd'hui pour un modèle Excel avec listes de choix et création incomplète.

---

## 1. Où se trouve l'import

### Dans l'interface

Sur la page des formations, l'import passe par le bloc `Lot1ExcelActions` :

- téléchargement du modèle Excel ;
- export Excel ;
- import réel ;
- test d'import sans écriture (`dry_run`).

Fichiers concernés :

- `frontend_rap_app/src/pages/formations/FormationsPage.tsx`
- `frontend_rap_app/src/components/import_export/Lot1ExcelActions.tsx`
- `frontend_rap_app/src/api/lot1ImportExport.ts`

### Côté API

Les routes sont :

- `GET /api/import-export/formation/import-template/`
- `GET /api/import-export/formation/export-xlsx/`
- `POST /api/import-export/formation/import-xlsx/`
- `POST /api/import-export/formation/import-xlsx/?dry_run=true`

Fichiers backend :

- `rap_app/api/import_export/urls.py`
- `rap_app/api/import_export/views.py`
- `rap_app/services/imports/handlers_lot3.py`
- `rap_app/services/imports/excel_io.py`

---

## 2. Comment l'import fonctionne aujourd'hui

### Format du fichier

Le fichier doit être un vrai `.xlsx`.

Le classeur généré contient :

- une feuille `Données`
- une feuille `Meta`
- une feuille `Aide`

La feuille `Meta` ne doit pas être modifiée.

La feuille `Données` suit cette règle :

- ligne 1 = en-têtes en `snake_case`
- lignes 2+ = données

Le contrôle des colonnes est **strict** :

- toutes les colonnes attendues doivent être présentes ;
- aucune colonne inconnue n'est acceptée ;
- les colonnes système (`created_at`, `updated_at`, `created_by`, `updated_by`) sont interdites.

Donc :

- tu peux laisser des **cellules** vides dans certaines colonnes ;
- mais tu ne peux pas supprimer des **colonnes** du modèle.

### Création vs mise à jour

- si la colonne `id` est vide : l'import essaie de **créer** une nouvelle formation ;
- si la colonne `id` contient une valeur existante : l'import essaie de **mettre à jour** la formation correspondante.

### Dry run

Le mode test (`dry_run=true`) :

- lit le fichier ;
- valide chaque ligne ;
- calcule le résultat ;
- n'écrit rien en base.

### Atomicité du fichier

L'import est **atomique par fichier**.

Concrètement :

- s'il y a au moins une ligne en erreur ;
- alors aucune création / mise à jour réelle n'est enregistrée.

Autrement dit :

- soit tout le fichier passe ;
- soit rien n'est écrit.

---

## 3. Colonnes du modèle Excel formation

Le modèle formation est défini par `FORMATION_COLUMNS` dans :

- `rap_app/services/imports/schemas.py`

Colonnes actuelles :

- `id`
- `nom`
- `activite`
- `centre_id`
- `type_offre_id`
- `statut_id`
- `num_kairos`
- `num_offre`
- `num_produit`
- `start_date`
- `end_date`
- `intitule_diplome`
- `diplome_vise_code`
- `type_qualification_visee`
- `specialite_formation`
- `code_diplome`
- `code_rncp`
- `total_heures`
- `heures_enseignements_generaux`
- `heures_distanciel`
- `prevus_crif`
- `prevus_mp`
- `inscrits_crif`
- `inscrits_mp`
- `cap`
- `assistante`
- `entree_formation`
- `nombre_candidats`
- `nombre_entretiens`
- `convocation_envoie`
- `partenaire_ids`

---

## 4. Champs obligatoires pour créer une formation

Pour une **création** (`id` vide), le handler impose explicitement :

- `nom`
- `centre_id`
- `type_offre_id`
- `statut_id`

Cela vient de :

- `rap_app/services/imports/handlers_lot3.py`
- `rap_app/api/serializers/formations_serializers.py`

### Point important

Dans le code actuel, certains champs numériques non nuls ne peuvent pas être laissés vides dans Excel, même s'ils ont un défaut métier côté modèle.

En pratique, pour éviter une erreur à l'import, il faut aussi renseigner :

- `prevus_crif`
- `prevus_mp`
- `inscrits_crif`
- `inscrits_mp`
- `entree_formation`
- `nombre_candidats`
- `nombre_entretiens`

Valeur recommandée si tu ne sais pas encore :

- `0`

Pourquoi :

- le parser Excel convertit une cellule vide en `None` ;
- puis le serializer refuse `None` sur ces champs ;
- donc cellule vide = erreur de validation.

Ce point a été vérifié sur le serializer réel.

### Résumé pratique pour une création minimale qui passe aujourd'hui

Il faut au minimum renseigner :

- `nom`
- `centre_id`
- `type_offre_id`
- `statut_id`
- `prevus_crif = 0`
- `prevus_mp = 0`
- `inscrits_crif = 0`
- `inscrits_mp = 0`
- `entree_formation = 0`
- `nombre_candidats = 0`
- `nombre_entretiens = 0`

Et il est préférable de mettre aussi :

- `convocation_envoie = false`

Même si, en pratique, vide est interprété comme `false`.

---

## 5. Champs qui peuvent rester vides aujourd'hui

Les champs suivants peuvent raisonnablement rester vides dans le fichier Excel :

- `id` pour une création
- `activite`
- `num_kairos`
- `num_offre`
- `num_produit`
- `start_date`
- `end_date`
- `intitule_diplome`
- `diplome_vise_code`
- `type_qualification_visee`
- `specialite_formation`
- `code_diplome`
- `code_rncp`
- `total_heures`
- `heures_enseignements_generaux`
- `heures_distanciel`
- `cap`
- `assistante`
- `partenaire_ids`

### Valeurs spéciales

- `partenaire_ids` : liste d'identifiants séparés par des virgules
  - exemple : `12,45,91`
- `activite` : valeurs acceptées
  - `active`
  - `archivee`
  - `archivée`
- `convocation_envoie`
  - vide = `false`
  - valeurs typiques acceptées : `true/false`, `1/0`, `oui/non`
- `start_date` / `end_date`
  - format conseillé : `YYYY-MM-DD`

---

## 6. Mise à jour d'une formation existante

Pour mettre à jour une formation :

- il faut renseigner `id` avec l'identifiant existant ;
- l'import fait alors un `partial=True`.

### Attention

Dans le flux actuel, une cellule vide n'est pas toujours interprétée comme “ne pas changer”.

Pour plusieurs colonnes :

- une cellule vide devient `None` ;
- donc soit le champ est effacé s'il accepte `null`,
- soit l'import échoue s'il n'accepte pas `null`.

Conséquence :

- sur les champs FK (`centre_id`, `type_offre_id`, `statut_id`), une cellule vide peut aboutir à une mise à `null` ;
- sur les champs numériques non nuls listés plus haut, une cellule vide peut faire échouer la ligne.

Donc pour une mise à jour via Excel :

- il vaut mieux ne pas utiliser le fichier comme un “patch intelligent” ;
- il faut remplir volontairement les valeurs que tu veux conserver sur les champs sensibles.

---

## 7. Peut-on créer une formation avec seulement les champs obligatoires ?

### Réponse courte

Pas complètement, en l'état actuel.

### Réponse exacte

Métier / intention :

- oui, l'import vise bien une création simple avec peu de champs requis.

Technique / comportement réel actuel :

- non, pas avec uniquement `nom`, `centre_id`, `type_offre_id`, `statut_id` ;
- il faut aussi renseigner les champs numériques non nuls avec `0`.

Donc aujourd'hui, la vraie règle opérationnelle est :

- création minimale possible ;
- mais pas “strictement seulement les 4 champs métier” ;
- il faut quelques zéros en plus.

---

## 8. Peut-on laisser des champs vides puis les compléter plus tard dans l'app ?

### Oui, partiellement

Tu peux déjà :

1. créer une formation avec les champs minimaux qui passent ;
2. revenir ensuite dans la page d'édition classique ;
3. compléter les champs manquants dans le formulaire.

### Mais attention

Il n'existe pas aujourd'hui de mode :

- “import brouillon incomplet”
- ou “importer une ligne incomplète puis forcer la complétion dans l'UI avant validation finale”

L'import actuel :

- crée vraiment la formation si la ligne est valide ;
- ou refuse la ligne si elle ne l'est pas.

Il n'y a pas de workflow intermédiaire de type :

- brouillon
- staging
- validation humaine après import

---

## 9. Peut-on avoir des listes de choix dans le modèle Excel généré par l'app ?

### Aujourd'hui

Non.

Le modèle généré par `write_lot1_workbook()` :

- écrit uniquement des cellules simples ;
- ajoute `Meta` ;
- ajoute `Aide` ;
- mais n'ajoute pas de listes déroulantes Excel ;
- n'ajoute pas de feuilles de référentiel pour les FK ;
- n'ajoute pas de validation de données Excel (`DataValidation`).

Donc actuellement :

- `centre_id`
- `type_offre_id`
- `statut_id`
- `partenaire_ids`

doivent être saisis manuellement, avec des identifiants.

### Faisable techniquement ?

Oui, tout à fait.

La bonne évolution serait :

1. ajouter une ou plusieurs feuilles cachées ou visibles de référentiel
   - `Centres`
   - `TypesOffre`
   - `Statuts`
   - éventuellement `Partenaires`
2. y écrire les couples :
   - `id`
   - `libellé`
3. ajouter des listes déroulantes Excel sur la feuille `Données`
   - via `openpyxl.worksheet.datavalidation.DataValidation`

### Recommandation produit

Le plus robuste serait :

- soit conserver les colonnes techniques `*_id` mais avec liste de choix alimentée par des IDs lisibles ;
- soit ajouter des colonnes lisibles de saisie comme :
  - `centre_label`
  - `type_offre_label`
  - `statut_label`
- puis faire la résolution label -> id à l'import.

La seconde option est plus confortable pour les utilisateurs.

---

## 10. Ce qu'il faudrait changer pour un import “minimum obligatoire seulement”

Si l'objectif est :

- créer une formation avec seulement les champs vraiment obligatoires ;
- laisser le reste vide ;
- compléter ensuite dans l'app ;

alors il faut faire évoluer l'import.

### Évolution minimale recommandée

Dans `FormationExcelHandler._raw_to_serializer_payload()` :

- ne pas envoyer `None` sur les compteurs quand la cellule est vide ;
- soit omettre la clé ;
- soit la convertir en `0`.

En pratique, pour la création, la règle la plus simple serait :

- cellule vide sur les compteurs = `0`

Champs concernés :

- `prevus_crif`
- `prevus_mp`
- `inscrits_crif`
- `inscrits_mp`
- `entree_formation`
- `nombre_candidats`
- `nombre_entretiens`

### Évolution produit plus avancée

Si tu veux un vrai flux “import incomplet puis complétion” :

- il faut un mode brouillon ;
- ou une table de staging ;
- ou un statut métier spécifique indiquant “à compléter”.

Ce n'est pas présent aujourd'hui.

---

## 11. Recommandation d'usage immédiate

Si tu veux utiliser l'import formation **dès maintenant**, la méthode la plus sûre est :

1. télécharger le modèle Excel depuis la page Formations ;
2. remplir les en-têtes sans jamais les modifier ;
3. pour une création, renseigner au minimum :
   - `nom`
   - `centre_id`
   - `type_offre_id`
   - `statut_id`
   - les compteurs à `0`
4. lancer d'abord `Tester (sans enregistrer)` ;
5. corriger les erreurs éventuelles ;
6. lancer l'import réel ;
7. compléter ensuite les fiches dans l'interface.

### Astuce pratique

Pour récupérer les bons identifiants :

- exporter les centres ;
- exporter les types d'offre ;
- exporter les statuts ;

puis t'en servir comme référentiel de remplissage.

---

## 12. Réponse synthétique à ta question

### Peut-on importer une formation avec seulement les champs obligatoires ?

Pas totalement aujourd'hui.

Il faut aussi renseigner plusieurs compteurs numériques à `0`.

### Peut-on laisser des champs vides puis compléter après ?

Oui, pour les champs optionnels, une fois la formation créée.

Mais il n'existe pas encore de mode brouillon ou “compléter après import” intégré au workflow.

### Peut-on avoir des listes de choix dans le fichier Excel généré ?

Pas aujourd'hui.

Mais c'est techniquement faisable et ce serait une très bonne amélioration.

### Recommandation produit

La meilleure évolution serait :

1. autoriser une création réellement minimale ;
2. générer un modèle Excel enrichi avec listes de choix ;
3. éventuellement ajouter un mode brouillon / à compléter.

---

## Références code

- `rap_app/services/imports/excel_io.py`
- `rap_app/services/imports/handlers_lot3.py`
- `rap_app/services/imports/schemas.py`
- `rap_app/api/import_export/views.py`
- `rap_app/api/import_export/urls.py`
- `rap_app/api/serializers/formations_serializers.py`
- `rap_app/models/formations.py`
- `frontend_rap_app/src/components/import_export/Lot1ExcelActions.tsx`
- `frontend_rap_app/src/api/lot1ImportExport.ts`
- `frontend_rap_app/src/pages/formations/FormationsPage.tsx`
