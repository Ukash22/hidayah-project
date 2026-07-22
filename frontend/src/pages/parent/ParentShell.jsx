import { DashboardShell } from '../../components/layout';

const NAV_GROUPS = [
    {
        items: [
            { to: '/parent/overview', icon: '👨‍👩‍👧', label: 'My Children', end: true },
            { to: '/parent/account', icon: '⚙️', label: 'Account' },
        ]
    }
];

export default function ParentShell() {
    return <DashboardShell navGroups={NAV_GROUPS} role="PARENT" />;
}
