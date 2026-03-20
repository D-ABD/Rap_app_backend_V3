# Plan Global De Refonte Statuts, Automatisation Et Conformite

## 1. Objectif

Faire evoluer le backend vers une logique metier plus fiable autour du cycle candidat -> inscrit -> stagiaire, avec :

- statuts derives des faits metier au lieu de saisies disperses
- champs critiques en lecture seule quand ils sont calculables
- transitions explicites via services/endpoints dedies
- statistiques et reporting aligns sur la meme source de verite
- actions de masse pour les operations recurrentes
- durcissement RGPD sur la creation et la gestion des donnees personnelles

## 2. Ce qui existe deja

### 2.1 Candidat

Le modele [`rap_app/models/candidat.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/candidat.py) porte deja plusieurs pieces du cycle metier :

- `statut` avec des valeurs larges : `att_entretien`, `att_rentee`, `att_commission`, `accompagnement`, `appairage`, `formation`, `abandon`, `autre`
- `formation`
- `admissible`
- `date_rentree`
- `courrier_rentree`
- `inscrit_gespers`
- `entretien_done`
- `test_is_ok`
- `compte_utilisateur`
- `demande_compte_statut`
- snapshot placement : `placement_appairage`, `entreprise_placement`, `resultat_placement`, etc.

### 2.2 Utilisateur

Le modele [`rap_app/models/custom_user.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/custom_user.py) porte deja des roles metier distincts :

- `stagiaire`
- `candidat`
- `candidatuser`
- roles staff/admin

Il porte aussi un consentement RGPD minimal :

- `consent_rgpd`
- `consent_date`

### 2.3 Formations

Le modele [`rap_app/models/formations.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/formations.py) porte deja plusieurs indicateurs persistants :

- `inscrits_crif`
- `inscrits_mp`
- `entree_formation`
- `nombre_candidats`
- `nombre_evenements`

`nombre_candidats` est maintenant recalcule automatiquement via [`rap_app/signals/formation_candidats_signals.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/signals/formation_candidats_signals.py).

### 2.4 Services

Il existe deja une vraie base de services explicites :

