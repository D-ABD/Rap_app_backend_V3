- 📂 Documentation & Socle
Finalisation du README.md : Rédiger la documentation technique et fonctionnelle complète du projet (installation, architecture des services, contrats d'API, et procédures de déploiement).
--------------------------------------------------------------------


Je souhaite aussi améliorer la qualité des données en intégrant un mécanisme de correction et de normalisation automatique des textes en français, afin de limiter les fautes de frappe, homogénéiser les saisies et améliorer la qualité globale des informations enregistrées.
--------------------------------------------------------------------

Comment organiser les futurs endpoints, statistiques, bulk actions et règles métier pour obtenir une application plus intelligente, plus robuste et plus simple à utiliser.
--------------------------------------------------------------------

Revoir les dates dans les form et certains form sont tres lents. et impossible de taper l'année
--------------------------------------------------------------------

je veux une explication de ce que fais chaque module et de ses relations, aussi de ce qui se declenche automatiquement comme les services, signals, ....donc ont lit tous les fichiers pour etre clair
Créé un dossier DOC_APP et mets y les fichiers, par exemple :  Doc_formations, Doc_appairages....
--------------------------------------------------------------------

Possible de recevoir la BDD par email tous les vendredi? pour sauvegarde
--------------------------------------------------------------------

Reprendre chaque module un à un et voir qui a le droit de faire quoi(permissions, roles, scope....)
--------------------------------------------------------------------

 
verifie que toutes les erreurs ont des messages .verifier que j'ai bien des messages clairs pour chaque erreur de validation dans l'app, pour aider l'utilisateur. Faire un audit
--------------------------------------------------------------------


dans mon app, est il possible de creer un acces obsolete de 3 jours, pour qu'une entreprise puisse remplir une partie du cerfa en ligne depuis un form? et que l'acces se coupe automatiquement apres 3 jours?
--------------------------------------------------------------------



verifier si je dois modifier les stats 
--------------------------------------------------------------------


Creer des sous dossiers pour les tests pour facilement les tester module par module. par exemple: test formation, ou je regroupe tous les tests liés à la formation:
--------------------------------------------------------------------

Pour les logs: ajouter plus tard une purge automatique, par exemple :
conserver x mois
--------------------------------------------------------------------



Intégration d’une IA très légère, locale et strictement limitée aux données de l’application
Objectif
--------------------------------------------------------------------



prepa competences. besoin d'identifier les personnes qui passent sur des formations AFPA. KPI..... 
--------------------------------------------------------------------
 
git add .
git commit -m "Ajout presents en formation"
git push origin main


----------------------------------------
----------------------------------------
----------------------------------------


Tu es un expert Django REST Framework, drf-spectacular et architecture API.

MISSION
Ajouter une nouvelle fonctionnalité dans mon backend EXISTANT, en respectant STRICTEMENT :
- l’architecture actuelle
- les conventions de code
- la structure de documentation API
- la cohérence globale du projet

CONTEXTE
- Projet Django/DRF déjà en production
- API documentée avec drf-spectacular / OpenAPI
- Documentation déjà en cours d’uniformisation
- Front React déjà connecté à cette API

OBJECTIF
Ajouter une nouvelle fonctionnalité SANS :
- casser le comportement existant
- casser la documentation
- introduire des incohérences
- dupliquer des patterns existants

CONTRAINTE ABSOLUE
- Ne pas modifier les endpoints existants sauf nécessité critique
- Ne pas changer les serializers existants sans raison
- Ne pas casser les réponses attendues par le front
- Ne pas casser les permissions existantes
- Respecter les patterns déjà en place

MÉTHODE OBLIGATOIRE

ÉTAPE 1 — ANALYSE AVANT CODING
Avant toute modification, tu dois :
1. identifier les modules concernés
2. identifier les ViewSets existants liés
3. identifier les serializers existants
4. identifier les patterns similaires déjà présents
5. identifier comment la doc est structurée pour ces modules

Tu dois EXPLIQUER ton plan avant de coder.

---

ÉTAPE 2 — CONCEPTION PROPRE
Tu dois :
- réutiliser les patterns existants
- éviter de créer une nouvelle logique si une existe déjà
- respecter les conventions du projet :
  - nommage
  - structure
  - permissions
  - filtrage
  - pagination
  - responses

Si une décision d’architecture est nécessaire :
👉 tu dois la justifier

---

ÉTAPE 3 — AJOUT DE LA FEATURE

Tu dois ajouter :
- modèles (si nécessaire)
- serializers
- viewsets ou actions custom
- services (si logique métier complexe)

IMPORTANT
- privilégier actions custom si cohérent avec l’existant
- ne pas créer de nouveaux endpoints inutiles

---

ÉTAPE 4 — DOCUMENTATION OBLIGATOIRE

Chaque nouvel endpoint DOIT respecter ce standard :

1. SUMMARY
→ court, clair, action

2. DESCRIPTION
→ doit expliquer :
- objectif
- intention métier
- comportement
- règles importantes

3. PARAMÈTRES
→ description métier (pas technique)

4. RESPONSE
→ cohérente avec le vrai retour
→ pas de “No response body” si faux

5. CONTENT TYPE
→ correct (JSON, PDF, XLSX…)

---

RÈGLE CRITIQUE

👉 NE PAS copier-coller la doc du ViewSet sur chaque endpoint

Tu dois respecter :

- Doc ViewSet = logique globale
- Doc endpoint = action spécifique

---

ÉTAPE 5 — COHÉRENCE GLOBALE

Après ajout, tu dois vérifier :

- cohérence avec les endpoints existants
- cohérence des noms
- cohérence des réponses
- cohérence des filtres
- cohérence des permissions
- cohérence de la documentation

---

ÉTAPE 6 — VÉRIFICATION FINALE

Tu dois vérifier :

- aucun endpoint existant cassé
- aucune doc incohérente introduite
- aucun “No response body” incorrect
- aucun paramètre non documenté
- aucun content-type incorrect

---

FORMAT DE RÉPONSE ATTENDU

1. ANALYSE
- modules concernés
- choix d’implémentation

2. PLAN
- où tu ajoutes quoi

3. CODE COMPLET
- fichiers modifiés
- code prêt à coller

4. DOCUMENTATION
- docstrings ajoutées propres
- format homogène

5. RISQUES
- ce qui pourrait poser problème

6. TEST RAPIDE
- comment vérifier que tout fonctionne

---

INTERDIT

- ajouter une feature en mode “rapide”
- ignorer la doc
- casser la cohérence API
- créer des endpoints incohérents avec le reste
- introduire des réponses non documentées

---

OBJECTIF FINAL

Pouvoir ajouter des fonctionnalités sans jamais dégrader :
- la qualité de l’API
- la cohérence de la doc
- la stabilité du front

















Tu es un expert senior en React + TypeScript + MUI.

Contexte :
Application SaaS complexe avec une architecture déjà en production.
Un thème global MUI est déjà défini (theme.ts) avec palette, gradients, typography, spacing, dark mode.

Objectif :
Améliorer uniquement le design du fichier fourni pour obtenir un rendu :

* premium (niveau SaaS moderne)
* cohérent avec le thème existant
* responsive (mobile / tablette / desktop)
* parfaitement compatible light mode et dark mode
* plus lisible, plus propre, mieux structuré visuellement

Contraintes STRICTES (à respecter absolument) :

1. Ne PAS modifier :

* la logique métier
* les props des composants
* les types TypeScript
* les hooks (useEffect, useState, custom hooks)
* les appels API (axios, fetch, mutations)
* les fonctions (onSubmit, handlers, callbacks)
* la navigation ou le routing
* la structure des données
* les conditions métier

2. Ne PAS :

* renommer des variables importantes
* supprimer du code fonctionnel
* ajouter de nouvelles dépendances
* modifier les signatures de fonctions

3. Autorisé uniquement :

* amélioration du rendu visuel
* amélioration UX (alignement, lisibilité, hiérarchie)
* utilisation de MUI (`Box`, `Stack`, `Grid`, `Paper`, etc.)
* utilisation de `sx` ou `styled`
* amélioration des espacements et de la structure
* ajout léger de hover, transitions, micro-interactions
* amélioration responsive

4. Utilisation du thème OBLIGATOIRE :

* utiliser `theme.palette`, `theme.spacing`, `theme.typography`
* utiliser les gradients du thème si pertinent
* ne PAS hardcoder des couleurs non issues du thème
* respecter les couleurs light / dark

5. Responsive OBLIGATOIRE :

* utiliser les breakpoints MUI (`xs`, `sm`, `md`, `lg`)
* adapter les layouts pour mobile (stack vertical, spacing ajusté)
* éviter tout overflow horizontal
* garantir une bonne lisibilité sur petits écrans

6. Dark mode OBLIGATOIRE :

* vérifier les contrastes texte / fond
* adapter les backgrounds, borders et hover states
* utiliser uniquement les couleurs du thème

7. Qualité UI attendue :

* cartes modernes (border radius, shadow, hover)
* typographie hiérarchisée
* espacements cohérents
* interface claire et professionnelle
* rendu proche d’un SaaS premium (Linear, Stripe, Notion)

8. Qualité du code :

* code propre, lisible, maintenable
* éviter la duplication
* ne pas surcharger inutilement
* conserver la structure existante autant que possible

Format de réponse attendu :

1. Fournir le fichier COMPLET modifié


Règle finale :
Si une modification peut casser un comportement existant → NE PAS la faire.

Objectif final :
Améliorer drastiquement le design sans aucune régression fonctionnelle.
Inspire-toi d’interfaces SaaS modernes (Linear, Vercel, Stripe)












Tu es un architecte frontend senior spécialisé React + MUI + TypeScript.

Contexte :

* Je veux centraliser tout le design system dans `src/theme/`
* Je veux garder `src/theme.ts` comme façade pour ne pas casser les imports existants
* Objectif : à terme, modifier l’UI uniquement via le thème
* Je veux supprimer progressivement les styles visuels codés en dur dans les layouts, pages et composants
* Je ne veux PAS casser l’application
* Je veux une migration incrémentale, propre, sûre, et réversible

Contraintes impératives :

1. Ne casse aucun import existant
2. Garde `src/theme.ts` à la racine comme façade
3. Crée un dossier `src/theme/`
4. Ne modifie pas la logique métier
5. Ne modifie pas les routes, permissions, hooks métier, appels API
6. Ne change pas le comportement fonctionnel
7. N’effectue pas encore de suppression massive de styles locaux tant que le thème n’est pas prêt
8. Travaille d’abord par audit, ensuite seulement par proposition de structure
9. Tous les commentaires et explications en français
10. Je veux des modifications strictement compatibles avec l’existant

Mission en PHASE 1 : AUDIT EXHAUSTIF

Explore de façon exhaustive le projet frontend pour identifier tous les endroits où le design est défini localement au lieu d’être piloté par le thème.

Tu dois analyser en priorité :

* `src/layout/**`
* `src/pages/**`
* `src/components/**`
* `src/theme.ts`
* `src/**/styles*`
* `src/**/sx*`
* `src/**/navigation*`
* tous les fichiers contenant :

  * `sx={{`
  * `styled(`
  * `alpha(`
  * `theme.palette`
  * `background:`
  * `boxShadow:`
  * `borderRadius:`
  * `backdropFilter:`
  * `linear-gradient`
  * `radial-gradient`
  * `color:`
  * `Mui`

Pour cette phase, je veux :
A. Une cartographie exhaustive des sources de design
B. Une liste des styles déjà bien centralisés dans le thème
C. Une liste des styles encore codés en dur hors du thème
D. Une classification par catégories :

* layout shell
* navigation
* surfaces
* cards
* tables
* formulaires
* dialogs / menus / overlays
* typographie
* états interactifs
* spacing / radius / shadows

E. Une proposition de structure cible pour `src/theme/`
F. Une liste exhaustive des tokens à créer dans le thème pour absorber les styles locaux

Important :

* Ne refactore rien dans cette phase
* Ne modifie aucun fichier existant dans cette phase
* Commence par me rendre un rapport structuré et exhaustif
* Le rapport doit être concret, fichier par fichier quand c’est utile
* Le rapport doit clairement distinguer :

  * “déjà dans le thème”
  * “à migrer dans le thème”
  * “peut rester local”

Mission en PHASE 2 : CRÉATION DE LA STRUCTURE DU THÈME

Une fois l’audit terminé, propose et implémente une structure modulaire sous `src/theme/` avec au minimum :

* `src/theme/index.ts`
* `src/theme/types.ts`
* `src/theme/palette.ts`
* `src/theme/custom.ts`
* `src/theme/typography.ts`
* `src/theme/components.ts`
* `src/theme/shadows.ts`

Et garde `src/theme.ts` comme façade :

* `export { getTheme } from "./theme";`
* `export { default } from "./theme";`

Exigences :

* Extraire le code existant de `theme.ts` sans perte
* Préserver 100% du rendu actuel
* Préserver tous les tokens déjà présents
* Ajouter les nouveaux tokens nécessaires pour les layouts déjà audités
* Ne pas encore forcer tous les composants à les consommer
* Préparer seulement le terrain proprement

Mission en PHASE 3 : PLAN DE MIGRATION INCRÉMENTALE

Après création du dossier `src/theme/`, produis un plan de migration progressif par lots :

* Lot 1 : layouts
* Lot 2 : navigation
* Lot 3 : surfaces communes
* Lot 4 : formulaires
* Lot 5 : tables
* Lot 6 : cards / pages complexes

Pour chaque lot, indique :

* fichiers concernés
* tokens du thème à utiliser
* styles à supprimer localement
* risques éventuels
* ordre recommandé

Rendu attendu :

1. Rapport d’audit exhaustif
2. Structure cible de `src/theme/`
3. Liste exhaustive des tokens à créer
4. Seulement ensuite, si tout est cohérent, patch minimal pour créer le dossier `src/theme/` sans casser les imports
5. Puis plan de migration incrémentale

Important :

* N’invente rien sans vérifier le code
* Explore tout le frontend avant de conclure
* Si un style local est en fait légitime, signale-le comme “local acceptable”
* Si un style local duplique un style déjà présent dans le thème, signale-le comme “duplication”
* Si plusieurs composants utilisent le même style local, propose un token partagé dans le thème

Format de sortie OBLIGATOIRE :

Crée des fichiers dans le projet pour structurer le travail.

1. Audit complet → fichier :
   `src/theme/_audit.md`

Contenu attendu :

* cartographie complète du design actuel
* liste des styles dans les layouts
* styles dans les pages
* styles dans les composants
* classification par catégorie (layout, navigation, cards, tables, forms…)
* distinction :

  * déjà dans le thème
  * à migrer
  * acceptable en local
* duplication détectée
* zones non analysées, s’il y en a

2. Design system cible → fichier :
   `src/theme/_design-system.md`

Contenu attendu :

* structure proposée du dossier `src/theme/`
* liste des fichiers à créer
* organisation des tokens (palette, spacing, radius, shadows, etc.)
* conventions de nommage
* mapping entre styles actuels et futurs tokens

3. Tokens à créer → fichier :
   `src/theme/_tokens.md`

Contenu attendu :

* liste exhaustive des tokens manquants
* format TypeScript
* classification :

  * layout
  * surfaces
  * navigation
  * interactions
  * overlays (menus, dialogs)
* exemples d’usage

4. Plan de migration → fichier :
   `src/theme/_migration-plan.md`

Contenu attendu :

* migration par lots :

  * layouts
  * navigation
  * surfaces
  * forms
  * tables
  * pages
* pour chaque lot :

  * fichiers concernés
  * changements à faire
  * risques
  * ordre recommandé

Contraintes importantes :

* Ne modifie aucun fichier existant pour l’instant
* Ne crée PAS encore les fichiers du thème (`palette.ts`, `components.ts`, etc.)
* Tu es uniquement en phase d’analyse et de planification
* Le rendu doit être exploitable immédiatement

Avant de conclure l’audit :

* liste explicitement les fichiers réellement analysés
* liste explicitement les fichiers non analysés s’il y en a
* signale toute hypothèse ou zone d’incertitude

Quand tous les fichiers markdown sont créés, STOP.
Ne fais aucune modification supplémentaire.



--------------------------------------------------------------------
git add .
git commit -m "UI pass debut lot8 migration plan "
git push origin main


python manage.py test rap_app -v 2

