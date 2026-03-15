

## ╔════════════════════════════════════════════════════════════╗
## ║ 1. 📘 GÉNÉRER UN GUIDE                                   ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un CTO Django senior chargé de produire une documentation technique et fonctionnelle complète de ce projet.

Objectif :
Créer un document clair, structuré et fiable expliquant comment fonctionne l’application afin qu’un développeur ou une IA puisse comprendre le système et effectuer des modifications sans relire tout le code.

Analyse tout le projet Django :
- models
- signals
- services
- serializers
- viewsets
- permissions
- utils
- helpers
- urls
- settings si nécessaire

CONSIGNES DE FIABILITÉ :
- N’invente aucune logique métier
- Si une information n’est pas clairement déductible du code, indique-le explicitement
- Ne suppose jamais
- Base-toi uniquement sur le code réel

Le résultat doit être un fichier Markdown complet nommé :

PROJECT_GUIDE.md

Structure attendue :

# 1. Présentation du projet
- objectif de l’application
- type d’utilisateurs
- problème métier résolu

# 2. Architecture globale
- structure des dossiers
- organisation des apps Django
- rôle de chaque couche :
  - models
  - services
  - signals
  - serializers
  - viewsets
  - permissions
  - utils / helpers

# 3. Modules de l’application
Pour chaque app Django :
- rôle du module
- modèles principaux
- relations avec les autres modules
- services associés
- endpoints API principaux

# 4. Modèles principaux
Pour chaque modèle important :
- rôle métier
- champs principaux
- relations
- contraintes métier visibles dans le code
- signaux associés

# 5. Services métier
Pour chaque service :
- rôle
- logique métier principale
- interactions avec les modèles

# 6. Signals
- quels signaux existent
- quand ils se déclenchent
- quelles actions ils exécutent

# 7. API
Pour chaque ViewSet :
- endpoints principaux
- rôle
- serializers utilisés
- permissions

# 8. Flux métier principaux
Décrire les workflows visibles dans le code, par exemple :
- création d’un candidat
- appairage candidat / entreprise
- génération de contrat
- génération CERFA

Présenter les flux sous forme de séquence logique.

# 9. Permissions et rôles
- types d’utilisateurs
- restrictions visibles dans les permissions

# 10. Points sensibles du système
Identifier :
- logique critique
- dépendances fortes
- endroits où une modification pourrait casser le système

# 11. Conventions techniques du projet
- organisation du code
- logique d’utilisation des services
- patterns utilisés

# 12. Guide pour modifier l’application
Expliquer :
- où modifier pour changer un comportement
- quels fichiers sont généralement impactés

Exemple :
Modifier la logique CERFA nécessite probablement de modifier :
- models/cerfa.py
- services/cerfa_service.py
- serializers/cerfa_serializers.py
- viewsets/cerfa_viewsets.py

Format attendu :
- Markdown clair
- sections bien structurées
- listes lisibles
- pas de code inutile
- document utilisable comme base de discussion avec une IA

Si certaines parties du projet doivent être analysées plus en profondeur, demande explicitement quels fichiers supplémentaires voir.
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 2. 🧭 AUDIT COMPLET DE L’APPLICATION                     ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un CTO Django senior spécialisé en audit technique d’applications Django backend.

MISSION GLOBALE
Analyser l’intégralité de l’application Django avant de produire un rapport d’audit technique complet.

Tu dois explorer tout le projet avant toute conclusion.

Périmètre minimum à analyser :
- apps Django
- models : 
- serializers
- viewsets
- services
- signals
- permissions
- admin
- utils / helpers
- urls
- settings si nécessaire
- migrations si pertinentes
- tests si présents

OBJECTIF
Identifier :
- les incohérences techniques
- les incohérances dans la documentation 
- les dettes techniques
- les risques de bugs
- les problèmes potentiels de performance
- les risques de sécurité
- les dépendances fragiles
- les améliorations de structure possibles

IMPORTANT
- Ne modifier aucun fichier
- Ne proposer aucune refactorisation directe dans cette phase
- Produire uniquement une analyse
- N’inventer aucune logique métier
- Si une information n’est pas certaine, l’indiquer clairement
- Ne pas supposer l’existence ou le comportement de fichiers non visibles

