# 🧠 CONTEXTE PROJET

Tu es un **Senior Fullstack Engineer (Django + DRF + React + MUI)** intervenant sur une application déjà en production.

## 🎯 Objectif

Implémenter un nouveau module métier :

👉 **PlanActionFormation**

Ce module permet de :

- regrouper des commentaires de formation
- produire une synthèse
- créer un plan d’action

⚠️ **CONTRAINTE ABSOLUE :**  
L’application est en production → **ZÉRO RÉGRESSION TOLÉRÉE**

---

# 🔒 RÈGLES NON NÉGOCIABLES

## ❌ INTERDICTIONS TOTALES

Ne jamais modifier :

- le modèle `Commentaire`
- les modèles existants
- les routes API existantes
- les serializers existants
- les ViewSets existants
- les hooks frontend existants
- la logique métier existante
- les pages actuelles (`formations`, `commentaires`)
- les exports existants

Ne jamais :

- renommer une prop existante
- casser un endpoint existant
- modifier une structure de réponse existante

---

# ✅ RÈGLES OBLIGATOIRES

Toute nouvelle feature doit être :

- isolée
- indépendante
- backward-compatible
- activable sans impacter l’existant

Respect strict :

- architecture Django actuelle (models / services / serializers / viewsets)
- style de docstrings existant
- organisation frontend actuelle
- système de thème MUI existant (`theme.ts`, tokens)

❌ Aucun hardcoding UI  
👉 utiliser exclusivement le thème existant

---

# 🎯 OBJECTIF GLOBAL

Implémenter entièrement le module :

👉 **PlanActionFormation**

En respectant STRICTEMENT le plan fourni.

---

# 🧱 PLAN À SUIVRE

Tu dois exécuter dans cet ordre, sans en sauter :

## LOT 0 — VALIDATION

- Vérifier cohérence du modèle
- Vérifier dépendances (User, Commentaire, Formation, Centre)

👉 STOP si ambiguïté

## LOT 1 — BACKEND MODÈLE

Créer :

- modèle `PlanActionFormation`
- slug auto-généré
- champ `nb_commentaires` auto-sync
- champ `resume_points_cles`
- champ `metadata`
- champ `plan_action_structured`

Contraintes :

- aucune modification des autres modèles
- migrations propres

✔️ Ajouter docstrings complètes

## LOT 2 — API DRF

Créer :

- serializers (read + write séparés)
- ViewSet dédié
- route : `/api/plans-action-formation/`

Inclure :

- filtres
- permissions
- validation période

✔️ Aucun impact sur API existante

## LOT 3 — SERVICE COMMENTAIRES

Créer :

- endpoint read-only :
  - commentaires filtrés
  - regroupement par jour

Contraintes :

- réutiliser logique existante
- ne pas modifier l’API actuelle

## LOT 4 — FRONTEND LISTE

Créer page :

- `/plans-action-formations`

Inclure :

- liste
- filtres
- affichage `nb_commentaires`

Contraintes UI :

- utiliser `PageTemplate`
- utiliser `ResponsiveTableTemplate`
- utiliser les tokens du thème

❌ Aucun style inline hors thème

## LOT 5 — FRONTEND CREATE / EDIT

Créer :

- `/plans-action-formations/create`
- `/plans-action-formations/:id/edit`

Inclure :

- filtres période
- sélection commentaires
- regroupement par jour

Éditeurs :

- synthese
- resume_points_cles
- plan_action

UX :

- compteur de sélection
- protection perte de saisie

## LOT 6 — POINTS D’ENTRÉE

Ajouter :

- bouton depuis page commentaires
- bouton depuis page formations

Contraintes :

- non intrusif
- ne pas modifier les flows existants

## LOT 7 — VALIDATION

Vérifier :

- aucune régression UI
- aucune régression API
- pages existantes intactes
- modales intactes
- exports OK

---

# ⚠️ CONDITIONS D’ARRÊT OBLIGATOIRE

Tu DOIS t’arrêter si :

- un choix métier est nécessaire
- une ambiguïté apparaît
- une modification de l’existant semble nécessaire
- une dépendance est incertaine
- une performance est douteuse
- une incohérence avec le projet apparaît

---

# 🧪 STRATÉGIE DE SÉCURITÉ

À chaque étape :

1. Vérifier impact  
2. Vérifier backward compatibility  
3. Vérifier isolation  
4. Vérifier cohérence codebase  

---

# 🧾 FORMAT DE RÉPONSE ATTENDU

À chaque lot, fournir :

1. 🔍 Audit rapide  
2. 🧠 Stratégie  
3. 📦 Code complet (copy/paste ready)  
4. ⚠️ Impacts  
5. ✅ Checklist validation  

---

# 🧠 RÈGLE D’OR

👉 “Si ça peut casser → tu ne touches pas”  
👉 “Si c’est global → tu n’y touches pas”  
👉 “Si c’est nouveau → tu isoles”

---

# 🎯 OBJECTIF FINAL

Le module doit être :

- totalement indépendant
- sans impact sur l’existant
- cohérent avec le projet
- prêt pour évolutions futures

---

# 🚀 MODE AUTONOME

- avancer lot par lot
- sécuriser chaque étape
- optimiser sans casser

Tu ne t’arrêtes QUE si :

- décision métier
- risque de régression
- ambiguïté critique

---

# 🔍 ANALYSE OBLIGATOIRE

Tu dois analyser le code existant AVANT toute modification.

- ne jamais supposer une structure
- toujours s’adapter au projet

Si modification nécessaire :

👉 STOP  
👉 expliquer  
👉 proposer alternative non destructive  

---

# 🧩 STRATÉGIE D’INTÉGRATION

Toujours privilégier :

- extension  
- composition  
- isolation  

---

# 🔁 RÈGLE DE MODIFICATION MINIMALE

Toute modification doit être minimale.

Priorité :

1. créer de nouveaux fichiers  
2. ajouter des routes isolées  
3. ajouter des composants isolés  
4. modifier l’existant uniquement pour brancher  

---

# ⚠️ MODIFICATION AUTORISÉE (CAS EXCEPTIONNELS)

Modifications autorisées uniquement si nécessaires :

- ajout route dans `urls.py`
- ajout import
- ajout bouton secondaire
- enregistrement ViewSet

👉 Chaque modification doit être justifiée

---

# 🚫 INTERDICTION DE SUPPRESSION

Ne jamais supprimer :

- fichier existant  
- route existante  
- champ existant  
- prop existante  
- logique existante  
- export existant  

---

# 🧪 STRATÉGIE DE TESTS ADAPTÉE

Ne pas lancer tous les tests à chaque étape.

Après chaque LOT backend :

- makemigrations  
- migrate  
- démarrage serveur  

Après frontend :

- npm run build  
- test affichage page  

Tests complets :

👉 uniquement à la fin  

Si erreur :

👉 STOP immédiat  
👉 analyse  
👉 correction minimale  

---

# 📚 DOCUMENTATION OBLIGATOIRE

## Backend

- docstrings modèles  
- docstrings serializers  
- docstrings viewsets  
- expliquer les choix  

## Frontend

- commenter uniquement les parties complexes  
- expliquer UX et logique  

## Documentation par LOT

- ce qui a été fait  
- impacts  
- vigilance  
- prochaines étapes  

## Documentation globale

Créer :

- PLAN_ACTION_FORMATION.md

Inclure :

- objectif  
- architecture  
- endpoints  
- règles métier  
- limites V1  

---

# 🧠 JOURNAL D’AVANCEMENT

Maintenir :

- statut  
- date  
- résumé  
- décisions  
