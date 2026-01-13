import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

const Privacy = () => {
  return (
    <div className="static-page">
      <div className="static-container">
        <h1>Privacy Policy</h1>
        <p className="last-updated"><em>Last updated: January 13, 2026</em></p>

        <p>At Fixxa, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, including our website and mobile applications (iOS and Android).</p>

        <h2>1. Information We Collect</h2>
        <h3>Personal Information</h3>
        <p>When you register on Fixxa, we collect:</p>
        <ul>
          <li>Name and contact information (email, phone number)</li>
          <li>Profile information and photos</li>
          <li>Location data (when you enable location services)</li>
          <li>Payment information (for professionals)</li>
          <li>Service history and reviews</li>
          <li>Business information (for service professionals)</li>
          <li>Certifications and qualifications (for verification)</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <p>We automatically collect certain information when you use Fixxa:</p>
        <ul>
          <li>Device information and IP address</li>
          <li>Browser type and operating system</li>
          <li>Usage data and analytics</li>
          <li>Cookies and similar tracking technologies</li>
          <li>App interactions and feature usage</li>
        </ul>

        <h3>Mobile App Permissions</h3>
        <p>Our mobile applications may request the following permissions:</p>
        <ul>
          <li><strong>Location:</strong> To find professionals near you and show distances to service providers. You can enable or disable this in your device settings.</li>
          <li><strong>Camera:</strong> To upload photos of completed work and service documentation. Only used when you choose to take photos.</li>
          <li><strong>Photo Library:</strong> To upload images for your profile, portfolio, and service documentation. Only used when you select photos.</li>
          <li><strong>Notifications:</strong> To send you booking updates, messages, and important alerts (optional).</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <h3>Core Services</h3>
        <p>We use your information to:</p>
        <ul>
          <li>Create and manage your account</li>
          <li>Connect clients with professionals</li>
          <li>Process registrations and verifications</li>
          <li>Facilitate bookings and appointments</li>
          <li>Enable in-app messaging and communication</li>
          <li>Display reviews and ratings</li>
        </ul>

        <h3>Location Services (Mobile App)</h3>
        <p>When you grant location permission, we use your location to:</p>
        <ul>
          <li>Show professionals near your location</li>
          <li>Calculate distances to service providers</li>
          <li>Improve search results based on proximity</li>
          <li>We never track your location in the background</li>
        </ul>

        <h3>Safety, Security & Improvement</h3>
        <p>We also use your information to:</p>
        <ul>
          <li>Verify professional credentials and prevent fraud</li>
          <li>Send service updates and notifications</li>
          <li>Improve our platform and user experience</li>
          <li>Ensure platform security</li>
          <li>Comply with legal obligations</li>
          <li>Analyze app usage to fix bugs and develop new features</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p><strong>We DO NOT sell your personal information.</strong> We only share information in these circumstances:</p>

        <h3>With Service Professionals</h3>
        <ul>
          <li>Your name and contact information when you book a service</li>
          <li>Service location and requirements</li>
          <li>Communication through our messaging system</li>
        </ul>

        <h3>With Clients (For Professionals)</h3>
        <ul>
          <li>Professional profile information</li>
          <li>Reviews and ratings</li>
          <li>Portfolio photos</li>
          <li>Service availability</li>
        </ul>

        <h3>With Third-Party Service Providers</h3>
        <ul>
          <li><strong>Cloudinary:</strong> For image storage and optimization</li>
          <li><strong>SendGrid:</strong> For email notifications</li>
          <li><strong>Expo/React Native:</strong> For mobile app infrastructure</li>
          <li><strong>Railway:</strong> For hosting services</li>
        </ul>

        <h3>Legal Requirements</h3>
        <ul>
          <li>When required by law or legal process</li>
          <li>To protect rights and safety</li>
          <li>To enforce our terms of service</li>
          <li>In connection with business transfers</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>We implement security measures to protect your information, including:</p>
        <ul>
          <li>Encrypted connections (HTTPS/SSL)</li>
          <li>Secure password storage</li>
          <li>Regular security audits</li>
          <li>Access controls and monitoring</li>
        </ul>
        <p>However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>

        <h2>5. Your Rights and Choices</h2>
        <h3>Access and Control</h3>
        <p>You have the right to:</p>
        <ul>
          <li>View your personal information in your profile</li>
          <li>Update or correct your information</li>
          <li>Delete your account and associated data</li>
          <li>Download your data (upon request)</li>
          <li>Request a copy of your data</li>
        </ul>

        <h3>Location Permissions (Mobile App)</h3>
        <ul>
          <li>Grant or deny location access</li>
          <li>Change location settings in device settings</li>
          <li>Use app without location (with limited features)</li>
          <li>Location is never tracked in the background</li>
        </ul>

        <h3>Communications</h3>
        <ul>
          <li>Opt out of promotional emails</li>
          <li>Cannot opt out of critical service emails (booking confirmations, etc.)</li>
          <li>Manage notification preferences in settings</li>
        </ul>

        <h3>Delete Account</h3>
        <ul>
          <li>Contact support@fixxa.co.za to request account deletion</li>
          <li>Account deleted within 30 days</li>
          <li>Some information retained for legal compliance</li>
        </ul>

        <h2>6. Cookies and Tracking</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Remember your preferences and settings</li>
          <li>Analyze platform usage</li>
          <li>Improve our services</li>
          <li>Provide personalized experiences</li>
        </ul>
        <p>You can control cookie settings through your browser preferences.</p>

        <h2>7. Children's Privacy</h2>
        <p>Fixxa is not intended for users under the age of 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately at privacy@fixxa.co.za and we will delete it promptly.</p>

        <h2>8. Data Retention</h2>
        <p>We retain your information:</p>
        <ul>
          <li><strong>Active Accounts:</strong> While your account is active</li>
          <li><strong>Deleted Accounts:</strong> 30 days for recovery</li>
          <li><strong>Legal Requirements:</strong> As required by law</li>
          <li><strong>Legitimate Business Needs:</strong> For dispute resolution and fraud prevention</li>
        </ul>

        <h2>9. International Data Transfers</h2>
        <p>Fixxa operates in South Africa. Your information may be stored and processed in:</p>
        <ul>
          <li>South Africa (primary)</li>
          <li>Cloud services in secure data centers globally</li>
          <li>We ensure appropriate safeguards are in place to protect your data</li>
        </ul>

        <h2>10. South African Privacy Laws (POPIA Compliance)</h2>
        <p>We comply with:</p>
        <ul>
          <li>Protection of Personal Information Act (POPIA)</li>
          <li>Consumer Protection Act</li>
          <li>Electronic Communications and Transactions Act</li>
        </ul>
        <p><strong>Information Officer:</strong> Kuda Bushe<br />
        <strong>Contact:</strong> privacy@fixxa.co.za</p>

        <h2>11. Third-Party Services</h2>
        <p>Our platform uses these third-party services with their own privacy policies:</p>
        <ul>
          <li><strong>Expo:</strong> <a href="https://expo.dev/privacy" target="_blank" rel="noopener noreferrer">expo.dev/privacy</a></li>
          <li><strong>Cloudinary:</strong> <a href="https://cloudinary.com/privacy" target="_blank" rel="noopener noreferrer">cloudinary.com/privacy</a></li>
          <li><strong>SendGrid:</strong> <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer">twilio.com/legal/privacy</a></li>
          <li><strong>Railway:</strong> <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer">railway.app/legal/privacy</a></li>
        </ul>
        <p>We are not responsible for third-party privacy practices.</p>

        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via:</p>
        <ul>
          <li>Email notification</li>
          <li>In-app notification (mobile app)</li>
          <li>Updated "Last updated" date</li>
        </ul>
        <p>Continued use of Fixxa after changes constitutes acceptance of the updated policy.</p>

        <h2>13. Contact Us</h2>
        <p>For privacy-related questions or concerns:</p>
        <p>
          <strong>Email:</strong> <a href="mailto:privacy@fixxa.co.za">privacy@fixxa.co.za</a><br />
          <strong>Support:</strong> <a href="mailto:support@fixxa.co.za">support@fixxa.co.za</a><br />
          <strong>Website:</strong> <a href="https://www.fixxa.co.za">www.fixxa.co.za</a>
        </p>

        <h2>14. Your Consent</h2>
        <p>By using Fixxa (website or mobile apps), you consent to this Privacy Policy and our collection and use of information as described.</p>

        <div style={{marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px'}}>
          <p><strong>For App Store Submission:</strong></p>
          <ul>
            <li>Privacy Policy URL: <strong>https://www.fixxa.co.za/privacy</strong></li>
            <li>Contact Email: <strong>privacy@fixxa.co.za</strong></li>
            <li>This policy covers both web and mobile applications (iOS & Android)</li>
          </ul>
        </div>

        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    </div>
  );
};

export default Privacy;
