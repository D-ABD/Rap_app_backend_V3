import React, { useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  TextField,
  Button,
  FormHelperText,
} from "@mui/material";
import type { CandidatFormData } from "../../../types/candidat";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
  showUsersModal: boolean;
  setShowUsersModal: (v: boolean) => void;
}

function SectionAssignations({ form, setForm, setShowUsersModal }: Props) {
  // Memoise label pour éviter recalcul inutile
  const vuParLabel = useMemo(() => {
    if (typeof form.vu_par === "number") return `Utilisateur #${form.vu_par}`;
    if (form.vu_par) return String(form.vu_par);
    return "";
  }, [form.vu_par]);

  // Handlers optimisés
  const openModal = useCallback(() => setShowUsersModal(true), [setShowUsersModal]);

  const clearAssignation = useCallback(
    () =>
      setForm((f) => ({
        ...f,
        vu_par: undefined,
      })),
    [setForm]
  );

  return (
    <Card variant="outlined">
      <CardHeader title="Assignations & visibilité" />
      <CardContent>
        <TextField
          fullWidth
          label="Vu par"
          value={vuParLabel}
          InputProps={{ readOnly: true }}
          placeholder="— Aucune sélection —"
        />

        <Box display="flex" gap={1} mt={1}>
          <Button variant="outlined" onClick={openModal}>
            🔍 Choisir un utilisateur
          </Button>

          {form.vu_par && (
            <Button color="error" variant="outlined" onClick={clearAssignation}>
              ✖ Effacer
            </Button>
          )}
        </Box>

        <FormHelperText>
          Recherche sur nom et email. Rôles proposés : staff, admin, superadmin.
        </FormHelperText>
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionAssignations);
