# Audit RGPD du systeme RAP_APP

Date: 2026-04-26

Statut: audit technique du code et de la configuration visible dans ce depot. Ce document n'est pas un avis juridique.

## Resume

Le systeme a deja plusieurs briques utiles:

- champs RGPD sur `Candidat` ;
- blocage partiel des comptes candidats sans consentement ;
- scoping par centre sur plusieurs modules ;
- archivage logique sur une partie du metier ;
- base de configuration HTTPS correcte.

En revanche, les principaux risques RGPD techniques se regroupent mieux en 5 lots distincts. Le but de ce document est de separer ces chantiers pour qu'ils puissent etre traites l'un apres l'autre sans melanger les sujets.

## Lot RGPD 0 — Audit des flux de donnees

Objectif : cartographier ou circule la donnee personnelle et ou elle est dupliquee.

### Constat

Le risque RGPD ne vient pas seulement du stockage principal. Dans RAP_APP, une meme donnee peut circuler entre plusieurs couches:

- base metier ;
- API JSON ;
- frontend ;
- exports Excel/CSV/PDF ;
- logs ;
- documents ;
- traces d'import ;
- sauvegardes.

Sans cartographie prealable, les lots suivants risquent de corriger un point visible tout en laissant une fuite sur un autre canal.

### Risque

- corriger `/media/` sans corriger l'API ;
- corriger les logs sans corriger les exports ;
- corriger la suppression live sans traiter les backups ;
- oublier les duplications frontend et fichiers intermediaires.

### Perimetre a cartographier

- quelles donnees personnelles existent ;
- dans quelles tables elles vivent ;
- quels endpoints les exposent ;
- quels serializers et `to_serializable_dict()` les republient ;
- quels exports les dupliquent ;
- quels logs les recopient ;
- quelles sauvegardes les conservent.

### Resultat attendu

- une cartographie claire des flux de donnees ;
- une liste des points de duplication ;
- une base solide pour prioriser les autres lots sans angle mort.

### Taches

- recenser les categories de donnees personnelles par module ;
- lister les tables et champs sensibles ;
- lister les endpoints qui exposent ces donnees ;
- lister les serializers et `to_serializable_dict()` qui les republient ;
- lister les exports, logs, traces d'import et supports de sauvegarde.

### Livrables

- matrice `donnee -> table -> endpoint -> serializer -> export -> log -> backup` ;
- liste des points de duplication a risque ;
- perimetre cible des lots 1 a 5 valide.

### Criteres d'acceptation

- chaque donnee sensible a au moins un chemin de circulation documente ;
- chaque duplication importante est identifiee ;
- aucun lot suivant ne part sur un perimetre flou.

## Lot RGPD 1 — Securisation documents/media

Objectif : empecher tout acces direct non authentifie aux documents.

### Constat

- les documents exposes par l'API ont un `download_url` base sur l'URL media ;
- nginx sert `/media/` directement par `alias` ;
- le endpoint API `documents/<id>/download/` existe bien, mais il peut etre contourne si l'URL brute du fichier est connue.

### Risque

- acces direct a des documents potentiellement nominatifs sans controle d'authentification ;
- absence de verification de role et de scope centre au moment du telechargement direct ;
- absence de trace applicative fiable sur ces acces directs.

### Sources concernees

- `rap_app/api/serializers/documents_serializers.py`
- `rap_app/models/documents.py`
- `rap_app/api/viewsets/documents_viewsets.py`
- `deploy/nginx_rap_app.conf`
- `rap_app_project/settings.py`

### Recommandation

- ne plus exposer publiquement les fichiers sensibles via `/media/` ;
- forcer le passage par un endpoint applicatif authentifie ;
- si besoin, utiliser un mecanisme de type `X-Accel-Redirect` ou stockage prive ;
- revoir tous les usages de `download_url` pour eviter qu'un lien direct soit diffuse au front.

### Resultat attendu

- un utilisateur non connecte ne peut jamais recuperer un document ;
- un utilisateur connecte hors perimetre ne peut pas contourner le scope ;
- tous les telechargements passent par une couche de controle metier.

### Taches

- identifier tous les usages de `download_url` et des URLs media exposees au front ;
- verifier le comportement nginx actuel sur `/media/` ;
- definir la strategie cible de telechargement protege ;
- verifier les impacts sur les documents existants et sur le front.

