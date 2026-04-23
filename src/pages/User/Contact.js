import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import { Link } from "react-router-dom";
// import { FaArrowLeft } from "react-icons/fa6";
import Navbar from "../../layouts/Navbar";
import styles from "../../styles/pages/ContactUs.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhoneVolume,
  faEnvelope,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { faFacebookF as fabFacebookF, faInstagram as fabInstagram, faDiscord as fabDiscord } from "@fortawesome/free-brands-svg-icons";
import Footer from "../../layouts/Footer";
import { createSupportRequest } from "../../api/customerSupportAPI";
import { AuthContext } from "../../context/AuthContext";

function Contact() {
  const { user, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Kiểm tra đăng nhập và chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [navigate, location]);

  // Cập nhật form data khi có thông tin user
  useEffect(() => {
    console.log("Current user data:", user); // Debug log
    if (user) {
      const nameParts = user.name ? user.name.trim().split(" ") : ["", ""];
      const lastName = nameParts.pop() || "";
      const firstName = nameParts.join(" ") || lastName;

      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
        email: user.email || "",
        phone: user.phone || ""
      }));
      console.log("Updated form data:", {
        firstName,
        lastName,
        email: user.email,
        phone: user.phone
      }); // Debug log
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      subject: "",
      message: "",
    };

    if (!formData.subject) {
      newErrors.subject = "Vui lòng chọn một chủ đề";
      isValid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = "Vui lòng nhập tin nhắn";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await createSupportRequest(formData);
      setSuccess("Yêu cầu hỗ trợ đã được gửi đi thành công!");
      setFormData(prev => ({
        ...prev,
        subject: "",
        message: "",
      }));
    } catch (err) {
      setError("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className={styles.header}>
        <h2>Liên Hệ Với Chúng Tôi</h2>
        <p>Có câu hỏi hoặc ý kiến? Hãy gửi tin nhắn cho chúng tôi!</p>
      </div>

      <div className={styles.contactContainer}>
        <div className={styles.contactInfo}>
          <h4>Thông Tin Liên Hệ</h4>
          <p>Hãy nói gì đó để bắt đầu trò chuyện trực tiếp!</p>
          <p><FontAwesomeIcon icon={faPhoneVolume} /> +012 3456 789</p>
          <p><FontAwesomeIcon icon={faEnvelope} /> demo@gmail.com</p>
          <p><FontAwesomeIcon icon={faLocationDot} /> 97 Man Thiện, Phường Hiệp Phú, TP. Thủ Đức, TPHCM</p>

          <div className={styles.circleContainer}>
            <svg className={styles.customCircle} width="300" height="300">
              <defs>
                <clipPath id="quarterCircle">
                  <path d="M 200 200 L 200 0 A 125 125 0 0 0 0 200 Z" />
                </clipPath>
              </defs>
              <circle cx="150" cy="150" r="150" fill="#36BED7" clipPath="url(#quarterCircle)" />
            </svg>
            <div className={styles.smallCircle}></div>
          </div>

          <div className={styles.socialIcons}>
            <a href="http://facebook.com" target="_blank" rel="noreferrer" className={styles.iconCircle}>
              <FontAwesomeIcon icon={fabFacebookF} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className={styles.iconCircle}>
              <FontAwesomeIcon icon={fabInstagram} />
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer" className={styles.iconCircle}>
              <FontAwesomeIcon icon={fabDiscord} />
            </a>
          </div>
        </div>

        <div className={styles.contactForm}>
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <div>
                <label>Họ</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  disabled
                />
              </div>
              <div>
                <label>Tên</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  disabled
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                />
              </div>
              <div>
                <label>Số Điện Thoại</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  disabled
                />
              </div>
            </div>
            <label>Chọn Chủ Đề:</label>
            <div className={styles.radioGroup}>
              {[
                "Yêu Cầu Chung",
                "Yêu Cầu Đặt Lịch",
                "Hỗ Trợ/Kỹ Thuật",
                "Vấn Đề Khác",
              ].map((subject, index) => (
                <label key={index} className={styles.customRadio}>
                  <input
                    type="radio"
                    name="subject"
                    value={subject.toLowerCase()}
                    checked={formData.subject === subject.toLowerCase()}
                    onChange={handleChange}
                  />
                  <span>{subject}</span>
                </label>
              ))}
            </div>
            {errors.subject && <p className={styles.validationError}>{errors.subject}</p>}
            <label>Tin Nhắn</label>
            <input
              type="text"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Write your message..."
            />
            {errors.message && <p className={styles.validationError}>{errors.message}</p>}

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <button type="submit" disabled={loading}>
              {loading ? "Đang Gửi..." : "Gửi Tin Nhắn"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Contact;