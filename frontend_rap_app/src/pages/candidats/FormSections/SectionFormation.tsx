import React, { useCallback, useMemo } from "react";
import { Card, CardHeader, CardContent, Grid, Box, Button } from "@mui/material";
import AppTextField from "../../../components/forms/fields/AppTextField";
import type { CandidatFormData } from "../../../types/candidat";
import { formatFormation } from "./utils";
import { FormationPick } from "../../../components/modals/FormationSelectModal";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
  canEditFormation: boolean;
  showFormationModal: boolean;
  setShowFormationModal: (b: boolean) => void;
  formationInfo: FormationPick | null;
}

function SectionFormation({
  form,
  setForm,
  canEditFormation,
  setShowFormationModal,
  formationInfo,
}: Props) {
  // Memo: ne se recalcule que quand form.formation ou formationInfo change
  const formationLabel = useMemo(() => {
    if (formationInfo) return formatFormation(formationInfo);
    if (form.formation) return `#${form.formation}`;
    return "";
  }, [formationInfo, form.formation]);

  const openModal = useCallback(() => setShowFormationModal(true), [setShowFormationModal]);

  const clearFormation = useCallback(
    () => setForm((f) => ({ ...f, formation: undefined })),
    [setForm]
  );

  return (
    <Card variant="outlined">
      <CardHeader
        title="Formation"
        subheader={!canEditFormation ? "La formation n’est pas modifiable pour votre rôle." : undefined}
      />
      <CardContent>
        <Grid container spacing={2}>
          {/* Sélection formation */}
          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              label="Formation sélectionnée"
              value={formationLabel}
              InputProps={{ readOnly: true }}
              placeholder={canEditFormation ? "— Aucune sélection —" : "Non modifiable"}
            />

            {canEditFormation && (
              <Box display="flex" gap={1} mt={1}>
                <Button variant="outlined" onClick={openModal}>
                  🔍 Sélectionner
                </Button>

                {form.formation && (
                  <Button color="error" variant="outlined" onClick={clearFormation}>
                    ✖ Effacer
                  </Button>
                )}
              </Box>
            )}
          </Grid>

          {/* Champs auto après sélection */}
          {formationInfo && (
            <>
              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Nom de la formation"
                  value={formationInfo.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Centre"
                  value={formationInfo.centre?.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Type d’offre"
                  value={formationInfo.type_offre?.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="N° d’offre"
                  value={formationInfo.num_offre ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionFormation);
