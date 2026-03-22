// utils/getFieldValue.ts
export function getFieldValue(
  obj: unknown,
  field: string,
  fallback?: string | number
): string | number | undefined {
  if (typeof obj !== "object" || obj === null) return fallback;

  const keys = field.split(".");
  let value: unknown = obj;

  for (const key of keys) {
    if (Array.isArray(value) && /^\d+$/.test(key)) {
      // 🔹 accès tableau (ex: "items.0.name")
      const index = Number(key);
      value = value[index];
    } else if (typeof value === "object" && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return fallback;
    }
  }

  return typeof value === "string" || typeof value === "number" ? value : fallback;
}
