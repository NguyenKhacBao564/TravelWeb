import React, {useContext} from "react";
import { Nav } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import "./SideBar.scss";

function Sidebar({navItems}) {
    
    const navigate = useNavigate();
    const location = useLocation();
    const {logout} = useContext(AuthContext);
    const handleLogout = () => {
        logout();   // gọi hàm logout để xóa token khỏi localStorage
        navigate("/login");  // Chuyển hướng về trang đăng nhập
    }

    const handleItemClick = (item) => {
        if (item.isLogout) {
          handleLogout();
        } else {
          navigate(item.link);
        }
      };

    return (
        <Nav defaultActiveKey="/khach-hang" className="sidebar flex-column">
            <div className="sidebar__logo d-flex align-items-center justify-content-center">
                <img src="/logo.png" alt="logo" className="sidebar__logo-image" />
                <h1>Tour Guide</h1>
            </div>

            {navItems.map((item, index) => (
                <Nav.Item
                key={index}
                className={`sidebar__item ${item.link && location.pathname.startsWith(item.link) ? "active" : ""
                }`}
                onClick={() => handleItemClick(item)}
                data-title={item.label}
                >
                <div className="line"></div>
                <span>{item.icon}</span>
                <p>{item.label}</p>
                </Nav.Item>
            ))}
        </Nav>
    );
}

export default Sidebar;
