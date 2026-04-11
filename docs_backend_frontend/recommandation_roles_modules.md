# Recommandation Roles / Modules

Ce document decrit, en texte simple, les acces proposes pour chaque role.

Legende utilisee :

- `Aucun acces`
- `Lecture`
- `Lecture / Ecriture`
- `Admin`

Scopes utilises :

- `Global` : tous centres
- `Perimetre centre` : seulement les centres rattaches a l'utilisateur
- `Perimetre personnel` : seulement ses propres elements

Important :

- ce document sert de base metier
- il pourra ensuite etre transforme en tableau
- quand un role n'ecrit pas dans un module, cela veut dire qu'il peut le consulter si marque `Lecture`, mais pas le modifier

---

## superadmin

Scope : `Global`

### Modules métier principaux

- Dashboard : `Admin`
- Prospections : `Admin`
- Partenaires : `Admin`
- Candidats : `Admin`
- Appairages : `Admin`
- Formations : `Admin`
- Commentaires : `Admin`
- Documents : `Admin`
- Événements : `Admin`
- CVthèque : `Admin`
- CERFA : `Admin`
- Ateliers TRE : `Admin`

### Bloc Prépa

- Prépa IC : `Admin`
- Prépa Ateliers : `Admin`
- Stagiaires Prépa : `Admin`
- Objectifs Prépa : `Admin`
- Stats Prépa : `Lecture`

### Bloc Déclic

- Déclic : `Admin`
- Participants Déclic : `Admin`
- Objectifs Déclic : `Admin`
- Stats Déclic : `Lecture`

### Commentaires secondaires

- Commentaires prospection : `Admin`
- Commentaires appairage : `Admin`

### Référentiels / Paramètres

- Users : `Admin`
- Centres : `Admin`
- Statuts : `Admin`
- Types d’offres : `Admin`
- Rapports : `Admin`
- Logs : `Admin`

### Recherche / utilitaires

- Recherche globale : `Admin`
- Mon profil : `Lecture / Ecriture`
- Health : `Lecture`
- Auth / Register / Login : `Admin`
- Demande de compte candidat : `Admin`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Lecture`
- Candidat stats : `Lecture`
- Partenaire stats : `Lecture`
- Atelier TRE stats : `Lecture`
- Appairage stats : `Lecture`
- Commentaire stats : `Lecture`
- Prospection comment stats : `Lecture`
- Appairage commentaire stats : `Lecture`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Oui`
- Prépa : `Oui`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Oui`
- Appairages : `Oui`
- Candidats : `Oui`
- Ateliers TRE : `Oui`
- CVthèque : `Oui`
- Formations : `Oui`
- Commentaires : `Oui`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Oui`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `A definir`
- VAE : `A definir`

---

## admin

Scope : `Global`

### Modules métier principaux

