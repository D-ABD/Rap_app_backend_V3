# Plan Modif Prepa

## 1. Analyse de l'ecart entre l'existant et la cible

### 1.1 Ce qui existe deja

- `Prepa` couvre deja les `IC` et les `ateliers` dans un modele unique.
- `PrepaStagiaireParticipation` existe deja pour les inscriptions nominatives aux ateliers.
- Le scoping par centre est deja en place dans :
  - `rap_app/api/viewsets/prepa_viewset.py`
  - `rap_app/api/viewsets/stagiaires_prepa_viewsets.py`
- Les routes de production existent deja et doivent rester stables :
  - `/prepa/ic`
  - `/prepa/ateliers`
  - `/prepa/stagiaires`
  - routes create/edit associées
- Les hooks front existent deja :
  - `frontend_rap_app/src/hooks/usePrepa.ts`
  - `frontend_rap_app/src/hooks/useStagiairesPrepa.ts`
  - `frontend_rap_app/src/hooks/usePrepaObjectifs.ts`
- Les ecrans existants couvrent deja :
  - saisie IC
  - saisie ateliers
  - fiche/listing stagiaires
  - dashboard et widgets KPI
- Les stats actuelles existent deja dans `prepa_stats_viewsets.py`.

### 1.2 Ce qui ne colle pas encore a la cible

- Les statuts de participation atelier ne sont pas encore limites a `inscrit / present / absent`.
  L'existant porte aussi `termine` et `a_repositionner` dans `PrepaPresenceStatut`.
- Le parcours stagiaire repose aujourd'hui sur un ancien modele mixte :
  - `statut_parcours` manuel
  - `statut_parcours_calcule`
  - flags booleens `atelier_1_realise ... atelier_6_realise`
  - `prochain_atelier_prevu`
  - `orientation_finale`
- La logique cible demande une machine d'etats plus simple et plus explicite :
  - `EN_ATTENTE_DEMARRAGE`
  - `EN_ATTENTE_REPOSITIONNEMENT`
  - `EN_ATTENTE_SUITE`
  - `EN_ATTENTE_BILAN`
  - `TERMINE`
- La cible separe strictement :
  - statuts de parcours
  - resultat final du bilan
- La cible impose que l'orientation soit renseignee uniquement au bilan.
  L'existant permet encore une saisie plus libre dans `StagiairesPrepaForm.tsx`.
- Le formulaire stagiaire actuel reste trop peu pre-rempli et n'aligne pas encore ses dates sur la logique cible :
  - date d'entree = date du premier AT1 reellement present
  - date de fin = date du bilan
- Le front stagiaire reste tres administratif et expose trop de champs d'un coup.
- Le champ `statut_positionnement` existe encore dans l'existant alors que la cible veut le supprimer du formulaire au profit d'un seul champ `statut` plus lisible pour l'utilisateur.
- Le formulaire stagiaire n'expose pas encore une `derniere etape` en lecture seule ni un `select` simple d'information collective au format `IC du JJ/MM/AA - Centre`.
- Les KPI actuels ne couvrent pas encore proprement la notion de `nombre de bilans`, `ecart bilans`, ou le pipeline base uniquement sur les nouveaux statuts.

### 1.3 Ce qu'il ne faut pas toucher fonctionnellement

- `Prepa IC`
- `Objectifs Prepa`
- les routes publiques existantes
- les permissions existantes
- le scoping par centre
- les ecrans encore utilises tant qu'une alternative compatible n'est pas en place
- les contrats API existants tant qu'un plan de compatibilite n'est pas livre

### 1.4 Risques structurels identifies

- forte dette de compatibilite entre ancien et nouveau modele de parcours
- risque de KPI faux pendant une phase hybride
- risque de double verite entre champs derives et champs sources
- risque de regression front si les enums changent brutalement
- risque de casser les filtres existants du tableau stagiaire
- risque de mauvaise reprise des donnees historiques si la migration ne recalcule pas proprement les statuts

## 2. Strategie globale de transition

