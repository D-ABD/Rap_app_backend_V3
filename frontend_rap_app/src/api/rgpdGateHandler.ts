/** Erreur API « accès app bloqué sans consentement » (compte + fiche). */
export const CANDIDATE_RGPD_CONSENT_REQUIRED_CODE = "candidate_rgpd_consent_required" as const;

type RgpdHandler = (message: string) => void;

let handler: RgpdHandler | null = null;
let lastNotifyAt = 0;
const THROTTLE_MS = 2500;

export function registerRgpdGateHandler(fn: RgpdHandler | null) {
  handler = fn;
}

export function isRgpdBootstrapRequestPath(relativeUrl: string): boolean {
  const p = relativeUrl.split("?")[0].replace(/^\/+/, "");
  if (p === "me" || p === "me/") return true;
  if (p === "candidats/me" || p.startsWith("candidats/me/")) return true;
  if (p === "token/refresh" || p.startsWith("token/refresh/")) return true;
  return false;
}

export function isCandidateRgpdConsentRequired(
  status: number | undefined,
  data: unknown
): data is { error_code: string; message?: string; success?: boolean } {
  return (
    status === 403 &&
    typeof data === "object" &&
    data !== null &&
    (data as { error_code?: string }).error_code === CANDIDATE_RGPD_CONSENT_REQUIRED_CODE
  );
}

/**
 * Notifie l’UI (toast + éventuellement redirection vers /mon-profil) avec anti-spam.
 * Appelé uniquement par l’intercepteur Axios, sans les requêtes d’enregistrement du consentement.
 */
export function notifyCandidateRgpdRequired(message: string) {
  if (!handler) return;
  const now = Date.now();
  if (now - lastNotifyAt < THROTTLE_MS) return;
  lastNotifyAt = now;
  handler(message);
}
