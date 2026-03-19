import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation


@pytest.mark.django_db
def test_candidat_create_does_not_create_user_automatically():
    """Créer un candidat avec email ne doit plus créer automatiquement de CustomUser."""
    centre = Centre.objects.create(nom="Centre Test", code_postal="75001")
    formation = Formation.objects.create(
        nom="Formation Test",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff@example.com",
        username="staff",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    cand = Candidat.objects.create(
        nom="Test",
        prenom="Candidat",
        email="candidat@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    assert cand.compte_utilisateur is None
    assert not CustomUser.objects.filter(email__iexact="candidat@example.com").exists()


@pytest.mark.django_db
def test_creer_ou_lier_compte_cree_un_user_sans_doublon():
    """L'appel explicite à creer_ou_lier_compte_utilisateur crée un compte sans doublon ni mot de passe codé en dur."""
    centre = Centre.objects.create(nom="Centre Test 2", code_postal="75002")
    formation = Formation.objects.create(
        nom="Formation Test 2",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff2@example.com",
        username="staff2",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    cand = Candidat.objects.create(
        nom="Test",
        prenom="Candidat",
        email="candidat2@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    user = cand.creer_ou_lier_compte_utilisateur()

    assert user is not None
    assert user.email.lower() == "candidat2@example.com"
    # Le candidat doit maintenant être lié
    cand.refresh_from_db()
    assert cand.compte_utilisateur_id == user.id


@pytest.mark.django_db
def test_creer_ou_lier_compte_reutilise_user_existant():
    """Si un CustomUser existe déjà pour l'email du candidat, il doit être réutilisé plutôt qu'un nouveau compte créé."""
    centre = Centre.objects.create(nom="Centre Test 3", code_postal="75003")
    formation = Formation.objects.create(
        nom="Formation Test 3",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff3@example.com",
        username="staff3",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    user = CustomUser.objects.create_user_with_role(
        email="candidat3@example.com",
        username="cand3",
        password=None,
        role=CustomUser.ROLE_CANDIDAT_USER,
    )

    cand = Candidat.objects.create(
        nom="Test",
        prenom="Candidat",
        email="candidat3@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    linked = cand.creer_ou_lier_compte_utilisateur()
    assert linked.id == user.id
    cand.refresh_from_db()
    assert cand.compte_utilisateur_id == user.id


@pytest.mark.django_db
def test_creer_ou_lier_compte_refuse_si_user_deja_lie_a_autre_candidat():
    """On ne doit pas pouvoir lier un CustomUser déjà associé à un autre candidat."""
    centre = Centre.objects.create(nom="Centre Test 4", code_postal="75004")
    formation = Formation.objects.create(
        nom="Formation Test 4",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff4@example.com",
        username="staff4",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    user = CustomUser.objects.create_user(
        email="candidat4@example.com",
        username="cand4",
        password=None,
        first_name="Premier",
        last_name="Candidat",
        role=CustomUser.ROLE_TEST,
    )

    cand1 = Candidat.objects.create(
        nom="Premier",
        prenom="Candidat",
        email="candidat4@example.com",
        formation=formation,
        compte_utilisateur=user,
        created_by=staff,
        updated_by=staff,
    )
    assert cand1.compte_utilisateur_id == user.id

    with pytest.raises((ValidationError, IntegrityError)):
        Candidat.objects.create(
            nom="Second",
            prenom="Candidat",
            email="candidat4@example.com",
            formation=formation,
            compte_utilisateur=user,
            created_by=staff,
            updated_by=staff,
        )


@pytest.mark.django_db
def test_candidat_delete_does_not_delete_user():
    """Supprimer un candidat ne doit plus supprimer automatiquement le CustomUser lié."""
    centre = Centre.objects.create(nom="Centre Test 5", code_postal="75005")
    formation = Formation.objects.create(
        nom="Formation Test 5",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff5@example.com",
        username="staff5",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    cand = Candidat.objects.create(
        nom="ToDelete",
        prenom="Candidat",
        email="candidat5@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )
    user = cand.creer_ou_lier_compte_utilisateur()

    cand_id = cand.id
    user_id = user.id

    cand.delete()

    assert not Candidat.objects.filter(id=cand_id).exists()
    assert CustomUser.objects.filter(id=user_id).exists()


@pytest.mark.django_db
def test_valider_comme_stagiaire_cree_et_lie_un_compte_si_absent():
    """La validation stagiaire via le modèle doit suivre le service explicite et provisionner un compte si besoin."""
    centre = Centre.objects.create(nom="Centre Test 6", code_postal="75006")
    formation = Formation.objects.create(
        nom="Formation Test 6",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff6@example.com",
        username="staff6",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    cand = Candidat.objects.create(
        nom="Validable",
        prenom="Stagiaire",
        email="stagiaire6@example.com",
        formation=formation,
        admissible=True,
        created_by=staff,
        updated_by=staff,
    )

    user = cand.valider_comme_stagiaire()

    cand.refresh_from_db()
    assert user is not None
    assert cand.compte_utilisateur_id == user.id
    assert user.role == CustomUser.ROLE_STAGIAIRE


@pytest.mark.django_db
def test_valider_comme_candidatuser_cree_et_lie_un_compte_si_absent():
    """La validation candidat-user via le modèle doit provisionner un compte si aucun lien n'existe encore."""
    centre = Centre.objects.create(nom="Centre Test 7", code_postal="75007")
    formation = Formation.objects.create(
        nom="Formation Test 7",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff7@example.com",
        username="staff7",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    cand = Candidat.objects.create(
        nom="Validable",
        prenom="CandidatUser",
        email="candidatuser7@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    user = cand.valider_comme_candidatuser()

    cand.refresh_from_db()
    assert user is not None
    assert cand.compte_utilisateur_id == user.id
    assert user.role == CustomUser.ROLE_CANDIDAT_USER


@pytest.mark.django_db
def test_lier_utilisateur_reutilise_la_source_de_verite_service():
    """Le helper legacy lier_utilisateur doit rester un alias sûr vers le service central."""
    centre = Centre.objects.create(nom="Centre Test 8", code_postal="75008")
    formation = Formation.objects.create(
        nom="Formation Test 8",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff8@example.com",
        username="staff8",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    cand = Candidat.objects.create(
        nom="Legacy",
        prenom="Helper",
        email="legacy8@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    user = cand.lier_utilisateur(actor=staff)

    cand.refresh_from_db()
    assert user is not None
    assert cand.compte_utilisateur_id == user.id
    assert user.email.lower() == "legacy8@example.com"
    assert not user.has_usable_password()
    assert cand.updated_by_id == staff.id
