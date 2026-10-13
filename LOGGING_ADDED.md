# Comprehensive Logging Added for Winner Declaration

## Files Modified

### 1. `src/services/matchService.js`
- **updateMatch()** - Added detailed logs when match is being updated
- **processTournamentAfterMatch()** - Added comprehensive logs for tournament progression

### 2. `src/services/bracketService.js`
- **advanceWinner()** - Added extensive logs for knockout advancement tracking

## What to Look For in Logs

When you declare a winner directly, you should see this flow in your backend logs:

```
========== MATCH UPDATE START ==========
Match ID: 1021
Update Data: {
  "status": "completed",
  "winner_participant_id": 343,
  "live_score": "{\"match_complete\":true,\"match_winner\":\"participant1\"}"
}
Previous Status: scheduled
New Status: completed
✅ Match updated in database: 1021

🚀 [MATCH UPDATE] Match 1021 completed - processing tournament progression
Tournament ID: 127
Winner Participant ID: 343
Live Score Data: {"match_complete":true,"match_winner":"participant1"}

📞 Calling processTournamentAfterMatch(tournamentId: 127, matchId: 1021, winnerId: 343)

========== PROCESS TOURNAMENT AFTER MATCH ==========
🔔 [MATCH SERVICE] Processing tournament progression for match 1021
Tournament ID: 127
Winner ID: 343
Match Details: {
  id: 1021,
  tournament_id: 127,
  round_number: 3,
  round_name: 'Knockout - Semi Finals',
  participant1_id: 343,
  participant2_id: 339,
  winner_participant_id: 343,
  group_id: null,
  depends_on_match1_id: null,
  depends_on_match2_id: null
}
📋 [MATCH SERVICE] Tournament 127 format: knockout

🏆 [MATCH SERVICE] KNOCKOUT FORMAT - Advancing winner to next round
Calling bracketService.advanceWinner(matchId: 1021, winnerId: 343)

========== ADVANCE WINNER START ==========
Match ID: 1021
Winner ID: 343
✅ Match found: {
  id: 1021,
  tournament_id: 127,
  round_number: 3,
  round_name: 'Knockout - Semi Finals',
  participant1_id: 343,
  participant2_id: 339,
  winner_participant_id: 343
}
🏆 Advancing winner 343 from match 1021

🔍 Searching for dependent matches...
Query: SELECT * FROM matches WHERE tournament_id = 127 AND (depends_on_match1_id = 1021 OR depends_on_match2_id = 1021)
🔍 Found 1 dependent matches

📋 Processing 1 dependent match(es)...

--- Dependent Match 1/1 ---
Next Match ID: 1023
Next Match Round: Knockout - Final
Current Participants: P1=null, P2=null
Dependencies: depends_on_match1_id=1021, depends_on_match2_id=1022
🔧 Checking match 1023: depends_on_match1_id=1021, depends_on_match2_id=1022
🔧 After conversion: match1Dep=1021, match2Dep=1022, matchIdNum=1021
🎯 Match! Setting field to participant1_id
Current value of participant1_id: null

💾 Executing UPDATE: UPDATE matches SET participant1_id = 343 WHERE id = 1023
✅ Successfully advanced winner 343 from match 1021 to match 1023 as participant1_id
✅ Verification - Match 1023 now has: P1=343, P2=null

========== ADVANCE WINNER END (SUCCESS) ==========

✅ [MATCH SERVICE] advanceWinner completed successfully
✅ processTournamentAfterMatch completed successfully
========== MATCH UPDATE END ==========
```

## Key Points to Check

1. **Match Update** - Verify `live_score` is being saved
2. **Tournament Format** - Should show "knockout" for knockout matches
3. **Dependent Matches Found** - Should find the Final match (1023)
4. **Field Determination** - Should correctly identify which field to update (participant1_id or participant2_id)
5. **Database Update** - Should execute UPDATE query successfully
6. **Verification** - Should show the Final match now has the winner placed

## How to Test

1. **Restart backend server** (if not already done)
2. **Declare a winner** for match 1021 or create a new test match
3. **Check backend logs** (console or log file)
4. **Share the complete log output** from "MATCH UPDATE START" to "MATCH UPDATE END"

## Expected Behavior

After declaring winner:
- ✅ Winner should be placed in Final match (1023)
- ✅ Points should be updated in standings table
- ✅ Match status should be "completed"
- ✅ `live_score` should be saved in database

## Troubleshooting

If winner is NOT placed:
- Check if `depends_on_match1_id` and `depends_on_match2_id` are set correctly in Final match
- Check if tournament format is "knockout" (not "groups_knockout")
- Look for any ERROR messages in the logs
- Verify the match IDs match correctly
