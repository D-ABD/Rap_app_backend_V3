// pages/prospection/ProspectionComment/ProspectionCommentForm.tsx
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import ProspectionSelectModal, {
  ProspectionLite,
} from "../../../components/modals/ProspectionSelectModal";
import type {
  ProspectionCommentCreateInput,
  ProspectionCommentDTO,
} from "../../../types/prospectionComment";

interface Props {
  initial?: ProspectionCommentDTO | null;
  prospectionId?: number;
  onSubmit: (data: ProspectionCommentCreateInput) => Promise<void>;
  canSetInternal?: boolean;
}

const MAX_BODY_LEN = 4000;

export default function ProspectionCommentForm({
  initial = null,
  prospectionId,
  onSubmit,
  canSetInternal = false,
}: Props) {
  const [prospection, setProspection] = useState<number | "">(
    initial?.prospection ?? prospectionId ?? ""
  );
  const [selectedProspection, setSelectedProspection] = useState<ProspectionLite | null>(null);
  const [body, setBody] = useState(initial?.body ?? "");
  const [isInternal] = useState(canSetInternal ? (initial?.is_internal ?? false) : false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProspectionModal, setShowProspectionModal] = useState(false);

  const bodyId = useId();

  useEffect(() => {
    if (prospectionId != null) setProspection(prospectionId);
  }, [prospectionId]);

  const disabled = submitting;

  const prospectionDisplay = useMemo(() => {
    if (selectedProspection) {
      return [
        `#${selectedProspection.id}`,
        selectedProspection.partenaire_nom ?? "",
        selectedProspection.formation_nom ?? "",
      ]
        .filter(Boolean)
        .join(" • ");
    }
    if (prospection !== "") return `#${prospection}`;
    return "";
  }, [prospection, selectedProspection]);

  const remainingChars = MAX_BODY_LEN - body.length;

  const resetSelection = useCallback(() => {
    setSelectedProspection(null);
    setProspection("");
  }, []);

  const handleChangeBody = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (next.length <= MAX_BODY_LEN) setBody(next);
  }, []);

  const handleChangeProspectionManual = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedProspection(null);
    const val = e.target.value.trim();
    if (val === "") {
      setProspection("");
      return;
    }
    const n = Number(val);
    setProspection(Number.isFinite(n) && n > 0 ? n : "");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const bodyTrimmed = body.trim();
      if (prospection === "" || bodyTrimmed.length === 0) {
        setError("Veuillez renseigner tous les champs obligatoires.");
        return;
      }

      setSubmitting(true);
      const payload: ProspectionCommentCreateInput = {
        prospection_id: Number(prospection),
        body: bodyTrimmed,
        ...(canSetInternal ? { is_internal: isInternal } : {}),
      };

      try {
        await onSubmit(payload);
      } catch (err) {
        let msg = "Échec de l’enregistrement.";
        if (err instanceof Error && err.message) msg = err.message;
        setError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [body, canSetInternal, isInternal, onSubmit, prospection]
  );

  const handleKeyDownBody = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !disabled) {
        const form = e.currentTarget.closest("form");
        if (form instanceof HTMLFormElement) {
          form.requestSubmit();
        }
      }
    },
    [disabled]
  );

  return (
    <Box component="form" onSubmit={handleSubmit} aria-busy={submitting || undefined} noValidate>
      <Stack spacing={3}>
        {/* Sélecteur prospection */}
        {prospectionId == null && (
          <Stack spacing={2}>
            <TextField
              label="Prospection"
              value={prospectionDisplay}
              placeholder="Aucune prospection sélectionnée"
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setShowProspectionModal(true)}
                disabled={disabled}
              >
                Choisir…
              </Button>
              {(selectedProspection || prospection !== "") && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={resetSelection}
                  disabled={disabled}
                >
                  Effacer
                </Button>
              )}
            </Stack>

            <TextField
              label="ID de prospection (saisie manuelle)"
              type="number"
              inputProps={{ min: 1 }}
              value={prospection}
              onChange={handleChangeProspectionManual}
              required
              disabled={disabled}
              fullWidth
            />
          </Stack>
        )}

        {/* Commentaire */}
        <TextField
          id={bodyId}
          label="Commentaire"
          name="body"
          value={body}
          onChange={handleChangeBody}
          onKeyDown={handleKeyDownBody}
          required
          multiline
          minRows={5}
          disabled={disabled}
          helperText={`${remainingChars} caractères restants`}
          inputProps={{ maxLength: MAX_BODY_LEN }}
          fullWidth
          error={!!(error && body.trim().length === 0)}
        />

        {/* Erreur */}
        {error && (
          <Typography color="error" role="alert">
            {error}
          </Typography>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={2}>
          <Button
            type="submit"
            variant="contained"
            disabled={disabled}
            title="Ctrl/⌘ + Entrée pour envoyer"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </Stack>
      </Stack>

      {/* Modal sélection prospection */}
      <ProspectionSelectModal
        show={prospectionId == null && showProspectionModal}
        onClose={() => setShowProspectionModal(false)}
        onSelect={(p) => {
          setSelectedProspection(p);
          setProspection(p.id);
          setShowProspectionModal(false);
        }}
      />
    </Box>
  );
}
