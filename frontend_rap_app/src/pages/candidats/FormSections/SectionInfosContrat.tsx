import React, { useCallback } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import type { CandidatFormData } from "../../../types/candidat";

const NATIONALITE_OPTIONS = [
  { value: "1", label: "1 - Francaise" },
  { value: "2", label: "2 - Union europeenne" },
  { value: "3", label: "3 - Etranger hors Union europeenne" },
];

const SITUATION_OPTIONS = [
  { value: "1", label: "1 - Scolaire" },
  { value: "2", label: "2 - Prepa apprentissage" },
  { value: "3", label: "3 - Etudiant" },
  { value: "4", label: "4 - Contrat d'apprentissage" },
  { value: "5", label: "5 - Contrat de professionnalisation" },
  { value: "6", label: "6 - Contrat aide" },
  { value: "7", label: "7 - En formation au CFA sous statut de stagiaire avant contrat" },
  { value: "8", label: "8 - En formation au CFA sans contrat suite a rupture" },
  { value: "9", label: "9 - Autres situations de stagiaire de la formation professionnelle" },
  { value: "10", label: "10 - Salarie" },
  { value: "11", label: "11 - Recherche d'emploi" },
  { value: "12", label: "12 - Inactif" },
];

const DIPLOME_OPTIONS = [
  { value: "13", label: "13 - Aucun diplome ni titre professionnel" },
  { value: "25", label: "25 - Diplome national du Brevet" },
  { value: "26", label: "26 - Certificat de formation generale" },
  { value: "33", label: "33 - CAP" },
  { value: "34", label: "34 - BEP" },
  { value: "35", label: "35 - Certificat de specialisation" },
  { value: "38", label: "38 - Autre CAP/BEP" },
  { value: "41", label: "41 - Baccalaureat professionnel" },
  { value: "42", label: "42 - Baccalaureat general" },
  { value: "43", label: "43 - Baccalaureat technologique" },
  { value: "44", label: "44 - Diplome de specialisation professionnelle" },
  { value: "49", label: "49 - Autre niveau bac" },
  { value: "54", label: "54 - BTS" },
  { value: "55", label: "55 - DUT" },
  { value: "58", label: "58 - Autre niveau bac+2" },
  { value: "62", label: "62 - Licence professionnelle" },
  { value: "63", label: "63 - Licence generale" },
  { value: "64", label: "64 - BUT" },
  { value: "69", label: "69 - Autre niveau bac+3 ou 4" },
  { value: "73", label: "73 - Master" },
  { value: "75", label: "75 - Diplome d'ingenieur" },
  { value: "76", label: "76 - Diplome d'ecole de commerce" },
  { value: "79", label: "79 - Autre niveau bac+5 ou plus" },
  { value: "80", label: "80 - Doctorat" },
];

const DERNIERE_CLASSE_OPTIONS = [
  { value: "01", label: "01 - Derniere annee du cycle suivie et diplome obtenu" },
  { value: "11", label: "11 - 1ere annee validee" },
  { value: "12", label: "12 - 1ere annee non validee" },
  { value: "21", label: "21 - 2e annee validee" },
  { value: "22", label: "22 - 2e annee non validee" },
  { value: "31", label: "31 - 3e annee validee" },
  { value: "32", label: "32 - 3e annee non validee" },
  { value: "40", label: "40 - 1er cycle secondaire acheve" },
  { value: "41", label: "41 - Interruption en 3e" },
  { value: "42", label: "42 - Interruption en 4e" },
];

const REGIME_SOCIAL_OPTIONS = [
  { value: "1", label: "1 - MSA" },
  { value: "2", label: "2 - URSSAF" },
];

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
}

