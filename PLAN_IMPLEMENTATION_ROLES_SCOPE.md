# Plan Implementation Roles / Scope

But :

- transformer la recommandation metier en implementation technique
- avancer etape par etape sans casser l'existant
- suivre clairement ce qui est fait, en cours, ou reste a faire
- mettre a jour les docstrings au fil de l'eau pour garder un code clair et coherent

Convention de suivi :

- `[ ]` a faire
- `[~]` en cours
- `[x]` termine

Regles de travail :

- ne pas casser l'app
- avancer par petits lots
- mettre a jour les docstrings des viewsets, permissions, helpers et services touches
- garder les regles de scope lisibles dans le code

---

## 1. Geler le referentiel de roles

- [x] Confirmer la liste des roles coeur :
  - `superadmin`
  - `admin`
  - `commercial`
  - `charge_recrutement`
  - `staff`
  - `staff_read`
  - `prepa_staff`
  - `declic_staff`
  - `candidat`
  - `stagiaire`
- [x] Confirmer le statut transitoire de :
  - `candidatuser`
  - `test`
- [x] Verifier l'impact sur `CustomUser.ROLE_CHOICES`
- [x] Verifier les endroits du code qui supposent encore l'ancien jeu de roles

Notes :

-

---

## 2. Centraliser les helpers de roles

- [x] Mettre a jour `rap_app/api/roles.py`
- [x] Ajouter des helpers explicites :
  - `is_commercial`
  - `is_charge_recrutement`
  - `is_candidate_like`
  - `can_access_prepa`
  - `can_access_declic`
  - `can_write_formations`
  - `can_manage_cerfa`
- [~] Eviter de disperser des checks `user.role == "..."`
- [x] Faire converger les permissions vers ces helpers
- [x] Mettre a jour les docstrings des helpers de roles

Notes :

-

---

## 3. Poser les regles globales de scope

- [x] Confirmer la regle :
  - `CRUD metier = centres attribues`
  - `Stats = centres + eventuel scope departement`
- [x] Ajouter un helper central pour recuperer le scope centres
- [x] Ajouter un helper central pour recuperer le scope stats departement si besoin
- [x] Ne pas deduire automatiquement les droits metier depuis le departement
- [x] Mettre a jour les docstrings des helpers de scope

Notes :

-

---

## 4. Securiser d'abord les modules coeur

### 4.1 Formations

- [x] Aligner le scope des roles
- [x] Garantir :
  - `commercial = lecture`
  - `charge_recrutement = lecture`
  - `staff = lecture / ecriture`
  - `admin/superadmin = plein acces`
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.2 Prospections

- [x] Aligner le scope des roles
- [x] Garantir :
  - `commercial = lecture / ecriture`
  - `charge_recrutement = lecture / ecriture`
  - `candidat/stagiaire = perimetre personnel`
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.3 Partenaires

- [x] Aligner le scope des roles
- [x] Garantir :
  - `commercial = lecture / ecriture`
  - `charge_recrutement = lecture / ecriture`
  - `candidat/stagiaire = perimetre personnel`
- [x] Verifier le rattachement indirect `created_by / default_centre / prospections`
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.4 Candidats

- [x] Aligner le scope des roles
- [x] Garantir :
  - `commercial = lecture / ecriture`
  - `charge_recrutement = lecture / ecriture`
  - `staff = lecture / ecriture`
  - `candidat/stagiaire = pas d'acces global`
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.5 Appairages

- [x] Aligner le scope des roles
- [x] Garantir :
  - `commercial = lecture / ecriture`
  - `charge_recrutement = lecture / ecriture`
  - `candidat/stagiaire = pas d'acces global`
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.6 CERFA

- [x] Aligner le scope des roles
- [x] Garantir :
  - `commercial = lecture / ecriture`
  - `charge_recrutement = lecture / ecriture`
  - `staff = lecture / ecriture`
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.7 Commentaires

- [x] Commentaires formation : realigner les roles
- [x] Commentaires prospection : realigner les roles
- [x] Commentaires appairage : realigner les roles
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.8 Documents

- [x] Aligner le scope des roles
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

### 4.9 Evenements

- [x] Aligner le scope des roles
- [x] Ajouter ou adapter les tests
- [x] Mettre a jour les docstrings du module

Notes :

-

---

## 5. Traiter ensuite les blocs specialises