### Livrables

- decision technique de protection des medias ;
- liste des points de code et de config a modifier ;
- scenarii de test d'acces anonyme, authentifie hors scope, authentifie dans scope.

### Criteres d'acceptation

- aucun document sensible n'est recuperable sans authentification ;
- aucun document sensible n'est recuperable hors scope ;
- tous les acces documentes passent par un controle metier explicite.

## Lot RGPD 1 bis — Audit des scopes API

Objectif : verifier que tous les ViewSets respectent centre, role et perimetre utilisateur.

### Constat

Le risque de fuite ne passe pas seulement par les fichiers ou `/media/`. Il passe aussi par les endpoints JSON eux-memes.

Exemples de risque typique:

- serializers trop riches ;
- `to_serializable_dict()` qui republie des champs sensibles ;
- queryset mal scope ;
- action custom qui contourne `get_queryset()` ;
- endpoint detail qui re-expose une ressource hors centre ou hors proprietaire.

Meme avec des medias prives, une fuite reste possible si l'API retourne encore:

- auteur ;
- contenu ;
- formation ;
- identite ;
- metadonnees nominatives ;
- relations utilisateur.

### Risque

- fuite de donnees via API JSON sans aucun telechargement de fichier ;
- exposition transversale entre centres ;
- exposition d'objets lies via actions custom, endpoints detail ou exports adosses a des querysets imparfaits.

### Sources concernees

- tous les `ViewSet` DRF ;
- tous les serializers sensibles ;
- tous les `to_serializable_dict()` ;
- toutes les actions custom `@action` ;
- tous les mixins de scope et permissions.

### Recommandation

- auditer systematiquement chaque module sur 3 axes:
  - role ;
  - centre ;
  - ownership / perimetre utilisateur ;
- verifier que toutes les actions custom reappliquent bien le meme scope que les listes ;
- verifier qu'aucun serializer detail ne republie plus d'informations que prevu ;
- verifier les objets lies et champs calcules.

### Resultat attendu

- aucun endpoint JSON ne fuit de donnee hors perimetre ;
- les regles de scope sont coherentes entre list, detail, actions et exports ;
- les serializers deviennent alignes avec le besoin reel d'affichage.

### Taches

- auditer chaque ViewSet sur `list`, `retrieve`, `@action`, `export` ;
- verifier les querysets et les contournements eventuels de `get_queryset()` ;
- auditer les serializers detail et les champs calcules ;
- auditer les `to_serializable_dict()` utilises en reponse API.

### Livrables

- checklist par ViewSet : role, centre, ownership, objets lies, actions custom ;
- liste des endpoints non conformes ou a risque ;
- plan de correction priorise par module.

### Criteres d'acceptation

- tous les endpoints sensibles ont ete passes en revue ;
- chaque endpoint a une regle de scope explicite ;
- les ecarts restants sont listes, qualifies et priorises.

## Lot RGPD 2 — Logs sensibles

Objectif : empecher la duplication de donnees personnelles dans les journaux.

### Constat

- les changements de `Candidat` sont journalises champ par champ dans `_log_changes()` ;
- cela peut inclure des donnees sensibles: `nir`, email, telephone, adresse, RQTH, informations France Travail, representant legal ;
- la sanitation actuelle protege surtout les secrets techniques comme `password` ou `token`, pas les donnees metier personnelles ;
- les logs sont ensuite consultables et exportables.

### Risque

- duplication de donnees personnelles dans plusieurs couches du systeme ;
- augmentation de la surface de fuite ;
- export secondaire de donnees sensibles via les pages et fichiers de logs.

### Sources concernees

- `rap_app/models/candidat.py`
- `rap_app/models/logs.py`
- `rap_app/api/viewsets/logs_viewsets.py`
- `rap_app/api/serializers/logs_serializers.py`
- `rap_app_project/settings.py`

### Recommandation

- ne plus ecrire les anciennes et nouvelles valeurs en clair pour les champs sensibles ;
- journaliser l'evenement, pas le contenu detaille ;
- separer clairement:
  - logs techniques,
  - logs d'audit metier,
  - traces d'erreur ;
