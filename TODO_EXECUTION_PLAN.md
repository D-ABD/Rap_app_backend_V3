# TODO_EXECUTION_PLAN

## Objectif

Amener le backend a un niveau "deploy-ready" et "front-ready" sans casser les comportements existants.

Le plan est volontairement sequence par lots a faible rayon d'impact. Chaque lot doit etre termine, teste et valide avant de passer au suivant.

Contexte de confiance actuel :
- la suite existante passe : `361 passed, 6 skipped`
- cela permet de travailler par petits increments avec un filet de securite
- la priorite n'est pas de "refactorer pour faire propre", mais de stabiliser le contrat, la securite, le scoping et les chemins d'ecriture

## Regles d'execution

1. Travailler sur une branche dediee a chaque lot.
2. Ne jamais melanger dans un meme lot :
   correction de contrat API,
   correction de logique metier,
   refonte structurelle.
3. Avant chaque changement, ecrire ou ajuster les tests cibles du lot.
4. A la fin de chaque lot :
   lancer les tests cibles,
   lancer ensuite la suite complete,
   verifier manuellement les endpoints critiques concernes,
   commit.
5. Ne pas lancer de gros remaniement transverse tant que les lots P0 et P1 ne sont pas fermes.
6. Toute modification de comportement, de contrat API, de permission, de serializer, de service ou de workflow doit s'accompagner d'une mise a jour de la documentation concernee dans la meme branche et avant merge.
7. Une tache n'est pas consideree comme terminee tant que la documentation impactee n'est pas alignee sur le comportement reel du code.

## Definition de "backend 100% ready"

Le backend pourra etre considere pret pour deploiement et branchement front si, a minima :
- tous les endpoints utilises par le front ont un contrat de reponse stable
- les erreurs API ont un format coherent
- la visibilite liste/detail/action est alignee par role
- chaque flux metier critique n'a qu'une seule source de verite
- les principales zones N+1 et risques de double effet sont supprimes
- les endpoints sensibles sont couverts par des tests de permission et de contrat
- la doc OpenAPI reflete les payloads reels

## Ordre global recommande

1. Lot 0 - Stabilisation du socle de travail
2. Lot 1 - Contrat API et erreurs
3. Lot 2 - Scoping et permissions
4. Lot 3 - Chemins d'ecriture et sources de verite metier
5. Lot 4 - Serializers et compatibilite front
6. Lot 5 - Performance et volume
7. Lot 6 - Hardening deploiement
8. Lot 7 - Nettoyage structurel et documentation durable

## Lot 0 - Stabilisation du socle de travail

### But

Se donner un cadre de travail qui limite les regressions avant toute modification de fond.

### Taches

- Creer un inventaire des endpoints front-consommes.
- Lister les endpoints a contrat heterogene.
- Lister les endpoints avec actions custom hors CRUD.
- Identifier les tests deja existants par domaine :
  `formations`, `candidats`, `prospections`, `appairages`, `documents`, `users`, `cvtheque`.
- Identifier les `6 skipped` et les `96 warnings` pour savoir s'ils cachent des angles morts importants.
- Exporter le schema OpenAPI actuel pour avoir un point de comparaison.

### Livrables

- un tableau "endpoint -> serializer read/write -> permissions -> format reponse"
- une liste des actions custom a risque
- une photo de reference du schema API actuel

### Tests a lancer

- suite complete
- generation schema OpenAPI si elle existe deja dans le projet

### Condition de sortie

Tu sais exactement quels endpoints sont critiques pour le front et lesquels ont un contrat instable.

## Lot 1 - Contrat API et erreurs

### But

Uniformiser ce que le front recoit sans toucher encore a la logique metier profonde.

### Pourquoi ce lot est groupe

Le contrat de succes, le format des erreurs et la documentation OpenAPI sont le meme sujet pour le front. Les traiter ensemble evite d'introduire un backend "semi coherent".

### Taches

- Definir le contrat de succes cible pour tous les endpoints front-consommes.
- Definir le contrat d'erreur cible :
  code HTTP,
  champ principal,
  structure de details,
  erreurs de validation.
- Corriger en priorite les endpoints deja identifies dans l'audit :
  `documents`,
  `formations.filtres`,
  `candidats.meta`,
  `prospections.get_filters`,
  `cvtheque.list`,
  `register`.
