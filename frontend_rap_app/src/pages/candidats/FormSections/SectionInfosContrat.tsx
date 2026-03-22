import React, { useCallback } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import type { CandidatFormData } from "../../../types/candidat";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
}

function SectionInfosContrat({ form, setForm }: Props) {
  // Handler générique pour les champs texte
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
                        fullWidth
                        label="Nationalité"
                        value={form.nationalite ?? ""}
                        onChange={updateField("nationalite")}
                      />
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

          {/* Situation avant contrat */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Situation avant contrat"
              value={form.situation_avant_contrat ?? ""}
              onChange={updateField("situation_avant_contrat")}
            />
          </Grid>

          {/* Dernier diplôme préparé */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Dernier diplôme préparé"
              value={form.dernier_diplome_prepare ?? ""}
              onChange={updateField("dernier_diplome_prepare")}
            />
          </Grid>

          {/* Diplôme le plus élevé obtenu */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Diplôme le plus élevé obtenu"
              value={form.diplome_plus_eleve_obtenu ?? ""}
              onChange={updateField("diplome_plus_eleve_obtenu")}
            />
          </Grid>

          {/* Dernière classe */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Dernière classe fréquentée"
              value={form.derniere_classe ?? ""}
              onChange={updateField("derniere_classe")}
            />
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
              fullWidth
              label="Régime social"
              value={form.regime_social ?? ""}
              onChange={updateField("regime_social")}
              placeholder="Ex. : Étudiant, salarié, sans emploi..."
            />
          </Grid>

          {/* Situation actuelle */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Situation actuelle"
              value={form.situation_actuelle ?? ""}
              onChange={updateField("situation_actuelle")}
              placeholder="Ex. : En recherche d’emploi, en reconversion..."
            />
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
