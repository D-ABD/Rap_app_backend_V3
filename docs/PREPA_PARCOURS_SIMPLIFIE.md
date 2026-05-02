🧠 Module Prépa — attentes fonctionnelles clarifiées
1. Périmètre — ce qui ne change pas
🔒 Prépa IC

Prépa IC reste strictement inchangé :

fonctionnement actuel conservé
logique métier conservée
écrans conservés
🔒 Objectifs

Le module Objectifs reste également inchangé :

aucune modification fonctionnelle
aucune modification UX
aucune dépendance avec le nouveau parcours Prépa
🎯 Périmètre des évolutions

Le travail porte uniquement sur :

les ateliers Prépa
l’inscription des stagiaires aux ateliers
le suivi du parcours stagiaire
les KPI liés aux ateliers et aux stagiaires
2. Principe général

Le module distingue deux objets.

Atelier

Une session collective réelle.

Exemples :

Atelier 1 du 12 mars au centre A
Atelier 5 du 18 mars au centre B
Atelier 6 du 25 mars au centre A

👉 Existe indépendamment des stagiaires

Parcours stagiaire

Le suivi individuel d’une personne.

👉 Construit uniquement à partir de la présence réelle aux ateliers

3. Fonctionnement des ateliers

Un atelier contient :

type : AT1 à AT6
date
centre
commentaire (optionnel)

Statut par stagiaire :

Inscrit
Présent
Absent

👉 Aucun autre statut dans l’atelier

4. Anticipation des ateliers

Possible :

AT1 + AT3 + AT6

👉 Autorisé et utile

Règle :

inscription ≠ progression
seule la présence compte
5. Règles métier
AT1 = obligatoire
AT2 à AT5 = facultatifs
AT6 = fortement recommandé

Parcours possibles :

AT1 → Bilan
AT1 → AT6 → Bilan
AT1 → AT5 → AT6 → Bilan
AT1 → AT2 → AT4 → Bilan
AT1 → abandon → Bilan

👉 Parcours souple et non bloquant

6. Présence réelle = déclencheur
Présent → fait avancer
Absent → ne fait pas avancer
Inscrit → neutre
7. Mise à jour automatique du parcours
Si Présent
EN_ATTENTE_SUITE
Exception :
si l'atelier présent est AT6, le parcours passe en EN_ATTENTE_BILAN
Si Absent
EN_ATTENTE_REPOSITIONNEMENT
Si Inscrit
Aucun impact
8. États du parcours

👉 Statuts (uniquement) :

EN_ATTENTE_DEMARRAGE
EN_ATTENTE_REPOSITIONNEMENT
EN_ATTENTE_SUITE
EN_ATTENTE_BILAN
TERMINE
🔹 Résultats de parcours (issus du bilan)
ORIENTE_AFPA
ABANDON
AUTRE_SORTIE

👉 Ce ne sont pas des statuts, mais des issues
👉 L'orientation se renseigne uniquement à la fin, au moment du bilan

🔹 Données d’affichage
historique des ateliers
dernier atelier réalisé
dates

👉 Ce ne sont pas des statuts

9. Inscriptions multiples

Autorisé :

AT1 (absent) → AT1 (présent)

👉 Seule la présence réelle compte

10. Bilan
obligatoire après AT1
non planifié
non anticipé
Déclenchement

Quand :

plus d’atelier prévu
décision métier
abandon
orientation
fin logique
Statuts
EN_ATTENTE_BILAN → TERMINE

Règles explicites :

après AT6 : EN_ATTENTE_BILAN
après abandon : EN_ATTENTE_BILAN
l'orientation n'est jamais renseignée pendant le parcours
l'orientation est renseignée uniquement au bilan
11. Suggestion intelligente

Après AT1 :

principal : décider de la suite

Après AT5 :

principal : proposer AT6

Après AT6 :

principal : proposer bilan

Après absence :

principal : repositionner

Après abandon :

principal : ouvrir le bilan

👉 Toujours une action principale
👉 Jamais bloquant

12. Vue atelier

Afficher :