- Uniformiser les reponses des actions custom les plus exposees au front.
- Verifier que le handler d'exception global produit bien des payloads stables.
- Mettre a jour ou completer les tests de contrat.
- Verifier que le schema OpenAPI decrit les formats reels.

### Regle anti-casse

Ne pas renommer massivement les cles exposees au front dans ce lot si ce n'est pas strictement necessaire. Prioriser l'uniformisation de l'enveloppe et des erreurs, pas la refonte fonctionnelle.

### Tests a ecrire ou renforcer

- tests de contrat JSON pour `list`, `retrieve`, `create`, `update`, `destroy`
- tests de contrat JSON pour les actions `meta`, `filtres`, `choices`, `preview`, `download`
- tests de validation pour erreurs serializer/model
- snapshots legers ou assertions structurelles sur les payloads

### Condition de sortie

Tous les endpoints critiques du front repondent avec un contrat documente, stable et testable.

## Lot 2 - Scoping et permissions

### But

Garantir que liste, detail et actions custom suivent la meme logique de visibilite.

### Pourquoi ce lot est groupe

Le risque ici est securitaire. Il faut traiter ensemble `get_queryset`, `get_object`, permissions custom, mixins et roles pour eviter de "corriger un trou" en en ouvrant un autre.

### Taches

- Corriger l'alignement liste/detail de `ProspectionViewSet`.
- Revoir `CVThequeViewSet` sur `preview` et `download`.
- Revoir `CandidatViewSet.meta` et tous les endpoints equivalents ouverts plus large que leur module principal.
- Cartographier les mecanismes de scoping actuellement utilises :
  `roles`,
  `ScopedModelViewSet`,
  mixins de visibilite,
  logique inline dans les viewsets.
- Choisir un mecanisme principal pour le scope par centre.
- Corriger d'abord les domaines critiques :
  `prospections`,
  `candidats`,
  `formations`,
  `cvtheque`,
  `documents`.
- Ajouter ou renforcer les tests de permissions par role :
  `admin`, `superadmin`, `staff`, `staff_read`, `candidat`, roles speciales `prepa/declic`.

### Regle anti-casse

Ne pas tenter de supprimer toute la duplication de scoping dans ce lot. Commencer par l'alignement comportemental. La simplification structurelle viendra plus tard.

### Tests a ecrire ou renforcer

- tests `list` vs `retrieve` sur la meme ressource et le meme role
- tests des actions custom soumises a permission objet
- tests de non-regression sur centre visible/non visible
- tests des cas "objet existe mais non accessible"

### Condition de sortie

Un utilisateur ne peut pas recuperer en detail ou via action custom un objet absent de son perimetre metier, sauf choix explicite et teste.

## Lot 3 - Chemins d'ecriture et sources de verite metier

### But

Supprimer les divergences entre services, modeles et signaux sur les flux qui modifient les donnees critiques.

### Pourquoi ce lot est groupe

`Candidat`, `Appairage`, `Prospection` et `Formation.saturation` sont lies. Les traiter separement ferait perdre le contexte des effets de bord.

### Sous-lot 3A - Candidat

- Documenter le chemin d'ecriture reel :
  serializer -> viewset -> modele -> service -> signal -> historiques.
- Supprimer les doubles sauvegardes en `perform_create` et `perform_update`.
- Clarifier si `full_clean()` doit etre appele avant ou apres persistance, et a un seul endroit.
- Verifier les effets sur :
  historique,
  logs,
  compte utilisateur,
  prospection liee.
- Corriger `_log_changes()` si son etat initial est obsolescent apres sauvegarde.

### Sous-lot 3B - Appairage

- Clarifier le role exact de `AppairagePlacementService`.
- Verifier si le modele ou les signaux gardent encore une logique concurrente.
- Garder un seul chemin de sync metier reellement autorise.

### Sous-lot 3C - Prospection

- Clarifier le role exact de `ProspectionOwnershipService`.
- Verifier si `save()` ne change pas des statuts de facon trop implicite pour le front.
- Encadrer les transitions d'etat si necessaire par des tests explicites.

### Sous-lot 3D - Formation.saturation

- Choisir une seule source de verite :
  soit calcul d'inscrits,
  soit derive des commentaires,
  soit valeur stockee avec regle explicite.
- Aligner `save()`, les helpers et les serializers sur cette source.
- Ecrire des tests sur la coherence de la saturation.

