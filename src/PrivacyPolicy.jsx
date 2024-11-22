import React from 'react';
import './PrivacyPolicy.css';
import privacyBanner from './assets/top.png'; // Add the path for the banner image here

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-page">
      {/* Banner Section */}
      <div className="privacy-banner">
        <img src={privacyBanner} alt="Privacy Policy Banner" />
      </div>

      {/* Content Section */}
      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p>
          At Dial2Tech, we prioritize safeguarding the personal information of our users. Please read our Privacy Policy ("Policy")
          carefully to understand how we, at Dial2Tech, process the personal information of users and other visitors browsing our
          platform (“users”). This Policy outlines our privacy practices, including how we handle data in connection with our services
          and collaboration with affiliates, partners, and experts.
        </p>
        <p>
          By accessing or using Dial2Tech.com, our mobile app, or related services, you acknowledge that you have read and understood
          this Policy. We may update this Policy periodically, and any changes will be posted here. Changes are effective as of the "Last
          Updated" date. We recommend reviewing the Policy regularly for updates.
        </p>

        <h2>Summary:</h2>
        <ul>
          <li>Information We Collect</li>
          <li>Our Legal Basis for Processing Data</li>
          <li>How We Use Your Data</li>
          <li>Data Retention</li>
          <li>Children’s Privacy</li>
          <li>Sharing Data with Third Parties</li>
          <li>Cookies</li>
          <li>Security</li>
          <li>Specific Provisions for Users in Different Jurisdictions</li>
          <li>Updating Your Information</li>
          <li>Contact Us</li>
        </ul>

        <h2>1. Information We Collect</h2>
        <p>
          We gather information that users provide directly when creating accounts, completing forms, or communicating with us. We also
          collect data automatically during site visits and through third-party sources to improve our services. This includes:
        </p>
        <ul>
          <li>Account and profile information, including names, contact details, and payment details.</li>
          <li>Activity data, including site interactions and communications.</li>
        </ul>

        <h2>2. Legal Basis for Data Processing</h2>
        <p>We process personal data based on several lawful grounds:</p>
        <ul>
          <li>Consent: When you give us permission to use your data for specific purposes.</li>
          <li>Contractual Need: To fulfill obligations or provide services requested by you.</li>
          <li>Legal Compliance: To adhere to laws or regulations.</li>
          <li>Legitimate Interests: To enhance our platform, prevent fraud, and ensure security.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use your personal information to:</p>
        <ul>
          <li>Provide and improve our services.</li>
          <li>Ensure platform security and integrity.</li>
          <li>Prevent fraud and illegal activities.</li>
          <li>Communicate with you when requested.</li>
          <li>Fulfill legal and regulatory obligations.</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          We retain personal information for as long as necessary to fulfill the purposes outlined in this Policy. However, we may retain
          data for extended periods to comply with legal obligations or resolve disputes.
        </p>

        <h2>5. Children's Privacy</h2>
        <p>
          Dial2Tech is not intended for users under the age of 18. If you're between 13 and 18, you may use the platform only under the
          supervision of a parent or guardian. We do not knowingly collect data from children under 13.
        </p>

        <h2>6. Sharing Data with Third Parties</h2>
        <p>
          We may share your data with third-party service providers to deliver our services, comply with legal obligations, or prevent
          fraud. Your data may also be processed in other jurisdictions by third-party partners.
        </p>

        <h2>7. Cookies</h2>
        <p>
          We use cookies and similar technologies to enhance user experience, improve performance, and deliver personalized content. You
          can manage cookie preferences in your browser settings.
        </p>

        <h2>8. Security</h2>
        <p>
          We employ industry-standard security measures to protect your personal information from unauthorized access, loss, or misuse.
          However, no security system is 100% foolproof, and we encourage users to take steps to protect their own data.
        </p>

        <h2>9. Regional Provisions</h2>
        <p>
          Users in different regions, including the EU, UK, and US, may have specific rights regarding their data. Refer to the relevant
          section in the full Policy for more details on your rights.
        </p>

        <h2>10. Updating Your Information</h2>
        <p>
          You can update your personal information through your account settings. If you notice any inaccuracies, please contact us to
          correct them.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          For privacy-related concerns, please reach out to our support team at{' '}
          <a href="mailto:privacy@dial2tech.com">privacy@dial2tech.com</a>.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
