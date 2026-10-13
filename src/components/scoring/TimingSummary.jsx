import React from 'react';
import { Clock, Plus } from 'lucide-react';

/**
 * Timing Summary Component
 * Shows initial time, additional time, and total time for each phase
 */
const TimingSummary = ({ liveScore }) => {
  const timingSummary = liveScore?.timing_summary;
  
  if (!timingSummary) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) {
      return `${mins}:00`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes) => {
    return `${minutes} min`;
  };

  const PhaseRow = ({ label, phase, isActive }) => {
    const hasAdditionalTime = phase.additional_time > 0;
    const totalMinutes = Math.floor(phase.total_duration / 60);
    const totalSeconds = phase.total_duration % 60;
    const isOvertime = isActive && phase.remaining <= 0;
    
    return (
      <div className={`p-3 rounded-lg transition-all border ${
        isOvertime
          ? 'bg-red-50 border-red-500 border-2 animate-pulse'
        : isActive 
          ? 'bg-green-50 border-green-500 border-2' 
          : phase.completed 
            ? 'bg-gray-50 border-gray-300 opacity-75' 
            : 'bg-gray-50 border-gray-200'
      }`}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isOvertime ? 'text-red-600' : isActive ? 'text-green-600' : 'text-gray-500'}`} />
            <span className={`font-semibold ${isOvertime ? 'text-red-700' : isActive ? 'text-green-700' : 'text-gray-700'}`}>
              {label}
            </span>
            {isOvertime && (
              <span className="text-xs bg-red-200 text-white px-2 py-0.5 rounded-full animate-pulse">
                EXTRA TIME
              </span>
            )}
            {phase.completed && !isOvertime && (
              <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">
                Completed
              </span>
            )}
          </div>
          
          {/* Total Duration */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Total</div>
            <div className={`font-bold ${hasAdditionalTime ? 'text-green-600' : 'text-gray-700'}`}>
              {totalSeconds === 0 ? `${totalMinutes} min` : formatTime(phase.total_duration)}
            </div>
          </div>
        </div>
        
        {/* Details Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {/* Initial Duration */}
            <div className="text-left">
              <div className="text-xs text-gray-500">Initial</div>
              <div className="font-semibold text-gray-700">
                {formatMinutes(phase.initial_duration)}
              </div>
            </div>
            
            {/* Additional Time */}
            {hasAdditionalTime && (
              <>
                <Plus className="w-3 h-3 text-yellow-600" />
                <div className="text-left">
                  <div className="text-xs text-gray-500">Added</div>
                  <div className="font-semibold text-yellow-600">
                    {formatTime(phase.additional_time)}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Elapsed and Remaining */}
          <div className="flex items-center gap-3">
            {/* Elapsed Time */}
            <div className="text-right">
              <div className="text-xs text-gray-500">Elapsed</div>
              <div className={`font-semibold ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                {formatTime(phase.elapsed || 0)}
              </div>
            </div>
            
            {/* Remaining Time */}
            {/* {!phase.completed && (
              <div className="text-right">
                <div className="text-xs text-gray-500">Remaining</div>
                <div className={`font-semibold ${isOvertime ? 'text-red-600 font-bold' : isActive ? 'text-orange-600' : 'text-gray-600'}`}>
                  {formatTime(phase.remaining || 0)}
                </div>
              </div>
            )} */}
          </div>
        </div>
      </div>
    );
  };

  const currentHalf = liveScore?.current_half || 1;
  const isOnBreak = liveScore?.is_on_break || false;
  const isExtraTime = liveScore?.is_extra_time || false;
  const isPenaltyShootout = liveScore?.is_penalty_shootout || false;

  // ✅ DON'T show timing summary for extra time matches
  if (isExtraTime) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col max-h-[600px]">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 flex-shrink-0">
        <Clock className="w-5 h-5 text-gray-700" />
        Match Timing Summary
      </h3>
      
      <div className="space-y-3 overflow-y-auto flex-1 pr-2" style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}>
        {/* Regular Time Only */}
        <PhaseRow 
          label="1st Half" 
          phase={timingSummary.first_half}
          isActive={currentHalf === 1 && !isOnBreak && !isPenaltyShootout}
        />
        
        <PhaseRow 
          label="Break" 
          phase={timingSummary.break}
          isActive={isOnBreak && !isPenaltyShootout}
        />
        
        <PhaseRow 
          label="2nd Half" 
          phase={{
            ...timingSummary.second_half,
            completed: isPenaltyShootout ? true : timingSummary.second_half.completed
          }}
          isActive={currentHalf === 2 && !isOnBreak && !isPenaltyShootout}
        />
      </div>
    </div>
  );
};

export default TimingSummary;
