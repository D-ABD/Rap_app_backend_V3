- 📂 Documentation & Socle
Finalisation du README.md : Rédiger la documentation technique et fonctionnelle complète du projet (installation, architecture des services, contrats d'API, et procédures de déploiement).

- Stratégie "Dual-Front" : Développer une interface Web native Django (Vues, Forms, Templates) en utilisant les Viewsets et Serializers existants comme contrôleurs de données, sans modifier la logique API, afin de supporter parallèlement le futur front-end React.

- 👤 Gestion des Candidats & Comptes
Cycle de vie "Candidat vers Stagiaire" : Implémenter un workflow (bouton/action) permettant de transformer administrativement un Candidat en Stagiaire après validation.

- Provisioning de comptes à la demande : Supprimer la création automatique de comptes utilisateurs. Ajouter une action manuelle "Créer un compte" pour ne générer des accès que pour les candidats qui en ont réellement besoin.

- 📈 Métier : Formations & Prospections
Compteurs dynamiques de formation : Automatiser la mise à jour du nombre de candidats par session.

- Segmentation des effectifs : Introduire une distinction stricte des statuts au sein des formations (ex: Candidat postulant, Inscrit validé, En cours de formation).


- 🛠️ Optimisations Admin & Outils
Actions groupées (Bulk Actions) : Permettre la sélection multiple de candidats pour les affecter en lot aux Ateliers TRE. idem pour les formations

- Module de Reporting : Développer un système de génération et d'impression de rapports d'activité/suivi.

- Qualité des données : Intégrer un correcteur/formateur de texte automatique en français pour normaliser les saisies et éviter les erreurs de frappe.

- ⚖️ Conformité & Sécurité (RGPD)
Renforcement RGPD : Auditer et sécuriser le flux de création de données personnelles, particulièrement lorsque les fiches candidats sont créées manuellement par un administrateur (consentement, notification, limitation des données).
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
Intégration d’une IA très légère, locale et strictement limitée aux données de l’application
Objectif

