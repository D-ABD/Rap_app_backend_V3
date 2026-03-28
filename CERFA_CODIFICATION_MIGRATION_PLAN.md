# Plan de Migration CERFA - Codification metier

Objectif :
- ajouter la codification CERFA de facon fiable
- sans casser les noms de champs existants
- en conservant les champs texte actuels quand ils sont deja utilises dans l'app
- en rendant le pre-remplissage CERFA plus robuste et plus conforme a la notice

Principe recommande :
- ne pas renommer les champs existants
- ne pas supprimer les champs existants
- ajouter soit :
  - des `choices` sur les champs existants quand c'est possible sans casser l'usage
  - soit un champ `_code` en parallele quand le champ actuel est trop libre ou deja trop utilise
- afficher dans les formulaires :
  - une liste codifiee
  - un libelle lisible
- stocker idealement :
  - le code CERFA
  - et, si utile, le texte libre ou le libelle historique

Strategie generale :
1. ajouter les nouveaux `TextChoices`
2. ajouter les champs `_code` si necessaire
3. ecrire une migration de donnees pour convertir au maximum l'existant
4. laisser les anciennes valeurs libres quand on ne sait pas mapper
5. brancher progressivement les formulaires sur les listes
6. faire lire le CERFA en priorite depuis les codes, avec fallback sur les anciens champs


## 1. Candidat

Fichier :
- [candidat.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/candidat.py)

### Champs a codifier

#### `nationalite`

Etat actuel :
- champ texte libre ou semi-libre

Codification CERFA cible :
- `1` = Francaise
- `2` = Union europeenne
- `3` = Etranger hors Union europeenne

Plan recommande :
- conserver `nationalite`
- ajouter `nationalite_code`
- utiliser `nationalite_code` pour le CERFA
- garder `nationalite` comme libelle ou valeur historique

Pourquoi :
- des valeurs comme `Francaise`, `fr`, `France`, `UE` risquent de casser la conformite


#### `situation_avant_contrat`

Codification CERFA cible :
- `1` = Scolaire
- `2` = Prepa apprentissage
- `3` = Etudiant
- `4` = Contrat d'apprentissage
- `5` = Contrat de professionnalisation
- `6` = Contrat aide
- `7` = En formation au CFA sous statut de stagiaire avant contrat
- `8` = En formation au CFA sans contrat suite a rupture
- `9` = Autres situations sous statut de stagiaire de la formation professionnelle
- `10` = Salarie
- `11` = Personne a la recherche d'un emploi
- `12` = Inactif

Plan recommande :
- conserver `situation_avant_contrat`
- ajouter `situation_avant_contrat_code`


#### `regime_social`

Codification CERFA cible :
- `1` = MSA
- `2` = URSSAF

Plan recommande :
- conserver `regime_social`
- ajouter `regime_social_code`


#### `dernier_diplome_prepare`

Codification CERFA cible :
- `80` = Doctorat
- `73` = Master
- `75` = Diplome d'ingenieur
- `76` = Diplome d'ecole de commerce
- `79` = Autre diplome ou titre de niveau bac+5 ou plus
- `62` = Licence professionnelle
- `63` = Licence generale
- `64` = Bachelor universitaire de technologie BUT
- `69` = Autre diplome ou titre de niveau bac+3 ou 4
- `54` = Brevet de Technicien Superieur
- `55` = Diplome Universitaire de technologie
- `58` = Autre diplome ou titre de niveau bac+2
- `41` = Baccalaureat professionnel
- `42` = Baccalaureat general
- `43` = Baccalaureat technologique
- `44` = Diplome de specialisation professionnelle
- `49` = Autre diplome ou titre de niveau bac
- `33` = CAP
- `34` = BEP
- `35` = Certificat de specialisation
- `38` = Autre diplome ou titre de niveau CAP/BEP
- `25` = Diplome national du Brevet
- `26` = Certificat de formation generale
- `13` = Aucun diplome ni titre professionnel

