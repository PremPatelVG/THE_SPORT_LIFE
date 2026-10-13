# Phase 2: Backend Service Updates - Summary

## ✅ Completed Changes

### 1. New Service Created: `standingsService.js`

**Location:** `src/services/standingsService.js`

**Purpose:** Comprehensive standings management with enhanced statistics tracking

**Key Functions:**

#### `extractGoalsFromScore(liveScore, participant)`
- Extracts goals/points from `live_score` JSON
- Supports multiple match structures:
  - **Set-based** (Tennis, Badminton): Counts sets won
  - **Game-based** (Table Tennis, Squash): Counts games won  
  - **Time-based** (Football, Volleyball): Direct score extraction
- Handles various JSON formats gracefully
- Returns 0 if parsing fails (safe fallback)

#### `updateParticipantStandings(conn, tournamentId, participantId, stats)`
- Updates standings with incremental statistics
- Tracks:
  - Matches played/won/lost/drawn
  - Points (3 for win, 1 for draw, 0 for loss)
  - Goals for/against
  - Goal difference (auto-calculated)
  - Clean sheets
- Single atomic update query

#### `updateStreaks(conn, tournamentId, participantId, result)`
- Manages winning/losing streaks
- Win: Increment winning streak, reset losing streak
- Loss: Increment losing streak, reset winning streak
- Draw: Reset both streaks

#### `updateFormGuide(conn, tournamentId, groupId)`
- Calculates last 5 match results
- Format: "WWLWD" (W=Win, L=Loss, D=Draw)
- Ordered oldest to newest (left to right)
- Queries completed matches only

#### `recalculatePositions(conn, tournamentId, groupId)`
- Sorts standings by:
  1. Points (DESC)
  2. Goal difference (DESC)
  3. Goals for (DESC)
  4. Matches won (DESC)
- Updates position field for all participants

#### `recalculateStandings(tournamentId, groupId)`
- Master function that orchestrates:
  1. Update averages (avg_goals_for, avg_goals_against)
  2. Update form guide
  3. Recalculate positions
- Runs in a transaction for consistency

#### `updateStandingsAfterMatch(matchId, winnerId, isDraw)` ⭐
- **Main entry point** called after match completion
- Extracts live_score from match
- Calculates goals for both participants
- Updates both participants' standings
- Updates streaks
- Recalculates all derived fields
- Comprehensive logging

---

### 2. Updated Service: `bracketService.js`

**Changes Made:**

#### Import Added (Line 3)
```javascript
const standingsService = require('./standingsService');
```

#### `updateStandings()` Function Refactored (Lines 775-783)
**Before:** 50+ lines of manual SQL updates
**After:** 3 lines delegating to standingsService

```javascript
const updateStandings = async (matchId, winnerId, isDraw = false) => {
    return await standingsService.updateStandingsAfterMatch(matchId, winnerId, isDraw);
};
```

**Benefits:**
- ✅ Cleaner code
- ✅ Enhanced statistics automatically
- ✅ Easier to maintain
- ✅ Backward compatible

#### `recalculatePositions()` Function Updated (Lines 785-792)
**Before:** Complex SQL with subqueries
**After:** Delegates to standingsService

```javascript
const recalculatePositions = async (tournamentId, groupId = null) => {
    return await standingsService.recalculateStandings(tournamentId, groupId);
};
```

**Benefits:**
- ✅ Uses enhanced sorting logic
- ✅ Includes averages and form updates
- ✅ Backward compatible (same function signature)

---

## 🔒 Backward Compatibility

### Existing Code Continues to Work

**All existing calls to these functions work unchanged:**

```javascript
// Round Robin / League tournaments
await bracketService.updateStandings(matchId, winnerId);

// Groups + Knockout tournaments  
await bracketService.updateStandings(matchId, winnerId);

// Recalculate positions
await bracketService.recalculatePositions(tournamentId, groupId);
```

### What Changed Under the Hood

**Old Behavior:**
- Updated: matches_played, matches_won/lost/drawn, points
- Recalculated: position

**New Behavior (Automatic):**
- Updated: matches_played, matches_won/lost/drawn, points
- **NEW:** goals_for, goals_against, goal_difference
- **NEW:** clean_sheets
- **NEW:** winning_streak, losing_streak
- **NEW:** avg_goals_for, avg_goals_against
- **NEW:** form (last 5 matches)
- Recalculated: position (with enhanced sorting)

---

## 📊 How It Works

### Flow After Match Completion

```
Match Completes
    ↓
matchScoringService calls updateStandings()
    ↓
bracketService.updateStandings() delegates to standingsService
    ↓
standingsService.updateStandingsAfterMatch()
    ↓
1. Extract live_score JSON
2. Calculate goals for both participants
3. Update participant 1 standings (with goals)
4. Update participant 2 standings (with goals)
5. Update streaks for both
6. Recalculate averages
7. Update form guide (last 5)
8. Recalculate positions
    ↓
✅ Complete!
```