- Dashboard : `Lecture / Ecriture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Lecture / Ecriture`
- Appairages : `Lecture / Ecriture`
- Formations : `Lecture / Ecriture`
- Commentaires : `Lecture / Ecriture`
- Documents : `Lecture / Ecriture`
- Événements : `Lecture / Ecriture`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Lecture / Ecriture`
- Ateliers TRE : `Lecture / Ecriture`

### Bloc Prépa

- Prépa IC : `Lecture / Ecriture`
- Prépa Ateliers : `Lecture / Ecriture`
- Stagiaires Prépa : `Lecture / Ecriture`
- Objectifs Prépa : `Lecture / Ecriture`
- Stats Prépa : `Lecture`

### Bloc Déclic

- Déclic : `Lecture / Ecriture`
- Participants Déclic : `Lecture / Ecriture`
- Objectifs Déclic : `Lecture / Ecriture`
- Stats Déclic : `Lecture`

### Commentaires secondaires

- Commentaires prospection : `Lecture / Ecriture`
- Commentaires appairage : `Lecture / Ecriture`

### Référentiels / Paramètres

- Users : `Admin`
- Centres : `Admin`
- Statuts : `Admin`
- Types d’offres : `Admin`
- Rapports : `Admin`
- Logs : `Lecture`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Lecture`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Lecture`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Lecture`
- Candidat stats : `Lecture`
- Partenaire stats : `Lecture`
- Atelier TRE stats : `Lecture`
- Appairage stats : `Lecture`
- Commentaire stats : `Lecture`
- Prospection comment stats : `Lecture`
- Appairage commentaire stats : `Lecture`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Oui`
- Prépa : `Oui`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Oui`
- Appairages : `Oui`
- Candidats : `Oui`
- Ateliers TRE : `Oui`
- CVthèque : `Oui`
- Formations : `Oui`
- Commentaires : `Oui`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Oui`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `A definir`
- VAE : `A definir`

---

## commercial

Scope : `Perimetre centre`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Lecture / Ecriture`
- Appairages : `Lecture / Ecriture`
- Formations : `Lecture`
- Commentaires : `Lecture`
- Documents : `Lecture`
- Événements : `Lecture / Ecriture`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Lecture / Ecriture`
- Ateliers TRE : `Lecture / Ecriture`

### Bloc Prépa

- Prépa IC : `Aucun acces`
- Prépa Ateliers : `Aucun acces`
- Stagiaires Prépa : `Aucun acces`
- Objectifs Prépa : `Aucun acces`
- Stats Prépa : `Aucun acces`

### Bloc Déclic

- Déclic : `Aucun acces`
- Participants Déclic : `Aucun acces`
- Objectifs Déclic : `Aucun acces`
- Stats Déclic : `Aucun acces`

### Commentaires secondaires

- Commentaires prospection : `Lecture / Ecriture`
- Commentaires appairage : `Lecture / Ecriture`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Aucun acces`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Lecture`
- Candidat stats : `Lecture`
- Partenaire stats : `Lecture`
- Atelier TRE stats : `Lecture`
- Appairage stats : `Lecture`
- Commentaire stats : `Aucun acces`
- Prospection comment stats : `Lecture`
- Appairage commentaire stats : `Lecture`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Non`
- Prépa : `Non`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Oui`
- Appairages : `Oui`
- Candidats : `Oui`
- Ateliers TRE : `Oui`
- CVthèque : `Oui`
- Formations : `Oui`
- Commentaires : `Oui`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

---

## charge_recrutement

Scope : `Perimetre centre`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Lecture / Ecriture`
- Appairages : `Lecture / Ecriture`
- Formations : `Lecture`
- Commentaires : `Lecture / Ecriture`
- Documents : `Lecture / Ecriture`
- Événements : `Lecture / Ecriture`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Lecture / Ecriture`
- Ateliers TRE : `Lecture / Ecriture`

### Bloc Prépa

- Prépa IC : `Aucun acces`
- Prépa Ateliers : `Aucun acces`
- Stagiaires Prépa : `Aucun acces`
- Objectifs Prépa : `Aucun acces`
- Stats Prépa : `Aucun acces`

### Bloc Déclic

- Déclic : `Aucun acces`
- Participants Déclic : `Aucun acces`
- Objectifs Déclic : `Aucun acces`
- Stats Déclic : `Aucun acces`

### Commentaires secondaires

- Commentaires prospection : `Lecture / Ecriture`
- Commentaires appairage : `Lecture / Ecriture`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Aucun acces`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Lecture`
- Candidat stats : `Lecture`
- Partenaire stats : `Lecture`
- Atelier TRE stats : `Lecture`
- Appairage stats : `Lecture`
- Commentaire stats : `Lecture`
- Prospection comment stats : `Lecture`
- Appairage commentaire stats : `Lecture`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Non`
- Prépa : `Non`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Oui`
- Appairages : `Oui`
- Candidats : `Oui`
- Ateliers TRE : `Oui`
- CVthèque : `Oui`
- Formations : `Oui`
- Commentaires : `Oui`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

Note :

- si un charge de recrutement doit exceptionnellement ecrire dans `Formations`, tu peux temporairement lui attribuer le role `staff`

---

## staff

Scope : `Perimetre centre`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Lecture / Ecriture`
- Appairages : `Lecture / Ecriture`
- Formations : `Lecture / Ecriture`
- Commentaires : `Lecture / Ecriture`
- Documents : `Lecture / Ecriture`
- Événements : `Lecture / Ecriture`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Lecture / Ecriture`
- Ateliers TRE : `Lecture / Ecriture`

### Bloc Prépa

- Prépa IC : `Lecture / Ecriture`
- Prépa Ateliers : `Lecture / Ecriture`
- Stagiaires Prépa : `Lecture / Ecriture`
- Objectifs Prépa : `Lecture / Ecriture`
- Stats Prépa : `Lecture`

### Bloc Déclic

- Déclic : `Lecture / Ecriture`
- Participants Déclic : `Lecture / Ecriture`
- Objectifs Déclic : `Lecture / Ecriture`
- Stats Déclic : `Lecture`

### Commentaires secondaires

- Commentaires prospection : `Lecture / Ecriture`
- Commentaires appairage : `Lecture / Ecriture`

### Référentiels / Paramètres

- Users : `Lecture`
- Centres : `Lecture`
- Statuts : `Lecture`
- Types d’offres : `Lecture`
- Rapports : `Lecture`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Aucun acces`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Lecture`
- Candidat stats : `Lecture`
- Partenaire stats : `Lecture`
- Atelier TRE stats : `Lecture`
- Appairage stats : `Lecture`
- Commentaire stats : `Lecture`
- Prospection comment stats : `Lecture`
- Appairage commentaire stats : `Lecture`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Oui`
- Prépa : `Oui`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Oui`
- Appairages : `Oui`
- Candidats : `Oui`
- Ateliers TRE : `Oui`
- CVthèque : `Oui`
- Formations : `Oui`
- Commentaires : `Oui`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Oui`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `A definir`
- VAE : `A definir`

