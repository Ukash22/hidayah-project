import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import axiosInstance from '../../api/axios';
import HidayahCard from '../common/HidayahCard';

export default function SubjectStep({ formData, setFormData, isTutor = false }) {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await axiosInstance.get('/api/programs/subjects/');
            setSubjects(res.data);
        } catch (err) {
            console.error("Failed to fetch subjects", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSubject = (subjectName) => {
        if (isTutor) {
            // Tutor logic uses a flat array of subject names
            const isSelected = formData.subjects.includes(subjectName);
            let newSubjects;
            if (isSelected) {
                newSubjects = formData.subjects.filter(s => s !== subjectName);
            } else {
                newSubjects = [...formData.subjects, subjectName];
            }
            setFormData(prev => ({ ...prev, subjects: newSubjects }));
        } else {
            // Student logic uses array of enrollment objects
            const isSelected = formData.subject_enrollments.some(s => s.subject === subjectName);
            let newEnrollments;
            if (isSelected) {
                newEnrollments = formData.subject_enrollments.filter(s => s.subject !== subjectName);
            } else {
                newEnrollments = [...formData.subject_enrollments, { subject: subjectName, preferred_tutor_id: null }];
            }
            setFormData(prev => ({ ...prev, subject_enrollments: newEnrollments }));
        }
    };

    const isSubjectSelected = (subjectName) => {
        if (isTutor) {
            return formData.subjects.includes(subjectName);
        }
        return formData.subject_enrollments.some(s => s.subject === subjectName);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Fetching available subjects...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>
                {isTutor ? 'Subjects you teach' : 'Academic selection'}
            </Text>
            <Text style={styles.label}>
                {isTutor ? 'Select the subjects you are qualified to tutor' : 'Select subjects to enroll in'}
            </Text>

            <View style={styles.grid}>
                {subjects.map((sub) => {
                    const isSelected = isSubjectSelected(sub.name);
                    return (
                        <TouchableOpacity
                            key={sub.name}
                            style={styles.cardWrapper}
                            onPress={() => toggleSubject(sub.name)}
                            activeOpacity={0.8}
                        >
                            <HidayahCard 
                                style={[
                                    styles.subjectCard,
                                    isSelected && styles.subjectCardSelected
                                ]}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={[
                                        styles.subjectText,
                                        isSelected && styles.subjectTextSelected
                                    ]}>
                                        {sub.name}
                                    </Text>
                                    {isSelected && <Text style={styles.check}>✓</Text>}
                                </View>
                                <Text style={styles.categoryText}>{sub.program_type}</Text>
                            </HidayahCard>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        marginTop: 50,
        alignItems: 'center',
    },
    loadingText: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textTransform: 'capitalize',
    },
    label: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    cardWrapper: {
        width: '50%',
        padding: 6,
    },
    subjectCard: {
        padding: 16,
        height: 100,
        justifyContent: 'space-between',
    },
    subjectCardSelected: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    subjectText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
    },
    subjectTextSelected: {
        color: '#10B981',
    },
    check: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    categoryText: {
        color: '#64748b',
        fontSize: 9,
        textTransform: 'uppercase',
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
