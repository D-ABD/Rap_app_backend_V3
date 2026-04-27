# Plan Ultra Securise - Prepa Competences

Date: 2026-04-26

## Objectif

Faire evoluer le module Prepa Competences sans casser l'application.

Le principe est simple:

- on refait uniquement ce qu'il est necessaire de refaire ;
- on conserve l'existant tant qu'il sert encore ;
- on fait evoluer `StagiairePrepa` comme pivot du parcours individuel ;
- on garde `Prepa` comme modele de seance et de volumes collectifs ;
- on corrige ensuite les statistiques et le dashboard.

## Regles de securite

- ne supprimer aucun champ existant ;
- ne renommer aucun champ existant ;
- ne modifier aucune route existante ;
- ne casser aucun serializer existant ;
- ne casser aucun endpoint frontend existant ;
- ajouter uniquement des champs, proprietes et methodes compatibles ;
- toute migration doit etre non destructive ;
- ne pas supprimer brutalement les champs ou calculs existants ;
- ne pas remplacer les stats actuelles tant que les nouvelles ne sont pas verifiees ;
- ne pas casser les ecrans `IC Prepa`, `Ateliers Prepa` et `Stagiaires Prepa` ;
- garder la compatibilite API pendant la transition ;
- conserver les donnees actuelles `Prepa` ;
- ajouter des docstrings au meme niveau de qualite que dans le reste de l'app ;
- toute nouvelle UI doit consommer `theme.ts` et respecter les patterns existants ;
- pas de styles hardcodes si le theme peut les porter ;
- chaque lot doit etre testable et deployable seul.

## Cible metier

La separation cible doit etre:

- `Prepa` = seance / atelier / volume collectif
- `StagiairePrepa` = parcours individuel / suivi nominatif
- `ObjectifPrepa` = objectif annuel par centre

Le module doit permettre de savoir:

- qui entre en `atelier_1`
- qui attend quel atelier
- qui a termine en `atelier_6`
- qui est oriente vers AFPA
- vers quel centre AFPA
- vers quelle formation
- et quel est le taux de transformation AFPA

Cette evolution doit enrichir `StagiairePrepa` sans remplacer brutalement les calculs existants bases sur `Prepa`.

Les nouveaux indicateurs individuels doivent etre ajoutes en parallele, puis utilises progressivement.

## Lots de realisation

### Lot 1 - Stabilisation et cadrage sans risque

Objectif:

- ne rien casser ;
- documenter clairement le role de chaque brique ;
- preparer la suite.

A faire:

- confirmer dans le code et la documentation que:
  - `IC Prepa` = flux amont
  - `atelier_1` = entree reelle parcours
  - `Prepa` = seance
  - `StagiairePrepa` = suivi individuel
- conserver tous les ecrans existants
- ne supprimer aucune donnee

Livrable:

- documentation clarifiee
- aucune regression fonctionnelle

### Lot 2 - Evolution minimale du modele `StagiairePrepa`

Objectif:

- enrichir le suivi individuel sans casser les champs actuels.

A faire:

- ajouter les champs de pilotage:
  - `prochain_atelier_attendu`
  - `statut_positionnement`
  - `orientation_finale`
  - `centre_afpa_cible`
  - `formation_afpa_cible`
  - `date_orientation`
  - `entree_formation_confirmee`
  - `date_entree_formation`
- conserver les champs actuels:
  - ateliers realises
  - dates ateliers
  - statut parcours
  - commentaire
  - motif abandon

Regles:

- ne pas supprimer les boolens ateliers existants
- ne pas casser les serializers existants
- ajouter des docstrings completes sur:
  - modele
  - proprietes
  - serializers
  - viewsets

Livrable:

- modele enrichi
- migration additive uniquement

### Lot 3 - Proprietes calculees et logique metier

Objectif:

- donner une lecture metier exploitable sans changer brutalement les usages.

A faire:

- ajouter des proprietes calculees type:
  - entrant_parcours
  - sortant_parcours
  - transformation_afpa
  - progression_parcours
- definir les regles:
  - entrant = `atelier_1_realise = true`
  - sortant = `atelier_6_realise = true`
  - transformation AFPA = oriente AFPA / entrants atelier 1

Regles:

- garder les calculs existants en parallele
- ne pas rebrancher encore tous les dashboards

Livrable:

- nouvelles proprietes metier fiables
- logique lisible avec docstrings

### Lot 4 - API de pilotage individuel

Objectif:

- exposer les nouvelles informations sans casser les endpoints actuels.

A faire:

- enrichir les serializers `StagiairePrepa`
- enrichir les filtres:
  - prochain atelier attendu
  - statut positionnement
  - orientation finale
  - centre AFPA cible
  - formation AFPA cible
- ajouter si besoin de nouveaux endpoints de stats individuelles:
  - entrants atelier 1
  - sortants atelier 6
  - orientes AFPA
  - transformation AFPA

Regles:

