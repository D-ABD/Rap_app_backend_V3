// src/components/modals/CandidatsSelectModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Grid,
  CircularProgress,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";
import api from "../../api/axios";
import type { AppTheme } from "../../theme";

/* ---------- Types ---------- */
type RoleCode =
  | "candidat"
  | "stagiaire"
  | "candidatuser"
  | "admin"
  | "superadmin"
  | "staff"
  | "test"
  | string;

type CompteUtilisateurLite = {
  id: number;
  role: RoleCode | null;
  is_active?: boolean;
};

type FormationLite = { id: number; nom: string | null };
type FormationField = number | FormationLite | null;

export type CandidatPick = {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  nom_naissance?: string | null;
  email: string | null;
  ville?: string | null;
  code_postal?: string | null;
  formation: FormationLite | null;
  formation_nom?: string | null;
  formation_num_offre?: string | null;
  formation_type_offre?: string | null;
  centre_nom?: string | null;
  type_contrat?: string | null;
  type_contrat_code?: string | null;
  entreprise_placement?: number | null;
  entreprise_placement_nom?: string | null;
  entreprise_validee?: number | null;
  entreprise_validee_nom?: string | null;
  placement_appairage_partenaire?: number | null;
  placement_appairage_partenaire_nom?: string | null;
  last_appairage?: {
    partenaire?: number | null;
    partenaire_nom?: string | null;
  } | null;
  compte_utilisateur_id?: number | null;
  compte_utilisateur?: {
    id?: number | null;
    role: RoleCode | null;
    is_active?: boolean;
  } | null;
};

type DRFPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
type DRFEnvelope<T> = DRFPaginated<T> | { data: DRFPaginated<T> };

type ApiEnvelope<T> = { data: T } | T;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function unwrap<T>(payload: ApiEnvelope<T>): T {
  return isRecord(payload) && "data" in payload ? (payload as { data: T }).data : (payload as T);
}

type CandidatApi = {
  id: number;
  nom: string | null;
  prenom: string | null;
  nom_complet?: string | null;
  nom_naissance?: string | null;
  email?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  formation?: FormationField;
  formation_id?: number | null;
  formation_nom?: string | null;
  formation_num_offre?: string | null;
  formation_type_offre?: string | null;
  centre_nom?: string | null;
  type_contrat?: string | null;
  type_contrat_code?: string | null;
  entreprise_placement?: number | null;
  entreprise_placement_nom?: string | null;
  entreprise_validee?: number | null;
  entreprise_validee_nom?: string | null;
  placement_appairage_partenaire?: number | null;
  placement_appairage_partenaire_nom?: string | null;
  last_appairage?:
    | {
        partenaire?: number | null;
        partenaire_nom?: string | null;
      }
    | null;
  compte_utilisateur?: number | Partial<CompteUtilisateurLite> | null;
  compte_utilisateur_id?: number | null;
};

type CreateCandidatPayload = {
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  formation?: number | null;
  statut?: string;
  cv_statut?: "oui" | "en_cours" | "a_modifier" | undefined;
};
type CreateCandidatResult = {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
  formation?: number | null;
};

/* ---------- Props ---------- */
interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (c: CandidatPick) => void;
  onSelectMany?: (candidats: CandidatPick[]) => void;
  onlyCandidateLike?: boolean;
  onlyActive?: boolean;
  requireLinkedUser?: boolean;
  onCreate?: (payload: CreateCandidatPayload) => Promise<CreateCandidatResult>;
  prospectionId?: number;
  multiple?: boolean;
  selectedIds?: number[];
  allowClear?: boolean;
}

/* ---------- Helpers ---------- */
const candidateRoles = new Set<RoleCode>(["candidat", "stagiaire", "candidatuser"]);
const DEFAULT_SELECTED_IDS: number[] = [];
const _nn = (v?: string | null): string => (v ?? "").trim();

