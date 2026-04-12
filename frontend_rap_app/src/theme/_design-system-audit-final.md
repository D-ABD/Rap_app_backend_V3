# Audit design system — reliquat réel (post lots 1–8)

**Date :** 12 avril 2026  
**Périmètre :** `frontend_rap_app/src` — scan ciblé (zones prioritaires + globaux) sans modification de code.  
**Objectif produit :** pouvoir piloter le design global principalement via `theme.ts` / `theme.custom.*`, sans retouches fichier par fichier.

---

## 1. Résumé global

| Indicateur | Valeur |
|------------|--------|
| **Conformité estimée** (vis-à-vis de l’objectif « thème = source principale ») | **~82–88 %** |

**Verdict :** **OK avec reliquat modéré** pour la production.

- Le socle MUI + `theme.custom.*` couvre la majorité des écrans métiers.
- Les écarts restants sont surtout : **écrans d’auth**, **éditeur riche (Quill)**, **couleurs métier/API**, **quelques surfaces `#fafafa` / `#fff` / Material blue** dupliquées, et **3 fichiers** avec `useTheme()` non typé.
- Un **rebranding 100 % piloté uniquement par `theme.ts` sans toucher au code applicatif** reste **partiellement bloqué** par : `AuthProvider`, palette Quill étendue, et tout contenu dont la couleur vient de l’API ou du choix utilisateur (types d’offre, statuts).

---

## 2. Reliquat critique (bloquant pour un rebranding « 100 % thème uniquement »)

Ces éléments imposent encore des **couleurs ou styles en dehors** du flux `theme.custom.*` / overrides MUI, ou une **source parallèle** au thème applicatif.

| Fichier / zone | Nature du reliquat |
|----------------|-------------------|
| `src/contexts/AuthProvider.tsx` | Fond écran login : `#f9f9f9` / `#121212` en dur dans `sx` — impact **global** sur l’écran d’authentification. |
| `src/constants/colors.ts` | Tableau **`STATUT_COLORS`** en hex ; référencé par `createAppCustomTokens` (`dataviz.statut.pickableHex`). Ce n’est pas un bug, mais une **deuxième source** à maintenir si l’on veut un seul fichier « design » côté repo (aujourd’hui : thème **consomme** cette constante). |
| `src/utils/registerQuillFormats.ts` | Nombreux **hex en dur** dans `colorOptions` (gris intermédiaires, rouges, verts, etc.) **en plus** des entrées `getTheme(...).custom.editor.quill.*`. L’éditeur ne peut pas être entièrement recoloré depuis `theme.ts` sans modifier ce fichier. |
| `src/pages/widgets/overviewDashboard/FormationOverviewWidget.tsx` | Label pie Recharts : `fill="#0d47a1"` sur un `<text>` — hors système de thème. |

**Synthèse :** tant que l’auth, Quill et certains SVG Recharts portent des couleurs fixes, un **rebrand visuel total** sans PR applicative reste **incomplet**.

---

## 3. Reliquat modéré (non bloquant production, mais friction rebranding)

| Fichier | Détail |
|---------|--------|
| `src/pages/prepa/PrepaDetailModal.tsx` | `backgroundColor: "#fafafa"` |
| `src/pages/declic/DeclicDetailModal.tsx` | idem `#fafafa` |
| `src/pages/appairage/AppairageDetailModal.tsx` | `#fafafa`, `#ddd`, `#777` (texte / bordures) |
| `src/pages/formations/FormationDetailModal.tsx` | Bleu Material typique `#1976d2`, `rgba(25, 118, 210, 0.04)`, bordure `3px solid #1976d2` |
| `src/pages/cerfa/CerfaDetailModal.tsx` | `style={{ color: "#d32f2f" }}` sur message d’erreur |
| `src/pages/users/MonProfil.tsx` | Lien `style={{ color: "#1976d2" }}` |
| `src/pages/prospection/ProspectionFormCandidat.tsx` | `background: "#fafafa"` sur `Paper` |
| `src/pages/prepa/StagiairesPrepaForm.tsx` | `bgcolor: "#fafafa"` |
| `src/pages/commentaires/CommentaireForm.tsx` | `backgroundColor: "#fff"` |
| `src/pages/prospection/prospectioncomments/ProspectionCommentForm.tsx` | `backgroundColor: "#fff"` |
| `src/pages/commentaires/CommentairesEditPage.tsx` | `backgroundColor: "#fff"` |
| `src/pages/declic/ObjectifDeclicTable.tsx` | Plusieurs `backgroundColor: "#fff"` sur cellules |
| `src/pages/typeOffres/TypeOffresPage.tsx` | Fallback liste : `"#6c757d"` si pas de couleur métier |

