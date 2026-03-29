export type NsfOption = { value: string; label: string };

export const NSF_SPECIALITE_OPTIONS: NsfOption[] = [
  { value: "200", label: "200 - Technologies industrielles fondamentales" },
  { value: "201", label: "201 - Technologies de commandes des transformations industrielles" },
  { value: "221", label: "221 - Agro-alimentaire, alimentation, cuisine" },
  { value: "227", label: "227 - Energie, genie climatique" },
  { value: "230", label: "230 - Genie civil, construction, bois" },
  { value: "231", label: "231 - Mines et carrieres, genie civil, topographie" },
  { value: "232", label: "232 - Batiment : construction et couverture" },
  { value: "233", label: "233 - Batiment : finitions" },
  { value: "234", label: "234 - Travail du bois et de l'ameublement" },
  { value: "250", label: "250 - Specialites pluritechnologiques mecanique-electricite" },
  { value: "251", label: "251 - Mecanique generale et de precision, usinage" },
  { value: "252", label: "252 - Moteurs et mecanique auto" },
  { value: "255", label: "255 - Electricite, electronique" },
  { value: "310", label: "310 - Specialites plurivalentes des echanges et de la gestion" },
  { value: "311", label: "311 - Transport, manutention, magasinage" },
  { value: "312", label: "312 - Commerce, vente" },
  { value: "314", label: "314 - Comptabilite, gestion" },
  { value: "315", label: "315 - Ressources humaines, gestion du personnel, gestion de l'emploi" },
  { value: "320", label: "320 - Specialites plurivalentes de la communication" },
  { value: "321", label: "321 - Journalisme et communication" },
  { value: "326", label: "326 - Informatique, traitement de l'information, reseaux de transmission des donnees" },
  { value: "330", label: "330 - Specialites plurivalentes sanitaires et sociales" },
  { value: "331", label: "331 - Sante" },
  { value: "332", label: "332 - Travail social" },
  { value: "333", label: "333 - Enseignement, formation" },
  { value: "334", label: "334 - Accueil, hotellerie, tourisme" },
  { value: "336", label: "336 - Coiffure, esthetique et autres specialites de services aux personnes" },
  { value: "343", label: "343 - Nettoyage, assainissement, protection de l'environnement" },
  { value: "344", label: "344 - Securite des biens et des personnes, police, surveillance" },
];

const NSF_SPECIALITE_LABELS: Record<string, string> = Object.fromEntries(
  NSF_SPECIALITE_OPTIONS.map((option) => [option.value, option.label])
);

export const nsfSpecialiteLabel = (value?: string | null) =>
  value ? NSF_SPECIALITE_LABELS[value] ?? value : "—";