### Regle anti-casse

Pour chaque sous-lot, ne modifier qu'un domaine a la fois et relancer la suite complete apres chaque domaine.

### Tests a ecrire ou renforcer

- transitions de statut
- historiques non dupliques
- creation et mise a jour sans effets de bord en double
- services appeles exactement une fois sur les flux critiques

### Condition de sortie

Chaque flux critique a une source de verite unique et un chemin d'ecriture testable de bout en bout.

## Lot 4 - Serializers et compatibilite front

### But

Rendre les ressources predictibles pour un client React/Expo type-safe.

### Pourquoi ce lot est groupe

Le front souffre quand read/write, champs dynamiques, champs calcules et actions custom evoluent en meme temps. Il faut stabiliser le contrat par ressource.

### Taches

- Revoir les ressources les plus structurantes :
  `formations`,
  `candidats`,
  `prospections`,
  `appairages`,
  `documents`,
  `users`.
- Pour chaque ressource, definir clairement :
  serializer de lecture,
  serializer d'ecriture create,
  serializer d'ecriture update,
  champs conditionnels par role,
  endpoints annexes.
- Corriger en priorite l'asymetrie de `FormationDetailSerializer` vs `FormationCreateSerializer`.
- Isoler les champs purement presentation si leur presence complique le typage front.
- Standardiser le nommage des champs equivalents entre endpoints quand cela peut etre fait sans casse.
- Si un champ varie selon le role, le documenter explicitement dans le schema et les tests.

### Regle anti-casse

Ne pas faire de grand renommage si le front n'est pas encore branche. Ajouter si necessaire une couche de compatibilite transitoire ou une documentation de migration.

### Tests a ecrire ou renforcer

- tests de serializers read/write par ressource
- tests des champs masques selon le role
- tests de contrats types front sur les endpoints les plus critiques

### Condition de sortie

Le front peut generer des types fiables ressource par ressource sans logique speciale par endpoint.

## Lot 5 - Performance et volume

### But

Supprimer les goulets evidents avant mise en production reelle.

### Pourquoi ce lot est groupe

Les correctifs perf doivent etre faits apres la stabilisation du contrat et de la logique, sinon ils risquent d'etre refaits.

### Taches

- Corriger les N+1 identifies dans les serializers candidats/appairages.
- Revoir les prefetch/select_related des endpoints de liste les plus consultes.
- Corriger les filtres ORM invalides ou fragiles, notamment autour de `places_disponibles`.
- Revoir `BaseModel.get_changed_fields()` si son cout devient trop fort sur les modeles charges.
- Evaluer les exports XLSX sur jeu de donnees realiste.
- Ajouter des garde-fous de perf sur :
  listes candidats,
  listes prospections,
  detail formation,
  logs,
  exports.

### Regle anti-casse

Toute optimisation doit garder le meme payload et les memes droits d'acces.

### Tests a ecrire ou renforcer

- tests de nombre de requetes sur endpoints cibles
- tests d'exports avec volume moyen
- tests de non-regression sur tri/filtrage/pagination

### Condition de sortie

Les endpoints majeurs n'ont plus de N+1 grossiers et les exports restent viables sur un volume raisonnable.

## Lot 6 - Hardening deploiement

### But

Securiser le backend pour un deploiement propre et un branchement front sans surprises.

### Taches

- Verifier les settings de production :
  `DEBUG`,
  `ALLOWED_HOSTS`,
  CORS,
  CSRF,
  JWT,
  securite cookies si applicable,
  logging.
- Revoir l'exposition des donnees sensibles sur `MeAPIView`.
- Verifier la validation fichiers de `Document`.
- Revoir les messages d'erreur qui pourraient encore exposer des details internes.
- Verifier la coherence des endpoints d'authentification pour usage mobile/web.
- Verifier que les migrations sont propres et reproductibles.
- Faire une passe sur les warnings pytest pour identifier ceux qui peuvent cacher une future casse framework.

### Regle anti-casse

Tout changement de securite ou de settings doit etre valide dans un environnement de preprod ou equivalent avant merge final.

### Tests a ecrire ou renforcer

- tests auth et refresh token
- tests CORS/permissions si couverture existante
- tests de validation upload
- tests d'exposition de donnees utilisateur

### Condition de sortie

