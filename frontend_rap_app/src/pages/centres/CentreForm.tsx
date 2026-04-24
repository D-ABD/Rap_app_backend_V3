import { FormEvent } from "react";
import { Alert, Button, Stack, Typography, Box } from "@mui/material";
import FormActionsBar from "../../components/forms/FormActionsBar";
import FormSectionCard from "../../components/forms/FormSectionCard";
import AppCheckboxField from "../../components/forms/fields/AppCheckboxField";
import AppTextField from "../../components/forms/fields/AppTextField";
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
    organisme_declaration_activite: "",
    cfa_entreprise: false,

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
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {mode === "create" ? "Créer un centre" : "Modifier un centre"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Renseignez les informations du centre et du CFA responsable.
          </Typography>
        </Box>

        <FormSectionCard title="Informations générales">
          <Stack spacing={2}>
            <Alert severity="info">
              Les informations du centre et du CFA responsable servent au pré-remplissage du CERFA.
            </Alert>

            <AppTextField
              label="Nom du centre"
              name="nom"
              value={values.nom}
              onChange={handleChange}
              required
            />

            <AppTextField
              label="Code postal"
              name="code_postal"
              value={values.code_postal || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Commune"
              name="commune"
              value={values.commune || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Numéro de voie"
              name="numero_voie"
              value={values.numero_voie || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Nom de la voie"
              name="nom_voie"
              value={values.nom_voie || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Complément d’adresse"
              name="complement_adresse"
              value={values.complement_adresse || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="N° UAI du centre"
              name="numero_uai_centre"
              value={values.numero_uai_centre || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="N° SIRET du centre"
              name="siret_centre"
              value={values.siret_centre || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Declaration d'activite"
              name="organisme_declaration_activite"
              value={values.organisme_declaration_activite || ""}
              onChange={handleChange}
            />

            <AppCheckboxField
              id="cfa_entreprise"
              label="CFA d’entreprise"
              checked={values.cfa_entreprise}
              onChange={handleCheckbox}
            />
          </Stack>
        </FormSectionCard>

        <FormSectionCard title="CFA Responsable">
          <Stack spacing={2}>
            <Alert severity="info">
              Ce bloc alimente la partie CFA / lieu principal de formation du CERFA.
            </Alert>

            <AppCheckboxField
              id="cfa_responsable_est_lieu_principal"
              label="Le CFA responsable est le lieu de formation principal"
              checked={values.cfa_responsable_est_lieu_principal}
              onChange={handleCheckbox}
            />

            <AppTextField
              label="Dénomination du CFA responsable"
              name="cfa_responsable_denomination"
              value={values.cfa_responsable_denomination || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="N° UAI du CFA"
              name="cfa_responsable_uai"
              value={values.cfa_responsable_uai || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="N° SIRET du CFA"
              name="cfa_responsable_siret"
              value={values.cfa_responsable_siret || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Numéro de voie"
              name="cfa_responsable_numero"
              value={values.cfa_responsable_numero || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Voie"
              name="cfa_responsable_voie"
              value={values.cfa_responsable_voie || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Complément"
              name="cfa_responsable_complement"
              value={values.cfa_responsable_complement || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Code postal"
              name="cfa_responsable_code_postal"
              value={values.cfa_responsable_code_postal || ""}
              onChange={handleChange}
            />

            <AppTextField
              label="Commune"
              name="cfa_responsable_commune"
              value={values.cfa_responsable_commune || ""}
              onChange={handleChange}
            />
          </Stack>
        </FormSectionCard>

        <FormActionsBar sx={{ mt: 1 }}>
          <Button type="button" variant="outlined" onClick={resetForm}>
            Réinitialiser
          </Button>

          <Button type="submit" variant="contained" color="success" disabled={submitting}>
            💾 {mode === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </FormActionsBar>
      </Stack>
    </Box>
  );
}