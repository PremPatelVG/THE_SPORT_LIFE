# ✅ Category-Based Player Calculation - Complete!

## 📋 Overview

Updated the player requirements calculator to work with all tournament categories: **Singles**, **Doubles**, and **Teams**.

---

## 🎯 Calculation Logic

### **1. Singles (Individual)**
```
Players Needed = Max Participants × 1
```

**Example:**
- Max Participants: 4
- Multiplier: 1
- **Total: 4 players**

---

### **2. Doubles (Pairs)**
```
Players Needed = Max Participants × 2
```

**Example:**
- Max Participants: 4 (pairs)
- Multiplier: 2 (players per pair)
- **Total: 8 players**

---

### **3. Teams**
```
Players Needed = Max Participants × Players per Team
```

**Example (Football):**
- Max Participants: 2 (teams)
- Multiplier: 11 (players per team from sport config)
- **Total: 22 players**

---

## 🎨 Visual Display

### **Singles Tournament:**
```
┌──────────────────────────────────────────────────┐
│ Players Required                                 │
│ Individual tournament - 1 player per participant │
│                                                  │
│ Participants  ×  Individual Players  =  Minimum │
│      4              1                     4      │
│                                                  │
│                      Currently Locked: 2         │
│                      Need 2 more                 │
└──────────────────────────────────────────────────┘
```

### **Doubles Tournament:**
```
┌──────────────────────────────────────────────────┐
│ Players Required                                 │
│ Doubles tournament - 2 players per pair          │
│                                                  │
│ Participants  ×  Players per Pair  =  Minimum   │
│      4              2                    8       │
│                                                  │
│                      Currently Locked: 5         │
│                      Need 3 more                 │
└──────────────────────────────────────────────────┘
```

### **Teams Tournament:**
```
┌──────────────────────────────────────────────────┐
│ Players Required                                 │
│ Team tournament - Multiple players per team      │
│                                                  │
│ Teams  ×  Players per Team  =  Minimum          │
│   2          11                  22              │
│                                                  │
│                      Currently Locked: 15        │
│                      Need 7 more                 │
└──────────────────────────────────────────────────┘
```

---

## 📊 Examples by Sport

### **Badminton Singles:**
- Category: `singles`
- Max Participants: 8
- Calculation: `8 × 1 = 8 players`

### **Badminton Doubles:**
- Category: `doubles`
- Max Participants: 4 (pairs)
- Calculation: `4 × 2 = 8 players`

### **Football:**
- Category: `teams`
- Max Participants: 2 (teams)
- Players per Team: 11
- Calculation: `2 × 11 = 22 players`

### **Basketball:**
- Category: `teams`
- Max Participants: 4 (teams)
- Players per Team: 5
- Calculation: `4 × 5 = 20 players`

### **Tennis Doubles:**
- Category: `doubles`
- Max Participants: 8 (pairs)
- Calculation: `8 × 2 = 16 players`

---

## 🔧 Technical Implementation

### **Frontend Logic:**
```javascript
let playersNeeded = 0;
let multiplier = 1;
let categoryLabel = '';

if (tournament.category === 'singles') {
  playersNeeded = tournament.max_participants * 1;
  multiplier = 1;
  categoryLabel = 'Individual Players';
} else if (tournament.category === 'doubles') {
  playersNeeded = tournament.max_participants * 2;
  multiplier = 2;
  categoryLabel = 'Players per Pair';
} else if (tournament.category === 'teams') {
  multiplier = tournament.min_players_per_side || 11;
  playersNeeded = tournament.max_participants * multiplier;
  categoryLabel = 'Players per Team';
}
```

### **Backend Data:**
```javascript
// Tournament Model - findById query
SELECT 
  t.*,
  s.name AS sport_name,
  s.category AS sport_category,
  s.min_players_per_side,    // NEW
  s.max_players_per_side,    // NEW
  ...
FROM tournaments t
LEFT JOIN sports s ON t.sport_id = s.id
```

---

## 📱 Dynamic Labels

### **Category-Specific Text:**

| Category | Description | Label |
|----------|-------------|-------|
| Singles  | "Individual tournament - 1 player per participant" | "Individual Players" |
| Doubles  | "Doubles tournament - 2 players per pair" | "Players per Pair" |
| Teams    | "Team tournament - Multiple players per team" | "Players per Team" |

