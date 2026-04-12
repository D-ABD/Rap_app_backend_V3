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
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../api/axios";

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
  selectedIds = [],
  allowClear = true,
}: Props) {
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

    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [search, show]);

  useEffect(() => {
    if (!show) return;
    setLocalSelectedIds(selectedIds);
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

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {multiple ? "Sélectionner plusieurs candidats / stagiaires" : "Sélectionner un candidat / stagiaire"}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          type="search"
          placeholder="🔍 Rechercher un candidat (nom, email, formation, centre)…"
          value={search}
          onChange={(ev) => setSearch(ev.currentTarget.value)}
          margin="normal"
        />

        <FormControl fullWidth margin="normal" size="small">
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

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">❌ {error}</Typography>
        ) : (
          <List>
            {/* 🟢 Option spéciale pour désélectionner le candidat */}
            {!multiple && allowClear && (
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
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    "&:hover": { backgroundColor: "action.hover" },
                  }}
                >
                  <ListItemText
                    primary={<strong>❌ Aucun candidat (retirer l’attribution)</strong>}
                    secondary="Cette prospection ne sera liée à aucun candidat."
                  />
                </ListItemButton>
              </ListItem>
            )}

            {/* Liste normale des candidats */}
            {filtered.map((c) => (
              <ListItem key={c.id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (multiple) {
                      toggleCandidate(c.id);
                      return;
                    }
                    onSelect(c);
                    onClose();
                  }}
                  sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                >
                  {multiple && (
                    <Checkbox
                      edge="start"
                      checked={localSelectedIds.includes(c.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  )}
                  <ListItemText
                    primary={
                      <>
                        <strong>{c.nom_complet}</strong>
                        {c.email && <span style={{ color: "var(--mui-palette-text-secondary)" }}> ({c.email})</span>}
                      </>
                    }
                    secondary={
                      <Box component="span" sx={{ display: "flex", flexDirection: "column", gap: 0.35, mt: 0.25 }}>
                        <Box component="span">
                          {c.formation_nom && `🎓 ${c.formation_nom}`}
                          {c.formation_num_offre && ` • Offre ${c.formation_num_offre}`}
                          {c.formation_type_offre && ` • ${c.formation_type_offre}`}
                          {c.centre_nom && ` • Centre: ${c.centre_nom}`}
                        </Box>
                        <Box component="span">
                          {formatTypeContratLabel(c.type_contrat, c.type_contrat_code) &&
                            `📝 Contrat: ${formatTypeContratLabel(c.type_contrat, c.type_contrat_code)}`}
                          {c.ville && ` • Ville: ${c.ville}`}
                          {deriveDepartementLabel(c.code_postal) &&
                            ` • Département: ${deriveDepartementLabel(c.code_postal)}`}
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}

            {filtered.length === 0 && <Typography sx={{ p: 1 }}>Aucun candidat trouvé.</Typography>}
          </List>
        )}

        {canCreate && (
          <Box sx={{ mt: 2, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Créer et lier un candidat
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  placeholder="Prénom *"
                  value={prenom}
                  onChange={(ev) => setPrenom(ev.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  placeholder="Nom *"
                  value={nom}
                  onChange={(ev) => setNom(ev.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  placeholder="Email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  placeholder="Téléphone"
                  value={telephone}
                  onChange={(ev) => setTelephone(ev.target.value)}
                />
              </Grid>
            </Grid>
            <Button onClick={handleCreate} disabled={createDisabled} sx={{ mt: 1 }}>
              {creating ? "Création…" : "Créer et sélectionner"}
            </Button>
          </Box>
        )}
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
          ❌ Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
