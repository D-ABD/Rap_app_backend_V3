// src/components/modals/ProspectionSelectModal.tsx
import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
  Button,
  Box,
  Divider,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import api from "../../api/axios";
import SearchInput from "../SearchInput";
import type { AppTheme } from "../../theme";

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (prospection: ProspectionLite) => void;
}

export interface ProspectionLite {
  id: number;
  partenaire_nom?: string;
  formation_nom?: string;
  statut_display?: string;
  owner_username?: string;
  date_prospection?: string;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

export default function ProspectionSelectModal({
  show,
  onClose,
  onSelect,
}: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

  const [items, setItems] = useState<ProspectionLite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

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

  const sectionContainerSx = {
    border: sectionBorder,
    borderRadius: dialogSectionTokens.borderRadius,
    background: sectionBackground,
    overflow: "hidden",
  } as const;

  const sectionHeaderSx = {
    px: dialogSectionTokens.padding,
    py: 1,
    background: sectionTitleBackground,
    borderBottom: sectionTitleBorder,
  } as const;

  useEffect(() => {
    if (!show) return;

    setLoading(true);
    api
      .get("/prospections/", {
        params: { page_size: 100, ordering: "-date_prospection" },
      })
      .then((res) => {
        const results = res?.data?.data?.results ?? res?.data?.results ?? [];

        if (Array.isArray(results)) {
          const mapped: ProspectionLite[] = results
            .map((r: unknown) => {
              const obj = r as Record<string, unknown>;
              return {
                id: Number(obj.id),
                partenaire_nom:
                  typeof obj.partenaire_nom === "string" ? obj.partenaire_nom : undefined,
                formation_nom:
                  typeof obj.formation_nom === "string" ? obj.formation_nom : undefined,
                statut_display:
                  typeof obj.statut_display === "string" ? obj.statut_display : undefined,
                owner_username:
                  typeof obj.owner_username === "string" ? obj.owner_username : undefined,
                date_prospection:
                  typeof obj.date_prospection === "string" ? obj.date_prospection : undefined,
              };
            })
            .filter((x) => Number.isFinite(x.id));

          setItems(mapped);
          setError(false);
        } else {
          setItems([]);
          setError(false);
        }
      })
      .catch(() => {
        setError(true);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [show]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return items.filter((p) => {
      const parts = [
        p.partenaire_nom ?? "",
        p.formation_nom ?? "",
        p.statut_display ?? "",
        p.owner_username ?? "",
        String(p.id),
      ].map((s) => s.toLowerCase());

      return parts.some((s) => s.includes(q));
    });
  }, [items, search]);

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Sélectionner une prospection</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <SearchInput
            placeholder="Rechercher par partenaire, formation, statut, owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />

          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Typography variant="subtitle2" fontWeight={700}>
                Prospections disponibles
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error">
                  Les prospections n'ont pas pu être chargées.
                </Typography>
              ) : filtered.length === 0 ? (
                <Typography color="text.secondary">
                  Aucune prospection trouvée.
                </Typography>
              ) : (
                <List disablePadding>
                  {filtered.map((p, index) => (
                    <Box key={p.id}>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => onSelect(p)}>
                          <ListItemText
                            disableTypography
                            primary={
                              <Typography variant="body2" component="div" fontWeight={700}>
                                #{p.id}
                                {p.partenaire_nom ? ` • ${p.partenaire_nom}` : ""}
                                {p.formation_nom ? ` • ${p.formation_nom}` : ""}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                component="div"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                              >
                                {p.statut_display ?? "—"}
                                {p.owner_username ? ` • ${p.owner_username}` : ""}
                                {p.date_prospection
                                  ? ` • ${formatDate(p.date_prospection)}`
                                  : ""}
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