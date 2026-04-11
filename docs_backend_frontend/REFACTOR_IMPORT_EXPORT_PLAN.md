# Plan d’audit et d’architecture — Import / Export Excel symétrique (Rap App)

**Rôle :** document de référence (« source de vérité ») pour un système d’**import** et d’**export** Excel **symétriques** sur l’application Django `rap_app`.  
**Statut global :** **Lot 0 figé** + **Lots 1–4 livrés** sous **`/api/import-export/<resource>/…`** : référentiels, **Partenaire**, **Formation**, métadonnées **Document**, **Candidat** (colonnes dynamiques alignées sur **`CandidatCreateUpdateSerializer`** + **`id`**), métadonnées **CVThèque** (**`CVTHEQUE_COLUMNS`** ; import `POST` → **`not_supported`** §2.10.1). **`handlers_lot4.py`** (`CandidatExcelHandler`, `CVThequeExcelHandler`). UI **`Lot1ExcelActions`** (listes) avec lien **Historique des imports** + toast post-import cliquable ; page **`Historique imports Excel`** (filtres **synchronisés avec l’URL** pour partage / retour navigateur + presets + multi-select + autocomplete + exports **CSV / XLSX / PDF**). Garde-fou **durée d’analyse** (**`parse_timeout`**). **Table technique `ImportJob`** — §2.14. **`base.py`** : optionnel.

**Dernière mise à jour :** 2026-04-07 — **Filtres `ImportJob` ↔ query string** : **`ImportExportJobsPage`** lit et écrit **`resource`**, **`resource__in`**, **`user`**, **`date_min`**, **`date_max`**, **`status`**, **`status__in`**, **`dry_run`**, **`ordering`**, **`page`**, **`page_size`** (`replace: true`) ; hydratation au changement d’URL (hors mise à jour interne). *(Avant : seul `?resource=` était exploité depuis l’URL.)* **§ Avancement** ; **Prochaine étape**.

---

## Avancement de l’implémentation

**Règle de maintenance :** à **chaque livraison** (code, tests, configuration, doc d’API), **mettre à jour** cette section : date en tête de document, tableaux ci‑dessous, et si besoin la **§2.13** (chemins de fichiers réels).

**Principe modèles (Lots 0–4, cf. §2.14) :** **aucun** champ **ajouté ni modifié** sur les **modèles métier existants**. Toute traçabilité **persistée** = table **technique séparée** (`ImportJob` ou équivalent), **optionnelle** — jamais d’enrichissement des tables `Centre`, `Partenaire`, `Formation`, `Candidat`, etc.

Légende : **Fait** = livré dans le dépôt · **Partiel** = amorce ou périmètre réduit · **À faire** = non commencé.

### Lot 0 — Fondations techniques et contrats

| Livrable | Statut | Où / commentaire |
|----------|--------|-------------------|
| Identifiants `resource` canoniques (Meta) | **Fait** | `rap_app/services/imports/schemas.py` |
| Réponse JSON import (§2.8.1) | **Fait** | `handlers_lot1.py` (`_build_import_payload`) |
| Conventions de colonnes (snake_case, `id`, etc.) | **Fait** (Lots 1–4) | Colonnes figées dans `schemas.py` + **candidat** (liste dérivée du serializer, cache module `handlers_lot4`) + **`CVTHEQUE_COLUMNS`** ; `LOT1_RESOURCE_COLUMNS` inclut **`cvtheque`** |
| Clés naturelles Lot 1 (§2.3.1) | **Fait** | Logique dans `handlers_lot1.py` |
| Feuille données : ligne 1 = en-têtes (§2.11) | **Fait** | `excel_io.py` |
| Politique `Document` / `CVTheque` V1 (§2.10.1) | **Fait** (doc) | Règles **§2.10.1** ; endpoints import métier **Lot 3+** si retenus |
| `schema_version` + contrôle à l’import (§2.4) | **Fait** | Feuille « Meta » + `assert_meta_matches` ; code **`schema_mismatch`** si version / `resource` incorrects |
| `ImportJob` (table **technique** séparée, §2.8 / §2.14) | **Fait** | **`rap_app.models.import_job.ImportJob`** ; **`import_job_recorder.py`** ; désactivable **`RAP_IMPORT_PERSIST_JOBS`** ; complète les **logs** fichier (**`import_export.log`**) ; **consultation API** **`/api/import-export/jobs/`** (§2.15) |
| **Logs** structurés (complément §2.8 / traçabilité légère) | **Fait** | **`views.py`** : `import_export_template`, `import_export_export_xlsx` (**`export_row_count`**), `import_export_import_xlsx_ok` / `…_missing_file` / `…_validation_error` ; **`settings.py`** : **`RotatingFileHandler`** → **`logs/import_export.log`** (`.1` … **`.N`** selon **`RAP_IMPORT_LOG_BACKUP_COUNT`**, **`maxBytes`** = **`RAP_IMPORT_LOG_MAX_BYTES`**) + console ; **tests** : logger en **CRITICAL** (pas de handler fichier) |
| Politique transactionnelle (§2.6) | **Fait** (Lots 1–4) | **`atomic=file`** dans `handlers_lot1` à **`handlers_lot4`** (**`Candidat`**) |
| **Source de vérité scope** (§2.9.1) | **Fait** | `scope.py` — `filter_queryset(get_queryset())` ; tests **`test_imports_lot1`**, **`test_imports_lot2_partenaire`**, **`test_imports_lot3`**, **`test_imports_lot4`** |
| Règles de scoping centre (§2.9) | **Fait** (Lots 1–4) | **Candidat** : `formation__centre_id` ; **CVThèque** : `get_queryset()` du ViewSet ; + lots précédents |
| Garde-fous §2.7 (zip bomb, etc.) | **Fait** | Ratio ZIP, en-tête `PK`, plafond entrées ZIP (`RAP_IMPORT_MAX_ZIP_ENTRIES`), plafond lignes données (`RAP_IMPORT_MAX_LOT1_DATA_ROWS`) ; **durée max** analyse après ouverture (`RAP_IMPORT_MAX_PARSE_SECONDS`, **`parse_timeout`**) — best-effort (n’interrompt pas `load_workbook`) |
| Chaîne §2.12 (extension, taille, `openpyxl`) | **Fait** | `validation.py` ; `excel_io.read_lot1_workbook` ; codes `file_too_large` / `invalid_file` / **`parse_timeout`** |
| Orchestration `base.py` (optionnel, §2.13) | **Hors Lot 0** | `excel_io` + `handlers_*` ; `base.py` si besoin |
| **Noms de feuilles** `DATA` / `META` / `AIDE` (§2.11.1) | **Fait** | `SHEET_AIDE`, `AIDE_V1_LINES`, génération dans `write_lot1_workbook` |
| **Taxonomie** des `code` d’erreur (§2.8.2) | **Fait** (Lot 1) | `schemas.py` : ligne (`required`, `invalid`, …) ; fichier / Meta (`schema_mismatch`, `unknown_columns`, **`parse_timeout`**, …) |
| **Colonnes inconnues** — mode **strict** + timing (§2.5.2) | **Fait** | `validate_data_sheet_headers_strict` + `read_lot1_workbook(..., expected_columns=…)` — contrôle juste après la ligne d’en-têtes, avant le parcours des lignes de données |
| **Champs système** non importables (§2.5.3) | **Fait** (Lot 1) | `FORBIDDEN_IMPORT_COLUMN_NAMES` + refus en en-têtes (code `invalid`) |
| **`dry_run`** — sémantique `summary` (§2.8.3) | **Fait** | OpenAPI `import-xlsx` (`import_export`) |
| **Module `api/import_export/`** + routes **`/api/import-export/…`** (§2.15) | **Fait** | `rap_app/api/import_export/` (`views.py`, `urls.py`, `scope.py`, **`serializers.py`**, **`import_job_views.py`**) ; préfixe `api_urls.py` : `path("import-export/", include(...))` ; **OpenAPI** : tag **`Import-export Excel`** ; **POST `import-xlsx`** → persistance **`ImportJob`** (si **`RAP_IMPORT_PERSIST_JOBS`**) ; **GET `jobs/`** liste paginée + **GET `jobs/<id>/`** détail + **GET `jobs/export-csv/`** + **GET `jobs/export-xlsx/`** + **GET `jobs/export-pdf/`** (mêmes filtres/scope ; filtres avancés `user`, `date_min`, `date_max`, `resource__in`, `status__in`) |
| **Guide métier / intégration** (`guide_import_excel_bdd.md`) | **Fait** | Aligné sur l’implémentation réelle (§5.2–5.4, §6.2–6.3, §8) ; renvoie à ce plan comme source de vérité architecture |
| **UI liste des traces `ImportJob`** | **Fait** | **`ImportExportJobsPage.tsx`**, **`importExportJobs.ts`** ; route + menu ; **`?resource=`** dans l’URL → préremplit le filtre ressource ; **`Lot1ExcelActions`** : bouton **Historique des imports** ( **`isCoreStaffRole`** ) + toast post-import cliquable ; page historique : filtres **user/date**, presets période (**7j/30j/mois**), tri explicite (`ordering`), filtres **multi-select** (ressources/statuts), boutons **Export CSV/XLSX** |

### Lot 1 — Référentiels (`Centre`, `TypeOffre`, `Statut`)

