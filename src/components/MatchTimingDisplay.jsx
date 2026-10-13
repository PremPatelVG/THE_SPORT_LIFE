import { useState, useEffect } from 'react';
import { Clock, Trophy, Calendar, Timer } from 'lucide-react';
import { getMatchTimingSummary } from '../services/matchTimingService';

/**
 * Match Timing Display Component
 * Shows match timing breakdown with segments
 */
const MatchTimingDisplay = ({ matchId }) => {
  const [timingData, setTimingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTimingData();
  }, [matchId]);

  const fetchTimingData = async () => {
    try {
      setLoading(true);
      const response = await getMatchTimingSummary(matchId);
      setTimingData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching timing data:', err);
      setError('Timing data not available');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSegmentLabel = (segment) => {
    const typeLabels = {
      'set': 'Set',
      'game': 'Game',
      'half': 'Half',
      'period': 'Period',
      'quarter': 'Quarter'
    };
    return `${typeLabels[segment.segment_type] || segment.segment_type} ${segment.segment_number}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading timing data...</span>
        </div>
      </div>
    );
  }

  if (error || !timingData) {
    return null; // Don't show anything if timing data is not available
  }

  // Don't show if match hasn't started yet
  if (!timingData.actual_start_time) {
    return null;
  }

  // ✅ NEW: Only show if match is completed
  if (timingData.status !== 'completed') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Match Timing
      </h3>

      {/* Overall Match Timing */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          {/* Start Time */}
          <div>
            <p className="text-gray-500 text-sm mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Start Time
            </p>
            <p className="font-semibold text-gray-900">
              {formatTime(timingData.actual_start_time)}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(timingData.actual_start_time)}
            </p>
          </div>

          {/* End Time */}
          <div>
            <p className="text-gray-500 text-sm mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              End Time
            </p>
            <p className="font-semibold text-gray-900">
              {timingData.actual_end_time ? formatTime(timingData.actual_end_time) : 'In Progress'}
            </p>
            {timingData.actual_end_time && (
              <p className="text-xs text-gray-500">
                {formatDate(timingData.actual_end_time)}
              </p>
            )}
          </div>

          {/* Total Duration */}
          <div>
            <p className="text-gray-500 text-sm mb-1 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Total Duration
            </p>
            <p className="font-bold text-blue-600 text-xl">
              {timingData.total_duration_formatted || 'In Progress'}
            </p>
            {timingData.total_duration_seconds && (
              <p className="text-xs text-gray-500">
                {Math.floor(timingData.total_duration_seconds / 60)} minutes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Segment Breakdown */}
      {timingData.segments && timingData.segments.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-600" />
            Segment Breakdown
          </h4>
          
          <div className="space-y-2">
            {timingData.segments.map((segment, index) => (
              <div 
                key={segment.id || index} 
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-200"
              >
                {/* Segment Info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-gray-200 text-gray-700 text-sm">
                    {segment.segment_number}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {getSegmentLabel(segment)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(segment.start_time)}
                      {segment.end_time && ` - ${formatTime(segment.end_time)}`}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {segment.duration_formatted || '--:--'}
                  </p>
                  {segment.additional_time_seconds > 0 && (
                    <p className="text-xs text-orange-600 font-semibold">
                      +{Math.floor(segment.additional_time_seconds / 60)}' injury time
                    </p>
                  )}
                  {segment.status === 'completed' && segment.duration_seconds && (
                    <p className="text-xs text-gray-500">
                      {Math.floor(segment.duration_seconds / 60)} min {segment.duration_seconds % 60} sec
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          {timingData.segments.length > 1 && timingData.status === 'completed' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Total Segments</p>
                  <p className="font-semibold text-gray-900">{timingData.segments.length}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Avg Duration</p>
                  <p className="font-semibold text-gray-900">
                    {(() => {
                      // Include all segments with duration (completed or in_progress)
                      const segmentsWithDuration = timingData.segments.filter(s => s.duration_seconds);
                      if (segmentsWithDuration.length === 0) return 'N/A';
                      const avgSeconds = segmentsWithDuration.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0) / segmentsWithDuration.length;
                      const avgHours = Math.floor(avgSeconds / 3600);
                      const avgMinutes = Math.floor((avgSeconds % 3600) / 60);
                      const avgSecs = Math.floor(avgSeconds % 60);
                      if (avgHours > 0) {
                        return `${avgHours}:${avgMinutes.toString().padStart(2, '0')}:${avgSecs.toString().padStart(2, '0')}`;
                      }
                      return `${avgMinutes}:${avgSecs.toString().padStart(2, '0')}`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Longest</p>
                  <p className="font-semibold text-gray-900">
                    {(() => {
                      // Include all segments with duration (completed or in_progress)
                      const segmentsWithDuration = timingData.segments.filter(s => s.duration_seconds);
                      
                      if (segmentsWithDuration.length === 0) return 'N/A';
                      
                      const longest = Math.max(...segmentsWithDuration.map(s => Number(s.duration_seconds) || 0));
                      const hours = Math.floor(longest / 3600);
                      const minutes = Math.floor((longest % 3600) / 60);
                      const seconds = longest % 60;
                      
                      if (hours > 0) {
                        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                      }
                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchTimingDisplay;
