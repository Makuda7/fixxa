import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const PortfolioScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showReviewPhotosModal, setShowReviewPhotosModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    fetchPortfolio();
    fetchReviewPhotos();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to upload portfolio images.'
      );
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await api.get('/workers/portfolio');
      console.log('📸 Portfolio response:', response.data);
      if (response.data.photos) {
        setPortfolio(response.data.photos);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      Alert.alert('Error', 'Failed to load portfolio');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReviewPhotos = async () => {
    try {
      const response = await api.get('/workers/reviews/photos');
      if (response.data.photos) {
        setReviewPhotos(response.data.photos);
      }
    } catch (error) {
      console.error('Error fetching review photos:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPortfolio();
    fetchReviewPhotos();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setShowCaptionModal(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera access to take photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        setShowCaptionModal(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageSourceOptions = () => {
    const options = [
      {
        text: 'Take Photo',
        onPress: takePhoto,
      },
      {
        text: 'Choose from Gallery',
        onPress: pickImage,
      },
    ];

    // Add review photos option only if there are review photos available
    if (reviewPhotos.length > 0) {
      options.push({
        text: `Choose from Reviews (${reviewPhotos.length})`,
        onPress: () => setShowReviewPhotosModal(true),
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(
      'Add Portfolio Photo',
      'Choose an option',
      options,
      { cancelable: true }
    );
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      console.log('❌ No image selected');
      return;
    }

    console.log('📤 Starting upload...', { selectedImage: typeof selectedImage === 'string' ? 'URL' : 'File', caption });
    setUploading(true);
    try {
      const formData = new FormData();

      // Check if this is a review photo (URL string) or a new image (object with uri)
      if (typeof selectedImage === 'string') {
        // Review photo - just send the URL
        console.log('📎 Adding review photo URL to FormData');
        formData.append('photo_url', selectedImage);
      } else {
        // New image from camera/gallery
        console.log('📎 Adding new image to FormData', selectedImage.uri);
        formData.append('photo', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'portfolio-photo.jpg',
        });
      }

      if (caption.trim()) {
        console.log('📝 Adding caption:', caption.trim());
        formData.append('description', caption.trim());
      }

      console.log('🚀 Sending request to /workers/portfolio/upload');
      const response = await api.post('/workers/portfolio/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Upload response:', response.data);
      if (response.data.success) {
        Alert.alert('Success', 'Portfolio photo uploaded successfully!');
        setShowCaptionModal(false);
        setSelectedImage(null);
        setCaption('');
        fetchPortfolio(); // Refresh portfolio
      } else {
        console.log('❌ Upload failed - response not successful');
        Alert.alert('Error', 'Failed to upload photo');
      }
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to upload photo: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(false);
      console.log('📤 Upload complete');
    }
  };

  const selectReviewPhoto = (photoUrl) => {
    setSelectedImage(photoUrl);
    setShowReviewPhotosModal(false);
    setShowCaptionModal(true);
  };

  const deleteImage = (photoId) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this portfolio photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/workers/portfolio/${photoId}`);
              if (response.data.success) {
                Alert.alert('Success', 'Photo deleted successfully');
                fetchPortfolio();
              } else {
                Alert.alert('Error', 'Failed to delete photo');
              }
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Portfolio</Text>
          <Text style={styles.headerSubtitle}>
            {portfolio.length} photo{portfolio.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <BurgerMenu navigation={navigation} />
      </View>

      {/* Caption Modal */}
      <Modal
        visible={showCaptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCaptionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.captionModalContainer}
        >
          <TouchableWithoutFeedback onPress={() => setShowCaptionModal(false)}>
            <View style={styles.captionModalOverlay} />
          </TouchableWithoutFeedback>

          <View style={styles.captionModalContent}>
            <View style={styles.captionModalHeader}>
              <Text style={styles.captionModalTitle}>Add Caption (Optional)</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setShowCaptionModal(false);
                  setSelectedImage(null);
                  setCaption('');
                }}
                style={styles.captionModalCloseButton}
              >
                <Text style={styles.captionModalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.captionModalScroll}
              contentContainerStyle={styles.captionModalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {selectedImage && (
                <Image
                  source={{ uri: typeof selectedImage === 'string' ? selectedImage : selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}

              <TouchableWithoutFeedback>
                <View>
                  <TextInput
                    style={styles.captionInput}
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Describe this work..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    maxLength={200}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  <Text style={styles.charCount}>{caption.length}/200</Text>
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>

            <View style={styles.captionModalFooter}>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCaptionModal(false);
                    setSelectedImage(null);
                    setCaption('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={() => {
                    Keyboard.dismiss();
                    uploadImage();
                  }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Showcase your best work! High-quality photos help attract more clients.
          </Text>
        </View>

        {/* Add Photo Button */}
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={showImageSourceOptions}
        >
          <Text style={styles.addPhotoIcon}>📸</Text>
          <Text style={styles.addPhotoText}>Add New Photo</Text>
        </TouchableOpacity>

        {/* Portfolio Grid */}
        {portfolio.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>No portfolio photos yet</Text>
            <Text style={styles.emptySubtext}>
              Start building your portfolio to showcase your work to potential clients
            </Text>
          </View>
        ) : (
          <View style={styles.portfolioGrid}>
            {portfolio.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image
                  source={{ uri: photo.photo_url }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                {photo.description && (
                  <Text style={styles.photoCaption} numberOfLines={2}>
                    {photo.description}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteImage(photo.id)}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Review Photos Modal */}
      <Modal
        visible={showReviewPhotosModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewPhotosModal(false)}
      >
        <View style={styles.reviewPhotosModalOverlay}>
          <View style={styles.reviewPhotosModalContent}>
            <View style={styles.reviewPhotosModalHeader}>
              <Text style={styles.reviewPhotosModalTitle}>Choose from Review Photos</Text>
              <TouchableOpacity
                onPress={() => setShowReviewPhotosModal(false)}
                style={styles.reviewPhotosCloseButton}
              >
                <Text style={styles.reviewPhotosCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reviewPhotosScrollView}>
              {reviewPhotos.length === 0 ? (
                <View style={styles.noReviewPhotos}>
                  <Text style={styles.noReviewPhotosIcon}>📸</Text>
                  <Text style={styles.noReviewPhotosText}>No review photos available</Text>
                  <Text style={styles.noReviewPhotosSubtext}>
                    Review photos from completed jobs will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewPhotosGrid}>
                  {reviewPhotos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.reviewPhotoCard}
                      onPress={() => selectReviewPhoto(photo.photo_url)}
                    >
                      <Image
                        source={{ uri: photo.photo_url }}
                        style={styles.reviewPhotoImage}
                        resizeMode="cover"
                      />
                      {photo.review_text && (
                        <View style={styles.reviewPhotoInfo}>
                          <Text style={styles.reviewPhotoRating}>⭐ {photo.rating}/5</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 1.5,
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
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
  },
  addPhotoButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  addPhotoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addPhotoText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  photoImage: {
    width: '100%',
    height: 150,
  },
  photoCaption: {
    padding: 8,
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  deleteIcon: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  captionModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  captionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  captionModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  captionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding * 1.5,
    paddingTop: SIZES.padding * 1.5,
    paddingBottom: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  captionModalTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  captionModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionModalCloseIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  captionModalScroll: {
    flex: 1,
  },
  captionModalScrollContent: {
    paddingHorizontal: SIZES.padding * 1.5,
    paddingTop: SIZES.padding,
    paddingBottom: SIZES.padding,
  },
  captionModalFooter: {
    paddingHorizontal: SIZES.padding * 1.5,
    paddingVertical: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: COLORS.white,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: SIZES.padding,
    marginBottom: SIZES.padding,
  },
  captionInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 8,
    marginBottom: SIZES.padding,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  uploadButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  uploadButtonDisabled: {
    backgroundColor: '#a0a0a0',
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
  },
  reviewPhotosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewPhotosModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: SIZES.padding,
  },
  reviewPhotosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  reviewPhotosModalTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  reviewPhotosCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewPhotosCloseIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  reviewPhotosScrollView: {
    flex: 1,
    padding: SIZES.padding,
  },
  reviewPhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewPhotoCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.medium,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  reviewPhotoImage: {
    width: '100%',
    height: 150,
  },
  reviewPhotoInfo: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  reviewPhotoRating: {
    fontSize: SIZES.xs,
    color: COLORS.white,
    ...FONTS.semiBold,
  },
  noReviewPhotos: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  noReviewPhotosIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  noReviewPhotosText: {
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  noReviewPhotosSubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default PortfolioScreen;
