# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from django.conf import settings
from django.utils import timezone

def safe_text(text):
    if not isinstance(text, str):
        text = str(text)
    # Strip emojis and unsupported characters for ReportLab standard Helvetica
    return text.encode('cp1252', 'ignore').decode('cp1252')

def generate_admission_letter(student_user, student_profile, fee_breakdown=None, payment_url=None):
    """
    Generates a professional admission letter as a PDF with payment details.
    fee_breakdown: dict with registration_fee, maintenance_fee, materials_fee, first_month_tuition, first_payment
    payment_url: direct link to admission portal for payment
    """
    adm_no = student_user.admission_number or "TEMP"
    filename = f"admission_{adm_no.replace('/', '_')}.pdf"
    directory = os.path.join(settings.MEDIA_ROOT, 'admission_letters')
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    filepath = os.path.join(directory, filename)
    
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    
    # Header Design
    c.setFillColor(HexColor('#1E293B')) # Slate 800
    c.rect(0, height - 2*inch, width, 2*inch, fill=1)
    
    c.setFillColor(HexColor('#FFFFFF'))
    c.setFont("Helvetica-Bold", 32)
    c.drawString(inch, height - 1.2*inch, "HIDAYAH")
    
    c.setFont("Helvetica", 10)
    c.drawString(inch, height - 1.5*inch, "INTERNATIONAL E-MADARASAH")
    
    # Body Content
    c.setFillColor(HexColor('#334155')) # Slate 700
    c.setFont("Helvetica-Bold", 16)
    c.drawString(inch, height - 2.8*inch, "OFFICIAL ADMISSION LETTER")
    
    c.setFont("Helvetica", 12)
    c.drawString(inch, height - 3.5*inch, f"Date: {timezone.now().strftime('%d %B %Y')}")
    c.drawString(inch, height - 3.8*inch, f"Admission No: {student_user.admission_number or 'TBA'}")
    
    line_y = height - 4.5*inch
    c.drawString(inch, line_y, f"Dear {safe_text(student_user.first_name)} {safe_text(student_user.last_name)},")
    line_y -= 0.3*inch
    
    text = f"We are pleased to inform you that your application for admission to Hidayah International "
    text2 = f"e-Madarasah for the course '{safe_text(student_profile.enrolled_course)}' has been approved."
    
    c.drawString(inch, line_y, text)
    line_y -= 0.25*inch
    c.drawString(inch, line_y, text2)
    line_y -= 0.5*inch
    
    # Details Table
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "ADMISSION DETAILS")
    line_y -= 0.3*inch
    
    c.setFont("Helvetica", 11)
    details = [
        f"Student Name: {safe_text(student_user.get_full_name())}",
        f"Course: {safe_text(student_profile.enrolled_course)}",
        f"Class Type: {student_profile.get_class_type_display()}",
        f"Days per Week: {student_profile.days_per_week}",
        f"Admission ID: {student_user.admission_number}",
        f"Enrolled Date: {timezone.now().strftime('%Y-%m-%d')}",
    ]
    
    for detail in details:
        c.drawString(inch + 0.2*inch, line_y, f"- {detail}")
        line_y -= 0.2*inch
    
    # Payment Information & Fee Breakdown
    line_y -= 0.4*inch
    c.setFillColor(HexColor('#DC2626'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "CONSOLIDATED MONTHLY TUITION BREAKDOWN")
    line_y -= 0.3*inch
    
    c.setFillColor(HexColor('#334155'))
    
    if fee_breakdown and 'enrollments' in fee_breakdown:
        # Multiple Enrollments
        total_monthly = 0
        for enrollment in fee_breakdown['enrollments']:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(inch + 0.2*inch, line_y, f"COURSE: {safe_text(enrollment['subject_name'])} (Tutor: {safe_text(enrollment['tutor_name'])})")
            line_y -= 0.2*inch
            
            c.setFont("Helvetica", 9)
            c.drawString(inch + 0.4*inch, line_y, f"- Hourly: N{enrollment['hourly_rate']:,.0f}/hr | Weekly ({enrollment['hours_per_week']}h): N{enrollment['weekly_rate']:,.0f}")
            line_y -= 0.15*inch
            c.drawString(inch + 0.4*inch, line_y, f"- Schedule: {safe_text(enrollment.get('days', 'TBA'))} at {safe_text(enrollment.get('time', 'TBA'))}")
            line_y -= 0.15*inch
            c.drawString(inch + 0.4*inch, line_y, f"- Monthly (4 Weeks): N{enrollment['monthly_rate']:,.0f}")
            line_y -= 0.3*inch
            total_monthly += enrollment['monthly_rate']

        # FINAL CONSOLIDATED TOTAL
        c.setFillColor(HexColor('#DC2626'))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(inch + 0.2*inch, line_y, f"TOTAL CONSOLIDATED MONTHLY PAYMENT: N{total_monthly:,.0f}")
        line_y -= 0.5*inch
    
    elif fee_breakdown:
        # Fallback for single enrollment data
        c.setFont("Helvetica-Bold", 10)
        c.drawString(inch + 0.2*inch, line_y, "TUITION AND COMPREHENSIVE BREAKDOWN:")
        line_y -= 0.25*inch
        
        hourly = fee_breakdown.get('hourly_rate', 0)
        weekly = fee_breakdown.get('weekly_rate', 0)
        monthly = fee_breakdown.get('monthly_rate', 0)
        # Termly fallback renamed to Initial Payment
        initial_payment = fee_breakdown.get('total_payment', monthly)
        
        c.setFont("Helvetica", 10)
        c.drawString(inch + 0.4*inch, line_y, f"- Hourly Rate: N{hourly:,.0f}/hr")
        line_y -= 0.2*inch
        
        c.drawString(inch + 0.4*inch, line_y, f"- Weekly Rate: N{weekly:,.0f} ({fee_breakdown.get('hours_per_week', 0)} hours per week)")
        line_y -= 0.2*inch
        
        c.drawString(inch + 0.4*inch, line_y, f"- Monthly Rate (4 Weeks): N{monthly:,.0f}")
        line_y -= 0.4*inch

        # TOTAL FOOTER
        c.setFillColor(HexColor('#334155'))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(inch + 0.2*inch, line_y, f"CONSOLIDATED MONTHLY TUITION: N{initial_payment:,.0f}")
        line_y -= 0.5*inch
        
        # --- PAYMENT LINK SECTION ---
        if payment_url:
            c.setFillColor(HexColor('#1E293B'))
            c.setFont("Helvetica-Bold", 12)
            c.drawString(inch, line_y, "DIRECT PAYMENT LINK")
            line_y -= 0.3*inch
            
            c.setFont("Helvetica", 10)
            c.setFillColor(HexColor('#2563EB')) # Blue 600
            c.drawString(inch + 0.2*inch, line_y, "Click here to pay or visit the link below:")
            line_y -= 0.25*inch
            
            c.setFont("Courier", 9)
            c.drawString(inch + 0.2*inch, line_y, payment_url)
            line_y -= 0.4*inch
        # ----------------------------
        
        c.setFillColor(HexColor('#334155'))
        c.setFont("Helvetica", 10)
        c.drawString(inch + 0.2*inch, line_y, f"Payment Reference: {student_profile.payment_reference}")
        line_y -= 0.5*inch
    else:
        # Fallback
        c.setFont("Helvetica", 11)
        c.drawString(inch + 0.2*inch, line_y, f"Total Amount: N{student_profile.total_amount:,.0f}")
        line_y -= 0.2*inch
        c.drawString(inch + 0.2*inch, line_y, f"Payment Reference: {student_profile.payment_reference}")
        line_y -= 0.5*inch
    
    # Terms & Rules (International Standards)
    line_y -= 0.3*inch
    c.setFont("Helvetica-Bold", 11)
    c.drawString(inch, line_y, "RULES & REGULATIONS (INTERNATIONAL STANDARDS):")
    line_y -= 0.2*inch
    
    c.setFont("Helvetica", 8)
    rules = [
        "1. Punctuality: Students must join the session at least 2 minutes before the scheduled start time.",
        "2. Wallet Balance: A sufficient wallet balance (at least 1 session fee) is required to access the class link.",
        "3. Rescheduling: Class rescheduling must be requested at least 12 hours in advance via the portal.",
        "4. No-Show Policy: Failure to attend a scheduled class without 6-hour prior notice results in a session charge.",
        "5. Conduct: Professional behavior is expected throughout all sessions between tutors and students.",
        "6. Platform Exclusivity: All lessons and payments must be processed solely through the Hidayah platform."
    ]
    
    for rule in rules:
        c.drawString(inch + 0.1*inch, line_y, f"- {rule[3:] if rule[1:2] == '.' else rule}")
        line_y -= 0.15*inch
    
    # Signatures
    line_y -= 0.4*inch
    
    # Important Notice
    line_y -= 0.4*inch
    c.setFillColor(HexColor('#F59E0B')) # Amber
    c.setFont("Helvetica-Bold", 10)
    c.drawString(inch, line_y, "IMPORTANT: Secure your admission and unlock full access.")
    # Footer - Seal/Signature Placeholder
    line_y = 2*inch
    c.setFillColor(HexColor('#334155'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "Director of Admissions")
    c.drawString(width - 2.5*inch, line_y, "HIDAYAH SEAL")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#94A3B8'))
    c.drawCentredString(width/2, 0.5*inch, "Hidayah e-Madarasah International (c) 2026 | Knowledge Across Borders")
    
    c.save()
    return f"admission_letters/{filename}"

def generate_appointment_letter(tutor_user, tutor_profile):
    """
    Generates a professional appointment letter as a PDF for a tutor.
    """
    filename = f"appointment_{tutor_user.username}.pdf"
    directory = os.path.join(settings.MEDIA_ROOT, 'appointment_letters')
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    filepath = os.path.join(directory, filename)
    
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    
    # Header Design
    c.setFillColor(HexColor('#0F172A')) # Dark slate 900
    c.rect(0, height - 2*inch, width, 2*inch, fill=1)
    
    c.setFillColor(HexColor('#FFFFFF'))
    c.setFont("Helvetica-Bold", 32)
    c.drawString(inch, height - 1.2*inch, "HIDAYAH")
    
    c.setFont("Helvetica", 10)
    c.drawString(inch, height - 1.5*inch, "OFFICIAL TUTOR APPOINTMENT")
    
    # Body Content
    c.setFillColor(HexColor('#1E293B'))
    c.setFont("Helvetica-Bold", 18)
    c.drawString(inch, height - 2.8*inch, "LETTER OF APPOINTMENT")
    
    c.setFont("Helvetica", 12)
    c.drawString(inch, height - 3.5*inch, f"Date: {timezone.now().strftime('%d %B %Y')}")
    
    line_y = height - 4.2*inch
    c.drawString(inch, line_y, f"Dear {safe_text(tutor_user.first_name)} {safe_text(tutor_user.last_name)},")
    line_y -= 0.4*inch
    
    text = "We are pleased to offer you an appointment as a Tutor at Hidayah International e-Madarasah."
    text2 = "Based on your impressive credentials and interview, you have been selected to join our global"
    text3 = "team of educators."
    
    c.setFont("Helvetica", 11)
    c.drawString(inch, line_y, text)
    line_y -= 0.25*inch
    c.drawString(inch, line_y, text2)
    line_y -= 0.25*inch
    c.drawString(inch, line_y, text3)
    line_y -= 0.6*inch
    
    # Position Details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "POSITION & ROLE DETAILS")
    line_y -= 0.3*inch
    
    c.setFont("Helvetica", 11)
    details = [
        f"Position: Online Tutor",
        f"Subjects: {safe_text(tutor_profile.subjects_to_teach)}",
        f"Languages: {safe_text(tutor_profile.languages)}",
        f"Work Mode: Remote / Online",
        f"Hourly Compensation: N{tutor_profile.hourly_rate:,.0f}/hr",
    ]
    
    for detail in details:
        c.drawString(inch + 0.2*inch, line_y, f"- {detail}")
        line_y -= 0.2*inch
        
    # Terms & Conditions
    line_y -= 0.4*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "TERMS OF ENGAGEMENT")
    line_y -= 0.3*inch
    
    c.setFont("Helvetica", 10)
    terms = [
        "1. You are expected to maintain professional conduct at all times",
        "2. Classes must start and end on time as per the assigned schedule",
        "3. Reliable high-speed internet and power backup are mandatory",
        "4. All learning materials are proprietary to Hidayah International",
        "5. Payment is disbursed monthly based on verified class sessions",
    ]
    
    for term in terms:
        c.drawString(inch + 0.2*inch, line_y, f"- {term[3:] if term[1:2] == '.' else term}")
        line_y -= 0.2*inch
        
    # Signatures
    line_y = 3*inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "Management Board")
    c.drawString(width - 3*inch, line_y, "Tutor Acceptance")
    
    line_y -= 0.4*inch
    c.setFont("Helvetica", 9)
    c.drawString(inch, line_y, "Hidayah International e-Madarasah")
    c.drawString(width - 3*inch, line_y, "Signature (Digital Copy)")
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#94A3B8'))
    c.drawCentredString(width/2, 0.5*inch, "Hidayah e-Madarasah International (c) 2026 | Promoting Excellence in Education")
    
    c.save()
    return f"appointment_letters/{filename}"

