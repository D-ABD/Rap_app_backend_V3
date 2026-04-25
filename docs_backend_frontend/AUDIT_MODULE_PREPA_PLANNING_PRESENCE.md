# Audit — module Prépa / Stagiaire Prépa : plannings et fiches de présence

**Date** : 2026-04-25  
**Périmètre** : modèles Django `Prepa`, `StagiairePrepa` (`rap_app.models.prepa`), API associée, exports existants.  
**Contrainte** : constat et recommandations — **aucune modification de code** dans le cadre de ce document.

---

## 1. Synthèse exécutive

| Besoin | État actuel | Verdict |
|--------|-------------|--------|
| **« Planning »** (vue des séances / dates) | Chaque **séance** est un enregistrement `Prepa` avec `date_prepa`, `type_prepa`, `centre`, etc. | **Oui, partiellement** : le planning est une **liste de séances datées** (1 ligne = 1 date de séance, pas d’horaires ni de récurrence native). |
| **Fiche de présence nominative** (qui était là / absent, par séance) | Les **compteurs** sur `Prepa` (`nb_presents_info`, `nb_presents_prepa`, etc.) sont **globaux** à la séance, **pas** liés à un stagiaire. `StagiairePrepa` a des **booléens / dates d’accomplissement** d’atelier (parcours), **pas** une présence par séance. | **Non en base** pour une vraie **émargement nominatif** stocké. Des **exports Excel vides** existent pour impression / remplissage manuel. |
| **Meilleure option** (recommandation) | Voir §5 | **Court terme** : exploiter `Prepa` + exports XLSX existants. **Moyen terme** : modèle de **présences nominatives** (même principe que le module TRE si besoin d’équivalence fonctionnelle). |

---

## 2. Modèle `Prepa` (séance)

Fichier : `rap_app/models/prepa.py`.

- **Rôle** : une ligne = **une activité Prépa** (IC, atelier 1…6, autre) pour un **centre** et une **date** (`date_prepa` : `DateField`).
- **Agrégats** (Information collective) : `nombre_places_ouvertes`, `nombre_prescriptions`, `nb_presents_info`, `nb_absents_info`, `nb_adhesions`, etc.
- **Agrégats** (Ateliers) : `nb_inscrits_prepa`, `nb_presents_prepa`, `nb_absents_prepa` (les absents atelier sont recalculés en `save`).

➡️ C’est adapté au **pilotage chiffré** (taux, objectifs) et à un **agenda logique** (filtrer par `date_min` / `date_max` / `type_prepa` / `centre`).

➡️ Ce **n’est pas** un moteur de **planning récurrent** (CRON, RRULE, créneaux horaires, salles) : une **« semaine concernée »** est documentée par le seul `date_prepa` (un jour), pas une plage multi-jours structurée.

---

## 3. Modèle `StagiairePrepa` (personne)

Même fichier.

- **Lien** : `prepa_origine` (FK optionnelle vers **une** `Prepa` d’origine, souvent l’IC).
- **Parcours** : statut, dates d’entrée / sortie, **booléens** `atelier_N_realise` + **`date_atelier_N`** : suivi **« atelier validé le tel jour »**, pas **« présent à la séance Prepa d’id=X »** en base.
- Aucun `ForeignKey` vers plusieurs `Prepa` pour enregistrer **présent / absent / excusé** par occurrence.

➡️ Très utile pour le **suivi de parcours** et des **indicateurs** (dernier atelier, etc.).

➡️ **Insuffisant** pour un **historique d’émargement** requête par requête (relecture, litiges, absences justifiées par séance) **sans** nouvelle entité de liaison.

---

## 4. Existant côté API (à connaître)

### 4.1 `PrepaViewSet` (`rap_app/api/viewsets/prepa_viewset.py`)

- CRUD / filtres (année, centre, type, plage de dates, etc.).
- **Export** `export-xlsx` : **séances** enrichies (indicateurs, pas une feuille d’émargement nominative).

### 4.2 `StagiairePrepa` (viewset dédié, même dossier `stagiaires_prepa_viewsets.py`)

Déjà en place (extraits vérifiés) :

