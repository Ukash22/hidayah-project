# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
# This app is retired: its Notification model was a split-brain duplicate of
# accounts.Notification (which the bell API reads). All writers now use
# accounts.Notification; migration 0002 drops the orphaned table. The app
# stays in INSTALLED_APPS only so its migration history remains valid.
