# SportLife - Scoring Events Reference Tables

## Quick Reference Guide: Event-by-Event Score Impact

This document provides detailed tables for each sport showing exactly how each event affects the score and which team/player receives points.

---

## 1. FOOTBALL (SOCCER)

| Event Type | Score Impact | Team/Player Affected | Points/Changes | Additional Effects |
|------------|--------------|---------------------|----------------|-------------------|
| **goal** | +1 Goal | Scoring team | Team score +1 | Updates minute, goal stats |
| **yellow_card** | No score change | Penalized team/player | 0 | Card tracked; 2nd yellow = red card |
| **red_card** | No score change | Penalized team/player | 0 | Player sent off, team plays short |
| **substitution** | No score change | Both teams | 0 | Player replaced, sub count +1 |
| **half_time** | No score change | Both teams | 0 | Period changes to 'half_time' |
| **full_time** | No score change | Both teams | 0 | Period changes to 'full_time' |
| **extra_time_start** | No score change | Both teams | 0 | Period changes to 'extra_time_first' |
| **extra_time_half** | No score change | Both teams | 0 | Period changes to 'extra_time_second' |
| **penalty_shootout** | No score change | Both teams | 0 | Period changes to 'penalty_shootout' |
| **penalty_kick** | +1 Penalty (if goal) | Scoring team | 0 or 1 penalty | Tracks goal/miss/save |

### Score Format
- **Regular Time**: `team_a: 2, team_b: 1`
- **Extra Time**: `team_a: 2, team_b: 2, extra_time: {team_a: 1, team_b: 0}`
- **Penalties**: `penalties: {team_a: [goal, goal, miss], team_b: [goal, save, goal]}`

---

## 2. TENNIS

| Event Type | Score Impact | Player Affected | Points/Changes | Score Progression |
|------------|--------------|-----------------|----------------|-------------------|
| **point_won** | +1 Point | Scoring player | 0→15→30→40→Game | Advances point in current game |
| **deuce** | No score change | Both players | Sets both to 40 | Requires 2 consecutive points to win |
| **advantage** | Advantage status | Scoring player | 40→Adv | One point from game win |
| **game_won** | +1 Game | Winning player | Game count +1 | Resets points to 0-0, changes server |
| **tiebreak_start** | Tiebreak begins | Both players | 0-0 tiebreak | Numeric scoring (0,1,2,3...) |
| **tiebreak_point** | +1 Tiebreak point | Scoring player | Tiebreak score +1 | First to 7, win by 2 |
| **set_won** | +1 Set | Winning player | Set count +1 | Resets games to 0-0 |
| **match_tiebreak** | Match tiebreak begins | Both players | 0-0 tiebreak | First to 10, win by 2 |
| **match_won** | Match complete | Winning player | Match winner set | Match ends |

### Score Format
- **Current Game**: `player_a: '30', player_b: '40'`
- **Current Set**: `player_a: 5, player_b: 4` (games)
- **Sets Won**: `sets: [{player_a: 6, player_b: 4}, {player_a: 7, player_b: 6}]`
- **Tiebreak**: `tiebreak_score: {player_a: 5, player_b: 3}`

---

## 3. BADMINTON

| Event Type | Score Impact | Player Affected | Points/Changes | Score Progression |
|------------|--------------|-----------------|----------------|-------------------|
| **rally_won** | +1 Point | Rally winner | Score +1 | Winner becomes server |
| **service_ace** | +1 Point | Server | Score +1 | Point won directly from serve |
| **interval** | No score change | Both players | 0 | 60-second break at 11 points |
| **deuce_reached** | No score change | Both players | 0 | At 20-20, must win by 2 or reach 30 |
| **game_won** | +1 Game | Winning player | Game count +1 | Resets score to 0-0 |
| **change_ends** | No score change | Both players | 0 | At 11 points in deciding game |
| **match_won** | Match complete | Winning player | Match winner set | Match ends |

### Score Format
- **Current Game**: `player_a: 18, player_b: 16`
- **Games Won**: `games_won: {player_a: 1, player_b: 1}`
- **Serving**: `serving_player: 'player_a', serve_box: 'right'`

### Score Rules
- **Win Condition**: First to 21 points, win by 2
- **Cap**: Maximum 30 points (30-29 wins)
- **Serve Box**: Even score = right, Odd score = left

---

## 4. PICKLEBALL

