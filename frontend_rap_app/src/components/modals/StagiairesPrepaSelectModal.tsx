import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EntityPickerDialog from "../dialogs/EntityPickerDialog";
import api from "../../api/axios";
import type { StagiairePrepa } from "src/types/prepa";

type RawStagiaire = {
  id?: number;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  statut_parcours?: string | null;
  statut_parcours_display?: string | null;
  centre_nom?: string | null;
  prepa_origine_label?: string | null;
  atelier_en_cours?: string | null;
  atelier_en_cours_display?: string | null;
  atelier_en_cours_date?: string | null;
};

type Props = {
  show: boolean;
  onClose: () => void;
  onSelect: (stagiaires: StagiairePrepa[]) => void;
  centreId?: number;
  selectedStagiaires?: StagiairePrepa[];
};

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeResults(payload: unknown): RawStagiaire[] {
  if (Array.isArray(payload)) return payload as RawStagiaire[];
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.results)) return payload.results as RawStagiaire[];
  if (isRecord(payload.data) && Array.isArray(payload.data.results)) {
    return payload.data.results as RawStagiaire[];
  }
  return [];
}

function toDraftStagiaire(stagiaire: RawStagiaire): StagiairePrepa {
  return {
    id: stagiaire.id,
    nom: (stagiaire.nom ?? "").trim(),
    prenom: (stagiaire.prenom ?? "").trim(),
    telephone: (stagiaire.telephone ?? "").trim() || null,
    email: (stagiaire.email ?? "").trim() || null,
    statut_parcours: (stagiaire.statut_parcours as StagiairePrepa["statut_parcours"]) ?? "en_attente",
    atelier_en_cours: (stagiaire.atelier_en_cours as StagiairePrepa["atelier_en_cours"]) ?? null,
    atelier_en_cours_display: stagiaire.atelier_en_cours_display ?? null,
    atelier_en_cours_date: stagiaire.atelier_en_cours_date ?? null,
  };
}

const emptyDraft = (centreId?: number): Partial<StagiairePrepa> => ({
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  centre_id: centreId,
  statut_parcours: "en_attente",
});

