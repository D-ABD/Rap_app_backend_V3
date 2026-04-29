# Plan de mise en conformite Prepa - lots securises

Date: 2026-04-28

## Etat d'avancement au 2026-04-28

- `Lot 0` : fait
- `Lot 1` : fait
- `Lot 2` : fait
- `Lot 3` : fait
- `Lot 4` : fait
- `Lot 5` : fait
- `Lot 6` : fait
- `Lot 7` : fait
- `Lot 8` : fait
- `Lot 9` : a finaliser avant commit / push

## Reste a faire concret

- lancer les derniers tests cibles backend sur le perimetre Prepa ;
- faire la recette fonctionnelle complete `IC -> atelier 1 -> parcours -> dashboard` ;
- verifier une derniere fois les exports `liste / presence / emargement` sur un cas reel ;
- preparer ensuite le commit propre et le push.

## Objectif

Faire evoluer l'application pour que le module Prepa reponde aux besoins metier, tout en minimisant le risque sur un projet en production.

La cible est la suivante:

- `Information collective` simple, non nominative, uniquement basee sur des chiffres ;
- `Atelier Prepa` comme vraie seance nominative ;
- `StagiairePrepa` comme pivot du parcours individuel ;
- `ObjectifPrepa` alimente principalement par `atelier_1` ;
- `Dashboard Prepa` structure en blocs clairs et coherents ;
- respect strict du scope et du perimetre utilisateur.

## Regles de securite

- ne supprimer aucun champ existant ;
- ne renommer aucun champ existant ;
- ne modifier aucune route existante ;
- ne casser aucun serializer existant ;
- ne casser aucun hook frontend existant ;
- ne casser aucune page frontend existante ;
- ne remplacer brutalement aucun calcul historique ;
- n'utiliser que des migrations non destructives ;
- deployer uniquement des lots testables et reversibles ;
- ne passer au lot suivant qu'apres verification du lot courant.

## Strategie generale

Le plan doit etre execute du moins risque au plus sensible.

Ordre recommande:

1. clarifier et documenter ;
2. corriger les comportements trompeurs sans changer la modelisation profonde ;
3. simplifier l'IC ;
4. fiabiliser l'atelier ;
5. renforcer le parcours individuel ;
6. recalibrer les objectifs ;
7. refondre le dashboard ;
8. terminer par les exports et la recette complete.

## Lots securises

## Lot 0 - Gel fonctionnel et baseline

### Niveau de risque

Tres faible.

### Objectif

Poser une baseline avant toute modification supplementaire.

### A faire

- figer le document metier de reference ;
- lister les ecrans, endpoints et stats Prepa existants ;
- noter les comportements actuels, meme s'ils sont imparfaits ;
- identifier les flux deja modifies dans le code ;
- verifier l'etat des tests cibles existants ;
- identifier les erreurs frontend globales hors Prepa pour ne pas les melanger avec ce chantier.

### Garde-fous

- aucun changement metier ;
- aucune migration ;
- aucune rupture UI.

### Verification

- baseline documentee ;
- liste des flux critiques connue ;
- plan de recette initial etabli.

### Condition de passage

- le perimetre du chantier est compris et partage.

## Lot 1 - Clarification des usages trompeurs

### Niveau de risque

Faible.

### Objectif

Corriger d'abord les mauvais liens et les mauvaises lectures de donnees sans changer la structure profonde.

### A faire

- corriger tous les usages atelier qui relisent les personnes via `prepa_origine` au lieu de la participation a la seance ;
- corriger les liens de navigation atelier vers les bons participants ;
- corriger les modales detail atelier si elles montrent une mauvaise source ;
- corriger les exports atelier si le filtre utilise la mauvaise cle ;
- reserver `prepa_origine` a la tracabilite du point d'entree dans le parcours.

### Garde-fous

- pas de suppression de champ ;
- pas de refactor massif ;
- pas de changement de contrat API existant autre qu'ajouts compatibles.

### Verification

- un participant ajoute a un atelier reste visible apres sauvegarde ;
- les boutons `voir les participants`, `presence`, `emargement` utilisent la bonne logique ;
- aucun parcours atelier ne depend encore a tort de `prepa_origine`.

