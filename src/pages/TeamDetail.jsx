import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchTeam,
  fetchTeamMembers,
  inviteUser,
  removeMember,
  leaveTeam,
  clearError,
  clearSuccess
} from '../store/slices/teamSlice';
import {
  ArrowLeft,
  Users,
  Trophy,
  Shield,
  UserPlus,
  UserMinus,
  Mail,
  CheckCircle,
  AlertCircle,
  Trash2,
  LogOut,
  Edit
} from 'lucide-react';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentTeam: team, teamMembers, loading, error, success } = useSelector((state) => state.team);
  const { user } = useSelector((state) => state.auth);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    dispatch(fetchTeam(id));
    dispatch(fetchTeamMembers(id));
  }, [dispatch, id]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSuccess());
    };
  }, [dispatch]);

  const isCaptain = () => {
    return user && team && team.captain_id === user.id;
  };

  const isCreator = () => {
    return user && team && team.creator_id === user.id;
  };

  const isMember = () => {
    return user && teamMembers?.some(m => m.user_id === user.id);
  };

  // Can manage team (invite, remove members, edit)
  const canManageTeam = () => {
    return isCaptain() || isCreator();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const result = await dispatch(inviteUser({ 
      teamId: id, 
      userData: { email: inviteEmail } 
    }));
    
    if (inviteUser.fulfilled.match(result)) {
      // Success case
      const successMessage = result.payload?.message || 'Invitation sent successfully!';
      toast.success(successMessage);
      setShowInviteModal(false);
      setInviteEmail('');
    } else if (inviteUser.rejected.match(result)) {
      // Error case
      let errorMessage = 'Failed to send invitation';
      
      if (result.payload) {
        // Check for different error formats
        if (result.payload.message) {
          errorMessage = result.payload.message;
        } else if (result.payload.error) {
          errorMessage = result.payload.error;
        } else if (typeof result.payload === 'string') {
          errorMessage = result.payload;
        }
      } else if (result.error) {
        errorMessage = result.error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      const result = await dispatch(removeMember({ teamId: id, memberId }));
      
      if (removeMember.fulfilled.match(result)) {
        toast.success('Member removed successfully');
        dispatch(fetchTeamMembers(id));
      } else if (removeMember.rejected.match(result)) {
        let errorMessage = 'Failed to remove member';
        
        if (result.payload) {
          if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.error) {
            errorMessage = result.payload.error;
          } else if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          }
        } else if (result.error) {
          errorMessage = result.error.message || errorMessage;
        }
        
        toast.error(errorMessage);
      }
    }
  };

  const handleLeaveTeam = async () => {
    const result = await dispatch(leaveTeam(id));
    
    if (leaveTeam.fulfilled.match(result)) {
      toast.success('You have left the team');
      setTimeout(() => {
        navigate('/teams');
      }, 1000);
    } else if (leaveTeam.rejected.match(result)) {
      let errorMessage = 'Failed to leave team';
      
      if (result.payload) {
        if (result.payload.message) {
          errorMessage = result.payload.message;
        } else if (result.payload.error) {
          errorMessage = result.payload.error;
        } else if (typeof result.payload === 'string') {
          errorMessage = result.payload;
        }
      } else if (result.error) {
        errorMessage = result.error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      setShowLeaveModal(false);
    }
  };

  if (loading && !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Not Found</h2>
          <button
            onClick={() => navigate('/teams')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teams')}
              className="p-2 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {team.name}
              </h1>
              <p className="text-sm text-gray-600">{team.sport_name}</p>
            </div>
          </div>
        </div>
      </header>

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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Team Information</h2>
                  <p className="text-sm text-gray-500">Complete details</p>
                </div>
              </div>

              {team.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{team.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.tournament_name && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Trophy className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Tournament</p>
                      <p className="text-sm font-semibold text-gray-900">{team.tournament_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Captain</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {team.captain_first_name} {team.captain_last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Team Size</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {team.member_count || 0} / {team.max_players} players
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
                    <p className="text-sm text-gray-500">{teamMembers?.length || 0} members</p>
                  </div>
                </div>
              </div>

              {teamMembers && teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {member.jersey_number || member.first_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {member.first_name} {member.last_name}
                            {member.user_id === team.captain_id && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Captain</span>
                            )}
                          </p>
                          {member.position && (
                            <p className="text-xs text-gray-500">{member.position}</p>
                          )}
                        </div>
                      </div>

                      {canManageTeam() && member.user_id !== team.captain_id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No members yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Action Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>

              {canManageTeam() && (
                <>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite Player
                  </button>

                  <button
                    onClick={() => navigate(`/teams/${id}/edit`)}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Team
                  </button>
                </>
              )}

              {isMember() && !isCaptain() && (
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  Leave Team
                </button>
              )}

              {isCreator() && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
                      // Handle delete
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Team
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Invite Player</h3>
              <p className="text-gray-600">Send an invitation to join your team</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Player Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="player@example.com"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Team Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Leave Team</h3>
              <p className="text-gray-600">Are you sure you want to leave this team?</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Leaving...' : 'Leave Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetail;
