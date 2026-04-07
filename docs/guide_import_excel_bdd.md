# Guide : import Excel vers la base (diagnostic et mise en œuvre)

Document de référence pour répondre à la question : *peut-on ajouter une fonction « Importer » pour que des utilisateurs autorisés remplissent la BDD via un fichier Excel, un fichier par modèle, avec remplissage automatique des modèles Django — en gérant correctement les clés étrangères (ex. Formation → centre, type d’offre, statut) ?*

**Stratégie retenue pour couvrir l’ensemble des ressources :** **infrastructure générique** (lecture Excel, rapport d’erreurs, `dry_run`, garde-fous) + **petit module par ressource** (serializer de création, mapping colonnes, règles de scope et permissions) — même esprit qu’**un endpoint + un service par ressource** sur l’API.

**Dernière mise à jour :** 2026-04-06 — alignement sur l’architecture **import/export Excel symétrique** du dépôt : surface HTTP **`/api/import-export/…`** (voir **`docs/REFACTOR_IMPORT_EXPORT_PLAN.md`**, §2.15). Les actions **`import-template`**, **`export-xlsx`**, **`import-xlsx`** ne sont **plus** sur les ViewSets CRUD ; la traçabilité **`ImportJob`** est consultable via **`GET /api/import-export/jobs/`**.

---

## 1. Diagnostic : est-ce possible ?

**Oui.** C’est un pattern classique sur Django / DRF :

- Lecture du fichier : **`openpyxl`** est déjà une dépendance du projet (utilisée pour l’**export** Excel des formations dans `rap_app/api/viewsets/formations_viewsets.py`, action `export-xlsx`).
- Écriture : réutiliser les **serializers** et la **validation** existants (`FormationCreateSerializer`, etc.) ou les modèles avec `full_clean()` / `save(user=…)` comme aujourd’hui pour éviter de dupliquer la logique métier.
- **Un fichier Excel par type de ressource** (ex. un modèle `Formation`, un autre pour `Centre`, etc.) est une bonne règle de gestion : colonnes stables, modèles d’export/import alignés, moins d’erreurs utilisateur.

**Ce qui n’est pas « automatique » sans travail :**

- Django ne devine pas la correspondance colonnes Excel ↔ champs : il faut une **convention** (noms de colonnes figés) ou un **fichier de mapping**.
- Les **clés étrangères** ne sont pas des chaînes magiques : il faut décider si l’Excel porte des **IDs** (recommandé pour fiabilité) ou des **libellés** (nom de centre unique, codes `nom` pour `TypeOffre` / `Statut`) avec résolution en base.

---

## 2. État actuel du code (points utiles)

| Élément | Détail |
|--------|--------|
| **Import/export Excel « Lot 1–4 » (référentiels → CVThèque)** | Module **`rap_app/api/import_export/`** : **`GET/POST /api/import-export/<resource>/…`** avec slugs **`centre`**, **`type_offre`**, **`statut`**, **`partenaire`**, **`formation`**, **`document`**, **`candidat`**, **`cvtheque`**. Classeur **Meta + Données + Aide** ; scope aligné sur **`filter_queryset(get_queryset())`** du ViewSet métier (`scope.py`). Détail : **`REFACTOR_IMPORT_EXPORT_PLAN.md`**. |
| Export formations (rapport métier) | `FormationViewSet.export_xlsx` — format **historique** « rapport », distinct de l’export **ré-importable** sous **`/api/import-export/formation/export-xlsx/`** (feuille Meta §2.4). Les deux peuvent coexister. |
| Création formation | `FormationCreateSerializer` : `centre_id`, `type_offre_id`, `statut_id` obligatoires (`PrimaryKeyRelatedField` vers `Centre`, `TypeOffre`, `Statut`). |
| Droits d’écriture | `_assert_can_write_formations` : seuls les rôles couverts par `can_write_formations` (admin-like et **staff** standard) ; **commercial** et **chargé recrutement** : lecture seule sur les formations. |
| Périmètre centre | `ScopedModelViewSet` (`rap_app/api/viewsets/scoped_viewset.py`) avec `scope_mode = "centre"` : les imports doivent **respecter le même filtrage** que la création manuelle (ne pas créer une formation sur un centre hors périmètre pour un staff limité). |
| Modèles de référence | `Centre` : `nom` **unique**. `TypeOffre` et `Statut` : champ `nom` avec choix prédéfinis ; en base il peut exister **plusieurs lignes** avec le même code métier selon l’historique — pour l’import, les **IDs** sont plus sûrs que le seul libellé. |
| Précédent « bulk » | `rap_app/services/candidate_bulk_service.py` : exemple de **couche service** avec résultat homogène (`summary`, `succeeded_ids`, `failed`) — réutilisable comme **contrat de réponse** pour les imports. |