| Élément | Statut | Où / commentaire |
|---------|--------|-------------------|
| Service import/export | **Fait** | `rap_app/services/imports/handlers_lot1.py` (regroupe les trois ressources ; pas de fichiers séparés `centre.py` / `type_offre.py` / `statut.py`) |
| `validation.py`, `schemas.py`, `excel_io.py` | **Fait** | `rap_app/services/imports/` |
| Actions `import-template`, `export-xlsx`, `import-xlsx` | **Fait** | **Uniquement** `GET|POST /api/import-export/<resource>/…` (§2.15). **Frontend :** `lot1ImportExport.ts` (**`importExportJobsAppPath`**) + `Lot1ExcelActions.tsx` (lien **Historique des imports** `?resource=`) + **`ImportExportJobsPage`**. **Plus** d’actions Excel sur les ViewSets CRUD référentiels |
| Setting taille max upload | **Fait** | `RAP_IMPORT_MAX_UPLOAD_BYTES` dans `rap_app_project/settings.py` |
| Tests (validation, round-trip, upsert, scope, dry_run) | **Fait** | `rap_app/tests/tests_services/test_imports_lot1.py` (+ parité list/export et routes `import-export` où ajoutés) |
| Feuille « Aide » — V1 Lot 1 (§2.11.2) | **Fait** | `excel_io.write_lot1_workbook(..., include_aide_sheet=True)` — `SHEET_AIDE`, `AIDE_V1_LINES` (instructions + rappel codes §2.8.2) ; **pas** de grosses tables FK en Lot 1 |
| Dépréciation routes mixin → `/api/import-export/` (§2.15) | **Fait** | Mixin **`excel_lot1_mixin.py`** **supprimé** ; `ExcelLot1Mixin` retiré de `CentreViewSet`, `StatutViewSet`, `TypeOffreViewSet`. Anciennes URLs (`/api/centres/import-xlsx/`, etc.) **n’existent plus** — clients : **§2.15** uniquement |

### Lot 2 — Partenaires

| Élément | Statut | Où / commentaire |
|---------|--------|------------------|
| Colonnes + `RESOURCE_PARTENAIRE` | **Fait** | `schemas.py` — `PARTENAIRE_COLUMNS` (serializer-aligned + `default_centre_id`) |
| Handler `atomic=file` + upsert `id` / `nom` | **Fait** | `handlers_lot2.py` — `PartenaireExcelHandler` ; `import_upload(..., request=request)` pour permissions |
| `scope.py` + URLs `/import-export/partenaire/…` | **Fait** | `PartenaireViewSet`, slug `partenaire` |
| Permission POST import | **Fait** | `PartenaireAccessPermission` : `import_xlsx` aligné sur `create` (admin-like ou staff centre non `staff_read`) |
| Tests | **Fait** | `test_imports_lot2_partenaire.py` |
| Frontend | **Fait** | `buildPartenaireExportQueryParams`, `Lot1ExcelActions` sur `PartenairesPage.tsx` |

### Lot 3 — Formations et documents (métadonnées)

| Élément | Statut | Où / commentaire |
|---------|--------|------------------|
| Colonnes + `RESOURCE_FORMATION` / `RESOURCE_DOCUMENT` | **Fait** | `schemas.py` — `FORMATION_COLUMNS` (serializer + `activite` + `partenaire_ids`), `DOCUMENT_COLUMNS` |
| Handler Formation `atomic=file` | **Fait** | `handlers_lot3.py` — upsert par **`id`** ou création (**`nom`**, **`centre_id`**, **`type_offre_id`**, **`statut_id`**) ; M2M via **`partenaire_ids`** ; écriture réservée à **`can_write_formations`** (sinon **403**) |
| Handler Document | **Fait** | `DocumentExcelHandler` — template + export métadonnées ; **`POST import-xlsx`** → **400** + **`code: not_supported`** (§2.10.1) |
| `scope.py` + URLs | **Fait** | slugs **`formation`**, **`document`** → `FormationViewSet`, `DocumentViewSet` |
| Filtre REST **`formation`** sur la liste documents | **Fait** | **`DocumentFilter`** — paramètre **`formation`** = **`formation_id`** (aligné front / export §2.9.1) ; **`test_list_documents_filtered_by_formation_query_param`**, **`test_document_export_respects_formation_query_param`** |
| Export historique formations (`/formations/export-xlsx/`) | **Conservé** | Format « rapport » distinct ; **non** remplacé par l’export import-export (Meta §2.4) — coexistence |
| Tests | **Fait** | `test_imports_lot3.py` (+ export document filtré) ; `tests_documents_viewsets.py` (liste filtrée) |
| Frontend | **Fait** | `buildFormationExportQueryParams`, `Lot1ExcelActions` sur **`FormationsPage.tsx`** ; **`buildDocumentExportQueryParams`**, **`Lot1ExcelActions`** sur **`DocumentsPage.tsx`** (import document → **`not_supported`** §2.10.1) |

### Lot 4 — Candidats et CVThèque

| Élément | Statut | Où / commentaire |
|---------|--------|------------------|
| `RESOURCE_CANDIDAT` / colonnes dynamiques | **Fait** | `handlers_lot4.get_candidat_excel_columns()` — champs **non read-only** de **`CandidatCreateUpdateSerializer`** + **`id`** |
| Handler Candidat `atomic=file` | **Fait** | **`CandidatExcelHandler`** — upsert **`id`** ; création : **`formation`** obligatoire (staff non admin) ; défaut **`rgpd_legal_basis=interet_legitime`** si absent ; **`IsStaffOrAbove`** refuse **`staff_read`** sur **POST** |
| `RESOURCE_CVTHEQUE` + **`CVTHEQUE_COLUMNS`** | **Fait** | `schemas.py` ; export métadonnées ; **`POST import-xlsx`** → **`not_supported`** |
| `scope.py` | **Fait** | slugs **`candidat`**, **`cvtheque`** → **`CandidatViewSet`**, **`CVThequeViewSet`** |
| Filtre REST **`candidat`** sur la liste CVThèque | **Fait** | **`CVThequeFilterSet`** — paramètre **`candidat`** = **`candidat_id`** (aligné front / export §2.9.1) ; **`test_list_cvtheque_filtered_by_candidat_query_param`**, **`test_cvtheque_export_respects_candidat_query_param`** |
| Export historique candidats (`/candidats/export-xlsx/`) | **Conservé** | Coexiste avec l’export Meta **`/api/import-export/candidat/export-xlsx/`** |
| Tests | **Fait** | `test_imports_lot4.py` (+ export CVThèque filtré) ; **`tests_cvtheque_viewset.py`** (liste filtrée) |
| Frontend | **Fait** | **`buildCandidatExportQueryParams`**, **`Lot1ExcelActions`** sur **`candidatsPage.tsx`** ; **`buildCvthequeExportQueryParams`**, **`Lot1ExcelActions`** sur **`cvthequePage.tsx`** (import CVThèque → **`not_supported`** §2.10.1) |

---

## Pourquoi cette approche ?

| Bénéfice | Description |
|----------|-------------|
| **Fiabilité** | Une liste et un plan versionnés permettent de repérer immédiatement tout **modèle oublié** ou hors périmètre. |
| **Maîtrise du périmètre** | Le regroupement par **domaine** et l’**ordre des lots** reflètent les **dépendances** (référentiels avant entités qui les référencent). |
| **Validation** | Vous pouvez **retirer ou reporter** une ressource (ex. `LogUtilisateur`) **avant** tout code, évitant du travail inutile ou risqué. |

---

## Mission 1 — Audit et auto-découverte (scan `rap_app/`)

### 1.1 Périmètre du scan

- **Modèles :** tous les fichiers sous `rap_app/models/*.py` (classes `models.Model` concrètes et mixins non abstraits utilisés comme tables).
- **Serializers :** `rap_app/api/serializers/*.py` — identification des serializers **écriture / création** ou équivalents (`*Write*`, `*Create*`, `ModelSerializer` utilisés en `create` sur les ViewSets).
- **API :** `rap_app/api/api_urls.py` — ViewSet associé par ressource (hors `*-stats` et utilitaires).

### 1.2 Hors périmètre import/export Excel (vue d’ensemble)

Ce plan ne couvre **pas** toute la surface du dépôt. La **liste exhaustive** des exclusions, classée par nature (CERFA, test, logs, historiques, VAE, stats, modules métier, etc.), figure en **§1.5 — Référence des exclusions** : c’est la **source de vérité**. Les lignes « hors plan » du tableau §1.3 renvoient à **§1.5**.

### 1.3 Inventaire exhaustif des modèles métier (tables)

Les modèles ci-dessous sont les **entités métier** identifiées dans le code. Les relations **non FK** (ex. `GenericForeignKey` sur `LogUtilisateur`) sont signalées.

