# Guide : import Excel vers la base (diagnostic et mise en œuvre)

Document de référence pour répondre à la question : *peut-on ajouter une fonction « Importer » pour que des utilisateurs autorisés remplissent la BDD via un fichier Excel, un fichier par modèle, avec remplissage automatique des modèles Django — en gérant correctement les clés étrangères (ex. Formation → centre, type d’offre, statut) ?*

**Dernière mise à jour :** 2026-04-06 (analyse du dépôt `Rap_App_Dj_V2-main`).

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
| Export formations | `FormationViewSet.export_xlsx` — génère un `.xlsx` ; base idéale pour un **modèle d’import** (mêmes colonnes + documentation). |
| Création formation | `FormationCreateSerializer` : `centre_id`, `type_offre_id`, `statut_id` obligatoires (`PrimaryKeyRelatedField` vers `Centre`, `TypeOffre`, `Statut`). |
| Droits d’écriture | `_assert_can_write_formations` : seuls les rôles couverts par `can_write_formations` (admin-like et **staff** standard) ; **commercial** et **chargé recrutement** : lecture seule sur les formations. |
| Périmètre centre | `ScopedModelViewSet` avec `scope_mode = "centre"` : les imports doivent **respecter le même filtrage** que la création manuelle (ne pas créer une formation sur un centre hors périmètre pour un staff limité). |
| Modèles de référence | `Centre` : `nom` **unique**. `TypeOffre` et `Statut` : champ `nom` avec choix prédéfinis ; en base il peut exister **plusieurs lignes** avec le même code métier selon l’historique — pour l’import, les **IDs** sont plus sûrs que le seul libellé. |

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

- **API** : réutiliser `IsStaffOrAbove` + `_assert_can_write_formations` pour tout import qui touche aux formations.
- Si besoin d’un rôle **plus restreint** (ex. uniquement « import bulk ») : ajouter une **permission dédiée** (Django permission ou flag sur le rôle) et la vérifier sur l’action `import-xlsx`, en plus des règles ci-dessus.

Ne pas ouvrir l’import aux rôles déjà en lecture seule sur le module.

---

## 5. Architecture recommandée (sans tout coder ici)

1. **Endpoint dédié** (ex. `POST /api/formations/import-xlsx/`)  
   - `multipart/form-data` : fichier `.xlsx`.  
   - Réponse : `{ "created": n, "errors": [ { "row": 7, "field": "...", "message": "..." } ] }`  
   - Option : query `?dry_run=1` pour valider sans écrire.

2. **Service** `FormationImportService` (ou module `rap_app/services/imports/formation.py`)  
   - Ouvre le classeur avec `openpyxl`, lit ligne à ligne.  
   - Construit un dict compatible avec `FormationCreateSerializer` (ou appelle le serializer).  
   - Applique `scope_queryset` / vérifie que `centre_id` est dans les centres autorisés pour l’utilisateur (`staff_centre_ids`, etc.).

3. **Modèle Excel**  
   - Soit colonnes = champs du serializer (IDs pour les FK).  
   - Soit générer un **template** depuis le même code que `export_xlsx` (colonnes + une ligne d’exemple vide).

4. **Autres modèles (« un Excel par modèle »)**  
   - Même schéma : un endpoint + un service par ressource, ou une **fabrique** paramétrée par `model_name` **uniquement si** les règles de validation et les FK sont homogènes (sinon risque de complexité et de bugs).

5. **Piste alternative**  
   - **Django Admin** avec `django-import-export` : rapide pour l’admin interne, moins contrôlé sur le périmètre centre / rôles métier personnalisés.  
   - **Commande `manage.py import_…`** : utile pour les migrations one-shot, pas pour les utilisateurs finaux.

---

## 6. Risques et bonnes pratiques

| Risque | Mitigation |
|--------|------------|
| Doublons (`num_offre`, `nom`+`centre`, etc.) | Définir des **clés métier** d’unicité ou mode « update si existe » explicitement. |
| Fichiers volumineux | Import **par lots**, limite de lignes, tâche **async** (Celery) si besoin. |
| Données incohérentes | Validation serializer + rapport d’erreurs par ligne. |
| Sécurité | Taille max fichier, type MIME, pas d’exécution de macros ; réservé aux rôles autorisés. |

---

## 7. Plan d’action concret (ordre suggéré)

1. Figurer le **format** de la première ressource (Formations) : colonnes = IDs FK + champs scalaires alignés sur `FormationCreateSerializer`.  
2. Ajouter un **export « template »** ou réutiliser `export_xlsx` comme base de colonnes.  
3. Implémenter `import-xlsx` avec `dry_run` et tests unitaires (fichier minimal valide / invalide).  
4. Brancher l’UI (bouton Importer + file picker) sur le nouvel endpoint, messages d’erreur utilisateur.  
5. Dupliquer le pattern pour d’autres modèles **un par un**, en commençant par ceux à faible FK (ex. référentiels) puis les plus dépendants.

---

## 8. Synthèse

| Question | Réponse |
|----------|---------|
| Faisable dans ce projet ? | **Oui**, stack déjà présente (`openpyxl`, DRF, serializers). |
| Un Excel par modèle ? | **Oui**, recommandé. |
| Remplissage « automatique » des modèles ? | **Oui**, en passant par les serializers / `save()` existants, pas en `INSERT` SQL brut. |
| Formation + centre / type d’offre / statut ? | Gérer les FK par **ID** (idéal) ou **résolution contrôlée** par nom / code, avec validation et respect du **scope centre** + **`can_write_formations`**. |

Ce document sert de feuille de route ; l’implémentation détaillée reste à faire dans le code (`viewsets`, `services`, tests).
