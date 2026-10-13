import { useState } from 'react';
import {
  Play,
  Lock,
  CheckCircle,
  Trash2,
  Users,
  AlertCircle,
  Loader,
  Eye,
  Settings
} from 'lucide-react';
import {
  publishTournament,
  closeRegistration,
  completeTournament,
  deleteTournament
} from '../services/tournamentService';

const TournamentManagementActions = ({ tournament, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handlePublish = async () => {
    if (!window.confirm('Publish this tournament? It will be visible to all users and registration will open.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await publishTournament(tournament.id);
      setSuccess('Tournament published successfully!');
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!window.confirm('Close registration for this tournament? No new participants can register after this.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await closeRegistration(tournament.id);
      setSuccess('Registration closed successfully!');
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close registration');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this tournament as completed? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await completeTournament(tournament.id);
      setSuccess('Tournament marked as completed!');
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmText = 'DELETE';
    const userInput = window.prompt(
      `Are you sure you want to delete "${tournament.name}"?\n\nThis action cannot be undone. Type "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteTournament(tournament.id);
      setSuccess('Tournament deleted successfully!');
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete tournament');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-700',
        icon: Settings,
        description: 'Tournament is not visible to public'
      },
      open: {
        label: 'Open',
        color: 'bg-primary-100 text-primary-600',
        icon: Play,
        description: 'Registration is open'
      },
      ongoing: {
        label: 'Ongoing',
        color: 'bg-blue-100 text-blue-700',
        icon: Play,
        description: 'Tournament in progress'
      },
      completed: {
        label: 'Completed',
        color: 'bg-purple-100 text-purple-700',
        icon: CheckCircle,
        description: 'Tournament finished'
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        description: 'Tournament cancelled'
      }
    };

    return statusConfig[status] || statusConfig.draft;
  };

  const statusInfo = getStatusInfo(tournament.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Tournament Management</h3>
          <p className="text-sm text-gray-600">Manage tournament status and settings</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.color}`}>
          <StatusIcon className="w-5 h-5" />
          <span className="font-bold">{statusInfo.label}</span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-primary-50 border-l-4 border-primary-500 text-primary-600 px-4 py-3 rounded-lg mb-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Status Flow */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Status Flow:</p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className={`px-3 py-1 rounded-lg font-semibold ${tournament.status === 'draft' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500'}`}>
            Draft
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-3 py-1 rounded-lg font-semibold ${tournament.status === 'open' ? 'bg-primary-200 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
            Open
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-3 py-1 rounded-lg font-semibold ${tournament.status === 'ongoing' ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
            Ongoing
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-3 py-1 rounded-lg font-semibold ${tournament.status === 'completed' ? 'bg-purple-200 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
            Completed
          </span>
        </div>
      </div>

      {/* Participant Count */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-blue-700 font-semibold">Registered Participants</p>
            <p className="text-2xl font-bold text-blue-900">
              {tournament.participant_count || 0} / {tournament.max_participants}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Publish Tournament (Draft → Open) */}
        {tournament.status === 'draft' && (
          <button
            onClick={handlePublish}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Publish Tournament
              </>
            )}
          </button>
        )}

        {/* Close Registration (Open → Ongoing) */}
        {tournament.status === 'open' && (
          <button
            onClick={handleCloseRegistration}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Closing...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Close Registration & Start Tournament
              </>
            )}
          </button>
        )}

        {/* Complete Tournament (Ongoing → Completed) */}
        {tournament.status === 'ongoing' && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Mark as Completed
              </>
            )}
          </button>
        )}

        {/* Delete Tournament (Only Draft) */}
        {tournament.status === 'draft' && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Delete Tournament
              </>
            )}
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>Publish tournament to make it visible and open registration</li>
              <li>Close registration when ready to start matches</li>
              <li>Complete tournament after all matches are finished</li>
              <li>Can only delete tournaments in draft status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentManagementActions;
