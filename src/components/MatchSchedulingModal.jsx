import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Clock, Save, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MatchSchedulingModal = ({ match, venues, referees, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    match_date: '',
    match_time: '',
    venue_id: '',
    court_id: '',
    referee_id: '',
    duration: 60
  });
  const [loading, setLoading] = useState(false);
  const [availableCourts, setAvailableCourts] = useState([]);

  useEffect(() => {
    if (match) {
      // Pre-fill form if match has existing data
      const matchDate = match.match_date ? new Date(match.match_date) : null;
      setFormData({
        match_date: matchDate ? matchDate.toISOString().split('T')[0] : '',
        match_time: matchDate ? matchDate.toTimeString().slice(0, 5) : '',
        venue_id: match.venue_id || '',
        court_id: match.court_id || '',
        referee_id: match.referee_id || '',
        duration: match.duration || 60
      });
    }
  }, [match]);

  useEffect(() => {
    // Load courts when venue is selected
    if (formData.venue_id && venues) {
      const selectedVenue = venues.find(v => v.id === Number(formData.venue_id));
      setAvailableCourts(selectedVenue?.courts || []);
    } else {
      setAvailableCourts([]);
    }
  }, [formData.venue_id, venues]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.match_date || !formData.match_time) {
      toast.error('Please select date and time');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const matchDateTime = new Date(`${formData.match_date}T${formData.match_time}`);

      const scheduleData = {
        match_date: matchDateTime.toISOString(),
        venue_id: formData.venue_id || null,
        court_id: formData.court_id || null,
        referee_id: formData.referee_id || null,
        duration: Number(formData.duration),
        status: 'scheduled'
      };

      await onSave(match.id, scheduleData);
      toast.success('Match scheduled successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to schedule match');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!match) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Schedule Match</h2>
              <p className="text-white/90 text-sm">
                Match #{match.match_number || match.id} • {match.round_name || `Round ${match.round_number}`}
              </p>
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold">Participants</p>
              <p className="text-blue-900 font-bold">
                {match.participant1_name || 'TBD'} vs {match.participant2_name || 'TBD'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          <div className="space-y-6">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Match Date *
                </label>
                <input
                  type="date"
                  value={formData.match_date}
                  onChange={(e) => handleChange('match_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Match Time *
                </label>
                <input
                  type="time"
                  value={formData.match_time}
                  onChange={(e) => handleChange('match_time', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Estimated Duration (minutes)
              </label>
              <select
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Venue
              </label>
              <select
                value={formData.venue_id}
                onChange={(e) => handleChange('venue_id', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select venue (optional)</option>
                {venues && venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} - {venue.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Court */}
            {availableCourts.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Court / Field
                </label>
                <select
                  value={formData.court_id}
                  onChange={(e) => handleChange('court_id', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select court (optional)</option>
                  {availableCourts.map(court => (
                    <option key={court.id} value={court.id}>
                      {court.name} - {court.surface_type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Referee */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Referee
              </label>
              <select
                value={formData.referee_id}
                onChange={(e) => handleChange('referee_id', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select referee (optional)</option>
                {referees && referees.map(referee => (
                  <option key={referee.id} value={referee.id}>
                    {referee.first_name} {referee.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Scheduling Tips</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Allow buffer time between matches</li>
                    <li>Consider participant availability</li>
                    <li>Venue and referee are optional but recommended</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchSchedulingModal;
