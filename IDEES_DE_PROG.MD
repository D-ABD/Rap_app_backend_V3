
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
Intégration d’une IA très légère, locale et strictement limitée aux données de l’application
Objectif

L’objectif est d’intégrer dans l’application une IA conversationnelle très légère, capable de répondre sous forme de chat à partir des seules données internes de l’application, sans accès au web, sans connaissances extérieures, et sans comportement de chatbot généraliste.

Cette IA devra être pensée comme un assistant métier interne, et non comme une intelligence artificielle ouverte sur le monde.

Le fonctionnement attendu est le suivant :

l’utilisateur pose une question dans un chat,

le backend récupère les données pertinentes de l’application,

le modèle génère une réponse uniquement à partir de ce contexte,

le frontend affiche le texte,

ce texte peut ensuite être lu à voix haute côté interface via la synthèse vocale du navigateur, en utilisant l’API SpeechSynthesis du Web Speech API.

L’objectif est donc de créer une IA légère, privée, contrôlée et orientée métier, compatible avec une infrastructure modeste, notamment un VPS de 4 Go de RAM.

Vision générale

Cette fonctionnalité ne doit pas reposer sur un gros modèle hébergé à distance, ni sur une IA généraliste connectée à Internet.

L’idée est d’utiliser un petit modèle local ou auto-hébergé, exécuté via un moteur d’inférence léger comme llama.cpp, dont l’objectif est précisément de permettre l’inférence locale ou cloud avec une configuration minimale ; son écosystème inclut aussi un serveur HTTP pour exposer le modèle.

L’IA ne devra jamais répondre “de sa propre culture générale”.
Elle devra fonctionner selon une logique stricte :

récupérer les données utiles dans l’application,

injecter ces données comme contexte,

répondre uniquement à partir de ce contexte,

refuser de répondre si l’information n’existe pas dans l’application.

Cette approche est plus proche d’un assistant documentaire métier que d’un chatbot universel.

Contraintes fonctionnelles

Le système devra respecter les contraintes suivantes :

aucune ouverture vers l’extérieur

aucune réponse basée sur des connaissances web

aucune invention hors périmètre

aucune autonomie libre

aucune utilisation comme IA généraliste

L’IA devra être limitée à des usages tels que :

résumer une fiche ou un dossier

expliquer des données présentes dans l’application

répondre à des questions sur un candidat, une prospection, une formation ou un objet métier

reformuler des informations internes

guider l’utilisateur dans la lecture de données déjà présentes

aider à retrouver des éléments enregistrés dans l’application

En revanche, elle ne devra pas :

donner des réponses de culture générale

répondre à des questions hors métier

inventer une information absente

aller chercher des informations sur Internet

agir comme assistant personnel généraliste

Architecture cible
1. Couche de données applicatives

Le backend reste la source de vérité.
L’IA n’accède jamais directement à “tout” de manière brute.

Le backend doit d’abord :

identifier l’utilisateur

vérifier ses permissions

sélectionner les données autorisées

construire un contexte propre et limité

envoyer seulement ce contexte au modèle

Ainsi, le modèle ne voit que :

les données utiles à la question

les données que l’utilisateur a le droit de consulter

un volume de texte maîtrisé

Cela permet de garder le contrôle sur la sécurité, la confidentialité et la pertinence.

2. Couche d’orchestration backend

Le backend devra jouer le rôle de contrôleur d’IA.

Il devra :

recevoir la question utilisateur

détecter l’objet métier concerné

récupérer les données pertinentes

construire le prompt système

injecter le contexte

appeler le moteur local

nettoyer la réponse

renvoyer le texte au frontend

Le backend devra aussi imposer des règles strictes au modèle, par exemple :

répondre uniquement avec les données fournies

dire clairement quand l’information est absente

ne jamais compléter par connaissance externe

ne jamais inventer

Le backend devient donc le véritable garant du comportement de l’IA.

3. Couche moteur LLM léger

Le moteur visé est une exécution locale ou auto-hébergée d’un petit modèle quantifié.

Le choix le plus cohérent est d’utiliser llama.cpp, qui est justement conçu pour exécuter des modèles avec peu de ressources et inclut un serveur HTTP léger.

Compte tenu d’un VPS de 4 Go, il faut viser un modèle très compact.
Parmi les familles adaptées aux petits environnements, on trouve notamment :

SmolLM2, disponible en 135M, 360M et 1.7B paramètres, présenté comme une famille compacte pensée pour des usages légers et on-device.

Qwen2.5 0.5B Instruct, qui existe dans un format léger et se trouve aussi en déclinaisons GGUF adaptées aux moteurs locaux.

Dans ce contexte, l’idée n’est pas de rechercher une IA “puissante”, mais une IA :

suffisamment petite pour tourner sur le VPS,

suffisamment stable pour reformuler et résumer,

suffisamment contrôlable pour rester dans le périmètre métier.

Orientation technique recommandée
Option 1 — IA minimale utile

Mettre en place un petit modèle local capable de :

reformuler

résumer

répondre brièvement à partir du contexte fourni

Cette option vise une expérience simple et réaliste pour un VPS de 4 Go.

Le modèle est utilisé comme un moteur de génération encadré, pas comme une base de connaissance autonome.

Option 2 — Recherche interne + LLM léger

Le backend effectue d’abord une recherche dans les données de l’application :

champs métier

textes enregistrés

notes

objets liés

historiques utiles

