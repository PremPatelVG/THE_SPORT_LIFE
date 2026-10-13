import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  X,
  CheckCircle,
  AlertCircle,
  Plus,
  Shield,
  User,
  Info,
  Trophy,
  Repeat
} from 'lucide-react';
import { getEligibleTeams } from '../services/tournamentService';

const TeamSelectionModal = ({ tournament, onClose, onSelectTeam, onCreateTeam }) => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEligibleTeams();
  }, [tournament.id]);

  const fetchEligibleTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEligibleTeams(tournament.id);
      setTeams(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (selectedTeam) {
      onSelectTeam(selectedTeam);
    }
  };

  // Separate teams by type and eligibility
  const tournamentTeams = teams.filter(t => t.is_tournament_specific);
  const reusableTeams = teams.filter(t => !t.is_tournament_specific);
  
  const eligibleTournamentTeams = tournamentTeams.filter(t => t.can_register);
  const ineligibleTournamentTeams = tournamentTeams.filter(t => !t.can_register);
  
  const eligibleReusableTeams = reusableTeams.filter(t => t.can_register);
  const ineligibleReusableTeams = reusableTeams.filter(t => !t.can_register);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {tournament.tournament_type === 'open' ? 'Request to Join Tournament' : 'Select Your Team'}
              </h3>
              <p className="text-sm text-blue-100">
                {tournament.tournament_type === 'open' 
                  ? `Send a request to join ${tournament.name}` 
                  : `Choose a team to register for ${tournament.name}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your teams...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">No Teams Yet</h4>
              <p className="text-gray-600 mb-6">You don't have any eligible teams for this tournament</p>
              <p className="text-sm text-gray-500 mb-6">Create a tournament-specific team or a reusable team to participate</p>
              <button
                onClick={onCreateTeam}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Create New Team
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tournament-Specific Teams Section */}
              {tournamentTeams.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-purple-600" />
                    <h4 className="text-base font-bold text-gray-900">Tournament Teams</h4>
                    <span className="text-xs text-gray-500">({tournamentTeams.length})</span>
                  </div>
                  
                  {/* Eligible Tournament Teams */}
                  {eligibleTournamentTeams.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-primary-500" />
                        Ready to register ({eligibleTournamentTeams.length})
                      </p>
                      <div className="space-y-3">
                        {eligibleTournamentTeams.map((team) => (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedTeam?.id === team.id
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h5 className="font-bold text-gray-900">{team.name}</h5>
                              {team.is_tournament_specific ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                  <Trophy className="w-3 h-3" />
                                  Tournament Team
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                  <Repeat className="w-3 h-3" />
                                  Reusable Team
                                </span>
                              )}
                              {team.is_captain && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-600 text-xs font-semibold rounded-full">
                                  <Shield className="w-3 h-3" />
                                  Captain
                                </span>
                              )}
                              {team.is_creator && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                  <User className="w-3 h-3" />
                                  Creator
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {team.member_count} / {team.max_players} members
                              </span>
                              {team.member_count >= team.min_members_required && (
                                <span className="flex items-center gap-1 text-primary-500">
                                  <CheckCircle className="w-4 h-4" />
                                  Ready to register
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{team.description}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedTeam?.id === team.id
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {selectedTeam?.id === team.id && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Ineligible Tournament Teams */}
                  {ineligibleTournamentTeams.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        Not ready ({ineligibleTournamentTeams.length})
                      </p>
                      <div className="space-y-3">
                        {ineligibleTournamentTeams.map((team) => (
                      <div
                        key={team.id}
                        className="p-4 border-2 border-gray-200 rounded-xl bg-gray-50 opacity-60"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h5 className="font-bold text-gray-700">{team.name}</h5>
                              {team.is_tournament_specific ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                                  <Trophy className="w-3 h-3" />
                                  Tournament Team
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                                  <Repeat className="w-3 h-3" />
                                  Reusable Team
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {team.member_count} / {team.max_players} members
                              </span>
                            </div>
                            {team.reasons && team.reasons.length > 0 && (
                              <div className="space-y-1">
                                {team.reasons.map((reason, index) => (
                                  <p key={index} className="text-xs text-red-600 flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    {reason}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
              )}
              
              {/* Reusable Teams Section */}
              {reusableTeams.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Repeat className="w-5 h-5 text-blue-600" />
                    <h4 className="text-base font-bold text-gray-900">Your Reusable Teams</h4>
                    <span className="text-xs text-gray-500">({reusableTeams.length})</span>
                  </div>
                  
                  {/* Eligible Reusable Teams */}
                  {eligibleReusableTeams.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-primary-500" />
                        Ready to register ({eligibleReusableTeams.length})
                      </p>
                      <div className="space-y-3">
                        {eligibleReusableTeams.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => setSelectedTeam(team)}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              selectedTeam?.id === team.id
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h5 className="font-bold text-gray-900">{team.name}</h5>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                    <Repeat className="w-3 h-3" />
                                    Reusable Team
                                  </span>
                                  {team.is_captain && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-600 text-xs font-semibold rounded-full">
                                      <Shield className="w-3 h-3" />
                                      Captain
                                    </span>
                                  )}
                                  {team.is_creator && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                      <User className="w-3 h-3" />
                                      Creator
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {team.member_count} / {team.max_players} members
                                  </span>
                                  {team.member_count >= team.min_members_required && (
                                    <span className="flex items-center gap-1 text-primary-500">
                                      <CheckCircle className="w-4 h-4" />
                                      Ready to register
                                    </span>
                                  )}
                                </div>
                                {team.description && (
                                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{team.description}</p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                  selectedTeam?.id === team.id
                                    ? 'border-blue-600 bg-blue-600'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedTeam?.id === team.id && (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Ineligible Reusable Teams */}
                  {ineligibleReusableTeams.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        Not ready ({ineligibleReusableTeams.length})
                      </p>
                      <div className="space-y-3">
                        {ineligibleReusableTeams.map((team) => (
                          <div
                            key={team.id}
                            className="p-4 border-2 border-gray-200 rounded-xl bg-gray-50 opacity-60"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h5 className="font-bold text-gray-700">{team.name}</h5>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                                    <Repeat className="w-3 h-3" />
                                    Reusable Team
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {team.member_count} / {team.max_players} members
                                  </span>
                                </div>
                                {team.reasons && team.reasons.length > 0 && (
                                  <div className="space-y-1">
                                    {team.reasons.map((reason, index) => (
                                      <p key={index} className="text-xs text-red-600 flex items-start gap-1">
                                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        {reason}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Create New Team Option */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={onCreateTeam}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  Create New Team for this Tournament
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">Team Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Team must have all required members (full team)</li>
                      <li>Only team captain or creator can register</li>
                      <li>Reusable teams must match tournament sport</li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="font-semibold mb-1">Team Types:</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-purple-600" />
                          <span className="text-blue-700"><strong>Tournament Team:</strong> Created for this specific tournament only</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-700"><strong>Reusable Team:</strong> Can participate in multiple tournaments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && teams.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              disabled={!selectedTeam}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Register Team
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSelectionModal;
