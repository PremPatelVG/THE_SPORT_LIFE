# Bulk Scheduling Flow - How Matches Are Stored

## Overview
When you use the Bulk Schedule feature, the system automatically schedules multiple unscheduled matches based on your configuration parameters.

## Current Data Flow

### 1. **Frontend: BulkSchedulingModal Component**
Location: `sportlife-frontend/src/components/BulkSchedulingModal.jsx`

#### Step 1: Generate Schedule Preview
When you click "Generate Schedule", the modal:
- Filters matches that need scheduling (lines 30-34):
  ```javascript
  const unscheduledMatches = safeMatches.filter(m => 
    !m.match_date &&           // No date assigned yet
    m.participant1_id &&       // Has participant 1
    m.participant2_id          // Has participant 2
  );
  ```
  
- Creates a schedule array with calculated dates/times (lines 41-69)
- Shows you a preview grouped by date

#### Step 2: Save Schedule
When you click "Confirm & Schedule All" (lines 75-99):
- Prepares data for each match:
  ```javascript
  {
    match_id: item.match_id,
    match_date: item.match_date.toISOString(),  // ISO format date
    venue_id: item.venue_id,                     // Optional venue
    duration: item.duration,                     // Match duration in minutes
    status: 'scheduled'                          // Sets status to scheduled
  }
  ```

### 2. **Frontend: TournamentDetail Page**
Location: `sportlife-frontend/src/pages/TournamentDetail.jsx`

The `handleBulkSchedule` function (lines 175-186):
```javascript
const handleBulkSchedule = async (scheduleData) => {
  try {
    // Update multiple matches
    for (const item of scheduleData) {
      await updateMatchScore(item.match_id, item);  // Updates each match
    }
    // Refresh matches
    fetchMatchesData();
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to schedule matches');
  }
};
```

### 3. **Frontend: Tournament Service**
Location: `sportlife-frontend/src/services/tournamentService.js`

The `updateMatchScore` function (lines 116-119):
```javascript
export const updateMatchScore = async (matchId, data) => {
  const response = await api.put(`/matches/${matchId}`, data);
  return response.data.data;
};
```

**API Call:** `PUT /api/v1/matches/:id`

### 4. **Backend: Match Controller**
Location: `sportlife-backend/src/controllers/matchController.js`

Receives the update request and calls the service (lines 90-110).

### 5. **Backend: Match Service**
Location: `sportlife-backend/src/services/matchService.js`

The `updateMatch` function (lines 51-92):
- Validates the match exists
- Checks user is tournament organizer
- Prevents updates to completed matches
- **Validates court availability** if scheduling
- Updates the match in database

## What Gets Stored in Database

Based on your API response, when bulk scheduling is saved, each match record gets updated with:

### Fields Updated:
```javascript
{
  match_date: "2025-10-28T09:00:00.000Z",  // ISO timestamp
  match_time: "09:00",                      // Time string (if separated)
  venue_id: 1,                              // Venue ID (if selected)
  status: "scheduled",                      // Status changes to 'scheduled'
  estimated_duration: 60                    // Duration in minutes
}
```

### Current Match Structure (from your API):
```json
{
  "id": 12,
  "tournament_id": 3,
  "round_number": 1,
  "match_number": 1,
  "participant1_id": 5,
  "participant2_id": 7,
  "venue_id": null,          // ← Gets updated
  "match_date": null,        // ← Gets updated
  "match_time": null,        // ← Gets updated
  "status": "scheduled",     // ← Already scheduled
  "estimated_duration": 90   // ← Can be updated
}
```

## Issue Identified

### Problem:
The current implementation uses `updateMatchScore` function name, but it's actually updating match scheduling information, not scores. This is misleading.

### Current Behavior:
- ✅ Matches ARE being updated in the database
- ✅ Each match is updated individually in a loop
- ⚠️ Function name is confusing (`updateMatchScore` for scheduling)
- ⚠️ No batch update endpoint (updates happen one-by-one)

## Recommendations

### 1. **Rename Function for Clarity**
Change `updateMatchScore` to `updateMatch` in the service:

```javascript
// tournamentService.js
export const updateMatch = async (matchId, data) => {
  const response = await api.put(`/matches/${matchId}`, data);
  return response.data.data;
};
```

### 2. **Create Bulk Update Endpoint (Optional)**
For better performance, create a dedicated bulk scheduling endpoint:

**Frontend:**
```javascript
export const bulkScheduleMatches = async (scheduleData) => {
  const response = await api.post('/matches/bulk-schedule', { schedules: scheduleData });
  return response.data.data;
};
```

**Backend:**
```javascript
// POST /api/v1/matches/bulk-schedule
const bulkSchedule = async (req, res) => {
  const { schedules } = req.body;
  // Update all matches in a transaction
  const results = await Match.bulkUpdate(schedules);
  res.json({ success: true, data: results });
};
```

### 3. **Add Progress Feedback**
Show progress when scheduling multiple matches:

```javascript
const handleBulkSchedule = async (scheduleData) => {
  try {
    for (let i = 0; i < scheduleData.length; i++) {
      await updateMatch(scheduleData[i].match_id, scheduleData[i]);
      // Show progress: "Scheduling match 3 of 10..."
      toast.loading(`Scheduling match ${i + 1} of ${scheduleData.length}...`);
    }
    toast.success('All matches scheduled!');
    fetchMatchesData();
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to schedule matches');
  }
};
```

## Summary

**How matches are stored:**
1. User configures bulk schedule parameters
2. System generates schedule preview with calculated dates/times
3. User confirms
4. Frontend loops through each match and calls `PUT /api/v1/matches/:id`
5. Backend validates and updates each match record in the database
6. Match records get `match_date`, `match_time`, `venue_id`, and `status` updated
7. Frontend refreshes to show updated matches

The matches **ARE being stored** in the database - the system is working correctly, just using a confusingly-named function (`updateMatchScore` instead of `updateMatch`).
