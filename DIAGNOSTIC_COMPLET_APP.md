# Diagnostic complet de l'application RAP_APP

Date du diagnostic: 2026-04-03

## 0. Etat actuel du chantier

Ce document de diagnostic a ete relu et mis a jour apres une phase importante de stabilisation.

Lecture conseillee:
- `termine cote code`: le sujet a ete traite en developpement et verifie autant que possible
- `en attente de recette utilisateur`: le code est en place, mais la validation terrain reste a faire
- `reste hors perimetre courant`: sujet volontairement laisse pour une phase suivante

Resume a date:
- `termine cote code`:
  - harmonisation tres large du contrat API backend
  - stabilisation de la suite `test_api_response_contract.py`
  - generalisation de l'archivage logique sur le coeur du perimetre
  - ajout d'une suppression definitive securisee separee du `DELETE` standard
  - mise en place des corbeilles visibles sur de nombreux modules principaux
  - gros realignement du frontend sur le format `success / message / data`
- `en attente de recette utilisateur`:
  - validation ecran par ecran des parcours `creer / modifier / archiver / restaurer / supprimer definitivement`
  - verification des droits reels selon les roles dans l'application
- `reste hors perimetre courant`:
  - optimisation de performance frontend
  - unification complete du client HTTP frontend
  - refactors structurels lourds
  - nettoyage complet de toute la dette transverse

## 1. Perimetre du diagnostic

Ce diagnostic couvre:
- le backend Django/DRF du repo
- le frontend React/Vite/MUI
- la coherence API/front
- les risques de lenteur, de bugs et de fragilite structurelle

Ce diagnostic a ete fait par:
- lecture statique du code
- inspection de l'arborescence
- checks locaux disponibles dans le repo

Commandes executees:
- `env/bin/python manage.py check` -> OK
- `env/bin/python manage.py makemigrations --check --dry-run` -> verification partielle selon le shell utilise
- `env/bin/python -m pytest rap_app/tests/tests_api/test_api_response_contract.py -q` -> stabilise et valide en execution reelle avec PostgreSQL disponible
- plusieurs tests Django cibles sur les modules archives/restauration/hard delete ont ete executes avec succes
- `npm run type-check`, `npm run lint`, `npm run build` -> verification partielle seulement; la validation frontend reste surtout fonctionnelle et utilisateur

## 2. Vue d'ensemble de l'application

### Stack

- Backend: Django 4.2, Django REST Framework, JWT SimpleJWT, drf-spectacular, PostgreSQL
- Frontend: React 18, Vite, MUI 6, TanStack Query 5, Axios
- Taille du code inspecte: environ 151k lignes sur les fichiers `py/ts/tsx`

### Structure constatee

- Backend tres riche metier avec beaucoup de ViewSets, serializers, services et stats
- Frontend tres volumineux avec beaucoup de pages et hooks specialises
- Forte densite sur quelques fichiers clefs:
  - `rap_app/api/viewsets/prospection_viewsets.py`
  - `rap_app/api/viewsets/candidat_viewsets.py`
  - `rap_app/api/viewsets/formations_viewsets.py`
  - `frontend_rap_app/src/routes/AppRoute.tsx`
  - `frontend_rap_app/src/pages/cerfa/CerfaForm.tsx`

Conclusion rapide:
- le projet est fonctionnel et deja bien avance
- le principal risque n'est pas un "projet casse", mais un projet devenu lourd, heterogene et difficile a faire evoluer sans regressions

## 3. Constats prioritaires

### P1 - Contrat API non uniforme entre endpoints

Etat actuel:
- `termine cote code`
- `en attente de recette utilisateur` pour les derniers ecrans front encore susceptibles d'avoir garde un ancien parsing

Impact:
- augmente fortement le couplage front/back
- multiplie les parseurs specifiques
- cree des bugs subtils lors des evolutions et ralentit tout refactoring

