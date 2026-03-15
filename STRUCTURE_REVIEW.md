# Revue structurelle — Rap_App Django

**Date :** Mars 2025  
**Objectif :** Évaluer si l’application est suffisamment claire, cohérente et bien structurée pour qu’un développeur senior ou une IA puisse la comprendre, la maintenir et la faire évoluer sans risque excessif.  
**Périmètre :** apps, models, serializers, viewsets, services, signals, permissions, roles, admin, mixins, paginations, utils, urls, api_urls, settings, tests. Analyse du code réel. Aucune modification de code (hors création de ce fichier).

**Conventions :**
- **Constat vérifié** : observé dans le code (fichier ou pattern explicite).
- **Suspicion technique** : déduction plausible à confirmer par revue ou test.
- **À confirmer** : information non certaine dans le périmètre analysé.

---

# 1. Lisibilité globale du projet

## 1.1 Structure du dépôt

- **Racine** : projet Django `rap_app_project` (settings, urls, wsgi) ; app métier `rap_app` au même niveau que le projet. **Constat vérifié** : une seule app métier, pas de dispersion multi-apps.
- **rap_app** : dossiers nets — `models/`, `api/` (serializers, viewsets, permissions, roles, mixins, paginations, api_urls), `admin/`, `signals/`, `services/`, `utils/`, `tests/`, `management/`, `migrations/`. Pas de fichier orphelin évident à la racine de l’app (à l’exception d’`export_viewset.py` présent mais non référencé dans api_urls). **Constat vérifié**.
- **Nommage** : aligné sur le domaine (candidat, formation, prospection, appairage, centre, partenaire, declic, prepa). Fichiers de serializers et viewsets suivent en général le même préfixe que le modèle (candidat_serializers / candidat_viewsets). **Constat vérifié**.

## 1.2 Compréhension rapide

- Un nouveau lecteur peut identifier en quelques minutes : une app, une API REST sous `api/`, une admin sous `admin/`, des signaux sous `signals/`, des services sous `services/`. **Constat vérifié**.
- L’entrée unique de l’API est claire : `rap_app_project/urls.py` → `include('rap_app.api.api_urls')` ; `api_urls.py` contient le Router et les path() pour auth/me/search. **Constat vérifié**.
- Les modèles sont agrégés dans `models/__init__.py` ; il faut lire ce fichier pour savoir quels modèles existent. Les signaux sont chargés explicitement dans `apps.py` — pas de découverte automatique. **Constat vérifié**.

## 1.3 Facilité d’orientation

- **Points positifs** : arborescence prévisible, noms de fichiers et de classes cohérents avec le métier, docstrings présentes sur de nombreux ViewSets et serializers. TECHNICAL_AUDIT et ERROR_HANDLING_AUDIT fournissent des points d’entrée. **Constat vérifié**.
- **Points négatifs** : aucun document unique listant les conventions (format de réponse API, répartition validation / règle métier, scope par centre). Le rôle d’ExportViewSet et de GenerateurRapport n’est pas documenté dans le code. **Constat vérifié** pour l’absence de doc des conventions ; **suspicion** pour l’orientation d’un nouvel arrivant sans les audits existants.

---

# 2. Séparation des responsabilités

## 2.1 Par couche

