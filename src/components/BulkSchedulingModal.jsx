import { useState } from 'react';
import { X, Calendar, Clock, Zap, AlertCircle, Save, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

const BulkSchedulingModal = ({ matches = [], tournament = null, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    start_date: '',
    start_time: '09:00',
    match_duration: 60,
    break_duration: 15,
    matches_per_day: 8
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Safety check: ensure matches is an array
  const safeMatches = Array.isArray(matches) ? matches : [];
  
  // Debug: Log received matches
  // console.log('BulkSchedulingModal received matches:', matches);
  // console.log('Safe matches count:', safeMatches.length);
  
  // Get tournament venue
  const tournamentVenueId = tournament?.venue_id || null;
  const tournamentVenueName = tournament?.venue_name || null;

  const handleGenerate = () => {
    if (!formData.start_date || !formData.start_time) {
      toast.error('Please select start date and time');
      return;
    }

    // Debug: Log all matches to understand the data
    // console.log('All matches:', safeMatches);
    // console.log('Matches details:', safeMatches.map(m => ({
    //   id: m.id,
    //   match_number: m.match_number,
    //   match_date: m.match_date,
    //   participant1_id: m.participant1_id,
    //   participant2_id: m.participant2_id,
    //   participant1_name: m.participant1_name,
    //   participant2_name: m.participant2_name
    // })));

    // Filter matches that:
    // 1. Don't have a scheduled date/time yet (match_date is null or undefined)
    // 2. Have both participants (not placeholder matches with NULL participants)
    const unscheduledMatches = safeMatches.filter(m => {
      const hasNoDate = !m.match_date || m.match_date === null;
      const hasBothParticipants = m.participant1_id !== null && m.participant2_id !== null;
      return hasNoDate && hasBothParticipants;
    });
    
    // console.log('Filtered unscheduled matches:', unscheduledMatches.length);
    
    // Count matches with TBD participants for informative message
    const tbdMatches = safeMatches.filter(m => 
      (!m.match_date || m.match_date === null) && 
      (m.participant1_id === null || m.participant2_id === null)
    );
    
    if (unscheduledMatches.length === 0) {
      if (tbdMatches.length > 0) {
        toast.error(`No matches ready to schedule. ${tbdMatches.length} match(es) have TBD participants and will be available after earlier rounds complete.`);
      } else {
        toast.error('All matches are already scheduled!');
      }
      return;
    }
    
    // Show info if some matches are being skipped
    if (tbdMatches.length > 0) {
      toast(`Scheduling ${unscheduledMatches.length} match(es). ${tbdMatches.length} match(es) with TBD participants will be skipped.`, {
        duration: 4000,
        icon: 'ℹ️'
      });
    }

    const schedule = [];
    let currentDate = new Date(`${formData.start_date}T${formData.start_time}`);
    let matchesScheduledToday = 0;

    unscheduledMatches.forEach((match, index) => {
      // Move to next day if we've hit the daily limit
      if (matchesScheduledToday >= formData.matches_per_day) {
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(formData.start_time.split(':')[0]);
        currentDate.setMinutes(formData.start_time.split(':')[1]);
        matchesScheduledToday = 0;
      }

      schedule.push({
        match_id: match.id,
        match_number: match.match_number || match.id,
        participant1_name: match.participant1_name || 'TBD',
        participant2_name: match.participant2_name || 'TBD',
        round_name: match.round_name || `Round ${match.round_number}`,
        match_date: new Date(currentDate),
        venue_id: tournamentVenueId,
        venue_name: tournamentVenueName,
        duration: formData.match_duration
      });

      // Add match duration + break time
      currentDate = new Date(currentDate.getTime() + (formData.match_duration + formData.break_duration) * 60000);
      matchesScheduledToday++;
    });

    setPreview(schedule);
    setShowPreview(true);
  };

  const handleSaveAll = async () => {
    if (preview.length === 0) {
      toast.error('Please generate schedule first');
      return;
    }

    setLoading(true);
    try {
      const scheduleData = preview.map(item => {
        // Extract date and time separately
        const matchDate = item.match_date;
        const dateStr = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = matchDate.toTimeString().split(' ')[0]; // HH:MM:SS
        
        return {
          match_id: item.match_id,
          match_date: dateStr,
          match_time: timeStr,
          venue_id: item.venue_id,
          estimated_duration: item.duration,
          status: 'scheduled'
        };
      });

      await onSave(scheduleData);
      toast.success(`${preview.length} matches scheduled successfully!`);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to schedule matches');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupByDate = (schedule) => {
    const grouped = {};
    schedule.forEach(item => {
      const dateKey = item.match_date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  };

  // Count matches that can be scheduled (have both participants and no date)
  const unscheduledCount = safeMatches.filter(m => {
    const hasNoDate = !m.match_date || m.match_date === null;
    const hasBothParticipants = m.participant1_id !== null && m.participant2_id !== null;
    const result = hasNoDate && hasBothParticipants;
    
    // Debug each match
    // console.log(`Match ${m.id}:`, {
    //   match_date: m.match_date,
    //   hasNoDate,
    //   participant1_id: m.participant1_id,
    //   participant2_id: m.participant2_id,
    //   hasBothParticipants,
    //   willSchedule: result
    // });
    
    return result;
  }).length;
  
  // Count TBD matches for display
  const tbdCount = safeMatches.filter(m => 
    (!m.match_date || m.match_date === null) && 
    (m.participant1_id === null || m.participant2_id === null)
  ).length;
  
  // console.log('Unscheduled count:', unscheduledCount, 'TBD count:', tbdCount, 'Total matches:', safeMatches.length);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Bulk Schedule Matches</h2>
              <p className="text-white/90 text-sm">
                {unscheduledCount} ready to schedule
                {tbdCount > 0 && ` • ${tbdCount} with TBD participants`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!showPreview ? (
            <>
              {/* Debug Info - Remove after testing */}
              {safeMatches.length === 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">⚠️ No Matches Received</p>
                      <p>The modal received 0 matches. Check browser console for details.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Configuration Form */}
              <div className="space-y-6">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Auto-Schedule All Matches</p>
                      <p>Configure the parameters below and the system will automatically schedule all unscheduled matches.</p>
                    </div>
                  </div>
                </div>

                {/* Start Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Duration Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Match Duration (minutes)
                    </label>
                    <select
                      value={formData.match_duration}
                      onChange={(e) => setFormData({ ...formData, match_duration: Number(e.target.value) })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">120 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Break Between Matches (minutes)
                    </label>
                    <select
                      value={formData.break_duration}
                      onChange={(e) => setFormData({ ...formData, break_duration: Number(e.target.value) })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    >
                      <option value="0">No break</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                    </select>
                  </div>
                </div>

                {/* Matches Per Day */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Matches Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.matches_per_day}
                    onChange={(e) => setFormData({ ...formData, matches_per_day: Math.max(1, Math.min(50, Number(e.target.value))) })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="Enter number of matches (1-50)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of matches to schedule per day (1-50)
                  </p>
                </div>

                {/* Tournament Venue Info */}
                {tournamentVenueName && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                    <p className="text-sm text-purple-800">
                      <span className="font-semibold">📍 Venue:</span> {tournamentVenueName}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      All matches will be scheduled at the tournament venue
                    </p>
                  </div>
                )}

                {/* Commented out - Multiple Venues Selection */}
                {/* 
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Venues (optional - select multiple)
                  </label>
                  <div className="border-2 border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {safeVenues.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">No venues available</p>
                    ) : (
                      <div className="space-y-2">
                        {safeVenues.map(venue => (
                          <label key={venue.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.venue_ids.includes(venue.id.toString())}
                              onChange={(e) => {
                                const venueId = venue.id.toString();
                                if (e.target.checked) {
                                  setFormData({ ...formData, venue_ids: [...formData.venue_ids, venueId] });
                                } else {
                                  setFormData({ ...formData, venue_ids: formData.venue_ids.filter(id => id !== venueId) });
                                }
                              }}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{venue.name}</p>
                              <p className="text-xs text-gray-500">{venue.address}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.venue_ids.length > 0 
                      ? `${formData.venue_ids.length} venue${formData.venue_ids.length > 1 ? 's' : ''} selected - matches will be distributed across them`
                      : 'No venues selected - matches will have no venue assigned'}
                  </p>
                </div>
                */}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  Generate Schedule
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Schedule Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    ← Back to Edit
                  </button>
                </div>

                <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                  <p className="text-sm text-primary-600">
                    <span className="font-semibold">{preview.length} matches</span> will be scheduled over{' '}
                    <span className="font-semibold">{Object.keys(groupByDate(preview)).length} days</span>
                  </p>
                  {tournamentVenueName && (
                    <p className="text-sm text-primary-600 mt-2">
                      📍 All matches at <span className="font-semibold">{tournamentVenueName}</span>
                    </p>
                  )}
                </div>

                {/* Schedule by Date */}
                <div className="space-y-4">
                  {Object.entries(groupByDate(preview)).map(([date, dayMatches]) => (
                    <div key={date} className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-bold text-gray-900 mb-3">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                      <div className="space-y-2">
                        {dayMatches.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  Match #{item.match_number} • {item.round_name}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {item.participant1_name} vs {item.participant2_name}
                                </p>
                                {item.venue_name && (
                                  <p className="text-xs text-purple-600 mt-1 font-medium">
                                    📍 {item.venue_name}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-purple-600">
                                  {item.match_date.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                                <p className="text-xs text-gray-500">{item.duration} min</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-all"
          >
            Cancel
          </button>
          {showPreview && (
            <button
              onClick={handleSaveAll}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Confirm & Schedule All
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkSchedulingModal;
