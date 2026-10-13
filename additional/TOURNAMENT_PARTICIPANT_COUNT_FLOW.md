# Tournament Participant Count Flow - Complete Guide

## 🎯 Your Question

**"When does participant count increase?"**

**Example Scenario:**
- Tournament: Team-based, max 4 teams
- Team created with 4 members (out of 11 required)
- Does this team count as a participant?

---

## ✅ **ANSWER: Participant Count Increases ONLY When Team REGISTERS**

The participant count is **NOT** based on team member count. It's based on **registered teams** in the tournament.

---

## 📊 How It Works

### **Participant Count Formula:**

```sql
SELECT COUNT(*) 
FROM tournament_participants 
WHERE tournament_id = ? 
  AND status = 'confirmed'
```

**Key Points:**
- ✅ Counts **registered teams/players**, not team members
- ✅ Only counts **confirmed** participants
- ✅ Each team = 1 participant (regardless of member count)

---

## 🔄 Complete Flow

### **Step-by-Step Process:**

```
1. User creates tournament (team-based, max 4 teams)
   └─ participant_count = 0

2. User creates Team A (4 members out of 11)
   └─ participant_count = 0 (team exists but NOT registered)

3. User creates Team B (11 members complete)
   └─ participant_count = 0 (team exists but NOT registered)

4. Team B registers for tournament
   └─ participant_count = 1 ✅ (Team B registered)

5. Team B payment confirmed
   └─ participant_count = 1 (status = 'confirmed')

6. Team C registers for tournament
   └─ participant_count = 2 ✅ (Team B + Team C)

7. Team D registers for tournament
   └─ participant_count = 3 ✅ (Team B + C + D)

8. Team E registers for tournament
   └─ participant_count = 4 ✅ (Team B + C + D + E)

9. Team F tries to register
   └─ ❌ ERROR: "Tournament is full" (max 4 teams reached)
```

---

## 🎯 Key Concepts

### **1. Team Creation ≠ Tournament Registration**

```
Team Created → Exists in database
              ↓
              NOT counted in tournament participants
              ↓
Team Registers → Added to tournament_participants
              ↓
              Counted in participant_count ✅
```

### **2. Team Members vs Tournament Participants**

| Concept | What It Counts | Example |
|---------|----------------|---------|
| **Team Members** | Players in a team | Team A has 11 members |
| **Tournament Participants** | Teams registered in tournament | Tournament has 4 teams |

**Important:** 
- Team with 11 members = **11 team members**
- Team registered in tournament = **1 tournament participant**

---

## 💾 Database Structure

### **Teams Table:**
```sql
CREATE TABLE teams (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  tournament_id INT,  -- Which tournament this team is FOR
  max_players INT,    -- 11 for football
  ...
);
```

### **Team Members Table:**
```sql
CREATE TABLE team_members (
  id INT PRIMARY KEY,
  team_id INT,
  user_id INT,
  is_active BOOLEAN,
  ...
);
```

### **Tournament Participants Table:**
```sql
CREATE TABLE tournament_participants (
  id INT PRIMARY KEY,
  tournament_id INT,
  team_id INT,        -- Which team registered
  user_id INT,        -- For singles
  partnership_id INT, -- For doubles
  status ENUM('registered', 'confirmed', 'withdrawn'),
  payment_status ENUM('pending', 'paid'),
  ...
);
```

---

## 🔍 Example Scenario

### **Scenario: Football Tournament**

**Tournament Setup:**
- Name: "City Championship"
- Category: Teams
- Max Participants: 4 teams
- Entry Fee: $100

**Teams Created:**
```
Team A: "Thunder Strikers"  - 11/11 members ✅
Team B: "Lightning Warriors" - 10/11 members ❌
Team C: "Storm Chasers"      - 11/11 members ✅
Team D: "Wind Runners"       - 11/11 members ✅
Team E: "Fire Dragons"       - 11/11 members ✅
Team F: "Ice Wolves"         - 11/11 members ✅
```

**Registration Process:**

```
Initial State:
- Tournament participant_count = 0
- 6 teams exist but NONE registered

Step 1: Team A registers
- INSERT INTO tournament_participants (tournament_id, team_id, status)
- participant_count = 1 ✅

Step 2: Team C registers
- INSERT INTO tournament_participants (tournament_id, team_id, status)
- participant_count = 2 ✅

Step 3: Team D registers
- INSERT INTO tournament_participants (tournament_id, team_id, status)
- participant_count = 3 ✅

Step 4: Team E registers
- INSERT INTO tournament_participants (tournament_id, team_id, status)
- participant_count = 4 ✅ (FULL!)

Step 5: Team F tries to register
- Check: participant_count (4) >= max_participants (4)
- ❌ ERROR: "Tournament is full"
```

**Note:** Team B cannot register anyway (only 10/11 members)

---

## 🎨 UI Flow

### **Tournament Detail Page:**

```
┌─────────────────────────────────────────┐
│ City Championship                       │
│ Football • Team Tournament              │
├─────────────────────────────────────────┤
│ Participants: 2 / 4 teams               │ ← participant_count
│                                         │
│ [Register Your Team]                    │
└─────────────────────────────────────────┘
```

### **Team Selection Modal:**

```
┌─────────────────────────────────────────┐
│ Select Your Team                        │
├─────────────────────────────────────────┤
│ ✅ Available Teams (2)                  │
│                                         │
│ ⚡ Thunder Strikers                     │
│ 👤 11/11 members                        │
│ ✅ Ready to register                    │
│                                         │
│ ⚡ Storm Chasers                        │
│ 👤 11/11 members                        │
│ ✅ Ready to register                    │
├─────────────────────────────────────────┤
│ ❌ Unavailable Teams (1)                │
│                                         │
│ ⚡ Lightning Warriors                   │
│ 👤 10/11 members                        │
│ ⚠️ Need all 11 members                 │
└─────────────────────────────────────────┘
```

