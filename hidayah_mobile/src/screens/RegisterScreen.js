import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// Step components
import AccountStep from '../components/Register/AccountStep';
import ProfileStep from '../components/Register/ProfileStep';
import PreferencesStep from '../components/Register/PreferencesStep';
import SubjectStep from '../components/Register/SubjectStep';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';

export default function RegisterScreen({ navigation }) {
    const { register, login } = useAuth();
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
        level: 'PRIMARY',
        classType: 'ONE_ON_ONE',
        schedule: [],
        subject_enrollments: []
    });

    const handleNext = () => {
        if (step === 1) {
            if (!formData.username || !formData.email || !formData.password) {
                return Alert.alert("Error", "Please fill in all account details.");
            }
            if (formData.password !== formData.confirmPassword) {
                return Alert.alert("Error", "Passwords do not match.");
            }
        }
        if (step === 2) {
            if (!formData.firstName || !formData.dob || !formData.address) {
                return Alert.alert("Error", "Please fill in all profile details.");
            }
        }
        if (step < 4) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const getRateByLevel = (level) => {
        if (['JAMB', 'WAEC', 'NECO'].includes(level)) return 2500;
        if (level === 'SECONDARY' || level === 'JUNIOR_WAEC') return 2000;
        return 1500;
    };

    const handleSubmit = async () => {
        if (formData.subject_enrollments.length === 0) {
            return Alert.alert("Error", "Please select at least one subject.");
        }

        setIsLoading(true);
        try {
            const baseRate = getRateByLevel(formData.level);
            const totalToPay = baseRate * formData.subject_enrollments.length * 4;

            const payload = {
                username: formData.username.trim().toLowerCase(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: 'STUDENT',
                first_name: formData.firstName,
                last_name: formData.lastName,
                country: formData.country,
                phone: formData.phone,
                dob: formData.dob,
                gender: formData.gender,
                address: formData.address,
                class_type: formData.classType,
                level: formData.level,
                subject_enrollments: formData.subject_enrollments,
                total_amount: totalToPay,
                timezone: 'Africa/Lagos',
            };

            await register(payload);
            await login(payload.username, payload.password);
            
            Alert.alert(
                "Admission Confirmed", 
                "Your account has been created. Welcome to Hidayah!",
                [{ text: "Continue", onPress: () => {} }]
            );
        } catch (err) {
            console.error("Registration failed", err.response?.data);
            Alert.alert("Registration Failed", err.response?.data?.detail || "Something went wrong.");
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
                    <Text style={styles.headerTitle}>Student Admission</Text>
                    <Text style={styles.stepIndicator}>Step {step} of 4</Text>
                </View>
                <View style={styles.progressBar}>
                    {[1, 2, 3, 4].map(s => (
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
                {step === 3 && <PreferencesStep formData={formData} setFormData={setFormData} />}
                {step === 4 && <SubjectStep formData={formData} setFormData={setFormData} />}
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
                    variant="primary"
                    title={step === 4 ? "Complete" : "Next"}
                    onPress={step === 4 ? handleSubmit : handleNext}
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
        flex: 1,
        paddingVertical: 12,
    },
});
