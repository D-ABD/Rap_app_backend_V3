# Audit RGPD du systeme RAP_APP

Date: 2026-04-26

Statut: audit technique du code et de la configuration visible dans ce depot. Ce document n'est pas un avis juridique.

## 1. Perimetre examine

- Backend Django / DRF
- Frontend React
- Configuration de securite applicative
- Gestion des comptes, candidats, documents, logs et exports
- Politique de confidentialite affichee dans l'application

## 2. Resume executif

Le systeme a deja un socle RGPD reel:

- champs RGPD dedies sur `Candidat` (`base legale`, `source de creation`, `statut de notification`, `consentement`, horodatages, auteur) ;
- garde-fou d'acces pour les comptes candidats tant que le consentement n'est pas renseigne ;
- scoping par centre sur plusieurs modules ;
- archivage logique sur une grande partie des ressources ;
- configuration HTTPS / cookies securises / CORS / JWT cote API.

En revanche, j'ai releve plusieurs ecarts importants entre l'intention RGPD et la mise en oeuvre:

1. les fichiers media semblent exposables directement sans controle d'authentification ;
2. la suppression "RGPD" d'un compte n'efface pas l'ensemble des donnees personnelles rattachees ;
3. les logs et certains exports peuvent contenir des donnees personnelles sensibles en clair ;
4. les tokens JWT sont stockes dans le `localStorage` ;
5. la politique de confidentialite publiee ne decrit pas fidelement les donnees reellement traitees.

## 3. Forces deja en place

### 3.1 Traceabilite RGPD sur les candidats

Le modele `Candidat` contient un vrai debut de modele de conformite:

- `rgpd_creation_source`
- `rgpd_legal_basis`
- `rgpd_consent_obtained`
- `rgpd_consent_obtained_at`
- `rgpd_consent_recorded_by`
- `rgpd_notice_status`
- `rgpd_notice_sent_at`
- `rgpd_notice_sent_by`
- `rgpd_data_reviewed_at`
- `rgpd_data_reviewed_by`

Sources:

- `rap_app/models/candidat.py`
- `rap_app/api/serializers/candidat_serializers.py`

### 3.2 Blocage applicatif pour les comptes candidats sans consentement

Le backend et le frontend cooperent pour bloquer certaines actions tant que le consentement n'est pas enregistre.

Sources:

- `rap_app/api/permissions.py`
- `rap_app/api/roles.py`
- `rap_app/api/exception_handler.py`
- `frontend_rap_app/src/components/RgpdGateBridge.tsx`

### 3.3 Scoping par centre

Le scoping par centre est une bonne mesure de minimisation d'acces pour les profils internes non admin.

Sources:

- `rap_app/api/viewsets/scoped_viewset.py`
- `rap_app/api/roles.py`
- `rap_app/api/viewsets/documents_viewsets.py`
- `rap_app/api/viewsets/candidat_viewsets.py`

### 3.4 Durcissement HTTP et serveur

Des protections utiles sont presentes:

- `SECURE_SSL_REDIRECT`
- `SESSION_COOKIE_SECURE`
- `CSRF_COOKIE_SECURE`
- `X_FRAME_OPTIONS`
- proxy HTTPS

Sources:

- `rap_app_project/settings.py`
- `deploy/nginx_rap_app.conf`

## 4. Constat detaille et priorites

## 4.1 Critique / tres prioritaire

### A. Les documents media peuvent contourner les controles d'acces

Constat:

- le serializer expose `download_url` qui pointe sur `/media/...` ;
- nginx sert `/media/` par `alias` directement ;
- cela contourne potentiellement le controle metier du endpoint API `documents/<id>/download/`.

Impact RGPD:

- acces direct a des documents potentiellement nominatifs ou contractuels par simple URL ;
- risque de fuite de pieces jointes sans journalisation applicative ni verification de role.

Sources:

- `rap_app/api/serializers/documents_serializers.py`
- `rap_app/models/documents.py`
- `deploy/nginx_rap_app.conf`
- `rap_app/api/viewsets/documents_viewsets.py`

Recommendation:

- ne plus exposer de lien direct `/media/...` pour les documents sensibles ;
- servir les fichiers uniquement via un endpoint authentifie et scope ;
- si besoin de performance, utiliser `X-Accel-Redirect` ou un stockage prive ;
- auditer aussi les autres usages de `MEDIA_URL`.

### B. La suppression "RGPD" du compte n'efface pas l'ensemble des donnees personnelles

Constat:

- `delete-account` desactive et anonymise `CustomUser` ;
- mais je n'ai pas trouve de purge associee de la fiche `Candidat`, des documents, des commentaires, des logs, ni des relations metier ;
- le message de l'endpoint annonce pourtant une suppression definitive de toutes les donnees personnelles.

Impact RGPD:

- ecart entre promesse utilisateur et traitement reel ;
- risque de non-conformite sur le droit a l'effacement ;
- maintien de donnees identifiantes dans d'autres tables.

Sources:

- `rap_app/api/viewsets/user_viewsets.py`
- `rap_app/models/custom_user.py`
- `rap_app/models/candidat.py`

Recommendation:

- definir une vraie strategie d'effacement par categorie de donnees :
  - suppression,
  - anonymisation irreversible,
  - conservation obligatoire justifiee,
  - archivage restreint ;
- remplacer le message actuel par une formulation exacte tant que la purge transverse n'existe pas ;
- creer un service central de suppression RGPD qui traite toutes les relations.

### C. Les logs peuvent contenir des donnees personnelles sensibles en clair

Constat:

- `_log_changes()` sur `Candidat` journalise les anciennes et nouvelles valeurs champ par champ ;
- cela inclut potentiellement `nir`, email, telephone, adresse, RQTH, infos France Travail, representant legal ;
- la sanitation actuelle masque certains secrets techniques (`password`, `token`, etc.) mais pas les donnees personnelles metier ;
- les logs sont exportables en CSV/XLSX/PDF.

Impact RGPD:

- sur-collecte et sur-conservation de donnees personnelles dans les journaux ;
- risque de diffusion secondaire via exports de logs ;
- augmentation forte de la surface de fuite.

Sources:

- `rap_app/models/candidat.py`
- `rap_app/models/logs.py`
- `rap_app/api/viewsets/logs_viewsets.py`

Recommendation:

- interdire la journalisation en clair des champs sensibles metier ;
- remplacer les valeurs par des traces du type `champ modifie` ou `masque` ;
- separer journaux techniques et journaux d'audit metier ;
- restreindre ou supprimer l'export des details de logs ;
- ajouter une duree de retention specifique pour les journaux.

## 4.2 Haute priorite

### D. Les tokens JWT sont stockes dans le `localStorage`

Constat:

- `access` et `refresh` sont stockes dans `localStorage`.

Impact RGPD / securite:

- en cas de faille XSS, exfiltration possible des tokens ;
- acces illicite a des donnees personnelles via reuse de session.

Sources:

- `frontend_rap_app/src/api/tokenStorage.ts`
- `frontend_rap_app/src/api/axios.ts`

Recommendation:

- migrer idealement vers cookies `HttpOnly`, `Secure`, `SameSite` ;
- sinon, au minimum renforcer la politique CSP, reduire la duree de vie et auditer les surfaces XSS ;
- documenter ce risque dans le registre technique si la migration est differee.

### E. La politique de confidentialite ne correspond pas au traitement reel

Constat:

- la page publique indique surtout des donnees de compte ;
- l'application traite en realite des donnees bien plus larges: NIR, adresse, date et lieu de naissance, RQTH, France Travail, representant legal, donnees de placement, documents, CERFA ;
- la mention "derniere mise a jour" est calculee dynamiquement au rendu, pas versionnee ;
- la politique dit que les donnees peuvent etre supprimees apres 24 mois d'inactivite, mais je n'ai pas trouve de mecanisme automatique correspondant.

Impact RGPD:

- information incomplete ou inexacte de la personne concernee ;
- risque sur les obligations de transparence.

Sources:

- `frontend_rap_app/src/pages/PolitiqueConfidentialite.tsx`
- `rap_app/models/candidat.py`
- `rap_app/models/documents.py`

Recommendation:

- reecrire la politique a partir des traitements reels ;
- distinguer donnees compte, donnees candidat, donnees contractuelles, documents, logs ;
- preciser finalites, bases legales, durees de conservation, destinataires, droits et point de contact ;
- versionner la date de mise a jour en dur.

### F. Les exports candidats sont tres riches et incluent des donnees sensibles

Constat:

- l'export XLSX candidats contient notamment `NIR`, coordonnees, donnees de naissance, RQTH et autres informations fortes.

Impact RGPD:

- risque de diffusion massive en dehors de l'application ;
- difficulte de maitriser la circulation des fichiers exportes ;
- besoin de forte justification metier et de restriction de role.

Sources:

- `rap_app/api/viewsets/candidat_viewsets.py`

Recommendation:

- segmenter les exports par niveau de sensibilite ;
- creer un export "operationnel minimal" par defaut ;
- reserver les champs tres sensibles a un role restreint ;
- ajouter une trace d'export plus precise ;
- envisager un filigrane nominatif ou au minimum un rappel de confidentialite dans le fichier.

## 4.3 Priorite moyenne

### G. Le retrait du consentement n'est pas symetrique a son octroi

Constat:

- pour la fiche candidat, l'auto-edition n'autorise que le passage a `true` du consentement explicite, pas son retrait ;
- cela peut etre acceptable si la base legale n'est pas le consentement, mais pas si elle l'est.

Sources:

- `rap_app/api/serializers/candidat_serializers.py`
- `frontend_rap_app/src/pages/users/MonProfil.tsx`

Recommendation:

- prevoir une vraie gestion du retrait de consentement quand il constitue la base legale ;
- associer ce retrait a une consequence metier explicite: blocage, purge, bascule de statut, notification equipe.

### H. Pas de mecanisme visible de retention automatique

Constat:

- je n'ai pas trouve de job de purge/retention pour les logs, imports, comptes inactifs, exports ou medias ;
- plusieurs assertions documentaires parlent d'archivage/suppression, mais sans mecanisme technique visible dans le depot.

Sources:

- `rap_app/models/import_job.py`
- `rap_app/models/logs.py`
- `frontend_rap_app/src/pages/PolitiqueConfidentialite.tsx`

Recommendation:

- definir des durees par type de donnees ;
- ajouter des commandes/cron de purge ou anonymisation ;
- documenter ce qui est supprime, archive ou conserve legalement.

### I. Les pieces et traces d'import peuvent contenir de la donnee personnelle

Constat:

- `ImportJob` conserve `original_filename`, `summary`, `error_payload` ;
- selon les erreurs retournees par les handlers, des donnees personnelles peuvent remonter dans les traces.

Sources:

- `rap_app/models/import_job.py`
- `rap_app/api/import_export/views.py`

Recommendation:

- encadrer strictement ce qui peut etre stocke dans `summary` et `error_payload` ;
- proscrire les snapshots de lignes source contenant des donnees nominatives ;
- ajouter une retention courte sur ces traces.

## 4.4 Priorite basse

### J. La minimisation des champs candidats merite une revue metier

Constat:

- la fiche candidat stocke un volume important de donnees ;
- certaines sont probablement justifiees par les workflows CERFA et placement, mais il faut une base legale et une duree de conservation explicites par bloc fonctionnel.

Sources:

- `rap_app/models/candidat.py`

Recommendation:

- classer les champs par finalite :
  - recrutement,
  - suivi formation,
  - contractualisation,
  - obligations legales ;
- identifier ceux qui devraient etre conditionnels, archives ou purges plus tot.

## 5. Niveau de maturite RGPD estime

Evaluation technique globale: intermediaire.

- Gouvernance RGPD dans le modele candidat: plutot bonne
- Controle d'acces applicatif: bon socle
- Transparence utilisateur: insuffisante
- Effacement / retention: insuffisant
- Protection des fichiers et des journaux: insuffisant a corriger vite

## 6. Plan d'action recommande

### Sous 7 jours

1. Fermer l'acces direct a `/media/` pour les documents sensibles.
2. Corriger la promesse de suppression RGPD dans les messages et la documentation.
3. Stopper la journalisation des valeurs de champs sensibles.
4. Lancer une revue de tous les exports contenant NIR, RQTH, adresse, documents.

### Sous 30 jours

1. Mettre en place une politique de confidentialite conforme au traitement reel.
2. Definir une matrice de retention:
   - comptes,
   - fiches candidats,
   - documents,
   - logs,
   - imports,
   - exports.
3. Concevoir un vrai workflow d'effacement RGPD transverse.
4. Reduire le contenu des exports par defaut.

### Sous 60 jours

1. Migrer l'auth front vers cookies `HttpOnly` si possible.
2. Ajouter des jobs automatiques de purge/anonymisation.
3. Mettre en place des tests de non-regression RGPD:
   - acces document scope,
   - suppression compte,
   - masquage logs,
   - blocage consentement.

## 7. Conclusion

Le projet n'est pas "hors sujet" sur le RGPD: il y a deja des briques serieuses et une vraie intention de conformite. En revanche, il existe aujourd'hui plusieurs points a risque eleve, surtout sur les fichiers, les logs, les exports et la suppression des donnees. Le chantier prioritaire n'est pas d'ajouter plus de champs RGPD, mais de fiabiliser la protection effective, la retention et la veracite des engagements affiches a l'utilisateur.