- Ne pas remplacer le module actuel en une fois.
- Introduire d'abord les nouvelles regles metier cote backend, en compatibilite avec les donnees existantes.
- Conserver les endpoints existants, en ajoutant si besoin de nouveaux champs/API avant de retirer les anciens.
- Faire converger les ateliers et le parcours vers un moteur unique de recalcul.
- Simplifier l'UI seulement apres stabilisation des regles.
- Livrer le dashboard en dernier, une fois les KPI fiabilises.
- Chaque lot backend doit mettre a jour les docstrings des modeles, services, serializers, viewsets et fonctions KPI modifies.

## 3. Plan par lots

## Lot 0 — Audit detaille et cadrage fonctionnel

- Objectif du lot
  Consolider la cartographie exacte de l'existant et figer les regles cibles avant toute modification.
- Fichiers probables concernes
  `docs/PREPA_PARCOURS_SIMPLIFIE.md`, `rap_app/models/prepa.py`, `rap_app/api/serializers/prepa_serializers.py`, `rap_app/api/viewsets/*.py`, `frontend_rap_app/src/pages/prepa/*`, `frontend_rap_app/src/hooks/*`
- Changements backend
  Aucun changement fonctionnel. Audit et specification.
- Changements frontend
  Aucun.
- Impacts API
  Aucun.
- Impacts DB/migration
  Aucun.
- Impacts UX
  Aucun.
- Tests
  Aucun nouveau test, mais inventaire des tests existants et des trous de couverture.
- Erreurs a anticiper
  Confusion sur les definitions metier de `abandon`, `bilan`, `orientation`, `action suivante`.
- Criteres de validation
  Glossaire valide, machine d'etats cible validee, liste des endpoints impactes connue.
- Risques de regression
  Nuls si le lot reste documentaire.
- Ordre conseille
  Premier lot obligatoire.

## Lot 1 — Nouveau modele metier du parcours en compatibilite

- Objectif du lot
  Introduire les nouveaux statuts et les nouvelles issues sans casser les donnees historiques.
- Fichiers probables concernes
  `rap_app/models/prepa.py`, nouvelles migrations dans `rap_app/migrations/`
- Changements backend
  Ajouter les champs cibles seulement si necessaire, par exemple :
  - `issue_bilan` ou equivalent separee de `statut_parcours`
  - dates de bilan si necessaire
  - eventuellement champ d'action suggeree calculee, non stockee de preference
  - eventuel champ derive ou helper de `derniere_etape`, non stocke de preference
  Privilegier d'abord un statut calcule par service metier, expose en lecture API, plutot qu'un `statut_parcours_v2` stocke en base.
  N'introduire un nouveau champ DB de statut que si un besoin technique reel le justifie apres audit.
  Centraliser les enums cibles et documenter leur sens.
- Changements frontend
  Aucun comportement user pour ce lot.
- Impacts API
  Pas de rupture. Eventuelle exposition read-only de nouveaux champs.
- Impacts DB/migration
  Migration additive uniquement, avec valeurs par defaut compatibles.
  Prevoir une commande ou un script de verification/backfill uniquement pour les champs reellement stockes :
  - `issue_bilan`
  - dates de bilan
  - eventuels champs de sortie
  Le statut courant doit d'abord etre recalcule par le service metier a partir des donnees existantes, afin d'eviter une double verite en base.
- Impacts UX
  Invisibles pour l'utilisateur.
- Tests a creer ou modifier
  Tests modeles de mapping historique vers nouveaux statuts.
- Erreurs a anticiper
  Cas historiques incoherents :
  - `atelier_6_realise=True` mais pas de date
  - `orientation_finale` renseignee sans sortie
  - `abandon` sans bilan formel
- Criteres de validation
  Toutes les donnees existantes migrent sans perte.
  Aucun ecran de prod ne casse apres migration.
- Risques de regression
  Recalcul faux sur anciens stagiaires.
- Ordre conseille
  Apres Lot 0, avant toute simplification d'API ou d'UI.

## Lot 2 — Service metier central de recalcul du parcours

