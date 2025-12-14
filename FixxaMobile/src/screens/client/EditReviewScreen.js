import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const EditReviewScreen = ({ route, navigation }) => {
  const { reviewId } = route.params;
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Rating states
  const [qualityRating, setQualityRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);

  // Review text
  const [reviewText, setReviewText] = useState('');
  const MAX_CHARS = 500;

  // Photos
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchReview();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos.');
    }
  };

  const fetchReview = async () => {
    try {
      const response = await api.get('/reviews/client');
      if (response.data.reviews) {
        const targetReview = response.data.reviews.find(r => r.id === reviewId);
        if (targetReview) {
          setReview(targetReview);
          setQualityRating(targetReview.quality_rating || 0);
          setPunctualityRating(targetReview.punctuality_rating || 0);
          setCommunicationRating(targetReview.communication_rating || 0);
          setValueRating(targetReview.value_rating || 0);
          setReviewText(targetReview.review_text || '');
          setPhotos(targetReview.photos || []);
        }
      }
    } catch (error) {
      console.error('Error fetching review:', error);
      Alert.alert('Error', 'Failed to load review.');
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallRating = () => {
    const ratings = [qualityRating, punctualityRating, communicationRating, valueRating];
    const validRatings = ratings.filter(r => r > 0);
    if (validRatings.length === 0) return 0;
    return Math.round(validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length);
  };

  const handleSave = async () => {
    const overallRating = calculateOverallRating();

    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide at least one category rating.');
      return;
    }

    if (!reviewText.trim()) {
      Alert.alert('Review Text Required', 'Please write a review.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put(`/reviews/${reviewId}`, {
        overall_rating: overallRating,
        quality_rating: qualityRating,
        punctuality_rating: punctualityRating,
        communication_rating: communicationRating,
        value_rating: valueRating,
        review_text: reviewText.trim(),
        photos: photos
      });

      if (response.data.success) {
        Alert.alert('Success', 'Review updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update review.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Maximum Photos', 'You can upload up to 5 photos per review.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const uploadPhoto = async (asset) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'review-photo.jpg',
      });

      const response = await api.post(`/reviews/${reviewId}/upload-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success && response.data.photoUrl) {
        setPhotos([...photos, response.data.photoUrl]);
        Alert.alert('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (photoUrl) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/reviews/${reviewId}/photos`, {
                data: { photoUrl }
              });

              if (response.data.success) {
                setPhotos(photos.filter(p => p !== photoUrl));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove photo.');
            }
          }
        }
      ]
    );
  };

  const renderStars = (rating, setRating, label) => {
    return (
      <View style={styles.ratingCategory}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              disabled={saving}
            >
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Review not found</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Worker Info */}
        <View style={styles.workerCard}>
          <Text style={styles.workerName}>{review.worker_name}</Text>
          <Text style={styles.serviceType}>{review.service_type}</Text>
        </View>

        {/* Overall Rating Display */}
        <View style={styles.overallRatingCard}>
          <Text style={styles.overallLabel}>Overall Rating</Text>
          <Text style={styles.overallRating}>{calculateOverallRating()}/5</Text>
          <Text style={styles.overallSubtext}>Calculated from category ratings</Text>
        </View>

        {/* Category Ratings */}
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>Rate Each Category</Text>
          {renderStars(qualityRating, setQualityRating, 'Quality of Work')}
          {renderStars(punctualityRating, setPunctualityRating, 'Timeliness/Punctuality')}
          {renderStars(communicationRating, setCommunicationRating, 'Professionalism/Communication')}
          {renderStars(valueRating, setValueRating, 'Value for Money')}
        </View>

        {/* Review Text */}
        <View style={styles.textSection}>
          <View style={styles.textHeader}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <Text style={[
              styles.charCounter,
              reviewText.length > MAX_CHARS && styles.charCounterOver
            ]}>
              {reviewText.length}/{MAX_CHARS}
            </Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Share your experience with this service..."
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={MAX_CHARS}
          />
        </View>

        {/* Photos Section */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Photos ({photos.length}/5)</Text>
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(photo)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {photos.length < 5 && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Text style={styles.addPhotoIcon}>📷</Text>
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  workerCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  workerName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  serviceType: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginTop: 4,
  },
  overallRatingCard: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.small,
  },
  overallLabel: {
    fontSize: SIZES.sm,
    color: COLORS.white,
    ...FONTS.medium,
  },
  overallRating: {
    fontSize: 48,
    ...FONTS.bold,
    color: COLORS.white,
    marginVertical: 8,
  },
  overallSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.white,
    opacity: 0.9,
  },
  ratingsSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  ratingCategory: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 28,
    color: COLORS.gray,
  },
  starActive: {
    color: '#ffc107',
  },
  textSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  charCounter: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  charCounterOver: {
    color: COLORS.error,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.sm,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  photosSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: COLORS.white,
    fontSize: 14,
    ...FONTS.bold,
  },
  addPhotoButton: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoIcon: {
    fontSize: 24,
  },
  addPhotoText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
});

export default EditReviewScreen;
