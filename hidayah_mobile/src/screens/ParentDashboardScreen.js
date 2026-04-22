import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import ChildCard from '../components/parent/ChildCard';
import { LinearGradient } from 'expo-linear-gradient';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';
import HidayahCard from '../components/common/HidayahCard';

export default function ParentDashboardScreen() {
    const { user, logout, impersonateChild } = useAuth();
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const res = await axiosInstance.get('/api/parents/dashboard/child_dashboard/');
            setChildren(res.data);
        } catch (err) {
            console.error("Parent Dashboard Error", err);
            Alert.alert("Error", "Could not fetch children's data.");
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

    const handleImpersonate = async (childId) => {
        try {
            setIsLoading(true);
            await impersonateChild(childId);
        } catch (err) {
            Alert.alert("Error", "Secure connection failed.");
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.loadingText}>Loading Parent Portal...</Text>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={['#0a0c10', '#1E293B']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.profileBadge}>
                        <Text style={styles.badgeText}>{user?.first_name?.[0]}</Text>
                    </View>
                    <HidayahButton
                        variant="danger"
                        title="Logout"
                        onPress={logout}
                        style={styles.logoutBtn}
                        textStyle={{ fontSize: 10 }}
                    />
                </View>
                <Text style={styles.welcome}>Salaam,</Text>
                <Text style={styles.userName}>{user?.first_name} {user?.last_name || ''}</Text>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
            >
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionDot} />
                    <Text style={styles.sectionTitle}>My registered children</Text>
                </View>

                {children.length > 0 ? (
                    children.map((child, i) => (
                        <ChildCard 
                            key={i} 
                            child={child} 
                            onImpersonate={handleImpersonate} 
                        />
                    ))
                ) : (
                    <HidayahCard style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>📂</Text>
                        <Text style={styles.emptyText}>No children found.</Text>
                        <HidayahButton
                            variant="warning"
                            title="Register a New Student"
                            onPress={() => {}}
                            style={styles.addBtn}
                        />
                    </HidayahCard>
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
    loadingText: {
        color: '#F59E0B',
        marginTop: 12,
        fontWeight: 'bold',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    logoutBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    welcome: {
        color: '#94a3b8',
        fontSize: 14,
    },
    userName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionDot: {
        width: 4,
        height: 16,
        backgroundColor: '#F59E0B',
        borderRadius: 2,
        marginRight: 8,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    emptyBox: {
        paddingVertical: 60,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderColor: '#334155',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 14,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    addBtn: {
        width: '100%',
    },
});