### Condition de passage

- plus aucune disparition apparente de participants sur les ateliers.

## Lot 2 - Information collective securisee

### Niveau de risque

Faible a modere.

### Objectif

Faire de l'IC un module simple de chiffres uniquement.

### A faire

- retirer toute logique de stagiaire nominatif du formulaire IC ;
- ignorer ou bloquer les participations nominatives sur les endpoints IC ;
- verifier que les stats IC ne lisent que les compteurs IC ;
- garder les champs:
  - places ouvertes ;
  - prescriptions ;
  - presents IC ;
  - absents IC ;
  - adhesions ;
  - taux associes.

### Garde-fous

- l'IC doit continuer a fonctionner avec l'existant ;
- aucun changement sur le flux atelier dans ce lot ;
- aucune suppression de donnees actuelles.

### Verification

- creation et edition d'une IC sans stagiaire ;
- stats IC stables ;
- aucun ecran IC n'affiche de logique nominative.

### Condition de passage

- l'IC est totalement distincte du suivi atelier.

## Lot 3 - Atelier Prepa fiable

### Niveau de risque

Modere.

### Objectif

Fiabiliser completement la seance atelier sans casser la souplesse de saisie.

### A faire

- faire de `PrepaStagiaireParticipation` la source de verite de la participation nominative ;
- conserver les compteurs `hors liste` ;
- recalculer automatiquement:
  - inscrits ;
  - presents ;
  - absents ;
  - taux de presence ;
- garantir le blocage des doublons sur une seance ;
- garantir le blocage d'un meme stagiaire actif sur plusieurs ateliers en meme temps ;
- clarifier dans l'UI:
  - calcul automatique ;
  - hors liste ;
  - total final.

### Garde-fous

- conserver les compteurs historiques existants ;
- ne pas supprimer les champs actuels ;
- ne pas imposer du 100 pourcent nominatif si l'utilisateur a besoin de souplesse.

### Verification

- creation d'un atelier 1 ;
- ajout de stagiaires ;
- reouverture de l'atelier ;
- verification des participants ;
- verification des compteurs ;
- verification du comportement avec hors liste.

### Condition de passage

- flux atelier stable et fiable sur creation, edition et relecture.

## Lot 4 - Centre et scope

### Niveau de risque

Faible.

### Objectif

Appliquer partout la bonne logique de centre et de perimetre.

### A faire

- preselectionner le centre si l'utilisateur n'a qu'un centre dans son scope ;
- obliger l'admin a choisir explicitement ;
- reverifier le scope centre et departement sur:
  - listes ;
  - details ;
  - stats ;
  - exports ;
  - formulaires.

### Garde-fous

- ne pas changer la logique de permission globale ;
- ne pas elargir accidentellement le scope d'un utilisateur.

### Verification

- test avec utilisateur mono-centre ;
- test avec admin ;
- test avec scope departement si present.

### Condition de passage

- aucun ecran Prepa ne permet de sortir du perimetre autorise.

## Lot 5 - StagiairePrepa recentre sur le parcours

### Niveau de risque

Modere.

### Objectif

Faire de `StagiairePrepa` la fiche centrale du pilotage individuel.

### A faire

- stabiliser les proprietes parcours:
  - atelier en cours ;
  - prochain atelier attendu ;
  - attente d'entree ;
  - attente atelier suivant ;
  - abandon ;
  - orientation AFPA ;
- fiabiliser les filtres et la synthese parcours ;
- clarifier l'UI pour afficher ces informations sans ambiguite.

### Garde-fous

- ne pas casser le CRUD actuel ;
- ne pas supprimer `prepa_origine` de la base ;
- ne pas forcer un changement brutal de workflow utilisateur.

### Verification

- lecture correcte des statuts ;
- filtres coherents ;
- indicateurs individuels justes.

### Condition de passage

- pilotage parcours exploitable metierement.

## Lot 6 - Objectifs atelier 1

### Niveau de risque

Modere.

### Objectif

