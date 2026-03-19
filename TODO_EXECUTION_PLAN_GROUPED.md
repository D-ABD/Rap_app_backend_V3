# Plan De Reparation Regroupe

Date: 2026-03-18
Sources:
- `TECHNICAL_AUDIT.md`
- `TODO_EXECUTION_PLAN.md`

## But

Remplacer le plan initial par un plan plus operationnel, avec des lots regroupes seulement quand ce regroupement est techniquement sain.

Le critere principal n'est pas "aller plus vite sur le papier".
Le critere principal est:
- minimiser le risque de casser le backend
- reduire les allers-retours inutiles
- faire avancer ensemble les sujets qui partagent la meme source de verite

## Evaluation Des Regroupements

### Regroupements qui peuvent etre faits sans risque eleve

- `roles + permissions + scoping`
  - raison: ces sujets reposent sur la meme source de verite metier
  - benefice: evite de corriger les permissions d'un cote et de laisser un scoping divergent de l'autre
  - condition: avancer par surface API coherente et pas sur tout le projet d'un coup

- `bugs d'acces + tests de non-regression`
  - raison: une correction de securite sans test associe reste fragile
  - benefice: verrouille immediatement le comportement corrige
  - condition: inclure les tests dans le meme lot que la correction

- `contrat API + documentation de contrat`
  - raison: un changement d'enveloppe ou de payload sans doc met le front en danger
  - benefice: le front et les tests de contrat travaillent sur la meme reference
  - condition: traiter par famille d'endpoints, pas par toute l'API en une fois

- `services + signaux legacy`, mais uniquement par domaine
  - raison: les deux pieces de code decrivent aujourd'hui le meme flux metier
  - benefice: supprime les zones grises "audit-only" au bon endroit
  - condition: ne pas fusionner `candidat`, `prospection` et `appairage` dans une seule passe

- `performance listes + exports`, apres stabilisation fonctionnelle
  - raison: les listes et exports partagent souvent les memes queryset, joins et annotations
  - benefice: on mesure et optimise les acces relationnels une seule fois
  - condition: ne pas le faire avant gel du contrat API principal

### Regroupements a eviter

- `permissions + refonte serializers`
  - risque: melange securite et contrat front
  - impact: impossible d'isoler l'origine d'une regression

- `services/signaux + performance`
  - risque: un gain apparent de perf peut masquer un changement de logique metier
  - impact: difficultes de verification fonctionnelle

- `contrat API + grand nettoyage structurel`
  - risque: trop de changements visibles et invisibles en meme temps
  - impact: le front et les tests deviennent instables

- `BaseModel.save()` + migration des services metier
  - risque: impact transverse tres large
  - impact: casse potentielle sur validations, admin, serializers, jobs et signaux

## Conclusion D'Evaluation

Oui, certaines taches doivent etre regroupees.

Le meilleur regroupement n'est pas par priorite abstraite P0/P1/P2.
Le meilleur regroupement est par "source de verite commune".

Le plan initial etait correct conceptuellement, mais trop lineaire. Le nouveau plan regroupe mieux:
- la securite d'acces
- la stabilisation du contrat front
- la clarification des flux metier par domaine

Ce regroupement ne devrait pas casser le backend si on respecte trois regles:
- ne pas traiter plus d'une famille fonctionnelle a la fois
- garder les tests dans le meme lot que la correction
- ne pas toucher au contrat API et a l'architecture interne dans le meme lot

## Nouveau Plan Regroupe

## Statut Actuel

- `Lot A`: termine
- `Lot B`: termine
- `Lot C`: termine
- `Lot D`: termine
- `Lot E`: en cours

Etat au 2026-03-19:
- les correctifs de securite, de contrat API, de sources de verite metier et de performance ciblee ont ete livres
- la suite du chantier porte surtout sur la lisibilite, la documentation et le nettoyage des reliquats techniques

## Lot A - Garde-Fous D'Acces

### Perimetre

- roles
- permissions
- scoping
- actions custom sensibles
- tests de non-regression associes

### Ce qui entre dans ce lot

- finaliser la centralisation des checks de role vers `api/roles.py`
- finir la revue `staff_read` sur tous les endpoints sensibles
- verifier que `list`, `retrieve` et actions custom appliquent bien le meme perimetre
- verrouiller les modules specialises:
  - `commentaires`
  - `prospection_comment`
  - `atelier_tre`
  - `candidat`
  - `appairage_commentaires`
  - `prepa`
  - `declic`

### Pourquoi ce regroupement est sain

Ces sujets decrivent tous la meme chose:
qui peut voir quoi, et qui peut modifier quoi.

Les traiter ensemble reduit le risque de corriger un endpoint mais pas son action custom ou son detail.

### Ce qui ne doit pas entrer dans ce lot

- changement de payload
- refonte serializer
- migration services/signaux
- optimisation ORM

### Definition of done

- matrice d'acces ecrite
- tous les endpoints critiques `staff_read` sont verifies
- les checks admin/staff privilegient `api/roles.py`
- les tests d'acces critiques passent

## Lot B - Contrat API Front

### Perimetre

- enveloppes de reponse
- erreurs API
- conventions lecture/ecriture
- documentation de contrat
- tests de contrat

### Ce qui entre dans ce lot

- definir le contrat officiel:
  - succes simple
  - succes pagine
  - erreur de validation
  - erreur de permission
  - delete
