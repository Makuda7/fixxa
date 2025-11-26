import React from 'react';
import './StatCard.css';

const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = 'blue',
  subtitle,
  loading = false
}) => {
  return (
    <div className={`stat-card stat-card-${color}`}>
      {loading ? (
        <div className="stat-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className="stat-header">
            <div className="stat-icon-wrapper" style={{ background: `var(--${color}-light)` }}>
              <span className="stat-icon" style={{ color: `var(--${color})` }}>
                {icon}
              </span>
            </div>
            {trend && (
              <div className={`stat-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {trend === 'up' ? (
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  ) : (
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  )}
                </svg>
                {trendValue && <span>{trendValue}</span>}
              </div>
            )}
          </div>

          <div className="stat-content">
            <h3 className="stat-value">{value}</h3>
            <p className="stat-title">{title}</p>
            {subtitle && <p className="stat-subtitle">{subtitle}</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default StatCard;
