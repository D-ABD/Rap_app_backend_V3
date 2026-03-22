import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";

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

import DeclicPages from "src/pages/declic/DeclicPages";
import DeclicCreatePage from "src/pages/declic/DeclicCreatePage";
import DeclicEditPage from "src/pages/declic/DeclicEditPage";
import ObjectifDeclicPage from "src/pages/declic/ObjectifDeclicPage";
import ObjectifDeclicEditPage from "src/pages/declic/ObjectifDeclicEditPage";

import PolitiqueConfidentialite from "../pages/PolitiqueConfidentialite";
import About from "../pages/About";
import ParametresPage from "../pages/parametres/ParametresPage";
import ForbiddenPage from "../pages/ForbiddenPage";
import { useAuth } from "../hooks/useAuth";
import DashboardDeclicStaffPage from "src/pages/DashboardDeclicPage";
import { useLocation } from "react-router-dom";
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
import CVThequeCreatePage from "src/pages/cvtheque/cvthequeCreate";
import CVThequeEditPage from "src/pages/cvtheque/cvthequeEditPage";
import CVThequePage from "src/pages/cvtheque/cvthequePage";
import CVThequeCandidatPage from "src/pages/cvtheque/cvthequeCandidatPage";
import CVThequeCandidatEditPage from "src/pages/cvtheque/cvthequeCandidatEditPage";
import CVThequeCandidatCreatePage from "src/pages/cvtheque/cvthequeCandidatCreate";

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

    const role = (user.role ?? "").toLowerCase();

    if (role === "declic_staff") navigate("/dashboard/declic", { replace: true });
    else if (role === "prepa_staff") navigate("/dashboard/prepa", { replace: true });
    else if (["staff", "staff_read", "admin", "superadmin"].includes(role))
      navigate("/dashboard", { replace: true });
    else if (["candidat", "candidate"].includes(role))
      navigate("/dashboard/candidat", { replace: true });
  }, [user, navigate, location.pathname]);

  /* ---------- SecureRoute ---------- */
  type AdminOnlyRouteProps = { children: ReactNode };
  type AdminRouteProps = { children: ReactNode };
  type SecureRouteProps = { children: ReactNode };

  function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
    const { user } = useAuth();
    const isAdminOnly =
      !!user &&
      (user.is_superuser === true ||
        ["admin", "superadmin"].includes((user.role ?? "").toLowerCase()));
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdminOnly) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function AdminRoute({ children }: AdminRouteProps) {
    const { user } = useAuth();
    const isAdmin =
      !!user &&
      (user.is_superuser === true ||
        user.is_staff === true ||
        ["admin", "superadmin", "staff"].includes((user.role ?? "").toLowerCase()));
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function DeclicRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed =
      !!user &&
      (user.is_superuser === true ||
        ["admin", "superadmin", "staff", "declic_staff"].includes((user.role ?? "").toLowerCase()));
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  function SecureRoute({ children }: SecureRouteProps) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
  }

  const secure = (el: ReactNode) => <SecureRoute>{el}</SecureRoute>;

  /* ---------- Helper : choisir le layout selon le rôle ---------- */
  const getLayoutForUser = (user?: any) => {
    const role = (user?.role ?? "").toLowerCase();

    if (["staff", "staff_read", "admin", "superadmin"].includes(role)) return <MainLayout />;
    if (role === "declic_staff") return <MainLayoutDeclic />;
    if (role === "prepa_staff") return <MainLayoutPrepa />;
    return <MainLayoutCandidat />;
  };

  function PrepaRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const allowed =
      !!user &&
      (user.is_superuser === true ||
        ["admin", "superadmin", "staff", "prepa_staff"].includes((user.role ?? "").toLowerCase()));
    if (!user) return <Navigate to="/login" replace />;
    if (!allowed) return <ForbiddenPage />;
    return <>{children}</>;
  }

  return (
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
            ["staff", "staff_read", "admin", "superadmin"].includes(
              (user?.role ?? "").toLowerCase()
            ) ? (
              <DashboardPage />
            ) : (
              <DashboardCandidatPage />
            )
          )}
        />
        {/* Dashboard candidat explicite */}
        <Route path="/dashboard/candidat" element={secure(<DashboardCandidatPage />)} />

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
        <Route path="/appairages" element={secure(<AppairagesPage />)} />
        <Route path="/appairages/create" element={secure(<AppairagesCreatePage />)} />
        <Route path="/appairages/:id/edit" element={secure(<AppairagesEditPage />)} />
        <Route path="/appairages/:id" element={secure(<AppairageDetailPage />)} />
        <Route path="/appairage-commentaires" element={secure(<AppairageCommentPage />)} />
        <Route
          path="/appairage-commentaires/create"
          element={secure(<AppairageCommentCreatePage />)}
        />
        <Route
          path="/appairage-commentaires/:id/edit"
          element={secure(<AppairageCommentEditPage />)}
        />
        <Route
          path="/appairage-commentaires/create/:appairageId"
          element={secure(<AppairageCommentCreatePage />)}
        />

        {/* Ateliers TRE */}
        <Route path="/ateliers-tre" element={secure(<AteliersTrePage />)} />
        <Route path="/ateliers-tre/create" element={secure(<AteliersTRECreatePage />)} />
        <Route path="/ateliers-tre/:id/edit" element={secure(<AtelierTREEditPage />)} />

        {/* Candidats */}
        <Route path="/candidats" element={secure(<CandidatsPage />)} />
        <Route path="/candidats/create" element={secure(<CandidatCreatePage />)} />
        <Route path="/candidats/:id/edit" element={secure(<CandidatEditPage />)} />

        {/* Partenaires */}
        <Route path="/partenaires" element={secure(<PartenairesPage />)} />
        <Route path="/partenaires/create" element={secure(<PartenairesCreatePage />)} />
        <Route path="/partenaires/:id/edit" element={secure(<PartenairesEditPage />)} />
        <Route path="/partenaires/candidat" element={secure(<PartenairesCandidatPage />)} />
        <Route
          path="/partenaires/create/candidat"
          element={secure(<PartenairesCandidatCreatePage />)}
        />
        <Route
          path="/partenaires/:id/edit/candidat"
          element={secure(<PartenairesCandidatEditPage />)}
        />

        {/* Prospection */}
        <Route path="/prospections" element={secure(<ProspectionPage />)} />
        <Route path="/prospections/create" element={secure(<ProspectionCreatePage />)} />
        <Route path="/prospections/:id/edit" element={secure(<ProspectionEditPage />)} />
        <Route path="/prospections/candidat" element={secure(<ProspectionPageCandidat />)} />
        <Route path="/prospections/create/candidat" element={<ProspectionCreatePageCandidat />} />
        <Route path="/prospections/:id/edit/candidat" element={<ProspectionEditCandidatPage />} />
        <Route path="/prospection-commentaires" element={secure(<ProspectionCommentPage />)} />
        <Route
          path="/prospection-commentaires/create"
          element={secure(<ProspectionCommentCreatePage />)}
        />
        <Route
          path="/prospection-commentaires/:id/edit"
          element={secure(<ProspectionCommentEditPage />)}
        />
        <Route
          path="/prospection-commentaires/create/:prospectionId"
          element={secure(<ProspectionCommentCreatePage />)}
        />

        {/* Commentaires */}
        <Route path="/commentaires" element={secure(<CommentairesPage />)} />
        <Route path="/commentaires/create" element={secure(<CommentairesCreatePage />)} />
        <Route
          path="/commentaires/create/:formationId"
          element={secure(<CommentairesCreateFromFormationPage />)}
        />
        <Route path="/commentaires/:id/edit" element={secure(<CommentairesEditPage />)} />

        {/* Formations */}
        <Route path="/formations" element={secure(<FormationsPage />)} />
        <Route path="/formations/create" element={secure(<FormationsCreatePage />)} />
        <Route path="/formations/:id/edit" element={secure(<FormationsEditPage />)} />
        <Route path="/formations/:id" element={secure(<FormationDetailPage />)} />
        <Route
          path="/formations/:formationId/commentaires"
          element={secure(<FormationsCommentairesPage />)}
        />

        {/* Documents */}
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/create" element={<DocumentsCreatePage />} />
        <Route path="/documents/edit/:id" element={<DocumentsEditPage />} />

        {/* Utilisateurs */}
        <Route path="/users" element={secure(<UsersPage />)} />
        <Route path="/users/create" element={secure(<UsersCreatePage />)} />
        <Route path="/users/:id/edit" element={secure(<UsersEditPage />)} />

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
            <DeclicRoute>
              <DeclicCreatePage />
            </DeclicRoute>
          }
        />
        <Route
          path="/declic/:id/edit"
          element={
            <DeclicRoute>
              <DeclicEditPage />
            </DeclicRoute>
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
            <DeclicRoute>
              <ObjectifDeclicEditPage />
            </DeclicRoute>
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
          path="/prepa/create"
          element={
            <PrepaRoute>
              <PrepaCreatePage />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/create/ic"
          element={
            <PrepaRoute>
              <PrepaCreatePageIC />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/create/ateliers"
          element={
            <PrepaRoute>
              <PrepaCreatePageAteliers />
            </PrepaRoute>
          }
        />

        <Route
          path="/prepa/:id/edit"
          element={
            <PrepaRoute>
              <PrepaEditPage />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/:id/edit/IC"
          element={
            <PrepaRoute>
              <PrepaEditPageIC />
            </PrepaRoute>
          }
        />
        <Route
          path="/prepa/:id/edit/Ateliers"
          element={
            <PrepaRoute>
              <PrepaEditPageAteliers />
            </PrepaRoute>
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
            <PrepaRoute>
              <ObjectifPrepaEditPage />
            </PrepaRoute>
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
  element={secure(<CVThequePage />)}
/> 

<Route
  path="/cvtheque/candidat"
  element={secure(<CVThequeCandidatPage />)}
/> 

<Route
  path="/cvtheque/create"
  element={secure(<CVThequeCreatePage />)}
/> 

<Route
  path="/cvtheque/create/candidat"
  element={secure(<CVThequeCandidatCreatePage />)}
/> 

<Route
  path="/cvtheque/:id/edit"
  element={secure(<CVThequeEditPage />)}
/>

<Route
  path="/cvtheque/:id/edit/candidat"
  element={secure(<CVThequeCandidatEditPage />)}
/>








      </Route>

      {/* 🚫 403 + 404 */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
