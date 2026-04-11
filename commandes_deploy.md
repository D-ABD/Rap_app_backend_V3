# Commandes Exploitation VPS

Commandes utiles a executer **sur le VPS** une fois l'application en production.

Contexte :

- serveur : `rap.adserv.fr`
- utilisateur SSH : `abd`
- app : `/srv/apps/rap_app/app`
- venv : `/srv/apps/rap_app/venv`
- frontend public : `/var/www/rap_app_front`
- logs applicatifs : `/srv/apps/rap_app/logs`
- backups : `/srv/backups/rap_app`

---

## Connexion

```bash
ssh abd@147.93.126.119
```

---

## Aller dans le projet

```bash
cd /srv/apps/rap_app/app
pwd
git status
```

---

## Mettre a jour le code

```bash
cd /srv/apps/rap_app/app
git pull origin main
```

Voir le commit courant :

```bash
git rev-parse --short HEAD
git log -1 --oneline
```

---

## Redeployer le backend

```bash
cd /srv/apps/rap_app/app
bash deploy/deploy_backend.sh
```

Sans email auto :

```bash
cd /srv/apps/rap_app/app
SEND_DEPLOY_EMAIL=false bash deploy/deploy_backend.sh
```

Avec check deploy actif explicitement :

```bash
cd /srv/apps/rap_app/app
RUN_DEPLOY_CHECK=true bash deploy/deploy_backend.sh
```

---

## Redeployer le frontend

```bash
cd /srv/apps/rap_app/app
bash deploy/deploy_frontend.sh
```

Sans lint :

```bash
cd /srv/apps/rap_app/app
RUN_LINT=false bash deploy/deploy_frontend.sh
```

Sans email auto :

```bash
cd /srv/apps/rap_app/app
SEND_DEPLOY_EMAIL=false bash deploy/deploy_frontend.sh
```

---

## Redeployer complet

```bash
cd /srv/apps/rap_app/app
git pull origin main
bash deploy/deploy_backend.sh
bash deploy/deploy_frontend.sh
sudo systemctl restart gunicorn_rapapp
sudo systemctl reload nginx
```

---

## Services systemd

Etat :

```bash
sudo systemctl status gunicorn_rapapp --no-pager
sudo systemctl status nginx --no-pager
sudo systemctl status postgresql --no-pager
sudo systemctl status fail2ban --no-pager
sudo systemctl status ssh --no-pager
```

Restart :

```bash
sudo systemctl restart gunicorn_rapapp
sudo systemctl restart nginx
sudo systemctl restart postgresql
sudo systemctl restart fail2ban
sudo systemctl reload ssh
```

Verifier rapidement :

```bash
systemctl is-active gunicorn_rapapp nginx postgresql fail2ban ssh
```

---

## Logs utiles

Gunicorn :

```bash
journalctl -u gunicorn_rapapp -n 100 --no-pager
journalctl -u gunicorn_rapapp -f
```

Nginx :

```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Fail2ban :

```bash
sudo journalctl -u fail2ban -n 100 --no-pager
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

Logs applicatifs locaux :

```bash
ls -lah /srv/apps/rap_app/logs
tail -n 100 /srv/apps/rap_app/logs/backup.log
tail -n 100 /srv/apps/rap_app/logs/daily_report.log
tail -n 100 /srv/apps/rap_app/logs/monitor_http_user.log
tail -n 100 /srv/apps/rap_app/logs/monitor_services_user.log
sudo tail -n 100 /srv/apps/rap_app/logs/monitor_system_root.log
```

---

## Verifications HTTP

Frontend :

```bash
curl -Ik https://rap.adserv.fr
```

API :

```bash
curl -Ik https://rap.adserv.fr/api/
```

Admin :

```bash
curl -Ik https://rap.adserv.fr/admin/
```

DNS :

```bash
dig rap.adserv.fr +short
```

---

## Fichiers et permissions

Verifier les repertoires critiques :

```bash
ls -ld /srv/apps/rap_app
ls -ld /srv/apps/rap_app/app
ls -ld /srv/apps/rap_app/venv
ls -ld /srv/apps/rap_app/logs
ls -ld /srv/apps/rap_app/shared/media
ls -ld /srv/backups/rap_app
ls -ld /var/www/rap_app_front
```

Verifier le service Gunicorn installe :

