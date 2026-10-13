import React, { useState, useEffect } from 'react';
import { Users, Shield, Star, User } from 'lucide-react';
import * as matchSquadService from '../services/matchSquadService';

const SquadDisplay = ({ matchId, showTitle = true }) => {
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (matchId) {
      loadSquads();
    }
  }, [matchId]);

  const loadSquads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await matchSquadService.getMatchSquads(matchId);
      setSquads(response.squads || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading squads:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !squads || squads.length === 0) {
    return null; // Don't show anything if no squads
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {showTitle && (
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Match Squads
        </h3>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {squads.map((squad, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              {squad.team_name}
            </h4>
            
            {/* Starting Lineup */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Starting Lineup
              </p>
              <div className="space-y-2">
                {squad.members
                  .filter(member => member.is_starting)
                  .map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        {member.profile_image ? (
                          <img
                            src={member.profile_image}
                            alt={`${member.first_name} ${member.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            {member.first_name} {member.last_name}
                            {member.is_captain === true && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Captain" />
                            )}
                          </p>
                          {member.position_label && (
                            <p className="text-sm text-gray-600">{member.position_label}</p>
                          )}
                        </div>
                      </div>
                      {member.jersey_number && member.jersey_number > 0 && (
                        <div className="bg-blue-600 text-white font-bold text-lg px-3 py-1 rounded">
                          #{member.jersey_number}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Substitutes */}
            {squad.members.filter(member => !member.is_starting).length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Substitutes
                </p>
                <div className="space-y-2">
                  {squad.members
                    .filter(member => !member.is_starting)
                    .map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          {member.profile_image ? (
                            <img
                              src={member.profile_image}
                              alt={`${member.first_name} ${member.last_name}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                              {member.first_name} {member.last_name}
                              {member.is_captain === true && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Captain" />
                              )}
                            </p>
                            {member.position_label && (
                              <p className="text-sm text-gray-600">{member.position_label}</p>
                            )}
                          </div>
                        </div>
                        {member.jersey_number && member.jersey_number > 0 && (
                          <div className="bg-gray-600 text-white font-bold text-lg px-3 py-1 rounded">
                            #{member.jersey_number}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SquadDisplay;
