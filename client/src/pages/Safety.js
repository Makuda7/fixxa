import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

const Safety = () => {
  return (
    <div className="static-page">
      <div className="static-container">
        <h1>Safety & Security Guidelines</h1>
        <p className="last-updated"><em>Last updated: January 2025</em></p>

        <p>Your safety is our priority. Follow these guidelines to ensure safe and successful experiences on Fixxa.</p>

        <h2>For Clients</h2>

        <h3>Before Hiring</h3>
        <ul>
          <li><strong>Check Verification Status:</strong> Look for the "Verified" badge on professional profiles</li>
          <li><strong>Read Reviews:</strong> Review ratings and feedback from other customers</li>
          <li><strong>Review Profiles Carefully:</strong> Check experience, specializations, and portfolio</li>
          <li><strong>Ask Questions:</strong> Communicate clearly about your needs and expectations</li>
          <li><strong>Get Written Quotes:</strong> Always request detailed written quotes before work begins</li>
        </ul>

        <h3>During Service</h3>
        <ul>
          <li><strong>Be Present:</strong> Try to be present when work is being performed</li>
          <li><strong>Verify Identity:</strong> Confirm the professional's identity matches their profile</li>
          <li><strong>Document Work:</strong> Take photos before, during, and after for your records</li>
          <li><strong>Trust Your Instincts:</strong> If something feels wrong, stop the service</li>
          <li><strong>Keep Communication on Platform:</strong> Use Fixxa messaging for documentation</li>
        </ul>

        <h3>Payment Safety</h3>
        <ul>
          <li><strong>Never Pay in Full Upfront:</strong> Negotiate payment schedules (deposit + completion)</li>
          <li><strong>Get Receipts:</strong> Always request receipts for all payments</li>
          <li><strong>Use Traceable Methods:</strong> Prefer bank transfers over cash when possible</li>
          <li><strong>Verify Work First:</strong> Inspect completed work before making final payment</li>
        </ul>

        <h2>For Professionals</h2>

        <h3>Profile Best Practices</h3>
        <ul>
          <li><strong>Complete Verification:</strong> Submit all required documents for verification</li>
          <li><strong>Accurate Information:</strong> Provide honest details about skills and experience</li>
          <li><strong>Professional Photos:</strong> Upload clear photos of yourself and your work</li>
          <li><strong>Keep Licenses Current:</strong> Maintain valid licenses and insurance</li>
        </ul>

        <h3>Client Interactions</h3>
        <ul>
          <li><strong>Clear Communication:</strong> Provide detailed quotes and timelines</li>
          <li><strong>Written Agreements:</strong> Document all work agreements in writing</li>
          <li><strong>Professional Conduct:</strong> Maintain professionalism at all times</li>
          <li><strong>Site Assessment:</strong> Visit job sites to provide accurate quotes</li>
        </ul>

        <h3>Personal Safety</h3>
        <ul>
          <li><strong>Trust Your Instincts:</strong> Decline jobs that make you uncomfortable</li>
          <li><strong>Share Your Location:</strong> Let someone know where you're working</li>
          <li><strong>Verify Client Identity:</strong> Confirm client details before visiting</li>
          <li><strong>Bring Tools/Equipment:</strong> Use your own professional equipment</li>
        </ul>

        <h2>Red Flags to Watch For</h2>
        <div className="warning-box">
          <h3>⚠️ Warning Signs</h3>
          <ul>
            <li>Requests to move communication off-platform immediately</li>
            <li>Pressure to start work without proper agreements</li>
            <li>Requests for large upfront payments</li>
            <li>Unwillingness to provide identification or documentation</li>
            <li>Prices significantly below or above market rates</li>
            <li>Aggressive or threatening behavior</li>
            <li>Requests to bypass Fixxa's verification process</li>
          </ul>
        </div>

        <h2>Reporting Issues</h2>
        <p>If you experience any safety concerns or inappropriate behavior:</p>
        <ul>
          <li><strong>Stop the interaction immediately</strong> if you feel unsafe</li>
          <li><strong>Document everything:</strong> Save messages, photos, and receipts</li>
          <li><strong>Report to Fixxa:</strong> Use our reporting system or email <a href="mailto:support@fixxa.co.za">support@fixxa.co.za</a></li>
          <li><strong>Contact authorities:</strong> For serious safety issues, contact local police</li>
          <li><strong>Leave a review:</strong> Help protect other users by sharing your experience</li>
        </ul>

        <h2>Dispute Resolution</h2>
        <p>If you have a dispute:</p>
        <ol>
          <li>Try to resolve it directly with the other party first</li>
          <li>Keep all communication professional and documented</li>
          <li>Contact Fixxa support for guidance (we don't arbitrate but can provide resources)</li>
          <li>Consider mediation services if needed</li>
          <li>As a last resort, consult legal advice</li>
        </ol>

        <h2>Emergency Contacts</h2>
        <div className="emergency-box">
          <h3>🚨 In Case of Emergency</h3>
          <p><strong>Police:</strong> 10111 (South Africa)</p>
          <p><strong>Fixxa Support:</strong> <a href="mailto:support@fixxa.co.za">support@fixxa.co.za</a></p>
          <p><strong>Phone:</strong> <a href="tel:+27704115192">+27 70 411 5192</a></p>
        </div>

        <h2>Data Privacy</h2>
        <p>Fixxa takes data security seriously:</p>
        <ul>
          <li>All connections are encrypted (HTTPS)</li>
          <li>Personal information is protected and not sold to third parties</li>
          <li>Review our <Link to="/privacy">Privacy Policy</Link> for details</li>
        </ul>

        <h2>Insurance Recommendations</h2>
        <p><strong>For Professionals:</strong></p>
        <ul>
          <li>Maintain liability insurance for your services</li>
          <li>Consider professional indemnity insurance</li>
          <li>Keep insurance certificates up to date</li>
        </ul>

        <p><strong>For Clients:</strong></p>
        <ul>
          <li>Verify professionals have appropriate insurance</li>
          <li>Check if your home insurance covers contractor work</li>
        </ul>

        <h2>Stay Safe, Stay Smart</h2>
        <p>By following these guidelines, you can enjoy safe and successful experiences on Fixxa. If you have any questions or concerns about safety, please don't hesitate to contact us.</p>

        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    </div>
  );
};

export default Safety;