type
date
centre
inscrits
présents
absents
taux de présence
liste des stagiaires
13. Vue stagiaire

Priorité :

statut du parcours
dernière présence
action suivante

Puis :

historique ateliers
absences
bilan
orientation
14. Formulaire stagiaire

Le formulaire stagiaire doit être prérempli avec le maximum d'informations possible.

Règles de préremplissage :

date d'entrée = date du premier AT1 réellement présent
date de fin = date du bilan
centre prérempli dès que possible
dernier atelier connu prérempli en lecture seule
action suivante préremplie si elle peut être déduite

🔹 Prochain atelier prévu

Le champ doit proposer :

AT1
AT2
AT3
AT4
AT5
AT6
Bilan

🔹 Statut utilisateur

Le champ `positionnement` doit disparaître du formulaire stagiaire.

À la place, l'utilisateur manipule un seul champ `statut`, avec les valeurs visibles suivantes :

en attente de parcours
en parcours
parcours terminé
abandon
en attente prochain atelier
à repositionner

👉 Le formulaire ne doit pas exposer un couple `statut + positionnement`
👉 L'expérience utilisateur doit rester simple, avec un seul niveau de lecture

🔹 Dernière étape

Ajouter un champ en lecture seule :

dernière étape

Exemples :

AT1
AT4
AT6
Bilan
en attente de AT1

🔹 Information collective d'origine

Dans le formulaire stagiaire, l'information collective d'origine doit être sélectionnable via un `select`.

Format de libellé attendu :

IC du 20/04/26 - Meudon

👉 Le libellé doit afficher au minimum :

date de l'IC
nom du centre
📊 14. KPI — STRUCTURE COMPLÈTE
🔹 14.1 KPI IC (inchangé)
Objectif annuel
Reste à faire
Places ouvertes
Prescriptions IC
Taux prescription IC
Présents IC
Taux présence IC
Adhésions IC
Taux adhésion IC
🔹 14.2 Règle objectif

👉 Le compteur démarre sur :

Présents AT1
🔹 14.3 KPI Objectif
Réalisé
AT1 réalisés
Reste à faire vs AT1
Objectif - AT1

👉 KPI principal

Reste à faire vs Adhésions
Objectif - Adhésions IC

👉 KPI d’anticipation

Écart Adhésions → AT1
Adhésions - AT1
Taux transformation IC → Prépa
AT1 / Adhésions
🔹 14.4 KPI Ateliers
Nombre d’ateliers
Répartition par type
Inscrits
Présents
Absents
Taux de présence ateliers
🔹 14.5 KPI Parcours
Pipeline
En attente de démarrage
En attente de repositionnement
En attente de suite
En attente de bilan
Avancement
Parcours commencés (AT1)
Résultats
Nombre de bilans
Transformation vers AFPA
Taux transformation AFPA
Abandon
Taux d’abandon
Qualité
Écart bilans
AT1 réalisés - bilans réalisés
🔹 14.6 KPI complémentaires (option)
Durée moyenne parcours
% AT1 → AT6
% AT1 → abandon
🧠 15. Logique de guidage

L’application peut suggérer :

inscrire à un atelier
repositionner
décider de la suite
passer au bilan

👉 Elle ne doit jamais forcer

🧠 16. Résumé du paradigme
Atelier = session planifiée
Inscription = anticipation
Présence = progression réelle
Absence = repositionnement
AT1 = point d’entrée objectif
Parcours = statut + action
Bilan = décision métier
🧠 En une phrase

Prépa IC et Objectifs restent inchangés.
Le parcours Prépa repose sur des ateliers planifiés, une présence réelle qui déclenche la progression (AT1 = entrée officielle), des statuts simples et actionnables, et un bilan obligatoire décidé au bon moment, avec un pilotage basé sur AT1, les adhésions et les écarts.

Lorsqu’un abandon est décidé, le parcours passe en EN_ATTENTE_BILAN
afin de formaliser la sortie.

Les KPI de suivi du parcours reposent uniquement sur les statuts du parcours,
et non sur des catégories intermédiaires comme "parcours actif".

AT6 → EN_ATTENTE_BILAN (obligatoire)
