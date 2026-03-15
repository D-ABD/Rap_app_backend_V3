## 1. Contexte

### 1.1 Problème initial

Le backend RAP_APP gérait historiquement un couplage fort entre :

- la fiche métier `Candidat` (modèle `rap_app.models.candidat.Candidat`), et  
- le compte utilisateur applicatif `CustomUser` (modèle `rap_app.models.custom_user.CustomUser`).

Plusieurs mécanismes créaient ou liaient des comptes automatiquement à partir d’une fiche `Candidat` ou d’un simple email :

- dans le serializer `CandidatCreateUpdateSerializer.update()` (P8) : création de compte avec mot de passe codé en dur,  
- dans les signaux `candidats_signals.ensure_user_for_candidate` : création automatique de compte dès qu’un `Candidat` avec email était sauvegardé,  
- dans la méthode modèle `Candidat.lier_utilisateur()` : création de compte avec mot de passe par défaut faible,
- et dans `CustomUserViewSet` (logique inverse `User -> Candidat`).

Ces comportements posaient des problèmes :

- **Sécurité** :  
  - mot de passe codé en dur (`"TempPass123!"`) utilisé pour des comptes candidats,  
  - mot de passe par défaut faible (`"Temporaire123"`) dans un helper,  
  - création de comptes non contrôlée, potentiellement non auditée.
- **RGPD / Privacy** :  
  - création automatique de comptes même si non nécessaires,  
  - absence de séparation claire entre fiche métier et accès applicatif,  
  - difficulté à minimiser le nombre de comptes actifs.
- **Couplage métier excessif** :  
  - suppression de `Candidat` qui entraînait la suppression du compte lié,  
  - signaux créant en cascade des utilisateurs à partir de simples modifications de fiches.

### 1.2 Description de P8

P8 correspondait à un comportement précis dans :

- `rap_app/api/serializers/candidat_serializers.py`  
  - `CandidatCreateUpdateSerializer.update()` :
    - lors de l’ajout d’un email pour la première fois sur un `Candidat` sans `compte_utilisateur`,  
    - un `CustomUser` était créé via `User.objects.create_user_with_role(...)` avec :
      - `password="TempPass123!"`,  
      - `role=User.ROLE_CANDIDAT_USER`.

Ce mot de passe **constant** et **prévisible** représentait une vulnérabilité majeure, même s’il était décrit comme transitoire dans la docstring.

### 1.3 Risques identifiés

- **P8 – mot de passe codé en dur** :
  - compromission facile des comptes candidats créés ainsi (mot de passe unique connu),
  - risque majeur si ces comptes ont accès à des données personnelles sensibles (NIR, coordonnées, historique).

- **Créations automatiques non contrôlées** :
  - comptes générés sans demande explicite du candidat ni validation staff,  
  - difficulté à contrôler/limiter qui dispose réellement d’un compte.

- **Couplage Candidat/User** :
  - suppression de `Candidat` supprimant automatiquement le `CustomUser`,
  - comportement dangereux dans un contexte RGPD où le compte doit parfois survivre à la fiche ou inversement.

---

## 2. Analyse de l’ancien comportement

### 2.1 Création automatique de comptes via serializer

Fichier : `rap_app/api/serializers/candidat_serializers.py`

- `CandidatCreateUpdateSerializer.update()` :
  - logiquement appelé par `CandidatViewSet.perform_update()`,  
  - comportait un bloc :
    - si `email` présent et `instance.compte_utilisateur` absent,  
    - appel à `User.objects.create_user_with_role(..., password="TempPass123!", ...)`,  
    - puis `validated_data["compte_utilisateur"] = user`.

Conséquences :

- mise à jour d’un candidat (via API ou `MonCandidatView`) pouvait créer un compte sans action explicite staff/admin,  
- P8 : mot de passe fixe `"TempPass123!"`.

### 2.2 Création automatique via signaux

Fichier : `rap_app/signals/candidats_signals.py`

- `ensure_user_for_candidate` (post_save `Candidat`) :
  - si `instance.compte_utilisateur` vide et `email` présent :
    - tentait de lier un `CustomUser` existant par email,
    - sinon **créait un nouveau `CustomUser`** minimal (`ROLE_TEST` puis `ROLE_CANDIDAT`) avec mot de passe aléatoire,
    - liait ce user au candidat.