| Domaine | Modèle | FK / relations notables | Serializer écriture principal (réf.) | Complexité import/export |
|---------|--------|-------------------------|-------------------------------------|---------------------------|
| **Configuration / référentiels** | `Centre` | — (racine géographique / organisation) | `CentreSerializer` | **Simple** — peu de FK ; champs scalaires + unicité `nom`. |
| | `TypeOffre` | — | `TypeOffreSerializer` | **Simple**. |
| | `Statut` | — | `StatutSerializer` | **Simple**. |
| **Partenaires** | `Partenaire` | `default_centre` → `Centre` (nullable) | `PartenaireSerializer` | **Simple à moyen** — une FK optionnelle. |
| **Formations** | `Formation` | `centre`, `type_offre`, `statut` ; **M2M** `partenaires` | `FormationCreateSerializer` / `FormationUpdateSerializer` | **Complexe** — plusieurs FK obligatoires + M2M ; scope centre à respecter. |
| | `HistoriqueFormation` | `formation` | (souvent lecture seule) | **§1.5.D** — export / lecture ; pas de réimport. |
| **Événements & contenus formation** | `Evenement` | `formation` | `EvenementSerializer` | **Hors périmètre** §1.5.H. |
| | `Commentaire` | `formation` | `CommentaireSerializer` | **Hors périmètre** §1.5.H. |
| | `Document` | `formation` | `DocumentCreateSerializer` / `DocumentUpdateSerializer` | **Dans le plan** (Lot 3) : **§2.10** — export métadonnées possible ; import Excel **V1** typiquement **désactivé** sans pipeline fichier. |
| **Candidats** | `Candidat` | `formation`, `evenement`, `compte_utilisateur` (OneToOne), plusieurs FK optionnelles (placement, entreprises, etc.) | `CandidatCreateUpdateSerializer` | **Très complexe** — graphe large + règles métier et masquage. |
| | `HistoriquePlacement` | `candidat`, `entreprise`, `responsable` | — | **§1.5.D** — export / lecture ; pas de réimport. |
| **CVThèque** | `CVTheque` | `candidat` | `CVThequeWriteSerializer` | **Moyen** — dépend de `Candidat` ; **§2.10** (même logique que `Document`). |
| **Appairage** | `Appairage` | `candidat`, `partenaire`, `formation` (nullable) | `AppairageCreateUpdateSerializer` | **Hors périmètre** §1.5.H. |
| | `HistoriqueAppairage` | `appairage`, `auteur` | — | **Historique** — hors import (§1.5.D). |
| | `CommentaireAppairage` | `appairage`, `created_by` | `CommentaireAppairageWriteSerializer` | **Hors périmètre** §1.5.H. |
| **Prospection** | `Prospection` | `owner`, `centre`, `formation`, `partenaire` | `ProspectionWriteSerializer` | **Hors périmètre** §1.5.H. |
| | `HistoriqueProspection` | `prospection` | — | **§1.5.D** — export / lecture ; pas de réimport. |
| | `ProspectionComment` | `prospection` | `ProspectionCommentSerializer` | **Hors périmètre** §1.5.H. |
| **Prépa** | `Prepa` | `centre` | `PrepaSerializer` | **Hors périmètre** §1.5.H. |
| | `StagiairePrepa` | `prepa_origine`, `centre` | `StagiairePrepaSerializer` | **Hors périmètre** §1.5.H. |
| | `ObjectifPrepa` | `centre` | `ObjectifPrepaSerializer` | **Hors périmètre** §1.5.H. |
| **Déclic** | `Declic` | `centre` | `DeclicSerializer` | **Hors périmètre** §1.5.H. |
| | `ParticipantDeclic` | `declic_origine`, `centre` | `ParticipantDeclicSerializer` | **Hors périmètre** §1.5.H. |
| | `ObjectifDeclic` | `centre` | `ObjectifDeclicSerializer` | **Hors périmètre** §1.5.H. |
| **Atelier TRE** | `AtelierTRE` | `centre` ; **M2M** `candidats` | `AtelierTRESerializer` | **Hors périmètre** §1.5.H. |
| | `AtelierTREPresence` | `atelier`, `candidat` | `AtelierTREPresenceSerializer` | **Hors périmètre** §1.5.H. |
| **Rapports** | `Rapport` | `centre`, `type_offre`, `statut`, `formation` | `RapportSerializer` | **Hors périmètre** §1.5.H. |
| **CERFA** | `CerfaContrat` | `candidat`, `formation`, `employeur` (Partenaire), `created_by`, `updated_by` | `CerfaContratSerializer` | **Hors périmètre** §1.5.A. |
| **Logs** | `LogUtilisateur` | `content_type`, **GenericFK** | `LogUtilisateurSerializer` | **Hors import données** §1.5.C ; traçabilité des imports possible (§2.8). |
| **VAE / Jury** (API non exposée) | `VAE`, `HistoriqueStatutVAE`, `SuiviJury` | `centre`, `vae`, etc. | (non routé actuellement) | **§1.5.E**. |
| **Test** | `DummyModel` | — | — | **§1.5.B**. |

**Note :** `ObjectifPrepa` et `ObjectifDeclic` ne sont pas exportés dans `rap_app/models/__init__.py` mais existent en base ; ils sont **hors périmètre** (§1.5.H).

### 1.4 Périmètre résiduel « encore négociable » (V1)

Hors **§1.5**, seuls restent **ajustables** pour la V1 au sein du plan :

| Élément | Détail |
|---------|--------|
| **`Document`**, **`CVTheque`** | **§2.10** : import Excel souvent **désactivé** ; export métadonnées selon besoin. |

**Chemin minimal d’implémentation** : **Lot 0** → **Lots 1–2** (référentiels + partenaires) → **Lot 3** (**Formation** + **`Document`** en export métadonnées si utile) → **Lot 4** (**Candidat** + **`CVTheque`** selon §2.10).

### 1.5 Référence des exclusions (source de vérité)

Tout ce qui suit est **hors** import/export Excel symétrique défini dans ce document, sauf mention contraire. L’**API REST** existante pour ces domaines reste utilisable en parallèle.

#### A. CERFA

| Élément | Traitement |
|---------|------------|
| **`CerfaContrat`** | Pas d’import/export Excel symétrique dans ce plan. L’API **`cerfa-contrats`** et le reste du flux CERFA peuvent **continuer à vivre à côté** (hors périmètre documenté ici). |

#### B. Test et comptes

| Élément | Traitement |
|---------|------------|
| **`DummyModel`** | Pas d’import Excel métier (modèle de test). |
| **`CustomUser`** | Pas d’import Excel métier (comptes / sécurité ; traitement admin réservé si besoin). |

#### C. Logs applicatifs

| Élément | Traitement |
|---------|------------|
| **`LogUtilisateur`** | Ne pas **importer** des lignes de log comme données métier. Le modèle peut **tracer** les opérations d’import (cf. §2.8, `ACTION_IMPORT`). |

#### D. Historiques

| Élément | Traitement |
|---------|------------|
| **`HistoriqueFormation`**, **`HistoriqueAppairage`**, **`HistoriqueProspection`**, **`HistoriquePlacement`**, **`HistoriqueStatutVAE`** | Plutôt **export** / **lecture** ; **pas de réimport** dans ce plan (souvent signaux / logique métier). |

#### E. VAE / jury (API non alignée sur le périmètre courant)

| Élément | Traitement |
|---------|------------|
| **`VAE`**, **`HistoriqueStatutVAE`**, **`SuiviJury`** | Peu pertinent tant que l’**API dédiée** n’est pas exposée comme le reste (`api_urls.py` : routes commentées) ; hors plan import/export Excel. |

#### F. ViewSets agrégation

| Élément | Traitement |
|---------|------------|
| Tous les ViewSets **`*-stats`** | **Jamais** dans le périmètre import/export Excel métier (statistiques / agrégations). |

#### G. Non-modèles (technique)

| Élément | Traitement |
|---------|------------|
| **`CerfaNationaliteCode`** et autres **`TextChoices`** dans `cerfa_codes.py` | Énumérations, pas des tables importables. |
| **`BaseModel`** | Modèle **abstrait**, pas une table métier. |

#### H. Modules métier exclus (décision produit)

Pas d’import/export Excel symétrique pour : **`Rapport`** ; **`Evenement`**, **`Commentaire`** ; **`AtelierTRE`**, **`AtelierTREPresence`** ; **`Appairage`**, **`CommentaireAppairage`** ; **`Prospection`**, **`ProspectionComment`** ; **`Prepa`**, **`StagiairePrepa`**, **`ObjectifPrepa`** ; **`Declic`**, **`ParticipantDeclic`**, **`ObjectifDeclic`** — accès **API REST** inchangé.

### 1.6 Risque produit (priorité métier vs V1 « socle »)

La V1 du plan se concentre sur **référentiels → partenaires → formations → candidats** (et métadonnées documentaires). **Prospection**, **Appairage**, **Prépa**, **Déclic**, **Atelier TRE** sont volontairement en **§1.5.H** : dans beaucoup d’organisations, ce sont pourtant des **premières demandes** d’import/export. Tant qu’ils restent exclus, le besoin doit être couvert par l’**API REST** existante ou par une **V2** du périmètre Excel — à valider avec le métier pour éviter un écart entre outil et attentes terrain.

---

## Mission 2 — Architecture générique (`services/imports/`)

Objectif : **symétrie** entre sauvegarde (export) et restauration (import), avec une **seule source de vérité** pour les colonnes et la sémantique (IDs, types).

**Surface HTTP :** les endpoints publics cibles sont le **module** `rap_app/api/import_export/` et le préfixe **`/api/import-export/`** — **§2.15** (ViewSets dédiés, sans modifier les ViewSets CRUD). La Mission 2 décrit surtout la **couche services** (`services/imports/`).

### 2.1 Responsabilités du module générique (sans code ici)

| Fonction / concept | Rôle | Symétrie |
|--------------------|------|----------|
| **`get_import_template`** | Génère un classeur `.xlsx` : feuille principale avec **en-têtes** alignés sur le schéma d’import ; feuille **« Aide »** avec **instructions** et tableaux **ID ↔ libellé** pour chaque **ForeignKey** exposée dans le fichier (filtrés par périmètre utilisateur si applicable). | Colonnes **identiques** à celles attendues par `import_from_excel`. |
| **`export_to_excel`** | Exporte un **queryset** (ou liste d’IDs) vers un `.xlsx` **ré-importable** : inclure la colonne **`id`** (clé primaire) pour chaque ligne, plus toutes les colonnes nécessaires au round-trip serializer. | Fichier produit = **entrée valide** de `import_from_excel` (même convention de colonnes). |
| **`import_from_excel`** | Lit le fichier ; **`transaction.atomic`** par fichier ou par lot configurable ; **`dry_run=True`** : exécute validation (serializers) **sans** `save()` ou dans une transaction rollback ; **`dry_run=False`** : persistance. Retour structuré : créations, mises à jour, erreurs ligne par ligne. | Utilise les **mêmes** règles de validation que l’API REST. |
| **Upsert** | Voir §2.3 — **`id` prioritaire** ; **clé naturelle** optionnelle par ressource si `id` absent (onboarding / reprise). | Round-trip export↔import + imports sans IDs stables. |

### 2.2 Contrats transverses (résumé)

