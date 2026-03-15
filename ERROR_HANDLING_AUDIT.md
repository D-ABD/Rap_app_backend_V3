# Audit de la gestion des erreurs — Rap_App Django

**Date :** Mars 2025  
**Périmètre :** models, serializers, viewsets, services, signals, permissions, utils, admin, urls. Analyse du code réel. Aucune modification de code.

**Conventions :**
- **Constat vérifié** : observé dans le code (fichier / pattern explicite).
- **Suspicion** : déduction plausible à confirmer par test ou revue.
- **Incertain** : information non vérifiable dans le périmètre analysé.

---

# 1. Vue globale de la gestion des erreurs

## 1.1 Stratégie globale

- **API (DRF)** : les vues s’appuient sur les exceptions DRF (`rest_framework.exceptions.ValidationError`, `PermissionDenied`, `NotFound`) et sur des `Response(..., status=...)` explicites pour les cas métier (archivé, export vide, paramètre invalide).
- **Modèles** : validation dans `clean()` via `django.core.exceptions.ValidationError` ; certains modèles lèvent aussi `ValueError` dans des méthodes métier (ex. `CustomUser`, `Candidat.creer_ou_lier_compte_utilisateur`).
- **Serializers** : `serializers.ValidationError` (ou `rest_framework.exceptions.ValidationError`) dans `validate()` et `validate_<field>()` ; un serializer lève `exceptions.PermissionDenied` pour un cas d’authentification (`candidat_serializers.py`).
- **Signaux** : les erreurs sont en général capturées par `except Exception`, loguées (logger.error/warning), et **non propagées** — le flux métier continue sans remonter d’exception à l’appelant.
- **Services** : `generateur_rapports.py` capture `Exception`, logue, retourne `None` — pas de remontée vers l’API.
- **Permissions** : refus via `has_permission` / `has_object_permission` qui renvoient `False`, avec message d’erreur stocké dans `self.message` (utilisé par le framework DRF pour la réponse).

Il n’existe **pas de document ou de convention unique** formalisant le choix entre ValidationError / PermissionDenied / NotFound et le format des réponses d’erreur (clé `detail` vs `message` vs `error`).

## 1.2 Cohérence

- **Points cohérents** : usage systématique de `PermissionDenied` pour les refus d’accès dans les viewsets (prospection, commentaires, partenaires, prepa, appairage, atelier TRE, candidats) avec messages en français. Usage de `ValidationError` dans les serializers pour les validations de champs. Beaucoup de réponses d’erreur utilisent la clé `detail` (alignée avec DRF).
- **Points incohérents** : mélange de clés `detail`, `message`, `error`, et de structures `{"success": False, "message": ...}`. Certains endpoints renvoient `str(e)` (exception technique) dans la réponse. Django `ValidationError` vs DRF `ValidationError` parfois mélangés (notamment lors de la conversion dans les viewsets). Modèles qui lèvent `ValueError` alors que les viewsets ne capturent que `ValidationError`.

## 1.3 Points forts

- Messages d’erreur **explicites** et **en français** pour les refus de permission (périmètre centre, rôle, propriétaire).
- Validations **riches** dans les modèles (`clean()`) et dans les serializers (`validate`, `validate_<field>`).
- Permissions DRF avec **messages** définis (`message = "..."`) pour le refus d’accès.
- Signaux et services qui **n’interrompent pas** le flux principal en cas d’échec de log ou de génération (log + continue ou return None).

## 1.4 Points faibles

- **Format de réponse d’erreur** non unifié : `detail`, `message`, `error`, `success` + `message`.
- **Exposition d’exceptions techniques** : `Response({"message": str(e)}, status=400)` ou `Response({"error": str(e)}, status=500)` dans certaines vues — risque de fuite d’information et réponses non contractuelles.
- **ValueError dans les modèles** non systématiquement convertie en exception DRF dans les viewsets (ex. `Candidat.creer_ou_lier_compte_utilisateur`).
- **Django ValidationError** : utilisation de `e.message` dans des viewsets pour construire une DRF ValidationError — `ValidationError` Django n’a pas toujours l’attribut `message` (selon version/contexte), risque d’erreur ou de message incorrect.
- **Bloc `except Exception`** trop large dans plusieurs viewsets (formations ajout commentaire/événement/document/dupliquer) : toute exception est transformée en 400 avec `str(e)`.
- **Clé "error"** utilisée dans search_viewset et formation_stats_viewsets au lieu de `detail` (usage standard DRF).

