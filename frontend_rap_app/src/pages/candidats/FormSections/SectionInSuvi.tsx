import React, { useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
  FormHelperText,
} from "@mui/material";
import type {
  CandidatFormData,
  CandidatMeta,

} from "../../../types/candidat";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
  meta?: CandidatMeta | null;
  errors?: Record<string, string[]>;
}

function SectionIndicateurs({ form, setForm, meta, errors }: Props) {
  // -------------------------
  // Handlers optimisés
  // -------------------------

  const updateSelect = useCallback(
    (key: keyof CandidatFormData) =>
      (e: any) =>
        setForm((f) => ({ ...f, [key]: e.target.value || undefined })),
    [setForm]
  );

  const updateSelectTyped = useCallback(
    (key: keyof CandidatFormData) =>
      (e: any) =>
        setForm((f) => ({
          ...f,
          [key]: (e.target.value || undefined) as any,
        })),
    [setForm]
  );

  const updateSelectNumber = useCallback(
    (key: keyof CandidatFormData) =>
      (e: any) =>
        setForm((f) => ({
          ...f,
          [key]: e.target.value ? Number(e.target.value) : undefined,
        })),
    [setForm]
  );

  const updateCheckbox = useCallback(
    (key: keyof CandidatFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.checked })),
    [setForm]
  );

  // -------------------------
  // Mémo — évite recalculs
  // -------------------------

  const niveauKeys = useMemo(() => ["communication", "experience", "csp"] as const, []);

  const checkboxItems = useMemo(
    () => [
      ["entretien_done", "Entretien réalisé"],
      ["test_is_ok", "Test validé"],
      ["admissible", "Admissible"],
      ["inscrit_gespers", "Inscrit GESPERS"],
      ["en_accompagnement_tre", "En accompagnement TRE"],
      ["en_appairage", "En appairage"],
      ["courrier_rentree", "Courrier de rentrée envoyé"],
    ] as const,
    []
  );

  const requiresConsent =
    typeof form.rgpd_legal_basis === "string" && form.rgpd_legal_basis === "consentement";
  const isFormationActive = form.parcours_phase === "stagiaire_en_formation";

  return (
    <Card variant="outlined">
      <CardHeader
        title="Suivi & situation"
        subheader="Suivi administratif, contrat et niveau du candidat"
      />
      <CardContent>
        {/* ---------------------- */}
        {/* Statuts administratifs */}
        {/* ---------------------- */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info">
              Le statut principal est maintenant calcule automatiquement par le backend.
              Utilisez les cases ci-dessous pour piloter les etats manuels cumulables :
              admissible, GESPERS, accompagnement TRE et appairage.
            </Alert>
          </Grid>

          <Grid item xs={12}>
            <Alert severity={form.type_contrat ? "success" : isFormationActive ? "warning" : "info"}>
              <strong>Type de contrat :</strong>{" "}
              {form.type_contrat
                ? "renseigne"
                : isFormationActive
                  ? "a renseigner pour un stagiaire en formation."
                  : "vous pouvez le renseigner des que le dispositif est connu."}
            </Alert>
          </Grid>

          {/* CV statut */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <FormLabel>CV statut</FormLabel>
              <Select
                value={form.cv_statut ?? ""}
                onChange={updateSelectTyped("cv_statut")}
                displayEmpty
              >
                <MenuItem value="">—</MenuItem>
                {(meta?.cv_statut_choices ?? []).map((opt) => (
                  <MenuItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Type de contrat */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel>Type de contrat du stagiaire</FormLabel>
              <Select
                value={form.type_contrat ?? ""}
                onChange={updateSelect("type_contrat")}
                displayEmpty
              >
                <MenuItem value="">—</MenuItem>
                {(meta?.type_contrat_choices ?? []).map((opt) => (
                  <MenuItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Apprentissage, professionnalisation, POEI / POEC, CRIF, sans contrat ou autre.
              </FormHelperText>
            </FormControl>
          </Grid>

          {/* Contrat signé */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel>Contrat signé</FormLabel>
              <Select
                value={form.contrat_signe ?? ""}
                onChange={updateSelectTyped("contrat_signe")}
                displayEmpty
              >
                <MenuItem value="">—</MenuItem>
                {(meta?.contrat_signe_choices ?? []).map((opt) => (
                  <MenuItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Disponibilité */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel>Disponibilité</FormLabel>
              <Select
                value={form.disponibilite ?? ""}
                onChange={updateSelect("disponibilite")}
                displayEmpty
              >
                <MenuItem value="">—</MenuItem>
                {(meta?.disponibilite_choices ?? []).map((opt) => (
                  <MenuItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {!!meta?.rgpd_legal_basis_choices?.length && (
          <>
            <Divider sx={{ my: 3 }} />

            <Alert severity="info" sx={{ mb: 2 }}>
              Pour une creation manuelle, choisissez en general <strong>Mesures precontractuelles</strong>{" "}
              si la personne est deja engagee dans le parcours de recrutement. Choisissez{" "}
              <strong>Consentement</strong> seulement si vous vous appuyez sur un accord explicite
              recueilli pendant l'entretien ou lors de la creation du compte utilisateur. Le
              candidat validera ensuite directement certains elements depuis son compte.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel>Base légale RGPD</FormLabel>
                  <Select
                    value={form.rgpd_legal_basis ?? ""}
                    onChange={updateSelect("rgpd_legal_basis")}
                    displayEmpty
                  >
                    <MenuItem value="">—</MenuItem>
                    {(meta?.rgpd_legal_basis_choices ?? []).map((opt) => (
                      <MenuItem key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {!!errors?.rgpd_legal_basis?.length && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {errors.rgpd_legal_basis[0]}
                    </Alert>
                  )}
                  {!errors?.rgpd_legal_basis?.length && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Choisissez <strong>Mesures precontractuelles</strong> si le candidat est deja
                      engage dans le parcours de recrutement. Choisissez <strong>Consentement</strong>{" "}
                      uniquement en cas d'accord explicite.
                    </Alert>
                  )}
                </FormControl>
              </Grid>

              {requiresConsent && (
                <Grid item xs={12} md={6}>
                  <>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!form.rgpd_consent_obtained}
                          onChange={updateCheckbox("rgpd_consent_obtained")}
                        />
                      }
                      label="Consentement explicite obtenu"
                    />
                    {!!errors?.rgpd_consent_obtained?.length && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {errors.rgpd_consent_obtained[0]}
                      </Alert>
                    )}
                  </>
                </Grid>
              )}
            </Grid>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* ---------------------- */}
        {/* Communication / Exp / CSP */}
        {/* ---------------------- */}
        <Grid container spacing={2}>
          {niveauKeys.map((key) => (
            <Grid item xs={12} md={4} key={key}>
              <FormControl fullWidth>
                <FormLabel>
                  {key === "communication"
                    ? "Communication"
                    : key === "experience"
                    ? "Expérience"
                    : "CSP"}
                </FormLabel>
                <Select
                  value={(form[key] as number | undefined) ?? ""}
                  onChange={updateSelectNumber(key)}
                  displayEmpty
                >
                  <MenuItem value="">—</MenuItem>
                  {(meta?.niveau_choices ?? []).map((opt) => (
                    <MenuItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* ---------------------- */}
        {/* Cases à cocher */}
        {/* ---------------------- */}
        <Grid container spacing={2}>
          {checkboxItems.map(([key, label]) => (
            <Grid item xs={12} md={3} key={key}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!(form as any)[key]}
                    onChange={updateCheckbox(key as keyof CandidatFormData)}
                  />
                }
                label={label}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionIndicateurs);
