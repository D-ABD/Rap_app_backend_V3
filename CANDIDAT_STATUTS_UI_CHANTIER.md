# Chantier Statuts Candidat UI

## Objectif

Poser une lecture metier claire des statuts candidat avant de reprendre le
frontend.

Le but est :

- d'eviter les doublons UI entre `admissible`, `parcours_phase` et les autres
  indicateurs
- d'afficher aux equipes un statut simple et compréhensible
- de ne pas casser le backend existant
- de garder le backend actuel comme source de verite

## Constat Actuel

Le backend distingue aujourd'hui plusieurs notions :

- `admissible` : booleen de decision apres entretien
- `inscrit_gespers` : booleen administratif
- `parcours_phase` / `parcours_phase_calculee` : phase metier globale
- `abandon`, `en formation` : etapes deja bien structurees

Le frontend affiche actuellement des elements qui se recouvrent partiellement :

- `Candidat admissible`
- `Admissible`

Ces elements ne sont pas strictement equivalents cote backend.

## Regle Metier Retenue

Le parcours cible souhaite est :

1. `Candidat`
2. `Candidat admissible` ou `Candidat non admissible`
3. `En accompagnement TRE`
4. `En appairage`
5. `Inscrit GESPERS`
6. `En formation`
7. `Abandon`

## Regles De Gestion

### Candidat / non admissible

- `Candidat` s'affiche si le dossier n'a pas encore ete traite
- `Candidat non admissible` peut s'afficher si une decision explicite a ete
  prise
- l'absence de traitement ne doit pas etre confondue avec une non-admissibilite

### Accompagnement TRE

- `En accompagnement TRE` doit etre manuel
- on ne le deduit pas automatiquement du simple historique d'ateliers TRE

### Appairage

- `En appairage` doit etre manuel
- on ne le deduit pas automatiquement du simple fait d'avoir au moins un
  appairage dans l'historique

### GESPERS, formation, abandon

- `Inscrit GESPERS` devient une vraie etape metier
- c'est la derniere etape avant l'entree en formation
- `En formation` reste structure
- `Abandon` reste structure

## Principe Technique Retenu

Pour l'instant :

- ne pas forcer une egalite artificielle entre `admissible` et
  `Candidat admissible`
- ne pas casser les champs backend existants
- construire plus tard un statut UI derive, priorise et lisible

Donc :

- backend actuel conserve
- front a clarifier
- eventuels ajustements backend a faire seulement si necessaire apres cadrage

## Priorites Avant Implementation

1. figer le vocabulaire UI final
2. decider comment stocker ou piloter les statuts manuels
3. definir la priorite entre statuts automatiques et manuels
4. seulement ensuite reprendre la table candidat, les filtres et la modale

## Point D'Attention

Le statut UI futur devra etre :

- clair pour les equipes
- coherent avec les regles metier
- compatible avec le backend actuel
- suffisamment propre pour etre maintenu facilement dans 1 ou 2 ans
