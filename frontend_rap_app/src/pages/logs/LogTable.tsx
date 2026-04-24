import { useMemo } from "react";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";
import type { LogEntry } from "../../types/log";

interface Props {
  logs: LogEntry[];
  onOpen: (log: LogEntry) => void;
}

export default function LogTable({ logs, onOpen }: Props) {
  const columns = useMemo<TableColumn<LogEntry>[]>(
    () => [
      { key: "date", label: "Date" },
      { key: "action", label: "Action" },
      {
        key: "model",
        label: "Modèle",
        render: (row) => row.model || "—",
      },
      {
        key: "object_id",
        label: "Objet",
        render: (row) =>
          row.object_id != null ? String(row.object_id) : "—",
      },
      { key: "user", label: "Utilisateur" },
      {
        key: "details",
        label: "Détails",
        render: (row) => row.details || "—",
      },
    ],
    []
  );

  return (
    <ResponsiveTableTemplate<LogEntry>
      columns={columns}
      data={logs}
      getRowId={(row) => row.id}
      onRowClick={(row) => onOpen(row)}
      showActionsColumn={false}
    />
  );
}
