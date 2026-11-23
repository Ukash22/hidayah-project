from decimal import Decimal
import json
import logging

logger = logging.getLogger(__name__)

# International Standard Sibling Multipliers for Shared Family Cohort:
# Child 1: 1.0 (100% of base rate)
# Child 2: +0.35 (35% add-on, meaning 65% discount on 2nd child)
# Child 3: +0.25 (25% add-on, meaning 75% discount on 3rd child)
# Child 4+: +0.20 each
SHARED_FAMILY_ADDONS = {
    2: Decimal('0.35'),
    3: Decimal('0.25'),
    4: Decimal('0.20'),
}
DEFAULT_SUBSEQUENT_ADDON = Decimal('0.20')

# International Standard Multi-Student Bundle Discounts (Separate 1-on-1 sessions):
BUNDLE_DISCOUNTS = {
    2: Decimal('0.10'), # 10% off total invoice
    3: Decimal('0.15'), # 15% off total invoice
    4: Decimal('0.20'), # 20% off total invoice for 4+
}


def calculate_family_fee(
    tutor_hourly_rate: Decimal or float or str,
    hours_per_session: Decimal or float or str = Decimal('1.0'),
    days_per_week: int = 1,
    student_count: int = 1,
    booking_type: str = 'FAMILY_SHARED',
    weeks: int = 4
) -> dict:
    """
    Calculates international-grade tutoring fees with family & sibling pricing rules.

    :param tutor_hourly_rate: Hourly rate of the tutor
    :param hours_per_session: Duration per class session in hours (e.g. 1.0, 1.5)
    :param days_per_week: Number of class days per week (e.g. 1, 2, 3)
    :param student_count: Number of family members/students attending
    :param booking_type: 'INDIVIDUAL', 'FAMILY_SHARED', or 'FAMILY_BUNDLE'
    :param weeks: Number of weeks per billing cycle (default 4)
    :return: Dictionary containing detailed breakdown, discounts, and final payable amount.
    """
    try:
        rate = Decimal(str(tutor_hourly_rate or '1500.00'))
        hours = Decimal(str(hours_per_session or '1.0'))
        days = max(1, int(days_per_week or 1))
        num_students = max(1, int(student_count or 1))
        cycle_weeks = max(1, int(weeks or 4))
    except Exception as e:
        logger.warning(f"Error parsing pricing params: {e}")
        rate = Decimal('1500.00')
        hours = Decimal('1.0')
        days = 1
        num_students = 1
        cycle_weeks = 4

    total_sessions_per_student = days * cycle_weeks
    base_session_cost = rate * hours
    # What it would cost for each student individually at 100% price:
    single_student_cycle_cost = base_session_cost * Decimal(str(total_sessions_per_student))
    full_undiscounted_price = single_student_cycle_cost * Decimal(str(num_students))

    discount_percentage = Decimal('0.00')
    discount_amount = Decimal('0.00')
    final_price = full_undiscounted_price
    tier_description = ""

    if num_students <= 1 or booking_type == 'INDIVIDUAL':
        booking_type = 'INDIVIDUAL'
        final_price = full_undiscounted_price
        tier_description = "Standard 1-on-1 Individual Rate"
    
    elif booking_type == 'FAMILY_SHARED':
        # Mode A: Sibling Cohort (All siblings learn in the same session)
        # Multiplier formula: 1 + sum(addons)
        multiplier = Decimal('1.00')
        for i in range(2, num_students + 1):
            addon = SHARED_FAMILY_ADDONS.get(i, DEFAULT_SUBSEQUENT_ADDON)
            multiplier += addon

        session_cost_shared = (base_session_cost * multiplier).quantize(Decimal('0.01'))
        final_price = (session_cost_shared * Decimal(str(total_sessions_per_student))).quantize(Decimal('0.01'))
        discount_amount = (full_undiscounted_price - final_price).quantize(Decimal('0.01'))
        if full_undiscounted_price > 0:
            discount_percentage = ((discount_amount / full_undiscounted_price) * Decimal('100')).quantize(Decimal('0.1'))
        tier_description = f"Family Shared Cohort ({num_students} siblings learning together)"

    elif booking_type == 'FAMILY_BUNDLE':
        # Mode B: Sibling Bundle (Each sibling has private 1-on-1 sessions)
        discount_rate = BUNDLE_DISCOUNTS.get(num_students, Decimal('0.20') if num_students >= 4 else Decimal('0.00'))
        discount_amount = (full_undiscounted_price * discount_rate).quantize(Decimal('0.01'))
        final_price = (full_undiscounted_price - discount_amount).quantize(Decimal('0.01'))
        discount_percentage = (discount_rate * Decimal('100')).quantize(Decimal('0.1'))
        tier_description = f"Family Multi-Student Bundle ({num_students} separate 1-on-1 programs)"

    price_per_session = (final_price / Decimal(str(total_sessions_per_student))).quantize(Decimal('0.01'))

    return {
        "booking_type": booking_type,
        "student_count": num_students,
        "base_hourly_rate": float(rate),
        "hours_per_session": float(hours),
        "days_per_week": days,
        "weeks": cycle_weeks,
        "total_sessions": total_sessions_per_student,
        "base_session_cost": float(base_session_cost),
        "original_price": float(full_undiscounted_price),
        "discount_amount": float(discount_amount),
        "discount_percentage": float(discount_percentage),
        "final_price": float(final_price),
        "price_per_session": float(price_per_session),
        "tier_description": tier_description
    }
