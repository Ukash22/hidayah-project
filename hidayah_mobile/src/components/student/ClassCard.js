import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HidayahCard from '../common/HidayahCard';
import HidayahButton from '../common/HidayahButton';

export default function ClassCard({ session, onJoin }) {
    const date = new Date(session.scheduled_at);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString();

    return (
        <HidayahCard style={styles.card}>
            <View style={styles.header}>
                <View style={styles.subjectInfo}>
                    <Text style={styles.typeText}>{session.type || 'REGULAR'}</Text>
                    <Text style={styles.subjectText}>{session.course || session.subject}</Text>
                </View>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>UPCOMING</Text>
                </View>
            </View>

            <View style={styles.details}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Tutor</Text>
                    <Text style={styles.detailValue}>{session.tutor_name || 'TBA'}</Text>
                </View>
                <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.detailLabel}>When</Text>
                    <Text style={styles.detailValue}>{dateStr} @ {timeStr}</Text>
                </View>
            </View>

            <HidayahButton 
                title="Enter Classroom" 
                onPress={() => onJoin(session)} 
                variant="primary"
                style={styles.joinBtn}
            />
        </HidayahCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    typeText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    subjectText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    statusText: {
        color: '#3B82F6',
        fontSize: 9,
        fontWeight: 'black',
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    detailLabel: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    detailValue: {
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: 'bold',
    },
    joinBtn: {
        borderRadius: 14,
    },
});
