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
    # Le signal crée automatiquement un Candidat lié au CustomUser.
    cand = getattr(cand_user, "candidat_associe")
    cand.nom = "VS1"
    cand.prenom = "Candidat"
    cand.email = "viewset1@example.com"
    cand.formation = formation
    cand.admissible = True
    cand.created_by = staff
    cand.updated_by = staff
    cand.save()

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
    cand = getattr(cand_user, "candidat_associe")
    cand.nom = "VS2"
    cand.prenom = "Candidat"
    cand.email = "viewset2@example.com"
    cand.formation = formation
    # Non admissible -> doit échouer
    cand.admissible = False
    cand.created_by = staff
    cand.updated_by = staff
    cand.save()

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

    # Créer un user candidat et récupérer le profil Candidat automatiquement créé par le signal.
    user_cand = CustomUser.objects.create_user_with_role(
        email="demande@example.com",
        username="demande",
        password=None,
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand = user_cand.candidat_associe
    cand.nom = "Demande"
    cand.prenom = "Compte"
    cand.email = "demande@example.com"
    cand.formation = formation
    cand.created_by = staff
    cand.updated_by = staff
    cand.save()

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
    existing_candidate = existing_user.candidat_associe
    existing_candidate.nom = "Existant"
    existing_candidate.prenom = "Candidat"
    existing_candidate.email = "collision-viewset@example.com"
    existing_candidate.formation = formation
    existing_candidate.created_by = staff
    existing_candidate.updated_by = staff
    existing_candidate.save()

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
    cand_a = cand_user_a.candidat_associe
    cand_a.nom = "A"
    cand_a.prenom = "A"
    cand_a.formation = formation
    cand_a.save()

    cand_user_b = CustomUser.objects.create_user_with_role(
        email="candidat_b@example.com",
        username="candidat_b",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand_b = cand_user_b.candidat_associe
    cand_b.nom = "B"
    cand_b.prenom = "B"
    cand_b.formation = formation
    cand_b.save()

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
