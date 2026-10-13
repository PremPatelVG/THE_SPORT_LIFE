# 🎯 Tournament Management - Visual Flow Diagrams

## 📋 Quick Reference

This document provides visual diagrams for all tournament workflows.

---

## 1️⃣ Tournament Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TOURNAMENT CREATION                       │
└─────────────────────────────────────────────────────────────┘

    Organizer
       │
       ├─→ Opens CreateTournament Page
       │
       ├─→ Fills Form:
       │   ├─ Basic Info (name, description, logo)
       │   ├─ Sport Selection
       │   ├─ Venue & Dates
       │   ├─ Registration Period
       │   ├─ Tournament Type (OPEN/CLOSED)
       │   ├─ Category (singles/doubles/teams)
       │   └─ Match Configuration
       │
       ├─→ Submit Form
       │
       ├─→ POST /api/v1/tournaments
       │
       ├─→ Backend Creates Tournament
       │   └─ Status: 'draft'
       │
       └─→ Redirect to Tournament Management
```

---

## 2️⃣ OPEN Tournament - Player Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│              OPEN TOURNAMENT - PLAYER FLOW                   │
└─────────────────────────────────────────────────────────────┘

Player                          Organizer
  │                                │
  ├─→ Browse Tournaments           │
  │                                │
  ├─→ View Tournament Details      │
  │                                │
  ├─→ Click "Register"             │
  │                                │
  ├─→ POST /tournaments/:id/request│
  │                                │
  │   ┌─────────────────────┐     │
  │   │ Registration Created│     │
  │   │ Status: pending     │     │
  │   └─────────────────────┘     │
  │                                │
  │                                ├─→ Receives SMS Notification
  │                                │   "Player requested to join"
  │                                │
  │                                ├─→ Views Registrations
  │                                │
  │                                ├─→ Reviews Request
  │                                │
  │                                ├─→ Decision:
  │                                │   ├─ Accept ─┐
  │                                │   │          │
  ├─ Receives SMS                  │   │          │
  │  "Registration Accepted"  ←────┼───┘          │
  │                                │              │
  │   ┌─────────────────────┐     │              │
  │   │ Status: accepted    │     │              │
  │   └─────────────────────┘     │              │
  │                                │              │
  │                                ├─ OR Reject ─┤
  │                                │              │
  ├─ Receives SMS                  │              │
  │  "Registration Rejected" ←─────┼──────────────┘
  │                                │
  │   ┌─────────────────────┐     │
  │   │ Status: rejected    │     │
  │   └─────────────────────┘     │
```

---

## 3️⃣ CLOSED Tournament - Invitation Flow

```
┌─────────────────────────────────────────────────────────────┐
│            CLOSED TOURNAMENT - INVITATION FLOW               │
└─────────────────────────────────────────────────────────────┘

Organizer                        System User              External User
    │                                │                         │
    ├─→ Click "Invite Players"       │                         │
    │                                │                         │
    ├─→ Choose Mode:                 │                         │
    │   ├─ Search System Users       │                         │
    │   └─ Enter Phone Numbers       │                         │
    │                                │                         │
    ├─→ POST /tournaments/:id/invite │                         │
    │   {phoneNumbers: [...]}        │                         │
    │                                │                         │
    │   ┌─────────────────────┐     │                         │
    │   │ Invitations Created │     │                         │
    │   │ Status: pending     │     │                         │
    │   └─────────────────────┘     │                         │
    │                                │                         │
    │                                ├─→ Receives SMS          │
    │                                │   "You're invited!"     │
    │                                │                         │
    │                                ├─→ Logs In              │
    │                                │                         │
    │                                ├─→ Views Invitations    │
    │                                │                         │
    │                                ├─→ Decision:            │
    │                                │   ├─ Accept ─┐         │
    │                                │   │          │         │
    │   ┌─────────────────────┐     │   │          │         │
    │   │ Status: accepted    │ ←───┼───┘          │         │
    │   └─────────────────────┘     │              │         │
    │                                │              │         │
    ├─ Receives SMS                  │              │         │
    │  "Player accepted"             │              │         │
    │                                │              │         │
    │                                ├─ OR Decline ─┤         │
    │                                │              │         │
    │   ┌─────────────────────┐     │              │         │
    │   │ Status: declined    │ ←───┼──────────────┘         │
    │   └─────────────────────┘     │                         │
    │                                │                         │
    │                                │                         ├─→ Receives SMS
    │                                │                         │   "You're invited!"
    │                                │                         │
    │                                │                         ├─→ Downloads App
    │                                │                         │
    │                                │                         ├─→ Registers with
    │                                │                         │   Same Phone
    │                                │                         │
    │   ┌─────────────────────┐     │                         │
    │   │ Auto-linked to      │ ←───┼─────────────────────────┘
    │   │ user_id             │     │
    │   └─────────────────────┘     │
```

