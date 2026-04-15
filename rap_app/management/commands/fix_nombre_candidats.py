"""Recalcule Formation.nombre_candidats à partir du Count réel des candidats liés.

Usage :
    python manage.py fix_nombre_candidats                # dry-run (par défaut)
    python manage.py fix_nombre_candidats --apply        # applique les corrections
    python manage.py fix_nombre_candidats --format json  # sortie JSON
"""

import json
import sys

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.utils.timezone import now

from rap_app.models.candidat import Candidat
from rap_app.models.formations import Formation, HistoriqueFormation


class Command(BaseCommand):
    help = "Recalcule nombre_candidats pour toutes les formations divergentes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Appliquer les corrections (sans ce flag : dry-run).",
        )
        parser.add_argument(
            "--format",
            choices=["text", "json"],
            default="text",
            help="Format de sortie (text ou json).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        fmt = options["format"]

        formations = (
            Formation._base_manager.all()
            .annotate(real_count=Count("candidats"))
            .order_by("pk")
        )

        divergences = []
        for f in formations:
            stored = f.nombre_candidats or 0
            real = f.real_count
            if stored != real:
                divergences.append({
                    "id": f.pk,
                    "nom": str(f),
                    "stored": stored,
                    "real": real,
                    "delta": real - stored,
                })

        if fmt == "json":
            self._output_json(divergences, apply)
        else:
            self._output_text(divergences, apply)

        if apply and divergences:
            self._apply_fixes(divergences)

    def _output_text(self, divergences, apply):
        mode = "APPLY" if apply else "DRY-RUN"
        self.stdout.write(f"\n{'=' * 70}")
        self.stdout.write(f"  FIX nombre_candidats — {mode}")
        self.stdout.write(f"{'=' * 70}\n")

        if not divergences:
            self.stdout.write("Aucune divergence détectée. Rien à corriger.\n")
            return

        self.stdout.write(f"Formations divergentes : {len(divergences)}\n")
        for d in divergences:
            self.stdout.write(
                f"  # {d['id']:>4}  {d['nom'][:50]:<50}  "
                f"stocké={d['stored']}  réel={d['real']}  delta={d['delta']:+d}"
            )

        self.stdout.write(f"\n{'=' * 70}")
        if apply:
            self.stdout.write(f">>> {len(divergences)} formation(s) corrigée(s).")
        else:
            self.stdout.write(f">>> {len(divergences)} formation(s) à corriger. Relancer avec --apply pour appliquer.")
        self.stdout.write(f"{'=' * 70}\n")

    def _output_json(self, divergences, apply):
        output = {
            "mode": "apply" if apply else "dry-run",
            "total_divergences": len(divergences),
            "divergences": divergences,
        }
        self.stdout.write(json.dumps(output, ensure_ascii=False, indent=2))

    def _apply_fixes(self, divergences):
        timestamp = now()
        for d in divergences:
            Formation._base_manager.filter(pk=d["id"]).update(
                nombre_candidats=d["real"],
                updated_at=timestamp,
            )
            HistoriqueFormation.objects.create(
                formation_id=d["id"],
                champ_modifie="nombre_candidats",
                ancienne_valeur=str(d["stored"]),
                nouvelle_valeur=str(d["real"]),
                commentaire="Recalcul via fix_nombre_candidats",
            )