---

## 3. Formation : centre, type d’offre, statut — comment remplir l’Excel ?

Le modèle `Formation` relie :

- `centre` → `Centre`
- `type_offre` → `TypeOffre`
- `statut` → `Statut`

**Option A — IDs (recommandée pour la production)**

- Colonnes : `centre_id`, `type_offre_id`, `statut_id` (entiers).
- Fournir aux utilisateurs un **tableau de référence** (export API, page admin filtrée, ou onglet « Référentiels » dans le même classeur) listant `id` + libellé pour chaque entité.

**Option B — Libellés / clés métier (plus lisible, plus fragile)**

- `centre_nom` → `Centre.objects.get(nom=…)` (le nom est unique).
- Pour `TypeOffre` / `Statut` : utiliser le **nom technique** (`crif`, `a_recruter`, etc.) si une seule ligne correspond, sinon **imposer l’ID**.
- Prévoir des messages d’erreur explicites par ligne (ligne 5 : « type_offre introuvable »).

**Option C — Hybride**

- Accepter soit `centre_id`, soit `centre_nom` si une seule colonne est remplie (comme `_normalize_payload_for_fk` peut déjà le faire côté API pour certaines payloads — à vérifier / étendre pour l’import).

**Règles métier à ne pas contourner**

- Dates : `start_date` ≤ `end_date` (contrainte modèle + serializer).
- Après création, le modèle peut déclencher signaux / historiques : importer dans une **`transaction.atomic()`** et traiter les erreurs **ligne par ligne** ou **fichier entier rejeté** selon le niveau de stricte souhaité.

---

## 4. Autorisations : « certains utilisateurs »

À aligner sur l’existant :

- **API** : réutiliser `IsStaffOrAbove` + les mêmes garde-fous que le `create` du ViewSet concerné (ex. `_assert_can_write_formations` pour les formations).
- Si besoin d’un rôle **plus restreint** (ex. uniquement « import bulk ») : ajouter une **permission dédiée** (Django permission ou flag sur le rôle) et la vérifier sur l’action `import-xlsx`, en plus des règles ci-dessus.

Ne pas ouvrir l’import aux rôles déjà en lecture seule sur le module.

---

## 5. Architecture : infrastructure générique + code par ressource

### 5.1 Principe

| Couche | Rôle | Réutilisation |
|--------|------|----------------|
| **Générique** | Ouvrir le `.xlsx`, parcourir les lignes (à partir d’un en-tête), normaliser les types (dates, vides), agréger les erreurs `{ row, field, message }`, option `dry_run`, limites (taille, nombre de lignes), éventuellement `transaction` par ligne ou tout-ou-rien ; **générer le fichier modèle** (`get_import_template`) avec les mêmes colonnes que l’import | **Une seule fois** dans le dépôt |
| **Par ressource** | Quelles colonnes → quel dict pour le serializer de **création** ; comment vérifier le **scope** (centre, owner…) ; quelles permissions ; update vs create si métier ; définition **unique** du schéma d’import (utilisé à la fois pour le template et pour la lecture) | **Un petit module + une action** par ressource exposée à l’import |

Ne pas chercher un **meta-import** unique piloté par le nom du modèle Django : les serializers, FK et règles métier **diffèrent trop** entre `Candidat`, `CerfaContrat`, `Formation`, etc. En revanche, la **mécanique** Excel (boucle, erreurs, dry run) se factorise à 100 %.

