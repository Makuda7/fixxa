import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Overview stats
  const [stats, setStats] = useState({
    totalProfessionals: 0,
    activeProfessionals: 0,
    verifiedProfessionals: 0,
    totalClients: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    inProgressBookings: 0
  });

  // Pending Workers
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [pendingWorkersBadge, setPendingWorkersBadge] = useState(0);

  // Profile Updates
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [profileUpdatesBadge, setProfileUpdatesBadge] = useState(0);
  const [profileUpdatesFilter, setProfileUpdatesFilter] = useState('pending');

  // Certifications
  const [certifications, setCertifications] = useState([]);
  const [certificationsBadge, setCertificationsBadge] = useState(0);
  const [certFilter, setCertFilter] = useState('pending');
  const [selectedCert, setSelectedCert] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Support Messages
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportBadge, setSupportBadge] = useState(0);
  const [supportFilter, setSupportFilter] = useState('pending');

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsBadge, setSuggestionsBadge] = useState(0);
  const [suggestionsFilter, setSuggestionsFilter] = useState('pending');

  // Professionals
  const [professionals, setProfessionals] = useState([]);

  // Clients
  const [clients, setClients] = useState([]);

  // Bookings
  const [recentBookings, setRecentBookings] = useState([]);

  // Settings
  const [settings, setSettings] = useState({
    vacationMode: false
  });

  // Modals
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentRejectingWorkerId, setCurrentRejectingWorkerId] = useState(null);
  const [showWorkerDetailModal, setShowWorkerDetailModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerDetailData, setWorkerDetailData] = useState(null);
  const [workerChangeHistory, setWorkerChangeHistory] = useState([]);

  // Worker approval form fields
  const [editProvince, setEditProvince] = useState('');
  const [editPrimarySuburb, setEditPrimarySuburb] = useState('');
  const [editSecondaryAreas, setEditSecondaryAreas] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');

  // Worker Verification Modal
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationWorker, setVerificationWorker] = useState(null);
  const [verificationStates, setVerificationStates] = useState({
    verified_profile_pic: false,
    verified_id_info: false,
    verified_emergency: false,
    verified_professional: false,
    verified_documents: false
  });
  const [emergencyContact1, setEmergencyContact1] = useState(null);
  const [emergencyContact2, setEmergencyContact2] = useState(null);
  const [workerCertifications, setWorkerCertifications] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const profilePhotoInputRef = React.useRef(null);
  const [uploadingCertification, setUploadingCertification] = useState(false);
  const [certDocumentName, setCertDocumentName] = useState('');
  const certificationInputRef = React.useRef(null);
  const [uploadingID, setUploadingID] = useState(false);
  const [idDocumentType, setIdDocumentType] = useState('id'); // 'id' or 'passport'
  const idInputRef = React.useRef(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');
  const [pdfViewerTitle, setPdfViewerTitle] = useState('Document Viewer');

  useEffect(() => {
    // Check if user is admin using the isAdmin flag from backend
    if (!user || user.isAdmin !== true) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'pending-workers') loadPendingWorkers();
    if (activeTab === 'profile-updates') loadProfileUpdates();
    if (activeTab === 'certifications') loadCertifications();
    if (activeTab === 'support') loadSupportMessages();
    if (activeTab === 'suggestions') loadSuggestions();
    if (activeTab === 'workers') loadProfessionals();
    if (activeTab === 'clients') loadClients();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab, profileUpdatesFilter, certFilter, supportFilter, suggestionsFilter]);

  // Auto-refresh stats and bookings every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!loading && activeTab === 'dashboard') {
        loadStats();
        loadRecentBookings();
        loadBadgeCounts();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [loading, activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentBookings(),
        loadBadgeCounts()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showMessage('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/admin/stats', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBadgeCounts = async () => {
    try {
      // Load pending workers count
      const pendingWorkersRes = await fetch('/admin/pending-workers', { credentials: 'include' });
      const pendingWorkersData = await pendingWorkersRes.json();
      if (pendingWorkersData.success) {
        setPendingWorkersBadge(pendingWorkersData.workers.length);
      }

      // Load pending certifications count
      const certsRes = await fetch('/certifications/admin/all?status=pending', { credentials: 'include' });
      const certsData = await certsRes.json();
      if (certsData.success) {
        setCertificationsBadge(certsData.certifications.length);
      }

      // Load pending profile updates count
      const updatesRes = await fetch('/admin/profile-updates?status=pending', { credentials: 'include' });
      const updatesData = await updatesRes.json();
      if (updatesData.success) {
        setProfileUpdatesBadge(updatesData.updates.length);
      }

      // Load pending support messages count
      const supportRes = await fetch('/admin/support-messages?status=pending', { credentials: 'include' });
      const supportData = await supportRes.json();
      if (supportData.success) {
        setSupportBadge(supportData.messages.length);
      }

      // Load pending suggestions count
      const suggestionsRes = await fetch('/admin/feature-suggestions?status=pending', { credentials: 'include' });
      const suggestionsData = await suggestionsRes.json();
      if (suggestionsData.success) {
        setSuggestionsBadge(suggestionsData.suggestions.length);
      }
    } catch (error) {
      console.error('Error loading badge counts:', error);
    }
  };

  const loadRecentBookings = async () => {
    try {
      const response = await fetch('/admin/recent-bookings?limit=10', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setRecentBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error loading recent bookings:', error);
    }
  };

  const loadPendingWorkers = async () => {
    try {
      const response = await fetch('/admin/pending-workers', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setPendingWorkers(data.workers);
        setPendingWorkersBadge(data.workers.length);
      }
    } catch (error) {
      console.error('Error loading pending workers:', error);
    }
  };

  const loadProfileUpdates = async () => {
    try {
      const url = profileUpdatesFilter === 'all'
        ? '/admin/profile-updates'
        : `/admin/profile-updates?status=${profileUpdatesFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setProfileUpdates(data.updates);
      }
    } catch (error) {
      console.error('Error loading profile updates:', error);
    }
  };

  const loadCertifications = async () => {
    try {
      const url = certFilter === 'all'
        ? '/certifications/admin/all'
        : `/certifications/admin/all?status=${certFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setCertifications(data.certifications);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    }
  };

  const loadSupportMessages = async () => {
    try {
      const url = supportFilter === 'all'
        ? '/admin/support-messages'
        : `/admin/support-messages?status=${supportFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSupportMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading support messages:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const url = suggestionsFilter === 'all'
        ? '/admin/feature-suggestions'
        : `/admin/feature-suggestions?status=${suggestionsFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadProfessionals = async () => {
    try {
      const response = await fetch('/admin/professionals', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        // Map backend data to frontend format and calculate completion rate
        const mappedProfessionals = data.professionals.map(prof => ({
          ...prof,
          availability: prof.is_active ? 'available' : 'unavailable',
          total_jobs: prof.total_bookings || 0,
          completed_jobs: prof.completed_bookings || 0,
          completion_rate: prof.total_bookings > 0
            ? Math.round((prof.completed_bookings / prof.total_bookings) * 100)
            : 0,
          avg_rating: prof.rating ? parseFloat(prof.rating).toFixed(1) : '0.0',
          review_count: 0 // Will be calculated from reviews if needed
        }));
        setProfessionals(mappedProfessionals);
      }
    } catch (error) {
      console.error('Error loading professionals:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/admin/clients', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/admin/settings', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    showMessage('Dashboard refreshed', 'success');
    setRefreshing(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const approveWorkerWithData = async () => {
    // Validate required fields
    if (!editPrimarySuburb.trim()) {
      showMessage('Primary suburb is required', 'error');
      return;
    }

    if (selectedSpecialties.length === 0) {
      showMessage('Please select at least one specialty', 'error');
      return;
    }

    try {
      const secondary_areas = editSecondaryAreas
        ? editSecondaryAreas.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const response = await fetch(`/admin/approve-worker/${selectedWorker.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          province: editProvince,
          primary_suburb: editPrimarySuburb,
          secondary_areas,
          specialty_ids: selectedSpecialties,
          bio: editBio,
          experience: editExperience
        })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Worker approved successfully', 'success');
        closeWorkerDetailModal();
        await loadPendingWorkers();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to approve worker', 'error');
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      showMessage('Error approving worker', 'error');
    }
  };

  const approveWorker = async (workerId) => {
    try {
      const response = await fetch(`/admin/approve-worker/${workerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Worker approved successfully', 'success');
        await loadPendingWorkers();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to approve worker', 'error');
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      showMessage('Error approving worker', 'error');
    }
  };

  const openRejectModal = (workerId) => {
    setCurrentRejectingWorkerId(workerId);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const rejectWorker = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      showMessage('Please provide a detailed reason (minimum 10 characters)', 'error');
      return;
    }

    try {
      const response = await fetch(`/admin/reject-worker/${currentRejectingWorkerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Worker rejected', 'success');
        setShowRejectionModal(false);
        setRejectionReason('');
        setCurrentRejectingWorkerId(null);
        await loadPendingWorkers();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to reject worker', 'error');
      }
    } catch (error) {
      console.error('Error rejecting worker:', error);
      showMessage('Error rejecting worker', 'error');
    }
  };

  const showWorkerDetail = async (worker) => {
    try {
      setLoading(true);
      setSelectedWorker(worker);

      // Fetch detailed worker info
      const response = await fetch(`/admin/worker-detail/${worker.id}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setWorkerDetailData(data.details);
        setWorkerChangeHistory(data.changeHistory || []);

        // Populate edit fields with current data
        setEditProvince(data.details.province || '');
        setEditPrimarySuburb(data.details.primary_suburb || '');
        setEditSecondaryAreas(data.details.secondary_areas?.join(', ') || '');
        setEditBio(worker.bio || '');
        setEditExperience(worker.experience || '');

        // Fetch available specialties
        const specialtiesRes = await fetch('/admin/specialties', {
          credentials: 'include'
        });
        const specialtiesData = await specialtiesRes.json();

        if (specialtiesData.success) {
          setAvailableSpecialties(specialtiesData.specialties);

          // Fetch worker's current specialties
          const workerSpecRes = await fetch(`/admin/worker-specialties/${worker.id}`, {
            credentials: 'include'
          });
          const workerSpecData = await workerSpecRes.json();

          if (workerSpecData.success) {
            setSelectedSpecialties(workerSpecData.specialties.map(s => s.id));
          }
        }

        setShowWorkerDetailModal(true);
      } else {
        showMessage(data.error || 'Failed to load worker details', 'error');
      }
    } catch (error) {
      console.error('Error loading worker details:', error);
      showMessage('Error loading worker details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const closeWorkerDetailModal = () => {
    setShowWorkerDetailModal(false);
    setSelectedWorker(null);
    setWorkerDetailData(null);
    setWorkerChangeHistory([]);
    setNewSpecialtyName('');
  };

  const addNewSpecialty = async () => {
    if (!newSpecialtyName.trim()) {
      showMessage('Please enter a specialty name', 'error');
      return;
    }

    try {
      const response = await fetch('/admin/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newSpecialtyName.trim() })
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`✅ "${newSpecialtyName}" added successfully!`, 'success');

        // Add to available specialties list
        setAvailableSpecialties([...availableSpecialties, data.specialty]);

        // Automatically select the new specialty
        setSelectedSpecialties([...selectedSpecialties, data.specialty.id]);

        // Clear input
        setNewSpecialtyName('');
      } else {
        showMessage(data.error || 'Failed to add specialty', 'error');
      }
    } catch (error) {
      console.error('Error adding specialty:', error);
      showMessage('Failed to add specialty', 'error');
    }
  };

  // Worker Verification Functions
  const showWorkerVerification = async (worker) => {
    try {
      console.log('showWorkerVerification called with worker:', worker);
      setLoading(true);
      setVerificationWorker(worker);

      // Load worker's full details including verification states
      const response = await fetch(`/admin/worker-detail/${worker.id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      console.log('Worker detail response:', data);

      if (data.success) {
        const workerData = data.details;

        // Set verification states (from database or default to false)
        setVerificationStates({
          verified_profile_pic: workerData.verified_profile_pic || false,
          verified_id_info: workerData.verified_id_info || false,
          verified_emergency: workerData.verified_emergency || false,
          verified_professional: workerData.verified_professional || false,
          verified_documents: workerData.verified_documents || false
        });

        // Set emergency contacts
        setEmergencyContact1(workerData.emergency_contact_1 || null);
        setEmergencyContact2(workerData.emergency_contact_2 || null);

        // Set editable fields
        setEditProvince(workerData.province || '');
        setEditPrimarySuburb(workerData.primary_suburb || '');
        setEditSecondaryAreas(workerData.secondary_areas ? workerData.secondary_areas.join(', ') : '');
        setEditBio(workerData.bio || '');
        setEditExperience(workerData.experience || '');

        // Load worker's certifications
        const certResponse = await fetch(`/admin/worker-certifications/${worker.id}`, {
          credentials: 'include'
        });
        const certData = await certResponse.json();
        setWorkerCertifications(certData.certifications || []);

        // Load available specialties
        const specResponse = await fetch('/admin/specialties', {
          credentials: 'include'
        });
        const specData = await specResponse.json();
        setAvailableSpecialties(specData.specialties || []);

        // Load worker's current specialties
        const workerSpecResponse = await fetch(`/admin/worker-specialties/${worker.id}`, {
          credentials: 'include'
        });
        const workerSpecData = await workerSpecResponse.json();
        setSelectedSpecialties(workerSpecData.specialty_ids || []);

        setShowVerificationModal(true);
      } else {
        showMessage(data.error || 'Failed to load worker details', 'error');
      }
    } catch (error) {
      console.error('Error loading worker verification:', error);
      showMessage('Error loading worker details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveVerificationStates = async (overrideStates = null) => {
    if (!verificationWorker) return;

    try {
      // Use override states if provided (for immediate saves after checkbox changes)
      const statesToSave = overrideStates || verificationStates;

      const response = await fetch(`/admin/save-verification-states/${verificationWorker.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          verified_profile_pic: statesToSave.verified_profile_pic,
          verified_id_info: statesToSave.verified_id_info,
          verified_emergency: statesToSave.verified_emergency,
          verified_professional: statesToSave.verified_professional,
          verified_documents: statesToSave.verified_documents,
          province: editProvince,
          primary_suburb: editPrimarySuburb,
          secondary_areas: editSecondaryAreas.split(',').map(s => s.trim()).filter(s => s),
          bio: editBio,
          experience: editExperience,
          specialty_ids: selectedSpecialties
        })
      });

      const data = await response.json();

      if (data.success) {
        // Only show message when manually clicked (not on auto-save)
        if (!overrideStates) {
          showMessage('✅ Verification states saved!', 'success');
        }
      } else {
        showMessage(data.error || 'Failed to save verification states', 'error');
      }
    } catch (error) {
      console.error('Error saving verification states:', error);
      showMessage('Error saving verification states', 'error');
    }
  };

  const sendIncompleteProfileEmail = async () => {
    if (!verificationWorker) return;

    // Build list of missing items based on unchecked verification states
    const missingItems = [];
    if (!verificationStates.verified_profile_pic) missingItems.push('Profile Picture');
    if (!verificationStates.verified_id_info) missingItems.push('ID/Passport Information');
    if (!verificationStates.verified_emergency) missingItems.push('Emergency Contact Information');
    if (!verificationStates.verified_professional) missingItems.push('Professional Information (Bio, Experience)');
    if (!verificationStates.verified_documents) missingItems.push('Proof of Residence, Certified ID, Certifications');

    if (missingItems.length === 0) {
      showMessage('All verification items are checked. No email needed.', 'info');
      return;
    }

    const confirmMsg = `Send email to ${verificationWorker.name} requesting:\n\n${missingItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\nContinue?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/admin/send-incomplete-email/${verificationWorker.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ missingItems })
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`✅ Email sent requesting: ${missingItems.join(', ')}`, 'success');
        await loadPendingWorkers(); // Refresh to show updated timestamp
      } else {
        showMessage(data.error || 'Failed to send email', 'error');
      }
    } catch (error) {
      console.error('Error sending incomplete profile email:', error);
      showMessage('Error sending email', 'error');
    }
  };

  const approveWorkerFromVerification = async () => {
    if (!verificationWorker) return;

    // Check that all verification checkboxes are checked
    const allChecked = Object.values(verificationStates).every(v => v === true);
    if (!allChecked) {
      showMessage('❌ All 5 verification steps must be completed before approval', 'error');
      return;
    }

    // Validate required fields
    if (!editPrimarySuburb.trim()) {
      showMessage('Primary suburb is required', 'error');
      return;
    }

    if (selectedSpecialties.length === 0) {
      showMessage('Please select at least one specialty', 'error');
      return;
    }

    try {
      const secondary_areas = editSecondaryAreas
        ? editSecondaryAreas.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const response = await fetch(`/admin/approve-worker/${verificationWorker.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          province: editProvince,
          primary_suburb: editPrimarySuburb,
          secondary_areas,
          specialty_ids: selectedSpecialties,
          bio: editBio,
          experience: editExperience
        })
      });

      const data = await response.json();

      if (data.success) {
        showMessage(data.message || 'Worker approved successfully', 'success');
        setShowVerificationModal(false);
        await loadPendingWorkers();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to approve worker', 'error');
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      showMessage('Error approving worker', 'error');
    }
  };

  const uploadProfilePhotoForWorker = async (file) => {
    if (!verificationWorker) return;

    // Validate file
    if (!file) {
      showMessage('Please select a file', 'error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('Only JPEG, PNG, and WEBP images are allowed', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showMessage('File size must be less than 5MB', 'error');
      return;
    }

    try {
      setUploadingPhoto(true);

      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`/admin/upload-worker-photo/${verificationWorker.id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showMessage('✅ Profile photo uploaded successfully!', 'success');

        // Update verification worker with new photo
        setVerificationWorker({
          ...verificationWorker,
          profile_picture: data.profile_picture
        });

        // Clear preview and file input
        setPhotoPreview(null);
        if (profilePhotoInputRef.current) {
          profilePhotoInputRef.current.value = '';
        }

        // Reload pending workers to show updated photo
        await loadPendingWorkers();
      } else {
        showMessage(data.error || 'Failed to upload photo', 'error');
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      showMessage('Error uploading profile photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCertificationForWorker = async (file) => {
    if (!verificationWorker) {
      showMessage('No worker selected', 'error');
      return;
    }

    if (!certDocumentName.trim()) {
      showMessage('Please enter a document name', 'error');
      return;
    }

    // Validate file type - accept PDF, images, and documents
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      showMessage('Only PDF, JPG, PNG, DOC, and DOCX files are allowed', 'error');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showMessage('File size must be less than 10MB', 'error');
      return;
    }

    try {
      setUploadingCertification(true);
      const formData = new FormData();
      formData.append('certification', file);
      formData.append('documentName', certDocumentName.trim());

      const response = await fetch(`/admin/upload-worker-certification/${verificationWorker.id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showMessage('✅ Certification uploaded successfully!', 'success');
        setCertDocumentName('');
        if (certificationInputRef.current) {
          certificationInputRef.current.value = '';
        }

        // Reload certifications to show the new one
        const certsResponse = await fetch(`/admin/worker-certifications/${verificationWorker.id}`, {
          credentials: 'include'
        });
        const certsData = await certsResponse.json();
        if (certsData.success) {
          setWorkerCertifications(certsData.certifications);
        }
      } else {
        showMessage(data.error || 'Failed to upload certification', 'error');
      }
    } catch (error) {
      console.error('Error uploading certification:', error);
      showMessage('Error uploading certification', 'error');
    } finally {
      setUploadingCertification(false);
    }
  };

  const uploadIDForWorker = async (file) => {
    if (!verificationWorker) {
      showMessage('No worker selected', 'error');
      return;
    }

    if (!idDocumentType) {
      showMessage('Please select document type (ID or Passport)', 'error');
      return;
    }

    // Validate file type - accept PDF and images
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      showMessage('Only PDF, JPG, and PNG files are allowed', 'error');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showMessage('File size must be less than 10MB', 'error');
      return;
    }

    try {
      setUploadingID(true);
      const formData = new FormData();
      formData.append('idDocument', file);
      formData.append('documentType', idDocumentType);

      const response = await fetch(`/admin/upload-worker-id/${verificationWorker.id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`✅ ${idDocumentType === 'id' ? 'ID' : 'Passport'} uploaded successfully!`, 'success');

        // Update the verification worker with the new ID document info
        setVerificationWorker({
          ...verificationWorker,
          id_document_url: data.id_document_url,
          id_document_type: data.id_document_type
        });

        if (idInputRef.current) {
          idInputRef.current.value = '';
        }
      } else {
        showMessage(data.error || 'Failed to upload ID document', 'error');
      }
    } catch (error) {
      console.error('Error uploading ID document:', error);
      showMessage('Error uploading ID document', 'error');
    } finally {
      setUploadingID(false);
    }
  };

  const deleteCertification = async (certId) => {
    if (!window.confirm('Delete this certification? The worker will need to re-upload it.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/admin/certifications/${certId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        showMessage('Certification deleted. Worker can now re-upload.', 'success');

        // Reload certifications for the verification worker
        if (verificationWorker) {
          const certsResponse = await fetch(`/admin/worker-certifications/${verificationWorker.id}`, {
            credentials: 'include'
          });
          const certsData = await certsResponse.json();
          if (certsData.success) {
            setWorkerCertifications(certsData.certifications);
          }
        }
      } else {
        showMessage(data.error || 'Failed to delete certification', 'error');
      }
    } catch (error) {
      console.error('Delete certification error:', error);
      showMessage('Failed to delete certification', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllWorkerCertifications = async (workerId) => {
    if (!window.confirm('Delete ALL certifications for this worker? They will need to re-upload everything. This cannot be undone!')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/admin/worker/${workerId}/certifications`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        showMessage(data.message + ' - Worker can now re-upload.', 'success');

        // Reload certifications
        const certsResponse = await fetch(`/admin/worker-certifications/${workerId}`, {
          credentials: 'include'
        });
        const certsData = await certsResponse.json();
        if (certsData.success) {
          setWorkerCertifications(certsData.certifications);
        }
      } else {
        showMessage(data.error || 'Failed to delete certifications', 'error');
      }
    } catch (error) {
      console.error('Delete all certifications error:', error);
      showMessage('Failed to delete certifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPdfViewer = (url) => {
    // Extract filename from URL for better title
    const fileName = url.split('/').pop().split('?')[0];
    setPdfViewerTitle(`Document: ${decodeURIComponent(fileName)}`);
    setPdfViewerUrl(url);
    setShowPdfViewer(true);
  };

  const closePdfViewer = () => {
    setShowPdfViewer(false);
    setPdfViewerUrl('');
    setPdfViewerTitle('Document Viewer');
  };

  const approveCertification = async (certId) => {
    if (!window.confirm('Approve this certification? The professional will receive a verified badge.')) return;

    try {
      const response = await fetch(`/certifications/admin/approve/${certId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Certification approved successfully', 'success');
        await loadCertifications();
        await loadProfessionals();
        await loadStats();
        setShowCertModal(false);
      } else {
        showMessage(data.error || 'Failed to approve certification', 'error');
      }
    } catch (error) {
      console.error('Error approving certification:', error);
      showMessage('Error approving certification', 'error');
    }
  };

  const rejectCertification = async (certId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;

    try {
      const response = await fetch(`/certifications/admin/reject/${certId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Certification rejected', 'success');
        await loadCertifications();
        setShowCertModal(false);
      } else {
        showMessage(data.error || 'Failed to reject certification', 'error');
      }
    } catch (error) {
      console.error('Error rejecting certification:', error);
      showMessage('Error rejecting certification', 'error');
    }
  };

  const reviewProfileUpdate = async (updateId, status) => {
    try {
      const response = await fetch(`/admin/profile-updates/${updateId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(`Profile update ${status}`, 'success');
        await loadProfileUpdates();
      } else {
        showMessage(data.error || `Failed to ${status} update`, 'error');
      }
    } catch (error) {
      console.error('Error reviewing profile update:', error);
      showMessage('Error reviewing profile update', 'error');
    }
  };

  const resolveSupportMessage = async (messageId) => {
    try {
      const response = await fetch(`/admin/support-messages/${messageId}/resolve`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Support message marked as resolved', 'success');
        await loadSupportMessages();
        await loadBadgeCounts();
      } else {
        showMessage(data.error || 'Failed to resolve message', 'error');
      }
    } catch (error) {
      console.error('Error resolving support message:', error);
      showMessage('Error resolving support message', 'error');
    }
  };

  const reviewSuggestion = async (suggestionId, status) => {
    try {
      const response = await fetch(`/admin/feature-suggestions/${suggestionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(`Suggestion ${status}`, 'success');
        await loadSuggestions();
        await loadBadgeCounts();
      } else {
        showMessage(data.error || `Failed to ${status} suggestion`, 'error');
      }
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      showMessage('Error reviewing suggestion', 'error');
    }
  };

  const toggleProfessional = async (id) => {
    try {
      const response = await fetch(`/admin/toggle-professional/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message, 'success');
        await loadProfessionals();
      } else {
        showMessage(data.error || 'Failed to toggle professional', 'error');
      }
    } catch (error) {
      console.error('Error toggling professional:', error);
      showMessage('Error toggling professional', 'error');
    }
  };

  const toggleVerified = async (workerId) => {
    try {
      const response = await fetch(`/admin/toggle-verified/${workerId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message, 'success');
        await loadProfessionals();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to toggle verification', 'error');
      }
    } catch (error) {
      console.error('Error toggling verification:', error);
      showMessage('Error toggling verification', 'error');
    }
  };

  const toggleVacationMode = async () => {
    try {
      const newValue = !settings.vacationMode;
      const response = await fetch('/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vacationMode: newValue })
      });
      const data = await response.json();
      if (data.success) {
        setSettings({ ...settings, vacationMode: newValue });
        showMessage(`Vacation mode ${newValue ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showMessage(data.error || 'Failed to update settings', 'error');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showMessage('Error updating settings', 'error');
    }
  };

  const testEmail = async () => {
    try {
      const response = await fetch('/admin/test-email', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Test email sent successfully! Check your inbox.', 'success');
      } else {
        showMessage(data.error || 'Failed to send test email', 'error');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      showMessage('Error sending test email', 'error');
    }
  };

  const syncDatabaseSchema = async () => {
    if (!window.confirm('This will add missing columns to the production database. Continue?')) return;

    try {
      const response = await fetch('/admin/sync-database-schema', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Database schema synchronized successfully', 'success');
      } else {
        showMessage(data.error || 'Failed to sync database schema', 'error');
      }
    } catch (error) {
      console.error('Error syncing database schema:', error);
      showMessage('Error syncing database schema', 'error');
    }
  };

  const viewCertification = (cert) => {
    setSelectedCert(cert);
    setShowCertModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && activeTab === 'overview') {
    return (
      <div className="admin-dashboard">
        <div className="loading-overlay show">
          <div className="loading-spinner">
            <div>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Loading Overlay */}
      {refreshing && (
        <div className="loading-overlay show">
          <div className="loading-spinner">
            <div>Loading...</div>
          </div>
        </div>
      )}

      <div className="admin-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Fixxa Admin Dashboard</h1>
            <p>Manage your platform, view analytics, and control settings</p>
          </div>
          <div className="dashboard-header-right">
            <div className="user-email">{user?.email}</div>
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message show ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`nav-tab ${activeTab === 'pending-workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending-workers')}
          >
            Pending Workers
            {pendingWorkersBadge > 0 && (
              <span className="badge">{pendingWorkersBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'profile-updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile-updates')}
          >
            Profile Updates
            {profileUpdatesBadge > 0 && (
              <span className="badge">{profileUpdatesBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'certifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('certifications')}
          >
            Certifications
            {certificationsBadge > 0 && (
              <span className="badge">{certificationsBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            Worker Support
            {supportBadge > 0 && (
              <span className="badge">{supportBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            Feature Suggestions
            {suggestionsBadge > 0 && (
              <span className="badge">{suggestionsBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('workers')}
          >
            Professionals
          </button>
          <button
            className={`nav-tab ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
          <button
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-content active">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.totalProfessionals || 0}</div>
                <div className="stat-label">Total Professionals</div>
                <div className="stat-subtext">
                  {stats.activeProfessionals || 0} active | {stats.verifiedProfessionals || 0} verified
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalClients || 0}</div>
                <div className="stat-label">Registered Clients</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalBookings || 0}</div>
                <div className="stat-label">Total Bookings</div>
                <div className="stat-subtext">{stats.pendingBookings || 0} pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.completedBookings || 0}</div>
                <div className="stat-label">Completed Jobs</div>
                <div className="stat-subtext">{stats.inProgressBookings || 0} in progress</div>
              </div>
            </div>

            {/* Website Analytics Section */}
            <div className="table-section" style={{ marginTop: '2rem' }}>
              <h3>📊 Website Analytics</h3>
              <p style={{ color: '#666' }}>Track your website traffic and visitor behavior</p>

              {/* Analytics Stat Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                marginTop: '1rem'
              }}>
                {/* Visitors Today */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    📊
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Check Google<br />Analytics
                  </div>
                </div>

                {/* Visitors This Week */}
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    -
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Visitors This Week
                  </div>
                </div>

                {/* Page Views Today */}
                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    -
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Page Views Today
                  </div>
                </div>

                {/* Active Users Now */}
                <div style={{
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    -
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Active Users Now
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#2d5016' }}>📈 View Full Analytics</h4>
                <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Access your complete Google Analytics dashboard for detailed insights, user demographics, traffic sources, and more.
                </p>
                <a
                  href="https://analytics.google.com/analytics/web/#/p467208493/reports/intelligenthome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Open Google Analytics Dashboard
                </a>
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    <strong>Property ID:</strong> G-48NETTXMR5<br />
                    <strong>Tracking Status:</strong> <span style={{ color: '#28a745', fontWeight: 600 }}>Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="table-section">
              <h3>Recent Bookings</h3>
              <p style={{ color: '#666' }}>Last 10 bookings on the platform</p>
              {recentBookings.length === 0 ? (
                <div className="no-data">No bookings yet</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Worker</th>
                      <th>Service</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map(booking => (
                      <tr key={booking.id}>
                        <td>{booking.id}</td>
                        <td>{booking.client_name}</td>
                        <td>{booking.worker_name}</td>
                        <td>{booking.service_type}</td>
                        <td>{formatDate(booking.booking_date)}</td>
                        <td>
                          <span className={`status-badge status-${booking.status}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td>R{booking.total_price || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Pending Workers Tab */}
        {activeTab === 'pending-workers' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Pending Worker Applications</h3>
              <p>Review and approve professionals who want to join Fixxa</p>

              {pendingWorkers.length === 0 ? (
                <div className="no-data">No pending applications</div>
              ) : (
                <div className="worker-grid">
                  {pendingWorkers.map(worker => {
                    // Color coding based on email verification status
                    const emailStatusColor = worker.email_verified ? '#28a745' : '#dc3545';
                    const emailStatusBg = worker.email_verified ? '#d4edda' : '#f8d7da';
                    const emailStatusText = worker.email_verified ? 'Email Verified' : 'Email Not Verified';
                    const emailStatusIcon = worker.email_verified ? '✅' : '❌';

                    return (
                      <div
                        key={worker.id}
                        className="worker-card"
                        style={{
                          border: `2px solid ${emailStatusColor}`,
                          borderLeft: `6px solid ${emailStatusColor}`,
                          boxShadow: worker.email_verified ? '0 2px 8px rgba(40, 167, 69, 0.1)' : '0 2px 8px rgba(220, 53, 69, 0.1)'
                        }}
                      >
                        {/* Email Verification Status Banner */}
                        <div style={{
                          background: emailStatusBg,
                          color: emailStatusColor,
                          padding: '0.5rem 0.75rem',
                          marginBottom: '0.75rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          <span>{emailStatusIcon} {emailStatusText}</span>
                          {worker.last_completion_email_sent && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                              Last Email: {formatDate(worker.last_completion_email_sent)}
                            </span>
                          )}
                        </div>

                        <div className="worker-header">
                          <div className="worker-info">
                            <h4>{worker.name}</h4>
                            <p>{worker.email} {worker.phone && `• ${worker.phone}`}</p>
                            <p><strong>Speciality:</strong> {worker.speciality}</p>
                            {worker.address && (
                              <p><strong>Location:</strong> {worker.address}, {worker.city}</p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.85rem', color: '#666' }}>
                              Applied: {formatDate(worker.created_at)}
                            </p>
                            {worker.cert_count > 0 && (
                              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                                {worker.approved_cert_count}/{worker.cert_count} certs approved
                              </p>
                            )}
                          </div>
                        </div>

                      {worker.bio && (
                        <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Bio:</strong>
                          <p style={{ margin: '0.5rem 0 0 0' }}>{worker.bio}</p>
                        </div>
                      )}

                      <div className="cert-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          style={{
                            background: '#17a2b8',
                            color: 'white',
                            flex: 1,
                            minWidth: '120px'
                          }}
                          onClick={() => showWorkerVerification(worker)}
                        >
                          📋 Review Details
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => openRejectModal(worker.id)}
                          style={{ flex: '0 0 auto' }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Updates Tab */}
        {activeTab === 'profile-updates' && (
          <div className="tab-content active">
            <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>Worker Profile Activity Tracker</h4>
              <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
                Track all profile changes made by workers. Review updates to ensure accuracy and verify new information added by professionals.
              </p>
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${profileUpdatesFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setProfileUpdatesFilter('pending')}
              >
                Pending Review
              </button>
              <button
                className={`filter-tab ${profileUpdatesFilter === 'reviewed' ? 'active' : ''}`}
                onClick={() => setProfileUpdatesFilter('reviewed')}
              >
                Reviewed
              </button>
              <button
                className={`filter-tab ${profileUpdatesFilter === 'all' ? 'active' : ''}`}
                onClick={() => setProfileUpdatesFilter('all')}
              >
                All
              </button>
            </div>

            {profileUpdates.length === 0 ? (
              <div className="no-data">No profile updates found</div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {profileUpdates.map(update => {
                  // Determine update type and color scheme
                  let updateType = 'info';
                  let borderColor = '#17a2b8'; // Blue for info
                  let bgColor = '#d1ecf1';
                  let icon = 'ℹ️';

                  const field = update.field_name?.toLowerCase() || '';

                  // Categorize by field name
                  if (field.includes('verified') || field.includes('approval') || field.includes('status')) {
                    updateType = 'verification';
                    borderColor = '#28a745'; // Green for verification
                    bgColor = '#d4edda';
                    icon = '✅';
                  } else if (field.includes('bio') || field.includes('experience') || field.includes('specialty') || field.includes('area')) {
                    updateType = 'profile';
                    borderColor = '#ffc107'; // Yellow for profile changes
                    bgColor = '#fff3cd';
                    icon = '📝';
                  } else if (field.includes('document') || field.includes('certification') || field.includes('photo') || field.includes('picture')) {
                    updateType = 'document';
                    borderColor = '#6f42c1'; // Purple for documents
                    bgColor = '#e2d9f3';
                    icon = '📄';
                  }

                  return (
                    <div
                      key={update.id}
                      className="card"
                      style={{
                        marginBottom: '1rem',
                        borderLeft: `5px solid ${borderColor}`,
                        boxShadow: `0 2px 8px rgba(0,0,0,0.08)`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                            <h4 style={{ margin: 0, color: '#2d5016' }}>{update.worker_name}</h4>
                          </div>
                          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            {update.worker_email} • {formatDate(update.changed_at)}
                          </p>
                        </div>
                        <span className={`status-badge status-${update.review_status || 'pending'}`}>
                          {update.review_status || 'Pending'}
                        </span>
                      </div>

                      {/* Field Type Badge */}
                      <div style={{
                        display: 'inline-block',
                        background: bgColor,
                        color: borderColor,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase'
                      }}>
                        {update.field_name}
                      </div>

                      {/* Side-by-side comparison */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        {/* Old Value */}
                        <div style={{
                          background: '#f8f9fa',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid #dee2e6'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#6c757d',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>❌</span> Old Value
                          </div>
                          <div style={{
                            fontSize: '0.9rem',
                            color: '#495057',
                            wordBreak: 'break-word'
                          }}>
                            {update.old_value || <em style={{ color: '#adb5bd' }}>None</em>}
                          </div>
                        </div>

                        {/* New Value */}
                        <div style={{
                          background: '#d4edda',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid #28a745'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#155724',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>✅</span> New Value
                          </div>
                          <div style={{
                            fontSize: '0.9rem',
                            color: '#155724',
                            fontWeight: 500,
                            wordBreak: 'break-word'
                          }}>
                            {update.new_value}
                          </div>
                        </div>
                      </div>

                      {update.review_status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-success"
                            onClick={() => reviewProfileUpdate(update.id, 'approved')}
                          >
                            ✅ Approve Change
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => reviewProfileUpdate(update.id, 'rejected')}
                          >
                            ❌ Reject Change
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Certification Management</h3>
              <p>Review and approve professional certifications</p>

              <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`btn ${certFilter === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={`btn ${certFilter === 'approved' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('approved')}
                >
                  Approved
                </button>
                <button
                  className={`btn ${certFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('rejected')}
                >
                  Rejected
                </button>
                <button
                  className={`btn ${certFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('all')}
                >
                  All
                </button>
              </div>

              {certifications.length === 0 ? (
                <div className="no-data">No certifications found</div>
              ) : (
                <div className="cert-grid">
                  {certifications.map(cert => (
                    <div key={cert.id} className={`cert-card ${cert.status.toLowerCase()}`}>
                      <div className="cert-header">
                        <div className="cert-info">
                          <h4>
                            {cert.worker_name}
                            {cert.is_verified && <span className="verified-badge">✓ Verified</span>}
                          </h4>
                          <p>{cert.worker_email}</p>
                          <p><strong>{cert.speciality}</strong></p>
                        </div>
                        <span className={`status-badge status-${cert.status.toLowerCase()}`}>
                          {cert.status}
                        </span>
                      </div>

                      <div className="cert-details">
                        <p><strong>Document:</strong> {cert.document_name || 'Certification'}</p>
                        <p><strong>Uploaded:</strong> {formatDate(cert.uploaded_at)}</p>
                        <p><strong>Reviewed:</strong> {cert.reviewed_at ? formatDate(cert.reviewed_at) : 'Not reviewed'}</p>
                        {cert.reviewed_by_email && (
                          <p><strong>Reviewed By:</strong> {cert.reviewed_by_email}</p>
                        )}
                      </div>

                      <div className="cert-actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => viewCertification(cert)}
                        >
                          View Document
                        </button>
                        {cert.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-small"
                              onClick={() => approveCertification(cert.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => rejectCertification(cert.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support Messages Tab */}
        {activeTab === 'support' && (
          <div className="tab-content active">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${supportFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setSupportFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`filter-tab ${supportFilter === 'responded' ? 'active' : ''}`}
                onClick={() => setSupportFilter('responded')}
              >
                Responded
              </button>
              <button
                className={`filter-tab ${supportFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSupportFilter('all')}
              >
                All
              </button>
            </div>

            {supportMessages.length === 0 ? (
              <div className="no-data">No support messages found</div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {supportMessages.map(msg => (
                  <div key={msg.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#2d5016' }}>{msg.subject}</h4>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                          From: <strong>{msg.worker_name}</strong> ({msg.worker_email})
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.85rem' }}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`status-badge status-${msg.status === 'pending' ? 'pending' : 'completed'}`}>
                        {msg.status}
                      </span>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                    </div>
                    {msg.status === 'pending' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => resolveSupportMessage(msg.id)}
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="tab-content active">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${suggestionsFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setSuggestionsFilter('pending')}
              >
                Pending Review
              </button>
              <button
                className={`filter-tab ${suggestionsFilter === 'reviewed' ? 'active' : ''}`}
                onClick={() => setSuggestionsFilter('reviewed')}
              >
                Reviewed
              </button>
              <button
                className={`filter-tab ${suggestionsFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSuggestionsFilter('all')}
              >
                All
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="no-data">No suggestions found</div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {suggestions.map(sug => (
                  <div key={sug.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#17a2b8' }}>{sug.category || 'General'}</h4>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                          From: <strong>{sug.worker_name}</strong> ({sug.worker_email})
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.85rem' }}>
                          {new Date(sug.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`status-badge status-${sug.status === 'pending' ? 'pending' : 'completed'}`}>
                        {sug.status}
                      </span>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{sug.suggestion}</p>
                    </div>
                    {sug.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-success"
                          onClick={() => reviewSuggestion(sug.id, 'reviewed')}
                        >
                          Mark as Reviewed
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => reviewSuggestion(sug.id, 'rejected')}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Professionals Tab */}
        {activeTab === 'workers' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Professional Management</h3>
              <p>View and manage all registered professionals on the platform</p>

              {professionals.length === 0 ? (
                <div className="no-data">No professionals found</div>
              ) : (
                <div className="worker-grid">
                  {professionals.map(worker => (
                    <div
                      key={worker.id}
                      className={`worker-card ${worker.availability === 'unavailable' ? 'unavailable' : ''}`}
                      style={{
                        opacity: worker.availability === 'unavailable' ? 0.6 : 1,
                        filter: worker.availability === 'unavailable' ? 'grayscale(30%)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div className="worker-header">
                        <div className="worker-info">
                          <h4>
                            {worker.name}
                            {worker.is_verified && <span className="verified-badge">✓ Verified</span>}
                          </h4>
                          <p>{worker.email}</p>
                          <p><strong>{worker.speciality}</strong></p>
                        </div>
                        <span className={`status-badge status-${worker.availability}`}>
                          {worker.availability}
                        </span>
                      </div>

                      <div className="worker-stats">
                        <div className="worker-stat">
                          <div className="worker-stat-number">{worker.total_jobs || 0}</div>
                          <div className="worker-stat-label">Jobs</div>
                        </div>
                        <div className="worker-stat">
                          <div className="worker-stat-number">{worker.avg_rating || 0}</div>
                          <div className="worker-stat-label">Rating</div>
                        </div>
                        <div className="worker-stat">
                          <div className="worker-stat-number">
                            {worker.completion_rate}%
                          </div>
                          <div className="worker-stat-label">Completed</div>
                        </div>
                      </div>

                      {/* Completion Rate Progress Bar */}
                      {worker.total_jobs > 0 && (
                        <div style={{ margin: '0.75rem 0 0.5rem 0' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.25rem',
                            fontSize: '0.75rem',
                            color: '#666'
                          }}>
                            <span>Completion Rate</span>
                            <span style={{
                              fontWeight: 600,
                              color: worker.completion_rate >= 80 ? '#28a745' :
                                     worker.completion_rate >= 60 ? '#ffc107' : '#dc3545'
                            }}>
                              {worker.completed_jobs}/{worker.total_jobs} jobs
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#e9ecef',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${worker.completion_rate}%`,
                              height: '100%',
                              background: worker.completion_rate >= 80
                                ? 'linear-gradient(90deg, #28a745 0%, #20c997 100%)'
                                : worker.completion_rate >= 60
                                ? 'linear-gradient(90deg, #ffc107 0%, #fd7e14 100%)'
                                : 'linear-gradient(90deg, #dc3545 0%, #c82333 100%)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      )}

                      <div className="cert-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          className="btn btn-info btn-small"
                          onClick={() => showWorkerDetail(worker)}
                          style={{ gridColumn: '1 / -1' }}
                        >
                          📋 View Details
                        </button>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => toggleProfessional(worker.id)}
                        >
                          {worker.availability === 'available' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => toggleVerified(worker.id)}
                        >
                          {worker.is_verified ? 'Unverify' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Client Management</h3>
              <p>View all registered clients on the platform</p>

              {clients.length === 0 ? (
                <div className="no-data">No clients found</div>
              ) : (
                <div className="clients-grid">
                  {clients.map(client => (
                    <div key={client.id} className="client-card">
                      <h4>{client.name}</h4>
                      <div className="client-info">
                        <p>{client.email}</p>
                        {client.phone && <p>Phone: {client.phone}</p>}
                        <p>Joined: {formatDate(client.created_at)}</p>
                      </div>
                      <div className="client-stats">
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d5016' }}>
                            {client.total_bookings || 0}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>Bookings</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content active">
            <div className="settings-section">
              <h3>Platform Settings</h3>
              <div className="setting-item">
                <div className="setting-label">
                  <strong>Vacation Mode</strong>
                  <span>Temporarily disable new bookings across the entire platform</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.vacationMode}
                    onChange={toggleVacationMode}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3>Email System</h3>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="setting-label">
                  <strong>Test Email Delivery</strong>
                  <span>Send a test email to verify SendGrid is working correctly</span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={testEmail}
                >
                  Send Test Email to My Inbox
                </button>
              </div>
            </div>

            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3>Database Management</h3>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="setting-label">
                  <strong>Synchronize Database Schema</strong>
                  <span style={{ color: '#dc3545', fontWeight: 600 }}>
                    CAUTION: This will add missing columns to the production database
                  </span>
                  <span style={{ display: 'block', marginTop: '0.5rem' }}>
                    This fixes all the "column does not exist" errors by adding missing database columns. Safe to run multiple times.
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={syncDatabaseSchema}
                >
                  Run Schema Sync
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Certification Modal */}
      {showCertModal && selectedCert && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Certification Preview</h3>
              <button className="modal-close" onClick={() => setShowCertModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedCert.file_type?.includes('pdf') || selectedCert.document_url?.includes('.pdf') ? (
                <div>
                  <p><strong>Worker:</strong> {selectedCert.worker_name}</p>
                  <p><strong>Document:</strong> {selectedCert.document_name}</p>
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <a
                      href={selectedCert.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textAlign: 'center' }}
                    >
                      Open PDF in New Tab
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <img
                    src={selectedCert.document_url}
                    alt="Certification"
                    className="cert-preview"
                    style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', margin: '1rem 0' }}
                  />
                  <p><strong>Worker:</strong> {selectedCert.worker_name}</p>
                  <p><strong>Document:</strong> {selectedCert.document_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reject Worker Application</h3>
              <button className="modal-close" onClick={() => setShowRejectionModal(false)}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                Provide a detailed reason for rejecting this application. The worker will be notified.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="5"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  fontFamily: 'inherit'
                }}
                placeholder="Enter rejection reason (minimum 10 characters)..."
              />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectionModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={rejectWorker}
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Worker Detail Modal */}
      {showWorkerDetailModal && selectedWorker && workerDetailData && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>{selectedWorker.name} - Details</h3>
              <button className="modal-close" onClick={closeWorkerDetailModal}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Basic Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                  Basic Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <strong>Worker ID:</strong> {selectedWorker.id}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedWorker.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {workerDetailData.phone || 'N/A'}
                  </div>
                  <div>
                    <strong>Speciality:</strong> {selectedWorker.speciality}
                  </div>
                  <div>
                    <strong>Service Area:</strong> {selectedWorker.area || 'N/A'}
                  </div>
                  <div>
                    <strong>Joined:</strong> {new Date(workerDetailData.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Email Verified:</strong> {selectedWorker.email_verified ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Approval Status:</strong> {selectedWorker.approval_status || 'pending'}
                  </div>
                </div>
              </div>

              {/* Editable Location Information */}
              {selectedWorker.approval_status === 'pending' && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                    Edit Location & Profile (Required for Approval)
                  </h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Province <span style={{ color: 'red' }}>*</span>
                      </label>
                      <select
                        value={editProvince}
                        onChange={(e) => setEditProvince(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="">Select Province</option>
                        <option value="Eastern Cape">Eastern Cape</option>
                        <option value="Free State">Free State</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Mpumalanga">Mpumalanga</option>
                        <option value="Northern Cape">Northern Cape</option>
                        <option value="North West">North West</option>
                        <option value="Western Cape">Western Cape</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Primary Suburb <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editPrimarySuburb}
                        onChange={(e) => setEditPrimarySuburb(e.target.value)}
                        placeholder="e.g., Sandton"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Secondary Areas (comma separated)
                      </label>
                      <input
                        type="text"
                        value={editSecondaryAreas}
                        onChange={(e) => setEditSecondaryAreas(e.target.value)}
                        placeholder="e.g., Rosebank, Parktown, Bryanston"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Bio
                      </label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        value={editExperience}
                        onChange={(e) => setEditExperience(e.target.value)}
                        placeholder="e.g., 5"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Specialties <span style={{ color: 'red' }}>*</span>
                      </label>

                      {/* Add New Specialty Input */}
                      <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: '#e3f2fd',
                        borderRadius: '4px',
                        border: '1px solid #2196F3'
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#1976d2' }}>
                          Add New Specialty
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={newSpecialtyName}
                            onChange={(e) => setNewSpecialtyName(e.target.value)}
                            placeholder="e.g., Solar Panel Installation"
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '1px solid #90caf9',
                              borderRadius: '4px'
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addNewSpecialty();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={addNewSpecialty}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#2196F3',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            ➕ Add
                          </button>
                        </div>
                        <small style={{ color: '#1565c0', display: 'block', marginTop: '0.5rem' }}>
                          If the worker's specialty isn't listed, add it here and it will be automatically selected
                        </small>
                      </div>

                      {/* Specialty Checkboxes */}
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '0.5rem'
                      }}>
                        {availableSpecialties.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
                            Loading specialties...
                          </p>
                        ) : (
                          availableSpecialties.map((specialty) => (
                            <label
                              key={specialty.id}
                              style={{
                                display: 'block',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                marginBottom: '0.25rem',
                                background: selectedSpecialties.includes(specialty.id) ? '#e8f5e9' : 'white',
                                border: selectedSpecialties.includes(specialty.id) ? '1px solid #4caf50' : '1px solid transparent'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedSpecialties.includes(specialty.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSpecialties([...selectedSpecialties, specialty.id]);
                                  } else {
                                    setSelectedSpecialties(selectedSpecialties.filter(id => id !== specialty.id));
                                  }
                                }}
                                style={{ marginRight: '0.5rem' }}
                              />
                              {specialty.name}
                            </label>
                          ))
                        )}
                      </div>
                      <small style={{ color: '#666', display: 'block', marginTop: '0.5rem', fontWeight: '600' }}>
                        ✓ Selected: {selectedSpecialties.length} {selectedSpecialties.length === 1 ? 'specialty' : 'specialties'}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* Bio (Read-only if not pending) */}
              {selectedWorker.approval_status !== 'pending' && selectedWorker.bio && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                    Bio
                  </h4>
                  <p style={{ color: '#666', lineHeight: '1.6' }}>{selectedWorker.bio}</p>
                </div>
              )}

              {/* Experience (Read-only if not pending) */}
              {selectedWorker.approval_status !== 'pending' && selectedWorker.experience && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                    Experience
                  </h4>
                  <p style={{ color: '#666' }}>
                    {selectedWorker.experience} years
                  </p>
                </div>
              )}

              {/* Address Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                  Address Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Street Address:</strong> {workerDetailData.address || 'N/A'}
                  </div>
                  <div>
                    <strong>City:</strong> {workerDetailData.city || 'N/A'}
                  </div>
                  <div>
                    <strong>Postal Code:</strong> {workerDetailData.postal_code || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                  Performance Statistics
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', color: '#2d5016', fontWeight: 'bold' }}>
                      {selectedWorker.total_bookings || 0}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Total Bookings</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', color: '#4a7c59', fontWeight: 'bold' }}>
                      {selectedWorker.completed_bookings || 0}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Completed</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', color: '#f39c12', fontWeight: 'bold' }}>
                      {selectedWorker.rating ? parseFloat(selectedWorker.rating).toFixed(2) + ' ⭐' : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Rating</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {selectedWorker.total_bookings > 0
                        ? Math.round((selectedWorker.completed_bookings / selectedWorker.total_bookings) * 100) + '%'
                        : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Completion Rate</div>
                  </div>
                </div>
              </div>

              {/* Change History */}
              {workerChangeHistory.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                    Profile Change History
                  </h4>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    {workerChangeHistory.map((change, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.75rem',
                          background: '#f8f9fa',
                          borderRadius: '6px',
                          borderLeft: '3px solid #4a7c59'
                        }}
                      >
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#4a7c59' }}>{change.field_changed}</strong>
                          <span style={{ color: '#999', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                            {new Date(change.changed_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{
                            padding: '0.5rem',
                            background: '#f8d7da',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            wordBreak: 'break-word'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#721c24', marginBottom: '0.25rem' }}>Old:</div>
                            <div>{change.old_value || '(empty)'}</div>
                          </div>
                          <div style={{ color: '#4a7c59', fontWeight: 'bold' }}>→</div>
                          <div style={{
                            padding: '0.5rem',
                            background: '#d4edda',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            wordBreak: 'break-word'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#155724', marginBottom: '0.25rem' }}>New:</div>
                            <div>{change.new_value || '(empty)'}</div>
                          </div>
                        </div>
                        {change.changed_by && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                            Changed by: {change.changed_by}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #4a7c59', paddingBottom: '0.5rem' }}>
                  Certifications
                </h4>
                <p style={{ color: '#666' }}>
                  {selectedWorker.approved_cert_count || 0} approved / {selectedWorker.cert_count || 0} total
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                <button
                  className="btn btn-secondary"
                  onClick={closeWorkerDetailModal}
                >
                  Close
                </button>
                {selectedWorker.approval_status === 'pending' && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={approveWorkerWithData}
                    >
                      ✅ Approve Worker
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        closeWorkerDetailModal();
                        openRejectModal(selectedWorker.id);
                      }}
                    >
                      ❌ Reject Application
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Worker Verification Modal */}
      {showVerificationModal && verificationWorker && (
        <div className="modal show">
          <div className="modal-content" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>Worker Verification - {verificationWorker.name}</h3>
              <button className="modal-close" onClick={() => setShowVerificationModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>

              {/* Progress Tracker */}
              <div style={{
                background: 'linear-gradient(135deg, #4a7c59 0%, #357a48 100%)',
                color: 'white',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>
                  {Object.values(verificationStates).filter(v => v).length} of 5 Verification Steps Completed
                </h4>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: '5px',
                  marginTop: '0.5rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(Object.values(verificationStates).filter(v => v).length / 5) * 100}%`,
                    height: '100%',
                    background: 'white',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>

              {/* Step 1: Profile Picture Verification */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                border: `2px solid ${verificationStates.verified_profile_pic ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                background: verificationStates.verified_profile_pic ? '#f0f9f4' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={verificationStates.verified_profile_pic}
                    onChange={(e) => {
                      const newStates = {
                        ...verificationStates,
                        verified_profile_pic: e.target.checked
                      };
                      setVerificationStates(newStates);
                      saveVerificationStates(newStates);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      marginTop: '0.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                      1. Profile Picture Verification
                    </h4>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {verificationWorker.profile_picture ? (
                          <>
                            <img
                              src={verificationWorker.profile_picture}
                              alt="Profile"
                              style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #4a7c59'
                              }}
                            />
                            <div>
                              <p style={{ margin: 0, color: '#28a745', fontWeight: '600' }}>✅ Profile picture uploaded</p>
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                                Verify that the photo is clear and professional
                              </p>
                            </div>
                          </>
                        ) : (
                          <div>
                            <p style={{ margin: 0, color: '#dc3545', fontWeight: '600' }}>❌ No profile picture</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                              Worker needs to upload a profile photo
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Admin Upload Photo */}
                      <div style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#e3f2fd',
                        borderRadius: '6px',
                        border: '1px solid #90caf9'
                      }}>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#1976d2', fontSize: '0.95rem' }}>
                          📤 Admin Upload (Help Worker Upload Photo)
                        </h5>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#666' }}>
                          Upload a profile photo on behalf of this worker
                        </p>

                        <input
                          type="file"
                          ref={profilePhotoInputRef}
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleProfilePhotoChange}
                          style={{ display: 'none' }}
                        />

                        {photoPreview && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '600' }}>Preview:</p>
                            <img
                              src={photoPreview}
                              alt="Preview"
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #1976d2'
                              }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => profilePhotoInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            style={{
                              background: '#1976d2',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem'
                            }}
                          >
                            {photoPreview ? '📷 Choose Different Photo' : '📷 Choose Photo'}
                          </button>

                          {photoPreview && (
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => {
                                const file = profilePhotoInputRef.current?.files[0];
                                if (file) uploadProfilePhotoForWorker(file);
                              }}
                              disabled={uploadingPhoto}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.9rem'
                              }}
                            >
                              {uploadingPhoto ? '⏳ Uploading...' : '✅ Upload Photo'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: ID/Passport Information */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                border: `2px solid ${verificationStates.verified_id_info ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                background: verificationStates.verified_id_info ? '#f0f9f4' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={verificationStates.verified_id_info}
                    onChange={(e) => {
                      const newStates = {
                        ...verificationStates,
                        verified_id_info: e.target.checked
                      };
                      setVerificationStates(newStates);
                      saveVerificationStates(newStates);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      marginTop: '0.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                      2. ID/Passport Information
                    </h4>
                    <div style={{ fontSize: '0.95rem', color: '#666' }}>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>ID Number:</strong> {verificationWorker.id_number || '❌ Not provided'}
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Passport Number:</strong> {verificationWorker.passport_number || '❌ Not provided'}
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Verify that ID or Passport information is provided
                      </p>

                      {/* Display uploaded ID document if exists */}
                      {verificationWorker.id_document_url && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '0.75rem',
                          background: '#e8f5e9',
                          borderRadius: '4px',
                          border: '1px solid #4caf50'
                        }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#2e7d32' }}>
                            ✅ {verificationWorker.id_document_type === 'passport' ? 'Passport' : 'ID'} Document Uploaded
                          </p>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              openPdfViewer(verificationWorker.id_document_url);
                            }}
                            style={{ color: '#1976d2', textDecoration: 'underline', fontSize: '0.9rem', cursor: 'pointer' }}
                          >
                            View Document
                          </a>
                        </div>
                      )}

                      {/* Admin Upload ID/Passport */}
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px dashed #4a7c59'
                      }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#4a7c59' }}>
                          📎 Upload ID/Passport for Worker
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '500' }}>
                              Document Type:
                            </label>
                            <select
                              value={idDocumentType}
                              onChange={(e) => setIdDocumentType(e.target.value)}
                              disabled={uploadingID}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                background: 'white'
                              }}
                            >
                              <option value="id">ID Document</option>
                              <option value="passport">Passport</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="file"
                              ref={idInputRef}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  uploadIDForWorker(file);
                                }
                              }}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={uploadingID}
                              style={{ display: 'none' }}
                            />
                            <button
                              onClick={() => idInputRef.current?.click()}
                              disabled={uploadingID}
                              className="btn"
                              style={{
                                background: uploadingID ? '#6c757d' : '#4a7c59',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                fontSize: '0.9rem',
                                cursor: uploadingID ? 'not-allowed' : 'pointer',
                                width: '100%'
                              }}
                            >
                              {uploadingID ? '⏳ Uploading...' : '📤 Choose & Upload File'}
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                            Accepted: PDF, JPG, PNG (max 10MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Emergency Contacts */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                border: `2px solid ${verificationStates.verified_emergency ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                background: verificationStates.verified_emergency ? '#f0f9f4' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={verificationStates.verified_emergency}
                    onChange={(e) => {
                      const newStates = {
                        ...verificationStates,
                        verified_emergency: e.target.checked
                      };
                      setVerificationStates(newStates);
                      saveVerificationStates(newStates);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      marginTop: '0.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                      3. Emergency Contact Information
                    </h4>
                    <div style={{ fontSize: '0.95rem', color: '#666' }}>
                      {emergencyContact1 ? (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ margin: '0.25rem 0', fontWeight: '600', color: '#28a745' }}>✅ Emergency Contact 1:</p>
                          <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {emergencyContact1.name}</p>
                          <p style={{ margin: '0.25rem 0' }}><strong>Phone:</strong> {emergencyContact1.phone}</p>
                          <p style={{ margin: '0.25rem 0' }}><strong>Relationship:</strong> {emergencyContact1.relationship}</p>
                        </div>
                      ) : (
                        <p style={{ margin: '0.25rem 0', color: '#dc3545' }}>❌ Emergency Contact 1 not provided</p>
                      )}

                      {emergencyContact2 ? (
                        <div>
                          <p style={{ margin: '0.25rem 0', fontWeight: '600', color: '#28a745' }}>✅ Emergency Contact 2:</p>
                          <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {emergencyContact2.name}</p>
                          <p style={{ margin: '0.25rem 0' }}><strong>Phone:</strong> {emergencyContact2.phone}</p>
                          <p style={{ margin: '0.25rem 0' }}><strong>Relationship:</strong> {emergencyContact2.relationship}</p>
                        </div>
                      ) : (
                        <p style={{ margin: '0.25rem 0', color: '#ffc107' }}>⚠️ Emergency Contact 2 not provided (optional)</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Professional Details */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                border: `2px solid ${verificationStates.verified_professional ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                background: verificationStates.verified_professional ? '#f0f9f4' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={verificationStates.verified_professional}
                    onChange={(e) => {
                      const newStates = {
                        ...verificationStates,
                        verified_professional: e.target.checked
                      };
                      setVerificationStates(newStates);
                      saveVerificationStates(newStates);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      marginTop: '0.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                      4. Professional Information (Edit Before Approval)
                    </h4>
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Bio
                        </label>
                        <textarea
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Professional bio..."
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Years of Experience
                        </label>
                        <input
                          type="text"
                          value={editExperience}
                          onChange={(e) => setEditExperience(e.target.value)}
                          placeholder="e.g., 5 years"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Province <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select
                          value={editProvince}
                          onChange={(e) => setEditProvince(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        >
                          <option value="">Select Province</option>
                          <option value="Eastern Cape">Eastern Cape</option>
                          <option value="Free State">Free State</option>
                          <option value="Gauteng">Gauteng</option>
                          <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                          <option value="Limpopo">Limpopo</option>
                          <option value="Mpumalanga">Mpumalanga</option>
                          <option value="Northern Cape">Northern Cape</option>
                          <option value="North West">North West</option>
                          <option value="Western Cape">Western Cape</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Primary Suburb <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={editPrimarySuburb}
                          onChange={(e) => setEditPrimarySuburb(e.target.value)}
                          placeholder="e.g., Sandton"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Secondary Areas (comma separated)
                        </label>
                        <input
                          type="text"
                          value={editSecondaryAreas}
                          onChange={(e) => setEditSecondaryAreas(e.target.value)}
                          placeholder="e.g., Rosebank, Midrand, Fourways"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        />
                      </div>

                      {/* Specialties Section */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Specialties <span style={{ color: 'red' }}>*</span>
                          {selectedSpecialties.length > 0 && (
                            <span style={{ color: '#28a745', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                              ({selectedSpecialties.length} selected)
                            </span>
                          )}
                        </label>

                        {/* Add New Specialty */}
                        <div style={{
                          background: '#e3f2fd',
                          padding: '1rem',
                          borderRadius: '6px',
                          marginBottom: '1rem',
                          border: '1px solid #90caf9'
                        }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <input
                              type="text"
                              value={newSpecialtyName}
                              onChange={(e) => setNewSpecialtyName(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNewSpecialty();
                                }
                              }}
                              placeholder="Add new specialty (e.g., Solar Panel Installation)"
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #42a5f5',
                                borderRadius: '4px'
                              }}
                            />
                            <button
                              onClick={addNewSpecialty}
                              className="btn btn-primary"
                              style={{
                                padding: '0.5rem 1rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ➕ Add
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                            Can't find the right specialty? Add a new one here.
                          </p>
                        </div>

                        {availableSpecialties.length === 0 ? (
                          <p style={{ color: '#666', fontStyle: 'italic' }}>Loading specialties...</p>
                        ) : (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '0.5rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}>
                            {availableSpecialties.map(spec => (
                              <label
                                key={spec.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  background: selectedSpecialties.includes(spec.id) ? '#d4edda' : 'white',
                                  border: selectedSpecialties.includes(spec.id) ? '2px solid #28a745' : '1px solid #ddd',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSpecialties.includes(spec.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSpecialties([...selectedSpecialties, spec.id]);
                                    } else {
                                      setSelectedSpecialties(selectedSpecialties.filter(id => id !== spec.id));
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.9rem' }}>{spec.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Documents/Certifications */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                border: `2px solid ${verificationStates.verified_documents ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                background: verificationStates.verified_documents ? '#f0f9f4' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={verificationStates.verified_documents}
                    onChange={(e) => {
                      const newStates = {
                        ...verificationStates,
                        verified_documents: e.target.checked
                      };
                      setVerificationStates(newStates);
                      saveVerificationStates(newStates);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      marginTop: '0.25rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                      5. Documents & Certifications
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#666' }}>
                      Required: Proof of Residence, Certified ID Copy, Relevant Certifications
                    </p>

                    {workerCertifications.length > 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <p style={{ margin: 0, fontWeight: '600', color: '#28a745' }}>
                            ✅ {workerCertifications.length} Document(s) Uploaded:
                          </p>
                          <button
                            onClick={() => deleteAllWorkerCertifications(verificationWorker.id)}
                            className="btn"
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.8rem',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Delete All
                          </button>
                        </div>
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'none' }}>
                          {workerCertifications.map(cert => (
                            <li key={cert.id} style={{
                              marginBottom: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: '#f8f9fa',
                              borderRadius: '4px'
                            }}>
                              <div style={{ flex: 1 }}>
                                {cert.file_type === 'pdf' ? (
                                  <a
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openPdfViewer(cert.document_url);
                                    }}
                                    style={{ color: '#4a7c59', textDecoration: 'underline', fontWeight: '500', cursor: 'pointer' }}
                                  >
                                    {cert.document_name}
                                  </a>
                                ) : (
                                  <a
                                    href={cert.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#4a7c59', textDecoration: 'underline', fontWeight: '500' }}
                                  >
                                    {cert.document_name}
                                  </a>
                                )}
                                {' '}
                                <span style={{
                                  fontSize: '0.85rem',
                                  color: cert.status === 'approved' ? '#28a745' :
                                         cert.status === 'rejected' ? '#dc3545' : '#ffc107'
                                }}>
                                  ({cert.status})
                                </span>
                              </div>
                              <button
                                onClick={() => deleteCertification(cert.id)}
                                className="btn"
                                style={{
                                  background: '#dc3545',
                                  color: 'white',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  minWidth: '60px'
                                }}
                                title="Delete this certification"
                              >
                                🗑️ Delete
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: '#dc3545' }}>❌ No documents uploaded yet</p>
                    )}

                    {/* Admin Upload Certification */}
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px dashed #4a7c59'
                    }}>
                      <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#4a7c59' }}>
                        📎 Upload Document for Worker
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '500' }}>
                            Document Name:
                          </label>
                          <input
                            type="text"
                            value={certDocumentName}
                            onChange={(e) => setCertDocumentName(e.target.value)}
                            placeholder="e.g., ID Copy, Proof of Residence"
                            disabled={uploadingCertification}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="file"
                            ref={certificationInputRef}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                uploadCertificationForWorker(file);
                              }
                            }}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            disabled={uploadingCertification}
                            style={{ display: 'none' }}
                          />
                          <button
                            onClick={() => {
                              if (!certDocumentName.trim()) {
                                showMessage('Please enter a document name first', 'error');
                                return;
                              }
                              certificationInputRef.current?.click();
                            }}
                            disabled={uploadingCertification}
                            className="btn"
                            style={{
                              background: uploadingCertification ? '#6c757d' : '#4a7c59',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem',
                              cursor: uploadingCertification ? 'not-allowed' : 'pointer',
                              width: '100%'
                            }}
                          >
                            {uploadingCertification ? '⏳ Uploading...' : '📤 Choose & Upload File'}
                          </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                          Accepted: PDF, JPG, PNG, DOC, DOCX (max 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={saveVerificationStates}
                  className="btn"
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    flex: 1,
                    minWidth: '150px'
                  }}
                >
                  💾 Save Progress
                </button>

                <button
                  onClick={sendIncompleteProfileEmail}
                  className="btn"
                  style={{
                    background: '#ffc107',
                    color: '#333',
                    flex: 1,
                    minWidth: '150px'
                  }}
                >
                  📧 Send Reminder Email
                </button>

                <button
                  onClick={async () => {
                    await toggleVerified(verificationWorker.id);
                    // Reload worker details to show updated verified status
                    const response = await fetch(`/admin/worker-detail/${verificationWorker.id}`, {
                      credentials: 'include'
                    });
                    const data = await response.json();
                    if (data.success) {
                      setVerificationWorker({
                        ...verificationWorker,
                        is_verified: data.details.is_verified
                      });
                    }
                  }}
                  className="btn"
                  style={{
                    background: verificationWorker?.is_verified ? '#dc3545' : '#28a745',
                    color: 'white',
                    flex: 1,
                    minWidth: '150px'
                  }}
                >
                  {verificationWorker?.is_verified ? '❌ Remove Verified Badge' : '✅ Add Verified Badge'}
                </button>

                <button
                  onClick={approveWorkerFromVerification}
                  disabled={!Object.values(verificationStates).every(v => v === true)}
                  className="btn"
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    background: Object.values(verificationStates).every(v => v === true) ? '#4a7c59' : '#ccc',
                    color: 'white',
                    opacity: Object.values(verificationStates).every(v => v === true) ? 1 : 0.7,
                    cursor: Object.values(verificationStates).every(v => v === true) ? 'pointer' : 'not-allowed'
                  }}
                  title={!Object.values(verificationStates).every(v => v === true) ? 'Complete all 5 verification steps first' : 'Approve worker'}
                >
                  ✅ Approve Worker
                </button>

                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="btn"
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    flex: 1,
                    minWidth: '150px'
                  }}
                >
                  ✖️ Close
                </button>
              </div>

              {/* Helper Text */}
              {!Object.values(verificationStates).every(v => v === true) && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#856404'
                }}>
                  ⚠️ <strong>Note:</strong> All 5 verification steps must be checked before you can approve this worker.
                  Save your progress as you go, and send reminder emails for missing information.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer style={{
        marginTop: '3rem',
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, #2d5016 0%, #4a7c59 100%)',
        borderRadius: '12px',
        color: 'white'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {/* Platform Links */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Platform</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  🏠 Home
                </a>
                <a href="/about" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  ℹ️ About Us
                </a>
                <a href="/service" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  🔧 Services
                </a>
                <a href="/contact" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  📧 Contact
                </a>
              </div>
            </div>

            {/* Support Links */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Support</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/support" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  🆘 Help Center
                </a>
                <a href="/faq" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  ❓ FAQ
                </a>
                <a href="/safety" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  🛡️ Safety
                </a>
              </div>
            </div>

            {/* Legal Links */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Legal</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/privacy" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  🔒 Privacy Policy
                </a>
                <a href="/terms" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  📜 Terms of Service
                </a>
              </div>
            </div>

            {/* Admin Links */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Admin Tools</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.9)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('pending-workers')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.9)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  ⏳ Pending Workers
                </button>
                <button
                  onClick={() => setActiveTab('workers')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.9)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  👷 Professionals
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.9)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '1rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.8)'
          }}>
            © {new Date().getFullYear()} Fixxa. All rights reserved. | Admin Dashboard
          </div>
        </div>
      </footer>

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '95vw',
            maxHeight: '95vh',
            width: '1200px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8f9fa'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>{pdfViewerTitle}</h3>
              <button
                onClick={closePdfViewer}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: '#666',
                  lineHeight: 1,
                  padding: 0,
                  width: '32px',
                  height: '32px'
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Toolbar */}
            <div style={{
              padding: '1rem',
              background: '#f5f5f5',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              borderBottom: '1px solid #ddd'
            }}>
              <button
                onClick={() => window.open(pdfViewerUrl, '_blank')}
                className="btn"
                style={{
                  background: '#4a7c59',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem'
                }}
              >
                📥 Download Document
              </button>
            </div>

            {/* PDF Viewer */}
            <div style={{
              flex: 1,
              background: 'white',
              border: '1px solid #ddd',
              overflow: 'hidden',
              height: '75vh'
            }}>
              <iframe
                src={pdfViewerUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title={pdfViewerTitle}
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.75rem',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#666',
              background: '#f8f9fa',
              borderTop: '1px solid #ddd'
            }}>
              If the document doesn't display, click the Download button above to view it locally.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
