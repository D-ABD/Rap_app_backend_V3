// src/pages/partenaires/PartenairesEditPage.tsx
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { useState, useMemo } from "react";
import { Box, Stack, Button, CircularProgress, Typography } from "@mui/material";
import { toast } from "react-toastify";
import axios from "axios";
import CampaignIcon from "@mui/icons-material/Campaign";
import HandshakeIcon from "@mui/icons-material/Handshake";

import {
  usePartenaire,
  useUpdatePartenaire,
  usePartenaireChoices,
} from "../../hooks/usePartenaires";
import PartenaireForm from "./PartenaireForm";
import type { Partenaire } from "../../types/partenaire";
import CandidatsSelectModal, {
  type CandidatPick,
} from "../../components/modals/CandidatsSelectModal";
import PageTemplate from "../../components/PageTemplate";

/* ---------- Utilitaires ---------- */
function normalize(values: Partial<Partenaire>): Partial<Partenaire> {
  return Object.fromEntries(
    Object.entries(values)
      .map(([k, v]) => [k, v === "" ? null : v])
      .filter(([, v]) => v !== undefined)
  ) as Partial<Partenaire>;
}

function preparePayload(values: Partial<Partenaire>): Partial<Partenaire> {
  const default_centre_id =
    values.default_centre_id ??
    (values.default_centre && typeof values.default_centre.id === "number"
      ? values.default_centre.id
      : null);

  const payload: Partial<Partenaire> = {
    ...values,
    default_centre_id,
  };

  delete (payload as Record<string, unknown>).default_centre;
  delete (payload as Record<string, unknown>).default_centre_nom;

  return payload;
}

const enc = encodeURIComponent;

/* ---------- Page ---------- */
export default function PartenaireEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const partenaireId = Number(id);

  const { data, loading: loadingData, error: loadError } = usePartenaire(partenaireId);
  const { update, loading, error } = useUpdatePartenaire(partenaireId);
  const { data: choices } = usePartenaireChoices();

  const [openCandModal, setOpenCandModal] = useState(false);

  const partenaireNom = data?.nom ?? null;

  const newProspectionUrl = useMemo(() => {
    const base = `/prospections/create?partenaire=${partenaireId}`;
    return partenaireNom ? `${base}&partenaire_nom=${enc(partenaireNom)}` : base;
  }, [partenaireId, partenaireNom]);

  const newAppairageBaseUrl = useMemo(() => {
    const base = `/appairages/create?partenaire=${partenaireId}`;
    return partenaireNom ? `${base}&partenaire_nom=${enc(partenaireNom)}` : base;
  }, [partenaireId, partenaireNom]);

  const initialValues = useMemo<Partial<Partenaire> | undefined>(() => data ?? undefined, [data]);

  const handleSubmit = async (values: Partial<Partenaire>) => {
    try {
      const payload = preparePayload(normalize(values));
      await update(payload);
      toast.success("✅ Modifications enregistrées");
      navigate("/partenaires");
    } catch (_err: unknown) {
      let message = "❌ Erreur lors de la mise à jour du partenaire.";

      if (axios.isAxiosError(_err)) {
        // ✅ Typage explicite de la réponse d’erreur attendue (DRF)
        const data = _err.response?.data as
          | { detail?: string; non_field_errors?: string[] }
          | undefined;

        const detail = data?.detail;
        const nonField = data?.non_field_errors;

        if (typeof detail === "string") {
          if (detail.toLowerCase().includes("centre")) {
            message = `❌ ${detail} — contactez votre administrateur.`;
          } else if (detail.toLowerCase().includes("périmètre")) {
            message = `❌ ${detail} — partenaire hors de votre périmètre.`;
          } else {
            message = `❌ ${detail}`;
          }
        } else if (Array.isArray(nonField) && nonField.length > 0) {
          const joined = nonField.filter((x): x is string => typeof x === "string").join(", ");
          if (joined) message = `❌ ${joined}`;
        } else {
          message = "❌ Échec de la mise à jour du partenaire.";
        }

        if (import.meta.env.DEV) {
          toast.info("ℹ️ Détails de l’erreur disponibles (mode développement).");
        }
      } else if (_err instanceof Error) {
        message = `❌ ${_err.message}`;
      } else {
        if (import.meta.env.DEV) {
          toast.info("ℹ️ Erreur inconnue (mode développement).");
        }
      }

      toast.error(message);
    }
  };

  const handlePickCandidat = (c: CandidatPick) => {
    setOpenCandModal(false);
    const url =
      `${newAppairageBaseUrl}` +
      `&candidat=${c.id}` +
      (c.nom_complet ? `&candidat_nom=${enc(c.nom_complet)}` : "");
    navigate(url);
  };

  /* ---------- États de chargement ---------- */
  if (!id || Number.isNaN(partenaireId)) {
    return (
      <Typography color="error" p={2}>
        ID de partenaire invalide.
      </Typography>
    );
  }

  if (loadingData) return <CircularProgress sx={{ m: 2 }} />;

  if (loadError) {
    return (
      <Typography color="error" p={2}>
        Erreur de chargement du partenaire.
      </Typography>
    );
  }

  if (!data) {
    return (
      <Typography color="error" p={2}>
        Partenaire introuvable.
      </Typography>
    );
  }

  /* ---------- Rendu principal ---------- */
  return (
    <PageTemplate
      title="✏️ Modifier le partenaire"
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            component={RouterLink}
            to={newProspectionUrl}
            variant="contained"
            color="primary"
            startIcon={<CampaignIcon />}
          >
            Nouvelle prospection
          </Button>

          <Button
            variant="outlined"
            startIcon={<HandshakeIcon />}
            onClick={() => setOpenCandModal(true)}
          >
            Nouvel appairage
          </Button>
        </Stack>
      }
    >
      <Box>
        <Box id="edit-section">
          <Typography variant="h6" sx={{ mb: 1 }}>
            Modifier les informations
          </Typography>
          <PartenaireForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            loading={loading}
            choices={choices}
          />
          {error && (
            <Typography color="error" mt={2}>
              Erreur : {error.message}
            </Typography>
          )}
        </Box>
      </Box>

      <CandidatsSelectModal
        show={openCandModal}
        onClose={() => setOpenCandModal(false)}
        onSelect={handlePickCandidat}
        onlyCandidateLike
        onlyActive={false}
        requireLinkedUser={false}
      />
    </PageTemplate>
  );
}