### 5.2 Emplacement **réel** dans ce dépôt (2026)

L’implémentation **retenue** regroupe la mécanique Excel et les handlers par **lot** sous **`services/imports/`**, et expose **une seule famille d’URLs** sous **`api/import_export/`** (pas d’`@action` Excel sur les ViewSets CRUD référentiels).

```
rap_app/
  services/
    imports/
      validation.py         # taille, extension, ZIP §2.7, openpyxl
      schemas.py            # RESOURCE_*, colonnes, codes erreur §2.8.2
      excel_io.py           # Meta / Données / Aide ; lecture/écriture ; en-têtes stricts
      import_job_recorder.py  # persistance optionnelle ImportJob (§2.14)
      handlers_lot1.py      # Centre, TypeOffre, Statut
      handlers_lot2.py      # Partenaire
      handlers_lot3.py      # Formation, Document (import Document → not_supported V1)
      handlers_lot4.py      # Candidat, CVThèque (import CVThèque → not_supported V1)
      base.py               # (optionnel / futur) — pas requis pour le flux actuel
    candidate_bulk_service.py   # inspiration format réponse (bulk candidats)
  api/
    import_export/
      views.py              # Lot1ImportExportViewSet — template / export / import
      import_job_views.py   # GET jobs/ — liste paginée des traces ImportJob
      serializers.py        # ImportJobSerializer
      urls.py               # routes sous /api/import-export/
      scope.py              # mapping slug → ViewSet + queryset scopé
```

**URLs stables (toutes sous le préfixe `api_urls` : `path("import-export/", …)`) :**

- `GET /api/import-export/<resource>/import-template/`
- `GET /api/import-export/<resource>/export-xlsx/` (query params alignés sur le **liste** filtré du module concerné, ex. `formation` sur documents, `candidat` sur CVThèque)
- `POST /api/import-export/<resource>/import-xlsx/` (`multipart` fichier + `?dry_run=`)

**Traces (table technique `ImportJob`, si `RAP_IMPORT_PERSIST_JOBS`) :**

- `GET /api/import-export/jobs/` — liste paginée ; filtres `resource`, `status`, `dry_run` ; **staff** : seulement ses propres lignes ; **admin-like** : tout.
- `GET /api/import-export/jobs/<id>/` — détail (404 si hors périmètre).

Référence normative : **`docs/REFACTOR_IMPORT_EXPORT_PLAN.md`** (§2.15, §2.14).

### 5.3 Contrat de la couche générique (réalisée dans `excel_io` + handlers)

Dans le dépôt actuel, le rôle de « couche générique » est tenu par **`validation.py`**, **`excel_io.py`** et les **`handlers_lot*`** (pas par un `base.py` obligatoire). Principes :

1. **Entrée** : fichier `.xlsx` uploadé ; feuilles **Meta** + **Données** ; ligne 1 = en-têtes données ; contrôle **strict** des colonnes vs schéma ressource.
2. **Sortie JSON** : voir **§2.8.1** du plan refactor (`summary`, erreurs normalisées, `dry_run`, etc.) — aligné sur le contrat **`_build_import_payload`** / handlers.
3. **Par ressource** : handler dédié (Lot 1–4) ; serializers / modèles existants ; **scope** via `scope.py` + permissions **`IsStaffOrAbove`** (et règles métier type `can_write_formations` dans le handler).

4. **Génération de modèle** : **`write_lot1_workbook`** / chemins handlers — **une seule source** colonnes (`schemas.py` + listes dérivées serializer pour Candidat).

### 5.4 Modèle Excel téléchargeable : `get_import_template`

#### Objectif produit

L’utilisateur clique sur **« Télécharger le modèle Excel »** ; le système génère un fichier **.xlsx** dont les **colonnes** correspondent exactement à ce que l’import attend pour cette **Ressource** (mêmes noms, même ordre recommandé, types documentés).

#### Rôle dans l’infrastructure générique