### **After Registration:**

```
┌─────────────────────────────────────────┐
│ City Championship                       │
│ Football • Team Tournament              │
├─────────────────────────────────────────┤
│ Participants: 3 / 4 teams               │ ← Increased!
│                                         │
│ Registered Teams:                       │
│ 1. ⚡ Thunder Strikers                  │
│ 2. ⚡ Storm Chasers                     │
│ 3. ⚡ Wind Runners                      │
│                                         │
│ [1 spot remaining]                      │
└─────────────────────────────────────────┘
```

---

## 🔧 Backend Code

### **Registration Function:**

```javascript
const registerForTournament = async (tournamentId, userId, registrationData) => {
  // Get tournament
  const tournament = await Tournament.findById(tournamentId);
  
  // Check if full
  const participantCount = await TournamentParticipant.getCount(tournamentId, 'confirmed');
  if (participantCount >= tournament.max_participants) {
    throw new Error('Tournament is full');
  }
  
  // For team tournaments
  if (tournament.category === 'teams') {
    const { team_id } = registrationData;
    
    // Validate team has all members
    await validateTeamForTournament(team_id, tournamentId, userId);
    
    // Check if team already registered
    const isRegistered = await TournamentParticipant.isRegistered(tournamentId, {
      team_id
    });
    
    if (isRegistered) {
      throw new Error('This team is already registered');
    }
    
    // Create participant entry
    await TournamentParticipant.create({
      tournament_id: tournamentId,
      team_id: team_id,
      status: 'registered',
      payment_status: 'pending'
    });
    
    // participant_count increases by 1 ✅
  }
};
```

### **Participant Count Query:**

```javascript
// In Tournament model
const sql = `
  SELECT 
    t.*,
    (SELECT COUNT(*) 
     FROM tournament_participants 
     WHERE tournament_id = t.id 
       AND status = 'confirmed') AS participant_count
  FROM tournaments t
  WHERE t.id = ?
`;
```

---

## 📊 Participant Count States

### **Status Affects Count:**

```sql
-- Only counts 'confirmed' participants
SELECT COUNT(*) 
FROM tournament_participants 
WHERE tournament_id = ? 
  AND status = 'confirmed'  -- ← Important!
```

| Status | Counted? | Description |
|--------|----------|-------------|
| `registered` | ❌ | Just registered, payment pending |
| `confirmed` | ✅ | Payment confirmed, counted |
| `withdrawn` | ❌ | Withdrew from tournament |
| `disqualified` | ❌ | Disqualified |

### **Payment Flow:**

```
Team registers
  ↓
status = 'registered'
payment_status = 'pending'
participant_count = 0 (not confirmed yet)
  ↓
Payment completed
  ↓
status = 'confirmed'
payment_status = 'paid'
participant_count = 1 ✅ (now counted!)
```

**Note:** If `entry_fee = 0`, auto-confirms immediately!

---

## 🧪 Testing

### **Test 1: Create Team (No Registration)**

```javascript
// Create team
POST /api/v1/teams
{
  "name": "Thunder Strikers",
  "tournament_id": 5,
  "max_players": 11
}

// Check tournament participant count
GET /api/v1/tournaments/5

Response:
{
  "participant_count": 0  // ← Still 0!
}
```

### **Test 2: Register Team**

```javascript
// Register team for tournament
POST /api/v1/tournaments/5/register
{
  "team_id": 10
}

// Check tournament participant count
GET /api/v1/tournaments/5

Response:
{
  "participant_count": 1  // ← Increased!
}
```

### **Test 3: Try to Register Incomplete Team**

```javascript
// Team has only 10/11 members
POST /api/v1/tournaments/5/register
{
  "team_id": 11
}

Response:
{
  "success": false,
  "error": "Team must have all 11 members to register for tournament (currently has 10)"
}

// Participant count unchanged
GET /api/v1/tournaments/5
{
  "participant_count": 1  // ← Still 1
}
```

---

## 📝 Summary

### **Your Question Answered:**

**Q:** "When does participant count increase?"

**A:** When a **team registers** for the tournament (not when team is created or members are added)

---

### **Key Points:**

1. ✅ **Team Creation** → Does NOT increase participant count
2. ✅ **Adding Team Members** → Does NOT increase participant count
3. ✅ **Team Registration** → INCREASES participant count by 1
4. ✅ **Payment Confirmation** → Participant status = 'confirmed'

---

### **Example:**

```
Tournament: Max 4 teams
Team A: 4/11 members → Cannot register (incomplete)
Team B: 11/11 members → Can register

Before registration:
- participant_count = 0

Team B registers:
- participant_count = 1 ✅

Team B pays entry fee:
- status = 'confirmed'
- participant_count = 1 (counted)

Team C registers:
- participant_count = 2 ✅

Team D registers:
- participant_count = 3 ✅

Team E registers:
- participant_count = 4 ✅ (FULL!)

Team F tries to register:
- ❌ "Tournament is full"
```

---

### **Participant Count Formula:**

```
participant_count = Number of REGISTERED teams with status='confirmed'

NOT:
❌ participant_count = Total team members
❌ participant_count = Number of teams created
```

---

**The UI already handles this flow perfectly!** ✅

**Participant count increases when teams REGISTER, not when they're created or when members are added.** 🎉
