// -----------------------------------------------------------------------------
// 🎯 Page d’édition d’un Objectif Déclic (fix ESLint)
// -----------------------------------------------------------------------------
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircularProgress, Box, Typography, Button } from "@mui/material";

import { useObjectifsDeclic } from "src/hooks/useDeclicObjectifs";
import PageTemplate from "src/components/PageTemplate";
import ObjectifDeclicForm from "./ObjectifDeclicForm";
import type { ObjectifDeclic } from "src/types/declic";

export default function ObjectifDeclicEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: paginated, isLoading } = useObjectifsDeclic();

  // ✅ useMemo combine extraction + recherche pour éviter re-render inutile
  const objectif = useMemo(() => {
    const objectifs: ObjectifDeclic[] = paginated?.results ?? [];
    return objectifs.find((o) => o.id === Number(id));
  }, [paginated, id]);

  // 🌀 Loader
  if (isLoading)
    return (
      <PageTemplate title="Chargement…">
        <Box textAlign="center" py={5}>
          <CircularProgress />
        </Box>
      </PageTemplate>
    );

  // 🚫 Non trouvé
  if (!objectif)
    return (
      <PageTemplate title="Objectif introuvable">
        <Typography color="error" textAlign="center" mt={3}>
          Aucune donnée trouvée pour cet identifiant.
        </Typography>
        <Box textAlign="center" mt={2}>
          <Button variant="outlined" onClick={() => navigate("/declic/objectifs")}>
            Retour à la liste
          </Button>
        </Box>
      </PageTemplate>
    );

  // ✅ Formulaire d’édition
  return (
    <PageTemplate title={`Modifier l’objectif — ${objectif.centre?.nom ?? ""}`}>
      <ObjectifDeclicForm
        open={true}
        onClose={() => navigate("/declic/objectifs")}
        id={objectif.id}
      />
    </PageTemplate>
  );
}