---

## staff_read

Scope : `Perimetre centre`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture`
- Partenaires : `Lecture`
- Candidats : `Lecture`
- Appairages : `Lecture`
- Formations : `Lecture`
- Commentaires : `Lecture`
- Documents : `Lecture`
- Événements : `Lecture`
- CVthèque : `Lecture`
- CERFA : `Lecture`
- Ateliers TRE : `Lecture`

### Bloc Prépa

- Prépa IC : `Lecture`
- Prépa Ateliers : `Lecture`
- Stagiaires Prépa : `Lecture`
- Objectifs Prépa : `Lecture`
- Stats Prépa : `Lecture`

### Bloc Déclic

- Déclic : `Lecture`
- Participants Déclic : `Lecture`
- Objectifs Déclic : `Lecture`
- Stats Déclic : `Lecture`

### Commentaires secondaires

- Commentaires prospection : `Lecture`
- Commentaires appairage : `Lecture`

### Référentiels / Paramètres

- Users : `Lecture`
- Centres : `Lecture`
- Statuts : `Lecture`
- Types d’offres : `Lecture`
- Rapports : `Lecture`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Aucun acces`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Lecture`
- Candidat stats : `Lecture`
- Partenaire stats : `Lecture`
- Atelier TRE stats : `Lecture`
- Appairage stats : `Lecture`
- Commentaire stats : `Lecture`
- Prospection comment stats : `Lecture`
- Appairage commentaire stats : `Lecture`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Oui`
- Prépa : `Oui`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Oui`
- Appairages : `Oui`
- Candidats : `Oui`
- Ateliers TRE : `Oui`
- CVthèque : `Oui`
- Formations : `Oui`
- Commentaires : `Oui`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Oui`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `A definir`
- VAE : `A definir`

---

## prepa_staff

Scope : `Perimetre centre`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Aucun acces`
- Partenaires : `Aucun acces`
- Candidats : `Aucun acces`
- Appairages : `Aucun acces`
- Formations : `Lecture`
- Commentaires : `Aucun acces`
- Documents : `Lecture`
- Événements : `Lecture`
- CVthèque : `Aucun acces`
- CERFA : `Aucun acces`
- Ateliers TRE : `Aucun acces`

### Bloc Prépa

- Prépa IC : `Lecture / Ecriture`
- Prépa Ateliers : `Lecture / Ecriture`
- Stagiaires Prépa : `Lecture / Ecriture`
- Objectifs Prépa : `Lecture / Ecriture`
- Stats Prépa : `Lecture`

### Bloc Déclic

- Déclic : `Aucun acces`
- Participants Déclic : `Aucun acces`
- Objectifs Déclic : `Aucun acces`
- Stats Déclic : `Aucun acces`

### Commentaires secondaires

- Commentaires prospection : `Aucun acces`
- Commentaires appairage : `Aucun acces`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Aucun acces`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Aucun acces`
- Candidat stats : `Aucun acces`
- Partenaire stats : `Aucun acces`
- Atelier TRE stats : `Aucun acces`
- Appairage stats : `Aucun acces`
- Commentaire stats : `Aucun acces`
- Prospection comment stats : `Aucun acces`
- Appairage commentaire stats : `Aucun acces`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Non`
- Prépa : `Oui`
- Prospections : `Non`
- Partenaires : `Non`
- CERFA : `Non`
- Appairages : `Non`
- Candidats : `Non`
- Ateliers TRE : `Non`
- CVthèque : `Non`
- Formations : `Oui`
- Commentaires : `Non`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

