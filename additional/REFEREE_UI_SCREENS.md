# 📱 Referee Screen UI - All 8 Sports

## Visual mockups for referee interface

---

## Common Elements (All Sports)

```
┌─────────────────────────────────────┐
│ [Sport Icon] Match Info        [⚙️] │  ← Header
│ Match Type • Format • Status        │
├─────────────────────────────────────┤
│ Team A  vs  Team B                  │  ← Participants
│                                     │
│ ┌─────────────────────────────┐    │
│ │    SCORE DISPLAY            │    │  ← Main Score
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────┐  ┌─────────┐          │
│ │ +POINT A│  │ +POINT B│          │  ← Primary Actions
│ └─────────┘  └─────────┘          │
│                                     │
│ Quick Actions: [Buttons]            │  ← Secondary Actions
│                                     │
│ [⏸ PAUSE] [↩ UNDO] [⏱ TIMEOUT]    │  ← Match Controls
│                                     │
│ Recent Events: [Timeline]           │  ← Event History
│                                     │
│ [🏁 END GAME / MATCH]              │  ← End Match
└─────────────────────────────────────┘
```

---

## 1. 🏓 PICKLEBALL

```
SCORE: 7-5-2 (A-B-Server)
Team A: 7 🟢 SERVING (Server 2)
Team B: 5

[+ POINT A]  [+ POINT B]

Quick: [FAULT] [TECH FOUL] [LET]
Games: A:1 | B:0
```

**Key Features:**
- A-B-C score format
- Server indicator (1 or 2)
- Side-out tracking
- Technical foul button

---

## 2. 🎾 PADEL

```
SETS: 6-3 | 4-5
GAME: 30-40
🎾 Team B Serving

[+ POINT A]  [+ POINT B]

Point Type: [Winner] [Ace] [Error]
Quick: [LET] [CODE WARNING] [POINT PENALTY]
```

**Key Features:**
- Set and game scores
- Deuce/Advantage display
- Point type selection
- Code violations

---

## 3. 🏓 TABLE TENNIS

```
SCORE: 9-10 (DEUCE!)
Player A: 9
Player B: 10 🟢 SERVING

[+ POINT A]  [+ POINT B]

⚠️ Serve alternates every 1 point
Quick: [LET] [YELLOW CARD] [EXPEDITE]
Games: A:1 | B:1
```

**Key Features:**
- Deuce indicator
- Serve alternation info
- Expedite system
- Game duration timer

---

## 4. 🎾 TENNIS

```
SETS: 6-3 | 4-6 | 5-5
GAME: 40-40 (DEUCE)
🎾 Player A Serving

[+ POINT A]  [+ POINT B]
Next: ADV-A    Next: ADV-B

Point: [Ace] [Winner] [Error] [Double Fault]
Quick: [LET] [TIME VIOLATION] [CODE]
```

**Key Features:**
- Set/game/point display
- Advantage preview
- Code violations
- Tiebreak warning at 6-6

---

## 5. 🏸 BADMINTON

```
SCORE: 18-20
Player A: 18
Player B: 20 🟢 SERVING (Right Box)

[+ RALLY WON A]  [+ RALLY WON B]

Rally: [Smash] [Drop] [Net Kill] [Ace]
Quick: [LET] [YELLOW CARD] [RED CARD]
Games: A:1 | B:0
⚠️ Approaching Deuce (20-20)
```

**Key Features:**
- Rally point scoring
- Serve box indicator
- Interval at 11 points
- Deuce warning (20-20)

---

## 6. 🎯 SQUASH

```
SCORE: 9-8
Player A: 9 🟢 SERVING
Player B: 8

[+ POINT A]  [+ POINT B]

Referee: [LET] [STROKE] [NO LET]
Conduct: [WARNING] [STROKE] [GAME]
Games: A:1 | B:1
⚠️ Game Point for A
```

**Key Features:**
- PAR-11 or HIHO-9
- Let/Stroke decisions
- Conduct penalties
- Decision tracking

---

## 7. 🏐 VOLLEYBALL

```
SCORE: 18-15
Team A: 18 🟢 SERVING
Team B: 15

[+ POINT A]  [+ POINT B]

Point: [Spike] [Block] [Ace] [Error]
Rotation: [P1-P2-P3-P4-P5-P6]
Quick: [SUBST 3/6] [TIMEOUT 1/2]
Cards: [YELLOW] [RED] [EXPULSION]
Sets: A:1 | B:1
⚠️ Set Point for A
```

**Key Features:**
- Rotation display
- Substitution tracking (6/6)
- Timeout tracking (2/2)
- Technical timeout at 8 & 16

---

## 8. ⚽ FOOTBALL

```
SCORE: 2-1
Team A: 2 goals
Team B: 1 goal

⏱️ TIME: 38:24 (First Half)
Stoppage: +0 min

[⚽ GOAL A]  [⚽ GOAL B]

Quick: [🟨 YELLOW] [🟥 RED] [🔁 SUBST 3/5]
Events: [PENALTY] [FOUL] [OFFSIDE]
Control: [⏸ PAUSE] [⏱ ADD TIME] [⏭️ HALF TIME]
```

**Key Features:**
- Running timer
- Goal details form
- Yellow/Red cards
- Substitution tracking
- Half-time/Full-time controls

---

## 📊 UI Component Breakdown

### Primary Actions (All Sports)
```
┌──────────────┐  ┌──────────────┐
│  + POINT A   │  │  + POINT B   │
│              │  │              │
│  Large tap   │  │  Large tap   │
│  area        │  │  area        │
└──────────────┘  └──────────────┘
```

### Quick Actions Row
```
[ACTION 1] [ACTION 2] [ACTION 3] [ACTION 4]
```

### Match Controls
```
[⏸ PAUSE] [↩ UNDO] [⏱ TIMEOUT] [🏥 MEDICAL]
```

### Event Timeline
```
Recent Events:
• 18-15: Point to Team A (Spike)
• 17-15: Point to Team A (Block)
• 16-15: Timeout Team B
```

### End Match Button
```
┌─────────────────────────────────┐
│    🏁 END GAME / END MATCH      │
└─────────────────────────────────┘
```

---

## 🎨 Design Principles

1. **Large Touch Targets** - Primary buttons 80x80px minimum
2. **Clear Hierarchy** - Score most prominent
3. **Color Coding** - Green for serving, Red for penalties
4. **Real-time Updates** - Instant score changes
5. **Undo Safety** - Always accessible
6. **Confirmation Dialogs** - For critical actions (End Match)
7. **Landscape Optimized** - Tablet-friendly layout
8. **Offline Support** - Works without internet
9. **Event Timeline** - Last 5-10 events visible
10. **Quick Access** - Common actions within thumb reach

---

## 📱 Responsive Layouts

### Phone (Portrait)
- Stacked layout
- Full-width buttons
- Scrollable timeline

### Tablet (Landscape) - **Recommended**
- Side-by-side layout
- Larger buttons
- More timeline visible
- Quick actions grid

### Desktop
- Wide layout
- Additional statistics panel
- Video replay integration (future)

---

## ✅ Implementation Notes

All screens automatically:
- ✅ Calculate scores (no manual entry)
- ✅ Track serving/rotation
- ✅ Validate events
- ✅ Broadcast updates via WebSocket
- ✅ Store complete timeline
- ✅ Support undo
- ✅ Detect match completion

**Referee just taps buttons - backend handles everything!** 🎉
