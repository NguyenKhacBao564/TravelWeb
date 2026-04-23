import React, {useContext, useState, useEffect} from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Footer from '../../layouts/Footer';
import Navbar from '../../layouts/Navbar';
import TourCard from '../../components/Common/TourCard/TourCard';
import "../../styles/pages/TourFavourite.scss"
import {AuthContext} from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../utils/API_Port';
import {getFavoriteTours}  from '../../api/favoriteTourAPI';
import Spinner from 'react-bootstrap/Spinner';

function TourFavourite(props) {

    const { user, loading } = useContext(AuthContext);
    const [tourFavorite, setTourFavorite] = useState([]);
    const navigate = useNavigate();

    console.log("TourFavourite user:", user);

    const fetchFavoriteTours = async () => {
            try {
                const tours = await getFavoriteTours(user.id);
                setTourFavorite(tours);
            } catch (error) {
                console.error("Error fetching favorite tours:", error);
            }
    };


    const handleChangeFavoriteTour = () => {
        fetchFavoriteTours();
        
        // setTourFavorite(tourFavorite.filter((tour) => tour.tour_id !== tourId));
    };

    useEffect(() => {
        if (!user) {
            // Redirect to login or show a message
            console.log("User is not logged in. Redirecting to login page...");
            navigate('/login', { state: { returnUrl: '/tourFavorite' } });
        }
        fetchFavoriteTours();
    }, [user]);

    return (
        <div>
            <Navbar />
            { loading ? (<Spinner animation="border" />) : (
            <div className="tour-favourite__banner">
                <Container className="tour_favourite">
                    <h2 className="tour-favourite__title text-center">Tour Yêu Thích</h2>
                    <p className="tour-favourite__description text-center">Danh sách tour yêu thích của bạn sẽ được hiển thị tại đây.</p>
                    {/* Thêm các thành phần khác như danh sách tour yêu thích */}
                    {tourFavorite.length === 0 && (
                        <div className="text-center mt-4">
                            <p>Bạn chưa có tour yêu thích nào.</p>
                        </div>
                    )}
                    <Row className="custom-row g-3 mt-4" xs={1} sm={2} md={3} xl={3} xxl={4}>
                        {tourFavorite.map((tour) => (
                            <Col key={tour.tour_id} className="custom-col">
                                <TourCard {...tour} onFavoriteChange={handleChangeFavoriteTour}/>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>
            )}
            <Footer />   
        </div>
    );
}

export default TourFavourite;