import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator, // Added for loading state
  Modal,
  ScrollView,
  Platform, 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';

// Custom Components
import CustomHeader from '../../components/CustomHeader';
import LeafMask from '../../components/LeafMask';

// Config & Auth
import { API_URLS } from '../_config';
import { useAuth } from '../context/AuthContext';

export default function CameraScreen() {
  const router = useRouter();
  const authContext = useAuth(); 
  
  if (!authContext) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3E5936" />
      </View>
    );
  }

  const { userToken, signOut } = authContext;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [isUploading, setIsUploading] = useState(false);
  
  // 2. Add State for Result Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Camera" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off-outline" size={60} color="#666" />
          <Text style={styles.message}>We need your permission to show the camera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
        });
        setCapturedImage(photo?.uri || null);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setCapturedImage(result.assets[0].uri);
  };

  // --- UPLOAD LOGIC ---
  const handleUsePhoto = async () => {
    if (!capturedImage) return;

    setIsUploading(true);

    try {
      let uri = capturedImage;
      if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
        uri = `file://${uri}`;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      });

      console.log('Uploading to:', API_URLS.UPLOAD_SCAN);
      
      const response = await fetch(API_URLS.UPLOAD_SCAN, {
        method: 'POST',
        headers: {
          'Authorization': `bearer ${userToken}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('Raw Server Response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server Error (${response.status}): ${responseText.substring(0, 100)}`);
      }

      if (response.ok) {
        console.log('Upload Success:', data);
        
        // 3. Instead of navigating, set state and open Modal
        setScanResult(data.data); // Save result data
        setModalVisible(true);    // Show popup
        setCapturedImage(null);   // Clear preview
        
      } else {
        console.error('Upload Failed:', data);
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please log in again.", [
            { text: "OK", onPress: () => signOut() }
          ]);
        } else {
          Alert.alert("Upload Failed", data.message || "Something went wrong.");
        }
      }
    } catch (error) {
      console.error('Network Error:', error);
      Alert.alert("Error", error.message || "Could not connect to server.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => setCapturedImage(null);
  const toggleFlash = () => setFlash(cur => (cur === 'off' ? 'on' : 'off'));
  const toggleCameraType = () => setFacing(cur => (cur === 'back' ? 'front' : 'back'));
  
  // Helper for severity color
  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return '#D32F2F'; // Red
      case 'MEDIUM': return '#F57C00'; // Orange
      case 'LOW': return '#388E3C'; // Green
      default: return '#999';
    }
  };

  // --- RENDER PREVIEW MODE ---
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Review Scan" />
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          <View style={styles.previewControls}>
            {isUploading ? (
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color="#3E5936" />
                <Text style={{ color: '#fff', marginTop: 10 }}>Analyzing...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={[styles.controlButton, styles.retakeButton]} onPress={handleRetake}>
                  <Ionicons name="refresh-outline" size={24} color="#333" />
                  <Text style={styles.controlText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, styles.useButton]} onPress={handleUsePhoto}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  <Text style={[styles.controlText, { color: '#fff' }]}>Use Photo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  // --- MAIN RENDER ---
  return (
    <View style={styles.container}>
      <CustomHeader title="New Scan" />
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
          
          <LeafMask />
          
          <SafeAreaView style={styles.overlayContainer}>
            <View style={styles.topControls}>
              <TouchableOpacity onPress={toggleFlash} style={styles.iconButton}>
                <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCameraType} style={styles.iconButton}>
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.guideContainer}>
              <Text style={styles.guideText}>Center leaf in the shape</Text>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
                <Ionicons name="images-outline" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={takePicture} style={styles.shutterButtonOuter}>
                <View style={styles.shutterButtonInner} />
              </TouchableOpacity>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </CameraView>

        {/* 4. RESULT MODAL (POPUP) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Analysis Result</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              {scanResult && (
                <ScrollView contentContainerStyle={styles.resultScroll}>
                  
                  {/* Scanned Image */}
                  <Image source={{ uri: scanResult.image?.url }} style={styles.resultImage} />

                  {/* Disease Info */}
                  <View style={styles.resultInfo}>
                    <View style={styles.diseaseHeader}>
                      <View>
                        <Text style={styles.diseaseName}>{scanResult.prediction.disease.nameEn}</Text>
                        <Text style={styles.diseaseNameAr}>{scanResult.prediction.disease.nameAr}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: getSeverityColor(scanResult.prediction.disease.severity) }]}>
                        <Text style={styles.badgeText}>{scanResult.prediction.disease.severity}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.confidenceText}>
                      Confidence: {Math.round(scanResult.prediction.confidence * 100)}%
                    </Text>

                    <View style={styles.divider} />

                    {/* Treatments List */}
                    <Text style={styles.treatmentHeaderTitle}>Recommended Treatments</Text>
                    {scanResult.prediction.details?.map((item, index) => (
                      <View key={item.id || index} style={styles.treatmentCard}>
                        <View style={styles.cardHeader}>
                          <Ionicons 
                            name={item.isChemical ? "flask" : "leaf"} 
                            size={20} 
                            color={item.isChemical ? "#D32F2F" : "#388E3C"} 
                          />
                          <Text style={styles.treatmentTitle}>{item.titleEn}</Text>
                        </View>
                        <Text style={styles.treatmentDesc}>{item.descriptionEn}</Text>
                        {item.descriptionAr && (
                          <Text style={[styles.treatmentDesc, styles.rtlText]}>{item.descriptionAr}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Close Button at Bottom */}
              <TouchableOpacity 
                style={styles.closeModalButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeModalText}>Done</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F5F0', padding: 20 },
  message: { textAlign: 'center', marginBottom: 20, marginTop: 20, fontSize: 16, color: '#333' },
  permissionButton: { backgroundColor: '#3E5936', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cameraContainer: { flex: 1, borderRadius: 20, overflow: 'hidden', marginHorizontal: 0, marginBottom: 80 },
  camera: { flex: 1 },
  overlayContainer: { flex: 1, justifyContent: 'space-between', zIndex: 2 },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, marginTop: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  guideContainer: { alignItems: 'center', marginTop: 'auto', marginBottom: 40 },
  guideText: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 2, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 30, paddingHorizontal: 20 },
  galleryButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.3)' },
  shutterButtonOuter: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  shutterButtonInner: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#fff' },
  
  previewContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%', resizeMode: 'contain' },
  previewControls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', padding: 20, position: 'absolute', bottom: 110 },
  controlButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, minWidth: 140, justifyContent: 'center' },
  retakeButton: { backgroundColor: '#fff' },
  useButton: { backgroundColor: '#3E5936' },
  controlText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  loaderWrapper: { alignItems: 'center', justifyContent: 'center', width: '100%' },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F7F5F0',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '85%', // Takes up mostly the full screen but leaves top visible
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  resultScroll: {
    paddingBottom: 20,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
  },
  resultInfo: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
  },
  diseaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  diseaseNameAr: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
    textAlign: 'left',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confidenceText: {
    fontSize: 14,
    color: '#3E5936',
    fontWeight: '600',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  treatmentHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  treatmentCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  treatmentDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginLeft: 28, // Align with text title
  },
  rtlText: {
    textAlign: 'right',
    color: '#777',
    marginTop: 2,
  },
  closeModalButton: {
    backgroundColor: '#3E5936',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});