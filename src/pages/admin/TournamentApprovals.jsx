import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Eye,
  Clock
} from 'lucide-react';
import adminApi from '../../config/adminApi';

const TournamentApprovals = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/tournaments/pending');
      setTournaments(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tournamentId) => {
    if (!window.confirm('Are you sure you want to approve this tournament?')) {
      return;
    }

    try {
      setProcessing(tournamentId);
      await adminApi.post(`/tournaments/${tournamentId}/approve`);
      alert('Tournament approved successfully!');
      fetchPendingApprovals();
    } catch (err) {
      console.error('Failed to approve tournament:', err);
      alert(err.response?.data?.error || 'Failed to approve tournament');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (tournamentId) => {
    const reason = prompt('Enter rejection reason (optional):');
    
    if (reason === null) return; // User cancelled

    try {
      setProcessing(tournamentId);
      await adminApi.post(`/tournaments/${tournamentId}/reject`, { reason });
      alert('Tournament rejected');
      fetchPendingApprovals();
    } catch (err) {
      console.error('Failed to reject tournament:', err);
      alert(err.response?.data?.error || 'Failed to reject tournament');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">All Caught Up!</h3>
        <p className="text-sm text-gray-600">No pending tournament approvals at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pending Badge */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4" />
          <span className="font-semibold text-sm">{tournaments.length} Pending</span>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-3">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 line-clamp-1">{tournament.name}</h3>
                <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-semibold rounded-full">
                  Pending Approval
                </span>
              </div>

              {/* Tournament Details - Compact */}
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Trophy className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-600">Sport:</span>
                  <span className="font-medium text-gray-900 truncate">{tournament.sport_name}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <Calendar className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(tournament.start_date)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                  <span className="text-gray-600">Venue:</span>
                  <span className="font-medium text-gray-900 truncate flex-1">{tournament.venue_name}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <Users className="w-3 h-3 text-purple-600 flex-shrink-0" />
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-gray-900 capitalize">{tournament.category}</span>
                </div>
              </div>

              {/* Organizer Info */}
              <div className="bg-gray-50 rounded-lg p-2 mb-2">
                <p className="text-[9px] text-gray-600 mb-0.5">Organizer</p>
                <p className="font-semibold text-gray-900 text-[10px] truncate">
                  {tournament.organizer_first_name} {tournament.organizer_last_name}
                </p>
                <p className="text-[9px] text-gray-600 truncate">{tournament.organizer_email}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={() => navigate(`/admin/tournaments/${tournament.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Full Details
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleApprove(tournament.id)}
                    disabled={processing === tournament.id}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {processing === tournament.id ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>

                  <button
                    onClick={() => handleReject(tournament.id)}
                    disabled={processing === tournament.id}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentApprovals;
