# Sport-Specific Match Configurations

## Overview
Different sports have different scoring systems and match structures. This document defines the standard configurations for each sport.

---

## 1. RACQUET SPORTS (Set-Based)

### **Badminton**
- **Match Type:** Set-based
- **Sets per Match:** Best of 3 (first to win 2 sets)
- **Points per Set:** 21 points
- **Win Margin:** Must win by 2 points (deuce at 20-20)
- **Maximum Points:** 30 (if deuce continues)
- **Serve Rules:** Rally point system
- **Configuration:**
  ```json
  {
    "sport": "badminton",
    "match_structure": "set_based",
    "sets_to_win": 2,
    "total_sets": 3,
    "points_per_set": 21,
    "win_by_margin": 2,
    "max_points": 30,
    "deuce_enabled": true
  }
  ```

### **Padel**
- **Match Type:** Set-based
- **Sets per Match:** Best of 3 or Best of 5 (configurable)
- **Games per Set:** First to 6 games (with tiebreak at 6-6)
- **Points per Game:** 15, 30, 40, Game (tennis scoring)
- **Tiebreak:** First to 7 points (win by 2)
- **Configuration:**
  ```json
  {
    "sport": "padel",
    "match_structure": "set_based",
    "sets_to_win": 2,
    "total_sets": 3,
    "games_per_set": 6,
    "tiebreak_at": 6,
    "tiebreak_points": 7,
    "scoring_system": "tennis",
    "deuce_enabled": true
  }
  ```

### **Pickleball**
- **Match Type:** Game-based or Set-based (configurable)
- **Points per Game:** 11, 15, or 21 (configurable)
- **Win Margin:** Must win by 2 points
- **Games per Match:** Best of 3 or Best of 5
- **Configuration:**
  ```json
  {
    "sport": "pickleball",
    "match_structure": "game_based",
    "games_to_win": 2,
    "total_games": 3,
    "points_per_game": 11,
    "win_by_margin": 2,
    "deuce_enabled": true
  }
  ```

### **Squash**
- **Match Type:** Game-based
- **Games per Match:** Best of 3 or Best of 5
- **Points per Game:** 11 points
- **Win Margin:** Must win by 2 points (deuce at 10-10)
- **Configuration:**
  ```json
  {
    "sport": "squash",
    "match_structure": "game_based",
    "games_to_win": 3,
    "total_games": 5,
    "points_per_game": 11,
    "win_by_margin": 2,
    "deuce_enabled": true
  }
  ```

### **Table Tennis**
- **Match Type:** Game-based
- **Games per Match:** Best of 3, 5, or 7 (configurable)
- **Points per Game:** 11 points
- **Win Margin:** Must win by 2 points (deuce at 10-10)
- **Configuration:**
  ```json
  {
    "sport": "table_tennis",
    "match_structure": "game_based",
    "games_to_win": 4,
    "total_games": 7,
    "points_per_game": 11,
    "win_by_margin": 2,
    "deuce_enabled": true
  }
  ```

