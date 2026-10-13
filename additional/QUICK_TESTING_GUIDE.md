# 🧪 Quick Testing Guide - All Sports

## 🚀 Quick Start

```bash
# 1. Restart backend
cd sportlife-backend
npm start

# 2. Test each sport using the examples below
```

---

## 📝 Test Templates by Sport

### ⚽ FOOTBALL

```bash
# Start match
POST /api/v1/scoring/:matchId/start

# Record goal
POST /api/v1/scoring/:matchId/event
{
  "event_type": "goal",
  "participant_id": 1,
  "event_data": {
    "scoring_team": "team_a",
    "player_id": 10,
    "minute": 23,
    "goal_type": "open_play",
    "assist_by": 7
  }
}

# Yellow card
{
  "event_type": "yellow_card",
  "participant_id": 2,
  "event_data": {
    "team": "team_b",
    "player_id": 5,
    "minute": 34,
    "reason": "Tactical foul"
  }
}

# Half time
{
  "event_type": "half_time",
  "participant_id": 1,
  "event_data": {
    "score": "1-0",
    "stoppage_time": 2
  }
}
```

---

### 🎾 TENNIS

```bash
# Point won
POST /api/v1/scoring/:matchId/event
{
  "event_type": "point_won",
  "participant_id": 1,
  "event_data": {
    "scoring_player": "player_a",
    "point_type": "ace"
  }
}

# At 40-40, system auto-detects deuce
# Continue with point_won to trigger advantage

# Manual tiebreak start (if needed)
{
  "event_type": "tiebreak_start",
  "participant_id": 1,
  "event_data": {
    "set_number": 1,
    "games_score": "6-6"
  }
}
```

---

### 🏸 BADMINTON

```bash
# Rally won
POST /api/v1/scoring/:matchId/event
{
  "event_type": "rally_won",
  "participant_id": 1,
  "event_data": {
    "scoring_player": "player_a",
    "winning_shot": "smash",
    "current_score": "5-3"
  }
}

# Service ace
{
  "event_type": "service_ace",
  "participant_id": 1,
  "event_data": {
    "scoring_player": "player_a",
    "current_score": "10-8"
  }
}

# System auto-triggers interval at 11 points
```

---

### 🥒 PICKLEBALL

```bash
# Point scored (only serving team)
POST /api/v1/scoring/:matchId/event
{
  "event_type": "point_scored",
  "participant_id": 1,
  "event_data": {
    "scoring_team": "team_a",
    "point_type": "rally",
    "current_score": "5-3-1"
  }
}

# Side out (when receiving team wins)
# System auto-handles this in point_scored
# Or manual:
{
  "event_type": "side_out",
  "participant_id": 2,
  "event_data": {
    "new_serving_team": "team_b",
    "current_score": "5-3-1"
  }
}
```

---

### 🎾 PADEL

```bash
# Point won
POST /api/v1/scoring/:matchId/event
{
  "event_type": "point_won",
  "participant_id": 1,
  "event_data": {
    "scoring_team": "team_a",
    "team_id": "team_a",
    "player_id": 1,
    "point_type": "winner"
  }
}

# Deuce (manual if needed)
{
  "event_type": "deuce",
  "participant_id": 1,
  "event_data": {
    "score": "40-40",
    "set_number": 1,
    "game_number": 5
  }
}

# Advantage
{
  "event_type": "advantage",
  "participant_id": 1,
  "event_data": {
    "team_id": "team_a",
    "set_number": 1,
    "game_number": 5
  }
}
```

---

### 🏓 TABLE TENNIS

```bash
# Point scored
POST /api/v1/scoring/:matchId/event
{
  "event_type": "point_scored",
  "participant_id": 1,
  "event_data": {
    "scoring_player": "player_a",
    "point_type": "rally",
    "current_score": "7-5"
  }
}

# System auto-handles service change every 2 points
# At 10-10, auto-switches to serve every point

# Manual change ends (in deciding game at 5 points)
{
  "event_type": "change_ends",
  "participant_id": 1,
  "event_data": {
    "game_number": 5,
    "score": "3-2"
  }
}

# Expedite system
{
  "event_type": "expedite_enable",
  "participant_id": 1,
  "event_data": {
    "game_number": 3,
    "reason": "Time limit exceeded"
  }
}
```

---

### 🎯 SQUASH

```bash
# Point scored (PAR scoring)
POST /api/v1/scoring/:matchId/event
{
  "event_type": "point_scored",
  "participant_id": 1,
  "event_data": {
    "scoring_player": "player_a",
    "point_type": "rally",
    "current_score": "6-4"
  }
}

# Let called (replay point)
{
  "event_type": "let_called",
  "participant_id": 1,
  "event_data": {
    "current_score": "8-7",
    "reason": "Interference"
  }
}

# Stroke awarded
{
  "event_type": "stroke_awarded",
  "participant_id": 1,
  "event_data": {
    "awarded_to": "player_a",
    "current_score": "9-8",
    "reason": "Obstruction"
  }
}

# Hand out (HIHO scoring only)
{
  "event_type": "hand_out",
  "participant_id": 2,
  "event_data": {
    "new_server": "player_b",
    "current_score": "5-6"
  }
}
```

---

### 🏐 VOLLEYBALL