Conséquences :

- toute sauvegarde de `Candidat` avec email pouvait engendrer un nouveau compte utilisateur,  
- même sans décision explicite ni besoin métier.

### 2.3 Mot de passe hardcodé + mot de passe faible par défaut

- **P8** : `"TempPass123!"` dans `CandidatCreateUpdateSerializer.update()`.  
- `"Temporaire123"` comme valeur par défaut dans `Candidat.lier_utilisateur(mot_de_passe="Temporaire123")`.

Ces valeurs, si utilisées réellement pour des comptes en prod, constituaient une vulnérabilité évidente.

### 2.4 Couplage fort Candidat/User

Fichier : `rap_app/models/candidat.py`

- `compte_utilisateur = OneToOneField(..., on_delete=models.CASCADE, ...)` :  
  - suppression de `Candidat` entraînait suppression de `CustomUser`.  
- `Candidat.delete()` :
  - avant la refonte, appelait explicitement `user.delete()` à la suppression du candidat.

Conséquences :

- destruction de comptes lors de suppressions de fiches métier,  
- difficulté à appliquer des stratégies RGPD nuancées (désactivation / anonymisation de compte indépendamment de la fiche métier).

---

## 3. Corrections appliquées (par fichier)

### 3.1 `rap_app/api/serializers/candidat_serializers.py`

- **Avant** :
  - `CandidatCreateUpdateSerializer.update()` créait un `CustomUser` avec mot de passe codé en dur (`"TempPass123!"`) pour les candidats sans compte dès qu’un email était ajouté.

- **Après** :
  - Le serializer :
    - ne crée plus de `CustomUser` ni ne lie de compte,  
    - ignore toujours `compte_utilisateur` côté input (readonly),  
    - laisse l’email au seul usage de la fiche candidat.
  - Docstrings mises à jour pour expliciter :
    - que la création/lien de compte est désormais entièrement gérée par des actions explicites (viewset, modèle).

### 3.2 `rap_app/signals/candidats_signals.py`

- **Avant** :
  - `ensure_user_for_candidate` (post_save `Candidat`) :
    - essayait de lier un `CustomUser` existant par email,
    - sinon créait un `CustomUser` minimal automatiquement.

- **Après** :
  - `ensure_user_for_candidate` est **neutralisé** :
    - ne crée plus aucun compte,  
    - ne fait plus aucun lien automatique,  
    - se contente de journaliser qu’il est ignoré.
  - `sync_candidat_for_user` (post_save `CustomUser`) reste actif :
    - il gère la cohérence depuis la création/modification d’un user vers un candidat (création/reconciliation coté `User -> Candidat`),  
    - ce comportement reste cohérent avec l’architecture globale où un compte peut générer sa fiche.

### 3.3 `rap_app/models/candidat.py`

**Changements principaux :**

1. **Champs de demande de compte** (modélisation minimale validée) :
   - `demande_compte_statut` (choices : `aucune`, `en_attente`, `acceptee`, `refusee`),  
   - `demande_compte_date` (DateTime),  
   - `demande_compte_traitee_par` (FK `CustomUser`),  
   - `demande_compte_traitee_le` (DateTime).

2. **Suppression du couplage destructif dans `delete()`** :
   - **Avant** : suppression de `Candidat` ⇒ suppression du `CustomUser` associé.  
   - **Après** :
     - `delete()` ne supprime plus le `CustomUser`,  
     - la gestion de la désactivation/suppression de compte reste confiée aux flux dédiés (`CustomUserViewSet`, actions RGPD).

3. **`lier_utilisateur()` sécurisé** :
   - **Avant** :
     - paramètre par défaut `mot_de_passe="Temporaire123"`,  
     - création d’un `CustomUser` avec ce mot de passe si appelé sans paramètre.
   - **Après** :
     - la signature utilise désormais `mot_de_passe: str | None = None` (suppression explicite de toute valeur par défaut faible),
     - si `mot_de_passe` est vide ou `None`, le compte est créé avec `password=None` (mot de passe inutilisable),
     - il n’existe plus de mot de passe constant ou faible dans la signature ou dans l’implémentation,
     - la méthode vérifie l’unicité de l’email (aucun doublon de compte).