- **`ResourceSchema` (concept)** : définition centralisée par ressource — colonnes, types, FK référencées, champs obligatoires en création, champs interdits à l’import (ex. `created_at` auto).
- **Permissions** : mêmes règles que les ViewSets (`IsStaffOrAbove`, `ScopedModelViewSet`, `can_write_*`, etc.).
- **Taille maximale du fichier** (**obligatoire**) : cf. §2.12 ; settings type `RAP_IMPORT_MAX_UPLOAD_BYTES` ; complète reverse proxy et `DATA_UPLOAD_MAX_MEMORY_SIZE` / `FILE_UPLOAD_MAX_MEMORY_SIZE`.

Les décisions détaillées (clés, versioning, FK, transactions, sécurité, scope, observabilité, binaires, JSON, feuille Excel) sont en **§2.3 à §2.13**.

### 2.3 Stratégie d’upsert : `id` vs clés naturelles

| Règle | Description |
|-------|-------------|
| **`id` prioritaire** | Si la colonne **`id`** est renseignée et correspond à une ligne **visible / modifiable** par l’utilisateur (cf. §2.9) → **mise à jour**. |
| **Création** | Si **`id`** absent ou vide → **create** (sauf résolution par clé naturelle ci-dessous). |
| **Clé naturelle optionnelle** | Par ressource, documenter une **clé métier d’upsert** lorsque `id` est absent (ex. `Centre.nom` unique, code métier pour `Statut` / `TypeOffre` si stable et unique dans le périmètre). Permet l’**onboarding** et la reprise depuis une autre instance **sans** IDs identiques. |
| **Conflit** | Si `id` et clé naturelle divergent ou si plusieurs lignes matchent une clé naturelle ambiguë → **erreur explicite** (pas de devinette silencieuse). |

Les clés naturelles sont **figées par ressource** dans le schéma d’import (pas d’improvisation par endpoint).

#### 2.3.1 Clés naturelles — Lot 1 (liste minimale à figer au Lot 0)

Sans cette liste, le bénéfice « onboarding sans IDs » est repoussé. Alignement sur l’**unicité réelle** en base et les champs du serializer.

| Ressource (`resource`) | Colonne(s) d’upsert si `id` absent | Condition |
|------------------------|-------------------------------------|-----------|
| **`centre`** | `nom` | Unicité **`Centre.nom`** en base. |
| **`type_offre`** | À trancher : **`nom`** (si unique métier) ou code métier si le modèle l’expose de façon stable | Vérifier absence de doublons historiques sur le critère choisi. |
| **`statut`** | Idem **`type_offre`** | Idem. |

Si aucune clé naturelle n’est utilisable sans ambiguïté pour `TypeOffre` / `Statut`, le plan Lot 1 reste **id-only** pour ces deux ressources et l’onboarding passera par export référentiel + IDs.

### 2.4 Versioning du schéma Excel (compatibilité des fichiers)

- Chaque fichier généré (**template** ou **export**) embarque des **métadonnées de version** (feuille **« Meta »** ou bloc en tête) : au minimum **`schema_version`**, **`resource`** (identifiant ressource), **`generated_at`** (ISO 8601).
- À l’import : si **`schema_version`** **≠** version supportée par le code → réponse **`template version mismatch`** avec message clair (*« Ce fichier a été produit avec une version obsolète du modèle, téléchargez le modèle à jour. »*).
- Toute évolution de colonnes **incrémente** la version ; le changelog est tracé (doc ou commentaire dans le dépôt).

#### 2.4.1 Valeurs canoniques du champ `resource` (Meta)

Une seule énumération pour tout le projet — **snake_case**, stable dans le temps. Aucun endpoint ne doit inventer un autre identifiant.

| Valeur `resource` | Ressource métier |
|-------------------|------------------|
| `centre` | Centres |
| `type_offre` | Types d’offre |
| `statut` | Statuts |
| `partenaire` | Partenaires |
| `formation` | Formations |
| `document` | Documents (métadonnées) |
| `candidat` | Candidats |
| `cvtheque` | CVThèque |

Évolution : nouvelle ressource = **nouvelle valeur** documentée + version de schéma.

### 2.5 Convention ForeignKey et M2M

| Convention | Rôle |
|------------|------|
| **Source de vérité à l’import** | Colonnes **`…_id`** (entiers) pour les FK — aligné avec les serializers de création actuels (ex. `centre_id`, `formation_id`). |
| **Libellés** | Colonnes type **`centre_nom`** ou **`centre_label`** : **export** possible pour **lecture humaine** ; soit **ignorées à l’import**, soit **read-only** (non utilisées pour résoudre la FK) pour éviter ambiguïtés (homonymes, historique multi-lignes sur `TypeOffre` / `Statut`). |
| **Ambiguïté** | Si le métier exige un import « par nom » un jour → règle explicite **par ressource** + contrainte d’unicité garantie en base ; sinon refus. |
| **M2M** | Convention dédiée par ressource (colonnes séparées, IDs multiples, ou feuille annexe) — documentée dans le schéma ; pas de magie implicite. |

#### 2.5.1 Conventions de colonnes (à figer au Lot 0)

| Règle | Convention |
|-------|------------|
| Nommage | **`snake_case`** pour tous les en-têtes de colonnes. |
| Clé primaire | Colonne **`id`** (entier). |
| FK | Suffixe **`_id`** (ex. `centre_id`, `formation_id`). |
| M2M | Colonne **`…_ids`** avec liste d’entiers séparés par **virgule** (ex. `1,2,3`) ou **`;`** selon ce qui est documenté dans le schéma — **une seule** convention pour tout le projet. |
| Dates | **ISO 8601** date : **`YYYY-MM-DD`** (heure si besoin : format ISO complet documenté par ressource). |
| Booléens | `true` / `false` ou `1` / `0` — **une** convention figée. |

#### 2.5.2 Colonnes inconnues à l’import

Si le fichier contient des **colonnes en trop** par rapport au schéma attendu pour la ressource :

| Option | Comportement | Usage |
|--------|----------------|-------|
| **A — Tolérant** | Les colonnes **non reconnues** sont **ignorées** ; seules les colonnes du schéma sont lues. | Import depuis exports tiers ou fichiers « bruités ». |
| **B — Strict** (**recommandé** pour la symétrie template ↔ export) | Présence de **toute colonne** hors schéma → **échec du fichier** (avant ou au début du traitement lignes) avec code d’erreur **`unknown_columns`** ou équivalent (cf. §2.8.2). | Force l’usage du **template à jour** et évite les ambiguïtés (colonnes obsolètes, fautes de frappe d’en-tête). |

**Décision figée pour ce projet :** **mode strict (B)** par défaut sur les imports métier symétriques, sauf exception documentée par ressource (ex. pipeline de migration one-shot).

**Quand appliquer le contrôle :** en mode strict, la vérification **`unknown_columns`** (ensemble des en-têtes vs schéma attendu) **s’exécute immédiatement après** la lecture de la **ligne d’en-têtes** de la feuille **Données**, **avant** toute validation ou parsing des **lignes de données**. Cela évite un travail inutile et échoue tôt avec un message clair.

#### 2.5.3 Champs système et non importables

Les champs **non modifiables** via l’API d’écriture habituelle ne doivent **pas** être pilotés par un fichier Excel « métier » sans règle explicite :

| Catégorie | Exemples | Règle |
|-----------|----------|--------|
| **Horodatage / audit auto** | `created_at`, `updated_at` | **Non importables** — gérés par le framework ; **exclus** des colonnes du schéma d’import ou **ignorés** si présents par erreur (en mode strict, leur seule présence peut être refusée si on les liste explicitement comme interdits). |
| **Utilisateur système** | `created_by`, `updated_by` | **Non importables** en général — renseignés par le **request.user** à l’import (comme le REST). |
| **Identité technique** | `id` | **Importable** pour **upsert** (mise à jour) ; création sans `id` selon §2.3. |

La liste exacte par ressource relève du **`ResourceSchema`** (ou équivalent) : champs **exportés** pour lecture / round-trip, champs **acceptés en entrée** à l’import, champs **interdits** explicitement.

### 2.6 Transactions : fichier entier, chunk ou ligne

Le mode **`transaction.atomic`** global sur tout le fichier n’est pas adapté à tous les cas : une seule ligne en erreur ne doit pas nécessairement **invalider tout le fichier** pour les gros imports.

| Mode | Usage recommandé | Comportement |
|------|------------------|--------------|
| **`atomic=file`** | Lots **1–2** (référentiels, partenaires), petits volumes | Tout réussit ou tout est annulé (cohérence forte). |
| **`atomic=chunk`** | Lots **3+** (formations, candidats, …), ex. paquets de **N** lignes (ex. 100–200) | Commit par chunk ; rapport **lignes OK / KO** par chunk. |
| **`atomic=row`** (ou pas d’atomic englobant) | Volumes très gros, besoin de partial success | Chaque ligne dans sa propre transaction ; toujours un **résumé** global. |

Le mode est **défini par ressource / endpoint** et documenté ; l’API retourne toujours un **résumé** (créés, mis à jour, échoués) + **détail des erreurs** par ligne.

#### Décision figée — Lots 1 et 2 (référentiels, partenaires)

Pour **aligner** le plan avec §2.6 (petits volumes, cohérence forte) :

| Choix | Description |
|-------|-------------|
| **Cible** | **`atomic=file`** pour les imports **Lots 1–4** persistés (**Document** / **CVThèque** : pas d’import métier) : une seule transaction englobant **tout le fichier** — en cas d’erreur sur une ligne, **rollback** de l’ensemble (aucune ligne partiellement persistée). |
| **État actuel du dépôt** | **`atomic=file`** pour **`handlers_lot1.py`** et **`handlers_lot2.py`** (`PartenaireExcelHandler`) — même règle : aucune persistance si au moins une ligne en erreur avant commit. |

Si le métier exige un jour du **succès partiel** sur référentiels, ce sera une **exception** documentée (retour à une stratégie par ligne ou par chunk) avec justification produit.

### 2.7 Sécurité et robustesse (au-delé de la taille max)

Un `.xlsx` est un **ZIP** : la **taille du fichier** ne borne pas toujours la **mémoire** après décompression (zip bomb).

