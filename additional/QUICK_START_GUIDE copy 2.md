# Quick Start Guide - Enhanced Tournament Creation

## 🚀 Getting Started in 5 Minutes

### Step 1: Run Database Migration (2 minutes)

```bash
# Navigate to backend directory
cd sportlife-backend

# Run migration
mysql -u your_username -p your_database < migrations/ALTER_TOURNAMENTS_ENHANCED.sql

# Verify
mysql -u your_username -p your_database -e "SELECT sport_name, match_structure FROM sport_match_configs;"
```

**Expected Output:**
```
+---------------+------------------+
| sport_name    | match_structure  |
+---------------+------------------+
| Badminton     | set_based        |
| Football      | time_based       |
| Padel         | set_based        |
| Pickleball    | game_based       |
| Squash        | game_based       |
| Table Tennis  | game_based       |
| Tennis        | set_based        |
| Volleyball    | set_based        |
+---------------+------------------+
```

---

### Step 2: Test Backend API (1 minute)

```bash
# Start backend server
npm start

# Test sport configs endpoint
curl http://localhost:3000/api/v1/sport-configs

# Test specific sport (Badminton = 1)
curl http://localhost:3000/api/v1/sport-configs/1

# Test presets
curl http://localhost:3000/api/v1/sport-configs/1/presets
```

---

### Step 3: Test Tournament Creation (2 minutes)

```bash
# Create a test tournament
curl -X POST http://localhost:3000/api/v1/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Badminton Tournament",
    "sport_id": 1,
    "category": "singles",
    "format_type": "knockout",
    "tournament_type": "open",
    "match_config": {
      "match_structure": "set_based",
      "sets_to_win": 2,
      "total_sets": 3,
      "points_per_set": 21
    },
    "start_date": "2024-12-01 09:00:00",
    "end_date": "2024-12-03 18:00:00",
    "registration_start": "2024-11-01 00:00:00",
    "registration_end": "2024-11-30 23:59:59",
    "venue_id": 1,
    "max_participants": 32
  }'
```

---

## 📋 Quick Reference

### Sport IDs (Assuming standard order)
| ID | Sport | Structure | Category Support |
|----|-------|-----------|------------------|
| 1 | Badminton | set_based | Singles, Doubles, Teams |
| 2 | Football | time_based | Teams only |
| 3 | Padel | set_based | Singles, Doubles |
| 4 | Pickleball | game_based | Singles, Doubles |
| 5 | Squash | game_based | Singles only |
| 6 | Table Tennis | game_based | Singles, Doubles |
| 7 | Tennis | set_based | Singles, Doubles |
| 8 | Volleyball | set_based | Teams only |

---

### Match Config Templates

#### Badminton (Set-Based)
```json
{
  "match_structure": "set_based",
  "sets_to_win": 2,
  "total_sets": 3,
  "points_per_set": 21,
  "win_by_margin": 2,
  "deuce_enabled": true
}
```

#### Table Tennis (Game-Based)
```json
{
  "match_structure": "game_based",
  "games_to_win": 4,
  "total_games": 7,
  "points_per_game": 11,
  "win_by_margin": 2,
  "deuce_enabled": true
}
```

#### Football (Time-Based)
```json
{
  "match_structure": "time_based",
  "periods": 2,
  "period_duration": 45,
  "break_duration": 15
}
```

---

## 🔧 Common Commands

### Check Sport Configuration
```sql
SELECT * FROM sport_match_configs WHERE sport_id = 1;
```

### View Tournament Match Config
```sql
SELECT id, name, 
       JSON_EXTRACT(match_config, '$.match_structure') as structure,
       JSON_EXTRACT(match_config, '$.sets_to_win') as sets_to_win
FROM tournaments 
WHERE id = 1;
```

### Update Match Config
```sql
UPDATE tournaments 
SET match_config = JSON_SET(
  match_config, 
  '$.points_per_set', 25
) 
WHERE id = 1;
```

---

## 🐛 Troubleshooting

### Issue: Sport configs not loading
**Check:**
```sql
SELECT COUNT(*) FROM sport_match_configs;
```
**Expected:** 8 rows

**Fix:** Re-run migration script

---

### Issue: Category validation failing
**Check sport support:**
```sql
SELECT sport_name, category_support 
FROM sport_match_configs 
WHERE sport_id = YOUR_SPORT_ID;
```

---

### Issue: Match config validation error
**Validate structure:**
```bash
curl -X POST http://localhost:3000/api/v1/sport-configs/validate \
  -H "Content-Type: application/json" \
  -d '{
    "match_config": YOUR_CONFIG,
    "match_structure": "set_based"
  }'
```

---

## 📱 Frontend Integration (Quick)

### 1. Import Service
```javascript
import { getSportConfig, getSportPresets } from '../services/sportConfigService';
```

### 2. Load Config on Sport Change
```javascript
useEffect(() => {
  if (sportId) {
    getSportConfig(sportId).then(res => {
      setSportConfig(res.data);
      setMatchConfig(res.data.default_config);
    });
  }
}, [sportId]);
```

### 3. Render Dynamic Fields
```javascript
{sportConfig && sportConfig.match_structure === 'set_based' && (
  <div>
    <input name="total_sets" type="number" />
    <input name="points_per_set" type="number" />
  </div>
)}
```

---

## ✅ Verification Checklist

- [ ] Migration ran successfully
- [ ] 8 sports configured in database
- [ ] GET /api/v1/sport-configs returns data
- [ ] GET /api/v1/sport-configs/1 returns Badminton config
- [ ] POST /api/v1/tournaments accepts match_config
- [ ] Category validation works (Football rejects singles)
- [ ] Default config auto-applied when not provided
- [ ] Frontend service can fetch configs

---

## 🎯 Next Actions

### Backend (Complete ✅)
- All endpoints working
- Validation in place
- Default configs loaded

### Frontend (To Do 🔲)
1. Update CreateTournament.jsx
2. Add match config section
3. Add preset selector
4. Add category filtering
5. Test end-to-end

---

## 📞 Need Help?

### Documentation
- Full Guide: `ENHANCED_TOURNAMENT_CREATION_IMPLEMENTATION_GUIDE.md`
- Sport Configs: `additional/SPORT_MATCH_CONFIGURATIONS.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`

### Test Data
```javascript
// Badminton Singles Tournament
{
  name: "City Badminton Open",
  sport_id: 1,
  category: "singles",
  format_type: "knockout",
  tournament_type: "open",
  match_config: {
    match_structure: "set_based",
    sets_to_win: 2,
    total_sets: 3,
    points_per_set: 21
  },
  start_date: "2024-12-01 09:00:00",
  end_date: "2024-12-03 18:00:00",
  registration_start: "2024-11-01 00:00:00",
  registration_end: "2024-11-30 23:59:59",
  venue_id: 1,
  max_participants: 32
}
```

---

**Ready to go! 🚀**