Les points de securite et de configuration de deploiement ne reposent plus sur des suppositions.

## Lot 7 - Nettoyage structurel et documentation durable

### But

Refermer la phase de stabilisation avec une base maintenable.

### Taches

- Nettoyer les docstrings et commentaires devenus faux ou "legacy only".
- Documenter les conventions du projet :
  format succes,
  format erreurs,
  scoping par centre,
  role des services,
  role residuel des signaux.
- Reclasser les modules non exposes ou dormants :
  `VAE`,
  `SuiviJury`,
  anciennes vues HTML,
  modules de debug ou d'export non branches.
- Supprimer ou isoler explicitement le code de compatibilite transitoire.
- Planifier seulement ensuite un eventuel decoupage en sous-domaines.

### Regle anti-casse

Pas de grand decoupage de l'app dans cette phase si le backend doit d'abord etre deployable. Le decoupage vient apres la stabilisation fonctionnelle.

### Condition de sortie

Le code, la doc et la surface exposee racontent la meme histoire.

## Ce que tu dois faire exactement

### Semaine 1

1. Fermer le Lot 0.
2. Ouvrir une branche `stabilize/api-contract`.
3. Traiter le Lot 1 entier.
4. Lancer les tests cibles puis la suite complete.
5. Verifier manuellement les endpoints front critiques.
6. Commit et merge uniquement si le contrat est stable.

### Semaine 2

1. Ouvrir une branche `stabilize/scoping-permissions`.
2. Traiter le Lot 2 entier.
3. Verifier chaque role sur liste/detail/action custom.
4. Relancer la suite complete.
5. Commit.

### Semaine 3

1. Ouvrir une branche `stabilize/write-paths`.
2. Traiter le Lot 3 domaine par domaine :
   `Candidat`, puis `Appairage`, puis `Prospection`, puis `Formation`.
3. Apres chaque domaine :
   tests cibles,
   suite complete,
   commit intermediaire.

### Semaine 4

1. Ouvrir une branche `stabilize/front-contracts`.
2. Traiter le Lot 4.
3. Produire un schema OpenAPI propre ou une doc de contrat equivalente.
4. Verifier que le front peut typer les payloads sans exceptions ad hoc.

### Semaine 5

1. Ouvrir une branche `stabilize/performance`.
2. Traiter le Lot 5.
3. Ajouter des tests de nombre de requetes sur les endpoints les plus couteux.
4. Valider les exports sur jeu de donnees realiste.

### Semaine 6

1. Ouvrir une branche `stabilize/deploy-hardening`.
2. Traiter le Lot 6.
3. Faire une repetition de deploiement en environnement proche prod.
4. Corriger les derniers warnings bloquants.

### Semaine 7

1. Ouvrir une branche `stabilize/docs-cleanup`.
2. Traiter le Lot 7.
3. Geler les conventions backend.
4. Donner au front la reference contractuelle finale.

## Checklist avant merge final

- Tous les tests passent.
- Les tests de contrat API passent.
- Les tests de permissions passent par role.
- Les tests de services critiques passent.
- Les principaux endpoints de liste n'ont pas de N+1 evident.
- Le schema API est coherent avec les payloads reels.
- Les settings de production sont verifies.
- Les endpoints front critiques ont ete testes manuellement.
- Les warnings restants sont compris et acceptes.
- La documentation technique, API et interne a ete mise a jour partout ou le comportement a change.

## Ce qu'il ne faut pas faire

- Ne pas refactorer toute l'architecture en une fois.
- Ne pas melanger correction de permissions et grande refonte serializer dans la meme PR.
- Ne pas supprimer les signaux "legacy" tant que le chemin service equivalent n'est pas prouve par tests.
- Ne pas renommer massivement les champs API sans strategie de compatibilite.
- Ne pas lancer le decoupage monolithique avant d'avoir stabilise le runtime actuel.
- Ne pas merger une modification qui change le comportement reel sans mettre a jour la documentation correspondante.

## Priorite absolue si tu veux aller au plus vite

Si tu veux la trajectoire la plus sure vers un backend deployable et exploitable par le front, l'ordre a respecter est :

1. Contrat API et erreurs
2. Permissions et scoping
3. Chemins d'ecriture metier
4. Compatibilite serializers/front
5. Performance
6. Hardening deploiement
7. Nettoyage structurel
