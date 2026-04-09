# Configuration de `check_alert.sh` pour la maintenance et les déploiements

Ce document décrit la configuration requise pour que le script de supervision **`check_alert.sh`** fonctionne en production (vérification PostgreSQL, cron, alertes e-mail).

---

## 1. Concept : pourquoi utiliser `.pgpass` ?

Pour **éviter de stocker des mots de passe en clair** dans les scripts ou dans le crontab, l’authentification PostgreSQL repose sur un fichier **`.pgpass`**.

- **Dans le script** : aucun mot de passe ; le script appelle `psql` sans variable `PGPASSWORD`.
- **Dans le crontab** : aucune variable de mot de passe à exporter.
- **Sur le serveur** : un seul fichier (`.pgpass`), protégé par des droits stricts (`chmod 600`), lu automatiquement par les outils PostgreSQL (client `psql`, libpq).

Sans fichier `.pgpass` correctement configuré, la vérification PostgreSQL du script échouera et des alertes « PostgreSQL down » pourront être envoyées à tort.

---

## 2. Format attendu du fichier `.pgpass`

Une ligne par connexion, au format **fixe** suivant :

```text
hostname:port:database:username:password
```

- **hostname** : hôte PostgreSQL (souvent `localhost` ou `*` pour tout hôte).
- **port** : port TCP (souvent `5432`).
- **database** : nom de la base (ex. `rap_app_backend` ou `*` pour toute base).
- **username** : utilisateur PostgreSQL (ex. `abd`).
- **password** : mot de passe en clair (aucun chiffrement côté fichier).

**Exemple** pour la base utilisée par `check_alert.sh` :

```text
localhost:5432:rap_app_backend:abd:VOTRE_MOT_DE_PASSE_ICI
```

**Règles :** les cinq champs sont séparés par des deux-points `:` (obligatoire), sans espace. Si un champ contient `:` ou `\`, l’échapper avec `\`. Une ligne par connexion.

---

## 3. Configuration serveur requise

### 3.1 Emplacement du fichier

- **Recommandé** : **`~/.pgpass`**, c’est-à-dire le fichier `.pgpass` dans le **répertoire home** de l’utilisateur qui exécutera le script.
  - Exemple : pour l’utilisateur `abd`, créer **`/home/abd/.pgpass`**.
- **Personnalisé** : vous pouvez placer le fichier ailleurs (ex. `/srv/rap_app/backend/.pgpass`) et indiquer son chemin via la variable d’environnement **`PGPASSFILE`** (voir section 4). Le fichier ne doit **jamais** être versionné (il est dans `.gitignore`).

### 3.2 Droits obligatoires : `chmod 600`

PostgreSQL **n’utilise pas** le fichier si les permissions sont trop ouvertes. Seule la combinaison **`600`** est acceptée (lecture/écriture pour le propriétaire uniquement).

```bash
chmod 600 /home/abd/.pgpass
```

Sans `600`, `psql` ignore le fichier et la connexion échouera en cron.

### 3.3 Propriétaire du fichier : `chown`

Le fichier doit être **propriété de l’utilisateur** qui exécute le script (et le cron). Sinon, `psql` peut refuser de lire le fichier pour des raisons de sécurité.

```bash
chown abd:abd /home/abd/.pgpass
```

En résumé : **emplacement** (`~/.pgpass` ou chemin + `PGPASSFILE`), **`chmod 600`** et **propriétaire correct** sont indispensables.

---

## 4. Configuration du cron

Le script **doit être exécuté par l’utilisateur qui possède le fichier `.pgpass`** (afin que `$HOME` pointe vers le répertoire contenant `~/.pgpass`).

- **Avec `~/.pgpass`** : configurer le crontab de cet utilisateur (ex. `abd`) :

  ```cron
  */10 * * * * /srv/rap_app/backend/utils/check_alert.sh >> /srv/rap_app/backend/logs/check_alert.log 2>&1
  ```

- **Avec un emplacement personnalisé** : utiliser la variable **`PGPASSFILE`** dans la ligne de cron :

  ```cron
  */10 * * * * PGPASSFILE=/srv/rap_app/backend/.pgpass /srv/rap_app/backend/utils/check_alert.sh >> /srv/rap_app/backend/logs/check_alert.log 2>&1
  ```

Ne pas lancer le script en root si le `.pgpass` est dans le home d’un autre utilisateur ; lancer le script avec l’utilisateur propriétaire du fichier.

---

## 5. Test de validation avant mise en production

Avant de considérer la configuration comme opérationnelle (et avant de compter sur les alertes), vérifier que la connexion PostgreSQL fonctionne **sans mot de passe demandé** :

```bash
psql -U <user> -d <db> -h localhost -c '\q'
```

**Exemple** (utilisateur `abd`, base `rap_app_backend`) :

```bash
psql -U abd -d rap_app_backend -h localhost -c '\q'
```

- Si `.pgpass` est correct (format, emplacement, `chmod 600`, propriétaire), la commande se connecte et quitte sans afficher d’erreur ni demander de mot de passe.
- Si la commande échoue ou demande un mot de passe, corriger le fichier `.pgpass` et les droits avant de mettre en production ou d’activer le cron.

---

## 6. Résumé pour la maintenance et les futurs déploiements

| Étape | Action |
|-------|--------|
| 1 | Créer le fichier `.pgpass` (ex. `/home/abd/.pgpass` ou chemin personnalisé). |
| 2 | Renseigner une ligne au format : `hostname:port:database:username:password`. |
| 3 | Appliquer **`chmod 600`** et **`chown <user>:<user>`** sur le fichier. |
| 4 | Ne jamais committer ce fichier (présent dans `.gitignore` si dans l’arbre du projet). |
| 5 | Tester avec : `psql -U <user> -d <db> -h localhost -c '\q'` avant mise en production. |
| 6 | Configurer le cron sous le même utilisateur (ou avec `PGPASSFILE` si emplacement personnalisé). |

Sans fichier `.pgpass` correctement configuré sur le serveur, le script de supervision ne pourra pas s’authentifier à PostgreSQL et considérera la base comme inaccessible.
