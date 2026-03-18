# Plan De Reparation

Date: 2026-03-18
Source: `TECHNICAL_AUDIT.md`

## Objectif

Amener le backend a un niveau "production-ready" realiste pour un front React/Expo, en traitant d'abord les risques de securite et les incoherences de contrat API, puis en consolidant l'architecture et les performances.

## Strategie

Ordre d'execution recommande:
1. securite et permissions
2. correction des bugs fonctionnels bloquants
3. stabilisation du contrat API pour le front
4. clarification des flux metier services vs signaux
5. optimisation performance
6. nettoyage structurel et maintenance

Principe directeur:
- ne pas lancer de gros refactoring avant d'avoir ferme les failles d'acces
- faire des corrections courtes, testables, et deployables par lot
- garder une trace explicite des conventions choisies pour les roles, permissions et reponses API

## Phase 0 - Preparation

Objectif:
- remettre le projet dans un etat ou les corrections peuvent etre verifiees proprement

Actions:
- installer `pytest` et les dependances de test du projet
- verifier que la base de test et les variables d'environnement sont reproductibles
- lancer au minimum une collecte des tests
- identifier les tests deja existants par domaine:
  - permissions
  - API contract
  - services
  - signals

Livrables:
- environnement de test executable
- etat initial des tests documente

Definition of done:
- `python -m pytest --collect-only rap_app/tests -q` fonctionne
- au moins un run cible par domaine critique peut etre execute

## Phase 1 - P0 Securite

Objectif:
- fermer les failles d'acces les plus claires avant tout autre travail

### Lot 1.1 - Verrouiller `PartenaireViewSet`

Probleme cible:
- creation ouverte a tout utilisateur authentifie
- `staff_read` trop large en ecriture

Actions:
- remplacer la permission locale permissive par une politique alignee sur les roles metier reels
- distinguer clairement:
  - lecture staff/admin
  - lecture eventuelle candidat si voulue
  - ecriture reservee a staff/admin autorises
- verifier create, update, partial_update, destroy, actions custom

Tests a ajouter ou durcir:
- candidat authentifie ne peut pas creer un partenaire
- `staff_read` ne peut pas modifier ni supprimer
- `staff` peut lire et ecrire dans son perimetre
- admin/superadmin conservent les droits attendus

Definition of done:
- plus aucun chemin `POST/PUT/PATCH/DELETE` non justifie pour `partenaires`

### Lot 1.2 - Revalider tous les droits `staff_read`

Probleme cible:
- risque de fuite de droits par duplication des permissions

Actions:
- auditer tous les viewsets CRUD
- lister explicitement la matrice d'acces par role:
  - superadmin
  - admin
  - staff
  - staff_read
  - prepa_staff
  - declic_staff
  - candidat/stagiaire
- aligner les endpoints sur cette matrice

Definition of done:
- matrice de droits ecrite
- aucun endpoint sensible ne depend uniquement de `is_staff`

### Lot 1.3 - Normaliser la notion de role privilegie

Probleme cible:
- melange `role`, `is_staff`, `is_superuser`, `is_admin()`

Actions:
- choisir `api/roles.py` comme source de verite unique
- remplacer les controles disperses dans les viewsets par les helpers centralises
- corriger en priorite:
  - `CustomUserViewSet.reactivate`
  - permissions locales
  - scopes locaux

Definition of done:
- les decisions d'acces reposent majoritairement sur les helpers `roles.py`

## Phase 2 - P1 Bugs Fonctionnels

Objectif:
- corriger les comportements faux ou incoherents qui peuvent casser l'usage applicatif

### Lot 2.1 - Corriger `CustomUserViewSet.reactivate`

Probleme cible:
- queryset filtre `is_active=True`
- l'action ne peut pas recharger un utilisateur inactif
- permission `IsAdminUser` pas alignee sur les roles metier

Actions:
- corriger le queryset ou la resolution d'objet pour la reactivation
- aligner la permission sur la politique metier
- ajouter des tests de reactivation admin et refus non-admin

Definition of done:
- la reactivation fonctionne reellement sur un compte desactive

### Lot 2.2 - Valider les chemins critiques hors service

Probleme cible:
- les signaux "audit-only" detectent des bypass mais ne corrigent plus rien

Actions:
- identifier les points d'entree autorises par domaine:
  - utilisateur/candidat
  - prospection
  - appairage
- verifier qu'aucun endpoint principal n'ecrit en contournant les services cibles
- si un bypass existe, le corriger avant la phase de nettoyage

Definition of done:
- tous les flux metier sensibles passent par un point d'entree explicite et connu

## Phase 3 - P1 Contrat API Front

Objectif:
- rendre l'API previsible pour un client React/Expo

### Lot 3.1 - Uniformiser les reponses JSON

Probleme cible:
- enveloppes heterogenes selon les endpoints

Decision a prendre:
- definir un contrat officiel pour:
  - success simple
  - success pagine
  - erreur de validation
  - erreur de permission
  - delete
  - actions custom

Actions:
- recenser les endpoints hors contrat
- prioriser:
  - `DocumentViewSet`
  - `AppairageViewSet`
  - `PartenaireViewSet`
  - `MeAPIView`
  - endpoints de recherche et meta
- documenter les exceptions inevitables:
  - CSV
  - XLSX
  - PDF
  - downloads de fichiers