### 5.1 Bloc Prepa

- [x] `prepa`
- [x] `stagiaires-prepa`
- [x] `prepa-objectifs`
- [x] `prepa-stats`
- [x] Garantir :
  - `prepa_staff = role principal`
  - `staff = acces transverse`
  - `commercial / charge_recrutement = pas d'acces metier direct`
- [x] Mettre a jour les docstrings des modules Prepa

Notes :

-

### 5.2 Bloc Declic

- [x] `declic`
- [x] `participants-declic`
- [x] `objectifs-declic`
- [x] `declic-stats`
- [x] Garantir :
  - `declic_staff = role principal`
  - `staff = acces transverse`
  - `commercial / charge_recrutement = pas d'acces metier direct`
- [x] Mettre a jour les docstrings des modules Declic

Notes :

-

---

## 6. Etendre ensuite aux stats

- [x] Identifier tous les viewsets stats
- [x] Poser la distinction :
  - `scope centres`
  - `scope departement`
- [x] Permettre la lecture stats departementale aux roles concernes
- [x] Ne pas ouvrir l'ecriture metier a partir du departement
- [x] Tester les cas :
  - centre unique
  - plusieurs centres
  - stats departement 92 avec plusieurs antennes
- [x] Mettre a jour les docstrings des viewsets stats

Notes :

-

---

## 7. Aligner le front

- [x] Masquer les modules non autorises dans la navigation
- [x] Proteger les routes/pages
- [x] Ajuster dashboards selon les roles
- [x] Ajuster les boutons d'action selon les permissions
- [x] Garder le backend comme source de verite
- [x] Mettre a jour les commentaires utiles et la documentation locale si necessaire

Notes :

- `commercial` et `charge_recrutement` utilisent maintenant le layout principal, avec navigation et routes coeur alignees
- `prepa` / `declic` restent exclus pour eux cote front
- `rapports` est maintenant restreint a `admin` / `superadmin` cote front, conformement a la recommandation metier
- les checks de roles repetes ont ete largement centralises dans le front via un helper commun
- il reste surtout de la dette TypeScript historique hors de ce lot

---

## 8. Nettoyage et convergence

- [x] Clarifier le role `candidatuser`
- [x] Reserver le role `test` a un usage technique
- [x] Supprimer les branches de code role-dependantes devenues obsoletes
- [x] Documenter les regles finales
- [ ] Preparer la future matrice en tableau si besoin
- [x] Relire les docstrings pour verifier qu'elles refletent bien la logique finale

Notes :

- la convergence backend est deja faite sur les modules coeur et specialises
- `candidatuser` est maintenant documente comme role transitoire du cycle de vie candidat
- `test` est reserve explicitement a un usage technique / support
- les checks front historiques les plus critiques ont ete rationalises via `frontend_rap_app/src/utils/roleGroups.ts`
- la matrice en tableau reste volontairement hors de ce lot

---

## 9. Validation

- [x] Tests unitaires / API des scopes
- [x] Tests par role sur les modules coeur
- [x] Tests des modules specialises
- [x] Tests des stats centre / departement
- [~] Verification front navigation / pages / boutons

Notes :

- les tests backend cibles passent sur PostgreSQL
- le `tsc` global front reste pollue par une dette historique du repo, distincte du lot roles / scope
- la verification front du lot est donc surtout fonctionnelle a ce stade

---

## Priorite de demarrage recommandee

1. `roles.py`
2. `permissions.py`
3. `formations`
4. `prospections`
5. `partenaires`
6. `candidats`
7. `appairages`
8. `cerfa`
9. `commentaires`
10. `prepa`
11. `declic`
12. `stats`
13. `front`

---

## Journal d'avancement

### Termine

- helpers de roles et de scope centralises
- modules coeur alignes sur `commercial` / `charge_recrutement`
- modules specialises `prepa` / `declic` alignes et testes
- lecture stats departementale sur `prepa` / `declic`
- navigation, dashboards et routes principales alignees cote front
- clarification documentaire de `candidatuser` (transitoire) et `test` (technique)
- centralisation front des familles de roles les plus reutilisees

### En cours

- aucune sous-tache metier bloquante ; reste surtout la dette TypeScript historique du front hors de ce plan

### Blocages / Arbitrages

- aucun blocage metier majeur a ce stade ; il reste surtout du polissage front et de la dette TypeScript historique
