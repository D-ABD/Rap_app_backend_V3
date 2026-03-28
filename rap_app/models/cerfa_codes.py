"""Nomenclatures CERFA partagees par les modeles source et les snapshots.

Ces listes Django `TextChoices` servent de reference unique pour les champs
codees alimentant le CERFA. Les modeles metier stockent les codes ; le module
CERFA conserve ensuite un snapshot autonome des valeurs au moment du contrat.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class CerfaNationaliteCode(models.TextChoices):
    FRANCAISE = "1", _("1 - Francaise")
    UNION_EUROPEENNE = "2", _("2 - Union europeenne")
    HORS_UNION_EUROPEENNE = "3", _("3 - Etranger hors Union europeenne")


class CerfaRegimeSocialCode(models.TextChoices):
    MSA = "1", _("1 - MSA")
    URSSAF = "2", _("2 - URSSAF")


class CerfaSituationAvantContratCode(models.TextChoices):
    SCOLAIRE = "1", _("1 - Scolaire")
    PREPA_APPRENTISSAGE = "2", _("2 - Prepa apprentissage")
    ETUDIANT = "3", _("3 - Etudiant")
    CONTRAT_APPRENTISSAGE = "4", _("4 - Contrat d'apprentissage")
    CONTRAT_PRO = "5", _("5 - Contrat de professionnalisation")
    CONTRAT_AIDE = "6", _("6 - Contrat aide")
    STAGIAIRE_AVANT_CONTRAT = "7", _("7 - En formation au CFA sous statut de stagiaire avant contrat")
    STAGIAIRE_APRES_RUPTURE = "8", _("8 - En formation au CFA sans contrat suite a rupture")
    AUTRE_STAGIAIRE_FP = "9", _("9 - Autres situations sous statut de stagiaire de la formation professionnelle")
    SALARIE = "10", _("10 - Salarie")
    RECHERCHE_EMPLOI = "11", _("11 - Personne a la recherche d'un emploi")
    INACTIF = "12", _("12 - Inactif")


class CerfaDiplomeCode(models.TextChoices):
    AUCUN_DIPLOME = "13", _("13 - Aucun diplome ni titre professionnel")
    DNB = "25", _("25 - Diplome national du Brevet")
    CFG = "26", _("26 - Certificat de formation generale")
    CAP = "33", _("33 - CAP")
    BEP = "34", _("34 - BEP")
    CERTIFICAT_SPECIALISATION = "35", _("35 - Certificat de specialisation")
    AUTRE_CAP_BEP = "38", _("38 - Autre diplome ou titre de niveau CAP/BEP")
    BAC_PRO = "41", _("41 - Baccalaureat professionnel")
    BAC_GENERAL = "42", _("42 - Baccalaureat general")
    BAC_TECHNO = "43", _("43 - Baccalaureat technologique")
    DIPLOME_SPECIALISATION_PRO = "44", _("44 - Diplome de specialisation professionnelle")
    AUTRE_BAC = "49", _("49 - Autre diplome ou titre de niveau bac")
    BTS = "54", _("54 - Brevet de Technicien Superieur")
    DUT = "55", _("55 - Diplome Universitaire de technologie")
    AUTRE_BAC_2 = "58", _("58 - Autre diplome ou titre de niveau bac+2")
    LICENCE_PRO = "62", _("62 - Licence professionnelle")
    LICENCE_GENERALE = "63", _("63 - Licence generale")
    BUT = "64", _("64 - Bachelor universitaire de technologie BUT")
    AUTRE_BAC_3_4 = "69", _("69 - Autre diplome ou titre de niveau bac+3 ou 4")
    MASTER = "73", _("73 - Master")
    INGENIEUR = "75", _("75 - Diplome d'ingenieur")
    ECOLE_COMMERCE = "76", _("76 - Diplome d'ecole de commerce")
    AUTRE_BAC_5 = "79", _("79 - Autre diplome ou titre de niveau bac+5 ou plus")
    DOCTORAT = "80", _("80 - Doctorat")


class CerfaDerniereClasseCode(models.TextChoices):
    DIPLOME_OBTENU = "01", _("01 - Derniere annee du cycle suivie et diplome obtenu")
    PREMIERE_VALIDEE = "11", _("11 - 1ere annee validee")
    PREMIERE_NON_VALIDEE = "12", _("12 - 1ere annee non validee")
    DEUXIEME_VALIDEE = "21", _("21 - 2e annee validee")
    DEUXIEME_NON_VALIDEE = "22", _("22 - 2e annee non validee")
    TROISIEME_VALIDEE = "31", _("31 - 3e annee validee")
    TROISIEME_NON_VALIDEE = "32", _("32 - 3e annee non validee")
    COLLEGE_ACHEVE = "40", _("40 - 1er cycle de l'enseignement secondaire acheve")
    INTERRUPTION_3E = "41", _("41 - Interruption en 3e")
    INTERRUPTION_4E = "42", _("42 - Interruption en 4e")


class CerfaTypeEmployeurCode(models.TextChoices):
    REPERTOIRE_METIERS = "11", _("11 - Entreprise inscrite au repertoire des metiers")
    RCS = "12", _("12 - Entreprise inscrite uniquement au registre du commerce et des societes")
    MSA = "13", _("13 - Entreprise relevant de la mutualite sociale agricole")
    PROFESSION_LIBERALE = "14", _("14 - Profession liberale")
    ASSOCIATION = "15", _("15 - Association")
    AUTRE_PRIVE = "16", _("16 - Autre employeur prive")
    ETAT = "21", _("21 - Service de l'Etat")
    COMMUNE = "22", _("22 - Commune")
    DEPARTEMENT = "23", _("23 - Departement")
    REGION = "24", _("24 - Region")
    HOSPITALIER = "25", _("25 - Etablissement public hospitalier")
    EPLE = "26", _("26 - Etablissement public local d'enseignement")
    EPA_ETAT = "27", _("27 - Etablissement public administratif de l'Etat")
    EPA_LOCAL = "28", _("28 - Etablissement public administratif local")
    AUTRE_PUBLIC = "29", _("29 - Autre employeur public")
    EPIC = "30", _("30 - Etablissement public industriel et commercial")


class CerfaEmployeurSpecifiqueCode(models.TextChoices):
    AUCUN = "0", _("0 - Aucun de ces cas")
    ETT = "1", _("1 - Entreprise de travail temporaire")
    GROUPEMENT = "2", _("2 - Groupement d'employeurs")
    SAISONNIER = "3", _("3 - Employeur saisonnier")
    APPRENTISSAGE_FAMILIAL = "4", _("4 - Apprentissage familial")


class CerfaMaitreNiveauDiplomeCode(models.TextChoices):
    AUCUN = "0", _("0 - Aucun")
    CAP_BEP = "3", _("3 - CAP, BEP")
    BAC = "4", _("4 - Baccalaureat")
    BAC_2 = "5", _("5 - DEUG, BTS, DUT, DEUST")
    BAC_3_4 = "6", _("6 - Licence, licence professionnelle, BUT, Maitrise")
    BAC_5 = "7", _("7 - Master, DEA, DESS, diplome d'ingenieur")
    DOCTORAT = "8", _("8 - Doctorat, HDR")


class CerfaTypeContratCode(models.TextChoices):
    PREMIER_CONTRAT = "11", _("11 - Premier contrat d'apprentissage")
    MEME_EMPLOYEUR = "21", _("21 - Nouveau contrat apres contrat termine chez le meme employeur")
    AUTRE_EMPLOYEUR = "22", _("22 - Nouveau contrat apres contrat termine chez un autre employeur")
    APRES_RUPTURE = "23", _("23 - Nouveau contrat apres rupture")
    MODIF_SITUATION_JURIDIQUE = "31", _("31 - Modification de la situation juridique de l'employeur")
    SAISONNIER = "32", _("32 - Changement d'employeur dans le cadre d'un contrat saisonnier")
    PROLONGATION_ECHEC = "33", _("33 - Prolongation suite a un echec a l'examen")
    PROLONGATION_RQTH = "34", _("34 - Prolongation suite a la reconnaissance RQTH")
    DIPLOME_SUPPLEMENTAIRE = "35", _("35 - Diplome supplementaire prepare")
    AUTRES_CHANGEMENTS = "36", _("36 - Autres changements")
    MODIF_LIEU_EXECUTION = "37", _("37 - Modification du lieu d'execution du contrat")
    MODIF_LIEU_FORMATION = "38", _("38 - Modification du lieu principal de formation theorique")


class CerfaTypeDerogationCode(models.TextChoices):
    AGE_INFERIEUR_16 = "11", _("11 - Age inferieur a 16 ans")
    AGE_SUPERIEUR_29 = "12", _("12 - Age superieur a 29 ans")
    REDUCTION_DUREE = "21", _("21 - Reduction de la duree")
    ALLONGEMENT_DUREE = "22", _("22 - Allongement de la duree")
    CUMUL = "50", _("50 - Cumul de derogations")
    AUTRE = "60", _("60 - Autre derogation")