| Garde-fou | Description |
|-----------|-------------|
| **Ratio / profondeur ZIP** | Vérifier le ratio taille décompressée / taille archive ou le nombre d’entrées internes ; plafond configurable — **rejeter** si dépassement. |
| **Formats dérivés** | Refuser **`.xlsm`** (macros) si non nécessaire ; `.xlsx` uniquement en V1. |
| **Formules / liens** | Politique produit : **valeurs uniquement** à l’import (pas d’exécution de formules côté serveur pour interprétation métier) ; optionnellement refuser les classeurs avec formules dans les cellules données si risque — à trancher. |
| **Temps / CPU** | Timeout ou garde-fou sur la durée de parsing pour fichiers pathologiques. |

Ces contrôles complètent la validation de base (§2.12 : extension, taille, `openpyxl`).

### 2.8 Observabilité et traçabilité

| Élément | Description |
|---------|-------------|
| **Journal minimal** | Qui a importé, quand, quelle **ressource**, fichier (hash ou nom), **dry_run** ou non, **nombre de lignes** traitées, **créations / mises à jour / échecs**. |
| **Persistance** | **Lots 0–2 :** aucun champ ajouté aux **modèles métier** ; traçabilité **optionnelle** via une **table technique séparée** (`ImportJob` ou équivalent), **pas** sur les entités `Centre` / `Partenaire` / etc. **Lot 3+** : `ImportJob` (ou équivalent) **recommandé** pour gros volumes et audit ; sinon logs structurés. |
| **Rapport d’erreurs** | Réponse API incluant la liste des erreurs **par ligne** ; option : **fichier `.xlsx` ou CSV** d’erreurs téléchargeable (lien ou payload) pour correction utilisateur. |
| **Lien avec l’existant** | Le modèle **`LogUtilisateur`** expose déjà une action **`ACTION_IMPORT`** — exploitable pour une **trace applicative** complémentaire (sans importer des logs comme données métier). |

### 2.8.1 Réponse JSON d’import — contrat unique (à figer au Lot 0)

Tous les endpoints `POST …/import-xlsx/` renvoient la **même forme** (champs optionnels marqués). Évite que chaque ressource invente un JSON différent.

```json
{
  "dry_run": false,
  "resource": "centre",
  "schema_version": 1,
  "summary": {
    "created": 0,
    "updated": 0,
    "skipped": 0,
    "failed": 0
  },
  "rows": [
    {
      "row_number": 2,
      "id": null,
      "action": "create",
      "errors": []
    },
    {
      "row_number": 5,
      "id": 42,
      "action": "update",
      "errors": [{ "field": "centre_id", "code": "invalid", "message": "…" }]
    }
  ],
  "report_url": null
}
```

| Champ | Rôle |
|-------|------|
| **`summary`** | Compteurs globaux **created**, **updated**, **skipped**, **failed**. |
| **`rows`** | Une entrée par **ligne de données** traitée ; **`row_number`** = numéro de ligne dans la feuille (1-based, aligné Excel). **`action`** : `create` \| `update` \| `skip` \| `error`. **`errors`** : liste de `{ field, code, message }` (vide si succès). |
| **`report_url`** | Optionnel : URL de téléchargement d’un rapport d’erreurs détaillé (généré après import ou async). |

En cas d’échec **avant** traitement des lignes (fichier invalide, version incompatible), utiliser un **enveloppe d’erreur** DRF standard (`400` / `422`) avec message clair, sans casser ce contrat pour les succès partiels.

#### 2.8.2 Taxonomie stable des `code` dans `errors` (et erreurs globales)

Chaque erreur de ligne porte `{ "field", "code", "message" }`. Le champ **`code`** doit utiliser une **liste fermée** connue du frontend (UX, i18n, branchements).

| `code` | Signification typique |
|--------|------------------------|
| **`required`** | Champ obligatoire manquant. |
| **`invalid`** | Valeur invalide (format, contrainte métier, serializer). |
| **`not_found`** | Référence inexistante (ex. `id` inconnu). |
| **`out_of_scope`** | Hors périmètre utilisateur (ex. centre non autorisé). |
| **`conflict`** | Conflit d’unicité ou divergence id / clé naturelle. |
| **`not_supported`** | Opération ou ressource non supportée (ex. import désactivé). |
| **`schema_mismatch`** | `schema_version` ou ressource Meta incompatible avec le backend. |
| **`file_too_large`** | Dépassement de la taille max (§2.12). |
| **`invalid_file`** | Extension, contenu non lisible, fichier corrompu. |
| **`parse_timeout`** | Durée max d’analyse itérative après ouverture du classeur dépassée (§2.7) — **`RAP_IMPORT_MAX_PARSE_SECONDS`**. |
| **`unknown_columns`** | Colonnes hors schéma en **mode strict** (§2.5.2). |

Les codes **historiques** ou spécifiques (ex. `scope_denied` côté implémentation) doivent être **alignés** sur cette taxonomie (`out_of_scope` pour le périmètre) lors des prochains refactors.

#### 2.8.3 Sémantique `dry_run` et compteurs `summary`

Lorsque **`dry_run=true`** :

- **Aucune persistance** en base : pas de `save()` effectif, pas de transaction validée pour l’import réel.
- La réponse conserve la **même forme** que l’import réel : **`rows`**, **`summary`**, **`resource`**, **`schema_version`**.
- Les compteurs **`summary.created`** et **`summary.updated`** représentent ce qui **serait** créé ou mis à jour (**simulation**). Documenter clairement côté API / OpenAPI : *« en `dry_run`, les compteurs reflètent un résultat simulé, pas des lignes effectivement écrites »*.
- Alternative possible (évolution) : champs distincts **`would_create`** / **`would_update`** dans `summary` — **non obligatoire** si la convention ci-dessus est affichée dans la doc client ; à trancher pour éviter toute ambiguïté UX.

Les actions dans **`rows[].action`** restent **`create`**, **`update`**, **`error`**, etc., avec la même sémantique « prévue ».

### 2.9 Scoping multi-centre (règles à figer avant implémentation)

L’API utilise **`ScopedModelViewSet`** (`rap_app/api/viewsets/scoped_viewset.py`) avec `scope_mode = "centre"` et `centre_lookup_paths` / `staff_centre_ids` selon les ressources. Les **mêmes règles** s’appliquent à l’import :

| Question | À décider par ressource (documenter la réponse) |
|----------|-----------------------------------------------|
| **Lecture** | L’utilisateur ne voit que les lignes dont le **centre** (direct ou via `formation__centre`, etc.) est dans son périmètre — identique à `GET`. |
| **Écriture** | Peut-on **créer** une ligne avec un `centre_id` / `formation_id` **hors** périmètre ? → en général **non** ; **403** ou erreur ligne. |
| **Mise à jour** | Si **`id`** existe en base mais **hors scope** pour cet utilisateur → **erreur** (pas de modification détournée). |
| **Admin-like** | Utilisateurs **admin-like** : périmètre élargi ou illimité — aligné sur `is_admin_like` / queryset existant. |

Sans ces règles écrites, risque de **failles** ou d’**incohérence** avec les listes API.

#### 2.9.1 Source de vérité du scope (règle mécanique)

Sans mécanisme explicite, **« réutiliser `get_queryset()` »** reste ambigu. **Décision :**

- Introduire une **fonction centralisée** (ex. `get_scoped_queryset(resource, user, request)` ou équivalent) dans **`rap_app/api/import_export/scope.py`** ou **`rap_app/services/imports/scope.py`**, qui encapsule **exactement** la même logique que le ViewSet métier (ou délègue à une fonction extraite du ViewSet existant **sans** dupliquer les règles).
- **Export** : le queryset de `GET …/export-xlsx/` est **obligatoirement** celui retourné par cette fonction (même filtrage que `GET …/list/` pour le même utilisateur et paramètres pertinents).
- **Import** : chaque ligne (par `id` ou FK) est validée contre ce **même** périmètre ; toute ligne **hors scope** → erreur **`out_of_scope`** (§2.8.2), **jamais** plus permissif que le REST.

**Tests obligatoires** : au minimum un test de **parité** — pour un **utilisateur** et une **ressource** donnés, **nombre d’objets** (ou équivalence de queryset) **aligné** entre `GET …/list/` (ou `get_queryset`) et `GET …/export-xlsx/` — et des cas **ciblés** d’`id` hors périmètre à l’import.

### 2.10 Documents (`Document`) et CVThèque (`CVTheque`) — binaires

Les modèles utilisent des **`FileField`** avec validateurs (cf. `rap_app/models/documents.py`, `cvtheque.py`).

| Décision (reco pour V1) | Détail |
|-------------------------|--------|
| **Export Excel** | **Métadonnées** : `id`, liens FK, `titre`, type, dates, chemins ou URLs signées si applicable — **pas** le fichier encodé en base64 dans la feuille principale sauf décision contraire. |
| **Import Excel** | **Désactivé** ou **refus explicite** tant qu’il n’existe pas de stratégie d’**upload fichier** alignée (créer une ligne sans fichier = **incohérent** avec le reste de l’app). Message API clair : *« Import métadonnées non disponible pour cette ressource ; utilisez l’API fichiers. »* |
| **Évolution** | Réactivation possible avec pipeline **multipart** séparé ou ZIP manifest — hors scope Lot 3 initial. |

#### 2.10.1 Politique d’endpoint V1 (Document / CVThèque)

Décision **à figer au Lot 0** pour éviter la confusion côté client :

| Option | Description |
|--------|-------------|
| **A (recommandée)** | **Ne pas exposer** `POST …/import-xlsx/` — ni `import-template` si inutile — pour **`Document`** et **`CVTheque`** tant que l’import métier n’est pas supporté. Seuls **export** (`GET .../export-xlsx/` ou équivalent) et **API fichiers** REST. |
| **B** | Exposer `POST …/import-xlsx/` mais répondre **`400`** ou **`403`** avec un **code d’erreur stable** (ex. `import_not_supported`) et message explicite — jamais un `200` vide. |

