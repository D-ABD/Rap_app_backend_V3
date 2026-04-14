"""
Management command d'audit données Lot 8 — LECTURE SEULE.

Exécute les requêtes Q1–Q7 documentées dans docs/LOT8_AUDIT_CONSOLIDE_FINAL.md
et produit un rapport structuré pour décision GO/NO-GO.

Usage :
    python manage.py lot8_audit_data
    python manage.py lot8_audit_data --format=json
    python manage.py lot8_audit_data --format=csv
    python manage.py lot8_audit_data --limit=50
"""

from __future__ import annotations

import csv
import io
import json
import sys
from dataclasses import dataclass, field

from django.core.management.base import BaseCommand
from django.db.models import Count, F, Q

from rap_app.models.candidat import Candidat
from rap_app.models.formations import Formation, HistoriqueFormation


@dataclass
class AuditResult:
    total_formations: int = 0
    formations_with_inscrits: int = 0
    q1_perfect_correlation: int = 0
    q1_perfect_nonzero: int = 0
    q2_excess: int = 0
    q3_deficit: int = 0
    q4_saisie_only: int = 0
    q5_divergent_nombre_candidats: int = 0
    q6_gespers_only_candidats: int = 0
    q6_formations_impacted: int = 0
    q7_historique_entries: int = 0
    details: dict = field(default_factory=dict)


