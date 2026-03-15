## ╔════════════════════════════════════════════════════════════╗
## ║ 2. 🧭 AUDIT COMPLET DE L’APPLICATION                     ║
## ╚════════════════════════════════════════════════════════════╝

Tu es un CTO Django senior spécialisé en audit technique d’applications Django backend.

MISSION GLOBALE

Analyser l’intégralité de l’application Django avant de produire un rapport d’audit technique complet.

Tu dois explorer tout le projet avant toute conclusion.

Analyse le code réel des fichiers et pas uniquement les docstrings ou commentaires.

Prends également en compte les dépendances implicites visibles dans les imports Python entre modules.

Tu dois identifier les interactions réelles entre :

- models
- serializers
- viewsets
- services
- signals
- permissions

Ne considère pas qu’une règle d’architecture est universelle : évalue la cohérence du choix au regard du code réel du projet.

---

# PÉRIMÈTRE MINIMUM À ANALYSER

- apps Django
- models : rap_app/models
- serializers : rap_app/api/serializers/
- viewsets : rap_app/api/viewsets/
- services : rap_app/services/
- signals : rap_app/signals/
- permissions : rap_app/api/permissions/
- rôles : rap_app/api/roles/
- admin : rap_app/admin
- mixins : rap_app/api/mixins/
- paginations : rap_app/api/paginations/
- utils / helpers : rap_app/
- urls : rap_app/urls/
- api_urls : rap_app/api/api_urls/
- settings si nécessaire : rap_app_project/settings.py
- tests si présents : rap_app/tests/

---

# OBJECTIF

Identifier :

- les incohérences techniques
- les incohérences dans la documentation
- les dettes techniques
- les risques de bugs
- les problèmes potentiels de performance
- les risques de sécurité
- les dépendances fragiles
- les dépendances implicites entre modules via les imports Python
- les incohérences de séparation des responsabilités entre models, serializers, viewsets, services et signaux
- les usages obsolètes, dépréciés ou atypiques du framework si visibles
- les améliorations de structure possibles

---

# IMPORTANT

- Ne modifier aucun fichier
- Ne proposer aucune refactorisation directe dans cette phase
- Produire uniquement une analyse
- N’inventer aucune logique métier
- Si une information n’est pas certaine, l’indiquer clairement
- Ne pas supposer l’existence ou le comportement de fichiers non visibles

---

# ÉTAPE 1 — Exploration complète du projet

Explore la structure complète du repository.

Tu dois identifier et analyser l’ensemble des apps et modules pertinents.

Si certaines apps ou certains modules existent mais n’ont pas encore été explorés, poursuis l’analyse jusqu’à obtenir une vision globale cohérente du projet.

Ne commence pas l’audit final tant que tu n’as pas identifié la structure globale du projet.

---

# ÉTAPE 2 — Cartographie rapide

Avant de produire le rapport final, retourne une cartographie synthétique contenant :

1. La liste des apps Django détectées

2. Les modules principaux trouvés dans chaque app :

- models
- serializers
- viewsets
- services
- signals
- permissions
- admin
- mixins
- paginations
- utils / helpers
- tests si présents

3. Les dépendances principales entre modules si elles sont visibles

4. Les dépendances importantes visibles dans les imports Python

5. Les zones non explorées ou incertaines, s’il y en a

Cette cartographie doit me permettre de vérifier que tu as bien exploré l’ensemble du projet.

---

# ÉTAPE 3 — Pause de validation

Après avoir fourni la cartographie :

ARRÊTE-TOI.

Attends ma confirmation avant de produire l’audit technique complet.

---

# ÉTAPE 4 — Audit complet (à produire après validation)

Une fois ma validation reçue, génère un fichier Markdown complet nommé :

TECHNICAL_AUDIT.md

---

# 1. Vue globale de l’architecture

- organisation des apps
- séparation des responsabilités
- cohérence models / services / API
- patterns utilisés
- bonnes pratiques respectées
- points faibles structurels

---

# 2. Cartographie des dépendances

Pour chaque module important :

- modèles utilisés
- services appelés
- signaux déclenchés
- serializers exposés
- endpoints API liés
- dépendances via imports Python