function asPaginated<T>(data: DRFEnvelope<T>): DRFPaginated<T> {
  return "results" in data ? data : data.data;
}
function toFormationLite(
  field?: FormationField,
  fallbackId?: number | null,
  fallbackNom?: string | null
): FormationLite | null {
  if (!field && !fallbackId) return null;
  if (typeof field === "number") return { id: field, nom: fallbackNom ?? null };
  if (field && typeof field === "object") return { id: field.id, nom: field.nom ?? null };
  if (typeof fallbackId === "number") return { id: fallbackId, nom: fallbackNom ?? null };
  return null;
}
function extractUserId(x: CandidatApi): number | null {
  if (typeof x.compte_utilisateur_id === "number") return x.compte_utilisateur_id;
  const cu = x.compte_utilisateur;
  if (typeof cu === "number") return cu;
  if (cu && typeof cu === "object" && typeof (cu as Partial<CompteUtilisateurLite>).id === "number")
    return (cu as Partial<CompteUtilisateurLite>).id ?? null;
  return null;
}
function extractRole(x: CandidatApi): RoleCode | null {
  const cu = x.compte_utilisateur;
  if (cu && typeof cu === "object")
    return ((cu as Partial<CompteUtilisateurLite>).role ?? null) as RoleCode | null;
  return null;
}
function extractActive(x: CandidatApi): boolean | undefined {
  const cu = x.compte_utilisateur;
  if (
    cu &&
    typeof cu === "object" &&
    typeof (cu as Partial<CompteUtilisateurLite>).is_active === "boolean"
  )
    return (cu as Partial<CompteUtilisateurLite>).is_active;
  return undefined;
}
function formatTypeContratLabel(typeContrat?: string | null, typeContratCode?: string | null): string | null {
  const value = _nn(typeContrat) || _nn(typeContratCode);
  if (!value) return null;
  const labels: Record<string, string> = {
    apprentissage: "Apprentissage",
    professionnalisation: "Professionnalisation",
    sans_contrat: "Sans contrat",
    poei_poec: "POEI / POEC",
    crif: "CRIF",
    autre: "Autre",
  };
  return labels[value] ?? value;
}
function deriveDepartementLabel(codePostal?: string | null): string | null {
  const value = _nn(codePostal).replace(/\s+/g, "");
  if (!value) return null;
  if (/^(97|98)\d/.test(value)) return value.slice(0, 3);
  if (value.length >= 2) return value.slice(0, 2);
  return null;
}
function normalizeCandidat(x: CandidatApi): CandidatPick {
  const prenom = _nn(x.prenom);
  const nom = _nn(x.nom);
  const nomComplet = _nn(x.nom_complet) || [prenom, nom].filter(Boolean).join(" ").trim();
  const formation = toFormationLite(x.formation, x.formation_id ?? null, x.formation_nom ?? null);
  const userId = extractUserId(x);
  const role = extractRole(x);
  const is_active = extractActive(x);
  return {
    id: x.id,
    nom,
    prenom,
    nom_complet: nomComplet,
    nom_naissance: x.nom_naissance ?? null,
    email: x.email ?? null,
    ville: x.ville ?? null,
    code_postal: x.code_postal ?? null,
    formation,
    formation_nom: x.formation_nom ?? null,
    formation_num_offre: x.formation_num_offre ?? null,
    formation_type_offre: x.formation_type_offre ?? null,
    centre_nom: x.centre_nom ?? null,
    type_contrat: x.type_contrat ?? null,
    type_contrat_code: x.type_contrat_code ?? null,
    entreprise_placement: x.entreprise_placement ?? null,
    entreprise_placement_nom: x.entreprise_placement_nom ?? null,
    entreprise_validee: x.entreprise_validee ?? null,
    entreprise_validee_nom: x.entreprise_validee_nom ?? null,
    placement_appairage_partenaire: x.placement_appairage_partenaire ?? null,
    placement_appairage_partenaire_nom: x.placement_appairage_partenaire_nom ?? null,
    last_appairage: x.last_appairage
      ? x.last_appairage
      : x.placement_appairage_partenaire
        ? {
            partenaire: x.placement_appairage_partenaire,
            partenaire_nom: x.placement_appairage_partenaire_nom ?? null,
          }
        : null,
    compte_utilisateur_id: userId ?? undefined,
    compte_utilisateur: { id: userId ?? undefined, role, is_active },
  };
}

