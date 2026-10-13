# SportLife - Complete Scoring System Documentation

## Overview
This document provides a comprehensive description of all scoring events and systems implemented in the SportLife platform. Our system supports **8 different sports** with complete rule implementations, ensuring accurate and professional score tracking for tournaments and matches.

---

## Supported Sports

1. **Football (Soccer)**
2. **Tennis**
3. **Badminton**
4. **Pickleball**
5. **Padel**
6. **Table Tennis**
7. **Squash**
8. **Volleyball**

---

## 1. Football (Soccer)

### Overview
Complete football scoring system with goal tracking, disciplinary actions, substitutions, and support for extra time and penalty shootouts.

### Match Structure
- **Duration**: 90 minutes (2 × 45-minute halves)
- **Extra Time**: 2 × 15-minute periods (if required in knockout format)
- **Penalty Shootout**: Best of 5 penalties, then sudden death

### Scoring Events

#### **GOAL**
- **Description**: A goal is scored when the ball completely crosses the goal line
- **Points Awarded**: 1 goal to the scoring team
- **Data Tracked**: 
  - Scorer (player ID)
  - Assist provider (optional)
  - Minute of goal
  - Goal type (open play, penalty, free kick, header, own goal)
- **Special Cases**: 
  - Goals in extra time are tracked separately
  - Own goals credited to opposing team

#### **YELLOW CARD**
- **Description**: Caution issued to a player for misconduct
- **Effect**: Player warned; second yellow card results in automatic red card
- **Data Tracked**:
  - Player ID
  - Minute issued
  - Reason for card
- **Consequences**: Two yellow cards = automatic red card and player sent off

#### **RED CARD**
- **Description**: Player ejection for serious misconduct or second yellow card
- **Effect**: Team plays with one fewer player for remainder of match
- **Data Tracked**:
  - Player ID
  - Minute issued
  - Reason (direct red or second yellow)
- **Consequences**: Player cannot be replaced; team plays short-handed

#### **SUBSTITUTION**
- **Description**: Player replacement during match
- **Limit**: 5 substitutions per team (configurable)
- **Data Tracked**:
  - Player coming off
  - Player coming on
  - Minute of substitution
- **Rules**: Once substituted, a player cannot return to the match

#### **HALF-TIME**
- **Description**: Break between first and second half
- **Duration**: Typically 15 minutes
- **Data Tracked**: Stoppage time from first half

#### **FULL-TIME**
- **Description**: End of regular 90 minutes
- **Outcomes**:
  - League format: Match ends (draw allowed)
  - Knockout format: Extra time if scores level

#### **EXTRA TIME**
- **Description**: Additional playing time in knockout matches when scores are level
- **Structure**: 2 × 15-minute periods
- **Scoring**: Goals tracked separately as extra time goals

#### **PENALTY SHOOTOUT**
- **Description**: Tiebreaker when scores remain level after extra time
- **Format**: Best of 5 penalties each; sudden death if still tied
- **Events Tracked**:
  - **Penalty Goal**: Successful penalty kick
  - **Penalty Miss**: Shot misses target
  - **Penalty Save**: Goalkeeper saves the shot
- **Winner Determination**: Team with most successful penalties wins

---

## 2. Tennis

### Overview
Professional tennis scoring with support for multiple formats including traditional advantage scoring, no-ad scoring, tiebreaks, and Fast4 format.

### Match Structure
- **Sets**: Best of 3 or Best of 5
- **Games per Set**: First to 6 games (win by 2)
- **Points per Game**: 0 → 15 → 30 → 40 → Game
- **Tiebreak**: At 6-6 games (first to 7 points, win by 2)

### Scoring Events

#### **POINT WON**
- **Description**: Player wins a rally and earns a point
- **Point Progression**: 0 → 15 → 30 → 40 → Game
- **Data Tracked**: Scoring player
- **Special Cases**:
  - At 40-40: Deuce (requires 2 consecutive points to win)
  - In tiebreak: Numeric scoring (0, 1, 2, 3...)

#### **DEUCE**
- **Description**: Score reaches 40-40 in a game
- **Rule**: Player must win 2 consecutive points to win game
- **Progression**: Deuce → Advantage → Game (or back to Deuce)
- **Alternative Formats**:
  - **No-Ad Scoring**: Next point wins at deuce
  - **Golden Point**: Receiver chooses service side; next point wins

