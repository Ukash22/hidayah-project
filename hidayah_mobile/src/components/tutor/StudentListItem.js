import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function StudentListItem({ student, onAction }) {
    return (
        <View style={styles.card}>
            <View style={styles.info}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{student.student_name?.[0] || 'S'}</Text>
                </View>
                <View>
                    <Text style={styles.name}>{student.student_name}</Text>
                    <Text style={styles.subject}>{student.course_interested || 'General Studies'}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.meta}>
                    <Text style={styles.metaLabel}>Attendance</Text>
                    <Text style={styles.metaValue}>{student.attendance_count || 0} Sessions</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onAction(student)}>
                    <Text style={styles.actionText}>Report</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    info: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    subject: {
        color: '#64748b',
        fontSize: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
    },
    metaLabel: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    metaValue: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    actionText: {
        color: '#ef4444',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
