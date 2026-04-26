import axios from "axios";
import { toApiError } from "./httpClient";

/**
 * Texte d’erreur pour l’utilisateur, à partir d’une exception Axios, Error, ou inconnue.
 * Utilise le corps d’enveloppe API (message, errors) y compris 403 / RGPD.
 */
export function errorMessageFromUnknown(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return toApiError(err).message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Erreur inconnue";
}

export function toDisplayError(err: unknown): Error {
  return new Error(errorMessageFromUnknown(err));
}
