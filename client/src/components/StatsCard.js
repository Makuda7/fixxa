import React from 'react';
import './StatsCard.css';

const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  trendValue,
  breakdown,
  onClick
}) => {
  return (
    <div className={`stats-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stats-card-header">
        <div className={`stats-icon ${iconColor}`}>
          {icon}
        </div>
        {trend && (
          <div className={`stats-trend ${trend}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {trend === 'up' ? (
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              ) : (
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              )}
            </svg>
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div className="stats-content">
        <h3 className="stats-value">{value}</h3>
        <p className="stats-title">{title}</p>
        {subtitle && <p className="stats-subtitle">{subtitle}</p>}
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className="stats-breakdown">
          {breakdown.map((item, index) => (
            <div key={index} className="breakdown-item">
              <span className="breakdown-label">{item.label}</span>
              <span className={`breakdown-value ${item.color || ''}`}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
