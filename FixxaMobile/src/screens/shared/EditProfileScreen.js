import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    profile_picture: null,
  });

  // Worker-specific fields
  const [workerData, setWorkerData] = useState({
    speciality: '',
    bio: '',
    years_experience: '',
  });

  const isWorker = user?.type === 'worker' || user?.type === 'professional';

  // Fetch full user profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      console.log('Fetching profile for user:', user);
      console.log('User type:', user?.type);

      // Use appropriate endpoint based on user type
      const endpoint = isWorker ? '/workers/profile' : '/users/profile';
      console.log('Fetching from endpoint:', endpoint);

      const response = await api.get(endpoint);
      console.log('Profile response:', response.data);

      if (response.data.success) {
        const profileData = isWorker ? response.data.worker : response.data.user;

        // Set basic form data
        setFormData({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          profile_picture: profileData.profile_picture || null,
        });

        // Set worker data if user is a worker
        if (isWorker) {
          setWorkerData({
            speciality: profileData.speciality || '',
            bio: profileData.bio || '',
            years_experience: profileData.years_experience?.toString() || '',
          });
        }

        console.log('Form data set:', {
          formData: {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            location: profileData.location,
          },
          workerData: isWorker ? {
            speciality: profileData.speciality,
            bio: profileData.bio,
            years_experience: profileData.years_experience,
          } : null,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageAsset) => {
    setUploading(true);

    try {
      // Create form data for image upload
      const formData = new FormData();

      // Get file extension
      const uriParts = imageAsset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageAsset.uri.replace('file://', '') : imageAsset.uri,
        name: `profile-${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      });

      // Upload to server (which will upload to Cloudinary)
      const response = await api.post('/upload/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          profile_picture: response.data.imageUrl,
        }));
        Alert.alert('Success', 'Profile picture uploaded successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        profile_picture: formData.profile_picture,
      };

      // Add worker-specific fields if applicable
      if (isWorker) {
        updateData.speciality = workerData.speciality.trim();
        updateData.bio = workerData.bio.trim();
        updateData.years_experience = workerData.years_experience;
      }

      // Use appropriate endpoint based on user type
      const endpoint = isWorker ? '/workers/profile' : '/users/profile';
      const response = await api.put(endpoint, updateData);

      if (response.data.success) {
        // Update local user state
        const updatedUser = isWorker ? response.data.worker : response.data.user;
        await updateUser(updatedUser);

        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Show loading indicator while fetching profile
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.saveButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePictureContainer}>
            {formData.profile_picture ? (
              <Image
                source={{ uri: formData.profile_picture }}
                style={styles.profilePicture}
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePicturePlaceholderText}>
                  {formData.name.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.changePictureButton}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Text style={styles.changePictureText}>Change Picture</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter your full name"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="0XX XXX XXXX"
              keyboardType="phone-pad"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="City, Province"
              editable={!saving}
            />
          </View>
        </View>

        {/* Worker-specific fields */}
        {isWorker && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Speciality</Text>
              <TextInput
                style={styles.input}
                value={workerData.speciality}
                onChangeText={(text) => setWorkerData({ ...workerData, speciality: text })}
                placeholder="e.g., Plumbing, Electrical"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                value={workerData.years_experience}
                onChangeText={(text) => setWorkerData({ ...workerData, years_experience: text })}
                placeholder="e.g., 5"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={workerData.bio}
                onChangeText={(text) => setWorkerData({ ...workerData, bio: text })}
                placeholder="Tell clients about yourself and your experience..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Make sure your information is accurate. This will be visible to{' '}
            {isWorker ? 'clients' : 'workers'} when booking services.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  loadingText: {
    marginTop: 16,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    ...FONTS.medium,
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
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  scrollContent: {
    flex: 1,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: SIZES.padding * 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  profilePictureContainer: {
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicturePlaceholderText: {
    fontSize: 40,
    ...FONTS.bold,
    color: COLORS.white,
  },
  changePictureButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
    justifyContent: 'center',
  },
  changePictureText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  section: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
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
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 16,
    margin: SIZES.padding,
    marginTop: 0,
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

export default EditProfileScreen;