Plan recommande :
- conserver `dernier_diplome_prepare`
- ajouter `dernier_diplome_prepare_code`


#### `diplome_plus_eleve_obtenu`

Meme codification que ci-dessus.

Plan recommande :
- conserver `diplome_plus_eleve_obtenu`
- ajouter `diplome_plus_eleve_obtenu_code`


#### `derniere_classe`

Codification CERFA cible :
- `01` = derniere annee du cycle suivie et diplome obtenu
- `11` = 1ere annee validee
- `12` = 1ere annee non validee
- `21` = 2e annee validee
- `22` = 2e annee non validee
- `31` = 3e annee validee
- `32` = 3e annee non validee
- `40` = 1er cycle secondaire acheve
- `41` = interruption en 3e
- `42` = interruption en 4e

Plan recommande :
- conserver `derniere_classe`
- ajouter `derniere_classe_code`


#### `departement_naissance`

Etat cible :
- code departement officiel
- `099` pour l'etranger

Plan recommande :
- conserver `departement_naissance`
- ajouter une validation metier
- pas forcement besoin d'un `_code` si le champ actuel peut deja porter le code


#### `nir`

Regle CERFA :
- transmettre le NIR sur 13 chiffres sans cle

Plan recommande :
- conserver `nir`
- ajouter un nettoyage/fonction de normalisation pour le CERFA
- ne pas bloquer brutalement tant que les donnees historiques ne sont pas propres


### Migration de donnees recommandee pour `Candidat`

Ajouter une migration de data qui tente les correspondances suivantes :
- `Francaise`, `Francaise `, `France` -> `nationalite_code = 1`
- `UE`, `Union europeenne` -> `nationalite_code = 2`
- `Etranger`, `Hors UE` -> `nationalite_code = 3`
- `Demandeur d'emploi` -> `situation_avant_contrat_code = 11`
- `Salarie` -> `situation_avant_contrat_code = 10`
- `URSSAF` -> `regime_social_code = 2`
- `MSA` -> `regime_social_code = 1`
- `Baccalaureat general` / `Bac general` -> `42`
- `Bac pro` / `Baccalaureat professionnel` -> `41`
- `CAP` -> `33`
- etc.

Important :
- ne jamais ecraser une valeur texte existante
- si mapping incertain : laisser le `_code` vide


## 2. Formation

Fichier :
- [formations.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/formations.py)

### Champs a codifier

#### `intitule_diplome`

Etat actuel :
- texte libre

Usage CERFA :
- alimente aujourd'hui :
  - `Diplome ou titre vise`
  - `Intitule precis`

Plan recommande :
- conserver `intitule_diplome`
- ajouter `diplome_vise_code`

Codification CERFA cible :
- meme table que pour les diplomes candidat
- ex :
  - `42` = Baccalaureat general
  - `41` = Baccalaureat professionnel
  - `54` = BTS
  - `33` = CAP

Pourquoi :
- la notice distingue :
  - le code du diplome vise
  - l'intitule precis de la certification


#### `code_diplome`

Etat actuel :
- deja present

Plan recommande :
- conserver tel quel
- ajouter uniquement validation/controle de format si besoin


#### `code_rncp`

Etat actuel :
- deja present

Plan recommande :
- conserver tel quel
- ajouter validation douce pour ne garder que le code `XXXXX` sans prefixe si besoin


#### `total_heures`

Etat actuel :
- deja present

Plan :
- pas de codification
- garder tel quel


#### `heures_distanciel`

Etat actuel :
- deja present

Plan :
- pas de codification
- garder tel quel


### Migration de donnees recommandee pour `Formation`

- ajouter `diplome_vise_code`
- tenter une correspondance par mots-cles depuis `intitule_diplome`
  - `CAP` -> `33`
  - `Baccalaureat general` -> `42`
  - `Bac pro` -> `41`
  - `BTS` -> `54`
