# Fix: Tied Match (1-1) Standings Issue

## Problem

**Scenario:** Match between q4 and a4
- Set 1: a4 won
- Set 2: q4 won
- Score: 1-1 (tied)
- Referee declares q4 as winner

**Issue:**
- q4 shows: 1 played, 1 won, **0 points** ❌
- a4 shows: 1 played, 0 won, 1 lost, **0 points** ❌

**Expected:**
- q4 should get **3 points** (winner)
- a4 should get **0 points** (loser)

## Root Cause

### Problem 1: Set Comparison Instead of winnerId
**Old Code (Line 597):**
```javascript
const isP1Winner = participant1Sets > participant2Sets;
```

**Issue:** When sets are tied (1-1):
- `participant1Sets = 1`, `participant2Sets = 1`
- `1 > 1` = FALSE
- Wrong winner determined!

### Problem 2: Tied Matches Return 0 Points
**Old Code (Line 90):**
```javascript
if (setsWon > setsLost && setsWon < 3) {
  // Calculate points...
}
```

**Issue:** When `setsWon = 1` and `setsLost = 1`:
- `1 > 1` = FALSE
- Condition not met
- Falls through to "Invalid match" → **0 points**!

## Solution

### Fix 1: Use `winnerId` Instead of Set Comparison

**New Code:**
```javascript
// CRITICAL: Use winnerId to determine winner, not set comparison
if (!winnerId) {
  throw new Error('Cannot update standings: No winner declared');
}

// Determine winner based on winnerId (not set comparison)
const isP1Winner = winnerId === participant1_id;
const winnerSets = isP1Winner ? participant1Sets : participant2Sets;
const loserSets = isP1Winner ? participant2Sets : participant1Sets;

// Validate: Winner should have more or equal sets
if (winnerSets < loserSets) {
  throw new Error('Invalid match result: Winner has fewer sets than loser');
}
```

**Benefits:**
- ✅ Uses `winnerId` as source of truth
- ✅ Handles tied matches (1-1) correctly
- ✅ Validates that winner doesn't have fewer sets than loser

### Fix 2: Handle Tied Sets in Points Calculation

**New Code:**
```javascript
// Case 2: Referee-declared early winner
if (setsWon < 3) {
  const setDifference = setsWon - setsLost;
  
  if (setDifference >= 2) {
    // 2-0: Dominant → 3 pts, 0 pts
    return { winnerPoints: 3, loserPoints: 0 };
  } else if (setDifference === 1) {
    // 2-1: Close → 2 pts, 1 pt
    return { winnerPoints: 2, loserPoints: 1 };
  } else if (setDifference === 0) {
    // 1-1: Tied but referee declares winner → 3 pts, 0 pts
    return { winnerPoints: 3, loserPoints: 0 };
  } else {
    // Winner has fewer sets (unusual) → 3 pts, 0 pts
    return { winnerPoints: 3, loserPoints: 0 };
  }
}
```

**Benefits:**
- ✅ Handles all set differences: 2, 1, 0, and negative
- ✅ Tied matches (1-1) treated as forfeit/injury → 3 points to winner
- ✅ Clear logging for debugging

## Updated Logic Flow

```
Match Complete: q4 vs a4
├─ Sets: q4 = 1, a4 = 1 (tied)
├─ winnerId = q4 (referee declared)
│
├─ Step 1: Validate winnerId exists ✅
├─ Step 2: Determine winner from winnerId (not sets) ✅
│   └─ isP1Winner = (winnerId === participant1_id)
│
├─ Step 3: Extract sets for winner and loser
│   ├─ winnerSets = 1 (q4's sets)
│   └─ loserSets = 1 (a4's sets)
│
├─ Step 4: Validate winner doesn't have fewer sets ✅
│   └─ 1 >= 1 ✅ (valid)
│
├─ Step 5: Calculate FIVB points
│   ├─ setsWon = 1, setsLost = 1
│   ├─ setDifference = 0 (tied)
│   └─ Tied match → Winner: 3 pts, Loser: 0 pts
│
└─ Step 6: Update standings
    ├─ q4: +1 played, +1 won, +3 points ✅
    └─ a4: +1 played, +1 lost, +0 points ✅
```

## Test Cases

### Test Case 1: Tied Match (1-1) - Referee Declares Winner
```
Input:
  winnerId: q4
  q4 sets: 1, a4 sets: 1

Expected Output:
  q4: +3 points (winner on tied sets)
  a4: +0 points (loser)

Reason: Treated as forfeit/injury/disqualification
```

### Test Case 2: Early Winner (2-0)
```
Input:
  winnerId: q4
  q4 sets: 2, a4 sets: 0

Expected Output:
  q4: +3 points (dominant lead)
  a4: +0 points (loser)
```

### Test Case 3: Early Winner (2-1)
```
Input:
  winnerId: q4
  q4 sets: 2, a4 sets: 1

Expected Output:
  q4: +2 points (close match)
  a4: +1 point (loser)
```

### Test Case 4: Complete Match (3-2)
```
Input:
  winnerId: q4
  q4 sets: 3, a4 sets: 2

Expected Output:
  q4: +2 points (close match)
  a4: +1 point (loser)
```

### Test Case 5: No Winner Declared (Should Fail)
```
Input:
  winnerId: null
  q4 sets: 1, a4 sets: 1

Expected Output:
  Error: "Cannot update standings: No winner declared"

Reason: Match is incomplete, standings should not update
```

## When Does 1-1 Happen?

Tied matches (1-1) with referee-declared winner can occur when:

1. **Player Injury:** One player gets injured and cannot continue
2. **Disqualification:** One player is disqualified for misconduct
3. **Forfeit:** One player forfeits the match
4. **Time Limit:** Tournament has time limits and match must end
5. **Technical Issues:** Court/equipment issues prevent continuation

In all these cases, the referee declares a winner even though sets are tied.

## Files Modified

1. **`src/services/standingsService.js`**
   - Line 596-614: Use `winnerId` instead of set comparison
   - Line 88-114: Handle tied sets (setDifference === 0)

## Deployment

After deploying this fix:

1. **New matches:** Will work correctly immediately
2. **Existing matches with 0 points:** Need to be recalculated

### Recalculate Existing Tournament

```bash
curl -X POST https://staging-api.thesportlife.com/api/v1/tournaments/47/recalculate-positions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Note:** This only recalculates positions/form. If the underlying match data shows 0 points, you may need to re-process the specific match by calling `updateStandingsAfterMatch` again.

## Verification

After fix, check q4 and a4 standings:

```bash
curl https://staging-api.thesportlife.com/api/v1/tournaments/47/points-table | \
  jq '.data[] | select(.participant.name == "q4" or .participant.name == "a4")'
```

Expected:
```json
{
  "participant": { "name": "q4" },
  "stats": {
    "played": 1,
    "won": 1,
    "lost": 0,
    "points": 3  // ✅ Should be 3, not 0
  }
},
{
  "participant": { "name": "a4" },
  "stats": {
    "played": 1,
    "won": 0,
    "lost": 1,
    "points": 0
  }
}
```