function areSameNumberArrays(a: number[], b: number[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/* ---------- Component ---------- */
export default function CandidatsSelectModal({
  show,
  onClose,
  onSelect,
  onSelectMany,
  onlyCandidateLike = true,
  onlyActive = false,
  requireLinkedUser = false,
  onCreate,
  prospectionId,
  multiple = false,
  selectedIds = DEFAULT_SELECTED_IDS,
  allowClear = true,
}: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

  const dialogSection = theme.custom.dialog.section;
  const dialogSectionBackground = isLight
    ? dialogSection.background.light
    : dialogSection.background.dark;
  const dialogSectionBorder = isLight
    ? dialogSection.border.light
    : dialogSection.border.dark;

  const sectionTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;

  const sectionTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CandidatPick[]>([]);
  const [formationFilter, setFormationFilter] = useState<string>("");
  const [localSelectedIds, setLocalSelectedIds] = useState<number[]>(selectedIds);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, unknown> = { page_size: 50, lite: 1 };
        if (_nn(search)) {
          params.search = search;
          params.texte = search;
          params.q = search;
        }
        const res = await api.get<DRFEnvelope<CandidatApi>>("/candidats/", { params });
        const page = asPaginated<CandidatApi>(res.data);
        const normalized = page.results.map(normalizeCandidat);
        if (!cancelled) setItems(normalized);
      } catch (_err: unknown) {
        if (import.meta.env.MODE !== "production") {
          // eslint-disable-next-line no-console
          console.error("Erreur lors du chargement des candidats :", _err);
        }
        if (!cancelled) setError("Erreur lors du chargement des candidats.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPage();
    return () => {
      cancelled = true;
    };
  }, [search, show]);

  useEffect(() => {
    if (!show) return;
    setLocalSelectedIds((prev) => (areSameNumberArrays(prev, selectedIds) ? prev : selectedIds));
  }, [selectedIds, show]);

  const filtered = useMemo<CandidatPick[]>(() => {
    let list = items;
    if (onlyCandidateLike) {
      list = list.filter((c) => {
        const r = (c.compte_utilisateur?.role ?? "").toString().trim().toLowerCase() as RoleCode;
        return !c.compte_utilisateur?.role || candidateRoles.has(r);
      });
    }
    if (onlyActive) {
      list = list.filter((c) =>
        typeof c.compte_utilisateur?.is_active === "boolean"
          ? !!c.compte_utilisateur.is_active
          : true
      );
    }
    if (requireLinkedUser) {
      list = list.filter((c) => typeof c.compte_utilisateur_id === "number");
    }
    const s = _nn(search).toLowerCase();
    if (s) {
      list = list.filter((c) => {
        const full =
          `${c.nom_complet} ${c.email ?? ""} ${c.formation_nom ?? ""} ${c.centre_nom ?? ""}`.toLowerCase();
        return full.includes(s);
      });
    }
    if (formationFilter) {
      list = list.filter((c) => String(c.formation?.id ?? "") === formationFilter);
    }
    return list;
  }, [formationFilter, items, onlyActive, onlyCandidateLike, requireLinkedUser, search]);

  const formationOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of items) {
      const id = c.formation?.id;
      if (typeof id === "number" && !map.has(id)) {
        map.set(id, c.formation_nom || c.formation?.nom || `Formation #${id}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [items]);

  const toggleCandidate = (id: number) => {
    setLocalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((candidateId) => candidateId !== id) : [...prev, id]
    );
  };

  const handleConfirmMany = () => {
    if (!onSelectMany) return;
    const selected = filtered
      .filter((c) => localSelectedIds.includes(c.id))
      .concat(
        items.filter(
          (c) => localSelectedIds.includes(c.id) && !filtered.some((visible) => visible.id === c.id)
        )
      )
      .filter((c, index, arr) => arr.findIndex((x) => x.id === c.id) === index);
    onSelectMany(selected);
    onClose();
  };

  const canCreate = !!onCreate || typeof prospectionId === "number";
  const createDisabled = creating || _nn(nom) === "" || _nn(prenom) === "";

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const payload: CreateCandidatPayload = {
        nom: _nn(nom),
        prenom: _nn(prenom),
        email: _nn(email) || undefined,
        telephone: _nn(telephone) || undefined,
      };

      let created: CreateCandidatResult;
      if (onCreate) {
        created = await onCreate(payload);
      } else if (typeof prospectionId === "number") {
        const res = await api.post<ApiEnvelope<CreateCandidatResult>>(
          `/prospections/${prospectionId}/creer-candidat/`,
          payload
        );
        created = unwrap<CreateCandidatResult>(res.data);
      } else {
        return;
      }

      const pick: CandidatPick = {
        id: created.id,
        nom: created.nom,
        prenom: created.prenom,
        nom_complet: `${created.prenom} ${created.nom}`.trim(),
        email: created.email ?? null,
        ville: null,
        code_postal: null,
        formation: created.formation ? { id: created.formation, nom: null } : null,
        type_contrat: null,
        type_contrat_code: null,
      };

      toast.success("✅ Candidat créé et sélectionné");
      onSelect(pick);
      onClose();
    } catch (_err) {
      if (import.meta.env.MODE !== "production") {
        // eslint-disable-next-line no-console
        console.error("Erreur lors de la création du candidat :", _err);
      }
      toast.error("❌ Échec de la création du candidat");
    } finally {
      setCreating(false);
    }
  };

  const renderRowSecondary = (c: CandidatPick) => {
    const contrat = formatTypeContratLabel(c.type_contrat, c.type_contrat_code);
    const departement = deriveDepartementLabel(c.code_postal);

    return (
      <Stack spacing={0.35} sx={{ mt: 0.375 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          {[
            c.formation_nom,
            c.formation_num_offre ? `Offre ${c.formation_num_offre}` : null,
            c.formation_type_offre,
            c.centre_nom ? `Centre: ${c.centre_nom}` : null,
          ]
            .filter(Boolean)
            .join(" • ")}
        </Typography>

        <Typography variant="caption" color="text.secondary" component="div">
          {[
            contrat ? `Contrat: ${contrat}` : null,
            c.ville ? `Ville: ${c.ville}` : null,
            departement ? `Département: ${departement}` : null,
          ]
            .filter(Boolean)
            .join(" • ")}
        </Typography>
      </Stack>
    );
  };

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {multiple
          ? "Sélectionner plusieurs candidats / stagiaires"
          : "Sélectionner un candidat / stagiaire"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Box
            sx={{
              borderRadius: dialogSection.borderRadius,
              border: `1px solid ${dialogSectionBorder}`,
              background: dialogSectionBackground,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: dialogSection.padding,
                py: 1,
                background: sectionTitleBackground,
                borderBottom: sectionTitleBorder,
              }}
            >
              <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700 }}>
                Recherche et filtres
              </Typography>
            </Box>

            <Stack sx={{ p: dialogSection.padding }} spacing={1.5}>
              <TextField
                fullWidth
                type="search"
                placeholder="Rechercher un candidat (nom, email, formation, centre)…"
                value={search}
                onChange={(ev) => setSearch(ev.currentTarget.value)}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="candidats-select-formation-label">Formation</InputLabel>
                <Select
                  labelId="candidats-select-formation-label"
                  label="Formation"
                  value={formationFilter}
                  onChange={(ev) => setFormationFilter(String(ev.target.value))}
                >
                  <MenuItem value="">Toutes les formations</MenuItem>
                  {formationOptions.map((option) => (
                    <MenuItem key={option.id} value={String(option.id)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Box
            sx={{
              borderRadius: dialogSection.borderRadius,
              border: `1px solid ${dialogSectionBorder}`,
              background: dialogSectionBackground,
              overflow: "hidden",
              minHeight: theme.spacing(18),
            }}
          >
            {loading ? (
              <Box
                sx={{
                  minHeight: theme.spacing(18),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : error ? (
              <Box sx={{ p: dialogSection.padding }}>
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {!multiple && allowClear && (
                  <>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          onSelect({
                            id: 0,
                            nom: "",
                            prenom: "",
                            nom_complet: "— Aucun candidat —",
                            email: null,
                            ville: null,
                            code_postal: null,
                            formation: null,
                          });
                          onClose();
                        }}
                        sx={{
                          alignItems: "flex-start",
                          py: 1.25,
                          px: 1.5,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              Aucun candidat
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              Retirer l’attribution actuelle.
                            </Typography>
                          }
                          primaryTypographyProps={{ component: "div" }}
                          secondaryTypographyProps={{ component: "div" }}
                        />
                      </ListItemButton>
                    </ListItem>
                    <Divider />
                  </>
                )}

                {filtered.map((c, index) => (
                  <Box key={c.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          if (multiple) {
                            toggleCandidate(c.id);
                            return;
                          }
                          onSelect(c);
                          onClose();
                        }}
                        sx={{
                          alignItems: "flex-start",
                          py: 1.25,
                          px: 1.5,
                        }}
                      >
                        {multiple && (
                          <Checkbox
                            edge="start"
                            checked={localSelectedIds.includes(c.id)}
                            tabIndex={-1}
                            disableRipple
                            sx={{ mt: 0.125, mr: 0.5 }}
                          />
                        )}

                        <ListItemText
                          primary={
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={{ xs: 0.25, sm: 0.75 }}
                              alignItems={{ xs: "flex-start", sm: "baseline" }}
                              useFlexGap
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {c.nom_complet}
                              </Typography>
                              {c.email ? (
                                <Typography variant="caption" color="text.secondary">
                                  {c.email}
                                </Typography>
                              ) : null}
                            </Stack>
                          }
                          secondary={renderRowSecondary(c)}
                          primaryTypographyProps={{ component: "div" }}
                          secondaryTypographyProps={{ component: "div" }}
                        />
                      </ListItemButton>
                    </ListItem>

                    {index < filtered.length - 1 && <Divider component="li" />}
                  </Box>
                ))}

                {filtered.length === 0 && (
                  <Box sx={{ p: dialogSection.padding }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucun candidat trouvé.
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </Box>

          {canCreate && (
            <Box
              sx={{
                borderRadius: dialogSection.borderRadius,
                border: `1px solid ${dialogSectionBorder}`,
                background: dialogSectionBackground,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: dialogSection.padding,
                  py: 1,
                  background: sectionTitleBackground,
                  borderBottom: sectionTitleBorder,
                }}
              >
                <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700 }}>
                  Créer et lier un candidat
                </Typography>
              </Box>

              <Box sx={{ p: dialogSection.padding }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      placeholder="Prénom *"
                      value={prenom}
                      onChange={(ev) => setPrenom(ev.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      placeholder="Nom *"
                      value={nom}
                      onChange={(ev) => setNom(ev.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      placeholder="Email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      placeholder="Téléphone"
                      value={telephone}
                      onChange={(ev) => setTelephone(ev.target.value)}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-start" }}>
                  <Button onClick={handleCreate} disabled={createDisabled}>
                    {creating ? "Création…" : "Créer et sélectionner"}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {multiple && (
          <Button
            onClick={handleConfirmMany}
            variant="contained"
            disabled={!localSelectedIds.length}
          >
            Ajouter {localSelectedIds.length > 0 ? `(${localSelectedIds.length})` : ""}
          </Button>
        )}
        <Button onClick={onClose} color="secondary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}