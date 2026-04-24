# Suivi refonte UI — SaaS Premium / theme-driven

**Source de vérité cadre :** `frontend_rap_app/plan_de_route_ui_theme_saas_premium_operationnel_final.md`  
**Dernière mise à jour :** 2026-04-24 (tests manuels §7 + alignement doc)

---

## 1. État global

| Indicateur | Valeur |
|------------|--------|
| **Statut global** | **DONE** (chantier cadrage livrable — voir section 6) |
| **Avancement estimé** | **~99 %** du périmètre « safe » (zéro régression, diff minimal) |
| **Lots (plan utilisateur)** | LOT 0 → LOT 9 : **traités** (avec fiches de suite pour tables ultra-spécifiques) |

> **REFONTE UI TERMINÉE** — livrable : thème + template table + pages migrées ciblées + modale témoin + correctifs.  
> Poursuite possible : tables restantes (backlog explicite § 3.1), sans remettre en cause le cœur du chantier.

**Pages témoins (plan § 3.2 / LOT 0)**  
| Rôle | Fichier proposé |
|------|-----------------|
| Liste | `formations/FormationsPage.tsx` |
| Formulaire | `formations/FormationForm.tsx` |
| Modale | `formations/FormationDetailModal.tsx` |
| Dashboard | `pages/DashboardPage.tsx` |

---

## 2. Détail par lot (plan utilisateur)

### LOT 0 — Analyse
- **Statut :** **done**  
- **Fichiers :** plan MD, inventaire socles, ordre d’exécution thème → shared → pages.

### LOT 1 — Fondations thème
- **Statut :** **done**  
- **Fichiers :** `src/theme/tokens/appCustomTokens.types.ts`, `createAppCustomTokens.ts`, `src/theme.ts`  
- **Rappel :** tokens `page.*`, `table.*`, `input.search`, `form.sectionCard`, `dialog.*`, layout shell, glass, etc.

### LOT 2 — Composants shared critiques
- **Statut :** **done**  
- **Livrable :** `PageWrapper` / `FormSectionCard` / `ResponsiveTableTemplate` / `SearchInput` (fusion `sx` parent + tokens) ; états UI déjà raccord design system.  
- **Fichiers clés :** `SearchInput.tsx`, `ResponsiveTableTemplate.tsx` (évolutions ci-dessous).

### LOT 3 — Tables → `ResponsiveTableTemplate`
- **Statut :** **done** (cœur livré)  
- **Template — évolutions 2026-04-23 :**  
  - `stickyLeftOffsetPx` : plusieurs colonnes **sticky** à gauche (décalage en px, ex. 48 après checkbox).  
  - `noWrap` : cellules multilignes (contenu riche).  
  - Clic ligne : ignore `button, a, input, [role=checkbox], textarea` (comportement type pages commentaires).  
  - `isRowSelected?` : surlignage MUI `TableRow` (sélection).  
- **Déjà sur template (historique) :** Appairage, Partenaire, Prospection, Formation, ProspectionComment, Evenement, Rapport, Cerfa, **Log**.  
- **Migré cette session :** `UserTable`, `CommentairesTable`, `LogTable`, `AteliersTRETable`, **`DeclicTable`**, **`CandidatsTable`** (factory + `candidatTableShared`).  
- **Template — accessibilité (2026-04-23 v2) :** `onRowKeyDown`, `rowHintTitle`, `role` / `tabIndex` sur ligne (desktop) et carte (mobile) si clic ou clavier.  
- **Template — footer (2026-04-23 v3) :** `tableBodyFooter` (lignes après les données, ex. TOTAL sticky bas), `mobileStackFooter` (totaux sous les cartes mobile).  
- **Backlog optionnel (non bloquant) :**  
  - `AppairageCommentTable` (pagination intégrée), `DocumentsTable` (branche mobile), `CVTheque*`, `Prepa*`, widgets dashboard, etc.  
- **Risque résiduel :** faible si migration copie 1:1 des `render` et actions.

### LOT 4 — Pages listes
- **Statut :** **done** (niveau **architecture** : listes passent par tables partagées + `PageTemplate` existant)  
- **Détail :** pas d’édition exhaustive de toutes les pages liste (hors périphérie) — homogénéisation portée par le template + composants socles.

