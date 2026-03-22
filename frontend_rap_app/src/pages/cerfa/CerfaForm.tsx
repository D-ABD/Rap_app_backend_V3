import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import { toast } from "react-toastify";
import { CerfaContrat, CerfaContratCreate } from "../../types/cerfa";
import CandidatsSelectModal from "../../components/modals/CandidatsSelectModal";
import FormationSelectModal from "../../components/modals/FormationSelectModal";
import PartenaireSelectModal from "../../components/modals/PartenairesSelectModal";

type CerfaFormProps = {
  open: boolean;
  onClose: () => void;
  initialData?: CerfaContrat | null;
  onSubmit?: (data: CerfaContratCreate) => Promise<void> | void;
  readOnly?: boolean;
};

export function CerfaForm({
  open,
  onClose,
  initialData = null,
  onSubmit,
  readOnly = false,
}: CerfaFormProps) {
  const [form, setForm] = useState<Partial<CerfaContratCreate>>({});
  const [selectedCandidat, setSelectedCandidat] = useState<any>(null);
  const [selectedFormation, setSelectedFormation] = useState<any>(null);
  const [selectedPartenaire, setSelectedPartenaire] = useState<any>(null);

  const [showCandidatModal, setShowCandidatModal] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);

  // 🔁 Pré-remplissage en mode édition
  useEffect(() => {
    if (initialData) {
      setForm({
        candidat: initialData.candidat,
        apprenti_nom_naissance: initialData.apprenti_nom_naissance,
        apprenti_prenom: initialData.apprenti_prenom,
        employeur_nom: initialData.employeur_nom,
        date_conclusion: initialData.date_conclusion,
        formation: initialData.formation,
      });
    } else {
      setForm({});
      setSelectedCandidat(null);
      setSelectedFormation(null);
      setSelectedPartenaire(null);
    }
  }, [initialData]);

  // ✅ Validation minimale avant envoi
  const handleSubmit = () => {
    if (!form.candidat) {
      toast.error("⚠️ Veuillez sélectionner un candidat.");
      return;
    }
    if (!form.formation) {
      toast.error("⚠️ Veuillez sélectionner une formation.");
      return;
    }
    if (!form.employeur_nom) {
      toast.error("⚠️ Veuillez sélectionner un employeur/partenaire.");
      return;
    }

    if (onSubmit) {
      onSubmit(form as CerfaContratCreate);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {initialData ? "Modifier un contrat CERFA" : "Créer un contrat CERFA"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Button
              variant="outlined"
              onClick={() => setShowCandidatModal(true)}
              disabled={readOnly}
            >
              {selectedCandidat
                ? `👤 ${selectedCandidat.nom_complet}`
                : form.candidat
                  ? `👤 Candidat #${form.candidat}`
                  : "Sélectionner un candidat"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setShowFormationModal(true)}
              disabled={readOnly}
            >
              {selectedFormation
                ? `🎓 ${selectedFormation.nom}`
                : form.formation
                  ? `🎓 Formation #${form.formation}`
                  : "Sélectionner une formation"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setShowPartenaireModal(true)}
              disabled={readOnly}
            >
              {selectedPartenaire
                ? `🏢 ${selectedPartenaire.nom}`
                : form.employeur_nom
                  ? `🏢 ${form.employeur_nom}`
                  : "Sélectionner un partenaire"}
            </Button>

            <TextField
              label="Date de conclusion"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date_conclusion ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, date_conclusion: e.target.value }))}
              disabled={readOnly}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={readOnly}>
            Annuler
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={readOnly}>
            {readOnly ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🧩 Sélection Candidat */}
      <CandidatsSelectModal
        show={showCandidatModal}
        onClose={() => setShowCandidatModal(false)}
        onSelect={(c) => {
          setSelectedCandidat(c);
          setForm((f) => ({
            ...f,
            candidat: c.id,
            apprenti_nom_naissance: c.nom_naissance ?? c.nom, // ✅ fallback si nom_naissance vide
            apprenti_prenom: c.prenom,
          }));
          setShowCandidatModal(false);
        }}
      />

      {/* 🧩 Sélection Formation */}
      <FormationSelectModal
        show={showFormationModal}
        onClose={() => setShowFormationModal(false)}
        onSelect={(f) => {
          setSelectedFormation(f);
          setForm((p) => ({ ...p, formation: f.id }));
          setShowFormationModal(false);
        }}
      />

      {/* 🧩 Sélection Partenaire */}
      <PartenaireSelectModal
        show={showPartenaireModal}
        onClose={() => setShowPartenaireModal(false)}
        onSelect={(p) => {
          setSelectedPartenaire(p);
          setForm((f) => ({
            ...f,
            employeur: p.id, // ✅ c’est cette clé que le backend attend
            employeur_nom: p.nom, // (facultatif : pour affichage local)
          }));
          setShowPartenaireModal(false);
        }}
      />
    </>
  );
}
