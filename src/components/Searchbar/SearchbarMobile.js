import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faUser, faCalendarDays, faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import styles from "./Searchbar_Mobile.module.scss";


function Searchbar_Mobile(props) {
    const [activeField, setActiveField] = useState(null);
    const [formData, setFormData] = useState({
        location: '',
        guests: '',
        date: ''
    });

    const handleFieldClick = (field) => {
        setActiveField(field);
    };

    const closeBottomSheet = () => {
        setActiveField(null);
    };

    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const searchFields = [
        {
            id: 'location',
            icon: faLocationDot,
            label: 'Địa điểm',
            placeholder: 'Bạn muốn đi đâu?',
            value: formData.location
        },
        {
            id: 'guests',
            icon: faUser,
            label: 'Số khách',
            placeholder: 'Thêm số khách',
            value: formData.guests
        },
        {
            id: 'date',
            icon: faCalendarDays,
            label: 'Ngày',
            placeholder: 'Thêm ngày',
            value: formData.date
        }
    ];

    return (
        <div className={styles.searchbarContainer}>
        {/* Mobile Search Fields */}
        <div className={styles.mobileSearchFields}>
            {searchFields.map((field) => (
                <div 
                    key={field.id}
                    className={styles.searchBox}
                    onClick={() => handleFieldClick(field.id)}
                >
                    <FontAwesomeIcon icon={field.icon} className={styles.icon} />
                    <div className={styles.searchBoxContent}>
                        <span className={styles.searchBoxLabel}>{field.label}</span>
                        <span className={styles.searchBoxValue}>
                            {formData[field.id] || field.placeholder}
                        </span>
                    </div>
                </div>
            ))}
            <button className={styles.searchButton}>
                <FontAwesomeIcon icon={faSearch} />
                <span>Tìm kiếm</span>
            </button>
        </div>

        {/* Bottom Sheet */}
        {activeField && (
            <div className={styles.bottomSheet}>
                <div className={styles.bottomSheetHeader}>
                    <h3>{searchFields.find(f => f.id === activeField)?.label}</h3>
                    <button onClick={closeBottomSheet} className={styles.closeButton}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className={styles.bottomSheetContent}>
                    <input
                        type={activeField === 'date' ? 'date' : 'text'}
                        placeholder={searchFields.find(f => f.id === activeField)?.placeholder}
                        value={formData[activeField]}
                        onChange={(e) => updateField(activeField, e.target.value)}
                        className={styles.bottomSheetInput}
                    />
                </div>
                <button 
                    className={styles.applyButton}
                    onClick={closeBottomSheet}
                >
                    Áp dụng
                </button>
            </div>
        )}

        {/* Overlay */}
        {activeField && (
            <div 
                className={styles.overlay}
                onClick={closeBottomSheet}
            />
        )}
    </div>
    );
}

export default Searchbar_Mobile;