- **Models** : entités métier, champs, relations, `clean()` pour validations de cohérence, quelques méthodes métier (add_commentaire, add_document, synthese_globale, creer_ou_lier_compte_utilisateur, etc.). **Constat vérifié** : les modèles portent à la fois structure et une partie de la logique métier ; la frontière avec les serializers n’est pas formalisée.
- **Serializers** : représentation (champs, nested), validations (`validate`, `validate_<field>`), parfois logique de création/mise à jour (user_profil_serializers, rapports_serializers). **Constat vérifié** : une partie des validations et des règles métier (rôles, doublons, champs conditionnels) est dans les serializers ; une partie est dans les modèles (clean). Pas de règle explicite du type « validation de format → serializer, règle métier → modèle ».
- **Viewsets** : orchestration (get_queryset, get_serializer_class, actions), filtrage par rôle/centre, appels aux serializers et aux modèles, parfois vérifications métier avant appel (PermissionDenied, ValidationError). **Constat vérifié** : la logique de scope (centres, rôles) est principalement dans les viewsets (get_queryset, méthodes dédiées) et dans les permissions ; les viewsets contiennent aussi des vérifications métier (état en attente, formation obligatoire, etc.) qui pourraient relever du modèle ou d’un service.
- **Services** : deux modules (generateur_rapports, evenements_export) ; evenements_export utilisé par le viewset événements ; generateur_rapports non appelé par l’API. **Constat vérifié** : couche service peu utilisée pour isoler la logique métier lourde ; une partie reste dans les modèles (synthese_globale, add_*) et dans les serializers.
- **Signals** : traçabilité (LogUtilisateur), synchronisation (User ↔ Candidat, formation_id sur Prospection). **Constat vérifié** : les signaux ne sont pas documentés comme « couche métier » ; ils ont des effets de bord importants (candidats_signals) et sont chargés manuellement dans apps.py.
- **Permissions** : refus d’accès (has_permission, has_object_permission) et messages associés. **Constat vérifié** : responsabilité claire ; pas de logique métier hors accès.
- **Roles** : helpers (is_admin_like, staff_centre_ids, get_staff_centre_ids_cached). **Constat vérifié** : pas de logique métier, uniquement calcul de périmètre et de rôle.
- **Admin** : enregistrement des modèles, list_display, list_filter, actions, parfois logique d’export ou de masse. **Constat vérifié** : responsabilité limitée à l’interface admin ; pas de réutilisation des services.
- **Utils** : filters (DjangoFilterBackend / FilterSet), outils Cerfa, exporter, logging_utils. **Constat vérifié** : filters utilisés par plusieurs viewsets ; les autres utils n’ont pas d’usage repéré dans l’API — **suspicion** : usage en scripts ou maintenance.

## 2.2 Logique métier mal placée

- **Constat vérifié** : Champs calculés et agrégations (taux, indicateurs) dans les serializers (formations_serializers, candidat_serializers) plutôt que dans des propriétés ou méthodes de modèle ou dans un service. Évolution des règles de calcul oblige à toucher les serializers.
- **Constat vérifié** : Vérifications métier dans les viewsets (ex. candidat_viewsets : demande en attente, compte déjà lié ; formations_viewsets : _ensure_required_refs) alors que des méthodes de modèle (ex. Candidat) pourraient les encapsuler.
- **Suspicion** : Une partie de la « logique métier » est implicite dans les signaux (sync Candidat/User, formation_id Prospection) ; un lecteur qui ne parcourt pas les signaux peut ignorer ces effets.

## 2.3 Validation mal placée

- **Constat vérifié** : Validations présentes à la fois dans `clean()` des modèles et dans `validate()` / `validate_<field>()` des serializers. Parfois redondance (ex. contenu non vide, champs obligatoires) ; pas de convention documentée sur qui fait quoi.
- **Constat vérifié** : formations_viewsets._ensure_required_refs lève ValidationError DRF pour centre_id, type_offre_id, statut_id — validation « workflow » en vue alors que le serializer de création pourrait les exiger.

## 2.4 Duplication de responsabilités

- **Constat vérifié** : Filtrage par centre (scope staff) réimplémenté dans plusieurs viewsets (get_queryset + staff_centre_ids ou get_staff_centre_ids_cached) avec des variantes (centres seuls, centres + départements). StaffCentresScopeMixin existe mais n’est pas utilisé partout ; FormationViewSet utilise _restrict_to_user_centres au lieu du mixin.
- **Constat vérifié** : Format de réponse { success, message, data } répété dans list/retrieve/create/update de plusieurs viewsets (rapports, logs, formations, etc.) sans mixin ni helper commun.
- **Suspicion** : Paramètre `by` dans les stats viewsets : validation et messages d’erreur similaires dans plusieurs fichiers, sans factorisation.

## 2.5 Couches trop couplées

- **Constat vérifié** : formations_serializers et candidat_serializers importent de nombreux sous-serializers et modèles ; un changement de schéma (champ supprimé, relation renommée) peut imposer des modifications en chaîne.
- **Constat vérifié** : ViewSets dépendent fortement de roles.py et permissions.py ; toute évolution des rôles ou des règles d’accès impacte de nombreux fichiers.
- **Constat vérifié** : api_urls.py importe tous les viewsets ; une erreur d’import dans un seul viewset peut empêcher le chargement de toute l’API.