Rebrancher clairement les objectifs annuels sur `atelier_1`.

### A faire

- exposer deux lectures:
  - `engagee` sur inscrits `atelier_1` ;
  - `reelle` sur presents `atelier_1` ;
- garder `adhesions IC` comme KPI distinct ;
- corriger la table objectifs et le detail centre/departement ;
- corriger les calculs aggregates lies a l'objectif.

### Garde-fous

- conserver les anciens champs et contrats utiles ;
- ne pas casser les pages qui consomment encore des anciens noms ;
- ajouter les nouveaux indicateurs avant de remplacer l'affichage.

### Verification

- comparaison objectif / A1 inscrits / A1 presents ;
- comparaison reste engage / reste reel ;
- verification qu'adhesions n'est plus confondu avec realisation atelier.

### Condition de passage

- objectifs lisibles et defendables metierement.

## Lot 7 - Dashboard Prepa

### Niveau de risque

Modere a eleve.

### Objectif

Refondre le dashboard seulement une fois les donnees fiabilisees.

### A faire

- separer visuellement et fonctionnellement:
  - bloc IC ;
  - bloc Atelier / Objectif ;
  - bloc Parcours individuels ;
- brancher chaque bloc sur la bonne source ;
- verifier les filtres centre / departement / annee.

### Garde-fous

- ne pas faire du dashboard la source de verite ;
- ne pas modifier les calculs au meme moment que l'UI si le backend n'est pas stabilise ;
- conserver les composants existants si possible.

### Verification

- coherence dashboard vs listes ;
- coherence dashboard vs objectifs ;
- coherence dashboard vs synthese parcours.

### Condition de passage

- dashboard coherent avec les usages reels.

## Lot 8 - Exports et finitions

### Niveau de risque

Faible a modere.

### Objectif

Aligner les derniers details fonctionnels.

### A faire

- corriger tous les exports Prepa ;
- uniformiser les libelles ;
- clarifier les modales detail ;
- retirer les derniers textes ambigus ;
- fiabiliser les parcours de consultation.

### Garde-fous

- ne pas toucher a la logique metier sans necessite ;
- viser surtout la coherence de lecture.

### Verification

- export presence ;
- export emargement ;
- export listes stagiaires ;
- coherence detail atelier et detail stagiaire.

### Condition de passage

- experience utilisateur claire de bout en bout.

## Lot 9 - Tests et recette finale

### Niveau de risque

Faible si les lots precedents sont passes.

### Objectif

Valider la mise en conformite avant commit et deploiement.

### Tests backend

- serializers IC ;
- serializers atelier ;
- participations nominatives ;
- blocage des doublons ;
- blocage multi-ateliers actifs ;
- objectifs `atelier_1` ;
- resume stats ;
- grouped stats ;
- filtres `prepa_participation` et `prepa_origine`.

### Tests frontend

- IC simple ;
- atelier avec participants ;
- persistance apres sauvegarde ;
- table ateliers ;
- detail atelier ;
- dashboard Prepa.

### Recette metier minimum

1. creation d'une IC simple ;
2. creation d'un atelier 1 ;
3. ajout de participants ;
4. reouverture de l'atelier ;
5. verification des compteurs ;
6. verification des objectifs ;
7. verification du dashboard ;
8. verification par role et par centre.

### Condition de cloture

Le chantier est termine quand:

- l'IC est purement chiffrée ;
- les ateliers sont nominativement fiables ;
- `StagiairePrepa` pilote vraiment le parcours ;
- les objectifs sont lisibles sur `atelier_1` ;
- le dashboard est coherent ;
- le scope est respecte partout ;
- les tests cibles passent ;
- la recette metier confirme les chiffres.

## Lots prioritaires a executer en premier

Si l'on veut avancer avec le moins de risque possible, il faut commencer par:

1. `Lot 1 - Clarification des usages trompeurs`
2. `Lot 2 - Information collective securisee`
3. `Lot 3 - Atelier Prepa fiable`

Ce n'est qu'apres ces trois lots qu'il est prudent de passer:

4. au parcours individuel ;
5. aux objectifs ;
6. puis au dashboard.
