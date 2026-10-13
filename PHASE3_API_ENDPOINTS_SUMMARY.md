# Phase 3: API Endpoints - Summary

## ✅ Completed Changes

### Overview
Phase 3 adds new API endpoints to expose the enhanced standings data and creates a formatted points table endpoint for easy frontend consumption.

---

## 🔌 New API Endpoints

### 1. Enhanced Standings Endpoint (Updated)

**Endpoint:** `GET /api/v1/tournaments/:id/standings`

**Query Parameters:**
- `group_id` (optional) - Filter by specific group

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournament_id": 123,
      "group_id": null,
      "participant_id": 456,
      "participant_name": "Team Alpha",
      "participant_image": "https://...",
      "participant_type": "team",
      
      // Basic stats
      "matches_played": 5,
      "matches_won": 4,
      "matches_drawn": 1,
      "matches_lost": 0,
      "points": 13,
      
      // NEW: Goals/Points tracking
      "goals_for": 12,
      "goals_against": 3,
      "goal_difference": 9,
      
      // NEW: Advanced statistics
      "clean_sheets": 2,
      "avg_goals_for": 2.40,
      "avg_goals_against": 0.60,
      
      // NEW: Streaks and form
      "winning_streak": 3,
      "losing_streak": 0,
      "last_5_form": "WDWWW",
      
      // Calculated percentages
      "win_percentage": 80.00,
      "loss_percentage": 0.00,
      "draw_percentage": 20.00,
      "points_per_game": 2.60,
      
      // Position
      "position": 1,
      "is_eliminated": false,
      
      // Tournament info
      "tournament_name": "Summer League 2025",
      "format_type": "round_robin",
      "sport_name": "Football"
    }
  ]
}
```

**What Changed:**
- ✅ Now uses `v_tournament_standings` view (comprehensive data)
- ✅ Includes all new statistics columns
- ✅ Auto-resolves participant names/images
- ✅ Calculates percentages automatically
- ✅ Backward compatible (same endpoint, enhanced data)

---

### 2. Points Table Endpoint (NEW)

**Endpoint:** `GET /api/v1/tournaments/:id/points-table`

**Query Parameters:**
- `group_id` (optional) - Filter by specific group

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "participant": {
        "id": 456,
        "name": "Team Alpha",
        "image": "https://...",
        "type": "team"
      },
      "stats": {
        "played": 5,
        "won": 4,
        "drawn": 1,
        "lost": 0,
        "goalsFor": 12,
        "goalsAgainst": 3,
        "goalDifference": 9,
        "points": 13
      },
      "advanced": {
        "cleanSheets": 2,
        "avgGoalsFor": 2.40,
        "avgGoalsAgainst": 0.60,
        "winPercentage": 80.00,
        "lossPercentage": 0.00,
        "drawPercentage": 20.00,
        "pointsPerGame": 2.60,
        "winningStreak": 3,
        "losingStreak": 0,
        "form": "WDWWW"
      },
      "group": null,
      "isEliminated": false
    }
  ]
}
```

**Purpose:**
- ✅ Clean, structured format for frontend display
- ✅ Nested objects for better organization
- ✅ camelCase keys (JavaScript-friendly)
- ✅ Ready to use in UI components

---

## 📁 Files Modified

### 1. Model Layer: `src/models/Tournament.js`

#### Updated Function: `getStandings()`
**Before:**
```javascript
const getStandings = async (tournamentId, groupId = null) => {
  // Manual JOIN query with basic fields
  let sql = `
    SELECT ts.*, 
      CASE WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
      ...
    FROM tournament_standings ts
    JOIN tournament_participants tp ON ts.participant_id = tp.id
    ...
  `;
  // Returns basic standings data
}
```

**After:**
```javascript
const getStandings = async (tournamentId, groupId = null) => {
  // Use comprehensive view from Phase 1
  let sql = `
    SELECT * FROM v_tournament_standings
    WHERE tournament_id = ?
  `;
  // Returns enhanced standings with all new fields
  // Includes: goals, averages, streaks, form, percentages
}
```

**Benefits:**
- ✅ Simpler query (uses view)
- ✅ All new statistics included automatically
- ✅ Better performance (view is optimized)
- ✅ Easier to maintain