---

# 3. Clarté métier

## 3.1 Logique métier visible ou non

- **Visible** : Rôles (staff, staff_read, admin, candidat, prepa_staff, declic_staff) et périmètre par centres sont explicites dans permissions.py et roles.py. Les messages d’erreur (PermissionDenied) décrivent souvent la règle (« Formation hors de votre périmètre », « Vous ne pouvez modifier que vos propres partenaires »). **Constat vérifié**.
- **Peu visible** : Synchronisation User ↔ Candidat (candidats_signals) et propagation formation_id sur Prospection (pre_save Prospection) ne sont pas documentées dans un seul endroit ; il faut lire les signaux pour les comprendre. **Constat vérifié**.
- **À confirmer** : Règles métier « qui peut voir quelles formations » (toutes vs par centre) dépendent du correctif du bug `u` dans formations_viewsets et de l’intention métier ; non écrites dans le code.

## 3.2 Dépendances implicites

- **Constat vérifié** : Les signaux sont enregistrés uniquement via l’import dans apps.py ; aucun mécanisme de découverte. Un nouveau signal non importé dans apps.py ne s’exécute pas.
- **Constat vérifié** : Plusieurs viewsets s’appuient sur l’existence de `user.centres` (relation M2M ou équivalent) et sur staff_centre_ids() ; si le modèle CustomUser change (nom de la relation, structure), roles.py et tous les get_queryset concernés sont impactés — dépendance implicite au schéma User.
- **Suspicion** : Certaines actions (export-xlsx, synthese_globale) dépendent de méthodes de modèle ou de serializer dont la signature et le comportement ne sont pas décrits dans un contrat unique.

## 3.3 Comportements difficiles à déduire

- **Constat vérifié** : FormationViewSet hérite de UserVisibilityScopeMixin mais override get_queryset via _build_base_queryset et _restrict_to_user_centres ; le comportement effectif (filtrage par centre) n’est pas lisible sans lire le code de _restrict_to_user_centres (et la variable `u` non définie rend le comportement actuel erroné).
- **Constat vérifié** : ExportViewSet et GenerateurRapport : présence dans le code sans branchement (ExportViewSet) ou sans appelant (GenerateurRapport) — intention (futur, abandon, usage hors API) non déductible.
- **Suspicion** : Comportement en cas de staff sans aucun centre rattaché (liste vide vs erreur) varie peut-être selon les viewsets ; non vérifié de façon exhaustive.

## 3.4 Effets de bord cachés

- **Constat vérifié** : post_save CustomUser déclenche sync Candidat (création, réconciliation ou dissociation) ; un changement de rôle ou de données User peut modifier Candidat sans appel explicite depuis la vue.
- **Constat vérifié** : Création/modification/suppression de nombreuses entités (Prospection, Formation, Partenaire, etc.) déclenchent des logs (LogUtilisateur) via signaux ; pas visible depuis les viewsets.
- **Suspicion** : D’autres signaux (formations, partenaires, documents, etc.) peuvent avoir des effets de bord (mise à jour de compteurs, envoi d’email) non audités en détail ici.

---

# 4. Maintenabilité

## 4.1 Facilité de correction

- **Points positifs** : Structure par domaine (candidat, formation, prospection, etc.) permet de cibler un fichier pour une correction métier. Permissions et rôles centralisés limitent les changements en série pour une nouvelle règle d’accès. **Constat vérifié**.
- **Points négatifs** : Correction du scope par centre ou du format de réponse nécessite de toucher plusieurs viewsets. Correction d’un bug dans un serializer partagé (ex. formations_serializers) peut impacter plusieurs endpoints. **Constat vérifié**.

## 4.2 Facilité d’évolution

