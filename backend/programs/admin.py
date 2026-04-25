# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib import admin
from .models import Program, Subject

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'program_type')
    list_filter = ('program_type',)
    search_fields = ('name', 'description')

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'program', 'slug', 'admin_percentage')
    list_filter = ('program', 'program__program_type')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