Ensuite, seuls les extraits les plus pertinents sont envoyés au modèle.

Cette approche permet :

de réduire la mémoire utilisée

de réduire le nombre de tokens

d’améliorer la précision

de limiter les hallucinations

C’est probablement l’approche la plus saine.

Option 3 — Chat sans LLM au départ, puis ajout progressif

Une première version peut être construite comme un chat métier “assisté” :

recherche interne

templates de réponse

résumé simple

ton conversationnel

Puis, dans un second temps, ajouter le petit modèle local.

Cette stratégie permet de sortir une version utile rapidement, sans surcharger l’infrastructure.

Blocage strict aux données de l’application

Le point essentiel du projet est le verrouillage métier.

L’IA ne doit pas avoir de liberté de réponse en dehors du contexte fourni.

Pour cela, plusieurs mécanismes devront être combinés :

1. Prompt système strict

Le modèle devra recevoir une consigne permanente du type :

tu es un assistant interne de l’application

tu réponds uniquement avec le contexte fourni

tu ne dois jamais utiliser de connaissances extérieures

si l’information n’est pas dans le contexte, tu dis que tu ne sais pas

tu ne dois jamais inventer

2. Contexte limité

Le backend ne doit transmettre que :

les données autorisées

les données utiles

les données de l’objet concerné

Le modèle ne doit jamais recevoir un dump incontrôlé de la base.

3. Refus automatique hors périmètre

Si la question est de type :

culture générale

actualité

demande externe

question sans rapport avec les données de l’application

alors le système doit répondre par un refus clair, par exemple :

Je peux répondre uniquement à partir des données présentes dans l’application.

4. Filtrage par permissions

L’IA ne doit jamais contourner les permissions applicatives.

Un utilisateur ne doit pouvoir obtenir via le chat que ce qu’il a déjà le droit de voir dans l’application.

Le backend doit donc appliquer les mêmes règles de sécurité que les endpoints classiques.

Conversion du texte en parole côté frontend

Le texte généré par l’IA pourra être lu à voix haute côté frontend.
La solution la plus légère consiste à utiliser directement la synthèse vocale du navigateur via SpeechSynthesis, fournie par le Web Speech API. MDN documente cette interface ainsi que son usage général pour la synthèse vocale, et les tableaux de compatibilité montrent une prise en charge largement disponible selon les navigateurs.

Cette approche présente plusieurs avantages :

pas de moteur TTS lourd à héberger

pas de coût serveur supplémentaire

intégration simple côté React

lecture immédiate du texte affiché dans le chat

Le frontend pourra donc :

afficher la réponse texte,

proposer un bouton “Lire”,

déclencher la lecture vocale locale du navigateur.

Intérêt pour l’application

Cette fonctionnalité apporterait plusieurs bénéfices :

rendre l’application plus intuitive

offrir un accès conversationnel aux données métier

faciliter la compréhension des dossiers complexes

améliorer l’accessibilité grâce à la lecture vocale

créer une expérience moderne sans dépendre d’un gros service externe

valoriser les données déjà présentes dans l’application

L’utilisateur n’a plus seulement des fiches et des listes ; il peut aussi interroger l’application en langage naturel.

Contraintes d’infrastructure

Le projet doit être pensé pour un VPS 4 Go, ce qui impose des limites fortes.

Cela implique :

éviter les gros modèles

privilégier les petits modèles quantifiés

limiter le nombre de tokens envoyés

limiter la longueur des réponses

éviter les traitements parallèles lourds

réserver le modèle à des tâches courtes et ciblées

Dans ce cadre, il est préférable de voir le LLM comme un micro-moteur de reformulation et de synthèse, pas comme une IA universelle.

Approche progressive recommandée
Phase 1

Mettre en place un chat métier simple :

interface de chat

récupération des données internes

réponses encadrées

bouton de lecture vocale dans le frontend

Phase 2

Ajouter un petit modèle local pour :

reformuler

résumer

répondre plus naturellement

Phase 3

Améliorer la recherche de contexte :

meilleure sélection des données

meilleurs extraits

meilleure structuration des prompts

Phase 4

Ajouter des usages métier plus avancés :

résumé automatique de dossier

aide à la saisie

explication d’un profil

synthèse de suivi

assistance conversationnelle contextualisée

Ce qui n’est pas recherché

Le projet ne vise pas à créer :

un ChatGPT interne généraliste

une IA connectée au web

une IA omnisciente

un agent autonome

un système lourd nécessitant une grosse machine

Le but est de construire une IA sobre, locale, contrôlée, utile et réaliste.

Vision long terme

À terme, cette brique pourrait devenir un véritable assistant métier interne de l’application.

Il pourrait :

répondre sur les objets métier

résumer les dossiers

guider les utilisateurs

expliquer les informations stockées

lire vocalement les réponses

améliorer l’ergonomie générale sans sortir du périmètre applicatif

L’ambition n’est donc pas de créer une IA “impressionnante”, mais une IA :

fiable

légère

privée

sécurisée

adaptée au métier

compatible avec une petite infrastructure

Direction retenue

La direction souhaitée est la suivante :

chat métier intégré dans l’application

petit LLM local ou auto-hébergé

moteur léger de type llama.cpp

modèle compact compatible petite infra

réponses strictement limitées aux données de l’application

aucune connaissance extérieure

synthèse vocale côté React à partir du texte renvoyé

architecture progressive et maîtrisée