- **Points positifs** : Ajout d’un nouveau modèle + serializer + viewset + admin suit un pattern répété ; ajout d’un endpoint dans api_urls est explicite. **Constat vérifié**.
- **Points négatifs** : Ajout d’un nouveau signal impose de modifier apps.py (liste figée). Évolution des rôles ou du périmètre (ex. nouveau type de scope) demande de vérifier tous les get_queryset et toutes les permissions. Serializers formations/candidats très lourds — évolution coûteuse et risquée. **Constat vérifié**.

## 4.3 Facilité de documentation

- **Points positifs** : Docstrings présentes sur de nombreux ViewSets et serializers ; drf-spectacular (schema OpenAPI) génère une doc API. **Constat vérifié**.
- **Points négatifs** : Pas de document unique listant les conventions (réponse API, validation, scope). Permissions nombreuses sans tableau rôle / endpoint / action. Signaux documentés uniquement dans le code de chaque module. **Constat vérifié**.

## 4.4 Zones risquées à faire évoluer

- **Constat vérifié** : rap_app/api/viewsets/formations_viewsets.py (bug `u`, double mécanisme mixin + _restrict_to_user_centres), rap_app/api/serializers/formations_serializers.py et candidat_serializers.py (couplage fort), rap_app/signals/candidats_signals.py (sync User/Candidat/Prospection), rap_app/api/permissions.py et api/roles.py (impact global), rap_app/api/api_urls.py (point unique des routes).
- **Constat vérifié** : Modifier le modèle CustomUser (champs, relations centres) ou le comportement de staff_centre_ids peut casser de nombreux viewsets. Modifier la structure de Formation ou de Candidat impacte les serializers et les viewsets associés.

---

# 5. Cohérence API

## 5.1 Cohérence models / serializers / viewsets

- **Constat vérifié** : En général, un modèle principal a un ou plusieurs serializers dédiés et un viewset qui les utilise (Candidat → CandidatSerializer(s), CandidatViewSet ; Formation → Formation*Serializer(s), FormationViewSet). Parfois plusieurs serializers par viewset (list vs detail vs create) — pattern cohérent.
- **Incohérences** : FormationViewSet utilise _restrict_to_user_centres pour le scope alors que d’autres viewsets utilisent un mixin ou une méthode nommée différemment (_scope_qs_to_user_centres, etc.). Rapport : pas d’utilisation du service GenerateurRapport depuis le viewset — incohérence fonctionnelle (création de rapport sans génération). **Constat vérifié**.

## 5.2 Cohérence de structure des endpoints

- **Constat vérifié** : Router DRF fournit des URLs prévisibles (liste, détail, create, update, delete) ; actions custom exposées via @action avec url_path explicite. Deux basenames pour un même ViewSet (prospection-comments / prospection-commentaires) documentés dans api_urls.
- **Incohérences** : Format de réponse variable — certains endpoints renvoient { success, message, data } (rapports, logs, formations), d’autres seulement les données ou { detail }. Réponses d’erreur utilisent parfois detail, parfois message, parfois error (voir ERROR_HANDLING_AUDIT). **Constat vérifié**.

## 5.3 Prévisibilité du comportement

- **Constat vérifié** : Permissions par ViewSet explicites ; un client peut déduire l’accès (lecture/écriture) à partir des permission_classes. Pagination et filtres (DjangoFilterBackend, search, ordering) suivent des patterns DRF standards.
- **Suspicion** : Comportement exact pour staff_read (lecture seule) et pour staff sans centre n’est pas documenté de façon centralisée ; des cas limites peuvent varier d’un endpoint à l’autre.

---

# 6. Compréhensibilité pour une IA

## 6.1 Parties faciles à interpréter

- **Constat vérifié** : Arborescence et nommage (candidat_viewsets, candidat_serializers, models/candidat.py) permettent de relier rapidement ressource API, représentation et modèle. Permissions nommées de façon explicite (IsStaffOrAbove, CanAccessCVTheque). Docstrings et extend_schema (drf-spectacular) donnent des descriptions par vue/action.
- **Constat vérifié** : Fichiers TECHNICAL_AUDIT et ERROR_HANDLING_AUDIT fournissent une cartographie et des règles d’erreur ; une IA ou un développeur peut s’y appuyer pour comprendre l’architecture et les risques.

## 6.2 Parties ambiguës

