# Rapport d’audit technique — Rap_App Django (référence projet)

**Date :** Mars 2025  
**Périmètre :** application Django `rap_app`, projet `rap_app_project`, API REST (DRF), admin, signaux, services, utils, tests.  
**Méthode :** analyse du code réel (fichiers listés en en-tête des sections). Aucune exécution de tests, aucune modification de code.

**Conventions :**
- **Constat vérifié** : observé dans le code (fichier/ligne ou pattern explicite).
- **Suspicion technique** : déduction plausible à confirmer par test ou revue ciblée.
- **À confirmer hors périmètre** : dépend de scripts, commandes ou jobs non analysés.
- **Niveau de confiance** : élevé / moyen / faible.

---

# 1. Vue globale de l’architecture

## 1.1 Organisation des apps

- **Une seule app métier** : `rap_app` (configurée via `RapAppConfig` dans `rap_app/apps.py`).
- **Projet** : `rap_app_project` (settings, urls racine, WSGI).
- **Modèles** : `rap_app/models/` — une vingtaine de modules (custom_user, candidat, formation, centre, prospection, appairage, commentaires, documents, evenements, rapports, logs, types_offre, statut, prepa, declic, etc.).
- **API** : `rap_app/api/` — serializers, viewsets, permissions, roles, mixins, paginations, api_urls.
- **Admin** : `rap_app/admin/` — package avec `__init__.py` qui importe tous les `*_admin.py` ; pas de `admin.py` unique à la racine de l’app.
- **Signaux** : `rap_app/signals/` — 12 modules, tous importés dans `AppConfig.ready()`.
- **Services** : `rap_app/services/` — `generateur_rapports.py`, `evenements_export.py`.
- **Utils** : `rap_app/utils/` — filters, exporter, logging_utils, constants_cerfa, cerfa_field_mapper, pdf_cerfa_utils, cerfa_overlay_debug.

Séparation nette API / admin / signaux / services. La logique métier est répartie entre serializers (représentation, validations), viewsets (orchestration, filtrage par rôle/centre), services et signaux.

## 1.2 Patterns utilisés

- **API** : ViewSets DRF + DefaultRouter, permissions par ViewSet, mixins de scope (UserVisibilityScopeMixin dans permissions.py, StaffCentresScopeMixin dans mixins.py).
- **Auth** : JWT (SimpleJWT), `DEFAULT_PERMISSION_CLASSES` = IsAuthenticated + IsStaffReadOnly (settings), surcharge systématique par ViewSet.
- **Données** : filtrage des querysets via `staff_centre_ids` / `get_staff_centre_ids_cached` (roles.py) pour restreindre par centre ; pas de Row-Level Security en base.

## 1.3 Points faibles structurels

- **Couplage fort** : serializers formations et candidats agrègent de nombreux sous-serializers et modèles ; évolution coûteuse et risque de régression.
- **Responsabilités mélangées** : validations et champs calculés présents dans les serializers plutôt que dans les modèles ou services.
- **ExportViewSet non branché** : **Constat vérifié.** Défini dans `rap_app/api/viewsets/export_viewset.py`, jamais enregistré dans `rap_app/api/api_urls.py` (aucun `router.register` ni `path()`). Fichier concerné : `api_urls.py`.
- **GenerateurRapport non appelé** : **Constat vérifié.** Aucun import ni appel dans viewsets, admin ni management commands analysés. **Confirmé non référencé dans le périmètre** ; **à confirmer hors périmètre** (scripts, tâches planifiées).

---

# 2. Cartographie des dépendances

## 2.1 Nœuds centraux

| Module | Rôle | Dépendances |
|--------|------|-------------|
| **rap_app/api/api_urls.py** | Enregistrement de tous les ViewSets et routes auth/me/search | Tous les viewsets importés |
| **rap_app/apps.py** | Chargement des signaux au démarrage | Tous les modules `rap_app/signals/*` |
| **rap_app/api/permissions.py** | Définition des permissions DRF | roles.py (is_admin_like, is_staff_or_staffread, etc.) |
| **rap_app/api/roles.py** | Helpers rôles et périmètre centres | Aucun module métier |
| **rap_app/api/viewsets/candidat_viewsets.py** | Candidats, compte utilisateur, exports | models (Candidat, Formation, Appairage, …), serializers, permissions, roles, filters |
| **rap_app/api/viewsets/formations_viewsets.py** | Formations CRUD, filtres, export, actions | Formation, Statut, TypeOffre, serializers, permissions, roles, UserVisibilityScopeMixin |
| **rap_app/api/viewsets/rapports_viewsets.py** | Rapports CRUD | Rapport, LogUtilisateur, permissions, roles ; n’appelle pas GenerateurRapport |
| **rap_app/signals/candidats_signals.py** | Sync User ↔ Candidat, formation_id Prospection | CustomUser, Candidat, Prospection |
| **rap_app/services/generateur_rapports.py** | Génération rapports analytiques | Rapport, Formation ; aucun appelant identifié |
| **rap_app/services/evenements_export.py** | Export CSV événements | Utilisé uniquement par evenements_viewsets.py |

## 2.2 Dépendances fortes entre couches

- **ViewSets** → serializers, models, permissions, roles, paginations ; certains → utils.filters, services (evenements_export).
- **Serializers** → models, autres serializers (formations_serializers très couplé).
- **Signaux** → models, LogUtilisateur (journalisation).
- **Admin** → models, django.contrib.admin ; pas d’import des services.
- **Permissions** → roles uniquement ; **ViewSets** → permissions + roles pour get_queryset (filtrage par centre).

---

# 3. Modules les plus centraux / sensibles

## 3.1 Modules fortement couplés (constat vérifié)