En pratique, la génération repose sur **`excel_io.write_lot1_workbook`** et les handlers ; le **schéma** par ressource vit dans **`schemas.py`** (et dérivations serializer pour le Candidat).

#### Côté API / UI

- **`GET /api/import-export/<resource>/import-template/`** — même préfixe que export/import ; **`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`**.
- Côté front, les listes exposent **`Lot1ExcelActions`** (téléchargement template, export, import) en s’appuyant sur **`lot1ImportExport.ts`** — pas sur des routes du type `/api/formations/import-xlsx/` (retirées pour les référentiels Lot 1).

#### « Zéro erreur » : ce que le design garantit (et ce qu’il ne peut pas magiquement garantir)

| Garantie | Condition |
|----------|-----------|
| **Aucune erreur de format / de colonne** | Le fichier est issu du **template généré** (ou recréé à la main avec les **mêmes** en-têtes que le schéma) ; l’importeur valide les en-têtes contre le schéma de la Ressource. |
| **Même pipeline** | `get_import_template` et le parseur d’import lisent **le même `resource_schema`** (noms de colonnes, normalisation des types). Pas de dérive « template V1 / import V2 ». |
| **Succès métier à chaque ligne** | Nécessite des **valeurs** valides : IDs de FK **existants** et **autorisés** pour l’utilisateur, dates cohérentes, contraintes d’unicité respectées. Le modèle seul ne peut pas garantir cela sans que l’utilisateur saisisse des données correctes. |

Pour se rapprocher au maximum d’un **taux de réussite proche de 100 %** sur des fichiers « remplis depuis le modèle » :

- Générer dans le même classeur des **onglets référence** (`centres`, `statuts`, …) avec les IDs visibles pour l’utilisateur autorisé ;
- Optionnel : **validations Excel** (listes) alimentées par ces listes ;
- Documenter dans la feuille d’aide : champs obligatoires, format des dates, « copier l’ID depuis l’onglet … ».

En résumé : **garantie forte** = **cohérence template ↔ importeur** (zéro décalage de colonnes ou de convention) ; **garantie métier** = qualité des données saisies + règles serializer/scope — le template réduit drastiquement les erreurs « bêtes », pas les conflits métier (doublon, FK absente).

### 5.5 Ce que chaque ressource doit fournir (checklist)

Pour **chaque** modèle / endpoint où l’on active l’import :

- [ ] Serializer de **création** (ou update) déjà utilisé par l’API — **pas** de duplication des règles dans le service Excel seul.
- [ ] Convention de **colonnes** (documentée : fichier d’exemple ou section dans ce guide par ressource).
- [ ] Règles **FK** : IDs dans l’Excel + onglet référentiel, ou résolution par nom avec gestion d’ambiguïté.
- [ ] Alignement **`ScopedModelViewSet`** : même logique que `get_queryset()` pour savoir si une ligne est autorisée.
- [ ] Permissions : mêmes que `create` (ou plus strictes).
- [ ] Décision **create-only** vs **upsert** (clé métier : ex. `num_offre`, email, etc.).
- [ ] Tests : fichier `.xlsx` minimal en `dry_run` et un cas d’erreur (FK invalide, hors scope).
- [ ] **`resource_schema`** (ou équivalent) partagé par **`get_import_template`** et par le parseur d’import — tests : fichier généré puis réimporté en `dry_run` **sans erreur de structure**.

### 5.6 Pistes à ne pas confondre avec « tout générique »

- **Un seul endpoint** `/api/import/?model=…`** : possible mais fragile ; à réserver à un outil interne si jamais, avec allowlist stricte et audits — pas le premier choix pour les utilisateurs métier.
- **Modèle Django `ImportJob`** : **implémenté** comme table **technique** (une ligne par **`POST …/import-xlsx/`**, succès ou erreur) ; désactivable via **`RAP_IMPORT_PERSIST_JOBS`** ; consultation API **`GET /api/import-export/jobs/`** (en plus de l’admin). Complète les **logs** fichier `import_export.log`.
- **Django Admin + django-import-export** : rapide pour l’admin, souvent **hors** des règles `ScopedModelViewSet` / rôles métier — complément possible, pas substitut à l’API **`/api/import-export/…`**.

