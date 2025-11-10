import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-section">
        <h4>Fixxa</h4>
        <Link to="/about">About Us</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/faq">FAQ</Link>
        <a href="#">Feedback</a>
      </div>
      <div className="footer-section">
        <h4>Customer</h4>
        <Link to="/terms">Terms & Conditions</Link>
        <Link to="/safety">Safety & Security</Link>
        <Link to="/privacy">Privacy Policy</Link>
      </div>
      <div className="footer-section">
        <h4>Professionals</h4>
        <Link to="/register">Join as a Professional</Link>
        <a href="#">Refer a Professional</a>
      </div>
    </footer>
  );
};

export default Footer;