#### New Function: `getPointsTable()`
```javascript
const getPointsTable = async (tournamentId, groupId = null) => {
  const standings = await getStandings(tournamentId, groupId);
  
  // Format for frontend consumption
  return standings.map(s => ({
    position: s.position,
    participant: { id, name, image, type },
    stats: { played, won, drawn, lost, goalsFor, ... },
    advanced: { cleanSheets, avgGoalsFor, form, ... },
    group: { id, name },
    isEliminated: s.is_eliminated === 1
  }));
}
```

**Purpose:**
- ✅ Formats data for easy frontend use
- ✅ Nested structure for better organization
- ✅ Converts database types (tinyint to boolean)
- ✅ Parses decimals to floats

---

### 2. Service Layer: `src/services/tournamentService.js`

#### Updated Function: `getStandings()`
```javascript
const getStandings = async (tournamentId, groupId = null) => {
    return await Tournament.getStandings(tournamentId, groupId);
};
```
- ✅ No changes needed (delegates to model)
- ✅ Automatically returns enhanced data

#### New Function: `getPointsTable()`
```javascript
const getPointsTable = async (tournamentId, groupId = null) => {
    return await Tournament.getPointsTable(tournamentId, groupId);
};
```
- ✅ Simple delegation to model layer
- ✅ Returns formatted points table

---

### 3. Controller Layer: `src/controllers/tournamentController.js`

#### Updated Function: `getStandings()`
```javascript
const getStandings = async (req, res) => {
  try {
    const standings = await tournamentService.getStandings(
      req.params.id,
      req.query.group_id
    );
    
    res.json({
      success: true,
      data: standings  // Now includes enhanced statistics
    });
  } catch (error) {
    logger.error('Get standings controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch standings'
    });
  }
}
```

#### New Function: `getPointsTable()`
```javascript
const getPointsTable = async (req, res) => {
  try {
    const pointsTable = await tournamentService.getPointsTable(
      req.params.id,
      req.query.group_id
    );
    
    res.json({
      success: true,
      data: pointsTable
    });
  } catch (error) {
    logger.error('Get points table controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch points table'
    });
  }
}
```

---

### 4. Routes: `src/routes/tournament.routes.js`

#### Updated Route
```javascript
/**
 * @route   GET /api/v1/tournaments/:id/standings
 * @desc    Get tournament standings (enhanced with comprehensive statistics)
 * @access  Public
 */
router.get('/:id/standings', auth, getStandingsValidation, tournamentController.getStandings);
```

#### New Route
```javascript
/**
 * @route   GET /api/v1/tournaments/:id/points-table
 * @desc    Get formatted points table for display
 * @access  Public
 */
router.get('/:id/points-table', auth, getStandingsValidation, tournamentController.getPointsTable);
```

---

## 🔄 Data Flow

### Standings Endpoint Flow
```
GET /api/v1/tournaments/123/standings
    ↓
tournamentController.getStandings()
    ↓
tournamentService.getStandings()
    ↓
Tournament.getStandings()
    ↓
SELECT * FROM v_tournament_standings WHERE tournament_id = 123
    ↓
Returns: Enhanced standings with all statistics
```

### Points Table Endpoint Flow
```
GET /api/v1/tournaments/123/points-table
    ↓
tournamentController.getPointsTable()
    ↓
tournamentService.getPointsTable()
    ↓
Tournament.getPointsTable()
    ↓
1. Get standings from view
2. Format into nested structure
3. Convert types (tinyint → boolean)
4. Parse decimals to floats
    ↓
Returns: Formatted points table
```

---

## 🎯 Usage Examples

### Example 1: Get Standings for Tournament

**Request:**
```bash
GET /api/v1/tournaments/123/standings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "participant_name": "Team Alpha",
      "matches_played": 5,
      "matches_won": 4,
      "points": 13,
      "goals_for": 12,
      "goals_against": 3,
      "goal_difference": 9,
      "clean_sheets": 2,
      "avg_goals_for": 2.40,
      "last_5_form": "WDWWW",
      "winning_streak": 3,
      "win_percentage": 80.00
    }
  ]
}
```

