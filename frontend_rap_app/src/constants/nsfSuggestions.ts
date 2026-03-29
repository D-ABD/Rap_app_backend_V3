import { nsfSpecialiteLabel } from "./nsfOptions";

type NsfSuggestionRule = {
  code: string;
  keywords: string[];
};

const NSF_SUGGESTION_RULES: NsfSuggestionRule[] = [
  { code: "232", keywords: ["gros oeuvre", "macon", "maçon", "charpent", "couverture", "couvreur"] },
  { code: "233", keywords: ["plaquiste", "peinture", "peintre", "finition", "carrelage", "solier"] },
  { code: "234", keywords: ["menuiser", "ebenist", "ébénist", "bois", "ameublement"] },
  { code: "227", keywords: ["clim", "chauffage", "thermique", "energet", "énergét", "froid", "cvc"] },
  { code: "255", keywords: ["electric", "électric", "electrotech", "électrotech", "electron", "électron"] },
  { code: "251", keywords: ["usinage", "tourneur", "fraiseur", "chaudron", "soudeur", "ajusteur"] },
  { code: "252", keywords: ["automobile", "mecanique auto", "mécanique auto", "vehicule", "véhicule"] },
  { code: "201", keywords: ["automatisme", "robotique", "maintenance industrielle", "industrie 4.0"] },
  { code: "326", keywords: ["informatique", "developp", "développ", "reseau", "réseau", "cyber", "systeme", "système"] },
  { code: "314", keywords: ["compta", "comptabil", "fiscal", "paie", "gestion comptable"] },
  { code: "315", keywords: ["rh", "ressources humaines", "recrutement", "emploi"] },
  { code: "312", keywords: ["vente", "commercial", "commerce", "conseiller de vente"] },
  { code: "311", keywords: ["logistique", "cariste", "magasinage", "transport", "manutention"] },
  { code: "332", keywords: ["insertion", "cip", "conseiller en insertion", "travail social", "accompagnement social"] },
  { code: "333", keywords: ["formateur", "pedagog", "pédagog", "formation de formateur"] },
  { code: "331", keywords: ["soin", "infirm", "aide-soignant", "aide soignant", "medical", "médical"] },
  { code: "336", keywords: ["esthet", "esthét", "coiffure", "service a la personne", "service à la personne", "aide a domicile", "aide à domicile"] },
  { code: "344", keywords: ["securite", "sécurité", "surveillance", "incendie", "ssiap"] },
  { code: "334", keywords: ["hotellerie", "hôtellerie", "restauration", "tourisme", "accueil"] },
];

const normalize = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const suggestNsfSpecialite = (...values: Array<string | null | undefined>) => {
  const haystack = normalize(values.filter(Boolean).join(" "));
  if (!haystack.trim()) return null;

  const rule = NSF_SUGGESTION_RULES.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(normalize(keyword)))
  );

  if (!rule) return null;

  return {
    code: rule.code,
    label: nsfSpecialiteLabel(rule.code),
  };
};
