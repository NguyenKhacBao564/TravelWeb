import React from 'react';
import HomeContent from '../../layouts/HomeContent';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';
import { Link } from 'react-router-dom';
import { TourProvider } from '../../context/TourContext';

function Page(props) {
    return (
        <div>
          <Header/>
          <TourProvider>
            <HomeContent/>
          </TourProvider>
          <Footer/>
        </div>
    );
}

export default Page;