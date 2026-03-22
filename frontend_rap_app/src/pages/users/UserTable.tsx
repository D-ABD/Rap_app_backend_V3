// src/pages/users/componentsUsers/UserTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Paper,
} from "@mui/material";
import { User } from "../../types/User";

interface Props {
  users: User[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onEdit: (id: number) => void;
}

export default function UserTable({ users, selectedIds, onToggleSelect, onEdit }: Props) {
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox"></TableCell>
            <TableCell>Nom</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Rôle</TableCell>
            <TableCell>Formation</TableCell>
            <TableCell>Centre</TableCell>
            <TableCell>Type d’offre</TableCell>
            <TableCell>Date d’inscription</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {users.map((user) => {
            const nomComplet =
              user.full_name?.trim() ||
              `${user.first_name} ${user.last_name}`.trim() ||
              user.username;

            const formation = user.formation_info;
            const formationLabel = formation
              ? `${formation.nom} (${formation.num_offre || "—"})`
              : "—";
            const centreLabel = formation?.centre?.nom || "—";
            const typeOffreLabel = formation?.type_offre?.nom || "—";

            return (
              <TableRow key={user.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(user.id)}
                    onChange={() => onToggleSelect(user.id)}
                  />
                </TableCell>
                <TableCell>{nomComplet}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role_display || user.role}</TableCell>
                <TableCell>{formationLabel}</TableCell>
                <TableCell>{centreLabel}</TableCell>
                <TableCell>{typeOffreLabel}</TableCell>
                <TableCell>
                  {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>{user.is_active ? "✅ Actif" : "⛔️ Inactif"}</TableCell>
                <TableCell align="right">
                  <Button variant="outlined" size="small" onClick={() => onEdit(user.id)}>
                    ✏️ Modifier
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