#### **ADVANTAGE**
- **Description**: Player wins point from deuce
- **Effect**: One point away from winning game
- **Outcomes**:
  - Win next point: Game won
  - Lose next point: Back to deuce

#### **GAME WON**
- **Description**: Player wins a game (reaches 4+ points with 2-point lead)
- **Effect**: Game count increases by 1
- **Service**: Alternates to opponent for next game
- **Set Progress**: Tracked toward 6 games needed to win set

#### **TIEBREAK**
- **Description**: Special game played at 6-6 games in a set
- **Format**: First to 7 points, must win by 2
- **Scoring**: Numeric (0, 1, 2, 3... instead of 15, 30, 40)
- **Service**: Alternates every 2 points
- **Change Ends**: Every 6 points
- **Winner**: Takes set 7-6

#### **MATCH TIEBREAK**
- **Description**: Tiebreak to 10 points (instead of 7) used in final set
- **Format**: First to 10 points, must win by 2
- **Usage**: Optional replacement for full final set
- **Common In**: Doubles matches, Fast4 format

#### **SET WON**
- **Description**: Player wins 6+ games with 2-game lead (or wins tiebreak)
- **Requirements**: 
  - 6 games with 2-game lead (6-4, 6-3, etc.)
  - OR 7-6 via tiebreak
- **Match Progress**: Tracked toward sets needed to win match

#### **MATCH WON**
- **Description**: Player wins required number of sets
- **Best of 3**: First to 2 sets
- **Best of 5**: First to 3 sets

#### **FAST4 FORMAT** (Optional)
- **Description**: Shortened tennis format
- **Rules**:
  - First to 4 games wins set
  - Tiebreak at 3-3 (instead of 6-6)
  - No-ad scoring (sudden death at deuce)
  - Match tiebreak in place of final set

---

## 3. Badminton

### Overview
Rally point scoring system where every rally results in a point, with serve box switching and interval breaks.

### Match Structure
- **Games**: Best of 3 games
- **Points per Game**: First to 21 points (win by 2, cap at 30)
- **Scoring**: Rally point system (winner of rally scores)

### Scoring Events

#### **RALLY WON**
- **Description**: Player/team wins a rally and scores a point
- **Points Awarded**: 1 point to rally winner
- **Effect**: Winner becomes server for next rally
- **Serve Box**: Alternates based on score (even = right, odd = left)
- **Data Tracked**: Scoring player, current score

#### **INTERVAL**
- **Description**: 60-second break when first player/team reaches 11 points
- **Timing**: Occurs once per game at 11 points
- **Purpose**: Brief rest and coaching opportunity
- **Rules**: Players change ends after interval

#### **DEUCE (20-20)**
- **Description**: Score reaches 20-20 in a game
- **Rule**: Must win by 2 points OR reach 30 points (cap)
- **Possible Outcomes**:
  - Win by 2: Game ends (22-20, 23-21, etc.)
  - Reach 30: Player with 30 points wins (30-29)

#### **GAME WON**
- **Description**: Player/team wins a game
- **Requirements**:
  - Reach 21 points with 2-point lead
  - OR reach 30 points (automatic win)
- **Next Game**: Winner serves first

#### **CHANGE ENDS (Deciding Game)**
- **Description**: Players change ends at 11 points in the 3rd game
- **Timing**: Only in deciding game (game 3)
- **Purpose**: Ensure fair play with environmental factors

#### **SERVICE ACE**
- **Description**: Point won directly from serve (opponent fails to return)
- **Scoring**: Same as rally won, but marked as ace
- **Data Tracked**: Ace flag for statistics

#### **MATCH WON**
- **Description**: Player/team wins 2 out of 3 games
- **Final Score**: Displayed as games won (2-0 or 2-1)

---

## 4. Pickleball

### Overview
Unique side-out scoring system where only the serving team can score points, with distinctive A-B-C score format.

### Match Structure
- **Games**: Best of 3 games
- **Points per Game**: First to 11 points (win by 2) - configurable to 15 or 21
- **Scoring**: Side-out scoring (only serving team scores)
- **Format**: Singles or Doubles

### Scoring Events

#### **POINT SCORED**
- **Description**: Serving team wins rally and scores a point
- **Points Awarded**: 1 point (only if serving team wins)
- **Server**: Remains with same server after scoring
- **Score Format**: A-B-C
  - A = Serving team's score
  - B = Receiving team's score
  - C = Server number (1 or 2 in doubles)
