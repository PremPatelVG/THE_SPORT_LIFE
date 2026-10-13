import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, Award } from 'lucide-react';
import PointsTable from '../components/PointsTable';
import StandingsStatsCard from '../components/StandingsStatsCard';
import Navbar from '../components/Navbar';

/**
 * TournamentStandings Page
 * 
 * NEW STANDALONE PAGE - Does not affect existing tournament pages
 * 
 * Displays comprehensive tournament standings with:
 * - Points table with all statistics
 * - Detailed participant statistics
 * - Group filtering (for groups + knockout format)
 * 
 * Usage:
 * - Route: /tournaments/:id/standings
 * - This is a NEW page, existing pages unchanged
 */
const TournamentStandings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-primary-50">
      {/* Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/tournaments/${id}`)}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tournament
        </button>

        {/* Page Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Tournament Standings</h1>
              <p className="mt-2 text-base text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Comprehensive points table with detailed statistics
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Points Table */}
          <div className="lg:col-span-2">
            <PointsTable 
              tournamentId={id}
              groupId={selectedGroup}
              showAdvanced={true}
            />
          </div>

          {/* Sidebar - Instructions or Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Points Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  About Points Table
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-blue-600 mr-3 min-w-[2rem]">P:</span>
                  <span className="text-gray-700">Matches Played</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-green-600 mr-3 min-w-[2rem]">W:</span>
                  <span className="text-gray-700">Matches Won</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-gray-600 mr-3 min-w-[2rem]">D:</span>
                  <span className="text-gray-700">Matches Drawn</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-red-600 mr-3 min-w-[2rem]">L:</span>
                  <span className="text-gray-700">Matches Lost</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-primary-500 mr-3 min-w-[2rem]">GF:</span>
                  <span className="text-gray-700">Goals For</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-orange-600 mr-3 min-w-[2rem]">GA:</span>
                  <span className="text-gray-700">Goals Against</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-purple-600 mr-3 min-w-[2rem]">GD:</span>
                  <span className="text-gray-700">Goal Difference</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-yellow-600 mr-3 min-w-[2rem]">Pts:</span>
                  <span className="text-gray-700">Points (3 for win, 1 for draw)</span>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-indigo-600 mr-3 min-w-[2rem]">Form:</span>
                  <span className="text-gray-700">Last 5 matches (W/L/D)</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Table Legend
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="w-4 h-4 bg-green-500 rounded-full mr-3 flex-shrink-0"></span>
                  <span className="text-gray-700 font-medium">Qualification spots</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                    W
                  </span>
                  <span className="text-gray-700">Win</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="w-7 h-7 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                    D
                  </span>
                  <span className="text-gray-700">Draw</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                    L
                  </span>
                  <span className="text-gray-700">Loss</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional: Detailed Stats Section */}
        {selectedParticipant && (
          <div className="mt-8">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Detailed Statistics
              </h2>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <StandingsStatsCard participant={selectedParticipant} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentStandings;