---

## 6. Inventaire du dépôt : modèles et périmètre import

### 6.1 Modèles métier (`rap_app/models/`)

Les entités sont découpées par fichier ; l’agrégation publique passe par `rap_app/models/__init__.py`.

| Domaine | Modèles (principaux) | Notes import |
|---------|----------------------|--------------|
| Référentiels | `Centre`, `TypeOffre`, `Statut` | Peu de FK ; bons **premiers** candidats ; attention unicité `Centre.nom`. |
| Formation | `Formation`, `HistoriqueFormation` | Import ciblé **`Formation`** ; historique souvent **écrit par signaux** — ne pas importer en doublon sans règle claire. |
| Candidats | `Candidat`, `HistoriquePlacement` | Forte volumétrie et règles métier ; réutiliser serializers + services existants ; historique plutôt **dérivé**. |
| Appairage | `Appairage`, `HistoriqueAppairage` | Nombreuses FK ; import **ligne par ligne** avec validation stricte. |
| Prospection | `Prospection`, `HistoriqueProspection`, `ProspectionComment` | Commentaires / prospection : endpoints dédiés (`ProspectionCommentViewSet`). |
| Prépa / Déclic | `Prepa`, `StagiairePrepa`, `ObjectifPrepa`, `Declic`, `ParticipantDeclic`, `ObjectifDeclic` | Objectifs souvent **sous-ressources** ; importer parent puis enfants ou fichier séparé. |
| Atelier TRE | `AtelierTRE`, `AtelierTREPresence` | Présences = relation ; peut nécessiter un Excel **dédié** ou second fichier. |
| Événements / commentaires / documents | `Evenement`, `Commentaire`, `Document` | Vérifier FK vers formation / candidat / centre selon le modèle. |
| Partenaires / rapports / logs | `Partenaire`, `Rapport`, `LogUtilisateur` | `LogUtilisateur` : plutôt **audit** — import utilisateur rare ; **logs** souvent exclus. |
| CERFA | `CerfaContrat` | Données sensibles ; mapping déjà partiellement structuré (`cerfa_mapping_service`) — import à traiter avec prudence. |
| VAE / jury | `VAE`, `HistoriqueStatutVAE`, `SuiviJury` | Route VAE **commentée** dans `api_urls.py` — import seulement si le module est réactivé. |
| CVThèque | `CVTheque` | Selon règles fichier / RGPD. |
| Utilisateur | `CustomUser` | Import comptes : hors scope « métier » classique ; réservé admin + procédure sécurisée. |
| Test | `DummyModel` | **Exclure** de tout import prod. |

### 6.2 Routes API : CRUD vs import-export Excel

- **Import/export Excel symétrique (Lots 1–4 livrés)** : **`/api/import-export/<resource>/…`** — voir §5.2 ; le **scope** réutilise les ViewSets listés dans **`import_export/scope.py`** (`Centre`, `Formation`, `Candidat`, etc.) sans ajouter d’`@action` Excel sur ces ViewSets.
- **ViewSets router** (`rap_app/api/api_urls.py`) : `centres`, `statuts`, `typeoffres`, `formations`, `documents`, … — utilisés pour le **CRUD** et certains **exports historiques** (ex. formations) ; **pas** la surface canonique pour template/export/import **Meta** des lots 1–4.

**Habituellement hors import utilisateur** : `*-stats`, `health`, et endpoints hors router (`search`, `me`, `token`, etc.).

### 6.3 Périmètre **livré** vs extensions possibles

**Déjà couvert** par **`/api/import-export/…`** (handlers + tests dédiés) : référentiels **Centre / TypeOffre / Statut**, **Partenaire**, **Formation**, métadonnées **Document** (import fichier **non supporté** en V1 — code `not_supported`), **Candidat**, **CVThèque** (import **non supporté** V1 ; export métadonnées OK).

