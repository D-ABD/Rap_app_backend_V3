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
  CircularProgress,
  Box,
  Grid,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import axios, { AxiosError } from "axios"; // ✅ import correct
import api from "../../api/axios";
import type { Partenaire } from "../../types/partenaire";

/* ---------- Types ---------- */
interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (partenaire: Partenaire) => void;
  onCreate?: (payload: CreatePartPayload, opts?: { reuse?: boolean }) => Promise<PartenaireMinimal>;
  prospectionId?: number;
}

type PartenaireMinimal = {
  id: number;
  nom: string;
  type: string;
  secteur_activite?: string | null;
  city?: string | null;
  zip_code?: string | null;
  contact_nom?: string | null;
  contact_email?: string | null;
  contact_telephone?: string | null;
  website?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CreatePartPayload = {
  nom: string;
  type?: string | null;
  secteur_activite?: string | null;
  street_name?: string | null;
  zip_code?: string | null;
  city?: string | null;
  country?: string | null;
  contact_nom?: string | null;
  contact_poste?: string | null;
  contact_telephone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  social_network_url?: string | null;
  actions?: string | null;
  action_description?: string | null;
  description?: string | null;
};

type ListResponse<T> = {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};
type ApiListEnvelope<T> = { data: ListResponse<T> } | ListResponse<T> | T[];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toArray<T>(payload: ApiListEnvelope<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && "data" in payload && isRecord((payload as { data: unknown }).data)) {
    const d = (payload as { data: unknown }).data as ListResponse<T>;
    return Array.isArray(d.results) ? d.results : [];
  }
  if (isRecord(payload) && "results" in payload) {
    const d = payload as ListResponse<T>;
    return Array.isArray(d.results) ? d.results : [];
  }
  return [];
}

type ApiEnvelope<T> = { data: T } | T;
function unwrap<T>(payload: ApiEnvelope<T>): T {
  return isRecord(payload) && "data" in payload ? (payload as { data: T }).data : (payload as T);
}

/* ---------- Component ---------- */
export default function PartenaireSelectModal({
  show,
  onClose,
  onSelect,
  onCreate,
  prospectionId,
}: Props) {
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // mini-form création
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    api
      .get<ApiListEnvelope<Partenaire>>("/partenaires/", {
        params: { page_size: 100 },
      })
      .then((res) => {
        setPartenaires(toArray<Partenaire>(res.data));
        setError(false);
      })
      .catch(() => {
        setError(true);
        setPartenaires([]);
      })
      .finally(() => setLoading(false));
  }, [show]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return partenaires.filter(
      (p) => p.nom.toLowerCase().includes(q) || (!!p.city && p.city.toLowerCase().includes(q))
    );
  }, [partenaires, search]);

  const canCreate = !!onCreate || typeof prospectionId === "number";
  const createDisabled = creating || nom.trim() === "";

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const payload: CreatePartPayload = {
        nom: nom.trim(),
        type: type.trim() || null,
        city: city.trim() || null,
        zip_code: zip.trim() || null,
        contact_email: email.trim() || null,
        contact_telephone: tel.trim() || null,
      };

      let created: PartenaireMinimal;
      if (onCreate) {
        created = await onCreate(payload, { reuse: true });
      } else if (typeof prospectionId === "number") {
        const res = await api.post<ApiEnvelope<PartenaireMinimal>>(
          `/prospections/${prospectionId}/creer-partenaire/`,
          payload,
          { params: { reuse: true } }
        );
        created = unwrap<PartenaireMinimal>(res.data);
      } else {
        return;
      }

      toast.success("✅ Partenaire créé et sélectionné");
      onSelect(created as Partenaire);
      onClose();
    } catch (err: unknown) {
      // ✅ typage correct + test axios
      if (axios.isAxiosError(err)) {
        const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
        if (typeof detail === "string") {
          if (detail.toLowerCase().includes("centre")) {
            toast.error(`❌ ${detail} — contactez votre administrateur.`);
          } else {
            toast.error(`❌ ${detail}`);
          }
        } else {
          toast.error("❌ Échec de la création du partenaire.");
        }
      } else {
        toast.error("❌ Échec de la création du partenaire.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>🏢 Sélectionner un partenaire</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">❌ Erreur lors du chargement des partenaires.</Typography>
        ) : (
          <>
            <TextField
              fullWidth
              type="text"
              placeholder="🔍 Rechercher par nom ou ville..."
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              margin="normal"
            />
            <List>
              {filtered.map((partenaire) => (
                <ListItem key={partenaire.id} disablePadding>
                  <ListItemButton onClick={() => onSelect(partenaire)}>
                    <ListItemText primary={partenaire.nom} secondary={partenaire.city ?? ""} />
                  </ListItemButton>
                </ListItem>
              ))}
              {filtered.length === 0 && <Typography>Aucun partenaire trouvé.</Typography>}
            </List>
          </>
        )}

        {canCreate && (
          <Box sx={{ mt: 2, p: 2, border: "1px dashed #ccc", borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Créer et lier un partenaire
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nom *"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Ville"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Code postal"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Email contact"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Téléphone contact"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
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