---

# 2. Cartographie des erreurs

## 2.1 Models

| Fichier | Type | Contexte | Message / détail |
|--------|------|----------|-------------------|
| **custom_user.py** | ValidationError | clean(), rôle superadmin | "Seul un superuser peut avoir le rôle 'Super administrateur'." |
| **custom_user.py** | ValueError | create_user, create_superuser | email obligatoire, is_staff/is_superuser, rôle invalide |
| **candidat.py** | ValidationError | valider_comme_stagiaire, valider_comme_candidatuser | admissible, compte utilisateur associé |
| **candidat.py** | ValueError | creer_ou_lier_compte_utilisateur | déjà un compte, pas d’email, email déjà existant |
| **formations.py** | ValidationError | clean(), add_commentaire, add_document, add_evenement, add_partenaire | nom vide, dates, partenaire déjà lié, titre/document/description vide |
| **prospection.py** | ValidationError | clean() | centre, date_prospection, commentaire |
| **prospection_comments.py** | ValidationError | clean() | body vide |
| **partenaires.py** | ValidationError | clean() | nom, city si code postal, URL website/social_network |
| **rapports.py** | ValidationError | clean() | champs rapport |
| **statut.py** | ValidationError | clean() | champs statut |
| **types_offre.py** | ValidationError | clean() | champs type offre |
| **documents.py** | ValidationError | clean(), type document, nom_fichier | type reconnu, nom fichier non vide |
| **evenements.py** | ValidationError | clean() | champs événement |
| **centres.py** | ValidationError | clean() | code_postal numérique et longueur |
| **cvtheque.py** | ValidationError | clean() | titre obligatoire |
| **commentaires.py** | ValidationError | clean() | contenu non vide |
| **commentaires_appairage.py** | ValidationError | clean() | body non vide |
| **vae.py** | ValidationError | clean() | mois, statut, référence, dates |
| **jury.py** | ValidationError | clean() | mois |
| **base.py** | ValueError | identifiant | identifiant vide / invalide |

**Constats :** Les modèles centralisent bien les règles de cohérence (clean). En revanche, `ValueError` dans des méthodes métier (CustomUser, Candidat, base) n’est pas une exception DRF : si la vue ne la capture pas explicitement, elle remonte en 500 ou est gérée de façon générique.

## 2.2 Serializers

| Fichier | Type | Contexte | Message / détail |
|--------|------|----------|-------------------|
| **user_profil_serializers.py** | ValidationError | validate_centres, create, update, validate_role | centres introuvables, IDs inexistants, rôle (superadmin/admin, propre rôle) |
| **statut_serializers.py** | ValidationError | validate | champs statut |
| **prospection_serializers.py** | ValidationError | validate_activite, validate_date_*, validate_relance | activité, dates (passé/futur), relance |
| **prospection_comment_serializers.py** | ValidationError | validate | auth, propriétaire prospection, interne, archivage, changement prospection |
| **formations_serializers.py** | ValidationError | validate | champs formation |
| **evenements_serializers.py** | ValidationError | validate | champs événement |
| **documents_serializers.py** | ValidationError | validate (extension/type) | fichier (str(e) de ValidationError Django) |
| **declic_objectifs_serializers.py** | ValidationError | validate | champs objectif |
| **cvtheque_serializers.py** | ValidationError | validate | titre obligatoire, fichier 5 Mo |
| **commentaires_serializers.py** | ValidationError | validate | contenu non vide |
| **candidat_serializers.py** | ValidationError, PermissionDenied | validate (numero_osia, formation), context | numero_osia, formation (staff only), PermissionDenied "Authentification requise." |
| **appairage_serializers.py** | ValidationError | validate_activite, validate_statut, validate | activité, statut (création/modification), doublon candidat/partenaire/formation |
| **prepa_serializers.py** | ValidationError | validate | champs prepa |
| **rapports_serializers.py** | — | create() appelle obj.clean() | propage ValidationError du modèle |

