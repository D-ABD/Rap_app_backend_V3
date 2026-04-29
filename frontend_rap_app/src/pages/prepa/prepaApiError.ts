type FieldLabelMap = Record<string, string>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

const DEFAULT_GENERIC_MESSAGE = "Erreur de validation.";

export function extractPrepaApiMessage(
  data: unknown,
  options?: {
    fieldLabels?: FieldLabelMap;
    rawFields?: string[];
    genericMessage?: string;
  }
): string | null {
  if (!isRecord(data)) return null;

  const maybeErrors = (data as { errors?: unknown }).errors;
  const errorsObj = isRecord(maybeErrors) ? maybeErrors : data;
  const parts: string[] = [];
  const rawFields = new Set(options?.rawFields ?? []);
  const fieldLabels = options?.fieldLabels ?? {};

  for (const [field, val] of Object.entries(errorsObj)) {
    const label = fieldLabels[field] ?? field;
    if (typeof val === "string") {
      parts.push(rawFields.has(field) ? val : `${label}: ${val}`);
    } else if (isStringArray(val)) {
      const joined = val.join(" · ");
      parts.push(rawFields.has(field) ? joined : `${label}: ${joined}`);
    }
  }

  if (parts.length) return parts.join(" | ");

  const maybeMessage = (data as { message?: unknown }).message;
  const genericMessage = options?.genericMessage ?? DEFAULT_GENERIC_MESSAGE;
  if (typeof maybeMessage === "string" && maybeMessage.trim() && maybeMessage.trim() !== genericMessage) {
    return maybeMessage;
  }

  return null;
}
