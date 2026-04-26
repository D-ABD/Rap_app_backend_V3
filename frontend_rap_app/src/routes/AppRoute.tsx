import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";

import { RgpdGateBridge } from "../components/RgpdGateBridge";
import MainLayout from "../layout/MainLayout";
import MainLayoutCandidat from "../layout/MainLayoutCandidat";
import MainLayoutDeclic from "src/layout/MainLayoutDeclic";
import MainLayoutPrepa from "src/layout/MainLayoutPrepa";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import HomePage from "../pages/HomePage";
import DashboardPage from "../pages/DashboardPage";
import DashboardCandidatPage from "../pages/DashboardCandidatPage";
import NotFoundPage from "../pages/NotFoundPage";

import AppairagesPage from "../pages/appairage/AppairagesPage";
import AppairagesCreatePage from "../pages/appairage/AppairagesCreatePage";
import AppairagesEditPage from "../pages/appairage/AppairagesEditPage";
import AppairageCommentPage from "../pages/appairage/appairage_comments/AppairageCommentPage";
import AppairageCommentCreatePage from "../pages/appairage/appairage_comments/AppairageCommentCreate";
import AppairageCommentEditPage from "../pages/appairage/appairage_comments/AppairageCommentEdit";
import AppairageDetailPage from "../pages/appairage/appairage_comments/AppairageDetailPage";

import CandidatsPage from "../pages/candidats/candidatsPage";
import CandidatCreatePage from "../pages/candidats/candidatsCreatePage";
import CandidatEditPage from "../pages/candidats/candidatsEditPage";

import AteliersTrePage from "../pages/ateliers/AteliersTrePage";
import AteliersTRECreatePage from "../pages/ateliers/AteliersTRECreatePage";
import AtelierTREEditPage from "../pages/ateliers/AtelierTreEditPage";

import CentresPage from "../pages/centres/CentresPage";
import CentresCreatePage from "../pages/centres/CreateCentre";
import CentresEditPage from "../pages/centres/EditCentre";

import StatutsPage from "../pages/statuts/StatutsPage";
import StatutsCreatePage from "../pages/statuts/StatutsCreatePage";
import StatutsEditPage from "../pages/statuts/StatutsEditPage";

import TypeOffresPage from "../pages/typeOffres/TypeOffresPage";
import TypeOffresCreatePage from "../pages/typeOffres/TypeOffresCreatePage";
import TypeOffresEditPage from "../pages/typeOffres/TypeOffresEditPage";

import UsersPage from "../pages/users/UsersPage";
import UsersCreatePage from "../pages/users/UsersCreatePage";
import UsersEditPage from "../pages/users/UsersEditPage";
import MonProfil from "../pages/users/MonProfil";

import CommentairesPage from "../pages/commentaires/CommentairesPage";
import CommentairesCreatePage from "../pages/commentaires/CommentairesCreatePage";
import CommentairesCreateFromFormationPage from "../pages/commentaires/CommentairesCreateFromFormationPage";
import CommentairesEditPage from "../pages/commentaires/CommentairesEditPage";
import PlansActionFormationPage from "../pages/plansActionFormation/PlansActionFormationPage";
import PlanActionFormationCreatePage from "../pages/plansActionFormation/PlanActionFormationCreatePage";
import PlanActionFormationEditPage from "../pages/plansActionFormation/PlanActionFormationEditPage";
import CerfaPage from "../pages/cerfa/CerfaPage";
import CerfaEditPage from "../pages/cerfa/CerfaEditPage";

import FormationsPage from "../pages/formations/FormationsPage";
import FormationsCreatePage from "../pages/formations/FormationsCreatePage";
import FormationsEditPage from "../pages/formations/FormationsEditPage";
import FormationDetailPage from "../pages/formations/FormationDetailPage";
import FormationsCommentairesPage from "../pages/formations/componentsFormations/FormationsCommentairesPage";

