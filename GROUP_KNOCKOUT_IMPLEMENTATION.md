# GROUP_KNOCKOUT Tournament Format - Professional Implementation

## Overview

This document describes the complete implementation of the **GROUP_KNOCKOUT** tournament format following **STANDARD PROFESSIONAL RULES**.

## Format Structure

```
1. GROUP STAGE (Round Robin)
   ↓
2. KNOCKOUT STAGE (Single Elimination)
```

---

## GROUP STAGE RULES

### Group Distribution

Teams are divided into groups equally:

**Example:**
- 12 teams, 2 groups → Group A: 6 teams, Group B: 6 teams
- 16 teams, 4 groups → Each group: 4 teams

### Round Robin Format

Every team plays **once** against every other team in the same group.

**Match Formula:**
```
matches = (n × (n - 1)) / 2
```

Where `n` = number of teams in group

**Examples:**
- 4 teams = 6 matches
- 6 teams = 15 matches
- 8 teams = 28 matches

### Professional Round Scheduling

Uses **Circle Method** (Round Robin Algorithm):

**For EVEN group size:**
```
rounds = n - 1
matches_per_round = n / 2
```

**For ODD group size:**
```
Automatically adds BYE team
rounds = n
```

**Example (6 teams):**
- 5 rounds
- 3 matches per round
- Each team plays once per round

### Match Generation

✅ **CORRECT Implementation:**
- Matches organized into proper rounds
- Each team plays once per round
- No duplicate matches
- No reverse duplicates (A vs B = B vs A)
- No self-matches

❌ **INVALID:**
- A1 vs A1 (self match)
- A2 vs A1 if A1 vs A2 exists (reverse duplicate)

---

## QUALIFICATION RULES

### Dynamic Qualification (PROFESSIONAL STANDARD)

**Rule:**
```javascript
if (group_size <= 8) {
  qualifiers = top 2 teams
} else {
  qualifiers = top 4 teams
}
```

**Examples:**
- 6 teams/group → Top 2 qualify
- 10 teams/group → Top 4 qualify
- 16 teams/group → Top 4 qualify

---

## KNOCKOUT STAGE RULES

### Bracket Structure

Knockout stage **ALWAYS** follows **POWER OF TWO** structure:

**Valid sizes:** 2, 4, 8, 16, 32, 64

**If qualified teams ≠ power of 2:**
- Automatically generate BYEs for highest-ranked teams

### Round Naming (PROFESSIONAL STANDARDS)

```
2 teams   → Final
4 teams   → Semi Finals → Final
8 teams   → Quarter Finals → Semi Finals → Final
16 teams  → Pre Quarter Finals → Quarter Finals → Semi Finals → Final
32 teams  → Round of 32 → Pre Quarter Finals → Quarter Finals → Semi Finals → Final
64 teams  → Round of 64 → Round of 32 → Pre Quarter Finals → Quarter Finals → Semi Finals → Final
```

### Match Count Formula

```
knockout_matches = qualified_teams - 1
```

**Examples:**
- 4 qualified teams = 3 matches
- 8 qualified teams = 7 matches
- 16 qualified teams = 15 matches

---

## CROSS-GROUP KNOCKOUT PAIRINGS

### 2 Groups (STANDARD)

Prevents same-group rematches:

```
Semi Final 1: Group A Rank 1 vs Group B Rank 2
Semi Final 2: Group B Rank 1 vs Group A Rank 2
```

### 4 Groups

```
Quarter Final 1: A1 vs B2
Quarter Final 2: B1 vs A2
Quarter Final 3: C1 vs D2
Quarter Final 4: D1 vs C2
```

### Multiple Groups

Uses balanced cross-group mapping to avoid:
- Same-group first knockout matches
- Duplicate pairings

---

## VALIDATION RULES

Before creating any match:

1. ✅ **Prevent self match:** `team1 != team2`
2. ✅ **Prevent duplicate pairs:** Sort pair before saving
3. ✅ **Prevent reverse duplicates:** A1 vs A2 = A2 vs A1
4. ✅ **One match per round:** Each team plays only once per round
5. ✅ **Match count validation:** Total matches = expected formula

---

## IMPLEMENTATION EXAMPLES

### Example 1: 12 Teams, 2 Groups

**Setup:**
- Group A: 6 teams
- Group B: 6 teams

**Group Stage:**
- Each group: 15 matches (round robin)
- Total: 30 group matches
- Rounds: 5 rounds per group

**Qualification:**
- Top 2 from each group (group size ≤ 8)
- Total qualified: 4 teams

**Knockout Stage:**
```
Semi Finals:
  Match 1: A1 vs B2
  Match 2: B1 vs A2

Final:
  Winner SF1 vs Winner SF2
```

**Total Matches:** 33 (30 group + 3 knockout)

---

### Example 2: 32 Teams, 4 Groups

**Setup:**
- Each group: 8 teams

**Group Stage:**
- Each group: 28 matches (round robin)
- Total: 112 group matches
- Rounds: 7 rounds per group

**Qualification:**
- Top 2 from each group (group size ≤ 8)
- Total qualified: 8 teams

**Knockout Stage:**
```
Quarter Finals: 4 matches
Semi Finals: 2 matches
Final: 1 match
```

**Total Matches:** 119 (112 group + 7 knockout)

---

### Example 3: 16 Qualified Teams

**Knockout Bracket:**
```
Pre Quarter Finals: 8 matches (16 teams)
Quarter Finals: 4 matches (8 teams)
Semi Finals: 2 matches (4 teams)
Final: 1 match (2 teams)
```

