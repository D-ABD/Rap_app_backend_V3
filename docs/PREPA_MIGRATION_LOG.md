# Journal de migration — Module Prépa (parcours simplifié)

## Lot 0 — Audit détaillé et cadrage fonctionnel

### ✔️ Fait

- Cartographie de l’existant alignée avec `docs/PLAN_MODIF_PREPA.md` et `docs/PREPA_PARCOURS_SIMPLIFIE.md` :
  - **Modèles** (`rap_app/models/prepa.py`) : `Prepa`, `PrepaStagiaireParticipation` (statuts dont `termine` / `a_repositionner`), `StagiairePrepa` (statut parcours manuel + booléens `atelier_*_realise`, `statut_parcours_calcule` dérivé ancienne logique).
  - **API** : `PrepaViewSet`, `StagiairePrepaViewSet` (filtres `statut_parcours_calcule`, `pilotage`, `a_reprogrammer`, exports XLSX), `PrepaStatsViewSet` (agrégats séances / IC — sans pipeline nominatif jusqu’aux évolutions Lot 8).
  - **Serializers** : `PrepaSerializer._sync_participations_prepa` pilote compteurs + `marquer_participation_atelier` si présence « type présent » (`present` / `termine`).
  - **Frontend** : hooks `usePrepa.ts`, `useStagiairesPrepa.ts`, pages `PrepaFormAteliers.tsx`, `StagiairesPrepaForm.tsx`, dashboard `PrepaStatsParcours.tsx` (synthèse via `/stagiaires-prepa/synthese-parcours/`).
- Glossaire cible validé : statuts de parcours (`EN_ATTENTE_DEMARRAGE`, …, `TERMINE`) vs **issues de bilan** (`ORIENTE_AFPA`, `ABANDON`, `AUTRE_SORTIE`) — cf. parcours simplifié §8–10.
- Inventaire tests existants : `rap_app/tests/tests_serializers/tests_prepacomp_serializers.py`, contrats API `test_api_response_contract.py`, scoping centres `tests_centres_viewsets.py`.

### ⚠️ Problèmes rencontrés

- Double source de vérité historique : flags `atelier_*` / `statut_parcours` vs participations nominatives ; le recalcul unifié doit fusionner les deux pour la non-régression des données anciennes.

### 🧠 Décisions prises

- **Statut de parcours cible** : calculé par un **service métier unique** (`rap_app/services/prepa_parcours.py`), exposé en lecture via `statut_parcours_courant` sans casser `statut_parcours_calcule` (filtres / écrans existants).
- **Issues de bilan** : champs persistés `issue_bilan` + `date_bilan` sur `StagiairePrepa` (migration additive + backfill depuis `orientation_finale` / abandon), en complément du calcul pour l’historique.
- **Écriture participations** : normalisation silencieuse `termine` → `present`, `a_repositionner` → `absent` pour compatibilité clients existants (Lot 3).

### 📌 À surveiller

- Filtre `statut_parcours_courant` : implémentation par matérialisation d’IDs (acceptable sur périmètres centres ; à optimiser si volumétrie explose).
- Anciens dossiers « terminés » sans orientation ni issue : classés **EN_ATTENTE_BILAN** dans le nouveau paradigme alors que `statut_parcours_calcule` historique peut afficher « terminé » — divergence documentée et assumée pour les **nouveaux** champs uniquement.

---

## Lots 1 à 10 — Implémentation réalisée dans le dépôt

### ✔️ Lot 1 — Modèle compatible bilan

- Ajout `IssueBilanPrepa`, champs `issue_bilan`, `date_bilan` sur `StagiairePrepa`, migration `0067` avec backfill **uniquement depuis `orientation_finale` + dates** (pas d’issue automatique sur abandon seul pour éviter une « fausse » clôture).

### ✔️ Lot 2 — Service `prepa_parcours`

- Fichier `rap_app/services/prepa_parcours.py` : statut courant, dernière présence, action suggérée, historique, agrégats pipeline ; prefetch pour éviter les N+1 dans la synthèse.

### ✔️ Lot 3 — Participations atelier

- Normalisation à l’écriture : `termine` → `present`, `a_repositionner` → `absent` dans `PrepaSerializer._normalize_participations`.

### ✔️ Lot 4 — API stagiaire enrichie

- `StagiairePrepaSerializer` : `statut_parcours_courant`, `issue_bilan`, `date_bilan`, champs dérivés ; filtre query `statut_parcours_courant` (matérialisation par IDs, coût si forte volumétrie) ; méta enrichie (`statut_parcours_courant`, `issue_bilan`).

### ✔️ Lots 5–7 — Front atelier & fiche stagiaire

- Ateliers : 3 statuts dans `PrepaInvitesSection`, normalisation lecture legacy ; `PrepaFormAteliers` normalise au chargement.
- Fiche : bandeau synthèse, section bilan conditionnelle, détail technique ateliers dans un `Collapse`.

### ✔️ Lot 8–9 — KPI & dashboard parcours

- Synthèse queryset : métriques pipeline fusionnées via le service (`synthese_parcours`).
- `PrepaStatsParcours.tsx` : cartes pipeline + bilans + écart bilans.

### ⚠️ Lot 10 — Documentation / dépréciations

- Docstrings partiellement enrichies sur les zones touchées ; pas de suppression ni dépréciation formalisée des anciens champs API (compatibilité conservée).

### 🧪 Tests

- Nouveau module `rap_app/tests/services/test_prepa_parcours_service.py` ; adaptation serializer test présence `termine`.
- **Les tests Django n’ont pas été exécutés dans cet environnement** (Django non installé dans le sandbox). À lancer localement après migration :  
  `python manage.py migrate && python manage.py test rap_app.tests.services.test_prepa_parcours_service rap_app.tests.tests_serializers.tests_prepacomp_serializers`

### 📌 À faire en prod / CI

- Exécuter la suite de tests Prépa + contrats API après déploiement des migrations.
- Surveiller les performances du filtre `statut_parcours_courant` sur grosses bases.

---

**État mission : implémentation conforme au plan livrée dans le code ; phrase « PLAN PRÉPA TERMINÉ » réservée après passage CI/tests métier sur votre environnement.**
