import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const ServicesScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const services = [
    {
      id: 1,
      name: 'Plumbing',
      icon: '🔧',
      description: 'Pipe repairs, installations, leak fixing, drainage',
      category: 'home',
      popular: true,
    },
    {
      id: 2,
      name: 'Electrical',
      icon: '⚡',
      description: 'Wiring, installations, repairs, safety checks',
      category: 'home',
      popular: true,
    },
    {
      id: 3,
      name: 'Carpentry',
      icon: '🪵',
      description: 'Furniture repair, custom builds, installations',
      category: 'home',
      popular: true,
    },
    {
      id: 4,
      name: 'Painting',
      icon: '🎨',
      description: 'Interior/exterior painting, wallpapering, finishing',
      category: 'home',
      popular: true,
    },
    {
      id: 5,
      name: 'Cleaning',
      icon: '🧹',
      description: 'Home cleaning, deep cleaning, move-in/out cleaning',
      category: 'home',
      popular: true,
    },
    {
      id: 6,
      name: 'Gardening',
      icon: '🌿',
      description: 'Lawn care, landscaping, tree trimming, maintenance',
      category: 'outdoor',
      popular: true,
    },
    {
      id: 7,
      name: 'HVAC',
      icon: '❄️',
      description: 'Air conditioning, heating, ventilation services',
      category: 'home',
      popular: false,
    },
    {
      id: 8,
      name: 'Roofing',
      icon: '🏠',
      description: 'Roof repairs, installations, inspections, waterproofing',
      category: 'construction',
      popular: false,
    },
    {
      id: 9,
      name: 'Pest Control',
      icon: '🐛',
      description: 'Insect removal, fumigation, prevention services',
      category: 'home',
      popular: false,
    },
    {
      id: 10,
      name: 'Handyman',
      icon: '🔨',
      description: 'General repairs, installations, maintenance tasks',
      category: 'home',
      popular: true,
    },
    {
      id: 11,
      name: 'Pool Maintenance',
      icon: '🏊',
      description: 'Cleaning, chemical balancing, repairs, equipment',
      category: 'outdoor',
      popular: false,
    },
    {
      id: 12,
      name: 'Moving Services',
      icon: '📦',
      description: 'Packing, loading, transportation, unpacking',
      category: 'other',
      popular: false,
    },
    {
      id: 13,
      name: 'Appliance Repair',
      icon: '🔌',
      description: 'Washing machines, fridges, ovens, dishwashers',
      category: 'home',
      popular: false,
    },
    {
      id: 14,
      name: 'Tiling',
      icon: '⬜',
      description: 'Floor tiling, wall tiling, bathroom renovations',
      category: 'construction',
      popular: false,
    },
    {
      id: 15,
      name: 'Security Systems',
      icon: '🔐',
      description: 'Alarm systems, cameras, access control',
      category: 'home',
      popular: false,
    },
    {
      id: 16,
      name: 'Welding',
      icon: '🔥',
      description: 'Metal fabrication, repairs, custom metalwork',
      category: 'construction',
      popular: false,
    },
  ];

  const categories = [
    { id: 'all', name: 'All Services', icon: '📋' },
    { id: 'home', name: 'Home Services', icon: '🏡' },
    { id: 'outdoor', name: 'Outdoor', icon: '🌳' },
    { id: 'construction', name: 'Construction', icon: '🏗️' },
    { id: 'other', name: 'Other', icon: '➕' },
  ];

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category === selectedCategory);

  const popularServices = services.filter(s => s.popular);

  const handleServiceSelect = (service) => {
    navigation.navigate('FindProfessional', {
      preSelectedSpeciality: service.name.toLowerCase(),
    });
  };

  const ServiceCard = ({ service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServiceSelect(service)}
      activeOpacity={0.7}
    >
      <View style={styles.serviceIconContainer}>
        <Text style={styles.serviceIcon}>{service.icon}</Text>
        {service.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Popular</Text>
          </View>
        )}
      </View>
      <Text style={styles.serviceName}>{service.name}</Text>
      <Text style={styles.serviceDescription} numberOfLines={2}>
        {service.description}
      </Text>
      <TouchableOpacity
        style={styles.findButton}
        onPress={() => handleServiceSelect(service)}
      >
        <Text style={styles.findButtonText}>Find Professionals</Text>
        <Text style={styles.findButtonIcon}>→</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const CategoryChip = ({ category }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Text style={styles.categoryChipIcon}>{category.icon}</Text>
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === category.id && styles.categoryChipTextActive,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Services</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Browse Services</Text>
          <Text style={styles.headerSubtitle}>
            Find the perfect professional for your needs
          </Text>
        </View>

        {/* Popular Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Popular Services</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularServicesContainer}
          >
            {popularServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.popularServiceCard}
                onPress={() => handleServiceSelect(service)}
              >
                <Text style={styles.popularServiceIcon}>{service.icon}</Text>
                <Text style={styles.popularServiceName}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category Filter */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Filter by Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <CategoryChip key={category.id} category={category} />
            ))}
          </ScrollView>
        </View>

        {/* Services Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'All Services' : `${categories.find(c => c.id === selectedCategory)?.name}`}
            {' '}({filteredServices.length})
          </Text>
          <View style={styles.servicesGrid}>
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 How It Works</Text>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>1</Text>
            <Text style={styles.infoStepText}>
              Select the service you need
            </Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>2</Text>
            <Text style={styles.infoStepText}>
              Browse verified professionals in your area
            </Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>3</Text>
            <Text style={styles.infoStepText}>
              Book and schedule your service
            </Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.infoStepNumber}>4</Text>
            <Text style={styles.infoStepText}>
              Rate and review after completion
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
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
  topBarTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding * 2,
    paddingTop: SIZES.padding,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  popularServicesContainer: {
    paddingRight: SIZES.padding,
  },
  popularServiceCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    width: 100,
    ...SHADOWS.small,
  },
  popularServiceIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  popularServiceName: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  categoriesSection: {
    paddingHorizontal: SIZES.padding,
    marginTop: 8,
  },
  categoriesContainer: {
    paddingRight: SIZES.padding,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    ...SHADOWS.small,
  },
  serviceIconContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 48,
  },
  popularBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontSize: 9,
    ...FONTS.bold,
    color: COLORS.white,
  },
  serviceName: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 16,
    height: 32,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
  },
  findButtonText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.white,
    marginRight: 4,
  },
  findButtonIcon: {
    fontSize: 14,
    color: COLORS.white,
  },
  infoSection: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    marginTop: 8,
    padding: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  infoTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  infoStepText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
});

export default ServicesScreen;
