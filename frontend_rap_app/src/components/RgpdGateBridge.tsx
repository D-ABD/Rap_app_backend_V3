import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { registerRgpdGateHandler } from "../api/rgpdGateHandler";

/**
 * Branche la navigation + toasts pour l’erreur API `candidate_rgpd_consent_required`
 * (émit par l’intercepteur axios). Ne rend rien.
 */
export function RgpdGateBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    registerRgpdGateHandler((message) => {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const onProfil = path === "/mon-profil" || path.startsWith("/mon-profil/");
      if (onProfil) {
        toast.warning(message, { autoClose: 6000 });
        return;
      }
      toast.warning(message, { autoClose: 5000 });
      navigate("/mon-profil", { state: { rgpdRequired: true } });
    });
    return () => registerRgpdGateHandler(null);
  }, [navigate]);

  return null;
}