**Constats :** Les serializers couvrent bien les validations de champs et de règles métier (rôles, doublons, tailles). Un seul usage de `PermissionDenied` dans un serializer (candidat) pour l’authentification ; le reste est ValidationError. Dans documents_serializers, `str(e)` sur une ValidationError Django est renvoyé sur le champ `fichier` — message potentiellement technique.

## 2.3 Viewsets

| Fichier | Type | Contexte | Message / détail |
|--------|------|----------|-------------------|
| **formations_viewsets.py** | ValidationError | _ensure_required_refs | "Champs obligatoires manquants: ..." |
| **formations_viewsets.py** | Response 400 | ajouter_commentaire, ajouter_evenement, ajouter_document, dupliquer | except Exception → `{"success": False, "message": str(e)}` |
| **formations_viewsets.py** | Response 400/200 | archiver, desarchiver | "Déjà archivée." / "Déjà active." |
| **candidat_viewsets.py** | PermissionDenied | _assert_staff_can_use_formation | "Formation hors de votre périmètre (centre)." |
| **candidat_viewsets.py** | ValidationError | perform_create, creer_compte, valider_demande_compte, refuser_demande_compte | formation obligatoire, demande en attente, compte déjà lié ; conversion e.message (Django ValidationError) |
| **prospection_viewsets.py** | ValidationError, PermissionDenied | actions | "Seul le staff peut fixer la formation.", "Formation hors de votre périmètre", droits modification formation/owner |
| **prospection_comment_viewsets.py** | PermissionDenied | create, update, destroy | nombreux messages (prospection, périmètre, propriétaire, interne, suppression) |
| **prospection_comment_viewsets.py** | Response 200/204 | archiver, desarchiver, export | "Déjà archivé.", "Aucun commentaire à exporter." |
| **partenaires_viewsets.py** | PermissionDenied | create, update, destroy | centres, périmètre, propriétaire, centre obligatoire |
| **prepa_viewset.py** | PermissionDenied | centre hors périmètre |
| **prepa_objectifs_viewsets.py** | PermissionDenied | centre hors périmètre |
| **prepa_objectifs_viewsets.py** | Response 404 | export | "Aucun objectif à exporter." |
| **commentaires_viewsets.py** | PermissionDenied | _assert_staff_can_use_formation | "Vous n'avez pas accès à cette formation." |
| **commentaires_viewsets.py** | Response 400 | export | "Aucun commentaire sélectionné", "Format non supporté (seuls pdf, xlsx)" |
| **atelier_tre_viewsets.py** | PermissionDenied | centre hors périmètre |
| **atelier_tre_viewsets.py** | Response 400 | set_presences, add_candidats | "Chaque item doit être un objet.", "Item invalide", "Candidats introuvables" |
| **appairage_viewsets.py** | PermissionDenied, ValidationError | create, update | candidats/stagiaires, formation hors périmètre, doublon |
| **appairage_viewsets.py** | Response 400/200 | archiver, desarchiver | "Déjà archivé.", "Cet appairage n'est pas archivé." |
| **appairage_commentaires_viewset.py** | Response 200 | archiver, desarchiver | "Déjà archivé.", "Commentaire archivé.", etc. |
| **me_viewsets.py** | NotFound | profil candidat | "Aucun profil candidat associé à cet utilisateur." |
| **cvtheque_viewset.py** | Response 404 | download, preview | "Aucun fichier associé.", "Fichier introuvable." ; FileNotFoundError → 404 |
| **documents_viewsets.py** | Response 400/404 | actions | "Paramètre 'formation' requis.", "ID de formation invalide.", 404 sur document |
| **declic_objectifs_viewsets.py** | Response 404 | export | "Aucun objectif à exporter." |
| **search_viewset.py** | Response 400 | paramètre manquant | `{"error": "Paramètre 'q' requis"}` |
| **formation_stats_viewsets.py** | Response 400/500 | paramètre 'by', exception | "Paramètre 'by' invalide." ; `{"error": str(e)}, status=500` |
| **Autres stats_viewsets** | Response 400 | paramètre 'by' invalide | "Paramètre 'by' invalide." ou "'by' doit être dans ..." |
| **user_viewsets.py** | ValidationError (catch) | register ou autre | gestion explicite ValidationError ; ValueError/TypeError attrapés ailleurs |