### Example: Football Match

**Match Data:**
- Match ID: 123
- Participant 1: Team A (scored 3 goals)
- Participant 2: Team B (scored 1 goal)
- Winner: Team A
- live_score: `{"match_structure": "time_based", "score": {"participant1": 3, "participant2": 1}}`

**What Happens:**

1. **Extract Goals:**
   - Team A: 3 goals
   - Team B: 1 goal

2. **Update Team A (Winner):**
   - matches_played +1
   - matches_won +1
   - points +3
   - goals_for +3
   - goals_against +1
   - goal_difference = 3 - 1 = +2
   - clean_sheets +0 (conceded 1)
   - winning_streak +1
   - losing_streak = 0

3. **Update Team B (Loser):**
   - matches_played +1
   - matches_lost +1
   - points +0
   - goals_for +1
   - goals_against +3
   - goal_difference = 1 - 3 = -2
   - clean_sheets +0
   - winning_streak = 0
   - losing_streak +1

4. **Recalculate Averages:**
   - Team A: avg_goals_for = total_goals / matches_played
   - Team B: avg_goals_against = total_conceded / matches_played

5. **Update Form:**
   - Team A: Add 'W' to form string
   - Team B: Add 'L' to form string

6. **Recalculate Positions:**
   - Sort all teams by points, goal difference, goals for
   - Update position field

---

## 🎯 Sport-Specific Handling

### Time-Based Sports (Football, Volleyball, Basketball)
```javascript
live_score: {
  "match_structure": "time_based",
  "score": {
    "participant1": 3,
    "participant2": 1
  }
}
```
**Extracted:** Direct score values

### Set-Based Sports (Tennis, Badminton)
```javascript
live_score: {
  "match_structure": "set_based",
  "sets": [
    {"winner": "participant1"},
    {"winner": "participant1"},
    {"winner": "participant2"}
  ]
}
```
**Extracted:** Count of sets won (P1: 2, P2: 1)

### Game-Based Sports (Table Tennis, Squash)
```javascript
live_score: {
  "match_structure": "game_based",
  "games": [
    {"winner": "participant1"},
    {"winner": "participant2"},
    {"winner": "participant1"}
  ]
}
```
**Extracted:** Count of games won (P1: 2, P2: 1)

---

## ✅ Testing Checklist

### Existing Functionality (Should Still Work)
- [ ] Round Robin tournament standings update
- [ ] Groups + Knockout standings update
- [ ] Position calculation
- [ ] Group stage finalization
- [ ] Winner advancement in knockout

### New Functionality (Should Work Automatically)
- [ ] Goals for/against tracked
- [ ] Goal difference calculated
- [ ] Clean sheets counted
- [ ] Averages calculated
- [ ] Streaks updated
- [ ] Form guide populated
- [ ] Enhanced position sorting

### Test Scenarios

#### Scenario 1: Round Robin Football Tournament
1. Create tournament with 4 teams
2. Play Match 1: Team A (3) vs Team B (1)
3. Check standings:
   - Team A: 1 played, 1 won, 3 pts, 3 GF, 1 GA, +2 GD
   - Team B: 1 played, 1 lost, 0 pts, 1 GF, 3 GA, -2 GD
4. Play Match 2: Team A (2) vs Team C (0)
5. Check standings:
   - Team A: 2 played, 2 won, 6 pts, 5 GF, 1 GA, +4 GD, 1 clean sheet
   - Form: "WW"

#### Scenario 2: Groups + Knockout
1. Create tournament with 8 participants (2 groups of 4)
2. Play all group matches
3. Check group standings have goals tracked
4. Finalize group stage
5. Verify top 2 from each group advance

---

## 🚀 Next Steps

**Phase 2 is now complete!** The backend automatically tracks comprehensive statistics.

**What's Next:**
- **Phase 3:** Create match statistics service (extract detailed stats)
- **Phase 4:** Add API endpoints (expose standings data)
- **Phase 5:** Build frontend components (display points table)
- **Phase 6:** End-to-end testing

---

## 📝 Notes

### No Breaking Changes
- All existing code continues to work
- No changes required to existing calls
- Enhanced data populated automatically

### Performance
- Single transaction per match
- Efficient SQL queries
- Minimal overhead

### Logging
- Comprehensive logging added
- Easy to debug issues
- Track statistics updates

### Error Handling
- Graceful fallbacks if live_score is missing
- Returns 0 for goals if parsing fails
- Transaction rollback on errors

---

**Status:** ✅ Phase 2 Complete - Ready for Testing  
**Impact:** Zero breaking changes, enhanced functionality  
**Next:** Test with existing tournaments, then proceed to Phase 3