Definition of done:
- le front n'a plus besoin d'un parseur different par endpoint CRUD

### Lot 3.2 - Stabiliser les conventions de payload

Probleme cible:
- coexistence d'ids, objets imbriques et champs derives sans convention unique

Actions:
- fixer des conventions simples:
  - ecriture par ids
  - lecture detaillee avec objets imbriques stables
  - champs calcules suffixes ou nommes explicitement
- cibler en priorite:
  - formations
  - candidats
  - prospections
  - appairages
  - utilisateurs

Definition of done:
- les schemas de lecture/ecriture sont lisibles et repetables par domaine

## Phase 4 - P1 Consolidation Services vs Signaux

Objectif:
- sortir du mode transitoire et clarifier la source de verite metier

### Lot 4.1 - Candidat / Utilisateur

Actions:
- decider si `CandidateAccountService` devient l'unique orchestrateur
- retirer ou neutraliser clairement les signaux legacy si le service est definitif
- verifier les effets attendus:
  - liaison compte <-> candidat
  - promotion stagiaire
  - reconciliation email

### Lot 4.2 - Prospection ownership

Actions:
- confirmer que `ProspectionOwnershipService` est bien l'unique source de verite
- supprimer l'ambiguite entre logique viewset, serializer et signal legacy

### Lot 4.3 - Placement appairage

Actions:
- confirmer que `AppairagePlacementService` est bien la seule voie supportee
- verifier que les mises a jour de snapshot candidat sont centralisees

Definition of done:
- plus de logique legacy "audit-only" active sans justification claire

## Phase 5 - P2 Performance

Objectif:
- traiter les points couteux avant qu'ils ne deviennent un probleme de production

### Lot 5.1 - Prospections

Actions:
- profiler la liste des prospections
- mesurer le cout des sous-requetes sur dernier commentaire
- verifier indexes et plans d'execution utiles

### Lot 5.2 - Candidats

Actions:
- mesurer le cout de `nb_prospections_calc`
- verifier les jointures et annotations du listing

### Lot 5.3 - Partenaires

Actions:
- mesurer le cout des compteurs relationnels
- verifier si certaines stats doivent sortir du queryset principal

### Lot 5.4 - Exports

Actions:
- auditer les exports XLSX/CSV/PDF les plus lourds
- limiter les acces relationnels par ligne
- deplacer si necessaire la logique de preparation de donnees hors des viewsets

Definition of done:
- les endpoints de liste critiques et exports ont ete mesures et les goulets majeurs traites

## Phase 6 - P2 Structure et Dette

Objectif:
- reduire le bruit et le cout de maintenance

Actions:
- cartographier les modules actifs vs legacy:
  - `vae`
  - `jury`
  - anciennes vues HTML non prioritaires
- nettoyer les docstrings trompeuses ou devenues transitoires
- reduire la duplication des helpers de role/scoping
- revisiter `BaseModel.save()` et les invariants de validation modele

Definition of done:
- la base de code est plus lisible et les conventions sont explicites

## Phase 7 - P3 Industrialisation

Objectif:
- rendre les regressions moins probables

Actions:
- ajouter des tests de contrat API
- ajouter des tests de permission par matrice de role
- ajouter des tests de flux metier sur services
- ajouter des tests de non-regression sur les endpoints critiques front
- documenter les conventions backend pour les prochains developpements

Definition of done:
- chaque regression importante de l'audit est couverte par un test cible

## Priorisation Sprint Par Sprint

### Sprint 1

But:
- fermer les failles critiques et remettre les tests en etat

Contenu:
- Phase 0
- Lot 1.1
- Lot 1.2
- Lot 2.1

### Sprint 2

But:
- stabiliser la securite et le contrat API sur les domaines les plus visibles

Contenu:
- Lot 1.3
- Lot 3.1
- Lot 3.2

### Sprint 3

But:
- clarifier les flux metier transitoires

Contenu:
- Phase 4 complete

### Sprint 4

But:
- reduire le cout runtime sur les listes et exports

Contenu:
- Phase 5 complete

### Sprint 5

But:
- nettoyer la dette et renforcer l'industrialisation

Contenu:
- Phase 6
- Phase 7

## Backlog d'Execution Court

Ordre strict recommande:
1. remettre `pytest` en etat
2. corriger `PartenaireViewSet`
3. ecrire les tests de permissions `staff_read`
4. corriger `CustomUserViewSet.reactivate`
5. fixer la convention officielle de reponse API
6. aligner les endpoints les plus critiques sur cette convention
7. terminer la migration services vs signaux
8. profiler prospections, candidats, partenaires

## Risques De Projet

- vouloir refondre l'architecture trop tot
- melanger corrections de securite et gros refactoring dans le meme lot
- corriger les endpoints sans fixer d'abord une convention officielle
- laisser la migration services/signaux dans un etat ambigu

## Recommandation Finale

Le bon plan n'est pas de "tout refaire". Le bon plan est:
- verrouiller les droits
- corriger les bugs fonctionnels clairs
- geler un contrat API propre pour le front
- seulement ensuite rationaliser l'architecture interne

Si tu veux, je peux maintenant te produire la suite la plus utile:
1. un `TODO.md` ultra court en mode checklist terrain
2. un plan sprint par sprint avec estimation de charge
3. l'execution directe du Sprint 1 dans le code
