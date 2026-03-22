// src/pages/users/MonProfil.tsx
import { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { toast } from "react-toastify";
import { useMe } from "../../hooks/useUsers";
import { MeUpdatePayload } from "../../types/User";
import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";

export default function MonProfil() {
  const { user, loading, error } = useMe();
  const { logout } = useAuth();

  const [formData, setFormData] = useState<MeUpdatePayload>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const handleChange = (field: keyof MeUpdatePayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const payload =
        avatarFile !== null
          ? (() => {
              const fd = new FormData();
              Object.entries(formData).forEach(([k, v]) => {
                if (v !== undefined && v !== null) fd.append(k, v as string);
              });
              fd.append("avatar", avatarFile);
              return fd;
            })()
          : formData;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _res = await api.patch("/me/", payload, {
        headers: avatarFile ? { "Content-Type": "multipart/form-data" } : {},
      });

      toast.success("✅ Profil mis à jour !");
    } catch (_e) {
      toast.error("❌ Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete("/users/delete-account/");
      toast.success("🗑️ Votre compte a été supprimé conformément au RGPD.");
      logout();
    } catch (_e) {
      toast.error("❌ Erreur lors de la suppression du compte");
    } finally {
      setDeleting(false);
      setOpenDeleteDialog(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">Erreur chargement profil</Typography>;
  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Mon profil
      </Typography>

      {/* ✅ Avatar actuel */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Avatar
          src={avatarFile ? URL.createObjectURL(avatarFile) : user.avatar_url || ""}
          alt={user.full_name || user.email}
          sx={{ width: 64, height: 64 }}
        />
        <Button variant="outlined" component="label">
          Changer l’avatar
          <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
        </Button>
      </Box>

      <TextField label="Rôle" fullWidth margin="normal" value={user.role || "—"} disabled />

      <TextField
        label="Email"
        fullWidth
        margin="normal"
        value={formData.email || ""}
        onChange={(e) => handleChange("email", e.target.value)}
      />

      {/* 👇 Lecture seule */}
      <TextField
        label="Prénom"
        fullWidth
        margin="normal"
        value={formData.first_name || ""}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Nom"
        fullWidth
        margin="normal"
        value={formData.last_name || ""}
        InputProps={{ readOnly: true }}
      />

      <TextField
        label="Téléphone"
        fullWidth
        margin="normal"
        value={formData.phone || ""}
        onChange={(e) => handleChange("phone", e.target.value)}
      />

      <TextField
        label="Bio"
        fullWidth
        margin="normal"
        multiline
        minRows={3}
        value={formData.bio || ""}
        onChange={(e) => handleChange("bio", e.target.value)}
      />

      {/* 🔒 Informations RGPD */}
      {user && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            🔐 Consentement RGPD
          </Typography>

          {user.consent_rgpd ? (
            <Typography variant="body2">
              Vous avez accepté la politique de confidentialité
              {user.consent_date
                ? ` le ${new Date(user.consent_date).toLocaleDateString("fr-FR")}.`
                : "."}
            </Typography>
          ) : (
            <Typography variant="body2" color="error">
              ❌ Vous n'avez pas encore accepté la politique de confidentialité.
            </Typography>
          )}

          <Typography variant="body2" sx={{ mt: 1 }}>
            Consultez notre{" "}
            <a
              href="/politique-confidentialite"
              style={{ color: "#1976d2", textDecoration: "underline" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              politique de confidentialité
            </a>{" "}
            pour plus d’informations.
          </Typography>
        </Box>
      )}

      {/* ✅ Actions */}
      <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "⏳ Sauvegarde..." : "💾 Enregistrer"}
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={() => setOpenDeleteDialog(true)}
          disabled={deleting}
        >
          {deleting ? "⏳ Suppression..." : "🗑️ Supprimer mon compte"}
        </Button>
      </Box>

      {/* 🧩 Modale de confirmation RGPD */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="delete-account-dialog-title"
      >
        <DialogTitle id="delete-account-dialog-title">Suppression de votre compte</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: "pre-line" }}>
            ⚠️ Cette action est irréversible.
            {"\n\n"}
            Votre compte et vos données personnelles seront anonymisés conformément au RGPD.
            {"\n\n"}
            Souhaitez-vous continuer ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={handleDeleteAccount} color="error" disabled={deleting}>
            {deleting ? "Suppression..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 3, fontSize: "0.85rem", lineHeight: 1.4 }}
      >
        Conformément au RGPD, vous pouvez demander la suppression de votre compte. Cela entraîne la
        désactivation de votre accès. Certaines données peuvent être conservées temporairement pour
        des obligations légales ou statistiques. Pour toute demande complémentaire (export ou
        effacement total des données), veuillez contacter l’administrateur.
      </Typography>
    </Box>
  );
}
