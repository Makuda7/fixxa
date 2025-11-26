import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './FAQ.css';

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState([]);

  const toggleItem = (index) => {
    if (openItems.includes(index)) {
      setOpenItems(openItems.filter(i => i !== index));
    } else {
      setOpenItems([...openItems, index]);
    }
  };

  const faqData = {
    customers: {
      title: 'For Customers',
      questions: [
        {
          question: 'How do I find a professional on Fixxa?',
          answer: (
            <>
              <p>Finding a professional is easy! Simply:</p>
              <ul>
                <li>Visit our homepage and use the search form</li>
                <li>Select the service type you need (e.g., Plumber, Electrician)</li>
                <li>Choose your province or location</li>
                <li>Filter by availability (weekdays, weekends, or both)</li>
                <li>Click "Search" to see available professionals</li>
                <li>Browse profiles, read reviews, and contact the professional directly</li>
              </ul>
            </>
          )
        },
        {
          question: 'Do I need to create an account to find professionals?',
          answer: (
            <>
              <p>No, you can browse and search for professionals without an account. However, creating a free account allows you to:</p>
              <ul>
                <li>Message professionals directly through our platform</li>
                <li>Leave reviews and ratings</li>
                <li>Save your favorite professionals</li>
                <li>Track your service history</li>
              </ul>
            </>
          )
        },
        {
          question: 'What does "Verified" mean?',
          answer: (
            <p>A "Verified" badge means the professional has completed our verification process by submitting and getting approval for required documents such as ID, proof of address, and other necessary documentation. This helps ensure you're connecting with legitimate professionals.</p>
          )
        },
        {
          question: 'What does "Coming Soon" mean?',
          answer: (
            <p>"Coming Soon" professionals are newly registered workers who are currently under review by our admin team. Their profiles are visible so you can see who's joining Fixxa, but they cannot take bookings until they're fully verified and approved.</p>
          )
        },
        {
          question: 'How do I contact a professional?',
          answer: (
            <>
              <p>You can contact professionals in several ways:</p>
              <ul>
                <li>Click their profile to view contact details (phone, email, WhatsApp)</li>
                <li>Use our built-in messaging system (requires account)</li>
                <li>Call or WhatsApp them directly using the provided contact information</li>
              </ul>
            </>
          )
        },
        {
          question: 'How do I leave a review?',
          answer: (
            <>
              <p>After receiving a service, you can leave a review by:</p>
              <ul>
                <li>Logging into your account</li>
                <li>Visiting the professional's profile</li>
                <li>Clicking the "Leave a Review" button</li>
                <li>Rating the service and writing your feedback</li>
              </ul>
              <p>Reviews help other customers make informed decisions and help professionals improve their services.</p>
            </>
          )
        }
      ]
    },
    professionals: {
      title: 'For Professionals',
      questions: [
        {
          question: 'How do I register as a professional?',
          answer: (
            <>
              <p>Registration is simple and free:</p>
              <ul>
                <li>Click "Join as a Professional" on any page</li>
                <li>Fill out the registration form with your details</li>
                <li>Upload required documents (ID, proof of address)</li>
                <li>Wait for admin verification (usually 24-48 hours)</li>
                <li>Once approved, your profile goes live!</li>
              </ul>
            </>
          )
        },
        {
          question: 'Does Fixxa charge commission on jobs?',
          answer: (
            <p>No! Fixxa does not take any commission from your earnings. We believe in fair pay for fair work. You negotiate prices directly with customers and keep 100% of what you earn.</p>
          )
        },
        {
          question: 'What documents do I need to register?',
          answer: (
            <>
              <p>To complete your registration, you'll need:</p>
              <ul>
                <li>Valid South African ID or passport</li>
                <li>Proof of address (utility bill, bank statement, etc.)</li>
                <li>Professional certifications (optional, but recommended)</li>
                <li>Profile photo</li>
                <li>Work experience details</li>
              </ul>
            </>
          )
        },
        {
          question: 'How long does verification take?',
          answer: (
            <p>Verification typically takes 24-48 hours. During this time, our admin team reviews your documents and profile information. You'll receive an email once your profile is approved. Your profile will show as "Coming Soon" while under review.</p>
          )
        },
        {
          question: 'Can I update my profile after registration?',
          answer: (
            <>
              <p>Yes! Once registered, you can log in anytime to:</p>
              <ul>
                <li>Update your bio and service description</li>
                <li>Change your availability status</li>
                <li>Add new skills or specializations</li>
                <li>Upload additional photos of your work</li>
                <li>Update your rates and service areas</li>
              </ul>
            </>
          )
        },
        {
          question: 'How do I get more customers?',
          answer: (
            <>
              <p>Here are some tips to attract more customers:</p>
              <ul>
                <li>Complete your profile with detailed information</li>
                <li>Upload high-quality photos of your work</li>
                <li>Keep your availability status up to date</li>
                <li>Respond quickly to customer inquiries</li>
                <li>Encourage satisfied customers to leave reviews</li>
                <li>Share your Fixxa profile link on social media</li>
              </ul>
            </>
          )
        }
      ]
    },
    payments: {
      title: 'Payments & Pricing',
      questions: [
        {
          question: 'How does payment work on Fixxa?',
          answer: (
            <>
              <p>Fixxa is a connection platform - we don't handle payments. Professionals and customers arrange payment terms directly. This means:</p>
              <ul>
                <li>You negotiate the price directly with the professional</li>
                <li>You pay the professional directly (cash, bank transfer, etc.)</li>
                <li>No payment processing fees or commissions</li>
                <li>Full flexibility in payment terms and methods</li>
              </ul>
            </>
          )
        },
        {
          question: 'Are there any fees to use Fixxa?',
          answer: (
            <p>Fixxa is completely free for customers to use. For professionals, there are no commission fees or charges - you keep 100% of your earnings. Registration and profile creation are also free.</p>
          )
        },
        {
          question: 'How do I know if a price is fair?',
          answer: (
            <>
              <p>To ensure you're getting a fair price:</p>
              <ul>
                <li>Compare rates from multiple professionals on Fixxa</li>
                <li>Read reviews to see what others paid for similar services</li>
                <li>Ask for a detailed quote before work begins</li>
                <li>Check if the professional's rate is hourly or per job</li>
                <li>Don't hesitate to negotiate or ask questions</li>
              </ul>
            </>
          )
        }
      ]
    },
    safety: {
      title: 'Safety & Security',
      questions: [
        {
          question: 'Is it safe to hire professionals through Fixxa?',
          answer: (
            <>
              <p>We take safety seriously. All verified professionals have gone through our verification process. However, we recommend you:</p>
              <ul>
                <li>Check the professional's verification badge</li>
                <li>Read reviews from other customers</li>
                <li>Communicate clearly about the work needed</li>
                <li>Get a written quote before work begins</li>
                <li>Trust your instincts - if something feels off, find another professional</li>
              </ul>
              <p>See our <Link to="/safety" style={{ color: '#1d7a91', fontWeight: 600 }}>Safety Guidelines</Link> for more tips.</p>
            </>
          )
        },
        {
          question: 'What if I have a problem with a professional?',
          answer: (
            <>
              <p>If you experience any issues:</p>
              <ul>
                <li>Try to resolve the issue directly with the professional first</li>
                <li>Document the problem with photos or messages if possible</li>
                <li>Contact our support team at support@fixxa.co.za</li>
                <li>Leave an honest review to warn other users</li>
                <li>Report serious misconduct so we can take action</li>
              </ul>
            </>
          )
        },
        {
          question: 'How does Fixxa protect my personal information?',
          answer: (
            <>
              <p>We take data privacy seriously. Your personal information is protected through:</p>
              <ul>
                <li>Secure, encrypted connections (HTTPS)</li>
                <li>Strict data protection policies</li>
                <li>Limited sharing of personal details</li>
                <li>Compliance with privacy regulations</li>
              </ul>
              <p>Read our full <Link to="/privacy" style={{ color: '#1d7a91', fontWeight: 600 }}>Privacy Policy</Link> for details.</p>
            </>
          )
        }
      ]
    }
  };

  const renderFAQSection = (category, data, sectionIndex) => {
    if (activeCategory !== 'all' && activeCategory !== category) {
      return null;
    }

    return (
      <div className="faq-section" key={category}>
        <h2>{data.title}</h2>
        {data.questions.map((item, qIndex) => {
          const itemIndex = `${sectionIndex}-${qIndex}`;
          const isOpen = openItems.includes(itemIndex);

          return (
            <div
              key={itemIndex}
              className={`faq-item ${isOpen ? 'open' : ''}`}
            >
              <div
                className="faq-question"
                onClick={() => toggleItem(itemIndex)}
              >
                {item.question}
              </div>
              <div className="faq-answer">
                {item.answer}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="faq-page">
      <main className="faq-container">
        <h1>Frequently Asked Questions</h1>
        <p className="intro">
          Find answers to common questions about Fixxa. Can't find what you're looking for?{' '}
          <Link to="/contact" style={{ color: '#1d7a91', fontWeight: 600 }}>
            Contact us
          </Link>
          .
        </p>

        <div className="faq-categories">
          <button
            className={`category-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Questions
          </button>
          <button
            className={`category-btn ${activeCategory === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveCategory('customers')}
          >
            For Customers
          </button>
          <button
            className={`category-btn ${activeCategory === 'professionals' ? 'active' : ''}`}
            onClick={() => setActiveCategory('professionals')}
          >
            For Professionals
          </button>
          <button
            className={`category-btn ${activeCategory === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveCategory('payments')}
          >
            Payments
          </button>
          <button
            className={`category-btn ${activeCategory === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveCategory('safety')}
          >
            Safety
          </button>
        </div>

        {renderFAQSection('customers', faqData.customers, 0)}
        {renderFAQSection('professionals', faqData.professionals, 1)}
        {renderFAQSection('payments', faqData.payments, 2)}
        {renderFAQSection('safety', faqData.safety, 3)}

        <div className="contact-cta">
          <h3>Still have questions?</h3>
          <p>Our support team is here to help you.</p>
          <Link to="/contact">Contact Us</Link>
        </div>
      </main>
    </div>
  );
};

export default FAQ;