export default function StagiairesPrepaSelectModal({
  show,
  onClose,
  onSelect,
  centreId,
  selectedStagiaires = [],
}: Props) {
  const [items, setItems] = useState<RawStagiaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<StagiairePrepa>>(emptyDraft(centreId));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!show) return;
    setDraft(emptyDraft(centreId));
    setCreateError(null);
    setSelectedIds([]);
  }, [show, centreId]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/stagiaires-prepa/", {
          params: {
            search: debouncedSearch || undefined,
            centre: centreId,
            page_size: 100,
            ordering: "nom",
          },
        });
        if (!cancelled) {
          setItems(normalizeResults(res.data));
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setError("Erreur lors du chargement des stagiaires Prépa.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchItems();
    return () => {
      cancelled = true;
    };
  }, [show, debouncedSearch, centreId]);

  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedStagiaires.map((stagiaire) =>
          `${(stagiaire.nom ?? "").trim().toLowerCase()}|${(stagiaire.prenom ?? "").trim().toLowerCase()}|${(
            stagiaire.email ?? ""
          )
            .trim()
            .toLowerCase()}`
        )
      ),
    [selectedStagiaires]
  );

  const visibleItems = useMemo(
    () =>
      items.filter((stagiaire) => {
        const key = `${(stagiaire.nom ?? "").trim().toLowerCase()}|${(stagiaire.prenom ?? "")
          .trim()
          .toLowerCase()}|${(stagiaire.email ?? "")
          .trim()
          .toLowerCase()}`;
        return !selectedKeys.has(key);
      }),
    [items, selectedKeys]
  );

  const updateDraft = <K extends keyof StagiairePrepa>(key: K, value: StagiairePrepa[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggleSelected = (id?: number) => {
    if (!id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const handleImportMany = () => {
    const chosen = visibleItems.filter((stagiaire) => stagiaire.id && selectedIds.includes(stagiaire.id));
    if (!chosen.length) return;
    onSelect(chosen.map(toDraftStagiaire));
    onClose();
  };

  const handleCreate = () => {
    const nom = (draft.nom ?? "").trim();
    const prenom = (draft.prenom ?? "").trim();

    if (!nom || !prenom) {
      setCreateError("Le nom et le prénom sont obligatoires.");
      return;
    }

    onSelect([
      {
        nom,
        prenom,
        telephone: (draft.telephone ?? "").trim() || null,
        email: (draft.email ?? "").trim() || null,
        centre_id: draft.centre_id ?? centreId,
        statut_parcours: draft.statut_parcours ?? "en_attente",
      },
    ]);

    setShowCreate(false);
    setCreateError(null);
    setDraft(emptyDraft(centreId));
    onClose();
  };

  return (
    <>
      <EntityPickerDialog
        open={show}
        onClose={onClose}
        title="Ajouter un stagiaire Prépa"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Rechercher un stagiaire Prépa…",
        }}
        loading={loading}
        error={error}
        empty={!loading && !error && visibleItems.length === 0}
        emptyMessage="Aucun stagiaire Prépa disponible. Vous pouvez en créer un depuis cette fenêtre."
      >
        <Stack spacing={1.5}>
          <Alert severity="info">
            L'import réutilise une fiche stagiaire Prépa existante dans la séance, ou permet d'en créer une nouvelle si besoin.
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={() => setShowCreate(true)}>
              Créer un stagiaire Prépa
            </Button>
            <Button variant="outlined" disabled={selectedIds.length === 0} onClick={handleImportMany}>
              Importer les stagiaires sélectionnés ({selectedIds.length})
            </Button>
          </Stack>

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Importer un stagiaire existant
          </Typography>

          <Button variant="text" sx={{ alignSelf: "flex-start" }} onClick={() => setSelectedIds(visibleItems.flatMap((item) => (item.id ? [item.id] : [])))}>
            Tout sélectionner
          </Button>

          <List disablePadding>
            {visibleItems.map((stagiaire, index) => (
              <React.Fragment key={stagiaire.id ?? `${stagiaire.nom}-${stagiaire.prenom}-${index}`}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => toggleSelected(stagiaire.id)} sx={{ alignItems: "flex-start", px: 0.5 }}>
                    <Checkbox
                      edge="start"
                      checked={Boolean(stagiaire.id && selectedIds.includes(stagiaire.id))}
                      tabIndex={-1}
                      disableRipple
                      sx={{ mt: 0.25, mr: 1 }}
                    />
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {(stagiaire.prenom ?? "").trim()} {(stagiaire.nom ?? "").trim()}
                        </Typography>
                      }
                      secondary={
                        <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                          {stagiaire.statut_parcours_display ? (
                            <Typography variant="caption" color="text.secondary">
                              {stagiaire.statut_parcours_display}
                            </Typography>
                          ) : null}
                          {stagiaire.centre_nom ? (
                            <Typography variant="caption" color="text.secondary">
                              Centre: {stagiaire.centre_nom}
                            </Typography>
                          ) : null}
                          {stagiaire.prepa_origine_label ? (
                            <Typography variant="caption" color="text.secondary">
                              Origine: {stagiaire.prepa_origine_label}
                            </Typography>
                          ) : null}
                          {stagiaire.atelier_en_cours_display ? (
                            <Typography variant="caption" color="warning.main">
                              Déjà sur: {stagiaire.atelier_en_cours_display}
                            </Typography>
                          ) : null}
                          {stagiaire.email ? (
                            <Typography variant="caption" color="text.secondary">
                              {stagiaire.email}
                            </Typography>
                          ) : null}
                        </Stack>
                      }
                      primaryTypographyProps={{ component: "div" }}
                      secondaryTypographyProps={{ component: "div" }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < visibleItems.length - 1 ? <Divider component="li" /> : null}
              </React.Fragment>
            ))}
          </List>
        </Stack>
      </EntityPickerDialog>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Créer un stagiaire Prépa à rattacher à cette séance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError ? <Alert severity="warning">{createError}</Alert> : null}

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Nom"
                    value={draft.nom ?? ""}
                    onChange={(e) => updateDraft("nom", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Prénom"
                    value={draft.prenom ?? ""}
                    onChange={(e) => updateDraft("prenom", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Téléphone"
                    value={draft.telephone ?? ""}
                    onChange={(e) => updateDraft("telephone", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email"
                    value={draft.email ?? ""}
                    onChange={(e) => updateDraft("email", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Statut de parcours"
                    value={draft.statut_parcours ?? "en_attente"}
                    onChange={(e) =>
                      updateDraft("statut_parcours", e.target.value as StagiairePrepa["statut_parcours"])
                    }
                  >
                    <MenuItem value="en_attente">En attente de parcours</MenuItem>
                    <MenuItem value="en_parcours">En parcours</MenuItem>
                    <MenuItem value="parcours_termine">Parcours terminé</MenuItem>
                    <MenuItem value="abandon">Abandon</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreate(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate}>
            Ajouter à la séance
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
