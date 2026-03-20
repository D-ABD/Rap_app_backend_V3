import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
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
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    # Ce test vérifie que l'action passe lorsque le candidat est admissible et dispose d'un compte utilisateur.
    cand_user = CustomUser.objects.create_user_with_role(
        email="candidat_viewset1@example.com",
        username="candidat_viewset1",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand = Candidat.objects.create(
        nom="VS1",
        prenom="Candidat",
        email="viewset1@example.com",
        formation=formation,
        admissible=True,
        compte_utilisateur=cand_user,
        created_by=staff,
        updated_by=staff,
    )

    url = reverse("candidat-creer-compte", args=[cand.id])
    resp = client.post(url)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    cand_user.refresh_from_db()
    assert cand_user.role == CustomUser.ROLE_STAGIAIRE


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
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    cand_user = CustomUser.objects.create_user_with_role(
        email="candidat_viewset2@example.com",
        username="candidat_viewset2",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand = Candidat.objects.create(
        nom="VS2",
        prenom="Candidat",
        email="viewset2@example.com",
        formation=formation,
        admissible=False,
        compte_utilisateur=cand_user,
        created_by=staff,
        updated_by=staff,
    )

    url = reverse("candidat-creer-compte", args=[cand.id])
    resp = client.post(url)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_demande_compte_candidat_flow():
    """Une demande valide passe en attente, mais la validation staff échoue si un compte est déjà lié."""
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
    staff.centres.add(centre)

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
        compte_utilisateur=user_cand,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=user_cand)
    url_demande = reverse("demande_compte_candidat")
    resp = client.post(url_demande)
    assert resp.status_code == 200
    cand.refresh_from_db()
    assert cand.demande_compte_statut == Candidat.DemandeCompteStatut.EN_ATTENTE

    # Un staff tente ensuite de valider la demande, mais le candidat a deja un compte lie.
    client.force_authenticate(user=staff)
    url_valider = reverse("candidat-valider-demande-compte", args=[cand.id])
    resp2 = client.post(url_valider)
    assert resp2.status_code == 400


@pytest.mark.django_db
def test_staff_valider_demande_compte_cree_compte_lorsque_pas_de_compte():
    """Un staff peut valider une demande de compte pour un candidat sans compte lié."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet 6", code_postal="75108")
    formation = Formation.objects.create(
        nom="Formation ViewSet 6",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset6@example.com",
        username="staff_viewset6",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    # Candidat sans compte utilisateur lié
    cand = Candidat.objects.create(
        nom="Demande2",
        prenom="Compte2",
        email="demande2@example.com",
        formation=formation,
        demande_compte_statut=Candidat.DemandeCompteStatut.EN_ATTENTE,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    url_valider = reverse("candidat-valider-demande-compte", args=[cand.id])
    resp2 = client.post(url_valider)
    assert resp2.status_code == 200

    cand.refresh_from_db()
    assert cand.demande_compte_statut == Candidat.DemandeCompteStatut.ACCEPTEE
    assert cand.compte_utilisateur is not None


@pytest.mark.django_db
def test_staff_can_validate_inscription_without_changing_legacy_status():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M2A", code_postal="75128")
    formation = Formation.objects.create(
        nom="Formation ViewSet M2A",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m2a@example.com",
        username="staff_m2a",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    cand = Candidat.objects.create(
        nom="Inscription",
        prenom="Validee",
        email="inscription.validee@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.AUTRE,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(reverse("candidat-validate-inscription", args=[cand.id]))

    assert resp.status_code == 200
    cand.refresh_from_db()
    assert cand.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE
    assert cand.date_validation_inscription is not None
    assert cand.statut == Candidat.StatutCandidat.AUTRE


@pytest.mark.django_db
def test_staff_can_start_formation_and_align_stagiaire_role_when_possible():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M2B", code_postal="75129")
    formation = Formation.objects.create(
        nom="Formation ViewSet M2B",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m2b@example.com",
        username="staff_m2b",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    compte = CustomUser.objects.create_user_with_role(
        email="candidate_m2b@example.com",
        username="candidate_m2b",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand = Candidat.objects.create(
        nom="Entree",
        prenom="Formation",
        email="candidate_m2b@example.com",
        formation=formation,
        admissible=True,
        compte_utilisateur=compte,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(reverse("candidat-start-formation", args=[cand.id]))

    assert resp.status_code == 200
    cand.refresh_from_db()
    compte.refresh_from_db()
    assert cand.parcours_phase == Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION
    assert cand.date_validation_inscription is not None
    assert cand.date_entree_formation_effective is not None
    assert compte.role == CustomUser.ROLE_STAGIAIRE


@pytest.mark.django_db
def test_valider_demande_compte_refuse_collision_email_avec_autre_candidat_reel():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet 6B", code_postal="75118")
    formation = Formation.objects.create(
        nom="Formation ViewSet 6B",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset6b@example.com",
        username="staff_viewset6b",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    existing_user = CustomUser.objects.create_user_with_role(
        email="collision-viewset@example.com",
        username="collision_viewset",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    Candidat.objects.create(
        nom="Existant",
        prenom="Candidat",
        email="collision-viewset@example.com",
        formation=formation,
        compte_utilisateur=existing_user,
        created_by=staff,
        updated_by=staff,
    )

    cand = Candidat.objects.create(
        nom="Nouveau",
        prenom="Candidat",
        email="collision-viewset@example.com",
        formation=formation,
        demande_compte_statut=Candidat.DemandeCompteStatut.EN_ATTENTE,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    url_valider = reverse("candidat-valider-demande-compte", args=[cand.id])
    resp = client.post(url_valider)

    assert resp.status_code == 400
    cand.refresh_from_db()
    assert cand.compte_utilisateur is None
    assert cand.demande_compte_statut == Candidat.DemandeCompteStatut.EN_ATTENTE


@pytest.mark.django_db
def test_staff_cannot_access_candidat_outside_its_centre():
    """Un staff ne doit pas pouvoir voir un candidat dont la formation est dans un autre centre."""
    client = APIClient()
    centre_a = Centre.objects.create(nom="Centre ViewSet 4A", code_postal="75104")
    centre_b = Centre.objects.create(nom="Centre ViewSet 4B", code_postal="75105")

    formation_a = Formation.objects.create(
        nom="Formation ViewSet 4A",
        centre=centre_a,
        prevus_crif=5,
        prevus_mp=5,
    )
    formation_b = Formation.objects.create(
        nom="Formation ViewSet 4B",
        centre=centre_b,
        prevus_crif=5,
        prevus_mp=5,
    )

    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset4@example.com",
        username="staff_viewset4",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre_a)

    cand_outside = Candidat.objects.create(
        nom="VS4",
        prenom="Candidat",
        email="viewset4@example.com",
        formation=formation_b,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    url = reverse("candidat-detail", args=[cand_outside.id])
    resp = client.get(url)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_candidate_cannot_access_another_candidate():
    """Un candidat ne doit pas pouvoir accéder aux données d'un autre candidat."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet 7", code_postal="75109")
    formation = Formation.objects.create(
        nom="Formation ViewSet 7",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )

    cand_user_a = CustomUser.objects.create_user_with_role(
        email="candidat_a@example.com",
        username="candidat_a",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    Candidat.objects.create(
        nom="A",
        prenom="A",
        email="candidat_a@example.com",
        formation=formation,
        compte_utilisateur=cand_user_a,
    )

    cand_user_b = CustomUser.objects.create_user_with_role(
        email="candidat_b@example.com",
        username="candidat_b",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand_b = Candidat.objects.create(
        nom="B",
        prenom="B",
        email="candidat_b@example.com",
        formation=formation,
        compte_utilisateur=cand_user_b,
    )

    client.force_authenticate(user=cand_user_a)
    url = reverse("candidat-detail", args=[cand_b.id])
    resp = client.get(url)
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_staff_cannot_update_candidat_to_other_centre():
    """Un staff ne doit pas pouvoir mettre à jour un candidat pour lui assigner une formation hors périmètre."""
    client = APIClient()
    centre_a = Centre.objects.create(nom="Centre ViewSet 5A", code_postal="75106")
    centre_b = Centre.objects.create(nom="Centre ViewSet 5B", code_postal="75107")

    formation_a = Formation.objects.create(
        nom="Formation ViewSet 5A",
        centre=centre_a,
        prevus_crif=5,
        prevus_mp=5,
    )
    formation_b = Formation.objects.create(
        nom="Formation ViewSet 5B",
        centre=centre_b,
        prevus_crif=5,
        prevus_mp=5,
    )

    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset5@example.com",
        username="staff_viewset5",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre_a)

    cand = Candidat.objects.create(
        nom="VS5",
        prenom="Candidat",
        email="viewset5@example.com",
        formation=formation_a,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    url = reverse("candidat-detail", args=[cand.id])
    resp = client.patch(url, data={"formation": formation_b.id}, format="json")
    assert resp.status_code == 403
    cand.refresh_from_db()
    assert cand.formation_id == formation_a.id