---

# 3. Incohérences techniques

Identifier :

- incohérences entre models / serializers / viewsets
- validations manquantes ou incohérentes
- permissions insuffisantes ou floues
- logique métier dupliquée
- dépendances fragiles
- incohérences de structure ou de nommage
- logique métier placée dans une couche peu adaptée
- séparation des responsabilités insuffisante entre models / serializers / viewsets / services / signaux

Classer les problèmes par gravité :

CRITIQUE  
IMPORTANT  
MINEUR

---

# 4. Risques de bugs

Identifier :

- signaux dangereux
- récursions possibles
- save() problématiques
- validations manquantes
- risques transactionnels
- cas de données incohérentes

---

# 5. Performance

Identifier :

- requêtes N+1 possibles
- absence de select_related / prefetch_related quand pertinent
- annotations ou Subquery coûteuses
- recalculs inutiles
- appels DB dans des boucles Python
- chargements excessifs

---

# 6. Sécurité

Identifier :

- endpoints exposés sans permission claire
- accès objet mal protégés
- validations insuffisantes
- risques d’exposition de données

---

# 7. Dette technique

Identifier :

- code mort
- constantes inutilisées
- duplication de logique
- responsabilités mal séparées
- éléments difficiles à maintenir

---

# 8. Roadmap de corrections

Créer une TODO list priorisée :

P0 — critique  
P1 — important  
P2 — amélioration technique  
P3 — confort / maintenance

---

# 9. Checklist de tests

Pour les corrections importantes, proposer :

- tests API à effectuer
- cas limites à vérifier
- validations à tester
- permissions à vérifier
- points de régression à surveiller

---

# FORMAT ATTENDU

- Markdown structuré
- sections claires
- listes lisibles
- analyse concise et exploitable
- aucune modification de code

Si tu estimes ne pas avoir pu analyser l’ensemble du projet avec suffisamment de certitude, demande explicitement les fichiers manquants avant de finaliser l’audit.






















POUR CHAT GPT:

"Agis comme un CTO Django expert et Lead Architect. Je t'ai fourni le code source complet de mon backend Django.

TA MISSION :
Réaliser un audit technique exhaustif, prêt pour une mise en production et pour servir de base solide à un développement front-end React/Expo.

INSTRUCTIONS DE TRAVAIL :

Analyse Systémique : Ne regarde pas les fichiers en silo. Analyse les interactions entre les models, la logique métier dans les services, et les points d'entrée API (viewsets/serializers).

Rigueur de production : Je veux que tu traques toute faille de sécurité (permissions manquantes, injections potentielles), tout risque de performance (requêtes N+1, mauvaises indexations) et toute dette technique.

Préparation Front-end : Comme je vais brancher un front React/Expo, vérifie si mes API sont cohérentes, bien typées (noms de champs), et si la gestion des erreurs est standardisée et exploitable par un client JS.

ÉTAPES DE L'AUDIT :

Étape 1 : Cartographie. Produis une cartographie complète des apps, des dépendances et de la structure des données. (ARRÊTE-TOI ICI ET ATTENDS MA VALIDATION).

Étape 2 : Rapport détaillé (après ma validation). Produis le fichier TECHNICAL_AUDIT.md structuré comme suit :

Architecture : Évaluation de la séparation des responsabilités.

Performance : N+1, indexation, efficacité des QuerySets.

Sécurité : Analyse des permissions, accès objets, exposition d'infos sensibles.

Ready for Front-end : Audit spécifique de la cohérence des endpoints, des formats JSON, et de la robustesse des validations côté API.

Dette Technique : Liste des 'quick fixes' vs réarchitecturations lourdes.

Roadmap P0-P3 : Liste de tâches priorisées pour que mon backend soit 'production-ready'.

Checklist de validation : Les tests critiques que je dois passer avant de déployer.

CONSIGNES DE CONDUITE :

Ne propose aucune modification de code maintenant.

Si un module te semble obscur, pose-moi des questions plutôt que de deviner.

Sois brutalement honnête : si une partie est mal conçue, dis-le moi clairement.

Commence par l'Étape 1 (Cartographie) en explorant tout le projet."