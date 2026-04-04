# Audit des incohérences de documentation API

## Objectif

Ce document ne décrit pas la qualité globale du backend, mais l'état de la
documentation API visible via le schéma OpenAPI et les interfaces générées
(`Swagger UI`, `ReDoc`, schéma brut).

Il sert à répondre à une question précise :

- la documentation exposée aux consommateurs de l'API est-elle homogène,
  lisible, et fidèle au comportement réel des endpoints ?


## Etat actuel

Le constat a évolué et le présent document est désormais une clôture d'audit,
pas seulement un cadrage.

Le backend applicatif a été fortement documenté et audité :

- les docstrings backend ont été revues sur le coeur utile du projet ;
- les zones métier sensibles ont été réalignées sur le comportement réel ;
- les incohérences les plus risquées pour un développeur reprenant le code ont
  été corrigées ;
- l'audit documentaire backend est désormais suivi dans
  `AUDIT_DOCSTRINGS_BACKEND.md`.

Un audit concret du schéma généré a ensuite été mené sur la vraie sortie
`drf-spectacular`.

Le point important est donc le suivant :

- le code backend et ses docstrings sont désormais beaucoup plus cohérents ;
- le schéma OpenAPI généré restait un objet distinct, avec ses propres limites
  et incohérences ;
- ces incohérences ont ensuite été corrigées directement à la source et via le
  hook `drf-spectacular` du projet.


## Ce qui a été amélioré depuis le premier diagnostic

Depuis la première version de ce diagnostic :

- les docstrings des `viewsets`, `serializers`, `services`, `models`,
  `signals`, `utils`, `admin`, `middleware`, `apps`, `management`, `forms` et
  `templatetags` ont été revues ou complétées ;
- les règles de rôles, de scope et plusieurs calculs métier sensibles ont été
  explicités ;
- plusieurs zones ambiguës ont été corrigées directement dans le code plutôt
  que seulement signalées dans un fichier de diagnostic.

Conséquence :

- le problème principal n'est plus un backend "pauvrement documenté" ;
- le problème restant est surtout la qualité et l'homogénéité de la
  documentation OpenAPI effectivement générée.


## Résultat final de l'audit OpenAPI

Le schéma a été régénéré et revalidé localement sur :

- `/api/schema/`
- `/api/docs/`
- `/api/redoc/`

Constat final après correction :

- génération du schéma : `OK`
- validation du schéma : `OK`
- résumés manquants : `0`
- descriptions d'opérations manquantes : `0`
- descriptions de paramètres manquantes : `0`
- descriptions de réponses manquantes : `0`

Les points principaux traités ont été :

- normalisation des schémas de réponses fichier ;
- ajout de métadonnées manquantes dans le post-traitement du schéma ;
- clarification de plusieurs `SerializerMethodField` pour éviter les warnings ;
- suppression de collisions de noms de composants sérialisés.


## Ce qui était vrai avant correction

Les constats suivants étaient bien réels avant la passe de correction.

### 1. Niveau de détail inégal selon les endpoints

Certains endpoints sont très bien décrits, d'autres restent succincts.

En particulier :

- certaines actions custom sont encore décrites de façon trop courte ;
- certains endpoints CRUD sont plus lisibles que certaines routes spécialisées
  ou statistiques.


### 2. Réponses `200` encore parfois trop faibles dans le schéma

Même quand le runtime réel est correct, le schéma peut rester peu expressif.

Exemples typiques à surveiller :

- réponses `200` décrites sans structure claire ;
- description absente ou trop générique ;
- exemples présents mais schéma ou description faibles.


### 3. Paramètres de filtres encore insuffisamment expliqués

Les filtres sont souvent présents techniquement, mais pas toujours décrits avec
la clarté métier attendue.

En pratique, cela peut concerner :

- paramètres de recherche ;
- filtres de date ;
- filtres de centre ;
- filtres de statut ;
- paramètres métier spécifiques à un module.


### 4. Endpoints d'exports à vérifier avec attention

Les exports sont souvent un point fragile dans la documentation générée.

Points classiques à revalider :

- `Content-Type` binaire ou fichier insuffisamment explicité ;
- schéma JSON affiché alors que la réponse réelle est un fichier ;
- description trop vague sur le type d'export produit.


### 5. Endpoints de stats souvent plus clairs dans le code que dans le schéma

Les endpoints de stats peuvent avoir une logique métier bien documentée côté
backend, mais rester insuffisamment lisibles dans OpenAPI si les schémas
générés ne détaillent pas assez les payloads retournés.


## Limites de l'audit

Le schéma est maintenant structurellement propre, mais cela ne signifie pas que
chaque phrase affichée dans Swagger est la formulation métier idéale absolue.

### 1. Le schéma peut rester perfectible sur le style

Les résumés et descriptions sont désormais présents partout, mais certains
endpoints pourraient encore être reformulés plus finement si l'objectif devient
une documentation publique particulièrement éditorialisée.


### 2. Il porte sur la doc générée, pas sur toute la qualité documentaire du code

Depuis les travaux réalisés sur les docstrings, il ne serait plus juste
d'utiliser ce document pour conclure que "la documentation backend est faible".

Le backend est aujourd'hui bien mieux documenté que lors du premier constat.


### 2. Le document doit être relu après toute grosse évolution API

Si `Rap_app.yaml` ou la doc visible dans :

- `/api/docs/`
- `/api/redoc/`
- `/api/schema/`

si le schéma n'est pas régénéré après de futurs changements, ce document peut
redevenir partiellement dépassé.


## Priorités réalistes pour la suite

Le gros chantier OpenAPI est désormais fermé.

La suite utile, plus tard, sera plutôt :

1. relire les libellés les plus visibles si une cible de doc publique plus
   éditoriale est souhaitée ;
2. regénérer et revalider le schéma après toute grosse refonte d'API ;
3. garder le hook `spectacular` comme point central de normalisation.


## Verdict

Le diagnostic initial a été utile pour cadrer le problème, puis le chantier a
été refermé.

La réalité actuelle est la suivante :

- le backend est désormais bien documenté côté code ;
- le schéma OpenAPI généré est maintenant valide et homogénéisé
  structurellement ;
- le chantier restant éventuel n'est plus un rattrapage, mais un polissage
  éditorial si tu souhaites une doc publique encore plus travaillée.

Formulation synthétique recommandée :

> Le socle documentaire backend est solide et la documentation OpenAPI générée
> est désormais validée et homogénéisée structurellement.
