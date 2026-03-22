import { FormationPick } from "../../../components/modals/FormationSelectModal";
import type { Candidat } from "../../../types/candidat";

export const mapFormationInfo = (fi?: Candidat["formation_info"] | null): FormationPick | null => {
  if (!fi) return null;
  return {
    id: fi.id,
    nom: fi.nom ?? null,
    centre: fi.centre ? { id: fi.centre.id, nom: fi.centre.nom } : null,
    type_offre: fi.type_offre
      ? {
          id: fi.type_offre.id,
          nom: fi.type_offre.nom ?? null,
          libelle: fi.type_offre.libelle ?? null,
          couleur: fi.type_offre.couleur ?? null,
        }
      : null,
    num_offre: fi.num_offre ?? null,
  };
};

export const formatFormation = (p: FormationPick) =>
  `${p.nom ?? "—"} — ${p.centre?.nom ?? "—"} · ${p.num_offre ?? "—"}`;
