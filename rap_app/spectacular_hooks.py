"""Hooks drf-spectacular pour ajuster le schéma OpenAPI généré."""

from __future__ import annotations

from copy import deepcopy

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
    _inject_front_contract_metadata(result)
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
    "search": "Recherche texte libre sur les champs métier exposés par l'endpoint.",
    "ordering": "Critère de tri accepté par l'endpoint.",
    "page": "Numéro de page de pagination à demander.",
    "page_size": "Nombre d'éléments attendus par page.",
    "centre": "Filtrer sur le centre métier concerné.",
    "centre_id": "Filtrer sur l'identifiant d'un centre.",
    "departement": "Filtrer sur un département (généralement via les deux premiers chiffres du code postal).",
    "formation": "Filtrer sur une formation donnée.",
    "formation_id": "Filtrer sur l'identifiant d'une formation.",
    "statut": "Filtrer sur le statut métier réellement utilisé par la ressource.",
    "type_offre": "Filtrer sur un type d'offre.",
    "type_offre_id": "Filtrer sur l'identifiant d'un type d'offre.",
    "owner": "Filtrer sur le responsable associé.",
    "created_by": "Filtrer sur le créateur.",
    "date_min": "Inclure uniquement les éléments à partir de cette date (borne minimale).",
    "date_max": "Inclure uniquement les éléments jusqu'à cette date (borne maximale).",
    "date_from": "Inclure uniquement les éléments créés à partir de cette date.",
    "date_to": "Inclure uniquement les éléments créés jusqu'à cette date.",
    "annee": "Filtrer sur une année civile.",
    "scope": "Choisit le périmètre de lecture (`centre` ou `departement`).",
    "est_archive": "Contrôle l'inclusion des éléments archivés (`true`, `false` ou `both`).",
    "avec_archivees": "Inclut aussi les éléments archivés lorsque la ressource le supporte.",
    "archives_seules": "Retourne uniquement les éléments archivés.",
    "include_archived": "Inclut les éléments archivés dans l'export demandé.",
    "limit": "Limite le nombre d'éléments retournés.",
    "by": "Choisit la dimension de regroupement attendue par l'endpoint de statistiques.",
    "grouped": "Active une vue agrégée lorsque l'endpoint le supporte.",
}