```bash
grep -E '^User=|^Group=|^WorkingDirectory=|^EnvironmentFile=' /etc/systemd/system/gunicorn_rapapp.service
```

Verifier Nginx :

```bash
sudo nginx -t
sudo sed -n '1,220p' /etc/nginx/sites-available/rap_app.conf
```

---

## Environnement

Voir le `.env` :

```bash
cd /srv/apps/rap_app/app
sed -n '1,220p' .env
```

Modifier le `.env` :

```bash
cd /srv/apps/rap_app/app
nano .env
chmod 600 .env
sudo systemctl restart gunicorn_rapapp
```

Voir `.env.production` frontend :

```bash
cd /srv/apps/rap_app/app/frontend_rap_app
sed -n '1,120p' .env.production
```

---

## Migrations et Django

Verifier les migrations :

```bash
cd /srv/apps/rap_app/app
/srv/apps/rap_app/venv/bin/python manage.py showmigrations
```

Appliquer manuellement si besoin :

```bash
cd /srv/apps/rap_app/app
/srv/apps/rap_app/venv/bin/python manage.py migrate --noinput
```

Check Django :

```bash
cd /srv/apps/rap_app/app
/srv/apps/rap_app/venv/bin/python manage.py check
/srv/apps/rap_app/venv/bin/python manage.py check --deploy
```

Collectstatic manuel :

```bash
cd /srv/apps/rap_app/app
/srv/apps/rap_app/venv/bin/python manage.py collectstatic --noinput
```

---

## Backups

Lancer le backup manuellement :

```bash
/srv/apps/rap_app/app/deploy/backup_rap_app.sh
```

Voir les backups :

```bash
ls -lah /srv/backups/rap_app/db
ls -lah /srv/backups/rap_app/media
```

Voir le cron utilisateur :

```bash
crontab -l
```

---

## Monitoring local

Lancer les checks user :

```bash
/srv/apps/rap_app/app/deploy/monitor_http_user.sh
/srv/apps/rap_app/app/deploy/monitor_services_user.sh
```

Lancer le check root :

```bash
sudo /usr/local/bin/monitor_system_root.sh
```

Voir les crons :

```bash
crontab -l
sudo crontab -l
```

---

## Emails automatiques

Envoyer un rapport quotidien tout de suite :

```bash
/srv/apps/rap_app/app/deploy/send_daily_report.sh
```

Envoyer une notif de deploiement test :

```bash
/srv/apps/rap_app/app/deploy/send_deploy_notification.sh manual-test
```

Envoyer un email manuel :

```bash
cat >/tmp/test_mail.txt <<'EOF'
Test email RAP_APP
EOF
/srv/apps/rap_app/app/deploy/send_email_via_django.sh "Test RAP_APP" /tmp/test_mail.txt
rm -f /tmp/test_mail.txt
```

---

## Pare-feu et SSH

UFW :

```bash
sudo ufw status verbose
sudo ufw status numbered
```

Fail2ban :

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

SSH hardening :

```bash
sudo grep -E '^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf
sudo sshd -t
```

---

## PostgreSQL

Connexion :

```bash
sudo -u postgres psql
```

Lister les bases :

```bash
sudo -u postgres psql -l
```

Verifier le role :

```bash
sudo -u postgres psql -c '\du'
```

Tester un dump manuel :

```bash
PGPASSWORD='TON_MDP_DB' pg_dump -h 127.0.0.1 -p 5432 -U "ABD" -Fc rap_app_backend > /tmp/test.dump
ls -lh /tmp/test.dump
rm -f /tmp/test.dump
```

---

## Ressources serveur

Charge :

```bash
uptime
```

Memoire :

```bash
free -h
```

Disque :

```bash
df -h
df -ih
```

Process utiles :

```bash
ps aux | grep gunicorn
ps aux | grep nginx
ps aux | grep postgres
```

---

## Commandes de diagnostic rapide

Resume prod :

```bash
systemctl is-active gunicorn_rapapp nginx postgresql fail2ban ssh
curl -Ik https://rap.adserv.fr
curl -Ik https://rap.adserv.fr/api/
crontab -l
sudo crontab -l
ls -lah /srv/backups/rap_app/db | tail
ls -lah /srv/backups/rap_app/media | tail
```

---

## Fichiers de reference

```bash
cd /srv/apps/rap_app/app
sed -n '1,220p' deploy/VPS_DEPLOY_REPORT.md
sed -n '1,220p' DEPLOY.md
```
