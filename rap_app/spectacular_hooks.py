"""Hooks drf-spectacular pour ajuster le schéma OpenAPI généré."""

from __future__ import annotations

from drf_spectacular.plumbing import build_basic_type
from drf_spectacular.types import OpenApiTypes


def preprocess_hook(endpoints):
    """Laisse la liste d'endpoints inchangée avant génération du schéma."""
    return endpoints


def postprocess_hook(result, generator, request, public):
    """Normalise le schéma final sans changer le comportement de l'API.

    Le hook :
    - stabilise certains noms d'enum ;
    - complète les résumés manquants ;
    - complète les descriptions de paramètres et de réponses quand elles sont
      absentes ;
    - normalise les schémas de réponses fichier en `string/binary`.
    """
    # Correction manuelle des noms d'enum
    enum_mappings = {
        "rap_app.Prospection.statut": "StatutEnum",
        "rap_app.Prospection.objectif": "ObjectifEnum",
        "rap_app.Prospection.motif": "MotifEnum",
        "rap_app.Prospection.type_contact": "TypeContactEnum",
        "rap_app.HistoriqueProspection.ancien_statut": "AncienStatutEnum",
        "rap_app.HistoriqueProspection.nouveau_statut": "NouveauStatutEnum",
    }

    schemas = result.get("components", {}).get("schemas", {})

    for schema_name, schema in schemas.items():
        if "properties" in schema:
            for prop_name, prop in schema["properties"].items():
                if "enum" in prop:
                    key = f"rap_app.{schema_name}.{prop_name}"
                    if key in enum_mappings:
                        prop["x-enum-name"] = enum_mappings[key]

    _normalize_binary_schemas(result)
    _complete_operations_metadata(result)

    return result


RESOURCE_LABELS = {
    "appairages": ("les appairages", "un appairage"),
    "appairage-commentaires": ("les commentaires d'appairage", "un commentaire d'appairage"),
    "appairage-commentaire-stats": ("les statistiques des commentaires d'appairage", "une statistique de commentaire d'appairage"),
    "appairage-stats": ("les statistiques d'appairage", "une statistique d'appairage"),
    "ateliers-tre": ("les ateliers TRE", "un atelier TRE"),
    "ateliertre-stats": ("les statistiques ateliers TRE", "une statistique atelier TRE"),
    "candidats": ("les candidats", "un candidat"),
    "candidat-stats": ("les statistiques candidats", "une statistique candidat"),
    "centres": ("les centres", "un centre"),
    "cerfa-contrats": ("les contrats CERFA", "un contrat CERFA"),
    "commentaires": ("les commentaires", "un commentaire"),
    "commentaire-stats": ("les statistiques commentaires", "une statistique commentaire"),
    "cvtheque": ("la CVthèque", "un document CVthèque"),
    "declic": ("les séances Déclic", "une séance Déclic"),
    "declic-stats": ("les statistiques Déclic", "une statistique Déclic"),
    "documents": ("les documents", "un document"),
    "evenements": ("les événements", "un événement"),
    "event-stats": ("les statistiques événements", "une statistique événement"),
    "formations": ("les formations", "une formation"),
    "formation-stats": ("les statistiques formations", "une statistique formation"),
    "logs": ("les logs utilisateurs", "un log utilisateur"),
    "objectifs-declic": ("les objectifs Déclic", "un objectif Déclic"),
    "objectifs-prepa": ("les objectifs Prépa", "un objectif Prépa"),
    "partenaires": ("les partenaires", "un partenaire"),
    "partenaire-stats": ("les statistiques partenaires", "une statistique partenaire"),
    "prepa": ("les séances Prépa", "une séance Prépa"),
    "prepa-stats": ("les statistiques Prépa", "une statistique Prépa"),
    "prospections": ("les prospections", "une prospection"),
    "prospection-commentaires": ("les commentaires de prospection", "un commentaire de prospection"),
    "prospection-comment-stats": ("les statistiques des commentaires de prospection", "une statistique de commentaire de prospection"),
    "prospection-stats": ("les statistiques de prospection", "une statistique de prospection"),
    "rapports": ("les rapports", "un rapport"),
    "statuts": ("les statuts", "un statut"),
    "stagiaire-prepa": ("les stagiaires Prépa", "un stagiaire Prépa"),
    "typeoffres": ("les types d'offre", "un type d'offre"),
    "users": ("les utilisateurs", "un utilisateur"),
}

ACTION_LABELS = {
    "archiver": "Archiver",
    "desarchiver": "Restaurer",
    "choices": "Lister les choix",
    "filters": "Lister les filtres",
    "filtres": "Lister les filtres",
    "meta": "Consulter la méta",
    "export-xlsx": "Exporter au format XLSX",
    "export-csv": "Exporter au format CSV",
    "export-pdf": "Exporter au format PDF",
    "download": "Télécharger",
    "download-pdf": "Télécharger le PDF",
    "generate-pdf": "Générer le PDF",
    "prefill": "Préremplir",
    "historique": "Consulter l'historique",
    "commentaires": "Lister les commentaires liés",
    "documents": "Lister les documents liés",
    "prospections": "Lister les prospections liées",
    "partenaires": "Lister les partenaires liés",
    "liste-simple": "Lister la vue simplifiée",
    "grouped": "Consulter la vue groupée",
    "latest": "Consulter les derniers éléments",
    "tops": "Consulter les tops",
}