Indices:
- `rap_app/api/paginations.py:16` renvoie une pagination dans `success/message/data/results`
- `rap_app/api/viewsets/commentaires_viewsets.py:235` peut renvoyer soit une pagination, soit une autre enveloppe
- `frontend_rap_app/src/hooks/useFetch.ts:11`
- `frontend_rap_app/src/hooks/useProspectionComments.ts:18`
- `frontend_rap_app/src/hooks/useAppairageComments.ts:20`

Lecture initiale:
- le front devait gerer plusieurs formes de reponse pour une meme famille de donnees
- cela expliquait la presence de helpers `extractObject`, `extractArray`, `parseWrapper`, etc.

Mise a jour:
- la grande majorite des endpoints critiques a ete harmonisee
- la suite de contrat API a ete durcie et validee
- plusieurs bugs reels de doubles enveloppes paginees ont ete corriges (`commentaires`, `prospection-commentaires`, `appairage-commentaires`, `centres`, `statuts`, `typeoffres`, etc.)

Priorite:
- tres haute

### P1 - Chargement initial frontend probablement trop lourd

Etat actuel:
- `reste hors perimetre courant`

Impact:
- temps de chargement plus long
- bundle initial plus gros que necessaire
- navigation plus lourde sur mobile ou reseau lent

Indices:
- `frontend_rap_app/src/routes/AppRoute.tsx:1` importe statiquement un grand nombre de pages
- `frontend_rap_app/src/routes/AppRoute.tsx` fait plus de 700 lignes

Lecture:
- le routeur charge quasiment tout upfront
- l'absence de `lazy()` / code-splitting par route est un frein clair aux performances

Priorite:
- tres haute

### P1 - Strategie reseau frontend heterogene et partiellement contournee

Etat actuel:
- `partiellement traite`
- `reste hors perimetre courant` pour une normalisation complete

Impact:
- comportement incoherent selon les ecrans
- bugs d'auth intermittents
- duplication de logique de cancelation, parsing, erreurs et refresh token

Indices:
- client centralise: `frontend_rap_app/src/api/axios.ts:1`
- mais `frontend_rap_app/src/types/cerfa.ts:3` recree une autre instance Axios
- `frontend_rap_app/src/hooks/useStats.ts:23` utilise `fetch()` au lieu du client API central
- `frontend_rap_app/src/hooks/usePrepaObjectifs.ts:204` exporte via `fetch()`
- `frontend_rap_app/src/hooks/useDeclicObjectifs.ts:204` exporte via `fetch()`

Lecture:
- une partie du front beneficie du refresh token et des conventions reseau
- une autre partie passe encore en dehors, ce qui rend l'application plus fragile

Mise a jour:
- plusieurs ecrans et hooks ont ete realignes sur le format API standard
- mais l'unification complete autour d'un seul client/reseau reste un chantier distinct

Priorite:
- tres haute

### P1 - Gestion de donnees et de suppression pas totalement harmonisee

Etat actuel:
- `quasi termine cote code`
- `en attente de recette utilisateur`

Impact:
- risque metier si une ressource est supprimee "en dur"
- experience utilisateur incoherente selon l'entite
- difficulte a mettre en place une vraie restauration globale

Indices:
- beaucoup d'entites utilisent une logique d'archivage / `is_active`
- mais il existe encore beaucoup de `destroy/delete` et de `on_delete=models.CASCADE`
- references utiles:
  - `rap_app/models/base.py`
  - `rap_app/api/viewsets/commentaires_viewsets.py:328`
  - `rap_app/api/viewsets/prospection_viewsets.py:744`
  - `rap_app/api/viewsets/appairage_viewsets.py:420`
  - `rap_app/models/appairage.py:80`
  - `rap_app/models/commentaires.py:151`

Lecture initiale:
- l'app avait deja une culture de suppression logique
- mais elle n'etait pas encore completement normalisee sur toutes les ressources