---

## declic_staff

Scope : `Perimetre centre`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Aucun acces`
- Partenaires : `Aucun acces`
- Candidats : `Aucun acces`
- Appairages : `Aucun acces`
- Formations : `Lecture`
- Commentaires : `Aucun acces`
- Documents : `Lecture`
- Événements : `Lecture`
- CVthèque : `Aucun acces`
- CERFA : `Aucun acces`
- Ateliers TRE : `Aucun acces`

### Bloc Prépa

- Prépa IC : `Aucun acces`
- Prépa Ateliers : `Aucun acces`
- Stagiaires Prépa : `Aucun acces`
- Objectifs Prépa : `Aucun acces`
- Stats Prépa : `Aucun acces`

### Bloc Déclic

- Déclic : `Lecture / Ecriture`
- Participants Déclic : `Lecture / Ecriture`
- Objectifs Déclic : `Lecture / Ecriture`
- Stats Déclic : `Lecture`

### Commentaires secondaires

- Commentaires prospection : `Aucun acces`
- Commentaires appairage : `Aucun acces`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Lecture`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Aucun acces`

### Stats / dashboards dédiés

- Formation stats : `Lecture`
- Événement stats : `Lecture`
- Prospection stats : `Aucun acces`
- Candidat stats : `Aucun acces`
- Partenaire stats : `Aucun acces`
- Atelier TRE stats : `Aucun acces`
- Appairage stats : `Aucun acces`
- Commentaire stats : `Aucun acces`
- Prospection comment stats : `Aucun acces`
- Appairage commentaire stats : `Aucun acces`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Oui`
- Prépa : `Non`
- Prospections : `Non`
- Partenaires : `Non`
- CERFA : `Non`
- Appairages : `Non`
- Candidats : `Non`
- Ateliers TRE : `Non`
- CVthèque : `Non`
- Formations : `Oui`
- Commentaires : `Non`
- Documents : `Oui`
- Événements : `Oui`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

---

## stagiaire

Scope : `Perimetre personnel`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Aucun acces`
- Appairages : `Aucun acces`
- Formations : `Aucun acces`
- Commentaires : `Aucun acces`
- Documents : `Aucun acces`
- Événements : `Aucun acces`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Aucun acces`
- Ateliers TRE : `Aucun acces`

### Bloc Prépa

- Prépa IC : `Aucun acces`
- Prépa Ateliers : `Aucun acces`
- Stagiaires Prépa : `Aucun acces`
- Objectifs Prépa : `Aucun acces`
- Stats Prépa : `Aucun acces`

### Bloc Déclic

- Déclic : `Aucun acces`
- Participants Déclic : `Aucun acces`
- Objectifs Déclic : `Aucun acces`
- Stats Déclic : `Aucun acces`

### Commentaires secondaires

- Commentaires prospection : `Aucun acces`
- Commentaires appairage : `Aucun acces`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Aucun acces`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Lecture`

### Stats / dashboards dédiés

- Formation stats : `Aucun acces`
- Événement stats : `Aucun acces`
- Prospection stats : `Aucun acces`
- Candidat stats : `Aucun acces`
- Partenaire stats : `Aucun acces`
- Atelier TRE stats : `Aucun acces`
- Appairage stats : `Aucun acces`
- Commentaire stats : `Aucun acces`
- Prospection comment stats : `Aucun acces`
- Appairage commentaire stats : `Aucun acces`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Non`
- Prépa : `Non`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Non`
- Appairages : `Non`
- Candidats : `Non`
- Ateliers TRE : `Non`
- CVthèque : `Oui`
- Formations : `Non`
- Commentaires : `Non`
- Documents : `Non`
- Événements : `Non`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

