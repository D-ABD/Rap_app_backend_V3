# RAP App - AI Coding Assistant Instructions

## Architecture Overview
This is a Django 4.2.7 application for managing professional training and recruitment processes (RAP - Réseau d'Appui Professionnel). It uses Django REST Framework (DRF) for API endpoints, JWT authentication, and Jazzmin for a customized admin interface.

**Key Components:**
- **Models** (`rap_app/models/`): Domain entities like `Candidat`, `Formation`, `Centre`, `Prospection`, `Appairage` - each in separate files for modularity.
- **API** (`rap_app/api/`): DRF ViewSets for CRUD operations, with dedicated stats ViewSets (e.g., `FormationStatsViewSet`).
- **Admin** (`rap_app/admin/`): Custom admin classes with Jazzmin theming.
- **Services** (`rap_app/services/`): Business logic layer for complex operations.
- **Utils** (`rap_app/utils/`): Helper functions and utilities.

**Data Flow:** Candidates are linked to formations via centres, with prospection and appairage processes. Uses PostgreSQL with Guardian for object-level permissions.

## Development Workflow
- **Environment:** Use virtualenv (`env/`), load `.env` or `.env.local` for config (SECRET_KEY, DEBUG, ALLOWED_HOSTS).
- **Run Server:** `python manage.py runserver`
- **Migrations:** `python manage.py makemigrations && python manage.py migrate`
- **Testing:** `pytest` (configured in `pytest.ini` with `--reuse-db` for speed; uses transactions for isolation).
- **Linting/Formatting:** `black` and `isort` (installed in env).
- **API Docs:** Swagger at `/api/docs/`, Redoc at `/api/redoc/`.

## Code Patterns
- **Models:** Inherit from `BaseModel` for common fields (created_at, updated_at). Use managers like `FormationManager` for custom queries.
- **ViewSets:** Use mixins from `rap_app/api/mixins.py` for common behavior. Permissions via Guardian (e.g., `ObjectPermissions`).
- **Serializers:** Located in `rap_app/api/serializers/`, with nested relationships.
- **Signals:** Handled in model files for automatic actions (e.g., logging via `LogUtilisateur`).
- **Error Handling:** Avoid exposing `str(e)` in APIs; use proper DRF exceptions.
- **Imports:** French comments; absolute imports within app.

## Testing
- Use `pytest` with `APITestCase` for API tests.
- Fixtures in `rap_app/tests/`; focus on integration tests.
- Mock external services; test permissions thoroughly.

## Deployment
- **Static Files:** `python manage.py collectstatic`
- **Security:** Use `django-cors-headers`, JWT blacklist; audit with `pip-audit`.
- **Monitoring:** Health check at `/api/health/`.

Reference: `rap_app_project/settings.py`, `rap_app/api/api_urls.py`, `TODO.md` for current issues.