### **Tennis**
- **Match Type:** Set-based
- **Sets per Match:** Best of 3 or Best of 5 (Grand Slam men's)
- **Games per Set:** First to 6 games (with tiebreak at 6-6)
- **Points per Game:** 15, 30, 40, Game (tennis scoring)
- **Tiebreak:** First to 7 points (win by 2)
- **Final Set:** May use super tiebreak (first to 10)
- **Configuration:**
  ```json
  {
    "sport": "tennis",
    "match_structure": "set_based",
    "sets_to_win": 2,
    "total_sets": 3,
    "games_per_set": 6,
    "tiebreak_at": 6,
    "tiebreak_points": 7,
    "final_set_tiebreak": 10,
    "scoring_system": "tennis",
    "deuce_enabled": true
  }
  ```

---

## 2. TEAM SPORTS (Time/Period-Based)

### **Football (Soccer)**
- **Match Type:** Time-based
- **Periods:** 2 halves
- **Duration per Half:** 45 minutes
- **Break Duration:** 15 minutes
- **Extra Time:** 2 x 15 minutes (if knockout)
- **Penalty Shootout:** If still tied after extra time
- **Configuration:**
  ```json
  {
    "sport": "football",
    "match_structure": "time_based",
    "periods": 2,
    "period_duration": 45,
    "break_duration": 15,
    "extra_time_enabled": true,
    "extra_time_periods": 2,
    "extra_time_duration": 15,
    "penalty_shootout": true
  }
  ```

### **Volleyball**
- **Match Type:** Set-based
- **Sets per Match:** Best of 3 or Best of 5
- **Points per Set:** 25 points (15 for deciding set)
- **Win Margin:** Must win by 2 points
- **No Maximum:** Points continue until 2-point lead
- **Configuration:**
  ```json
  {
    "sport": "volleyball",
    "match_structure": "set_based",
    "sets_to_win": 3,
    "total_sets": 5,
    "points_per_set": 25,
    "deciding_set_points": 15,
    "win_by_margin": 2,
    "deuce_enabled": true,
    "no_max_points": true
  }
  ```

---

## 3. Match Configuration Schema

### **Database Structure:**

```sql
-- Add to tournaments table
ALTER TABLE tournaments ADD COLUMN match_config JSON;

-- Match configuration structure
{
  "sport_type": "badminton",
  "match_structure": "set_based|game_based|time_based",
  
  -- For set-based sports
  "sets_to_win": 2,
  "total_sets": 3,
  "points_per_set": 21,
  "games_per_set": 6,  -- for tennis/padel
  
  -- For game-based sports
  "games_to_win": 2,
  "total_games": 3,
  "points_per_game": 11,
  
  -- For time-based sports
  "periods": 2,
  "period_duration": 45,
  "break_duration": 15,
  
  -- Common settings
  "win_by_margin": 2,
  "deuce_enabled": true,
  "max_points": 30,
  
  -- Tiebreak settings (tennis/padel)
  "tiebreak_enabled": true,
  "tiebreak_at": 6,
  "tiebreak_points": 7,
  
  -- Extra time (football)
  "extra_time_enabled": false,
  "penalty_shootout": false,
  
  -- Custom rules
  "custom_rules": {}
}
```

---

## 4. Sport Category Compatibility

### **Singles Compatible:**
- ✅ Badminton
- ✅ Padel
- ✅ Pickleball
- ✅ Squash
- ✅ Table Tennis
- ✅ Tennis
- ❌ Football (team only)
- ❌ Volleyball (team only)

### **Doubles Compatible:**
- ✅ Badminton
- ✅ Padel
- ✅ Pickleball
- ✅ Table Tennis
- ✅ Tennis
- ❌ Squash (singles only typically)
- ❌ Football (team only)
- ❌ Volleyball (team only)

### **Teams Compatible:**
- ✅ Football
- ✅ Volleyball
- ✅ Badminton (team events)
- ❌ Individual racquet sports (singles/doubles only)

---

## 5. Default Configurations by Sport

### **Quick Reference:**

| Sport | Structure | Best Of | Points/Games | Win By |
|-------|-----------|---------|--------------|--------|
| Badminton | Set | 3 | 21 pts/set | 2 |
| Football | Time | - | 2x45 min | - |
| Padel | Set | 3 | 6 games/set | - |
| Pickleball | Game | 3 | 11 pts/game | 2 |
| Squash | Game | 5 | 11 pts/game | 2 |
| Table Tennis | Game | 7 | 11 pts/game | 2 |
| Tennis | Set | 3 | 6 games/set | - |
| Volleyball | Set | 5 | 25 pts/set | 2 |

---

## 6. Validation Rules

### **Set-Based Sports:**
- `total_sets` must be odd (3, 5, 7)
- `sets_to_win` = (total_sets + 1) / 2
- `points_per_set` or `games_per_set` required
- `win_by_margin` typically 2

### **Game-Based Sports:**
- `total_games` must be odd (3, 5, 7)
- `games_to_win` = (total_games + 1) / 2
- `points_per_game` required
- `win_by_margin` typically 2

### **Time-Based Sports:**
- `periods` required (typically 2 or 4)
- `period_duration` in minutes
- `break_duration` optional
- Extra time rules for knockout formats

---

## 7. Frontend Display Logic

### **Show/Hide Fields Based on Sport:**

```javascript
// Racquet Sports (Set-based with points)
if (['badminton', 'pickleball', 'squash', 'table_tennis'].includes(sport)) {
  show: ['best_of', 'points_per_set', 'win_by_margin']
}

// Tennis/Padel (Set-based with games)
if (['tennis', 'padel'].includes(sport)) {
  show: ['best_of', 'games_per_set', 'tiebreak_rules']
}

// Team Sports (Time-based)
if (['football', 'volleyball'].includes(sport)) {
  show: ['periods', 'period_duration', 'break_duration']
}

// Volleyball (Set-based but team sport)
if (sport === 'volleyball') {
  show: ['best_of', 'points_per_set', 'deciding_set_points']
}
```

---

## 8. Implementation Notes

### **Backend:**
1. Store match_config as JSON in tournaments table
2. Validate configuration based on sport type
3. Use configuration for match scheduling and scoring
4. Provide default configurations for each sport

### **Frontend:**
1. Dynamic form fields based on selected sport
2. Pre-fill with sport defaults
3. Allow customization within sport rules
4. Show helpful tooltips/examples
5. Validate before submission

### **Scheduling:**
1. Calculate match duration from configuration
2. Factor in breaks between sets/games
3. Add buffer time for delays
4. Consider venue availability
5. Optimize court/field allocation

---

## 9. Example Configurations

### **Local Badminton Tournament:**
```json
{
  "sport": "badminton",
  "match_structure": "set_based",
  "sets_to_win": 2,
  "total_sets": 3,
  "points_per_set": 21,
  "win_by_margin": 2,
  "max_points": 30,
  "estimated_duration": 45
}
```

### **Football League Match:**
```json
{
  "sport": "football",
  "match_structure": "time_based",
  "periods": 2,
  "period_duration": 45,
  "break_duration": 15,
  "extra_time_enabled": false,
  "estimated_duration": 105
}
```

### **Tennis Tournament:**
```json
{
  "sport": "tennis",
  "match_structure": "set_based",
  "sets_to_win": 2,
  "total_sets": 3,
  "games_per_set": 6,
  "tiebreak_at": 6,
  "tiebreak_points": 7,
  "final_set_tiebreak": 10,
  "estimated_duration": 120
}
```

---

This configuration system ensures:
✅ Sport-specific accuracy
✅ Flexible customization
✅ Proper validation
✅ Accurate scheduling
✅ Consistent scoring