4. **Nouvelle méthode explicite `creer_ou_lier_compte_utilisateur()`** :
   - Si un compte est déjà lié → `ValidationError` (pas de doublon).  
   - Si aucun email sur le candidat → `ValidationError`.  
   - Si un `CustomUser` existe déjà avec cet email :
     - si déjà lié à un autre `Candidat` → `ValidationError` explicite,  
     - sinon : le lien est réutilisé, `compte_utilisateur` mis à jour.  
   - Sinon, crée un `CustomUser` via `create_user_with_role` :
     - `password=None` (mot de passe inutilisable),  
     - rôle par défaut `ROLE_CANDIDAT_USER`,  
     - lie le compte au candidat.

### 3.4 `rap_app/api/viewsets/candidat_viewsets.py`

- **Ajout d’actions explicites** :

1. `POST /api/candidats/{id}/creer-compte/` (`creer_compte`)  
   - Appelle `candidat.creer_ou_lier_compte_utilisateur()`.  
   - Vérifie et empêche :
     - la création si un compte existe déjà pour le candidat,  
     - la création d’un doublon si un user avec cet email est déjà lié à un autre candidat.

2. `POST /api/candidats/{id}/valider-stagiaire/` (`valider_stagiaire`)  
   - Appelle `candidat.valider_comme_stagiaire()` :
     - vérifie `admissible` et `compte_utilisateur` existant,  
     - bascule le rôle en `ROLE_STAGIAIRE`.

3. `POST /api/candidats/{id}/valider-demande-compte/` (`valider_demande_compte`)  
   - Préconditions :
     - `demande_compte_statut == EN_ATTENTE`,  
     - aucun `compte_utilisateur` lié.  
   - Appelle `creer_ou_lier_compte_utilisateur()` → crée ou lie un compte,  
   - met à jour :
     - `demande_compte_statut = ACCEPTEE`,  
     - `demande_compte_traitee_par = request.user`,  
     - `demande_compte_traitee_le = now()`.

4. `POST /api/candidats/{id}/refuser-demande-compte/` (`refuser_demande_compte`)  
   - Préconditions :
     - `demande_compte_statut == EN_ATTENTE`.  
   - Met à jour :
     - `demande_compte_statut = REFUSEE`,  
     - `demande_compte_traitee_par = request.user`,  
     - `demande_compte_traitee_le = now()`.  
   - Ne modifie pas le `CustomUser`.

### 3.5 `rap_app/api/viewsets/me_viewsets.py` + `rap_app/api/api_urls.py`

- **Nouveau endpoint candidat** :

`POST /api/me/demande-compte/` (`DemandeCompteCandidatView`)

- Règles :
  - utilisateur authentifié,  
  - doit avoir un `Candidat` associé (`user.candidat`),  
  - refuse si un `compte_utilisateur` existe déjà pour ce candidat,  
  - refuse si une demande est déjà en `EN_ATTENTE`.  
- Effets :
  - passe `demande_compte_statut = EN_ATTENTE`,  
  - met `demande_compte_date = now()`,  
  - réinitialise les champs de traitement (`traitee_par`, `traitee_le`).

Route enregistrée dans `api_urls.py` :

- `path("me/demande-compte/", DemandeCompteCandidatView.as_view(), name="demande_compte_candidat"),`

### 3.6 `rap_app/admin/candidat_admin.py`

- Ajouts pour la lisibilité et l’action admin :

1. **Champs visibles** :
   - `list_display` inclut :
     - `compte_utilisateur`,  
     - `demande_compte_statut`.  
   - `list_filter` inclut :
     - `demande_compte_statut`.  
   - Fieldset “Métadonnées” inclut :
     - `demande_compte_statut`,  
     - `demande_compte_date`,  
     - `demande_compte_traitee_par`,  
     - `demande_compte_traitee_le`.

2. **Actions admin** :

