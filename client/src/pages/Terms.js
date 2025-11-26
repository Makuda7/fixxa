import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

const Terms = () => {
  return (
    <div className="static-page">
      <div className="static-container">
        <h1>Terms of Use</h1>
        <p className="last-updated"><em>Last updated: January 2025</em></p>

        <p>Welcome to Fixxa — a digital marketplace connecting clients with independent service professionals ("Professionals"). By registering, accessing, or using Fixxa, you agree to these Terms of Use. Please read them carefully.</p>

        <h2>1. Nature of the Service</h2>
        <p>Fixxa is an online platform that allows clients to find and connect with service professionals. Fixxa does not employ, endorse, or guarantee the work of any professional. All agreements, payments, and services are performed solely between the client and the professional.</p>

        <h2>2. User Accounts</h2>
        <p>To use Fixxa, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

        <h2>3. Responsibilities of Clients</h2>
        <ul>
          <li>Provide accurate service requirements and project details</li>
          <li>Communicate clearly and professionally with professionals</li>
          <li>Make payment arrangements directly with the professional</li>
          <li>Report any issues or disputes promptly</li>
        </ul>

        <h2>4. Responsibilities of Professionals</h2>
        <ul>
          <li>Provide accurate information about skills, experience, and availability</li>
          <li>Deliver services as agreed with clients</li>
          <li>Maintain appropriate licenses and insurance as required by law</li>
          <li>Handle payment arrangements directly with clients</li>
        </ul>

        <h2>5. Payments</h2>
        <p>Fixxa is a connection platform only. All payment terms, methods, and amounts are negotiated directly between clients and professionals. Fixxa does not process payments, collect commissions, or guarantee payment.</p>

        <h2>6. Reviews and Ratings</h2>
        <p>Users may leave honest reviews and ratings. Fixxa reserves the right to remove reviews that violate our guidelines, contain offensive content, or appear fraudulent.</p>

        <h2>7. Prohibited Conduct</h2>
        <p>Users may not:</p>
        <ul>
          <li>Use the platform for illegal activities</li>
          <li>Provide false or misleading information</li>
          <li>Harass, threaten, or abuse other users</li>
          <li>Attempt to bypass or manipulate the platform</li>
          <li>Scrape or collect user data</li>
        </ul>

        <h2>8. Intellectual Property</h2>
        <p>All content on Fixxa, including logos, text, graphics, and software, is the property of Fixxa or its licensors and is protected by copyright and trademark laws.</p>

        <h2>9. Limitation of Liability</h2>
        <p>Fixxa is not liable for any damages arising from the use of the platform or interactions between users. Services are provided "as is" without warranties of any kind.</p>

        <h2>10. Dispute Resolution</h2>
        <p>Any disputes between clients and professionals must be resolved directly between the parties. Fixxa may provide support but is not obligated to mediate or resolve disputes.</p>

        <h2>11. Termination</h2>
        <p>Fixxa reserves the right to suspend or terminate accounts that violate these terms or engage in prohibited conduct.</p>

        <h2>12. Changes to Terms</h2>
        <p>Fixxa may update these Terms of Use at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>

        <h2>13. Contact Us</h2>
        <p>For questions about these terms, please contact us at <a href="mailto:support@fixxa.co.za">support@fixxa.co.za</a></p>

        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    </div>
  );
};

export default Terms;
