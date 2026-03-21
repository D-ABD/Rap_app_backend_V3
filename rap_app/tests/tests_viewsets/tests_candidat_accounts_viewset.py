import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from ...models.atelier_tre import AtelierTRE
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
    payload = resp.json()
    assert payload["success"] is False
    assert payload["message"] == "Ce candidat n'est pas admissible."
    assert payload["errors"]["non_field_errors"] == ["Ce candidat n'est pas admissible."]


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
def test_demande_compte_candidat_duplicate_pending_uses_non_field_errors():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet Duplicate Pending", code_postal="75107")
    formation = Formation.objects.create(
        nom="Formation ViewSet Duplicate Pending",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    user_cand = CustomUser.objects.create_user_with_role(
        email="duplicate.pending@example.com",
        username="duplicatepending",
        password=None,
        role=CustomUser.ROLE_CANDIDAT,
    )
    cand = Candidat.objects.create(
        nom="Demande",
        prenom="Double",
        email="duplicate.pending@example.com",
        formation=formation,
        compte_utilisateur=user_cand,
        demande_compte_statut=Candidat.DemandeCompteStatut.EN_ATTENTE,
    )

    client.force_authenticate(user=user_cand)
    response = client.post(reverse("demande_compte_candidat"))

    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["message"] == "Une demande de compte est déjà en attente."
    assert payload["data"] is None
    assert payload["errors"]["non_field_errors"] == ["Une demande de compte est déjà en attente."]


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
def test_staff_valider_demande_compte_without_pending_request_uses_non_field_errors():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet No Pending", code_postal="75109")
    formation = Formation.objects.create(
        nom="Formation ViewSet No Pending",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_viewset_no_pending@example.com",
        username="staff_viewset_no_pending",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    cand = Candidat.objects.create(
        nom="No",
        prenom="Pending",
        email="no.pending@example.com",
        formation=formation,
        demande_compte_statut=Candidat.DemandeCompteStatut.AUCUNE,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(reverse("candidat-valider-demande-compte", args=[cand.id]))

    assert resp.status_code == 400
    payload = resp.json()
    assert payload["success"] is False
    assert payload["message"] == "Aucune demande de compte en attente pour ce candidat."
    assert payload["errors"]["non_field_errors"] == ["Aucune demande de compte en attente pour ce candidat."]


@pytest.mark.django_db
def test_staff_cannot_create_candidate_without_rgpd_legal_basis():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre RGPD 1", code_postal="75150")
    formation = Formation.objects.create(
        nom="Formation RGPD 1",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_rgpd1@example.com",
        username="staff_rgpd1",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    resp = client.post(
        reverse("candidat-list"),
        {
            "nom": "Sans",
            "prenom": "BaseLegale",
            "email": "sans.baselegale@example.com",
            "formation": formation.id,
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "rgpd_legal_basis" in resp.json()["errors"]


@pytest.mark.django_db
def test_staff_create_candidate_sets_rgpd_manual_defaults():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre RGPD 2", code_postal="75151")
    formation = Formation.objects.create(
        nom="Formation RGPD 2",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_rgpd2@example.com",
        username="staff_rgpd2",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    resp = client.post(
        reverse("candidat-list"),
        {
            "nom": "Avec",
            "prenom": "BaseLegale",
            "email": "avec.baselegale@example.com",
            "formation": formation.id,
            "rgpd_legal_basis": Candidat.RgpdLegalBasis.INTERET_LEGITIME,
        },
        format="json",
    )

    assert resp.status_code == 201
    created = Candidat.objects.get(email="avec.baselegale@example.com")
    assert created.rgpd_creation_source == Candidat.RgpdCreationSource.MANUAL_ADMIN
    assert created.rgpd_notice_status == Candidat.RgpdNoticeStatus.A_NOTIFIER
    assert created.rgpd_data_reviewed_by == staff
    assert created.rgpd_data_reviewed_at is not None


@pytest.mark.django_db
def test_staff_create_candidate_with_consent_basis_requires_consent_flag():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre RGPD 3", code_postal="75152")
    formation = Formation.objects.create(
        nom="Formation RGPD 3",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_rgpd3@example.com",
        username="staff_rgpd3",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    resp = client.post(
        reverse("candidat-list"),
        {
            "nom": "Consent",
            "prenom": "Required",
            "email": "consent.required@example.com",
            "formation": formation.id,
            "rgpd_legal_basis": Candidat.RgpdLegalBasis.CONSENTEMENT,
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "rgpd_consent_obtained" in resp.json()["errors"]


@pytest.mark.django_db
def test_staff_create_candidate_normalizes_safe_text_fields():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre RGPD 4", code_postal="75153")
    formation = Formation.objects.create(
        nom="Formation RGPD 4",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_rgpd4@example.com",
        username="staff_rgpd4",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    resp = client.post(
        reverse("candidat-list"),
        {
            "nom": "  dUPONT ",
            "prenom": "  jEAN-pAUL ",
            "email": "  RGPD.Normalize@Example.COM ",
            "telephone": "06 12-34.56 78",
            "ville": "  sAINT-denis ",
            "code_postal": " 75 008 ",
            "formation": formation.id,
            "rgpd_legal_basis": Candidat.RgpdLegalBasis.INTERET_LEGITIME,
        },
        format="json",
    )

    assert resp.status_code == 201
    created = Candidat.objects.get(email="rgpd.normalize@example.com")
    assert created.nom == "Dupont"
    assert created.prenom == "Jean-Paul"
    assert created.telephone == "0612345678"
    assert created.ville == "Saint-Denis"
    assert created.code_postal == "75008"


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
def test_staff_can_filter_candidates_by_parcours_phase_alias():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M3A", code_postal="75132")
    formation = Formation.objects.create(
        nom="Formation ViewSet M3A",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m3a@example.com",
        username="staff_m3a",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    visible = Candidat.objects.create(
        nom="Visible",
        prenom="Phase",
        email="visible.phase@example.com",
        formation=formation,
        parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
        created_by=staff,
        updated_by=staff,
    )
    Candidat.objects.create(
        nom="Masque",
        prenom="Phase",
        email="masque.phase@example.com",
        formation=formation,
        parcours_phase=Candidat.ParcoursPhase.ABANDON,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.get(reverse("candidat-list"), {"parcoursPhase": "Inscrit validé"})

    assert resp.status_code == 200
    payload = resp.json().get("data", resp.json())
    results = payload.get("results", payload)
    assert [item["id"] for item in results] == [visible.id]


@pytest.mark.django_db
def test_staff_can_still_filter_candidates_by_legacy_statut_during_m3():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M3B", code_postal="75133")
    formation = Formation.objects.create(
        nom="Formation ViewSet M3B",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m3b@example.com",
        username="staff_m3b",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    visible = Candidat.objects.create(
        nom="Visible",
        prenom="Legacy",
        email="visible.legacy@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.ABANDON,
        parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
        created_by=staff,
        updated_by=staff,
    )
    Candidat.objects.create(
        nom="Masque",
        prenom="Legacy",
        email="masque.legacy@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.AUTRE,
        parcours_phase=Candidat.ParcoursPhase.ABANDON,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.get(reverse("candidat-list"), {"statut": Candidat.StatutCandidat.ABANDON})

    assert resp.status_code == 200
    payload = resp.json().get("data", resp.json())
    results = payload.get("results", payload)
    assert [item["id"] for item in results] == [visible.id]


@pytest.mark.django_db
def test_staff_can_order_candidates_by_parcours_phase_during_m3():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M3C", code_postal="75134")
    formation = Formation.objects.create(
        nom="Formation ViewSet M3C",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m3c@example.com",
        username="staff_m3c",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    first = Candidat.objects.create(
        nom="Alpha",
        prenom="Order",
        email="alpha.order@example.com",
        formation=formation,
        parcours_phase=Candidat.ParcoursPhase.ABANDON,
        created_by=staff,
        updated_by=staff,
    )
    second = Candidat.objects.create(
        nom="Beta",
        prenom="Order",
        email="beta.order@example.com",
        formation=formation,
        parcours_phase=Candidat.ParcoursPhase.POSTULANT,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.get(reverse("candidat-list"), {"ordering": "parcours_phase"})

    assert resp.status_code == 200
    payload = resp.json().get("data", resp.json())
    results = payload.get("results", payload)
    returned_ids = [item["id"] for item in results]
    assert first.id in returned_ids
    assert second.id in returned_ids


@pytest.mark.django_db
def test_staff_cannot_directly_patch_legacy_status_or_phase_fields():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet R2A", code_postal="75135")
    formation = Formation.objects.create(
        nom="Formation ViewSet R2A",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_r2a@example.com",
        username="staff_r2a",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    cand = Candidat.objects.create(
        nom="Patch",
        prenom="Direct",
        email="patch.direct@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.AUTRE,
        parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.patch(
        reverse("candidat-detail", args=[cand.id]),
        {
            "statut": Candidat.StatutCandidat.ABANDON,
            "parcours_phase": Candidat.ParcoursPhase.ABANDON,
            "date_sortie_formation": "2026-03-20",
        },
        format="json",
    )

    assert resp.status_code == 200
    cand.refresh_from_db()
    assert cand.statut == Candidat.StatutCandidat.AUTRE
    assert cand.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE
    assert cand.date_sortie_formation is None


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
def test_staff_can_complete_formation_without_touching_legacy_status():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M2C", code_postal="75130")
    formation = Formation.objects.create(
        nom="Formation ViewSet M2C",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m2c@example.com",
        username="staff_m2c",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    cand = Candidat.objects.create(
        nom="Sortie",
        prenom="Session",
        email="sortie.session@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.EN_FORMATION,
        parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(reverse("candidat-complete-formation", args=[cand.id]))

    assert resp.status_code == 200
    cand.refresh_from_db()
    assert cand.parcours_phase == Candidat.ParcoursPhase.SORTI
    assert cand.date_sortie_formation is not None
    assert cand.statut == Candidat.StatutCandidat.EN_FORMATION


@pytest.mark.django_db
def test_staff_can_abandon_candidate_and_keep_legacy_status_compatible():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M2D", code_postal="75131")
    formation = Formation.objects.create(
        nom="Formation ViewSet M2D",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m2d@example.com",
        username="staff_m2d",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    cand = Candidat.objects.create(
        nom="Abandon",
        prenom="Session",
        email="abandon.session@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.EN_FORMATION,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(reverse("candidat-abandon", args=[cand.id]))

    assert resp.status_code == 200
    cand.refresh_from_db()
    assert cand.parcours_phase == Candidat.ParcoursPhase.ABANDON
    assert cand.statut == Candidat.StatutCandidat.ABANDON
    assert cand.date_sortie_formation is not None


@pytest.mark.django_db
def test_staff_can_bulk_validate_inscription_in_scope():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet R3A", code_postal="75136")
    formation = Formation.objects.create(
        nom="Formation ViewSet R3A",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_r3a@example.com",
        username="staff_r3a",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    c1 = Candidat.objects.create(
        nom="Bulk",
        prenom="One",
        email="bulk.one@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )
    c2 = Candidat.objects.create(
        nom="Bulk",
        prenom="Two",
        email="bulk.two@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(
        reverse("candidat-bulk-validate-inscription"),
        {"candidate_ids": [c1.id, c2.id]},
        format="json",
    )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["summary"]["requested"] == 2
    assert sorted(data["succeeded_ids"]) == sorted([c1.id, c2.id])

    c1.refresh_from_db()
    c2.refresh_from_db()
    assert c1.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE
    assert c2.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE


@pytest.mark.django_db
def test_staff_bulk_start_formation_reports_out_of_scope_candidates_as_failed():
    client = APIClient()
    centre_a = Centre.objects.create(nom="Centre ViewSet R3B-A", code_postal="75137")
    centre_b = Centre.objects.create(nom="Centre ViewSet R3B-B", code_postal="75138")
    formation_a = Formation.objects.create(
        nom="Formation ViewSet R3B-A",
        centre=centre_a,
        prevus_crif=5,
        prevus_mp=5,
    )
    formation_b = Formation.objects.create(
        nom="Formation ViewSet R3B-B",
        centre=centre_b,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_r3b@example.com",
        username="staff_r3b",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre_a)

    in_scope = Candidat.objects.create(
        nom="Scope",
        prenom="In",
        email="scope.in@example.com",
        formation=formation_a,
        admissible=True,
        created_by=staff,
        updated_by=staff,
    )
    out_scope = Candidat.objects.create(
        nom="Scope",
        prenom="Out",
        email="scope.out@example.com",
        formation=formation_b,
        admissible=True,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(
        reverse("candidat-bulk-start-formation"),
        {"candidate_ids": [in_scope.id, out_scope.id]},
        format="json",
    )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["summary"]["requested"] == 1
    assert data["succeeded_ids"] == [in_scope.id]
    assert data["failed"] == []

    in_scope.refresh_from_db()
    out_scope.refresh_from_db()
    assert in_scope.parcours_phase == Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION
    assert out_scope.parcours_phase != Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION


@pytest.mark.django_db
def test_staff_can_bulk_assign_atelier_tre_in_scope():
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet R3C", code_postal="75139")
    formation = Formation.objects.create(
        nom="Formation ViewSet R3C",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_r3c@example.com",
        username="staff_r3c",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    atelier = AtelierTRE.objects.create(
        type_atelier=AtelierTRE.TypeAtelier.ATELIER_1,
        centre=centre,
        created_by=staff,
    )
    cand = Candidat.objects.create(
        nom="TRE",
        prenom="Bulk",
        email="tre.bulk@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(
        reverse("candidat-bulk-assign-atelier-tre"),
        {"candidate_ids": [cand.id], "atelier_tre_id": atelier.id},
        format="json",
    )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["succeeded_ids"] == [cand.id]
    atelier.refresh_from_db()
    assert atelier.candidats.filter(id=cand.id).exists()


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
