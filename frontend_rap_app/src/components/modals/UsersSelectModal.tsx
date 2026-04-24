// src/components/modals/UsersSelectModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Box,
  Divider,
} from "@mui/material";
import api from "../../api/axios";
import EntityPickerDialog from "../dialogs/EntityPickerDialog";

export type RoleCode =
  | "candidat"
  | "stagiaire"
  | "candidatuser"
  | "admin"
  | "superadmin"
  | "staff"
  | "test"
  | string;

type DRFPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type DRFEnvelope<T> = DRFPaginated<T> | { data: DRFPaginated<T> };

type UserApi = {
  id: number;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role?: RoleCode | null;
  is_active?: boolean;
};

export type UserPick = {
  id: number;
  full_name: string;
  email: string | null;
  role: RoleCode | null;
  is_active: boolean;
};

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (u: UserPick) => void;
  allowedRoles?: RoleCode[];
  onlyActive?: boolean;
}

function asPaginated<T>(data: DRFEnvelope<T>): DRFPaginated<T> {
  return "results" in data ? data : data.data;
}

const _nn = (v?: string | null) => (v ?? "").trim();

function toFullName(x: UserApi): string {
  return (
    _nn(x.full_name) ||
    [_nn(x.first_name), _nn(x.last_name)].filter(Boolean).join(" ").trim() ||
    _nn(x.email) ||
    `Utilisateur #${x.id}`
  );
}

function normalizeUser(u: UserApi): UserPick {
  return {
    id: u.id,
    full_name: toFullName(u),
    email: u.email ?? null,
    role: (u.role ?? null) as RoleCode | null,
    is_active: typeof u.is_active === "boolean" ? u.is_active : true,
  };
}

export default function UsersSelectModal({
  show,
  onClose,
  onSelect,
  allowedRoles = ["staff", "admin", "superadmin", "commercial", "charge_recrutement"],
  onlyActive = true,
}: Props) {
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UserPick[]>([]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, unknown> = { page_size: 50 };

        if (_nn(search)) {
          params.search = search;
          params.q = search;
          params.texte = search;
        }

        params.role__in = allowedRoles.join(",");
        if (onlyActive) params.is_active = true;

        const endpoints = ["/users/", "/utilisateurs/", "/accounts/users/"];
        let page: DRFPaginated<UserApi> | null = null;
        let lastError: unknown = null;

        for (const url of endpoints) {
          try {
            const res = await api.get<DRFEnvelope<UserApi>>(url, { params });
            page = asPaginated<UserApi>(res.data);
            break;
          } catch (e: unknown) {
            lastError = e;
          }
        }

        if (!page) {
          throw lastError ?? new Error("Aucun endpoint utilisateur valide.");
        }

        const normalized = page.results.map(normalizeUser);
        if (!cancelled) setItems(normalized);
      } catch {
        if (!cancelled) {
          setError("Erreur lors du chargement des utilisateurs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [allowedRoles, onlyActive, search, show]);

  const allowed = useMemo(
    () => new Set(allowedRoles.map((r) => r.toString().toLowerCase())),
    [allowedRoles]
  );

  const filtered = useMemo<UserPick[]>(() => {
    let list = items;

    list = list.filter((u) =>
      u.role ? allowed.has(u.role.toString().toLowerCase()) : false
    );

    if (onlyActive) {
      list = list.filter((u) => u.is_active);
    }

    const s = _nn(search).toLowerCase();
    if (s) {
      list = list.filter((u) =>
        `${u.full_name} ${u.email ?? ""}`.toLowerCase().includes(s)
      );
    }

    return list;
  }, [allowed, items, onlyActive, search]);

  return (
    <EntityPickerDialog
      open={show}
      onClose={onClose}
      title="Sélectionner un utilisateur métier"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Rechercher un utilisateur (nom, email)…",
        type: "search",
      }}
      showSearchWhenLoading
      loading={loading}
      error={error}
      empty={!loading && !error && filtered.length === 0}
      emptyMessage="Aucun utilisateur trouvé."
    >
      <List disablePadding>
        {filtered.map((u, index) => (
          <Box key={u.id}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => onSelect(u)}>
                <ListItemText
                  disableTypography
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Typography variant="body2" component="span" fontWeight={700}>
                        {u.full_name}
                      </Typography>

                      {u.email ? (
                        <Typography
                          variant="body2"
                          component="span"
                          color="text.secondary"
                        >
                          ({u.email})
                        </Typography>
                      ) : null}

                      {u.role ? (
                        <Chip size="small" label={u.role} variant="outlined" />
                      ) : null}
                    </Box>
                  }
                  secondary={
                    !u.is_active ? (
                      <Typography variant="body2" component="div" color="text.secondary">
                        Compte inactif
                      </Typography>
                    ) : null
                  }
                />
              </ListItemButton>
            </ListItem>

            {index < filtered.length - 1 ? <Divider /> : null}
          </Box>
        ))}
      </List>
    </EntityPickerDialog>
  );
}