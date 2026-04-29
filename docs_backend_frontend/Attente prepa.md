# Attente prepa

Date: 2026-04-28

## Objectif

Le module Prepa doit etre clarifie pour separer proprement:

- l'Information collective ;
- les Ateliers Prepa ;
- le suivi individuel `StagiairePrepa` ;
- les `ObjectifPrepa` annuels ;
- les statistiques et le dashboard.

Le but est d'avoir un fonctionnement simple, lisible et coherent metier, sans confusion entre:

- chiffres collectifs ;
- participation a une seance ;
- suivi du parcours individuel ;
- objectifs annuels ;
- indicateurs dashboard.

## 1. Information collective

L'Information collective doit etre tres simple.

On ne doit pas y ajouter de stagiaire nominativement.

On ne doit y saisir que des chiffres.

Elle doit etre independante du suivi individuel, mais elle doit alimenter les statistiques Prepa.

### Donnees attendues

- nombre de places ouvertes ;
- nombre de prescriptions ;
- taux de prescription ;
- nombre de presents a l'IC ;
- taux de presence a l'IC ;
- nombre d'adhesions ;
- taux d'adhesion.

### Regles

- aucun ajout de `StagiairePrepa` depuis une IC ;
- aucune participation nominative sur une IC ;
- l'IC reste un bloc collectif pur ;
- l'IC alimente les statistiques globales, mais ne pilote pas le parcours individuel.

## 2. Atelier Prepa

L'Atelier Prepa est la vraie seance nominative du parcours.

Chaque atelier doit contenir:

- type d'activite ;
- date de debut ;
- date de fin ;
- centre ;
- nom du formateur ;
- participants de la seance ;
- totaux atelier ;
- taux de presence atelier.

### Regles de centre

- si l'utilisateur n'a qu'un centre dans son perimetre, le centre doit etre transporte automatiquement ;
- si l'utilisateur est admin, il doit selectionner le centre.

## 3. Totaux atelier

Les totaux atelier doivent etre presentes clairement en deux logiques:

- une partie `hors liste` ;
- une partie `calculee automatiquement`.

### Calculs attendus

L'atelier doit calculer:

- le nombre d'inscrits ;
- le nombre de presents ;
- le nombre d'absents ;
- le pourcentage de presence en atelier.

### Regles de calcul

- `inscrits atelier` = nominatif calcule + hors liste ;
- `presents atelier` = nominatif present + hors liste presents ;
- `absents atelier` = nominatif absent + hors liste absents ;
- `taux de presence atelier` = presents / inscrits.

### Souplesse utilisateur

L'utilisateur doit pouvoir:

- saisir tous les stagiaires nominativement ;
- saisir seulement une partie des stagiaires nominativement ;
- completer avec des valeurs hors liste ;
- garder des totaux finaux coherents.

## 4. StagiairePrepa

`StagiairePrepa` doit etre la fiche centrale du parcours individuel.

Il ne doit pas etre confondu avec l'Information collective.

Il doit permettre de piloter:

- le nombre de personnes en attente d'un parcours ;
- le nombre de personnes en attente d'un atelier suivant ;
- le nombre d'abandons ;
- le pourcentage d'abandon ;
- le nombre de personnes orientees AFPA ;
- le pourcentage d'orientes AFPA ;
- l'atelier en cours ;
- l'atelier attendu ensuite ;
- la progression du parcours.

### Regles metier

- `atelier_1` marque l'entree reelle dans le parcours ;
- `atelier_6` marque la sortie / fin du parcours ;
- une personne ne doit pas etre active sur plusieurs ateliers en meme temps ;
- le pilotage doit respecter le scope utilisateur.

## 5. ObjectifPrepa

Les objectifs annuels doivent etre alimentes particulierement par `atelier_1`.

Ils doivent etre lus selon deux axes:

- un axe `engage` base sur les inscrits a `atelier_1` ;
- un axe `reel` base sur les presents a `atelier_1`.

### Indicateurs attendus

- objectif annuel ;
- nombre d'inscrits `atelier_1` ;
- nombre de presents `atelier_1` ;
- taux d'atteinte sur inscrits ;
- taux d'atteinte sur presents ;
- reste a faire sur inscrits ;
- reste a faire sur presents.

### Regle importante

Les adhesions issues des IC doivent rester un indicateur a part.

Elles ne doivent pas etre confondues avec l'atteinte de l'objectif atelier.

## 6. Dashboard Prepa

Le dashboard Prepa doit etre structure en trois blocs.

### Bloc Information collective

Il doit afficher:

- places ouvertes ;
- prescriptions ;
- taux de prescription ;
- presents IC ;
- taux de presence IC ;
- adhesions ;
- taux d'adhesion.

### Bloc Atelier / Objectif

Il doit afficher:

- objectif annuel ;
- inscrits `atelier_1` ;
- presents `atelier_1` ;
- taux d'atteinte engage ;
- taux d'atteinte reel ;
- reste a faire engage ;
- reste a faire reel ;
- sorties `atelier_6` ;
- taux de retention `atelier_1 -> atelier_6`.

### Bloc Parcours individuels

Il doit afficher:

- en attente d'entree ;
- en attente d'un atelier suivant ;
- abandons ;
- pourcentage d'abandon ;
- orientes AFPA ;
- pourcentage d'orientes AFPA.

## 7. Scope et perimetre

Toutes les donnees doivent respecter le scope utilisateur.

Cela concerne:

- les listes ;
- les formulaires ;
- les centres proposes ;
- les statistiques ;
- le dashboard ;
- les exports.

### Regles

- scope centre pour les utilisateurs limites a leurs centres ;
- scope departement si la logique departement est activee ;
- vision globale reservee aux admins ;
- centre preselectionne quand le perimetre ne laisse qu'un choix ;
- selection explicite du centre pour les admins.

## 8. Clarification de modelisation

La separation cible doit etre la suivante:

- `Information collective` = chiffres seulement ;
- `Atelier Prepa` = seance nominative + hors liste + totaux ateliers ;
- `StagiairePrepa` = parcours individuel ;
- `ObjectifPrepa` = objectif annuel ;
- `prepa_origine` = donnee de tracabilite du point d'entree ;
- `participation a la seance` = lien principal pour savoir qui est inscrit ou present a un atelier.

### Consequence importante

Pour les ateliers:

- on ne doit pas dependre de `prepa_origine` pour relire les participants ;
- la reference principale doit etre la participation a la seance ;
- `prepa_origine` peut rester en base, mais ne doit pas piloter l'usage quotidien des ateliers.

## Resume executif

La cible metier a retenir est:

- `IC = chiffres seulement`
- `Atelier = suivi nominatif + hors liste + calculs automatiques`
- `StagiairePrepa = parcours individuel`
- `Objectif = atelier_1`
- `Dashboard = IC / Atelier-Objectif / Parcours`
- `Scope = applique partout`