- si le mapping est ambigu :
  - laisser vide


## 3. Partenaire

Fichier :
- [partenaires.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/partenaires.py)

### Champs a codifier

#### `type_employeur`

Etat actuel :
- probablement texte libre ou semi-libre

Codification CERFA cible :
- `11` = Entreprise inscrite au repertoire des metiers
- `12` = Entreprise inscrite uniquement au registre du commerce et des societes
- `13` = Entreprise relevant de la mutualite sociale agricole
- `14` = Profession liberale
- `15` = Association
- `16` = Autre employeur prive
- `21` = Service de l'Etat
- `22` = Commune
- `23` = Departement
- `24` = Region
- `25` = Etablissement public hospitalier
- `26` = Etablissement public local d'enseignement
- `27` = Etablissement public administratif de l'Etat
- `28` = Etablissement public administratif local
- `29` = Autre employeur public
- `30` = Etablissement public industriel et commercial

Plan recommande :
- conserver `type_employeur`
- ajouter `type_employeur_code`


#### `employeur_specifique`

Codification CERFA cible :
- `0` = Aucun de ces cas
- `1` = Entreprise de travail temporaire
- `2` = Groupement d'employeurs
- `3` = Employeur saisonnier
- `4` = Apprentissage familial

Plan recommande :
- conserver `employeur_specifique`
- ajouter `employeur_specifique_code`


#### `code_ape`

Etat actuel :
- deja present

Plan :
- conserver
- pas de codification fermee
- ajouter seulement une aide de saisie / validation douce


#### `idcc`

Etat actuel :
- deja present

Plan :
- conserver
- pas de liste fermee globale
- mais ajouter une aide metier :
  - `9999` = pas de convention collective
  - `9998` = convention collective en cours de negociation


#### `effectif_total`

Etat actuel :
- deja present

Plan :
- conserver
- pas de codification


#### `assurance_chomage_speciale`

Etat actuel :
- deja present ou proche

Plan :
- conserver
- verifier qu'il s'agit bien d'un booleen exploitable dans le CERFA


#### Maitres d'apprentissage

Champs cibles a codifier :
- `maitre1_niveau_diplome`
- `maitre2_niveau_diplome`

Codification CERFA cible :
- `0` = Aucun
- `3` = CAP / BEP
- `4` = Baccalaureat
- `5` = DEUG / BTS / DUT / DEUST
- `6` = Licence / Licence professionnelle / BUT / Maitrise
- `7` = Master / DEA / DESS / Diplome d'ingenieur
- `8` = Doctorat / HDR

Plan recommande :
- conserver `maitre1_niveau_diplome`
- ajouter `maitre1_niveau_diplome_code`
- conserver `maitre2_niveau_diplome`
- ajouter `maitre2_niveau_diplome_code`


### Migration de donnees recommandee pour `Partenaire`

- `prive` / `societe` / `entreprise` -> `type_employeur_code = 16` par defaut si on n'a pas mieux
- `association` -> `15`
- `commune` -> `22`
- `region` -> `24`
- `aucun` / vide -> `employeur_specifique_code = 0`
- `groupement` -> `2`
- `saisonnier` -> `3`
- niveau diplome :
  - `bac` -> `4`
  - `bts` -> `5`
  - `licence` -> `6`
  - `master` / `ingenieur` -> `7`
  - `doctorat` -> `8`

Comme pour `Candidat` :
- ne pas ecraser l'ancien champ texte
- remplir le `_code` seulement si la correspondance est sure


## 4. CerfaContrat

Fichier :
- [cerfa_contrats.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/cerfa_contrats.py)

### Strategie

Ne pas renommer les champs snapshot existants.