import PartenairesPage from "../pages/partenaires/PartenairesPage";
import PartenairesCreatePage from "../pages/partenaires/PartenairesCreatePage";
import PartenairesEditPage from "../pages/partenaires/PartenairesEditPage";
import PartenairesCandidatPage from "../pages/partenaires/PartenairesCandidatPage";
import PartenairesCandidatCreatePage from "../pages/partenaires/PartenairesCandidatCreatePage";
import PartenairesCandidatEditPage from "../pages/partenaires/PartenairesCandidatEditPage";

import ProspectionPage from "../pages/prospection/ProspectionPage";
import ProspectionCreatePage from "../pages/prospection/ProspectionCreatePage";
import ProspectionEditPage from "../pages/prospection/ProspectionEditPage";
import ProspectionPageCandidat from "../pages/prospection/ProspectionPageCandidat";
import ProspectionCreatePageCandidat from "../pages/prospection/ProspectionCreatePageCandidat";
import ProspectionEditCandidatPage from "../pages/prospection/ProspectionEditCandidatPage";
import ProspectionCommentPage from "../pages/prospection/prospectioncomments/ProspectionCommentPage";
import ProspectionCommentCreatePage from "../pages/prospection/prospectioncomments/ProspectionCommentCreate";
import ProspectionCommentEditPage from "../pages/prospection/prospectioncomments/ProspectionCommentEdit";

import DocumentsPage from "src/pages/Documents/DocumentsPage";
import DocumentsCreatePage from "src/pages/Documents/DocumentsCreatePage";
import DocumentsEditPage from "src/pages/Documents/DocumentsEditPage";
import LogsPage from "src/pages/logs/LogsPage";
import ImportExportJobsPage from "src/pages/importExport/ImportExportJobsPage";
import EvenementsPage from "../pages/evenements/EvenementsPage";
import EvenementsCreatePage from "../pages/evenements/EvenementsCreatePage";
import EvenementsEditPage from "../pages/evenements/EvenementsEditPage";
import RapportsCreatePage from "src/pages/rapports/RapportsCreatePage";
import RapportsEditPage from "src/pages/rapports/RapportsEditPage";
import RapportsPage from "src/pages/rapports/RapportsPage";

import DeclicPages from "src/pages/declic/DeclicPages";
import DeclicCreatePage from "src/pages/declic/DeclicCreatePage";
import DeclicEditPage from "src/pages/declic/DeclicEditPage";
import ParticipantsDeclicPage from "src/pages/declic/ParticipantsDeclicPage";
import ParticipantsDeclicCreatePage from "src/pages/declic/ParticipantsDeclicCreatePage";
import ParticipantsDeclicEditPage from "src/pages/declic/ParticipantsDeclicEditPage";
import ObjectifDeclicPage from "src/pages/declic/ObjectifDeclicPage";
import ObjectifDeclicEditPage from "src/pages/declic/ObjectifDeclicEditPage";

import PolitiqueConfidentialite from "../pages/PolitiqueConfidentialite";
import About from "../pages/About";
import ParametresPage from "../pages/parametres/ParametresPage";
import ForbiddenPage from "../pages/ForbiddenPage";
import { useAuth } from "../hooks/useAuth";
import DashboardDeclicStaffPage from "src/pages/DashboardDeclicPage";
import PrepaCreatePage from "src/pages/prepa/PrepaCreatePage";
import PrepaEditPage from "src/pages/prepa/PrepaEditPage";
import ObjectifPrepaPage from "src/pages/prepa/ObjectifPrepaPage";
import ObjectifPrepaEditPage from "src/pages/prepa/ObjectifPrepaEditPage";
import DashboardPrepaStaffPage from "src/pages/DashboardPrepaPage";
import PrepaPagesAteliers from "src/pages/prepa/PrepaPagesAteliers";
import PrepaPagesIC from "src/pages/prepa/PrepaPagesIC";
import PrepaPages from "src/pages/prepa/PrepaPages";
import PrepaCreatePageIC from "src/pages/prepa/PrepaCreatePageIC";
import PrepaCreatePageAteliers from "src/pages/prepa/PrepaCreatePageAteliers";
import PrepaEditPageIC from "src/pages/prepa/PrepaEditPageIC";
import PrepaEditPageAteliers from "src/pages/prepa/PrepaEditPageAteliers";
import StagiairesPrepaPage from "src/pages/prepa/StagiairesPrepaPage";
import StagiairesPrepaCreatePage from "src/pages/prepa/StagiairesPrepaCreatePage";
import StagiairesPrepaEditPage from "src/pages/prepa/StagiairesPrepaEditPage";
import CVThequeCreatePage from "src/pages/cvtheque/cvthequeCreate";
import CVThequeEditPage from "src/pages/cvtheque/cvthequeEditPage";
import CVThequePage from "src/pages/cvtheque/cvthequePage";
import CVThequeCandidatPage from "src/pages/cvtheque/cvthequeCandidatPage";
import CVThequeCandidatEditPage from "src/pages/cvtheque/cvthequeCandidatEditPage";
import CVThequeCandidatCreatePage from "src/pages/cvtheque/cvthequeCandidatCreate";
import {
  canAccessDeclicRole,
  canAccessPrepaRole,
  canWriteDeclicRole,
  canWriteFormationsRole,
  canWritePrepaRole,
  isAdminLikeRole,
  isCandidateLikeRole,
  isCoreStaffRole,
  isCoreWriteRole,
  normalizeRole,
} from "../utils/roleGroups";

