# My Tournaments API Fix

## 🐛 Issue

The `/api/v1/tournaments/my/tournaments` endpoint was only returning **one tournament** instead of all tournaments where the user is an organizer or participant.

---

## 🔍 Root Cause

**Backend (`Tournament.js` model, line 597):**
```javascript
// WRONG - This was extracting only the first tournament
const tournaments = result[0] || result;
```

This line was trying to handle different result formats but ended up returning only the first tournament object instead of the array of all tournaments.

---

## ✅ Fix Applied

### Backend Fix

**File**: `sportlife-backend/src/models/Tournament.js`

**Before:**
```javascript
const result = await query(sql, [userId, userId, userId]);
const tournaments = result[0] || result;

if (Array.isArray(tournaments)) {
  tournaments.forEach(tournament => {
    // Parse rules...
  });
}

return tournaments;
```

**After:**
```javascript
const tournaments = await query(sql, [userId, userId, userId]);

// Ensure we have an array
const tournamentList = Array.isArray(tournaments) ? tournaments : [];

// Parse rules JSON for each tournament
tournamentList.forEach(tournament => {
  if (tournament.rules) {
    try {
      if (typeof tournament.rules === 'string') {
        tournament.rules = JSON.parse(tournament.rules);
      }
    } catch (error) {
      logger.error('Error parsing tournament rules:', error);
      tournament.rules = {};
    }
  }
});

return tournamentList;
```

### Frontend Fixes

#### 1. MyTournaments.jsx

**Removed debug console.log:**
```javascript
// REMOVED
console.log("dev test", myTournaments)
```

**Simplified array handling:**
```javascript
// Before
const tournamentsArray = Array.isArray(myTournaments)
  ? myTournaments
  : myTournaments
    ? [myTournaments] // wrap single object into array
    : [];

// After - Cleaner since backend always returns array now
const tournamentsArray = Array.isArray(myTournaments) ? myTournaments : [];
```

#### 2. MyRegistrations.jsx

**Added explicit array check:**
```javascript
// Before
const filteredTournaments = myTournaments?.filter(tournament => {
  // filtering logic...
});

// After - More explicit and safe
const tournamentsArray = Array.isArray(myTournaments) ? myTournaments : [];
const filteredTournaments = tournamentsArray.filter(tournament => {
  // filtering logic...
});
```

---

## 📊 API Response

### Before Fix
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tournament 1",
    // ... only ONE tournament
  }
}
```

### After Fix
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tournament 1",
      "user_role": "organizer",
      "participant_count": 10
    },
    {
      "id": 2,
      "name": "Tournament 2",
      "user_role": "participant",
      "participant_count": 15
    },
    {
      "id": 3,
      "name": "Tournament 3",
      "user_role": "organizer",
      "participant_count": 8
    }
    // ... ALL tournaments
  ]
}
```

---

## 🧪 Testing

### Backend Test
```bash
# Test the API
curl -X GET "http://localhost:5000/api/v1/tournaments/my/tournaments" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return array of all tournaments where user is organizer or participant
```

### Frontend Test
1. ✅ Navigate to "My Tournaments" page
2. ✅ Should see all tournaments (not just one)
3. ✅ Check "Organizer" tab - shows tournaments you created
4. ✅ Check "Participant" tab - shows tournaments you joined
5. ✅ No console errors

---

## 📁 Files Modified

### Backend
- `sportlife-backend/src/models/Tournament.js` (lines 596-615)

### Frontend
- `sportlife-frontend/src/pages/MyTournaments.jsx` (lines 23-71)
- `sportlife-frontend/src/pages/MyRegistrations.jsx` (lines 96-108)

---

## 🚀 Deployment

1. **Backend changes require restart:**
   ```bash
   cd sportlife-backend
   pm2 restart sportlife-backend
   # or
   npm start
   ```

2. **Frontend changes:**
   - Hot reload will pick up changes automatically
   - No restart needed

---

## ✅ Verification

After restarting the backend, verify:

1. ✅ API returns array of tournaments
2. ✅ All tournaments where user is organizer are included
3. ✅ All tournaments where user is participant are included
4. ✅ No duplicate tournaments
5. ✅ Frontend displays all tournaments correctly
6. ✅ Filtering works (organizer/participant tabs)
7. ✅ No console errors

---

## 📊 Query Logic

The SQL query returns tournaments where:
```sql
WHERE t.deleted_at IS NULL
  AND (
    t.organizer_id = userId          -- User is organizer
    OR 
    tp.user_id = userId               -- User is participant
  )
```

With `SELECT DISTINCT` to avoid duplicates if user is both organizer and participant.

---

**Status**: ✅ **FIXED**

The API now correctly returns all tournaments for the user!