- **Constat vérifié** : Intention d’ExportViewSet et GenerateurRapport (utilisés ou non, par qui) n’est pas dans le code. Variable `u` non définie dans formations_viewsets._restrict_to_user_centres rend le comportement intentionnel incertain.
- **Constat vérifié** : Répartition validation (serializer vs modèle vs viewset) et répartition scope (mixin vs méthode dédiée) ne suivent pas une règle unique documentée — une IA doit inférer à partir des exemples.
- **Suspicion** : Certains comportements (synthese_globale, add_commentaire, add_document, etc.) dépendent de méthodes de modèle dont les préconditions et effets ne sont pas décrits dans un contrat central.

## 6.3 Parties dangereuses

- **Constat vérifié** : Modifier les signaux (candidats_signals en particulier) sans tests peut casser la synchronisation User/Candidat ou la propagation formation_id. Modifier permissions.py ou roles.py impacte tous les viewsets. Modifier formations_serializers ou candidat_serializers peut régresser plusieurs endpoints.
- **Constat vérifié** : Broad except Exception dans certaines vues (formations_viewsets) et exposition de str(e) (voir ERROR_HANDLING_AUDIT) — une IA qui génère du code d’erreur pourrait reproduire ces patterns si elle s’inspire du projet.

## 6.4 Ce qui rend les futures corrections risquées

- **Constat vérifié** : Absence de convention explicite sur le format de réponse et sur la répartition validation/scope ; toute évolution peut introduire des incohérences si elle n’est pas alignée avec l’existant. Liste figée des signaux dans apps.py — oubli d’import = signal silencieusement absent. Duplication du scope par centre — une correction dans un viewset peut ne pas être répliquée ailleurs.

---

# 7. Conventions implicites du projet (lorsqu’elles sont visibles)

