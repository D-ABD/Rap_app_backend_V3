# rap_app/tests/factories.py
"""
Factories factory_boy pour générer User (CustomUser) et LogUtilisateur en tests.
Utilisation : UserFactory(), LogUtilisateurFactory(), UserFactory(role=CustomUser.ROLE_STAFF), etc.
"""
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
import factory

from ..models.logs import LogUtilisateur

CustomUser = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Génère des CustomUser pour les tests."""

    class Meta:
        model = CustomUser
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.LazyAttribute(lambda o: o.email.split("@")[0] if o.email else "user")
    first_name = factory.Faker("first_name", locale="fr_FR")
    last_name = factory.Faker("last_name", locale="fr_FR")
    role = CustomUser.ROLE_STAGIAIRE
    is_active = True
    # is_staff / is_superuser sont définis par CustomUser.save() selon le rôle

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """
        Crée l'utilisateur via le manager create_user pour que le mot de passe
        soit défini avant le premier save() (évite ValidationError 'password vide').
        """
        password = kwargs.pop("password", "password123")
        email = kwargs.pop("email", None) or "user@example.com"
        username = kwargs.pop("username", None) or (email.split("@")[0] if email else "user")
        return CustomUser.objects.create_user(
            email=email, username=username, password=password or "password123", **kwargs
        )


class LogUtilisateurFactory(factory.django.DjangoModelFactory):
    """Génère des LogUtilisateur pour les tests (logs système par défaut)."""

    class Meta:
        model = LogUtilisateur

    content_type = factory.LazyFunction(
        lambda: ContentType.objects.get_for_model(LogUtilisateur)
    )
    object_id = None
    action = LogUtilisateur.ACTION_VIEW
    details = factory.Faker("sentence", nb_words=4, locale="fr_FR")
    created_by = factory.SubFactory(UserFactory)

    @classmethod
    def for_instance(cls, instance, **kwargs):
        """Crée un log lié à une instance de modèle (ex: formation, centre)."""
        return cls(
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.pk,
            **kwargs
        )