ÉTAPE 1 — Exploration complète du projet

Explore la structure complète du repository.

Tu dois identifier et analyser l’ensemble des apps et modules pertinents.

Si certaines apps ou certains modules existent mais n’ont pas encore été explorés, poursuis l’analyse jusqu’à obtenir une vision globale cohérente du projet.

Ne commence pas l’audit final tant que tu n’as pas identifié la structure globale du projet.

ÉTAPE 2 — Cartographie rapide

Avant de produire le rapport final, retourne une cartographie synthétique contenant :

1. La liste des apps Django détectées
2. Les modules principaux trouvés dans chaque app :
   - models
   - serializers
   - viewsets
   - services
   - signals
   - permissions
   - utils / helpers si présents
3. Les dépendances principales entre modules si elles sont visibles
4. Les zones non explorées ou incertaines, s’il y en a

Cette cartographie doit me permettre de vérifier que tu as bien exploré l’ensemble du projet.

ÉTAPE 3 — Pause de validation

Après avoir fourni la cartographie :

ARRÊTE-TOI.

Attends ma confirmation avant de produire l’audit technique complet.

ÉTAPE 4 — Audit complet (à produire après validation)

Une fois ma validation reçue, génère un fichier Markdown complet nommé :

TECHNICAL_AUDIT.md

Structure attendue du rapport :

# 1. Vue globale de l’architecture
- organisation des apps
- séparation des responsabilités
- cohérence models / services / API
- patterns utilisés
- bonnes pratiques respectées
- points faibles structurels

# 2. Cartographie des dépendances
Pour chaque module important :
- modèles utilisés
- services appelés
- signaux déclenchés
- serializers exposés
- endpoints API liés

# 3. Incohérences techniques
Identifier :
- incohérences entre models / serializers / viewsets
- validations manquantes ou incohérentes
- permissions insuffisantes ou floues
- logique métier dupliquée
- dépendances fragiles
- incohérences de structure ou de nommage

Classer les problèmes par gravité :
- CRITIQUE
- IMPORTANT
- MINEUR

# 4. Risques de bugs
Identifier :
- signaux dangereux
- récursions possibles
- save() problématiques
- validations manquantes
- risques transactionnels
- cas de données incohérentes

# 5. Performance
Identifier :
- requêtes N+1 possibles
- absence de select_related / prefetch_related quand pertinent
- recalculs inutiles
- appels DB dans des boucles
- chargements excessifs

# 6. Sécurité
Identifier :
- endpoints exposés sans permission claire
- accès objet mal protégés
- validations insuffisantes
- risques d’exposition de données

# 7. Dette technique
Identifier :
- code mort
- constantes inutilisées
- duplication de logique
- responsabilités mal séparées
- éléments difficiles à maintenir

# 8. Roadmap de corrections
Créer une TODO list priorisée :
- P0 — critique
- P1 — important
- P2 — amélioration technique
- P3 — confort / maintenance

# 9. Checklist de tests
Pour les corrections importantes, proposer :
- tests API à effectuer
- cas limites à vérifier
- validations à tester
- permissions à vérifier
- points de régression à surveiller

FORMAT ATTENDU
- Markdown structuré
- sections claires
- listes lisibles
- analyse concise et exploitable
- aucune modification de code

Si tu estimes ne pas avoir pu analyser l’ensemble du projet avec suffisamment de certitude, demande-moi explicitement les fichiers manquants avant de finaliser l’audit.
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 3. 🚨 AUDIT DES MESSAGES D’ERREUR                        ║
## ╚════════════════════════════════════════════════════════════╝

Tu es un CTO Django senior spécialisé en architecture d’API REST robustes et maintenables.

MISSION

Analyser l’intégralité de l’application Django afin d’auditer la gestion des erreurs.

IMPORTANT

À la fin de l’analyse, tu dois créer un fichier Markdown dans le repository :

ERROR_HANDLING_AUDIT.md

Ce fichier doit contenir le rapport complet d’audit des messages d’erreur.

Tu ne dois modifier aucun autre fichier du projet.

---

PÉRIMÈTRE D’ANALYSE

Explorer l’ensemble du projet :

- models
- serializers
- viewsets
- services
- signals
- permissions
- utils
- admin
- tests si présents
- urls
- settings si nécessaire

