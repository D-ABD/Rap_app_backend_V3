# Les endpoints /api/login/ et /api/logout/ (Token DRF) ont été supprimés.
# L'authentification est exclusivement SimpleJWT : POST /api/token/ pour obtenir les jetons,
# Authorization: Bearer <access_token> pour les requêtes protégées.
# Pour tester les vues protégées, utiliser force_authenticate(user=...) ou obtenir un JWT
# via le client (POST /api/token/, puis utiliser le token dans les en-têtes).
