"""Gate RGPD : rôles parcours candidat sans accès complet tant que compte + fiche non validés (sauf /me et fiche)."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from ...api.candidat_error_messages import CANDIDAT_MSG_RGPD_APP_REQUIS
from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.statut import Statut
from ...models.types_offre import TypeOffre


@pytest.mark.django_db
def test_candidate_without_rgpd_blocks_prospection_but_allows_me_and_candidat_me():
    client = APIClient()
    centre = Centre.objects.create(nom="RGPD Gate", code_postal="75001")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation = Formation.objects.create(
        nom="F RGPD",
        centre=centre,
        statut=statut,
        type_offre=type_offre,
    )
    u = CustomUser.objects.create_user_with_role(
        email="rgpd-gate@example.com",
        username="rgpd_gate",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    Candidat.objects.create(
        nom="N",
        prenom="P",
        email="rgpd-gate@example.com",
        formation=formation,
        compte_utilisateur=u,
    )

    client.force_authenticate(user=u)

    r0 = client.get(reverse("prospection-list"))
    assert r0.status_code == status.HTTP_403_FORBIDDEN
    assert r0.data.get("message") == CANDIDAT_MSG_RGPD_APP_REQUIS
    assert r0.data.get("error_code") == "candidate_rgpd_consent_required"

    r1 = client.get(reverse("me"))
    assert r1.status_code == status.HTTP_200_OK

    r2 = client.get(reverse("candidat-detail", args=["me"]))
    assert r2.status_code == status.HTTP_200_OK

    u.consent_rgpd = True
    u.save(update_fields=["consent_rgpd"])

    r3 = client.get(reverse("prospection-list"))
    assert r3.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_candidate_with_fiche_rgpd_admin_only_opens_prospection():
    client = APIClient()
    centre = Centre.objects.create(nom="RGPD Fiche", code_postal="75002")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation = Formation.objects.create(
        nom="F2",
        centre=centre,
        statut=statut,
        type_offre=type_offre,
    )
    u = CustomUser.objects.create_user_with_role(
        email="rgpd-fiche@example.com",
        username="rgpd_fiche",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    Candidat.objects.create(
        nom="A",
        prenom="B",
        email="rgpd-fiche@example.com",
        formation=formation,
        compte_utilisateur=u,
        rgpd_consent_obtained=True,
    )

    client.force_authenticate(user=u)
    r = client.get(reverse("prospection-list"))
    assert r.status_code == status.HTTP_200_OK