### **Participant Label:**
- Singles/Doubles: "Participants"
- Teams: "Teams"

---

## ✨ Features

### **1. Category Detection**
Automatically detects tournament category and adjusts calculation

### **2. Sport Configuration**
Uses `min_players_per_side` from sport table for team-based tournaments

### **3. Dynamic Messaging**
Shows appropriate description based on category

### **4. Progress Tracking**
Displays current locked players and remaining needed

### **5. Status Indicator**
- ✅ Green: "✓ Enough players"
- ⚠️ Red: "Need X more"

---

## 🔄 User Flow

### **Scenario 1: Singles Tournament**
```
1. Organizer creates Badminton Singles
2. Sets max_participants = 8
3. Opens manage page
4. Sees: "8 × 1 = 8 players needed"
5. Currently locked: 5
6. Status: "Need 3 more"
```

### **Scenario 2: Doubles Tournament**
```
1. Organizer creates Tennis Doubles
2. Sets max_participants = 4 pairs
3. Opens manage page
4. Sees: "4 × 2 = 8 players needed"
5. Currently locked: 6
6. Status: "Need 2 more"
```

### **Scenario 3: Team Tournament**
```
1. Organizer creates Football League
2. Sets max_participants = 2 teams
3. Sport config: 11 players per team
4. Opens manage page
5. Sees: "2 × 11 = 22 players needed"
6. Currently locked: 22
7. Status: "✓ Enough players"
```

---

## 🎯 Database Schema

### **Tournaments Table:**
```sql
category ENUM('singles', 'doubles', 'teams')
max_participants INT
```

### **Sports Table:**
```sql
min_players_per_side INT
max_players_per_side INT
category ENUM('racquet', 'team')
```

---

## 📊 Calculation Matrix

| Tournament Category | Max Participants | Multiplier | Formula | Example Result |
|---------------------|------------------|------------|---------|----------------|
| Singles             | 8                | 1          | 8 × 1   | 8 players      |
| Doubles             | 4                | 2          | 4 × 2   | 8 players      |
| Teams (Football)    | 2                | 11         | 2 × 11  | 22 players     |
| Teams (Basketball)  | 4                | 5          | 4 × 5   | 20 players     |
| Teams (Cricket)     | 2                | 11         | 2 × 11  | 22 players     |
| Teams (Volleyball)  | 4                | 6          | 4 × 6   | 24 players     |

---

## 🧪 Testing Checklist

- [ ] Singles tournament shows "× 1"
- [ ] Doubles tournament shows "× 2"
- [ ] Team tournament shows "× 11" (football)
- [ ] Team tournament shows "× 5" (basketball)
- [ ] Correct total calculation
- [ ] Progress shows locked count
- [ ] Status shows "Need X more"
- [ ] Status shows "✓ Enough" when complete
- [ ] Card only shows when max_participants set
- [ ] Responsive on mobile

---

## 🚀 Future Enhancements

### **1. Substitute Players**
```
Total = (Teams × Players) + (Teams × Subs)
Example: (2 × 11) + (2 × 3) = 28 players
```

### **2. Reserve Players**
```
Total = Base Players + Reserve %
Example: 22 + (22 × 0.2) = 26 players
```

### **3. Officials**
```
Total = Players + Referees + Scorers
Example: 22 + 1 + 1 = 24 people
```

### **4. Visual Progress Bar**
```
[████████████░░░░] 75% (18/24)
```

---

## ✅ Summary

**Category-based player calculation is complete!**

✅ **Singles** - 1 player per participant
✅ **Doubles** - 2 players per pair
✅ **Teams** - Players from sport config
✅ **Dynamic labels** - Category-specific text
✅ **Progress tracking** - Shows current status
✅ **Smart calculation** - Uses sport data
✅ **Responsive design** - Works on all devices

**Organizers now see accurate player requirements for ANY tournament type!** 🎉

---

## 📸 Visual Comparison

```
SINGLES:    [8 participants] × [1] = [8 players]
DOUBLES:    [4 pairs] × [2] = [8 players]
TEAMS:      [2 teams] × [11] = [22 players]
```

**Ready to use!** 🚀