PARAMETER_LABELS = {
    "search": "Recherche texte libre.",
    "ordering": "Critère de tri.",
    "page": "Numéro de page de pagination.",
    "page_size": "Taille de page de pagination.",
    "centre": "Filtrer sur un centre.",
    "centre_id": "Filtrer sur l'identifiant d'un centre.",
    "departement": "Filtrer sur un département.",
    "formation": "Filtrer sur une formation.",
    "formation_id": "Filtrer sur l'identifiant d'une formation.",
    "statut": "Filtrer sur un statut.",
    "type_offre": "Filtrer sur un type d'offre.",
    "type_offre_id": "Filtrer sur l'identifiant d'un type d'offre.",
    "owner": "Filtrer sur le responsable associé.",
    "created_by": "Filtrer sur le créateur.",
    "date_min": "Borne minimale de date.",
    "date_max": "Borne maximale de date.",
    "annee": "Filtrer sur une année.",
    "scope": "Choisit le périmètre de lecture (`centre` ou `departement`).",
}


def _normalize_binary_schemas(node):
    """Transforme les schémas `type=binary` invalides en `string/binary`."""
    if isinstance(node, dict):
        if node.get("type") == "binary":
            node["type"] = "string"
            node["format"] = "binary"
        for value in node.values():
            _normalize_binary_schemas(value)
    elif isinstance(node, list):
        for item in node:
            _normalize_binary_schemas(item)


def _complete_operations_metadata(result):
    """Complète les métadonnées OpenAPI manquantes sur les opérations."""
    for path, path_item in result.get("paths", {}).items():
        for method, operation in path_item.items():
            if method.startswith("x-"):
                continue

            if not operation.get("summary"):
                operation["summary"] = _build_summary(method.upper(), path)

            for parameter in operation.get("parameters", []) or []:
                if not parameter.get("description"):
                    parameter["description"] = _describe_parameter(parameter.get("name", "parametre"))

            for code, response in (operation.get("responses") or {}).items():
                if not response.get("description"):
                    response["description"] = _describe_response(method.upper(), code, path, response)


def _build_summary(method: str, path: str) -> str:
    """Construit un résumé générique mais lisible pour une opération."""
    segments = [segment for segment in path.strip("/").split("/") if segment]
    if not segments:
        return f"{method} racine API"

    resource = segments[0]
    detail = any(segment.startswith("{") and segment.endswith("}") for segment in segments)
    action = None
    if detail:
        for segment in segments[2:]:
            if not segment.startswith("{"):
                action = segment
                break
    elif len(segments) > 1:
        action = segments[1]

    plural_label, singular_label = RESOURCE_LABELS.get(resource, (f"les {resource.replace('-', ' ')}", f"un {resource.replace('-', ' ')}"))

    if action:
        action_label = ACTION_LABELS.get(action, action.replace("-", " ").capitalize())
        return f"{action_label} pour {singular_label if detail else plural_label}"

    if method == "GET" and detail:
        return f"Récupérer {singular_label}"
    if method == "GET":
        return f"Lister {plural_label}"
    if method == "POST":
        return f"Créer {singular_label}"
    if method == "PUT":
        return f"Mettre à jour {singular_label}"
    if method == "PATCH":
        return f"Modifier partiellement {singular_label}"
    if method == "DELETE":
        return f"Supprimer {singular_label}"
    return f"{method} {singular_label if detail else plural_label}"


def _describe_parameter(name: str) -> str:
    """Retourne une description par défaut pour un paramètre sans description."""
    if name in PARAMETER_LABELS:
        return PARAMETER_LABELS[name]
    label = name.replace("__", " > ").replace("_", " ")
    return f"Paramètre de filtre ou de contrôle sur {label}."


def _describe_response(method: str, code: str, path: str, response: dict) -> str:
    """Construit une description simple et cohérente pour une réponse."""
    content = response.get("content") or {}
    if any(media_type in content for media_type in ("application/pdf", "text/csv", "application/octet-stream", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")):
        return "Réponse fichier générée avec succès."
    if code == "200":
        return f"Réponse {method} réussie pour `{path}`."
    if code == "201":
        return f"Ressource créée avec succès pour `{path}`."
    if code == "202":
        return f"Traitement accepté pour `{path}`."
    if code == "204":
        return f"Opération réussie sans contenu pour `{path}`."
    if code == "400":
        return "Requête invalide."
    if code == "401":
        return "Authentification requise ou invalide."
    if code == "403":
        return "Accès refusé."
    if code == "404":
        return "Ressource introuvable."
    return f"Réponse HTTP {code} pour `{path}`."
