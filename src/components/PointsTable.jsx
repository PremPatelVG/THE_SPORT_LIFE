import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';
import apiClient from '../config/api';

/**
 * PointsTable Component
 * Displays comprehensive tournament standings with enhanced statistics
 * 
 * Features:
 * - Goals for/against, goal difference
 * - Clean sheets, averages
 * - Win/loss/draw percentages
 * - Form guide (last 5 matches)
 * - Winning/losing streaks
 * 
 * @param {number} tournamentId - Tournament ID
 * @param {number} groupId - Optional group ID for filtering
 * @param {boolean} showAdvanced - Show advanced statistics (default: true)
 * @param {string} sportType - Sport type for column customization
 */
const PointsTable = ({ 
  tournamentId, 
  groupId = null, 
  showAdvanced = true,
  sportType = null // Will be auto-detected if not provided
}) => {
  const [pointsTable, setPointsTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectedSportType, setDetectedSportType] = useState(sportType || 'football');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [tournamentWinner, setTournamentWinner] = useState(null);

  useEffect(() => {
    fetchPointsTable();
  }, [tournamentId, groupId]);

  const fetchPointsTable = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tournament details to get sport type and winner
      try {
        const tournamentResponse = await apiClient.get(`/tournaments/${tournamentId}`);
        if (tournamentResponse.data.success) {
          const tournamentData = tournamentResponse.data.data;
          
          // Set sport type if not provided
          if (!sportType && tournamentData.sport_name) {
            const sport = tournamentData.sport_name.toLowerCase();
            setDetectedSportType(sport);
          }
          
          // Set tournament winner if exists
          if (tournamentData.winner_participant_id) {
            setTournamentWinner(tournamentData.winner_participant_id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch tournament details, defaulting to football');
      }

      const url = groupId 
        ? `/tournaments/${tournamentId}/points-table?group_id=${groupId}`
        : `/tournaments/${tournamentId}/points-table`;

      const response = await apiClient.get(url);

      if (response.data.success) {
        setPointsTable(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching points table:', err);
      setError('Failed to load points table');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage(null);
      setError(null);

      // Recalculate positions with latest tiebreaker rules
      const recalcResponse = await apiClient.post(`/tournaments/${tournamentId}/recalculate-positions`);
      
      if (recalcResponse.data.success) {
        setRefreshMessage({
          type: 'success',
          text: '✅ Standings refreshed successfully with latest tiebreaker rules!'
        });
        
        // Fetch updated standings
        await fetchPointsTable();
        
        // Clear success message after 3 seconds
        setTimeout(() => setRefreshMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error refreshing standings:', err);
      
      if (err.response?.status === 403) {
        setRefreshMessage({
          type: 'error',
          text: '⚠️ Only tournament organizer can manually refresh standings'
        });
      } else {
        setRefreshMessage({
          type: 'error',
          text: '❌ Failed to refresh standings. Please try again.'
        });
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  // Get form indicator styling
  const getFormIndicator = (result) => {
    switch (result) {
      case 'W': return 'bg-green-500 text-white';
      case 'L': return 'bg-red-500 text-white';
      case 'D': return 'bg-gray-400 text-white';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  // Get column labels based on sport type
  const getGoalsLabel = () => {
    switch (detectedSportType) {
      case 'tennis':
      case 'badminton':
      case 'table_tennis':
      case 'squash':
        return { for: 'SF', against: 'SA', diff: 'SD', tooltip: 'Sets' }; // Sets
      case 'volleyball':
        return { for: 'SW', against: 'SL', diff: 'SR', tooltip: 'Sets', useRatio: true }; // Sets (volleyball uses ratio)
      case 'basketball':
        return { for: 'PF', against: 'PA', diff: 'PD', tooltip: 'Points' }; // Points
      default:
        return { for: 'GF', against: 'GA', diff: 'GD', tooltip: 'Goals' }; // Goals
    }
  };

  const labels = getGoalsLabel();
  const isVolleyball = detectedSportType === 'volleyball';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!pointsTable || pointsTable.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        No standings data available yet
      </div>
    );
  }

  // Check if data is grouped (groups_knockout format)
  const isGroupedData = pointsTable[0]?.group && pointsTable[0]?.standings;

  // Render helper for table rows
  const renderStandingsRow = (row, index, qualifiersCount = 2) => (
    <tr 
      key={row.participant.id}
      className={`
        hover:bg-gray-50 transition-colors
        ${row.isEliminated ? 'opacity-50' : ''}
        ${row.isQualified || index < qualifiersCount ? 'bg-green-50' : ''}
      `}
    >
      {/* Position */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className={`
            font-bold text-sm
            ${row.isQualified || index < qualifiersCount ? 'text-green-600' : 'text-gray-700'}
          `}>
            {row.position}
          </span>
          {(row.isQualified || index < qualifiersCount) && (
            <span className="ml-2 text-green-600">●</span>
          )}
        </div>
      </td>

      {/* Team/Player Name */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {row.participant.image && (
            <img
              src={row.participant.image}
              alt={row.participant.name}
              className="h-8 w-8 rounded-full mr-3 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="flex items-center gap-2">
            <div>
              {/* <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {row.participant.name}
                {tournamentWinner && (
                  tournamentWinner === row.participant.id || 
                  String(tournamentWinner) === String(row.participant.id)
                ) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-md" title="Tournament Winner">
                    <Trophy className="w-3 h-3" />
                    Winner
                  </span>
                )}
              </div> */}
              {row.isEliminated && (
                <div className="text-xs text-red-500">Eliminated</div>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Played */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-700">
        {row.stats.played}
      </td>

      {/* Won */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium text-green-600">
        {row.stats.won}
      </td>

      {/* Drawn (hide for volleyball) */}
      {!isVolleyball && (
        <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600">
          {row.stats.drawn}
        </td>
      )}

      {/* Lost */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium text-red-600">
        {row.stats.lost}
      </td>

      {/* For (Goals/Sets) */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-700">
        {isVolleyball ? (row.stats.setsWon || 0) : row.stats.goalsFor}
      </td>

      {/* Against (Goals/Sets) */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-700">
        {isVolleyball ? (row.stats.setsLost || 0) : row.stats.goalsAgainst}
      </td>

      {/* Difference/Ratio */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
        {isVolleyball ? (
          <span className="text-blue-600">
            {row.stats.setRatio || '0.00'}
          </span>
        ) : (
          <span className={
            row.stats.goalDifference > 0 
              ? 'text-green-600' 
              : row.stats.goalDifference < 0 
              ? 'text-red-600' 
              : 'text-gray-600'
          }>
            {row.stats.goalDifference > 0 ? '+' : ''}{row.stats.goalDifference}
          </span>
        )}
      </td>

      {/* Points */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">
        {row.stats.points}
      </td>

      {/* Form (Last 5) */}
      {showAdvanced && (
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex justify-center space-x-1">
            {row.advanced.form.split('').map((result, i) => (
              <span
                key={i}
                className={`
                  inline-flex items-center justify-center
                  w-6 h-6 rounded-full text-xs font-bold
                  ${getFormIndicator(result)}
                `}
              >
                {result}
              </span>
            ))}
          </div>
        </td>
      )}
    </tr>
  );

  // Render helper for table header
  const renderTableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Pos
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Team/Player
        </th>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Played">
          P
        </th>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Won">
          W
        </th>
        {!isVolleyball && (
          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Drawn">
            D
          </th>
        )}
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Lost">
          L
        </th>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help" title={isVolleyball ? "Sets Won" : labels.tooltip === 'Sets' ? 'Sets For' : labels.tooltip === 'Points' ? 'Points For' : 'Goals For'}>
          {labels.for}
        </th>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help" title={isVolleyball ? "Sets Lost" : labels.tooltip === 'Sets' ? 'Sets Against' : labels.tooltip === 'Points' ? 'Points Against' : 'Goals Against'}>
          {labels.against}
        </th>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help" title={isVolleyball ? "Set Ratio" : labels.tooltip === 'Sets' ? 'Set Difference' : labels.tooltip === 'Points' ? 'Point Difference' : 'Goal Difference'}>
          {labels.diff}
        </th>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Points">
          Pts
        </th>
        {showAdvanced && (
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Form (Last 5 matches: W=Win, L=Loss, D=Draw)">
            Form
          </th>
        )}
      </tr>
    </thead>
  );

  // Render grouped standings (for groups_knockout format)
  if (isGroupedData) {
    return (
      <div className="space-y-6">
        {/* Refresh Button and Messages */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
              transition-all duration-200 shadow-sm
              ${refreshing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Standings'}
          </button>

          {refreshMessage && (
            <div className={`
              flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
              ${refreshMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
              }
            `}>
              {refreshMessage.text}
            </div>
          )}
        </div>

        {pointsTable.map((groupData, groupIndex) => (
          <div key={groupData.group.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Group Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">{groupData.group.name}</h2>
              <p className="text-blue-100 text-sm mt-1">
                Top {groupData.qualifiersPerGroup} qualify for knockout stage
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {renderTableHeader()}
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupData.standings.map((row, index) => 
                    renderStandingsRow(row, index, groupData.qualifiersPerGroup)
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            {showAdvanced && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      <span>Qualification spots (Top {groupData.qualifiersPerGroup})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">P</span> = Played, 
                    <span className="font-medium ml-2">W</span> = Won, 
                    <span className="font-medium ml-2">D</span> = Drawn, 
                    <span className="font-medium ml-2">L</span> = Lost, 
                    <span className="font-medium ml-2">Pts</span> = Points
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Render regular standings (for league, knockout, etc.)
  return (
    <div className="space-y-4">
      {/* Refresh Button and Messages */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className={`
            inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
            transition-all duration-200 shadow-sm
            ${refreshing 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
            }
          `}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Standings'}
        </button>

        {refreshMessage && (
          <div className={`
            flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
            ${refreshMessage.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
            }
          `}>
            {refreshMessage.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Points Table</h2>
          {groupId && pointsTable[0]?.group && (
            <p className="text-blue-100 text-sm mt-1">{pointsTable[0].group.name}</p>
          )}
        </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {renderTableHeader()}
          <tbody className="bg-white divide-y divide-gray-200">
            {pointsTable.map((row, index) => renderStandingsRow(row, index))}
          </tbody>
        </table>
      </div>

      {/* Advanced Statistics Panel (Optional) */}
      {showAdvanced && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>Qualification spots</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium">P</span> = Played, 
              <span className="font-medium ml-2">W</span> = Won, 
              <span className="font-medium ml-2">D</span> = Drawn, 
              <span className="font-medium ml-2">L</span> = Lost, 
              <span className="font-medium ml-2">Pts</span> = Points
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PointsTable;