- documenter les exceptions legitimes:
  - download binaire
  - CSV
  - XLSX
  - PDF
- traiter les endpoints encore heterogenes
- aligner les payloads read/write sur les ressources principales:
  - `formations`
  - `candidats`
  - `prospections`
  - `appairages`
  - `documents`
  - `users`

### Pourquoi ce regroupement est sain

Le front ne raisonne pas par "permissions", puis "serializers", puis "docs".
Le front raisonne par contrat.

Regrouper le contrat API et la doc evite les etats intermediaires incoherents.

### Ce qui ne doit pas entrer dans ce lot

- suppression de logique legacy
- gros refactor des services
- optimisation de requetes

### Definition of done

- le front peut consommer les endpoints principaux avec un parseur uniforme
- les tests de contrat verrouillent les enveloppes
- la doc reflete le comportement reel

## Lot C - Flux Metier Et Sources De Verite

### Perimetre

- services
- signaux legacy
- chemins d'ecriture
- tests metier par domaine

### Sous-lot C1 - Utilisateur / Candidat

Contenu:
- confirmer `CandidateAccountService` comme point d'entree unique
- clarifier les liaisons compte <-> candidat
- verifier les transitions stagiaire / candidat user
- reduire l'ambiguite des signaux `candidats_signals.py`

### Sous-lot C2 - Prospection

Contenu:
- confirmer `ProspectionOwnershipService`
- verifier les cas owner / formation / centre
- sortir de l'ambiguite signal legacy vs logique viewset/serializer

### Sous-lot C3 - Appairage / Placement

Contenu:
- confirmer `AppairagePlacementService`
- verifier le snapshot candidat
- clarifier le role exact des signaux `audit-only`

### Pourquoi ce regroupement est sain

Chaque sous-lot couvre un seul flux metier bout en bout.
On ne melange pas trois domaines qui ont chacun leurs effets de bord et leurs historiques.

### Ce qui ne doit pas entrer dans ce lot

- changement massif de contrat front
- optimisation globale
- nettoyage de modules legacy non lies

### Definition of done

- chaque domaine critique a une source de verite identifiee
- les signaux legacy ne restent pas charges "par habitude"
- les tests metier passent domaine par domaine

## Lot D - Performance Ciblee

### Perimetre

- listes critiques
- annotations lourdes
- exports
- mesures

### Ce qui entre dans ce lot

- prospections:
  - sous-requetes de commentaires
- candidats:
  - `Subquery` de prospections
- partenaires:
  - compteurs relationnels
- exports:
  - `formations`
  - `appairages`
  - `prospections`
  - `partenaires`

### Pourquoi ce regroupement est sain

Ces problemes partagent les memes causes:
- joins
- prefetch
- annotations
- recalculs

Les traiter ensemble est plus coherent que de "micro-optimiser" une seule vue sans mesurer les autres.

### Precondition obligatoire

Le Lot B doit etre stabilise avant.
Sinon, on risque d'optimiser un payload qui va encore changer.

### Definition of done

- les listes critiques et exports ont ete mesures
- les goulets majeurs sont documentes puis corriges

## Lot E - Dette Technique Et Nettoyage

### Perimetre

- docs trompeuses
- duplication de helpers
- modules legacy
- nettoyage structurel modere

### Ce qui entre dans ce lot

- nettoyer les docstrings transitoires
- clarifier modules actifs vs legacy
- reduire les duplications residuelles de helpers
- documenter les conventions finales du backend

### Ce qui ne doit pas entrer dans ce lot

- gros decoupage du monolithe
- refonte profonde de `BaseModel`
- changements de comportement non testes

### Definition of done

- le code raconte la meme histoire que la doc
- les zones legacy sont identifiees
- la maintenance est plus lisible

## Ce Qui Peut Etre Fait En Parallele

### Parallelisable sans risque eleve

- Lot A et documentation interne minimale des matrices d'acces
- Lot B et ecriture des tests de contrat
- Lot D et travail de mesure/profiling preparatoire, tant qu'on ne modifie pas encore les querysets

### A ne pas parallelliser

- Lot B et Lot C sur les memes ressources
- Lot C et modifications de `BaseModel.save()`
- Lot D et refonte serializer des memes endpoints

## Ordre Recommande

1. finir Lot A
2. faire Lot B
3. faire Lot C domaine par domaine
4. faire Lot D
5. faire Lot E

## Impact Sur Le Risque De Casse Backend

### Risque faible

- regrouper permissions + scoping + tests
- regrouper contrat API + doc + tests de contrat
- regrouper optimisation listes + exports apres stabilisation

### Risque moyen

- regrouper services + signaux d'un seul domaine

### Risque eleve

- regrouper plusieurs domaines metier dans une meme migration services/signaux
- toucher en meme temps au contrat API, aux services et aux optimisations ORM
- modifier `BaseModel.save()` pendant la phase de stabilisation

## Recommendation Finale

Le plan le plus sur pour ne pas casser le backend est:

1. terminer completement le Lot A
2. ensuite geler le Lot B
3. seulement apres, reprendre les flux metier en Lot C

En clair:
- oui, il faut regrouper certaines taches
- non, il ne faut pas regrouper "tout ce qui reste"
- le bon regroupement est fonctionnel et technique, pas seulement chronologique