---

## candidat

Scope : `Perimetre personnel`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Aucun acces`
- Appairages : `Aucun acces`
- Formations : `Aucun acces`
- Commentaires : `Aucun acces`
- Documents : `Aucun acces`
- Événements : `Aucun acces`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Aucun acces`
- Ateliers TRE : `Aucun acces`

### Bloc Prépa

- Prépa IC : `Aucun acces`
- Prépa Ateliers : `Aucun acces`
- Stagiaires Prépa : `Aucun acces`
- Objectifs Prépa : `Aucun acces`
- Stats Prépa : `Aucun acces`

### Bloc Déclic

- Déclic : `Aucun acces`
- Participants Déclic : `Aucun acces`
- Objectifs Déclic : `Aucun acces`
- Stats Déclic : `Aucun acces`

### Commentaires secondaires

- Commentaires prospection : `Aucun acces`
- Commentaires appairage : `Aucun acces`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Aucun acces`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Lecture`

### Stats / dashboards dédiés

- Formation stats : `Aucun acces`
- Événement stats : `Aucun acces`
- Prospection stats : `Aucun acces`
- Candidat stats : `Aucun acces`
- Partenaire stats : `Aucun acces`
- Atelier TRE stats : `Aucun acces`
- Appairage stats : `Aucun acces`
- Commentaire stats : `Aucun acces`
- Prospection comment stats : `Aucun acces`
- Appairage commentaire stats : `Aucun acces`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Non`
- Prépa : `Non`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Non`
- Appairages : `Non`
- Candidats : `Non`
- Ateliers TRE : `Non`
- CVthèque : `Oui`
- Formations : `Non`
- Commentaires : `Non`
- Documents : `Non`
- Événements : `Non`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

---

## candidatuser

Scope : `Perimetre personnel`

### Modules métier principaux

- Dashboard : `Lecture`
- Prospections : `Lecture / Ecriture`
- Partenaires : `Lecture / Ecriture`
- Candidats : `Aucun acces`
- Appairages : `Aucun acces`
- Formations : `Aucun acces`
- Commentaires : `Aucun acces`
- Documents : `Aucun acces`
- Événements : `Aucun acces`
- CVthèque : `Lecture / Ecriture`
- CERFA : `Aucun acces`
- Ateliers TRE : `Aucun acces`

### Bloc Prépa

- Prépa IC : `Aucun acces`
- Prépa Ateliers : `Aucun acces`
- Stagiaires Prépa : `Aucun acces`
- Objectifs Prépa : `Aucun acces`
- Stats Prépa : `Aucun acces`

### Bloc Déclic

- Déclic : `Aucun acces`
- Participants Déclic : `Aucun acces`
- Objectifs Déclic : `Aucun acces`
- Stats Déclic : `Aucun acces`

### Commentaires secondaires

- Commentaires prospection : `Aucun acces`
- Commentaires appairage : `Aucun acces`

### Référentiels / Paramètres

- Users : `Aucun acces`
- Centres : `Aucun acces`
- Statuts : `Aucun acces`
- Types d’offres : `Aucun acces`
- Rapports : `Aucun acces`
- Logs : `Aucun acces`

### Recherche / utilitaires

- Recherche globale : `Aucun acces`
- Mon profil : `Lecture / Ecriture`
- Health : `Aucun acces`
- Auth / Register / Login : `Lecture`
- Demande de compte candidat : `Lecture`

### Stats / dashboards dédiés

- Formation stats : `Aucun acces`
- Événement stats : `Aucun acces`
- Prospection stats : `Aucun acces`
- Candidat stats : `Aucun acces`
- Partenaire stats : `Aucun acces`
- Atelier TRE stats : `Aucun acces`
- Appairage stats : `Aucun acces`
- Commentaire stats : `Aucun acces`
- Prospection comment stats : `Aucun acces`
- Appairage commentaire stats : `Aucun acces`

### Modules visibles côté layouts/navigation

- Dashboard : `Oui`
- Déclic : `Non`
- Prépa : `Non`
- Prospections : `Oui`
- Partenaires : `Oui`
- CERFA : `Non`
- Appairages : `Non`
- Candidats : `Non`
- Ateliers TRE : `Non`
- CVthèque : `Oui`
- Formations : `Non`
- Commentaires : `Non`
- Documents : `Non`
- Événements : `Non`
- Paramètres : `Non`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `Aucun acces`
- VAE : `Aucun acces`

