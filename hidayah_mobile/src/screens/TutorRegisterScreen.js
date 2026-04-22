import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary } from '../services/cloudinary';
import { LinearGradient } from 'expo-linear-gradient';

// Step components
import AccountStep from '../components/Register/AccountStep';
import ProfileStep from '../components/Register/ProfileStep';
import SubjectStep from '../components/Register/SubjectStep';
import ExperienceFields from '../components/tutor/register/ExperienceFields';
import TechnicalFields from '../components/tutor/register/TechnicalFields';
import AvailabilityManager from '../components/tutor/register/AvailabilityManager';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';

export default function TutorRegisterScreen({ navigation }) {
    const { register } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        dob: '',
        gender: 'Male',
        country: 'Nigeria',
        phone: '',
        address: '',
        experienceYears: '0',
        university: '',
        qualification: '',
        subjects: [],
        hourlyRate: '1500',
        deviceType: 'COMPUTER',
        networkType: 'STABLE_WIFI',
        availabilitySlots: [{ day: 'Monday', startTime: '08:00', endTime: '12:00' }],
        cvFile: null,
        introVideoFile: null,
        recitationFile: null
    });

    const handleNext = () => {
        if (step === 1) {
            if (!formData.username || !formData.email || !formData.password) {
                return Alert.alert("Error", "Please fill in all account details.");
            }
        }
        if (step < 6) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const handleSubmit = async () => {
        if (formData.subjects.length === 0) {
            return Alert.alert("Error", "Please select at least one subject to teach.");
        }
        if (!formData.cvFile || !formData.introVideoFile || !formData.recitationFile) {
            return Alert.alert("Required Files", "Please upload your CV, Intro Video, and Recitation.");
        }

        setIsLoading(true);
        try {
            Alert.alert("Uploading", "Please wait while we upload your media files...");
            
            const [cvUrl, videoUrl, recUrl] = await Promise.all([
                uploadToCloudinary(formData.cvFile, 'tutor_credentials'),
                uploadToCloudinary(formData.introVideoFile, 'tutor_videos'),
                uploadToCloudinary(formData.recitationFile, 'tutor_recitations')
            ]);

            const payload = {
                ...formData,
                role: 'TUTOR',
                first_name: formData.firstName,
                last_name: formData.lastName,
                experience_years: formData.experienceYears,
                subjects_to_teach: formData.subjects.join(', '),
                availability_hours: formData.availabilitySlots.map(s => `${s.day}: ${s.startTime}-${s.endTime}`).join(', '),
                cv_url: cvUrl,
                intro_video_url: videoUrl,
                short_recitation_url: recUrl
            };

            await register(payload);
            Alert.alert(
                "Application Submitted", 
                "Your tutor application is under review. We will contact you soon.",
                [{ text: "Great", onPress: () => navigation.navigate('Login') }]
            );
        } catch (err) {
            Alert.alert("Error", err.message || "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0a0c10', '#1E293B']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Tutor Application</Text>
                    <Text style={styles.stepIndicator}>Step {step} of 6</Text>
                </View>
                <View style={styles.progressBar}>
                    {[1, 2, 3, 4, 5, 6].map(s => (
                        <View 
                            key={s} 
                            style={[
                                styles.progressSegment, 
                                s <= step && styles.activeSegment
                            ]} 
                        />
                    ))}
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {step === 1 && <AccountStep formData={formData} setFormData={setFormData} />}
                {step === 2 && <ProfileStep formData={formData} setFormData={setFormData} />}
                {step === 3 && <ExperienceFields formData={formData} setFormData={setFormData} />}
                {step === 4 && <SubjectStep formData={formData} setFormData={setFormData} isTutor={true} />}
                {step === 5 && <TechnicalFields formData={formData} setFormData={setFormData} />}
                {step === 6 && <AvailabilityManager formData={formData} setFormData={setFormData} />}
            </ScrollView>

            <View style={styles.footer}>
                <HidayahButton
                    variant="secondary"
                    title={step === 1 ? "Cancel" : "Back"}
                    onPress={handleBack}
                    style={styles.backBtn}
                    disabled={isLoading}
                    textStyle={{ fontSize: 12 }}
                />
                
                <HidayahButton
                    variant="emerald"
                    title={step === 6 ? "Submit Application" : "Next Step"}
                    onPress={step === 6 ? handleSubmit : handleNext}
                    loading={isLoading}
                    style={styles.nextBtn}
                    textStyle={{ fontSize: 12 }}
                />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    stepIndicator: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    progressBar: {
        flexDirection: 'row',
        gap: 8,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#1E293B',
    },
    activeSegment: {
        backgroundColor: '#10B981',
    },
    scrollContent: {
        padding: 24,
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        gap: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    backBtn: {
        flex: 1,
        paddingVertical: 12,
    },
    nextBtn: {
        flex: 2,
        paddingVertical: 12,
    },
});
