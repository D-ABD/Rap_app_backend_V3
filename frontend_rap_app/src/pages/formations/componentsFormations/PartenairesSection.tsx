// src/pages/formations/componentsFormations/PartenairesSection.tsx
import { Partenaire } from "../../../types/partenaire";
import { Paper, Typography, Stack } from "@mui/material";

interface Props {
  partenaires?: Partenaire[];
}

export default function PartenairesSection({ partenaires }: Props) {
  const count = partenaires?.length ?? 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        🤝 Partenaires ({count})
      </Typography>

      {count > 0 ? (
        <Stack spacing={1}>
          {partenaires!.map((p) => (
            <Typography key={p.id} variant="body2">
              🏷️ {p.nom}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary">—</Typography>
      )}
    </Paper>
  );
}
