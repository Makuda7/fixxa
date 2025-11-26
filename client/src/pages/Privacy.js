import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

const Privacy = () => {
  return (
    <div className="static-page">
      <div className="static-container">
        <h1>Privacy Policy</h1>
        <p className="last-updated"><em>Last updated: January 2025</em></p>

        <p>At Fixxa, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>

        <h2>1. Information We Collect</h2>
        <h3>Personal Information</h3>
        <p>When you register on Fixxa, we collect:</p>
        <ul>
          <li>Name and contact information (email, phone number)</li>
          <li>Profile information and photos</li>
          <li>Location data (when you enable location services)</li>
          <li>Payment information (for professionals)</li>
          <li>Service history and reviews</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <p>We automatically collect certain information when you use Fixxa:</p>
        <ul>
          <li>Device information and IP address</li>
          <li>Browser type and operating system</li>
          <li>Usage data and analytics</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain our services</li>
          <li>Connect clients with professionals</li>
          <li>Process registrations and verifications</li>
          <li>Send service updates and notifications</li>
          <li>Improve our platform and user experience</li>
          <li>Prevent fraud and ensure platform security</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Other Users:</strong> Profile information is visible to other users to facilitate connections</li>
          <li><strong>Service Providers:</strong> Third-party services that help us operate the platform</li>
          <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

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
        <p>You have the right to:</p>
        <ul>
          <li>Access and update your personal information</li>
          <li>Delete your account and data</li>
          <li>Opt out of marketing communications</li>
          <li>Control location sharing</li>
          <li>Request a copy of your data</li>
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
        <p>Fixxa is not intended for users under the age of 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.</p>

        <h2>8. Data Retention</h2>
        <p>We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal information, except where retention is required by law.</p>

        <h2>9. International Data Transfers</h2>
        <p>Your information may be transferred to and processed in countries other than South Africa. We ensure appropriate safeguards are in place to protect your data.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date.</p>

        <h2>11. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or your personal information, please contact us at:</p>
        <p>
          Email: <a href="mailto:privacy@fixxa.co.za">privacy@fixxa.co.za</a><br />
          Support: <a href="mailto:support@fixxa.co.za">support@fixxa.co.za</a>
        </p>

        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    </div>
  );
};

export default Privacy;