---

## 4️⃣ Player Locking Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER LOCKING FLOW                       │
└─────────────────────────────────────────────────────────────┘

Organizer
    │
    ├─→ Views Tournament Registrations
    │
    ├─→ Filters: Show "Accepted" Players
    │
    │   ┌─────────────────────────────────┐
    │   │ Player List (Status: accepted)  │
    │   │ ┌─────────────────────────────┐ │
    │   │ │ Player 1  [Lock] [Reject]   │ │
    │   │ │ Player 2  [Lock] [Reject]   │ │
    │   │ │ Player 3  [Lock] [Reject]   │ │
    │   │ └─────────────────────────────┘ │
    │   └─────────────────────────────────┘
    │
    ├─→ Clicks "Lock" on Player 1
    │
    ├─→ PUT /tournaments/:id/:regId/lock
    │
    │   ┌─────────────────────┐
    │   │ Validation:         │
    │   │ ✓ Is Organizer?     │
    │   │ ✓ Status=accepted?  │
    │   └─────────────────────┘
    │
    │   ┌─────────────────────┐
    │   │ UPDATE              │
    │   │ status = 'locked'   │
    │   │ locked_at = NOW()   │
    │   └─────────────────────┘
    │
    │   ┌─────────────────────────────────┐
    │   │ Player List (Updated)           │
    │   │ ┌─────────────────────────────┐ │
    │   │ │ Player 1  [Unlock] 🔒       │ │
    │   │ │ Player 2  [Lock] [Reject]   │ │
    │   │ │ Player 3  [Lock] [Reject]   │ │
    │   │ └─────────────────────────────┘ │
    │   └─────────────────────────────────┘
    │
    └─→ Player 1 is now LOCKED (finalized)
```

---

## 5️⃣ Registration Status State Machine

```
┌─────────────────────────────────────────────────────────────┐
│              REGISTRATION STATUS TRANSITIONS                 │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │ pending  │ ← Initial State
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │rejected │    │ accepted │    │ declined │
    └─────────┘    └────┬─────┘    └──────────┘
         │              │               │
         │              ▼               │
         │         ┌─────────┐          │
         │         │ locked  │          │
         │         └─────────┘          │
         │              │               │
         │              ▼               │
         └──────────► [FINAL] ◄─────────┘


State Descriptions:
─────────────────
pending   → Awaiting organizer/player response
accepted  → Approved by organizer OR player accepted invitation
rejected  → Denied by organizer
declined  → Player declined invitation
locked    → Finalized for tournament (cannot change)

Transitions:
────────────
pending → accepted  (Organizer accepts OR Player accepts invitation)
pending → rejected  (Organizer rejects request)
pending → declined  (Player declines invitation)
accepted → locked   (Organizer locks player)
locked → accepted   (Organizer unlocks - only if not in team)
```

---

## 6️⃣ Database Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE RELATIONSHIPS                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐
│ tournaments │
│─────────────│
│ id          │◄────────────┐
│ name        │             │
│ organizer_id│─────┐       │
│ sport_id    │     │       │
│ venue_id    │     │       │
│ type        │     │       │
│ status      │     │       │
└─────────────┘     │       │
                    │       │
                    │       │
┌─────────────┐     │       │
│   users     │     │       │
│─────────────│     │       │
│ id          │◄────┤       │
│ first_name  │     │       │
│ last_name   │     │       │
│ phone       │     │       │
│ email       │     │       │
└─────────────┘     │       │
       ▲            │       │
       │            │       │
       │            │       │
       │    ┌───────┴───────┴──────────┐
       │    │ tournament_registrations │
       │    │──────────────────────────│
       └────┤ user_id                  │
            │ tournament_id            │
            │ invited_phone            │
            │ registration_type        │
            │ status                   │
            │ created_by               │
            │ locked_at                │
            └──────────────────────────┘

Relationships:
──────────────
1. tournaments.organizer_id → users.id
2. tournament_registrations.user_id → users.id
3. tournament_registrations.tournament_id → tournaments.id
4. tournament_registrations.created_by → users.id
```