- **API** : Réponse succès avec `success`, `message` et `data` pour de nombreux endpoints (rapports, logs, formations, etc.) ; pagination via RapAppPagination avec structure `data.count`, `data.results`, etc. **Constat vérifié**.
- **Permissions** : Chaque ViewSet définit `permission_classes` ; pas de dépendance exclusive aux DEFAULT_PERMISSION_CLASSES pour les ressources métier. Refus d’accès via PermissionDenied avec message en français. **Constat vérifié**.
- **Scope par centre** : Pour les ressources liées à un centre ou à une formation, le viewset restreint le queryset via staff_centre_ids / get_staff_centre_ids_cached (admin_like = tout, staff = centres du user). Implémentation soit par mixin (StaffCentresScopeMixin), soit par méthode dédiée dans le viewset. **Constat vérifié**.
- **Signaux** : Tous les modules sous rap_app/signals/ doivent être importés dans apps.py ready() pour être actifs ; pas de découverte automatique. **Constat vérifié**.
- **Admin** : Tous les ModelAdmin sont dans rap_app/admin/*_admin.py et agrégés dans admin/__init__.py ; pas d’admin.py à la racine de l’app. **Constat vérifié**.
- **Modèles** : Point d’entrée unique rap_app.models via models/__init__.py ; les sous-modules sont importés pour l’enregistrement des signaux. **Constat vérifié**.
- **Erreurs** : Mélange de clés `detail`, `message`, `error` et de structures `success`/`message` (voir ERROR_HANDLING_AUDIT) — convention non unifiée. **Constat vérifié**.
- **Nommage** : Fichiers serializers et viewsets préfixés par le nom du domaine (candidat_*, formation_*, prospection_*, etc.). **Constat vérifié**.

---

# 8. Synthèse : zones peu lisibles / zones risquées à modifier

## 8.1 Zones peu lisibles

- **FormationViewSet** : Mécanisme de scope (UserVisibilityScopeMixin + _restrict_to_user_centres + _build_base_queryset) et bug (variable `u`) rendent le comportement réel et l’intention difficiles à comprendre sans lecture détaillée. **Constat vérifié**.
- **ExportViewSet et GenerateurRapport** : Présents dans le code mais non branchés / non appelés ; intention (futur, abandon, usage externe) non lisible. **Constat vérifié**.
- **Signaux** : Effets (sync User/Candidat, formation_id Prospection, logs) et ordre de chargement non documentés dans un seul endroit ; dépendances entre signaux et modèles implicites. **Constat vérifié**.
- **Permissions** : Nombreuses classes ; tableau « rôle → endpoint → action autorisée » absent ; compréhension globale nécessite une lecture transversale de permissions.py et des viewsets. **Constat vérifié**.
- **Utils** : Rôle d’exporter, logging_utils, pdf_cerfa_utils, cerfa_overlay_debug (utilisés ou non, et où) non documenté dans le code. **Suspicion** (aucun import trouvé dans l’API).

## 8.2 Zones risquées à modifier

- **rap_app/api/viewsets/formations_viewsets.py** : Bug `u` et double mécanisme de scope ; toute modification du scope ou du get_queryset peut casser la liste formations ou l’export. **Constat vérifié**.
- **rap_app/api/serializers/formations_serializers.py** et **candidat_serializers.py** : Fort couplage avec d’autres serializers et modèles ; évolution des champs ou des règles de calcul à fort impact. **Constat vérifié**.
- **rap_app/signals/candidats_signals.py** : Synchronisation User ↔ Candidat et formation_id Prospection ; modification sans tests peut provoquer incohérences de données. **Constat vérifié**.
- **rap_app/api/permissions.py** et **rap_app/api/roles.py** : Toute évolution des rôles ou du périmètre (centres, départements) impacte l’ensemble des viewsets qui les utilisent. **Constat vérifié**.
- **rap_app/api/api_urls.py** : Point unique d’enregistrement des routes ; erreur d’import ou de register rend des endpoints inaccessibles. **Constat vérifié**.
- **rap_app/apps.py** : Liste explicite des signaux ; ajout/suppression d’un signal impose de modifier ce fichier ; oubli = signal non enregistré. **Constat vérifié**.

---

# 9. Points forts du projet

- **Structure en couches** : Models, API (serializers, viewsets), admin, signals, services, utils clairement séparés. Une seule app métier. **Constat vérifié**.
- **Permissions et rôles centralisés** : Une couche dédiée (permissions.py, roles.py) et des messages d’erreur explicites en français. **Constat vérifié**.
- **Routing API centralisé** : api_urls.py comme point d’entrée unique ; Router + path() lisibles. **Constat vérifié**.
- **Nommage cohérent** : Fichiers et classes alignés sur le domaine (candidat, formation, prospection, centre, partenaire, etc.). **Constat vérifié**.
- **Docstrings et schéma OpenAPI** : Présence de docstrings sur de nombreux ViewSets et serializers ; drf-spectacular pour la doc API. **Constat vérifié**.
- **Tests structurés** : Dossiers tests_models, tests_viewsets, tests_serializers, tests_api, factories, README_TESTS. **Constat vérifié**.
- **Documents d’audit** : TECHNICAL_AUDIT et ERROR_HANDLING_AUDIT aident un développeur ou une IA à s’orienter et à identifier les risques. **Constat vérifié**.

---

# 10. Points faibles du projet

- **Serializers formations et candidats** : Très volumineux et fortement couplés ; logique de représentation et validations mélangées ; évolution coûteuse. **Constat vérifié**.
- **Scope par centre dupliqué** : Plusieurs implémentations (mixin vs méthodes dédiées) ; pas de convention unique ; FormationViewSet contient en plus un bug. **Constat vérifié**.
- **Format de réponse et d’erreur** : Mélange success/message/data, detail, error ; pas de convention documentée. **Constat vérifié**.
- **Signaux** : Liste figée dans apps.py ; effets de bord (sync, logs) non documentés centralement ; risque de régression à toute modification. **Constat vérifié**.
- **Code mort ou non branché** : ExportViewSet, GenerateurRapport, possiblement des utils ; intention non documentée. **Constat vérifié**.
- **Validation et règle métier** : Réparties entre modèles (clean), serializers (validate) et viewsets ; pas de règle explicite. **Constat vérifié**.
- **Permissions** : Nombreuses classes sans tableau de synthèse ; compréhension « qui peut faire quoi » demande une lecture transversale. **Constat vérifié**.

---

# 11. Score global

| Critère | Note | Argumentation |
|--------|------|----------------|
| **Clarté architecturale** | 7/10 | Une app, couches nettes (models, API, admin, signals, services). Points négatifs : rôle d’ExportViewSet/GenerateurRapport flou, double mécanisme FormationViewSet, signaux et scope peu documentés. |
| **Séparation des responsabilités** | 6/10 | Chaque couche existe mais frontières floues (validation et logique métier partagées entre modèles, serializers, viewsets). Services peu utilisés ; duplication du scope par centre. |
| **Maintenabilité** | 6/10 | Structure et nommage aident ; mais serializers lourds, signaux figés dans apps.py, conventions non documentées et duplication rendent les évolutions et corrections plus risquées. |
| **Lisibilité métier** | 6/10 | Rôles et périmètre (centres) sont explicites dans permissions/roles ; sync User/Candidat et effets de bord des signaux sont peu visibles ; règles « qui voit quoi » (ex. formations) dépendent d’un bug et de l’intention non écrite. |
| **Exploitabilité par une IA** | 7/10 | Arborescence et nommage prévisibles ; docstrings et audits aident. Points limitants : conventions implicites, zones ambiguës (ExportViewSet, GenerateurRapport, scope), et patterns à éviter (broad except, str(e)) présents dans le code. |

---

# 12. Roadmap d’amélioration structurelle

## P0 — Bloqueur de compréhension

1. **Corriger le bug dans FormationViewSet._restrict_to_user_centres** (variable `u` non définie) et documenter le comportement attendu (staff voit les formations de ses centres uniquement, ou toutes — selon règle métier). Sans cela, le comportement réel et l’intention restent illisibles.
2. **Clarifier le statut d’ExportViewSet et de GenerateurRapport** : les brancher (avec permissions et scope) et documenter, ou les marquer explicitement comme non utilisés / archivés, pour éviter toute ambiguïté pour un mainteneur ou une IA.

## P1 — Fort gain de clarté

3. **Documenter les conventions** : un document (ou une section dans un README / ARCHITECTURE) décrivant : format de réponse API (success/message/data vs detail), répartition validation (serializer vs modèle vs viewset), règles de scope par centre (mixin vs méthode dédiée), et liste des signaux avec leur rôle et leurs effets.
4. **Centraliser le scope par centre** : utiliser un même mécanisme (mixin ou base viewset) partout où le filtrage par centres s’applique, pour réduire la duplication et rendre le comportement prévisible.
5. **Tableau des permissions** : documenter rôle par rôle (admin, staff, staff_read, candidat, prepa_staff, declic_staff) et, pour chaque famille d’endpoints, ce qui est autorisé (list, retrieve, create, update, delete, actions custom).

## P2 — Amélioration de maintenabilité

6. **Factoriser le format de réponse** : mixin ou helper pour les réponses { success, message, data } afin d’éviter la duplication et de garantir la cohérence.
7. **Alléger les serializers formations et candidats** : déplacer une partie des champs calculés ou des validations vers le modèle ou un service, ou scinder en sous-serializers réutilisables, pour réduire le couplage.
8. **Documenter les signaux** : liste des signaux (fichier, modèle, déclencheur, effet) et dépendances (ex. candidats_signals → CustomUser, Candidat, Prospection) dans un seul endroit (README, ARCHITECTURE, ou doc dans apps.py).
9. **Renforcer les tests** : couvrir les signaux (candidats, prospections) et les services (evenements_export ; generateur_rapports si conservé) pour sécuriser les évolutions structurelles.

## P3 — Confort / documentation

10. **Clarifier les utils** : décider du sort des modules non utilisés par l’API (exporter, logging_utils, pdf_cerfa_utils, etc.) et documenter leur usage (scripts, maintenance) ou les archiver.
11. **Unifier le format des réponses d’erreur** : standardiser sur une clé (ex. detail) et un format (ex. { detail, code }) pour les erreurs API, en cohérence avec les recommandations de ERROR_HANDLING_AUDIT.
12. **Documentation d’onboarding** : court document pour un nouveau développeur ou une IA (structure du projet, où trouver les modèles, l’API, les permissions, les signaux, et les audits existants).

---

*Fin de la revue structurelle. Aucune modification de code n’a été appliquée (hors création de ce fichier).*
