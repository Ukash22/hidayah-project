# type: ignore
# Generated manually — adds Batch model and batch FK on ScheduledSession
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0012_alter_scheduledsession_commission_amount_and_more'),
        ('programs', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Batch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('subject', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='batches', to='programs.subject',
                )),
                ('tutor', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tutor_batches', to=settings.AUTH_USER_MODEL,
                )),
                ('students', models.ManyToManyField(
                    blank=True, related_name='student_batches', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddField(
            model_name='scheduledsession',
            name='batch',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='sessions', to='classes.batch',
            ),
        ),
    ]