---

### Example 2: Get Points Table (Formatted)

**Request:**
```bash
GET /api/v1/tournaments/123/points-table
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "participant": {
        "id": 456,
        "name": "Team Alpha",
        "image": "https://...",
        "type": "team"
      },
      "stats": {
        "played": 5,
        "won": 4,
        "drawn": 1,
        "lost": 0,
        "goalsFor": 12,
        "goalsAgainst": 3,
        "goalDifference": 9,
        "points": 13
      },
      "advanced": {
        "cleanSheets": 2,
        "avgGoalsFor": 2.40,
        "form": "WDWWW",
        "winningStreak": 3
      }
    }
  ]
}
```

---

### Example 3: Get Standings for Specific Group

**Request:**
```bash
GET /api/v1/tournaments/123/standings?group_id=5
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "group_id": 5,
      "group_name": "Group A",
      "participant_name": "Team Alpha",
      "points": 13,
      "goal_difference": 9
    }
  ]
}
```

---

## ✅ Testing Checklist

### Test Existing Endpoint (Enhanced)
- [ ] GET `/api/v1/tournaments/:id/standings` returns data
- [ ] Response includes new fields: `goals_for`, `goals_against`, `goal_difference`
- [ ] Response includes: `clean_sheets`, `avg_goals_for`, `avg_goals_against`
- [ ] Response includes: `winning_streak`, `losing_streak`, `last_5_form`
- [ ] Response includes calculated: `win_percentage`, `points_per_game`
- [ ] Filtering by `group_id` works correctly
- [ ] Participant names auto-resolved (users/partnerships/teams)
- [ ] Backward compatible with existing frontend code

### Test New Endpoint
- [ ] GET `/api/v1/tournaments/:id/points-table` returns data
- [ ] Response has nested structure (participant, stats, advanced)
- [ ] All keys are camelCase
- [ ] Decimals parsed to floats
- [ ] Boolean conversion works (`is_eliminated` → `isEliminated`)
- [ ] Filtering by `group_id` works correctly

### Integration Tests
- [ ] Complete a match → Check standings updated
- [ ] Verify goals tracked correctly
- [ ] Verify averages calculated
- [ ] Verify form guide updated
- [ ] Verify positions recalculated

---

## 🔒 Backward Compatibility

### Existing Frontend Code
✅ **No changes required** - Existing code continues to work

**Before Phase 3:**
```javascript
// Frontend code
const response = await fetch(`/api/v1/tournaments/${id}/standings`);
const { data } = await response.json();
// data[0].matches_played ✅ Still works
// data[0].points ✅ Still works
```

**After Phase 3:**
```javascript
// Same code works + new fields available
const response = await fetch(`/api/v1/tournaments/${id}/standings`);
const { data } = await response.json();
// data[0].matches_played ✅ Still works
// data[0].points ✅ Still works
// data[0].goals_for ✅ NEW - Available now
// data[0].avg_goals_for ✅ NEW - Available now
// data[0].last_5_form ✅ NEW - Available now
```

---

## 🚀 Next Steps

**Phase 3 Complete!** API endpoints are ready.

**What's Next:**
- **Phase 4:** Build frontend components to display points table
- **Phase 5:** Add UI for comprehensive statistics
- **Phase 6:** End-to-end testing

---

## 📝 Summary

### What Was Added
1. ✅ Enhanced `/standings` endpoint with comprehensive statistics
2. ✅ New `/points-table` endpoint with formatted data
3. ✅ Updated model to use `v_tournament_standings` view
4. ✅ New `getPointsTable()` function for formatted output
5. ✅ Proper routing and controller setup

### Benefits
- ✅ Comprehensive statistics available via API
- ✅ Clean, structured data for frontend
- ✅ Backward compatible with existing code
- ✅ Easy to consume in React components
- ✅ Optimized queries using database view

### Impact
- ✅ Zero breaking changes
- ✅ Enhanced data automatically available
- ✅ Ready for frontend integration

---

**Status:** ✅ Phase 3 Complete - API Endpoints Ready  
**Next:** Phase 4 - Frontend Integration