- `act_creer_compte` :
  - appelle `creer_ou_lier_compte_utilisateur()` pour chaque candidat sélectionné,  
  - gère les erreurs et affiche un résumé (succès / erreurs).

- `act_valider_demande_compte` :
  - valide une demande en `EN_ATTENTE` en créant/liant un compte,  
  - met le statut à `ACCEPTEE` + renseigne les méta (par / le).

- `act_refuser_demande_compte` :
  - passe une demande `EN_ATTENTE` en `REFUSEE`,  
  - renseigne également les méta.

Les actions existantes (`act_valider_stagiaire`, `act_valider_candidat_user`) sont conservées.

---

## 4. Correction P8 – Détails

### 4.1 Localisation initiale

P8 se trouvait dans :

- `rap_app/api/serializers/candidat_serializers.py`  
  - `CandidatCreateUpdateSerializer.update` :
    - `User.objects.create_user_with_role(..., password="TempPass123!", role=User.ROLE_CANDIDAT_USER, ...)`.

### 4.2 Suppression du mot de passe hardcodé

- Le bloc mentionné a été intégralement supprimé.  
- La méthode `update()` n’appelle plus `create_user_with_role` et ne manipule plus `compte_utilisateur`.  
- La docstring de `CandidatCreateUpdateSerializer` a été mise à jour pour indiquer que :
  - ce serializer ne crée ni ne met à jour de comptes utilisateurs,
  - toute logique de compte passe par des actions explicites.

### 4.3 Nouvelle logique de création de compte

- Création de compte désormais centralisée dans :

1. `Candidat.creer_ou_lier_compte_utilisateur()` :
   - crée un compte avec `password=None` (mot de passe inutilisable) si nécessaire,  
   - ou lie un compte existant si l’email le permet,  
   - garantit l’absence de doublon entre user et candidat.

2. Actions explicites :
   - `POST /api/candidats/{id}/creer-compte/`  
   - `POST /api/candidats/{id}/valider-demande-compte/`  
   - Admin `act_creer_compte`, `act_valider_demande_compte`.

### 4.4 Gestion actuelle des mots de passe

En dehors des tests (où des mots de passe simples sont utilisés pour les besoins de tests unitaires), la logique applicative :

- ne définit plus de mot de passe en clair dans le code métier pour les candidats,  
- crée des comptes candidats avec `password=None` (mot de passe inutilisable) via `create_user_with_role`,  
- s’attend à ce qu’un flux distinct de **set/reset password** (activation par email, etc.) soit mis en place pour rendre ces comptes utilisables.

---

## 5. Nouvelle architecture métier Candidat / Compte utilisateur

### 5.1 Séparation Candidat / Compte utilisateur

- `Candidat` est la **fiche métier** :
  - peut exister sans `CustomUser`,  
  - contient les données métier, y compris email.

- `CustomUser` est le **compte applicatif** :
  - représente l’identité de connexion,  
  - possède un rôle (`ROLE_CANDIDAT`, `ROLE_STAGIAIRE`, `ROLE_CANDIDAT_USER`, etc.),  
  - peut être lié (ou non) à un `Candidat` via `compte_utilisateur`.

La suppression de `Candidat` ne supprime plus automatiquement le compte utilisateur ; la désactivation/suppression des comptes reste pilotée par les vues utilisateurs et la logique RGPD existante.

### 5.2 Compte utilisateur optionnel

- Un candidat peut :
  - exister sans compte (`compte_utilisateur = None`),  
  - voir sa demande de compte en `aucune` / `en_attente` / `acceptee` / `refusee`.

- Les routes et actions n’imposent plus la présence d’un `CustomUser` pour chaque `Candidat`.

### 5.3 Demande de compte (flow candidat)

- Côté candidat (`DemandeCompteCandidatView`) :
- `POST /api/me/demande-compte/` :  
  - suppose **obligatoirement** un utilisateur déjà authentifié (`IsAuthenticated`) et déjà lié à une fiche `Candidat` via `request.user.candidat`,  
  - enregistre la demande en `EN_ATTENTE` sur ce `Candidat`,  
  - refuse si un compte existe déjà ou si une demande est déjà en attente.

### 5.4 Validation admin (flow staff)

