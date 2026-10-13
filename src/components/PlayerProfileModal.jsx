import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Trophy, 
  Target, 
  Award, 
  TrendingUp,
  Activity,
  Shield,
  Star,
  Users,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';
import { useState, useEffect } from 'react';
import api from '../config/api';

const PlayerProfileModal = ({ userId, onClose }) => {
  const [player, setPlayer] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, statistics

  useEffect(() => {
    if (userId) {
      fetchPlayerProfile();
      fetchPlayerStatistics();
    }
  }, [userId]);

  const fetchPlayerProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}/profile`);
      setPlayer(response.data.data);
    } catch (error) {
      console.error('Error fetching player profile:', error);
      // For now, use mock data if API fails
      setPlayer({
        id: userId,
        first_name: 'Player',
        last_name: 'Name',
        email: 'pl***@example.com', // Masked email
        created_at: new Date().toISOString(),
        profile_image: null,
        sports: [] // Empty sports array
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStatistics = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get(`/users/${userId}/statistics`);
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching player statistics:', error);
      // Set empty statistics
      setStatistics({
        overall: {
          total_matches: 0,
          wins: 0,
          losses: 0,
          win_rate: 0,
          tournaments_played: 0,
          championships: 0,
          runner_up: 0,
          semi_finals: 0
        },
        by_sport: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              {/* Profile Image */}
              <div className="relative">
                {player?.profile_image ? (
                  <img
                    src={getImageUrl(player.profile_image)}
                    alt={`${player.first_name} ${player.last_name}`}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {getUserInitials(player?.first_name, player?.last_name)}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-white">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Player Info */}
              <div className="flex-1 text-white">
                <h2 className="text-3xl font-bold mb-2">
                  {player?.first_name} {player?.last_name}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-white/90">
                  {player?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{player.email}</span>
                    </div>
                  )}
                </div>
                {player?.created_at && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-white/80">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {new Date(player.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'statistics'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Statistics
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : activeTab === 'overview' ? (
            <OverviewTab player={player} statistics={statistics} />
          ) : (
            <StatisticsTab player={player} statistics={statistics} statsLoading={statsLoading} />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ player, statistics }) => {
  const overall = statistics?.overall || {
    tournaments_played: 0,
    total_matches: 0,
    wins: 0,
    win_rate: 0
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Trophy className="w-6 h-6 text-yellow-600" />}
          label="Tournaments"
          value={overall.tournaments_played}
          bgColor="bg-yellow-50"
        />
        <StatCard
          icon={<Target className="w-6 h-6 text-blue-600" />}
          label="Matches Played"
          value={overall.total_matches}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<Award className="w-6 h-6 text-green-600" />}
          label="Wins"
          value={overall.wins}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          label="Win Rate"
          value={`${overall.win_rate}%`}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Full Name" value={`${player?.first_name || ''} ${player?.last_name || ''}`} />
          <InfoRow label="Email" value={player?.email || 'Not provided'} />
          <InfoRow label="Gender" value={player?.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'Not provided'} />
          <InfoRow 
            label="Date of Birth" 
            value={player?.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-US', { 
              day: 'numeric',
              month: 'long', 
              year: 'numeric' 
            }) : 'Not provided'} 
          />
          <InfoRow 
            label="Member Since" 
            value={player?.created_at ? new Date(player.created_at).toLocaleDateString('en-US', { 
              day: 'numeric',
              month: 'long', 
              year: 'numeric' 
            }) : 'N/A'} 
          />
          <InfoRow 
            label="Account Status" 
            value={
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                player?.deleted_at 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {player?.deleted_at ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Inactive
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </>
                )}
              </span>
            }
          />
        </div>
      </div>

      {/* Sports & Preferences */}
      {/* <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600" />
          Sports & Preferences
        </h3>
        {player?.sports && player.sports.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {player.sports.map((sport) => {
              
              const skillConfig = {
                professional: {
                  bgColor: 'from-slate-100 to-slate-200',
                  badgeColor: 'bg-slate-700',
                  textColor: 'text-slate-800',
                  label: 'Professional'
                },
                intermediate: {
                  bgColor: 'from-gray-100 to-gray-200',
                  badgeColor: 'bg-gray-700',
                  textColor: 'text-gray-800',
                  label: 'Intermediate'
                },
                beginner: {
                  bgColor: 'from-stone-100 to-stone-200',
                  badgeColor: 'bg-stone-700',
                  textColor: 'text-stone-800',
                  label: 'Beginner'
                }
              };

              const config = skillConfig[sport.skill_level] || skillConfig.beginner;

              return (
                <div
                  key={sport.id}
                  className={`group relative bg-gradient-to-br ${config.bgColor} rounded-lg p-3 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden border border-gray-200`}
                >
                  
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gray-400 rounded-full -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-gray-400 rounded-full -ml-8 -mb-8"></div>
                  </div>

                  
                  <div className="relative z-10">
                    
                    <div className="flex justify-end mb-3">
                      <span className={`${config.badgeColor} text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                        {config.label}
                      </span>
                    </div>

                    
                    <h4 className={`font-bold text-lg ${config.textColor} mb-1`}>
                      {sport.sport_name}
                    </h4>

                    
                    <p className={`text-xs ${config.textColor} opacity-70 font-medium`}>
                      {config.label} Level
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-base font-semibold text-gray-700 mb-2">No Sports Registered</h4>
            <p className="text-sm text-gray-500">
              Sports will appear here once registered
            </p>
          </div>
        )}
      </div> */}

      {/* Recent Activity */}
      {/* <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-600" />
          Recent Activity
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No recent activity</p>
        </div>
      </div> */}
    </div>
  );
};