**Total Knockout Matches:** 15

---

## DATABASE STRUCTURE

### Matches Table

**Group Stage Matches:**
```sql
tournament_id: INT
group_id: INT (NOT NULL)
round_number: INT (1, 2, 3, ... based on round robin rounds)
match_number: INT (sequential)
round_name: VARCHAR (e.g., "Group A - Round 1")
participant1_id: INT
participant2_id: INT
```

**Knockout Stage Matches:**
```sql
tournament_id: INT
group_id: NULL
round_number: INT (continues after group rounds)
match_number: INT (sequential)
round_name: VARCHAR (e.g., "Knockout - Semi Finals")
participant1_id: INT (NULL until group stage complete)
participant2_id: INT (NULL until group stage complete)
depends_on_match1_id: INT (for round 2+)
depends_on_match2_id: INT (for round 2+)
```

---

## API WORKFLOW

### 1. Generate Tournament

```javascript
POST /api/v1/tournaments/:id/generate-brackets

Body: {
  scheduleConfig: {
    start_date: "2024-01-01",
    start_time: "09:00",
    matches_per_day: 4,
    match_duration: 60,
    break_between_matches: 15,
    group_size: 4  // Optional, default: 4
  }
}

Response: {
  format: 'groups_knockout',
  groups: 4,
  group_stage_rounds: 3,
  group_stage_matches: 24,
  qualifiers_per_group: 2,
  total_qualifiers: 8,
  knockout_bracket_size: 8,
  knockout_byes: 0,
  knockout_stage_matches: 7,
  total_matches: 31,
  participants: 16
}
```

### 2. Play Group Stage Matches

Teams play all group stage matches. Standings are automatically updated.

### 3. Check Group Stage Status

```javascript
GET /api/v1/tournaments/:id/group-stage-status

Response: {
  isComplete: true/false,
  message: "Group stage is complete. Ready to finalize."
}
```

### 4. Finalize Group Stage

```javascript
POST /api/v1/tournaments/:id/finalize-groups

Response: {
  success: true,
  groups: 4,
  qualifiersPerGroup: 2,
  totalQualifiers: 8,
  knockoutMatchesPopulated: 4,
  qualifierDetails: [...],
  pairings: [...]
}
```

This automatically:
- Determines qualifiers based on group size
- Generates professional cross-group pairings
- Populates first knockout round matches

### 5. Play Knockout Matches

Winners automatically advance to next rounds via dependency tracking.

---

## KEY FEATURES

✅ **Dynamic Group Support:** Any number of teams, groups, and group sizes
✅ **Professional Round Robin:** Circle method with proper round scheduling
✅ **Dynamic Qualification:** Automatic based on group size (top 2 or top 4)
✅ **Cross-Group Pairings:** Prevents same-group rematches early
✅ **Automatic BYEs:** For non-power-of-2 knockout brackets
✅ **Professional Naming:** Standard tournament round names
✅ **Dependency Tracking:** Winners automatically advance
✅ **Schedule Support:** Automatic date/time calculation
✅ **Validation:** Prevents duplicates, self-matches, and invalid pairings

---

## TECHNICAL IMPLEMENTATION

### Files Modified

- `src/services/bracketService.js`
  - `generateGroupsKnockoutBracket()` - Main generation function
  - `generateRoundRobinRounds()` - Circle method implementation
  - `calculateQualificationPerGroup()` - Dynamic qualification rule
  - `generateCrossGroupPairings()` - Professional cross-group pairings
  - `finalizeGroupStage()` - Group stage completion handler
  - `getRoundName()` - Professional round naming
  - `getRoundNameByParticipants()` - Participant-based naming

### Algorithm: Circle Method (Round Robin)

```javascript
// Fix one team (position 0), rotate others
for (round = 0; round < n-1; round++) {
  for (match = 0; match < n/2; match++) {
    if (match === 0) {
      // First match: fixed vs rotating
      home = 0
      away = (round === 0) ? n-1 : round
    } else {
      // Other matches: symmetric pairing
      home = (round + match) % (n-1)
      away = (round + n - match - 1) % (n-1)
    }
    
    // Create match: teams[home] vs teams[away]
  }
}
```

This ensures:
- Each team plays once per round
- Balanced schedule
- No duplicate matches
- Professional tournament structure

---

## TESTING SCENARIOS

### Test Case 1: Small Tournament
- 8 teams, 2 groups (4 each)
- Expected: 6 group matches per group, top 2 qualify, 4-team knockout

### Test Case 2: Medium Tournament
- 16 teams, 4 groups (4 each)
- Expected: 6 group matches per group, top 2 qualify, 8-team knockout

### Test Case 3: Large Tournament
- 32 teams, 4 groups (8 each)
- Expected: 28 group matches per group, top 2 qualify, 8-team knockout

### Test Case 4: Large Groups
- 40 teams, 4 groups (10 each)
- Expected: 45 group matches per group, top 4 qualify, 16-team knockout

---

## CONCLUSION

This implementation follows **STANDARD PROFESSIONAL TOURNAMENT RULES** for GROUP_KNOCKOUT format, ensuring:

- ✅ Proper round robin scheduling within groups
- ✅ Dynamic qualification based on group size
- ✅ Professional cross-group knockout pairings
- ✅ Correct round naming and numbering
- ✅ Automatic progression and dependency tracking
- ✅ Validation and error prevention

The system is fully dynamic and supports any combination of teams, groups, and group sizes while maintaining professional tournament standards.
