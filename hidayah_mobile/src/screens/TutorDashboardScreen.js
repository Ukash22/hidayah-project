import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import EarningsCard from '../components/tutor/EarningsCard';
import StudentListItem from '../components/tutor/StudentListItem';
import ClassCard from '../components/student/ClassCard';
import { LinearGradient } from 'expo-linear-gradient';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';
import HidayahCard from '../components/common/HidayahCard';

export default function TutorDashboardScreen() {
    const { user, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [schedule, setSchedule] = useState([]);
    const [students, setStudents] = useState([]);
    const [financials, setFinancials] = useState(null);
    const [activeTab, setActiveTab] = useState('schedule');

    const fetchData = async () => {
        try {
            const [schRes, studRes, finRes] = await Promise.all([
                axiosInstance.get('/api/classes/sessions/'),
                axiosInstance.get('/api/students/tutor/my-students/'),
                axiosInstance.get('/api/payments/tutor/financials/')
            ]);
            setSchedule(schRes.data);
            setStudents(studRes.data);
            setFinancials(finRes.data);
        } catch (err) {
            console.error("Tutor Dashboard Error", err);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const handleJoinClass = async (session) => {
        try {
            const isTrial = session.type === 'TRIAL';
            const endpoint = isTrial 
                ? `/api/classes/trial/${session.id}/start/`
                : `/api/classes/session/${session.id}/start/`;
            
            await axiosInstance.post(endpoint, {});
            const url = session.zoom_start_url || session.meeting_link || `https://meet.jit.si/HidayahClass-${session.id}`;
            Linking.openURL(url);
        } catch (err) {
            Alert.alert("Error", "Could not start session.");
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <LinearGradient
            colors={['#0a0c10', '#1E293B']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Salaam,</Text>
                    <Text style={styles.userName}>{user?.first_name || 'Tutor'}</Text>
                </View>
                <HidayahButton
                    variant="danger"
                    title="Logout"
                    onPress={logout}
                    style={styles.logoutBtn}
                    textStyle={{ fontSize: 10 }}
                />
            </View>

            <View style={styles.tabBar}>
                {['schedule', 'students', 'earnings'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
            >
                {activeTab === 'earnings' && <EarningsCard financials={financials} />}
                
                {activeTab === 'schedule' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Today's sessions</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{schedule.length}</Text>
                            </View>
                        </View>
                        {schedule.length > 0 ? (
                            schedule.map((cls, i) => (
                                <ClassCard key={i} session={cls} onJoin={handleJoinClass} />
                            ))
                        ) : (
                            <HidayahCard style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No classes scheduled for today.</Text>
                            </HidayahCard>
                        )}
                    </View>
                )}

                {activeTab === 'students' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>My active students</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{students.length}</Text>
                            </View>
                        </View>
                        {students.length > 0 ? (
                            students.map((stud, i) => (
                                <StudentListItem key={i} student={stud} onAction={() => {}} />
                            ))
                        ) : (
                            <HidayahCard style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No students assigned to you yet.</Text>
                            </HidayahCard>
                        )}
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0c10',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    greeting: {
        color: '#94a3b8',
        fontSize: 14,
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    tabBar: {
        flexDirection: 'row',
        padding: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginHorizontal: 24,
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#10B981',
    },
    tabText: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    activeTabText: {
        color: '#10B981',
    },
    scrollContent: {
        padding: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    countBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 12,
    },
    countText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderColor: '#334155',
    },
    emptyText: {
        color: '#64748b',
        fontSize: 14,
        fontStyle: 'italic',
    },
});