- Objectif du lot
  Sortir la logique de progression du parcours des formulaires et la centraliser cote backend.
- Fichiers probables concernes
  `rap_app/models/prepa.py`, nouveau service metier type `rap_app/services/prepa_parcours.py`, serializers prepa
- Changements backend
  Creer un service unique responsable de :
  - lire les participations `inscrit/present/absent`
  - recalculer le statut de parcours
  - gerer la regle `AT1 = entree officielle`
  - gerer `AT6 -> EN_ATTENTE_BILAN`
  - gerer `abandon -> EN_ATTENTE_BILAN`
  - interdire la progression par simple inscription
  - separer `issue_bilan` du statut de parcours
  - deduire la date d'entree depuis le premier `AT1` reellement present
  - deduire la date de fin depuis le bilan
  - deduire la `derniere_etape`
  Le service metier doit etre la source unique de verite pour :
  - statut courant
  - action suivante recommandee
  - derniere presence reelle
  - derniere etape
  - calculs pipeline utilises par les KPI
  Le service doit etre appele a chaque creation/mise a jour de participation ou de bilan.
- Changements frontend
  Aucun requis.
- Impacts API
  Les reponses peuvent commencer a renvoyer les nouveaux statuts calcules.
- Impacts DB/migration
  Aucun nouveau schema si deja fait au lot 1.
- Impacts UX
  Aucun direct.
- Tests a creer ou modifier
  Tests services metier pour :
  - inscrit ne modifie pas le parcours
  - present AT1 demarre le parcours
  - absent AT1 met en attente de repositionnement
  - absent puis present sur autre AT1
  - present AT5 met en attente de suite
  - present AT6 met en attente de bilan
  - abandon met en attente de bilan
  - bilan passe en termine
- Erreurs a anticiper
  Doubles recalculs ou divergences entre flags historiques et participations nominatives.
- Criteres de validation
  Une seule source de verite pour les regles de parcours.
- Risques de regression
  Incoherence entre anciens champs derives et nouvelle logique.
- Ordre conseille
  Tres tot, avant d'adapter serializers et front.

## Lot 3 — Simplification des statuts de participation atelier

- Objectif du lot
  Faire converger les ateliers vers `inscrit / present / absent` sans casser les donnees existantes.
- Fichiers probables concernes
  `rap_app/models/prepa.py`, `rap_app/api/serializers/prepa_serializers.py`, `frontend_rap_app/src/pages/prepa/PrepaFormAteliers.tsx`, `PrepaInvitesSection.tsx`
- Changements backend
  Conserver temporairement `termine` et `a_repositionner` en compatibilite lecture si necessaire, mais ne plus les produire en ecriture.
  Mapper :
  - `termine` vers `present`
  - `a_repositionner` vers `absent` + effet parcours `EN_ATTENTE_REPOSITIONNEMENT`
- Changements frontend
  Les formulaires atelier n'affichent plus que 3 choix de statut.
- Impacts API
  Ecriture restreinte aux 3 statuts cibles.
  Lecture compatible pendant la transition.
- Impacts DB/migration
  Eventuelle migration de normalisation plus tard, pas obligatoire dans ce lot si compatibilite necessaire.
- Impacts UX
  Formulaire atelier plus lisible.
- Tests a creer ou modifier
  Serializer + API sur mapping et validation des statuts.
- Erreurs a anticiper
  Anciennes lignes contenant `termine` ou `a_repositionner`.
- Criteres de validation
  Un user ne voit plus les anciens statuts dans l'UI.
- Risques de regression
  Filtres historiques `a_reprogrammer` a refaire proprement.
- Ordre conseille
  Apres le moteur de recalcul.

## Lot 4 — API de parcours compatible et explicite

- Objectif du lot
  Exposer une API claire pour le nouveau paradigme sans casser les hooks existants.
- Fichiers probables concernes
  `rap_app/api/serializers/prepa_serializers.py`, `rap_app/api/viewsets/stagiaires_prepa_viewsets.py`, `frontend_rap_app/src/hooks/useStagiairesPrepa.ts`
