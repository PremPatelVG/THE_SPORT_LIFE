import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Award, Calendar, MapPin, Users, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import * as tournamentService from '../services/tournamentService';
import * as matchService from '../services/matchService';

/**
 * Participant Performance Page
 * Shows all matches played by a participant/team/pair in a tournament
 * Displays statistics: wins, losses, performance metrics
 */
const ParticipantPerformance = () => {
  const { tournamentId, participantId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [matches, setMatches] = useState([]);
  const [statistics, setStatistics] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    pointsScored: 0,
    pointsConceded: 0
  });

  
  useEffect(() => {
    loadData();
  }, [tournamentId, participantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load tournament details
      const tournamentData = await tournamentService.getTournamentById(tournamentId);
      setTournament(tournamentData);
      
      // Load all matches for this participant
      const matchesData = await matchService.getParticipantMatches(tournamentId, participantId);
      
      // Sort matches - latest first (by date, then by id)
      const sortedMatches = matchesData.sort((a, b) => {
        // First sort by date (descending)
        if (a.match_date && b.match_date) {
          const dateCompare = new Date(b.match_date) - new Date(a.match_date);
          if (dateCompare !== 0) return dateCompare;
        }
        // Then by ID (descending) for matches on same date
        return b.id - a.id;
      });
      
      setMatches(sortedMatches);
      
      // Try to get participant details from tournament participants API
      let participantData = null;
      try {
        const participantsResponse = await tournamentService.getParticipants(tournamentId);
        const allParticipants = participantsResponse || [];
        
        // Find the participant by ID - check all possible ID fields
        // The participantId from URL could be:
        // - registration_id (from tournament_registrations/tournament_participants)
        // - pair_id (from pairs table)
        // - team_id (from teams table)
        participantData = allParticipants.find(p => {
          const matches = p.id === parseInt(participantId) || 
                 p.registration_id === parseInt(participantId) ||
                 p.pair_id === parseInt(participantId) ||
                 p.team_id === parseInt(participantId) ||
                 p.partnership_id === parseInt(participantId);
          

          return matches;
        });
        
        // If not found, try to match by checking if participantId matches any nested IDs
        if (!participantData && tournamentData.category === 'doubles') {
          // For doubles, the URL might have the registration ID, but we need to match by pair
          participantData = allParticipants.find(p => {
            // Check if this participant's pair_id or partnership_id matches
            return p.pair_id === parseInt(participantId) || p.partnership_id === parseInt(participantId);
          });
          
        } else if (!participantData && tournamentData.category === 'teams') {
          // For teams, similar logic
          participantData = allParticipants.find(p => p.team_id === parseInt(participantId));
          
        }
        
        if (participantData) {
          // console.log('Participant data from API:', participantData);
          
          // Transform flattened pair data into players array if needed
          if (tournamentData.category === 'doubles' && !participantData.players && participantData.player1_id) {
            participantData.players = [
              {
                id: participantData.player1_id,
                first_name: participantData.player1_first_name,
                last_name: participantData.player1_last_name,
                phone: participantData.player1_phone,
                profile_image: participantData.player1_image,
                skill_level: participantData.player1_skill_level
              },
              {
                id: participantData.player2_id,
                first_name: participantData.player2_first_name,
                last_name: participantData.player2_last_name,
                phone: participantData.player2_phone,
                profile_image: participantData.player2_image,
                skill_level: participantData.player2_skill_level
              }
            ];
            // console.log('Transformed pair data with players array:', participantData);
          }
          
          // Parse members JSON for teams if it's a string
          if (tournamentData.category === 'teams' && participantData.members && typeof participantData.members === 'string') {
            try {
              participantData.members = JSON.parse(participantData.members);
              // console.log('Parsed team members JSON:', participantData.members);
            } catch (e) {
              console.error('Failed to parse team members JSON:', e);
            }
          }
        }
      } catch (error) {
        console.log('Could not fetch participant details from tournament API:', error);
      }
      
      // Fallback to getting name from match data if participant not found
      if (!participantData && matchesData.length > 0) {
        // console.log('Using match data for participant info');
        const firstMatch = matchesData[0];
        // console.log('First match:', firstMatch);
        const isParticipant1 = firstMatch.participant1_id === parseInt(participantId);
        const participantName = isParticipant1 ? firstMatch.participant1_name : firstMatch.participant2_name;
        
        participantData = {
          id: participantId,
          tournament_id: tournamentId,
          participant_name: participantName,
          is_winner: tournamentData.winner_participant_id === parseInt(participantId),
          tournament_category: tournamentData.category
        };
        
      } else if (participantData) {
        // Add winner status and category
        participantData.is_winner = tournamentData.winner_participant_id === parseInt(participantId);
        participantData.tournament_category = tournamentData.category;
        
      } else {
        // No matches and no participant data found
        
        participantData = {
          id: participantId,
          tournament_id: tournamentId,
          participant_name: 'Unknown Participant',
          is_winner: tournamentData.winner_participant_id === parseInt(participantId),
          tournament_category: tournamentData.category
        };
      }
      
      
      setParticipant(participantData);
      
      // Calculate statistics
      calculateStatistics(matchesData, participantId);
      
    } catch (error) {
      console.error('Error loading participant performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (matchesData, participantId) => {
    let wins = 0;
    let losses = 0;
    let pointsScored = 0;
    let pointsConceded = 0;

    matchesData.forEach(match => {
      if (match.status === 'completed' && match.winner_participant_id) {
        // Check if this participant won
        const isParticipant1 = match.participant1_id === parseInt(participantId);
        const isWinner = match.winner_participant_id === parseInt(participantId);
        
        // console.log('Match:', match.id, 'Winner:', match.winner_participant_id, 'Participant:', participantId, 'Is Winner:', isWinner);
        
        if (isWinner) {
          wins++;
        } else {
          losses++;
        }

        // Calculate points (sport-specific)
        if (match.live_score) {
          const score = typeof match.live_score === 'string' ? JSON.parse(match.live_score) : match.live_score;
          
          if (isParticipant1) {
            pointsScored += score.participant1?.goals || score.participant1?.sets_won || score.participant1?.games_won || 0;
            pointsConceded += score.participant2?.goals || score.participant2?.sets_won || score.participant2?.games_won || 0;
          } else {
            pointsScored += score.participant2?.goals || score.participant2?.sets_won || score.participant2?.games_won || 0;
            pointsConceded += score.participant1?.goals || score.participant1?.sets_won || score.participant1?.games_won || 0;
          }
        }
      }
    });

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    setStatistics({
      totalMatches,
      wins,
      losses,
      winRate,
      pointsScored,
      pointsConceded
    });
  };

  const getParticipantName = (participant) => {
    if (!participant) {
      return 'Unknown';
    }
    
    // Check all possible name fields
    if (participant.participant_name) {
      // console.log('getParticipantName - Using participant_name:', participant.participant_name);
      return participant.participant_name;
    }
    if (participant.team_name) {
      // console.log('getParticipantName - Using team_name:', participant.team_name);
      return participant.team_name;
    }
    if (participant.pair_name) {
      // console.log('getParticipantName - Using pair_name:', participant.pair_name);
      return participant.pair_name;
    }
    
    // Doubles Pair - construct from player names or player data
    if (participant.players && participant.players.length >= 2) {
      const name = `${participant.players[0].first_name} ${participant.players[0].last_name} & ${participant.players[1].first_name} ${participant.players[1].last_name}`;
      // console.log('getParticipantName - Constructed from players array:', name);
      return name;
    }
    
    if (participant.player1_name && participant.player2_name) {
      const name = `${participant.player1_name} / ${participant.player2_name}`;
      // console.log('getParticipantName - Constructed from player1/2_name:', name);
      return name;
    }
    
    // Check for flattened pair structure
    if (participant.player1_first_name && participant.player2_first_name) {
      const name = `${participant.player1_first_name} ${participant.player1_last_name} & ${participant.player2_first_name} ${participant.player2_last_name}`;
      // console.log('getParticipantName - Constructed from flattened pair data:', name);
      return name;
    }
    
    // Singles - construct from user name
    if (participant.user_name) {
      // console.log('getParticipantName - Using user_name:', participant.user_name);
      return participant.user_name;
    }
    
    // Fallback to first/last name
    if (participant.first_name && participant.last_name) {
      const name = `${participant.first_name} ${participant.last_name}`;
      // console.log('getParticipantName - Using first_name/last_name:', name);
      return name;
    }
    
    // console.log('getParticipantName - No name found, returning Unknown');
    return 'Unknown';
  };

  const getMatchResult = (match) => {
    if (match.status !== 'completed') {
      return { result: 'pending', label: 'Pending', color: 'gray' };
    }

    const isParticipant1 = match.participant1_id === parseInt(participantId);
    const isWinner = match.winner_participant_id === parseInt(participantId);

    if (match.winner_participant_id === null) {
      return { result: 'draw', label: 'Draw', color: 'blue' };
    }

    if (isWinner) {
      return { result: 'win', label: 'Win', color: 'green' };
    } else {
      return { result: 'loss', label: 'Loss', color: 'red' };
    }
  };

  const getMatchScore = (match) => {
    if (!match.live_score) return '-';
    
    try {
      const score = JSON.parse(match.live_score);
      const isParticipant1 = match.participant1_id === parseInt(participantId);
      
      // Sport-specific score display
      if (tournament.sport_name === 'Football') {
        const p1Goals = score.participant1?.goals || 0;
        const p2Goals = score.participant2?.goals || 0;
        return isParticipant1 ? `${p1Goals} - ${p2Goals}` : `${p2Goals} - ${p1Goals}`;
      }
      
      if (['Table Tennis', 'Squash', 'Pickleball', 'Volleyball'].includes(tournament.sport_name)) {
        const p1Games = score.participant1?.games_won || score.participant1?.sets_won || 0;
        const p2Games = score.participant2?.games_won || score.participant2?.sets_won || 0;
        return isParticipant1 ? `${p1Games} - ${p2Games}` : `${p2Games} - ${p1Games}`;
      }
      
      if (['Badminton', 'Tennis', 'Padel'].includes(tournament.sport_name)) {
        const p1Sets = score.participant1?.sets_won || 0;
        const p2Sets = score.participant2?.sets_won || 0;
        return isParticipant1 ? `${p1Sets} - ${p2Sets}` : `${p2Sets} - ${p1Sets}`;
      }
      
      return '-';
    } catch (error) {
      return '-';
    }
  };

  const getOpponentName = (match) => {
    const isParticipant1 = match.participant1_id === parseInt(participantId);
    return isParticipant1 ? match.participant2_name : match.participant1_name;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Tournament</span>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-8 text-white mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{getParticipantName(participant)}</h1>
              <p className="text-primary-100 text-lg mb-4">{tournament?.name}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>{tournament?.sport_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="capitalize">{tournament?.category}</span>
                </div>
                {participant?.is_winner && (
                  <div className="flex items-center gap-2 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full font-bold">
                    <Award className="w-4 h-4" />
                    <span>CHAMPION</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Players/Members Info - For Doubles and Teams */}
        {tournament?.category === 'doubles' && participant?.players && participant.players.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Players</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participant.players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {player.first_name?.[0]}{player.last_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{player.first_name} {player.last_name}</p>
                    {player.skill_level && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {player.skill_level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tournament?.category === 'teams' && participant?.members && participant.members.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Team Members ({participant.members.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participant.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{member.first_name} {member.last_name}</p>
                      {member.is_captain === 1 && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">C</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {member.jersey_number && `#${member.jersey_number}`}
                      {member.position && member.position !== '0' && ` • ${member.position}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Matches */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Matches</p>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{statistics.totalMatches}</p>
          </div>

          {/* Wins */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Wins</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{statistics.wins}</p>
          </div>

          {/* Losses */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Losses</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{statistics.losses}</p>
          </div>

          {/* Win Rate */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Win Rate</p>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{statistics.winRate}%</p>
          </div>
        </div>

        {/* Match History */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Match History</h2>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No matches found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => {
                const result = getMatchResult(match);
                const isParticipant1 = match.participant1_id === parseInt(participantId);
                
                return (
                  <div
                    key={match.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/matches/${match.id}/history`)}
                  >
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white">
                        <Trophy className="w-5 h-5" />
                        <span className="font-semibold">{tournament?.sport_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-white bg-opacity-20 text-black px-3 py-1 rounded-full text-xs font-semibold">
                          {match.status === 'completed' ? '✓ Completed' : match.status}
                        </span>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="p-4">
                      {/* Sport and Date Info */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          <span>{tournament?.sport_name}</span>
                        </div>
                        {match.match_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(match.match_date).toLocaleDateString()} • {match.match_time?.substring(0, 5)}</span>
                          </div>
                        )}
                      </div>

                      {/* VS Section */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">You ({tournament?.category})</p>
                            <p className="font-bold text-primary-600 text-base break-words line-clamp-2" title={getParticipantName(participant)}>
                              {getParticipantName(participant)}
                            </p>
                          </div>
                          <div className="flex-shrink-0 px-2">
                            <p className="text-gray-400 font-semibold text-lg">VS</p>
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-xs text-gray-500 mb-1">Opponent</p>
                            <p className="font-bold text-gray-900 text-base break-words line-clamp-2" title={getOpponentName(match)}>
                              {getOpponentName(match)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Result Banner */}
                      <div className={`rounded-lg p-3 mb-3 text-center ${
                        result.result === 'win' ? 'bg-green-50' :
                        result.result === 'loss' ? 'bg-red-50' :
                        result.result === 'draw' ? 'bg-blue-50' :
                        'bg-gray-50'
                      }`}>
                        <p className={`font-bold text-lg ${
                          result.result === 'win' ? 'text-green-600' :
                          result.result === 'loss' ? 'text-red-600' :
                          result.result === 'draw' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {result.result === 'win' ? '✓ Won' : 
                           result.result === 'loss' ? '✕ Lost' : 
                           result.result === 'draw' ? '= Draw' : 'Pending'}
                        </p>
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          <span>{match.round_name || `Round ${match.round_number}`}</span>
                        </div>
                        {match.venue_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>Match officials: {match.venue_name}</span>
                          </div>
                        )}
                      </div>

                      {/* View Details Button */}
                      <button className="w-full mt-4 bg-primary-500 text-white py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors">
                        View Match Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantPerformance;
