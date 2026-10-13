import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Loader,
  AlertCircle
} from 'lucide-react';
import adminApi from '../../config/adminApi';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/dashboard/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tournaments',
      value: stats?.total_tournaments || 0,
      icon: Trophy,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      ringColor: 'ring-blue-100',
      subtext: `${stats?.open_tournaments || 0} open, ${stats?.ongoing_tournaments || 0} ongoing`
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_approvals || 0,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      ringColor: 'ring-amber-100',
      subtext: 'Awaiting review',
      clickable: true,
      onClick: () => navigate('/admin/tournaments/approvals')
    },
    {
      title: 'Total Matches',
      value: stats?.total_matches || 0,
      icon: Calendar,
      gradient: 'from-purple-500 to-violet-600',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      ringColor: 'ring-purple-100',
      subtext: `${stats?.completed_matches || 0} completed`
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      ringColor: 'ring-emerald-100',
      subtext: `${stats?.active_users || 0} active`
    }
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const CardWrapper = card.clickable ? 'button' : 'div';

          return (
            <CardWrapper
              key={index}
              onClick={card.onClick}
              className={`group relative overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-xl p-5 border border-gray-100 transition-all duration-300 ${
                card.clickable ? 'cursor-pointer hover:-translate-y-1' : 'hover:-translate-y-0.5'
              }`}
            >
              {/* Decorative gradient blob */}
              <div
                className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300`}
              />

              {card.clickable && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-semibold ring-1 ring-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Action Required
                </span>
              )}

              <div className="relative flex flex-col items-center text-center">
                <div className={`${card.iconBg} p-3 rounded-xl mb-4 ring-4 ${card.ringColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} strokeWidth={2.25} />
                </div>
                <p className="text-4xl font-extrabold text-gray-900 mb-1.5 tracking-tight">
                  {card.value}
                </p>
                <h3 className="text-gray-800 text-sm font-semibold mb-1">{card.title}</h3>
                <p className="text-xs text-gray-500">{card.subtext}</p>
              </div>

              {/* Bottom accent bar */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
            </CardWrapper>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
        <h2 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/admin/tournaments/approvals')}
            className="flex items-center gap-2 p-3 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">Review Approvals</p>
              <p className="text-xs text-gray-600">{stats?.pending_approvals || 0} pending</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/tournaments')}
            className="flex items-center gap-2 p-3 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Trophy className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">View Tournaments</p>
              <p className="text-xs text-gray-600">Manage all tournaments</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 p-3 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Users className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">Manage Users</p>
              <p className="text-xs text-gray-600">View all users</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;