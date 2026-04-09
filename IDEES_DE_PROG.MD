- 📂 Documentation & Socle
Finalisation du README.md : Rédiger la documentation technique et fonctionnelle complète du projet (installation, architecture des services, contrats d'API, et procédures de déploiement).



Je souhaite aussi améliorer la qualité des données en intégrant un mécanisme de correction et de normalisation automatique des textes en français, afin de limiter les fautes de frappe, homogénéiser les saisies et améliorer la qualité globale des informations enregistrées.



Comment organiser les futurs endpoints, statistiques, bulk actions et règles métier pour obtenir une application plus intelligente, plus robuste et plus simple à utiliser.

Revoir les dates dans les form et certains form sont tres lents. et impossible de taper l'année

revoir maj d'un candidat



je veux un systeme de modal coherent apres une action. comme lorsque je cree un atelier tre ou un partenaire...
--------------------------------------------------------------------
je veux une explication de ce que fais chaque module et de ses relations, aussi de ce qui se declenche automatiquement comme les services, signals, ....donc ont lit tous les fichiers pour etre clair
Créé un dossier DOC_APP et mets y les fichiers, par exemple :  Doc_formations, Doc_appairages....

-----------



Possible de recevoir la BDD par email tous les vendredi? pour sauvegarde

Reprendre chaque module un à un et voir qui a le droit de faire quoi(permissions, roles, scope....)

 
verifie que toutes les erreurs ont des messages .verifier que j'ai bien des messages clairs pour chaque erreur de validation dans l'app, pour aider l'utilisateur



 






je veux que tu verifie le fonctionnement complet de mon app dans le shell

mettre les boutton d'imort dans un 'afficher options"


dans mon app, est il possible de creer un acces obsolete de 3 jours, pour qu'une entreprise puisse remplir une partie du cerfa en ligne depuis un form? et que l'acces se coupe automatiquement apres 3 jours?





Refaire les form et les tables
Verifier les scops



verifier si je dois modifier les stats 
-------------------------------------------------------------------------------


Creer des sous dossiers pour les tests pour facilement les tester module par module. par exemple: test formation, ou je regroupe tous les tests liés à la formation:


Gerer les cas ou on efface par erreur une data
----------------------------------------------------------------------
Pour les logs: ajouter plus tard une purge automatique, par exemple :
conserver 12 mois

---------
Intégration d’une IA très légère, locale et strictement limitée aux données de l’application
Objectif



1️⃣ Monitoring toutes les 30 minutes (user)
1️⃣ Monitoring toutes les 30 minutes (user)
3️⃣ Monitoring toutes les 10 minutes (root)


 je vais creer plusieurs app sur le server donc creer un dossier par app


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