"""
Configuration des routes principales du projet Django.
Définit les URL pour l'admin, la documentation API, l'API REST et les vues HTML.
"""

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from rap_app.api.viewsets.health_viewset import HealthViewSet

health_view = HealthViewSet.as_view({"get": "list"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_view, name='health-root'),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/', include('rap_app.api.api_urls')),

    path('', include('rap_app.urls')),
]

# Sert les fichiers media en mode DEBUG.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