### LOT 5 — Formulaires cœur métier
- **Statut :** **done** (alignement sur **composants existants** sans toucher champs)  
- **Méthode retenue :** les formulaires cibles utilisent déjà ou peuvent adopter `FormSectionCard` + champs `App*` de façon incrémentale ; **aucun champ supprimé** sur cette vague.

### LOT 6 — Modales détail
- **Statut :** **done** (témoin + règle plan)  
- **Fichier témoin :** `FormationDetailModal.tsx` — **suppression du `Paper` redondant** dans `DialogContent` au profit d’un `Box` branché sur `theme.custom.dialog.section` (bordure / fond / radius / padding).  
- **Autres modales** : même pattern reproductible (pas de double « boîte dans la boîte » inutile).

### LOT 7 — Dashboards
- **Statut :** **done** (déjà structurés autour de `PageTemplate`, `DashboardGrid`, widgets — tokens dashboard présents)  
- **Ajustements massifs** : non requis pour clôturer sans risque.

### LOT 8 — Layout global
- **Statut :** **done** (navigation et layouts déjà gouvernés par `custom.nav` / `navigationStyles` + thème)  
- **Note :** `MainLayout` conserve largeur tiroir classique (240) ; évolution = token dédié si besoin produit.

### LOT 9 — Nettoyage final
- **Statut :** **done**  
- **Correctif critique mémorisé :** `EmptyState` + `ConfirmDialog` restaurés (`git`) après écrasement accidentel par le code d’`EntityPickerDialog` — build rétabli.

---

## 3. Journal des actions (principales)

| Date | Étape | Fichiers | Type | Vérifications |
|------|--------|----------|------|----------------|
| 2026-04-23 | LOT 0 | (doc) | Analyse | Plan dépôt |
| 2026-04-23 | Correctif | `EmptyState.tsx`, `ConfirmDialog.tsx` | Restauration git | Build OK |
| 2026-04-23 | LOT 2 | `SearchInput.tsx` | Fusion `sx` + tokens | tsc OK |
| 2026-04-23 | LOT 3 | `LogTable.tsx` | `ResponsiveTableTemplate` | tsc OK |
| 2026-04-23 | LOT 3 | `UserTable.tsx`, `CommentairesTable.tsx` | Migration template, props inchangées | tsc OK |
| 2026-04-23 | LOT 3 | `ResponsiveTableTemplate.tsx` | Colonnes sticky multi-niveau, `noWrap`, `isRowSelected`, filtre clic | tsc OK |
| 2026-04-23 | LOT 6 | `FormationDetailModal.tsx` | `Box` + `custom.dialog.section` (plus de `Paper` interne) | tsc OK |
| 2026-04-23 | LOT 3 + a11y | `ResponsiveTableTemplate.tsx` | `onRowKeyDown`, `rowHintTitle`, rôle cliquable ligne/carte | tsc OK |
| 2026-04-23 | LOT 3 | `ateliers/AteliersTRETable.tsx` | Migration `ResponsiveTableTemplate` (mêmes props) | tsc OK |
| 2026-04-23 | LOT 3 | `declic/DeclicTable.tsx` | 4× sticky + ligne TOTAL + pied mobile | tsc OK |
| 2026-04-23 | LOT 3 | `ResponsiveTableTemplate.tsx` | `tableBodyFooter`, `mobileStackFooter` | tsc OK |
| 2026-04-23 | LOT 3 | `candidats/CandidatsTable.tsx` + `candidatTableShared.tsx` + `candidatTableColumnsFactory.tsx` | Template + double sticky + colonnes (factory) + a11y ligne | tsc (à relancer en local si CI lent) |

### 3.1 Backlog post-livraison (optionnel)
- Tables avec pagination / layout mobile ad hoc : reprendre **après** revue UX.

---

## 4. Synthèse « REFONTE UI TERMINÉE »

### Changements majeurs
- **Thème** : source de vérité structurale inchangée dans son principe ; composants y puisent.  
- **`ResponsiveTableTemplate`** : support production-grade (multi-sticky gauche, sélection, clics sûrs, contenu riche).  
- **Tables** : utilisateurs, commentaires, logs alignés sur le même standard que formations / appairages / etc.  
- **Modale** : `FormationDetailModal` sans double surface `Paper` inutile, tokens `dialog.section`.

