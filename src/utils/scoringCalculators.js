/**
 * Sport-Specific Scoring Calculators
 * Handles scoring logic for different sports
 */

/**
 * TENNIS SCORING CALCULATOR
 * Points: 0, 15, 30, 40, Game
 * Deuce at 40-40
 * Tiebreak at 6-6 in games
 */
const tennisScoring = {
  // Convert points to tennis score display
  pointsToScore: (points) => {
    const scores = ['0', '15', '30', '40'];
    return points < 4 ? scores[points] : 'game';
  },

  // Calculate game winner (regular game, not tiebreak)
  calculateGameWinner: (p1Points, p2Points, matchConfig = null) => {
    const winByMargin = matchConfig?.win_by_margin || 2;
    
    // Neither player has reached 40 (3 points) yet
    if (p1Points < 3 && p2Points < 3) return null;
    
    // If both players are at 3+ points (deuce situation)
    if (p1Points >= 3 && p2Points >= 3) {
      // Need win_by_margin lead to win from deuce (configurable, default 2)
      if (Math.abs(p1Points - p2Points) < winByMargin) return null;
      return p1Points > p2Points ? 'participant1' : 'participant2';
    }
    
    // Normal win: One player reaches 4 points (40) and opponent has less than 3 (less than 40)
    if (p1Points >= 4 && p2Points < 3) return 'participant1';
    if (p2Points >= 4 && p1Points < 3) return 'participant2';
    
    // One player at 40 (3 points), opponent at 30 or less
    if (p1Points === 3 && p2Points < 3) {
      // Player 1 needs one more point to win (will be 4 vs <3)
      return null;
    }
    if (p2Points === 3 && p1Points < 3) {
      // Player 2 needs one more point to win (will be 4 vs <3)
      return null;
    }
    
    return null;
  },

  // Calculate tiebreak winner
  calculateTiebreakWinner: (p1Points, p2Points, tiebreakTarget = 7, matchConfig = null) => {
    const winByMargin = matchConfig?.win_by_margin || 2;
    
    // Tiebreak: first to tiebreakTarget points (7 for regular, 10 for match tiebreak)
    // Must win by win_by_margin points (configurable, default 2)
    if (p1Points < tiebreakTarget && p2Points < tiebreakTarget) return null;
    if (Math.abs(p1Points - p2Points) < winByMargin) return null;
    return p1Points > p2Points ? 'participant1' : 'participant2';
  },

  // Calculate set winner
  calculateSetWinner: (p1Games, p2Games, isTiebreak = false, tiebreakAt = 6, matchConfig = null) => {
    const winByMargin = matchConfig?.win_by_margin || 2;
    
    if (isTiebreak) {
      // After tiebreak is won, score becomes (tiebreakAt+1)-tiebreakAt
      // Winner is whoever has (tiebreakAt+1) games - set is won immediately
      const winningGames = tiebreakAt + 1;
      if (p1Games === winningGames) return 'participant1';
      if (p2Games === winningGames) return 'participant2';
      return null; // Tiebreak still in progress (games still at tiebreakAt-tiebreakAt)
    }
    
    // Regular set: first to 6 games with win_by_margin lead (configurable, default 2)
    if (p1Games < 6 && p2Games < 6) return null;
    if (Math.abs(p1Games - p2Games) < winByMargin) return null;
    return p1Games > p2Games ? 'participant1' : 'participant2';
  },

  // Calculate match winner
  calculateMatchWinner: (sets, bestOf) => {
    const setsToWin = Math.ceil(bestOf / 2);
    const p1SetsWon = sets.filter(s => s.winner === 'participant1').length;
    const p2SetsWon = sets.filter(s => s.winner === 'participant2').length;
    
    if (p1SetsWon >= setsToWin) return 'participant1';
    if (p2SetsWon >= setsToWin) return 'participant2';
    return null;
  },

  // Add point and return new score state
  addPoint: (currentScore, participantSide, matchConfig = null, sportName = 'Tennis') => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    // Get config values or use defaults
    const totalSets = matchConfig?.total_sets || 3; // Default: Best of 3
    const setsToWin = matchConfig?.sets_to_win || Math.ceil(totalSets / 2); // Use config or calculate
    // ONLY for Tennis: Support custom games_per_set (e.g., 11 games)
    const gamesPerSet = (sportName === 'Tennis' && matchConfig?.games_per_set) ? matchConfig.games_per_set : 6;
    const gamesToWinSet = gamesPerSet; // Use config value
    const tiebreakEnabled = matchConfig?.tiebreak_enabled !== false; // Default: true
    const tiebreakAt = matchConfig?.tiebreak_at || 5; // Trigger tiebreak at 5-5 (5-all)
    const tiebreakPoints = matchConfig?.tiebreak_points || 7; // Regular tiebreak to 7
    const finalSetTiebreak = matchConfig?.final_set_tiebreak || null; // 10 for match tiebreak
    
    // Initialize games array if it doesn't exist (for old matches)
    if (!newScore.participant1.games) {
      newScore.participant1.games = [0];
    }
    if (!newScore.participant2.games) {
      newScore.participant2.games = [0];
    }
    if (!newScore.current_set) {
      newScore.current_set = 1;
    }
    
    // Initialize set timing array for Tennis/Padel (track start/end time per set)
    if (!newScore.set_timings) {
      newScore.set_timings = [{
        set_number: 1,
        start_time: new Date().toISOString(),
        end_time: null,
        duration_seconds: null
      }];
    }
    
    // Initialize deuce count for current game (tracks total deuces in this game)
    if (newScore.current_game_deuce_count === undefined) {
      newScore.current_game_deuce_count = 0;
    }
    
    // Track previous state before adding point (to detect deuce transitions)
    const prevP1Points = newScore.participant1.current_game_points;
    const prevP2Points = newScore.participant2.current_game_points;
    const wasInDeuce = (prevP1Points >= 3 && prevP2Points >= 3 && prevP1Points === prevP2Points);
    
    if (participantSide === 'participant1') {
      newScore.participant1.current_game_points += 1;
    } else {
      newScore.participant2.current_game_points += 1;
    }
    
    // Track deuce occurrences (when both reach 40-40 or higher equal scores)
    const p1Points = newScore.participant1.current_game_points;
    const p2Points = newScore.participant2.current_game_points;
    const nowInDeuce = (p1Points >= 3 && p2Points >= 3 && p1Points === p2Points);
    
    // Increment deuce count when we enter deuce state (including returning from advantage)
    if (nowInDeuce && !wasInDeuce) {
      newScore.current_game_deuce_count += 1;
    }
    
    // Check for game/tiebreak winner
    let gameWinner = null;
    
    if (newScore.is_tiebreak) {
      // Update total tiebreak points (for serve rotation and end changes)
      newScore.tiebreak_total_points = newScore.participant1.current_game_points + newScore.participant2.current_game_points;
      
      // In tiebreak mode - use tiebreak rules
      const tiebreakTarget = newScore.tiebreak_type === 'match' ? finalSetTiebreak || 10 : tiebreakPoints;
      gameWinner = tennisScoring.calculateTiebreakWinner(
        newScore.participant1.current_game_points,
        newScore.participant2.current_game_points,
        tiebreakTarget,
        matchConfig
      );
    } else {
      // Regular game - use standard rules
      gameWinner = tennisScoring.calculateGameWinner(
        newScore.participant1.current_game_points,
        newScore.participant2.current_game_points,
        matchConfig
      );
    }
    
    if (gameWinner) {
      // Ensure games array has the current set index
      while (newScore.participant1.games.length < newScore.current_set) {
        newScore.participant1.games.push(0);
      }
      while (newScore.participant2.games.length < newScore.current_set) {
        newScore.participant2.games.push(0);
      }
      
      // Update games
      if (gameWinner === 'participant1') {
        newScore.participant1.games[newScore.current_set - 1] += 1;
      } else {
        newScore.participant2.games[newScore.current_set - 1] += 1;
      }
      
      const p1Games = newScore.participant1.games[newScore.current_set - 1];
      const p2Games = newScore.participant2.games[newScore.current_set - 1];
      
      // ========== FIXED GAMES FORMAT (e.g., 13 games per set) ==========
      // If games_per_set is set (e.g., 13), play all games regardless of score
      if (gamesPerSet && gamesPerSet !== 6) {
        const totalGames = p1Games + p2Games;
        
        // At 5-5 in custom game format: Start tiebreak
        if (p1Games === 5 && p2Games === 5 && !newScore.is_tiebreak) {
          newScore.is_tiebreak = true;
          newScore.tiebreak_type = 'regular';
          newScore.participant1.current_game_points = 0;
          newScore.participant2.current_game_points = 0;
          newScore.tiebreak_total_points = 0;
          return newScore;
        }
        
        // After all games played: Determine winner
        if (totalGames === gamesPerSet) {
          const setWinner = p1Games > p2Games ? 'participant1' : 'participant2';
          
          // End current set timing
          const currentSetIndex = newScore.current_set - 1;
          if (newScore.set_timings && newScore.set_timings[currentSetIndex]) {
            const endTime = new Date();
            const startTime = new Date(newScore.set_timings[currentSetIndex].start_time);
            const durationSeconds = Math.floor((endTime - startTime) / 1000);
            
            newScore.set_timings[currentSetIndex].end_time = endTime.toISOString();
            newScore.set_timings[currentSetIndex].duration_seconds = durationSeconds;
          }
          
          // Update sets won
          if (setWinner === 'participant1') {
            newScore.participant1.sets_won += 1;
          } else {
            newScore.participant2.sets_won += 1;
          }
          
          // Reset tiebreak flag
          newScore.is_tiebreak = false;
          newScore.tiebreak_type = null;
          newScore.tiebreak_total_points = 0;
          
          // Check for match winner
          const p1SetsWon = newScore.participant1.sets_won;
          const p2SetsWon = newScore.participant2.sets_won;
          
          if (p1SetsWon >= setsToWin) {
            newScore.match_winner = 'participant1';
            newScore.match_complete = true;
          } else if (p2SetsWon >= setsToWin) {
            newScore.match_winner = 'participant2';
            newScore.match_complete = true;
          } else {
            // Move to next set
            newScore.current_set += 1;
            newScore.participant1.games.push(0);
            newScore.participant2.games.push(0);
            
            // Start timing for new set
            if (!newScore.set_timings) {
              newScore.set_timings = [];
            }
            newScore.set_timings.push({
              set_number: newScore.current_set,
              start_time: new Date().toISOString(),
              end_time: null,
              duration_seconds: null
            });
          }
          
          // Reset game points and deuce count for new game
          newScore.participant1.current_game_points = 0;
          newScore.participant2.current_game_points = 0;
          newScore.current_game_deuce_count = 0;
          
          return newScore;
        }
        
        // Continue playing until all games completed
        newScore.participant1.current_game_points = 0;
        newScore.participant2.current_game_points = 0;
        newScore.current_game_deuce_count = 0;
        
        // Switch serve to opponent after game is won
        const currentServer = newScore.server || newScore.serving_player || 'participant1';
        const newServer = currentServer === 'participant1' ? 'participant2' : 'participant1';
        newScore.server = newServer;
        newScore.serving_player = newServer;
        
        return newScore;
      }
      
      // ========== STANDARD TENNIS FORMAT (6 games, win by 2) ==========
      
      // Check if we need to enter tiebreak mode
      if (tiebreakEnabled && !newScore.is_tiebreak && p1Games === tiebreakAt && p2Games === tiebreakAt) {
        // Detect if this is the final set
        const p1SetsWon = newScore.participant1.sets_won;
        const p2SetsWon = newScore.participant2.sets_won;
        const isFinalSet = (p1SetsWon === setsToWin - 1 && p2SetsWon === setsToWin - 1);
        
        // Activate tiebreak
        newScore.is_tiebreak = true;
        newScore.tiebreak_type = (isFinalSet && finalSetTiebreak) ? 'match' : 'regular';
        newScore.participant1.current_game_points = 0;
        newScore.participant2.current_game_points = 0;
        newScore.tiebreak_total_points = 0; // Track total points for serve rotation and end changes
        
        // Don't check for set winner yet - tiebreak just started
        return newScore;
      }
      
      // Check for set winner
      const setWinner = tennisScoring.calculateSetWinner(
        p1Games,
        p2Games,
        newScore.is_tiebreak,
        tiebreakAt,
        matchConfig
      );
      
      if (setWinner) {
        // End current set timing
        const currentSetIndex = newScore.current_set - 1;
        if (newScore.set_timings && newScore.set_timings[currentSetIndex]) {
          const endTime = new Date();
          const startTime = new Date(newScore.set_timings[currentSetIndex].start_time);
          const durationSeconds = Math.floor((endTime - startTime) / 1000);
          
          newScore.set_timings[currentSetIndex].end_time = endTime.toISOString();
          newScore.set_timings[currentSetIndex].duration_seconds = durationSeconds;
        }
        
        // Update sets
        if (setWinner === 'participant1') {
          newScore.participant1.sets_won += 1;
        } else {
          newScore.participant2.sets_won += 1;
        }
        
        // Reset tiebreak flag for next set
        newScore.is_tiebreak = false;
        newScore.tiebreak_type = null;
        newScore.tiebreak_total_points = 0;
        
        // Check for match winner (use config to determine sets needed)
        const p1SetsWon = newScore.participant1.sets_won;
        const p2SetsWon = newScore.participant2.sets_won;
        
        if (p1SetsWon >= setsToWin) {
          newScore.match_winner = 'participant1';
          newScore.match_complete = true;
        } else if (p2SetsWon >= setsToWin) {
          newScore.match_winner = 'participant2';
          newScore.match_complete = true;
        } else {
          // Move to next set only if match not complete
          newScore.current_set += 1;
          newScore.participant1.games.push(0);
          newScore.participant2.games.push(0);
          
          // Start timing for new set
          if (!newScore.set_timings) {
            newScore.set_timings = [];
          }
          newScore.set_timings.push({
            set_number: newScore.current_set,
            start_time: new Date().toISOString(),
            end_time: null,
            duration_seconds: null
          });
        }
      }
      
      // Reset game points and deuce count for new game
      newScore.participant1.current_game_points = 0;
      newScore.participant2.current_game_points = 0;
      newScore.current_game_deuce_count = 0; // Reset deuce count for new game
      
      // 🎾 TENNIS/PADEL: Switch serve to opponent after game is won
      // In tennis, players alternate serving each game
      const currentServer = newScore.server || newScore.serving_player || 'participant1';
      const newServer = currentServer === 'participant1' ? 'participant2' : 'participant1';
      newScore.server = newServer;
      newScore.serving_player = newServer; // For frontend compatibility
      // console.log('🎾 Tennis/Padel Game Won - Serve switches to:', newServer);
    }
    
    return newScore;
  }
};

