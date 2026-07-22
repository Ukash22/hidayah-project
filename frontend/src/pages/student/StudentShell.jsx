import { DashboardShell } from '../../components/layout';

const NAV_GROUPS = [
    {
        items: [
            { to: '/student/overview', icon: '🏠', label: 'Overview', end: true },
            { to: '/student/find-tutor', icon: '🔍', label: 'Find Tutor' },
            { to: '/student/classes', icon: '📺', label: 'Classes' },
            { to: '/student/library', icon: '📚', label: 'Library' },
            { to: '/student/exams', icon: '📝', label: 'Assessments' },
            { to: '/student/exam-practice', icon: '🎓', label: 'Exam Practice' },
            { to: '/student/ai-hub', icon: '🤖', label: 'AI Hub' },
            { to: '/student/jamb', icon: '🎯', label: 'JAMB CBT' },
            { to: '/student/progress', icon: '📈', label: 'Progress' },
            { to: '/student/finance', icon: '💳', label: 'Finance' },
            { to: '/student/feedback', icon: '💬', label: 'Feedback' },
            { to: '/student/account', icon: '⚙️', label: 'Account' },
        ],
    },
];

export default function StudentShell() {
    return <DashboardShell navGroups={NAV_GROUPS} role="STUDENT" />;
}
