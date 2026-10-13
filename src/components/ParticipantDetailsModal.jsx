import { useState } from 'react';
import { X, User, Users, Mail, Calendar, Trophy, Award, CheckCircle, Clock, Shield, Phone } from 'lucide-react';
import { getImageUrl, getUserInitials } from '../utils/imageUtils';
import PlayerProfileModal from './PlayerProfileModal';

const ParticipantDetailsModal = ({ participant, tournament, onClose }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  if (!participant) return null;

  // Debug: Log participant data
  // console.log('ParticipantDetailsModal - participant:', participant);
  // console.log('ParticipantDetailsModal - participant.players:', participant.players);
  // console.log('ParticipantDetailsModal - participant.participant_type:', participant.participant_type);

  // Helper to get participant name from different data structures
  const getParticipantName = () => {
    // Check all possible name fields
    if (participant.participant_name) return participant.participant_name;
    if (participant.team_name) return participant.team_name;
    if (participant.pair_name) return participant.pair_name;
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    return participant.first_name || participant.last_name || 'Unknown';
  };

  const getParticipantType = () => {
    // Check for pair data structure (player1_id and player2_id)
    if (participant.pair_id || (participant.player1_id && participant.player2_id)) return 'doubles';
    
    // Check participant_type field first (from API)
    if (participant.participant_type === 'team') return 'team';
    if (participant.participant_type === 'doubles') return 'doubles';
    if (participant.participant_type === 'singles') return 'singles';
    
    // Fallback to checking IDs
    if (participant.team_id) return 'team';
    if (participant.partnership_id) return 'doubles';
    
    return 'singles';
  };

  // Convert flattened pair data to players array format
  const getPairPlayers = () => {
    if (!participant.player1_id || !participant.player2_id) return [];
    
    return [
      {
        id: participant.player1_id,
        first_name: participant.player1_first_name,
        last_name: participant.player1_last_name,
        email: participant.player1_email,
        phone: participant.player1_phone,
        profile_image: participant.player1_image,
        skill_level: participant.player1_skill_level
      },
      {
        id: participant.player2_id,
        first_name: participant.player2_first_name,
        last_name: participant.player2_last_name,
        email: participant.player2_email,
        phone: participant.player2_phone,
        profile_image: participant.player2_image,
        skill_level: participant.player2_skill_level
      }
    ];
  };

  const type = getParticipantType();
  const participantName = getParticipantName();

  const getStatusBadge = () => {
    if (participant.status === 'confirmed' && participant.payment_status === 'paid') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-semibold text-primary-600">Confirmed & Paid</span>
        </div>
      );
    }
    if (participant.payment_status === 'pending') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Clock className="w-5 h-5 text-yellow-600" />
          <span className="text-sm font-semibold text-yellow-700">Payment Pending</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <User className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700 capitalize">{participant.status}</span>
      </div>
    );
  };

  const getTypeConfig = () => {
    const configs = {
      singles: {
        icon: User,
        color: 'from-blue-600 to-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        label: 'Singles Player'
      },
      doubles: {
        icon: Users,
        color: 'from-purple-600 to-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700',
        label: 'Doubles Partnership'
      },
      team: {
        icon: Users,
        color: 'from-primary-500 to-primary-600',
        bgColor: 'bg-primary-50',
        borderColor: 'border-primary-200',
        textColor: 'text-primary-600',
        label: 'Team'
      }
    };
    return configs[type] || configs.singles;
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.color} px-6 py-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 px-3 py-1 ${config.bgColor} ${config.borderColor} border rounded-full mb-2`}>
                <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {participantName}
              </h2>
              {participant.seed_number && (
                <div className="flex items-center gap-2 text-white/90">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">Seed #{participant.seed_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Status */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Registration Status</h3>
            {getStatusBadge()}
          </div>

          {/* Singles Player Details */}
          {type === 'singles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Player Information</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {/* Profile Picture */}
                  {participant.participant_image && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={getImageUrl(participant.participant_image)}
                        alt={participantName}
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-semibold text-gray-900">{participantName}</p>
                    </div>
                  </div>
                  
                  {participant.skill_level && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Skill Level</p>
                        <p className="font-semibold text-gray-900 capitalize">{participant.skill_level}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Registered On</p>
                      <p className="font-semibold text-gray-900">
                        {participant.registration_date ? new Date(participant.registration_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Details */}
          {type === 'team' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Information</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Team Name</p>
                      <p className="font-semibold text-gray-900">{participantName}</p>
                    </div>
                  </div>
                  
                  {participant.team_description && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Description</p>
                        <p className="font-semibold text-gray-900">{participant.team_description}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Registered On</p>
                      <p className="font-semibold text-gray-900">
                        {participant.registration_date ? new Date(participant.registration_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div> */}
                </div>
              </div>

              {/* Team Members */}
              {participant.members && participant.members.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Team Members ({participant.members.length})
                  </h3>
                  <div className="space-y-2">
                    {participant.members.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          if (member.user_id) {
                            setSelectedPlayerId(member.user_id);
                            setShowPlayerModal(true);
                          }
                        }}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                        title={member.user_id ? 'Click to view player profile' : 'Player not registered'}
                      >
                        {/* Member Avatar */}
                        <div className="relative w-10 h-10 flex-shrink-0">
                          {member.profile_image ? (
                            <img
                              src={getImageUrl(member.profile_image)}
                              alt={`${member.first_name} ${member.last_name}`}
                              className="w-10 h-10 rounded-full object-cover border-2 border-primary-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ display: member.profile_image ? 'none' : 'flex' }}
                          >
                            {getUserInitials(member.first_name, member.last_name)}
                          </div>
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            {member.is_captain === 1 && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">
                                Captain
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {member.position && member.position !== '0' && <span>• {member.position}</span>}
                            {member.jersey_number && member.jersey_number !== 0 && <span>• #{member.jersey_number}</span>}
                            {member.skill_level && member.skill_level !== '0' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                {member.skill_level}
                              </span>
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

          {/* Doubles Partnership Details */}
          {type === 'doubles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Partnership Information</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Partnership Name</p>
                      <p className="font-semibold text-gray-900">{participantName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Registered On</p>
                      <p className="font-semibold text-gray-900">
                        {(participant.registration_date || participant.locked_at) ? new Date(participant.registration_date || participant.locked_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              

              {/* Partnership Players */}
              {(() => {
                const pairPlayers = participant.players || getPairPlayers();
                return pairPlayers && pairPlayers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Players ({pairPlayers.length})
                    </h3>
                    <div className="space-y-2">
                      {pairPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        onClick={() => {
                          if (player.id) {
                            setSelectedPlayerId(player.id);
                            setShowPlayerModal(true);
                          }
                        }}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                        title={player.id ? 'Click to view player profile' : 'Player not registered'}
                      >
                        {/* Player Avatar */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {player.profile_image ? (
                            <img
                              src={getImageUrl(player.profile_image)}
                              alt={`${player.first_name} ${player.last_name}`}
                              className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ display: player.profile_image ? 'none' : 'flex' }}
                          >
                            {getUserInitials(player.first_name, player.last_name)}
                          </div>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">
                              {player.first_name} {player.last_name}
                            </p>
                            <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
                              Player {index + 1}
                            </span>
                          </div>
                          {player.skill_level && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Award className="w-3 h-3 text-blue-600" />
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium text-xs">
                                {player.skill_level}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })()}
            </div>
          )}

          

          {/* Payment Info */}
          {participant.payment_status && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Information</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{participant.payment_status}</p>
                  </div>
                  {tournament?.entry_fee > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="font-bold text-gray-900">₹{tournament.entry_fee}</p>
                    </div>
                  )}
                </div>
                {participant.payment_id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Payment ID</p>
                    <p className="font-mono text-sm text-gray-700">{participant.payment_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Player Profile Modal */}
      {showPlayerModal && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};

export default ParticipantDetailsModal;
