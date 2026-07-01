import { DashboardShell } from '../../components/layout';

const NAV_GROUPS = [
    {
        items: [
            { to: '/admin/overview', icon: '🌍', label: 'Overview', end: true },
            { to: '/admin/admissions', icon: '📥', label: 'Admissions' },
            { to: '/admin/students', icon: '👥', label: 'Students' },
            { to: '/admin/tutors', icon: '👨‍🏫', label: 'Tutors' },
            { to: '/admin/recruitment', icon: '📋', label: 'Recruitment' },
            { to: '/admin/bookings', icon: '📅', label: 'Bookings' },
            { to: '/admin/classes', icon: '🎓', label: 'Classes' },
            { to: '/admin/curriculum', icon: '📚', label: 'Curriculum' },
            { to: '/admin/exams', icon: '📝', label: 'Exams' },
            { to: '/admin/financials', icon: '💰', label: 'Financials' },
            { to: '/admin/payouts', icon: '💸', label: 'Payouts' },
            { to: '/admin/withdrawals', icon: '🏧', label: 'Withdrawals' },
            { to: '/admin/complaints', icon: '⚠️', label: 'Complaints' },
            { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
        ]
    }
];

export default function AdminShell() {
    return <DashboardShell navGroups={NAV_GROUPS} role="ADMIN" />;
}
