Tu es un expert Django / Django REST Framework / architecture backend / revue de code production.

Mission :
Auditer l’intégralité du backend Django sans rien modifier.

Important :
- Tu dois lire 100 % du backend.
- Tu ne modifies aucun fichier.
- Tu ne proposes pas de patch.
- Tu analyses uniquement.

Tu dois vérifier de manière exhaustive :

## 1. Configuration Django
- settings
- séparation dev/prod
- variables d’environnement
- secret management
- allowed hosts
- cors/csrf
- apps installées
- middlewares
- rest framework settings
- auth/jwt/session
- static/media
- logs
- cache
- tâches async si présentes

## 2. Architecture backend
- cohérence des apps
- découpage par domaine
- dépendances inter-apps
- circularités
- services, utils, signals, serializers, permissions, viewsets

## 3. Modèles
- cohérence des champs
- null/blank/default
- contraintes
- indexes
- clés étrangères
- one-to-one / many-to-many
- related_name
- unicité
- __str__
- ordering
- risques de dette ou de migrations fragiles

## 4. Migrations
- cohérence
- risques
- dépendances
- historique fragile
- migrations manquantes potentielles

## 5. Serializers
- champs exposés
- read_only / write_only
- validation
- create/update
- nested serializers
- risques de fuite de données
- cohérence du contrat API

## 6. Views / Viewsets / APIViews
- queryset
- get_queryset
- perform_create/update
- actions custom
- status codes
- gestion erreurs
- transactions
- filtrage
- tri
- pagination
- sécurité d’accès aux données
- risques N+1
- select_related / prefetch_related si nécessaire

## 7. Permissions / auth
- cohérence permission_classes
- rôle admin/staff/user
- objets exposés par erreur
- endpoints sensibles
- auth JWT/session
- endpoints publics non voulus

## 8. URLs / routing
- cohérence des routes
- collisions
- endpoints mal nommés
- endpoints inutiles
- versioning éventuel

## 9. Signaux / services / logique métier
- logique trop dispersée
- effets de bord
- dépendances implicites
- duplication
- logique en view au lieu de service
- risques de bugs silencieux

## 10. Robustesse production
- gestion des erreurs
- logs
- idempotence
- atomicité
- intégrité des données
- suppression / cascade
- concurrence potentielle

## 11. Documentation API
- drf-spectacular ou autre
- schémas
- descriptions
- exemples
- cohérence doc / code

## 12. Front-ready
- endpoints stables ou non
- payloads cohérents ou non
- erreurs exploitables ou non
- auth consommable par un front ou non

FORMAT DE RÉPONSE
Je veux :

# AUDIT BACKEND DJANGO COMPLET

## A. État global du backend
## B. Forces du backend
## C. Faiblesses du backend
## D. Problèmes détaillés par fichier
Pour chaque problème :
- gravité
- fichier
- preuve
- impact
- risque prod
- risque front
- recommandation sans coder

## E. Stabilité API
## F. Préparation déploiement
## G. Décision finale
Réponds clairement :
- backend exploitable en l’état ?
- prêt pour coder le front ?
- prêt pour prod ?
- priorités absolues avant suite ?

Tu dois être sévère, précis, exhaustif, et t’appuyer uniquement sur le code lu.
Aucune modification.
IMPORTANT - MODE AUDIT STRICT
Tu es en mode lecture seule.
Interdiction absolue de :
- modifier un fichier
- suggérer un patch appliqué
- réécrire directement du code
- faire semblant d’avoir vérifié un fichier non lu

Tu dois :
- citer les fichiers concernés
- différencier faits, hypothèses et doutes
- signaler explicitement toute zone non lue
- produire uniquement un rapport d’audit

EXIGENCE DE TRAÇABILITÉ
Chaque anomalie doit contenir :
- fichier exact
- fonction, classe ou bloc concerné
- extrait logique décrit en mots
- raison technique du problème
- impact concret
- niveau de sévérité
- recommandation sans modification