- ajouter un audit XSS oriente fuite de tokens et fuite de donnees :
  - sanitation backend,
  - rendu frontend,
  - commentaires HTML,
  - CSP ;
- limiter fortement l'export des details de logs ;
- definir une duree de retention propre aux journaux.

### Resultat attendu

- les logs prouvent qu'une action a eu lieu sans recopier la donnee personnelle ;
- un export de logs ne reconstitue pas une fiche candidat ;
- la retention des traces est maitrisee.
- le frontend ne devient pas une voie indirecte d'exfiltration via XSS.

### Taches

- identifier tous les points de journalisation de donnees metier ;
- classer les champs a masquer ou a ne jamais logger ;
- distinguer logs techniques, audit metier et erreurs ;
- auditer le rendu HTML et le risque XSS ;
- definir la retention cible des journaux.

### Livrables

- politique de journalisation des donnees personnelles ;
- liste des champs interdits en clair dans les logs ;
- rapport court sur le risque XSS et les mesures attendues ;
- politique de retention des journaux.

### Criteres d'acceptation

- aucun champ personnel sensible n'est recopie en clair dans les logs cibles ;
- les exports de logs ne permettent plus de reconstituer une fiche ;
- le risque XSS critique lie aux donnees et aux tokens est traite ou documente.

## Lot RGPD 3 — Exports candidats

Objectif : reduire la fuite massive possible via Excel/CSV.

### Constat

- l'export candidats contient un volume important de donnees personnelles ;
- des donnees tres sensibles sont presentes dans les exports, notamment `NIR`, coordonnees, donnees de naissance, RQTH et autres attributs forts ;
- l'export semble pense comme export complet, pas comme export minimal par usage.

### Risque

- une seule extraction peut diffuser massivement des donnees nominatives ;
- une fois le fichier sorti de l'application, la maitrise est tres faible ;
- le principe de minimisation n'est pas respecte par defaut.

### Sources concernees

- `rap_app/api/viewsets/candidat_viewsets.py`
- `rap_app/api/import_export/views.py`
- `rap_app/models/import_job.py`

### Recommandation

- creer au moins deux niveaux d'exports:
  - export operationnel minimal ;
  - export complet reserve a des roles plus restreints ;
- exclure par defaut les champs les plus sensibles ;
- revoir la justification metier de chaque colonne exportee ;
- tracer plus precisement qui exporte quoi ;
- verifier que les exports ne contournent pas le scope API reel ;
- ajouter un rappel de confidentialite dans les fichiers exportes.

### Resultat attendu

- l'export par defaut sert au travail courant sans exposer tout le dossier candidat ;
- les donnees les plus sensibles ne sortent que sur besoin justifie ;
- le risque de fuite massive par tableur est reduit.

### Taches

- inventorier tous les exports candidats et leurs colonnes ;
- classer les colonnes par niveau de sensibilite ;
- definir un export minimal et un export complet ;
- verifier les roles autorises et le scope reel des exports ;
- definir la trace d'audit liee aux exports.

### Livrables

- matrice `colonne -> justification metier -> niveau de sensibilite -> export cible` ;
- specification des niveaux d'export ;
- liste des roles habilites par type d'export.

### Criteres d'acceptation

- un export minimal est clairement defini ;
- les colonnes sensibles sont reservees aux cas justifies ;
- aucun export ne contourne les regles de scope API.

## Lot RGPD 4 — Suppression/anonymisation

Objectif : rendre la promesse utilisateur exacte et techniquement fiable.

### Constat

- l'endpoint `delete-account` desactive et anonymise le `CustomUser` ;
- en revanche, je n'ai pas trouve de traitement transverse garantissant l'effacement ou l'anonymisation du reste:
  - fiche `Candidat`,
  - documents,
  - commentaires,
  - logs,
  - traces d'import,
  - autres relations metier ;
- le message utilisateur annonce pourtant une suppression conforme RGPD beaucoup plus large.

### Risque

- ecart entre la promesse fonctionnelle et la realite technique ;
- droit a l'effacement incomplet ;
- conservation de donnees identifiantes residuelles dans d'autres tables.

### Sources concernees

- `rap_app/api/viewsets/user_viewsets.py`
- `rap_app/models/custom_user.py`
- `rap_app/models/candidat.py`
- `rap_app/models/logs.py`
- `rap_app/models/import_job.py`
- modules relies aux documents et commentaires