Mise a jour:
- le `DELETE` standard archive maintenant sur une grande partie du perimetre sensible
- la restauration est exposee sur de nombreux modules principaux
- une suppression definitive securisee, separee et reservee aux profils autorises, a ete ajoutee
- plusieurs corbeilles visibles ont ete branchees cote frontend
- il reste la validation utilisateur finale et quelques ecrans secondaires a confirmer

Priorite:
- tres haute

## 4. Sources principales de lenteur

Etat global de cette section:
- `reste hors perimetre courant`
- rien n'indique ici un blocage produit immediat, mais ce sont toujours de vraies pistes d'amelioration

### 4.1 Routeur et pages geantes cote frontend

Indices:
- `frontend_rap_app/src/routes/AppRoute.tsx:1`
- `frontend_rap_app/src/pages/users/MonProfil.tsx` > 1100 lignes
- `frontend_rap_app/src/pages/cerfa/CerfaForm.tsx` > 2100 lignes

Effets probables:
- bundles lourds
- recompilation plus lente
- maintenance plus risquee

### 4.2 React Query non regle pour limiter les refetchs

Indices:
- `frontend_rap_app/src/main.tsx:33` initialise `new QueryClient()` sans options
- beaucoup de widgets dashboard exposent `refetch()` manuels

Effets probables:
- `staleTime=0` par defaut
- refetch frequents au focus/re-render/navigation
- surcharge reseau inutile sur les dashboards

### 4.3 Hooks manuels anciens et repetitifs

Indices:
- `frontend_rap_app/src/hooks/useProspectionComments.ts:114`
- `frontend_rap_app/src/hooks/useAppairageComments.ts:107`

Effets probables:
- duplication d'etat `loading/error/data`
- usage de `axios.CancelToken`, API ancienne
- risques de comportements differents entre modules tres proches

### 4.4 QuerySets possiblement trop lourds sur certaines routes

Indices:
- `rap_app/api/viewsets/formations_viewsets.py:224`
- `rap_app/api/viewsets/formations_viewsets.py:377`
- `rap_app/api/viewsets/formations_viewsets.py:725`
- `rap_app/api/viewsets/candidat_viewsets.py:338`

Lecture:
- certaines vues prefetchement beaucoup de relations
- c'est utile pour eviter du N+1, mais peut devenir couteux si applique trop tot ou trop largement
- plusieurs endpoints "liste/detail/export" semblent partager une logique de chargement riche qui merite du profiling SQL reel

### 4.5 Endpoints de filtres potentiellement chers

Indices:
- `rap_app/api/viewsets/commentaires_viewsets.py:87`

Lecture:
- `filter_options()` reconstruit plusieurs listes `distinct()` sur des sous-ensembles relies
- sur une volumetrie importante, ce type d'endpoint peut devenir lent et est souvent appele des l'ouverture des pages

## 5. Bugs probables ou zones fragiles

Etat global de cette section:
- plusieurs zones de risque identifiees ici ont ete reduites par les correctifs de stabilisation
- la section reste utile comme dette technique, mais elle ne doit plus etre lue comme un etat "tout est encore casse"

### 5.1 Middleware `threading.local()` fragile pour contexte async

Indice:
- `rap_app/middleware.py:1`

Lecture:
- stocker l'utilisateur courant dans `threading.local()` est fragile si l'app evolue vers plus d'async/ASGI
- ce n'est pas forcement casse aujourd'hui, mais c'est une dette technique connue

### 5.2 Instance Axios dupliquee pour CERFA

Indice:
- `frontend_rap_app/src/types/cerfa.ts:3`

Lecture:
- le fichier de types cree aussi une instance reseau
- c'est un melange de responsabilites
- ce contournement peut court-circuiter la gestion standard JWT/refresh/logout global

### 5.3 Sorties console et traces legacy encore presentes

Indices:
- `rap_app/static/js/formation.js:2`
- `rap_app/static/js/formation.js:42`
- `frontend_rap_app/src/pages/cerfa/CerfaPage.tsx:310`
- `frontend_rap_app/src/pages/cerfa/CerfaEditPage.tsx:68`