/**
 * VOLLEYBALL SCORING CALCULATOR
 * Points to 25 (or 15 in deciding set)
 * Must win by 2
 */
const volleyballScoring = {
  calculateSetWinner: (p1Points, p2Points, isDecidingSet = false, matchConfig = null) => {
    // Use tournament match config or defaults
    const pointsToWin = matchConfig?.points_per_set || 25;
    const decidingSetPoints = matchConfig?.deciding_set_points || pointsToWin; // Use points_per_set if deciding_set_points not specified
    const minDiff = matchConfig?.win_by_margin || 2;
    
    const targetPoints = isDecidingSet ? decidingSetPoints : pointsToWin;
    
    // Check if either player has reached the target points
    const p1ReachedTarget = p1Points >= targetPoints;
    const p2ReachedTarget = p2Points >= targetPoints;
    
    // No winner if neither has reached target
    if (!p1ReachedTarget && !p2ReachedTarget) return null;
    
    // If one player reached target, check for required margin
    if (Math.abs(p1Points - p2Points) < minDiff) return null;
    
    return p1Points > p2Points ? 'participant1' : 'participant2';
  },

  calculateMatchWinner: (sets, matchConfig = null) => {
    // Use tournament match config or defaults
    const setsToWin = matchConfig?.sets_to_win || 3;
    const p1SetsWon = sets.filter(s => s.winner === 'participant1').length;
    const p2SetsWon = sets.filter(s => s.winner === 'participant2').length;
    
    if (p1SetsWon >= setsToWin) return 'participant1';
    if (p2SetsWon >= setsToWin) return 'participant2';
    return null;
  },

  addPoint: (currentScore, participantSide, matchConfig = null) => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    // Don't allow points if match is already complete
    if (newScore.match_complete) {
      return newScore;
    }
    
    // Get config values or use defaults
    const totalSets = matchConfig?.total_sets || 5;
    const setsToWin = matchConfig?.sets_to_win || 3;
    
    // Initialize rotation tracking if not exists
    if (!newScore.current_server) {
      newScore.current_server = 'participant1'; // First serve goes to participant1
      newScore.server = 'participant1'; // For frontend compatibility
    }
    if (!newScore.participant1.current_server_position) {
      newScore.participant1.current_server_position = 1;
    }
    if (!newScore.participant2.current_server_position) {
      newScore.participant2.current_server_position = 1;
    }
    
    // Initialize deuce count for current set if not exists
    if (newScore.current_game_deuce_count === undefined) {
      newScore.current_game_deuce_count = 0;
    }
    
    // Track previous server before adding point
    const previousServer = newScore.current_server;
    
    
    // Get previous scores before adding point (to detect deuce)
    const currentSetIndex = newScore.current_set - 1;
    const prevP1Score = newScore.participant1.set_scores[currentSetIndex];
    const prevP2Score = newScore.participant2.set_scores[currentSetIndex];
    
    // Determine target points for current set
    const isDecidingSet = newScore.current_set === totalSets;
    const pointsToWin = matchConfig?.points_per_set || 25;
    const decidingSetPoints = matchConfig?.deciding_set_points || pointsToWin; // Use points_per_set if deciding_set_points not specified
    const targetPoints = isDecidingSet ? decidingSetPoints : pointsToWin;
    const deucePoint = targetPoints - 1; // 24 for set to 25, 14 for set to 15
    
    // Check if was in deuce before this point
    const wasInDeuce = (prevP1Score >= deucePoint && prevP2Score >= deucePoint && prevP1Score === prevP2Score);
    
    // Add point to the team that won the rally
    if (participantSide === 'participant1') {
      newScore.participant1.set_scores[newScore.current_set - 1] += 1;
    } else {
      newScore.participant2.set_scores[newScore.current_set - 1] += 1;
    }
    
    // Get new scores after adding point
    const newP1Score = newScore.participant1.set_scores[currentSetIndex];
    const newP2Score = newScore.participant2.set_scores[currentSetIndex];
    
    // Check if now in deuce (both at 24-24, 25-25, 26-26, etc. OR 14-14, 15-15 in deciding set)
    const nowInDeuce = (newP1Score >= deucePoint && newP2Score >= deucePoint && newP1Score === newP2Score);
    
    // Increment deuce count when entering deuce state
    if (nowInDeuce && !wasInDeuce) {
      newScore.current_game_deuce_count += 1;
      // console.log('🏐 VOLLEYBALL DEUCE! Count:', newScore.current_game_deuce_count, 'Score:', newP1Score, '-', newP2Score, 'Set:', newScore.current_set);
    }
    
    // Service rotation logic: Team that wins rally gets/keeps serve
    if (previousServer !== participantSide) {
      // Side-out: Serve changed to the team that won the rally
      newScore.current_server = participantSide;
      newScore.server = participantSide; // For frontend compatibility
      
      // console.log('🏐 Service Change - New Server:', participantSide, 'Previous:', previousServer);
      
      // Rotate the team that won the serve clockwise (1→2→3→4→5→6→1)
      if (participantSide === 'participant1') {
        newScore.participant1.current_server_position = 
          (newScore.participant1.current_server_position % 6) + 1;
      } else {
        newScore.participant2.current_server_position = 
          (newScore.participant2.current_server_position % 6) + 1;
      }
    } else {
      console.log('🏐 Same Server Continues:', participantSide);
    }
    // If same team keeps serve, no rotation happens
    
    // Check if set is won (reuse isDecidingSet from deuce calculation above)
    const setWinner = volleyballScoring.calculateSetWinner(
      newScore.participant1.set_scores[newScore.current_set - 1],
      newScore.participant2.set_scores[newScore.current_set - 1],
      isDecidingSet,
      matchConfig
    );
    
    if (setWinner) {
      if (setWinner === 'participant1') {
        newScore.participant1.sets_won += 1;
      } else {
        newScore.participant2.sets_won += 1;
      }
      
      // Check if match is over
      const p1SetsWon = newScore.participant1.sets_won;
      const p2SetsWon = newScore.participant2.sets_won;
      
      if (p1SetsWon >= setsToWin) {
        newScore.match_complete = true;
        newScore.match_winner = 'participant1';
      } else if (p2SetsWon >= setsToWin) {
        newScore.match_complete = true;
        newScore.match_winner = 'participant2';
      } else {
        // Move to next set only if match not complete
        newScore.current_set += 1;
        newScore.participant1.set_scores.push(0);
        newScore.participant2.set_scores.push(0);
        
        // Reset server positions for new set
        newScore.participant1.current_server_position = 1;
        newScore.participant2.current_server_position = 1;
        
        // Reset deuce count for new set
        newScore.current_game_deuce_count = 0;
        
        // Server alternates between sets (if P1 served first in set 1, P2 serves first in set 2)
        const nextServer = newScore.current_set % 2 === 0 ? 'participant1' : 'participant2';
        newScore.current_server = nextServer;
        newScore.server = nextServer; // For frontend compatibility
        
        
      }
    }
    
    // console.log('🏐 Final State - Server:', newScore.server, 'current_server:', newScore.current_server, 'Score:', 
    //   newScore.participant1.set_scores[newScore.current_set - 1], '-', 
    //   newScore.participant2.set_scores[newScore.current_set - 1]);
    
    return newScore;
  }
};