**Constat :** même motif **surface papier / gris** répété — remplaçable par `theme.custom.surface.muted`, `theme.custom.form.section`, ou `palette` **sans nouveau token**, mais **fichiers multiples** à aligner pour un rebranding sans recherche globale.

---

## 4. Reliquat optionnel (amélioration DX / cohérence)

| Fichier | Détail |
|---------|--------|
| `src/pages/prospection/prospectioncomments/ProspectionCommentTable.tsx` | `useTheme()` sans `useTheme<AppTheme>()` |
| `src/pages/widgets/overviewDashboard/AteliersTREOverviewWidget.tsx` | idem |
| `src/pages/cerfa/CerfaPage.tsx` | `useTheme()` sur variable `_theme` (inutilisée — dette mineure) |
| `src/App.css` | Hex Vite/React (`#646cff`, `#61dafb`, `#888`) — **fichier typiquement non importé** par `main.tsx` ; risque faible si orphelin, à confirmer dans la config build. |

---

## 5. Exceptions légitimes (ne pas traiter comme « dette design system »)

| Cas | Fichiers / exemples |
|-----|---------------------|
| **Couleurs API / métier** | `TypeOffresPage` / tableaux : `type.couleur`, fallbacks Bootstrap-like ; entités statut / type d’offre en base. |
| **Sélecteurs de couleur admin** | `TypeOffresEditPage.tsx`, `StatutsEditPage.tsx` : état `initialColor`, bordures `black` / `#ccc` pour **UI de picking** ; les valeurs choisies sont **données métier**. |
| **Prévisualisation** | Affichage de chips/couleurs issues du modèle — attendu. |
| **Quill** | Contenu HTML peut contenir n’importe quel hex saisi par l’utilisateur ; la **palette toolbar** est un cas particulier (voir reliquat critique). |
| **`theme.ts` / `createAppCustomTokens.ts`** | Hex et rgba **intentionnels** (fabrique du thème) — **ne pas** compter comme reliquat applicatif. |

---

## 6. Fichiers analysés et validés (pas de reliquat hex / rgba repéré au scan ciblé)

- **Forms prioritaires** : aucun hex dans `ProspectionCommentForm` / `CommentaireForm` / `CommentairesEditPage` **hors** les `#fff` listés en section 3 (donc **partiellement** conformes ; pas « verts » à 100 %).
- **Pages liste** `typeOffres/` et `statuts/` (hors fallbacks et pages édition) : **aucun `#` détecté** sur les fichiers racine listés au grep global (les éditions utilisent pickers — section 5).
- **Composants** : pas d’autre fichier prioritaire exigé par la mission n’a été trouvé totalement exempt de reliquat sans lecture ligne à ligne exhaustive.

*Note :* un grep global sur `#` trouve encore des occurrences dans d’autres écrans non listés dans la mission ; elles n’ont pas été toutes auditées manuellement. Ce document se concentre sur **l’échantillon prioritaire + globaux**.

---

## 7. Actions recommandées (courtes, priorisées)

1. **P1 — AuthProvider** : remplacer les fonds `#f9f9f9` / `#121212` par `theme.palette.background.default` / `theme.custom.*` ou gradient déjà défini dans `layout.shell` (sans nouveau token si réutilisation possible).
2. **P1 — Quill** : réduire `colorOptions` aux seules couleurs exposées dans `theme.custom.editor.quill` **ou** documenter officiellement la palette « étendue » comme exception produit (pas de nouveau token sans décision produit).
3. **P2 — Modales détail + formulaires** : remplacer en masse `#fafafa` / `#fff` par `theme.custom.form.section.paperBackground` / `background.paper` selon le contexte (même lot, faible risque visuel si conservateur).
4. **P2 — FormationDetailModal / MonProfil** : substituer `#1976d2` / rgba par `theme.palette.primary.main` et `alpha(primary.main, 0.04)`.
5. **P3 — Typage** : `useTheme<AppTheme>()` dans `ProspectionCommentTable`, `AteliersTREOverviewWidget` ; nettoyer `CerfaPage` (variable inutilisée).
6. **P3 — FormationOverviewWidget** : `fill` du label Recharts via `theme` (callback ou `useTheme` dans le composant parent et passage en prop).
7. **P4 — App.css** : confirmer absence d’import ; supprimer ou archiver si orphelin pour éviter la confusion.

---

## Décision produit

**Est-ce que le design system est suffisant pour s’arrêter ?**

- **Oui pour l’exploitation** et une évolution continue : le socle est cohérent et majoritairement tokenisé.
- **Non pour l’objectif strict** « un seul endroit (`theme.ts`) pour tout changer sans toucher aux composants » : il reste **auth**, **Quill**, **quelques hex Recharts**, et les **données métier colorées**. Une **phase de consolidation ciblée** (P1–P2 ci-dessus) rapprocherait fortement l’objectif sans refactor global.