Analyser le code réel.

Ne pas se baser uniquement sur les commentaires ou docstrings.

---

OBJECTIF

Vérifier si l’application possède des messages d’erreur :

- cohérents
- explicites
- correctement placés dans l’architecture
- suffisamment complets pour couvrir les cas d’erreurs métier et techniques.

---

ÉTAPE 1 — Identification des sources d’erreurs

Identifier les endroits où des erreurs sont levées :

- ValidationError
- serializers.ValidationError
- PermissionDenied
- NotFound
- APIException
- raise Exception
- raise ValueError
- réponses Response(..., status=...)
- validations dans clean()
- validations dans validate()
- exceptions dans services
- exceptions dans signaux

---

ÉTAPE 2 — Répartition des erreurs

Analyser où les erreurs sont gérées :

- models
- serializers
- viewsets
- services
- signals
- permissions

Vérifier si cette répartition respecte les bonnes pratiques Django / DRF :

validation données → serializers  
règles métier → models / services  
erreurs workflow → viewsets  
refus accès → permissions

Signaler les incohérences.

---

ÉTAPE 3 — Qualité des messages

Vérifier si les messages d’erreur :

- sont compréhensibles
- sont cohérents entre modules
- utilisent une structure similaire
- utilisent les clés standard :
  - detail
  - message
  - code

Identifier :

- messages absents
- messages trop vagues
- exceptions techniques exposées
- utilisation de raise Exception au lieu d’exceptions DRF.

---

ÉTAPE 4 — Couverture des cas d’erreur

Vérifier la présence d’erreurs pour :

Validation :
- champs obligatoires
- formats invalides
- incohérences de données

Logique métier :
- états incompatibles
- transitions interdites
- relations invalides

Sécurité :
- permissions insuffisantes
- accès objet interdit

Workflow :
- actions impossibles
- génération interdite
- modification interdite

Identifier les validations manquantes.

---

ÉTAPE 5 — Qualité technique

Vérifier :

- cohérence des statuts HTTP
- utilisation correcte de ValidationError
- utilisation correcte de PermissionDenied
- utilisation correcte de NotFound
- utilisation correcte de APIException

Identifier :

- exceptions génériques inutiles
- erreurs levées mais jamais capturées
- messages techniques exposés à l’API
- incohérences dans les réponses JSON d’erreur.

---

FORMAT DU FICHIER À CRÉER

Créer un fichier :

ERROR_HANDLING_AUDIT.md

Structure :

# 1. Vue globale de la gestion des erreurs

- stratégie globale
- cohérence
- points forts
- points faibles

# 2. Cartographie des erreurs

Par couche :

- models
- serializers
- viewsets
- services
- signals
- permissions

# 3. Incohérences détectées

Classer :

CRITIQUE  
IMPORTANT  
MINEUR

# 4. Couverture des erreurs métier

- validations présentes
- validations manquantes

# 5. Cohérence API

- format JSON
- statuts HTTP
- homogénéité entre endpoints

# 6. Recommandations

- règles simples de gestion d’erreur
- bonnes pratiques adaptées au projet

---

CONTRAINTES

- Ne modifier aucun fichier existant
- Ne corriger aucun code
- Produire uniquement l’audit
- Ne pas inventer de logique métier
- Si une information est incertaine, l’indiquer clairement

Le résultat final doit être un **document d’audit exploitable par l’équipe technique.**

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 4. 🧠 TEST ULTIME DE STRUCTURE DU PROJET                 ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un CTO Django senior chargé d’évaluer la qualité structurelle, la lisibilité architecturale et la maintenabilité de cette application Django.

MISSION
Analyser l’intégralité du projet pour répondre à cette question :

"Cette application est-elle suffisamment claire, cohérente et bien structurée pour qu’un développeur senior ou une IA puisse la comprendre, la maintenir et la faire évoluer sans risque excessif ?"

Avant toute conclusion, tu dois explorer l’ensemble du projet.

Tu dois analyser au minimum :
- apps Django
- models
- serializers
- viewsets
- services
- signals
- permissions
- utils / helpers
- urls
- settings si nécessaire
- admin si présent