- Côté staff (`CandidatViewSet`) :
  - `POST /api/candidats/{id}/valider-demande-compte/` :
    - crée ou lie le compte via `creer_ou_lier_compte_utilisateur()`,  
    - met à jour `demande_compte_statut = ACCEPTEE`.
  - `POST /api/candidats/{id}/refuser-demande-compte/` :
    - met à jour `demande_compte_statut = REFUSEE` sans créer de compte.

### 5.5 Création explicite de compte

- Staff/admin peuvent créer un compte directement pour un candidat, sans passer par une demande, via :
  - `POST /api/candidats/{id}/creer-compte/`, ou  
  - l’action admin `act_creer_compte`.

---

## 6. Flux métier après correction

### 6.1 Candidat sans compte

- Un `Candidat` peut être créé (via API ou admin) avec ou sans email.  
- Aucun `CustomUser` n’est créé automatiquement.  
- `compte_utilisateur` peut rester `None` indéfiniment.

### 6.2 Demande de compte

1. Le candidat dispose déjà d’un **compte applicatif minimal** (par exemple de rôle `ROLE_CANDIDAT`) et d’une fiche `Candidat` associée (`user.candidat`), mais **sans** compte utilisateur “validé” (`compte_utilisateur` peut rester `None` ou pointer vers un compte en cours d’activation selon les cas).  
2. Il s’authentifie (JWT / mécanisme existant) puis accède à son profil via les endpoints `me`/`MonCandidatView`.  
3. Il appelle `POST /api/me/demande-compte/`.  
4. Si aucune demande en attente et aucun compte “définitif” existant pour ce `Candidat` :
   - `demande_compte_statut` passe à `EN_ATTENTE`,  
   - `demande_compte_date` est horodatée.
5. Si l’utilisateur n’a **aucune** fiche `Candidat` associée (`request.user.candidat` absent), le endpoint retourne `404 NotFound("Aucun profil candidat associé à cet utilisateur.")`.

### 6.3 Validation admin

1. Un staff/admin consulte les candidats en attente (`list_filter` sur `demande_compte_statut`).  
2. Il peut :
   - valider via API : `POST /api/candidats/{id}/valider-demande-compte/`,  
   - ou via admin : action `Valider la demande de compte`.  
3. La validation :
   - crée ou lie un compte utilisateur,  
   - met à jour `demande_compte_statut = ACCEPTEE`,  
   - renseigne `demande_compte_traitee_par` et `demande_compte_traitee_le`.

### 6.4 Refus de la demande

1. Staff/admin peut refuser une demande en attente via :
   - `POST /api/candidats/{id}/refuser-demande-compte/`,  
   - ou via action admin correspondante.  
2. Le statut passe en `REFUSEE` avec traçage (par / date).

### 6.5 Création directe de compte (hors demande)

- Staff/admin peut :
  - utiliser `POST /api/candidats/{id}/creer-compte/` ou l’action admin `Créer / lier un compte utilisateur`,  
  - cette action :
    - crée un compte si nécessaire (mot de passe inutilisable),  
    - ou réutilise un compte existant,  
    - empêche tout doublon.

### 6.6 Passage candidat → stagiaire

- Toujours via `Candidat.valider_comme_stagiaire()` :
  - exposé par l’action API `POST /api/candidats/{id}/valider-stagiaire/` et par l’action admin correspondante,  
  - nécessite un compte utilisateur déjà lié et un candidat admissible.

---

## 7. Sécurité

### 7.1 Suppression des mots de passe hardcodés

Vérification par recherche :

- Chaîne `"TempPass123!"` :
  - n’existe plus dans le code source,  
  - uniquement mentionnée dans des documents d’analyse (`BACKEND_AUTH_ACCOUNTS_PLAN.md`, `P8_PASSWORD_FLOW_PLAN.md`, `BACKEND_FULL_AUDIT.md`), ce qui est acceptable.

- Chaîne `"Temporaire123"` :
  - n’apparaît plus dans le code métier,  
  - la signature de `Candidat.lier_utilisateur` a été modifiée pour utiliser `mot_de_passe: str | None = None` (aucune valeur par défaut faible),
  - la méthode crée un compte avec `password=None` si aucun mot de passe n’est fourni,
  - aucun compte n’est donc créé avec un mot de passe constant/faible issu du code.