def generate_disciplinary_letter(tutor_user, discipline_record):
    """
    Generates an official disciplinary letter (Warning, Query, or Expulsion).
    """
    discipline_type = discipline_record.action_type # WARNING, QUERY, EXPEL
    filename = f"{discipline_type.lower()}_{tutor_user.username}_{discipline_record.id}.pdf"
    directory = os.path.join(settings.MEDIA_ROOT, 'disciplinary_letters')
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    filepath = os.path.join(directory, filename)
    
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    
    # Header - Red for discipline
    header_color = '#991B1B' if discipline_type == 'EXPEL' else '#B45309' if discipline_type == 'QUERY' else '#1E293B'
    c.setFillColor(HexColor(header_color))
    c.rect(0, height - 2*inch, width, 2*inch, fill=1)
    
    c.setFillColor(HexColor('#FFFFFF'))
    c.setFont("Helvetica-Bold", 32)
    c.drawString(inch, height - 1.2*inch, "HIDAYAH")
    
    c.setFont("Helvetica", 10)
    c.drawString(inch, height - 1.5*inch, "OFFICIAL DISCIPLINARY CORRESPONDENCE")
    
    # Body
    c.setFillColor(HexColor('#111827'))
    title = f"OFFICIAL {discipline_type} LETTER"
    c.setFont("Helvetica-Bold", 18)
    c.drawString(inch, height - 2.8*inch, title)
    
    c.setFont("Helvetica", 12)
    c.drawString(inch, height - 3.5*inch, f"Date: {timezone.now().strftime('%d %B %Y')}")
    c.drawString(inch, height - 3.8*inch, f"Case Ref: #DISC-{discipline_record.id}")
    
    line_y = height - 4.5*inch
    c.drawString(inch, line_y, f"To: {safe_text(tutor_user.get_full_name())}")
    line_y -= 0.3*inch
    c.drawString(inch, line_y, f"Position: Online Tutor")
    line_y -= 0.6*inch
    
    # Subject
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, f"SUBJECT: {safe_text(discipline_record.subject)}")
    line_y -= 0.4*inch
    
    # Content
    c.setFont("Helvetica", 11)
    text_object = c.beginText(inch, line_y)
    text_object.setFont("Helvetica", 11)
    text_object.setLeading(14)
    
    # Auto-wrap basic implementation (simple split by newline)
    lines = safe_text(discipline_record.content).split('\n')
    for line in lines:
        text_object.textLine(line)
        
    c.drawText(text_object)
    
    # Specific instructions based on type
    line_y = 4*inch
    c.setFont("Helvetica-Bold", 11)
    if discipline_type == 'QUERY':
        c.drawString(inch, line_y, "REQUIRED ACTION: Please provide a written explanation within 48 hours.")
    elif discipline_type == 'EXPEL':
        c.setFillColor(HexColor('#991B1B'))
        c.drawString(inch, line_y, "FINAL NOTICE: Your access to the Hidayah platform has been terminated immediately.")
    
    # Signature
    line_y = 2*inch
    c.setFillColor(HexColor('#1E293B'))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(inch, line_y, "Executive Management Board")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#94A3B8'))
    c.drawCentredString(width/2, 0.5*inch, "Hidayah e-Madarasah International | Disciplinary Committee")
    
    c.save()
    return f"disciplinary_letters/{filename}"
