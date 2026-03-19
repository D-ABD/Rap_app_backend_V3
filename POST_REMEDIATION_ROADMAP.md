# Post-Remediation Roadmap

Date: 2026-03-19

## Etat Actuel

- les corrections backend prevues par l'audit ont ete traitees
- les lots `A`, `B`, `C`, `D` et `E` sont termines
- les tests sont revenus verts dans l'environnement projet

Conclusion:
- le backend n'est plus dans une phase de reparation
- la suite releve d'une phase d'amelioration, de consolidation long terme et de preparation produit

## Objectif De Ce Document

Donner un plan sur pour la suite, sans reouvrir inutilement des chantiers de correction deja clos.

Le principe directeur est simple:
- ne plus melanger "maintenance corrective" et "evolution"
- conserver la stabilite acquise
- traiter les prochaines etapes par valeur produit et par risque

## Regle De Gouvernance

Pour toute suite de chantier:

1. ne pas reouvrir un lot `A/B/C/D/E` sauf bug prouve
2. considerer le backend comme base stable
3. traiter les sujets restants comme des lots d'amelioration separes
4. garder des tests dans chaque lot evolutif
5. eviter de lancer une refonte profonde sans objectif produit clair

## Plan Sur Recommande

## Lot F - Stabilisation Produit

### But

Transformer le backend "repare" en backend "pret a etre consomme sereinement" par le front et par l'equipe produit.

### Contenu

- figer les conventions d'API utiles au front
- lister les endpoints cles pour React / Expo
- documenter les payloads utiles
- documenter les erreurs attendues
- clarifier les cas particuliers:
  - pagination
  - exports
  - uploads
  - endpoints meta / filters / choices

### Livrables

- documentation d'integration front
- liste des endpoints prioritaires
- checklist d'integration front

### Risque

Faible, si on reste sur de la documentation et du test de contrat.

## Lot G - Nouvelles Features

### But

Reprendre un cycle fonctionnel normal, oriente valeur metier.

### Contenu

- nouvelles actions metier
- nouveaux endpoints
- nouvelles vues de stats
- nouveaux workflows admin / staff / candidat

### Regle

Chaque feature doit:
- expliciter son contrat API
- inclure ses tests
- respecter les conventions stabilisees du backend

### Risque

Moyen, mais controle si les nouvelles features sont isolees par domaine.

## Lot H - Refonte Plus Ambitieuse

### But

Traiter les sujets d'architecture qui ne sont pas necessaires pour la stabilite immediate, mais qui peuvent apporter un gain de long terme.

### Exemples

- decoupage plus strict des couches
- reduction du poids de certains viewsets tres denses
- reorganisation de certains modules historiques
- clarification plus radicale des services et des points d'entree d'ecriture

### Regle

Ne lancer ce lot que si:
- il existe une motivation claire
- le gain attendu est formule
- la refonte est decoupee en sous-lots testables

### Risque

Eleve si engage trop tot ou de facon trop large.

## Lot I - Optimisation Fine

### But

Aller au-dela des optimisations deja livrees dans le `Lot D`, uniquement si une mesure ou un usage reel le justifie.

### Contenu

- profiling plus fin
- mesures SQL reelles
- stress sur exports lourds
- optimisation de stats avancees
- optimisation memoire sur listes tres chargees

### Regle

Pas d'optimisation speculative.

On n'ouvre ce lot que si:
- une lenteur est mesuree
- un endpoint est critique
- un export pose un probleme reel

### Risque

Moyen, car toute optimisation plus fine peut reintroduire de la complexite inutile.

## Lot J - Documentation Produit Et Front

### But

Rendre le backend facile a consommer et a faire evoluer sans relecture permanente du code.

### Contenu

- documentation des parcours metier
- mapping role -> droits -> endpoints
- documentation des ressources principales
- exemples de payloads front
- cas d'erreurs standards
- guide d'onboarding dev front

### Livrables

- guide d'integration front
- guide backend pour futurs contributeurs
- checklist de regression avant mise en production

### Risque

Faible.

## Ordre Recommande

Ordre le plus sur et le plus rentable:

1. `Lot F` stabilisation produit
2. `Lot J` documentation produit / front
3. `Lot G` nouvelles features
4. `Lot I` optimisation fine, seulement si necessaire
5. `Lot H` refonte ambitieuse, seulement si une vraie raison apparait

## Ce Qu'Il Ne Faut Pas Faire Ensuite

- relancer une "grande phase de correction backend" sans signal reel
- refaire de la perf sans mesure
- engager une refonte architecturale juste parce que le code a ete touche
- casser les conventions d'API qui viennent d'etre stabilisees

## Definition De Reussite

La suite est bien pilotee si:

- le backend reste stable
- le front peut avancer sans ambiguites
- les nouvelles features n'introduisent pas de dette immediate
- les optimisations futures sont guidees par des mesures reelles
- les refontes ambitieuses sont rares, justifiees et maitrisees

## Resume Executif

Le backend est repare.

La prochaine etape n'est plus "corriger".
La prochaine etape est:
- documenter
- construire
- mesurer si besoin
- refondre seulement si cela devient utile
