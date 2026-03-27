# CERFA Diagnostic

## Objectif

L'objectif est de pre-remplir automatiquement le CERFA a partir des donnees deja presentes
dans les modeles `Candidat`, `Formation`, `Centre` et `Partenaire`, puis de completer
manuellement uniquement les champs strictement contractuels ou administratifs manquants.

CERFA vierge repere dans le repo :

- `cerfa_10103-14.pdf`
- `rap_app/static/cerfa/cerfa_10103-14.pdf`

Une base de mapping a deja ete preparee dans :

- `rap_app/models/cerfa_contrats.py`

avec :

- `CERFA_AUTOFILL_SOURCES`
- `CERFA_AUTOFILL_MISSING_FIELDS`
- `CerfaContrat.build_prefill_payload(...)`
- `CerfaContrat.get_coverage_report()`

## Champs deja couverts

### Employeur / partenaire

Les champs CERFA suivants peuvent deja etre derives du modele `Partenaire` :

- nom employeur
- adresse employeur :
  - numero
  - voie
  - complement
  - code postal
  - commune
- telephone employeur
- email employeur
- SIRET employeur
- type employeur
- employeur specifique
- code APE
- effectif
- IDCC
- regime assurance chomage specifique

### Maitre d'apprentissage

Les informations suivantes sont deja couvertes pour le maitre 1 et le maitre 2 :

- nom
- prenom
- date de naissance
- email
- emploi occupe
- diplome / titre
- niveau de diplome

### Apprenti / candidat

Les champs CERFA suivants sont deja couverts via `Candidat` :

- nom de naissance
- nom d'usage
- prenom
- NIR
- adresse :
  - numero
  - voie
  - complement
  - code postal
  - commune
- telephone
- email
- date de naissance
- sexe
- departement de naissance
- commune de naissance
- nationalite
- regime social
- RQTH
- sportif de haut niveau
- equivalence jeunes
- extension BOE
- projet de creation d'entreprise
- situation avant contrat
- dernier diplome prepare
- derniere annee / classe suivie
- intitule du dernier diplome prepare
- plus haut diplome obtenu
- type de contrat

### Representant legal

Les champs suivants sont deja partiellement ou totalement couverts :

- nom
- prenom
- lien avec l'apprenti
- adresse :
  - voie
  - code postal
  - commune
- email

### Formation / CFA / lieu de formation

Les champs suivants sont deja couverts via `Formation` et `Centre` :

- intitule du diplome
- code diplome
- code RNCP
- date de debut de formation
- date de fin de formation
- duree totale en heures
- heures de distanciel
- CFA responsable :
  - denomination
  - UAI
  - SIRET
  - numero
  - voie
  - complement
  - code postal
  - commune
  - indicateur CFA en entreprise
- lieu principal de formation :
  - denomination
  - UAI
  - SIRET
  - voie
  - code postal
  - commune

## Champs partiellement couverts ou a confirmer metier

Ces champs sont proches de donnees deja presentes, mais demandent une regle metier,
une conversion ou une validation explicite :

- `employeur_prive`
- `employeur_public`
  - peuvent probablement etre derives du `type_employeur`, mais il faut une regle fiable
- `diplome_vise`
  - proche de l'intitule du diplome / code diplome, a confirmer
- `cfa_est_lieu_formation_principal`
  - proche des donnees du centre, mais la regle exacte doit etre validee
- `maitre_eligible`
  - pas simplement deduisible sans regle metier explicite
- `apprenti_droits_rqth`
  - distinct du simple booleen `rqth`

## Champs non couverts aujourd'hui

Les champs suivants ne sont pas portes de facon exploitable par `Candidat`, `Formation`
ou `Partenaire`, ou ne le sont pas encore dans une forme directement utilisable pour le CERFA :

- `type_derogation`
- `numero_contrat_precedent`
- `date_conclusion`
- `date_debut_execution`
- `date_fin_contrat`
- `date_debut_formation_pratique_employeur`
- `date_effet_avenant`
- `travail_machines_dangereuses`
- `duree_hebdo_heures`
- `duree_hebdo_minutes`
- `salaire_brut_mensuel`
- `caisse_retraite`
- `lieu_signature`

## Conclusion

La couverture actuelle est deja bonne pour :

- l'identite de l'apprenti
- l'employeur
- les maitres d'apprentissage
- le CFA
- le lieu de formation
- le diplome / la formation

Le vrai manque se situe surtout sur la partie :

- contrat juridique fin
- dates de contractualisation
- temps de travail
- remuneration
- mentions administratives specifiques au CERFA

## Prochaine etape recommandee

Etape logique suivante :

1. brancher un service de pre-remplissage a partir de :
   - `candidat`
   - `formation`
   - `partenaire`
2. produire un payload CERFA unique
3. injecter ce payload dans le CERFA vierge
4. laisser en saisie manuelle seulement les champs non couverts

Le point d'entree technique est deja prepare dans :

- `rap_app/models/cerfa_contrats.py`