**Constats :** Les refus d’accès sont bien gérés par PermissionDenied avec messages clairs. Les cas métier (déjà archivé, export vide, paramètre manquant) sont souvent gérés par Response avec `detail` ou `message`. Incohérences : usage de `error` au lieu de `detail`, exposition de `str(e)` en 400 ou 500, et conversion fragile de Django ValidationError via `e.message`.

## 2.4 Services

| Fichier | Type | Contexte |
|--------|------|----------|
| **generateur_rapports.py** | Exception (catch) | generer_rapport : except Exception → logger.error, return None. Aucune exception remontée vers l’appelant. |

**Constats :** Pas d’exceptions métier exposées par les services ; échec = log + None. Pas de propagation vers l’API (le service n’est pas appelé par les viewsets dans le périmètre analysé).

## 2.5 Signals

- **types_offres_signals** : except Exception → logger.warning/error ; pas de re-raise.
- **rapports_signals** : except Exception → logger.warning.
- **prospections_signals** : except Exception → logger.warning/error ; get_user peut être None (risque avant usage de username).
- **partenaires_signals** : except (AttributeError, TypeError), Exception → logger.warning/error.
- **logs_signals** : except Exception → logger.error.
- **formations_signals** : except Exception → log.
- **evenements_signals** : except Exception → logger.error.
- **documents_signals** : except Exception → logger.warning/error.
- **commentaire_signals** : except Exception → logger.error.
- **candidats_signals** : except sender.DoesNotExist, IntegrityError, Prospection.DoesNotExist → log ou ignore ; pas de propagation vers l’appelant.
- **appairage_signals** : except TypeError.

**Constats :** Les signaux absorbent les erreurs et ne les remontent pas. Comportement adapté pour ne pas faire échouer une requête à cause d’un log ou d’un effet de bord, mais les erreurs ne sont pas remontées à l’utilisateur.

## 2.6 Permissions

- Toutes les classes dans **permissions.py** définissent un attribut **message** (ex. "Accès refusé.", "Authentification requise.", "Accès réservé au staff..."). DRF utilise ce message pour la réponse 403.
- **Constats :** Messages en français, cohérents avec le rôle de chaque permission. Pas de levée d’exception dans les permissions (retour booléen).

## 2.7 Utils / Admin

- **utils** : `pdf_cerfa_utils.py` lève `FileNotFoundError` (fichier CERFA introuvable) — non capturé dans l’API si appelé depuis une vue.
- **admin** : formations_admin attrape (ValueError, TypeError) dans une action ; pas d’audit exhaustif des autres admins.

---

# 3. Incohérences détectées

## 3.1 CRITIQUE

- **Exposition d’exceptions techniques dans l’API**  
  **Constat vérifié.**  
  - `formations_viewsets.py` (ajouter_commentaire, ajouter_evenement, ajouter_document, dupliquer) : `except Exception as e` → `Response({"success": False, "message": str(e)}, status=400)`. Toute exception (y compris technique, traceback, chemins) peut être renvoyée au client.  
  - `formation_stats_viewsets.py` : `return Response({"error": str(e)}, status=500)`. Message d’exception brute exposé en 500.  
  **Risque :** fuite d’information, messages non adaptés au front, comportement non contractuel.

- **ValueError du modèle non gérée en vue**  
  **Constat vérifié.**  
  - `Candidat.creer_ou_lier_compte_utilisateur()` lève `ValueError` (déjà un compte, pas d’email, email existant).  
  - `candidat_viewsets.valider_demande_compte` ne capture que `ValidationError`. Si le modèle lève `ValueError`, elle remonte et peut produire une 500 ou une réponse d’erreur non maîtrisée.  
  **Fichiers :** `rap_app/models/candidat.py`, `rap_app/api/viewsets/candidat_viewsets.py`.

- **Usage fragile de Django ValidationError dans les vues**  
  **Constat vérifié.**  
  - `candidat_viewsets.py` (creer_compte, valider_demande_compte) : `raise ValidationError({"detail": e.message if hasattr(e, "message") else str(e)})`. Django `ValidationError` peut avoir `message_dict` ou `messages`, pas toujours `message`. Comportement variable selon le contexte de la ValidationError (liste vs dict).  
  **Risque :** AttributeError ou message d’erreur incorrect pour l’utilisateur.