/* ------------------------------------------------------- */
/* ✅ ROUTES PRINCIPALES AVEC REDIRECTION AUTOMATIQUE ROLE */
/* ------------------------------------------------------- */

export default function AppRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🔁 Redirection automatique APRÈS CONNEXION uniquement
  useEffect(() => {
    if (!user) return;

    // ❗ Ne redirige PAS si on refresh une page qui n’est pas /login
    if (location.pathname !== "/login") return;

    const role = normalizeRole(user.role);

    if (role === "declic_staff") navigate("/dashboard/declic", { replace: true });
    else if (role === "prepa_staff") navigate("/dashboard/prepa", { replace: true });
    else if (isCoreStaffRole(role))
      navigate("/dashboard", { replace: true });
    else if (isCandidateLikeRole(role))
      navigate("/dashboard/candidat", { replace: true });
  }, [user, navigate, location.pathname]);

  /* ---------- SecureRoute ---------- */
  type AdminOnlyRouteProps = { children: ReactNode };
  type AdminRouteProps = { children: ReactNode };
  type SecureRouteProps = { children: ReactNode };
  type CerfaRouteProps = { children: ReactNode };

  function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
    const { user } = useAuth();
    const isAdminOnly = !!user && (user.is_superuser === true || isAdminLikeRole(user.role));
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdminOnly) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function AdminRoute({ children }: AdminRouteProps) {
    const { user } = useAuth();
    const isAdmin = !!user && (user.is_superuser === true || isAdminLikeRole(user.role));
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function CoreStaffRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = isCoreStaffRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function CoreWriteRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = isCoreWriteRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function FormationWriteRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = canWriteFormationsRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function DeclicRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = !!user && (user.is_superuser === true || canAccessDeclicRole(user.role));
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function DeclicWriteRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = !!user && (user.is_superuser === true || canWriteDeclicRole(user.role));
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function SecureRoute({ children }: SecureRouteProps) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
  }

  function CandidateLikeRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = isCandidateLikeRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function ProspectionCommentRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = isCoreStaffRole(user?.role) || isCandidateLikeRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function ProspectionCommentWriteRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = isCoreWriteRole(user?.role) || isCandidateLikeRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function CerfaRoute({ children }: CerfaRouteProps) {
    const { user } = useAuth();
    const allowed = isCoreStaffRole(user?.role);
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  const secure = (el: ReactNode) => <SecureRoute>{el}</SecureRoute>;
  const cerfaSecure = (el: ReactNode) => <CerfaRoute>{el}</CerfaRoute>;

  /* ---------- Helper : choisir le layout selon le rôle ---------- */
  const getLayoutForUser = (user?: any) => {
    const role = normalizeRole(user?.role);

    if (isCoreStaffRole(role))
      return <MainLayout />;
    if (role === "declic_staff") return <MainLayoutDeclic />;
    if (role === "prepa_staff") return <MainLayoutPrepa />;
    return <MainLayoutCandidat />;
  };

  function PrepaRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = !!user && (user.is_superuser === true || canAccessPrepaRole(user.role));
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function PrepaWriteRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed = !!user && (user.is_superuser === true || canWritePrepaRole(user.role));
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  return (
    <>
      <RgpdGateBridge />
      <Routes>
      {/* 🔓 Routes publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="/about" element={<About />} />

      {/* 🔐 Routes protégées */}
      <Route element={getLayoutForUser(user)}>
        <Route index element={<HomePage />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={secure(
            isCoreStaffRole(user?.role) ? (
              <DashboardPage />
            ) : (
              <DashboardCandidatPage />
            )
          )}
        />
        {/* Dashboard candidat explicite */}
        <Route path="/dashboard/candidat" element={<CandidateLikeRoute><DashboardCandidatPage /></CandidateLikeRoute>} />

        {/* Profil */}
        <Route path="/mon-profil" element={secure(<MonProfil />)} />

        {/* Paramètres */}
        <Route
          path="/parametres"
          element={
            <AdminOnlyRoute>
              <ParametresPage />
            </AdminOnlyRoute>
          }
        />

        {/* Centres */}
        <Route
          path="/centres"
          element={
            <AdminRoute>
              <CentresPage />
            </AdminRoute>
          }
        />
        <Route
          path="/centres/create"
          element={
            <AdminRoute>
              <CentresCreatePage />
            </AdminRoute>
          }
        />
        <Route
          path="/centres/:id/edit"
          element={
            <AdminRoute>
              <CentresEditPage />
            </AdminRoute>
          }
        />

        {/* Statuts */}
        <Route
          path="/statuts"
          element={
            <AdminRoute>
              <StatutsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/statuts/create"
          element={
            <AdminRoute>
              <StatutsCreatePage />
            </AdminRoute>
          }
        />
        <Route
          path="/statuts/:id/edit"
          element={
            <AdminRoute>
              <StatutsEditPage />
            </AdminRoute>
          }
        />

        {/* TypeOffres */}
        <Route
          path="/typeoffres"
          element={
            <AdminRoute>
              <TypeOffresPage />
            </AdminRoute>
          }
        />
        <Route
          path="/typeoffres/create"
          element={
            <AdminRoute>
              <TypeOffresCreatePage />
            </AdminRoute>
          }
        />
        <Route
          path="/typeoffres/:id/edit"
          element={
            <AdminRoute>
              <TypeOffresEditPage />
            </AdminRoute>
          }
        />

        {/* Appairages */}
        <Route path="/appairages" element={<CoreStaffRoute><AppairagesPage /></CoreStaffRoute>} />
        <Route path="/appairages/create" element={<CoreWriteRoute><AppairagesCreatePage /></CoreWriteRoute>} />
        <Route path="/appairages/:id/edit" element={<CoreWriteRoute><AppairagesEditPage /></CoreWriteRoute>} />
        <Route path="/appairages/:id" element={<CoreStaffRoute><AppairageDetailPage /></CoreStaffRoute>} />
        <Route path="/appairage-commentaires" element={<CoreStaffRoute><AppairageCommentPage /></CoreStaffRoute>} />
        <Route
          path="/appairage-commentaires/create"
          element={<CoreWriteRoute><AppairageCommentCreatePage /></CoreWriteRoute>}
        />
        <Route
          path="/appairage-commentaires/:id/edit"
          element={<CoreWriteRoute><AppairageCommentEditPage /></CoreWriteRoute>}
        />
        <Route
          path="/appairage-commentaires/create/:appairageId"
          element={<CoreWriteRoute><AppairageCommentCreatePage /></CoreWriteRoute>}
        />

        {/* Ateliers TRE */}
        <Route path="/ateliers-tre" element={<CoreStaffRoute><AteliersTrePage /></CoreStaffRoute>} />
        <Route path="/ateliers-tre/create" element={<CoreWriteRoute><AteliersTRECreatePage /></CoreWriteRoute>} />
        <Route path="/ateliers-tre/:id/edit" element={<CoreWriteRoute><AtelierTREEditPage /></CoreWriteRoute>} />

        {/* Candidats */}
        <Route path="/candidats" element={<CoreStaffRoute><CandidatsPage /></CoreStaffRoute>} />
        <Route path="/candidats/create" element={<CoreWriteRoute><CandidatCreatePage /></CoreWriteRoute>} />
        <Route path="/candidats/:id/edit" element={<CoreWriteRoute><CandidatEditPage /></CoreWriteRoute>} />

        {/* Partenaires */}
        <Route path="/partenaires" element={<CoreStaffRoute><PartenairesPage /></CoreStaffRoute>} />
        <Route path="/partenaires/create" element={<CoreWriteRoute><PartenairesCreatePage /></CoreWriteRoute>} />
        <Route path="/partenaires/:id/edit" element={<CoreWriteRoute><PartenairesEditPage /></CoreWriteRoute>} />
        <Route path="/partenaires/candidat" element={<CandidateLikeRoute><PartenairesCandidatPage /></CandidateLikeRoute>} />
        <Route
          path="/partenaires/create/candidat"
          element={<CandidateLikeRoute><PartenairesCandidatCreatePage /></CandidateLikeRoute>}
        />
        <Route
          path="/partenaires/:id/edit/candidat"
          element={<CandidateLikeRoute><PartenairesCandidatEditPage /></CandidateLikeRoute>}
        />

        {/* Prospection */}
        <Route path="/prospections" element={<CoreStaffRoute><ProspectionPage /></CoreStaffRoute>} />
        <Route path="/prospections/create" element={<CoreWriteRoute><ProspectionCreatePage /></CoreWriteRoute>} />
        <Route path="/prospections/:id/edit" element={<CoreWriteRoute><ProspectionEditPage /></CoreWriteRoute>} />
        <Route path="/prospections/candidat" element={<CandidateLikeRoute><ProspectionPageCandidat /></CandidateLikeRoute>} />
        <Route path="/prospections/create/candidat" element={<CandidateLikeRoute><ProspectionCreatePageCandidat /></CandidateLikeRoute>} />
        <Route path="/prospections/:id/edit/candidat" element={<CandidateLikeRoute><ProspectionEditCandidatPage /></CandidateLikeRoute>} />
        <Route path="/prospection-commentaires" element={<ProspectionCommentRoute><ProspectionCommentPage /></ProspectionCommentRoute>} />
        <Route
          path="/prospection-commentaires/create"
          element={<ProspectionCommentWriteRoute><ProspectionCommentCreatePage /></ProspectionCommentWriteRoute>}
        />
        <Route
          path="/prospection-commentaires/:id/edit"
          element={<ProspectionCommentWriteRoute><ProspectionCommentEditPage /></ProspectionCommentWriteRoute>}
        />
        <Route
          path="/prospection-commentaires/create/:prospectionId"
          element={<ProspectionCommentWriteRoute><ProspectionCommentCreatePage /></ProspectionCommentWriteRoute>}
        />

        {/* Commentaires */}
        <Route path="/commentaires" element={<CoreStaffRoute><CommentairesPage /></CoreStaffRoute>} />
        <Route path="/commentaires/create" element={<CoreWriteRoute><CommentairesCreatePage /></CoreWriteRoute>} />
        <Route
          path="/commentaires/create/:formationId"
          element={<CoreWriteRoute><CommentairesCreateFromFormationPage /></CoreWriteRoute>}
        />
        <Route path="/commentaires/:id/edit" element={<CoreWriteRoute><CommentairesEditPage /></CoreWriteRoute>} />

        {/* Plans d'action formation (module isolé) */}
        <Route path="/plans-action-formations" element={<CoreStaffRoute><PlansActionFormationPage /></CoreStaffRoute>} />
        <Route
          path="/plans-action-formations/create"
          element={
            <CoreWriteRoute>
              <PlanActionFormationCreatePage />
            </CoreWriteRoute>
          }
        />
        <Route
          path="/plans-action-formations/:id/edit"
          element={
            <CoreWriteRoute>
              <PlanActionFormationEditPage />
            </CoreWriteRoute>
          }
        />

        {/* CERFA */}
        <Route path="/cerfa" element={cerfaSecure(<CerfaPage />)} />
        <Route
          path="/cerfa/:id/edit"
          element={
            <CoreWriteRoute>
              <CerfaEditPage />
            </CoreWriteRoute>
          }
        />

        {/* Formations */}
        <Route path="/formations" element={<CoreStaffRoute><FormationsPage /></CoreStaffRoute>} />
        <Route path="/formations/create" element={<FormationWriteRoute><FormationsCreatePage /></FormationWriteRoute>} />
        <Route path="/formations/:id/edit" element={<FormationWriteRoute><FormationsEditPage /></FormationWriteRoute>} />
        <Route path="/formations/:id" element={<CoreStaffRoute><FormationDetailPage /></CoreStaffRoute>} />
        <Route path="/evenements" element={<CoreStaffRoute><EvenementsPage /></CoreStaffRoute>} />
        <Route path="/evenements/create" element={<CoreWriteRoute><EvenementsCreatePage /></CoreWriteRoute>} />
        <Route path="/evenements/:id/edit" element={<CoreWriteRoute><EvenementsEditPage /></CoreWriteRoute>} />
        <Route
          path="/formations/:formationId/commentaires"
          element={<CoreStaffRoute><FormationsCommentairesPage /></CoreStaffRoute>}
        />

        {/* Documents */}
        <Route path="/documents" element={<CoreStaffRoute><DocumentsPage /></CoreStaffRoute>} />
        <Route path="/documents/create" element={<CoreWriteRoute><DocumentsCreatePage /></CoreWriteRoute>} />
        <Route path="/documents/edit/:id" element={<CoreWriteRoute><DocumentsEditPage /></CoreWriteRoute>} />

        {/* Rapports */}
        <Route
          path="/rapports"
          element={
            <AdminRoute>
              <RapportsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/rapports/create"
          element={
            <AdminRoute>
              <RapportsCreatePage />
            </AdminRoute>
          }
        />
        <Route
          path="/rapports/:id/edit"
          element={
            <AdminRoute>
              <RapportsEditPage />
            </AdminRoute>
          }
        />

        {/* Logs */}
        <Route
          path="/logs"
          element={
            <AdminOnlyRoute>
              <LogsPage />
            </AdminOnlyRoute>
          }
        />

        {/* Historique imports Excel (ImportJob) — staff+ */}
        <Route
          path="/import-export/jobs"
          element={
            <CoreStaffRoute>
              <ImportExportJobsPage />
            </CoreStaffRoute>
          }
        />

        {/* Utilisateurs */}
        <Route path="/users" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
        <Route path="/users/create" element={<AdminOnlyRoute><UsersCreatePage /></AdminOnlyRoute>} />
        <Route path="/users/:id/edit" element={<AdminOnlyRoute><UsersEditPage /></AdminOnlyRoute>} />

        {/* Déclic */}
        <Route
          path="/declic"
          element={
            <DeclicRoute>
              <DeclicPages />
            </DeclicRoute>
          }
        />
        <Route
          path="/declic/create"
          element={
            <DeclicWriteRoute>
              <DeclicCreatePage />
            </DeclicWriteRoute>
          }
        />
        <Route
          path="/declic/:id/edit"
          element={
            <DeclicWriteRoute>
              <DeclicEditPage />
            </DeclicWriteRoute>
          }
        />
        <Route
          path="/participants-declic"
          element={
            <DeclicRoute>
              <ParticipantsDeclicPage />
            </DeclicRoute>
          }
        />
        <Route
          path="/participants-declic/create"
          element={
            <DeclicWriteRoute>
              <ParticipantsDeclicCreatePage />
            </DeclicWriteRoute>
          }
        />
        <Route
          path="/participants-declic/:id/edit"
          element={
            <DeclicWriteRoute>
              <ParticipantsDeclicEditPage />
            </DeclicWriteRoute>
          }
        />
        <Route
          path="/declic/objectifs"
          element={
            <DeclicRoute>
              <ObjectifDeclicPage />
            </DeclicRoute>
          }
        />
        <Route
          path="/declic/objectifs/:id/edit"
          element={
            <DeclicWriteRoute>
              <ObjectifDeclicEditPage />
            </DeclicWriteRoute>
          }
        />

        {/* Dashboard Déclic Staff */}
        <Route
          path="/dashboard/declic"
          element={
            <DeclicRoute>
              <DashboardDeclicStaffPage />
            </DeclicRoute>
          }
        />

        {/* Prépa */}
        <Route
          path="/prepa"
          element={
            <PrepaRoute>
              <PrepaPages />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/ic"
          element={
            <PrepaRoute>
              <PrepaPagesIC />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/ateliers"
          element={
            <PrepaRoute>
              <PrepaPagesAteliers />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/stagiaires"
          element={
            <PrepaRoute>
              <StagiairesPrepaPage />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/stagiaires/create"
          element={
            <PrepaWriteRoute>
              <StagiairesPrepaCreatePage />
            </PrepaWriteRoute>
          }
        />
        <Route
          path="/prepa/stagiaires/:id/edit"
          element={
            <PrepaWriteRoute>
              <StagiairesPrepaEditPage />
            </PrepaWriteRoute>
          }
        />

        <Route
          path="/prepa/create"
          element={
            <PrepaWriteRoute>
              <PrepaCreatePage />
            </PrepaWriteRoute>
          }
        />
        <Route
          path="/prepa/create/ic"
          element={
            <PrepaWriteRoute>
              <PrepaCreatePageIC />
            </PrepaWriteRoute>
          }
        />
        <Route
          path="/prepa/create/ateliers"
          element={
            <PrepaWriteRoute>
              <PrepaCreatePageAteliers />
            </PrepaWriteRoute>
          }
        />

        <Route
          path="/prepa/:id/edit"
          element={
            <PrepaWriteRoute>
              <PrepaEditPage />
            </PrepaWriteRoute>
          }
        />
        <Route
          path="/prepa/:id/edit/IC"
          element={
            <PrepaWriteRoute>
              <PrepaEditPageIC />
            </PrepaWriteRoute>
          }
        />
        <Route
          path="/prepa/:id/edit/Ateliers"
          element={
            <PrepaWriteRoute>
              <PrepaEditPageAteliers />
            </PrepaWriteRoute>
          }
        />

        {/* Objectifs Prépa */}
        <Route
          path="/prepa/objectifs"
          element={
            <PrepaRoute>
              <ObjectifPrepaPage />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/objectifs/:id/edit"
          element={
            <PrepaWriteRoute>
              <ObjectifPrepaEditPage />
            </PrepaWriteRoute>
          }
        />

        {/* Dashboard Prépa Staff */}
        <Route
          path="/dashboard/prepa"
          element={
            <PrepaRoute>
              <DashboardPrepaStaffPage />
            </PrepaRoute>
          }
        />

{/* CVTHEQUE */}
<Route
  path="/cvtheque"
  element={<CoreStaffRoute><CVThequePage /></CoreStaffRoute>}
/> 

<Route
  path="/cvtheque/candidat"
  element={<CandidateLikeRoute><CVThequeCandidatPage /></CandidateLikeRoute>}
/> 

<Route
  path="/cvtheque/create"
  element={<CoreWriteRoute><CVThequeCreatePage /></CoreWriteRoute>}
/> 

<Route
  path="/cvtheque/create/candidat"
  element={<CandidateLikeRoute><CVThequeCandidatCreatePage /></CandidateLikeRoute>}
/> 

<Route
  path="/cvtheque/:id/edit"
  element={<CoreWriteRoute><CVThequeEditPage /></CoreWriteRoute>}
/>

<Route
  path="/cvtheque/:id/edit/candidat"
  element={<CandidateLikeRoute><CVThequeCandidatEditPage /></CandidateLikeRoute>}
/>








      </Route>

      {/* 🚫 403 + 404 */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  );
}
