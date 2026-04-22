import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import HidayahCard from '../../common/HidayahCard';

const devices = ['COMPUTER', 'TABLET', 'SMARTPHONE'];
const networks = ['FIBER', '4G_LTE', 'STABLE_WIFI', 'STARLINK'];

export default function TechnicalFields({ formData, setFormData }) {
    const [isPicking, setIsPicking] = useState(false);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pickMedia = async (type) => {
        try {
            setIsPicking(true);
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera roll permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setFormData(prev => ({
                    ...prev,
                    [type === 'video' ? 'introVideoFile' : 'recitationFile']: {
                        uri: asset.uri,
                        name: asset.fileName || `${type}_upload.mp4`,
                        type: asset.mimeType || 'video/mp4'
                    }
                }));
            }
        } catch (err) {
            console.error("Media pick error", err);
        } finally {
            setIsPicking(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Technical requirements</Text>
            
            <Text style={styles.label}>Primary Teaching Device</Text>
            <View style={styles.chipContainer}>
                {devices.map((dev) => (
                    <TouchableOpacity
                        key={dev}
                        style={[
                            styles.chip,
                            formData.deviceType === dev && styles.chipSelected
                        ]}
                        onPress={() => handleChange('deviceType', dev)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.chipText,
                            formData.deviceType === dev && styles.chipTextSelected
                        ]}>
                            {dev.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Internet Connectivity</Text>
            <View style={styles.chipContainer}>
                {networks.map((net) => (
                    <TouchableOpacity
                        key={net}
                        style={[
                            styles.chip,
                            formData.networkType === net && styles.chipSelected
                        ]}
                        onPress={() => handleChange('networkType', net)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.chipText,
                            formData.networkType === net && styles.chipTextSelected
                        ]}>
                            {net.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.uploadSection}>
                <Text style={styles.label}>Introduction Video</Text>
                <TouchableOpacity 
                    onPress={() => pickMedia('video')}
                    disabled={isPicking}
                    activeOpacity={0.8}
                >
                    <HidayahCard 
                        style={[
                            styles.uploadCard, 
                            formData.introVideoFile && styles.uploadSuccess
                        ]}
                    >
                        {isPicking ? (
                            <ActivityIndicator color="#3B82F6" />
                        ) : (
                            <View style={styles.uploadContent}>
                                <Text style={styles.uploadIcon}>{formData.introVideoFile ? '✅' : '🎥'}</Text>
                                <View style={styles.uploadInfo}>
                                    <Text style={[styles.uploadTitle, formData.introVideoFile && { color: '#10B981' }]}>
                                        {formData.introVideoFile ? 'Video uploaded' : 'Select Intro Video'}
                                    </Text>
                                    <Text style={styles.uploadSubtitle}>
                                        {formData.introVideoFile ? formData.introVideoFile.name : 'MP4, MOV (Max 50MB)'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </HidayahCard>
                </TouchableOpacity>
            </View>

            <View style={[styles.uploadSection, { marginTop: 24 }]}>
                <Text style={styles.label}>Short Recitation</Text>
                <TouchableOpacity 
                    onPress={() => pickMedia('recitation')}
                    disabled={isPicking}
                    activeOpacity={0.8}
                >
                    <HidayahCard 
                        style={[
                            styles.uploadCard, 
                            { borderColor: 'rgba(139, 92, 246, 0.3)' },
                            formData.recitationFile && styles.uploadSuccess
                        ]}
                    >
                        {isPicking ? (
                            <ActivityIndicator color="#8B5CF6" />
                        ) : (
                            <View style={styles.uploadContent}>
                                <Text style={styles.uploadIcon}>{formData.recitationFile ? '✅' : '🎙️'}</Text>
                                <View style={styles.uploadInfo}>
                                    <Text style={[styles.uploadTitle, { color: '#8B5CF6' }, formData.recitationFile && { color: '#10B981' }]}>
                                        {formData.recitationFile ? 'Recitation uploaded' : 'Select Recitation'}
                                    </Text>
                                    <Text style={styles.uploadSubtitle}>
                                        {formData.recitationFile ? formData.recitationFile.name : 'Audio/Video recording'}
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
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 32,
        gap: 10,
    },
    chip: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    chipSelected: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    chipText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    chipTextSelected: {
        color: '#fff',
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
