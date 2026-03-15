Voici une TODO priorisée unique, fusionnée à partir de tes 3 audits.

P0 — À corriger avant toute nouvelle fonctionnalité

Corriger FormationViewSet._restrict_to_user_centres
Problème : variable u non définie, comportement illisible et potentiellement cassant sur les formations.
Impact : liste, détail, export, scope staff.
Fichiers probables :

rap_app/api/viewsets/formations_viewsets.py

tests formations associés

Décider du sort d’ExportViewSet
Problème : code présent mais non branché.
Décision à prendre :

soit l’exposer proprement,

soit l’assumer comme non utilisé,

soit le retirer plus tard.
Fichiers probables :

rap_app/api/viewsets/export_viewset.py

rap_app/api/api_urls.py

permissions / scope éventuels

tests d’exports

Sécuriser les erreurs API qui exposent str(e)
Problème : fuite potentielle d’information + incohérence des réponses.
Priorité haute car touche production.
Fichiers probables :

formations_viewsets.py

formation_stats_viewsets.py

autres viewsets avec except Exception

P1 — Important à traiter juste après

Corriger les N+1 sur LogUtilisateur
API + admin.
Fichiers probables :

rap_app/api/viewsets/logs_viewsets.py

rap_app/api/serializers/logs_serializers.py

rap_app/admin/logs_admin.py

Sécuriser candidats_signals.py
Problème : requête en pre_save, couplage fort, risque de régression métier.
Fichiers probables :

rap_app/signals/candidats_signals.py

modèles liés CustomUser, Candidat, Prospection

tests signaux

Sécuriser prospections_signals.py
Problème : user potentiellement None, robustesse du logging.
Fichiers probables :

rap_app/signals/prospections_signals.py

tests signaux prospection

Rendre cohérente la conversion des erreurs modèle → API
Problème : ValueError et ValidationError Django pas toujours gérées proprement côté vues.
Fichiers probables :

candidat.py

candidat_viewsets.py

éventuellement autres viewsets similaires

P2 — Améliorations structurelles à fort gain

Unifier le scope par centre
Aujourd’hui : mixins + méthodes locales + variantes.
Objectif : un mécanisme principal clair.
Fichiers probables :

rap_app/api/mixins.py

rap_app/api/roles.py

viewsets concernés (formations, candidats, prospection, rapports, etc.)

Unifier le format des erreurs API
Objectif : choisir une convention (detail recommandé) et l’appliquer partout.
Fichiers probables :

viewsets avec message / error

documentation projet

Unifier le format des réponses succès
Objectif : réduire la duplication success/message/data.
Fichiers probables :

helpers ou mixin de réponse

viewsets les plus répétitifs

Clarifier GenerateurRapport
Problème : service présent mais non utilisé.
Décision :

brancher,

documenter,

ou assumer dormant.
Fichiers probables :

rap_app/services/generateur_rapports.py

rapports_viewsets.py

éventuelles commands absentes

Alléger les serializers les plus lourds
Cibles principales :

formations_serializers.py

candidat_serializers.py

P3 — Maintenance / lisibilité / documentation

Documenter les conventions du projet
À écrire noir sur blanc :

format succès

format erreurs

validation : modèle vs serializer vs viewset

scope par centre

rôle des signaux

Documenter les permissions par rôle
Tableau :

admin

superadmin

staff

staff_read

candidat

prepa_staff

declic_staff

Clarifier les utils dormants
Cibles :

exporter.py

logging_utils.py

pdf_cerfa_utils.py

cerfa_overlay_debug.py

Renforcer les tests manquants
Priorité :

signaux

services

exports

permissions par rôle

cas limites erreurs

Ordre d’exécution recommandé

formations_viewsets P0

erreurs API exposant str(e)

décision sur ExportViewSet

N+1 logs

signaux candidats

signaux prospections

conversion propre des erreurs modèle → API

unification scope centres

unification erreurs / réponses

clarifications structurelles et docs

Règle de travail

Pour chaque item :

faire un plan de changement avant codage

corriger

lancer tests ciblés

commit

passer au suivant

Le premier prompt à lancer maintenant devrait porter sur :

“Corriger FormationViewSet._restrict_to_user_centres”

Si tu veux, je peux te préparer tout de suite le prompt exact pour ce premier P0.