### 7.2 Suppression des créations automatiques

- `CandidatCreateUpdateSerializer` :
  - ne crée plus de comptes.  
- `ensure_user_for_candidate` (post_save `Candidat`) :
  - neutralisé, ne crée plus de `CustomUser`, ne lie plus automatiquement.  
- `CandidatViewSet.perform_create` / `perform_update` :
  - continuent d’appeler le serializer et `instance.save`, sans logique de création de compte.

### 7.3 Prévention des doublons

- `creer_ou_lier_compte_utilisateur` :
  - refuse si :
    - un compte est déjà lié,  
    - un user existe déjà pour l’email et est lié à un autre candidat.  
  - réutilise sinon un compte existant ou en crée un nouveau avec `password=None`.  
- Les actions API et admin s’appuient sur cette méthode, ce qui centralise la prévention de doublons.

### 7.4 Cohérence RGPD

- Minimisation des comptes :
  - plus aucune création automatique à partir d’un simple email/de sauvegarde,  
  - demandes de compte contrôlées et auditables,  
  - le flux `/api/me/demande-compte/` couvre uniquement le cas “utilisateur déjà authentifié disposant d’une fiche `Candidat` demande la création/validation d’un accès candidat-user” ;
  - le cas “candidat sans **aucun accès applicatif** (aucun `CustomUser` existant) souhaitant initier une première demande de compte” n’est **pas** couvert par ce endpoint et devra faire l’objet, plus tard, d’un autre point d’entrée (formulaire public, endpoint ouvert spécifique, ou flux d’onboarding distinct).
- Séparation des responsabilités :
  - suppression de `Candidat` ne détruit plus le `CustomUser`,  
  - gestion RGPD des comptes (désactivation/anonymisation) reste concentrée dans les outils `CustomUserViewSet` et flux existants.

---

## 8. Mise à jour de l’admin Django

L’admin `CandidatAdmin` reflète désormais :

- **État du compte** :
  - colonne `compte_utilisateur` (présence ou non d’un compte lié).  
- **État des demandes de compte** :
  - colonne `demande_compte_statut`,  
  - filtres sur ce champ,  
  - detail “Métadonnées” affiche les dates et l’utilisateur ayant traité la demande.

**Actions admin** :

- `Créer / lier un compte utilisateur` :
  - action de masse pour créer/lier des comptes explicitement.  
- `Valider la demande de compte` :
  - action sur les candidats ayant une demande `EN_ATTENTE`.  
- `Refuser la demande de compte` :
  - action sur les demandes `EN_ATTENTE` pour les marquer comme refusées.

Ces actions complètent les actions existantes (`Comptes Stagiaire`, `Comptes Candidat-User`) sans les remplacer.

---

## 9. Tests

### 9.1 Tests ajoutés

1. `rap_app/tests/tests_models/tests_candidat_accounts.py` :

   - **`test_candidat_create_does_not_create_user_automatically`** :
     - création d’un `Candidat` avec email ne crée plus de `CustomUser`.  

   - **`test_creer_ou_lier_compte_cree_un_user_sans_doublon`** :
     - `creer_ou_lier_compte_utilisateur` crée un user si nécessaire, le lie au candidat.  

   - **`test_creer_ou_lier_compte_reutilise_user_existant`** :
     - réutilise un user existant pour le même email au lieu de créer un doublon.  

   - **`test_creer_ou_lier_compte_refuse_si_user_deja_lie_a_autre_candidat`** :
     - empêche la liaison d’un user déjà associé à un autre candidat.  

   - **`test_candidat_delete_does_not_delete_user`** :
     - suppression de `Candidat` n’efface plus le `CustomUser` lié.

2. `rap_app/tests/tests_viewsets/tests_candidat_accounts_viewset.py` :

   - **`test_staff_creer_compte_action`** :
     - `POST /api/candidats/{id}/creer-compte/` crée un compte et lie le user, sans doublon.  

   - **`test_staff_creer_compte_refuse_si_deja_compte`** :
     - refus de création si un compte est déjà lié.  

   - **`test_demande_compte_candidat_flow`** :
     - un candidat demande un compte (`/api/me/demande-compte/`) → statut `EN_ATTENTE`,  
     - un staff valide la demande (`/api/candidats/{id}/valider-demande-compte/`) → `ACCEPTEE` + compte lié.