**Éviter** un endpoint qui accepte le fichier puis échoue silencieusement.

### 2.11 Feuille Excel : ligne d’en-tête et zone données

| Règle | Décision |
|-------|----------|
| **Ligne d’en-tête** | **Ligne 1** de la feuille des données (cf. §2.11.1) = **noms de colonnes** (`snake_case`), conformes au schéma. |
| **Ligne 2+** | **Données** ; première ligne de données = **ligne 2** (le parseur utilise `row_number` = 2 pour la première ligne utile). |
| **Instructions** | Pas de lignes libres **au-dessus** des en-têtes sur la feuille données : la doc courte vit dans les feuilles **Meta** et **Aide** (§2.11.1). Si exception : documenter **N** lignes à sauter avant l’en-tête (à éviter en V1). |

#### 2.11.1 Noms de feuilles (constantes projet)

Pour éviter que **chaque endpoint** ou module n’invente des titres différents (« Data », `Feuil1`, etc.), **figer des constantes** partagées (ex. dans `schemas.py` ou `excel_io.py`) :

| Constante (exemple code) | Nom affiché dans le classeur (.xlsx) | Rôle |
|--------------------------|--------------------------------------|------|
| **`SHEET_DATA`** (ou `DATA`) | **`Données`** | Feuille principale : en-têtes ligne 1, données lignes 2+. **Seule** feuille obligatoire pour le parseur métier. |
| **`SHEET_META`** (ou `META`) | **`Meta`** | Métadonnées : `schema_version`, `resource`, `generated_at`, etc. (§2.4). |
| **`SHEET_AIDE`** (ou `AIDE`) | **`Aide`** | Instructions, tableaux d’aide FK (§2.1) — **recommandée** sur template ; peut être absente sur un export minimal. |

**Règle :** tout **template** ou **export** produit par l’application doit utiliser **exactement** ces noms de feuilles (pas de variante libre). Les imports **rejettent** un fichier qui n’expose pas la feuille **`Données`** sous le nom attendu (ou documentent un alias unique si exception ponctuelle).

#### 2.11.2 Feuille « Aide » — V1 Lot 1 (référentiels)

Pour le **Lot 1**, les référentiels ont **peu ou pas** de FK à documenter dans un gros tableau : la feuille **« Aide »** sert surtout de **documentation** dans le classeur :

- bloc **instructions** (comment remplir, conventions `snake_case`, `dry_run`, lien vers doc API) ;
- éventuellement un **rappel** des **codes d’erreur** courants (§2.8.2) ;
- **pas** d’obligation de **grosses tables** « ID ↔ libellé » en Lot 1 ; celles-ci deviennent pertinentes quand les lots suivants exposent des **FK** dans le fichier.

**Implémentation V1 :** texte statique dans **`excel_io`** (`AIDE_V1_LINES`) ; généré avec **`write_lot1_workbook`** lorsque `include_aide_sheet=True` (export et modèles).

### 2.12 Validation des fichiers uploadés (import)

Toute entrée `POST …/import-xlsx/` doit appliquer une **validation en couches** (à centraliser dans l’infra générique, ex. `validate_uploaded_xlsx` dans **`validation.py`** ; orchestration éventuelle dans **`base.py`** si introduit — §2.13).

**Ordre recommandé** (du moins coûteux au plus coûteux) : **extension** → **taille** → **MIME** (optionnel) → **ouverture / parsing** (`openpyxl`).

| Couche | Rôle | Limite connue |
|--------|------|----------------|
| **Extension** | Refuser tout fichier dont le nom ne se termine pas par **`.xlsx`** (rejette `.xls`, `.csv`, renommages évidents). | L’extension **ne prouve pas** le contenu ; message utilisateur du type : *« Seuls les fichiers Excel au format .xlsx (Excel 2007+) sont acceptés. »* — éviter de promettre une « intégrité absolue » au seul titre de l’extension. |
| **Taille max** (**requis**) | Comparer `uploaded_file.size` (ou lecture par chunks si le backend ne fournit pas la taille) à un **plafond** défini en settings. Rejet avec message explicite (*« Fichier trop volumineux (max. X Mo). »*). | Protège la **mémoire** et le **temps CPU** avant `load_workbook` ; évite les abus. La valeur exacte (ex. 5 à 20 Mo selon volumétrie métier) est un **choix produit** à figer dans les settings et la doc déploiement. |
| **Type MIME** (optionnel) | Vérifier `content_type` attendu (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) si présent. | Les clients peuvent envoyer un MIME incorrect ; traiter comme **indice**, pas comme preuve. |
| **Ouverture réelle** | **`openpyxl.load_workbook`** (ou lecture des premiers octets : signature ZIP / OOXML) : si échec → erreur métier claire (« fichier corrompu ou non compatible »). | **Validation finale** du format binaire. |

**Pattern attendu (conceptuel) :** `validate_file_extension` puis **`validate_file_size`** (ou équivalent unique `validate_uploaded_xlsx` qui enchaîne tout) ; lever `ValidationError` tôt pour éviter tout traitement inutile. Les contrôles §2.7 (ZIP / zip bomb) s’appliquent après la taille max et avant ou pendant l’ouverture complète.

### 2.13 Fichiers attendus à terme (structure cible)

#### Découpage `base.py` vs `excel_io.py` (éviter le refactor sans fin)

**Règle figée :**

| Fichier | Rôle |
|---------|------|
| **`excel_io.py`** | **I/O Excel** : lecture/écriture classeur, feuilles **Meta** / **Données** / **Aide**, en-têtes, conversion cellules — **déjà** la « base » technique du dépôt. |
| **`handlers_*.py`** | **Logique métier** par ressource (upsert, appel serializers). |
| **`base.py`** (optionnel, Lot 0) | **Orchestration** uniquement si utile : factoriser « template → import → payload §2.8.1 » sans dupliquer `excel_io`. **Pas** de renommage obligatoire de `excel_io` en `base` ; **pas** de grosse extraction avant besoin réel. |

**En résumé :** on **garde** `excel_io.py` comme couche I/O ; `base.py` n’est **introduit** que si une orchestration transversale claire s’impose (sinon **handlers + excel_io** suffisent).

**État actuel du dépôt** (cohérent avec **§ Avancement**, Lots 1–4 — 2026-04-06) :

```
rap_app/services/imports/
  __init__.py
  validation.py           # extension .xlsx, taille max (§2.12), ratio ZIP §2.7
  schemas.py              # colonnes Lots 1–3, RESOURCE_*, codes erreur §2.8.2
  import_job_recorder.py  # persistance optionnelle ImportJob (§2.14)
  excel_io.py             # Meta, Données, Aide V1 ; lecture/écriture ; en-têtes stricts §2.5.2 ; plafond durée lecture (parse_timeout)
  handlers_lot1.py        # Centre, TypeOffre, Statut ; atomic=file §2.6
  handlers_lot2.py        # PartenaireExcelHandler ; atomic=file §2.6
  handlers_lot3.py        # FormationExcelHandler, DocumentExcelHandler
  handlers_lot4.py        # CandidatExcelHandler, CVThequeExcelHandler
rap_app/api/
  import_export/
    __init__.py
    views.py              # Lot1ImportExportViewSet — GET/POST ; logs ; ImportJob sur import-xlsx ; tag OpenAPI Import-export Excel
    import_job_views.py   # ImportJobViewSet — GET jobs/ (liste) et jobs/<id>/ (détail) ; même tag OpenAPI
    serializers.py        # ImportJobSerializer (lecture seule)
    urls.py
    scope.py              # §2.9.1 — référentiels, Partenaire, Formation, Document, Candidat, CVThèque
```

**Structure cible long terme** (plan initial — peut fusionner ou scinder selon lots suivants) :

```
rap_app/services/imports/
  __init__.py
  base.py                 # (optionnel) get_import_template, export_to_excel, import_from_excel, helpers communs
  validation.py           # extension, taille, zip/ratio, openpyxl, règles §2.7
  schemas.py              # ResourceSchema, schema_version par ressource
  jobs.py                 # (optionnel dès Lot 3) ImportJob ou orchestration traçabilité
  centre.py
  type_offre.py
  statut.py
  partenaire.py
  formation.py
  ...                     # un module par lot / ressource selon découpage
```

### 2.14 Modèles Django : Lots 0 à 2 sans impact sur les champs métier

**Règle figée :** les **Lots 0 à 4** **n’ajoutent ni ne modifient aucun champ** sur les **modèles métier existants** (`Centre`, `TypeOffre`, `Statut`, `Partenaire`, `Formation`, `Document`, `Candidat`, `CVTheque`, etc.). L’import/export s’appuie sur les **schémas et tables actuels** ; la couche Excel vit dans les **services**, les **actions DRF** et la **configuration** (`settings`), pas dans des migrations qui altéreraient les entités métier.

**Traçabilité persistée :** **implémentée** — modèle **`ImportJob`** (`rap_app/models/import_job.py`, migration **`0053_importjob`**) : une ligne par tentative **POST** **`/api/import-export/<resource>/import-xlsx/`** (statut **success** / **error**, **`dry_run`**, **`summary`** ou **`error_payload`**, utilisateur, nom de fichier). Désactivation : **`RAP_IMPORT_PERSIST_JOBS=False`**. **Admin** : consultation (**`import_job_admin`**, pas d’ajout / édition). **Non** appliqué aux modèles métier (pas de `last_import_at` sur `Centre`, etc.).

Le flux métier s’appuie sur :

- les **modèles existants** (lecture / écriture via ORM et serializers comme le REST) ;
- les **modules** `rap_app/services/imports/` (validation, schémas, handlers) ;
- les **métadonnées** fichier (feuille « Meta » : `schema_version`, `resource`, etc.).