| Event Type | Score Impact | Team Affected | Points/Changes | Score Progression |
|------------|--------------|---------------|----------------|-------------------|
| **point_scored** | +1 Point (if serving team wins) | Serving team only | Score +1 | Same server continues |
| **side_out** | No score change | Receiving team | 0 | Serve transfers to opponent |
| **server_change** | No score change | Same serving team | 0 | Server 1 → Server 2 (doubles) |
| **technical_foul** | +1 Point | Opponent of foul team | Score +1 | Regardless of who's serving |
| **game_won** | +1 Game | Winning team | Game count +1 | Resets score to 0-0 |
| **match_won** | Match complete | Winning team | Match winner set | Match ends |

### Score Format (A-B-C)
- **A**: Serving team's score
- **B**: Receiving team's score  
- **C**: Server number (1 or 2)
- **Example**: `7-5-2` = Serving team has 7, receiving has 5, server 2 serving

### Score Rules
- **Only serving team scores**: Receiving team must win serve first
- **Doubles**: Server 1 → Server 2 → Side-out
- **Singles**: Direct side-out (no server 2)
- **Win**: First to 11, win by 2 (no cap)

---

## 5. PADEL

| Event Type | Score Impact | Team Affected | Points/Changes | Score Progression |
|------------|--------------|---------------|----------------|-------------------|
| **point_won** | +1 Point | Scoring team | 0→15→30→40→Game | Advances point in current game |
| **deuce** | No score change | Both teams | Sets both to 40 | Requires 2 consecutive points to win |
| **advantage** | Advantage status | Scoring team | 40→Adv | One point from game win |
| **game_won** | +1 Game | Winning team | Game count +1 | Resets points to 0-0, changes server |
| **tiebreak_start** | Tiebreak begins | Both teams | 0-0 tiebreak | Numeric scoring (0,1,2,3...) |
| **tiebreak_point** | +1 Tiebreak point | Scoring team | Tiebreak score +1 | First to 7, win by 2 |
| **set_won** | +1 Set | Winning team | Set count +1 | Resets games to 0-0 |
| **match_tiebreak** | Match tiebreak begins | Both teams | 0-0 tiebreak | First to 10, win by 2 |
| **match_won** | Match complete | Winning team | Match winner set | Match ends |

### Score Format
- **Current Game**: `team_a: '30', team_b: '15'`
- **Current Set**: `team_a: 5, team_b: 3` (games)
- **Sets Won**: `sets: [{team_a: 6, team_b: 3}, {team_a: 4, team_b: 6}]`
- **Tiebreak**: `tiebreak_score: {team_a: 6, team_b: 4}`

### Score Rules
- **Same as Tennis**: Tennis scoring adapted for doubles
- **Golden Point Option**: At deuce, next point wins (optional)

---

## 6. TABLE TENNIS

| Event Type | Score Impact | Player Affected | Points/Changes | Score Progression |
|------------|--------------|-----------------|----------------|-------------------|
| **point_scored** | +1 Point | Rally winner | Score +1 | Any player can score |
| **service_change** | No score change | Both players | 0 | Server alternates (every 2 points) |
| **deuce_reached** | No score change | Both players | 0 | At 10-10, serve alternates every point |
| **game_won** | +1 Game | Winning player | Game count +1 | Resets score to 0-0 |
| **change_ends** | No score change | Both players | 0 | At 5 points in deciding game |
| **expedite_enable** | No score change | Both players | 0 | Serve alternates every point |
| **match_won** | Match complete | Winning player | Match winner set | Match ends |

### Score Format
- **Current Game**: `player_a: 9, player_b: 8`
- **Games Won**: `games_won: {player_a: 2, player_b: 1}`
- **Serving**: `serving_player: 'player_a', serve_count: 1`

### Score Rules
- **Win Condition**: First to 11 points, win by 2 (no cap)
- **Service**: Every 2 points (every 1 at deuce)
- **Deuce**: At 10-10 or higher

---

## 7. SQUASH

| Event Type | Score Impact | Player Affected | Points/Changes | Score Progression |
|------------|--------------|-----------------|----------------|-------------------|
| **point_scored (PAR)** | +1 Point | Rally winner | Score +1 | Winner becomes server |
| **point_scored (HIHO)** | +1 Point (if server wins) | Server only | Score +1 | Server-only scoring |
| **hand_out (HIHO)** | No score change | Receiver | 0 | Receiver becomes server |
| **let_called** | No score change | Both players | 0 | Point replayed |
| **stroke_awarded** | +1 Point | Awarded player | Score +1 | Player becomes server |
| **game_won** | +1 Game | Winning player | Game count +1 | Resets score to 0-0 |
| **match_won** | Match complete | Winning player | Match winner set | Match ends |