| Endpoint (family) | Rôle |
|-------------------|------|
| `export-xlsx` | Liste des stagiaires (nom, contact, ateliers réalisés, etc.). |
| `export-emargement-xlsx` | **Feuille d’émargement** : colonnes *Présence* et *Signature* **vides** → modèle **papier / saisie manuelle** post-export. |
| `export-presence-xlsx` | **Feuille de présence** : colonne *Présent* **vide** (même logique). |
| Query param `type_atelier` | Ajuste le **titre** du document (affichage), **sans** lier la ligne à un `Prepa` précis. |

➡️ Vous **pouvez** déjà **produire** des supports type « fiche de présence » / « émargement » pour **impression et signature**, mais la **saisie des présences n’est pas stockée** dans l’app via ces exports.

**Référence d’architecture** ailleurs dans le projet : les **ateliers TRE** gèrent des **présences nominatives** par statut (modèle / actions type `set-presences`) — modèle de référence **si** l’on veut le même niveau de finesse côté Prépa (hors scope de cet audit d’implémentation).

---

## 5. Meilleure option (recommandation produit / technique)

### 5.1 Objectif : **supports papier + comptage déjà géré** (rapide, peu de risque)

- Continuer à saisir les **totaux** sur chaque fiche `Prepa` (IC / ateliers) comme aujourd’hui.
- Utiliser **`export-emargement-xlsx`** / **`export-presence-xlsx`** pour les listes de stagiaires filtrées (GET/POST avec `ids` si besoin) **le jour J**.
- Accepter que **Présence / Signature** soient remplies **hors** application (ou ressaisies en compteurs sur `Prepa`).

**Avantages** : pas de migration, aligné sur l’existant.  
**Limites** : pas de preuve **nominative** en base, pas de **rapport d’assiduité** par personne et par séance au fil du temps.

### 5.2 Objectif : **présence nominative fiable** (moyen terme, évolution ciblée)

- Introduire un modèle du type **« présence d’un `StagiairePrepa` à une `Prepa` donnée »** (statut, horodatage, auteur) — **séparation nette** entre :
  - **Séance** (`Prepa`) ;
  - **Inscrit / stagiaire** (`StagiairePrepa`) ;
  - **Ligne de présence** (nouvelle table).
- Réutiliser les idées du module **TRE** (déjà des présences) pour homogénéiser UX et API.
- Optionnel : générer la feuille d’émargement **pré-cochée** à partir de ces enregistrements.

**Avantages** : traçabilité, exports **fiabilisés**, moins d’écart entre Excel terrain et chiffres agrégés.  
**Inconvénients** : migrations, règles de gestion (inscription à la séance, annulations), charge de dev/test.

### 5.3 Objectif : **planning riche** (récurrence, multi-crénaux, ressources)

- Le modèle `Prepa` actuel = **1 date / séance** ; un vrai outil de **planning** (calendrier partagé, répétitions) dépasse l’**intention** actuelle des champs.
- **Option** : tableaux de bord / vues calendaires **côté front** sur `Prepa` **sans** changer le cœur métier, **ou** extension dédiée (hors sujet de ce constat) si le métier le impose.

---

## 6. Réponses directes aux questions

- **Puis-je créer des plannings ?**  
  - **Oui** au sens **liste de séances planifiées** : créer des `Prepa` avec `date_prepa` + `type_prepa` + `centre`.  
  - **Non** au sens d’un outil de **gestion de planning avancé** (pas dans le modèle actuel).

- **Puis-je créer des fiches de présence ?**  
  - **Oui, en export** (émargement / présence) pour **support** ; **non** en **saisie nominative structurée en base** sans évolution modèle.  
  - Les compteurs sur `Prepa` permettent une **fiche de présence « agrégée »** (effectifs seulement).

- **Quelle est la meilleure option ?**  
  - **Besoin terrain immédiat** → **5.1** (exports + saisie agrégée sur `Prepa`).  
  - **Besoin conformité / historique / reporting par personne** → **5.2** (modèle de présences nominatives).

---

## 7. Fichiers de référence (code)

| Élément | Fichier(s) |
|---------|------------|
| Modèles | `rap_app/models/prepa.py` |
| API Prépa | `rap_app/api/viewsets/prepa_viewset.py` |
| API Stagiaires + exports | `rap_app/api/viewsets/stagiaires_prepa_viewsets.py` |
| Présences nominatives (autre module) | `rap_app/api/viewsets/atelier_tre_viewsets.py` (exemple) |

---

*Fin du document d’audit — aucun fichier applicatif modifié lors de sa production.*