Lecture:
- ce n'est pas critique
- mais cela confirme des zones encore "semi-debug", souvent symptomatiques de flux non industrialises

### 5.4 Fichiers monolithiques a fort risque de regression

Indices:
- `rap_app/api/viewsets/prospection_viewsets.py` > 1100 lignes
- `rap_app/api/viewsets/candidat_viewsets.py` > 1100 lignes
- `rap_app/api/viewsets/formations_viewsets.py` ~ 960 lignes
- `frontend_rap_app/src/pages/cerfa/CerfaForm.tsx` > 2100 lignes

Lecture:
- plus un fichier est gros, plus le cout cognitif et le risque de bord augmentent
- ce sont des cibles naturelles pour bugs discrets et ralentissement d'onboarding

## 6. Points positifs a conserver

- `manage.py check` passe
- beaucoup de QuerySets utilisent deja `select_related` / `prefetch_related`
- presence de tests backend assez fournie
- presence d'une vraie logique d'archivage sur plusieurs briques
- separation backend/frontend claire
- stack moderne et coherente dans l'ensemble
- la suite de contrat API a ete renforcee puis stabilisee
- les modules critiques de suppression/restauration sont maintenant bien plus securises qu'au moment du diagnostic initial

## 7. Limites de verification

- une partie des premieres verifications avait ete faite sous contraintes sandbox
- depuis, plusieurs validations reelles avec PostgreSQL ont ete executees sur les tests API et des tests cibles
- en revanche, il reste des limites sur:
  - la recette utilisateur globale
  - la verification manuelle complete de tous les ecrans
  - une validation frontend transverse exhaustive `type-check/lint/build` suffisamment exploitable

Conclusion:
- le diagnostic reste solide sur l'architecture et la dette technique
- mais plusieurs points critiques ont depuis ete traites
- il doit maintenant etre lu comme un document de priorisation, pas comme une simple liste de problemes encore ouverts

## 8. Priorisation recommandee

### Sprint 1 - Stabilisation

1. Uniformiser le contrat de reponse API -> `termine cote code`
2. Centraliser tous les appels front sur un seul client HTTP -> `reste hors perimetre courant`
3. Lister toutes les suppressions reelles et definir la politique "archiver vs supprimer" -> `termine cote code`
4. Ajouter une corbeille ou une restauration pour les donnees sensibles -> `largement termine cote code`
5. Finaliser la recette utilisateur sur les ecrans critiques -> `en attente`

### Sprint 2 - Performance

1. Introduire du lazy-loading par route
2. Regler `QueryClient` avec `staleTime`, `gcTime` et politique de refetch adaptee
3. Refactorer les hooks manuels vers TanStack Query
4. Profiler les endpoints lourds: formations, candidats, commentaires, stats, exports

### Sprint 3 - Maintenabilite

1. Decouper les gros viewsets
2. Decouper les gros formulaires/pages React
3. Sortir la logique CERFA reseau des fichiers de types
4. Remplacer `threading.local()` si un contexte async devient important

## 9. Actions concretes que je recommande ensuite

Si on veut avancer de facon pragmatique, je recommande cet ordre:

1. Recette utilisateur sur les modules critiques deja stabilises
2. Corrections ciblees issues de cette recette
3. Uniformisation du client API frontend
4. Refactor du routeur pour code-splitting
5. Profiling des endpoints les plus appeles
6. Refactor progressif des fichiers geants

## 10. Verdict global

Etat global:
- application fonctionnelle, riche, deja bien structuree sur plusieurs points
- le socle critique a ete fortement stabilise depuis le diagnostic initial
- mais le projet a franchi un seuil de complexite ou l'heterogeneite continue de couter cher

Risque principal a court terme:
- regressions residuelles sur certains ecrans secondaires ou cas metier de recette

Risque principal metier:
- incoherences residuelles detectables surtout pendant la recette utilisateur, plus que dans le coeur du backend

Risque principal performance:
- frontend trop charge au demarrage + politique de fetch/cache insuffisamment harmonisee
