import { FormEvent } from "react";
import {
  Stack,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider,
} from "@mui/material";
import useForm from "../../hooks/useForm";
import type { CentreFormData } from "../../types/centre";

type Props = {
  initialValues?: Partial<CentreFormData>;
  onSubmit: (values: CentreFormData) => Promise<void> | void;
  mode?: "create" | "edit";
  submitting?: boolean;
};

export default function CentreForm({
  initialValues = {},
  onSubmit,
  mode = "create",
  submitting = false,
}: Props) {
  const { values, handleChange, handleCheckbox, resetForm } = useForm<CentreFormData>({
    nom: "",
    code_postal: "",
    commune: "",
    numero_voie: "",
    nom_voie: "",
    complement_adresse: "",
    numero_uai_centre: "",
    siret_centre: "",
    cfa_entreprise: false,

    // Champs CFA responsable
    cfa_responsable_est_lieu_principal: false,
    cfa_responsable_denomination: "AFPA ENTREPRISE",
    cfa_responsable_uai: "0932751K",
    cfa_responsable_siret: "82409268800244",
    cfa_responsable_numero: "3",
    cfa_responsable_voie: "Rue Franklin",
    cfa_responsable_complement: "",
    cfa_responsable_code_postal: "93100",
    cfa_responsable_commune: "Montreuil",

    ...initialValues,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        {mode === "create" ? "Créer un centre" : "Modifier un centre"}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* ───────── Informations générales ───────── */}
          <Typography variant="subtitle1" fontWeight="bold">
            Informations générales
          </Typography>
          <Divider />

          <TextField
            label="Nom du centre"
            name="nom"
            value={values.nom}
            onChange={handleChange}
            required
            fullWidth
          />

          <TextField
            label="Code postal"
            name="code_postal"
            value={values.code_postal || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Commune"
            name="commune"
            value={values.commune || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Numéro de voie"
            name="numero_voie"
            value={values.numero_voie || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Nom de la voie"
            name="nom_voie"
            value={values.nom_voie || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Complément d’adresse"
            name="complement_adresse"
            value={values.complement_adresse || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="N° UAI du centre"
            name="numero_uai_centre"
            value={values.numero_uai_centre || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="N° SIRET du centre"
            name="siret_centre"
            value={values.siret_centre || ""}
            onChange={handleChange}
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox
                id="cfa_entreprise"
                checked={values.cfa_entreprise}
                onChange={handleCheckbox}
              />
            }
            label="CFA d’entreprise"
          />

          {/* ───────── CFA Responsable ───────── */}
          <Typography variant="subtitle1" fontWeight="bold">
            CFA Responsable
          </Typography>
          <Divider />

          <FormControlLabel
            control={
              <Checkbox
                id="cfa_responsable_est_lieu_principal"
                checked={values.cfa_responsable_est_lieu_principal}
                onChange={handleCheckbox}
              />
            }
            label="Le CFA responsable est le lieu de formation principal"
          />

          <TextField
            label="Dénomination du CFA responsable"
            name="cfa_responsable_denomination"
            value={values.cfa_responsable_denomination || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="N° UAI du CFA"
            name="cfa_responsable_uai"
            value={values.cfa_responsable_uai || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="N° SIRET du CFA"
            name="cfa_responsable_siret"
            value={values.cfa_responsable_siret || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Numéro de voie"
            name="cfa_responsable_numero"
            value={values.cfa_responsable_numero || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Voie"
            name="cfa_responsable_voie"
            value={values.cfa_responsable_voie || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Complément"
            name="cfa_responsable_complement"
            value={values.cfa_responsable_complement || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Code postal"
            name="cfa_responsable_code_postal"
            value={values.cfa_responsable_code_postal || ""}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            label="Commune"
            name="cfa_responsable_commune"
            value={values.cfa_responsable_commune || ""}
            onChange={handleChange}
            fullWidth
          />

          {/* ───────── Boutons ───────── */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button type="submit" variant="contained" color="success" disabled={submitting}>
              💾 {mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outlined" onClick={resetForm}>
              Réinitialiser
            </Button>
          </Stack>
        </Stack>
      </form>
    </Paper>
  );
}
