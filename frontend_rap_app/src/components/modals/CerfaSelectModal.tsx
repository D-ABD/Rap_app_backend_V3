// src/components/modals/CerfaSelectModal.tsx
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
} from "@mui/material";
import { toast } from "react-toastify";
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

function cerfaTypeLabel(value?: "apprentissage" | "professionnalisation" | string | null): string {
  if (value === "professionnalisation") return "Contrat de professionnalisation";
  if (value === "apprentissage") return "Contrat apprentissage";
  return "Type inconnu";
}

/* ---------- Component ---------- */
export default function CerfaSelectModal({ show, onClose, onSelect, onCreate }: Props) {
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CerfaPick[]>([]);

  // Création d’un nouveau CERFA
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [creating, setCreating] = useState(false);

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
        const res = await api.get<DRFEnvelope<CerfaContrat>>("/cerfa-contrats/", { params });
        const page = asPaginated<CerfaContrat>(res.data);
        const normalized = page.results.map(normalizeCerfa);
        if (!cancelled) setItems(normalized);
      } catch (_err: unknown) {
        if (import.meta.env.MODE !== "production") {
          // eslint-disable-next-line no-console
          console.error("Erreur lors du chargement des contrats CERFA :", _err);
        }
        if (!cancelled) setError("Erreur lors du chargement des contrats CERFA.");
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
      <DialogContent dividers>
        <TextField
          fullWidth
          type="search"
          placeholder="🔍 Rechercher un contrat (apprenti, employeur, formation)…"
          value={search}
          onChange={(ev) => setSearch(ev.currentTarget.value)}
          margin="normal"
        />

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <List>
            {filtered.map((c) => (
              <ListItem key={c.id} disablePadding>
                <ListItemButton onClick={() => onSelect(c)} sx={{ borderBottom: "1px solid #eee" }}>
                  <ListItemText
                    primary={
                      <strong>
                        {c.apprenti_prenom} {c.apprenti_nom_naissance}
                      </strong>
                    }
                    secondary={
                      <>
                        {`🧾 ${cerfaTypeLabel(c.cerfa_type)}`}
                        {c.employeur_nom && ` • 🏢 ${c.employeur_nom}`}
                        {c.formation_nom && ` • 🎓 ${c.formation_nom}`}
                        {c.date_conclusion && ` • 📅 ${c.date_conclusion}`}
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
            {filtered.length === 0 && <Typography>Aucun contrat trouvé.</Typography>}
          </List>
        )}

        {canCreate && (
          <Box sx={{ mt: 2, p: 2, border: "1px dashed #ccc", borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Créer un nouveau CERFA
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  placeholder="Prénom de l’apprenti *"
                  value={prenom}
                  onChange={(ev) => setPrenom(ev.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  placeholder="Nom de l’apprenti *"
                  value={nom}
                  onChange={(ev) => setNom(ev.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  placeholder="Employeur (optionnel)"
                  value={employeur}
                  onChange={(ev) => setEmployeur(ev.target.value)}
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
        <Button onClick={onClose} color="secondary">
          ❌ Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