```bash
# Point scored
POST /api/v1/scoring/:matchId/event
{
  "event_type": "point_scored",
  "participant_id": 1,
  "event_data": {
    "scoring_team": "team_a",
    "team_id": "team_a",
    "player_id": 12,
    "point_type": "spike",
    "current_score": "15-12"
  }
}

# System auto-handles:
# - Side-out when receiving team scores
# - Rotation on side-out
# - Technical timeouts at 8 and 16 points

# Manual substitution
{
  "event_type": "substitution",
  "participant_id": 1,
  "event_data": {
    "team": "team_a",
    "team_id": "team_a",
    "player_out": 5,
    "player_in": 8,
    "position": 3
  }
}

# Timeout
{
  "event_type": "timeout",
  "participant_id": 1,
  "event_data": {
    "team": "team_a",
    "team_id": "team_a",
    "timeout_type": "regular",
    "timeouts_remaining": 1
  }
}
```

---

## 🔍 Verification Checklist

After each event, verify:

```bash
# Get current match state
GET /api/v1/scoring/:matchId/state

# Check:
✓ Score updated correctly
✓ Serving player/team updated
✓ Period/phase correct
✓ Special flags set (in_tiebreak, at_deuce, etc.)
✓ Match completion detected when appropriate

# Get match timeline
GET /api/v1/scoring/:matchId/timeline

# Verify:
✓ Event recorded in timeline
✓ Sequence number incremented
✓ Score_after matches current state
```

---

## 🎯 Complete Match Flow Test

```bash
# 1. Start match
POST /api/v1/scoring/:matchId/start

# 2. Record 10-15 events
# Mix of scoring and non-scoring events

# 3. Complete match naturally
# Let system auto-detect match completion
# OR use manual match_won event

# 4. Verify final state
GET /api/v1/scoring/:matchId/state
# Check: match_complete = true
# Check: match_winner set

# 5. Get statistics
GET /api/v1/scoring/:matchId/statistics

# 6. Get full timeline
GET /api/v1/scoring/:matchId/timeline
```

---

## 🐛 Common Test Scenarios

### Deuce Scenarios
```bash
# Tennis: 40-40
# Record point_won → auto-detects advantage
# Record point_won again → game won

# Badminton: 20-20
# Record rally_won → auto-detects deuce
# Continue until 22-20 or 30-29

# Table Tennis: 10-10
# Record point_scored → auto-switches to serve every point
# Continue until 12-10 or higher
```

### Tiebreak Scenarios
```bash
# Tennis/Padel: 6-6
# Record game_won → auto-triggers tiebreak
# Record point_won in tiebreak mode
# System tracks tiebreak_score separately
# At 7-5 (or similar) → auto-completes tiebreak and set
```

### Overtime Scenarios
```bash
# Football: 1-1 at full time (knockout)
# Record full_time with is_knockout=true
# System suggests extra time
# Record extra_time_start
# Goals in ET tracked separately
# If still tied → penalty_shootout
```

### Limit Tests
```bash
# Football: Try 6th substitution → should error
# Volleyball: Try 7th substitution in set → should error
# Volleyball: Try 3rd timeout in set → should error
```

---

## 📊 Expected Results

### Football Match
```json
{
  "team_a": 2,
  "team_b": 1,
  "period": "full_time",
  "yellow_cards": { "team_a": [1], "team_b": [2] },
  "red_cards": { "team_a": [], "team_b": [] },
  "substitutions": { "team_a": 3, "team_b": 2 },
  "match_complete": true
}
```

### Tennis Match
```json
{
  "sets": [
    { "player_a": 6, "player_b": 4 },
    { "player_a": 7, "player_b": 6 }
  ],
  "current_set": { "player_a": 0, "player_b": 0 },
  "match_complete": true,
  "match_winner": "player_a"
}
```

### Volleyball Match
```json
{
  "team_a": 0,
  "team_b": 0,
  "sets_won": { "team_a": 3, "team_b": 1 },
  "current_set": 5,
  "match_complete": true,
  "match_winner": "team_a"
}
```

---

## 🚨 Error Testing

Test these should fail gracefully:

```bash
# Invalid event type
{
  "event_type": "invalid_event",
  "participant_id": 1,
  "event_data": {}
}
# Expected: 400 error with valid event types listed

# Missing required fields
{
  "event_type": "goal",
  "participant_id": 1,
  "event_data": {
    "scoring_team": "team_a"
    // Missing: player_id, minute, goal_type
  }
}
# Expected: 400 error listing missing fields

# Event on completed match
# Record event after match_complete = true
# Expected: 400 error "Match already completed"

# Exceed limits
{
  "event_type": "substitution",
  // When already at max substitutions
}
# Expected: 400 error with limit message
```

---

## ✅ Success Criteria

A sport is fully validated when:

1. ✅ Match starts successfully
2. ✅ All event types accepted
3. ✅ Scores update correctly
4. ✅ Special rules trigger automatically
5. ✅ Limits enforced properly
6. ✅ Match completes correctly
7. ✅ Timeline records all events
8. ✅ Statistics calculated accurately
9. ✅ Errors handled gracefully
10. ✅ State remains consistent

---

**Ready to test!** Start with one sport, verify all events, then move to the next. 🚀
