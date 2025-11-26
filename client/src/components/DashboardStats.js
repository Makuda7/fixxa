import React, { useState, useEffect } from 'react';
import StatCard from './StatCard';
import './DashboardStats.css';

const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || ''}/workers/dashboard-stats`,
        {
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to load statistics');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="dashboard-stats-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={fetchStats} className="btn-retry">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        {/* Today's Bookings */}
        <StatCard
          title="Today's Bookings"
          value={loading ? '...' : stats?.todayBookings || 0}
          icon="📅"
          color="blue"
          subtitle={
            stats?.todayBookings > 0
              ? `${stats.todayBookings} ${stats.todayBookings === 1 ? 'booking' : 'bookings'} scheduled`
              : 'No bookings today'
          }
          loading={loading}
        />

        {/* Pending Requests */}
        <StatCard
          title="Pending Requests"
          value={loading ? '...' : stats?.pendingRequests || 0}
          icon="⏰"
          color="orange"
          trend={
            stats?.pendingRequests > 0 && stats?.pendingChange
              ? stats.pendingChange > 0
                ? 'up'
                : 'down'
              : null
          }
          trendValue={
            stats?.pendingChange
              ? `${Math.abs(stats.pendingChange)} from yesterday`
              : null
          }
          subtitle={
            stats?.pendingRequests > 0
              ? 'Awaiting your response'
              : 'All caught up!'
          }
          loading={loading}
        />

        {/* Total Earnings */}
        <StatCard
          title="Total Earnings"
          value={loading ? '...' : `R ${stats?.totalEarnings?.toFixed(2) || '0.00'}`}
          icon="💰"
          color="green"
          trend={stats?.earningsChange > 0 ? 'up' : stats?.earningsChange < 0 ? 'down' : null}
          trendValue={
            stats?.earningsChange
              ? `${stats.earningsChange > 0 ? '+' : ''}R${Math.abs(stats.earningsChange).toFixed(2)} this month`
              : null
          }
          subtitle={stats?.completedJobs ? `From ${stats.completedJobs} completed jobs` : 'No completed jobs yet'}
          loading={loading}
        />

        {/* Completion Rate */}
        <StatCard
          title="Completion Rate"
          value={loading ? '...' : `${stats?.completionRate || 0}%`}
          icon="✓"
          color={
            stats?.completionRate >= 90
              ? 'green'
              : stats?.completionRate >= 70
              ? 'blue'
              : stats?.completionRate >= 50
              ? 'orange'
              : 'red'
          }
          trend={stats?.completionRate >= 80 ? 'up' : stats?.completionRate < 50 ? 'down' : null}
          subtitle={
            stats?.totalBookings
              ? `${stats.completedJobs || 0} of ${stats.totalBookings} bookings completed`
              : 'No bookings yet'
          }
          loading={loading}
        />
      </div>

      {/* Refresh Button */}
      <div className="stats-footer">
        <button onClick={fetchStats} className="btn-refresh" disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
        <p className="stats-updated">
          Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : 'Never'}
        </p>
      </div>
    </div>
  );
};

export default DashboardStats;
