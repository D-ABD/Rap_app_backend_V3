import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import type { LogEntry } from "../../types/log";

interface Props {
  logs: LogEntry[];
  onOpen: (log: LogEntry) => void;
}

export default function LogTable({ logs, onOpen }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Modèle</TableCell>
            <TableCell>Objet</TableCell>
            <TableCell>Utilisateur</TableCell>
            <TableCell>Détails</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} hover onClick={() => onOpen(log)} sx={{ cursor: "pointer" }}>
              <TableCell>{log.date}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.model || "—"}</TableCell>
              <TableCell>{log.object_id ?? "—"}</TableCell>
              <TableCell>{log.user}</TableCell>
              <TableCell>{log.details || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
