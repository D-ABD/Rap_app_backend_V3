# Plan De Refonte Progressive Du Frontend

## Situation Actuelle

Le frontend actif dans [frontend_rap_app](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app) repart maintenant de l'ancien front comme base locale de travail.

Le backend actuel reste la source de verite.

Donc la strategie n'est plus :

- repartir de zero strictement

mais :

- reprendre l'ancien front comme base locale
- le remettre a niveau progressivement
- corriger module par module jusqu'a alignement complet avec le backend actuel

---

## Regle Directrice

Pour chaque module :

1. verifier le backend actuel
2. identifier ce qui est obsolete dans l'ancien front
3. corriger les types
4. corriger les hooks
5. corriger les composants et pages
6. valider les erreurs et contrats API

Donc :

- les pages anciennes peuvent rester comme base visuelle
- mais les contrats, hooks, types et actions doivent etre revalides

Regles de qualite a respecter pendant toute la refonte :

- toute erreur visible dans l'UI doit afficher un message clair, comprehensible et oriente utilisateur
- les messages d'erreur doivent exploiter le contrat backend `message / errors / error_code`
- le code doit etre nettoye au fil de l'eau, pas seulement "fonctionnel"
- le code doit rester lisible, structure et documente pour pouvoir etre repris et modifie facilement dans 1 an ou 2
- on privilegie les corrections durables plutot que les contournements rapides difficiles a maintenir
- chaque ecran repris doit rester responsive et utilisable sur desktop comme sur mobile

---

## Priorites

## 1. Socle critique

- auth
- session
- refresh token
- `me`
- `roles`
- guards
- client API unique
- gestion uniforme des erreurs

Etat courant :

- bloc auth / api / `me` / `roles` / guards deja realigne sur le backend actuel
- proxy dev et base API locales deja remis en place
- normalisation initiale des erreurs backend deja branchee dans le front actif
- dependances frontend assainies via `npm audit fix`
- reliquat `quill` nettoye sans casser le front
- build production frontend validee

## 2. Modules les plus sensibles au backend actuel

- candidats
- lifecycle candidat
- bulk actions candidats
- RGPD candidat
- error handling front-ready

Etat courant :

- module `candidats` deja entame
- types et meta candidats deja etendus pour `parcours_phase`, `phase_contract` et RGPD
- creation candidat deja revalidee avec les nouveaux champs RGPD obligatoires du backend
- affichage UI des phases candidat deja simplifie puis realigne sur les statuts metier backend
- actions lifecycle candidat deja branchees dans l'UI
- actions bulk candidats deja branchees dans l'UI
- compte candidat deja realigne avec le backend pour conserver le role `candidatuser`
  jusqu'a l'entree en formation
- statuts candidat backend/frontend maintenant realignes avec :
  - flags manuels cumulables `admissible`, `inscrit_gespers`, `en_accompagnement_tre`, `en_appairage`
  - transitions structurees `en formation`, `sortie / fin de formation`, `abandon`
  - confirmations et messages UI clairs dans la modale candidat
- navigation rapide depuis candidats vers appairages et prospections maintenant branchee
- dashboards candidats / formations deja partiellement realignes sur les nouveaux statuts metier
- module `formations` maintenant reellement avance avec :
  - types / hooks / pages principales remises a niveau
  - creation / edition
  - detail modal et detail page
  - messages d'erreur plus clairs
  - navigation front plus propre
  - liens rapides vers candidats, inscrits, prospections, appairages, partenaires et evenements
- module `evenements` maintenant branche comme vrai module front avec :
  - routes dediees
  - liste / detail / creation / edition
  - integration dans navbar et sidebar
  - pre-remplissage et conservation fiables de la formation
- stats `prospections` maintenant enrichies pour mieux refleter :
  - les prospections avec ou sans candidat
  - les prospections avec ou sans formation
- stats `evenements` maintenant branchees comme vrai module dashboard avec :
  - KPI globaux
  - repartition par type et statut temporel
  - tableaux groupes par centre / formation / type / statut
- prochaine cible : poursuivre l'alignement des modules CRM autour de formations

## 3. Modules metier principaux

- formations
- prospections
- appairages
- partenaires
- documents
- commentaires
- cvtheque

## 4. Modules secondaires ou plus tardifs

- ateliers TRE
- prepa
- declic
- stats
- dashboards
- rapports
- logs

---

## Ce Qui Doit Etre Refait Ou Revalide

## Toujours a revalider

- auth
- client API
- types des modules
- hooks des modules
- gestion des erreurs
- routes protegees

## Souvent reutilisable apres adaptation

- composants UI
- pages visuelles
- modals
- tableaux
- filtres
- formulaires

## A surveiller en premier

- tout ce qui touche `candidats`
- tout ce qui touche `parcours_phase`
- tout ce qui touche `error_code`
- tout ce qui touche `rgpd_`
- tout ce qui touche `rapports`
- tout ce qui touche les stats recalculees

---

## Ordre Recommande

1. remettre a niveau prospections
2. remettre a niveau appairages
3. remettre a niveau partenaires / documents / commentaires / cvtheque
4. remettre a niveau ateliers TRE
5. remettre a niveau prepa / declic
6. finaliser les derniers ecarts stats / dashboards
7. remettre a niveau rapports / logs

---

## Definition De Fini

Le chantier sera termine quand :

- le front actif consomme correctement le backend actuel
- les modules critiques sont realignes
- les pages anciennes encore utiles ont ete adaptees
- les contrats d'erreurs sont bien exploites
- la logique candidat est entierement migree sur le nouveau backend
- les modules manquants du vieux front sont couverts

---

## Prochaine Etape Concrete

Reprendre les modules metier dans cet ordre :

1. prospections
2. appairages
3. partenaires / documents / commentaires / cvtheque

Ensuite seulement, remettre a niveau les autres modules.
