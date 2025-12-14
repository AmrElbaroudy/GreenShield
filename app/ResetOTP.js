import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// 1. Import useLocalSearchParams and useRouter
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_URLS } from './_config';

const ResetOTP = () => {
  const router = useRouter();
  
  
  const [otp, setOtp] = useState('');
  
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async () => {
    if (otp.length < 4) {
      setErrorMessage('Please enter a valid OTP');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log('Verifying OTP at:', API_URLS.RESET_PASSWORD);
      const payload = { 
        password: password, 
        resetPasswordOtp: otp, 
      };
      console.log('Payload:', payload);

      const response = await fetch(API_URLS.RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Verification Success:', data);
        

          Alert.alert("Success", "Reset done Successfuly Please log in.");
          router.replace('/'); 
        
      } else {
        setErrorMessage(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify Error:', error);
      setErrorMessage('Verification failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.contentContainer}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={60} color="#3E5936" />
          </View>

          <Text style={styles.title}>Verification Code</Text>


          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Code"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>
          <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
                  secureTextEntry
                />
              </View>
            </View>

          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5F0' },
  contentContainer: { flex: 1, padding: 25, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 50, left: 25, zIndex: 10 },
  iconContainer: { alignSelf: 'center', marginBottom: 20, backgroundColor: '#E9F2EA', padding: 20, borderRadius: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  inputContainer: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, height: 60,
    justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 20,
  },
  input: { fontSize: 24, textAlign: 'center', color: '#333', letterSpacing: 5, fontWeight: 'bold' },
  button: {
    backgroundColor: '#3E5936', borderRadius: 12, height: 55,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 3,
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: '#D88D28', textAlign: 'center', marginBottom: 15, fontWeight: '500' },
});

export default ResetOTP;