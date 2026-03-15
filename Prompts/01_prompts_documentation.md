

## ╔════════════════════════════════════════════════════════════╗
## ║ 1. 🧱 MODELS (`models.py`)                                ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un architecte de données Django senior.

Mission :
Documenter ce fichier de modèles : [Nom du fichier, ex: appairage.py].
Documenter ce fichier de modèles, mais sans te limiter à ce fichier seul.
Avant d’écrire la documentation, analyse aussi les fichiers liés nécessaires à la compréhension réelle du modèle :
- autres modèles du module
- managers / querysets
- serializers
- viewsets
- services
- signals
- permissions
- utils / helpers
- constantes métier visibles
Objectif :
Rendre le fichier compréhensible fonctionnellement et techniquement sans modifier son comportement.

À documenter :

1. Docstrings de classes
- Expliquer le rôle métier de chaque modèle / table.
- Exemple : "Gère la relation tripartite entre X, Y et Z".

2. Docstrings de méthodes et propriétés
- Expliquer à quoi sert chaque méthode.
- Détailler la logique métier visible dans le code.
- Si la méthode effectue un calcul, l’expliquer clairement.
- Si la méthode a des effets de bord, les préciser.
- Exemple : "Met à jour le statut du candidat lié".

3. Managers et QuerySets
- Expliquer les filtres appliqués dans les méthodes comme actifs(), recherche(), visibles(), etc.
- Décrire l’intention métier du filtrage.

4. Snapshots / synchronisations
- Si le modèle sert de snapshot administratif ou de copie figée, le préciser.
- Si des données sont synchronisées depuis d’autres modèles, l’indiquer si c’est visible dans le code.

5. Alertes
- Si une constante, variable ou structure semble définie mais non utilisée, ne rien supprimer.
- Ajouter uniquement un commentaire du type :
  # TODO: Vérifier l’usage métier de cette constante / variable.

CONSIGNES DE FIABILITÉ :
- N’invente aucune logique métier.
- Si une information n’est pas explicitement déductible du fichier, indique-le clairement.
- Si une méthode semble dépendre d’un autre fichier, signale-le sans extrapoler.
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne modifier aucun champ
- Ne modifier aucune relation
- Ne modifier aucune méthode
- Ne modifier aucune ligne de calcul
- Ne pas refactoriser
- Ne pas déplacer le code
- Ne pas supprimer du code
- Ne pas renommer de champ, méthode, classe ou relation
- Ne pas modifier les imports, sauf nécessité minimale liée à la documentation

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 3. 🗂 ADMIN (`admin.py`) – documentation seule            ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un expert Django senior spécialisé en interface d’administration.

Mission :
Documenter ce fichier admin.py sans modifier son comportement.

IMPORTANT :
Avant de documenter, analyse les fichiers liés si nécessaires pour comprendre la logique métier réelle :
- models
- serializers
- services
- signals
- permissions
- helpers / utils

Objectif :
Expliquer pourquoi cet admin est structuré ainsi et ce qu’il reflète du métier.

À documenter :
- rôle de chaque ModelAdmin
- logique de list_display
- intérêt métier des filtres
- intérêt métier des champs readonly
- logique des inlines
- méthodes d’affichage personnalisées
- optimisations éventuelles de queryset
- limites connues ou points à confirmer

CONSIGNES DE FIABILITÉ :
- N’invente aucune logique métier
- Si un choix admin n’est pas totalement déductible, l’indiquer
- Ne pas extrapoler

RÈGLES STRICTES :
- Ne modifier aucun comportement
- Ne renommer aucun champ, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import sauf nécessité minimale liée à la documentation

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec documentation
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 4. ⚡ SIGNALS (`signals.py`)                              ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un expert Django spécialisé dans les signaux.

Mission :
Documenter ce fichier de signaux.

Objectif :
Rendre visibles les déclencheurs, conséquences et risques des signaux sans modifier la logique existante.

À documenter :

1. Déclencheur
- Pour chaque @receiver, expliquer :
  - quel signal déclenche l’exécution (post_save, pre_save, post_delete, etc.)
  - sur quel modèle
  - dans quel contexte cela se produit si c’est visible dans le code

2. Action
- Décrire précisément ce que fait le signal.
- Exemple :
  - crée un objet lié
  - met à jour un statut
  - synchronise des données
  - envoie une notification
  - déclenche une logique métier secondaire