IMPORTANT
- Ne modifier aucun fichier
- Ne produire aucun code
- Produire uniquement un rapport d’analyse
- N’inventer aucune logique métier
- Si une information n’est pas certaine, l’indiquer clairement
- Ne pas supposer l’existence de comportements non visibles

ÉTAPE 1 — Exploration du projet

Explore la structure complète du repository.

Identifie :
- les apps existantes
- les fichiers structurants
- les couches réellement utilisées
- les éventuelles couches absentes ou incohérentes

Avant le rapport final, retourne une cartographie rapide contenant :
1. la liste des apps détectées
2. les principaux modules par app
3. les dépendances principales visibles
4. les zones insuffisamment lisibles ou ambiguës

Puis attends ma validation avant de produire le rapport final.

ÉTAPE 2 — Rapport final

Après validation, génère un fichier Markdown nommé :

STRUCTURE_REVIEW.md

Le rapport doit répondre de manière argumentée aux points suivants :

# 1. Lisibilité globale du projet
- la structure du repo est-elle claire ?
- les apps sont-elles compréhensibles ?
- les responsabilités sont-elles faciles à identifier ?
- un nouveau développeur pourrait-il se repérer rapidement ?

# 2. Séparation des responsabilités
Vérifier si les rôles sont bien répartis entre :
- models
- serializers
- viewsets
- services
- signals
- permissions
- utils / helpers
- admin

Identifier :
- logique métier mal placée
- validation mal placée
- duplication de responsabilités
- couches trop couplées

# 3. Clarté métier
Évaluer si la logique métier est :
- visible
- centralisée
- cohérente
- documentable

Identifier :
- règles implicites
- dépendances cachées
- comportements difficiles à déduire
- effets de bord invisibles

# 4. Maintenabilité
Évaluer si le projet est facile à :
- corriger
- faire évoluer
- documenter
- brancher à un frontend React
- reprendre après plusieurs mois

Identifier les zones qui deviendraient risquées en cas d’évolution.

# 5. Cohérence API
Évaluer si l’API est :
- cohérente
- prédictible
- bien structurée
- bien alignée avec les serializers et les modèles

# 6. Compréhensibilité pour une IA
Répondre explicitement :
- Une IA peut-elle comprendre ce projet facilement ?
- Quelles parties sont faciles à interpréter ?
- Quelles parties sont ambiguës ou dangereuses ?
- Quels éléments rendent les futures corrections risquées ?

# 7. Points forts du projet
Lister ce qui est bien structuré et aide la compréhension.

# 8. Points faibles du projet
Lister ce qui nuit à la lisibilité, à la sécurité des modifications ou à la maintenabilité.

# 9. Score global
Attribuer une note sur 10 pour :
- clarté architecturale
- séparation des responsabilités
- maintenabilité
- lisibilité métier
- exploitabilité par une IA

# 10. Roadmap d’amélioration structurelle
Créer une liste priorisée :

P0 — bloqueur de compréhension
P1 — fort gain de clarté
P2 — amélioration de maintenabilité
P3 — confort / documentation

FORMAT ATTENDU
- Markdown structuré
- sections claires
- analyse argumentée
- aucun code
- aucune invention
- aucune modification de fichier

Si certaines parties du projet restent trop ambiguës pour conclure proprement, demande explicitement les fichiers manquants avant de finaliser le rapport.
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 5. 🗺 PLAN DE CHANGEMENT AVANT CODAGE                    ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un architecte Django senior.

Mission :
Avant toute modification, analyser cette demande métier et produire un plan de changement.

Objectif :
Identifier les fichiers impactés, les risques, la stratégie la plus backward compatible et l’ordre recommandé des modifications.

Tu dois analyser si nécessaire :
- models
- serializers
- viewsets
- services
- signals
- permissions
- admin
- utils / helpers

RÈGLES STRICTES :
- Ne modifier aucun fichier
- Ne produire aucun code
- N’inventer aucune logique métier
- Si une information n’est pas certaine, l’indiquer clairement
- Ne pas supposer

FORMAT DE SORTIE :
1. Résumé de la demande
2. Fichiers probablement impactés
3. Impacts possibles par couche
4. Risques de régression
5. Stratégie recommandée
6. Ordre conseillé des modifications
7. Points à confirmer avant codage
```

---

