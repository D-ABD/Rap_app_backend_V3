import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router";

const MSG =
  "Vous avez des modifications non enregistrées. Quitter cette page sans enregistrer ?";

/**
 * Avertit avant navigation interne (react-router) et fermeture/rafraîchissement d’onglet
 * si le formulaire est modifié.
 */
export function useUnsavedFormGuard(isDirty: boolean) {
  const shouldBlock = useCallback(
    ({
      currentLocation,
      nextLocation,
    }: {
      currentLocation: { pathname: string };
      nextLocation: { pathname: string };
    }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty]
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const ok = window.confirm(MSG);
    if (ok) {
      void blocker.proceed?.();
    } else {
      blocker.reset?.();
    }
  }, [blocker, blocker.state]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
}
