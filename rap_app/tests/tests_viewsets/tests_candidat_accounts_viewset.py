"""Tests relatifs a candidat accounts viewset."""
import pytest
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient

from ...models.atelier_tre import AtelierTRE
from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation


@pytest.mark.django_db
def test_staff_creer_compte_action():
    """Action staff /candidats/{id}/creer-compte/ crée ou lie un compte candidat sans promotion stagiaire."""
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

    # Ce test vérifie que l'action crée un vrai compte candidat sans passer trop tôt en stagiaire.
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
    assert data["message"] == "Compte candidat créé ou lié avec succès."
    assert data["data"]["user_id"] == cand_user.id
    assert data["data"]["user_role"] == CustomUser.ROLE_CANDIDAT_USER

    cand_user.refresh_from_db()
    assert cand_user.role == CustomUser.ROLE_CANDIDAT_USER


@pytest.mark.django_db
def test_delete_candidate_archives_and_hides_from_default_list():
    """Teste que Delete candidate archives and hides from default list."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet Delete", code_postal="75901")
    formation = Formation.objects.create(
        nom="Formation ViewSet Delete",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_delete_candidate@example.com",
        username="staff_delete_candidate",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    cand = Candidat.objects.create(
        nom="Delete",
        prenom="Candidate",
        email="delete-candidate@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    delete_response = client.delete(reverse("candidat-detail", args=[cand.id]))
    assert delete_response.status_code == 200

    cand.refresh_from_db()
    assert cand.is_active is False

    list_response = client.get(reverse("candidat-list"))
    assert list_response.status_code == 200
    payload = list_response.json().get("data", list_response.json())
    returned_ids = [item["id"] for item in payload["results"]]
    assert cand.id not in returned_ids


@pytest.mark.django_db
def test_list_can_include_archived_candidate():
    """Teste que List can include archived candidate."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet Archived", code_postal="75902")
    formation = Formation.objects.create(
        nom="Formation ViewSet Archived",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_archived_candidate@example.com",
        username="staff_archived_candidate",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    cand = Candidat.objects.create(
        nom="Archived",
        prenom="Candidate",
        email="archived-candidate@example.com",
        formation=formation,
        is_active=False,
        created_by=staff,
        updated_by=staff,
    )

    response = client.get(reverse("candidat-list"), {"avec_archivees": "true"})
    assert response.status_code == 200
    payload = response.json().get("data", response.json())
    returned_ids = [item["id"] for item in payload["results"]]
    assert cand.id in returned_ids


@pytest.mark.django_db
def test_desarchiver_candidate():
    """Teste que Desarchiver candidate."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet Restore", code_postal="75903")
    formation = Formation.objects.create(
        nom="Formation ViewSet Restore",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_restore_candidate@example.com",
        username="staff_restore_candidate",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)
    client.force_authenticate(user=staff)

    cand = Candidat.objects.create(
        nom="Restore",
        prenom="Candidate",
        email="restore-candidate@example.com",
        formation=formation,
        is_active=False,
        created_by=staff,
        updated_by=staff,
    )

    response = client.post(reverse("candidat-desarchiver", args=[cand.id]))
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Candidat désarchivé avec succès."

    cand.refresh_from_db()
    assert cand.is_active is True


@pytest.mark.django_db
def test_staff_creer_compte_refuse_si_deja_compte():
    """L'action creer-compte ne refuse plus un compte déjà lié : elle harmonise le rôle candidat si besoin."""
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
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["success"] is True
    assert payload["message"] == "Compte candidat créé ou lié avec succès."
    assert payload["data"]["user_id"] == cand_user.id
    assert payload["data"]["user_role"] == CustomUser.ROLE_CANDIDAT_USER

    cand_user.refresh_from_db()
    assert cand_user.role == CustomUser.ROLE_CANDIDAT_USER


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
    """Teste que Demande compte candidat duplicate pending uses non field errors."""
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
    assert payload["error_code"] == "candidate_account_request_already_pending"


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
    payload = resp2.json()
    assert payload["success"] is True
    assert payload["message"] == "Demande de compte validée et compte utilisateur créé ou lié."

    cand.refresh_from_db()
    assert cand.demande_compte_statut == Candidat.DemandeCompteStatut.ACCEPTEE
    assert cand.compte_utilisateur is not None
    assert payload["data"]["user_id"] == cand.compte_utilisateur_id
    assert payload["data"]["user_email"] == cand.compte_utilisateur.email


@pytest.mark.django_db
def test_staff_valider_demande_compte_without_pending_request_uses_non_field_errors():
    """Teste que Staff valider demande compte without pending request uses non field errors."""
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
    assert payload["error_code"] == "candidate_account_request_missing"


@pytest.mark.django_db
def test_staff_cannot_create_candidate_without_rgpd_legal_basis():
    """Teste que Staff cannot create candidate without rgpd legal basis."""
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
    """Teste que Staff create candidate sets rgpd manual defaults."""
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
    """Teste que Staff create candidate with consent basis requires consent flag."""
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
    """Teste que Staff create candidate normalizes safe text fields."""
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
def test_staff_can_validate_inscription_without_forcing_gespers_or_legacy_status():
    """Teste que Staff can validate inscription without forcing gespers or legacy status."""
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
    assert cand.inscrit_gespers is False
    assert cand.date_validation_inscription is not None
    assert cand.statut == Candidat.StatutCandidat.AUTRE


@pytest.mark.django_db
def test_staff_can_toggle_gespers_manually():
    """Teste que Staff can toggle gespers manually."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet G1", code_postal="75140")
    formation = Formation.objects.create(
        nom="Formation ViewSet G1",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_g1@example.com",
        username="staff_g1",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    cand = Candidat.objects.create(
        nom="Gespers",
        prenom="Toggle",
        email="gespers.toggle@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp_set = client.post(reverse("candidat-set-gespers", args=[cand.id]))
    assert resp_set.status_code == 200

    cand.refresh_from_db()
    assert cand.inscrit_gespers is True

    resp_clear = client.post(reverse("candidat-clear-gespers", args=[cand.id]))
    assert resp_clear.status_code == 200

    cand.refresh_from_db()
    assert cand.inscrit_gespers is False


@pytest.mark.django_db
def test_staff_can_toggle_manual_admissible_accompagnement_and_appairage_statuses():
    """Teste que Staff can toggle manual admissible accompagnement and appairage statuses."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet G2", code_postal="75141")
    formation = Formation.objects.create(
        nom="Formation ViewSet G2",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_g2@example.com",
        username="staff_g2",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    cand = Candidat.objects.create(
        nom="Manual",
        prenom="Status",
        email="manual.status@example.com",
        formation=formation,
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)

    resp_admissible = client.post(reverse("candidat-set-admissible", args=[cand.id]))
    assert resp_admissible.status_code == 200
    cand.refresh_from_db()
    assert cand.admissible is True

    resp_clear_admissible = client.post(reverse("candidat-clear-admissible", args=[cand.id]))
    assert resp_clear_admissible.status_code == 200
    cand.refresh_from_db()
    assert cand.admissible is False

    resp_accompagnement = client.post(reverse("candidat-set-accompagnement", args=[cand.id]))
    assert resp_accompagnement.status_code == 200
    cand.refresh_from_db()
    assert cand.en_accompagnement_tre is True
    assert cand.statut == Candidat.StatutCandidat.EN_ACCOMPAGNEMENT

    resp_clear_accompagnement = client.post(reverse("candidat-clear-accompagnement", args=[cand.id]))
    assert resp_clear_accompagnement.status_code == 200
    cand.refresh_from_db()
    assert cand.en_accompagnement_tre is False
    assert cand.statut == Candidat.StatutCandidat.AUTRE

    resp_appairage = client.post(reverse("candidat-set-appairage", args=[cand.id]))
    assert resp_appairage.status_code == 200
    cand.refresh_from_db()
    assert cand.en_appairage is True
    assert cand.statut == Candidat.StatutCandidat.EN_APPAIRAGE

    resp_clear_appairage = client.post(reverse("candidat-clear-appairage", args=[cand.id]))
    assert resp_clear_appairage.status_code == 200
    cand.refresh_from_db()
    assert cand.en_appairage is False
    assert cand.statut == Candidat.StatutCandidat.AUTRE


@pytest.mark.django_db
def test_staff_can_filter_candidates_by_parcours_phase_alias():
    """Teste que Staff can filter candidates by parcours phase alias."""
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
    resp = client.get(reverse("candidat-list"), {"parcoursPhase": "Inscrit GESPERS"})

    assert resp.status_code == 200
    payload = resp.json().get("data", resp.json())
    results = payload.get("results", payload)
    assert [item["id"] for item in results] == [visible.id]


@pytest.mark.django_db
def test_staff_can_still_filter_candidates_by_legacy_statut_during_m3():
    """Teste que Staff can still filter candidates by legacy statut during m3."""
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

    Candidat.objects.create(
        nom="Visible",
        prenom="Legacy",
        email="visible.legacy@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.ABANDON,
        parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
        created_by=staff,
        updated_by=staff,
    )
    visible = Candidat.objects.create(
        nom="Masque",
        prenom="Legacy",
        email="masque.legacy@example.com",
        formation=formation,
        statut=Candidat.StatutCandidat.ABANDON,
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
    """Teste que Staff can order candidates by parcours phase during m3."""
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
    """Teste que Staff cannot directly patch legacy status or phase fields."""
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
    assert cand.inscrit_gespers is False
    assert cand.date_sortie_formation is None


@pytest.mark.django_db
def test_staff_can_start_formation_and_align_stagiaire_role_when_possible():
    """Teste que Staff can start formation and align stagiaire role when possible."""
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
def test_staff_can_cancel_start_formation_and_revert_role():
    """Teste que Staff can cancel start formation and revert role."""
    client = APIClient()
    centre = Centre.objects.create(nom="Centre ViewSet M2B2", code_postal="75129")
    formation = Formation.objects.create(
        nom="Formation ViewSet M2B2",
        centre=centre,
        prevus_crif=5,
        prevus_mp=5,
    )
    staff = CustomUser.objects.create_user_with_role(
        email="staff_m2b2@example.com",
        username="staff_m2b2",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    staff.centres.add(centre)

    compte = CustomUser.objects.create_user_with_role(
        email="candidate_m2b2@example.com",
        username="candidate_m2b2",
        password="password123",
        role=CustomUser.ROLE_STAGIAIRE,
    )
    cand = Candidat.objects.create(
        nom="Annule",
        prenom="Formation",
        email="candidate_m2b2@example.com",
        formation=formation,
        admissible=True,
        inscrit_gespers=True,
        compte_utilisateur=compte,
        statut=Candidat.StatutCandidat.EN_FORMATION,
        parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
        date_validation_inscription=timezone.now(),
        date_entree_formation_effective=timezone.now(),
        created_by=staff,
        updated_by=staff,
    )

    client.force_authenticate(user=staff)
    resp = client.post(reverse("candidat-cancel-start-formation", args=[cand.id]))

    assert resp.status_code == 200
    cand.refresh_from_db()
    compte.refresh_from_db()
    assert cand.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE
    assert cand.date_entree_formation_effective is None
    assert compte.role == CustomUser.ROLE_CANDIDAT_USER


@pytest.mark.django_db
def test_staff_can_complete_formation_without_touching_legacy_status():
    """Teste que Staff can complete formation without touching legacy status."""
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
    """Teste que Staff can abandon candidate and keep legacy status compatible."""
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
    """Teste que Staff can bulk validate inscription in scope."""
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
    assert c1.inscrit_gespers is False
    assert c2.inscrit_gespers is False


@pytest.mark.django_db
def test_staff_bulk_start_formation_reports_out_of_scope_candidates_as_failed():
    """Teste que Staff bulk start formation reports out of scope candidates as failed."""
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
    """Teste que Staff can bulk assign atelier tre in scope."""
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
    """Teste que Valider demande compte refuse collision email avec autre candidat reel."""
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
