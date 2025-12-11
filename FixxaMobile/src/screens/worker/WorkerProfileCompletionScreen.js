import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const WorkerProfileCompletionScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Certifications state
  const [certifications, setCertifications] = useState([]);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Portfolio state
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  // References state
  const [references, setReferences] = useState([
    { name: '', phone: '', relationship: '' },
  ]);

  const pickCertification = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadCertification(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const uploadCertification = async (document) => {
    setUploadingCert(true);

    try {
      const formData = new FormData();

      // Get file extension
      const uriParts = document.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('certification', {
        uri: Platform.OS === 'ios' ? document.uri.replace('file://', '') : document.uri,
        name: document.name || `certification-${Date.now()}.${fileType}`,
        type: document.mimeType || `application/${fileType}`,
      });

      formData.append('document_name', document.name || 'Certification');

      const response = await api.post('/workers/certifications', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setCertifications([...certifications, response.data.certification]);
        Alert.alert('Success', 'Certification uploaded successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to upload certification');
      }
    } catch (error) {
      console.error('Upload certification error:', error);
      Alert.alert('Error', 'Failed to upload certification. Please try again.');
    } finally {
      setUploadingCert(false);
    }
  };

  const removeCertification = async (certId) => {
    Alert.alert(
      'Remove Certification',
      'Are you sure you want to remove this certification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/workers/certifications/${certId}`);
              if (response.data.success) {
                setCertifications(certifications.filter(cert => cert.id !== certId));
                Alert.alert('Success', 'Certification removed');
              }
            } catch (error) {
              console.error('Remove certification error:', error);
              Alert.alert('Error', 'Failed to remove certification');
            }
          },
        },
      ]
    );
  };

  const pickPortfolioPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload portfolio photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPortfolioPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadPortfolioPhoto = async (imageAsset) => {
    setUploadingPortfolio(true);

    try {
      const formData = new FormData();

      const uriParts = imageAsset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('portfolio', {
        uri: Platform.OS === 'ios' ? imageAsset.uri.replace('file://', '') : imageAsset.uri,
        name: `portfolio-${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      });

      const response = await api.post('/workers/portfolio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPortfolioPhotos([...portfolioPhotos, response.data.photo]);
        Alert.alert('Success', 'Portfolio photo uploaded successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Upload portfolio error:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const removePortfolioPhoto = async (photoId) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this portfolio photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/workers/portfolio/${photoId}`);
              if (response.data.success) {
                setPortfolioPhotos(portfolioPhotos.filter(photo => photo.id !== photoId));
                Alert.alert('Success', 'Photo removed');
              }
            } catch (error) {
              console.error('Remove photo error:', error);
              Alert.alert('Error', 'Failed to remove photo');
            }
          },
        },
      ]
    );
  };

  const addReference = () => {
    if (references.length >= 3) {
      Alert.alert('Limit Reached', 'You can add up to 3 references.');
      return;
    }
    setReferences([...references, { name: '', phone: '', relationship: '' }]);
  };

  const removeReference = (index) => {
    const updated = references.filter((_, i) => i !== index);
    setReferences(updated.length > 0 ? updated : [{ name: '', phone: '', relationship: '' }]);
  };

  const updateReference = (index, field, value) => {
    const updated = [...references];
    updated[index][field] = value;
    setReferences(updated);
  };

  const handleSubmit = async () => {
    // Validate references
    const validReferences = references.filter(
      ref => ref.name.trim() && ref.phone.trim() && ref.relationship.trim()
    );

    if (validReferences.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one complete reference.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/workers/complete-profile', {
        references: validReferences,
      });

      if (response.data.success) {
        // Update user state to reflect completion
        await updateUser({ ...user, profile_completed: true });

        Alert.alert(
          'Success!',
          'Your profile has been submitted for verification. You will receive an email once approved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Complete profile error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.introCard}>
          <Text style={styles.introIcon}>📋</Text>
          <Text style={styles.introTitle}>Complete Your Professional Profile</Text>
          <Text style={styles.introText}>
            To start receiving job requests, please complete your profile by uploading certifications,
            portfolio photos, and providing references.
          </Text>
        </View>

        {/* Certifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications & Licenses</Text>
          <Text style={styles.sectionSubtitle}>
            Upload copies of your professional certifications, licenses, or qualifications
          </Text>

          {certifications.map((cert, index) => (
            <View key={cert.id} style={styles.uploadedItem}>
              <View style={styles.uploadedItemContent}>
                <Text style={styles.uploadedItemIcon}>📄</Text>
                <View style={styles.uploadedItemInfo}>
                  <Text style={styles.uploadedItemName}>{cert.document_name}</Text>
                  <Text style={styles.uploadedItemStatus}>
                    {cert.verified ? '✅ Verified' : '⏳ Pending verification'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeCertification(cert.id)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickCertification}
            disabled={uploadingCert}
          >
            {uploadingCert ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Text style={styles.uploadButtonIcon}>📤</Text>
                <Text style={styles.uploadButtonText}>Upload Certification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Portfolio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Photos</Text>
          <Text style={styles.sectionSubtitle}>
            Showcase your best work with photos of completed projects
          </Text>

          {portfolioPhotos.length > 0 && (
            <View style={styles.portfolioGrid}>
              {portfolioPhotos.map((photo) => (
                <View key={photo.id} style={styles.portfolioItem}>
                  <Image
                    source={{ uri: photo.image_url }}
                    style={styles.portfolioImage}
                  />
                  <TouchableOpacity
                    style={styles.portfolioRemoveButton}
                    onPress={() => removePortfolioPhoto(photo.id)}
                  >
                    <Text style={styles.portfolioRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickPortfolioPhoto}
            disabled={uploadingPortfolio}
          >
            {uploadingPortfolio ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Text style={styles.uploadButtonIcon}>📷</Text>
                <Text style={styles.uploadButtonText}>Add Portfolio Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* References Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional References</Text>
          <Text style={styles.sectionSubtitle}>
            Provide at least one professional reference (max 3)
          </Text>

          {references.map((reference, index) => (
            <View key={index} style={styles.referenceCard}>
              <View style={styles.referenceHeader}>
                <Text style={styles.referenceNumber}>Reference {index + 1}</Text>
                {references.length > 1 && (
                  <TouchableOpacity onPress={() => removeReference(index)}>
                    <Text style={styles.removeReferenceText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={reference.name}
                  onChangeText={(text) => updateReference(index, 'name', text)}
                  placeholder="Reference's name"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={reference.phone}
                  onChangeText={(text) => updateReference(index, 'phone', text)}
                  placeholder="0XX XXX XXXX"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship *</Text>
                <TextInput
                  style={styles.input}
                  value={reference.relationship}
                  onChangeText={(text) => updateReference(index, 'relationship', text)}
                  placeholder="e.g., Previous client, Manager, Colleague"
                  editable={!loading}
                />
              </View>
            </View>
          ))}

          {references.length < 3 && (
            <TouchableOpacity style={styles.addButton} onPress={addReference}>
              <Text style={styles.addButtonText}>+ Add Another Reference</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Your profile will be reviewed by our team. This usually takes 24-48 hours.
              You'll receive an email once approved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    flex: 1,
  },
  introCard: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 1.5,
    margin: SIZES.padding,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  introIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  uploadedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uploadedItemIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  uploadedItemInfo: {
    flex: 1,
  },
  uploadedItemName: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  uploadedItemStatus: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    ...FONTS.semiBold,
  },
  uploadButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginHorizontal: -4,
  },
  portfolioItem: {
    width: '31.33%',
    aspectRatio: 1,
    margin: 4,
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  portfolioRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioRemoveText: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
  referenceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  referenceNumber: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  removeReferenceText: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    ...FONTS.semiBold,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 14,
    fontSize: SIZES.md,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  addButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  submitSection: {
    padding: SIZES.padding,
    paddingTop: 0,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: '#0d47a1',
    lineHeight: 20,
  },
});

export default WorkerProfileCompletionScreen;
