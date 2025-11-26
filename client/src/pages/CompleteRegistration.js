import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from '../components/ProgressBar';
import DocumentUpload from '../components/DocumentUpload';
import './CompleteRegistration.css';

// Version 2.0 - Fixed JSON serialization for form submission
const CompleteRegistration = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  console.log('CompleteRegistration v2.0 - Form submission fix active');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form data for all steps
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    fullName: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',

    // Step 2: ID Document
    documentType: 'id', // 'id' or 'passport'
    idDocument: null,
    idNumber: '',
    passportNumber: '',

    // Step 3: Proof of Address
    proofOfAddress: null,

    // Step 4: Certifications
    certifications: [],

    // Step 5: References
    references: [
      { name: '', phone: '', email: '', relationship: '' },
    ],

    // Step 6: Terms
    termsAccepted: false,
    privacyAccepted: false,
  });

  const steps = [
    { label: 'Personal Info' },
    { label: 'ID Document' },
    { label: 'Proof of Address' },
    { label: 'Certifications' },
    { label: 'References' },
    { label: 'Terms' },
  ];

  const totalSteps = steps.length;

  // Redirect if not authenticated or not a worker
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.type !== 'professional') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  // Load existing worker profile data and localStorage backup
  useEffect(() => {
    const loadWorkerProfile = async () => {
      if (!isAuthenticated || user?.type !== 'professional') return;

      // First, check localStorage for any previously entered data
      const savedFormData = localStorage.getItem('completeRegistrationFormData');
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          console.log('Restored form data from localStorage:', parsed);
          setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.log('Could not parse saved form data');
        }
      }

      // Then, load profile data from server (will override localStorage if exists)
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/workers/profile`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Loaded existing profile data:', data);

          // Pre-fill form with existing data
          setFormData(prev => ({
            ...prev,
            fullName: data.name || prev.fullName,
            phone: data.phone || prev.phone,
            address: data.address || prev.address,
            city: data.city || prev.city,
            province: data.province || prev.province,
            postalCode: data.postal_code || prev.postalCode,
            idNumber: data.id_number || prev.idNumber,
            passportNumber: data.passport_number || prev.passportNumber,
            documentType: data.passport_number ? 'passport' : (data.id_number ? 'id' : prev.documentType),
            // Note: File uploads will need to be re-uploaded as we can't pre-fill file inputs
          }));
        }
      } catch (error) {
        console.log('Could not load existing profile data:', error);
        // Silently fail - user can still fill in the form
      }
    };

    loadWorkerProfile();
  }, [isAuthenticated, user]);

  // Save form data to localStorage whenever it changes (excluding file objects)
  useEffect(() => {
    const dataToSave = {
      ...formData,
      // Exclude file objects as they can't be stringified
      idDocument: null,
      proofOfAddress: null,
      certifications: []
    };
    localStorage.setItem('completeRegistrationFormData', JSON.stringify(dataToSave));
  }, [formData]);

  const handleInputChange = (field, value) => {
    console.log('Input changed:', field, '=', value);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      console.log('Updated formData:', updated);
      return updated;
    });
    setMessage({ text: '', type: '' });
  };

  const handleReferenceChange = (index, field, value) => {
    const updatedReferences = [...formData.references];
    updatedReferences[index][field] = value;
    setFormData(prev => ({ ...prev, references: updatedReferences }));
    setMessage({ text: '', type: '' });
  };

  const handleFileUpload = async (field, file) => {
    // Create FormData for file upload
    const fileData = new FormData();
    fileData.append('file', file);
    fileData.append('type', field);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: fileData,
      });

      const data = await response.json();

      if (data.success) {
        handleInputChange(field, {
          name: file.name,
          size: file.size,
          url: data.url,
        });
        setMessage({ text: 'File uploaded successfully!', type: 'success' });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      setMessage({ text: error.message || 'Failed to upload file', type: 'error' });
      throw error;
    }
  };

  const handleCertificationUpload = async (files) => {
    const uploadedFiles = [];

    for (const file of (Array.isArray(files) ? files : [files])) {
      const fileData = new FormData();
      fileData.append('file', file);
      fileData.append('type', 'certification');

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/upload`, {
          method: 'POST',
          credentials: 'include',
          body: fileData,
        });

        const data = await response.json();

        if (data.success) {
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            url: data.url,
          });
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (error) {
        setMessage({ text: error.message || 'Failed to upload certification', type: 'error' });
        throw error;
      }
    }

    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, ...uploadedFiles],
    }));

    setMessage({ text: 'Certification(s) uploaded successfully!', type: 'success' });
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const validateStep = (step) => {
    setMessage({ text: '', type: '' });
    console.log('Validating step:', step);
    console.log('Form data:', formData);

    switch (step) {
      case 1:
        console.log('Checking step 1 fields:', {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          province: formData.province
        });

        if (!formData.fullName || !formData.phone || !formData.address || !formData.city || !formData.province) {
          console.log('Step 1 validation failed: missing required fields');
          setMessage({ text: 'Please fill in all required fields', type: 'error' });
          return false;
        }
        if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
          console.log('Step 1 validation failed: invalid phone number');
          setMessage({ text: 'Please enter a valid 10-digit phone number', type: 'error' });
          return false;
        }
        console.log('Step 1 validation passed!');
        break;

      case 2:
        console.log('Checking step 2 fields:', {
          documentType: formData.documentType,
          idDocument: formData.idDocument,
          idNumber: formData.idNumber,
          passportNumber: formData.passportNumber
        });

        if (!formData.idDocument) {
          console.log('Step 2 validation failed: missing document upload');
          setMessage({ text: 'Please upload your identification document', type: 'error' });
          return false;
        }

        if (formData.documentType === 'id') {
          if (!formData.idNumber || formData.idNumber.length < 8) {
            console.log('Step 2 validation failed: invalid ID number');
            setMessage({ text: 'Please enter a valid ID number', type: 'error' });
            return false;
          }
        } else if (formData.documentType === 'passport') {
          if (!formData.passportNumber || formData.passportNumber.length < 5) {
            console.log('Step 2 validation failed: invalid passport number');
            setMessage({ text: 'Please enter a valid passport number', type: 'error' });
            return false;
          }
        }

        console.log('Step 2 validation passed!');
        break;

      case 3:
        if (!formData.proofOfAddress) {
          setMessage({ text: 'Please upload proof of address', type: 'error' });
          return false;
        }
        break;

      case 4:
        // Certifications are optional
        break;

      case 5:
        // Require at least one reference
        if (formData.references.length === 0) {
          setMessage({ text: 'Please provide at least one reference', type: 'error' });
          return false;
        }

        // Validate each reference that has been added
        for (let i = 0; i < formData.references.length; i++) {
          const ref = formData.references[i];
          // First reference is required, others are optional
          if (i === 0 || ref.name || ref.phone || ref.relationship || ref.email) {
            if (!ref.name || !ref.phone || !ref.relationship) {
              setMessage({ text: `Please complete all required fields for Reference ${i + 1}`, type: 'error' });
              return false;
            }
            if (ref.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ref.email)) {
              setMessage({ text: `Please enter a valid email for Reference ${i + 1}`, type: 'error' });
              return false;
            }
          }
        }
        break;

      case 6:
        if (!formData.termsAccepted || !formData.privacyAccepted) {
          setMessage({ text: 'Please accept all terms and conditions', type: 'error' });
          return false;
        }
        break;

      default:
        break;
    }

    return true;
  };

  const handleNext = () => {
    console.log('handleNext called, currentStep:', currentStep);
    const isValid = validateStep(currentStep);
    console.log('Validation result:', isValid);

    if (isValid) {
      if (currentStep < totalSteps) {
        console.log('Moving to next step:', currentStep + 1);
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.log('Already at last step');
      }
    } else {
      console.log('Validation failed, not moving to next step');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Create a sanitized version of formData without File objects
      // Only send URLs and metadata since files were already uploaded
      const sanitizedData = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        documentType: formData.documentType,
        idNumber: formData.idNumber,
        passportNumber: formData.passportNumber,
        // Extract URL from uploaded file object
        idDocumentUrl: formData.idDocument?.url || formData.idDocumentUrl,
        // Extract URL from uploaded file object
        proofOfAddressUrl: formData.proofOfAddress?.url || formData.proofOfAddressUrl,
        // Extract URLs from certification file objects
        certificationUrls: formData.certifications?.map(cert => cert?.url).filter(Boolean) || formData.certificationUrls || [],
        yearsExperience: formData.yearsExperience,
        portfolioDescription: formData.portfolioDescription,
        references: formData.references,
      };

      console.log('Submitting sanitized registration data:', sanitizedData);

      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/worker/complete-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(sanitizedData),
      });

      const data = await response.json();

      if (data.success) {
        // Clear localStorage since registration is complete
        localStorage.removeItem('completeRegistrationFormData');

        setMessage({
          text: 'Registration completed successfully! Redirecting to your dashboard...',
          type: 'success',
        });
        setTimeout(() => {
          navigate('/worker-dashboard');
        }, 2000);
      } else {
        setMessage({
          text: data.error || 'Failed to complete registration. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({
        text: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Personal Information</h2>
              <p>Please provide your personal details</p>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="fullName">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number <span className="required">*</span></label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="0XX XXX XXXX"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="0000"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="address">Street Address <span className="required">*</span></label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your street address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City <span className="required">*</span></label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter your city"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="province">Province <span className="required">*</span></label>
                <select
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  required
                >
                  <option value="">Select province</option>
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
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Identification Document</h2>
              <p>Upload a clear copy of your ID or Passport</p>
            </div>

            <div className="form-group">
              <label htmlFor="documentType">Document Type <span className="required">*</span></label>
              <select
                id="documentType"
                value={formData.documentType}
                onChange={(e) => handleInputChange('documentType', e.target.value)}
                required
              >
                <option value="id">South African ID</option>
                <option value="passport">Passport (Foreign Nationals)</option>
              </select>
            </div>

            {formData.documentType === 'id' ? (
              <div className="form-group">
                <label htmlFor="idNumber">ID Number <span className="required">*</span></label>
                <input
                  type="text"
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  placeholder="Enter your ID number"
                  maxLength="13"
                  required
                />
                <small className="form-hint">Your 13-digit South African ID number</small>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="passportNumber">Passport Number <span className="required">*</span></label>
                <input
                  type="text"
                  id="passportNumber"
                  value={formData.passportNumber}
                  onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                  placeholder="Enter your passport number"
                  required
                />
                <small className="form-hint">Your passport number as shown on your document</small>
              </div>
            )}

            <DocumentUpload
              label={`Upload ${formData.documentType === 'id' ? 'ID' : 'Passport'} Document`}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={5}
              required={true}
              hint={`Please upload a clear, legible copy of your ${formData.documentType === 'id' ? 'ID' : 'passport'} (PDF, JPG, or PNG, max 5MB)`}
              onChange={(file) => handleFileUpload('idDocument', file)}
              existingFiles={formData.idDocument ? [formData.idDocument] : []}
              onRemove={() => handleInputChange('idDocument', null)}
            />
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Proof of Address</h2>
              <p>Upload a recent proof of residence (not older than 3 months)</p>
            </div>

            <div className="info-box">
              <div className="info-icon">ℹ️</div>
              <div>
                <p className="info-title">Acceptable documents:</p>
                <ul className="info-list">
                  <li>Utility bill (electricity, water, gas)</li>
                  <li>Bank statement</li>
                  <li>Municipal rates account</li>
                  <li>Lease agreement</li>
                </ul>
              </div>
            </div>

            <DocumentUpload
              label="Upload Proof of Address"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={5}
              required={true}
              hint="Document must not be older than 3 months"
              onChange={(file) => handleFileUpload('proofOfAddress', file)}
              existingFiles={formData.proofOfAddress ? [formData.proofOfAddress] : []}
              onRemove={() => handleInputChange('proofOfAddress', null)}
            />
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Professional Certifications</h2>
              <p>Upload any relevant certificates, licenses, or qualifications (optional)</p>
            </div>

            <div className="info-box success">
              <div className="info-icon">💡</div>
              <div>
                <p className="info-text">
                  Adding certifications increases your credibility and helps you stand out to potential clients!
                </p>
              </div>
            </div>

            <DocumentUpload
              label="Upload Certifications"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={5}
              multiple={true}
              required={false}
              hint="You can upload multiple certificates (trade license, safety training, etc.)"
              onChange={handleCertificationUpload}
              existingFiles={formData.certifications}
              onRemove={removeCertification}
            />
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Professional References</h2>
              <p>Provide at least one professional reference who can vouch for your work</p>
            </div>

            {formData.references.map((reference, index) => (
              <div key={index} className="reference-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="reference-title">Reference {index + 1}{index === 0 && <span className="required"> *</span>}</h3>
                  {formData.references.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newRefs = formData.references.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, references: newRefs }));
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor={`ref${index}Name`}>Full Name <span className="required">*</span></label>
                    <input
                      type="text"
                      id={`ref${index}Name`}
                      value={reference.name}
                      onChange={(e) => handleReferenceChange(index, 'name', e.target.value)}
                      placeholder="Reference full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={`ref${index}Phone`}>Phone Number <span className="required">*</span></label>
                    <input
                      type="tel"
                      id={`ref${index}Phone`}
                      value={reference.phone}
                      onChange={(e) => handleReferenceChange(index, 'phone', e.target.value)}
                      placeholder="0XX XXX XXXX"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={`ref${index}Email`}>Email Address</label>
                    <input
                      type="email"
                      id={`ref${index}Email`}
                      value={reference.email}
                      onChange={(e) => handleReferenceChange(index, 'email', e.target.value)}
                      placeholder="reference@email.com"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor={`ref${index}Relationship`}>Relationship <span className="required">*</span></label>
                    <input
                      type="text"
                      id={`ref${index}Relationship`}
                      value={reference.relationship}
                      onChange={(e) => handleReferenceChange(index, 'relationship', e.target.value)}
                      placeholder="e.g., Former employer, client, colleague"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  references: [...prev.references, { name: '', phone: '', email: '', relationship: '' }]
                }));
              }}
              style={{
                background: 'var(--fixxa-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                marginTop: '1rem',
                width: '100%'
              }}
            >
              + Add Another Reference
            </button>
          </div>
        );

      case 6:
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Terms & Conditions</h2>
              <p>Please review and accept our terms to complete your registration</p>
            </div>

            <div className="terms-box">
              <h3>Terms of Service</h3>
              <div className="terms-content">
                <p>By accepting these terms, you agree to:</p>
                <ul>
                  <li>Provide accurate and truthful information</li>
                  <li>Maintain professional conduct with clients</li>
                  <li>Deliver quality services as advertised</li>
                  <li>Respond to client inquiries in a timely manner</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Pay any applicable service fees</li>
                  <li>Allow Fixxa to verify your credentials</li>
                </ul>
              </div>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                  required
                />
                <span>
                  I accept the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                  <span className="required"> *</span>
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.privacyAccepted}
                  onChange={(e) => handleInputChange('privacyAccepted', e.target.checked)}
                  required
                />
                <span>
                  I accept the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                  <span className="required"> *</span>
                </span>
              </label>
            </div>

            <div className="info-box success">
              <div className="info-icon">🎉</div>
              <div>
                <p className="info-text">
                  You're almost done! After submitting, your profile will be reviewed by our team.
                  You'll receive a notification once approved.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isAuthenticated || user?.type !== 'professional') {
    return null;
  }

  return (
    <div className="complete-registration-container">
      <div className="complete-registration-card">
        {/* Header */}
        <div className="registration-header">
          <h1>Complete Your Registration</h1>
          <p className="registration-subtitle">
            Finish setting up your professional profile to start receiving job requests
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          currentStep={currentStep}
          totalSteps={totalSteps}
          steps={steps}
        />

        {/* Message */}
        {message.text && (
          <div className={`message ${message.type}`}>
            <span className="message-icon">
              {message.type === 'success' ? '✓' : '⚠'}
            </span>
            {message.text}
          </div>
        )}

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="step-navigation">
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
          >
            ← Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              disabled={loading}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Submitting...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteRegistration;