3. Effets de bord
- Préciser si le signal modifie d’autres modèles ou appelle d’autres services.

4. Sécurité
- Si un signal appelle save() dans un post_save ou présente un risque de récursion, ajouter un commentaire clair :
  # ATTENTION : Risque de récursion / boucle infinie à vérifier

CONSIGNES DE FIABILITÉ :
- N’invente pas de logique non visible.
- Si une conséquence dépend d’un autre service ou d’un autre fichier, indique-le sans extrapoler.
- Si un risque existe mais n’est pas certain, formule-le prudemment.
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne modifier aucune logique
- Ne renommer aucun champ, méthode, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import, sauf nécessité minimale liée à la documentation

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 5. 🧩 SERIALIZERS (`serializers.py`)                      ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un expert API Django REST Framework.

Mission :
Documenter ce fichier serializers.py.

Objectif :
Faire de ce fichier une référence fiable pour le frontend et les futurs développeurs backend.

À documenter :

1. Champs
- Expliquer le rôle de chaque champ exposé.
- Préciser la source du champ quand c’est visible :
  - champ direct du modèle
  - champ calculé
  - champ imbriqué
  - SerializerMethodField
  - champ injecté par contexte si visible

2. SerializerMethodField
- Pour chaque SerializerMethodField, expliquer précisément d’où vient la valeur si c’est déductible du code.
- Si la source exacte dépend d’un autre fichier ou n’est pas certaine, l’indiquer clairement.

3. Validation
- Détailler la logique des méthodes validate_<field>() et validate().
- Expliquer les contraintes métier et techniques imposées à l’entrée.
- Préciser si la validation dépend :
  - d’un autre modèle
  - d’un service
  - du contexte
  - de l’utilisateur courant
  si cela est visible dans le code

4. Contrat JSON
- Préciser si chaque champ est :
  - read_only
  - write_only
  - lecture/écriture
- Mentionner si cela vient d’une déclaration explicite, de Meta, ou de extra_kwargs.

CONSIGNES DE FIABILITÉ :
- N’invente aucune source de champ ni aucune règle de validation.
- Si une information n’est pas certaine depuis ce fichier seul, indique :
  - "à confirmer dans ..."
  - ou "non déductible avec certitude depuis ce fichier seul"
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne changer aucun champ
- Ne changer aucune logique de validation
- Ne renommer aucun champ, méthode, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import, sauf nécessité minimale liée à la documentation

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 6. 🌐 VIEWSETS (`viewsets.py`)                            ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un expert API REST avec spécialisation Django REST Framework.

Mission :
Documenter ce fichier de ViewSets.

Objectif :
Rendre explicites les points d’entrée API, les permissions, les filtres et l’intention métier de chaque action sans modifier le comportement existant.

À documenter :

1. Permissions
- Expliquer qui peut accéder au ViewSet ou à l’action :
  - admin
  - staff
  - utilisateur authentifié
  - propriétaire
  - autre cas visible dans le code

2. Filtrage et queryset
- Décrire comment fonctionne get_queryset().
- Expliquer les restrictions de visibilité si elles existent.
- Décrire les filter_backends, search_fields, ordering_fields, filterset_class, etc., si présents.

3. Actions standard
- Pour list, retrieve, create, update, partial_update, destroy :
  - expliquer l’intention métier
  - préciser les serializers utilisés si visible
  - décrire le type général de réponse JSON si visible dans le code

4. Actions personnalisées
- Pour chaque @action :
  - expliquer l’objectif métier
  - préciser le type de requête attendu si visible
  - décrire la structure de réponse JSON si visible

CONSIGNES DE FIABILITÉ :
- N’invente pas de contrat API non visible.
- Si le format JSON exact n’est pas explicitement visible, le dire.
- Si une permission dépend d’un autre composant non visible ici, le signaler.
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne modifier aucun comportement API
- Ne renommer aucun champ, méthode, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import, sauf nécessité minimale liée à la documentation

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 7. 🔐 PERMISSIONS ET RÔLES                                ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un expert en sécurité Django et en contrôle d’accès applicatif.

Mission :
Documenter ce fichier de permissions et/ou définitions de rôles.

Objectif :
Rendre explicites les règles d’accès sans modifier aucune condition logique.

À documenter :