/**
 * FOOTBALL SCORING CALCULATOR
 * Goals scored
 * Periods/Halves
 * Penalty Shootout
 */
const footballScoring = {
  addGoal: (currentScore, participantSide) => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    if (participantSide === 'participant1') {
      newScore.participant1.goals += 1;
    } else {
      newScore.participant2.goals += 1;
    }
    
    return newScore;
  },

  addCard: (currentScore, participantSide, cardType) => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    if (cardType === 'yellow') {
      if (participantSide === 'participant1') {
        newScore.participant1.yellow_cards += 1;
      } else {
        newScore.participant2.yellow_cards += 1;
      }
    } else if (cardType === 'red') {
      if (participantSide === 'participant1') {
        newScore.participant1.red_cards += 1;
      } else {
        newScore.participant2.red_cards += 1;
      }
    }
    
    return newScore;
  },

  /**
   * Initialize penalty shootout
   * @param {Object} currentScore - Current match score
   * @param {Number} playersPerSide - Number of players per side (5, 7, 8, 11, etc.)
   */
  initializePenaltyShootout: (currentScore, playersPerSide = 11) => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    // Determine max_rounds based on players_per_side
    // 5-a-side: 3 rounds (3 players take penalties)
    // 7-a-side: 5 rounds (5 players take penalties)
    // 8-a-side: 5 rounds (5 players take penalties)
    // 11-a-side: 5 rounds (5 players take penalties)
    let maxRounds = 5; // Default for 11-a-side, 7-a-side, 8-a-side
    if (playersPerSide === 5) {
      maxRounds = 3; // 5-a-side uses 3 rounds
    }
    
    newScore.is_penalty_shootout = true;
    newScore.current_half = 3; // Half 3 = Penalty Shootout
    newScore.match_time = 'Penalties';
    newScore.penalty_shootout = {
      participant1_scored: 0,
      participant2_scored: 0,
      participant1_attempts: 0,
      participant2_attempts: 0,
      current_round: 1,
      max_rounds: maxRounds,
      sudden_death: false,
      kicks: [] // Array of kick results
    };
    
    return newScore;
  },

  /**
   * Record penalty kick result
   */
  recordPenaltyKick: (currentScore, participantSide, result, playerId = null) => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    if (!newScore.penalty_shootout) {
      throw new Error('Penalty shootout not initialized');
    }
    
    const ps = newScore.penalty_shootout;
    const kickNumber = ps.kicks.length + 1;
    
    // Record kick
    const kick = {
      kick_number: kickNumber,
      participant_side: participantSide,
      player_id: playerId, // Store player ID for validation
      result: result, // 'scored', 'missed', 'saved'
      round: ps.current_round
    };
    ps.kicks.push(kick);
    
    // Update attempts
    if (participantSide === 'participant1') {
      ps.participant1_attempts += 1;
    } else {
      ps.participant2_attempts += 1;
    }
    
    // Update score if scored
    if (result === 'scored') {
      if (participantSide === 'participant1') {
        ps.participant1_scored += 1;
      } else {
        ps.participant2_scored += 1;
      }
    }
    
    // Check if round is complete (both teams took kick)
    if (ps.participant1_attempts === ps.participant2_attempts) {
      // Round complete, check if we need to continue
      const p1Score = ps.participant1_scored;
      const p2Score = ps.participant2_scored;
      const roundsRemaining = ps.max_rounds - ps.current_round;
      
      // Check if winner can be determined
      if (ps.current_round >= ps.max_rounds) {
        // After 5 rounds
        if (p1Score !== p2Score) {
          // Winner determined
          newScore.match_complete = true;
          newScore.match_winner = p1Score > p2Score ? 'participant1' : 'participant2';
          newScore.penalty_shootout_winner = newScore.match_winner;
        } else {
          // Still tied, enter sudden death
          ps.sudden_death = true;
          ps.current_round += 1;
        }
      } else {
        // Before 5 rounds - check if winner is mathematically determined
        const p1Max = p1Score + roundsRemaining;
        const p2Max = p2Score + roundsRemaining;
        
        if (p1Score > p2Max) {
          // Participant 1 wins
          newScore.match_complete = true;
          newScore.match_winner = 'participant1';
          newScore.penalty_shootout_winner = 'participant1';
        } else if (p2Score > p1Max) {
          // Participant 2 wins
          newScore.match_complete = true;
          newScore.match_winner = 'participant2';
          newScore.penalty_shootout_winner = 'participant2';
        } else {
          // Continue to next round
          ps.current_round += 1;
        }
      }
    } else if (ps.sudden_death && ps.participant1_attempts === ps.participant2_attempts) {
      // Sudden death round complete
      const p1Score = ps.participant1_scored;
      const p2Score = ps.participant2_scored;
      
      if (p1Score !== p2Score) {
        // Winner determined in sudden death
        newScore.match_complete = true;
        newScore.match_winner = p1Score > p2Score ? 'participant1' : 'participant2';
        newScore.penalty_shootout_winner = newScore.match_winner;
      } else {
        // Continue sudden death
        ps.current_round += 1;
      }
    }
    
    return newScore;
  },

  /**
   * Check if penalty shootout is needed
   */
  needsPenaltyShootout: (currentScore) => {
    // Check if match is complete and score is tied
    if (!currentScore.match_complete) {
      return false;
    }
    
    const p1Goals = currentScore.participant1?.goals || 0;
    const p2Goals = currentScore.participant2?.goals || 0;
    
    return p1Goals === p2Goals;
  }
};