- **rap_app/api/serializers/formations_serializers.py** — Agrège centres, commentaires, documents, événements, partenaires, prospections, types_offre. Tout changement de schéma sur ces modèles impacte ce fichier.
- **rap_app/api/serializers/candidat_serializers.py** — Relations formation, appairages, ateliers TRE, commentaires appairage. Point de couplage fort entre modèle Candidat et API.
- **rap_app/api/viewsets/candidat_viewsets.py** — Cœur fonctionnel candidats (liste, détail, création compte, export XLSX). Dépend de nombreux modèles et de roles/permissions/filters.
- **rap_app/api/viewsets/formations_viewsets.py** — Nombreuses actions (filtres, historique, stats, export, archiver). Utilise UserVisibilityScopeMixin et _restrict_to_user_centres (voir section 4.1).
- **rap_app/api/permissions.py** + **rap_app/api/roles.py** — Toute évolution des règles d’accès impacte l’ensemble des ViewSets.
- **rap_app/signals/** (candidats_signals, prospections_signals, types_offres_signals, etc.) — Effets de bord automatiques ; modification sans tests = risque élevé de régression.

## 3.2 Modules à fort risque de régression

- **rap_app/api/api_urls.py** — Point unique d’enregistrement des routes API. Erreur d’import ou de register = endpoints inaccessibles.
- **rap_app_project/settings.py** — AUTH_USER_MODEL, REST_FRAMEWORK, SIMPLE_JWT, CORS, SPECTACULAR. Mauvaise config = auth ou doc API cassée.
- **rap_app/admin/__init__.py** — Import de tous les ModelAdmin. Oubli ou erreur = modèle non exposé ou erreur au chargement de l’admin.
- **rap_app/apps.py** — Liste explicite des signaux. Nouveau signal non importé = non enregistré.

## 3.3 Modules à relire avant toute modification importante

- **rap_app/api/permissions.py** — Comportement de chaque classe (has_permission / has_object_permission) et cohérence avec les rôles.
- **rap_app/signals/candidats_signals.py** — Sync Candidat/User et pre_save Prospection (formation_id).
- **rap_app/api/viewsets/formations_viewsets.py** — _restrict_to_user_centres, _build_base_queryset, get_queryset / get_object.
- **rap_app/models/logs.py** — log_action / log_system_action (création de LogUtilisateur, pas de signal sur LogUtilisateur lu ; risque de récursion limité côté code vu).

---

# 4. Zones déjà saines / bien structurées

## 4.1 Routing (constat vérifié)

- **rap_app_project/urls.py** : admin, api/schema, api/docs, api/redoc, api/ → include(api_urls), '' → include(rap_app.urls). Rôles clairs.
- **rap_app/api/api_urls.py** : DefaultRouter pour tous les ViewSets ; path() pour register, token, token/refresh, search, me, roles, me/demande-compte. ExportViewSet absent de ce fichier.

## 4.2 Permissions et rôles (constat vérifié)

- Couche dédiée **permissions.py** avec classes spécialisées (IsStaffOrAbove, IsOwnerOrStaffOrAbove, IsAdminLikeOnly, IsDeclicStaffOrAbove, IsPrepaStaffOrAbove, CanAccessCVTheque, CanAccessProspectionComment, etc.).
- **roles.py** : helpers explicites (is_admin_like, is_staff_read, staff_centre_ids, get_staff_centre_ids_cached). Pas de logique métier hors accès.
- Chaque ViewSet métier définit explicitement `permission_classes` (pas d’AllowAny sur les ressources sensibles).

## 4.3 Pagination et format de réponse (constat vérifié)

- **rap_app/api/paginations.py** : RapAppPagination (page_size 10, page_size_query_param, max_page_size 100), réponse structurée { success, message, data: { count, page, page_size, total_pages, next, previous, results } }.
- Plusieurs ViewSets (rapports, logs, etc.) renvoient un format homogène success/message/data.

## 4.4 Log utilisateur (constat vérifié)

- **rap_app/models/logs.py** : LogUtilisateur avec ContentType/object_id, actions normalisées, sanitize_details (LOG_SENSITIVE_FIELDS), log_action / log_system_action. Pas de signal post_save sur LogUtilisateur dans les fichiers analysés → pas de récursion identifiée côté logs.
- **LogUtilisateurViewSet** : lecture seule, IsAdminLikeOnly. Serializer avec champs calculés (model, user, date).

## 4.5 Tests (constat vérifié)

- Structure claire : tests_models/, tests_viewsets/, tests_serializers/, tests_api/, tests_permissions.py, test_utils.py, factories.py, README_TESTS.md.
- Couverture : modèles (formations, centres, statuts, types_offre, rapports, documents, commentaires, evenements, logs, partenaires, prospection, candidats), viewsets (candidats, auth, types_offre, statuts, commentaires, prospections, evenements, centres, logs, partenaires, documents, rapports), serializers, permissions (IsAdmin), health API. Factories User et LogUtilisateur.

---

# 5. Incohérences et bugs techniques

## 5.1 CRITIQUE

### 5.1.1 ExportViewSet non exposé

- **Type : constat vérifié.**  
- **Fichiers :** `rap_app/api/viewsets/export_viewset.py`, `rap_app/api/api_urls.py`.  
- Aucun `router.register` ni `path()` pour ExportViewSet. Toute fonctionnalité front s’appuyant sur ces URLs serait cassée. **Niveau de confiance :** élevé.

### 5.1.2 Variable `u` non définie dans FormationViewSet._restrict_to_user_centres

- **Type : constat vérifié.**  
- **Fichier :** `rap_app/api/viewsets/formations_viewsets.py`, lignes 191-201.  
- La méthode `_restrict_to_user_centres(self, qs)` utilise `u` dans `is_admin_like(u)`, `is_staff_or_staffread(u)`, `staff_centre_ids(u)`, `u.username`, `u.role`. La variable `u` n’est jamais définie (aucune affectation `u = ...` dans la méthode ni dans le fichier pour ce scope).  
- **Impact :** NameError dès qu’un utilisateur non admin appelle une vue qui passe par cette méthode (liste formations, get_object, export_xlsx, etc.). Comportement actuel en production non vérifié (possibilité de contournement ou de chemin non exécuté).  
- **Niveau de confiance :** élevé pour le code lu.

### 5.1.3 Double `return qs` dans _restrict_to_user_centres

- **Type : constat vérifié.**  
- **Fichier :** `rap_app/api/viewsets/formations_viewsets.py`, lignes 201-204.  
- Deux `return qs` successifs (lignes 201 et 204) ; le second est du code mort. Mineur mais signe de copier-coller ou refactor incomplet.

## 5.2 IMPORTANT

### 5.2.1 GenerateurRapport non utilisé

- **Type : constat vérifié.** **À confirmer hors périmètre** pour usage par commandes/scripts externes.  
- **Fichiers :** `rap_app/services/generateur_rapports.py`, `rap_app/api/viewsets/rapports_viewsets.py`.  
- Aucun import ni appel dans le périmètre analysé. RapportViewSet crée des rapports via serializer sans appeler GenerateurRapport. **Niveau de confiance :** élevé.

### 5.2.2 Utils potentiellement dormants

- **Type : constat vérifié** (aucun import dans viewsets/services).  
- **Fichiers :** `rap_app/utils/exporter.py`, `logging_utils.py`, `pdf_cerfa_utils.py`, `cerfa_overlay_debug.py` ; `constants_cerfa.py` et `cerfa_field_mapper.py` utilisés entre eux ou en CLI.  
- **Niveau de confiance :** élevé pour l’absence d’usage dans l’API ; **probablement dormants** pour l’usage applicatif.

### 5.2.3 LogUtilisateurViewSet sans select_related

- **Type : constat vérifié.**  
- **Fichiers :** `rap_app/api/viewsets/logs_viewsets.py`, `rap_app/api/serializers/logs_serializers.py`.  
- get_queryset retourne `LogUtilisateur.objects.all()` sans select_related. Le serializer accède à `obj.content_type` et `obj.created_by` → N+1 en liste et détail. **Niveau de confiance :** élevé.

## 5.3 MINEUR

- Duplication de logique de scope par centre entre viewsets (get_queryset + staff_centre_ids) ; StaffCentresScopeMixin présent mais pas utilisé partout.
- Format success/message/data répété dans plusieurs viewsets ; pas de mixin commun.
- FormationViewSet hérite de UserVisibilityScopeMixin mais override get_queryset via _build_base_queryset ; le mixin n’est donc pas utilisé pour la liste (comportement piloté par _restrict_to_user_centres, une fois le bug sur `u` corrigé).

---

# 6. Risques de bugs

## 6.1 CRITIQUE

- **Signaux candidats : requête en pre_save** — **Constat vérifié.** `rap_app/signals/candidats_signals.py`, `_remember_old_role` : `sender.objects.get(pk=instance.pk)` à chaque pre_save CustomUser existant. Multiplication des requêtes et risque de race si save en boucle. **Niveau de confiance :** élevé.

## 6.2 IMPORTANT

- **Signaux prospections : user potentiellement None** — **Constat vérifié.** `rap_app/signals/prospections_signals.py`, `log_prospection_save` : `user = get_user(instance, kwargs)` peut être None ; `username = user.username` lèverait AttributeError. Le bloc except utilise `username if 'username' in locals()` ; si l’exception survient avant l’assignation de `username`, risque de crash. **Niveau de confiance :** moyen.
- **Candidats_signals : dissociation Candidat ↔ User** — Lors du passage rôle candidat → autre, le signal fait `cand.compte_utilisateur = None` et save, sans transaction englobante avec le save du User. **Suspicion technique** : incohérence possible en cas d’erreur. **Niveau de confiance :** moyen.
- **Rapports perform_create** — serializer.save() puis LogUtilisateur.log_action(). Si log_action échoue, le rapport reste créé. **Constat vérifié.** **Niveau de confiance :** élevé.

## 6.3 MINEUR

- prepa_objectifs_viewsets : `[obj.synthese_globale() for obj in qs]` ; ObjectifPrepa.synthese_globale() (prepa.py) n’effectue pas de requête supplémentaire (accès à self.centre et self.data_prepa déjà en mémoire si centre est select_related et data_prepa une propriété). **Suspicion technique** : N+1 possible si data_prepa ou centre déclenchent des requêtes. Non vérifié en détail. **Niveau de confiance :** faible.

---

# 7. Permissions (analyse détaillée)

## 7.1 Permissions globales vs ViewSet (constat vérifié)

- **Settings** (`rap_app_project/settings.py`) :  
  `REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]` = `["rest_framework.permissions.IsAuthenticated", "rap_app.api.permissions.IsStaffReadOnly"]`.  
  Toute vue DRF sans override exigerait donc authentification + respect de IsStaffReadOnly (staff_read en lecture seule, autres rôles sans restriction supplémentaire).
- **Pratique** : Chaque ViewSet métier définit ses propres `permission_classes` (IsStaffOrAbove, IsOwnerOrStaffOrAbove, IsAdminLikeOnly, IsDeclicStaffOrAbove, IsPrepaStaffOrAbove, CanAccessCVTheque, CanAccessProspectionComment, ReadWriteAdminReadStaff, etc.). Les permissions par défaut sont donc de fait remplacées partout pour les ressources métier.
- **Cohérence** : Les ViewSets n’utilisent pas les seules permissions par défaut ; la combinaison globale (IsAuthenticated + IsStaffReadOnly) agit comme filet pour toute vue qui n’aurait pas défini de permission (cas non observé pour les ressources métier).

## 7.2 Permissions par ViewSet (résumé vérifié)

- **AllowAny** : HealthViewSet (`rap_app/api/viewsets/health_viewset.py`), RegisterView (user_viewsets), DemandeCompteCandidatView (me_viewsets) — intentionnel pour health, inscription, demande de compte.
- **IsAuthenticated seul** : SearchView, LogChoicesView, RapportChoicesView, MeAPIView, RoleChoicesView, test_token (temporaire_viewset avec IsStaffOrAbove).
- **IsAdminLikeOnly** : LogUtilisateurViewSet (lecture logs).
- **IsStaffOrAbove** : Candidat, Formation, Document, Commentaire, Rapport, Centre (avec ReadWriteAdminReadStaff pour centres : `IsAuthenticated & ReadWriteAdminReadStaff`), Appairage, CommentaireAppairage, AtelierTRE, Partenaire (via PartenaireAccessPermission), TypesOffre (ReadWriteAdminReadStaff), Stats (formation, candidat, partenaire, atelier TRE, appairage, commentaire, appairage-commentaire).
- **IsOwnerOrStaffOrAbove** : Prospection, ProspectionComment, Evenement, ProspectionStats, ProspectionCommentStats.
- **IsDeclicStaffOrAbove** : Declic, ObjectifDeclic, DeclicStats.
- **IsPrepaStaffOrAbove** : Prepa, ObjectifPrepa, PrepaStats.
- **CanAccessCVTheque** : CVTheque (accès objet selon admin / staff centres / candidat propriétaire).
- **CanAccessProspectionComment** : accès objet selon rôle (admin, staff, staff_read lecture seule, candidat limité à ses prospections/créations).

## 7.3 Accès objet

- Les permissions qui gèrent l’accès objet (has_object_permission) sont : CanAccessProspectionComment, IsOwnerOrSuperAdmin, IsOwnerOrStaffOrAbove, CanAccessCVTheque. Les autres ViewSets s’appuient sur le filtrage du queryset (get_queryset) pour restreindre les objets visibles ; un accès direct par URL (pk) peut exposer un objet si get_queryset ne filtre pas correctement. **Constat vérifié** pour la présence de has_object_permission ; **suspicion** sur les ViewSets qui n’ont que has_permission et dépendent uniquement du queryset (à valider par test d’accès direct par ID).

## 7.4 Endpoints sensibles

- **register/** — Vue dédiée ; rate limit et validation email non audités en détail.
- **token/**, **token/refresh/** — SimpleJWT (configuration settings standard).
- **me/**, **roles/** — IsAuthenticated ; exposition de données utilisateur à vérifier (pas de mot de passe/token dans les serializers vus).
- **logs/** — IsAdminLikeOnly ; lecture seule. Approprié pour un journal d’audit.

## 7.5 Zones à vérifier manuellement (auth / JWT / rôles)

- Alignement CustomUser.is_staff / is_superuser avec les rôles métier (role) et impact sur is_admin_like / is_staff_like dans roles.py.
- Comportement de `user.has_role("admin", "superadmin")` (ReadOnlyOrAdmin) si cette méthode n’existe pas sur CustomUser.
- Centres : `permission_classes = [IsAuthenticated & ReadWriteAdminReadStaff]` — combinaison de classes DRF (opérateur &) ; à confirmer que la sémantique est bien “les deux doivent passer”.
- Vérification manuelle : pour chaque rôle (admin, staff, staff_read, candidat, prepa_staff, declic_staff), accès list/retrieve/create/update/delete sur quelques ressources clés (candidats, formations, prospections, logs).

---

# 8. Signaux (analyse détaillée)

## 8.1 Chargement (constat vérifié)

- **rap_app/apps.py** : `ready()` importe explicitement 12 modules sous `rap_app.signals.*` (centres, commentaire, documents, evenements, formations, rapports, prospections, logs, appairage, candidats, partenaires, types_offres). statut_signals et jury_signals sont commentés.

## 8.2 Signaux à risque ou coûteux

- **candidats_signals.py** :  
  - pre_save CustomUser : _remember_old_role → requête get(pk=instance.pk).  
  - post_save CustomUser : sync Candidat (création/réconciliation/dissociation) ; dissociation sans transaction explicite avec le save User.  
  - pre_save Prospection : sync formation_id depuis owner.candidat_associe/candidat.formation_id.  
- **prospections_signals.py** : post_save Prospection / HistoriqueProspection, post_delete Prospection → LogUtilisateur.log_action. get_user(instance, kwargs) peut être None → risque sur user.username (voir 6.2).
- **types_offres_signals.py** : création de LogUtilisateur sur TypeOffre (non lu en détail).
- Autres signaux (formations, partenaires, documents, evenements, rapports, logs, appairage, centres, commentaire) : journalisation ou logique métier ; non audités ligne à ligne.

## 8.3 Dépendances

- Tous dépendent de modèles métier et souvent de LogUtilisateur. Aucun signal sur LogUtilisateur lu dans le périmètre → pas de boucle de récursion identifiée côté logs.

---

# 9. Services, mixins, paginations, settings, admin, tests, routing

## 9.1 Services

- **generateur_rapports.py** : classe GenerateurRapport, méthode generer_rapport(type_rapport, date_debut, date_fin, **kwargs), méthodes _generer_* (ex. _generer_occupation). Utilise Rapport, Formation, annotate/agrégations. **Aucun appelant** dans le périmètre. **Confirmé non référencé** ; **à confirmer hors périmètre**.
- **evenements_export.py** : csv_export_evenements(queryset=None). **Constat vérifié** : utilisé uniquement par `rap_app/api/viewsets/evenements_viewsets.py`.

## 9.2 Mixins

- **rap_app/api/mixins.py** — StaffCentresScopeMixin : _user_centre_ids(), _user_departement_codes(), scope_queryset_to_centres(qs), get_queryset() = scope_queryset_to_centres(super().get_queryset()). Dépend de get_staff_centre_ids_cached (roles). Utilisé par les ViewSets qui l’héritent (ex. prepa, declic objectifs ; pas par FormationViewSet qui override get_queryset).
- **rap_app/api/permissions.py** — UserVisibilityScopeMixin : apply_user_scope(qs) ; pour admin_like et staff_or_staffread retourne qs sans filtre ; sinon filtre par user_field (created_by). Utilisé par FormationViewSet et PartenaireViewSet ; FormationViewSet override get_queryset avec _build_base_queryset donc n’utilise pas ce comportement pour la liste.

## 9.3 Paginations

- **rap_app/api/paginations.py** : RapAppPagination (PageNumberPagination), page_size=10, page_size_query_param='page_size', max_page_size=100, get_paginated_response avec structure { success, message, data: { count, page, page_size, total_pages, next, previous, results } }. **Constat vérifié.** Référencée dans settings DEFAULT_PAGINATION_CLASS et dans plusieurs ViewSets.

## 9.4 Settings structurants (constat vérifié)

- **AUTH_USER_MODEL** : rap_app.CustomUser.
- **REST_FRAMEWORK** : JWT auth, IsAuthenticated + IsStaffReadOnly par défaut, AutoSchema drf-spectacular, RapAppPagination, PAGE_SIZE 10.
- **SIMPLE_JWT** : durées access/refresh via env, ROTATE_REFRESH_TOKENS False, BLACKLIST_AFTER_ROTATION True, SIGNING_KEY=SECRET_KEY.
- **SPECTACULAR_SETTINGS** : préfixe /api/, hooks preprocess/postprocess (rap_app.spectacular_hooks), ENUM_NAME_OVERRIDES pour choix prospection.
- **CORS / CSRF** : origines configurées ; en DEBUG, localhost ajouté.
- **LOG_SENSITIVE_FIELDS** : liste de champs à masquer (password, token, secret, etc.).
- **ENABLE_MODEL_LOGGING**, **LOG_MODELS**, **LOG_EXCLUDED_MODELS** ; en test, DISABLE_MODEL_LOGS True.

## 9.5 Admin

- **rap_app/admin/__init__.py** : importe tous les *_admin (base, centres, commentaires, documents, evenements, formations, logs, partenaires, prospection, rapports, statuts, types_offre, user, appairage, atelier_tre, candidat, prospection_comments, appairage_commentaires, declic, prepa, cvtheque). vae_admin et jury_admin commentés.
- **logs_admin.py** : LogUtilisateurAdmin, list_display avec champs calculés (model_display, object_link, user_display). Pas de get_queryset avec select_related → même risque N+1 qu’en API pour la liste admin.

## 9.6 Tests

- Structure : tests_models/, tests_viewsets/, tests_serializers/, tests_api/, tests_permissions.py, test_utils.py, factories.py, README_TESTS.md.
- Pas de tests dédiés pour services (generateur_rapports, evenements_export) ni pour les signaux (README mentionne --cov=rap_app.signals). Couverture à renforcer.

## 9.7 Routing global

- **rap_app_project/urls.py** : admin/, api/schema/, api/docs/, api/redoc/, api/ → include('rap_app.api.api_urls'), '' → include('rap_app.urls'). Media en DEBUG.
- **rap_app/urls.py** : '' → home_views.home.
- **rap_app/api/api_urls.py** : Router pour tous les ViewSets listés ; urlpatterns avec register, token, token/refresh, test-token, search, me, roles, me/demande-compte ; puis urlpatterns += router.urls. **ExportViewSet absent.**

---

# 10. Sécurité (synthèse)

- **Permissions par défaut vs locales** : Défaut (IsAuthenticated + IsStaffReadOnly) systématiquement remplacé par des permissions plus restrictives sur les ViewSets métier. Pas d’endpoint métier en AllowAny sauf health, register, demande-compte.
- **Cohérence** : Rôles (roles.py) et permissions (permissions.py) sont alignés ; les ViewSets qui filtrent par centre utilisent staff_centre_ids / get_staff_centre_ids_cached.
- **Accès objet** : Géré explicitement pour ProspectionComment, CVTheque, Prospection, Evenement (IsOwnerOrStaffOrAbove, CanAccess*). Les autres dépendent du queryset ; test d’accès direct par pk recommandé.
- **Risques d’exposition** : LOG_SENSITIVE_FIELDS et sanitize_details utilisés ; _sanitize_dict dans candidat_viewsets. Vérifier que les serializers utilisateur/candidat n’exposent jamais mot de passe / token.
- **ExportViewSet** : Si un jour branché sans adaptation, les actions font Model.objects.all() sans filtre par centre → **suspicion technique** : exposition de données si exposé tel quel.

---

# 11. Performance (analyse détaillée)

## 11.1 N+1 confirmés (constat vérifié)

- **LogUtilisateurViewSet** : get_queryset = LogUtilisateur.objects.all() sans select_related. Serializer accède à content_type et created_by → N+1 en liste et retrieve. **Fichiers :** logs_viewsets.py, logs_serializers.py.
- **Admin LogUtilisateur** : Pas de get_queryset avec select_related ; list_display utilise content_type, content_object, created_by → N+1 en liste admin.

## 11.2 select_related / prefetch_related présents (constat vérifié)

- CandidatViewSet : select_related(formation, formation__centre), prefetch_related (appairages, etc.).
- FormationViewSet get_object : select_related(centre, type_offre, statut), prefetch_related(commentaires, documents, evenements, partenaires, prospections).
- ProspectionViewSet, ProspectionCommentViewSet, CommentaireViewSet, PartenairesViewSet, CVThequeViewSet, ExportViewSet (dans le fichier) : select_related ou prefetch sur les relations utilisées.
- LogUtilisateurViewSet et admin LogUtilisateur : **manquent** select_related("content_type", "created_by").

## 11.3 Annotations / Subquery potentiellement coûteuses

- GenerateurRapport._generer_occupation : filtres sur Formation, annotate (places_totales, taux_remplissage, etc.). Si le service est branché, à surveiller sur grosses bases.
- PartenairesViewSet : annotate(prospections_count=Count("prospections", distinct=True)) + select_related ; raisonnable.
- Autres ViewSets (stats, exports) : annotations non toutes lues en détail ; **suspicion** : certaines stats ou exports pourraient être lourdes en volumétrie.

## 11.4 Appels base en boucle

- prepa_objectifs_viewsets / declic_objectifs_viewsets : `[obj.synthese_globale() for obj in qs]`. synthese_globale (prepa.py) n’effectue pas de requête dans le code lu ; ObjectifDeclic et Declic.taux_retention non lus en détail. **Suspicion technique** : N+1 possible selon implémentation. **Niveau de confiance :** faible.
- Exports XLSX : itération sur le queryset en Python ; pas de streaming. Volumétrie à surveiller (timeout, mémoire).

## 11.5 Points de volumétrie à surveiller

- Liste des logs (API et admin) sans select_related.
- Exports XLSX (candidats, formations, prospections, appairages, prepa, declic, etc.) : charge mémoire et temps de réponse pour milliers de lignes.
- SearchViewSet : plusieurs requêtes (candidats, formations, commentaires, …) ; pagination à confirmer et limites à définir.

---

# 12. Dette technique (distinction fine)

## 12.1 Code mort confirmé

- **ExportViewSet** : Code présent, jamais enregistré dans les URLs. **Confirmé non branché.** Fichier : export_viewset.py.

## 12.2 Code probablement dormant

- **GenerateurRapport** : Aucun appelant dans l’app. **Confirmé non référencé dans le périmètre** ; **à confirmer hors périmètre**.
- **Utils** : exporter.py, logging_utils.py, pdf_cerfa_utils.py, cerfa_overlay_debug.py — aucun import dans viewsets/services. **Probablement dormants** pour l’usage applicatif.

## 12.3 Code non branché

- ExportViewSet (déjà en 12.1).

## 12.4 Duplication réelle

- Logique de scope par centre : réimplémentée dans plusieurs ViewSets (get_queryset + staff_centre_ids) avec variantes ; StaffCentresScopeMixin existant mais pas utilisé partout.
- Format de réponse { success, message, data } : répété dans list/retrieve/create/update de plusieurs ViewSets (rapports, logs, etc.).

## 12.5 Responsabilités mal réparties

- Validations et champs calculés lourds dans les serializers (formations, candidats) plutôt que dans modèles ou services.
- Double mécanisme FormationViewSet : UserVisibilityScopeMixin + _restrict_to_user_centres ; après correction du bug `u`, le comportement effectif est porté par _restrict_to_user_centres.

## 12.6 Éléments difficiles à maintenir

- Signaux : liste explicite dans apps.py ; ordre et dépendances entre signaux à garder en tête.
- Nombreuses classes de permissions ; tableau rôle / endpoint / action à documenter.
- Serializers formations et candidats : volumineux et couplés ; évolution coûteuse.

---

# 13. Usages obsolètes, atypiques ou potentiellement dépréciés

- **DRF / Django** : Aucun usage déprécié évident dans les fichiers analysés (ViewSet, permissions, JWT, pagination, serializers en usage standard).
- **Centres** : `permission_classes = [IsAuthenticated & ReadWriteAdminReadStaff]` — combinaison par `&` de classes de permission DRF ; sémantique à confirmer (les deux doivent passer). Pas d’usage obsolète.
- **FormationViewSet** : ligne 197 `(f"👤 {u.username} ...")` — expression évaluée mais non utilisée (pas d’appel à logger ou return) ; effet de bord inutile et dépend de la variable `u` non définie.

---

# 14. Roadmap de corrections (actionnable)

## P0 — Critique (production)

1. **FormationViewSet._restrict_to_user_centres** — **Technique.** Corriger la variable non définie `u` (remplacer par `self.request.user` ou équivalent). Vérifier que staff et staff_read ont bien le comportement attendu (filtre par centre). Supprimer le second `return qs` mort. **Dépendance :** aucune. **Fichier :** rap_app/api/viewsets/formations_viewsets.py.
2. **ExportViewSet** — **Métier d’abord.** Décider si les exports centralisés (appairages-csv, candidats-csv, etc.) doivent être exposés. Si oui : **technique** — enregistrer dans api_urls, appliquer permissions (IsAuthenticated, IsStaffOrAbove) et filtre par centre pour chaque action. Si non : marquer le module comme non utilisé ou le retirer. **Dépendance :** décision métier avant action technique.

## P1 — Important

3. **LogUtilisateurViewSet et admin logs** — **Technique.** Ajouter select_related("content_type", "created_by") dans get_queryset (ViewSet) et dans get_queryset du LogUtilisateurAdmin si applicable. **Dépendance :** aucune.
4. **GenerateurRapport** — **Métier d’abord.** Clarifier l’intention (utilisé hors API ? commande ?). Si utilisé : documenter et brancher (commande ou endpoint). Si non : marquer ou retirer. **Dépendance :** décision métier.
5. **Signaux prospections** — **Technique.** Sécuriser l’accès à user (None) avant d’utiliser user.username dans log_prospection_save et log_prospection_delete. **Dépendance :** aucune.
6. **Signaux candidats** — **Technique.** Réduire ou supprimer la requête get(pk=instance.pk) dans _remember_old_role (ex. stratégie sans requête ou une seule lecture en début de transaction). **Dépendance :** aucune.

## P2 — Amélioration technique

7. **Scope par centre** — **Technique.** Centraliser la logique (StaffCentresScopeMixin ou équivalent) dans les ViewSets qui filtrent par centre pour limiter la duplication. **Dépendance :** après correction P0.1 si formations utilisent le même pattern.
8. **Tests** — **Technique.** Ajouter tests sur signaux (candidats, prospections) et sur services (evenements_export ; generateur_rapports si conservé). **Dépendance :** aucune.
9. **Exports XLSX** — **Métier + technique.** Évaluer volumétrie et besoin de pagination/streaming ; optimiser si nécessaire. **Dépendance :** aucune.
10. **prepa_objectifs / declic_objectifs** — **Technique.** Vérifier synthese_globale() et Declic.taux_retention pour N+1 ; ajouter select_related/prefetch si besoin. **Dépendance :** aucune.

## P3 — Confort / maintenance

11. **Utils dormants** — **Métier d’abord.** Décider du sort (conservation, suppression, déplacement outillage) pour exporter, logging_utils, pdf_cerfa_utils, cerfa_overlay_debug. **Dépendance :** aucune.
12. **Format de réponse API** — **Technique.** Envisager un mixin ou helper pour success/message/data. **Dépendance :** aucune.
13. **Documentation** — Tableau permissions (rôle / endpoint / action), flux de création des rapports, intention des modules ExportViewSet et GenerateurRapport. **Dépendance :** aucune.

---

# 15. Checklist de tests (par domaine)

## 15.1 Sécurité / permissions

- [ ] Health : GET /api/health/ sans token → 200, structure { status, database, timestamp }.
- [ ] Pour chaque rôle (admin, superadmin, staff, staff_read, prepa_staff, declic_staff, candidat) : accès list/retrieve/create/update/delete sur candidats, formations, prospections, logs, CVTheque, selon les règles métier.
- [ ] Staff rattaché à un centre A : ne voit que les données (candidats, formations, rapports, prospections) dont le centre/formation est dans son périmètre.
- [ ] staff_read : GET autorisé, POST/PUT/DELETE refusés sur les endpoints concernés (sauf exceptions documentées).
- [ ] Candidat : accès uniquement à ses données (CVTheque, commentaires de prospection selon CanAccessProspectionComment).
- [ ] Logs : uniquement admin/superadmin peuvent lister/retrieve.
- [ ] Register, token, token/refresh : comportement attendu (rate limit, validation email à vérifier manuellement si besoin).

## 15.2 Logique métier

- [ ] Création candidat (staff) → Candidat créé avec formation, centre, etc.
- [ ] Action creer-compte sur un candidat → compte utilisateur créé ou rattaché, pas de doublon email, lien Candidat ↔ CustomUser cohérent.
- [ ] Changement de rôle User (candidat → staff) → Candidat lié dissocié (compte_utilisateur = None), pas de crash.
- [ ] Création formation : champs obligatoires (centre, type_offre, statut) validés ; statut temporel / dates cohérents.
- [ ] Liste formations (staff avec centres) : uniquement formations des centres du staff (après correction du bug `u`).

## 15.3 Signaux

- [ ] Création/modification/suppression Prospection → log LogUtilisateur créé avec user ou valeur par défaut ; pas d’exception si user manquant.
- [ ] Création User avec rôle candidat → Candidat créé ou réconcilié par email ; pas de doublon.
- [ ] HistoriqueProspection créé → log “changement de statut” créé.

## 15.4 Performance

- [ ] Liste logs (API) : nombre de requêtes constant par page (après ajout select_related) ; pas de N+1.
- [ ] Liste candidats (une page) : pas d’explosion de requêtes.
- [ ] Export XLSX (candidats, formations) : comportement acceptable sur jeu volumineux (timeout, mémoire).

## 15.5 Exports

- [ ] Export CSV événements (via evenements_viewsets) : contenu et format corrects.
- [ ] Exports XLSX (candidats, formations, prospections, appairages, prepa, declic) : scope par centre respecté (staff), pas de colonnes sensibles.

## 15.6 Régression API

- [ ] Après correction _restrict_to_user_centres : liste formations, get_object formation, export_xlsx formations pour staff → pas de NameError, résultats filtrés par centre.
- [ ] Liste rapports, création rapport : pas de régression sur success/message/data.
- [ ] Endpoints me, roles, search : réponse et permissions inchangées.

## 15.7 Cas limites

- [ ] User non authentifié ou token expiré sur endpoints protégés → 401.
- [ ] Staff sans centres rattachés : comportement attendu (liste vide ou erreur) selon règles métier.
- [ ] Création rapport puis échec log_action : rapport présent en base ; traçabilité partielle ; comportement documenté ou corrigé.

---

# 16. Conclusion stratégique

## 16.1 Niveau global de risque du projet

- **Élevé** sur un point : bug de variable non définie dans FormationViewSet._restrict_to_user_centres, susceptible de faire échouer toute requête formations par un utilisateur non admin (NameError). Comportement en production non vérifié.
- **Modéré** sur les autres points : ExportViewSet non branché (risque fonctionnel si le front l’attend), GenerateurRapport non utilisé (ambiguïté sur l’intention), N+1 sur les logs, signaux avec requête en pre_save et gestion de user None.
- **Contrôlable** : permissions et rôles bien structurés, pas d’endpoint métier en AllowAny, traçabilité via LogUtilisateur.

## 16.2 Niveau de maintenabilité

- **Moyen.** Code structuré par couches (models, serializers, viewsets, permissions, signaux) et documenté partiellement. Points faibles : serializers formations/candidats très couplés, logique de scope dupliquée, nombreuses permissions à maintenir, signaux chargés manuellement dans apps.py. Tests présents mais à renforcer (signaux, services).

## 16.3 Niveau de clarté architecturale

- **Bon.** Une app métier, séparation nette API / admin / signaux / services, routing centralisé, permissions et rôles centralisés. Moins clair : répartition validation (serializers vs modèles), rôle exact d’ExportViewSet et GenerateurRapport, double mécanisme FormationViewSet (mixin + _restrict_to_user_centres).

## 16.4 À corriger avant d’ajouter des fonctionnalités

- **Obligatoire :** Corriger la variable `u` dans _restrict_to_user_centres (formations_viewsets.py) pour éviter NameError en production pour les utilisateurs staff.
- **Recommandé :** Décider du sort d’ExportViewSet (brancher avec permissions et scope, ou marquer non utilisé). Ajouter select_related sur LogUtilisateur (ViewSet et admin). Sécuriser user None dans les signaux prospections.

## 16.5 Ce qui peut attendre

- Centralisation du scope par centre (P2), mixin pour le format de réponse API (P3), clarification des utils dormants (P3), documentation des permissions et du flux rapports (P3). Renforcement des tests sur signaux et services (P2).

---

# 17. Score global argumenté (sur 10)

| Critère | Note | Argumentation |
|--------|------|----------------|
| **Architecture** | 7/10 | Une app, couches claires (models, API, admin, signaux, services). Points négatifs : serializers très couplés, logique de scope dupliquée, ExportViewSet et GenerateurRapport non intégrés. |
| **Séparation des responsabilités** | 6/10 | ViewSets orchestrent, permissions/roles centralisent l’accès, signaux pour traçabilité et sync. Validations et champs calculés trop présents dans les serializers ; partage modèle/serializer/service à clarifier. |
| **Maintenabilité** | 6/10 | Structure lisible, conventions cohérentes. Risques : fichiers formations/candidats lourds, nombreuses permissions, signaux à maintenir manuellement, tests insuffisants sur signaux et services. |
| **Sécurité applicative** | 7/10 | JWT, permissions par ViewSet explicites, accès objet sur ressources sensibles (CVTheque, ProspectionComment), filtrage par centre, sanitization des logs. À confirmer : pas d’exposition de champs sensibles dans tous les serializers ; test manuel des rôles. |
| **Performance backend** | 6/10 | Bon usage de select_related/prefetch_related sur la majorité des ViewSets. N+1 avérés sur logs (ViewSet et admin) ; exports en mémoire sans streaming ; risque N+1 sur synthese_globale en boucle à confirmer. |
| **Exploitabilité par une IA** | 7/10 | Structure prévisible, noms de fichiers et classes cohérents, docstrings présentes. Ce rapport et la cartographie des dépendances permettent à une IA ou un développeur de s’orienter. Points limitants : bug dans formations_viewsets, intention d’ExportViewSet et GenerateurRapport non documentée, permissions multiples à expliciter. |

---

# 18. Audit endpoint par endpoint (synthèse par famille)

Pour chaque famille d’endpoints : route, méthode, ViewSet/action, serializer, permission, logique de queryset, scope objet, risques de fuite, incohérences de format. **Type** = constat vérifié / suspicion / à confirmer hors périmètre.

## 18.1 Santé

- **Route** : `GET /api/health/`
- **ViewSet / action** : `HealthViewSet.list` (`rap_app/api/viewsets/health_viewset.py`)
- **Méthode** : GET
- **Serializer** : aucun ; réponse construite à la main
- **Permissions** : `AllowAny` **(constat vérifié)**
- **Queryset / scope** : aucun ; `connection.ensure_connection()` puis réponse statique
- **Scope objet** : N/A
- **Risques de fuite** : très faibles (status, database, timestamp)
- **Incohérences format** : réponse `{status, database, timestamp}` alors que le reste de l’API tend vers `{success, message, data}` — acceptable pour un endpoint santé

## 18.2 Auth / identité

- **JWT** : `POST /api/token/`, `POST /api/token/refresh/` — `EmailTokenObtainPairView`, `TokenRefreshView`. Permissions gérées par SimpleJWT. **À confirmer hors périmètre** (détails de `EmailTokenObtainPairView` non lus).
- **Enregistrement & profil** : `POST /api/register/` (RegisterView, AllowAny), `GET /api/me/`, `GET /api/roles/`, `POST /api/me/demande-compte/` (IsAuthenticated). Serializers / logique non lus en détail ; **suspicion** d’exposition limitée au profil connecté.

## 18.3 Utilisateurs (CustomUserViewSet)

- **Route** : `/api/users/` (router, basename="user")
- **ViewSet** : `CustomUserViewSet` (`user_viewsets.py`)
- **Méthodes** : CRUD + actions (delete-account, deactivate, reactivate, me, roles, etc.)
- **Serializers** : CustomUserSerializer (non audité en entier)
- **Permissions** : ViewSet principal `ReadWriteAdminReadStaff` **(constat vérifié)** ; certaines actions IsAuthenticated / IsAdminUser
- **Queryset** : `CustomUser.objects.select_related("candidat_associe__formation")` ; get_queryset restreint par rôle et centres **(constat vérifié)**
- **Scope objet** : via queryset et actions dédiées (me)
- **Risques** : si le serializer expose trop de champs (email, role, centres), risque limité ; **suspicion** faible d’exposition de données sensibles (mot de passe non exposé dans les extraits)

## 18.4 Centres (CentreViewSet)

- **Route** : `/api/centres/`
- **Permissions** : `[IsAuthenticated & ReadWriteAdminReadStaff]` **(constat vérifié)**
- **Queryset** : get_queryset filtre les centres visibles selon user.centres (staff non superuser)
- **Scope objet** : entièrement via queryset
- **Risques** : accès direct par ID cohérent avec le filtrage

## 18.5 Statuts / Types d’offre

- **Routes** : `/api/statuts/`, `/api/typeoffres/` — StatutViewSet (IsStaffOrAbove), TypeOffreViewSet (ReadWriteAdminReadStaff)
- **Queryset** : ModelViewSet classiques, sans scope par centre (référentiels)
- **Risques** : fuite limitée (référentiels globaux)

## 18.6 Formations (FormationViewSet)

- **Route** : `/api/formations/`
- **Méthodes** : CRUD, list/détail, actions (filtres, historique, partenaires, commentaires, documents, prospections, dupliquer, stats_par_mois, liste_simple, archiver, desarchiver, archivees, export_xlsx)
- **Serializers** : list → FormationListSerializer ; retrieve/update/partial → FormationDetailSerializer ; create → FormationCreateSerializer **(constat vérifié)**
- **Permissions** : IsStaffOrAbove
- **Queryset / scope** : `_build_base_queryset` → `_restrict_to_user_centres(qs)` ; **bug variable `u` non définie** **(constat vérifié)** → NameError pour tout utilisateur non admin
- **Scope objet** : uniquement via _restrict_to_user_centres ; pas de has_object_permission dédié
- **Risques** : bug critique ; si corrigé, logique prévue : admin → tout ; staff → centre_id in staff_centre_ids

## 18.7 Candidats (CandidatViewSet)

- **Route** : `/api/candidats/`
- **Serializers** : list+lite=1 → CandidatLiteSerializer ; list → CandidatListSerializer ; create/update/partial → CandidatCreateUpdateSerializer ; retrieve → CandidatSerializer **(constat vérifié)**
- **Permissions** : IsStaffOrAbove
- **Queryset** : select_related(formation, formation__centre) + prefetch_related ; filtrage par centres via _scope_qs_to_user_centres
- **Scope objet** : principalement via queryset ; actions (creer-compte) avec contrôles supplémentaires
- **Risques** : exposition de données personnelles ; scope par centres essentiel ; **à confirmer** absence d’échappement (accès direct par ID)

## 18.8 Logs (LogUtilisateurViewSet)

- **Route** : `/api/logs/` — list, retrieve (ReadOnlyModelViewSet)
- **Serializer** : LogUtilisateurSerializer (read-only)
- **Permissions** : [IsAuthenticated, IsAdminLikeOnly]
- **Queryset** : LogUtilisateur.objects.all() sans select_related
- **Risques** : pas de fuite pour non-admin ; N+1 (voir §11)

## 18.9 CVThèque (CVThequeViewSet)

- **Route** : `/api/cvtheque/`
- **Permissions** : CanAccessCVTheque ; get_queryset : admin tout, staff par centres, candidat ses documents ; preview/download avec règle spécifique
- **Scope objet** : has_object_permission dans CanAccessCVTheque
- **Risques** : logique d’accès fine ; tests dédiés recommandés pour preview/download

## 18.10 Prospections, commentaires, stats, prepa, declic

- **Routes** : `/api/prospections/`, `/api/prospection-comments/`, `/api/commentaires/`, `/api/prepa/`, `/api/prepa-objectifs/`, `/api/declic/`, `/api/objectifs-declic/`, `/api/*-stats/`
- **Permissions** : Prospection/ProspectionComment/Evenement → IsOwnerOrStaffOrAbove ; Prepa/PrepaObjectifs/PrepaStats → IsPrepaStaffOrAbove ; Declic/ObjectifsDeclic/DeclicStats → IsDeclicStaffOrAbove ; stats formations/candidats/partenaires/appairages → IsStaffOrAbove
- **Querysets** : basés sur staff_centre_ids et relations owner/centre
- **Risques** : logiques complexes ; N+1 ou incohérences métier **à confirmer** par tests ciblés

---

# 19. Audit détaillé des permissions

Pour chaque classe de `rap_app/api/permissions.py` : rôle réel, has_permission, has_object_permission, endpoints concernés, risques.

## 19.1 CanAccessProspectionComment

- **Rôle** : contrôle fin sur commentaires de prospection (rôle, méthode, is_internal, owner, created_by).
- **has_permission** : non implémenté (BasePermission → True).
- **has_object_permission** : admin_like → True ; staff_like (hors staff_read) → True ; staff_read → SAFE_METHODS ; candidat → conditions (non interne, owner, created_by) ; autres → SAFE True ou created_by_id.
- **Endpoints** : ProspectionCommentViewSet, ProspectionCommentStatsViewSet **(constat vérifié)**.
- **Risques** : accès large pour staff_like si get_queryset ne filtre pas ; pour « autres », SAFE_METHODS True sans restriction → **suspicion** théorique. Niveau : moyen.

## 19.2 IsSuperAdminOnly / IsAdminLikeOnly / IsAdmin

- **IsSuperAdminOnly** : has_permission → user.is_superadmin(). Endpoints à confirmer.
- **IsAdminLikeOnly** : has_permission → is_admin_like(user). Endpoints : LogUtilisateurViewSet **(confirmé)**.
- **IsAdmin** : has_permission → is_admin_like ou is_staff_or_staffread. Endpoints : tests_permissions.
- **Risques** : IsAdmin autorise staff/staff_read ; à vérifier métier.

## 19.3 ReadWriteAdminReadStaff

- **Rôle** : lecture staff/staff_read/admin ; écriture admin (ou superuser).
- **has_permission** : SAFE → staff_or_staffread ou admin_like ; non SAFE → admin_like ou is_superuser.
- **Endpoints** : TypeOffreViewSet, CustomUserViewSet, CentreViewSet **(constat vérifié)**.
- **Risques** : staff/staff_read ne peuvent pas écrire → cohérent ; à confirmer métier.

## 19.4 IsStaffOrAbove

- **Rôle** : staff, staff_read, admin, superadmin ; refuse candidats.
- **has_permission** : non authentifié / candidate → False ; admin_like → True ; staff_read → SAFE uniquement ; staff → True.
- **Endpoints** : majorité des ViewSets métier **(constat vérifié)**.
- **Risques** : conforme à la nomenclature.

## 19.5 IsOwnerOrStaffOrAbove

- **Rôle** : staff/admin ou propriétaire (owner_id, created_by_id) ou lié par prospections (obj.prospections.filter(owner_id=user.id)).
- **has_permission** : authentification ; staff_read → non SAFE refusé.
- **has_object_permission** : admin_like / staff_like (hors staff_read) → True ; staff_read → SAFE ; sinon owner_id ou created_by_id ou prospections.owner_id.
- **Endpoints** : ProspectionViewSet, ProspectionCommentViewSet, EvenementViewSet, ProspectionStats, ProspectionCommentStats **(confirmé)**.
- **Risques** : combiner avec queryset pour éviter fuite via liste ; tests nécessaires.

## 19.6 IsDeclicStaffOrAbove / IsPrepaStaffOrAbove

- **Rôle** : accès modules Déclic / Prépa pour profils dédiés (admin, staff, prepa_staff / declic_staff ; staff_read en lecture ; candidats refusés).
- **Endpoints** : PrepaViewSet, PrepaObjectifs, PrepaStats ; DeclicViewSet, ObjectifDeclicViewSet, DeclicStats **(confirmé)**.
- **Risques** : accès plus large si prepa_staff/declic_staff non restreints par centres dans le queryset.

## 19.7 CanAccessCVTheque

- **Rôle** : admin → tout ; staff_read → lecture + form.centre_id in centres ; staff_like → idem + écriture ; candidat → ses documents (compte_utilisateur_id) ; autres → lecture si created_by ou candidat lié.
- **has_permission** : IsAuthenticated.
- **has_object_permission** : détail selon rôle, centres (get_staff_centre_ids_cached), preview/download.
- **Endpoints** : CVThequeViewSet **(confirmé)**.
- **Risques** : logique alignée ; complexité → tests recommandés.

## 19.8 IsStaffReadOnly

- **Rôle** : staff_read → lecture seule ; autres non restreints.
- **Usage** : DEFAULT_PERMISSION_CLASSES (settings) ; peu d’effet car ViewSets redéfinissent permission_classes.

---

# 20. Audit détaillé des signaux

Pour chaque signal : événement déclencheur, modèle source, effets de bord, dépendances, risques transactionnels, récursion, dépendance user/request, criticité.

## 20.1 Signaux CustomUser / Candidat / Prospection (candidats_signals.py)

- **Déclencheurs** : pre_save(CustomUser) → _remember_old_role ; post_save(CustomUser) → sync_candidat_for_user ; post_save(Candidat) → ensure_user_for_candidate (neutralisé) ; pre_save(Prospection) → sync_formation_from_owner.
- **Effets** : sauvegarde ancien rôle ; création/réconciliation/dissociation Candidat selon CANDIDATE_ROLES ; propagation formation_id dans Prospection depuis owner.
- **Dépendances** : CustomUser, Candidat, Prospection, transactions, IntegrityError **(constat vérifié)**.
- **Risques transactionnels** : pas de transaction globale entre save User et modifications Candidat **(constat vérifié)**.
- **Risques récursion** : ensure_user_for_candidate neutralisé → faible.
- **Criticité** : élevée (cohérence User ↔ Candidat ↔ Prospection).

## 20.2 Signaux prospections (prospections_signals.py)

- **Déclencheurs** : post_save(Prospection) → log_prospection_save ; post_save(HistoriqueProspection, created=True) → log_historique_prospection_save ; post_delete(Prospection) → log_prospection_delete.
- **Effets** : création LogUtilisateur (create/update/delete, changement statut, prochain contact).
- **Dépendances** : Prospection, HistoriqueProspection, LogUtilisateur, get_user (kwargs ou attributs instance).
- **Risques** : user peut être None ; username fragile **(constat vérifié)**. Pas de signal sur LogUtilisateur → récursion faible.
- **Criticité** : moyenne (traçabilité).

## 20.3 Autres signaux (types_offres, formations, partenaires, documents, evenements, rapports, logs, appairage, centres, commentaires)

- **Rôle** : journalisation LogUtilisateur sur create/update/delete **(suspicion**, non tout lu).
- **Risques** : coût en volumétrie ; log non critique si log_action échoue.
- **Criticité** : faible à moyenne.

---

# 21. Audit serializers centraux

Pour les serializers les plus centraux : champs exposés, validations, champs calculés, nested serializers, create/update, logique métier mal placée, sur-exposition / sous-validation.

## 21.1 Formation*Serializer (formations_serializers.py)

- **Champs exposés** : champs Formation (nom, dates, centre, type_offre, statut, capacités…) ; champs calculés (places, taux…) ; relations nested (centre, commentaires, documents, événements, partenaires, prospections, types_offre) **(constat vérifié)**.
- **Validations** : normalisation payload centre/type_offre/statut en *_id dans création.
- **Logique create/update** : FormationCreateSerializer, FormationDetailSerializer (update partielle).
- **Logique métier mal placée** : nombreux champs calculés côté serializer **(suspicion)** ; à confirmer déplacement vers modèle.
- **Risque sur-exposition** : toutes les relations exposées en une réponse ; volumétrie et confidentialité (commentaires internes, documents) à surveiller.

## 21.2 Candidat*Serializer (candidat_serializers.py)

- **Champs exposés** : données personnelles, formation, appairages, ateliers TRE, commentaires appairage **(constat vérifié)**.
- **Validations** : contrôles sur formation, statut, email (structure vue).
- **Risque sur-exposition** : informations sensibles ; scope par centres essentiel ; à confirmer avec métier.

## 21.3 LogUtilisateurSerializer

- **Champs** : id, action, model (content_type), object_id, details, user (username), date. Read-only. details sanitized (LOG_SENSITIVE_FIELDS). Accès admin_like uniquement → risque limité **(constat vérifié)**.

## 21.4 Serializers Prepa / Declic objectifs

- Utilisent synthese_globale() ; structures agrégées. Risque : exposition données agrégées (interne).

---

# 22. Audit models centraux (synthèse)

Contraintes visibles, clean/save, signaux liés, dépendances, champs critiques, cohérence métier, duplication de logique. Analyse non exhaustive (nombreux modèles).

## 22.1 CustomUser

- **Rôle** : AUTH_USER_MODEL. Contraintes : role, centres ; méthodes is_candidat_or_stagiaire, is_admin, is_superadmin, create_user_with_role **(constat partiel)**.
- **Signaux** : candidats_signals. Risques : cohérence is_staff/is_superuser vs role.

## 22.2 Candidat

- **Dépendances** : CustomUser, Formation, signaux. Champs critiques : formation, email, compte_utilisateur, created_by, updated_by. Risques : duplication logique modèle/serializers.

## 22.3 Formation

- **Dépendances** : Centre, TypeOffre, Statut, commentaires, documents, événements, partenaires, prospections. Méthodes : get_csv_fields, propriétés calculées (total_places, etc.). Signaux : formations_signals. Risques : cohérence dates/statut ; partiellement testée.

## 22.4 Prospection / HistoriqueProspection

- Signaux : prospections_signals. Risques : cohérence statuts, historique.

## 22.5 LogUtilisateur

- Déjà détaillé (§4.4, §7). log_action / log_system_action ; sanitize_details.

## 22.6 Prepa / Declic

- synthese_globale() pour reporting. Risques : erreurs de calcul (impact métier).

---

# 23. Audit ORM / performance (compléments)

- **List endpoints** : filtrage + ordering + pagination ; select_related/prefetch sur objets riches (candidats, formations, prospections, commentaires) **(constat vérifié)**.
- **Retrieve** : get_object() avec select_related/prefetch (formation) **(constat vérifié)**.
- **Stats** : PrepaStats, DeclicStats, FormationStats, CandidatStats, PartenaireStats, AppairageStats — agrégations potentiellement lourdes ; à profiler.
- **Exports** : tous les export-xlsx/csv — boucle Python sur queryset ; pas de streaming **(constat vérifié)** → volumétrie à surveiller.
- **Admin** : LogUtilisateurAdmin sans select_related → N+1 **(constat vérifié)**.
- **Serializers** : formations_serializers, candidat_serializers — relations nested peuvent déclencher requêtes implicites si pas de prefetch en amont ; viewsets concernés préchargent en général **(constat partiel)**.

---

# 24. Zones encore non auditées ou incertaines

## 24.1 Incertain ou partiellement vérifié

- Intention métier exacte : qui voit quelles formations (staff vs admin) après correction du bug `u` ; attentes front pour ExportViewSet, GenerateurRapport, certains exports XLSX.
- Implémentations non lues en détail : tous les serializers (hors formations/candidats/logs), tous les modèles, tous les signaux (hors candidats/prospections), tous les StatsViewSets, PrepaStats, DeclicStats.
- Comportement de `user.has_role("admin", "superadmin")` (ReadOnlyOrAdmin) si méthode absente sur CustomUser.
- Sémantique exacte de `IsAuthenticated & ReadWriteAdminReadStaff` (combinaison DRF).

## 24.2 Nécessitant exécution manuelle ou tests ciblés

- Exécution des tests existants (pytest) pour confirmer couverture et régressions.
- Tests de charge sur exports et stats.
- Tests d’accès par rôle sur chaque endpoint sensible (candidats, formations, prospections, logs, CVTheque, register, me, roles).
- Vérification manuelle : pour chaque rôle, accès list/retrieve/create/update/delete sur ressources clés.

## 24.3 Non concluables par analyse statique seule

- Comportement en production (contournement du bug `u`, chemins non exécutés).
- Verrouillages, contention base de données, erreurs réseau/DB.
- Rate limit et validation email sur register (détails non lus).
- Volumétrie réelle des logs et impact des signaux en charge.

---

*Fin du rapport d’audit technique. Aucune modification de code n’a été appliquée. Document de référence à mettre à jour après corrections ou évolutions majeures.*