---

## test

Scope : `A definir`

### Modules métier principaux

- Dashboard : `A definir`
- Prospections : `A definir`
- Partenaires : `A definir`
- Candidats : `A definir`
- Appairages : `A definir`
- Formations : `A definir`
- Commentaires : `A definir`
- Documents : `A definir`
- Événements : `A definir`
- CVthèque : `A definir`
- CERFA : `A definir`
- Ateliers TRE : `A definir`

### Bloc Prépa

- Prépa IC : `A definir`
- Prépa Ateliers : `A definir`
- Stagiaires Prépa : `A definir`
- Objectifs Prépa : `A definir`
- Stats Prépa : `A definir`

### Bloc Déclic

- Déclic : `A definir`
- Participants Déclic : `A definir`
- Objectifs Déclic : `A definir`
- Stats Déclic : `A definir`

### Commentaires secondaires

- Commentaires prospection : `A definir`
- Commentaires appairage : `A definir`

### Référentiels / Paramètres

- Users : `A definir`
- Centres : `A definir`
- Statuts : `A definir`
- Types d’offres : `A definir`
- Rapports : `A definir`
- Logs : `A definir`

### Recherche / utilitaires

- Recherche globale : `A definir`
- Mon profil : `A definir`
- Health : `A definir`
- Auth / Register / Login : `A definir`
- Demande de compte candidat : `A definir`

### Stats / dashboards dédiés

- Formation stats : `A definir`
- Événement stats : `A definir`
- Prospection stats : `A definir`
- Candidat stats : `A definir`
- Partenaire stats : `A definir`
- Atelier TRE stats : `A definir`
- Appairage stats : `A definir`
- Commentaire stats : `A definir`
- Prospection comment stats : `A definir`
- Appairage commentaire stats : `A definir`

### Modules visibles côté layouts/navigation

- Dashboard : `A definir`
- Déclic : `A definir`
- Prépa : `A definir`
- Prospections : `A definir`
- Partenaires : `A definir`
- CERFA : `A definir`
- Appairages : `A definir`
- Candidats : `A definir`
- Ateliers TRE : `A definir`
- CVthèque : `A definir`
- Formations : `A definir`
- Commentaires : `A definir`
- Documents : `A definir`
- Événements : `A definir`
- Paramètres : `A definir`

### Modules présents mais désactivés dans l’API

- Suivis Jury : `A definir`
- VAE : `A definir`

---

## Remarques finales

- `commercial` et `charge_recrutement` se recouvrent beaucoup, mais restent differencies par leur logique metier dominante
- `commercial` n'ecrit pas dans `Formations`
- `charge_recrutement` n'ecrit pas dans `Formations`
- si un `charge_recrutement` doit exceptionnellement ecrire dans une formation, tu peux temporairement lui donner le role `staff`
- `candidat`, `stagiaire` et `candidatuser` restent volontairement tres limites
- `staff` reste le role transverse le plus large hors admin
- `candidatuser` doit etre considere comme un role transitoire du cycle de vie candidat, pas comme un role metier cible a renforcer
- `test` doit rester un role purement technique / support et ne pas ouvrir de parcours metier dans le front

## Regle recommandee pour centres et departements

- pour l'operationnel quotidien, le scope doit rester base sur les `centres` attribues manuellement
- un utilisateur peut avoir plusieurs centres
- exemple : un utilisateur peut avoir `Nanterre` et `Meudon`
- cela ne doit pas automatiquement lui donner acces a tous les autres centres du meme departement

### Recommandation

- `CRUD metier = scope centres`
- `Statistiques / dashboards = scope centres + eventuel scope departement`

### Exemple

- si `Nanterre` et `Meudon` sont deux antennes du `92`
- alors le commercial ou le charge de recrutement peut :
  - agir en ecriture sur les centres qui lui sont explicitement attribues
  - consulter des stats agreges au niveau du `92` si tu lui donnes ce droit de lecture statistique

### Conclusion

- ne pas deduire automatiquement les droits metier a partir du departement
- garder les centres comme unite de permission principale
- utiliser le departement comme perimetre de lecture pour les stats si besoin
