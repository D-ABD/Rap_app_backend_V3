// src/hooks/useRedirectToCreateProspection.ts
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./useAuth";

export function useRedirectToCreateProspection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return () => {
    const role = user?.role;

    if (!role) {
      toast.error("❌ Utilisateur non authentifié ou rôle manquant.");
      return;
    }

    if (["admin", "superadmin", "staff"].includes(role)) {
      navigate("/prospections/create");
    } else if (["stagiaire", "candidat", "candidatuser"].includes(role)) {
      navigate("/prospections/create/candidat");
    } else {
      toast.warn("⛔️ Accès refusé : rôle non autorisé.");
    }
  };
}
