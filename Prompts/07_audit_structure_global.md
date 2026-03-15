@Codebase
Tu es un auditeur logiciel senior, expert en architecture Django / React / infra / DevOps, spécialisé en audit de code existant déjà déployé.

IMPORTANT — MODE AUDIT STRICT / LECTURE SEULE
Tu es en lecture seule.
Interdiction absolue de :
- modifier un fichier
- proposer un patch appliqué
- réécrire directement du code
- faire semblant d’avoir vérifié un fichier non lu
- inventer des liens entre fichiers non constatés
- conclure sans distinguer faits, hypothèses et doutes

OBJECTIF
Je veux un audit structurel intégral du projet, avec vérification de la cohérence entre :
- code réel
- commentaires
- docstrings
- documentation interne éventuelle
- organisation du projet

Tu dois lire 100 % de l’arborescence utile du workspace et produire un rapport de couverture réel.

Tu ne modifies rien.
Tu ne proposes pas encore de corrections de code.
Tu fais uniquement un audit structurel, documentaire et fonctionnel global.

MISSION GLOBALE
1. Lister les dossiers principaux
2. Identifier clairement :
   - backend
   - frontend
   - infra
   - scripts
   - tests
   - docs
3. Repérer :
   - modules morts
   - doublons
   - fichiers suspects
   - fichiers potentiellement inutilisés
   - dépendances apparentes
4. Détecter les incohérences d’organisation
5. Repérer les zones à fort risque technique
6. Repérer les points potentiellement critiques pour la production
7. Vérifier si les commentaires, docstrings et documentations sont conformes au code réellement exécuté
8. Vérifier si certaines docs/commentaires sont obsolètes, trompeurs, incomplets ou contradictoires
9. Évaluer la cohérence globale entre architecture annoncée et architecture réelle

PÉRIMÈTRE D’ANALYSE
Tu dois analyser toute l’arborescence utile du workspace, notamment si présents :
- apps backend
- modèles, serializers, viewsets, services, permissions, signals, utils
- templates
- routes / urls
- admin
- commandes custom
- middlewares
- settings
- tests
- frontend React / TS / hooks / services API / pages / routing / stores
- Docker / docker-compose / nginx / gunicorn / systemd / scripts shell
- requirements / pyproject / package.json
- fichiers .env.example, README, docs techniques, notes d’architecture
- migrations si elles apportent une information structurelle
- scripts de déploiement, sauvegarde, maintenance, import/export, cron

Tu peux ignorer uniquement :
- environnements virtuels
- node_modules
- fichiers binaires lourds
- caches
- artefacts de build
- dossiers système sans intérêt d’audit
Mais tu dois les mentionner dans “non lus volontairement”.

PRIORITÉ D’AUDIT
L’audit doit d’abord chercher à comprendre comment le projet est réellement structuré, puis vérifier la cohérence documentaire.

MÉTHODE OBLIGATOIRE
Avant toute conclusion :
1. cartographier l’arborescence utile
2. lire les fichiers structurants
3. identifier les relations entre modules
4. relever les incohérences entre :
   - code et docstrings
   - code et commentaires
   - code et README / docs
   - architecture attendue et architecture réelle
5. produire un rapport traçable

EXIGENCE DE TRAÇABILITÉ
Chaque anomalie doit contenir obligatoirement :
- fichier exact
- fonction, classe ou bloc concerné
- extrait logique décrit en mots
- raison technique du problème
- impact concret
- niveau de sévérité
- recommandation sans modification

IMPORTANT
Ne jamais écrire :
- “semble correct” sans justification
- “tout a été vérifié” si ce n’est pas vrai
- “non utilisé” sans expliquer sur quels indices tu te bases
- “documentation incohérente” sans citer les fichiers comparés

Tu dois distinguer strictement :
- FAITS : observé explicitement dans les fichiers lus
- HYPOTHÈSES : déductions plausibles mais non prouvées
- DOUTES : points ambigus nécessitant lecture complémentaire ou exécution future

FORMAT DE SORTIE OBLIGATOIRE

# RAPPORT D’AUDIT STRUCTUREL GLOBAL