### Recommandation

- imposer une regle technique par type de donnee pour eviter de casser le metier :
  - identite directe (`nom`, `prenom`, `email`, `telephone`, `nir`, adresse) : suppression ou anonymisation irreversible ;
  - relation metier (`formation`, rattachements statistiques, liens de parcours) : conservation si necessaire au fonctionnement et au reporting ;
  - logs : anonymisation ;
  - documents : suppression physique ou anonymisation selon le besoin legal ;
  - historiques metier : conservation minimale sans identite directe ;
- definir une doctrine explicite par type de donnee:
  - suppression physique,
  - anonymisation irreversible,
  - conservation legale,
  - archivage restreint ;
- aligner le message utilisateur avec le traitement reel tant que le workflow complet n'existe pas ;
- centraliser la suppression/anonymisation dans un service unique ;
- prevoir des tests de non-regression sur ce parcours.

### Resultat attendu

- la promesse affichée a l'utilisateur devient exacte ;
- chaque type de donnee a un traitement explicite ;
- le parcours de suppression peut etre audite techniquement.
- la suppression RGPD ne casse pas les relations metier qui doivent survivre sous forme non identifiante.

### Taches

- recenser toutes les relations autour de `CustomUser` et `Candidat` ;
- definir la regle de traitement par type de donnee ;
- definir le workflow cible de suppression/anonymisation ;
- aligner les messages utilisateur et admin avec le traitement reel ;
- definir les tests de non-regression.

### Livrables

- matrice `type de donnee -> action RGPD` ;
- specification du workflow de suppression/anonymisation ;
- liste des objets a supprimer, anonymiser, conserver ou archiver.

### Criteres d'acceptation

- chaque type de donnee a une regle claire ;
- la promesse utilisateur correspond au comportement reel ;
- les relations metier necessaires survivent sans identite directe.

## Lot RGPD 4 bis — Backups

Objectif : traiter la retention des donnees personnelles dans les sauvegardes.

### Constat

La suppression ou l'anonymisation en production ne suffit pas si les donnees restent presentes dans:

- backups PostgreSQL ;
- snapshots VPS ;
- dumps manuels ;
- sauvegardes fichiers ;
- archives de restauration.

### Risque

- une donnee supprimee du live reste recuperable pendant longtemps ;
- l'organisation croit etre conforme alors que les sauvegardes conservent encore les donnees ;
- absence de politique de rotation claire.

### Sources concernees

- scripts de backup/deploiement ;
- documentation d'exploitation ;
- infrastructure VPS ;
- procedures manuelles hors code si elles existent.

### Recommandation

- definir une politique de rotation backup ;
- fixer une duree maximale de retention ;
- documenter ce qui est sauvegarde:
  - base,
  - media,
  - logs,
  - exports temporaires ;
- aligner cette retention avec la promesse RGPD et les contraintes legales ;
- documenter les limites: une suppression RGPD peut rester presente dans une sauvegarde jusqu'a expiration de la rotation.

### Resultat attendu

- la retention des sauvegardes est connue, limitee et documentee ;
- le discours RGPD devient exact sur le sujet des restores et snapshots ;
- le lot 4 n'oublie plus la couche backup.

### Taches

- identifier les sauvegardes existantes : base, media, logs, snapshots, dumps ;
- documenter leur frequence et leur retention ;
- definir la rotation cible ;
- aligner la communication RGPD avec la realite de restauration.

### Livrables

- politique de backup et de retention ;
- inventaire des sauvegardes existantes ;
- note d'alignement entre suppression live et expiration backup.

### Criteres d'acceptation

- chaque sauvegarde connue a une duree de retention definie ;
- les limites de la suppression RGPD sur backup sont documentees ;
- la doctrine backup est exploitable par l'equipe d'exploitation.

## Lot RGPD 5 — Politique de confidentialite

Objectif : aligner le texte public avec le traitement reel.

### Constat

- la page actuelle parle surtout des donnees de compte ;
- l'application traite en realite des donnees bien plus riches:
  - identite,
  - contact,
  - date et lieu de naissance,
  - NIR,
  - RQTH,
  - informations France Travail,
  - representant legal,
  - donnees de placement,
  - documents,
  - CERFA,
  - logs et traces d'import ;