---

## 7️⃣ Invitation System - Dual Mode

```
┌─────────────────────────────────────────────────────────────┐
│            INVITATION MODAL - TWO MODES                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Invite Players                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┬────────────────────┐            │
│  │ Search System Users│ Enter Phone Numbers│            │
│  └────────────────────┴────────────────────┘            │
│                                                          │
│  MODE 1: SEARCH                                          │
│  ┌────────────────────────────────────┐                 │
│  │ Search: [____________] [🔍]        │                 │
│  └────────────────────────────────────┘                 │
│                                                          │
│  Results:                                                │
│  ┌────────────────────────────────────┐                 │
│  │ ☑ John Doe                         │                 │
│  │   9876543210                       │                 │
│  │   john@example.com                 │                 │
│  │   Badminton • Advanced             │                 │
│  ├────────────────────────────────────┤                 │
│  │ ☐ Jane Smith                       │                 │
│  │   9123456789                       │                 │
│  │   jane@example.com                 │                 │
│  └────────────────────────────────────┘                 │
│                                                          │
│  Selected: John Doe                                      │
│                                                          │
│  ─────────────────────────────────────                  │
│                                                          │
│  MODE 2: PHONE NUMBERS                                   │
│  ┌────────────────────────────────────┐                 │
│  │ Phone Numbers:                     │                 │
│  │ [9876543210_______] [❌]           │                 │
│  │ [9123456789_______] [❌]           │                 │
│  │ [+ Add Another Phone Number]       │                 │
│  └────────────────────────────────────┘                 │
│                                                          │
│  ─────────────────────────────────────                  │
│                                                          │
│  Message:                                                │
│  ┌────────────────────────────────────┐                 │
│  │ You're invited to participate in   │                 │
│  │ "Tournament Name"! Join us for an  │                 │
│  │ exciting tournament.               │                 │
│  └────────────────────────────────────┘                 │
│                                                          │
│  [Cancel]              [Send Invitations (2)]           │
└──────────────────────────────────────────────────────────┘
```

---

## 8️⃣ Tournament Management Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│           TOURNAMENT MANAGEMENT DASHBOARD                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Tournament: Gujarat State Badminton Championships 2025  │
│  Status: Open  |  Participants: 15/32                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Overview] [Registrations] [Teams] [Matches] [Settings]│
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ REGISTRATIONS                                      │ │
│  │                                                    │ │
│  │ Tabs: [Pending (5)] [Accepted (10)] [Locked (3)]  │ │
│  │       [Rejected (2)] [All (20)]                    │ │
│  │                                                    │ │
│  │ ┌────────────────────────────────────────────────┐│ │
│  │ │ PENDING REQUESTS                               ││ │
│  │ │                                                ││ │
│  │ │ 👤 John Doe                                    ││ │
│  │ │    9876543210 | Advanced                       ││ │
│  │ │    Requested: 2 days ago                       ││ │
│  │ │    [Accept] [Reject]                           ││ │
│  │ │                                                ││ │
│  │ │ 👤 Jane Smith                                  ││ │
│  │ │    9123456789 | Intermediate                   ││ │
│  │ │    Requested: 1 day ago                        ││ │
│  │ │    [Accept] [Reject]                           ││ │
│  │ └────────────────────────────────────────────────┘│ │
│  │                                                    │ │
│  │ ┌────────────────────────────────────────────────┐│ │
│  │ │ ACCEPTED PLAYERS                               ││ │
│  │ │                                                ││ │
│  │ │ 👤 Mike Johnson                                ││ │
│  │ │    9555555555 | Expert                         ││ │
│  │ │    Accepted: 3 days ago                        ││ │
│  │ │    [Lock] [Reject]                             ││ │
│  │ └────────────────────────────────────────────────┘│ │
│  │                                                    │ │
│  │ ┌────────────────────────────────────────────────┐│ │
│  │ │ LOCKED PLAYERS (Finalized)                     ││ │
│  │ │                                                ││ │
│  │ │ 👤 Sarah Williams  🔒                          ││ │
│  │ │    9444444444 | Advanced                       ││ │
│  │ │    Locked: 1 week ago                          ││ │
│  │ │    [Unlock]                                    ││ │
│  │ └────────────────────────────────────────────────┘│ │
│  │                                                    │ │
│  │ [Invite Players] [Export List] [Lock All Accepted]│ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 9️⃣ Complete System Flow - End to End