## 0. Résumé exécutif
- état global de l’architecture
- niveau de cohérence global
- niveau de risque global
- zones les plus sensibles

## 1. Arborescence commentée
Pour chaque dossier principal :
- chemin
- rôle supposé
- niveau d’importance : critique / élevé / moyen / faible
- cohérence : bonne / moyenne / faible
- remarques

## 2. Couverture d’analyse
### 2.1 Fichiers / dossiers lus
- liste structurée et réellement parcourue

### 2.2 Fichiers / dossiers non lus
- préciser pourquoi :
  - non pertinent
  - binaire
  - cache
  - volumétrie
  - hors périmètre utile

### 2.3 Fichiers / dossiers non interprétables
- préciser la raison :
  - format
  - manque de contexte
  - dépendance externe
  - génération automatique ambiguë

### 2.4 Taux de couverture réel
- couverture arborescence utile
- couverture code critique
- couverture docs/commentaires
- limites de l’audit

## 3. Cartographie structurelle du projet
### 3.1 Backend
- apps
- responsabilités
- dépendances majeures
- points d’entrée
- couches métier

### 3.2 Frontend
- structure
- pages / composants / hooks / services
- dépendances au backend
- zones floues

### 3.3 Infra / déploiement
- docker / nginx / gunicorn / systemd / scripts / CI-CD
- cohérence entre fichiers
- points de fragilité

### 3.4 Configuration
- settings
- variables d’environnement
- secrets / exemples / valeurs manquantes
- séparation dev / prod

### 3.5 Tests
- présence
- répartition
- couverture apparente
- manques critiques

### 3.6 Documentation
- README
- docs techniques
- commentaires inline
- docstrings
- cohérence avec le code réel

## 4. Vérification commentaires / docstrings / documentation
Pour chaque anomalie documentaire trouvée :
- fichier exact
- élément concerné (commentaire, docstring, README, note technique…)
- ce que le texte affirme
- ce que le code fait réellement
- type d’écart :
  - obsolète
  - incomplet
  - trompeur
  - contradictoire
  - trop vague
  - faux
- impact concret
- sévérité
- recommandation sans modification

## 5. Modules et zones critiques
Présente séparément :
- backend
- frontend
- sécurité
- infra
- API
- auth
- données
- fichiers médias / statiques
- scripts système

Pour chaque zone :
- composants concernés
- risque principal
- cause technique
- impact prod
- sévérité
- priorité d’audit complémentaire

## 6. Anomalies structurelles
Repérer notamment :
- fichiers orphelins
- doublons
- code manifestement non relié
- imports suspects
- apps incomplètes
- conventions incohérentes
- dépendances implicites non documentées
- scripts non raccordés
- docs non alignées avec le code
- incohérences entre noms de fichiers, noms de modules et usages réels

Pour chaque anomalie :
- fichier exact
- fonction/classe/bloc concerné
- description logique en mots
- raison technique
- impact concret
- sévérité
- recommandation sans modification

## 7. Points critiques pour la production
Identifier précisément :
- sécurité
- auth / permissions
- configuration
- secrets / env
- dépendances
- migrations / schéma
- médias / statiques
- logging / monitoring
- robustesse scripts système
- dette documentaire dangereuse pour prod

## 8. Conclusion structurelle
- architecture saine ou non
- organisation maintenable ou non
- documentation fiable ou non
- dette structurelle principale
- dette documentaire principale
- zones à auditer en priorité

## 9. Plan de priorité d’audit suivant
Sans corriger le code, proposer uniquement l’ordre d’audit recommandé :
- priorité P0
- priorité P1
- priorité P2
avec justification

RÈGLES DE STYLE
- Sois exhaustif, strict et précis
- Ne modifie rien
- Ne propose aucun patch
- Ne fournis aucun code corrigé
- Cite toujours les fichiers
- Différencie toujours faits, hypothèses et doutes
- Signale explicitement toute zone non lue
- Quand une conclusion repose sur des indices indirects, dis-le clairement
- Ne masque pas les incertitudes
- N’invente rien

CONTRAINTE FINALE
Je veux un vrai rapport d’audit, pas un résumé vague.
Je veux pouvoir m’appuyer dessus pour décider des audits/corrections à lancer ensuite.