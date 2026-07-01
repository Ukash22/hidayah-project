import { DashboardShell } from '../../components/layout';

const NAV_GROUPS = [
    {
        items: [
            { to: '/student/overview', icon: '🏠', label: 'Overview', end: true },
            { to: '/student/classes', icon: '📺', label: 'Classes' },
            { to: '/student/library', icon: '📚', label: 'Library' },
            { to: '/student/exams', icon: '📝', label: 'Assessments' },
            { to: '/student/jamb', icon: '🎯', label: 'JAMB CBT' },
            { to: '/student/finance', icon: '💳', label: 'Finance' },
            { to: '/student/feedback', icon: '💬', label: 'Feedback' },
        ],
    },
];

export default function StudentShell() {
    return <DashboardShell navGroups={NAV_GROUPS} role="STUDENT" />;
}