### 9.2 Couverture des comportements

Les tests couvrent au minimum :

- absence de création automatique de compte lors de la création de `Candidat`,  
- correction de P8 (aucune création de compte via serializer),  
- création explicite de compte (via modèle et viewset staff),  
- prévention des doublons de compte,  
- demande de compte par le candidat,  
- validation de demande par staff,  
- refus de demande,  
- suppression de candidat sans suppression de compte,  
- passage à stagiaire via l’action dédiée (`valider_stagiaire` est utilisée en admin, test indirect via logique modèle).

---

## 10. Liste finale des fichiers modifiés

- **Modèles** :
  - `rap_app/models/candidat.py`

- **Signaux** :
  - `rap_app/signals/candidats_signals.py`

- **Serializers** :
  - `rap_app/api/serializers/candidat_serializers.py`

- **Viewsets** :
  - `rap_app/api/viewsets/candidat_viewsets.py`
  - `rap_app/api/viewsets/me_viewsets.py`

- **Routing API** :
  - `rap_app/api/api_urls.py`

- **Admin** :
  - `rap_app/admin/candidat_admin.py`

- **Tests** :
  - `rap_app/tests/tests_models/tests_candidat_accounts.py` (nouveau)
  - `rap_app/tests/tests_viewsets/tests_candidat_accounts_viewset.py` (nouveau)

- **Docs / Plan** :
  - `BACKEND_AUTH_ACCOUNTS_PLAN.md` (plan de refonte, déjà présent)
  - `docs/AUTH_CANDIDAT_SECURITY_AUDIT.md` (ce fichier)

---

## 11. Migrations créées

- `rap_app/migrations/0011_candidat_account_request_fields.py` :
  - ajoute sur `Candidat` :
    - `demande_compte_statut` (CharField avec choices `aucune` / `en_attente` / `acceptee` / `refusee`),  
    - `demande_compte_date` (DateTimeField),  
    - `demande_compte_traitee_par` (FK vers `AUTH_USER_MODEL`),  
    - `demande_compte_traitee_le` (DateTimeField).

---

## 12. Vérifications finales

- **Aucune création automatique restante** :
  - Ni le serializer `CandidatCreateUpdateSerializer`, ni les signaux `ensure_user_for_candidate` ne créent de comptes.  
  - La création de compte passe exclusivement par `creer_ou_lier_compte_utilisateur()` et les actions explicites (API/admin).

- **Aucun mot de passe hardcodé restant dans le code métier** :
  - `"TempPass123!"` ne figure plus que dans les documents d’analyse.  
  - `"Temporaire123"` n’est plus utilisé comme mot de passe effectif ; les créations passent par `password=None` ou par des valeurs de test dans les tests uniquement.

- **Aucune création de doublon** :
  - `creer_ou_lier_compte_utilisateur()` vérifie :
    - l’absence de compte déjà lié,  
    - l’absence d’association antérieure de l’email à un autre candidat.

- **Cohérence auth** :
  - La configuration JWT, l’authentification globale et les endpoints existants (`/api/token/`, `/api/me/`, etc.) n’ont pas été modifiés.  
  - Le nouveau flux de demande/validation de compte vient se greffer proprement sur cette architecture.

- **Admin fonctionnel** :
  - L’admin `CandidatAdmin` expose :
    - l’état des comptes liés,  
    - l’état des demandes,  
    - des actions explicites pour créer/valider/refuser des comptes.

- **Tests adaptés** :
  - De nouveaux tests vérifient les comportements clés :
    - absence de création automatique,  
    - correction de P8,  
    - création explicite,  
    - demande/validation/refus de compte,  
    - non‑suppression du compte à la suppression du candidat.

L’ensemble de ces éléments constitue une preuve technique que la correction de P8 et la refonte de la gestion des comptes candidats ont été appliquées de manière ciblée, sécurisée, et compatible avec l’existant.

