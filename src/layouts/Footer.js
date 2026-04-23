import React from "react";
import styles from "../styles/layouts/Footer.module.scss"; // Import CSS Module
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Dropdown from "react-bootstrap/Dropdown";
import { FaGithub } from "react-icons/fa";
function Footer() {
  return (
    <div className={styles.footer}>

      <Container fluid>
        {/* Phần Links */}
        <Row className={styles.footerLink}>
          {/* Chọn Ngôn Ngữ */}
          <Col sm={12} md={{span: 2, offset: 1}} className="mb-3 mb-md-0">
            <p>Language</p>
            <Dropdown>
              <Dropdown.Toggle variant="dark" id="dropdown-basic">
                🇻🇳 Viet Nam
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item href="#">🇺🇸 English</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>

          {/* Company */}
          <Col sm={6} md={{span: 2, offset: 2}}>
            <p>Company</p>
            <ul>
              <li>About Us</li>
              <li>Blog</li>
              <li>Press Room</li>
              <li>Careers</li>
            </ul>
          </Col>

          {/* Help */}
          <Col sm={6} md={{span: 3, offset: 2}}>
            <p>Help</p>
            <ul>
              <li>Contact us</li>
              <li>FAQs</li>
              <li>Terms and conditions</li>
              <li>Privacy policy</li>
              <li>Sitemap</li>
            </ul>
          </Col>
        </Row>

        {/* Phần Mạng Xã Hội và Mô tả */}
        <Row className={styles.footerDescription}>
          <Col xs={12} md={{span: 2, offset: 1}}  className="mb-3 mb-md-0" >
            Đồ án nhóm
          </Col>
          <Col xs={12} md={{span: 3}} > 
            <a href="https://github.com/DUYBEGINER/tour-booking-web.git" target="_blank" rel="link github">
              <FaGithub size={30} style={{ margin: "0" , cursor: "pointer"}} />
            </a>
            {/* <span className={styles.circle} style={{ backgroundColor: "#33C3F0" }}></span>
            <span className={styles.circle} style={{ backgroundColor: "#E44D93" }}></span>
            <span className={styles.circle} style={{ backgroundColor: "#F0473C" }}></span> */}
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Footer;