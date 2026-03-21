# Error Handling Inventory

Date: 2026-03-21

## Statut

Ce document sert désormais d'historique de l'audit initial.

Les lots prioritaires identifiés ici ont été traités sur le périmètre front critique :

- commentaires prospection
- commentaires appairage
- appairages
- formations
- documents
- stats critiques
- flux candidat compte / lifecycle
- premiers `error_code` additifs

Les écarts qui peuvent encore subsister sont secondaires ou volontairement laissés pour une future passe de polish, après besoins front réels.

## But

Recenser les écarts réels entre le contrat d'erreur cible et le code actuel, pour lancer des lots de correction sans casse.

## Contrat Cible Rappel

```json
{
  "success": false,
  "message": "Texte réutilisable",
  "data": null,
  "errors": {
    "field": ["..."]
  }
}
```

Tolérances temporaires :

- `errors` peut être absent pour certaines erreurs globales simples
- `error_code` sera additif plus tard

## Base Déjà Solide

Source de vérité actuelle :

- [exception_handler.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/exception_handler.py)
- [mixins.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/mixins.py)
- [base.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/base.py)

Ces trois fichiers permettent déjà d’uniformiser une grande partie des réponses JSON.

## Typologie Des Écarts

### Type A

Réponses legacy en `{"detail": "..."}`

### Type B

Réponses legacy en `{"error": "..."}`

### Type C

Réponses incomplètes :

- `success/message` sans `errors` alors qu’il s’agit d’une validation
- `success/data` sans `message`

### Type D

Retour de `Response(data)` ou `Response(payload)` brut, sans passer par le contrat central

### Type E

Messages métier encore hétérogènes côté services/serializers :

- parfois `detail`
- parfois string simple
- parfois dict par champ

## Matrice Des Écarts

| Domaine | Fichier | Type | Impact front | Priorité | Note |
|---|---|---:|---|---|---|
| Commentaires prospection | [prospection_comment_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/prospection_comment_viewsets.py) | A | Fort | Haute | Archiver/désarchiver renvoie encore `detail` |
| Commentaires appairage | [appairage_commentaires_viewset.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/appairage_commentaires_viewset.py) | A | Fort | Haute | Même pattern que prospection commentaires |
| Appairages | [appairage_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/appairage_viewsets.py) | A | Fort | Haute | Actions d’archivage encore en `detail` |
| Formations | [formations_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/formations_viewsets.py) | A | Fort | Haute | Déjà archivée / déjà active |
| Documents | [documents_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/documents_viewsets.py) | C | Fort | Haute | Variantes `success/message` et succès sans `message` |
| Stats formations | [formation_stats_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/stats_viewsets/formation_stats_viewsets.py) | B | Fort | Haute | Retour 500 en `{"error": str(e)}` |
| Stats candidats | [candidats_stats_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/stats_viewsets/candidats_stats_viewsets.py) | A/D | Moyen | Haute | `detail` et `Response(payload)` |
| Stats appairages | [appairages_stats_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/stats_viewsets/appairages_stats_viewsets.py) | A/D | Moyen | Haute | Contrat mixte |
| Stats commentaires | [prospection_comment_stats_viewset.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/stats_viewsets/prospection_comment_stats_viewset.py) | A/D | Moyen | Haute | Contrat mixte |
| Stats commentaires appairage | [appairage_comment_stats_viewset.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/stats_viewsets/appairage_comment_stats_viewset.py) | A/D | Moyen | Haute | Contrat mixte |
| Atelier TRE | [atelier_tre_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/atelier_tre_viewsets.py) | A | Moyen | Moyenne | Quelques validations custom en `detail` |
| Commentaires formation | [commentaires_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/commentaires_viewsets.py) | A | Moyen | Moyenne | Export custom encore en `detail` |
| Objectifs Prépa/Déclic | [prepa_objectifs_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/prepa_objectifs_viewsets.py), [declic_objectifs_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/declic_objectifs_viewsets.py) | A | Faible | Moyenne | Cas “aucun export” |
| Logs | [logs_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/logs_viewsets.py) | D | Faible | Basse | `Response(data)` brut |
| Utilisateurs | [user_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/user_viewsets.py) | D | Moyen | Moyenne | Quelques sorties brutes encore présentes |
| Prospections stats | [prospection_stats_viewsets.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/stats_viewsets/prospection_stats_viewsets.py) | A/D | Moyen | Moyenne | `detail` sur `by` invalide |

## Messages Métier À Normaliser

Les couches suivantes utilisent encore des formes mixtes :

- [candidate_account_service.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/candidate_account_service.py)
- [candidate_lifecycle_service.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/candidate_lifecycle_service.py)
- [prospection_serializers.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/serializers/prospection_serializers.py)
- [appairage_serializers.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/serializers/appairage_serializers.py)
- [user_profil_serializers.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/serializers/user_profil_serializers.py)

Le besoin principal ici n’est pas seulement le texte, mais la forme :

- erreurs champ
- erreurs globales
- futur `error_code`

## Sous-Lot Recommandé Sans Casse

### Lot 1

Corriger d’abord les endpoints front les plus visibles et les plus simples :

- commentaires prospection
- commentaires appairage
- appairages
- formations

Pourquoi :

- très visibles côté UI
- écarts simples à corriger
- faible risque fonctionnel

### Lot 2

Corriger ensuite :

- documents
- stats front critiques

Pourquoi :

- le front en a besoin
- mais il y a plus de variations de contrat et d’exceptions

### Lot 3

Uniformiser les services et serializers métier.

## Résultat

La recommandation a été exécutée puis étendue.

Le référentiel vivant n'est plus ce document d'inventaire, mais :

- [ERROR_HANDLING_FRONT_REUSE_PLAN.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/ERROR_HANDLING_FRONT_REUSE_PLAN.md)
- [FRONTEND_MASTER_GUIDE.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/FRONTEND_MASTER_GUIDE.md)
