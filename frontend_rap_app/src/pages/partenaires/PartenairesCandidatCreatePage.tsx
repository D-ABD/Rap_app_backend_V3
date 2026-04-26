// src/pages/partenaires/PartenairesCandidatCreatePage.tsx
import { useState, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";

import { useCreatePartenaire, usePartenaireChoices } from "../../hooks/usePartenaires";
import { useAuth } from "../../hooks/useAuth";
import { getTokens } from "../../api/tokenStorage";
import { toApiError } from "../../api/httpClient";
import type { Partenaire, PartenaireChoicesResponse } from "../../types/partenaire";
import PostCreateChoiceModal from "../../components/modals/PostCreateChoiceModal";
import PageTemplate from "../../components/PageTemplate";
import PartenaireCandidatForm from "./PartenaireCandidatForm";

/* ---------- Utilitaire ---------- */
function preparePayload(values: Partial<Partenaire>): Partial<Partenaire> {
  const default_centre_id =
    values.default_centre_id ??
    (values.default_centre && typeof values.default_centre.id === "number"
      ? values.default_centre.id
      : null);

  const payload: Partial<Partenaire> = { ...values, default_centre_id };
  delete (payload as Record<string, unknown>).default_centre;
  delete (payload as Record<string, unknown>).default_centre_nom;
  return payload;
}

/* 🔧 Fonction de log safe pour le DEV uniquement */
function _logDevError(...args: unknown[]) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

/* ---------- Page ---------- */
export default function PartenaireCandidatCreatePage() {
  const { create, loading, error } = useCreatePartenaire();
  const { data: rawChoices } = usePartenaireChoices();
  const { user, isAuthenticated } = useAuth();

  const [choiceOpen, setChoiceOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ id: number; nom: string } | null>(null);

  const choices: PartenaireChoicesResponse = useMemo(
    () => rawChoices ?? { types: [], actions: [] },
    [rawChoices]
  );

  const initialValues = useMemo(() => {
    if (user?.centre) {
      return {
        is_active: true,
        country: "France",
        default_centre_id: user.centre.id,
      };
    }
    return { is_active: true, country: "France" };
  }, [user]);

  const handleSubmit = useCallback(
    async (values: Partial<Partenaire>) => {
      try {
        if (!getTokens().access) {
          toast.error(
            "Session expirée ou non authentifié : reconnectez-vous, puis réessayez."
          );
          return;
        }
        if (!user?.centre?.id) {
          toast.error(
            "❌ Votre compte n’est rattaché à aucun centre. Contactez un administrateur."
          );
          return;
        }

        const payload = preparePayload(values);
        payload.default_centre_id = user.centre.id;

        const created = await create(payload);

        if (created.was_reused) {
          toast.warning(`⚠️ Le partenaire « ${created.nom} » existait déjà et a été réutilisé.`);
        } else {
          toast.success(`✅ Partenaire « ${created.nom} » créé`);
        }

        setLastCreated({ id: created.id, nom: created.nom });
        setChoiceOpen(true);
      } catch (e: unknown) {
        let message = "❌ Erreur lors de la création du partenaire.";

        if (axios.isAxiosError(e)) {
          const status = e.response?.status;
          if (status === 401) {
            message =
              "Non authentifié (401). Reconnectez-vous : la requête n’a pas de session valide pour l’API.";
          } else {
            const apiMsg = toApiError(e).message;
            if (apiMsg && apiMsg !== "Erreur inconnue") {
              message = `❌ ${apiMsg}`;
            }
          }
          if (status && status !== 401) {
            // ✅ Typage explicite des champs possibles renvoyés par l'API
            const data = e.response?.data as
              | { detail?: string; non_field_errors?: string[]; message?: string }
              | undefined;

            const detail = data?.detail;
            const nonField = data?.non_field_errors;
            const envMsg = data?.message;

            if (status !== 500 && typeof detail === "string") {
              if (detail.toLowerCase().includes("centre")) {
                message = `❌ ${detail} — contactez votre centre ou un administrateur.`;
              } else if (detail.toLowerCase().includes("périmètre")) {
                message = `❌ ${detail} — partenaire hors de votre périmètre.`;
              } else {
                message = `❌ ${detail}`;
              }
            } else if (Array.isArray(nonField) && nonField.length > 0) {
              const joined = nonField.filter((x): x is string => typeof x === "string").join(", ");
              if (joined) message = `❌ ${joined}`;
            } else if (typeof envMsg === "string" && envMsg) {
              message = `❌ ${envMsg}`;
            }
          }

          _logDevError("[PartenaireCandidatCreatePage] Erreur Axios :", e);
        } else {
          _logDevError("[PartenaireCandidatCreatePage] Erreur inconnue :", e);
        }

        toast.error(message);
      }
    },
    [create, user]
  );

  return (
    <PageTemplate title="🤝 Créer un nouveau partenaire (Candidat)" backButton>
      {!isAuthenticated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Vous n&apos;êtes pas authentifié. Les appels <code>/api/me/</code> et les enregistrements peuvent
          échouer (401) : connectez-vous d&apos;abord.
        </Alert>
      )}
      {isAuthenticated && !user?.centre?.id && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aucun centre n&apos;est lié à votre compte (formation / fiche). La création de partenaire sera
          refusée par l&apos;API tant qu&apos;un centre n&apos;est pas connu. Contactez l&apos;équipe si besoin.
        </Alert>
      )}
      {loading && <CircularProgress sx={{ mb: 2 }} />}

      <Box>
        <PartenaireCandidatForm
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

      <PostCreateChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        resourceLabel="partenaire"
        persistId={lastCreated?.id}
        extraContent={
          lastCreated ? (
            <Box textAlign="center" mt={1}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {lastCreated.nom}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                a bien été créé avec succès 🎉
              </Typography>
            </Box>
          ) : null
        }
        // ✅ Plus de prospection, juste un retour vers la liste
        primaryHref="/partenaires/candidat"
        primaryLabel="↩️ Retour à la liste des partenaires"
      />
    </PageTemplate>
  );
}
