import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <main className="about-container">
        <h1>About Fixxa</h1>

        <section className="about-section about-grid">
          <div>
            <h2>Our Story</h2>
            <p>
              Fixxa started as a vision to connect skilled professionals directly
              with customers who need reliable services. We believe in quality,
              trust, and convenience, making it easy to find experts who care.
            </p>
            <p>
              From humble beginnings, our team has grown steadily with a passion
              for helping communities access dependable and affordable services.
            </p>
          </div>
          <img src="/images/happy family.jpg" alt="Happy family - Our story" />
        </section>

        <section className="about-section about-grid reverse">
          <img src="/images/happy home.jpeg" alt="Happy home - Our aim" />
          <div>
            <h2>Our Aim</h2>
            <p>
              We strive to empower professionals by providing a platform to showcase
              their skills and connect with clients. Our aim is to build lasting
              relationships and help everyone achieve their goals through quality
              service.
            </p>
            <p>
              We are committed to innovation and continuous improvement, ensuring
              a seamless and trustworthy experience for all users.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
