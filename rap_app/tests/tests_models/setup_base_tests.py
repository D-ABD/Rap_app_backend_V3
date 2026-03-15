# rap_app/tests/base.py

from django.test import TestCase
from django.utils.timezone import now

from ...models import CustomUser


class BaseModelTestSetupMixin(TestCase):
    """
    🔧 Mixin de test de base avec utilisateur personnalisé (CustomUser).
    Fournit :
    - Un utilisateur de test `self.user`
    - Méthodes pour créer des utilisateurs avec rôles
    - Méthode générique pour créer des objets héritant de BaseModel
    - Login automatique de l'utilisateur si nécessaire
    - Nettoyage des fichiers d'avatar dans `tearDown`
    """

    def setUp(self):
        super().setUp()
        self.user = self.create_user(email="testuser@example.com", role=CustomUser.ROLE_STAGIAIRE)
        self.test_date = now()

    def create_user(self, email, role=CustomUser.ROLE_STAGIAIRE, password="password123", **extra_fields):
        """
        Crée un utilisateur valide basé sur CustomUser avec validation complète.

        Args:
            email (str): Email requis
            role (str): Un des rôles définis dans CustomUser
            password (str): Mot de passe
            **extra_fields: Prénom, nom, bio, téléphone, etc.

        Returns:
            CustomUser: utilisateur créé et sauvegardé
        """
        return CustomUser.objects.create_user_with_role(
            email=email, username=email.split("@")[0], password=password, role=role, **extra_fields
        )

    def get_user_by_role(self, role, suffix="user", **kwargs):
        """
        Crée et retourne un utilisateur pour un rôle donné, utile dans les tests multi-profils.

        Args:
            role (str): Un des rôles définis dans CustomUser
            suffix (str): Suffixe pour générer un email unique
            **kwargs: Champs supplémentaires

        Returns:
            CustomUser: utilisateur créé
        """
        return self.create_user(email=f"{role}_{suffix}@example.com", role=role, **kwargs)

    def create_instance(self, model_class, **kwargs):
        """
        Crée une instance d’un modèle basé sur BaseModel avec `created_by` / `updated_by` injectés.
        """
        if not hasattr(model_class, "created_by") or not hasattr(model_class, "updated_by"):
            raise ValueError(f"{model_class.__name__} ne semble pas hériter de BaseModel.")
        kwargs.setdefault("created_by", self.user)
        kwargs.setdefault("updated_by", self.user)
        return model_class.objects.create(**kwargs)

    def login_test_user(self):
        """
        Authentifie l'utilisateur `self.user` dans le client de test.
        """
        self.client.force_login(self.user)

    def tearDown(self):
        """
        Nettoyage de l'avatar si nécessaire (fichiers physiques).
        """
        if self.user.avatar and self.user.avatar.storage.exists(self.user.avatar.name):
            self.user.avatar.delete(save=False)
        super().tearDown()