Ajouter si besoin des champs snapshot codes quand on veut fiabiliser le rendu PDF :
- `employeur_type_code`
- `employeur_specifique_code`
- `apprenti_nationalite_code`
- `apprenti_regime_social_code`
- `apprenti_situation_avant_code`
- `apprenti_dernier_diplome_prepare_code`
- `apprenti_plus_haut_diplome_code`
- `apprenti_derniere_annee_suivie_code`
- `diplome_vise_code`
- `maitre1_niveau_diplome_code`
- `maitre2_niveau_diplome_code`
- `type_contrat_code`
- `type_derogation_code`

Pourquoi :
- le snapshot CERFA doit figer la valeur exacte utile a l'impression
- il ne faut pas dependre uniquement de libelles metier historiques


## 5. Contrat / CERFA

Le modele [cerfa_contrats.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/cerfa_contrats.py) devrait aussi evoluer pour couvrir les rubriques contrat codifiees.

### `type_contrat`

Codification CERFA cible :
- `11` = Premier contrat d'apprentissage
- `21` = Nouveau contrat meme employeur apres contrat termine
- `22` = Nouveau contrat autre employeur apres contrat termine
- `23` = Nouveau contrat apres rupture
- `31` = Modification situation juridique employeur
- `32` = Changement d'employeur contrat saisonnier
- `33` = Prolongation suite echec examen
- `34` = Prolongation suite RQTH
- `35` = Diplome supplementaire prepare
- `36` = Autres changements
- `37` = Modification lieu d'execution du contrat
- `38` = Modification lieu principal de formation theorique

Plan recommande :
- conserver `type_contrat`
- ajouter `type_contrat_code`


### `type_derogation`

Codification CERFA cible :
- `11` = Age inferieur a 16 ans
- `12` = Age superieur a 29 ans
- `21` = Reduction de duree
- `22` = Allongement de duree
- `50` = Cumul de derogations
- `60` = Autre derogation

Plan recommande :
- conserver `type_derogation`
- ajouter `type_derogation_code`


## 6. Ordre de mise en oeuvre recommande

### Phase 1 - plus rentable pour le CERFA
- `Candidat.nationalite_code`
- `Candidat.situation_avant_contrat_code`
- `Candidat.regime_social_code`
- `Candidat.dernier_diplome_prepare_code`
- `Candidat.diplome_plus_eleve_obtenu_code`
- `Candidat.derniere_classe_code`
- `Formation.diplome_vise_code`
- `Partenaire.type_employeur_code`
- `Partenaire.employeur_specifique_code`
- `Partenaire.maitre1_niveau_diplome_code`
- `Partenaire.maitre2_niveau_diplome_code`

### Phase 2 - contrat
- `CerfaContrat.type_contrat_code`
- `CerfaContrat.type_derogation_code`

### Phase 3 - migrations de donnees
- scripts de mapping de l'existant vers les `_code`
- rapport des valeurs non mappees


## 7. Recommandations techniques

### Recommandation 1
- utiliser `TextChoices` Django pour toutes les listes CERFA

### Recommandation 2
- garder les champs historiques de texte libre
- ajouter les champs `_code` plutot que remplacer trop tot les champs existants

### Recommandation 3
- faire lire le CERFA dans cet ordre :
  1. champ `_code` si present
  2. fallback sur champ texte existant

### Recommandation 4
- dans le front, afficher le libelle lisible
- mais poster le code

### Recommandation 5
- ajouter une commande d'audit plus tard pour lister :
  - valeurs mappees
  - valeurs non mappees
  - champs encore libres


## 8. Exemple de cible de fonctionnement

Exemple :
- aujourd'hui :
  - `diplome_plus_eleve_obtenu = "Baccalaureat general"`
- apres migration :
  - `diplome_plus_eleve_obtenu = "Baccalaureat general"`
  - `diplome_plus_eleve_obtenu_code = "42"`

Le formulaire affiche :
- `42 - Baccalaureat general`

Le CERFA lit :
- `42`

Sans casser :
- les anciens ecrans
- les exports historiques
- les usages metier existants