- Changements backend
  Ajouter dans les serializers des champs cibles explicites :
  - `statut_parcours_courant`
  - `issue_bilan`
  - `derniere_presence_reelle`
  - `derniere_etape`
  - `action_suivante_recommandee`
  - `historique_ateliers`
  - `date_entree_calculee`
  - `date_fin_calculee`
  Conserver les anciens champs le temps de la transition.
- Changements frontend
  Adapter les hooks pour consommer les nouveaux champs sans casser l'ancien rendu.
- Impacts API
  Ajout de champs et eventuels nouveaux filtres.
  Pas de suppression d'anciens champs dans ce lot.
- Impacts DB/migration
  Aucun.
- Impacts UX
  Aucun fort immediat, mais prepare les nouvelles cartes stagiaire.
- Tests a creer ou modifier
  Tests serializers, viewsets, filtres, permissions et scoping centre.
- Erreurs a anticiper
  Champs contradictoires entre ancien et nouveau contrat.
- Criteres de validation
  Les hooks et pages existants continuent de fonctionner.
- Risques de regression
  Filtres cassés sur `statut_parcours_calcule`, `pilotage`, `prochain_atelier_attendu`.
- Ordre conseille
  Apres consolidation backend, avant refonte UI.

## Lot 5 — Ecran ateliers simplifie et oriente action

- Objectif du lot
  Garder l'ecran atelier existant, mais le rendre coherent avec le nouveau parcours.
- Fichiers probables concernes
  `frontend_rap_app/src/pages/prepa/PrepaFormAteliers.tsx`, `PrepaPagesAteliers.tsx`, `PrepaDetailModal.tsx`, composants communs formulaire
- Changements backend
  Aucun majeur hors validation.
- Changements frontend
  Raccourcir le formulaire atelier autour de :
  - type
  - date
  - centre
  - commentaire
  - liste des stagiaires avec statut simple
  Supprimer les messages/metaphores de parcours heredites de l'ancien modele dans ce formulaire.
- Impacts API
  Utilisation des nouveaux champs de statut si besoin dans la liste nominative.
- Impacts DB/migration
  Aucun.
- Impacts UX
  Formulaire plus compact, moins repoussant, action principale claire.
- Tests a creer ou modifier
  Si front tests existants, couvrir affichage des 3 statuts et calculs derivees.
- Erreurs a anticiper
  Cas impossibles :
  - inscription d'un stagiaire termine
  - inscription apres AT6
  - presence sur atelier non autorise
- Criteres de validation
  Atelier create/edit toujours utilisable en production.
- Risques de regression
  Regressions sur comptages `inscrits / presents / absents`.
- Ordre conseille
  Avant la refonte de la fiche stagiaire.

## Lot 6 — Bilan et issues de parcours

- Objectif du lot
  Introduire le bilan comme objet logique distinct de l'atelier et point unique de sortie avant la simplification complete de la fiche stagiaire.
- Fichiers probables concernes
  `rap_app/models/prepa.py` ou nouveau modele si necessaire, serializers/viewsets stagiaire, `StagiairesPrepaForm.tsx` ou future section bilan
- Changements backend
  Encadrer strictement :
  - bilan impossible sans AT1 realise
  - orientation impossible avant bilan
  - `issue_bilan` obligatoire a la cloture
  - `AT6` et `abandon` mettent en `EN_ATTENTE_BILAN`
  Option a arbitrer avant dev :
  - soit bilan reste un bloc sur `StagiairePrepa`
  - soit creation d'un sous-objet `BilanPrepa`
  Pour un premier passage plus sur, garder le bilan dans `StagiairePrepa` est probablement moins risque.
- Changements frontend
  Afficher une section bilan uniquement quand le parcours est en `EN_ATTENTE_BILAN`.
- Impacts API
  Validations explicites et messages d'erreur propres.
- Impacts DB/migration
  Eventuelle migration additive sur les champs bilan.
- Impacts UX
  Sortie du parcours beaucoup plus claire.