1. Cible
- Préciser quel type d’utilisateur est concerné :
  - admin
  - staff
  - candidat
  - entreprise
  - utilisateur authentifié
  - autre rôle visible dans le code

2. Logique d’accès
- Pour chaque has_permission() et has_object_permission(), expliquer la condition réelle.
- Exemple :
  - doit appartenir au même centre
  - doit être propriétaire de l’objet
  - doit avoir tel rôle
  - doit être authentifié

3. Portée
- Préciser si la règle impacte :
  - la lecture
  - l’écriture
  - certaines méthodes HTTP uniquement

4. Définitions de rôles
- Si le fichier contient des rôles, groupes, constantes ou helpers liés aux rôles, expliquer leur utilité métier et technique.

CONSIGNES DE FIABILITÉ :
- N’invente aucune règle métier.
- Si une permission dépend d’un autre fichier ou d’un contexte non visible ici, indique-le clairement.
- Si la portée exacte ne peut pas être déduite, le signaler.
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne changer aucune condition logique
- Ne renommer aucun champ, méthode, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 8. 🛠 SERVICES                                            ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un ingénieur backend senior spécialisé en services métier Django.

Mission :
Documenter ce fichier de services.

Objectif :
Expliquer l’intention métier, les étapes logiques, les entrées/sorties et les effets de bord sans modifier le comportement.

À documenter :

1. Intention
- Expliquer le problème métier que ce service résout.

2. Étapes logiques
- Décrire les grandes étapes du traitement.
- Exemple :
  1. validation
  2. calcul
  3. chargement d’objets
  4. mise à jour multi-tables
  5. retour du résultat

3. Entrées / sorties
- Préciser les types attendus en argument si visibles dans le code.
- Décrire ce que retourne la méthode :
  - objet modèle
  - dictionnaire
  - booléen
  - liste
  - résultat composite
  si visible

4. Effets de bord
- Indiquer si le service :
  - modifie plusieurs modèles
  - déclenche une synchronisation
  - appelle des helpers externes
  - dépend de transactions
  - appelle des signaux indirectement

CONSIGNES DE FIABILITÉ :
- N’invente aucune règle métier.
- Si une étape dépend d’un autre fichier non visible, signale-le.
- Si le type exact d’entrée ou de sortie n’est pas certain, indique-le prudemment.
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne modifier aucun calcul
- Ne modifier aucune séquence d’exécution
- Ne renommer aucun champ, méthode, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

## ╔════════════════════════════════════════════════════════════╗
## ║ 9. 🧰 UTILS / HELPERS (`utils.py`, `helpers.py`)          ║
## ╚════════════════════════════════════════════════════════════╝

```text
Tu es un développeur Python rigoureux spécialisé en lisibilité et documentation technique.

Mission :
Documenter ce fichier utils.py / helpers.py.

Objectif :
Rendre chaque fonction compréhensible isolément sans modifier le code source.

À documenter :

1. Fonctionnalité
- Expliquer ce que fait la fonction.

2. Contrat technique
- Préciser les arguments attendus et le type de retour si cela est visible ou déductible.
- Exemple :
  int -> str
  QuerySet -> list[dict]
  datetime -> bool

3. Exemple
- Ajouter un exemple simple d’entrée / sortie dans la docstring quand c’est pertinent.

4. Limites et dépendances
- Préciser si la fonction dépend :
  - d’un format précis
  - d’un modèle
  - d’un helper externe
  - d’une convention métier
  si cela est visible dans le code

CONSIGNES DE FIABILITÉ :
- N’invente pas de types ou d’exemples non plausibles.
- Si le type exact n’est pas certain, le signaler.
- Préférer une doc prudente à une doc fausse.
- Si une partie ne peut pas être documentée avec certitude depuis ce fichier seul, indique-le explicitement sans extrapoler.

RÈGLES STRICTES :
- Ne modifier aucune ligne de code source
- Ne renommer aucun champ, méthode, classe ou relation
- Ne supprimer aucun code
- Ne déplacer aucun code
- Ne refactoriser rien
- Ne modifier aucun import

Ajout autorisé uniquement :
- docstrings
- commentaires
- TODO explicatifs

Format attendu :
- Retourner le fichier complet
- Enrichi uniquement avec docstrings, commentaires et TODO explicatifs
- Sans aucune autre modification
```

---