## 3.2 IMPORTANT

- **Clé de réponse d’erreur non standard**  
  **Constat vérifié.**  
  - `search_viewset.py` : `{"error": "Paramètre 'q' requis"}` au lieu de `detail` (standard DRF).  
  - `formation_stats_viewsets.py` : `{"error": str(e)}` en 500.  
  **Impact :** le front ou un client générique qui s’attend à `detail` peut ne pas afficher correctement le message.

- **Bloc except Exception trop large**  
  **Constat vérifié.**  
  - formations_viewsets : quatre actions (ajouter_commentaire, ajouter_evenement, ajouter_document, dupliquer) attrapent toute Exception et renvoient 400 avec `str(e)`. Les erreurs de programmation (AttributeError, KeyError, etc.) sont ainsi présentées comme des erreurs de validation.  
  **Recommandation :** capturer au minimum ValidationError (et éventuellement ValueError) et renvoyer un message métier ; pour le reste, logger et renvoyer un message générique (sans str(e)).

- **Réponses 204 avec body**  
  **Suspicion.**  
  - prospection_comment_viewsets : `return Response({"detail": "Aucun commentaire à exporter."}, status=204)`. HTTP 204 No Content ne doit en principe pas avoir de body ; certains clients peuvent l’ignorer.  
  **Niveau :** mineur pour le fonctionnement, important pour la conformité HTTP.

- **Mélange success/message et detail**  
  **Constat vérifié.**  
  - Certains endpoints renvoient `{"success": False, "message": "..."}` (formations, cvtheque, documents), d’autres `{"detail": "..."}` (majorité des refus et validations). Pas de convention unique documentée.

## 3.3 MINEUR

- **Messages avec emoji** dans partenaires_viewsets (ex. "❌ Vous n'êtes rattaché à aucun centre.") — lisibilité correcte mais hétérogène par rapport au reste.
- **Import local de ValidationError** dans formations_viewsets._ensure_required_refs (`from rest_framework.exceptions import ValidationError` à l’intérieur de la méthode) — pas d’impact sur le comportement, seulement style.
- **FileNotFoundError** dans cvtheque_viewset : correctement converti en Response 404 avec message métier ("Fichier introuvable.").

---

# 4. Couverture des erreurs métier

## 4.1 Validations présentes

- **Champs obligatoires** : formations (_ensure_required_refs), serializers (centre, type_offre, statut, titre, contenu, fichier, etc.), modèles (clean() sur de nombreux champs).
- **Formats / contraintes** : code postal (centres), URL (partenaires), mois 1–12 (vae, jury), type document (documents), extension fichier (documents_serializers), taille fichier 5 Mo (cvtheque), dates (prospection, formation, evenements).
- **Règles métier** : doublon appairage (candidat, partenaire, formation), statut appairage à la création (Transmis), numero_osia (candidat), rôle superadmin (CustomUser), admissible / compte utilisateur (Candidat), partenaire déjà lié à une formation, activité/archivage (prospection, appairage).

## 4.2 Validations manquantes ou à confirmer

- **Candidat.creer_ou_lier_compte_utilisateur** : lève `ValueError` ; la vue ne les convertit pas en ValidationError ni en réponse 400 contrôlée — **manque de couverture côté vue**.
- **Rate limit / validation email** sur register : non audité en détail — **à confirmer**.
- **Contraintes d’unicité** en base : certaines pourraient être vérifiées uniquement en Python (serializer ou modèle) sans contrainte DB — **non vérifié**.
- **Exports vides** : plusieurs endpoints renvoient 204 ou 404 avec un message ; cohérence à vérifier (204 vs 404 pour "aucune donnée à exporter") selon la sémantique souhaitée.

---

# 5. Cohérence API

## 5.1 Format JSON

- **Clés utilisées** : `detail`, `message`, `error`, `success` (avec `message`), `serializer.errors` (DRF standard pour ValidationError).
- **Incohérences** :  
  - Réponses d’erreur avec `detail` (alignées DRF) : majorité des PermissionDenied, ValidationError, et beaucoup de Response manuelles.  
  - Réponses avec `message` seul ou `success` + `message` : formations (actions), cvtheque, documents, me_viewsets.  
  - Réponses avec `error` : search_viewset, formation_stats_viewsets (500).  
