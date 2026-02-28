export default function Privacy() {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Privacy Policy</h1>
                <p className="legal-updated"><strong>Last Updated:</strong> February 28, 2026</p>

                <div className="legal-section">
                    <h2>Introduction</h2>
                    <p>Mtech Testimonials ("we," "our," or "us") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, store, and protect your personal data when you submit a testimonial through our website.</p>
                    <p>This policy applies specifically to our testimonial submission form and related services.</p>
                </div>

                <div className="legal-section">
                    <h2>1. Information We Collect</h2>
                    <h3>1.1 Personal Information You Provide</h3>
                    <p>When you submit a testimonial, we collect:</p>
                    <table className="legal-table">
                        <thead><tr><th>Data Type</th><th>Examples</th><th>Purpose</th></tr></thead>
                        <tbody>
                            <tr><td><strong>Identity Information</strong></td><td>Full name (or "Anonymous" if selected)</td><td>Attribution of testimonial</td></tr>
                            <tr><td><strong>Health Information</strong></td><td>Health conditions you mention</td><td>Context for testimonial, categorization</td></tr>
                            <tr><td><strong>Product Information</strong></td><td>Mannatech products used</td><td>Product association, categorization</td></tr>
                            <tr><td><strong>Testimonial Content</strong></td><td>Written story</td><td>Publication of your experience</td></tr>
                            <tr><td><strong>Visual Content</strong></td><td>Photos (up to 8 images)</td><td>Visual support for testimonial</td></tr>
                            <tr><td><strong>Technical Data</strong></td><td>IP address, submission timestamp</td><td>Security, spam prevention</td></tr>
                        </tbody>
                    </table>
                    <h3>1.2 Information We Collect Automatically</h3>
                    <ul>
                        <li><strong>IP Address:</strong> Logged for spam prevention and security</li>
                        <li><strong>Date and Time:</strong> Timestamp of submission</li>
                        <li><strong>Browser Information:</strong> If using reCAPTCHA</li>
                    </ul>
                    <div className="legal-warning">
                        <strong>Sensitive Data Notice:</strong> Health information is considered "special category" personal data under POPIA and GDPR. By submitting your testimonial, you explicitly consent to our processing of this sensitive information for the purposes outlined in this policy.
                    </div>
                </div>

                <div className="legal-section">
                    <h2>2. How We Use Your Information</h2>
                    <h3>2.1 Primary Purposes</h3>
                    <ul>
                        <li><strong>Review Your Submission:</strong> Verify authenticity and compliance with our guidelines</li>
                        <li><strong>Publish Your Testimonial:</strong> Display on our website, marketing materials, and social media</li>
                        <li><strong>Contact You:</strong> If we need clarification or additional information</li>
                        <li><strong>Categorize Content:</strong> Organize by health conditions and products</li>
                        <li><strong>Prevent Spam:</strong> Detect and block fraudulent submissions</li>
                    </ul>
                    <h3>2.2 Legal Basis for Processing</h3>
                    <ul>
                        <li><strong>Consent:</strong> You provide explicit consent when submitting the form</li>
                        <li><strong>Legitimate Interests:</strong> Sharing genuine customer experiences to inform potential customers</li>
                        <li><strong>Legal Obligations:</strong> Compliance with advertising and consumer protection laws</li>
                    </ul>
                </div>

                <div className="legal-section">
                    <h2>3. How We Share Your Information</h2>
                    <h3>3.1 Public Disclosure</h3>
                    <div className="legal-highlight">
                        <strong>Important:</strong> Published testimonials are PUBLIC. Your name (unless anonymous), health conditions, and testimonial content will be visible to anyone who visits our website or social media.
                    </div>
                    <h3>3.2 Third-Party Service Providers</h3>
                    <ul>
                        <li><strong>Website Hosting:</strong> Servers that store our website data</li>
                        <li><strong>Email Services:</strong> For sending notification emails to admins</li>
                        <li><strong>Mannatech Associates:</strong> Those involved in testimonial review and moderation</li>
                    </ul>
                    <h3>3.3 We Do NOT:</h3>
                    <ul>
                        <li>❌ Sell your personal data to third parties</li>
                        <li>❌ Share your data for third-party marketing purposes</li>
                        <li>❌ Transfer your data outside of South Africa (except where necessary for service providers)</li>
                    </ul>
                </div>

                <div className="legal-section">
                    <h2>4. Data Retention</h2>
                    <div className="legal-retention">
                        <div><strong>Published Testimonials:</strong> Retained indefinitely, unless you request removal</div>
                        <div><strong>Unpublished/Rejected Submissions:</strong> Up to 1 year</div>
                        <div><strong>Technical Data (IP Addresses, Logs):</strong> Up to 90 days</div>
                    </div>
                </div>

                <div className="legal-section">
                    <h2>5. Your Rights</h2>
                    <div className="legal-rights">
                        <p><strong>Under POPIA and GDPR, you have the following rights:</strong></p>
                        <ul>
                            <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
                            <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                            <li><strong>Right to Erasure:</strong> Request deletion of your unpublished testimonial</li>
                            <li><strong>Right to Object:</strong> Object to processing of your data for certain purposes</li>
                            <li><strong>Right to Restrict Processing:</strong> Request limitation on how we use your data</li>
                            <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
                        </ul>
                    </div>
                    <p>To exercise any of these rights, contact us at: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>
                    <p>We will respond to your request within 30 days.</p>
                </div>

                <div className="legal-section">
                    <h2>6. Security Measures</h2>
                    <ul>
                        <li><strong>Secure Transmission:</strong> Data submitted through encrypted HTTPS connection</li>
                        <li><strong>Access Controls:</strong> Limited access to submitted data (admin only)</li>
                        <li><strong>Input Validation:</strong> All data is sanitized to prevent malicious code</li>
                        <li><strong>Regular Backups:</strong> Data backed up securely</li>
                    </ul>
                </div>

                <div className="legal-section">
                    <h2>7. Children's Privacy</h2>
                    <p>Our testimonial submission form is not intended for children under 18. We do not knowingly collect personal information from children. If you believe a child has submitted a testimonial, please contact us immediately so we can remove it.</p>
                </div>

                <div className="legal-section">
                    <h2>8. International Data Transfers</h2>
                    <p>Your data is primarily stored on servers located in South Africa. If we use service providers outside South Africa, we ensure adequate data protection safeguards are in place and transfers comply with POPIA requirements.</p>
                </div>

                <div className="legal-section">
                    <h2>9. Anonymous Submissions</h2>
                    <p>When you select anonymous submission:</p>
                    <ul>
                        <li>✅ Your name is NOT displayed publicly</li>
                        <li>✅ Testimonial published as "Anonymous"</li>
                        <li>⚠️ We still collect and store your name internally for verification</li>
                        <li>⚠️ IP address is still logged</li>
                    </ul>
                </div>

                <div className="legal-section">
                    <h2>10. Specific Rights Under POPIA</h2>
                    <p>Under the Protection of Personal Information Act (POPIA), you have the right to know what personal information we hold, the purpose of processing, and to object to, correct, or delete that information.</p>
                    <p>If you believe we have violated your privacy rights, you may lodge a complaint with:</p>
                    <p><strong>Information Regulator South Africa</strong><br/>
                    Website: <a href="https://www.justice.gov.za/inforeg/" target="_blank" rel="noopener noreferrer">https://www.justice.gov.za/inforeg/</a><br/>
                    Email: <a href="mailto:inforeg@justice.gov.za">inforeg@justice.gov.za</a></p>
                </div>

                <div className="legal-section">
                    <h2>11. Contact Information</h2>
                    <p><strong>Mtech Testimonials — Privacy Officer</strong><br/>
                    Email: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>
                </div>

                <div className="legal-section">
                    <h2>12. Consent</h2>
                    <p>By submitting the testimonial form, you consent to collection and processing of your personal data as described, processing of sensitive health information, public display of your published testimonial, and use of your testimonial in marketing materials.</p>
                    <div className="legal-highlight">
                        <strong>You can withdraw consent at any time</strong> by contacting us. However, this will not affect the lawfulness of processing based on consent before its withdrawal.
                    </div>
                </div>

                <div className="legal-footer-note">
                    If you have any questions about this Privacy Policy, please contact us at <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a>
                </div>
            </div>
        </div>
    )
}