- **Example**: "7-5-2" means serving team has 7, receiving has 5, server 2 is serving

#### **SIDE-OUT**
- **Description**: Receiving team wins rally; serve transfers to other team
- **Points Awarded**: None (no point scored)
- **Effect**: Service changes to opposing team
- **Doubles Progression**: Server 1 → Server 2 → Side-out
- **Singles**: Direct side-out (no server 2)

#### **SERVER CHANGE (Doubles Only)**
- **Description**: First server loses rally; second server takes over
- **Points Awarded**: None
- **Progression**: Server 1 → Server 2 (same team continues serving)
- **Exception**: At game start, first serving team starts with server 2

#### **TECHNICAL FOUL**
- **Description**: Rule violation resulting in point penalty
- **Points Awarded**: 1 point to opposing team (regardless of who's serving)
- **Common Violations**:
  - Non-volley zone fault (kitchen violation)
  - Service fault
  - Double bounce violation
  - Incorrect server/position

#### **GAME WON**
- **Description**: Team reaches target score with 2-point lead
- **Requirements**:
  - Reach 11 points (or configured target)
  - Must win by 2 points (no cap)
- **Next Game**: Losing team serves first

#### **MATCH WON**
- **Description**: Team wins 2 out of 3 games
- **Final Score**: Displayed as games won (2-0 or 2-1)

---

## 5. Padel

### Overview
Padel uses tennis-style scoring adapted for doubles play on an enclosed court with walls.

### Match Structure
- **Sets**: Best of 3 sets
- **Games per Set**: First to 6 games (win by 2)
- **Points per Game**: 0 → 15 → 30 → 40 → Game
- **Tiebreak**: At 6-6 games (first to 7 points, win by 2)

### Scoring Events

#### **POINT WON**
- **Description**: Team wins a rally and earns a point
- **Point Progression**: 0 → 15 → 30 → 40 → Game
- **Data Tracked**: Scoring team
- **Special Cases**: Deuce/advantage rules apply

#### **DEUCE**
- **Description**: Score reaches 40-40 in a game
- **Standard Rule**: Team must win 2 consecutive points
- **Golden Point Option**: Next point wins (receiver chooses side)

#### **ADVANTAGE**
- **Description**: Team wins point from deuce
- **Effect**: One point away from winning game
- **Outcomes**:
  - Win next point: Game won
  - Lose next point: Back to deuce

#### **GAME WON**
- **Description**: Team wins a game
- **Effect**: Game count increases by 1
- **Service**: Alternates to opposing team
- **Tiebreak Check**: At 6-6, tiebreak begins

#### **TIEBREAK**
- **Description**: Special game at 6-6 games in a set
- **Format**: First to 7 points, must win by 2
- **Scoring**: Numeric (0, 1, 2, 3...)
- **Service**: Alternates every 2 points
- **Change Ends**: Every 6 points
- **Winner**: Takes set 7-6

#### **SET WON**
- **Description**: Team wins 6+ games with 2-game lead (or wins tiebreak)
- **Requirements**:
  - 6 games with 2-game lead
  - OR 7-6 via tiebreak

#### **MATCH TIEBREAK** (Optional)
- **Description**: Tiebreak to 10 points for final set
- **Format**: First to 10 points, must win by 2
- **Usage**: Optional replacement for full final set

#### **MATCH WON**
- **Description**: Team wins 2 out of 3 sets
- **Final Score**: Displayed with set scores (6-4, 7-5)

---

## 6. Table Tennis

### Overview
Fast-paced rally point scoring with frequent serve alternation and special deuce rules.

### Match Structure
- **Games**: Best of 5 or Best of 7
- **Points per Game**: First to 11 points (win by 2)
- **Scoring**: Rally point system
- **Format**: Singles or Doubles

### Scoring Events

#### **POINT SCORED**
- **Description**: Player wins a rally and scores a point
- **Points Awarded**: 1 point to rally winner
- **Serve Rotation**: Every 2 points (every 1 point at deuce)
- **Data Tracked**: Scoring player, serve count

#### **SERVICE CHANGE**
- **Description**: Serve alternates between players
- **Timing**: 
  - Every 2 points (normal play)
  - Every 1 point (at deuce - 10-10 or higher)
- **Effect**: Opponent becomes server

#### **DEUCE REACHED (10-10)**
- **Description**: Score reaches 10-10
- **Rule**: Must win by 2 points (no cap)
- **Service**: Alternates every point (instead of every 2)
- **Possible Scores**: 11-10, 12-10, 12-11, 13-11, etc.

#### **GAME WON**
- **Description**: Player wins a game
- **Requirements**:
  - Reach 11 points with 2-point lead
  - No maximum score (can go 15-13, 20-18, etc.)
- **Next Game**: Loser serves first

#### **CHANGE ENDS (Deciding Game)**
- **Description**: Players change ends when combined score reaches 5 in final game
- **Timing**: Only in deciding game (game 5 in best-of-5)
- **Example**: At 3-2, 4-1, or 5-0 (total = 5 points)

#### **EXPEDITE SYSTEM**
- **Description**: Special rule activated if game exceeds 10 minutes
- **Effect**: 
  - Serve alternates every point
  - Receiver wins point if rally exceeds 13 returns
- **Purpose**: Prevent excessively long games
- **Activation**: Automatic at 10 minutes, or either player can request

#### **MATCH WON**
- **Description**: Player wins required number of games
- **Best of 5**: First to 3 games
- **Best of 7**: First to 4 games

---

## 7. Squash

### Overview
Squash supports two scoring systems: modern PAR (Point-a-Rally) and traditional HIHO (Hand-in-Hand-out).

### Match Structure
- **Games**: Best of 5 or Best of 3
- **PAR Scoring**: First to 11 points (win by 2)
- **HIHO Scoring**: First to 9 points (server-only scoring)

### Scoring Events

#### **POINT SCORED (PAR)**
- **Description**: Player wins rally and scores point
- **Points Awarded**: 1 point to rally winner
- **Server**: Rally winner becomes server
- **Modern Standard**: Used in professional play

#### **POINT SCORED (HIHO)**
- **Description**: Server wins rally and scores point
- **Points Awarded**: 1 point (only if server wins)
- **Hand-Out**: If receiver wins, no point scored (just serve change)
- **Traditional Format**: Classic squash scoring

#### **HAND-OUT (HIHO Only)**
- **Description**: Receiver wins rally; serve transfers
- **Points Awarded**: None
- **Effect**: Receiver becomes server
- **No Score Change**: Only service changes

#### **LET CALLED**
- **Description**: Rally is replayed due to interference
- **Points Awarded**: None
- **Reasons**:
  - Unintentional interference
  - Ball hits opponent before wall
  - Distraction or obstruction
  - Court conditions (wet floor, etc.)
- **Effect**: Point is replayed

#### **STROKE AWARDED**
- **Description**: Point awarded by referee for obstruction
- **Points Awarded**: 1 point to striker
- **Reasons**:
  - Opponent blocks direct path to ball
  - Opponent prevents reasonable swing
  - Dangerous play by opponent
- **Effect**: Striker becomes server and gains point

#### **GAME WON (PAR)**
- **Description**: Player reaches 11 points with 2-point lead
- **Requirements**: 11+ points, win by 2
- **No Cap**: Can continue indefinitely (11-9, 15-13, etc.)

#### **GAME WON (HIHO)**
- **Description**: Player reaches 9 points
- **Special Case at 8-8**: Receiver chooses "Set 1" (play to 9) or "Set 2" (play to 10)
- **Requirements**: First to chosen target

#### **MATCH WON**
- **Description**: Player wins required number of games
- **Best of 5**: First to 3 games
- **Best of 3**: First to 2 games

---

## 8. Volleyball

### Overview
Rally point scoring with rotation system, substitution limits, and special rules for indoor volleyball.

### Match Structure
- **Sets**: Best of 5 sets
- **Points per Set**: First to 25 points (15 in 5th set), win by 2
- **Scoring**: Rally point system
- **Rotation**: 6 positions, clockwise rotation on side-out

### Scoring Events

#### **POINT SCORED**
- **Description**: Team wins rally and scores point
- **Points Awarded**: 1 point to rally winner
- **Side-Out**: If receiving team wins, they rotate and gain serve
- **Data Tracked**: Scoring team, rotation positions

#### **SIDE-OUT**
- **Description**: Receiving team wins rally
- **Effect**: 
  - Receiving team scores point
  - Receiving team rotates clockwise
  - Receiving team becomes serving team
- **Rotation**: All 6 players move one position clockwise

#### **ROTATION**
- **Description**: Team rotates positions after gaining serve
- **Direction**: Clockwise
- **Positions**: 6 positions (1-6)
  - Position 1: Back-right (server)
  - Position 2: Front-right
  - Position 3: Front-center
  - Position 4: Front-left
  - Position 5: Back-left
  - Position 6: Back-center
- **Tracking**: System maintains rotation order for both teams

#### **SUBSTITUTION**
- **Description**: Player replacement during set
- **Limit**: 6 substitutions per team per set
- **Rules**:
  - Player can re-enter once (in same position)
  - Libero has special unlimited substitution rules
- **Data Tracked**: Player out, player in, substitution count

#### **TIMEOUT**
- **Description**: Team-requested break
- **Limit**: 2 timeouts per team per set (30 seconds each)
- **Strategic Use**: Disrupt opponent momentum, rest, or plan
- **Data Tracked**: Team, timeout count

#### **TECHNICAL TIMEOUT**
- **Description**: Automatic timeout at 8 and 16 points (sets 1-4 only)
- **Duration**: 60 seconds
- **Purpose**: TV/broadcast breaks, player rest
- **Not in 5th Set**: No technical timeouts in deciding set

#### **SET WON**
- **Description**: Team wins a set
- **Requirements**:
  - Sets 1-4: First to 25 points, win by 2
  - Set 5: First to 15 points, win by 2
- **No Cap**: Can continue beyond target (26-24, 30-28, etc.)
- **Reset**: Substitutions and timeouts reset for next set

#### **MATCH WON**
- **Description**: Team wins 3 out of 5 sets
- **Final Score**: Displayed as sets won (3-0, 3-1, or 3-2)

---

## Technical Implementation Features

### Real-Time Score Calculation
- **Instant Updates**: All score changes calculated and broadcast in real-time
- **Validation**: Rules engine validates all scoring events before applying
- **History Tracking**: Complete event log maintained for match replay

### Configurable Rules
Each sport supports customizable configurations:
- Match duration/format (best of 3, best of 5, etc.)
- Scoring variations (advantage vs. no-ad, golden point, etc.)
- Time limits and intervals
- Substitution and timeout limits

### Score Display Formats
- **Football**: 2-1 (90+3') or 2-2 (AET) or 4-3 (Pens)
- **Tennis**: 6-4, 7-6(5), 6-3 (set scores with tiebreak details)
- **Badminton**: 21-19 (current game), Games: 2-1
- **Pickleball**: 7-5-2 (A-B-C format)
- **Padel**: 6-4, 7-6(3) (set scores)
- **Table Tennis**: 11-9 (current game), Games: 3-2
- **Squash**: 11-9 (current game), Games: 3-1
- **Volleyball**: 25-23 (current set), Sets: 3-1

### Match State Management
- **Current Score**: Live score tracking
- **Period/Set/Game**: Current phase of match
- **Server/Serving Team**: Who has serve
- **Statistics**: Comprehensive event statistics
- **Match Status**: In progress, completed, suspended

### Data Integrity
- **Validation**: All events validated against sport rules
- **Error Handling**: Invalid events rejected with clear error messages
- **Audit Trail**: Complete history of all scoring events
- **Rollback Support**: Ability to correct scoring errors

---

## API Integration

### Scoring Endpoints
All sports use standardized API endpoints:
- `POST /api/matches/:id/score` - Submit scoring event
- `GET /api/matches/:id/score` - Get current score
- `GET /api/matches/:id/events` - Get event history
- `PUT /api/matches/:id/score/undo` - Undo last event

### Event Data Format
```json
{
  "eventType": "goal|point_won|rally_won|etc",
  "eventData": {
    "scoring_player": "player_id",
    "scoring_team": "team_id",
    "minute": 45,
    "additional_data": {}
  }
}
```

---

## Summary

The SportLife scoring system provides:
- ✅ **8 Complete Sport Implementations**
- ✅ **50+ Unique Scoring Events**
- ✅ **Professional Rule Compliance**
- ✅ **Real-Time Score Calculation**
- ✅ **Flexible Configuration Options**
- ✅ **Comprehensive Data Tracking**
- ✅ **Tournament-Ready Infrastructure**

This system ensures accurate, professional-grade scoring for all supported sports, making it suitable for recreational leagues, competitive tournaments, and professional events.

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**For**: Client Presentation & Technical Reference
