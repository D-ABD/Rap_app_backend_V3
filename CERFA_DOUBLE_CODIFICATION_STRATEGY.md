# Strategie de double codification CERFA

## Objectif

Gerer proprement deux nomenclatures differentes :

- CERFA apprentissage
- CERFA professionnalisation

Sans casser :

- les modeles metier source (`Candidat`, `Formation`, `Partenaire`)
- l'auto-remplissage existant
- le PDF apprentissage deja valide

## Probleme reel

Les deux contrats ne partagent pas toujours :

- les memes codes
- les memes libelles
- les memes champs
- la meme logique de remplissage

Donc il ne faut pas faire reposer toute la logique sur un seul `code` metier universel.

## Architecture recommandee

### 1. Source metier stable

Les modeles source gardent la donnee metier de reference :

- `Candidat`
- `Formation`
- `Partenaire`

Ils stockent :

- soit une valeur metier neutre
- soit un code interne stable
- soit un texte metier exploitable

Exemples :

- `candidat.type_contrat`
- `candidat.situation_avant_contrat_code`
- `formation.intitule_diplome`
- `formation.code_diplome`
- `partenaire.type_employeur_code`

Ces champs ne doivent pas devenir dependants d'un seul CERFA.

### 2. Couche de traduction par type de CERFA

Ajouter une couche de mapping dediee :

- `mapping apprentissage`
- `mapping professionnalisation`

Cette couche traduit une valeur source en :

- `code final CERFA`
- `libelle final CERFA`

### 3. Snapshot final dans `CerfaContrat`

`CerfaContrat` reste le snapshot final du contrat, avec :

- le type du CERFA (`cerfa_type`)
- le code final
- le libelle final

Donc :

- les modeles source restent propres
- le CERFA reste autonome et historique
- les PDF utilisent un snapshot adapte a leur type

## Regle de fonctionnement

### A. Lors du prefill

1. on lit la donnee source metier
2. on regarde `cerfa_type`
3. on applique le mapping correspondant
4. on remplit `CerfaContrat` avec :
   - `..._code`
   - `...` ou `..._libelle`

### B. Lors de l'edition CERFA

Le CERFA peut rester editable.

Si une valeur est modifiee manuellement :

- elle reste dans le snapshot CERFA
- et, si voulu, elle peut etre resynchronisee vers le modele source

Mais la traduction PDF continue de se baser sur le snapshot final, pas sur le modele source brut.

## Structure technique recommandee

### Fichier de mappings

Creer un fichier dedie, par exemple :

- `rap_app/models/cerfa_mappings.py`

Ou :

- `rap_app/services/cerfa_mapping_service.py`

## Forme recommandee

```python
APPRENTISSAGE_MAPPINGS = {
    "situation_avant_contrat": {
        "source_field": "candidat.situation_avant_contrat_code",
        "map": {
            "11": {"code": "11", "label": "11 - Personne a la recherche d'un emploi"},
        },
    },
}

PROFESSIONNALISATION_MAPPINGS = {
    "situation_avant_contrat": {
        "source_field": "candidat.situation_avant_contrat_code",
        "map": {
            "11": {"code": "X", "label": "Libelle propre au contrat pro"},
        },
    },
}
```

Ou plus propre encore :

```python
CERFA_FIELD_MAPPINGS = {
    "apprentissage": {...},
    "professionnalisation": {...},
}
```

## Service de resolution

Ajouter un resolver central, par exemple :

```python
def resolve_cerfa_value(cerfa_type: str, field_key: str, source_value):
    ...
    return {"code": final_code, "label": final_label}
```

Puis un helper :

```python
def build_cerfa_snapshot_value(cerfa_type: str, field_key: str, source_value):
    resolved = resolve_cerfa_value(cerfa_type, field_key, source_value)
    return {
        f"{field_key}_code": resolved["code"],
        field_key: resolved["label"],
    }
```

## Champs concernes en priorite

### Candidat

- nationalite
- regime_social
- situation_avant_contrat
- dernier_diplome_prepare
- plus_haut_diplome
- derniere_annee_suivie
- type_contrat

### Partenaire

- type_employeur
- employeur_specifique
- niveau_diplome_maitre

### Formation

- diplome_vise

## Ce qu'il ne faut pas faire

### A eviter

- faire porter a `Candidat` uniquement les codes apprentissage
- reutiliser tel quel un code apprentissage dans le CERFA pro
- supposer que meme code = meme libelle = meme sens

### Pourquoi

Sinon :

- le prefill CERFA pro devient faux
- les modales deviennent ambiguës
- les PDF affichent des valeurs incoherentes

## Strategie de migration progressive

### Etape 1

Garder les modeles source tels qu'ils sont.

### Etape 2

Ajouter la couche de mapping centralisee.

### Etape 3

Modifier `CerfaContrat.build_prefill_payload()` pour :

- lire les donnees source
- passer par le resolver selon `cerfa_type`

### Etape 4

Laisser le PDF lire seulement le snapshot final du CERFA.

## Exemple cible

### Source metier

```python
candidat.situation_avant_contrat_code = "11"
```

### Prefill apprentissage

```python
apprenti_situation_avant_code = "11"
apprenti_situation_avant = "11 - Personne a la recherche d'un emploi"
```

### Prefill professionnalisation

```python
apprenti_situation_avant_code = "..."
apprenti_situation_avant = "..."
```

La source est la meme.
Le snapshot CERFA change selon le type.

## Conclusion

La bonne logique est :

- une source metier
- deux tables de traduction
- un snapshot CERFA final par type

Formule simple :

`modele source -> mapping par cerfa_type -> snapshot CerfaContrat -> PDF`


