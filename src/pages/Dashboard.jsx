import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchProfile } from '../store/slices/userSlice';
import Navbar from '../components/Navbar';
import apiClient from '../config/api';
import { getSportIcon } from '../utils/sportIcons';
import { 
  Trophy, 
  Calendar, 
  MapPin,
  Users,
  ChevronRight,
  Plus,
  Radio,
  Clock,
  Eye,
  Filter,
  Award,
  User
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { profile, loading } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingLiveMatches, setLoadingLiveMatches] = useState(true);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedMatchType, setSelectedMatchType] = useState('all'); // all, tournament, standalone
  const [allSports, setAllSports] = useState([]);

  useEffect(() => {
    fetchTournaments();
    fetchLiveMatches();
    fetchAllSports();
    
    // Poll for live matches every 10 seconds
    const interval = setInterval(fetchLiveMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoadingTournaments(true);
      
      // Fetch upcoming tournaments (public)
      const upcomingResponse = await apiClient.get('/tournaments/upcoming?limit=6');
      if (upcomingResponse.data.success) {
        setUpcomingTournaments(upcomingResponse.data.data || []);
      }

      // Fetch my tournaments (requires auth)
      try {
        const myResponse = await apiClient.get('/tournaments/my/tournaments');
        if (myResponse.data.success) {
          setMyTournaments(myResponse.data.data.tournaments || []);
        }
      } catch (error) {
        // User might not be logged in, that's okay
        console.log('Could not fetch my tournaments:', error);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoadingTournaments(false);
    }
  };

  const fetchLiveMatches = async () => {
    try {
      const response = await apiClient.get('/matches/dashboard/live');
      // console.log('Live matches response:', response.data);
      if (response.data.success) {
        const matches = response.data.data || [];
        // console.log('Live matches data:', matches);
        // if (matches.length > 0) {
        //   console.log('First match participant names:', {
        //     p1: matches[0].participant1_name,
        //     p2: matches[0].participant2_name,
        //     live_score: matches[0].live_score
        //   });
        // }
        setLiveMatches(matches);
      }
    } catch (error) {
      console.error('Error fetching live matches:', error);
    } finally {
      setLoadingLiveMatches(false);
    }
  };

  // Helper function to get current score display (same logic as LiveMatchView)
  const getScoreDisplay = (match) => {
    // Try live_score first (real-time data), fallback to score (final data)
    const liveScore = match.live_score || match.score;
    
    if (!liveScore) {
      console.log('No score data for match:', match.id);
      return null;
    }
    
    // console.log('Score data for match', match.id, ':', liveScore);
    
    // For game-based sports (Table Tennis, Squash, Pickleball)
    if (liveScore.participant1?.games_won !== undefined || liveScore.participant1?.game_scores) {
      const p1GamesWon = liveScore.participant1?.games_won || 0;
      const p2GamesWon = liveScore.participant2?.games_won || 0;
      
      // Get current game score
      const currentGameIndex = (liveScore.current_game || 1) - 1;
      const p1CurrentScore = liveScore.participant1?.game_scores?.[currentGameIndex] || 0;
      const p2CurrentScore = liveScore.participant2?.game_scores?.[currentGameIndex] || 0;
      
      return {
        label: 'Games',
        p1: `${p1GamesWon} (${p1CurrentScore})`,
        p2: `${p2GamesWon} (${p2CurrentScore})`
      };
    }
    
    // For set-based sports (Tennis, Badminton, Padel)
    if (liveScore.participant1?.sets_won !== undefined || liveScore.participant1?.set_scores || liveScore.participant1?.games) {
      const p1SetsWon = liveScore.participant1?.sets_won || 0;
      const p2SetsWon = liveScore.participant2?.sets_won || 0;
      
      // Get current set score
      const currentSetIndex = (liveScore.current_set || 1) - 1;
      // Tennis/Padel uses 'games' array, Badminton uses 'set_scores' array
      const p1CurrentScore = liveScore.participant1?.games?.[currentSetIndex] 
        || liveScore.participant1?.set_scores?.[currentSetIndex] 
        || 0;
      const p2CurrentScore = liveScore.participant2?.games?.[currentSetIndex] 
        || liveScore.participant2?.set_scores?.[currentSetIndex] 
        || 0;
      
      return {
        label: 'Sets',
        p1: `${p1SetsWon} (${p1CurrentScore})`,
        p2: `${p2SetsWon} (${p2CurrentScore})`
      };
    }
    
    // For time-based sports (Football, Volleyball, Cricket)
    if (liveScore.participant1?.goals !== undefined) {
      // Determine label based on sport
      let label = 'Score';
      if (match.sport_name === 'Football') {
        label = 'Goals';
      } else if (match.sport_name === 'Volleyball') {
        label = 'Points';
      } else if (match.sport_name === 'Cricket') {
        label = 'Runs';
      }
      
      return {
        label: label,
        p1: liveScore.participant1.goals,
        p2: liveScore.participant2.goals
      };
    }
    
    // console.log('No valid score format found for match', match.id);
    return null;
  };

  const fetchAllSports = async () => {
    try {
      const response = await apiClient.get('/sports');
      if (response.data.success) {
        setAllSports(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            Welcome back, {profile?.first_name || 'User'}! 👋
          </h2>
          <p className="text-gray-600">
            Manage your tournaments and discover new competitions.
          </p>
        </div>

        {/* Live Matches Section */}
        {!loadingLiveMatches && (
          <div className="mb-8">
            {liveMatches.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Radio className="w-6 h-6 text-red-500" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-red-500">Live Matches</h3>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {liveMatches.filter(m => 
                      (selectedSport === 'all' || m.sport_name === selectedSport) &&
                      (selectedMatchType === 'all' || 
                       (selectedMatchType === 'tournament' && !m.is_standalone) ||
                       (selectedMatchType === 'standalone' && m.is_standalone))
                    ).length} LIVE
                  </span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  
                  {/* Match Type Filter */}
                  <select
                    value={selectedMatchType}
                    onChange={(e) => setSelectedMatchType(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <option value="all">All Matches</option>
                    <option value="tournament">Tournament</option>
                    <option value="standalone">Standalone</option>
                  </select>

                  {/* Sport Filter */}
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <option value="all">All Sports</option>
                    {allSports.map(sport => (
                      <option key={sport.id} value={sport.name}>{sport.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {liveMatches.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Radio className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Live Matches Right Now
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  There are no matches being played at the moment. Check back later or browse upcoming tournaments.
                </p>
                <button 
                  onClick={() => navigate('/tournaments')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  Browse Tournaments
                </button>
              </div>
            ) : liveMatches.filter(match => 
              (selectedSport === 'all' || match.sport_name === selectedSport) &&
              (selectedMatchType === 'all' || 
               (selectedMatchType === 'tournament' && !match.is_standalone) ||
               (selectedMatchType === 'standalone' && match.is_standalone))
            ).length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Matches Found
                </h3>
                <p className="text-gray-600 mb-4">
                  No live matches found for the selected filters
                </p>
                <button 
                  onClick={() => {
                    setSelectedSport('all');
                    setSelectedMatchType('all');
                  }}
                  className="text-primary-500 hover:text-primary-600 font-semibold text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveMatches
                  .filter(match => 
                    (selectedSport === 'all' || match.sport_name === selectedSport) &&
                    (selectedMatchType === 'all' || 
                     (selectedMatchType === 'tournament' && !match.is_standalone) ||
                     (selectedMatchType === 'standalone' && match.is_standalone))
                  )
                  .map((match) => (
                  <div 
                    key={match.id}
                    onClick={() => navigate(`/matches/${match.id}/live`)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">
                            {match.is_standalone ? '⚡ Standalone' : '🏆 Tournament'}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {match.is_standalone ? 'Friendly Match' : match.tournament_name}
                          </p>
                          {!match.is_standalone && match.round_name && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {match.round_name}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded flex-shrink-0">
                          LIVE
                        </span>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="p-4">
                      <div className="space-y-2">
                        {(() => {
                          const scoreDisplay = getScoreDisplay(match);
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold text-xs">
                                      {match.participant1_name?.charAt(0)?.toUpperCase() || 'D'}
                                    </span>
                                  </div>
                                  <span className="font-medium text-gray-900 text-sm truncate">
                                    {match.participant1_name || 'Player 1'}
                                  </span>
                                </div>
                                {scoreDisplay && (
                                  <span className="text-xl font-bold text-gray-900 ml-2 tabular-nums">
                                    {scoreDisplay.p1}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-center py-1">
                                <span className="text-xs text-gray-400">
                                  VS {scoreDisplay?.label && `(${scoreDisplay.label})`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold text-xs">
                                      {match.participant2_name?.charAt(0)?.toUpperCase() || 'D'}
                                    </span>
                                  </div>
                                  <span className="font-medium text-gray-900 text-sm truncate">
                                    {match.participant2_name || 'Player 2'}
                                  </span>
                                </div>
                                {scoreDisplay && (
                                  <span className="text-xl font-bold text-gray-900 ml-2 tabular-nums">
                                    {scoreDisplay.p2}
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-600">{getSportIcon(match.sport_name)} {match.sport_name}</span>
                      <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition-colors">
                        Watch Live
                      </button>
                    </div>
                  </div>
              ))}
              </div>
            )}
          </div>
        )}

        
      </div>
    </div>
  );
};

export default Dashboard;