/**
 * BADMINTON SCORING CALCULATOR
 * Points to 21
 * Must win by 2
 * Best of 3 sets
 */
const badmintonScoring = {
  calculateSetWinner: (p1Points, p2Points, matchConfig = null) => {
    // Use tournament match config or defaults
    const pointsToWin = matchConfig?.points_per_game || matchConfig?.points_per_set || 21;
    const minDiff = matchConfig?.win_by_margin || 2;
    const maxPoints = matchConfig?.max_points || 30;
    
    // Check if max points reached (no win by margin needed)
    if (p1Points >= maxPoints || p2Points >= maxPoints) {
      return p1Points > p2Points ? 'participant1' : 'participant2';
    }
    
    if (p1Points < pointsToWin && p2Points < pointsToWin) return null;
    if (Math.abs(p1Points - p2Points) < minDiff) return null;
    
    return p1Points > p2Points ? 'participant1' : 'participant2';
  },

  calculateMatchWinner: (sets, matchConfig = null) => {
    // Use tournament match config or defaults
    const setsToWin = matchConfig?.games_to_win || matchConfig?.sets_to_win || 2;
    const p1SetsWon = sets.filter(s => s.winner === 'participant1').length;
    const p2SetsWon = sets.filter(s => s.winner === 'participant2').length;
    
    if (p1SetsWon >= setsToWin) return 'participant1';
    if (p2SetsWon >= setsToWin) return 'participant2';
    return null;
  },

  addPoint: (currentScore, participantSide, matchConfig = null) => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    // Use game_scores for game-based sports (Badminton)
    const currentGameIndex = (newScore.current_game || newScore.current_set || 1) - 1;
    const scoresField = newScore.match_structure === 'game_based' ? 'game_scores' : 'set_scores';
    const wonField = newScore.match_structure === 'game_based' ? 'games_won' : 'sets_won';
    const currentField = newScore.match_structure === 'game_based' ? 'current_game' : 'current_set';
    
    // Initialize deuce count for current game/set if not exists
    if (newScore.current_game_deuce_count === undefined) {
      newScore.current_game_deuce_count = 0;
    }
    
    // Get previous scores before adding point (to detect deuce)
    const prevP1Score = newScore.participant1[scoresField][currentGameIndex];
    const prevP2Score = newScore.participant2[scoresField][currentGameIndex];
    const pointsToWin = matchConfig?.points_per_game || matchConfig?.points_per_set || 21;
    const deucePoint = pointsToWin - 1; // 20 for game to 21
    
    // Check if was in deuce before this point
    const wasInDeuce = (prevP1Score >= deucePoint && prevP2Score >= deucePoint && prevP1Score === prevP2Score);
    
    // Add point to the participant that won the rally
    if (participantSide === 'participant1') {
      newScore.participant1[scoresField][currentGameIndex] += 1;
    } else {
      newScore.participant2[scoresField][currentGameIndex] += 1;
    }
    
    // Get new scores after adding point
    const newP1Score = newScore.participant1[scoresField][currentGameIndex];
    const newP2Score = newScore.participant2[scoresField][currentGameIndex];
    
    // Check if now in deuce (both at 20-20, 21-21, 22-22, etc.)
    const nowInDeuce = (newP1Score >= deucePoint && newP2Score >= deucePoint && newP1Score === newP2Score);
    
    // Increment deuce count when entering deuce state
    if (nowInDeuce && !wasInDeuce) {
      newScore.current_game_deuce_count += 1;
      // console.log('🏸 BADMINTON DEUCE! Count:', newScore.current_game_deuce_count, 'Score:', newP1Score, '-', newP2Score);
    }
    
    // 🏸 BADMINTON: Rally point scoring - Winner of rally becomes server
    // Automatically switch serve to the player/pair that scored
    newScore.server = participantSide;
    newScore.serving_player = participantSide; // For compatibility
    // console.log('🏸 Badminton Serve Change - New Server:', participantSide);
    
    const gameWinner = badmintonScoring.calculateSetWinner(
      newScore.participant1[scoresField][currentGameIndex],
      newScore.participant2[scoresField][currentGameIndex],
      matchConfig
    );
    
    if (gameWinner) {
      if (gameWinner === 'participant1') {
        newScore.participant1[wonField] += 1;
      } else {
        newScore.participant2[wonField] += 1;
      }
      
      // Check if match is won
      const gamesToWin = matchConfig?.games_to_win || 2; // Badminton default best of 3
      const p1GamesWon = newScore.participant1[wonField];
      const p2GamesWon = newScore.participant2[wonField];
      
      if (p1GamesWon >= gamesToWin) {
        newScore.match_winner = 'participant1';
        newScore.match_complete = true;
      } else if (p2GamesWon >= gamesToWin) {
        newScore.match_winner = 'participant2';
        newScore.match_complete = true;
      } else {
        // Move to next game/set only if match not complete
        newScore[currentField] += 1;
        newScore.participant1[scoresField].push(0);
        newScore.participant2[scoresField].push(0);
        
        // Reset deuce count for new game/set
        newScore.current_game_deuce_count = 0;
      }
    }
    
    return newScore;
  }
};