FILE_RESPONSE_BY_SUFFIX = {
    "export-pdf/": "application/pdf",
    "download-pdf/": "application/pdf",
    "export-xlsx/": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "export-emargement-xlsx/": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "export-presence-xlsx/": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "download/": "application/octet-stream",
    "export-csv/": "text/csv",
    "export/": "application/octet-stream",
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

            _normalize_file_response(path, operation)
            _ensure_stats_json_response(path, operation)
            _normalize_delete_archive_response(method, operation)
            _annotate_front_usage(result, path, operation)

            if not operation.get("summary"):
                operation["summary"] = _build_summary(method.upper(), path)

            for parameter in operation.get("parameters", []) or []:
                current_description = parameter.get("description") or ""
                if not current_description or current_description.startswith("A unique integer value identifying") or current_description in {
                    "A page number within the paginated result set.",
                    "Number of results to return per page.",
                }:
                    parameter["description"] = _describe_parameter(
                        parameter.get("name", "parametre"),
                        location=parameter.get("in"),
                    )

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


def _describe_parameter(name: str, location: str | None = None) -> str:
    """Retourne une description par défaut pour un paramètre sans description."""
    if location == "path" and name == "id":
        return "Identifiant technique de la ressource ciblée."
    if name in PARAMETER_LABELS:
        return PARAMETER_LABELS[name]
    if name.endswith("_id"):
        label = name[:-3].replace("_", " ")
        return f"Identifiant de {label} utilisé pour filtrer ou cibler la ressource."
    if "__" in name:
        base, lookup = name.rsplit("__", 1)
        base_label = base.replace("_", " ")
        lookup_labels = {
            "icontains": "Recherche partielle insensible à la casse sur",
            "contains": "Recherche partielle sur",
            "exact": "Correspondance exacte sur",
            "gte": "Borne minimale incluse sur",
            "lte": "Borne maximale incluse sur",
            "date": "Date exacte sur",
            "isnull": "Filtre sur la présence ou l'absence de valeur pour",
            "in": "Liste de valeurs autorisées pour",
        }
        if lookup in lookup_labels:
            return f"{lookup_labels[lookup]} {base_label}."
    if name.endswith("__in"):
        base = name[:-4].replace("_", " ")
        return f"Filtrer sur une liste de valeurs pour {base}."
    if name.startswith("is_") or name.startswith("has_"):
        label = name.replace("_", " ")
        return f"Active ou désactive le filtre booléen `{label}`."
    if "date" in name.lower():
        label = name.replace("_", " ")
        return f"Date transmise au format ISO (`YYYY-MM-DD`) pour `{label}`."
    if location == "query":
        label = name.replace("__", " > ").replace("_", " ")
        return f"Paramètre de requête métier pour `{label}`."
    label = name.replace("__", " > ").replace("_", " ")
    return f"Paramètre métier utilisé pour filtrer ou contrôler `{label}`."


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


def _normalize_file_response(path: str, operation: dict) -> None:
    """Force une réponse binaire cohérente pour les endpoints de téléchargement."""
    media_type = None
    for suffix, candidate in FILE_RESPONSE_BY_SUFFIX.items():
        if path.endswith(suffix):
            media_type = candidate
            break

    if media_type is None:
        return

    responses = operation.setdefault("responses", {})
    response_200 = responses.setdefault("200", {"description": "Fichier généré avec succès."})
    response_200["description"] = response_200.get("description") or "Fichier généré avec succès."
    response_200["content"] = {
        media_type: {
            "schema": {
                "type": "string",
                "format": "binary",
            }
        }
    }

    if path.endswith("export/"):
        response_200["content"]["application/pdf"] = {"schema": {"type": "string", "format": "binary"}}
        response_200["content"]["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = {
            "schema": {"type": "string", "format": "binary"}
        }


def _ensure_stats_json_response(path: str, operation: dict) -> None:
    """Remplace les faux `No response body` des endpoints stats par un schéma JSON explicite."""
    if "-stats" not in path:
        return

    responses = operation.setdefault("responses", {})
    response_200 = responses.get("200")
    if response_200 is None:
        responses["200"] = {
            "description": "Réponse JSON de statistiques générée avec succès.",
            "content": {"application/json": {"schema": _stats_schema_for_path(path)}},
        }
        return

    if response_200.get("description") == "No response body" or not response_200.get("content"):
        response_200["description"] = _stats_description_for_path(path)
        response_200["content"] = {"application/json": {"schema": _stats_schema_for_path(path)}}


def _stats_description_for_path(path: str) -> str:
    if path.endswith("/grouped/"):
        return "Agrégats groupés selon la dimension demandée."
    if path.endswith("/latest/"):
        return "Derniers éléments visibles après filtrage."
    if path.endswith("/tops/"):
        return "Classements agrégés calculés à partir du périmètre visible."
    if path.endswith("/filters/") or path.endswith("/filter-options/"):
        return "Valeurs de filtres disponibles pour les statistiques."
    if path.endswith("/resume/") or path.endswith("/synthese/"):
        return "Synthèse statistique calculée pour le périmètre demandé."
    return "Réponse JSON de statistiques générée avec succès."


def _stats_schema_for_path(path: str) -> dict:
    if path.endswith("/grouped/"):
        return {
            "type": "object",
            "properties": {
                "by": {"type": "string"},
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": True,
                    },
                },
                "filters_echo": {
                    "type": "object",
                    "additionalProperties": True,
                },
            },
        }
    if path.endswith("/latest/"):
        return {
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": True,
                    },
                },
                "count": {"type": "integer"},
                "limit": {"type": "integer"},
                "filters_echo": {
                    "type": "object",
                    "additionalProperties": True,
                },
            },
        }
    return {
        "type": "object",
        "additionalProperties": True,
    }


