import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform, 
    ScrollView, 
    Alert,
    TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';
import HidayahInput from '../components/common/HidayahInput';
import HidayahCard from '../components/common/HidayahCard';

export default function LoginScreen() {
    const navigation = useNavigation();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter both username and password.');
            return;
        }

        setIsLoading(true);
        try {
            await login(username, password);
        } catch (error) {
            console.error('Login error', error);
            Alert.alert('Login Failed', 'Invalid username or password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0a0c10', '#1E293B']}
            style={styles.container}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.logoBadge}>
                        <Text style={styles.logoEmoji}>🕌</Text>
                    </View>
                    
                    <Text style={styles.brandTitle}>Hidayah</Text>
                    <Text style={styles.brandSubtitle}>Illuminating Knowledge</Text>

                    <HidayahCard elevated style={styles.card}>
                        <Text style={styles.cardTitle}>Sign In</Text>
                        
                        <HidayahInput
                            label="Username"
                            placeholder="Enter your username"
                            value={username}
                            onChangeText={setUsername}
                        />
                        
                        <HidayahInput
                            label="Password"
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        
                        <HidayahButton
                            title="Continue"
                            onPress={handleLogin}
                            loading={isLoading}
                        />

                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>Forgot your password?</Text>
                        </TouchableOpacity>
                    </HidayahCard>

                    <View style={styles.footer}>
                        <Text style={styles.footerLabel}>New to our platform?</Text>
                        <View style={styles.linkRow}>
                            <HidayahButton
                                variant="secondary"
                                title="Admission"
                                onPress={() => navigation.navigate('Register')}
                                style={styles.linkBtn}
                                textStyle={{ fontSize: 10 }}
                            />
                            <HidayahButton
                                variant="secondary"
                                title="Become Tutor"
                                onPress={() => navigation.navigate('TutorRegister')}
                                style={styles.linkBtn}
                                textStyle={{ fontSize: 10 }}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoBadge: {
        width: 70,
        height: 70,
        borderRadius: 22,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    logoEmoji: {
        fontSize: 32,
    },
    brandTitle: {
        fontSize: 38,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        letterSpacing: -1,
    },
    brandSubtitle: {
        fontSize: 10,
        color: '#94a3b8',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
        marginBottom: 32,
    },
    card: {
        padding: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 24,
    },
    forgotBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    forgotText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerLabel: {
        color: '#475569',
        fontSize: 12,
        marginBottom: 12,
        fontWeight: 'bold',
    },
    linkRow: {
        flexDirection: 'row',
        gap: 12,
    },
    linkBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
});