- [`rap_app/services/candidate_account_service.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/candidate_account_service.py)
- [`rap_app/services/prospection_ownership_service.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/prospection_ownership_service.py)
- [`rap_app/services/placement_services.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/placement_services.py)

Le projet a donc deja un precedent sain : la logique metier critique peut vivre dans des services et non dans des saisies manuelles ou des signaux implicites.

### 2.5 Bulk operations et reporting

Il existe deja des premiers points d'appui :

- ateliers TRE : `add-candidats` / `remove-candidats` dans [`rap_app/api/viewsets/atelier_tre_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/atelier_tre_viewsets.py)
- actions admin de masse sur candidats et prospections dans [`rap_app/admin/candidat_admin.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/admin/candidat_admin.py) et [`rap_app/admin/prospection_admin.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/admin/prospection_admin.py)
- module rapport avec stockage JSON dans [`rap_app/models/rapports.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/rapports.py)
- viewsets statistiques candidats/formations/prospections deja en place

## 3. Incoherences et ambiguities actuelles

### 3.1 Le statut candidat est a la fois metier et editorial

`Candidat.statut` sert aujourd'hui a representer plusieurs niveaux differents :

- etat de recrutement
- etat d'inscription
- etat de parcours formation
- etat de suivi placement

Le meme champ melange donc des phases differentes du cycle de vie.

### 3.2 La verite est dispersee entre plusieurs champs

Le fait d'etre "en formation" ou "inscrit" peut aujourd'hui se deduire de plusieurs signaux faibles :

- `candidat.formation_id`
- `candidat.statut == formation`
- `custom_user.role == stagiaire`
- `date_rentree`
- `admissible`
- `inscrit_gespers`
- `formation.start_date/end_date`

Le risque est fort d'avoir des etats incompatibles, par exemple :

- candidat avec formation renseignee mais statut non coherent
- utilisateur role `stagiaire` sans situation formation exploitable
- candidat `en formation` alors que la session n'a pas commence
- inscrit CRIF/MP saisi sur la formation sans lien direct avec des candidats concrets

### 3.3 Des compteurs formation restent semi-manuels

`nombre_candidats` est maintenant fiabilise, mais pas :

- `entree_formation`
- `inscrits_crif`
- `inscrits_mp`

Or ces champs nourrissent les serializers, exports et stats formation.

### 3.4 Le role utilisateur et le statut candidat ne sont pas clairement articules

Le code traite deja `stagiaire` comme un role de compte, mais pas comme une phase metier calculee unique.

Resultat :

- le front peut voir un role `stagiaire`
- le candidat peut avoir un `statut` different
- les stats peuvent compter autre chose

### 3.5 Les stats reposent encore sur des champs heterogenes

Les viewsets de stats candidats et formations lisent des champs persistants et des flags metier sans couche unifiee de "phase parcours".

Ca rend fragile :

- les KPI d'inscription
- les KPI d'entree en formation
- les tableaux de suivi par centre/session
- les rapports type "suivi des statuts"

### 3.6 RGPD partiellement couvert seulement

Le projet couvre deja :

- consentement utilisateur de base
- anonymisation a la suppression de compte
- consentements CV specifiques dans la CVTheque

Mais il manque une couche complete pour les fiches candidats creees par un admin :

- base legale explicite
- tracabilite du mode de collecte
- politique de notification
- minimisation de certains champs sensibles
- statut du consentement candidat independant du seul `CustomUser`

## 4. Principe cible recommande

### 4.1 Separer phase de parcours et role de compte

Source de verite recommandee :

- `role utilisateur` = capacite de connexion et type de compte
- `phase de parcours candidat` = etat metier du candidat

Le role `stagiaire` peut rester, mais il doit etre aligne sur une phase metier claire.

### 4.2 Introduire une machine de transition simple

Cycle cible recommande :

1. `postulant`
2. `inscrit_valide`
3. `stagiaire_en_formation`
4. `sorti` ou `abandon`

Eventuellement, conserver des sous-etats operationnels separes :

- `attente_entretien`
- `attente_commission`
- `attente_rentree`
- `appairage`

Mais ils ne doivent plus concurrencer l'etat formation principal.

### 4.3 Avoir un etat principal calcule ou derive

Recommendation forte :

- garder un champ persistant de phase principale si besoin de reporting stable
- mais le faire piloter uniquement par des services de transition
- exposer aussi un champ calcule explicatif derive des faits

En pratique :

- `parcours_phase` persistant et pilote
- `parcours_phase_calculee` en lecture seule pour audit/coherence

Si les deux divergent, lever une alerte metier.

## 5. Automatismes a mettre en place

### 5.1 Automatiser l'inscription validee

Le statut "inscrit valide" ne devrait plus etre une simple saisie libre.

Il devrait etre derive d'un ensemble minimal de conditions, a valider metierement. Au vu du code actuel, les meilleurs candidats sont :

- `formation` renseignee
- candidat non abandonne
- validation administrative explicite
- eventuellement `admissible == True`

Recommendation :

- creer une transition explicite `validate_inscription(candidate, formation, actor)`
- cette transition positionne la phase principale
- elle journalise l'action
- elle met a jour les compteurs formation derives

### 5.2 Automatiser le passage stagiaire / en cours de formation

Le statut "stagiaire" doit devenir la traduction d'un fait objectif :

- candidat affecte a une formation
- formation commencee
- candidat non sorti/non abandonne

Recommendation :

- transition explicite `start_formation(candidate, actor)`
- ou calcul derive base sur `formation.start_date <= today <= formation.end_date`

Le choix depend de ton besoin :

- si tu veux un etat historique stable meme en cas de changement calendrier : transition persistante
- si tu veux une pure lecture du planning : calcul derive

Le meilleur compromis est :

- phase persistante changee par service
- drapeau derive `is_en_formation_now`

### 5.3 Automatiser l'alignement role utilisateur

Quand la phase principale devient `stagiaire_en_formation`, le compte associe doit etre aligne automatiquement :

- role `stagiaire` si compte existe
- provisioning ou liaison si necessaire selon les regles du projet

Cette logique doit vivre dans un service de transitions candidat, pas dans l'admin, ni dans le serializer, ni dans un signal implicite.

### 5.4 Automatiser les compteurs formation

Doivent devenir calcules automatiquement :

- `nombre_candidats` : deja fait
- `entree_formation`
- `inscrits_crif`
- `inscrits_mp` si ces colonnes doivent rester

Point critique :

`inscrits_crif` et `inscrits_mp` ne sont pas directement deduisibles tant qu'il n'existe pas un rattachement clair du financement au candidat. Si la source de verite est encore uniquement session-level, il faut clarifier le besoin metier avant automatisation complete.

Recommendation :

- soit ajouter un champ de financement au candidat
- soit assumer que `inscrits_crif/mp` restent des compteurs session saisis
- mais ne pas melanger ces deux modeles

### 5.5 Automatiser la normalisation des textes

Ce qui existe deja :

- trim/lower sur email
- normalisation NIR
- un peu de normalisation nom/prenom

Ce qu'il faut ajouter :

- service de normalisation texte francophone sur les champs libres non sensibles
- normalisation douce, pas correction destructive silencieuse

Recommendation :

- normaliser automatiquement :
  - espaces multiples
  - capitalisation de base sur nom/prenom/ville
  - ponctuation simple
- proposer une correction suggeree pour :
  - `notes`
  - `commentaires`
  - `origine_sourcing`
  - `titre`/`libelles`

Ne pas corriger automatiquement sans trace :

- contenu juridique
- champs contractuels
- champs saisis pour preuve

## 6. Champs a calculer automatiquement

### 6.1 Candidat

A introduire ou exposer en lecture seule :

- `parcours_phase_calculee`
- `is_inscrit_valide`
- `is_en_formation_now`
- `is_stagiaire_role_aligned`
- `has_compte_utilisateur`
- `has_consentement_candidat_valide`

### 6.2 Formation

A calculer ou rederive :

- `nombre_candidats`
- `nombre_inscrits_valides`
- `nombre_stagiaires_en_cours`
- `taux_entree_formation`
- `taux_transformation_postulant_vers_inscrit`
- `taux_transformation_inscrit_vers_stagiaire`

### 6.3 Stats

Les stats ne devraient plus recalculer la logique metier de facon ad hoc. Elles devraient consommer :

- une phase principale fiabilisee
- des flags derives standardises

## 7. Champs a passer en lecture seule

Sous reserve de validation metier, devraient sortir des champs librement modifiables :

- `Candidat.statut`
  - ou au minimum etre remplace par une phase pilotee
- `admissible`
  - si ce statut correspond a une decision metier explicite, le garder seulement via transition
- `date_rentree`
  - si elle doit etre heritee de la formation/session
- `courrier_rentree`
  - si ce champ doit etre derive d'un workflow de notification
- `entree_formation` sur `Formation`
- `nombre_candidats` sur `Formation`

Doivent rester modifiables seulement via actions metier explicites :

- validation inscription
- entree en formation
- abandon
- sortie

## 8. Nouveaux champs recommandes

### 8.1 Sur Candidat

- `parcours_phase`
- `parcours_phase_updated_at`
- `parcours_phase_updated_by`
- `date_validation_inscription`
- `date_entree_formation_effective`
- `date_sortie_formation`
- `motif_sortie`
- `financeur_parcours` si besoin de rederiver `inscrits_crif/mp`
- `consentement_candidat_rgpd`
- `consentement_candidat_date`
- `source_creation_donnees`
  - admin
  - auto-inscription
  - import
  - synchronisation
- `base_legale_traitement`
- `notification_creation_envoyee_le`

### 8.2 Sur Formation

- aucun nouveau champ obligatoire si les agregats sont derives proprement
- eventuellement `nombre_inscrits_valides_cache` et `nombre_stagiaires_cache` si besoin perf/reporting

## 9. Impacts techniques par couche

### 9.1 Models

Refonte cible :

- clarifier la semantique de `Candidat.statut`
- ajouter les champs de phase et de traçabilité
- limiter les compteurs session saisis a ceux qui ne sont pas vraiment calculables

### 9.2 Services

Il faut introduire un vrai service de cycle candidat, par exemple :

- `CandidateLifecycleService`

Responsabilites :

- valider une inscription
- demarrer une formation
- sortir de formation
- abandonner
- resynchroniser role utilisateur
- recalculer les compteurs formation impactes
- journaliser

Ce service doit devenir la seule porte d'entree des transitions metier.

### 9.3 Signals

Recommendation :

- garder les signaux seulement pour des recalculs simples ou de l'audit
- ne pas y remettre la source de verite des transitions de statut

Bon usage :

- recalcul compteur
- creation d'historique technique
- invalidation cache

Mauvais usage :

- decision metier de changement de phase

### 9.4 Serializers

Les serializers candidat doivent :

- exposer la phase principale et les flags derives
- rendre en read-only les champs calcules
- interdire les updates directes sur les champs pilotes

Il faut separer :

- champs d'etat lisibles
- endpoints de transition

### 9.5 Viewsets

Les viewsets doivent exposer :

- lecture du candidat/formation
- transitions explicites
- bulk transitions

Pas de logique metier lourde dans `validate()` ou `perform_update()` hors appels service.

### 9.6 Permissions

A preciser par transition :

- qui peut valider une inscription
- qui peut demarrer une formation
- qui peut sortir/abandonner
- qui peut faire des bulk actions

Recommendation :

- staff de centre : transitions dans son perimetre
- admin-like : global
- candidat/stagiaire : lecture seule sur les phases, jamais ecriture directe

### 9.7 Admin

L'admin candidat actuel contient des actions de masse qui ecrivent directement `statut`, `cv_statut`, `admissible`, etc.

Il faudra :

- remplacer les actions directes par appels au service de lifecycle
- supprimer les actions qui permettent de forcer un etat incoherent

## 10. Endpoints cibles recommandes

### 10.1 Transitions unitaires

- `POST /api/candidats/{id}/validate-inscription/`
- `POST /api/candidats/{id}/start-formation/`
- `POST /api/candidats/{id}/complete-formation/`
- `POST /api/candidats/{id}/abandon/`
- `POST /api/candidats/{id}/reset-phase/` uniquement admin-like si necessaire

### 10.2 Lecture metier

- `GET /api/candidats/{id}/parcours/`
- `GET /api/formations/{id}/candidats-inscrits/`
- `GET /api/formations/{id}/stagiaires/`
- `GET /api/formations/{id}/indicateurs/`

### 10.3 Bulk actions

- `POST /api/candidats/bulk/assign-formation/`
- `POST /api/candidats/bulk/assign-atelier-tre/`
- `POST /api/candidats/bulk/create-prospections/`
- `POST /api/candidats/bulk/validate-inscription/`
- `POST /api/candidats/bulk/start-formation/`
- `POST /api/candidats/bulk/abandon/`

Payload cible :

- `candidate_ids`
- `target_id` ou payload metier
- `dry_run`
- `reason` optionnel

Reponse cible :

- `success`
- `message`
- `data.summary`
- `data.succeeded_ids`
- `data.failed`

### 10.4 Filtres et choices

Il faut ajouter des filtres metier stables :

- `parcours_phase`
- `is_inscrit_valide`
- `is_en_formation_now`
- `formation_status_window`

## 11. Bulk actions metier recommandees

### 11.1 Ateliers TRE

L'existant est deja bon point de depart :

- `add-candidats`
- `remove-candidats`

Il manque :

- endpoint bulk depuis la liste candidats
- mode `dry_run`
- retour detaille par candidat

### 11.2 Formations

A ajouter :

- affectation en lot a une formation
- validation en lot de l'inscription
- entree en formation en lot

### 11.3 Prospections

A ajouter :

- creation de prospections en lot a partir d'une selection de candidats
- choix du partenaire/modele de prospection
- option "owner automatique"

### 11.4 Autres objets pertinents

Possibles ensuite :

- evenements
- appairages
- campagnes de relance
- notifications

## 12. Impacts sur les statistiques

### 12.1 Candidat stats

Le viewset stats candidats doit migrer d'une logique "champs bruts heterogenes" vers :

- groupement par `parcours_phase`
- KPI par transition
- KPI par centre, formation, financeur

KPIs recommandes :

- nb postulants
- nb inscrits valides
- nb stagiaires en cours
- nb abandons
- taux de conversion postulant -> inscrit
- taux de conversion inscrit -> stagiaire
- delai moyen entre creation et validation inscription
- delai moyen entre validation et entree en formation

### 12.2 Formation stats

Les stats formation doivent distinguer clairement :

- capacite session
- inscrits valides
- presents/en cours
- sortis

Et ne plus melanger :

- compteurs saisis session
- candidats reels lies

## 13. Reporting

Le module rapport actuel est surtout un conteneur de rapports filtres.

Il faut lui ajouter une logique metier plus claire :

- rapports de cycle candidat
- rapports par session
- rapports d'entree en formation
- rapports d'abandon
- rapports d'activite staff

Exports a fournir :

- PDF
- XLSX
- CSV
- version imprimable HTML

Le plus sain est de creer une couche de "report builders" par type de rapport, plutot que d'entasser la logique dans le viewset.

## 14. Normalisation linguistique

### 14.1 Ce qu'il faut faire

- normalisation automatique non destructive a l'ecriture
- correction suggeree ou batch de nettoyage sur les textes libres
- dictionnaire metier minimal pour les termes frequents

### 14.2 Ce qu'il faut eviter

- reecrire silencieusement des notes sensibles
- corriger des champs preuve/juridiques sans trace
- coupler la correction a une dependance externe instable sans fallback

### 14.3 Architecture recommandee

- `TextNormalizationService`
- mode `normalize_only`
- mode `suggest_only`
- journalisation des corrections appliquees

## 15. RGPD et conformite

### 15.1 Risques actuels

- consentement surtout pense pour `CustomUser`, pas pour une fiche candidat creee par admin
- beaucoup de donnees personnelles candidates dans `Candidat`
- pas de modele explicite de base legale ni de notification de creation de fiche
- minimisation insuffisamment visible pour les creations staff

### 15.2 Ajouts recommandes

Pour toute creation manuelle de fiche candidat :

- `source_creation_donnees`
- `base_legale_traitement`
- `consentement_candidat_rgpd`
- `consentement_candidat_date`
- `notice_information_envoyee`
- `notice_information_envoyee_le`

### 15.3 Regles recommandees

- minimiser les champs obligatoires a la creation
- rendre les champs sensibles progressifs
- journaliser qui a cree la fiche et pourquoi
- prevoir une politique d'anonymisation/retention pour les candidatures inactives
- separer consentement compte utilisateur et consentement traitement candidature

## 16. Roadmap recommandee

### Phase 1. Clarification metier

- valider le cycle cible exact
- figer les definitions :
  - postulant
  - inscrit valide
  - stagiaire
  - sorti
  - abandon
- decider si `inscrits_crif/mp` sont derives ou restent saisis

### Phase 2. Socle modele et service

- ajouter les champs de phase et de traçabilité
- creer `CandidateLifecycleService`
- centraliser toutes les transitions

### Phase 3. Verrouillage API et admin

- rendre les champs calcules read-only
- exposer les endpoints de transition
- remplacer les actions admin directes par des actions service

### Phase 4. Bulk actions

- endpoints de bulk standardises
- `dry_run`
- reporting d'erreurs par ligne

### Phase 5. Stats et reporting

- basculer les stats sur la phase metier fiabilisee
- ajouter les nouveaux agrégats
- introduire les report builders

### Phase 6. RGPD et qualite de donnees

- modele de consentement candidat
- base legale et source de collecte
- normalisation texte
- retention/anonymisation

## 17. Priorites fortes

### P0

- clarifier la source de verite du statut formation
- sortir les transitions du champ libre `Candidat.statut`
- ne plus permettre des mises a jour incoherentes depuis admin/API

### P1

- ajouter `parcours_phase`
- creer `CandidateLifecycleService`
- rendre read-only les champs derives
- aligner stats candidats/formations

### P2

- bulk actions formations/TRE/prospections
- reporting metier structure
- normalisation texte

### P3

- raffinements UX admin/front
- suggestions linguistiques plus avancees
- automatisations secondaires

## 18. Conclusion

L'application contient deja beaucoup de pieces utiles, mais la logique de statut autour des formations reste aujourd'hui trop dispersee entre :

- `Candidat.statut`
- `Candidat.formation`
- `CustomUser.role`
- compteurs de formation
- dates et flags operationnels

La bonne trajectoire n'est pas d'ajouter encore un peu d'automatisme autour du champ actuel, mais de :

1. redefinir une phase metier principale claire
2. centraliser les transitions dans un service
3. rendre les champs derives non editables
4. recabler stats, bulk actions et reporting sur cette meme source de verite
5. renforcer explicitement le cadre RGPD pour les fiches candidats

Ce chantier est parfaitement compatible avec le backend actuel, mais il doit etre mene comme une refonte de workflow, pas comme une simple retouche de serializers.

## 19. Risque De Casse Et Strategie De Migration Sans Rupture

### 19.1 Reponse courte

Oui, ce plan peut casser le backend ou le front actuel si la refonte est faite en remplacement direct.

Non, il ne devrait pas casser l'existant si on l'exécute de façon progressive, avec une couche de compatibilité.

### 19.2 Ce qui casserait en mode big bang

Les zones les plus sensibles sont :

- `Candidat.statut`
- les serializers candidat et formation
- les filtres API qui attendent les valeurs actuelles
- les viewsets de statistiques
- les actions admin qui écrivent aujourd'hui directement certains champs
- les compteurs de formation déjà utilisés dans l'API et les exports
- le front, s'il lit directement les champs et libellés actuels

Exemples de casse probables si on remplace tout d'un coup :

- le front attend `statut=formation` mais le backend ne l'écrit plus
- les stats continuent de grouper sur l'ancien champ alors que la vérité métier a changé
- l'admin force encore des statuts devenus interdits
- les serializers acceptent ou refusent des champs différemment
- certains exports changent de sens sans compatibilité

### 19.3 Strategie recommandee

Il faut appliquer une strategie "additive d'abord, suppressive a la fin".

Principe :

1. ajouter les nouvelles sources de vérité
2. exposer les nouveaux champs sans retirer les anciens
3. migrer les usages internes
4. migrer le front et les stats
5. supprimer ou déprécier l'ancien comportement seulement à la fin

### 19.4 Plan de migration sans casse

#### Phase M1. Ajouter sans remplacer

Objectif :

- introduire les nouveaux champs métier
- ne rien casser côté lecture actuelle

A faire :

- ajouter `parcours_phase`
- ajouter les dates et métadonnées de transition
- ajouter les flags calculés en lecture seule
- conserver `statut` tel quel temporairement

Impact attendu :

- aucun impact frontend obligatoire
- aucun impact sur les endpoints existants si les anciens champs restent présents

#### Phase M2. Introduire les services de transition

Objectif :

- faire passer les nouvelles transitions par une seule couche métier

A faire :

- créer `CandidateLifecycleService`
- ajouter les endpoints de transition
- brancher l'admin et les viewsets dessus
- ne pas encore supprimer les anciens champs

Impact attendu :

- faible si les endpoints existants restent inchangés
- le nouveau front peut commencer à consommer la logique cible

#### Phase M3. Exposer la double lecture

Objectif :

- permettre au front et aux stats de migrer sans rupture

A faire :

- garder `statut`
- exposer `parcours_phase`
- exposer `parcours_phase_calculee`
- documenter clairement :
  - ancien champ encore supporté
  - nouveau champ recommandé

Impact attendu :

- pas de casse si le front continue à lire l'ancien champ
- possibilité de migration progressive écran par écran

#### Phase M4. Migrer les statistiques et les rapports

Objectif :

- recâbler le reporting sans casser les usages courants

A faire :

- ajouter de nouveaux agrégats basés sur `parcours_phase`
- conserver temporairement les agrégats historiques
- comparer les résultats avant bascule complète

Impact attendu :

- pas de rupture si on garde l'ancien reporting le temps de valider le nouveau

#### Phase M5. Durcir les écritures

Objectif :

- empêcher les incohérences futures

A faire :

- rendre read-only les champs désormais calculés
- empêcher l'écriture directe de `statut` si remplacé par la phase
- retirer les actions admin dangereuses

Impact attendu :

- changement visible côté back-office
- faible impact front si les transitions métier sont déjà branchées

#### Phase M6. Déprécier puis retirer l'ancien comportement

Objectif :

- terminer la migration une fois tout le monde aligné

A faire :

- marquer les anciens champs/valeurs comme dépréciés
- supprimer les usages résiduels
- nettoyer les serializers, filtres et stats

Impact attendu :

- à faire seulement quand le front et les outils d'exploitation sont déjà migrés

### 19.5 Regles de sécurité de migration

Pour éviter la casse, il faut imposer ces règles :

- ne jamais supprimer un champ lu par le front avant migration explicite
- ne jamais changer silencieusement le sens métier d'un champ existant
- ne jamais migrer stats + serializers + admin dans le même lot sans tests ciblés
- ne jamais faire reposer la nouvelle vérité métier sur un signal implicite seul
- toujours garder une période de coexistence entre ancien et nouveau contrat

### 19.6 Compatibilité backend

Le backend actuel peut absorber cette refonte si :

- les nouveaux champs sont ajoutés sans casser les anciens serializers
- les services deviennent la nouvelle source de vérité
- les anciens champs restent exposés tant que le front n'est pas migré

Conclusion backend :

- oui, faisable sans casse
- non, pas en remplacement brutal

### 19.7 Compatibilité front

Le front actuel ne devrait pas casser si :

- on garde les anciens champs de réponse
- on ajoute les nouveaux champs à côté
- on documente quel champ est désormais recommandé
- on bascule les écrans progressivement

Conclusion front :

- oui, migration possible sans rupture
- non, pas si on remplace immédiatement les anciens champs ou libellés

### 19.8 Recommandation finale

La bonne exécution est une migration progressive en compatibilité ascendante.

Autrement dit :

- additive d'abord
- migration des usages ensuite
- verrouillage des anciennes écritures après validation
- suppression finale seulement en toute fin

Si cette discipline est respectée, la refonte peut rendre l'application plus intelligente sans casser le backend ni le front actuel.
