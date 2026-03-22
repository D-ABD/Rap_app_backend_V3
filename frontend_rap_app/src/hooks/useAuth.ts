import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

/**
 * 🔐 useAuth
 *
 * Hook personnalisé pour accéder au contexte d'authentification (`AuthContext`).
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context; // ✅ simple et sûr
};
