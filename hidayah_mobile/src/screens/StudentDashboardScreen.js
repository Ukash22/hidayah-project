import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import StatCard from '../components/student/StatCard';
import ClassCard from '../components/student/ClassCard';
import { LinearGradient } from 'expo-linear-gradient';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';
import HidayahCard from '../components/common/HidayahCard';

export default function StudentDashboardScreen() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [profRes, classRes] = await Promise.all([
                axiosInstance.get('/api/students/me/'),
                axiosInstance.get('/api/classes/sessions/')
            ]);
            setProfile(profRes.data);
            setClasses(Array.isArray(classRes.data) ? classRes.data : classRes.data.classes || []);
        } catch (err) {
            console.error("Dashboard fetch failed", err);
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

    const handleJoinClass = async (cls) => {
        if (!profile || parseFloat(profile.wallet_balance) <= 0) {
            return Alert.alert("Wallet Empty", "Please fund your account to join classes.");
        }

        try {
            const res = await axiosInstance.post(`/api/student/classes/${cls.id}/join/`, {});
            if (res.data.join_url) {
                Linking.openURL(res.data.join_url);
            } else {
                Alert.alert("Link Missing", "No meeting link found for this class.");
            }
        } catch (err) {
            Alert.alert("Error", "Unable to join class. Please try again.");
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
                    <Text style={styles.userName}>{user?.first_name || user?.username || 'Student'}</Text>
                </View>
                <HidayahButton
                    variant="danger"
                    title="Logout"
                    onPress={logout}
                    style={styles.logoutBtn}
                    textStyle={{ fontSize: 10 }}
                />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
            >
                <View style={styles.statsGrid}>
                    <StatCard 
                        label="Wallet Balance" 
                        value={`₦${parseFloat(profile?.wallet_balance || 0).toLocaleString()}`} 
                        icon="💰" 
                        color="#10B981" 
                    />
                    <StatCard 
                        label="Active Subjects" 
                        value={profile?.enrollments?.length || 0} 
                        icon="📚" 
                        color="#3B82F6" 
                    />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
                    <HidayahButton
                        variant="secondary"
                        title="History"
                        onPress={() => {}}
                        style={styles.historyBtn}
                        textStyle={{ fontSize: 9 }}
                    />
                </View>

                {classes.length > 0 ? (
                    classes.map((cls, i) => (
                        <ClassCard key={i} session={cls} onJoin={handleJoinClass} />
                    ))
                ) : (
                    <HidayahCard style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No upcoming classes scheduled.</Text>
                    </HidayahCard>
                )}

                <View style={styles.quickAccess}>
                    <Text style={styles.sectionTitle}>Resources Hub</Text>
                    <View style={styles.grid}>
                        <ResourceBtn icon="📖" label="Library" />
                        <ResourceBtn icon="📝" label="Exams" />
                        <ResourceBtn icon="🤖" label="AI Hub" />
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const ResourceBtn = ({ icon, label }) => (
    <HidayahCard style={styles.gridBtn}>
        <Text style={styles.gridBtnIcon}>{icon}</Text>
        <Text style={styles.gridBtnText}>{label}</Text>
    </HidayahCard>
);

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
    scrollContent: {
        padding: 24,
    },
    statsGrid: {
        flexDirection: 'column',
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    historyBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
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
    quickAccess: {
        marginTop: 32,
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 16,
    },
    gridBtn: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        borderRadius: 20,
    },
    gridBtnIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    gridBtnText: {
        color: '#f1f5f9',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});
