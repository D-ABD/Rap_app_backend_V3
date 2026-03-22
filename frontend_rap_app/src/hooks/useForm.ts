import { useState, type ChangeEvent } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";

/**
 * Hook générique de gestion de formulaire
 * Compatible avec :
 * - TextField, Select, Textarea
 * - Checkbox, Switch
 * - MUI Select (SelectChangeEvent)
 */
export default function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  /** 🔹 Gère les changements standard (TextField, Select, etc.) */
  const handleChange = (
    e:
      | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      | SelectChangeEvent<string>
  ) => {
    const { name, id, type, value } = e.target as {
      name?: string;
      id?: string;
      type?: string;
      value: any;
      checked?: boolean;
    };

    const key = name || id;
    if (!key) return;

    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setValues((prev) => ({ ...prev, [key]: newValue }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /** 🔹 Alias explicite pour les Checkbox / Switch */
  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, name, checked } = e.target;
    const key = name || id;
    if (!key) return;

    setValues((prev) => ({ ...prev, [key]: checked }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /** 🔹 Mise à jour d’un champ spécifique */
  const setFieldValue = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /** 🔹 Réinitialise le formulaire et les erreurs */
  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
  };

  return {
    values,
    errors,
    setValues,
    setErrors,
    handleChange,
    handleCheckboxChange, // ✅ alias ajouté pour compatibilité
    handleCheckbox: handleCheckboxChange, // ✅ garde ton ancien nom aussi
    setFieldValue,
    resetForm,
  };
}
