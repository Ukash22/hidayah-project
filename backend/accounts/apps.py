# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = "accounts"

    def ready(self):
        import accounts.signals