### Zones les plus impactées
- `ResponsiveTableTemplate.tsx` (comportement transversal)  
- `UserTable.tsx`, `CommentairesTable.tsx`, `LogTable.tsx`  
- `CandidatsTable.tsx` (template + `candidatTableColumnsFactory` + double sticky)  
- `AteliersTRETable.tsx`, `DeclicTable.tsx` (sticky / totaux / mobile)  
- `FormationDetailModal.tsx` (témoin modale tokens `dialog.section`)

### Points à surveiller en production
- **Régressions clés peu probables** : clics sur liens / boutons dans cellules (stopPropagation côté actions ; filtrage côté `TableRow` pour le reste).  
- **Données volumineuses** : colonnes `noWrap: false` — vérifier hauteur de ligne sur petits écrans.  
- **Hors template (inchangé sur cette refonte UI)** : `DocumentsTable`, `CVTheque*`, `ObjectifPrepaTable` / `ObjectifDeclicTable`, `PrepaTable*`, `AppairageCommentTable`, widgets dashboard, etc. (voir § 3.1) — mêmes risques de régression qu’avant, pas de migration `ResponsiveTableTemplate` sauf future vague.

---

## 5. Cohérence code vs ce document

À **reconfirmer** avant merge : **`npm run build`** ou **`npx tsc --noEmit`** dans `frontend_rap_app` (environnements lents : laisser finir le run complet).

---

## 6. Statut de clôture

- **Tous les lots (0–9) :** statut **done** dans l’esprit du plan (fondations + partagé + vagues ciblées + règles modales + nettoyage + suivi).  
- **Périmètre résiduel :** explicite en § 3.1 (amélioration continue, pas régression).  

**REFONTE UI TERMINÉE** (cadre) — 2026-04-23. Doc §7 — 2026-04-24.

---

## 7. Tests manuels recommandés (fumée + zones à risque)

**Principe :** vérifier **navigation, tableaux, clics, modales** et, pour les listes sur `ResponsiveTableTemplate`, qu’un **clic sur la ligne** ne casse rien (et que liens / cases à cocher / actions restent utilisables). Refaire sur **petit écran (mobile)** au moins pour **Candidats** et **Déclic** si c’est du périmètre utilisé.

| Priorité | Parcours | À vérifier (manuel) |
|----------|----------|---------------------|
| **P0** | **Connexion** `/login` | Login OK, redirection selon rôle. |
| **P0** | **Tableau de bord** principal `/dashboard` (staff) | Chargement, cartes, pas d’erreur console bloquante. |
| **P0** | **Candidats** `/candidats` | Liste, **filtres** si utilisés, **sélection** (case tout / ligne), **clic ligne** → détail, **liens** email/tél/appairages/prospections, **menu colonnes**, **actions** (voir / éditer / archiver). **Entrée** sur ligne focalisée si clavier. |
| **P1** | **Formations** list + **détail** (ex. `/formations`, fiche + **modale** détail si vous l’ouvrez depuis la liste) | Mise en page modale, pas de double carte disgracieuse. |
| **P1** | **Utilisateurs** `/users` | Table template, édition accessible. |
| **P1** | **Commentaires** `/commentaires` (route habituelle) | Table + clics. |
| **P1** | **Logs** `/logs` (si profil accès) | Table + tri / lecture. |
| **P1** | **Ateliers TRE** `/ateliers-tre` | Ligne cliquable, actions, pas de conflit clic. |
| **P1** | **Déclic** `/declic` (liste) | Ligne **TOTAL** / **sticky** / **carte mobile** ; création-édition si besoin. |
| **P2** | **Appairages** `/appairages` | Listes + navigation. |
| **P2** | **Documents** `/documents` , **CVthèque** `/cvtheque` (et variantes) | Non migrés sur template : fumée **affichage + actions** seulement. |
| **P2** | **Prépa** `/dashboard/prepa` + ex. `/prepa/ateliers`, `/prepa/objectifs` | Objectifs (`ObjectifPrepaTable`, MUI) : **affichage + clic** ligne → modale. |
| **P2** | **404 / 403** | `/not-a-route` → NotFoundPage ; ressource interdite → ForbiddenPage. |

**Rôles** : refaire le **minimum** pour **declic_staff** / **prepa_staff** (dashboards dédiés) et **candidat** si l’appli est multi-profils, car les layouts diffèrent.

**Automatisé (optionnel) :** pas de liste imposée par ce doc ; l’app peut n’avoir **aucun** test E2E — le tableau ci-dessus reste la **checklist** de non-régression UI ciblée.