- compatibilite descendante
- enveloppes API conformes au reste de l'app
- docstrings homogènes avec le style du projet

Livrable:

- API enrichie
- aucun endpoint critique remplace brutalement

### Lot 5 - UI de pilotage parcours

Objectif:

- permettre de voir enfin "qui doit faire quoi".

A faire:

- creer ou faire evoluer la vue `Stagiaires Prepa` pour afficher:
  - prochain atelier attendu
  - statut positionnement
  - orientation AFPA
  - centre AFPA cible
  - formation AFPA cible
- garder les ecrans existants `IC` et `Ateliers`
- faire une UI sobre et coherente avec le reste de l'app

Regles UI:

- consommer `theme.ts`
- reutiliser les composants et patterns existants
- pas de rupture visuelle
- pas de CSS ad hoc si le theme peut porter la variante

Livrable:

- table de pilotage claire
- aucune perte de colonnes necessaires

### Lot 6 - Correction des stats et du dashboard

Objectif:

- aligner le dashboard avec la logique metier reelle.

A faire:

- corriger le `resume` Prepa
- separer clairement:
  - presents tous ateliers
  - entrants atelier 1
  - sortants atelier 6
  - transformations AFPA
- faire evoluer les widgets dashboard pour qu'ils lisent les bons indicateurs
- conserver les stats collectives utiles de `Prepa`

Regles:

- ne pas remplacer les stats collectives tant que les nouvelles stats individuelles ne sont pas verifiees
- faire valider les chiffres avant bascule definitive

Livrable:

- dashboard coherent metier
- objectif annuel toujours base sur `atelier_1`

### Lot 7 - Clarification de la saisie

Objectif:

- eviter la confusion entre saisie de seance et creation de fiche parcours.

A faire:

- garder la saisie imbriquee dans `Prepa` seulement comme creation rapide
- faire du CRUD `StagiairePrepa` l'entree principale du suivi individuel
- clarifier les libelles UI pour que l'utilisateur sache ce qu'il fait

Livrable:

- workflow plus lisible
- moins de risque de doublons fonctionnels

### Lot 8 - Planning fin plus tard

Objectif:

- preparer l'avenir sans alourdir maintenant le chantier.

A faire plus tard:

- ajouter un modele de liaison entre une seance `Prepa` et un `StagiairePrepa`
- porter dessus:
  - convocation
  - presence
  - absence
  - emargement
  - planification fine

Regle:

- ce lot ne doit commencer qu'une fois le pivot `StagiairePrepa` stabilise

## Position sur les donnees actuelles

Il n'est pas preferable de supprimer les donnees actuelles `Prepa`.

Il vaut mieux:

- les conserver
- faire evoluer le modele autour d'elles
- corriger les calculs avant tout nettoyage
- utiliser ces donnees comme reference de comparaison avant/apres

La suppression de donnees maintenant apporterait surtout du risque:

- perte d'historique
- perte de comparatif
- difficulte de verifier les nouveaux calculs

## Ordre de realisation recommande

1. Lot 1 - Stabilisation et cadrage
2. Lot 2 - Evolution minimale du modele
3. Lot 3 - Proprietes calculees
4. Lot 4 - API de pilotage individuel
5. Lot 5 - UI de pilotage parcours
6. Lot 6 - Correction des stats et du dashboard
7. Lot 7 - Clarification de la saisie
8. Lot 8 - Planning fin plus tard

## Etat d'avancement au 2026-04-27

### Resume executif

Avancement global:

- lots 1 a 4: faits
- lot 5: majoritairement fait
- lots 6 et 7: partiellement faits
- lot 8: non demarre

Ce qui est deja en place:

- `StagiairePrepa` enrichi comme pivot du suivi individuel
- API de pilotage individuel ajoutee
- ecrans `Stagiaires Prepa` enrichis
- widget dashboard parcours ajoute
- navigation atelier vers edition active

Ce qu'il reste a faire:

- appliquer la migration
- finir la recette metier
- verifier les chiffres dashboard sur donnees reelles
- ajouter si besoin les filtres UI manquants
- arbitrer les futurs lots presence / liaison nominative / `date_entree_formation`

### Vue d'ensemble

Le pivot `StagiairePrepa` a ete fortement renforce sans rupture de contrat existant.

Le chantier a avance sur:

- le modele backend
- les proprietes metier
- l'API de pilotage individuel
- la UI `Stagiaires Prepa`
- le dashboard Prepa
- la navigation atelier vers edition

Il reste encore du travail de finition et de recette metier avant de considerer le chantier comme totalement clos.

### Lots realises

#### Lot 1 - Stabilisation et cadrage

Statut: fait

Realise:

- la separation cible `Prepa` / `StagiairePrepa` / `ObjectifPrepa` a ete conservee
- aucune route existante n'a ete supprimee
- aucun champ existant n'a ete renomme
- l'evolution a ete faite de maniere additive

#### Lot 2 - Evolution minimale du modele `StagiairePrepa`

