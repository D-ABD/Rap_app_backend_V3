import { Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";

import MainLayout from "../layout/MainLayout";
import MainLayoutCandidat from "../layout/MainLayoutCandidat";

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

import ProspectionPage from "../pages/prospection/ProspectionPage";
import ProspectionCreatePage from "../pages/prospection/ProspectionCreatePage";
import ProspectionCreatePageCandidat from "../pages/prospection/ProspectionCreatePageCandidat";
import ProspectionEditCandidatPage from "../pages/prospection/ProspectionEditCandidatPage";
import ProspectionEditPage from "../pages/prospection/ProspectionEditPage";
import ProspectionCommentPage from "../pages/prospection/prospectioncomments/ProspectionCommentPage";
import ProspectionCommentCreatePage from "../pages/prospection/prospectioncomments/ProspectionCommentCreate";
import ProspectionCommentEditPage from "../pages/prospection/prospectioncomments/ProspectionCommentEdit";

import PolitiqueConfidentialite from "../pages/PolitiqueConfidentialite";
import About from "../pages/About";
import ParametresPage from "../pages/parametres/ParametresPage";

import { useAuth } from "../hooks/useAuth";
import ForbiddenPage from "../pages/ForbiddenPage";
import PartenairesCandidatCreatePage from "../pages/partenaires/PartenairesCandidatCreatePage";
import PartenairesCandidatEditPage from "../pages/partenaires/PartenairesCandidatEditPage";
import PartenairesCandidatPage from "../pages/partenaires/PartenairesCandidatPage";
import ProspectionPageCandidat from "../pages/prospection/ProspectionPageCandidat";
import DocumentsCreatePage from "src/pages/Documents/DocumentsCreatePage";
import DocumentsEditPage from "src/pages/Documents/DocumentsEditPage";
import DocumentsPage from "src/pages/Documents/DocumentsPage";
import DeclicPages from "src/pages/declic/DeclicPages";
import ObjectifDeclicPage from "src/pages/declic/ObjectifDeclicPage";
import MainLayoutDeclic from "src/layout/MainLayoutDeclic";
import MainLayoutPrepa from "src/layout/MainLayoutPrepa";
import DeclicCreatePage from "src/pages/declic/DeclicCreatePage";
import DeclicEditPage from "src/pages/declic/DeclicEditPage";
import ObjectifDeclicEditPage from "src/pages/declic/ObjectifDeclicEditPage";

/* ---------- SecureRoute ---------- */
type AdminOnlyRouteProps = { children: ReactNode };

function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { user } = useAuth();

  const isAdminOnly =
    !!user &&
    (user.is_superuser === true ||
      ["admin", "superadmin"].includes((user.role ?? "").toLowerCase()));

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdminOnly) return <ForbiddenPage />; // 🚫 page 403

  return <>{children}</>;
}

type AdminRouteProps = { children: ReactNode };

function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuth();

  const isAdmin =
    !!user &&
    (user.is_superuser === true ||
      user.is_staff === true ||
      ["admin", "superadmin", "staff"].includes((user.role ?? "").toLowerCase()));

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <ForbiddenPage />; // 🚫 page 403

  return <>{children}</>;
}

type SecureRouteProps = { children: ReactNode };

function SecureRoute({ children }: SecureRouteProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const secure = (el: ReactNode) => <SecureRoute>{el}</SecureRoute>;

/* ---------- Helper ---------- */
const isBackOfficeUser = (user?: any) =>
  !!(user?.is_staff || user?.role === "staff_read" || user?.is_admin || user?.is_superuser);

/* ---------- Routes ---------- */
export default function AppRoute() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* 🔓 Routes publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="/about" element={<About />} />

      {/* 🔐 Routes protégées */}
      <Route
        element={
          user?.role === "declic_staff" ? (
            <MainLayoutDeclic />
          ) : user?.role === "prepa_staff" ? (
            <MainLayoutPrepa />
          ) : isBackOfficeUser(user) ? (
            <MainLayout />
          ) : (
            <MainLayoutCandidat />
          )
        }
      >
        <Route index element={<HomePage />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={secure(isBackOfficeUser(user) ? <DashboardPage /> : <DashboardCandidatPage />)}
        />

        {/* Profil */}
        <Route path="/mon-profil" element={secure(<MonProfil />)} />

        {/* 🔒 Paramètres (admin/superadmin only) */}
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

        {/* Appairage — Commentaires dédiés */}
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

        {/* Prospections */}
        <Route path="/prospections" element={secure(<ProspectionPage />)} />
        <Route path="/prospections/create" element={secure(<ProspectionCreatePage />)} />
        <Route path="/prospections/:id/edit" element={secure(<ProspectionEditPage />)} />

        <Route path="/prospections/candidat" element={secure(<ProspectionPageCandidat />)} />
        <Route path="/prospections/create/candidat" element={<ProspectionCreatePageCandidat />} />
        <Route path="/prospections/:id/edit/candidat" element={<ProspectionEditCandidatPage />} />

        {/* Prospection — Commentaires dédiés */}
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

        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/create" element={<DocumentsCreatePage />} />
        <Route path="/documents/edit/:id" element={<DocumentsEditPage />} />

        {/* Utilisateurs */}
        <Route path="/users" element={secure(<UsersPage />)} />
        <Route path="/users/create" element={secure(<UsersCreatePage />)} />
        <Route path="/users/:id/edit" element={secure(<UsersEditPage />)} />

        {/* Déclic */}
        {/* Déclic */}
        <Route
          path="/declic"
          element={
            <AdminRoute>
              <DeclicPages />
            </AdminRoute>
          }
        />

        <Route
          path="/declic/create"
          element={
            <AdminRoute>
              <DeclicCreatePage />
            </AdminRoute>
          }
        />

        <Route
          path="/declic/:id/edit"
          element={
            <AdminRoute>
              <DeclicEditPage />
            </AdminRoute>
          }
        />

        <Route
          path="/declic/objectifs"
          element={
            <AdminRoute>
              <ObjectifDeclicPage />
            </AdminRoute>
          }
        />

        <Route
          path="/declic/objectifs/:id/edit"
          element={
            <AdminRoute>
              <ObjectifDeclicEditPage />
            </AdminRoute>
          }
        />
        {/* CERFA */}
        {/*
        <Route path="/cerfa" element={secure(<CerfaPage />)} />
        <Route path="/cerfa/:id/edit" element={secure(<CerfaEditPage />)} />
        */}
      </Route>

      {/* 🚫 403 + 404 */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
