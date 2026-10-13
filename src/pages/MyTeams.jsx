import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchMyTeams,
  fetchMyInvitations,
  acceptInvitation,
  rejectInvitation,
  clearError,
  clearSuccess
} from '../store/slices/teamSlice';
import { formatDate } from '../utils/dateFormatter';
import {
  Users,
  Trophy,
  Shield,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Clock,
  ChevronDown
} from 'lucide-react';

const MyTeams = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { myTeams, myInvitations, loading, error, success } = useSelector((state) => state.team);

  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'invitations'
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(fetchMyTeams());
    dispatch(fetchMyInvitations());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSuccess());
    };
  }, [dispatch]);

  const handleAcceptInvitation = async (invitationId) => {
    const result = await dispatch(acceptInvitation(invitationId));
    
    if (acceptInvitation.fulfilled.match(result)) {
      toast.success('Invitation accepted successfully!');
      dispatch(fetchMyTeams());
      dispatch(fetchMyInvitations());
    } else if (acceptInvitation.rejected.match(result)) {
      const errorMessage = result.payload || result.error?.message || 'Failed to accept invitation';
      toast.error(errorMessage);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    const result = await dispatch(rejectInvitation(invitationId));
    
    if (rejectInvitation.fulfilled.match(result)) {
      toast.success('Invitation declined');
      dispatch(fetchMyInvitations());
    } else if (rejectInvitation.rejected.match(result)) {
      const errorMessage = result.payload || result.error?.message || 'Failed to decline invitation';
      toast.error(errorMessage);
    }
  };

  const pendingInvitations = myInvitations?.filter(inv => inv.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  My Teams
                </h1>
                <p className="text-sm text-gray-600">Manage your teams and invitations</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Team</span>
            </button>
          </div>
        </div>
      </header>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What would you like to create?</h2>
            <p className="text-gray-600 mb-6">Choose whether you want to create a team or a pair</p>
            
            <div className="space-y-3">
              {/* Create Team Button */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  navigate('/teams/create');
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 rounded-xl transition-all group"
              >
                <div className="bg-blue-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">Create Team</h3>
                  <p className="text-sm text-gray-600">Build a team with multiple players</p>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Create Pair Button */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  navigate('/pairs/create');
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 rounded-xl transition-all group"
              >
                <div className="bg-purple-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">Create Pair</h3>
                  <p className="text-sm text-gray-600">Form a doubles pair with a partner</p>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-600 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'teams'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                <span>My Teams</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {myTeams?.length || 0}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'invitations'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                <span>Invitations</span>
                {pendingInvitations.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        )}

        {/* My Teams Tab */}
        {!loading && activeTab === 'teams' && (
          <>
            {myTeams && myTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTeams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 group cursor-pointer"
                    onClick={() => navigate(`/teams/${team.id}`)}
                  >
                    {/* Team Header */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          {team.captain_id === team.creator_id && (
                            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
                              <Shield className="w-3 h-3" />
                              <span className="text-xs font-semibold">Captain</span>
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-blue-100 transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-blue-100 text-sm font-medium">{team.sport_name}</p>
                      </div>
                    </div>

                    {/* Team Details */}
                    <div className="p-6 space-y-3">
                      {team.tournament_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Trophy className="w-4 h-4 text-blue-600" />
                          <span className="line-clamp-1">{team.tournament_name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>
                          {team.member_count || 0} / {team.max_players} members
                        </span>
                      </div>

                      {/* View Details Button */}
                      <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 group/btn">
                        Manage Team
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Teams Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first team or accept an invitation to get started
                </p>
                <button
                  onClick={() => navigate('/teams/create')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Team
                </button>
              </div>
            )}
          </>
        )}

        {/* Invitations Tab */}
        {!loading && activeTab === 'invitations' && (
          <>
            {pendingInvitations.length > 0 ? (
              <div className="space-y-4">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                            <Mail className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {invitation.team_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Invited by {invitation.invited_by_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          {invitation.tournament_name && (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-blue-600" />
                              <span>{invitation.tournament_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(invitation.invited_at)}</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectInvitation(invitation.id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Invitations</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You don't have any team invitations at the moment
                </p>
                <button
                  onClick={() => navigate('/teams')}
                  className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 inline-flex items-center gap-2"
                >
                  Browse Teams
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyTeams;