### Score Format
- **Current Game**: `player_a: 9, player_b: 7`
- **Games Won**: `games_won: {player_a: 2, player_b: 1}`
- **Serving**: `serving_player: 'player_a'`
- **Scoring Type**: `PAR` or `HIHO`

### Score Rules
- **PAR (Point-a-Rally)**: First to 11, win by 2
- **HIHO (Hand-in-Hand-out)**: First to 9, server-only scoring
- **HIHO 8-8**: Receiver chooses Set 1 (to 9) or Set 2 (to 10)

---

## 8. VOLLEYBALL

| Event Type | Score Impact | Team Affected | Points/Changes | Score Progression |
|------------|--------------|---------------|----------------|-------------------|
| **point_scored** | +1 Point | Rally winner | Score +1 | If side-out, team rotates |
| **side_out** | +1 Point | Receiving team | Score +1 | Team rotates clockwise, gains serve |
| **rotation** | No score change | Rotating team | 0 | Players move one position clockwise |
| **substitution** | No score change | Substituting team | 0 | Player replaced, sub count +1 |
| **timeout** | No score change | Requesting team | 0 | 30-second break, timeout count +1 |
| **technical_timeout** | No score change | Both teams | 0 | Automatic at 8 and 16 points |
| **set_won** | +1 Set | Winning team | Set count +1 | Resets score to 0-0 |
| **match_won** | Match complete | Winning team | Match winner set | Match ends |

### Score Format
- **Current Set**: `team_a: 23, team_b: 21`
- **Sets Won**: `sets_won: {team_a: 2, team_b: 1}`
- **Serving**: `serving_team: 'team_a'`
- **Rotation**: `rotation_team_a: [1,2,3,4,5,6]` (position 1 = server)

### Score Rules
- **Sets 1-4**: First to 25 points, win by 2
- **Set 5**: First to 15 points, win by 2
- **No Cap**: Can continue beyond target (27-25, 30-28, etc.)
- **Rotation**: Clockwise on side-out (when receiving team wins rally)

### Limits Per Set
- **Substitutions**: 6 per team
- **Timeouts**: 2 per team (30 seconds each)
- **Technical Timeouts**: Automatic at 8 and 16 points (sets 1-4 only)

---

## Summary Table: Points Awarded Per Event

| Sport | Event | Points to Winner | Points to Loser | Notes |
|-------|-------|------------------|-----------------|-------|
| **Football** | Goal | +1 goal | 0 | - |
| **Tennis** | Point Won | +1 point (15/30/40) | 0 | Tennis scoring progression |
| **Badminton** | Rally Won | +1 point | 0 | Rally point system |
| **Pickleball** | Point Scored | +1 point | 0 | **Only if serving team wins** |
| **Pickleball** | Technical Foul | 0 | +1 to opponent | Penalty point |
| **Padel** | Point Won | +1 point (15/30/40) | 0 | Tennis scoring progression |
| **Table Tennis** | Point Scored | +1 point | 0 | Rally point system |
| **Squash (PAR)** | Point Scored | +1 point | 0 | Rally point system |
| **Squash (HIHO)** | Point Scored | +1 point (server only) | 0 | Server-only scoring |
| **Squash** | Stroke Awarded | +1 point | 0 | Referee decision |
| **Volleyball** | Point Scored | +1 point | 0 | Rally point system |

---

## Key Scoring Principles

### Rally Point Sports (Anyone Can Score)
- ✅ **Badminton**: Rally winner scores
- ✅ **Table Tennis**: Rally winner scores
- ✅ **Squash (PAR)**: Rally winner scores
- ✅ **Volleyball**: Rally winner scores

### Side-Out Sports (Only Server Scores)
- ⚠️ **Pickleball**: Only serving team scores
- ⚠️ **Squash (HIHO)**: Only server scores

### Goal/Game-Based Sports
- ⚽ **Football**: Goals scored anytime
- 🎾 **Tennis/Padel**: Points progress through 15-30-40-Game

---

## Quick Reference: "Who Gets the Point?"

| Sport | Scoring Rule |
|-------|-------------|
| **Football** | Team that scores goal |
| **Tennis** | Player who wins rally |
| **Badminton** | Player who wins rally |
| **Pickleball** | **Only serving team** (if they win rally) |
| **Padel** | Team that wins rally |
| **Table Tennis** | Player who wins rally |
| **Squash (PAR)** | Player who wins rally |
| **Squash (HIHO)** | **Only server** (if they win rally) |
| **Volleyball** | Team that wins rally |

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Purpose**: Quick reference for scoring event implementation
