import { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  Lock,
  CheckCircle,
  AlertCircle,
  Loader,
  Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as tournamentService from '../services/tournamentService';

const TournamentManagementPanel = ({ tournament, participants, onUpdate, userId, onViewMatches }) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // Calculate if user is organizer
  const isOrganizer = tournament.is_organizer || (userId && tournament.organizer_id === userId);
  const status = tournament.status;
  const participantCount = participants?.length || 0;
  const minParticipants = tournament.min_participants || 2;

  // Debug logging
  // console.log('TournamentManagementPanel - Tournament Status:', status);
  // console.log('TournamentManagementPanel - Is Organizer:', isOrganizer);
  // console.log('TournamentManagementPanel - User ID:', userId, 'Organizer ID:', tournament.organizer_id);

  const handlePublishTournament = async () => {
    if (!confirm('Publish this tournament and open it for registration?')) {
      return;
    }

    setActionLoading('publish');
    try {
      await tournamentService.publishTournament(tournament.id);
      toast.success('Tournament published successfully! Players can now register.');
      await onUpdate();
    } catch (error) {
      console.error('Publish tournament error:', error);
      toast.error(error.response?.data?.error || 'Failed to publish tournament');
    } finally {
      setActionLoading('');
    }
  };

  const handleCloseRegistration = async () => {
    if (participantCount < minParticipants) {
      const participantType = tournament.category === 'singles' ? 'players' :
                              tournament.category === 'doubles' ? 'pairs' :
                              tournament.category === 'teams' ? 'teams' :
                              'participants';
      toast.error(`Need at least ${minParticipants} ${participantType} to start tournament`);
      return;
    }

    if (!confirm('Close registration and prepare to start the tournament?')) {
      return;
    }

    setActionLoading('close');
    try {
      const result = await tournamentService.closeRegistration(tournament.id);
      
      toast.success('Registration closed successfully! Refreshing...');
      // Trigger parent to refresh data
      await onUpdate();
    } catch (error) {
      
      toast.error(error.response?.data?.error || 'Failed to close registration');
    } finally {
      setActionLoading('');
    }
  };

  if (!isOrganizer) {
    return null;
  }

  // Status indicators
  const getStatusInfo = () => {
    switch (status) {
      case 'draft':
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: 'Draft - Not published yet'
        };
      case 'open':
        return {
          icon: Users,
          color: 'text-primary-500',
          bg: 'bg-primary-100',
          text: 'Registration Open'
        };
      case 'closed':
        return {
          icon: Lock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          text: 'Registration Closed - Ready to start'
        };
      case 'ongoing':
        return {
          icon: Play,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          text: 'Tournament In Progress'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          text: 'Tournament Completed'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: status
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Tournament Management</h3>
              <p className="text-sm text-gray-500">Organizer Controls</p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 ${statusInfo.bg} rounded-lg`}>
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</span>
          </div>
        </div>

        {/* Participant Count */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Registered Participants</p>
              <p className="text-3xl font-bold text-gray-900">{participantCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Required Minimum</p>
              <p className="text-2xl font-bold text-gray-700">{minParticipants}</p>
            </div>
          </div>
          {tournament.max_participants && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Maximum Capacity</span>
                <span className="font-semibold text-gray-900">{tournament.max_participants}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((participantCount / tournament.max_participants) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions based on status */}
        <div className="space-y-3">
          {/* Draft Status - Publish Tournament */}
          {status === 'draft' && (
            <>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Tournament Not Published</p>
                    <p>Publish your tournament to make it visible and open for player registration.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePublishTournament}
                disabled={actionLoading === 'publish'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'publish' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Publish Tournament
                  </>
                )}
              </button>
            </>
          )}

          {/* Open Status - Close Registration */}
          {status === 'open' && (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Ready to start?</p>
                    <p>Close registration when you have enough participants. You can then assign draw positions and generate brackets.</p>
                  </div>
                </div>
              </div>

              {/* <button
                onClick={handleCloseRegistration}
                disabled={participantCount < minParticipants || actionLoading === 'close'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'close' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Close Registration
                  </>
                )}
              </button> */}

              {participantCount < minParticipants && (
                <p className="text-sm text-red-600 text-center">
                  Need {minParticipants - participantCount} more {
                    tournament.category === 'singles' ? 'player(s)' :
                    tournament.category === 'doubles' ? 'pair(s)' :
                    tournament.category === 'teams' ? 'team(s)' :
                    'participant(s)'
                  } to start
                </p>
              )}
            </>
          )}

          {/* Closed Status - Ready to Start */}
          {status === 'closed' && (
            <>
              <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-lg mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-primary-600">
                    <p className="font-semibold mb-1">Registration Closed - Ready to start!</p>
                    <p>Use the "Manage Tournament" button to assign draw positions and generate brackets.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Ongoing Status - View Matches */}
          {/* {status === 'ongoing' && (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                <div className="flex items-start gap-3">
                  <Play className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Tournament In Progress</p>
                    <p>Manage matches, enter scores, and track progress from the matches tab.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onViewMatches && onViewMatches()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                <Calendar className="w-5 h-5" />
                View Matches & Schedule
              </button>
            </>
          )} */}

          {/* Completed Status */}
          {status === 'completed' && (
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-semibold mb-1">Tournament Completed!</p>
                  <p>View final standings and results below.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TournamentManagementPanel;