**Extensions futures** (hors plan actuel, cf. **`REFACTOR_IMPORT_EXPORT_PLAN.md`**, exclusions §1.5) : `Evenement`, `Commentaire`, `Appairage`, **Prepa** / **Declic**, **CERFA**, etc. — chaque fois : nouveau **`RESOURCE_*`**, handler, entrée **`scope.py`**, tests, et éventuellement UI.

À chaque nouvelle ressource : **même pattern** que les lots existants (`schemas` + handler + `scope` + routes sous **`import-export`**) — pas d’`@action` sur le ViewSet CRUD.

---

## 7. Risques et bonnes pratiques

| Risque | Mitigation |
|--------|------------|
| Doublons (`num_offre`, `nom`+`centre`, etc.) | Définir des **clés métier** d’unicité ou mode « update si existe » explicitement. |
| Fichiers volumineux | Import **par lots**, limite de lignes, tâche **async** (Celery) si besoin. |
| Données incohérentes | Validation serializer + rapport d’erreurs par ligne. |
| Sécurité | Taille max fichier, type MIME, pas d’exécution de macros ; réservé aux rôles autorisés. |

---

## 8. Plan d’action (état 2026 et suite)

**Réalisé (réf. `REFACTOR_IMPORT_EXPORT_PLAN.md`)** : `validation` + `excel_io` + `handlers_lot1` à `handlers_lot4` ; module **`api/import_export`** ; UI **`Lot1ExcelActions`** sur les listes concernées ; **`ImportJob`** + **`GET /api/import-export/jobs/`** ; garde-fous taille / ZIP / `parse_timeout` ; logs **`import_export.log`**.

**Suite possible** :

1. **`base.py`** : uniquement si factorisation d’orchestration entre handlers apporte un gain clair.
2. **Nouvelles ressources** §6.1 : reprendre le pattern §5.2 (schéma + handler + scope + tests).
3. **UI** : page **Historique imports Excel** (`/import-export/jobs`, staff+) + lien **Historique des imports** depuis **`Lot1ExcelActions`** (`?resource=`) + toast post-import cliquable ; filtres avancés (`user` avec autocomplete + saisie libre, `date_min`, `date_max`) et multi-filtres ressources/statuts (multi-select -> `resource__in`, `status__in`), presets (`7j`, `30j`, `mois courant`, **semaine préc.**, **mois préc.**), tri explicite ; **filtres et pagination synchronisés dans l’URL** (partage de liens) ; exports **CSV / XLSX / PDF** des traces selon filtres courants — **fait**.
4. **Document / CVThèque** : si le produit ouvre l’import fichier au-delà de **`not_supported`** V1, spécifier le comportement dans le plan refactor puis implémenter.

---

## 9. Synthèse

| Question | Réponse |
|----------|---------|
| Faisable dans ce projet ? | **Oui**, stack déjà présente (`openpyxl`, DRF, serializers). |
| Un Excel par modèle ? | **Oui**, recommandé. |
| Remplissage « automatique » des modèles ? | **Oui**, en passant par les serializers / `save()` existants, pas en `INSERT` SQL brut. |
| Formation + centre / type d’offre / statut ? | Gérer les FK par **ID** (idéal) ou **résolution contrôlée** par nom / code, avec validation et respect du **scope centre** + **`can_write_formations`**. |
| Éviter la répétition pour **tous** les modèles ? | **Couche commune** (`validation`, `excel_io`, `schemas`) + **handlers par lot** + **une route** par ressource sous **`/api/import-export/`** — pas d’actions Excel dupliquées sur chaque ViewSet CRUD. |
| Modèle Excel généré ? | **`GET …/import-template/`** + **`write_lot1_workbook`** ; schéma dans **`schemas.py`** ; UI **`Lot1ExcelActions`** ; **cohérence** template ↔ import. **Traces** : **`ImportJob`** + API **`jobs/`** + fichier log. |

Ce document complète **`REFACTOR_IMPORT_EXPORT_PLAN.md`** pour les équipes métier / intégration ; le plan refactor reste la **source de vérité** architecture.