Statut: fait

Realise:

- ajout de `prochain_atelier_prevu`
- ajout de `statut_positionnement`
- ajout de `orientation_finale`
- ajout de `centre_afpa_cible`
- ajout de `formation_afpa_cible`
- ajout de `date_orientation`
- ajout de `entree_formation_confirmee`
- conservation des boolens ateliers existants
- conservation des dates ateliers existantes
- migration non destructive preparee

Remarque:

- le champ `date_entree_formation` n'a pas ete ajoute dans ce lot
- il n'etait pas present dans la demande recente prioritaire et peut rester en lot complementaire si le metier le confirme

#### Lot 3 - Proprietes calculees et logique metier

Statut: fait

Realise:

- recalcul du statut de parcours metier
- calcul du prochain atelier attendu
- calcul des indicateurs d'orientation AFPA
- ajout d'un `QuerySet` metier pour le pilotage individuel
- synthese des entrants `atelier_1`, sortants `atelier_6`, orientes AFPA et taux de transformation

#### Lot 4 - API de pilotage individuel

Statut: fait

Realise:

- enrichissement du serializer `StagiairePrepa`
- ajout des validations metier pour l'orientation AFPA
- ajout des filtres API:
  - `statut_positionnement`
  - `orientation_finale`
  - `centre_afpa_cible`
  - `entree_formation_confirmee`
- ajout du endpoint:
  - `GET /stagiaires-prepa/synthese-parcours/`
- enrichissement des exports stagiaires Prepa

#### Lot 5 - UI de pilotage parcours

Statut: majoritairement fait

Realise:

- formulaire `Stagiaires Prepa` enrichi
- table `Stagiaires Prepa` enrichie
- detail `Stagiaires Prepa` enrichi
- exposition des informations:
  - prochain atelier attendu
  - positionnement
  - orientation AFPA
  - centre AFPA cible
  - formation AFPA cible

Reste a faire:

- ajouter si besoin des filtres visuels complets dans la page `Stagiaires Prepa` pour exploiter tous les nouveaux filtres backend

#### Lot 6 - Correction des stats et du dashboard

Statut: partiellement fait

Realise:

- ajout d'un widget dashboard dedie aux parcours individuels Prepa
- affichage des KPI:
  - entrees `atelier_1`
  - sorties `atelier_6`
  - orientes AFPA
  - taux de transformation AFPA
  - attentes et abandons
- integration dans le dashboard Prepa
- integration dans le dashboard general

Reste a faire:

- verifier metierement les chiffres du dashboard avec des donnees reelles
- decider si les anciens widgets Prepa doivent etre ajustes plus finement ou laisses tels quels pendant la transition

#### Lot 7 - Clarification de la saisie

Statut: partiellement fait

Realise:

- la navigation atelier a ete clarifiee:
  - clic sur une ligne atelier = ouverture directe de la page d'edition atelier
  - depuis cette edition, il est possible d'ajouter des `StagiairePrepa`
- la modale detail atelier conserve un acces explicite a la modification

Reste a faire:

- harmoniser completement les redirections de toutes les pages Prepa generiques vers les pages specialisees si le metier le souhaite
- confirmer si le CRUD `StagiairePrepa` doit devenir l'unique porte d'entree du suivi individuel ou si la saisie imbriquee dans `Prepa` reste officiellement supportee

#### Lot 8 - Planning fin plus tard

Statut: non demarre

Non realise:

- modele de liaison nominatif entre une seance `Prepa` et un `StagiairePrepa`
- gestion structuree de la convocation
- gestion structuree de la presence / absence
- emargement persiste en base
- planification fine par seance

### Tests et verification

Realise:

- tests backend cibles ajoutes sur `StagiairePrepa`
- tests cibles verifies sur:
  - serializer
  - create / update / desarchiver
  - endpoint `synthese-parcours`
- `manage.py check` valide

Non encore fait:

- campagne complete de tests projet
- tests frontend dedies
- recette metier complete sur donnees reelles

### Reste a faire prioritaire

1. appliquer la migration en environnement de recette puis en production selon le processus habituel
2. faire une recette metier complete du parcours Prepa avec des cas reels
3. ajouter les filtres visuels manquants dans la page `Stagiaires Prepa` si l'equipe veut un pilotage plus direct
4. valider les chiffres du nouveau widget dashboard avec le metier
5. decider si un futur lot doit ajouter `date_entree_formation`
6. decider si un futur lot doit introduire un vrai modele de presence nominative par seance

## Conclusion

Le chantier doit etre mene comme une `Prepa V2` progressive, sans rupture.

La bonne strategie est:

- conserver `Prepa`
- enrichir `StagiairePrepa`
- ajouter des docstrings propres
- garder l'UI branchee sur `theme.ts`
- corriger ensuite les stats et le dashboard

On ne remplace pas brutalement l'existant.
On le fait evoluer par lots, de facon sure.