- Tests a creer ou modifier
  Validation backend :
  - bilan sans AT1 refuse
  - orientation avant bilan refusee
  - bilan termine correctement le parcours
- Erreurs a anticiper
  Donnees historiques avec orientation deja renseignee avant bilan.
- Criteres de validation
  Les issues de parcours sont enfin separees des statuts.
- Risques de regression
  Exports et tableaux historiques qui lisent encore `orientation_finale` comme un statut.
- Ordre conseille
  Apres simplification de l'API de parcours, avant la refonte complete de la fiche stagiaire.

## Lot 7 — Fiche stagiaire / parcours par phase

- Objectif du lot
  Refaire la lecture et la saisie cote stagiaire pour afficher la phase du parcours, pas un formulaire administratif.
- Fichiers probables concernes
  `frontend_rap_app/src/pages/prepa/StagiairesPrepaForm.tsx`, `StagiairesPrepaPage.tsx`, `StagiairesPrepaDetailModal.tsx`, `StagiairesPrepaTable.tsx`
- Changements backend
  Stabiliser les champs utiles a l'ecran :
  - statut du parcours
  - derniere presence
  - derniere etape
  - action suivante
  - historique
  - bilan
- Changements frontend
  Préremplir le formulaire avec le maximum d'informations possible.
  Mettre en haut de fiche :
  1. statut du parcours
  2. derniere presence reelle
  3. action suivante recommandee
  Ajouter un champ lecture seule `derniere etape`.
  Si aucun atelier n'a encore ete realise, afficher `en attente de AT1`.
  Aligner :
  - date d'entree sur la date du premier `AT1` reellement present
  - date de fin sur la date du bilan
  Remplacer le champ `statut_positionnement` par un seul champ `statut` expose a l'utilisateur.
  Le champ `statut` user-facing doit couvrir :
  - en attente de parcours
  - en parcours
  - parcours termine
  - abandon
  - en attente prochain atelier
  - a repositionner
  Le champ `prochain_atelier_prevu` doit proposer :
  - AT1
  - AT2
  - AT3
  - AT4
  - AT5
  - AT6
  - Bilan
  Remplacer la saisie libre ou peu lisible de l'IC d'origine par un `select` explicite.
  Format de libelle attendu :
  - `IC du 20/04/26 - Meudon`
  Masquer les champs de fin de parcours tant que le bilan n'est pas ouvert.
  Sortir des toggles manuels `atelier_1_realise`, `atelier_6_realise`, etc. de l'UI principale.
- Impacts API
  Utiliser les nouveaux champs calcules.
- Impacts DB/migration
  Aucun.
- Impacts UX
  Forte amelioration.
  Formulaire plus court, plus coherent avec la phase du parcours.
- Tests a creer ou modifier
  Front et API autour des etats visibles selon la phase.
- Erreurs a anticiper
  Modifier manuellement une sortie alors que le stagiaire n'est pas en bilan.
- Criteres de validation
  Un utilisateur peut comprendre l'etat d'un stagiaire sans lire 20 champs.
- Risques de regression
  Perte de certaines actions historiques si elles n'ont pas de remplaçant clair.
- Ordre conseille
  Apres disponibilite des nouveaux champs API.

## Lot 8 — KPI backend stabilises

- Objectif du lot
  Recalculer les KPI sur le nouveau paradigme seulement quand les regles metier sont fiables.
- Fichiers probables concernes
  `rap_app/api/viewsets/stats_viewsets/prepa_stats_viewsets.py`, `rap_app/models/prepa.py`, types front prepa stats
- Changements backend
  Introduire ou corriger les KPI cibles :
  - objectif annuel
  - reste a faire vs AT1
  - reste a faire vs adhesions
  - places ouvertes
  - prescriptions IC
  - taux prescription IC
  - presents IC
  - taux presence IC
  - adhesions IC
  - taux adhesion IC
  - nombre d'ateliers
  - taux de presence ateliers
  - en attente de demarrage
  - en attente de repositionnement
  - en attente de suite
  - en attente de bilan
  - nombre de bilans
  - transformation vers AFPA
  - taux transformation AFPA
  - abandon
  - taux d'abandon
  - ecart bilans = AT1 realises - bilans realises
  Les KPI pipeline doivent etre calcules depuis le meme service metier que le statut parcours, et non depuis une logique dupliquee uniquement dans `prepa_stats_viewsets.py`.