- **Recommandation** : standardiser sur `detail` pour le message d’erreur principal (comme DRF) et documenter les rares cas où `success` + `message` sont conservés pour compatibilité.

## 5.2 Statuts HTTP

- **400** : validation (ValidationError, paramètre manquant, état métier invalide). Utilisation cohérente en général ; à noter que certains 400 sont dus à un `except Exception` (formations) et peuvent masquer des 500.
- **403** : PermissionDenied — usage correct.
- **404** : NotFound (me_viewsets), fichier absent (cvtheque), objectif/export vide (declic_objectifs, prepa_objectifs), documents. Usage globalement cohérent.
- **500** : formation_stats_viewsets expose explicitement une erreur serveur avec `str(e)` — à éviter en production pour le message brut.
- **204** : suppression, parfois "aucun commentaire à exporter" (body présent avec 204 — voir §3.2).

## 5.3 Homogénéité entre endpoints

- **Refus d’accès** : homogènes (PermissionDenied + message en français).
- **Validation** : homogènes quand on passe par les serializers ; moins quand on utilise des Response manuelles ou des try/except larges.
- **Erreurs métier** (déjà archivé, export vide, paramètre invalide) : messages clairs mais formats de réponse variables (`detail` vs `message` vs `error`).
- **Erreurs techniques** : pas de politique commune ; certains endpoints exposent `str(e)`, d’autres ne les attrapent pas (risque 500 non formatée).

---

# 6. Recommandations

## 6.1 Règles simples de gestion d’erreur

1. **Ne jamais exposer `str(exception)`** dans une réponse API pour des exceptions techniques (Exception, OSError, etc.). Logger l’exception et renvoyer un message générique (ex. "Une erreur interne s’est produite.") avec statut 500.
2. **Réponses d’erreur API** : utiliser une seule clé principale pour le message utilisateur, de préférence **`detail`** (standard DRF), et la documenter. Réserver `success` + `message` aux réponses de succès si besoin de compatibilité.
3. **Modèles** : pour les méthodes appelées depuis l’API (ex. creer_ou_lier_compte_utilisateur), privilégier **django.core.exceptions.ValidationError** (ou une exception métier dédiée) plutôt que ValueError, afin que les vues puissent les capturer et les convertir en ValidationError DRF avec un message structuré.
4. **Vues** : lors de la capture d’une ValidationError Django, construire la réponse DRF à partir de **message_dict** ou **messages** (selon le type d’instance), pas de l’attribut **message** qui n’est pas garanti.
5. **Éviter `except Exception`** sur toute une action : capturer au minimum ValidationError (et éventuellement ValueError si conservée côté modèle), logger les autres exceptions, et renvoyer une réponse 500 générique sans détail technique.

## 6.2 Bonnes pratiques adaptées au projet

- **Validation des données** : conserver les validations dans les **serializers** (validate, validate_<field>) et dans les **modèles** (clean) ; ne pas dupliquer en vue sauf pour des règles purement "workflow" (ex. état "en attente" pour une action).
- **Refus d’accès** : conserver l’usage de **PermissionDenied** dans les viewsets avec messages explicites (périmètre centre, rôle, propriétaire). Les permissions DRF (classes) restent pour le refus global ; PermissionDenied en vue pour les refus conditionnels (objet, formation, centre).
- **Ressource introuvable** : utiliser **NotFound** (ou get_object_or_404 côté Django si la vue ne passe pas par le ViewSet) pour objet inexistant ou fichier manquant ; éviter 404 pour "aucune donnée à exporter" si le client doit afficher un message spécifique (alors 200 + payload explicite ou 404 avec `detail` selon convention).
- **Erreurs métier (état invalide, déjà archivé, etc.)** : soit **ValidationError** (DRF) avec `detail` ou champs, soit **Response 400** avec **`detail`** pour rester aligné avec le reste de l’API.
- **Signaux et services** : garder le principe actuel (ne pas propager les exceptions vers la requête) ; s’assurer que les messages de log sont suffisants pour le diagnostic sans exposer d’erreur à l’utilisateur.

---

*Fin du rapport d’audit de la gestion des erreurs. Aucune modification de code n’a été appliquée.*
