from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from rap_app.models import Appairage


class Command(BaseCommand):
    """
    Commande de diagnostic / nettoyage des doublons sur le modèle Appairage.

    OBJECTIF
    --------
    Vérifier et, si demandé, corriger les doublons qui violeraient les
    futures contraintes d'unicité suivantes :

        - Avec formation :
            (candidat, partenaire, formation) UNIQUE lorsque formation IS NOT NULL.
        - Sans formation :
            (candidat, partenaire) UNIQUE lorsque formation IS NULL.

    STRATEGIE PAR DEFAUT
    --------------------
    La stratégie de sélection des enregistrements à conserver est volontairement
    simple et DOIT être validée métierment avant usage en production :

    - Pour chaque groupe de doublons :
        * on CONSERVE l'appairage le plus récent :
            - tri par date_appairage croissante puis id croissant,
            - on garde le DERNIER de la liste (date_appairage max, puis id max).
        * on MARQUE les autres comme à supprimer.

    Cette règle "garder le plus récent" reflète l'hypothèse que l'appairage le plus
    récent est celui qui décrit le mieux l'état métier actuel. Si ce n'est pas le cas
    pour certains scénarios, la commande doit être adaptée avant usage.

    MODES
    -----
    - --dry-run (par défaut) :
        * AUCUNE modification en base.
        * Affiche les groupes de doublons détectés et la décision
          (id conservé / ids supprimés) pour revue métier.

    - --apply :
        * Exécute les suppressions dans UNE SEULE transaction.atomic() globale,
          englobant l'ensemble du nettoyage (avec et sans formation).
        * En cas d'erreur, toute la transaction est annulée (pas d'état intermédiaire).

    COMPTEURS ET EFFETS DE BORD
    ---------------------------
    Lors des suppressions effectives :

    - La commande compte uniquement :
        * le nombre d'Appairage explicitement supprimés.
    - Elle n'essaie PAS de comptabiliser précisément le nombre total d'objets
      supprimés en cascade, car Appairage.delete() est surchargé et peut ne pas
      retourner le tuple (count, details) standard de Django.

    Effets de bord possibles du delete() sur Appairage :
        - suppression d'historiques d'appairage,
        - suppression de commentaires ou d'autres entités reliées par FK CASCADE,
        - déclenchement éventuel de signaux (pre_delete / post_delete) sur Appairage
          et sur ses dépendants.

    PRECAUTIONS
    -----------
    - A utiliser d'abord en --dry-run sur un environnement non critique
      (local, pré-production, dump récent de prod).
    - Avant un --apply en production :
        * sauvegarder la base (backup complet),
        * valider métierment que la stratégie "garder le plus récent" est pertinente,
        * prévoir une petite fenêtre de maintenance (une seule transaction globale).
    """

    help = "Diagnostique et nettoie les doublons Appairage en vue des contraintes d'unicité."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            dest="dry_run",
            help="Mode diagnostic uniquement (aucune suppression). C'est le mode par défaut.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            dest="apply",
            help="Applique réellement les suppressions des doublons détectés.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run")
        apply_mode = options.get("apply")

        # Par défaut, si aucun flag explicite n'est fourni, on reste en dry-run.
        if not dry_run and not apply_mode:
            dry_run = True

        if dry_run and apply_mode:
            self.stderr.write(
                self.style.ERROR(
                    "Options contradictoires : --dry-run et --apply ne peuvent pas être utilisés ensemble."
                )
            )
            return

        mode_label = "DRY-RUN (diagnostic uniquement)" if dry_run else "APPLY (suppression effective)"
        self.stdout.write(self.style.WARNING(f"[check_appairage_uniqueness] Mode : {mode_label}"))

        self.stdout.write(
            self.style.WARNING(
                "Stratégie par défaut : pour chaque groupe de doublons, "
                "on CONSERVE l'appairage le plus récent (date_appairage/id) "
                "et on SUPPRIME les autres. A valider métierment."
            )
        )

        # 1) Doublons avec formation
        self.stdout.write("\n== Doublons AVEC formation (candidat, partenaire, formation) ==")
        doublons_avec = self._detect_doublons_avec_formation()

        # 2) Doublons sans formation
        self.stdout.write("\n== Doublons SANS formation (candidat, partenaire, formation=NULL) ==")
        doublons_sans = self._detect_doublons_sans_formation()

        total_groupes = len(doublons_avec) + len(doublons_sans)
        total_lignes = sum(len(v) for v in doublons_avec.values()) + sum(
            len(v) for v in doublons_sans.values()
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"\nRésumé diagnostic : {total_groupes} groupe(s) de doublons, "
                f"{total_lignes} ligne(s) Appairage concernée(s)."
            )
        )

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    "Fin du DRY-RUN : aucune modification n'a été effectuée.\n"
                    "Revue métier recommandée avant tout --apply, en particulier sur les ids "
                    "conservés/supprimés dans chaque groupe."
                )
            )
            return

        # Mode APPLY : suppression transactionnelle GLOBALE, avec appel à Appairage.delete()
        self._apply_cleanup(doublons_avec, doublons_sans)

    # ---------------------------------------------------------------------
    # Détection des doublons
    # ---------------------------------------------------------------------

    def _detect_doublons_avec_formation(self):
        """
        Retourne un dict :
            clé    = (candidat_id, partenaire_id, formation_id)
            valeur = liste d'instances Appairage associées, triées
                     par (date_appairage, id) croissants.
        pour tous les groupes avec formation_id non null et count > 1.
        """
        groupes = (
            Appairage.objects.filter(formation__isnull=False)
            .values("candidat_id", "partenaire_id", "formation_id")
            .annotate(cnt=Count("id"))
            .filter(cnt__gt=1)
        )

        result = defaultdict(list)
        for g in groupes:
            key = (g["candidat_id"], g["partenaire_id"], g["formation_id"])
            qs = (
                Appairage.objects.filter(
                    candidat_id=g["candidat_id"],
                    partenaire_id=g["partenaire_id"],
                    formation_id=g["formation_id"],
                )
                .order_by("date_appairage", "id")
            )
            result[key] = list(qs)
            self._print_groupe("AVEC_FORMATION", key, result[key])

        if not result:
            self.stdout.write("Aucun doublon AVEC formation détecté.")
        return result

    def _detect_doublons_sans_formation(self):
        """
        Retourne un dict :
            clé    = (candidat_id, partenaire_id)
            valeur = liste d'instances Appairage associées (formation_id null),
                     triées par (date_appairage, id) croissants.
        pour tous les groupes avec formation_id IS NULL et count > 1.
        """
        groupes = (
            Appairage.objects.filter(formation__isnull=True)
            .values("candidat_id", "partenaire_id")
            .annotate(cnt=Count("id"))
            .filter(cnt__gt=1)
        )

        result = defaultdict(list)
        for g in groupes:
            key = (g["candidat_id"], g["partenaire_id"])
            qs = (
                Appairage.objects.filter(
                    candidat_id=g["candidat_id"],
                    partenaire_id=g["partenaire_id"],
                    formation__isnull=True,
                )
                .order_by("date_appairage", "id")
            )
            result[key] = list(qs)
            self._print_groupe("SANS_FORMATION", key, result[key])

        if not result:
            self.stdout.write("Aucun doublon SANS formation détecté.")
        return result

    def _print_groupe(self, kind, key, instances):
        """
        Affiche un groupe de doublons de manière lisible.
        kind = "AVEC_FORMATION" ou "SANS_FORMATION"
        key  = tuple de clés (selon le type)
        instances = liste d'Appairage (déjà triés par date_appairage, id)
        """
        self.stdout.write(self.style.WARNING(f"\n[GROUPE {kind}] clé={key} (count={len(instances)})"))
        for inst in instances:
            self.stdout.write(
                f"  - id={inst.id} | candidat_id={inst.candidat_id} "
                f"| partenaire_id={inst.partenaire_id} | formation_id={inst.formation_id} "
                f"| statut={inst.statut} | activite={inst.activite} | date_appairage={inst.date_appairage}"
            )

        kept = self._choose_to_keep(instances)
        to_delete = [i for i in instances if i.id != kept.id]

        self.stdout.write(
            self.style.SUCCESS(
                f"    -> Règle 'garder le plus récent' : conservé id={kept.id} "
                "(dernier par date_appairage/id)."
            )
        )
        if to_delete:
            self.stdout.write(
                self.style.SUCCESS(
                    "    -> Marqués à supprimer (Appairage) : "
                    + ", ".join(str(i.id) for i in to_delete)
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "    -> Aucun autre enregistrement à supprimer (cas limite : un seul Appairage dans le groupe)."
                )
            )

    @staticmethod
    def _choose_to_keep(instances):
        """
        Stratégie de conservation (NE MODIFIE PAS LA LOGIQUE METIER) :

        - La liste est déjà triée par (date_appairage, id) dans les détecteurs.
        - On conserve le DERNIER élément de la liste :
            * date_appairage la plus récente,
            * puis, à date égale, id le plus grand.

        Cette règle doit être validée métierment avant un --apply en production.
        """
        if not instances:
            raise ValueError("Impossible de choisir un enregistrement à conserver sur une liste vide.")
        # Les détecteurs ordonnent déjà par (date_appairage, id) -> on prend le dernier
        return instances[-1]

    # ---------------------------------------------------------------------
    # Application du nettoyage
    # ---------------------------------------------------------------------

    def _apply_cleanup(self, doublons_avec, doublons_sans):
        """
        Applique la suppression des doublons selon la stratégie par défaut, dans
        UNE SEULE transaction atomique globale (tout ou rien).

        Suppression effectuée instance par instance via Appairage.delete(), afin
        de respecter la logique métier éventuelle du modèle.

        Journalise :
          - le nombre d'Appairage explicitement supprimés.
        """
        total_deleted_appairages = 0

        self.stdout.write(
            self.style.WARNING(
                "\n[APPLY] Démarrage du nettoyage dans une TRANSACTION GLOBALE unique "
                "(AVEC + SANS formation)…"
            )
        )

        with transaction.atomic():
            # 1) Doublons avec formation
            self.stdout.write(
                self.style.WARNING(
                    "\n[APPLY] Nettoyage des doublons AVEC formation (candidat, partenaire, formation)…"
                )
            )
            for key, instances in doublons_avec.items():
                kept = self._choose_to_keep(instances)
                to_delete = [i for i in instances if i.id != kept.id]
                if not to_delete:
                    continue

                expected_appairages = len(to_delete)

                for obj in to_delete:
                    # Appel modèle par modèle pour respecter Appairage.delete()
                    obj.delete()

                total_deleted_appairages += expected_appairages

                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [AVEC_FORMATION clé={key}] conservé id={kept.id}, "
                        f"Appairage supprimés={expected_appairages} "
                        f"(ids Appairage supprimés={[o.id for o in to_delete]})"
                    )
                )

            # 2) Doublons sans formation
            self.stdout.write(
                self.style.WARNING(
                    "\n[APPLY] Nettoyage des doublons SANS formation (candidat, partenaire, formation=NULL)…"
                )
            )
            for key, instances in doublons_sans.items():
                kept = self._choose_to_keep(instances)
                to_delete = [i for i in instances if i.id != kept.id]
                if not to_delete:
                    continue

                expected_appairages = len(to_delete)

                for obj in to_delete:
                    obj.delete()

                total_deleted_appairages += expected_appairages

                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [SANS_FORMATION clé={key}] conservé id={kept.id}, "
                        f"Appairage supprimés={expected_appairages} "
                        f"(ids Appairage supprimés={[o.id for o in to_delete]})"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                "\n[APPLY] Nettoyage terminé (transaction globale commitée). "
                f"Total Appairage explicitement supprimés : {total_deleted_appairages}."
            )
        )

