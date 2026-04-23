// src/pages/Admin/components/StatCard.js
import React from 'react';
import "./Styles/StatCard.scss";
//import { DollarSign, Users, MapPin } from 'lucide-react';
/**
 * Props:
 * - title: string
 * - value: number | string
 * - suffix?: string
 */
const StatCard = ({
    title,
    value,
    suffix = '',
    icon,
    variant,
  }) => (
    <div className={`stat-card stat-card--${variant}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__info">
        <div className="stat-card__title">{title}</div>
        <div className="stat-card__value">
          {value}
          {suffix}
        </div>
      </div>
    </div>
  );
  

export default StatCard;
