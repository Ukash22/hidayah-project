import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import HidayahCard from '../common/HidayahCard';
import HidayahButton from '../common/HidayahButton';

export default function ChildCard({ child, onImpersonate }) {
    const isPaid = child.payment_status === 'PAID';

    return (
        <HidayahCard style={styles.card}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>🧒</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{child.full_name || child.user_details?.first_name + ' ' + (child.user_details?.last_name || '')}</Text>
                    <Text style={styles.admissionId}>ID: {child.user_details?.admission_number}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                    <Text style={[styles.statusText, { color: isPaid ? '#10B981' : '#F59E0B' }]}>
                        {child.payment_status}
                    </Text>
                </View>
            </View>

            <View style={styles.grid}>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Course</Text>
                    <Text style={styles.value} numberOfLines={1}>{child.enrolled_course || 'Not Assigned'}</Text>
                </View>
                <View style={styles.gridItem}>
                    <Text style={styles.label}>Tutor</Text>
                    <Text style={styles.value} numberOfLines={1}>
                        {child.assigned_tutor_details ? child.assigned_tutor_details.full_name : 'Pending'}
                    </Text>
                </View>
            </View>

            {child.meeting_link && (
                <HidayahButton 
                    title="Join Live Class ↗"
                    onPress={() => Linking.openURL(child.meeting_link)}
                    variant="primary"
                    style={styles.joinBtn}
                    textStyle={{ fontSize: 11 }}
                />
            )}

            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerLabel}>Weekly Schedule</Text>
                    <Text style={styles.footerValue}>{child.days_per_week} days ({child.preferred_days || 'N/A'})</Text>
                </View>
                <HidayahButton 
                    title="View Dashboard 👁️" 
                    onPress={() => onImpersonate(child.id)}
                    variant="secondary"
                    style={styles.viewBtn}
                    textStyle={{ fontSize: 10 }}
                />
            </View>
        </HidayahCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarEmoji: {
        fontSize: 22,
    },
    info: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    admissionId: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 9,
        fontWeight: 'black',
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    gridItem: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    label: {
        color: '#64748b',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    value: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    joinBtn: {
        marginBottom: 16,
        paddingVertical: 12,
        borderRadius: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    footerLabel: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    footerValue: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    viewBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
});