def _normalize_delete_archive_response(method: str, operation: dict) -> None:
    """Corrige les DELETE documentés en 204 alors que le backend renvoie un JSON métier."""
    if method.lower() != "delete":
        return

    responses = operation.get("responses") or {}
    response_204 = responses.get("204")
    if not response_204 or response_204.get("description") != "No response body":
        return

    description = f"{operation.get('summary', '')} {operation.get('description', '')}".lower()
    if not any(keyword in description for keyword in ("archive", "désactive", "desactive", "renvoie", "annuler")):
        return

    responses["200"] = {
        "description": "Réponse JSON confirmant l'archivage logique ou la désactivation demandée.",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "additionalProperties": True,
                }
            }
        },
    }
    del responses["204"]


def _inject_front_contract_metadata(result: dict) -> None:
    """Ajoute au schéma des conventions globales de consommation front."""
    info = result.setdefault("info", {})
    base_description = info.get("description") or ""
    contract_block = (
        "\n\nContrat front global:\n"
        "- enveloppe JSON standard: `{ success, message, data }`\n"
        "- pagination standard: `data = { count, next, previous, results }`\n"
        "- `date` = chaîne ISO `YYYY-MM-DD`\n"
        "- `date-time` = chaîne ISO 8601\n"
        "- `nullable` signifie qu'une valeur `null` est autorisée\n"
        "- `required` et `nullable` doivent être interprétés séparément côté front\n"
        "- les labels d'enum sont des valeurs d'affichage; la valeur contractuelle est la clé stable exposée par l'API\n"
        "- exports: PDF=`application/pdf`, XLSX=`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, CSV=`text/csv`"
    )
    if "Contrat front global:" not in base_description:
        info["description"] = f"{base_description}{contract_block}".strip()

    result["x-frontend-contract"] = {
        "wrapped_response": "{ success, message, data }",
        "paginated_response": "{ count, next, previous, results }",
        "date_format": "YYYY-MM-DD",
        "datetime_format": "ISO 8601",
        "exports": {
            "pdf": "application/pdf",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "csv": "text/csv",
        },
        "typescript_reference": {
            "wrapped_response": "frontend_rap_app/src/types/api.ts#WrappedResponse",
            "paginated_response": "frontend_rap_app/src/types/api.ts#PaginatedResponse",
        },
        "documentation_reference": "docs/API_FRONT_CONTRACT.md",
    }


def _resolve_schema(schema: dict | None, result: dict) -> dict | None:
    """Résout un `$ref` composant simple pour inspection documentaire."""
    if not schema:
        return None
    if "$ref" not in schema:
        return schema
    ref = schema["$ref"]
    prefix = "#/components/schemas/"
    if not ref.startswith(prefix):
        return schema
    component_name = ref[len(prefix) :]
    component = result.get("components", {}).get("schemas", {}).get(component_name)
    if not isinstance(component, dict):
        return schema
    return component


def _annotate_front_usage(result: dict, path: str, operation: dict) -> None:
    """Ajoute des métadonnées légères pour aider la génération front et l'analyse IA."""
    responses = operation.get("responses") or {}
    success_response = responses.get("200") or responses.get("201")
    if not success_response:
        return

    content = success_response.get("content") or {}
    if "application/pdf" in content or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in content or "text/csv" in content:
        operation["x-frontend-response-kind"] = "file"
        return

    json_content = content.get("application/json")
    if not json_content:
        return

    schema = _resolve_schema(json_content.get("schema"), result)
    if not schema:
        return

    props = schema.get("properties") or {}
    if {"success", "message", "data"}.issubset(props.keys()):
        operation["x-frontend-envelope"] = "wrapped"
        data_schema = _resolve_schema(props.get("data"), result)
        data_props = (data_schema or {}).get("properties") or {}
        if {"count", "next", "previous", "results"}.issubset(data_props.keys()):
            operation["x-typescript-response"] = "WrappedResponse<PaginatedResponse<T>>"
        else:
            operation["x-typescript-response"] = "WrappedResponse<T>"
        return

    if "-stats" in path:
        operation["x-frontend-response-kind"] = "stats-json"