- la date de mise a jour est calculee dynamiquement au rendu ;
- la politique annonce des regles de conservation qui ne semblent pas toutes implementees techniquement.

### Risque

- information incomplete ou inexacte de la personne concernee ;
- decalage entre le texte public et les traitements reels ;
- fragilite sur les obligations de transparence.

### Sources concernees

- `frontend_rap_app/src/pages/PolitiqueConfidentialite.tsx`
- `frontend_rap_app/src/pages/users/MonProfil.tsx`
- `frontend_rap_app/src/pages/auth/RegisterPage.tsx`
- `rap_app/models/candidat.py`
- `rap_app/models/documents.py`
- `rap_app/models/logs.py`
- `rap_app/models/import_job.py`

### Recommandation

- reecrire la politique a partir des traitements reels du depot ;
- distinguer clairement:
  - donnees de compte,
  - donnees candidat,
  - donnees contractuelles,
  - documents,
  - logs,
  - exports ;
- preciser pour chaque bloc:
  - finalite,
  - base legale,
  - destinataires,
  - duree de conservation,
  - droits de la personne ;
- remplacer la date calculee au runtime par une date de version explicite.

### Resultat attendu

- la page publique decrit fidelement les traitements reels ;
- les engagements affiches sont defendables techniquement ;
- le texte devient une reference stable pour le produit.

### Taches

- reprendre la cartographie du lot 0 ;
- lister les traitements reels a declarer ;
- ecrire une version structuree de la politique ;
- aligner la date de version et la gouvernance de mise a jour.

### Livrables

- texte cible de politique de confidentialite ;
- tableau de correspondance `traitement reel -> section du texte` ;
- version datee et stable de la politique.

### Criteres d'acceptation

- toutes les categories de donnees reellement traitees sont mentionnees ;
- les finalites, bases legales et durees sont coherentes avec le systeme ;
- la politique est versionnee et maintenable.

## Gouvernance projet

### Ordre d'implementation recommande

1. Lot 0
2. Lot 1
3. Lot 1 bis
4. Lot 2
5. Lot 3
6. Lot 4
7. Lot 4 bis
8. Lot 5

### Dependances

- le lot 0 alimente tous les autres ;
- le lot 1 bis doit etre mené avant de considerer les lots 1 et 3 comme vraiment securises ;
- le lot 4 bis complete obligatoirement le lot 4 ;
- le lot 5 doit etre finalise apres stabilisation des regles des lots precedents.

### Pilotage

- traiter chaque lot comme un mini-chantier autonome ;
- fermer un lot uniquement si ses criteres d'acceptation sont verifies ;
- conserver une trace de decision technique pour chaque arbitrage RGPD sensible ;
- privilegier des livrables courts, verificables et relies au code reel.

## Priorisation conseillee

Ordre recommande:

1. Lot RGPD 0 — Audit des flux de donnees
2. Lot RGPD 1 — Securisation documents/media
3. Lot RGPD 1 bis — Audit des scopes API
4. Lot RGPD 2 — Logs sensibles
5. Lot RGPD 3 — Exports candidats
6. Lot RGPD 4 — Suppression/anonymisation
7. Lot RGPD 4 bis — Backups
8. Lot RGPD 5 — Politique de confidentialite

Raison:

- le lot 0 evite les angles morts avant implementation ;
- les lots 1 et 1 bis reduisent les fuites par fichier et par API ;
- les lots 2 et 3 reduisent la duplication et l'exfiltration secondaire ;
- les lots 4 et 4 bis rendent la suppression credible sur le live et sur les sauvegardes ;
- le lot 5 doit idealement etre finalise apres clarification technique des lots precedents, pour que le texte public soit exact.

## Conclusion

Le chantier RGPD doit etre traite en blocs separes et non comme un seul sujet global. Dans RAP_APP, les priorites les plus urgentes sont la cartographie des flux, la protection des fichiers, la verification des scopes API, la reduction de la donnee personnelle dans les logs et la minimisation des exports. Ensuite seulement, il devient pertinent de stabiliser la suppression/anonymisation complete, d'inclure les backups dans la doctrine de retention, puis de rewriter la politique de confidentialite sur une base technique fiable.
