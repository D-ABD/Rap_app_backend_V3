// src/components/modals/CerfaSelectModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Grid,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";
import SearchInput from "../SearchInput";
import type { AppTheme } from "../../theme";
import { api, CerfaContrat } from "../../types/cerfa";

/* ---------- Types ---------- */
type DRFPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type DRFEnvelope<T> = DRFPaginated<T> | { data: DRFPaginated<T> };

function asPaginated<T>(data: DRFEnvelope<T>): DRFPaginated<T> {
  return "results" in data ? data : data.data;
}

/* ---------- Types pour la sélection ---------- */
export type CerfaPick = {
  id: number;
  cerfa_type?: "apprentissage" | "professionnalisation" | null;
  apprenti_nom_naissance: string | null;
  apprenti_prenom: string | null;
  employeur_nom?: string | null;
  formation_nom?: string | null;
  date_conclusion?: string | null;
  pdf_url?: string | null;
};

/* ---------- Props ---------- */
interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (cerfa: CerfaPick) => void;
  onCreate?: (payload: Partial<CerfaContrat>) => Promise<CerfaPick>;
}

/* ---------- Helpers ---------- */
function normalizeCerfa(x: CerfaContrat): CerfaPick {
  return {
    id: x.id,
    cerfa_type: x.cerfa_type ?? "apprentissage",
    apprenti_nom_naissance: x.apprenti_nom_naissance ?? null,
    apprenti_prenom: x.apprenti_prenom ?? null,
    employeur_nom: x.employeur_nom ?? null,
    formation_nom: x.diplome_vise ?? null,
    date_conclusion: x.date_conclusion ?? null,
    pdf_url: x.pdf_url ?? null,
  };
}

function cerfaTypeLabel(
  value?: "apprentissage" | "professionnalisation" | string | null
): string {
  if (value === "professionnalisation") {
    return "Contrat de professionnalisation";
  }
  if (value === "apprentissage") {
    return "Contrat apprentissage";
  }
  return "Type inconnu";
}

/* ---------- Component ---------- */
export default function CerfaSelectModal({
  show,
  onClose,
  onSelect,
  onCreate,
}: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CerfaPick[]>([]);

  // Création d’un nouveau CERFA
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [creating, setCreating] = useState(false);

  const dialogSectionTokens = theme.custom.dialog.section;
  const sectionBackground = isLight
    ? dialogSectionTokens.background.light
    : dialogSectionTokens.background.dark;
  const sectionBorder = isLight
    ? dialogSectionTokens.border.light
    : dialogSectionTokens.border.dark;

  const sectionTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const sectionTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  /* ---------- Chargement depuis API ---------- */
  useEffect(() => {
    if (!show) return;
    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, unknown> = { page_size: 50 };
        if (search.trim()) params.search = search.trim();

        const res = await api.get<DRFEnvelope<CerfaContrat>>("/cerfa-contrats/", {
          params,
        });

        const page = asPaginated<CerfaContrat>(res.data);
        const normalized = page.results.map(normalizeCerfa);

        if (!cancelled) setItems(normalized);
      } catch (_err: unknown) {
        if (import.meta.env.MODE !== "production") {
          // eslint-disable-next-line no-console
          console.error("Erreur lors du chargement des contrats CERFA :", _err);
        }
        if (!cancelled) {
          setError("Erreur lors du chargement des contrats CERFA.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPage();

    return () => {
      cancelled = true;
    };
  }, [search, show]);

  /* ---------- Filtrage local ---------- */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((c) => {
      const full =
        `${c.apprenti_prenom ?? ""} ${c.apprenti_nom_naissance ?? ""} ${c.employeur_nom ?? ""} ${c.formation_nom ?? ""}`.toLowerCase();
      return full.includes(s);
    });
  }, [items, search]);

  /* ---------- Création rapide ---------- */
  const handleCreate = async () => {
    if (!onCreate) return;

    setCreating(true);
    try {
      const payload: Partial<CerfaContrat> = {
        apprenti_nom_naissance: nom.trim(),
        apprenti_prenom: prenom.trim(),
        employeur_nom: employeur.trim() || undefined,
      };

      const created = await onCreate(payload);
      toast.success("✅ CERFA créé et sélectionné");
      onSelect(created);
      onClose();
    } catch (_err) {
      if (import.meta.env.MODE !== "production") {
        // eslint-disable-next-line no-console
        console.error("Erreur lors de la création du CERFA :", _err);
      }
      toast.error("❌ Échec de la création du CERFA");
    } finally {
      setCreating(false);
    }
  };

  const canCreate = !!onCreate;
  const createDisabled = creating || !prenom.trim() || !nom.trim();

  /* ---------- Render ---------- */
  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Sélectionner un contrat CERFA</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <SearchInput
            placeholder="Rechercher un contrat (apprenti, employeur, formation)…"
            value={search}
            onChange={(ev) => setSearch(ev.currentTarget.value)}
            fullWidth
          />

          <Box
            sx={{
              border: sectionBorder,
              borderRadius: dialogSectionTokens.borderRadius,
              background: sectionBackground,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: dialogSectionTokens.padding,
                py: 1,
                background: sectionTitleBackground,
                borderBottom: sectionTitleBorder,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Contrats disponibles
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 2,
                  }}
                >
                  <CircularProgress size={28} />
                </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : filtered.length === 0 ? (
                <Typography color="text.secondary">
                  Aucun contrat trouvé.
                </Typography>
              ) : (
                <List disablePadding>
                  {filtered.map((c, index) => (
                    <Box key={c.id}>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => onSelect(c)}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={700}>
                                {c.apprenti_prenom} {c.apprenti_nom_naissance}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="span"
                                sx={{ display: "block", mt: 0.25 }}
                              >
                                {cerfaTypeLabel(c.cerfa_type)}
                                {c.employeur_nom && ` • ${c.employeur_nom}`}
                                {c.formation_nom && ` • ${c.formation_nom}`}
                                {c.date_conclusion && ` • ${c.date_conclusion}`}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>

                      {index < filtered.length - 1 ? <Divider /> : null}
                    </Box>
                  ))}
                </List>
              )}
            </Box>
          </Box>

          {canCreate && (
            <Box
              sx={{
                border: sectionBorder,
                borderRadius: dialogSectionTokens.borderRadius,
                background: sectionBackground,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: dialogSectionTokens.padding,
                  py: 1,
                  background: sectionTitleBackground,
                  borderBottom: sectionTitleBorder,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  Créer un nouveau CERFA
                </Typography>
              </Box>

              <Box sx={{ p: dialogSectionTokens.padding }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <SearchInput
                      placeholder="Prénom de l’apprenti *"
                      type="text"
                      value={prenom}
                      onChange={(ev) => setPrenom(ev.currentTarget.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <SearchInput
                      placeholder="Nom de l’apprenti *"
                      type="text"
                      value={nom}
                      onChange={(ev) => setNom(ev.currentTarget.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <SearchInput
                      placeholder="Employeur (optionnel)"
                      type="text"
                      value={employeur}
                      onChange={(ev) => setEmployeur(ev.currentTarget.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1.5 }}>
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
        <Button onClick={onClose} color="secondary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}