**Aucune migration** sur les **tables métier** pour les Lots 0–4. La table **`ImportJob`** est une **migration technique dédiée** (**`0053_importjob`**) — **sans** modifier les entités domaine.

### 2.15 Module API dédié `import_export` — décision validée

**Objectif priorité produit :** ne **pas modifier** les ViewSets et serializers **CRUD existants** (réduction des risques de régression sur l’API métier).

**Implémentation cible :** un package **`rap_app/api/import_export/`** (ViewSets et/ou router dédiés) qui expose **uniquement** les opérations d’import/export Excel, en **réutilisant** la couche **`rap_app/services/imports/`** (validation fichier, schémas, handlers).

#### Préfixe URL (ne pas impacter les routes CRUD existantes)

Toutes les routes import/export Excel du module dédié partagent le préfixe :

| Méthode | Chemin (exemple) | Rôle |
|---------|------------------|------|
| `GET` | `/api/import-export/<resource>/import-template/` | Modèle vide + Meta (§2.4) |
| `GET` | `/api/import-export/<resource>/export-xlsx/` | Export ré-importable (queryset **scopé**) |
| `POST` | `/api/import-export/<resource>/import-xlsx/` | Import multipart (`file`) ; `?dry_run=` (§2.8.3) |

`<resource>` est l’identifiant **canonique** aligné sur §2.4.1 (`centre`, `type_offre`, `statut`, `partenaire`, …). Les routes **`/api/centres/`**, **`/api/typeoffres/`**, etc. **restent inchangées** (pas d’`@action` import ajoutée sur ces ViewSets en cible).

**Documentation** : traiter **`import-export`** comme un **module API séparé** (tags OpenAPI dédiés, guide client).

#### Contraintes non négociables

1. **Serializers** : l’import **réutilise les serializers d’écriture existants** (`CentreSerializer`, etc.) pour valider et persister — **pas** de duplication des règles métier ; pas de serializers « import only » en V1 sauf **wrappers** autour des existants (§2.5.3).
2. **Scope / permissions** : l’import/export applique **exactement** le même **queryset**, **scope** et **permissions** que les ViewSets métier correspondants — **jamais** plus permissif. Mécanisme **obligatoire** : **§2.9.1** (`get_scoped_queryset` ou équivalent).
3. **Contrats Lot 0** : **`resource`** canonique, **`schema_version`**, conventions de colonnes (§2.5.1), **réponse JSON unique** §2.8.1, **validation fichier** §2.12 (extension, taille, ouverture `openpyxl`, etc.).

#### Variante écartée comme cible (référence)

Les **`@action`** import/export sur les ViewSets CRUD (ancien mixin `ExcelLot1Mixin`) — **non retenues** comme architecture **finale**. **État actuel (Lot 1) :** mixin **retiré** ; seule la surface **`/api/import-export/…`** est exposée pour l’Excel référentiels.

#### Historique — transition mixin (terminée)

| Phase | Action |
|-------|--------|
| **Transition** | URLs canoniques documentées ; OpenAPI **`deprecated=True`** sur les actions mixin ; frontend basculé sur **`/api/import-export/…`**. |
| **Observabilité** | **`logging.warning`** sur chaque appel mixin (jusqu’au retrait). |
| **Retrait** | Mixin et fichiers **`excel_lot1_mixin.py`** supprimés ; tests et app **uniquement** sur **`import-export`** (**§ Avancement — Lot 1**). |

**Décision produit** : annoncer dans les **notes de version** que **`/api/centres/…/import-xlsx/`** (et équivalents statuts / types d’offre) **ne sont plus disponibles** — utiliser **`/api/import-export/<resource>/…`**.

---

## Mission 3 — Plan de déploiement par lots (Lots **0** à **4**)

**Périmètre import/export Excel :** référentiels, partenaires, formations, documents (métadonnées), candidats, CVThèque (§2.10). Tout le reste est répertorié en **§1.5**.

### Lot 0 — Fondations techniques et contrats (préalable au Lot 1)

**Objectif :** figer les **décisions d’architecture** qui évitent de casser l’API ou les contrats aux **lots 3–4**. Peu de code métier, beaucoup de **clarté**.

**Avancement :** **Lot 0 clos** — détail dans le tableau **§ Avancement — Lot 0** (implémentation partagée avec `handlers_lot1` / `excel_io` pour les référentiels).

| Livrable | Référence |
|----------|-----------|
| **Identifiants `resource`** canoniques (Meta) | §2.4.1 |
| **Réponse JSON** d’import (contrat unique) | §2.8.1 |
| **Conventions de colonnes** (snake_case, `*_id`, M2M, dates) | §2.5.1 |
| **Clés naturelles Lot 1** (au minimum `centre` ; `type_offre` / `statut` si unicité OK) | §2.3.1 |
| **Feuille données** : en-tête ligne 1, données ligne 2+ | §2.11 |
| **`Document` / `CVTheque`** : politique d’endpoint V1 (ne pas exposer `POST` import ou `400` stable) | §2.10.1 |
| Conventions **FK / libellés** (read-only) | §2.5 |
| **`schema_version`** template + export + contrôle à l’import | §2.4 |
| **`ImportJob`** + logs structurés (traçabilité) | §2.8, §2.14 — **Fait** : **`ImportJob`** **et** logs **`application.api.import_export`** / **`import_export.log`** |
| **Politique transactionnelle** par type de ressource (file / chunk / row) | §2.6 |
| **Règles de scoping centre** rédigées et testables | §2.9 |
| **Source de vérité scope** (`get_scoped_queryset`, tests parité) | §2.9.1 |
| **Transactions** Lots 1–4 (`atomic=file` cible pour imports persistés) | §2.6 |
| **Upsert** : règles `id` + clés naturelles | §2.3 |
| Garde-fous **§2.7** + chaîne **§2.12** intégrés à `validation.py` | §2.7, §2.12 |
| **Découpage** `excel_io` / `handlers` / `base.py` optionnel | §2.13 |

Une fois le Lot 0 validé, le **Lot 1** reste **mécanique** (référentiels).

---

### Lot 1 — Référentiels et socle (faible dépendance)

Chaque lot métier suppose que les **contrats du Lot 0** sont en place (services `imports/`, **`excel_io`**, handlers, **§2.13** pour `base.py` optionnel).

**Avancement :** **Lot 1 référentiels — Fait** : services + handlers, **`import_export/`**, **Aide** V1, **frontend** `lot1ImportExport` / `Lot1ExcelActions`, **retrait du mixin** (plus de duplication CRUD).

| Modèles | Fichiers service (cible) | Exposition API import/export (cible §2.15) |
|---------|---------------------------|---------------------------------------------|
| `Centre`, `TypeOffre`, `Statut` | `handlers_lot1.py` (ou scission future par ressource si besoin) | **`rap_app/api/import_export/`** — seules routes `/api/import-export/<resource>/import-template/` \| `export-xlsx` \| `import-xlsx` ; ViewSets CRUD **sans** actions Excel |

**Implémentation dans le dépôt :** **`handlers_lot1.py`** + **`rap_app/api/import_export/`** ; ViewSets **`Centre`**, **`Statut`**, **`TypeOffre`** : CRUD **uniquement**.

**Objectif :** valider la chaîne **template → export → import → upsert** sur des tables simples, avec feuille « Aide » **V1** surtout **doc** (§2.11.2), et la **pipeline de validation fichier** (extension `.xlsx`, taille, ouverture `openpyxl`).

**Modèles :** pas de modification obligatoire des modèles ni migration pour ce lot — uniquement services, **ViewSets dédiés import-export**, réglages (cf. **§2.14**).

---

### Lot 2 — Partenaires (FK vers Lot 1)

| Modèles | Fichiers service | Exposition API (cible §2.15) |
|---------|------------------|------------------------------|
| `Partenaire` | **`handlers_lot2.py`** (`PartenaireExcelHandler`) | **`/api/import-export/partenaire/…`** — **sans** actions Excel sur `PartenaireViewSet` CRUD |

**Objectif :** FK optionnelle **`default_centre`** / colonne **`default_centre_id`** ; upsert par **`id`** ou **`nom`** (unique) ; périmètre centre pour le staff non admin.

**Modèles :** aucun changement de schéma métier (**§2.14**).

---

### Lot 3 — Formation et documents (métadonnées)

| Modèles | Fichiers service | Exposition API import/export (cible §2.15) |
|---------|------------------|-------------------------------------------|
| `Formation` | **`handlers_lot3.py`** (`FormationExcelHandler`) | **`/api/import-export/formation/…`** — **sans** modifier `FormationViewSet` CRUD. L’export **`GET /formations/export-xlsx/`** (mise en forme « rapport ») **coexiste**. |
| `Document` | **`handlers_lot3.py`** (`DocumentExcelHandler`) | **`/api/import-export/document/…`** — template + export métadonnées ; **`POST import-xlsx`** → **400** + **`not_supported`** (§2.10.1 option B) — **sans** modifier `DocumentViewSet` CRUD. |

**Avancement :** **Lot 3 livré** — détail tableau **§ Avancement — Lot 3**.

**Objectif :** **`Formation`** comme cœur métier (scope centre, M2M partenaires, etc.). **`Evenement`**, **`Commentaire`**, **`Rapport`** sont **hors périmètre** (§1.5.H). Pour **`Document`** : **§2.10** (export métadonnées) et **§2.10.1** (refus import stable).

---

### Lot 4 — Candidats et CVThèque

| Modèles | Fichiers service | Exposition API import/export (cible §2.15) |
|---------|------------------|-------------------------------------------|
| `Candidat` | **`handlers_lot4.py`** (`CandidatExcelHandler`) | **`/api/import-export/candidat/…`** — **sans** modifier `CandidatViewSet` CRUD |
| `CVTheque` | **`handlers_lot4.py`** (`CVThequeExcelHandler`) | **`/api/import-export/cvtheque/…`** — template + export ; **`POST import-xlsx`** → **`not_supported`** (§2.10.1) — **sans** modifier `CVThequeViewSet` CRUD |