class Command(BaseCommand):
    help = "Lot 8 — Audit données formations/inscrits/GESPERS (lecture seule)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--format",
            choices=["text", "json", "csv"],
            default="text",
            help="Format de sortie (default: text)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=25,
            help="Nombre max de lignes de détail par question (default: 25)",
        )

    def handle(self, *args, **options):
        fmt = options["format"]
        limit = options["limit"]

        result = AuditResult()

        qs = Formation._base_manager.annotate(
            gespers_crif=Count(
                "candidats",
                filter=Q(candidats__inscrit_gespers=True, type_offre__nom="CRIF"),
            ),
            gespers_mp=Count(
                "candidats",
                filter=Q(candidats__inscrit_gespers=True) & ~Q(type_offre__nom="CRIF"),
            ),
            total_saisie=F("inscrits_crif") + F("inscrits_mp"),
            total_gespers=Count("candidats", filter=Q(candidats__inscrit_gespers=True)),
        )

        result.total_formations = Formation._base_manager.count()
        result.formations_with_inscrits = qs.filter(total_saisie__gt=0).count()

        # Q1 — Corrélation parfaite
        perfect = qs.filter(inscrits_crif=F("gespers_crif"), inscrits_mp=F("gespers_mp"))
        result.q1_perfect_correlation = perfect.count()
        perfect_nonzero = perfect.filter(total_saisie__gt=0)
        result.q1_perfect_nonzero = perfect_nonzero.count()
        result.details["q1"] = list(
            perfect_nonzero.values("pk", "nom", "inscrits_crif", "gespers_crif", "inscrits_mp", "gespers_mp")[:limit]
        )

        # Q2 — Excédent saisie > GESPERS
        excess = qs.filter(total_saisie__gt=F("total_gespers")).exclude(total_saisie=0)
        result.q2_excess = excess.count()
        result.details["q2"] = list(excess.values("pk", "nom", "total_saisie", "total_gespers")[:limit])

        # Q3 — Déficit saisie < GESPERS
        deficit = qs.filter(total_saisie__lt=F("total_gespers"))
        result.q3_deficit = deficit.count()
        result.details["q3"] = list(deficit.values("pk", "nom", "total_saisie", "total_gespers")[:limit])

        # Q4 — Saisie > 0, 0 GESPERS
        saisie_only = qs.filter(total_saisie__gt=0, total_gespers=0)
        result.q4_saisie_only = saisie_only.count()
        result.details["q4"] = list(saisie_only.values("pk", "nom", "total_saisie")[:limit])

        # Q5 — nombre_candidats vs Count réel
        divergent = Formation._base_manager.annotate(real_count=Count("candidats")).exclude(
            nombre_candidats=F("real_count")
        )
        result.q5_divergent_nombre_candidats = divergent.count()
        result.details["q5"] = list(divergent.values("pk", "nom", "nombre_candidats", "real_count")[:limit])

        # Q6 — Candidats comptés UNIQUEMENT par inscrit_gespers (CLÉ DE DÉCISION)
        gespers_only = Candidat.objects.filter(
            inscrit_gespers=True,
            formation__isnull=False,
            date_validation_inscription__isnull=True,
            date_entree_formation_effective__isnull=True,
        ).exclude(
            parcours_phase__in=[
                Candidat.ParcoursPhase.INSCRIT_VALIDE,
                Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                Candidat.ParcoursPhase.SORTI,
            ]
        )
        result.q6_gespers_only_candidats = gespers_only.count()
        formation_ids = set(gespers_only.values_list("formation_id", flat=True))
        result.q6_formations_impacted = len(formation_ids)
        result.details["q6_candidats"] = list(
            gespers_only.values("pk", "formation_id", "parcours_phase")[:limit]
        )
        q6_impact = []
        for fid in sorted(formation_ids)[:limit]:
            n = gespers_only.filter(formation_id=fid).count()
            fm = Formation._base_manager.filter(pk=fid).values("nom", "inscrits_crif", "inscrits_mp").first()
            if fm:
                q6_impact.append({"formation_id": fid, "nom": fm["nom"], "delta": -n})
        result.details["q6_impact"] = q6_impact

        # Q7 — Historique
        auto = HistoriqueFormation.objects.filter(
            champ_modifie__in=["inscrits_crif", "inscrits_mp"],
        ).order_by("-created_at")[:limit]
        result.q7_historique_entries = auto.count()
        result.details["q7"] = list(
            auto.values("formation_id", "champ_modifie", "ancienne_valeur", "nouvelle_valeur", "commentaire")
        )

        if fmt == "json":
            self._output_json(result)
        elif fmt == "csv":
            self._output_csv(result)
        else:
            self._output_text(result, limit)

    def _output_text(self, r: AuditResult, limit: int):
        sep = "=" * 70
        out = self.stdout.write

        out(sep)
        out("LOT 8 — AUDIT DONNÉES FORMATIONS / INSCRITS / GESPERS")
        out(sep)

        out(f"\n--- Q1 : Corrélation parfaite saisie == GESPERS ---")
        out(f"Total (y compris 0/0) : {r.q1_perfect_correlation}")
        out(f"Avec inscrits > 0     : {r.q1_perfect_nonzero}")
        for row in r.details.get("q1", []):
            out(
                f"  #{row['pk']:>5} {row['nom'][:50]:50s} "
                f"crif_s={row['inscrits_crif']} crif_g={row['gespers_crif']} "
                f"mp_s={row['inscrits_mp']} mp_g={row['gespers_mp']}"
            )

        out(f"\n--- Q2 : Saisie > GESPERS (excédent saisie) ---")
        out(f"Formations : {r.q2_excess}")
        for row in r.details.get("q2", []):
            ecart = row["total_saisie"] - row["total_gespers"]
            out(f"  #{row['pk']:>5} {row['nom'][:50]:50s} saisie={row['total_saisie']} gespers={row['total_gespers']} ecart=+{ecart}")

        out(f"\n--- Q3 : Saisie < GESPERS (déficit saisie) ---")
        out(f"Formations : {r.q3_deficit}")
        for row in r.details.get("q3", []):
            ecart = row["total_saisie"] - row["total_gespers"]
            out(f"  #{row['pk']:>5} {row['nom'][:50]:50s} saisie={row['total_saisie']} gespers={row['total_gespers']} ecart={ecart}")

        out(f"\n--- Q4 : Saisie > 0 mais 0 candidats GESPERS ---")
        out(f"Formations : {r.q4_saisie_only}")
        for row in r.details.get("q4", []):
            out(f"  #{row['pk']:>5} {row['nom'][:50]:50s} saisie={row['total_saisie']}")

        out(f"\n--- Q5 : nombre_candidats divergent du Count réel ---")
        out(f"Formations divergentes : {r.q5_divergent_nombre_candidats}")
        for row in r.details.get("q5", []):
            out(f"  #{row['pk']:>5} {row['nom'][:50]:50s} stocké={row['nombre_candidats']} réel={row['real_count']}")

        out(f"\n--- Q6 : Candidats comptés UNIQUEMENT par inscrit_gespers (CLÉ) ---")
        out(f"Candidats dans ce cas : {r.q6_gespers_only_candidats}")
        out(f"Formations impactées  : {r.q6_formations_impacted}")
        for row in r.details.get("q6_candidats", []):
            out(f"  Candidat #{row['pk']:>5} — Formation #{row['formation_id']} — phase={row['parcours_phase']}")
        if r.details.get("q6_impact"):
            out(f"\n  Impact par formation si Option B :")
            for row in r.details["q6_impact"]:
                out(f"    #{row['formation_id']:>5} {row['nom'][:45]:45s} — compteur baisserait de {row['delta']}")

        out(f"\n--- Q7 : Historique modifications inscrits (dernières {limit}) ---")
        out(f"Entrées trouvées : {r.q7_historique_entries}")
        for row in r.details.get("q7", []):
            comment = (row.get("commentaire") or "-")[:60]
            out(
                f"  #{row['formation_id']:>5} — {row['champ_modifie']}: "
                f"{row['ancienne_valeur']} → {row['nouvelle_valeur']} — {comment}"
            )

        out(f"\n{sep}")
        out("RÉSUMÉ")
        out(sep)
        out(f"Formations totales                         : {r.total_formations}")
        out(f"Formations avec inscrits > 0               : {r.formations_with_inscrits}")
        out(f"Corrélation parfaite saisie==GESPERS (>0)  : {r.q1_perfect_nonzero}")
        out(f"Excédent saisie > GESPERS                  : {r.q2_excess}")
        out(f"Déficit saisie < GESPERS                   : {r.q3_deficit}")
        out(f"Saisie pure (0 GESPERS)                    : {r.q4_saisie_only}")
        out(f"nombre_candidats divergent                 : {r.q5_divergent_nombre_candidats}")
        out(f"Candidats comptés UNIQUEMENT par GESPERS   : {r.q6_gespers_only_candidats}")
        out(f"Formations impactées par Option B          : {r.q6_formations_impacted}")
        out(sep)

        if r.q6_gespers_only_candidats == 0:
            out("\n>>> INTERPRÉTATION : Q6=0 → Option B safe immédiatement.")
            out(">>> Le retrait de inscrit_gespers du critère ne change aucun compteur.")
        elif r.q6_gespers_only_candidats <= 20:
            out(f"\n>>> INTERPRÉTATION : Q6={r.q6_gespers_only_candidats} → Option B safe avec recalcul ciblé.")
            out(f">>> {r.q6_formations_impacted} formation(s) nécessitent un recalcul ponctuel.")
        else:
            out(f"\n>>> INTERPRÉTATION : Q6={r.q6_gespers_only_candidats} → Option B avec migration complète.")
            out(f">>> Script de recalcul global requis pour {r.q6_formations_impacted} formations.")

        out(f"\n{sep}")
        out("FIN AUDIT — Transmettre ce résumé pour décision GO/NO-GO")

    def _output_json(self, r: AuditResult):
        data = {
            "lot": 8,
            "type": "audit_donnees",
            "summary": {
                "total_formations": r.total_formations,
                "formations_with_inscrits": r.formations_with_inscrits,
                "q1_perfect_correlation_total": r.q1_perfect_correlation,
                "q1_perfect_nonzero": r.q1_perfect_nonzero,
                "q2_excess": r.q2_excess,
                "q3_deficit": r.q3_deficit,
                "q4_saisie_only": r.q4_saisie_only,
                "q5_divergent_nombre_candidats": r.q5_divergent_nombre_candidats,
                "q6_gespers_only_candidats": r.q6_gespers_only_candidats,
                "q6_formations_impacted": r.q6_formations_impacted,
                "q7_historique_entries": r.q7_historique_entries,
            },
            "details": r.details,
        }
        self.stdout.write(json.dumps(data, ensure_ascii=False, indent=2, default=str))

    def _output_csv(self, r: AuditResult):
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["question", "metric", "value"])
        writer.writerow(["global", "total_formations", r.total_formations])
        writer.writerow(["global", "formations_with_inscrits", r.formations_with_inscrits])
        writer.writerow(["Q1", "perfect_correlation_total", r.q1_perfect_correlation])
        writer.writerow(["Q1", "perfect_nonzero", r.q1_perfect_nonzero])
        writer.writerow(["Q2", "excess_saisie_gt_gespers", r.q2_excess])
        writer.writerow(["Q3", "deficit_saisie_lt_gespers", r.q3_deficit])
        writer.writerow(["Q4", "saisie_only_no_gespers", r.q4_saisie_only])
        writer.writerow(["Q5", "divergent_nombre_candidats", r.q5_divergent_nombre_candidats])
        writer.writerow(["Q6", "gespers_only_candidats", r.q6_gespers_only_candidats])
        writer.writerow(["Q6", "formations_impacted", r.q6_formations_impacted])
        writer.writerow(["Q7", "historique_entries", r.q7_historique_entries])

        if r.details.get("q6_impact"):
            writer.writerow([])
            writer.writerow(["Q6_detail", "formation_id", "nom", "delta"])
            for row in r.details["q6_impact"]:
                writer.writerow(["Q6_detail", row["formation_id"], row["nom"], row["delta"]])

        self.stdout.write(buf.getvalue())
