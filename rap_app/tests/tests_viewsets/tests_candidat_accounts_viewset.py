import pytest
from rest_framework.test import APIClient
from django.urls import reverse

from ...models.candidat import Candidat
from ...models.custom_user import CustomUser
from ...models.centres import Centre
from ...models.formations import Formation


@pytest.mark.django_db
def test_staff_creer_compte_action():
    """Action staff /candidats/{id}/creer-compte/ crée un compte sans doublon."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet 1", code_postal="75101")
    formation = Formation.objects.create(
        nom="Formation ViewSet 1",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset1@example.com",
        username="staff_viewset1",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    client.force_authenticate(user=staff)

    cand = Candidat.objects.create(
        nom="VS1",
        prenom="Candidat",
        email="viewset1@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    url = reverse("candidat-creer-compte", args=[cand.id])
    resp = client.post(url)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    cand.refresh_from_db()
    assert cand.compte_utilisateur is not None
    assert CustomUser.objects.filter(email__iexact="viewset1@example.com").count() == 1


@pytest.mark.django_db
def test_staff_creer_compte_refuse_si_deja_compte():
    """L'action creer-compte refuse si un compte est déjà lié."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet 2", code_postal="75102")
    formation = Formation.objects.create(
        nom="Formation ViewSet 2",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset2@example.com",
        username="staff_viewset2",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    client.force_authenticate(user=staff)

    cand = Candidat.objects.create(
        nom="VS2",
        prenom="Candidat",
        email="viewset2@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )
    cand.creer_ou_lier_compte_utilisateur()

    url = reverse("candidat-creer-compte", args=[cand.id])
    resp = client.post(url)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_demande_compte_candidat_flow():
    """Un candidat peut demander un compte, la demande passe en en_attente, puis un staff peut la valider."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet 3", code_postal="75103")
    formation = Formation.objects.create(
        nom="Formation ViewSet 3",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset3@example.com",
        username="staff_viewset3",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )

    # créer un user candidat + candidat associé, SANS compte utilisateur applicatif
    user_cand = CustomUser.objects.create_user_with_role(
        email="demande@example.com",
        username="demande",
        password=None,
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand = Candidat.objects.create(
        nom="Demande",
        prenom="Compte",
        email="demande@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    # le candidat se connecte et demande un compte (via endpoint me/demande-compte/)
    client.force_authenticate(user=user_cand)
    url_demande = reverse("demande_compte_candidat")
    resp = client.post(url_demande)
    assert resp.status_code == 200

    cand.refresh_from_db()
    assert cand.demande_compte_statut == Candidat.DemandeCompteStatut.EN_ATTENTE

    # un staff valide ensuite la demande
    client.force_authenticate(user=staff)
    url_valider = reverse("candidat-valider-demande-compte", args=[cand.id])
    resp2 = client.post(url_valider)
    assert resp2.status_code == 200

    cand.refresh_from_db()
    assert cand.demande_compte_statut == Candidat.DemandeCompteStatut.ACCEPTEE
    assert cand.compte_utilisateur is not None