- Changements frontend
  Types uniquement dans un premier temps.
- Impacts API
  Ajout de nouveaux KPI, maintien temporaire des anciens alias si necessaire.
- Impacts DB/migration
  Aucun si calculs dynamiques.
- Impacts UX
  Aucun direct tant que le dashboard n'est pas recable.
- Tests a creer ou modifier
  Tests stats backend cibles et cas limites.
- Erreurs a anticiper
  KPI hybrides faux si l'on mixe ancien et nouveau modele.
- Criteres de validation
  Les KPI sont documentes et leur formule est testee.
- Risques de regression
  Dashboard faux ou contradictoire avec les tableaux.
- Ordre conseille
  Toujours avant le dashboard.

## Lot 9 — Dashboard et widgets UI en dernier

- Objectif du lot
  Brancher le dashboard uniquement sur des KPI stabilises.
- Fichiers probables concernes
  `frontend_rap_app/src/pages/prepa/PrepaStatsSummary.tsx`, `PrepaStatsParcours.tsx`, `PrepaStatsOperations.tsx`, `PrepaStatsRepartition.tsx`, `DashboardPrepaPage.tsx`
- Changements backend
  Aucun hors finitions KPI si besoin.
- Changements frontend
  Reorganiser les blocs par familles :
  - IC et objectif
  - ateliers
  - pipeline parcours
  - resultats bilan
  Utiliser les tokens du theme et les patterns existants de cartes dashboard.
- Impacts API
  Consommation des KPI stabilises uniquement.
- Impacts DB/migration
  Aucun.
- Impacts UX
  Lecture metier plus simple, sans lancer ce lot trop tot.
- Tests a creer ou modifier
  Tests d'integration front si existants, verifications de formatage et presence des cartes.
- Erreurs a anticiper
  Confusion entre KPI objectif et KPI parcours.
- Criteres de validation
  Le dashboard ne contredit pas les listes detaillees.
- Risques de regression
  Erreurs d'affichage ou mauvais mapping des nouveaux noms de champs.
- Ordre conseille
  Dernier lot fonctionnel.

## Lot 10 — Documentation, nettoyage et retrait progressif de l'ancien modele

- Objectif du lot
  Finaliser, documenter et préparer la deprecation des anciens champs/flux quand la prod est stable.
- Fichiers probables concernes
  docstrings backend, docs techniques, notes de migration, documentation metier
- Changements backend
  Marquer les anciens champs/filters comme deprecies si encore exposes.
- Changements frontend
  Nettoyage du code mort et des alias plus tard, pas avant stabilisation.
- Impacts API
  Eventuelle deprecation documentee, jamais silencieuse.
- Impacts DB/migration
  Aucune suppression de champ sans cycle de stabilisation et sauvegarde.
- Impacts UX
  Aucun.
- Tests a creer ou modifier
  Campagne finale de non-regression.
- Erreurs a anticiper
  Suppression trop precoce d'un champ encore lu par une page ou export.
- Criteres de validation
  Documentation et code alignes.
- Risques de regression
  Rupture tardive lors d'un nettoyage trop agressif.
- Ordre conseille
  Tout a la fin.

## 4. Points a valider avant developpement

- Faut-il creer un objet `BilanPrepa` distinct, ou rester sur des champs de bilan dans `StagiairePrepa` au premier cycle ?
- Veut-on un champ DB pour le nouveau statut de parcours, ou un statut entierement derive ?
  Pour la prod, un statut derive + champs de sortie explicites est souvent plus sur au debut.
