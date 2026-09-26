# Generated manually — adds SchemeOfWork model
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0013_batch'),
        ('programs', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SchemeOfWork',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_number', models.PositiveIntegerField(default=1)),
                ('topic', models.CharField(max_length=255)),
                ('learning_objectives', models.TextField(blank=True, help_text='Specific learning outcomes or subtopics', null=True)),
                ('is_completed', models.BooleanField(db_index=True, default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('tutor_notes', models.TextField(blank=True, help_text='Remarks on achievement or homework', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('batch', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='batch_schemes', to='classes.batch')),
                ('student', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='schemes_assigned', to=settings.AUTH_USER_MODEL)),
                ('subject', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subject_schemes', to='programs.subject')),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='schemes_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['week_number', 'created_at'],
            },
        ),
    ]
