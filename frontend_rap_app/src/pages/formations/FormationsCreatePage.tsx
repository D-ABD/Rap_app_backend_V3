// pages/formations/FormationsCreatePage.tsx
import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Paper } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import FormationForm from "./FormationForm";
import { useCreateFormation, useFormationCreationChoices } from "../../hooks/useFormations";
import type { FormationFormData, FormationFormDataRaw } from "../../types/formation";

export default function FormationsCreatePage() {
  const navigate = useNavigate();
  const { createFormation } = useCreateFormation();
  const {
    centres,
    statuts,
    typeOffres,
    loading: loadingChoices,
    refresh,
  } = useFormationCreationChoices();

  const initialValuesRef = useRef<FormationFormData>({
    nom: "",
    centre_id: null,
    type_offre_id: null,
    statut_id: null,
    start_date: "",
    end_date: "",
    num_kairos: "",
    num_offre: "",
    num_produit: "",
    assistante: "",
    prevus_crif: 0,
    prevus_mp: 0,
    inscrits_crif: 0,
    inscrits_mp: 0,
    cap: 0,
    convocation_envoie: false,
    entree_formation: 0,
    nombre_candidats: 0,
    nombre_entretiens: 0,
    intitule_diplome: "",
    code_diplome: "",
    code_rncp: "",
    total_heures: 0,
    heures_distanciel: 0,
  });

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleRefresh = useCallback(() => {
    refresh();
    toast.info("Référentiels rechargés");
  }, [refresh]);

  const handleSubmit = useCallback(
    async (values: FormationFormDataRaw) => {
      const payload: FormationFormData = {
        ...values,
        centre_id: values.centre_id ? Number(values.centre_id) : null,
        type_offre_id: values.type_offre_id ? Number(values.type_offre_id) : null,
        statut_id: values.statut_id ? Number(values.statut_id) : null,
      };
      try {
        await createFormation(payload);
        toast.success("✅ Formation créée avec succès !");
        navigate("/formations");
      } catch {
        toast.error("❌ Erreur lors de la création de la formation");
      }
    },
    [createFormation, navigate]
  );

  const formProps = useMemo(
    () => ({
      initialValues: initialValuesRef.current,
      centres,
      statuts,
      typeOffres,
      loadingChoices,
      onSubmit: handleSubmit,
      onCancel: handleBack,
      submitLabel: "💾 Créer",
    }),
    [centres, statuts, typeOffres, loadingChoices, handleSubmit, handleBack]
  );

  return (
    <PageTemplate
      title="➕ Créer une formation"
      backButton
      onBack={handleBack}
      refreshButton
      onRefresh={handleRefresh}
    >
      <Paper sx={{ p: 3 }}>
        <FormationForm {...formProps} />
      </Paper>
    </PageTemplate>
  );
}
