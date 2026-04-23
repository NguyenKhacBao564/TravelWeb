import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0); // Reset về đầu trang khi pathname thay đổi
    }, [pathname]);

    return null;
}

export default ScrollToTop;
