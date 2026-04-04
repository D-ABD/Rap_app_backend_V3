// src/hooks/useRedirectToCreateProspection.ts
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./useAuth";
import { isCandidateLikeRole, isCoreStaffRole } from "../utils/roleGroups";

export function useRedirectToCreateProspection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return () => {
    const role = user?.role;

    if (!role) {
      toast.error("❌ Utilisateur non authentifié ou rôle manquant.");
      return;
    }

    if (isCoreStaffRole(role)) {
      navigate("/prospections/create");
    } else if (isCandidateLikeRole(role)) {
      navigate("/prospections/create/candidat");
    } else {
      toast.warn("⛔️ Accès refusé : rôle non autorisé.");
    }
  };
}