/**
 * TABLE TENNIS SCORING CALCULATOR
 * Points to 11
 * Must win by 2
 * Best of 5 sets
 */
const tableTennisScoring = {
  calculateSetWinner: (p1Points, p2Points, matchConfig = null) => {
    // Use config values or defaults
    const pointsToWin = matchConfig?.points_per_game || 11;
    const minDiff = matchConfig?.win_by_margin || 2;
    
    if (p1Points < pointsToWin && p2Points < pointsToWin) return null;
    if (Math.abs(p1Points - p2Points) < minDiff) return null;
    
    return p1Points > p2Points ? 'participant1' : 'participant2';
  },

  calculateMatchWinner: (sets, matchConfig = null) => {
    // Use config values or defaults
    const setsToWin = matchConfig?.games_to_win || 3;
    const p1SetsWon = sets.filter(s => s.winner === 'participant1').length;
    const p2SetsWon = sets.filter(s => s.winner === 'participant2').length;
    
    if (p1SetsWon >= setsToWin) return 'participant1';
    if (p2SetsWon >= setsToWin) return 'participant2';
    return null;
  },

  addPoint: (currentScore, participantSide, matchConfig = null, sportName = 'Table Tennis') => {
    const newScore = JSON.parse(JSON.stringify(currentScore));
    
    // Use game_scores for game-based sports (Squash, Table Tennis)
    const currentGameIndex = (newScore.current_game || newScore.current_set || 1) - 1;
    const scoresField = newScore.match_structure === 'game_based' ? 'game_scores' : 'set_scores';
    const wonField = newScore.match_structure === 'game_based' ? 'games_won' : 'sets_won';
    const currentField = newScore.match_structure === 'game_based' ? 'current_game' : 'current_set';
    
    // Initialize deuce count for current game if not exists
    if (newScore.current_game_deuce_count === undefined) {
      newScore.current_game_deuce_count = 0;
    }
    
    // Get previous scores before adding point (to detect deuce)
    const prevP1Score = newScore.participant1[scoresField][currentGameIndex];
    const prevP2Score = newScore.participant2[scoresField][currentGameIndex];
    const pointsToWin = matchConfig?.points_per_game || 11;
    const deucePoint = pointsToWin - 1; // 10 for game to 11
    
    // Check if was in deuce before this point
    const wasInDeuce = (prevP1Score >= deucePoint && prevP2Score >= deucePoint && prevP1Score === prevP2Score);
    
    // Add point to the participant that won the rally
    if (participantSide === 'participant1') {
      newScore.participant1[scoresField][currentGameIndex] += 1;
    } else {
      newScore.participant2[scoresField][currentGameIndex] += 1;
    }
    
    // Get new scores after adding point
    const newP1Score = newScore.participant1[scoresField][currentGameIndex];
    const newP2Score = newScore.participant2[scoresField][currentGameIndex];
    
    // Check if now in deuce (both at 10-10, 11-11, 12-12, etc.)
    const nowInDeuce = (newP1Score >= deucePoint && newP2Score >= deucePoint && newP1Score === newP2Score);
    
    // Increment deuce count when entering deuce state
    if (nowInDeuce && !wasInDeuce) {
      newScore.current_game_deuce_count += 1;
      // console.log('🏓 DEUCE! Count:', newScore.current_game_deuce_count, 'Score:', newP1Score, '-', newP2Score);
    }
    
    // Server change logic - different for Table Tennis vs Squash/Pickleball
    if (sportName === 'Table Tennis') {
      // 🏓 TABLE TENNIS: Automatic server change based on points (NOT rally point)
      // Determine serve change interval based on points_per_game
      let serveChangeInterval;
      if (pointsToWin === 21) {
        serveChangeInterval = 5; // 21-point game: change every 5 points
      } else {
        serveChangeInterval = 2; // 11 or 15-point game: change every 2 points
      }
      
      // During deuce (at or above deuce point with equal scores), change every 1 point
      const totalPoints = newP1Score + newP2Score;
      const isInDeuce = (newP1Score >= deucePoint && newP2Score >= deucePoint);
      
      if (isInDeuce) {
        // At deuce: alternate serve every point
        // Determine who should serve based on total points
        // If total points is even, participant1 serves; if odd, participant2 serves
        // (This ensures alternation)
        const shouldBeParticipant1 = (totalPoints % 2 === 0);
        newScore.server = shouldBeParticipant1 ? 'participant1' : 'participant2';
        newScore.serving_player = newScore.server;
        // console.log('🏓 TABLE TENNIS DEUCE - Serve alternates every point. Total points:', totalPoints, 'Server:', newScore.server);
      } else {
        // Before deuce: change serve based on interval
        // Calculate which "serve block" we're in
        const serveBlock = Math.floor(totalPoints / serveChangeInterval);
        
        // Determine who should serve based on first server
        // If first_server is participant1: even blocks = participant1, odd blocks = participant2
        // If first_server is participant2: even blocks = participant2, odd blocks = participant1
        const firstServer = newScore.first_server || 'participant1'; // Default to participant1 if not set
        const isEvenBlock = (serveBlock % 2 === 0);
        
        if (firstServer === 'participant1') {
          newScore.server = isEvenBlock ? 'participant1' : 'participant2';
        } else {
          newScore.server = isEvenBlock ? 'participant2' : 'participant1';
        }
        
        newScore.serving_player = newScore.server;
        // console.log(`🏓 TABLE TENNIS Serve Change - Total points: ${totalPoints}, Interval: ${serveChangeInterval}, Block: ${serveBlock}, First Server: ${firstServer}, Current Server: ${newScore.server}`);
      }
    } else {
      // 🎾 SQUASH/PICKLEBALL: Rally point scoring - Winner of rally becomes server
      // Automatically switch serve to the player/pair that scored
      newScore.server = participantSide;
      newScore.serving_player = participantSide; // For compatibility
      // console.log(`🎾 ${sportName} Rally Point - Winner serves. New Server:`, participantSide);
    }
    
    const gameWinner = tableTennisScoring.calculateSetWinner(
      newScore.participant1[scoresField][currentGameIndex],
      newScore.participant2[scoresField][currentGameIndex],
      matchConfig
    );
    
    if (gameWinner) {
      if (gameWinner === 'participant1') {
        newScore.participant1[wonField] += 1;
      } else {
        newScore.participant2[wonField] += 1;
      }
      
      // Check if match is won
      const gamesToWin = matchConfig?.games_to_win || 3;
      const p1GamesWon = newScore.participant1[wonField];
      const p2GamesWon = newScore.participant2[wonField];
      
      if (p1GamesWon >= gamesToWin) {
        newScore.match_winner = 'participant1';
        newScore.match_complete = true;
      } else if (p2GamesWon >= gamesToWin) {
        newScore.match_winner = 'participant2';
        newScore.match_complete = true;
      } else {
        // Move to next game/set only if match not complete
        newScore[currentField] += 1;
        newScore.participant1[scoresField].push(0);
        newScore.participant2[scoresField].push(0);
        
        // Reset deuce count for new game
        newScore.current_game_deuce_count = 0;
      }
    }
    
    return newScore;
  }
};

/**
 * Get calculator for specific sport
 */
const getScoringCalculator = (sportName) => {
  const calculators = {
    'Tennis': tennisScoring,
    'Padel': tennisScoring, // Padel uses same scoring as Tennis (15-30-40)
    'Volleyball': volleyballScoring,
    'Football': footballScoring,
    'Badminton': badmintonScoring,
    'Table Tennis': tableTennisScoring,
    'Pickleball': tableTennisScoring, // Same as Table Tennis (11 points, win by 2, deuce at 10-10)
    'Squash': tableTennisScoring // Similar to table tennis
  };
  
  return calculators[sportName] || null;
};

module.exports = {
  tennisScoring,
  volleyballScoring,
  footballScoring,
  badmintonScoring,
  tableTennisScoring,
  getScoringCalculator
};
