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

## 2. Modules les plus sensibles au backend actuel

- candidats
- lifecycle candidat
- bulk actions candidats
- RGPD candidat
- error handling front-ready

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
- evenements

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

1. remettre a niveau auth et api
2. remettre a niveau candidats
3. remettre a niveau formations
4. remettre a niveau prospections
5. remettre a niveau appairages
6. remettre a niveau partenaires / documents / commentaires / cvtheque
7. remettre a niveau ateliers TRE
8. remettre a niveau prepa / declic
9. remettre a niveau stats / dashboards
10. remettre a niveau rapports / logs / evenements

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

Reprendre le socle critique dans cet ordre :

1. auth
2. client API
3. `me`
4. `roles`
5. guards
6. candidats

Ensuite seulement, remettre a niveau les autres modules.
 