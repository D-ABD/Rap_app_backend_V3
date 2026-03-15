from rest_framework import serializers
from ...models.cvtheque import CVTheque
from ...models.candidat import Candidat


class CandidatMiniSerializer(serializers.ModelSerializer):
    """
    Sérialiseur minimal du modèle Candidat pour inclusion en lecture seule dans les sérialiseurs CVthèque.
    """
    class Meta:
        model = Candidat
        fields = [
            "id",
            "nom",
            "prenom",
            "email",
            "telephone",
            "ville",
            "code_postal",
            "formation",
            "statut",
            "cv_statut",
        ]


class CVThequeBaseSerializer(serializers.ModelSerializer):
    """
    Base commune pour list et detail : candidat (nested), extension, taille, download_url, preview_url, et champs formation_* (SerializerMethodField).
    """

    candidat = CandidatMiniSerializer(read_only=True)
    extension = serializers.CharField(read_only=True)
    taille = serializers.CharField(read_only=True)

    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()

    formation_nom = serializers.SerializerMethodField()
    formation_centre = serializers.SerializerMethodField()
    formation_type_offre = serializers.SerializerMethodField()
    formation_num_offre = serializers.SerializerMethodField()

    def get_download_url(self, obj):
        """URL absolue pour le téléchargement du CV (nécessite request dans le contexte)."""
        request = self.context.get("request")
        return request.build_absolute_uri(f"/api/cvtheque/{obj.id}/download/")

    def get_preview_url(self, obj):
        """URL absolue pour la prévisualisation du CV (nécessite request dans le contexte)."""
        request = self.context.get("request")
        return request.build_absolute_uri(f"/api/cvtheque/{obj.id}/preview/")

    def get_formation_nom(self, obj):
        """Nom de la formation du candidat (candidat.formation.nom)."""
        f = getattr(obj.candidat, "formation", None)
        return getattr(f, "nom", None)

    def get_formation_centre(self, obj):
        """Nom du centre de la formation du candidat (candidat.formation.centre.nom)."""
        f = getattr(obj.candidat, "formation", None)
        c = getattr(f, "centre", None)
        return getattr(c, "nom", None)

    def get_formation_type_offre(self, obj):
        """Type d'offre de la formation (candidat.formation.type_offre.nom)."""
        f = getattr(obj.candidat, "formation", None)
        t = getattr(f, "type_offre", None)
        return getattr(t, "nom", None)

    def get_formation_num_offre(self, obj):
        """Numéro d'offre de la formation (candidat.formation.num_offre)."""
        f = getattr(obj.candidat, "formation", None)
        return getattr(f, "num_offre", None)


class CVThequeListSerializer(CVThequeBaseSerializer):
    """
    Sérialiseur pour la liste des CV (champs listés dans Meta.fields), tous en lecture seule.
    """

    class Meta:
        model = CVTheque
        fields = [
            "id",
            "titre",
            "document_type",
            "date_depot",
            "est_public",
            "extension",
            "taille",
            "preview_url",
            "download_url",
            "candidat",

            "formation_nom",
            "formation_centre",
            "formation_type_offre",
            "formation_num_offre",
        ]


class CVThequeDetailSerializer(CVThequeBaseSerializer):
    """
    Sérialiseur pour le détail d'un CV : hérite de la base et ajoute formation_statut, formation_start_date, formation_end_date, formation_resume.
    Tous les champs en lecture seule.
    """

    formation_statut = serializers.SerializerMethodField()
    formation_start_date = serializers.SerializerMethodField()
    formation_end_date = serializers.SerializerMethodField()
    formation_resume = serializers.SerializerMethodField()

    class Meta:
        model = CVTheque
        fields = [
            "id",
            "document_type",
            "titre",
            "mots_cles",
            "est_public",
            "date_depot",
            "extension",
            "taille",
            "preview_url",
            "download_url",
            "candidat",

            "formation_nom",
            "formation_num_offre",
            "formation_type_offre",
            "formation_statut",
            "formation_centre",
            "formation_start_date",
            "formation_end_date",
            "formation_resume",
        ]

    def _formation(self, obj):
        """Retourne la formation du candidat ou None."""
        return getattr(obj.candidat, "formation", None)

    def get_formation_statut(self, obj):
        """Nom du statut de la formation (candidat.formation.statut.nom)."""
        f = self._formation(obj)
        return getattr(f.statut, "nom", None) if f and f.statut else None

    def get_formation_start_date(self, obj):
        """Date de début de la formation du candidat."""
        f = self._formation(obj)
        return getattr(f, "start_date", None)

    def get_formation_end_date(self, obj):
        """Date de fin de la formation du candidat."""
        f = self._formation(obj)
        return getattr(f, "end_date", None)

    def get_formation_resume(self, obj):
        """Résumé de la formation (candidat.formation.resume)."""
        f = self._formation(obj)
        return getattr(f, "resume", None)


class CVThequeWriteSerializer(serializers.ModelSerializer):
    """
    Sérialiseur d'écriture pour la création et la mise à jour d'un CV.
    validate_titre : refuse un titre vide. validate : limite la taille du fichier à 5 Mo.
    create/update : affectent created_by et updated_by à l'utilisateur authentifié ; en update sans fichier, l'ancien fichier est conservé.
    """

    candidat = serializers.PrimaryKeyRelatedField(
        queryset=Candidat.objects.all(),
        required=False,
        allow_null=True
    )
    fichier = serializers.FileField(required=False)

    class Meta:
        model = CVTheque
        fields = [
            "id",
            "candidat",
            "document_type",
            "titre",
            "mots_cles",
            "est_public",
            "fichier",
        ]

    def validate_titre(self, value):
        """Refuse un titre vide ou uniquement des espaces."""
        if not value.strip():
            raise serializers.ValidationError("Le titre est obligatoire.")
        return value

    def validate(self, attrs):
        """Vérifie que le fichier (si fourni) ne dépasse pas 5 Mo."""
        fichier = attrs.get("fichier")
        if fichier and fichier.size > 5 * 1024 * 1024:
            raise serializers.ValidationError({"fichier": "Le fichier ne doit pas dépasser 5 Mo."})
        return attrs

    def create(self, validated_data):
        """Crée l'instance et affecte created_by et updated_by à l'utilisateur courant si authentifié."""
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        validated_data["created_by"] = user
        validated_data["updated_by"] = user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Met à jour l'instance, affecte updated_by ; si 'fichier' absent de validated_data, l'ancien fichier est conservé."""
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        validated_data["updated_by"] = user

        if "fichier" not in validated_data:
            validated_data.pop("fichier", None)

        return super().update(instance, validated_data)
