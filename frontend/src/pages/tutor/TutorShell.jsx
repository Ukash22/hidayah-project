import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DashboardShell } from '../../components/layout';

const NAV_GROUPS = [
    {
        items: [
            { to: '/tutor/schedule', icon: '📅', label: 'Schedule', end: true },
            { to: '/tutor/requests', icon: '📩', label: 'Requests' },
            { to: '/tutor/wallet', icon: '💰', label: 'Wallet' },
            { to: '/tutor/complaints', icon: '💬', label: 'Feedback' },
            { to: '/tutor/materials', icon: '📚', label: 'Materials' },
            { to: '/tutor/exams', icon: '📝', label: 'Exams' },
            { to: '/tutor/media', icon: '📹', label: 'Media' },
            { to: '/tutor/profile', icon: '⚙️', label: 'Settings' },
        ]
    }
];

export default function TutorShell() {
    const { token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) return;
        api.get(`/api/tutors/me/`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            if (res.data.status !== 'APPROVED') navigate('/pending-approval', { replace: true });
        }).catch(() => {});
    }, [token, navigate]);

    return <DashboardShell navGroups={NAV_GROUPS} role="TUTOR" />;
}
