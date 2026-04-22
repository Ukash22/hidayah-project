import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import HidayahInput from '../../common/HidayahInput';
import HidayahCard from '../../common/HidayahCard';

export default function ExperienceFields({ formData, setFormData }) {
    const [isPicking, setIsPicking] = useState(false);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickDocument = async () => {
        try {
            setIsPicking(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setFormData(prev => ({
                    ...prev,
                    cvFile: {
                        uri: asset.uri,
                        name: asset.name,
                        type: asset.mimeType || 'application/pdf'
                    }
                }));
            }
        } catch (err) {
            console.error("Document pick error", err);
        } finally {
            setIsPicking(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Professional background</Text>
            
            <HidayahInput
                label="Years of Experience"
                placeholder="e.g. 5"
                value={formData.experienceYears}
                onChangeText={(val) => handleChange('experienceYears', val)}
                keyboardType="numeric"
            />

            <HidayahInput
                label="University / Institution"
                placeholder="e.g. Al-Azhar University"
                value={formData.university}
                onChangeText={(val) => handleChange('university', val)}
            />

            <HidayahInput
                label="Qualification / Degree"
                placeholder="e.g. B.Sc. Islamic Studies"
                value={formData.qualification}
                onChangeText={(val) => handleChange('qualification', val)}
            />

            <View style={styles.uploadSection}>
                <Text style={styles.label}>Credentials & CV</Text>
                <TouchableOpacity 
                    onPress={pickDocument}
                    disabled={isPicking}
                    activeOpacity={0.8}
                >
                    <HidayahCard 
                        style={[
                            styles.uploadCard, 
                            formData.cvFile && styles.uploadSuccess
                        ]}
                    >
                        {isPicking ? (
                            <ActivityIndicator color="#10B981" />
                        ) : (
                            <View style={styles.uploadContent}>
                                <Text style={styles.uploadIcon}>{formData.cvFile ? '✅' : '📄'}</Text>
                                <View style={styles.uploadInfo}>
                                    <Text style={[styles.uploadTitle, formData.cvFile && { color: '#10B981' }]}>
                                        {formData.cvFile ? 'CV Uploaded' : 'Select CV / Resume'}
                                    </Text>
                                    <Text style={styles.uploadSubtitle}>
                                        {formData.cvFile ? formData.cvFile.name : 'PDF, DOC or DOCX (Max 10MB)'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </HidayahCard>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 24,
        textTransform: 'capitalize',
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    uploadSection: {
        marginTop: 8,
    },
    uploadCard: {
        padding: 20,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    uploadSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderColor: '#10B981',
        borderStyle: 'solid',
    },
    uploadContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadIcon: {
        fontSize: 28,
        marginRight: 16,
    },
    uploadInfo: {
        flex: 1,
    },
    uploadTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    uploadSubtitle: {
        color: '#64748b',
        fontSize: 11,
    },
});
