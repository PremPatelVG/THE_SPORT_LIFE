import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MatchTimingDisplay from '../components/MatchTimingDisplay';
import SquadDisplay from '../components/SquadDisplay';
import PlayerProfileModal from '../components/PlayerProfileModal';
import {
  Swords,
  Calendar,
  MapPin,
  Trophy,
  Loader,
  CheckCircle,
  Clock,
  Target,
  XCircle,
  Award,
  Users,
  ArrowLeft,
  User,
  Shield,
  Star,
  Phone,
  X,
  AlertCircle,
  Mail,
  Zap,
  Settings,
  Info
} from 'lucide-react';
import api from '../config/api';

const MatchDetails = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'all';
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState({ participant1: null, participant2: null });
  const [user, setUser] = useState(null);
  const [showMatchDayModal, setShowMatchDayModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchMatchDetails();
  }, [matchId]);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      // Fetch match with full participant details
      const response = await api.get(`/matches/${matchId}/details`);
      const matchData = response.data.data;
      setMatch(matchData);
      
      // Set participants from the response
      setParticipants({
        participant1: matchData.participant1_details || null,
        participant2: matchData.participant2_details || null
      });
    } catch (error) {
      console.error('Failed to fetch match details:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMatchDay = (matchDate) => {
    if (!matchDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const match = new Date(matchDate);
    match.setHours(0, 0, 0, 0);
    return match <= today;
  };

  const isAssignedReferee = () => {
    if (!user || !match) return false;
    return match.referee_id === user.id;
  };

  const canShowManageButton = () => {
    if (!isAssignedReferee()) return false;
    if (!['scheduled', 'ready', 'in_progress'].includes(match.status)) return false;
    return true;
  };

  const isMatchDayToday = () => {
    return isMatchDay(match.match_date);
  };

  const handleManageMatch = () => {
    if (!isAssignedReferee()) {
      alert('You are not the assigned referee for this match');
      return;
    }

    if (!match.participant1_id || !match.participant2_id) {
      alert('⛔ Cannot manage match\n\nThere are no participants assigned to this match yet.');
      return;
    }

    // Check if it's match day
    if (!isMatchDayToday()) {
      setShowMatchDayModal(true);
      return;
    }

    // Navigate to scoring page
    navigate(`/matches/${matchId}/referee-scoring`);
  };

  const getMatchDateTime = () => {
    if (!match.match_date) return 'Not scheduled';
    const date = new Date(match.match_date);
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = match.match_time || 'Time not set';
    return `${dateStr} at ${timeStr}`;
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending', icon: Clock },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled', icon: Calendar },
      ready: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ready', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Progress', icon: Target },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled', icon: XCircle },
      postponed: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Postponed', icon: Clock },
      walkover: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Walkover', icon: Award }
    };

    const statusInfo = config[status] || config.pending;
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
        <Icon className="w-5 h-5" />
        {statusInfo.label}
      </span>
    );
  };

  const renderSinglesParticipant = (participant, isWinner) => {
    if (!participant || !participant.user) return <div className="text-gray-500">TBD</div>;

    return (
      <div className={`p-6 rounded-xl border-2 ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
        {isWinner && (
          <div className="flex items-center gap-2 mb-4 text-yellow-600">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Winner</span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {participant.user.first_name?.[0]}{participant.user.last_name?.[0]}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {participant.user.first_name} {participant.user.last_name}
            </h3>
            {participant.user.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Mail className="w-4 h-4" />
                {participant.user.email}
              </div>
            )}
            {participant.user.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Phone className="w-4 h-4" />
                {participant.user.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDoublesParticipant = (pair, isWinner) => {
    if (!pair) return <div className="text-gray-500">TBD</div>;

    return (
      <div className={`p-6 rounded-xl border-2 ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
        {isWinner && (
          <div className="flex items-center gap-2 mb-4 text-yellow-600">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Winner</span>
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          {pair.name}
        </h3>
        
        <div className="space-y-3">
          {/* Player 1 */}
          {pair.player1 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {pair.player1.first_name?.[0]}{pair.player1.last_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {pair.player1.first_name} {pair.player1.last_name}
                </p>
                {pair.player1.email && (
                  <p className="text-sm text-gray-600">{pair.player1.email}</p>
                )}
              </div>
            </div>
          )}
          
          {/* Player 2 */}
          {pair.player2 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {pair.player2.first_name?.[0]}{pair.player2.last_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {pair.player2.first_name} {pair.player2.last_name}
                </p>
                {pair.player2.email && (
                  <p className="text-sm text-gray-600">{pair.player2.email}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamParticipant = (team, isWinner) => {
    if (!team) return <div className="text-gray-500">TBD</div>;

    const hasSquad = team.squad && (
      team.squad.starting_lineup?.length > 0 || 
      team.squad.substitutes?.length > 0
    );

    return (
      <div className={`p-6 rounded-xl border-2 ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
        {isWinner && (
          <div className="flex items-center gap-2 mb-4 text-yellow-600">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Winner</span>
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" />
          {team.name}
        </h3>
        
        {hasSquad ? (
          <div className="space-y-4">
            {/* Starting Lineup */}
            {team.squad.starting_lineup && team.squad.starting_lineup.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Starting Lineup ({team.squad.starting_lineup.length})
                </p>
                <div className="space-y-2">
                  {team.squad.starting_lineup.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            {member.squad_captain && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Captain" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {member.position_label && <span>{member.position_label}</span>}
                            {member.email && <span>• {member.email}</span>}
                          </div>
                        </div>
                      </div>
                      {member.jersey_number && (
                        <div className="bg-blue-600 text-white font-bold px-3 py-1 rounded text-sm">
                          #{member.jersey_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Substitutes */}
            {team.squad.substitutes && team.squad.substitutes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-yellow-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Substitutes ({team.squad.substitutes.length})
                </p>
                <div className="space-y-2">
                  {team.squad.substitutes.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {member.first_name} {member.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {member.position_label && <span>{member.position_label}</span>}
                            {member.email && <span>• {member.email}</span>}
                          </div>
                        </div>
                      </div>
                      {member.jersey_number && (
                        <div className="bg-gray-600 text-white font-bold px-3 py-1 rounded text-sm">
                          #{member.jersey_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not in Squad */}
            {team.squad.not_in_squad && team.squad.not_in_squad.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Not in Squad ({team.squad.not_in_squad.length})
                </p>
                <div className="space-y-2">
                  {team.squad.not_in_squad.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        {member.email && (
                          <p className="text-sm text-gray-600">{member.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Fallback: Show all members if no squad is set
          team.members && team.members.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Team Members ({team.members.length})
              </p>
              {team.members.map((member) => (
                <div 
                  key={member.id} 
                  onClick={() => {
                    setSelectedPlayerId(member.id);
                    setShowPlayerProfile(true);
                  }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>
                      {member.is_captain && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          <Star className="w-3 h-3" />
                          Captain
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="text-sm text-gray-600">{member.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Match not found</h2>
            <button
              onClick={() => navigate(`/matches?tab=${tabParam}`)}
              className="mt-4 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Back to Matches
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWinner1 = match.winner_participant_id === match.participant1_id;
  const isWinner2 = match.winner_participant_id === match.participant2_id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/matches?tab=${tabParam}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Matches
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-xl p-10 text-white mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">{match.tournament_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  <span>{match.sport_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <span className="capitalize">{match.tournament_category}</span>
                </div>
              </div>
            </div>
            {getStatusBadge(match.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Calendar className="w-6 h-6" />
              <div>
                <p className="text-sm opacity-90">Date & Time</p>
                <p className="font-semibold">
                  {match.match_date ? new Date(match.match_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'TBD'}
                </p>
                {match.match_time && (
                  <p className="text-sm">{match.match_time}</p>
                )}
              </div>
            </div>

            {match.venue_name && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <MapPin className="w-6 h-6" />
                <div>
                  <p className="text-sm opacity-90">Venue</p>
                  <p className="font-semibold">{match.venue_name}</p>
                  {match.court_name && (
                    <p className="text-sm">{match.court_name}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Trophy className="w-6 h-6" />
              <div>
                <p className="text-sm opacity-90">Round</p>
                <p className="font-semibold">{match.round_name || `Round ${match.round_number}`}</p>
              </div>
            </div>
          </div>

          {/* Match Configuration - Inline in header */}
          {match.tournament_match_config && (() => {
            const config = typeof match.tournament_match_config === 'string' 
              ? JSON.parse(match.tournament_match_config) 
              : match.tournament_match_config;
            
            // Helper function to format field names
            const formatFieldName = (key) => {
              return key
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            };
            
            // Helper function to format values
            const formatValue = (value) => {
              if (typeof value === 'boolean') return value ? 'Yes' : 'No';
              if (value === null || value === undefined) return 'N/A';
              return value;
            };
            
            // Fields to exclude from display
            const excludeFields = ['match_structure', 'sport', 'id', 'sport_id', 'created_at', 'updated_at', 'deuce_enabled', 'estimated_duration'];
            
            // Get all config fields
            const configFields = Object.entries(config).filter(([key]) => !excludeFields.includes(key));
            
            return (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4" />
                  <p className="text-sm font-semibold opacity-90">Match Details</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {configFields.map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <p className="opacity-75 mb-0.5">{formatFieldName(key)}</p>
                      <p className="font-bold text-sm">
                        {formatValue(value)}
                        {key.includes('duration') || key.includes('minutes') ? ' min' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        
        <div className="mb-8 relative">
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-4xl">
              {/* VS Banner Container */}
              <div className="flex items-center justify-center relative" style={{ height: '120px' }}>
                {/* Participant 1 Label */}
                <div className="absolute left-0 z-20 transform -skew-x-12 bg-gradient-to-r from-primary-500 to-primary-500 shadow-2xl" style={{ width: '45%', height: '80px' }}>
                  <div className="transform skew-x-12 h-full flex items-center justify-center px-8">
                    <span className="text-white font-bold text-2xl uppercase tracking-wider">
                      {match.tournament_category === 'singles' && participants.participant1?.user 
                        ? `${participants.participant1.user.first_name} ${participants.participant1.user.last_name}`
                        : match.tournament_category === 'doubles' && participants.participant1
                        ? participants.participant1.name
                        : match.tournament_category === 'teams' && participants.participant1
                        ? participants.participant1.name
                        : 'Participant 1'}
                    </span>
                  </div>
                </div>

                {/* VS Center Badge */}
                <div className="absolute left-1/2 transform -translate-x-1/2 z-30 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl" style={{ width: '120px', height: '120px', clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)' }}>
                  <div className="h-full flex items-center justify-center">
                    <span className="text-white font-black text-4xl">VS</span>
                  </div>
                </div>

                {/* Participant 2 Label */}
                <div className="absolute right-0 z-20 transform -skew-x-12 bg-gradient-to-r from-primary-500 to-primary-600 shadow-2xl" style={{ width: '45%', height: '80px' }}>
                  <div className="transform skew-x-12 h-full flex items-center justify-center px-8">
                    <span className="text-white font-bold text-2xl uppercase tracking-wider">
                      {match.tournament_category === 'singles' && participants.participant2?.user 
                        ? `${participants.participant2.user.first_name} ${participants.participant2.user.last_name}`
                        : match.tournament_category === 'doubles' && participants.participant2
                        ? participants.participant2.name
                        : match.tournament_category === 'teams' && participants.participant2
                        ? participants.participant2.name
                        : 'Participant 2'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
            {/* Participant 1 */}
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                Participant 1
              </div>
              {match.tournament_category === 'singles' && renderSinglesParticipant(participants.participant1, isWinner1)}
              {match.tournament_category === 'doubles' && renderDoublesParticipant(participants.participant1, isWinner1)}
              {match.tournament_category === 'teams' && renderTeamParticipant(participants.participant1, isWinner1)}
            </div>

            {/* Participant 2 */}
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                Participant 2
              </div>
              {match.tournament_category === 'singles' && renderSinglesParticipant(participants.participant2, isWinner2)}
              {match.tournament_category === 'doubles' && renderDoublesParticipant(participants.participant2, isWinner2)}
              {match.tournament_category === 'teams' && renderTeamParticipant(participants.participant2, isWinner2)}
            </div>
          </div>
        </div>

        {/* Referee Section */}
        {match.referee_name && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Match officials
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-gray-900">{match.referee_name}</p>
                  <p className="text-sm text-gray-600">Match officials</p>
                </div>
              </div>
              
              {canShowManageButton() && (
                <button
                  onClick={handleManageMatch}
                  className={`px-6 py-3 font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                    isMatchDayToday() || match.status === 'in_progress'
                      ? match.status === 'in_progress'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg cursor-pointer animate-pulse'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-lg cursor-pointer'
                      : 'bg-gradient-to-r from-red-400 to-red-500 text-white cursor-not-allowed opacity-75'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  {match.status === 'in_progress' 
                    ? '▶️ Continue Match' 
                    : isMatchDayToday() 
                    ? 'Start & Manage Match' 
                    : 'Not Match Day Yet'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Match Timing Display - NEW! */}
        {/* <MatchTimingDisplay matchId={matchId} /> */}
        
        {/* Squad Display is now integrated in the participant cards above */}

        {/* Match Result */}
        {match.status === 'completed' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-green-600" />
              Match Completed
            </h3>
            {match.score && (() => {
              // Parse score if it's a string
              const scoreData = typeof match.score === 'string' ? JSON.parse(match.score) : match.score;
              
              // Determine score display based on sport type
              const isGameBased = ['Table Tennis', 'Squash', 'Pickleball'].includes(match.sport_name);
              const isSetBased = ['Tennis', 'Badminton', 'Padel', 'Volleyball'].includes(match.sport_name);
              const isTimeBased = match.sport_name === 'Football';
              
              // Check for penalty shootout
              const hasPenaltyShootout = scoreData.penalty_shootout && scoreData.penalty_shootout.kicks && scoreData.penalty_shootout.kicks.length > 0;
              
              let scoreDisplay = '';
              
              if (isGameBased) {
                // Show games won for game-based sports
                const p1Games = scoreData.participant1?.games_won || 0;
                const p2Games = scoreData.participant2?.games_won || 0;
                scoreDisplay = `${p1Games} - ${p2Games}`;
              } else if (isSetBased) {
                // Show sets won for set-based sports
                const p1Sets = scoreData.participant1?.sets_won || 0;
                const p2Sets = scoreData.participant2?.sets_won || 0;
                scoreDisplay = `${p1Sets} - ${p2Sets}`;
              } else if (isTimeBased) {
                // Show goals for time-based sports
                const p1Goals = scoreData.participant1?.goals || 0;
                const p2Goals = scoreData.participant2?.goals || 0;
                scoreDisplay = `${p1Goals} - ${p2Goals}`;
                
                // Add penalty shootout score if present
                if (hasPenaltyShootout) {
                  const p1Pens = scoreData.penalty_shootout.participant1_scored || 0;
                  const p2Pens = scoreData.penalty_shootout.participant2_scored || 0;
                  scoreDisplay += ` (${p1Pens}-${p2Pens} pens)`;
                }
              } else {
                // Fallback to raw score
                scoreDisplay = typeof match.score === 'string' ? match.score : JSON.stringify(match.score);
              }
              
              return (
                <>
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg mb-4">
                    <p className="text-2xl font-bold text-green-900 text-center">
                      {scoreDisplay}
                    </p>
                    <p className="text-sm text-gray-600 text-center mt-2">
                      {isGameBased ? 'Games Won' : isSetBased ? 'Sets Won' : isTimeBased ? 'Goals' : 'Final Score'}
                    </p>
                  </div>
                  
                  {/* Penalty Shootout Details */}
                  {hasPenaltyShootout && (
                    <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg mb-6 shadow-md">
                      <h4 className="text-xl font-bold text-orange-600 text-center mb-4 flex items-center justify-center gap-2">
                        <Target className="w-5 h-5 animate-pulse" />
                        ⚽ Penalty Shootout {scoreData.penalty_shootout.sudden_death && '- Sudden Death'}
                      </h4>
                      
                      <div className="grid grid-cols-3 gap-4 items-center mb-6">
                        {/* Team 1 Penalty Score */}
                        <div className="text-center">
                          <div className="text-4xl font-bold text-primary-500">
                            {scoreData.penalty_shootout.participant1_scored}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {scoreData.penalty_shootout.participant1_attempts} attempts
                          </div>
                        </div>
                        
                        {/* Status Label */}
                        <div className="text-center">
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold uppercase tracking-wider">
                            Shootout Results
                          </span>
                        </div>
                        
                        {/* Team 2 Penalty Score */}
                        <div className="text-center">
                          <div className="text-4xl font-bold text-primary-600">
                            {scoreData.penalty_shootout.participant2_scored}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {scoreData.penalty_shootout.participant2_attempts} attempts
                          </div>
                        </div>
                      </div>

                      {/* Penalty Kicks Grid */}
                      {scoreData.penalty_shootout.kicks && scoreData.penalty_shootout.kicks.length > 0 && (() => {
                        const kicksByRound = {};
                        scoreData.penalty_shootout.kicks.forEach(kick => {
                          const r = kick.round || 1;
                          if (!kicksByRound[r]) {
                            kicksByRound[r] = { participant1: null, participant2: null };
                          }
                          kicksByRound[r][kick.participant_side] = kick;
                        });

                        const roundNumbers = Object.keys(kicksByRound).map(Number).sort((a, b) => a - b);
                        
                        const getResultBadge = (kick) => {
                          if (!kick) return <span className="text-gray-400 font-normal">-</span>;
                          
                          if (kick.result === 'scored') {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                                <span>✅</span> Goal
                              </span>
                            );
                          } else if (kick.result === 'saved') {
                            return (
                              <div className="flex flex-col items-center md:items-start">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 shadow-sm">
                                  <span>🧤</span> Saved
                                </span>
                                {kick.goalkeeper_name && (
                                  <span className="text-[10px] text-gray-500 mt-0.5 italic max-w-[120px] truncate" title={`Saved by ${kick.goalkeeper_name}`}>
                                    by {kick.goalkeeper_name}
                                  </span>
                                )}
                              </div>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm">
                                <span>❌</span> Missed
                              </span>
                            );
                          }
                        };

                        return (
                          <div className="mt-4 bg-white rounded-xl border border-gray-200/80 p-4 shadow-inner w-full">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-100 text-gray-500 pb-2">
                                    <th className="text-left font-semibold pb-2 w-5/12">
                                      {match.participant1_name || 'Team A'}
                                    </th>
                                    <th className="text-center font-semibold pb-2 w-2/12">Round</th>
                                    <th className="text-right font-semibold pb-2 w-5/12">
                                      {match.participant2_name || 'Team B'}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {roundNumbers.map((roundNum) => {
                                    const p1Kick = kicksByRound[roundNum].participant1;
                                    const p2Kick = kicksByRound[roundNum].participant2;
                                    const isSuddenDeath = roundNum > 5;
                                    
                                    return (
                                      <tr key={roundNum} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Team 1 Kick info */}
                                        <td className="py-3 text-left">
                                          {p1Kick ? (
                                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                              <div className="font-semibold text-gray-800 text-sm">
                                                {p1Kick.player_name || 'Player'}
                                              </div>
                                              <div>{getResultBadge(p1Kick)}</div>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400 font-normal">-</span>
                                          )}
                                        </td>
                                        
                                        {/* Round Number */}
                                        <td className="py-3 text-center">
                                          <span className={`inline-flex flex-col items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${
                                            isSuddenDeath 
                                              ? 'bg-red-50 text-red-700 border border-red-100' 
                                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                                          }`}>
                                            <span>R{roundNum}</span>
                                            {isSuddenDeath && <span className="text-[8px] font-medium tracking-tighter uppercase">SD</span>}
                                          </span>
                                        </td>
                                        
                                        {/* Team 2 Kick info */}
                                        <td className="py-3 text-right">
                                          {p2Kick ? (
                                            <div className="flex flex-col md:flex-row md:items-center justify-end gap-2">
                                              <div>{getResultBadge(p2Kick)}</div>
                                              <div className="font-semibold text-gray-800 text-sm">
                                                {p2Kick.player_name || 'Player'}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400 font-normal">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              );
            })()}
            <button
              onClick={() => navigate(`/matches/${match.id}/history?tab=${tabParam}`)}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              View Complete Match History
            </button>
          </div>
        )}

        {/* Tournament Link - Only show for non-standalone matches */}
        {match.is_standalone !== 1 && (
          <div className="text-center">
            <button
              onClick={() => navigate(`/tournaments/${match.tournament_id}`)}
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-3"
            >
              <Trophy className="w-5 h-5" />
              View Full Tournament
            </button>
          </div>
        )}
      </div>

      {/* Match Day Warning Modal */}
      {showMatchDayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
            <button
              onClick={() => setShowMatchDayModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Not Match Day Yet</h3>
              <p className="text-gray-600">
                This match cannot be started until the scheduled date and time.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Scheduled For:</span>
              </div>
              <p className="text-lg font-bold text-blue-900 ml-8">
                {getMatchDateTime()}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  The <strong>"Start & Manage Match"</strong> button will turn <strong className="text-green-600">green</strong> and become active on the match day.
                </span>
              </p>
            </div>

            <button
              onClick={() => setShowMatchDayModal(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {showPlayerProfile && selectedPlayerId && (
        <PlayerProfileModal
          playerId={selectedPlayerId}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default MatchDetails;
