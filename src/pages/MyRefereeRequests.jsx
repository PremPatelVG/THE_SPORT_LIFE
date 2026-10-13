import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Award, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  User,
  Users,
  AlertCircle,
  Loader,
  Trophy
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { getRefereeRequests, respondToAssignment } from '../services/refereeService';
import { formatDate } from '../utils/dateFormatter';

const MyRefereeRequests = () => {
  const { user } = useSelector((state) => state.auth);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user?.id, activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'all' ? null : activeTab;
      const data = await getRefereeRequests(user.id, status);
      setRequests(data || []);
    } catch (error) {
      console.error('Failed to fetch referee requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      setResponding(requestId);
      await respondToAssignment(requestId, 'accepted');
      toast.success('Assignment accepted! Match added to your schedule.');
      fetchRequests();
    } catch (error) {
      console.error('Failed to accept assignment:', error);
      toast.error(error.response?.data?.error || 'Failed to accept assignment');
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async (requestId) => {
    try {
      setResponding(requestId);
      await respondToAssignment(requestId, 'declined', declineReason);
      toast.success('Assignment declined');
      setShowDeclineModal(null);
      setDeclineReason('');
      fetchRequests();
    } catch (error) {
      console.error('Failed to decline assignment:', error);
      toast.error(error.response?.data?.error || 'Failed to decline assignment');
    } finally {
      setResponding(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending' },
      accepted: { bg: 'bg-primary-100', text: 'text-primary-600', icon: CheckCircle, label: 'Accepted' },
      declined: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Declined' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle, label: 'Cancelled' }
    };

    const { bg, text, icon: Icon, label } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const acceptedCount = requests.filter(r => r.status === 'accepted').length;
  const declinedCount = requests.filter(r => r.status === 'declined').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50 to-cyan-50">
      <Navbar />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-2 shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                My Referee Requests
              </h1>
              <p className="text-sm text-gray-600">Manage your referee assignments</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Pending</span>
                {pendingCount > 0 && (
                  <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('accepted')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'accepted'
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Accepted</span>
                {acceptedCount > 0 && (
                  <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {acceptedCount}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('declined')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'declined'
                  ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>Declined</span>
                {declinedCount > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {declinedCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No {activeTab} Requests</h3>
            <p className="text-gray-600">
              {activeTab === 'pending'
                ? "You don't have any pending referee assignments"
                : `You haven't ${activeTab} any referee assignments yet`}
            </p>
          </div>
        ) : (
          /* Requests List - 3 Cards Per Row */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col"
              >
                {/* Tournament Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Trophy className="w-4 h-4 text-white flex-shrink-0" />
                      <h3 className="font-bold text-white text-sm truncate">{request.tournament_name}</h3>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="space-y-3 flex-1">
                    {/* Match Details */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Match Details</h4>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {request.category === 'teams' ? (
                            <Users className="w-5 h-5 text-blue-600" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Participants</p>
                          <p className="font-semibold text-gray-900">
                            {request.participant1_name || 'TBD'} vs {request.participant2_name || 'TBD'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Award className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Round</p>
                          <p className="font-semibold text-gray-900">Round {request.round_number}</p>
                        </div>
                      </div>

                      {request.match_date ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-primary-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Date & Time</p>
                              <p className="font-semibold text-gray-900">
                                {formatDate(request.match_date)} {request.match_time}
                              </p>
                            </div>
                          </div>

                          {request.venue_name && (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Venue</p>
                                <p className="font-semibold text-gray-900">
                                  {request.venue_name}
                                  {request.court_name && ` - ${request.court_name}`}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">
                              Match schedule not yet finalized
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Info */}
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span>Assigned by:</span>
                        <span className="font-semibold text-gray-900">{request.assigned_by_name}</span>
                      </div>
                      {request.assigned_at && (
                        <div className="text-right">
                          {new Date(request.assigned_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {request.decline_reason && (
                      <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                        <p className="text-xs text-red-800">
                          <span className="font-semibold">Reason:</span> {request.decline_reason}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {request.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={responding === request.id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {responding === request.id ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => setShowDeclineModal(request.id)}
                          disabled={responding === request.id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-600 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Decline Assignment</h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to decline this referee assignment?
              </p>
              
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Let the organizer know why you're declining..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none resize-none"
                rows="3"
              />
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeclineModal(null);
                  setDeclineReason('');
                }}
                className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecline(showDeclineModal)}
                disabled={responding === showDeclineModal}
                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {responding === showDeclineModal ? 'Declining...' : 'Decline Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRefereeRequests;
