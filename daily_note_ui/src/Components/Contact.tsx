
import React, { useState } from "react";
import "./CSS/Contact.css";

function Contact({ onSubmitContact }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!formData.email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        if (formData.message.trim().length < 5) {
            setError("Message must contain at least 5 characters.");
            return;
        }

        try {
            setLoading(true);

            // Connect your Spring Boot API through this callback.
            if (onSubmitContact) {
                await onSubmitContact(formData);
            } else {
                throw new Error("Contact API is not configured.");
            }

            setSuccess("Your message has been sent successfully!");

            setFormData({
                name: "",
                email: "",
                subject: "",
                message: ""
            });

        } catch (err) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Unable to send your message. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="ftco-section">
            <div className="cl-container">

                <div className="cl-row cl-justify-content-center">
                    <div className="cl-col-md-6 cl-text-center cl-mb-5">
                        <h2 className="heading-section">
                            Contact Form
                        </h2>
                    </div>
                </div>

                <div className="cl-row cl-justify-content-center">
                    <div className="cl-col-lg-10 cl-col-md-12">

                        <div className="wrapper">
                            <div className="cl-row cl-no-gutters">

                                {/* Contact Form */}
                                <div className="cl-col-md-7 cl-d-flex cl-align-items-stretch">

                                    <div className="contact-wrap cl-w-100 cl-p-md-5 cl-p-4">

                                        <h3 className="cl-mb-4">
                                            Get in touch
                                        </h3>

                                        {error && (
                                            <div className="alert alert-danger" role="alert">
                                                {error}
                                            </div>
                                        )}

                                        {success && (
                                            <div className="alert alert-success" role="alert">
                                                {success}
                                            </div>
                                        )}

                                        <form onSubmit={handleSubmit}>

                                            <div className="cl-row">

                                                <div className="cl-col-md-6">
                                                    <div className="cl-form-group">
                                                        <input
                                                            type="text"
                                                            className="cl-form-control"
                                                            name="name"
                                                            placeholder="Name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="cl-col-md-6">
                                                    <div className="cl-form-group">
                                                        <input
                                                            type="email"
                                                            className="cl-form-control"
                                                            name="email"
                                                            placeholder="Email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="cl-col-md-12">
                                                    <div className="cl-form-group">
                                                        <input
                                                            type="text"
                                                            className="cl-form-control"
                                                            name="subject"
                                                            placeholder="Subject"
                                                            value={formData.subject}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="cl-col-md-12">
                                                    <div className="cl-form-group">
                                                        <textarea
                                                            className="cl-form-control"
                                                            name="message"
                                                            rows="7"
                                                            placeholder="Message"
                                                            value={formData.message}
                                                            onChange={handleChange}
                                                            minLength={5}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="cl-col-md-12">
                                                    <div className="cl-form-group">

                                                        <button
                                                            type="submit"
                                                            className="cl-btn cl-btn-primary"
                                                            disabled={loading}
                                                        >
                                                            {loading
                                                                ? "Sending..."
                                                                : "Send Message"}
                                                        </button>

                                                    </div>
                                                </div>

                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="cl-col-md-5 cl-d-flex cl-align-items-stretch">

                                    <div className="info-wrap cl-bg-primary cl-w-100 cl-p-lg-5 cl-p-4">

                                        <h3 className="cl-mb-4 cl-mt-md-4">
                                            Contact Us
                                        </h3>

                                        <div className="dbox cl-w-100 cl-d-flex cl-align-items-start">
                                            <div className="icon">📍</div>
                                            <div className="text cl-pl-3">
                                                <p>
                                                    <span>Address:</span>
                                                    Marathaili Bengaluru, Karnataka, India
                                                </p>
                                            </div>
                                        </div>

                                        <div className="dbox cl-w-100 cl-d-flex cl-align-items-center">
                                            <div className="icon">📞</div>
                                            <div className="text cl-pl-3">
                                                <p>
                                                    <span>Phone:</span>
                                                    <a href="tel:+911234567890">
                                                        +91 9717678447
                                                    </a>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="dbox cl-w-100 cl-d-flex cl-align-items-center">
                                            <div className="icon">✉️</div>
                                            <div className="text cl-pl-3">
                                                <p>
                                                    <span>Email:</span>
                                                    <a href="mailto:info@example.com">
                                                        ankitsrivastava7835@gmail.com
                                                    </a>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="dbox cl-w-100 cl-d-flex cl-align-items-center">
                                            <div className="icon">🌐</div>
                                            <div className="text cl-pl-3">
                                                <p>
                                                    <span>Website:</span>
                                                    <a href="https://example.com">
                                                        example.com
                                                    </a>
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}

export default Contact;
