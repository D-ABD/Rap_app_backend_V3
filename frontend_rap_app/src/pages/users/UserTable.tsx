// src/pages/users/UserTable.tsx
import { useMemo } from "react";
import { Box, Button, Checkbox } from "@mui/material";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";
import { User } from "../../types/User";

interface Props {
  users: User[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onEdit: (id: number) => void;
}

export default function UserTable({ users, selectedIds, onToggleSelect, onEdit }: Props) {
  const columns = useMemo<TableColumn<User>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: 48,
        sticky: "left",
        headerRender: () => <Box />,
        render: (row) => (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ display: "inline-flex" }}
          >
            <Checkbox
              checked={selectedIds.includes(row.id)}
              onChange={() => onToggleSelect(row.id)}
            />
          </Box>
        ),
      },
      {
        key: "full_name",
        label: "Nom",
        sticky: "left",
        stickyLeftOffsetPx: 48,
        render: (row) => {
          const nomComplet =
            row.full_name?.trim() ||
            `${row.first_name} ${row.last_name}`.trim() ||
            row.username;
          return nomComplet;
        },
      },
      { key: "email", label: "Email" },
      {
        key: "role",
        label: "Rôle",
        render: (row) => row.role_display || row.role,
      },
      {
        key: "formation_nom",
        label: "Formation",
        render: (row) => {
          const formation = row.formation_info;
          return formation
            ? `${formation.nom} (${formation.num_offre || "—"})`
            : "—";
        },
      },
      {
        key: "centre",
        label: "Centre",
        render: (row) => row.formation_info?.centre?.nom || "—",
      },
      {
        key: "type_offre",
        label: "Type d'offre",
        render: (row) => row.formation_info?.type_offre?.nom || "—",
      },
      {
        key: "date_joined",
        label: "Date d'inscription",
        render: (row) =>
          row.date_joined
            ? new Date(row.date_joined).toLocaleDateString()
            : "—",
      },
      {
        key: "is_active",
        label: "Statut",
        render: (row) => (row.is_active ? "✅ Actif" : "⛔️ Inactif"),
      },
    ],
    [selectedIds, onToggleSelect]
  );

  return (
    <ResponsiveTableTemplate<User>
      columns={columns}
      data={users}
      getRowId={(row) => row.id}
      actions={(row) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => onEdit(row.id)}
        >
          ✏️ Modifier
        </Button>
      )}
      actionsAlign="right"
      containerSx={{ mt: 2 }}
    />
  );
}