- Quelle est la liste exacte des validations bloquantes vs warnings utilisateur ?
- Quelle periode de coexistence veut-on pour les anciens filtres `pilotage`, `statut_parcours_calcule`, `a_reprogrammer` ?
- Quels exports Excel/PDF doivent etre maintenus strictement a l'identique pendant la transition ?
- Faut-il introduire des feature flags front pour basculer progressivement les nouveaux ecrans stagiaire ?

## 5. Strategie de non-regression

- migrations additives uniquement au debut
- aucune suppression de route
- aucune suppression immediate d'ancien champ API
- compatibilite lecture prioritaire sur les anciennes donnees
- recalcule backend centralise et teste
- livraison par lots deployables independamment
- verification explicite du scoping centre a chaque lot API
- campagne de verification manuelle sur :
  - IC
  - objectifs
  - ateliers create/edit
  - liste stagiaires
  - exports
  - dashboard

## 6. Strategie de tests

- Tests modeles
  Verifier enums, mapping historique, cohérence des transitions.
- Tests services metier
  Couvrir toute la machine d'etats et les suggestions d'action.
- Tests serializers
  Couvrir validations bilan/orientation/statuts.
- Tests API/viewsets
  Couvrir CRUD, filtres, erreurs explicites, scoping centre, permissions.
- Tests migrations / scripts de reprise
  Verifier le backfill uniquement des champs reellement stockes :
  - issues
  - dates de bilan
  - champs de sortie
  Verifier que le statut courant est recalcule par le service metier a partir de l'historique existant.
- Tests KPI
  Verifier les formules et les cas limites.
- Tests frontend
  Si la base existante le permet, couvrir les nouveaux rendus critiques et la visibilite conditionnelle des sections.
- Cas metier minimum a automatiser
  Tous les cas que tu as listes dans le cadrage utilisateur.

## 7. Strategie UI coherente avec theme.ts

- Reutiliser `PageTemplate`, `Paper`, `Stack`, `Grid`, `Chip`, `Alert` et les tokens `theme.custom`.
- Eviter les styles locaux lourds.
- Prioriser :
  - un bandeau de synthese en haut
  - une action principale unique
  - peu de champs visibles
  - sections courtes
  - formulaire compact
- La fiche stagiaire doit toujours commencer par :
  - statut du parcours
  - derniere presence reelle
  - action suivante recommandee
- Ajouter un champ lecture seule `derniere etape` dans la zone de synthese.
- Le formulaire stagiaire doit etre fortement pre-rempli :
  - centre
  - information collective d'origine
  - date d'entree
  - date de fin
  - prochaine action deduite
- Les champs de bilan doivent etre masques hors phase `EN_ATTENTE_BILAN`.
- Les anciens champs techniques ne doivent plus etre au centre de la lecture.

## 8. Strategie dashboard en dernier lot

- Ne pas modifier le dashboard tant que :
  - les nouveaux statuts ne sont pas fiables
  - les regles bilan/orientation ne sont pas stabilisees
  - les KPI ne sont pas testes
- Le dashboard final doit separer clairement :
  - IC
  - objectif
  - ateliers
  - pipeline parcours
  - resultats finaux
- Les definitions de KPI doivent etre documentees dans le backend et dans la documentation metier.

## 9. Recommandation d'execution

1. Audit detaille et arbitrages metier finaux
2. Nouveau schema compatible
3. Service central de recalcul
4. Simplification des statuts atelier
5. API compatible
6. UI ateliers
7. Bilan
8. UI parcours stagiaire
9. KPI backend
10. Dashboard
11. Documentation et nettoyage

## 10. Conclusion

Le point cle pour ne pas casser la production est de considerer cette evolution comme une transition de modele, pas comme une refonte d'ecran.

La priorite n'est pas de refaire l'interface tout de suite, mais de :

- fiabiliser les regles de parcours cote backend
- separer statut et issue
- garder les contrats existants vivants pendant la transition
- ne livrer le dashboard qu'une fois les KPI solides

Cette approche permet ensuite de simplifier l'experience utilisateur sans fragiliser `Prepa IC`, `Objectifs`, le scoping centre ni les ecrans existants.
