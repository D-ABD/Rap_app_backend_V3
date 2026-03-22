// src/api/tokenStorage.ts

/**
 * 💾 storeTokens(access, refresh)
 *
 * Sauvegarde les tokens JWT (access & refresh) dans le `localStorage`.
 * Ces tokens seront utilisés pour authentifier les requêtes futures.
 *
 * @param access - Token d’accès (court terme)
 * @param refresh - Token de rafraîchissement (long terme)
 */
export const storeTokens = (access: string, refresh: string) => {
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
};

/**
 * 📦 getTokens()
 *
 * Récupère les tokens JWT stockés dans le `localStorage`.
 *
 * @returns Un objet contenant les tokens : { access, refresh }
 */
export const getTokens = () => ({
  access: localStorage.getItem("access"),
  refresh: localStorage.getItem("refresh"),
});

/**
 * 🗑 clearTokens()
 *
 * Supprime les tokens JWT du `localStorage`.
 * À appeler lors de la déconnexion de l’utilisateur.
 */
export const clearTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};
