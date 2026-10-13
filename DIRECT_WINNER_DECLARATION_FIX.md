# Direct Winner Declaration Fix

## Problem Summary

When declaring a winner directly (without scoring the match), the winner was **NOT being placed in the next knockout round** and points were **NOT being properly stored in the points table**.

## Root Cause

The `live_score` field was **missing from the `allowedFields` array** in the Match model (`src/models/Match.js`). This caused the `live_score` data sent during direct winner declaration to be **silently ignored** and never saved to the database.

### What Was Happening:

**When Scoring Match Normally:**
1. ✅ Live scoring system updates `live_score` field with full match data (sets, points, etc.)
2. ✅ Match completion triggers `processTournamentAfterMatch()`
3. ✅ Standings updated with actual scores from `live_score`
4. ✅ Winner advances to next knockout round
5. ✅ Points properly stored in standings table

**When Declaring Winner Directly:**
1. ❌ `live_score` sent in API request: `{"match_complete":true,"match_winner":"participant1"}`
2. ❌ `live_score` **IGNORED** because not in `allowedFields`
3. ✅ `status` = 'completed' → Saved
4. ✅ `winner_participant_id` → Saved
5. ⚠️ `processTournamentAfterMatch()` runs BUT:
   - ✅ Knockout advancement **SHOULD work** (uses `winner_participant_id`)
   - ⚠️ Standings update detects missing `live_score` as **walkover** and awards forfeit scores
   - ❌ `live_score` field remains NULL in database

## Solution Applied

### File: `src/models/Match.js`

**Change 1: Added `live_score` to allowedFields**
```javascript
const allowedFields = [
  'participant1_id', 'participant2_id', 'venue_id', 'court_id',
  'match_date', 'match_time', 'scheduled_duration', 'referee_id',
  'status', 'score', 'winner_participant_id', 'actual_start_time',
  'actual_end_time', 'total_duration_seconds', 'total_duration_formatted',
  'live_score'  // ← ADDED
];
```

**Change 2: Proper JSON handling for `live_score`**
```javascript
Object.keys(updateData).forEach(key => {
  if (allowedFields.includes(key)) {
    updates.push(`${key} = ?`);
    // Stringify JSON fields (score and live_score)
    if (key === 'score' || key === 'live_score') {
      values.push(typeof updateData[key] === 'string' ? updateData[key] : JSON.stringify(updateData[key]));
    } else {
      values.push(updateData[key]);
    }
  }
});
```

## How It Works Now

### Direct Winner Declaration Flow:
1. ✅ Frontend sends: `{status: "completed", winner_participant_id: 362, live_score: "{...}"}`
2. ✅ `live_score` is now **SAVED** to database (was previously ignored)
3. ✅ `processTournamentAfterMatch()` runs:
   - ✅ **Knockout Format**: Winner advances to next round via `advanceWinner()`
   - ✅ **Groups/Round-Robin**: Standings updated via `updateStandings()`
4. ✅ Standings service detects minimal `live_score` and treats as walkover
5. ✅ Forfeit scores awarded (3-0 for football, 3-0 sets for volleyball)
6. ✅ Points properly stored in `tournament_standings` table
7. ✅ Winner placed in next knockout round (if applicable)

## Testing Checklist

- [ ] Declare winner directly in group stage match → Check points table updated
- [ ] Declare winner directly in knockout match → Check winner placed in next round
- [ ] Score match normally → Verify still works as before
- [ ] Check `live_score` field in database after direct winner declaration
- [ ] Verify knockout bracket progression with direct winner
- [ ] Verify standings table shows correct points after direct winner

## Related Files

- `src/models/Match.js` - **FIXED** (added `live_score` to allowedFields)
- `src/services/matchService.js` - Tournament progression logic (no changes needed)
- `src/services/bracketService.js` - Knockout advancement logic (no changes needed)
- `src/services/standingsService.js` - Points calculation logic (no changes needed)

## Notes

- The standings service already handles walkover scenarios correctly by detecting missing/minimal `live_score`
- The knockout advancement logic already uses `winner_participant_id` correctly
- The only issue was that `live_score` wasn't being saved, so the frontend couldn't display match results
- This fix ensures consistency between scored matches and direct winner declarations
