import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import { Search, Settings, Save, Check, Shield } from 'lucide-react';

// Error Boundary to catch render crashes
class AdminErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('🔴 AdminDashboard Crash:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full border border-red-100">
                        <h2 className="text-2xl font-black text-red-600 mb-2">⚠️ Dashboard Render Error</h2>
                        <p className="text-slate-600 text-sm mb-4">A rendering crash occurred. See details below:</p>
                        <pre className="bg-red-50 text-red-800 text-xs p-4 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap border border-red-200">
                            {this.state.error?.toString()}
                            {"\n\n"}
                            {this.state.error?.stack}
                        </pre>
                        <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition">
                            Retry
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Configure axios defaults
axios.defaults.withCredentials = false;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // 'admissions', 'students', 'trials', 'financials', 'withdrawals', 'complaints', 'classes', 'exams'
    const [applications, setApplications] = useState([]);
    const [pendingStudents, setPendingStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [allComplaints, setAllComplaints] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [financials, setFinancials] = useState(null);
    const [_loadingFinancials, setLoadingFinancials] = useState(false);
    const [approvedTutors, setApprovedTutors] = useState([]);
    const [pendingPayouts, setPendingPayouts] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [_paymentAnalytics, setPaymentAnalytics] = useState(null);
    const [analyticsChartMode, setAnalyticsChartMode] = useState('monthly'); // 'daily','weekly','monthly'
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, _setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showTutorModal, setShowTutorModal] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [savingStatus, setSavingStatus] = useState({}); // { id: 'idle' | 'saving' | 'success' }
    const [globalSettings, setGlobalSettings] = useState(null);
    const [updatingGlobal, setUpdatingGlobal] = useState(false);
    const [globalSuccess, setGlobalSuccess] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedTutor, _setSelectedTutorProfile] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [tutors, setTutors] = useState([]);
    const [tutorApps, setTutorApps] = useState([]);
    const [selectedTutorApp, setSelectedTutorApp] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [adminBookings, setAdminBookings] = useState([]);
    const [adminBookingStatus, _setAdminBookingStatus] = useState('pending');
    const [_selectedBooking, setSelectedBooking] = useState(null);
    const [_showBookingModal, setShowBookingModal] = useState(false);
    const [_bookingForm, setBookingForm] = useState({
        tutor_id: '',
        subject: ''
    });
    const [_updatingBooking, _setUpdatingBooking] = useState(false);


    // Wallet Action State
    const [walletAction, setWalletAction] = useState({
        amount: '',
        type: 'DEPOSIT',
        description: 'Bank Transfer'
    });

    // Tutor Management State (Salary, Discipline)
    const [tutorActionState, setTutorActionState] = useState({
        amount: '',
        action: 'UPDATE_RATE',
        description: '',
        disciplineType: 'WARNING',
        disciplineSubject: '',
        disciplineContent: '',
        bio: '',
        commission_percentage: ''
    });

    // Trial/Regular Schedule Modal State
    const [scheduleData, setScheduleData] = useState({
        tutorId: '',
        tutorName: '',
        startTime: '',
        duration: 40,
        generateZoom: true,
        meetingLink: ''
    });

    // Student Form Update State
    const [editMode, setEditMode] = useState(false);
    const [studentForm, setStudentForm] = useState({
        enrolled_course: '',
        days_per_week: 3,
        hours_per_week: 1,
        class_type: 'ONE_ON_ONE',
        preferred_days: '',
        preferred_time: '',
        preferred_time_exact: '',
        level: '',
        assigned_tutor: '',
        meeting_link: '',
        whiteboard_link: ''
    });

    const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

    const getLocalTime = (timezone) => {
        if (!timezone) return "N/A";
        try {
            return new Date().toLocaleTimeString('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (_err) {
            return "Invalid TZ";
        }
    };

    const getCountryFlag = (country) => {
        if (!country) return '🌍';
        const flags = {
            'Nigeria': '🇳🇬', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
            'Ghana': '🇬🇭', 'Kenya': '🇰🇪', 'South Africa': '🇿🇦',
            'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Germany': '🇩🇪',
            'France': '🇫🇷', 'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪',
            'Egypt': '🇪🇬', 'Pakistan': '🇵🇰', 'India': '🇮🇳',
            'Malaysia': '🇲🇾', 'Indonesia': '🇮🇩', 'Turkey': '🇹🇷',
            'US': '🇺🇸', 'UK': '🇬🇧', 'USA': '🇺🇸',
        };
        return flags[country] || '🌍';
    };

    const _fetchFinancials = async () => {
        setLoadingFinancials(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/financials/`, { headers: getAuthHeader() });
            setFinancials(res.data);
        } catch (_err) {
            console.error("Failed to fetch financials", _err);
        } finally {
            setLoadingFinancials(false);
        }
    };

    
    const handleDownloadReceipt = (data, type = 'payment') => {
        try {
            const doc = new jsPDF();
            
            // Brand Header
            doc.setFillColor(15, 23, 42); // Navy
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("HIDAYAH INTERNATIONAL", 105, 18, { align: "center" });
            doc.setFontSize(10);
            doc.text("TUTOR PLATFORM | ISLAMIC & WESTERN EDUCATION", 105, 28, { align: "center" });
            
            // Receipt Info
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(16);
            doc.text("OFFICIAL TRANSACTION RECEIPT", 20, 55);
            
            doc.setFontSize(10);
            doc.text(`Receipt Date: ${new Date().toLocaleString()}`, 20, 65);
            doc.text(`Reference ID: #${data.ref || data.reference || data.id}`, 20, 72);
            
            // Grid Data
            const rawAmount = String(data.amount || 0).replace(/[^\d.-]/g, '');
            const rows = [
                ["Transaction For", data.student || data.user_name || data.tutor_name || "Platform User"],
                ["Email Address", data.email || data.user_email || "N/A"],
                ["Activity Type", (data.type || data.method || (type === 'withdrawal' ? 'Tutor Payout' : 'Payment')).replace('_', ' ').toUpperCase()],
                ["Amount Paid", `NGN ${parseFloat(rawAmount || 0).toLocaleString()}`],
                ["Transaction Status", (data.status || "COMPLETED").toUpperCase()],
                ["Description", data.description || (type === 'withdrawal' ? 'Withdrawal / Payout' : 'Course Enrollment / Wallet Activity')]
            ];
            
            autoTable(doc, {
                startY: 85,
                head: [['Description', 'Detail']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }, // Emerald
                styles: { fontSize: 10, cellPadding: 5 }
            });
            
            // Footer
            const finalY = doc.lastAutoTable?.finalY || 150;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Thank you for choosing Hidayah International.", 105, finalY + 20, { align: "center" });
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("This is a computer-generated receipt and requires no signature.", 105, finalY + 30, { align: "center" });
            
            doc.save(`Hidayah_Receipt_${data.ref || data.reference || data.id}.pdf`);
        } catch (_err) {
            console.error("Receipt generation failed:", _err);
            alert("Failed to generate receipt. Please try again.");
        }
    };

    const fetchData = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/stats/`, { headers: getAuthHeader() });
            setStats(res.data);
        } catch (_err) {
            console.error("Failed to fetch admin stats", _err);
        }
    };


    const fetchAdminBookings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/admin/bookings/?status=${adminBookingStatus}`, { headers: getAuthHeader() });
            setAdminBookings(res.data);
        } catch (_err) { console.error("Bookings fetch failed"); }
    };

    const countryData = React.useMemo(() => {
        const counts = {};
        allStudents.forEach(s => {
            const country = s.user?.country || 'Unknown';
            counts[country] = (counts[country] || 0) + 1;
        });
        tutors.forEach(t => {
            const country = t.user?.country || 'Unknown';
            counts[country] = (counts[country] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [allStudents, tutors]);

    useEffect(() => {
        // Initial Fetch for Badges
        fetchApplications();
        fetchTutors();
        fetchStudents();
        fetchTutorApps();
        fetchWithdrawals();
        fetchBookings();
        fetchPendingPayouts();
        if (token) {
            fetchData();
            fetchAdminBookings();
            fetchClasses();
            fetchGlobalSettings();
        }
    }, []);

    // Fetch data based on active tab
    useEffect(() => {
        if (activeTab === 'students') fetchStudents();
        if (activeTab === 'financials') {
            fetchTransactions();
            fetchPaymentAnalytics();
            fetchSubjects();
        }
        if (activeTab === 'tutor_recruitment') fetchTutorApps();
        if (activeTab === 'tutors') fetchApprovedTutors();
        if (activeTab === 'withdrawals') fetchWithdrawals();
        if (activeTab === 'complaints') fetchComplaints();
        if (activeTab === 'curriculum') fetchMaterials();
        if (activeTab === 'exams') fetchExams();
        if (activeTab === 'payouts') fetchPendingPayouts();
        if (activeTab === 'classes') fetchClasses();
        if (activeTab === 'bookings') fetchBookings();
    }, [activeTab]);

    // Polling for Classes
    useEffect(() => {
        let interval;
        if (activeTab === 'classes') {
            interval = setInterval(() => {
                fetchClasses();
            }, 30000); // Poll every 30 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    // Calculate stats whenever applications change
    useEffect(() => {
        if (applications.length > 0 || pendingStudents.length > 0) { // Added pendingStudents.length > 0 to trigger update
            setStats({
                total: applications.length,
                pending: applications.filter(a => a.status?.toLowerCase() === 'pending').length + pendingStudents.length,
                approved: applications.filter(a => a.status?.toLowerCase() === 'approved').length,
                rejected: applications.filter(a => a.status?.toLowerCase() === 'rejected').length
            });
        }
    }, [applications, pendingStudents]); // Added pendingStudents to dependency array

    useEffect(() => {
        if (selectedStudent) {
            // Default start time to next round hour
            const now = new Date();
            now.setMinutes(0, 0, 0);
            now.setHours(now.getHours() + 1);
            const defaultTime = now.toISOString().slice(0, 16);

            setScheduleData({
                tutorId: selectedStudent.assigned_tutor_details?.id || '',
                tutorName: selectedStudent.assigned_tutor_details?.full_name || '',
                startTime: defaultTime,
                duration: 40,
                generateZoom: true,
                meetingLink: selectedStudent.meeting_link || ''
            });
        }
    }, [selectedStudent]);

    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/admin/bookings/?status=pending`, { headers: getAuthHeader() });
            setPendingBookings(response.data);
        } catch (_err) {
            console.error("Failed to fetch bookings", _err);
            if (_err.response?.status === 401) setError('Unauthorized: Session Expired');
        }
    };

    const fetchPaymentAnalytics = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/analytics/`, { headers: getAuthHeader() });
            setPaymentAnalytics(response.data);
        } catch (_err) {
            console.error("Failed to fetch analytics", _err);
        }
    };

    const fetchSubjects = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`, { headers: getAuthHeader() });
            setSubjects(response.data);
        } catch (_err) {
            console.error("Failed to fetch subjects", _err);
        }
    };

    const fetchGlobalSettings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/settings/`, { headers: getAuthHeader() });
            setGlobalSettings(res.data);
        } catch (_err) { console.error("Settings fetch failed"); }
    };

    const handleUpdateGlobalCommission = async (val) => {
        setUpdatingGlobal(true);
        try {
            const res = await axios.patch(
                `${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/settings/`, 
                { default_commission_percentage: val },
                { headers: getAuthHeader() }
            );
            setGlobalSettings(res.data);
            setGlobalSuccess(true);
            setTimeout(() => setGlobalSuccess(false), 3000);
        } catch (_err) {
            alert("Failed to update global share. Please ensure value is valid.");
        } finally {
            setUpdatingGlobal(false);
        }
    };

    const handleUpdateSubjectCommission = async (id, val) => {
        setSavingStatus(prev => ({ ...prev, [id]: 'saving' }));
        try {
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/${id}/`, { admin_percentage: val }, { headers: getAuthHeader() });
            setSavingStatus(prev => ({ ...prev, [id]: 'success' }));
            fetchSubjects();
            setTimeout(() => setSavingStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
        } catch (_err) {
            console.error("Failed to update subject commission", _err);
            setSavingStatus(prev => ({ ...prev, [id]: 'idle' }));
            alert("Failed to update commission. Please check the value.");
        }
    };

    const _handleBookingAction = async (id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this booking?`)) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/admin/bookings/${id}/action/`, { action }, { headers: getAuthHeader() });
            alert(`Booking ${action}ed successfully!`);
            fetchBookings();
        } catch (_err) {
            alert(`Failed to ${action} booking: ` + (_err.response?.data?.error || _err.message));
        }
    };

    const fetchTutors = async () => {
        try {
            // Use admin/list endpoint to get TutorProfile objects with proper IDs
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/list/?status=APPROVED`, { headers: getAuthHeader() });
            setTutors(response.data);
        } catch (_err) {
            console.error("Failed to fetch tutors", _err);
            if (_err.response?.status === 401) setError('Unauthorized: Session Expired');
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/admin/all/`, { headers: getAuthHeader() });
            setAllStudents(response.data);
        } catch (_err) {
            console.error("Failed to fetch students", _err);
            if (_err.response?.status === 401) setError('Unauthorized: Session Expired');
        }
    };

    const handlePromoteTutor = async (id, name) => {
        if (!window.confirm(`Are you sure you want to promote ${name} to a Tutor? This will put their profile under review.`)) return;
        setActionLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/students/admin/${id}/promote/`, {}, { headers: getAuthHeader() });
            alert(`✅ ${name} successfully promoted to Tutor (Under Review)!`);
            fetchStudents(); // Refresh students to remove them if backend filters them or track role update
            fetchTutors();
            fetchTutorApps();
        } catch (_err) {
            alert(`Failed to promote student: ` + (_err.response?.data?.error || _err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return;

        setActionLoading(true);
        try {
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/students/admin/${selectedStudent.id}/update/`, studentForm, { headers: getAuthHeader() });
            alert("✅ Student updated successfully!");
            fetchStudents();
            setEditMode(false);
            // Refresh selected student to show new data
            const updated = allStudents.find(s => s.id === selectedStudent.id);
            if (updated) setSelectedStudent({ ...selectedStudent, ...studentForm });
        } catch (_err) {
            alert("Failed to update student: " + (_err.response?.data?.error || _err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/transactions/`, { headers: getAuthHeader() });
            setTransactions(response.data);
        } catch (_err) {
            console.error("Failed to fetch transactions", _err);
        }
    };

    const fetchTutorApps = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/list/`, { headers: getAuthHeader() });
            setTutorApps(response.data);
        } catch (_err) {
            console.error("Failed to fetch tutor applications", _err);
        }
    };

    const fetchApprovedTutors = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/list/?status=APPROVED`, { headers: getAuthHeader() });
            setApprovedTutors(response.data);
        } catch (_err) {
            console.error("Failed to fetch approved tutors", _err);
        }
    };

    const fetchWithdrawals = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/withdrawals/pending/`, { headers: getAuthHeader() });
            setWithdrawalRequests(response.data);
        } catch (_err) {
            console.error("Failed to fetch withdrawals", _err);
        }
    };

    const fetchComplaints = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/admin/all/`, { headers: getAuthHeader() });
            setAllComplaints(response.data);
        } catch (_err) {
            console.error("Failed to fetch complaints", _err);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/admin/unified-list/`, { headers: getAuthHeader() });
            setAllClasses(response.data);
        } catch (_err) {
            console.error("Failed to fetch classes", _err);
        }
    };

    const handleWithdrawalAction = async (id, action) => {
        if (action === 'REJECT') {
            alert("Reject logic needs backend implementation or status update. Currently approving only.");
            return;
        }
        if (!window.confirm(`Are you sure you want to ${action} this withdrawal? Funds will be deducted from tutor's wallet.`)) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/withdrawal/approve/${id}/`, {}, { headers: getAuthHeader() });
            alert(`Withdrawal approved successfully!`);
            fetchWithdrawals();
        } catch (_err) {
            alert(`Failed to approve withdrawal: ` + (_err.response?.data?.error || _err.message));
        }
    };

    const handleComplaintResponse = async (id) => {
        const responseText = window.prompt("Enter Admin Response:");
        if (!responseText) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/admin/${id}/resolve/`, { response: responseText }, { headers: getAuthHeader() });
            alert("Complaint resolved and response sent!");
            fetchComplaints();
        } catch (_err) {
            alert("Failed to resolve complaint: " + (_err.response?.data?.error || _err.message));
        }
    };

    const approveStudent = async (id) => {
        if (!window.confirm("Approve this student and send an Admission Letter?")) return;
        setActionLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/approve-student/${id}/`, {}, { headers: getAuthHeader() });
            alert("✅ Student approved! Admission letter generated and sent via email.");
            fetchApplications(); // Refresh both applications and pending students
        } catch (_err) {
            alert("Failed to approve student: " + (_err.response?.data?.error || _err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const fetchApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/applications/`, { headers: getAuthHeader() });
            setApplications(response.data);

            // Fetch Pending Students (New Workflow)
            const pendResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/pending-students/`, { headers: getAuthHeader() });
            setPendingStudents(pendResponse.data);

            setLoading(false);
        } catch (_err) {
            if (_err.response?.status === 401) {
                setError('Authentication Failed: Please login again.');
                localStorage.removeItem('access');
                // Optional: window.location.href = '/login';
            } else {
                setError('Failed to fetch applications.');
            }
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/`, { headers: getAuthHeader() });
            setMaterials(res.data);
        } catch (_err) { 
            console.error("Failed to fetch materials", _err);
            if (_err.response?.status === 401) setError('Unauthorized: Session Expired');
        }
    };

    const fetchExams = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, { headers: getAuthHeader() });
            // For now, we just log or store if state exists, but the UI shows a Link to Central Exam Engine
            console.log("Exams fetched:", res.data);
        } catch (_err) {
            console.error("Failed to fetch exams", _err);
            if (_err.response?.status === 401) setError('Unauthorized: Session Expired');
        }
    };

    const fetchPendingPayouts = async () => {
        try {
            // Corrected Path: applications.urls is at api/
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/classes/pending-payouts/`, { headers: getAuthHeader() });
            setPendingPayouts(response.data);
        } catch (_err) {
            console.error("Failed to fetch pending payouts", _err);
            if (_err.response?.status === 401) setError('Unauthorized: Session Expired');
        }
    };

    const handleReleasePayout = async (sessionId) => {
        if (!window.confirm("Release this payout to the tutor's wallet?")) return;
        setActionLoading(true);
        try {
            // Corrected Path: applications.urls is at api/
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/classes/${sessionId}/release-payout/`, {}, { headers: getAuthHeader() });
            alert("✅ Payout released successfully!");
            fetchPendingPayouts();
        } catch (_err) {
            alert("Failed to release payout: " + (_err.response?.data?.error || _err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleTutorManagement = async (e) => {
        if (e) e.preventDefault();
        if (!selectedTutor) return;

        setActionLoading(true);
        try {
            const endpoint = tutorActionState.action === 'DISCIPLINE'
                ? `${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/discipline/${selectedTutor.id}/`
                : `${import.meta.env.VITE_API_BASE_URL}/api/tutors/${selectedTutor.id}/manage/`;

            const payload = tutorActionState.action === 'DISCIPLINE'
                ? {
                    action: tutorActionState.disciplineType,
                    subject: tutorActionState.disciplineSubject,
                    content: tutorActionState.disciplineContent
                }
                : {
                    action: tutorActionState.action,
                    amount: tutorActionState.amount,
                    description: tutorActionState.description
                };

            await axios.post(endpoint, payload, { headers: getAuthHeader() });
            alert("✅ Tutor records updated successfully!");
            setShowTutorModal(false);
            fetchTutorApps(); // Refresh list
        } catch (_err) {
            alert("Failed to update tutor: " + (_err.response?.data?.error || _err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const togglePublicVisibility = async (id) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/toggle-public/${id}/`, {}, { headers: getAuthHeader() });
            alert("Visibility toggled!");
            fetchTutorApps();
        } catch (_err) { alert("Failed to toggle visibility"); }
    };

    const openApprovalModal = (app, isEdit = false) => {
        setSelectedApp({ ...app, isEditMode: isEdit, isViewOnly: false });

        // Default start time to next round hour
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
        const defaultTime = now.toISOString().slice(0, 16);

        if (isEdit) {
            // Pre-fill with existing schedule details
            setScheduleData({
                tutorId: app.tutor_id || '',
                tutorName: app.assigned_tutor || 'Sheikh Ahmad',
                startTime: app.scheduled_at ? app.scheduled_at.slice(0, 16) : defaultTime,
                duration: app.duration || 40,
                generateZoom: false // Usually don't want to re-generate on edit unless asked
            });
        } else {
            setScheduleData({
                tutorId: '',
                tutorName: 'Sheikh Ahmad',
                startTime: defaultTime,
                duration: 40,
                generateZoom: true
            });
        }
        setShowModal(true);
    };

    const confirmApprovalOrUpdate = async (e) => {
        e.preventDefault();
        if (!selectedApp) return;

        setShowModal(false);
        setActionLoading(true);

        try {
            if (selectedApp.isEditMode) {
                // Handle Update
                await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/applications/${selectedApp.id}/update/`, {
                    tutor_id: scheduleData.tutorId,
                    tutor_name: scheduleData.tutorName,
                    start_time: new Date(scheduleData.startTime).toISOString(),
                    duration: parseInt(scheduleData.duration)
                }, { headers: getAuthHeader() });

                setApplications(apps => apps.map(app =>
                    app.id === selectedApp.id ? {
                        ...app,
                        assigned_tutor: scheduleData.tutorName,
                        scheduled_at: new Date(scheduleData.startTime).toISOString(),
                        duration: parseInt(scheduleData.duration)
                    } : app
                ));
                alert('✅ Class schedule updated successfully!');

            } else {
                // Handle Approval
                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/applications/${selectedApp.id}/approve/`, {
                    tutor_id: scheduleData.tutorId,
                    tutor_name: scheduleData.tutorName,
                    start_time: new Date(scheduleData.startTime).toISOString(),
                    duration: parseInt(scheduleData.duration),
                    generate_zoom: scheduleData.generateZoom
                }, { headers: getAuthHeader() });

                setApplications(apps => apps.map(app =>
                    app.id === selectedApp.id ? {
                        ...app,
                        status: 'approved',
                        zoom_start_url: response.data.zoom_link,
                        assigned_tutor: scheduleData.tutorName,
                        scheduled_at: new Date(scheduleData.startTime).toISOString(),
                        duration: parseInt(scheduleData.duration)
                    } : app
                ));

                const { zoom_link, email_sent, email_error } = response.data;
                let msg = `✅ Approved successfully!\n\n🔗 Zoom Link Created: ${zoom_link}`;

                if (email_sent) {
                    msg += `\n\n📧 Email sent to applicant.`;
                } else {
                    msg += `\n\n⚠️ WARNING: Email FAILED to send.\nError: ${email_error}\n\nPlease copy the link above and send it manually.`;
                }
                alert(msg);
            }

        } catch (_err) {
            console.error("Action error:", _err);
            const errorMsg = _err.response?.data?.error || _err.message;
            alert(`Failed to process: ${errorMsg}`);
        } finally {
            setActionLoading(false);
            setSelectedApp(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to REJECT this application?")) return;

        setActionLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/applications/${id}/reject/`, {}, { headers: getAuthHeader() });

            setApplications(apps => apps.map(app =>
                app.id === id ? { ...app, status: 'rejected' } : app
            ));
            alert('✅ Application rejected and email sent.');
        } catch (_err) {
            const errorMsg = _err.response?.data?.error || _err.message;
            alert(`Failed to reject: ${errorMsg}`);
        } finally {
            setActionLoading(false);
        }
    };


    const handleWalletAction = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return;

        if (!window.confirm(`Are you sure you want to ${walletAction.type} ₦${walletAction.amount} for ${selectedStudent.user.username}?`)) return;

        setActionLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/payments/admin/wallet-action/`, {
                student_id: selectedStudent.id,
                amount: walletAction.amount,
                action_type: walletAction.type,
                description: walletAction.description
            }, { headers: getAuthHeader() });

            alert("✅ Wallet updated successfully!");
            setShowStudentModal(false);
            setWalletAction({ amount: '', type: 'DEPOSIT', description: 'Bank Transfer' });
            fetchStudents(); // Refresh list
        } catch (_err) {
            const errorMsg = _err.response?.data?.error || _err.message;
            alert(`Failed: ${errorMsg}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignTutor = async (studentId, tutorId, meetingLink = '', generateZoom = false, startTime = null, duration = 40) => {
        if (!tutorId) {
            alert("Please select a tutor first");
            return;
        }

        setActionLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/assign/`, {
                student_id: studentId,
                tutor_id: tutorId,
                meeting_link: meetingLink,
                generate_zoom: generateZoom,
                start_time: startTime ? new Date(startTime).toISOString() : null,
                duration: parseInt(duration)
            }, { headers: getAuthHeader() });

            alert("✅ Tutor assigned successfully!");
            fetchStudents();
            setShowStudentModal(false);
        } catch (_err) {
            alert("Failed to assign tutor: " + (_err.response?.data?.error || _err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkAction = async (action) => {
        if (!window.confirm(`Are you sure you want to ${action} ${selectedIds.length} application(s)?`)) return;

        setActionLoading(true);
        let successCount = 0;

        for (const id of selectedIds) {
            try {
                if (activeTab === 'tutor_recruitment') {
                    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${id}/`, {
                        action: action === 'approve' ? 'APPROVE' : 'REJECT'
                    }, { headers: getAuthHeader() });
                } else {
                    // Bulk student apps
                    if (action === 'approve') {
                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/applications/${id}/${action}/`, {
                            tutor_name: 'Assigned Tutor',
                            duration: 40
                        }, { headers: getAuthHeader() });
                    } else {
                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/applications/${id}/${action}/`, {}, { headers: getAuthHeader() });
                    }
                }

                successCount++;
            } catch (_err) {
                console.error(`Bulk ${action} failed for ID ${id}`, _err);
            }
        }

        alert(`Successfully processed ${successCount} applications.`);
        setSelectedIds([]);
        if (activeTab === 'tutor_recruitment') {
            fetchTutorApps();
        } else {
            fetchApplications();
        }
        setActionLoading(false);
    };

    // Filter Logic
    const getFilteredData = () => {
        const searchLower = searchTerm.toLowerCase();

        if (activeTab === 'curriculum') {
            return materials.filter(mat =>
                mat.title?.toLowerCase().includes(searchLower) ||
                mat.tutor_name?.toLowerCase().includes(searchLower) ||
                mat.material_type?.toLowerCase().includes(searchLower)
            );
        }

        if (activeTab === 'tutor_recruitment') {
            return tutorApps.filter(app =>
                app.name?.toLowerCase().includes(searchLower) ||
                app.email?.toLowerCase().includes(searchLower) ||
                app.subjects?.toLowerCase().includes(searchLower)
            );
        }

        if (activeTab === 'tutors') {
            return approvedTutors.filter(tutor =>
                tutor.full_name?.toLowerCase().includes(searchLower) ||
                tutor.user?.email?.toLowerCase().includes(searchLower)
            );
        }

        const filtered = applications.filter(app => {
            const matchesFilter = filter === 'all' || app.status?.toLowerCase() === filter;
            const matchesSearch =
                app.first_name?.toLowerCase().includes(searchLower) ||
                app.email?.toLowerCase().includes(searchLower) ||
                app.phone?.includes(searchLower);

            return matchesFilter && matchesSearch;
        });
        return filtered;
    };

    const filteredApplications = getFilteredData();

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredApplications.length && filteredApplications.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredApplications.map(app => app.id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(ids => ids.filter(itemId => itemId !== id));
        } else {
            setSelectedIds(ids => [...ids, id]);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4 animate-in fade-in">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-primary font-bold text-sm uppercase tracking-widest animate-pulse">Loading Hidayah Control Room...</p>
            </div>
        </div>
    );

    const handleJoinClass = async (session) => {
        let url = session.zoom_start_url || session.meeting_link; // Handle both Trial and Regular
        
        if (!url) {
            // Jitsi Fallback
            const sessionId = session.db_id || session.id;
            const studentId = session.student || session.user_id || '99';
            const room_id = `HidayahClass-${sessionId}-${studentId}`;
            url = `https://meet.jit.si/${room_id}`;
        }
        
        const dateObj = new Date(session.scheduled_at);
        const _dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const _dateString = dateObj.toLocaleDateString();
        
        const tutorName = session.tutor_name || session.assigned_tutor || 'Tutor';
        const studentName = session.student_name || session.first_name || 'Student';
        const subject = session.course_interested || session.subject || 'Class';
        
        const displayName = encodeURIComponent(`Admin Observer: ${tutorName} - ${studentName} (${subject})`);
        
        if (url.includes('meet.jit.si') || url.includes('8x8.vc')) {
            const hashDivider = url.includes('#') ? '&' : '#';
            url = `${url}${hashDivider}userInfo.displayName="${displayName}"`;
        }
        
        window.open(url, '_blank');
    };

    // Find active/upcoming closest class
    const activeClass = allClasses.find(cls => {
        if (!cls.scheduled_at) return false;
        const classTime = new Date(cls.scheduled_at).getTime();
        const now = Date.now();
        // Active if within 30 minutes before or 60 minutes after
        return now >= classTime - 30*60*1000 && now <= classTime + 60*60*1000;
    });

    return (
        <div className="min-h-screen font-sans flex text-slate-800 bg-slate-50">
            {/* Left Sidebar Navigation */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col fixed h-full shadow-2xl z-50">
                <div className="p-6 border-b border-slate-800/80 bg-slate-900/50">
                    <h1 className="text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                        <img src="/logo.png" alt="Hidayah" className="w-16 h-16 object-contain" />
                        Hidayah
                    </h1>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Global Admin Center</p>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 hide-scrollbar">
                    <div className="text-[9px] font-black uppercase text-slate-600 tracking-widest pl-2 mb-2">Core Hub</div>
                    <SidebarButton active={activeTab === 'admissions'} onClick={() => setActiveTab('admissions')} icon="📥" label="Admissions" badge={stats.pending} />
                    <SidebarButton active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon="🎓" label="Students" />
                    <SidebarButton active={activeTab === 'tutors'} onClick={() => setActiveTab('tutors')} icon="👨‍🏫" label="Tutors" />
                    <SidebarButton active={activeTab === 'tutor_recruitment'} onClick={() => setActiveTab('tutor_recruitment')} icon="👔" label="Recruitment" badge={tutorApps.filter(a => a.status === 'PENDING').length} />
                    
                    <div className="text-[9px] font-black uppercase text-slate-600 tracking-widest pl-2 mb-2 mt-6">Operations</div>
                    <SidebarButton active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} icon="📅" label="Bookings" badge={pendingBookings.length} />
                    <SidebarButton active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} icon="📚" label="Classes" />
                    <SidebarButton active={activeTab === 'trials'} onClick={() => setActiveTab('trials')} icon="🧪" label="Trials" />
                    <SidebarButton active={activeTab === 'curriculum'} onClick={() => setActiveTab('curriculum')} icon="📖" label="Curriculum" />
                    <SidebarButton active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} icon="📝" label="Exams" />
                    
                    <div className="text-[9px] font-black uppercase text-slate-600 tracking-widest pl-2 mb-2 mt-6">Financials & Support</div>
                    <SidebarButton active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} icon="💳" label="Transactions" />
                    <SidebarButton active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} icon="💸" label="Payouts" badge={pendingPayouts.length} />
                    <SidebarButton active={activeTab === 'withdrawals'} onClick={() => setActiveTab('withdrawals')} icon="🏦" label="Withdrawals" badge={withdrawalRequests.length} />
                    <SidebarButton active={activeTab === 'complaints'} onClick={() => setActiveTab('complaints')} icon="💬" label="Complaints" badge={allComplaints.filter(c => !c.resolved_at).length} />
                </div>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 ml-64 p-8 min-h-screen bg-[#f8fafc]">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Top Global Navigation Bar */}
                    <div className="flex justify-between items-center bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl drop-shadow-md">🌍</span>
                            <div>
                                <h2 className="text-sm font-black text-slate-800">Global Administration Active</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">System Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <input
                                    type="text"
                                    placeholder="Global Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                                <span className="absolute left-3 top-2.5 text-[12px]">🔍</span>
                            </div>
                            <button
                                onClick={fetchApplications}
                                className="p-2 px-3 flex items-center gap-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors shadow-sm text-xs font-bold uppercase"
                                title="Refresh Dashboard"
                            >
                                <span>🔄</span> Sync
                            </button>
                        </div>
                    </div>

                    {/* Active Class Global Alert */}
                    {activeClass && (
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-800 rounded-2xl p-6 shadow-2xl shadow-blue-500/20 border border-blue-500/30 flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse mb-8 z-10 relative mt-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-xl">
                                    🎥
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-lg">Class Active on Platform</h4>
                                    <p className="text-blue-100 text-sm">Tr. {activeClass.tutor_name || activeClass.assigned_tutor} is teaching {activeClass.student_name || activeClass.first_name} ({activeClass.course_interested || activeClass.subject || 'Class'})</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleJoinClass(activeClass)} 
                                className="bg-white text-blue-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all w-full md:w-auto text-center shadow-lg flex-shrink-0"
                            >
                                Observe Class
                            </button>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-4">
                        {/* Global Platform Share Card - NEW */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group border border-slate-700/50">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-primary">Global Platform Share</span>
                                    <Shield size={16} className="text-primary/50" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        disabled={updatingGlobal}
                                        defaultValue={globalSettings?.default_commission_percentage || 5.00}
                                        onBlur={(e) => handleUpdateGlobalCommission(e.target.value)}
                                        className="bg-transparent text-3xl font-black text-white w-24 outline-none border-b-2 border-transparent focus:border-primary transition-all pb-1"
                                    />
                                    <span className="text-xl font-bold text-slate-500">%</span>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    {updatingGlobal ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Syncing...</span>
                                        </div>
                                    ) : globalSuccess ? (
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <Check size={12} strokeWidth={3} />
                                            <span className="text-[9px] font-bold uppercase tracking-tighter">Live & Dynamic</span>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Base Rate for all Subjects</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <StatCard
                            icon="👥"
                            label="Total Students"
                            value={allStudents.length}
                            sub="Active Scholars"
                            color="bg-white border-slate-100 text-slate-800"
                        />
                        <StatCard
                            icon="📝"
                            label="Pending Apps"
                            value={stats.pending}
                            sub="Needs Action"
                            alert={stats.pending > 0}
                            color="bg-white border-slate-100 text-slate-800"
                        />
                        <StatCard
                            icon="👨‍🏫"
                            label="Expert Tutors"
                            value={tutors.length}
                            sub="Verified Staff"
                            color="bg-white border-slate-100 text-slate-800"
                        />
                    </div>

                    {/* --- ERROR FEEDBACK BANNER --- */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">System Alert</h4>
                                    <p className="text-xs text-red-600 font-bold">{error}</p>
                                </div>
                            </div>
                            {error.includes('Unauthorized') || error.includes('Authentication') ? (
                                <Link to="/login" className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-red-700 transition-all shadow-md">
                                    Re-authenticate →
                                </Link>
                            ) : (
                                <button onClick={() => fetchApplications()} className="text-[10px] font-black text-red-800 uppercase hover:underline">
                                    Retry Sync
                                </button>
                            )}
                        </div>
                    )}

                    {/* --- MODERN CHARTS SECTION --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* User Distribution Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
                            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">Platform Demographics</h3>
                                                 {/* Dynamic Tabs Navigation */}
                        <div className="flex flex-wrap gap-2 mb-10 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
                            {[
                                { id: 'overview', icon: '📊', label: 'Pulse' },
                                { id: 'students', icon: '👤', label: 'Students' },
                                { id: 'tutors', icon: '🎓', label: 'Tutors' },
                                { id: 'bookings', icon: '📩', label: 'Bookings' },
                                { id: 'finance', icon: '💰', label: 'Financials' },
                                { id: 'curriculum', icon: '📚', label: 'Content' },
                                { id: 'withdrawals', icon: '🏧', label: 'Payouts' },
                                { id: 'admissions', icon: '📄', label: 'Admissions' },
                                { id: 'complaints', icon: '🚩', label: 'Flags' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-white hover:text-primary'}`}
                                >
                                    <span>{tab.icon}</span> {tab.label}
                                </button>
                            ))}
                        </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Students', value: allStudents.length || 1 },
                                                { name: 'Tutors', value: tutors.length || 1 }
                                            ]}
                                            cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                                        >
                                            <Cell fill="#0ea5e9" />
                                            <Cell fill="#f59e0b" />
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-2">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sky-500"></div><span className="text-xs font-bold text-slate-600">Students ({allStudents.length})</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs font-bold text-slate-600">Tutors ({tutors.length})</span></div>
                            </div>
                        </div>

                        {/* Global Reach Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
                            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">Global Footprint (Top 5)</h3>
                            <div className="h-48 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={countryData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} width={80} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* System Activity Pipeline */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
                            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">System Activity Pipeline</h3>
                            <div className="h-48 w-full">
                                <ResponsiveContainer>
                                    <BarChart data={[
                                        { name: 'Admissions', count: applications.length },
                                        { name: 'Bookings', count: pendingBookings.length },
                                        { name: 'Withdrawals', count: withdrawalRequests.length },
                                        { name: 'Complaints', count: allComplaints.length }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions Bar (Conditional) */}
                    {selectedIds.length > 0 && (
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4">
                            <span className="font-bold text-primary ml-2">{selectedIds.length} items selected</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleBulkAction('approve')}
                                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    Approve Selected ({selectedIds.length})
                                </button>
                                <button
                                    onClick={() => handleBulkAction('reject')}
                                    className="bg-white text-red-600 border border-red-100 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
                                >
                                    Reject Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">{error}</div>}

                    {/* Main Data Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === filteredApplications.length && filteredApplications.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                </th>
                                <th className="py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Date</th>
                                <th className="py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Details</th>
                                <th className="py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Secondary Info</th>
                                <th className="py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] text-center">Status</th>
                                <th className="py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {activeTab === 'tutor_recruitment' ? (
                                /* Tutor Recruitment Table */
                                tutorApps.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No tutor applications yet.</td></tr>
                                ) : tutorApps.map(app => (
                                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 shadow-sm"></td>
                                        <td className="py-1.5 px-3 whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-700">{new Date(app.created_at).toLocaleDateString()}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-medium">{app.device} • {app.network}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{app.name}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-tight">{app.subjects?.slice(0, 30)}...</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[11px] text-slate-600 font-medium italic">{app.email}</div>
                                            <div className="flex flex-wrap gap-2 mt-0.5">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">{app.experience} Years Exp</span>
                                                <span className="text-[9px] text-emerald-600 font-black uppercase">₦{parseFloat(app.hourly_rate).toLocaleString()}/hr</span>
                                            </div>
                                            {app.status === 'INTERVIEW_SCHEDULED' && (
                                                <div className="mt-1 space-y-0.5">
                                                    {app.interview_at && (
                                                        <div className="text-[9px] text-amber-600 font-bold uppercase">
                                                            🗓 {new Date(app.interview_at).toLocaleString()}
                                                        </div>
                                                    )}
                                                    {app.interview_link ? (
                                                        <a
                                                            href={app.interview_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-block text-[9px] text-white bg-blue-600 hover:bg-blue-700 font-black uppercase px-2 py-0.5 rounded transition-colors"
                                                        >
                                                            🎥 Join Interview
                                                        </a>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-400 italic">No link provided</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <StatusBadge status={app.status} />
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex justify-center items-center gap-2">
                                                {app.status === 'APPLIED' && (
                                                    <button
                                                        onClick={async () => {
                                                            const time = window.prompt("Enter Interview Time (YYYY-MM-DDTHH:MM):", new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                                                            if (!time) return;

                                                            const useAutoJitsi = window.confirm("Generate Live Class (Jitsi + Whiteboard) automatically?");
                                                            let link = "";
                                                            if (!useAutoJitsi) {
                                                                link = window.prompt("Enter Manual Interview Meeting Link (Zoom/Meet):");
                                                                if (!link) return;
                                                            }

                                                            try {
                                                                setActionLoading(true);
                                                                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${app.id}/`, {
                                                                    action: 'INTERVIEW',
                                                                    interview_at: time,
                                                                    interview_link: link,
                                                                    generate_zoom: useAutoJitsi
                                                                }, { headers: getAuthHeader() });
                                                                alert("✅ Interview Scheduled Successfully!");
                                                                fetchTutorApps();
                                                            } catch (_err) {
                                                                alert("❌ Failed to schedule interview: " + (_err.response?.data?.error || _err.message));
                                                            } finally {
                                                                setActionLoading(false);
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-amber-500 text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-amber-600 transition-colors"
                                                    >
                                                        Schedule Interview
                                                    </button>
                                                )}
                                                {app.status === 'INTERVIEW_SCHEDULED' && (
                                                    <button
                                                        onClick={async () => {
                                                            const time = window.prompt("Update Interview Time (YYYY-MM-DDTHH:MM):", app.interview_at ? new Date(app.interview_at).toISOString().slice(0, 16) : '');
                                                            if (!time) return;
                                                            const link = window.prompt("Update Interview Meeting Link (leave blank to keep existing):") || app.interview_link;
                                                            try {
                                                                setActionLoading(true);
                                                                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${app.id}/`, {
                                                                    action: 'INTERVIEW',
                                                                    interview_at: time,
                                                                    interview_link: link,
                                                                    generate_zoom: false
                                                                }, { headers: getAuthHeader() });
                                                                alert("✅ Schedule Updated!");
                                                                fetchTutorApps();
                                                            } catch (_err) {
                                                                alert("❌ Failed: " + (_err.response?.data?.error || _err.message));
                                                            } finally {
                                                                setActionLoading(false);
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-violet-500 text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-violet-600 transition-colors"
                                                    >
                                                        Update Schedule
                                                    </button>
                                                )}
                                                {(app.status === 'APPLIED' || app.status === 'INTERVIEW_SCHEDULED') && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm("Approve this tutor? Appointment Letter will be sent.")) {
                                                                    try {
                                                                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${app.id}/`, { action: 'APPROVE' }, { headers: getAuthHeader() });
                                                                        alert("Tutor Approved!");
                                                                        fetchTutorApps();
                                                                    } catch (_err) { alert("Failed to approve"); }
                                                                }
                                                            }}
                                                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[9px] font-black uppercase"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const reason = window.prompt("Rejection Reason:");
                                                                if (reason) {
                                                                    try {
                                                                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${app.id}/`, { action: 'REJECT', reason }, { headers: getAuthHeader() });
                                                                        alert("Tutor Rejected");
                                                                        fetchTutorApps();
                                                                    } catch (_err) { alert("Failed to reject"); }
                                                                }
                                                            }}
                                                            className="text-[9px] text-red-500 font-bold underline"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => setSelectedTutorApp(app)}
                                                    className="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-black uppercase hover:bg-slate-200 transition-colors"
                                                >
                                                    👁 View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'tutors' ? (
                                /* Approved Tutors Table */
                                tutors.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No approved tutors yet.</td></tr>
                                ) : tutors.map(tutor => (
                                    <tr key={tutor.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4"></td>
                                        <td className="py-1.5 px-3 whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-700">{new Date(tutor.created_at).toLocaleDateString()}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-medium">Approved</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{tutor.name}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-tight">{tutor.subjects?.slice(0, 40)}...</div>
                                        </td>
                                         <td className="py-1.5 px-3">
                                            <div className="text-[11px] text-slate-600 font-medium italic">{tutor.email}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[12px] shadow-sm rounded-sm" title={tutor.user?.country}>{tutor.user?.country === 'Nigeria' ? '🇳🇬' : '🌍'}</span>
                                                <span className="text-[9px] text-primary font-black uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded">
                                                    🕒 {getLocalTime(tutor.user?.timezone)}
                                                </span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">{tutor.experience} Years • {tutor.device}</div>
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <div className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-1">Active</div>
                                            <div className="text-[10px] font-black text-slate-700">₦{parseFloat(tutor.wallet_balance || 0).toLocaleString()}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        alert(`Tutor Profile:\n\nName: ${tutor.name}\nEmail: ${tutor.email}\nSubjects: ${tutor.subjects}\nExperience: ${tutor.experience} years\nLanguages: ${tutor.has_online_exp ? 'Has Online Experience' : 'New to Online Teaching'}\nDevice: ${tutor.device}\nNetwork: ${tutor.network}`);
                                                    }}
                                                    className="px-2 py-1 bg-primary text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-primary/80 transition-colors"
                                                >
                                                    📋 View Profile
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Block ${tutor.name}? They will lose access to the platform.`)) {
                                                            alert("Block functionality coming soon");
                                                        }
                                                    }}
                                                    className="text-[9px] text-red-500 font-bold underline hover:text-red-700"
                                                >
                                                    Block
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'students' ? (
                                /* Active Students Table */
                                allStudents.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No active students found.</td></tr>
                                ) : allStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4"></td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{student.user.first_name} {student.user.last_name}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-black">@{student.user.username}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{student.enrolled_course}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[12px]" title={student.user?.country}>{student.user?.country === 'Nigeria' ? '🇳🇬' : '🌍'}</span>
                                                <span className="text-[9px] text-amber-600 font-black uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                                                    🕒 {getLocalTime(student.user?.timezone)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[10px] font-bold text-slate-600">{student.class_type}</div>
                                            <div className="text-[9px] text-slate-400">{student.days_per_week} Days/Week • {student.hours_per_week}h</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${student.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {student.payment_status}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-700">₦{parseFloat(student.wallet_balance || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-1 uppercase font-bold flex items-center gap-2">
                                                <span>{student.assigned_tutor_details ? `✅ ${student.assigned_tutor_details.full_name}` : '❌ No Tutor'}</span>
                                                <div className="flex gap-1 ml-1">
                                                    {student.meeting_link && (
                                                        <a href={student.meeting_link} target="_blank" rel="noreferrer" title="Join Jitsi" className="text-primary hover:scale-110 transition-transform">📹</a>
                                                    )}
                                                    {student.whiteboard_link && (
                                                        <a href={student.whiteboard_link} target="_blank" rel="noreferrer" title="Open Whiteboard" className="text-secondary hover:scale-110 transition-transform">📋</a>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <StatusBadge status={student.approval_status} />
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex flex-col gap-1 justify-center items-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedStudent(student);
                                                        setStudentForm({
                                                            enrolled_course: student.enrolled_course || '',
                                                            days_per_week: student.days_per_week || 3,
                                                            hours_per_week: student.hours_per_week || 1,
                                                            class_type: student.class_type || 'ONE_ON_ONE',
                                                            preferred_days: student.preferred_days || '',
                                                            preferred_time: student.preferred_time || '',
                                                            preferred_time_exact: student.preferred_time_exact || '',
                                                            level: student.level || '',
                                                            assigned_tutor: student.assigned_tutor || '',
                                                            meeting_link: student.meeting_link || '',
                                                            whiteboard_link: student.whiteboard_link || ''
                                                        });
                                                        setShowStudentModal(true);
                                                    }}
                                                    className="px-3 py-1 w-full flex justify-center bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all items-center gap-1 mx-auto"
                                                >
                                                    ⚙️ Manage
                                                </button>
                                                <button
                                                    onClick={() => handlePromoteTutor(student.id, `${student.user.first_name} ${student.user.last_name}`)}
                                                    className="px-3 py-1 w-full flex text-center justify-center bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[8px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all items-center gap-1 mx-auto mt-1"
                                                >
                                                    🚀 Promote to Tutor
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'curriculum' ? (
                                /* Curriculum Materials Table */
                                materials.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No curriculum materials found.</td></tr>
                                ) : materials.map(mat => (
                                    <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 shadow-sm"></td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[10px] font-bold text-slate-500">{new Date(mat.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{mat.title}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-tight">{mat.material_type}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[11px] text-slate-600 font-medium">By {mat.tutor_name}</div>
                                            <div className={`text-[9px] font-bold uppercase ${mat.is_public ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {mat.is_public ? 'Public' : 'Private'}
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <a
                                                href={mat.file}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[9px] font-black text-secondary hover:underline uppercase"
                                            >
                                                View file ↗
                                            </a>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/${mat.id}/`, { is_public: !mat.is_public }, { headers: getAuthHeader() });
                                                            fetchMaterials();
                                                        } catch (_err) { alert("Failed to update status"); }
                                                    }}
                                                    className={`px-2 py-1 rounded text-[9px] font-black uppercase ${mat.is_public ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500 text-white'}`}
                                                >
                                                    {mat.is_public ? 'Mark Private' : 'Make Public'}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm("Permanently delete this material?")) {
                                                            try {
                                                                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/${mat.id}/`, { headers: getAuthHeader() });
                                                                fetchMaterials();
                                                            } catch (_err) { alert("Failed to delete material"); }
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <span className="text-xs">🗑️</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'withdrawals' ? (
                                /* Withdrawal Requests Table */
                                withdrawalRequests.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No withdrawal requests found.</td></tr>
                                ) : withdrawalRequests.map(w => (
                                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 shadow-sm"></td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[10px] font-bold text-slate-500">{new Date(w.created_at).toLocaleString()}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{w.tutor_name}</div>
                                            <div className="text-[11px] font-black text-primary">₦{parseFloat(w.amount).toLocaleString()}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[9px] text-slate-400 uppercase font-black">{w.withdrawal_frequency}</div>
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <StatusBadge status={w.status} />
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex justify-center gap-2">
                                                {w.status === 'PENDING' && (
                                                    <>
                                                        <button onClick={() => handleWithdrawalAction(w.id, 'APPROVE')} className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase">Approve</button>
                                                        <button onClick={() => handleWithdrawalAction(w.id, 'REJECT')} className="bg-red-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase">Reject</button>
                                                    </>
                                                )}
                                                {w.status === 'APPROVED' && (
                                                    <button 
                                                        onClick={() => handleDownloadReceipt(w, "withdrawal")} 
                                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors border border-slate-200" 
                                                        title="Download Payout Receipt"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'complaints' ? (
                                /* Complaints Table */
                                allComplaints.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No complaints found.</td></tr>
                                ) : allComplaints.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 shadow-sm"></td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[10px] font-bold text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{c.subject}</div>
                                            <div className="text-[10px] text-slate-600 truncate max-w-xs">{c.description}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[9px] font-bold text-primary uppercase">By: {c.filed_by_name}</div>
                                            <div className="text-[9px] font-bold text-red-500 uppercase">Against: {c.filed_against_name}</div>
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <StatusBadge status={c.status} />
                                        </td>
                                        <td className="py-1.5 px-3">
                                            {c.status !== 'RESOLVED' && (
                                                <button onClick={() => handleComplaintResponse(c.id)} className="bg-primary text-white px-3 py-1 rounded text-[9px] font-black uppercase block mx-auto">Resolve</button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'classes' ? (
                                /* Unified Global Classes Table - Filtered for Regular Classes */
                                <div className="space-y-6">
                                    {/* Active Class Monitor Section - Exclude Trials */}
                                    {allClasses.filter(c => c.is_live && c.type !== 'TRIAL').length > 0 && (
                                        <div className="bg-red-50/50 border border-red-100 rounded-[2rem] p-6 mb-6 animate-pulse">
                                            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                </span>
                                                Live Regular Class Activity Monitor
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {allClasses.filter(c => c.is_live && c.type !== 'TRIAL').map(liveCls => (
                                                    <div key={liveCls.id} className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between group hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-lg">📹</div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800">{liveCls.student_name}</p>
                                                                <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">with {liveCls.tutor_name}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={liveCls.meeting_link} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm"
                                                        >
                                                            Monitor
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="overflow-hidden">
                                        <table className="w-full text-left border-separate border-spacing-y-2">
                                            <thead>
                                                <tr className="text-[#94a3b8] text-[10px] uppercase font-black tracking-[0.15em]">
                                                    <th className="px-4 py-2">Flag</th>
                                                    <th className="px-3 py-2">Schedule</th>
                                                    <th className="px-3 py-2">Student & Region</th>
                                                    <th className="px-3 py-2">Course & Tutor</th>
                                                    <th className="px-3 py-2 text-center">Live Status</th>
                                                    <th className="px-3 py-2 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allClasses.filter(c => c.type !== 'TRIAL').length === 0 ? (
                                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No regular classes found.</td></tr>
                                                ) : allClasses.filter(c => c.type !== 'TRIAL').map(cls => (
                                                    <tr key={cls.id} className={`bg-white hover:bg-slate-50 transition-all shadow-sm border border-slate-100 rounded-xl group ${cls.is_live ? 'ring-2 ring-red-100 translate-x-1' : ''}`}>
                                                        <td className="py-2 px-4 first:rounded-l-2xl">
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-2xl" title={cls.country || 'Global'}>{getCountryFlag(cls.country)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="text-[11px] font-black text-slate-700">{new Date(cls.scheduled_at).toLocaleDateString()}</div>
                                                            <div className="text-[9px] text-primary font-bold uppercase tracking-tight">{new Date(cls.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="font-black text-slate-800 text-[11px] flex items-center gap-1.5 uppercase tracking-tight">
                                                                {cls.student_name}
                                                                {cls.gender === 'Female' ? <span className="text-pink-400 text-[10px]">♀</span> : <span className="text-blue-400 text-[10px]">♂</span>}
                                                            </div>
                                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                                {cls.timezone || 'UTC'} · <span className="text-primary">{getLocalTime(cls.timezone)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="text-[10px] text-slate-600 font-black uppercase tracking-tight">{cls.subject || 'General Studies'}</div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                                <div className="text-[9px] text-slate-400 font-bold uppercase">Tr. {cls.tutor_name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            <StatusBadge 
                                                                status={
                                                                    cls.status === 'COMPLETED' ? 'COMPLETED' :
                                                                    cls.is_live ? (cls.is_started ? 'LIVE_STARTED' : 'LIVE_WAITING') :
                                                                    new Date(cls.scheduled_at) > new Date() ? 'UPCOMING' : 
                                                                    'ENDED'
                                                                } 
                                                            />
                                                        </td>
                                                        <td className="py-3 px-3 last:rounded-r-2xl">
                                                            <div className="flex justify-center items-center gap-2">
                                                                {cls.meeting_link ? (
                                                                    <a 
                                                                        href={cls.meeting_link} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${cls.is_live ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                                    >
                                                                        <span className="text-xs">📹</span> {cls.is_live ? 'Join Session' : 'Room Link'}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase italic opacity-50">No Link Set</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : activeTab === 'bookings' ? (
                                /* Bookings Table */
                                adminBookings.length === 0 ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-slate-400 italic">No bookings found in this category.</td></tr>
                                ) : adminBookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 shadow-sm"></td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{booking.student_name}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-black">@{booking.student_email?.split('@')[0]}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-primary text-xs">{booking.subject}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-black">₦{parseFloat(booking.price).toLocaleString()} • {booking.hours_per_week}h/wk</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">{booking.tutor_name}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-black">Assigned Tutor</div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <div className="text-[10px] font-medium text-slate-500">{new Date(booking.created_at).toLocaleDateString()}</div>
                                            <div className="text-[8px] font-black uppercase text-slate-400">Start: {booking.preferred_start_date || 'ASAP'}</div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block ${booking.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : booking.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {booking.status}
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedBooking(booking);
                                                        setBookingForm({ tutor_id: booking.tutor, subject: booking.subject });
                                                        setShowBookingModal(true);
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase hover:bg-slate-200"
                                                >
                                                    📝 Edit
                                                </button>
                                                {booking.status === 'PENDING' && (
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm("Approve this booking?")) {
                                                                    try {
                                                                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/admin/bookings/${booking.id}/action/`, { action: 'approve' }, { headers: getAuthHeader() });
                                                                        fetchAdminBookings();
                                                                    } catch (_err) { alert("Approval failed"); }
                                                                }
                                                            }}
                                                            className="px-2 py-1 bg-emerald-500 text-white rounded text-[9px] font-black uppercase hover:bg-emerald-600 flex-1"
                                                        >
                                                            ✅
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm("Reject and delete this booking?")) {
                                                                    try {
                                                                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/admin/bookings/${booking.id}/action/`, { action: 'reject' }, { headers: getAuthHeader() });
                                                                        fetchAdminBookings();
                                                                    } catch (_err) { alert("Rejection failed"); }
                                                                }
                                                            }}
                                                            className="px-2 py-1 bg-red-500 text-white rounded text-[9px] font-black uppercase hover:bg-red-600 flex-1"
                                                        >
                                                            ❌
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'payouts' ? (
                                /* Escrow Payouts Table */
                                pendingPayouts.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No pending payouts at the moment.</td></tr>
                                ) : pendingPayouts.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 shadow-sm"></td>
                                        <td className="py-1.5 px-3 whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-700">{new Date(p.scheduled_at).toLocaleDateString()}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-medium">{new Date(p.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="font-bold text-slate-800 text-xs">Student: {p.student_name}</div>
                                            <div className="text-[10px] text-primary font-black uppercase tracking-tight">Tutor: {p.tutor_name}</div>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="text-[11px] text-slate-600 font-medium">Session Fee: ₦{parseFloat(p.fee_amount).toLocaleString()}</div>
                                            <div className="text-[9px] text-emerald-600 font-black uppercase">Tutor Share: ₦{(parseFloat(p.fee_amount)-parseFloat(p.commission_amount)).toLocaleString()}</div>
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                            <span className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border">Pending Review</span>
                                        </td>
                                        <td className="py-1.5 px-3">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => handleReleasePayout(p.id)}
                                                    className="px-3 py-1 bg-emerald-600 text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-emerald-700 transition-all"
                                                >
                                                    🚀 Release Funds
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'financials' ? (
                                <tr className="bg-transparent border-none">
                                    <td colSpan="6" className="p-0 border-none">
                                        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            {/* Financial Summary Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
                                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 hover:shadow-md transition-shadow">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Gross Revenue</span>
                                                    <div className="text-2xl font-black text-slate-800">₦{parseFloat(financials?.totals?.total_revenue || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Total Paid by Students</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 hover:shadow-md transition-shadow">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-primary">Platform Net</span>
                                                    <div className="text-2xl font-black text-primary">₦{parseFloat(financials?.totals?.platform_revenue || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Hidayah Commissions Earned</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 hover:shadow-md transition-shadow">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-500">Net to Tutors</span>
                                                    <div className="text-2xl font-black text-blue-600">₦{parseFloat(financials?.totals?.net_to_tutors || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Tutor Earnings Credit</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 hover:shadow-md transition-shadow">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Class Completions</span>
                                                    <div className="text-2xl font-black text-slate-800">{financials?.totals?.completed_classes || 0} / {financials?.totals?.total_classes || 0}</div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Classes Successfully Delivered</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
                                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 relative z-10">Total Student Wallets</span>
                                                    <div className="text-3xl font-black text-white relative z-10">₦{parseFloat(financials?.wallet_stats?.student_total || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2 relative z-10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Liquid Student Balance</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300 relative z-10">Total Tutor Wallets</span>
                                                    <div className="text-3xl font-black text-white relative z-10">₦{parseFloat(financials?.wallet_stats?.tutor_total || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2 relative z-10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-tighter">Total Owed to Tutors</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-br from-red-800 to-red-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-red-300 relative z-10">Pending Withdrawals</span>
                                                    <div className="text-3xl font-black text-white relative z-10">₦{parseFloat(financials?.withdrawal_stats?.pending_amount || 0).toLocaleString()}</div>
                                                    <div className="flex items-center gap-1.5 mt-2 relative z-10">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                                        <span className="text-[9px] font-bold text-red-300 uppercase tracking-tighter">{financials?.withdrawal_stats?.pending_count || 0} Requests Waiting</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">
                                                <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                                                    <div className="flex justify-between items-center mb-8 relative z-10">
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-800 font-display">Revenue Velocity</h3>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Growth Trend & Processing History</p>
                                                        </div>
                                                        <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                                                            {['daily', 'weekly', 'monthly'].map(m => (
                                                                <button 
                                                                    key={m}
                                                                    onClick={() => setAnalyticsChartMode(m)}
                                                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${analyticsChartMode === m ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    {m}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="h-[280px] w-full mt-4">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={financials?.charts?.[analyticsChartMode] || []}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                <XAxis 
                                                                    dataKey={analyticsChartMode === 'daily' ? 'day' : analyticsChartMode === 'weekly' ? 'week' : 'month'} 
                                                                    axisLine={false} 
                                                                    tickLine={false} 
                                                                    tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                                                                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, {month: 'short', day: analyticsChartMode === 'daily' ? 'numeric' : undefined})}
                                                                    dy={10}
                                                                />
                                                                <YAxis 
                                                                    axisLine={false} 
                                                                    tickLine={false} 
                                                                    tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                                                                    tickFormatter={(v) => `₦${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                                                                />
                                                                <Tooltip 
                                                                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                                                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                                                                    formatter={(value) => [`₦${parseFloat(value).toLocaleString()}`, 'Revenue']}
                                                                />
                                                                <Bar 
                                                                    dataKey="amount" 
                                                                    fill="#6366f1" 
                                                                    radius={[6, 6, 0, 0]} 
                                                                    barSize={analyticsChartMode === 'daily' ? 12 : 32}
                                                                />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                                                    
                                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                                        <h3 className="text-lg font-black text-slate-800 font-display flex items-center gap-2">
                                                            Subject Comm.
                                                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">{subjects.length}</span>
                                                        </h3>
                                                        <span className="p-2 bg-indigo-50 text-primary rounded-xl text-xs">
                                                            <Settings size={14} className="animate-spin-slow" />
                                                        </span>
                                                    </div>

                                                    {/* Search Bar */}
                                                    <div className="relative mb-4 z-10">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Quick search subjects..." 
                                                            value={subjectSearch}
                                                            onChange={(e) => setSubjectSearch(e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
                                                        />
                                                    </div>

                                                    <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar relative z-10">
                                                        {subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => {
                                                            const status = savingStatus[s.id] || 'idle';
                                                            const getCategoryColor = (type) => {
                                                                if (type === 'ISLAMIC') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10';
                                                                if (type === 'EXAM_PREP') return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10';
                                                                return 'bg-blue-500/10 text-blue-600 border-blue-500/10';
                                                            };
                                                            
                                                            return (
                                                                <div key={s.id} className={`p-4 rounded-2xl flex flex-col gap-2 group/item transition-all duration-300 border ${status === 'success' ? 'bg-emerald-50 border-emerald-500/30' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{s.name}</span>
                                                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border w-fit mt-1 ${getCategoryColor(s.program_type)}`}>
                                                                                {s.program_type?.replace('_', ' ') || 'General'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className={`text-[10px] font-bold transition-colors ${status === 'success' ? 'text-emerald-500' : 'text-primary'}`}>
                                                                                {status === 'success' ? 'Saved! ✨' : `${s.admin_percentage}% Share`}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 relative">
                                                                        <input 
                                                                            type="number" 
                                                                            disabled={status === 'saving'}
                                                                            defaultValue={s.admin_percentage}
                                                                            onBlur={(e) => {
                                                                                if (e.target.value !== String(s.admin_percentage)) {
                                                                                    handleUpdateSubjectCommission(s.id, e.target.value);
                                                                                }
                                                                            }}
                                                                            className={`w-full border rounded-xl px-3 py-1.5 text-xs font-bold transition-all outline-none ${status === 'saving' ? 'bg-white opacity-50 cursor-wait' : 'bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-primary/20'}`}
                                                                            placeholder="Set %"
                                                                        />
                                                                        {status === 'saving' && (
                                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-6 text-center italic">Settings update in real-time for future sessions.</p>
                                                </div>
                                            </div>

                                            <div className="px-4">
                                                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                                        <h3 className="font-black text-slate-800 font-display tracking-tight flex items-center gap-2">
                                                            <span className="text-xl">📃</span> Audit Trail
                                                        </h3>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-[#f8fafc]">
                                                                <tr>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Date</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Student</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Amount</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-center">Status</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Ref</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Receipt</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {!financials?.history || financials.history.length === 0 ? (
                                                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No recent payments found.</td></tr>
                                                                ) : financials.history.map(p => (
                                                                    <tr key={p.id} className="hover:bg-slate-50 transition-all group">
                                                                        <td className="py-4 px-6 text-[11px] font-bold text-slate-600">
                                                                            {new Date(p.date).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{p.student}</div>
                                                                            <div className="text-[9px] text-slate-400 font-bold lowercase italic">{p.method}</div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className={`text-sm font-black`}>₦{parseFloat(p.amount).toLocaleString()}</div>
                                                                        </td>
                                                                        <td className="py-4 px-6 text-center">
                                                                            <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : p.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                {p.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-6 text-[10px] font-bold text-slate-500 italic">#{p.ref}</td>
                                                                        <td className="py-4 px-6 text-right">
                                                                            <button onClick={() => handleDownloadReceipt(p, "payment")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors" title="Download Receipt">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="px-4 mt-8">
                                                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-50/20">
                                                        <h3 className="font-black text-slate-800 font-display tracking-tight flex items-center gap-2">
                                                            <span className="text-xl">💳</span> Wallet Transactions (Debits & Credits)
                                                        </h3>
                                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">Internal Ledger</div>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-[#f8fafc]">
                                                                <tr>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Timestamp</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">User Details</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Type</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Amount</th>
                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Description</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {transactions.length === 0 ? (
                                                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No wallet activities found.</td></tr>
                                                                ) : transactions.map(t => (
                                                                    <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                                                                        <td className="py-4 px-6 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                                                            {new Date(t.date).toLocaleString()}
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{t.user_name}</div>
                                                                            <div className="text-[9px] text-slate-400 font-bold lowercase">{t.user_email}</div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${
                                                                                t.type.includes('DEBIT') || t.type.includes('WITHDRAWAL') 
                                                                                ? 'bg-red-50 text-red-600 border-red-100' 
                                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                            }`}>
                                                                                {t.type.replace('_', ' ')}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className={`text-sm font-black ${
                                                                                t.type.includes('DEBIT') || t.type.includes('WITHDRAWAL') ? 'text-red-600' : 'text-emerald-600'
                                                                            }`}>
                                                                                {t.type.includes('DEBIT') || t.type.includes('WITHDRAWAL') ? '-' : '+'}
                                                                                ₦{parseFloat(t.amount || 0).toLocaleString()}
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-6">
                                                                            <div className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight line-clamp-1 group-hover:line-clamp-none transition-all">{t.description}</div>
                                                                            {t.reference && <div className="text-[8px] text-slate-300 font-black tracking-widest mt-0.5">REF: {t.reference}</div>}
                                                                            <button onClick={() => handleDownloadReceipt(t, "transaction")} className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-all">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                                                Get Receipt
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : activeTab === 'exams' ? (
                                /* Exams & CBT Section */
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <div className="max-w-md mx-auto space-y-6">
                                            <div className="text-6xl mb-6">📝</div>
                                            <h3 className="text-2xl font-display font-bold text-slate-800">CBT & Exam Control</h3>
                                            <p className="text-slate-500 text-sm">Manage simulations for JAMB, WAEC, NECO, and more. Configure timing, subject combinations, and large-scale question banks.</p>
                                            <Link
                                                to="/admin/exams"
                                                className="inline-block px-10 py-5 bg-gradient-to-r from-primary to-primary-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
                                            >
                                                Open Central Exam Engine →
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : activeTab === 'admissions' ? (
                                    /* Admissions Table (Pending Students) */
                                    pendingStudents.length === 0 ? (
                                        <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No pending admission requests.</td></tr>
                                    ) : pendingStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2 px-4 shadow-sm"></td>
                                            <td className="py-1.5 px-3 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-700">New Registration</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-medium">{student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Recent'}</div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{getCountryFlag(student.country)}</span>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-xs">{student.first_name} {student.last_name}</div>
                                                        <div className="text-[9px] text-slate-400 uppercase font-black">@{student.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="text-[11px] text-slate-600 font-medium lowercase italic">{student.email}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{student.phone} / {student.country || 'Global'}</div>
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                                <span className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm">Pending Verification</span>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="flex justify-center items-center gap-2">
                                                    <button
                                                        onClick={() => approveStudent(student.id)}
                                                        className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1"
                                                    >
                                                        <span>✅</span> Admit
                                                    </button>
                                                    {student.profile_data && (
                                                        <button
                                                            onClick={() => {
                                                                const mockApp = {
                                                                    ...student.profile_data,
                                                                    course_interested: student.profile_data.enrolled_course || 'General',
                                                                    first_name: student.first_name,
                                                                    last_name: student.last_name,
                                                                    email: student.email,
                                                                    phone: student.phone,
                                                                    country: student.country,
                                                                    gender: student.gender,
                                                                    dob: student.dob,
                                                                    is_parent_account: student.is_parent_account,
                                                                    relationship: student.profile_data.relationship,
                                                                    isViewOnly: true,
                                                                    message: "Standard Registration Form"
                                                                };
                                                                setSelectedApp(mockApp);
                                                                setShowModal(true);
                                                            }}
                                                            className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase hover:bg-slate-200"
                                                        >
                                                            📋 Form
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'tutor_recruitment' ? (
                                    /* Tutor Recruitment Table */
                                    tutorApps.length === 0 ? (
                                        <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No tutor applications yet.</td></tr>
                                    ) : tutorApps.map(app => (
                                        <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2 px-4 shadow-sm"></td>
                                            <td className="py-1.5 px-3 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-700">{new Date(app.created_at).toLocaleDateString()}</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-medium">{app.device} • {app.network}</div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="font-bold text-slate-800 text-xs">{app.name}</div>
                                                <div className="text-[10px] text-primary font-black uppercase tracking-tight">{app.subjects?.slice(0, 30)}...</div>
                                            </td>
                                            <td className="py-1.5 px-4">
                                                <div className="text-[11px] text-slate-600 font-medium italic">{app.email}</div>
                                                <div className="flex flex-wrap gap-2 mt-0.5">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{app.experience} Years Exp</span>
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                                <StatusBadge status={app.status} />
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedTutorApp(app)}
                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition-all"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    /* Standard Admissions / Trials Table */
                                    filteredApplications.length === 0 ? (
                                        <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No matching applications found.</td></tr>
                                    ) : filteredApplications.map(app => (
                                        <tr key={app.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(app.id) ? 'bg-primary/5' : ''}`}>
                                            <td className="py-2 px-4 shadow-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(app.id)}
                                                    onChange={() => toggleSelectOne(app.id)}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                            </td>
                                            <td className="py-1.5 px-3 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-700">{app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-medium">{app.created_at ? new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base" title={app.country || 'Global'}>{getCountryFlag(app.country)}</span>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                            {app.first_name} {app.last_name || ''}
                                                            {app.gender === 'Female' ? <span className="text-pink-400 text-[10px]">♀</span> : <span className="text-blue-400 text-[10px]">♂</span>}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                            {app.timezone || 'UTC'} · <span className="text-primary">{getLocalTime(app.timezone)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="text-[11px] text-slate-600 font-medium lowercase italic">{app.email}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{app.phone} / {app.country || 'Global'}</div>
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                                <StatusBadge status={app.status} />
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <button
                                                            onClick={() => { setSelectedApp(app); setShowModal(true); }}
                                                            className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase tracking-wider hover:bg-primary hover:text-white transition-all"
                                                        >
                                                            Schedule
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedApp({ ...app, isViewOnly: true }); setShowModal(true); }}
                                                            className="text-[9px] text-slate-400 hover:text-slate-600 font-bold uppercase underline decoration-dotted"
                                                        >
                                                            Review Form
                                                        </button>
                                                    </div>

                                                    {app.status?.toLowerCase() === 'approved' && (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100 flex items-center gap-3 h-10 shadow-sm relative overflow-hidden group">
                                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/30"></div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[7px] text-slate-400 font-black uppercase">Tutor</span>
                                                                    <span className="text-[10px] font-bold text-slate-800 truncate max-w-[60px]">{app.assigned_tutor || 'Unset'}</span>
                                                                </div>
                                                                <div className="w-px h-6 bg-slate-200"></div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[7px] text-slate-400 font-black uppercase">Session</span>
                                                                    <span className="text-[9px] font-black text-primary truncate max-w-[80px]">
                                                                        {app.scheduled_at ? new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => openApprovalModal(app, true)}
                                                                    className="ml-1 text-[9px] bg-slate-200/50 w-5 h-5 flex items-center justify-center rounded hover:bg-primary hover:text-white transition-all"
                                                                    title="Edit Schedule"
                                                                >
                                                                    ✏️
                                                                </button>
                                                            </div>

                                                            {app.zoom_start_url && (
                                                                <a
                                                                    href={app.zoom_start_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-3 py-1 bg-emerald-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 shadow-sm h-8"
                                                                >
                                                                    📹 Join Live
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => togglePublicVisibility(app.id, app.is_public)}
                                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all h-8 shadow-sm ${app.is_public ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                                                            >
                                                                {app.is_public ? 'Visible' : 'Hidden'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {app.status?.toLowerCase() === 'rejected' ? (
                                                        <span className="text-slate-300 text-[9px] font-black uppercase italic tracking-widest border border-slate-100 px-2 py-1 rounded-md bg-slate-50/50">Rejected</span>
                                                    ) : !app.status?.toLowerCase().includes('approved') && (
                                                        <button
                                                            onClick={() => handleReject(app.id)}
                                                            className="text-[9px] text-red-400 hover:text-red-600 font-bold uppercase transition-colors"
                                                            title="Dismiss Application"
                                                        >
                                                            Reject
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Amazing Schedule Modal */}
            {showModal && selectedApp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header with Gradient */}
                        <div className="bg-gradient-to-r from-primary to-primary-700 p-8 text-white relative">
                            <h3 className="text-3xl font-display font-bold leading-tight">
                                {selectedApp.isViewOnly ? '📋 Application Details' : (selectedApp.isEditMode ? '✨ Update Schedule' : '📅 Set Trial Class')}
                            </h3>
                            <p className="text-primary-100/80 text-sm mt-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                {selectedApp.isViewOnly ? 'Reviewing' : 'Applicant'}: <span className="font-bold text-white uppercase tracking-wider">{selectedApp.first_name} {selectedApp.last_name}</span>
                            </p>
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {selectedApp.isViewOnly ? (
                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Email Address</p>
                                        <p className="text-sm font-bold text-slate-700">{selectedApp.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Phone Number</p>
                                        <p className="text-sm font-bold text-slate-700">{selectedApp.phone}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Country</p>
                                        <span className="flex items-center gap-2">
                                            <span className="text-lg">{getCountryFlag(selectedApp.country)}</span>
                                            <p className="text-sm font-bold text-slate-700">{selectedApp.country || 'Not specified'}</p>
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Academic Level</p>
                                        <p className="text-sm font-black text-emerald-600 uppercase">{selectedApp.level || 'Not specified'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Interested In</p>
                                        <p className="text-sm font-black text-primary uppercase">{selectedApp.course_interested || 'General Studies'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Class Type</p>
                                        <p className="text-sm font-bold text-slate-700 uppercase">{selectedApp.class_type?.replace('_', ' ') || 'One-on-One'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Study Intensity</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {selectedApp.days_per_week || 3} Sessions / Week
                                            <span className="block text-[10px] text-slate-400 lowercase italic">({selectedApp.hours_per_week || 1}h per session)</span>
                                        </p>
                                    </div>
                                    {(selectedApp.target_exam_type || selectedApp.target_exam_year) && (
                                        <div className="space-y-1 bg-primary/5 p-2 rounded-xl border border-primary/10 col-span-2">
                                            <p className="text-[10px] font-black text-primary uppercase">🎯 Exam Target</p>
                                            <p className="text-sm font-black text-primary uppercase">
                                                {selectedApp.target_exam_type} {selectedApp.target_exam_year}
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Preferred Tutor</p>
                                        <p className="text-sm font-black text-slate-700">{selectedApp.preferred_tutor || 'Any Available'}</p>
                                    </div>
                                    {selectedApp.gender && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Gender / Age</p>
                                            <p className="text-sm font-bold text-slate-700">
                                                {selectedApp.gender} {selectedApp.dob ? `· ${new Date().getFullYear() - new Date(selectedApp.dob).getFullYear()} yrs` : ''}
                                            </p>
                                        </div>
                                    )}
                                    {selectedApp.is_parent_account && (
                                        <div className="space-y-1 bg-amber-50 p-2 rounded-xl border border-amber-100 col-span-2">
                                            <p className="text-[10px] font-black text-amber-600 uppercase">👤 Registered by Parent</p>
                                            <p className="text-sm font-bold text-amber-900">
                                                Relationship: <span className="font-black uppercase">{selectedApp.relationship || 'Guardian'}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {selectedApp.enrollments && selectedApp.enrollments.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">📚 Specific Subject Enrollments</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedApp.enrollments.map((enr, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800">{enr.subject_name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{enr.days_per_week} days/wk · {enr.hours_per_week}h/sess</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-primary">₦{parseFloat(enr.monthly_rate).toLocaleString()}/mo</p>
                                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Tr. {enr.tutor_name}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">🗓 Preferred Schedule</h4>
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Days</p>
                                            <p className="text-xs font-bold text-slate-700">{selectedApp.preferred_day || selectedApp.preferred_days || 'Any'}</p>
                                        </div>
                                        <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Time Slot</p>
                                            <p className="text-xs font-bold text-slate-700">{selectedApp.preferred_time || 'Any'}</p>
                                        </div>
                                    </div>
                                    {selectedApp.preferred_time_exact && (
                                        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                                            <p className="text-[9px] font-black text-primary/60 uppercase">Exact Time Request</p>
                                            <p className="text-xs font-black text-primary">{selectedApp.preferred_time_exact}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedApp.message && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Student Message</p>
                                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-900 leading-relaxed italic">
                                            "{selectedApp.message}"
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-200 transition-all"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => openApprovalModal(selectedApp)}
                                        className="flex-[2] py-4 bg-primary text-white font-black uppercase text-xs rounded-2xl shadow-lg hover:-translate-y-1 transition-all"
                                    >
                                        Proceed to Schedule →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={confirmApprovalOrUpdate} className="p-8 space-y-6">
                                {/* Tutor Selection Card */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        <span>👤</span> Assign Expert Tutor
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full pl-5 pr-12 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-700 font-bold focus:border-primary/30 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                                            value={scheduleData.tutorId}
                                            required
                                            onChange={(e) => {
                                                const tId = e.target.value;
                                                const selectedTutor = tutors.find(t => t.id === parseInt(tId));
                                                setScheduleData({
                                                    ...scheduleData,
                                                    tutorId: tId,
                                                    tutorName: selectedTutor ? (selectedTutor.name || selectedTutor.full_name || 'Assigned Tutor') : ''
                                                });
                                            }}
                                        >
                                            <option value="">Select a Tutor</option>
                                            {tutors.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                                            ))}
                                        </select>
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</span>
                                    </div>
                                    {selectedApp.preferred_tutor && (
                                        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 mt-3">
                                            <p className="text-[9px] font-black text-primary/60 uppercase">Student Requested Tutor</p>
                                            <p className="text-xs font-black text-primary">{selectedApp.preferred_tutor}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Date & Time Selection Card */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        <span>🚀</span> Scheduled Live Session
                                    </label>
                                    <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/10 space-y-3">
                                        <input
                                            type="datetime-local"
                                            className="w-full p-4 rounded-xl border-2 border-white bg-white/50 text-slate-800 font-bold focus:border-primary transition-all outline-none"
                                            value={scheduleData.startTime}
                                            onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                                            required
                                        />
                                        <div className="flex items-center gap-2 bg-white/40 p-3 rounded-lg border border-white/60">
                                            <span className="text-lg">⏳</span>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Student Preference</span>
                                                <span className="text-xs text-primary font-black uppercase">
                                                    {selectedApp.preferred_day} • {selectedApp.preferred_time}
                                                    {selectedApp.preferred_time_exact && (
                                                        <span className="ml-1 text-secondary">({selectedApp.preferred_time_exact})</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Duration Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1 block">⏱ Duration</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full p-4 pl-5 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none focus:border-primary/20 transition-all"
                                                value={scheduleData.duration}
                                                onChange={(e) => setScheduleData({ ...scheduleData, duration: e.target.value })}
                                                min="15"
                                                max="120"
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 underline decoration-primary/20">MIN</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <div className="bg-slate-50 rounded-2xl p-4 border-2 border-dashed border-slate-200 w-full flex items-center justify-center text-xs text-slate-400 font-bold italic">
                                            Class ID: #{selectedApp.id}
                                        </div>
                                    </div>
                                </div>

                                {/* Zoom Toggle */}
                                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📹</span>
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Generate Live Class</p>
                                            <p className="text-[10px] text-slate-400 font-bold">Jitsi Meeting & Whiteboard Session</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={scheduleData.generateZoom}
                                            onChange={(e) => setScheduleData({ ...scheduleData, generateZoom: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {/* CTAs */}
                                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all w-full sm:w-auto"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-5 bg-gradient-to-r from-primary to-primary-600 text-white font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_15px_40px_rgba(var(--primary-rgb),0.5)] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                                    >
                                        {selectedApp.isEditMode ? (
                                            <>💾 Save Changes <span className="group-hover:translate-x-1 transition-transform">→</span></>
                                        ) : (
                                            <>🚀 Confirm Approval <span className="group-hover:translate-x-1 transition-transform">→</span></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )
            }

            {/* Student Management & Wallet Modal */}
            {
                showStudentModal && selectedStudent && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
                        <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="bg-slate-800 p-6 text-white relative">
                                <h3 className="text-xl font-bold">Manage Student</h3>
                                <p className="text-slate-400 text-xs mt-1">
                                    {selectedStudent.user.first_name} {selectedStudent.user.last_name} (@{selectedStudent.user.username})
                                </p>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Wallet Control Section */}
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">💰 Wallet Control</h4>
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-sm font-bold text-slate-600">Current Balance</span>
                                            <span className="text-xl font-black text-emerald-600">₦{parseFloat(selectedStudent.wallet_balance).toLocaleString()}</span>
                                        </div>

                                        <form onSubmit={handleWalletAction} className="space-y-3">
                                            <div className="flex gap-2">
                                                <select
                                                    className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-3 py-2 outline-none"
                                                    value={walletAction.type}
                                                    onChange={(e) => setWalletAction({ ...walletAction, type: e.target.value })}
                                                >
                                                    <option value="DEPOSIT">Credit (+)</option>
                                                    <option value="DEDUCTION">Debit (-)</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    placeholder="Amount"
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none ring-primary/20 focus:ring-2"
                                                    value={walletAction.amount}
                                                    onChange={(e) => setWalletAction({ ...walletAction, amount: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Description (e.g. Bank Transfer Ref)"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                                                value={walletAction.description}
                                                onChange={(e) => setWalletAction({ ...walletAction, description: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="submit"
                                                className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-700 transition-all"
                                            >
                                                Confirm {walletAction.type === 'DEPOSIT' ? 'Deposit' : 'Deduction'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Tutor Assignment Section */}
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">🎓 Assign Tutor & Schedule</h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Expert Tutor</label>
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                                onChange={(e) => {
                                                    const selectedTutor = tutors.find(t => String(t.id) === String(e.target.value));
                                                    setScheduleData({ 
                                                        ...scheduleData, 
                                                        tutorId: e.target.value,
                                                        tutorName: selectedTutor ? (selectedTutor.name || selectedTutor.full_name || 'Assigned Tutor') : ''
                                                    });
                                                }}
                                                value={scheduleData.tutorId}
                                                required
                                            >
                                                <option value="">Select Tutor to Assign...</option>
                                                {tutors.map(t => (
                                                    <option key={t.id} value={t.id}>{t.full_name || t.name} ({t.user?.email || t.email})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {scheduleData.tutorId && (
                                            <div className="space-y-3 pt-2 border-t border-slate-200 mt-1">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase">First Class Time</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold outline-none"
                                                            value={scheduleData.startTime}
                                                            onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase">Duration (Min)</label>
                                                        <input
                                                            type="number"
                                                            className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold outline-none"
                                                            value={scheduleData.duration}
                                                            onChange={(e) => setScheduleData({ ...scheduleData, duration: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between bg-white/60 p-2 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">📹</span>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">Generate Zoom</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={scheduleData.generateZoom}
                                                        onChange={(e) => setScheduleData({ ...scheduleData, generateZoom: e.target.checked })}
                                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                                    />
                                                </div>

                                                {!scheduleData.generateZoom && (
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase">Manual Meeting Link</label>
                                                        <input
                                                            type="url"
                                                            placeholder="https://zoom.us/j/..."
                                                            className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-[11px] font-bold outline-none"
                                                            value={scheduleData.meetingLink || ''}
                                                            onChange={(e) => setScheduleData({ ...scheduleData, meetingLink: e.target.value })}
                                                        />
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleAssignTutor(
                                                        selectedStudent.user.id,
                                                        scheduleData.tutorId,
                                                        scheduleData.meetingLink,
                                                        scheduleData.generateZoom,
                                                        scheduleData.startTime,
                                                        scheduleData.duration
                                                    )}
                                                    className="w-full bg-primary text-white py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:shadow-md transition-all mt-2"
                                                >
                                                    Confirm Assignment
                                                </button>
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            {selectedStudent.assigned_tutor_details ? `Current: ${selectedStudent.assigned_tutor_details.full_name}` : 'No tutor assigned yet.'}
                                        </div>
                                    </div>
                                </div>

                                {/* Profile & Form Edit Section */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">📝 Profile & Form Data</h4>
                                        <button
                                            onClick={() => setEditMode(!editMode)}
                                            className="text-[10px] font-bold text-primary uppercase hover:underline"
                                        >
                                            {editMode ? 'Cancel Edit' : 'Edit Form'}
                                        </button>
                                    </div>

                                    {editMode ? (
                                        <form onSubmit={handleUpdateStudent} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Class Type</label>
                                                    <select
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.class_type}
                                                        onChange={(e) => setStudentForm({ ...studentForm, class_type: e.target.value })}
                                                    >
                                                        <option value="ONE_ON_ONE">One-on-One</option>
                                                        <option value="GROUP">Group Class</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Days/Week</label>
                                                    <input
                                                        type="number"
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.days_per_week}
                                                        onChange={(e) => setStudentForm({ ...studentForm, days_per_week: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Course</label>
                                                    <input
                                                        type="text"
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.enrolled_course}
                                                        onChange={(e) => setStudentForm({ ...studentForm, enrolled_course: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Hours/Week</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.hours_per_week}
                                                        onChange={(e) => setStudentForm({ ...studentForm, hours_per_week: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Preferred Days</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Mon, Wed, Fri"
                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                    value={studentForm.preferred_days}
                                                    onChange={(e) => setStudentForm({ ...studentForm, preferred_days: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Preferred Time</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Morning, Evening"
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.preferred_time}
                                                        onChange={(e) => setStudentForm({ ...studentForm, preferred_time: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Exact Time (GMT)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 18:00"
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.preferred_time_exact}
                                                        onChange={(e) => setStudentForm({ ...studentForm, preferred_time_exact: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Learning Level</label>
                                                <select
                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                    value={studentForm.level}
                                                    onChange={(e) => setStudentForm({ ...studentForm, level: e.target.value })}
                                                >
                                                    <option value="PRIMARY">Primary School</option>
                                                    <option value="SECONDARY">Secondary School</option>
                                                    <option value="JAMB">JAMB Prep</option>
                                                    <option value="WAEC">WAEC Prep</option>
                                                    <option value="NECO">NECO Prep</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-primary uppercase">Live Class Link</label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://meet.jit.si/..."
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.meeting_link}
                                                        onChange={(e) => setStudentForm({ ...studentForm, meeting_link: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-secondary uppercase">Whiteboard Link</label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://excalidraw.com/..."
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                        value={studentForm.whiteboard_link}
                                                        onChange={(e) => setStudentForm({ ...studentForm, whiteboard_link: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black text-secondary uppercase">Assign Tutor</label>
                                                {selectedStudent.preferred_tutor_details && (
                                                    <p className="text-[9px] text-amber-600 font-bold mb-1">
                                                        Student preferred: {selectedStudent.preferred_tutor_details.name}
                                                    </p>
                                                )}
                                                <select
                                                    className="bg-white border border-secondary/30 rounded-lg px-2 py-1.5 text-xs font-bold"
                                                    value={studentForm.assigned_tutor}
                                                    onChange={(e) => setStudentForm({ ...studentForm, assigned_tutor: e.target.value })}
                                                >
                                                    <option value="">-- No Tutor Assigned --</option>
                                                    {tutors.map(t => (
                                                        <option key={t.id} value={t.user_id}>
                                                            {t.name} ({t.subjects?.slice(0, 15)}...)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={actionLoading}
                                                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-sm"
                                            >
                                                {actionLoading ? 'Saving...' : '💾 Save Changes'}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 relative group">
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-left">
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Class Type</span>
                                                    <span className="text-xs font-bold text-slate-700">{selectedStudent.class_type}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Course</span>
                                                    <span className="text-xs font-bold text-slate-700">{selectedStudent.enrolled_course || 'Not Set'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Days</span>
                                                    <span className="text-xs font-bold text-slate-700">{selectedStudent.days_per_week} / Week</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Hours</span>
                                                    <span className="text-xs font-bold text-slate-700">{selectedStudent.hours_per_week} / Session</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Level</span>
                                                    <span className="text-xs font-bold text-primary font-black">{selectedStudent.level || 'PRIMARY'}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Schedule Preference</span>
                                                    <span className="text-xs font-bold text-primary italic">
                                                        {selectedStudent.preferred_days || 'No specific days'} • {selectedStudent.preferred_time || 'Any time'} {selectedStudent.preferred_time_exact && `(${selectedStudent.preferred_time_exact})`}
                                                    </span>
                                                </div>
                                            </div>
                                            <a href={`${import.meta.env.VITE_API_BASE_URL}/admin/students/studentprofile/${selectedStudent.id}/change/`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-slate-400 font-bold hover:text-primary transition-colors mt-3 block text-center uppercase tracking-widest">
                                                Deep Edit in Django Admin ↗
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Tutor Management Modal */}
            {
                showTutorModal && selectedTutor && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
                        <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="bg-primary p-6 text-white relative">
                                <h3 className="text-xl font-bold">Tutor Oversight Panel</h3>
                                <p className="text-primary-100 text-xs mt-1">
                                    {selectedTutor.name} (@{selectedTutor.email})
                                </p>
                                <button
                                    onClick={() => setShowTutorModal(false)}
                                    className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Salary & Wallet Section */}
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
                                        <span>💰 Financial Management</span>
                                        <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full lowercase tracking-normal">
                                            Balance: ₦{parseFloat(selectedTutor.wallet_balance || 0).toLocaleString()}
                                        </span>
                                    </h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-2">Hourly Rate (₦)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                                    value={tutorActionState.amount}
                                                    onChange={(e) => setTutorActionState({ ...tutorActionState, amount: e.target.value })}
                                                />
                                                <button
                                                    onClick={() => {
                                                        setTutorActionState({ ...tutorActionState, action: 'UPDATE_RATE' });
                                                        handleTutorManagement();
                                                    }}
                                                    className="bg-primary text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase"
                                                >
                                                    Update
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-2">Wallet Action</label>
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold mb-2"
                                                value={tutorActionState.action}
                                                onChange={(e) => setTutorActionState({ ...tutorActionState, action: e.target.value })}
                                            >
                                                <option value="CREDIT">Bonus / Credit (+)</option>
                                                <option value="DEBIT">Deduction (-)</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Reason..."
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs mb-2"
                                                value={tutorActionState.description}
                                                onChange={(e) => setTutorActionState({ ...tutorActionState, description: e.target.value })}
                                            />
                                            <button
                                                onClick={handleTutorManagement}
                                                className="w-full bg-slate-800 text-white py-2 rounded-lg text-[9px] font-black uppercase"
                                            >
                                                Apply Wallet Action
                                            </button>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Custom Platform Share (%)</label>
                                                {selectedTutor.commission_percentage && (
                                                    <span className="text-[8px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase">Active Override</span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 15.00"
                                                    step="0.01"
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold placeholder:text-slate-300"
                                                    value={tutorActionState.commission_percentage}
                                                    onChange={(e) => setTutorActionState({ ...tutorActionState, commission_percentage: e.target.value })}
                                                />
                                                <button
                                                    onClick={() => {
                                                        setTutorActionState(prev => ({ ...prev, action: 'UPDATE_COMMISSION', amount: tutorActionState.commission_percentage }));
                                                        setTimeout(() => handleTutorManagement(), 10);
                                                    }}
                                                    className="bg-primary text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm flex items-center gap-2"
                                                >
                                                    <Save size={12} /> Set Rate
                                                </button>
                                            </div>
                                            <p className="text-[8px] text-slate-400 mt-2 italic font-medium leading-tight">
                                                Overrides Subject & Global defaults for this tutor ONLY. Leave blank to reset.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <hr className="border-slate-100" />

                                {/* Biography Section */}
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">✍️ Professional Biography</h4>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                        <textarea
                                            placeholder="Tutor's professional biography, teaching style, and expertise..."
                                            rows="6"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-sm font-medium leading-relaxed"
                                            value={tutorActionState.bio}
                                            onChange={(e) => setTutorActionState({ ...tutorActionState, bio: e.target.value })}
                                        />
                                        <button
                                            onClick={() => {
                                                setTutorActionState({ ...tutorActionState, action: 'UPDATE_BIO', description: tutorActionState.bio });
                                                setTimeout(() => handleTutorManagement(), 100);
                                            }}
                                            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                        >
                                            Update Biography
                                        </button>
                                    </div>
                                </section>

                                <hr className="border-slate-100" />

                                {/* Discipline Section */}
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">⚖️ Disciplinary Actions</h4>
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <select
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                                value={tutorActionState.disciplineType}
                                                onChange={(e) => setTutorActionState({ ...tutorActionState, disciplineType: e.target.value })}
                                            >
                                                <option value="WARNING">Warning Letter</option>
                                                <option value="QUERY">Query (Explanation Required)</option>
                                                <option value="EXPEL">Expulsion & Block Account</option>
                                            </select>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Subject (e.g. Absenteesim)"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                                            value={tutorActionState.disciplineSubject}
                                            onChange={(e) => setTutorActionState({ ...tutorActionState, disciplineSubject: e.target.value })}
                                        />
                                        <textarea
                                            placeholder="Content of the letter..."
                                            rows="4"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm"
                                            value={tutorActionState.disciplineContent}
                                            onChange={(e) => setTutorActionState({ ...tutorActionState, disciplineContent: e.target.value })}
                                        />
                                        <button
                                            onClick={() => {
                                                setTutorActionState({ ...tutorActionState, action: 'DISCIPLINE' });
                                                handleTutorManagement();
                                            }}
                                            className="w-full bg-red-600 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:scale-[1.02] transition-all"
                                        >
                                            Issue Official Letter
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Action Loading Indicator */}
            {
                actionLoading && (
                    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center animate-bounce-in">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-slate-800 font-bold text-sm">Processing...</p>
                        </div>
                    </div>
                )
            }

            {/* Tutor Profile Modal */}
            {selectedTutorApp && (
                <TutorProfileModal
                    app={selectedTutorApp}
                    actionLoading={actionLoading}
                    onClose={() => setSelectedTutorApp(null)}
                    onApprove={async () => {
                        if (!window.confirm('Approve this tutor?')) return;
                        try {
                            setActionLoading(true);
                            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${selectedTutorApp.id}/`, { action: 'APPROVE' }, { headers: getAuthHeader() });
                            alert('Tutor Approved!');
                            setSelectedTutorApp(null);
                            fetchTutorApps();
                        } catch (_err) { alert('Failed: ' + (_err.response?.data?.error || _err.message)); }
                        finally { setActionLoading(false); }
                    }}
                    onReject={async () => {
                        const reason = window.prompt('Rejection Reason:');
                        if (!reason) return;
                        try {
                            setActionLoading(true);
                            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${selectedTutorApp.id}/`, { action: 'REJECT', reason }, { headers: getAuthHeader() });
                            alert('Tutor Rejected');
                            setSelectedTutorApp(null);
                            fetchTutorApps();
                        } catch (_err) { alert('Failed: ' + (_err.response?.data?.error || _err.message)); }
                        finally { setActionLoading(false); }
                    }}
                    onReschedule={async () => {
                        const time = window.prompt('Update Interview Time (YYYY-MM-DDTHH:MM):', selectedTutorApp.interview_at ? new Date(selectedTutorApp.interview_at).toISOString().slice(0, 16) : '');
                        if (!time) return;
                        const link = window.prompt('Update Interview Link (leave blank to keep existing):') || selectedTutorApp.interview_link;
                        try {
                            setActionLoading(true);
                            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/admin/action/${selectedTutorApp.id}/`, {
                                action: 'INTERVIEW', interview_at: time, interview_link: link, generate_zoom: false
                            }, { headers: getAuthHeader() });
                            alert('Schedule Updated!');
                            fetchTutorApps();
                            setSelectedTutorApp(prev => ({ ...prev, interview_at: time, interview_link: link }));
                        } catch (_err) { alert('Failed: ' + (_err.response?.data?.error || _err.message)); }
                        finally { setActionLoading(false); }
                    }}
                />
            )}
                </div>
            </div>
        </div>
    );
};


const StatCard = ({ icon, label, value, sub, alert, color, isDark }) => (
    <div className={`${color} p-4 rounded-xl shadow-sm border flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300`}>
        <div className="flex justify-between items-start z-10">
            <div>
                <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-white/60' : 'text-slate-400'}`}>{label}</p>
                <div className={`text-2xl font-black font-display leading-none mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {value}
                </div>
                {sub && <p className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{sub}</p>}
            </div>
            <div className={`text-2xl ${isDark ? 'opacity-20' : 'opacity-10'} group-hover:scale-110 transition-transform`}>{icon}</div>
        </div>
        {alert && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse ring-4 ring-white/10"></div>
        )}
    </div>
);

const SidebarButton = ({ active, onClick, icon, label, badge }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-3 relative overflow-hidden group ${active
            ? 'bg-primary/20 text-primary shadow-lg shadow-primary/5'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
    >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>}
        <span className={`text-lg transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
        <span className="flex-1">{label}</span>
        {badge > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm animate-pulse min-w-[20px] text-center">
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </button>
);

const StatusBadge = ({ status }) => {
    const s = status?.toUpperCase();
    const styles = {
        PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        APPROVED: 'bg-green-100 text-green-800 border-green-200',
        REJECTED: 'bg-red-100 text-red-800 border-red-200',
        LIVE_STARTED: 'bg-emerald-600 text-white border-emerald-500 font-black shadow-emerald-200',
        LIVE_WAITING: 'bg-red-500 text-white border-red-400 animate-pulse font-black shadow-red-200',
        UPCOMING: 'bg-blue-50 text-blue-600 border-blue-100 font-bold',
        COMPLETED: 'bg-slate-100 text-slate-500 border-slate-200 font-bold',
        ENDED: 'bg-slate-50 text-slate-400 border-slate-100 italic'
    };

    const labels = {
        LIVE_STARTED: '● IN SESSION',
        LIVE_WAITING: '● WAITING TUTOR',
        UPCOMING: '🗓 UPCOMING',
        COMPLETED: '✅ COMPLETED',
        ENDED: '🏁 ENDED'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all duration-300 ${styles[s] || 'bg-slate-100 text-slate-600'}`}>
            {labels[s] || s}
        </span>
    );
};

const DocLink = ({ href, label, icon }) => href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all">
            <span>{icon}</span> {label}
        </a>
    ) : (
        <span className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-400 italic">
            {icon} {label} {'— Not uploaded'}
        </span>
    );

    const TutorProfileModal = ({ app, onClose, onApprove, onReject, onReschedule, actionLoading }) => {
    if (!app) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-10">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex items-center gap-4">
                    {app.image_url ? (
                        <img src={app.image_url} alt={app.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">👤</div>
                    )}
                    <div className="flex-1">
                        <h2 className="text-xl font-black">{app.name}</h2>
                        <p className="text-slate-300 text-sm">{app.email} {app.phone ? `· ${app.phone}` : ''}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            app.status === 'APPROVED' ? 'bg-green-500/20 text-green-300' :
                            app.status === 'INTERVIEW_SCHEDULED' ? 'bg-amber-500/20 text-amber-300' :
                            app.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                            'bg-slate-500/20 text-slate-300'
                        }`}>{app.status?.replace('_', ' ')}</span>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white text-2xl transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Experience', value: `${app.experience} Years` },
                            { label: 'Hourly Rate', value: `₦${parseFloat(app.hourly_rate || 0).toLocaleString()}/hr` },
                            { label: 'Age', value: app.age || '—' },
                            { label: 'Device', value: app.device || '—' },
                            { label: 'Network', value: app.network || '—' },
                            { label: 'Languages', value: app.languages || '—' },
                            { label: 'Online Exp', value: app.has_online_exp ? 'Yes' : 'No' },
                            { label: 'Qualification', value: app.qualification || '—' },
                            { label: 'Applied', value: app.created_at ? new Date(app.created_at).toLocaleDateString() : '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl p-3">
                                <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">{label}</div>
                                <div className="text-sm font-bold text-slate-800 mt-0.5">{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Subjects & Availability */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-2">Subjects to Teach</h4>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{app.subjects || '—'}</p>
                        </div>
                        <div>
                            <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-2">Availability</h4>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                                <strong>Days:</strong> {app.availability_days || '—'}<br />
                                <strong>Hours:</strong> {app.availability_hours || '—'}
                            </p>
                        </div>
                    </div>

                    {/* Bio */}
                    {app.bio && (
                        <div>
                            <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-2">Bio / Teaching Philosophy</h4>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed">{app.bio}</p>
                        </div>
                    )}

                    {/* Interview Info */}
                    {(app.status === 'INTERVIEW_SCHEDULED' || app.interview_at) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h4 className="text-[10px] text-amber-700 uppercase font-black tracking-wider mb-3">🗓 Interview Details</h4>
                            <div className="flex flex-wrap gap-4 items-center">
                                <div>
                                    <div className="text-[9px] text-amber-600 uppercase font-bold">Scheduled Time</div>
                                    <div className="text-sm font-bold text-amber-800">{app.interview_at ? new Date(app.interview_at).toLocaleString() : '—'}</div>
                                </div>
                                {app.interview_link && (
                                    <a href={app.interview_link} target="_blank" rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-colors shadow">
                                        🎥 Join Interview
                                    </a>
                                )}
                                <button onClick={onReschedule}
                                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-black uppercase hover:bg-violet-700 transition-colors shadow">
                                    ✏️ Update Schedule
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {app.status === 'REJECTED' && app.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <h4 className="text-[10px] text-red-600 uppercase font-black tracking-wider mb-1">Rejection Reason</h4>
                            <p className="text-sm text-red-700">{app.rejection_reason}</p>
                        </div>
                    )}

                    {/* Documents */}
                    <div>
                        <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-3">📎 Documents & Media</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <DocLink href={app.cv_url} label="CV / Resume" icon="📄" />
                            <DocLink href={app.credentials_url} label="Credentials / Certificate" icon="🎓" />
                            <DocLink href={app.recitation_url} label="Short Recitation (Audio)" icon="🎙" />
                            <DocLink href={app.intro_video_url} label="Introduction Video" icon="🎬" />
                            <DocLink href={app.appointment_letter_url} label="Appointment Letter" icon="📋" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {(app.status === 'APPLIED' || app.status === 'INTERVIEW_SCHEDULED') && (
                        <div className="flex gap-3 pt-2 border-t border-slate-100">
                            <button
                                disabled={actionLoading}
                                onClick={onApprove}
                                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase hover:bg-emerald-700 transition-colors shadow disabled:opacity-50"
                            >
                                ✅ Approve Tutor
                            </button>
                            <button
                                disabled={actionLoading}
                                onClick={onReject}
                                className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-black text-sm uppercase hover:bg-red-100 transition-colors"
                            >
                                ❌ Reject
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const WrappedAdminDashboard = () => (
    <AdminErrorBoundary>
        <AdminDashboard />
    </AdminErrorBoundary>
);

export default WrappedAdminDashboard;