function SectionInfosContrat({ form, setForm }: Props) {
  // Les champs source CERFA sont volontairement portes par des listes codees.
  const updateField = useCallback(
    (key: keyof CandidatFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value || null })),
    [setForm]
  );

  // Handler générique pour les checkbox
  const updateCheckbox = useCallback(
    (key: keyof CandidatFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.checked })),
    [setForm]
  );

  return (
    <Card variant="outlined">
      <CardHeader
        title="Informations complémentaires pour CERFA"
        subheader="Scolarité, diplômes et statut social"
      />
      <CardContent>
        <Grid container spacing={2}>
                    {/* Nom de naissance */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nom de naissance"
              value={form.nom_naissance ?? ""}
              onChange={updateField("nom_naissance")}
            />
          </Grid>

            <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Département de naissance"
                        value={form.departement_naissance ?? ""}
                        onChange={updateField("departement_naissance")}
                      />
                    </Grid>
          
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Commune de naissance"
                        value={form.commune_naissance ?? ""}
                        onChange={updateField("commune_naissance")}
                      />
                    </Grid>
          
                    {/* Pays / nationalité */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Pays de naissance"
                        placeholder="Saisie libre"
                        value={form.pays_naissance ?? ""}
                        onChange={updateField("pays_naissance")}
                      />
                    </Grid>
          
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        label="Nationalité CERFA"
                        value={form.nationalite_code ?? ""}
                        onChange={updateField("nationalite_code")}
                      >
                        <MenuItem value="">Non defini</MenuItem>
                        {NATIONALITE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* NIR */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Numéro de sécurité sociale (NIR)"
                        value={form.nir ?? ""}
                        onChange={updateField("nir")}
                        inputProps={{ maxLength: 15 }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!form.inscrit_france_travail}
                            onChange={updateCheckbox("inscrit_france_travail")}
                          />
                        }
                        label="Inscrit France Travail"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Numéro d'inscription France Travail"
                        value={form.numero_inscription_france_travail ?? ""}
                        onChange={updateField("numero_inscription_france_travail")}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Durée d'inscription France Travail (mois)"
                        value={form.duree_inscription_france_travail_mois ?? ""}
                        onChange={updateField("duree_inscription_france_travail_mois")}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>

          {/* Situation avant contrat */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Situation avant contrat CERFA"
              value={form.situation_avant_contrat_code ?? ""}
              onChange={updateField("situation_avant_contrat_code")}
            >
              <MenuItem value="">Non defini</MenuItem>
              {SITUATION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Dernier diplôme préparé */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Dernier diplôme préparé CERFA"
              value={form.dernier_diplome_prepare_code ?? ""}
              onChange={updateField("dernier_diplome_prepare_code")}
            >
              <MenuItem value="">Non defini</MenuItem>
              {DIPLOME_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Diplôme le plus élevé obtenu */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Diplôme le plus élevé CERFA"
              value={form.diplome_plus_eleve_obtenu_code ?? ""}
              onChange={updateField("diplome_plus_eleve_obtenu_code")}
            >
              <MenuItem value="">Non defini</MenuItem>
              {DIPLOME_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Dernière classe */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Dernière classe CERFA"
              value={form.derniere_classe_code ?? ""}
              onChange={updateField("derniere_classe_code")}
            >
              <MenuItem value="">Non defini</MenuItem>
              {DERNIERE_CLASSE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Intitulé diplôme préparé */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Intitulé du diplôme préparé"
              value={form.intitule_diplome_prepare ?? ""}
              onChange={updateField("intitule_diplome_prepare")}
            />
          </Grid>



          {/* Régime social */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Régime social CERFA"
              value={form.regime_social_code ?? ""}
              onChange={updateField("regime_social_code")}
            >
              <MenuItem value="">Non defini</MenuItem>
              {REGIME_SOCIAL_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Checkboxes */}
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.sportif_haut_niveau}
                  onChange={updateCheckbox("sportif_haut_niveau")}
                />
              }
              label="Sportif de haut niveau"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.equivalence_jeunes}
                  onChange={updateCheckbox("equivalence_jeunes")}
                />
              }
              label="Équivalence jeunes"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.extension_boe}
                  onChange={updateCheckbox("extension_boe")}
                />
              }
              label="Extension BOE"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.projet_creation_entreprise}
                  onChange={updateCheckbox("projet_creation_entreprise")}
                />
              }
              label="Projet de création d’entreprise"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionInfosContrat);