// Statistics Tab Component
const StatisticsTab = ({ player, statistics, statsLoading }) => {
  const [selectedSport, setSelectedSport] = useState('all');

  // Get sport statistics
  const bySport = statistics?.by_sport || [];
  const overall = statistics?.overall || {
    total_matches: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    tournaments_played: 0,
    championships: 0,
    runner_up: 0,
    semi_finals: 0
  };

  // Get current sport stats
  const currentSportStats = selectedSport === 'all' 
    ? overall 
    : bySport.find(s => s.sport_id.toString() === selectedSport) || overall;

  return (
    <div className="space-y-6">
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Sport Filter - Only show if user has stats in multiple sports */}
          {bySport.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedSport('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedSport === 'all'
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Sports
              </button>
              {bySport.map((sport) => (
                <button
                  key={sport.sport_id}
                  onClick={() => setSelectedSport(sport.sport_id.toString())}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedSport === sport.sport_id.toString()
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sport.sport_name}
                </button>
              ))}
            </div>
          )}

          {/* Overall Statistics */}
          <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary-600" />
              {selectedSport === 'all' ? 'Overall Performance' : `${currentSportStats.sport_name} Performance`}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsBox label="Total Matches" value={currentSportStats.total_matches || 0} />
              <StatsBox label="Wins" value={currentSportStats.wins || 0} subtext={`${currentSportStats.win_rate || 0}%`} />
              <StatsBox label="Losses" value={currentSportStats.losses || 0} subtext={`${(100 - (currentSportStats.win_rate || 0)).toFixed(2)}%`} />
              <StatsBox label="Win Rate" value={`${currentSportStats.win_rate || 0}%`} />
            </div>
          </div>

          {/* Tournament Statistics */}
          {/* <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" />
              Tournament Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsBox label="Tournaments Played" value={currentSportStats.tournaments_played || 0} />
              <StatsBox label="Championships" value={currentSportStats.championships || 0} icon={<Star className="w-4 h-4 text-yellow-500" />} />
              <StatsBox label="Runner-up" value={currentSportStats.runner_up || 0} icon={<Award className="w-4 h-4 text-gray-400" />} />
              <StatsBox label="Semi-Finals" value={currentSportStats.semi_finals || 0} />
            </div>
          </div> */}

          {/* Match Type Breakdown - Only for specific sport */}
          {selectedSport !== 'all' && currentSportStats.by_type && (
            <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-600" />
                Match Type Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Singles */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Singles</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Matches:</span>
                      <span className="font-semibold text-blue-900">{currentSportStats.by_type.singles.matches}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Wins:</span>
                      <span className="font-semibold text-green-600">{currentSportStats.by_type.singles.wins}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Losses:</span>
                      <span className="font-semibold text-red-600">{currentSportStats.by_type.singles.losses}</span>
                    </div>
                  </div>
                </div>

                {/* Doubles */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3">Doubles</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Matches:</span>
                      <span className="font-semibold text-purple-900">{currentSportStats.by_type.doubles.matches}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Wins:</span>
                      <span className="font-semibold text-green-600">{currentSportStats.by_type.doubles.wins}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Losses:</span>
                      <span className="font-semibold text-red-600">{currentSportStats.by_type.doubles.losses}</span>
                    </div>
                  </div>
                </div>

                {/* Teams */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">Teams</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Matches:</span>
                      <span className="font-semibold text-green-900">{currentSportStats.by_type.teams.matches}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Wins:</span>
                      <span className="font-semibold text-green-600">{currentSportStats.by_type.teams.wins}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Losses:</span>
                      <span className="font-semibold text-red-600">{currentSportStats.by_type.teams.losses}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Stats Message */}
          {overall.total_matches === 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold mb-2">No Statistics Available</p>
                <p className="text-sm">Statistics will appear here once you start playing matches</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper Components
const StatCard = ({ icon, label, value, bgColor }) => (
  <div className={`${bgColor} rounded-xl p-4 border-2 border-gray-100`}>
    <div className="flex items-center justify-between mb-2">
      {icon}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-600 mt-1">{label}</p>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-sm font-semibold text-gray-500 mb-1">{label}</p>
    <p className="text-base text-gray-900">{value}</p>
  </div>
);

const StatsBox = ({ label, value, subtext, icon }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      {icon}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
  </div>
);

export default PlayerProfileModal;