```
┌─────────────────────────────────────────────────────────────┐
│              COMPLETE TOURNAMENT LIFECYCLE                   │
└─────────────────────────────────────────────────────────────┘

PHASE 1: CREATION
─────────────────
Organizer → Create Tournament → Set Type (OPEN/CLOSED)
                                      │
                                      ├─→ OPEN: Public registration
                                      └─→ CLOSED: Invitation only

PHASE 2: REGISTRATION
─────────────────────
OPEN Tournament:
  Player → Request to Join → Organizer Reviews → Accept/Reject

CLOSED Tournament:
  Organizer → Invite Players → Player Accepts/Declines

PHASE 3: PLAYER MANAGEMENT
──────────────────────────
Organizer → Review All Registrations
         → Accept Pending Requests
         → Lock Accepted Players

PHASE 4: TEAM FORMATION
───────────────────────
Organizer → Create Teams from Locked Players
         → Assign Players to Teams
         → Confirm Teams

PHASE 5: TOURNAMENT EXECUTION
─────────────────────────────
Organizer → Generate Brackets/Schedule
         → Start Tournament
         → Record Match Results
         → Update Standings

PHASE 6: COMPLETION
───────────────────
Organizer → Complete Tournament
         → Declare Winners
         → Generate Reports


Status Flow:
────────────
draft → open → ongoing → completed
  │      │       │          │
  └──────┴───────┴──────────┘
         (Organizer Controls)
```

---

## 🔟 API Request/Response Examples

### Example 1: Invite Players

**Request:**
```http
POST /api/v1/registrations/tournaments/123/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumbers": [
    "+919876543210",
    "+919123456789"
  ],
  "message": "You're invited to Gujarat State Championships!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitations sent to 2 player(s)",
  "data": {
    "invitations": [
      {
        "id": 456,
        "phone": "+919876543210",
        "user_id": 78,
        "in_system": true,
        "status": "pending"
      },
      {
        "id": 457,
        "phone": "+919123456789",
        "user_id": null,
        "in_system": false,
        "status": "pending"
      }
    ],
    "errors": []
  }
}
```

---

### Example 2: Get Registrations

**Request:**
```http
GET /api/v1/registrations/tournaments/123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "all": [...],
    "grouped": {
      "pending": [
        {
          "id": 1,
          "tournament_id": 123,
          "user_id": 45,
          "first_name": "John",
          "last_name": "Doe",
          "phone": "9876543210",
          "skill_level": "Advanced",
          "registration_type": "request",
          "status": "pending",
          "requested_at": "2025-11-01T10:30:00Z"
        }
      ],
      "accepted": [...],
      "locked": [...],
      "rejected": [...],
      "declined": [...]
    },
    "counts": {
      "total": 25,
      "pending": 5,
      "accepted": 12,
      "locked": 6,
      "rejected": 1,
      "declined": 1
    }
  }
}
```

---

### Example 3: Lock Player

**Request:**
```http
PUT /api/v1/registrations/tournaments/123/456/lock
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Player locked successfully",
  "data": {
    "id": 456,
    "status": "locked"
  }
}
```

---

## 📊 Summary

This document provides visual representations of:
- ✅ Tournament creation flow
- ✅ Player registration flows (OPEN & CLOSED)
- ✅ Invitation system (dual mode)
- ✅ Player locking mechanism
- ✅ Status state machine
- ✅ Database relationships
- ✅ UI components
- ✅ Complete lifecycle
- ✅ API examples

**All flows are fully implemented and production-ready!** 🚀
