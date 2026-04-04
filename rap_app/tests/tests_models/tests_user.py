"""Tests relatifs a user."""
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils.timezone import now

from rap_app.models.centres import Centre

CustomUser = get_user_model()


class CustomUserModelTest(TestCase):

    """Cas de test pour Custom User Model Test."""
    def setUp(self):
        self.email = "test@example.com"
        self.password = "testpass123"
        self.user = CustomUser.objects.create_user(
            email=self.email, username="testuser", password=self.password, role=CustomUser.ROLE_STAGIAIRE
        )

    def test_str_and_repr(self):
        self.assertEqual(str(self.user), "testuser")
        self.assertIn("CustomUser", repr(self.user))
        self.assertIn("role=", repr(self.user))
        self.user.first_name = "Jean"
        self.user.last_name = "Dupont"
        self.assertEqual(self.user.get_full_name(), "Jean Dupont")

    def test_user_creation_valid(self):
        self.assertEqual(self.user.email, self.email)
        self.assertTrue(self.user.check_password(self.password))
        self.assertEqual(self.user.role, CustomUser.ROLE_STAGIAIRE)
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)

    def test_create_user_without_email_raises_error(self):
        with self.assertRaises(ValueError):
            CustomUser.objects.create_user(email=None, password="pass")

    def test_create_superuser_with_flags(self):
        admin = CustomUser.objects.create_superuser(email="admin@example.com", password="adminpass")
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        self.assertEqual(admin.role, CustomUser.ROLE_SUPERADMIN)

    def test_invalid_superadmin_without_flag(self):
        user = CustomUser(email="fail@example.com", role=CustomUser.ROLE_SUPERADMIN, is_superuser=False)
        with self.assertRaises(ValidationError):
            user.full_clean()

    def test_normalisation_email_phone_role(self):
        user = CustomUser(email="  TEST@Email.COM  ", username="u1", phone="06-12 34 56", role=" ADMIN ")
        user.set_password("xxx")
        user.save()
        self.assertEqual(user.email, "test@email.com")
        self.assertEqual(user.phone, "06-12 34 56")
        self.assertEqual(user.role, "admin")

    def test_phone_validation_invalid(self):
        user = CustomUser(email="p@example.com", phone="abc123")
        with self.assertRaises(ValidationError):
            user.full_clean()

    def test_avatar_url_fallback(self):
        self.assertEqual(self.user.avatar_url(), "/static/images/default_avatar.png")

    def test_get_full_name_and_property(self):
        self.user.first_name = "Alice"
        self.user.last_name = "Lemoine"
        self.assertEqual(self.user.get_full_name(), "Alice Lemoine")
        self.assertEqual(self.user.full_name, "Alice Lemoine")

    def test_to_serializable_dict_includes_sensitive_data(self):
        data = self.user.to_serializable_dict(include_sensitive=True)
        self.assertIn("email", data)
        self.assertIn("phone", data)
        self.assertIn("is_superuser", data)

    def test_role_helpers(self):
        u1 = CustomUser(email="a@a.com", role=CustomUser.ROLE_ADMIN)
        u2 = CustomUser(email="b@b.com", role=CustomUser.ROLE_SUPERADMIN)
        u3 = CustomUser(email="c@c.com", role=CustomUser.ROLE_STAGIAIRE)
        u4 = CustomUser(email="d@d.com", role=CustomUser.ROLE_STAFF)
        u5 = CustomUser(email="e@e.com", role=CustomUser.ROLE_COMMERCIAL)
        u6 = CustomUser(email="f@f.com", role=CustomUser.ROLE_CHARGE_RECRUTEMENT)

        self.assertTrue(u1.is_admin())
        self.assertTrue(u2.is_superadmin())
        self.assertTrue(u3.is_stagiaire())
        self.assertTrue(u4.is_staff_role())
        self.assertTrue(u5.is_commercial())
        self.assertTrue(u6.is_charge_recrutement())

    def test_has_module_perms(self):
        admin = CustomUser.objects.create_user(
            email="adm@example.com", username="adm", password="x", role=CustomUser.ROLE_ADMIN
        )
        staff = CustomUser.objects.create_user(
            email="staff@example.com", username="staff", password="x", role=CustomUser.ROLE_STAFF
        )
        self.assertTrue(admin.has_module_perms("admin"))
        self.assertFalse(staff.has_module_perms("admin"))

    def test_staff_roles_are_marked_as_staff(self):
        for role in [
            CustomUser.ROLE_COMMERCIAL,
            CustomUser.ROLE_CHARGE_RECRUTEMENT,
            CustomUser.ROLE_STAFF,
            CustomUser.ROLE_STAFF_READ,
            CustomUser.ROLE_PREPA_STAFF,
            CustomUser.ROLE_DECLIC_STAFF,
        ]:
            user = CustomUser.objects.create_user(
                email=f"{role}@example.com",
                username=role,
                password="x",
                role=role,
            )
            self.assertTrue(user.is_staff)
            self.assertFalse(user.is_superuser)

    def test_has_centre_access_uses_staff_roles(self):
        centre = Centre.objects.create(nom="Centre Test", code_postal="75001")
        staff_user = CustomUser.objects.create_user(
            email="staff-centre@example.com",
            username="staff-centre",
            password="x",
            role=CustomUser.ROLE_STAFF,
        )
        staff_user.centres.add(centre)

        self.assertTrue(staff_user.has_centre_access(centre.id))
        self.assertFalse(staff_user.has_centre_access(999999))

    def test_has_centre_access_for_all_staff_roles(self):
        centre = Centre.objects.create(nom="Centre Staff Roles", code_postal="69001")
        for role in [
            CustomUser.ROLE_COMMERCIAL,
            CustomUser.ROLE_CHARGE_RECRUTEMENT,
            CustomUser.ROLE_STAFF,
            CustomUser.ROLE_STAFF_READ,
            CustomUser.ROLE_PREPA_STAFF,
            CustomUser.ROLE_DECLIC_STAFF,
        ]:
            user = CustomUser.objects.create_user(
                email=f"{role}-centre@example.com",
                username=f"{role}-centre",
                password="x",
                role=role,
            )
            user.centres.add(centre)
            self.assertTrue(user.has_centre_access(centre.id))
            self.assertFalse(user.has_centre_access(123456789))

    def test_get_role_choices_display(self):
        choices = CustomUser.get_role_choices_display()
        self.assertEqual(choices["stagiaire"], "Stagiaire")

    def test_get_csv_fields_and_headers(self):
        fields = CustomUser.get_csv_fields()
        headers = CustomUser.get_csv_headers()
        self.assertIn("email", fields)
        self.assertIn("Email", headers)