**Avancement :** **Lot 4 livré** — détail tableau **§ Avancement — Lot 4**.

**Objectif :** volumétrie et règles métier candidats (validation **`CandidatCreateUpdateSerializer`**) ; **`CVTheque`** : **§2.10** + **§2.10.1**. **`AtelierTRE`** / **`AtelierTREPresence`** : **§1.5.H**.

---

*Les exclusions détaillées sont en §**1.5** (CERFA, stats, historiques, VAE, modules métier, etc.) ; elles ne font **pas** l’objet de lots d’import/export dans ce document.*

---

## Synthèse des actions API — module `import-export` (§2.15)

Pour chaque **`<resource>`** retenu (cf. §2.4.1), les endpoints **dédiés** sous **`/api/import-export/`** sont :

- `GET /api/import-export/<resource>/import-template/` — modèle vide + Meta (`schema_version`, `resource`, …) — §2.4  
- `GET /api/import-export/<resource>/export-xlsx/` — export ré-importable (queryset **scopé** comme le REST métier) — §2.4  
- `POST /api/import-export/<resource>/import-xlsx/` — import ; `?dry_run=` — validation fichier §2.12, réponse **§2.8.1**

**Traces d’import (§2.14), hors slug `<resource>` :**

- `GET /api/import-export/jobs/` — liste paginée des **`ImportJob`** ; filtres optionnels **`resource`**, **`status`**, **`dry_run`**  
- `GET /api/import-export/jobs/<id>/` — détail d’une trace (**404** si hors périmètre utilisateur)  
- `GET /api/import-export/jobs/export-csv/` · **`export-xlsx/`** · **`export-pdf/`** — exports des traces filtrées (même scope que la liste ; **PDF** = tableau synthétique)

Les **ViewSets CRUD** existants (`/api/centres/`, etc.) **ne sont pas** étendus avec ces actions en **cible architecture** (voir §2.15).

**Note :** d’autres exports Excel **historiques** (ex. formations, appairages) peuvent coexister sur d’autres chemins ; l’alignement **Meta** + **resource** §2.4 est **recommandé** lors des refactors.

Les ViewSets **stats** (`*-stats`) ne sont **pas** concernés (cf. **§1.5.F**).

---

## Prochaine étape

1. **Tenir à jour** la section **§ Avancement** à chaque livraison.  
2. **Lot 0** : **clos** — non-régression : tests `rap_app.tests.tests_services.test_imports_lot1`.  
3. **Lot 1** : **référentiels — clos** (Excel **uniquement** sous `/api/import-export/…`). **Breaking change** pour tout client encore sur `/api/centres/…/import-xlsx/` (etc.) : documenter en release notes.  
4. **Lot 2** : **clos** — non-régression : `rap_app.tests.tests_services.test_imports_lot2_partenaire`.  
5. **Lot 3** : **clos** — `rap_app.tests.tests_services.test_imports_lot3` ; `Formation` + `Document` sous **`handlers_lot3.py`**.  
6. **Lot 4** : **clos** — `rap_app.tests.tests_services.test_imports_lot4` ; **`handlers_lot4.py`** ; UI **`Lot1ExcelActions`** sur **`candidatsPage.tsx`** et **`cvthequePage.tsx`**.  
7. **Non-régression globale import-export (2026-04-06) :**  
   `manage.py test rap_app.tests.tests_services.test_imports_lot1 rap_app.tests.tests_services.test_imports_lot2_partenaire rap_app.tests.tests_services.test_imports_lot3 rap_app.tests.tests_services.test_imports_lot4` ; inclure en complément les filtres liste : **`rap_app.tests.tests_viewsets.tests_documents_viewsets`**, **`rap_app.tests.tests_viewsets.tests_cvtheque_viewset`** ; `frontend_rap_app` : `npx tsc --noEmit` — à relancer après toute évolution TS.  
8. **`base.py`** (§2.13) : seulement si factorisation orchestration utile.  
9. **Lots 1–4 — UI listes complètes :** **`Lot1ExcelActions`** sur **`DocumentsPage.tsx`** et **`cvthequePage.tsx`** — **fait** (2026-04-06).  
10. **Filtre `formation` sur `GET /documents/`** (parité export Meta **`document`**) — **fait** : **`DocumentFilter.formation`**.  
11. **Filtre `candidat` sur `GET /cvtheque/`** (parité export Meta **`cvtheque`**) — **fait** : **`CVThequeFilterSet.candidat`**.  
12. **Logs structurés + tag OpenAPI** sur **`/api/import-export/…`** — **fait** : logger **`application.api.import_export`**, tag **`Import-export Excel`**.  
13. **Configuration `LOGGING`** (fichier **`logs/import_export.log`**, silence sous tests) — **fait** : **`rap_app_project/settings.py`**.  
14. **Rotation applicative** de **`import_export.log`** — **fait** : **`RotatingFileHandler`**, variables **`RAP_IMPORT_LOG_MAX_BYTES`** / **`RAP_IMPORT_LOG_BACKUP_COUNT`** (voir **`.env.example`**). L’**infra** peut toujours ajouter **`logrotate`** en complément si les fichiers tournés doivent quitter le disque applicatif.  
15. **Plafond durée** analyse import (**`RAP_IMPORT_MAX_PARSE_SECONDS`**, code **`parse_timeout`**) — **fait** : **`excel_io.read_lot1_workbook`**.  
16. **Table `ImportJob`** (**§2.14**) — **fait** : trace **POST `import-xlsx`** (succès / erreur, **`dry_run`**, **`summary`** / **`error_payload`**) ; **`RAP_IMPORT_PERSIST_JOBS`** ; tests **`ImportJobPersistenceTests`**.  
17. **API de consultation `ImportJob`** — **fait** : **`GET /api/import-export/jobs/`** + **`GET /api/import-export/jobs/<id>/`** ; **`ImportJobViewSet`** + **`ImportJobSerializer`** ; **`RapAppPagination`** ; **`IsStaffOrAbove`** ; périmètre **admin-like / superuser** = toutes les traces, sinon **uniquement `user=request.user`** ; tests **`ImportJobApiTests`** (`test_imports_lot1`).  
18. **Guide `guide_import_excel_bdd.md`** — **fait** : architecture **§2.15**, arborescence **`services/imports`** + **`api/import_export`**, URLs stables, **`ImportJob`** / **`jobs/`**, distinction export formations historique, §6–8 actualisés ; renvoi explicite à ce plan.  
19. **UI historique imports (`ImportJob`)** — **fait** : **`/import-export/jobs`** ; **`ImportExportJobsPage`** (filtres `resource` / `status` / `dry_run`, pagination, détail `summary` / `error_payload` ; **filtres reflétés dans l’URL**) ; menu **Historique imports Excel** ; **`CoreStaffRoute`**.  
20. **Lien liste → historique** — **fait** : **`Lot1ExcelActions`** — **Historique des imports** (`RouterLink`, icône, query **`resource`**) ; **`ImportExportJobsPage`** lit **`useSearchParams`** pour appliquer **`?resource=`**.  
21. **Toast post-import → historique** — **fait** : `runImport()` affiche un toast cliquable (« voir l’historique ») qui navigue vers le filtre ressource (succès / erreur, staff+).  
22. **Export traces `ImportJob`** — **fait** : API **`jobs/export-csv`** + **`jobs/export-xlsx`** + **`jobs/export-pdf`** (PDF tableau synthétique, WeasyPrint) ; UI **`ImportExportJobsPage`** (boutons CSV/XLSX/PDF) ; tests de scope CSV + PDF dans **`ImportJobApiTests`**.  
23. **Filtres avancés `ImportJob`** — **fait** : `user`, `date_min`, `date_max` (API + OpenAPI + UI + test API admin).  
24. **Presets période + tri UX (`ImportJob`)** — **fait** : UI historique (`7j`, `30j`, `mois courant`) + tri (`-created_at` / `created_at`) branché API.  
25. **Multi-filtres CSV-list (`ImportJob`)** — **fait** : API/UI `resource__in`, `status__in` + test API admin.  
26. **UX multi-select (`ImportJob`)** — **fait** : filtres ressources/statuts en sélecteurs multiples (UI) branchés sur `resource__in` / `status__in`.  
27. **Presets période calendaire (`ImportJob`)** — **fait** : **semaine précédente** (lun–dim) et **mois précédent** (calendrier) sur l’UI historique, en plus de **7j** / **30j** / **mois courant** (§ point 24).  
28. **Autocomplete utilisateur (`ImportJob`)** — **fait** : **`Autocomplete`** + **`useSimpleUsers`** ; **`GET /users/liste-simple/`** expose désormais **`username`** en plus de **`id`** / **`nom`** (rétrocompatible).  
29. **Export PDF traces (`ImportJob`)** — **fait** : **`GET …/jobs/export-pdf/`** ; template **`exports/import_jobs_pdf.html`** ; bouton **Export PDF** ; scope identique aux autres exports.  
30. **Filtres historique ↔ URL (`ImportJob`)** — **fait** : query string alignée sur les paramètres API (liste / exports) ; navigation arrière / liens partageables.  
31. **Suite (optionnelle) :** **`base.py`** si refactor d’orchestration des handlers apporte un gain clair ; **interruption dure** pendant **`load_workbook`** (sous-processus / thread) si volumétrie critique ; **nouvelles ressources** import-export (hors exclusions §1.5) selon priorité métier ; tests E2E ou smoke sur **historique + URL** si besoin CI.

*Historique :* une première implémentation Lot 1 utilisait un **mixin** sur les ViewSets CRUD — **retiré** ; la surface **stable** est **§2.15** (`/api/import-export/…`).

---

*Document généré pour figer l’audit et l’architecture ; toute évolution du schéma métier ou du code devra mettre à jour ce fichier et le **§ Avancement**.*
