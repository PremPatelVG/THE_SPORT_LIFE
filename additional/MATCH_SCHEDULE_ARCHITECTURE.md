# Match Scheduling System - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOURNAMENT DETAIL PAGE                       │
│                                                                   │
│  ┌─────────────┬──────────────────┬─────────────────────────┐  │
│  │  Overview   │  Match Schedule  │       Bracket           │  │
│  │    Tab      │      Tab         │         Tab             │  │
│  └─────────────┴──────────────────┴─────────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │  MatchScheduleTab     │                          │
│              │   Component           │                          │
│              └───────────────────────┘                          │
│                     │         │                                 │
│         ┌───────────┘         └──────────┐                     │
│         ▼                                 ▼                     │
│  ┌──────────────────┐           ┌──────────────────┐          │
│  │ RescheduleModal  │           │  CancelModal     │          │
│  └──────────────────┘           └──────────────────┘          │
│         │                                 │                     │
│         └─────────────┬───────────────────┘                    │
│                       ▼                                         │
│              ┌─────────────────┐                               │
│              │  matchService   │                               │
│              └─────────────────┘                               │
└───────────────────────│─────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │      BACKEND API              │
        │                               │
        │  /matches/tournament/:id      │
        │  /matches/:id (PUT)           │
        │  /matches/:id/cancel (POST)   │
        │  /matches/:id/postpone (POST) │
        └───────────────────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │    DATABASE   │
                │   (MySQL)     │
                └───────────────┘
```

## Component Hierarchy

```
TournamentDetail
│
├── Navbar
│
├── Tournament Info Card
│
├── TournamentManagementPanel (if organizer)
│
└── Tabs Container
    │
    ├── Overview Tab
    │   └── Participants List
    │
    ├── Match Schedule Tab ★ NEW
    │   │
    │   ├── Header
    │   │   ├── Title
    │   │   ├── Filters Button
    │   │   └── Refresh Button
    │   │
    │   ├── Filters Panel (collapsible)
    │   │   ├── Status Filter
    │   │   └── Round Filter
    │   │
    │   ├── Matches List
    │   │   └── Round Groups
    │   │       └── Match Cards
    │   │           ├── Participants
    │   │           ├── Date/Time
    │   │           ├── Venue/Court
    │   │           ├── Status Badge
    │   │           └── Action Buttons
    │   │               ├── Reschedule
    │   │               └── Cancel
    │   │
    │   ├── RescheduleMatchModal
    │   │   ├── Match Info
    │   │   ├── Date Picker
    │   │   ├── Time Picker
    │   │   └── Submit Button
    │   │
    │   └── CancelMatchModal
    │       ├── Warning Message
    │       ├── Match Info
    │       ├── Reason Input
    │       └── Confirm Button
    │
    └── Bracket Tab
        └── TournamentBracket
```

## Data Flow Diagram

### Reschedule Match Flow

```
┌──────────────┐
│   User       │
│  (Organizer) │
└──────┬───────┘
       │ 1. Clicks Edit
       ▼
┌──────────────────┐
│  Match Card      │
└──────┬───────────┘
       │ 2. Opens Modal
       ▼
┌──────────────────────┐
│ RescheduleModal      │
│ - Shows current time │
│ - Date picker        │
│ - Time picker        │
└──────┬───────────────┘
       │ 3. Submits Form
       ▼
┌──────────────────┐
│  matchService    │
│  .rescheduleMatch│
└──────┬───────────┘
       │ 4. PUT /matches/:id
       ▼
┌──────────────────────┐
│  Backend API         │
│  - Validate user     │
│  - Check permissions │
│  - Verify court      │
└──────┬───────────────┘
       │ 5. Update DB
       ▼
┌──────────────────┐
│   Database       │
│   UPDATE matches │
└──────┬───────────┘
       │ 6. Return updated match
       ▼
┌──────────────────┐
│  matchService    │
└──────┬───────────┘
       │ 7. Success response
       ▼
┌──────────────────────┐
│ MatchScheduleTab     │
│ - Close modal        │
│ - Refresh list       │
│ - Show toast         │
└──────────────────────┘
```

### Cancel Match Flow

```
┌──────────────┐
│   User       │
│  (Organizer) │
└──────┬───────┘
       │ 1. Clicks Cancel
       ▼
┌──────────────────┐
│  Match Card      │
└──────┬───────────┘
       │ 2. Opens Modal
       ▼
┌──────────────────────┐
│ CancelModal          │
│ - Shows warning      │
│ - Reason input       │
└──────┬───────────────┘
       │ 3. Submits with reason
       ▼
┌──────────────────┐
│  matchService    │
│  .cancelMatch    │
└──────┬───────────┘
       │ 4. POST /matches/:id/cancel
       ▼
┌──────────────────────┐
│  Backend API         │
│  - Validate user     │
│  - Check permissions │
│  - Verify not done   │
└──────┬───────────────┘
       │ 5. Update status
       ▼
┌──────────────────┐
│   Database       │
│   status='cancelled'│
└──────┬───────────┘
       │ 6. Return updated match
       ▼
┌──────────────────┐
│  matchService    │
└──────┬───────────┘
       │ 7. Success response
       ▼
┌──────────────────────┐
│ MatchScheduleTab     │
│ - Close modal        │
│ - Refresh list       │
│ - Show toast         │
└──────────────────────┘
```

## State Management

```
┌─────────────────────────────────────┐
│      MatchScheduleTab State         │
├─────────────────────────────────────┤
│ matches: []                         │
│ loading: false                      │
│ selectedMatch: null                 │
│ showRescheduleModal: false          │
│ showCancelModal: false              │
│ filterStatus: 'all'                 │
│ filterRound: 'all'                  │
│ showFilters: false                  │
└─────────────────────────────────────┘
         │
         ├─ fetchMatches() → API call
         ├─ handleReschedule() → Open modal
         ├─ handleCancel() → Open modal
         ├─ handleRescheduleSuccess() → Refresh
         └─ handleCancelSuccess() → Refresh
```

## API Endpoints Used

```
┌────────────────────────────────────────────────────────┐
│                    Match API                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  GET    /matches/tournament/:id                       │
│  ├─ Query: status, round_number, limit, offset       │
│  └─ Returns: Array of matches                        │
│                                                        │
│  PUT    /matches/:id                                  │
│  ├─ Body: { match_date, match_time }                 │
│  └─ Returns: Updated match                           │
│                                                        │
│  POST   /matches/:id/cancel                           │
│  ├─ Body: { reason }                                  │
│  └─ Returns: Cancelled match                         │
│                                                        │
│  POST   /matches/:id/postpone                         │
│  ├─ Body: { new_date, new_time }                     │
│  └─ Returns: Postponed match                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Database Schema (Existing)

```sql
matches
├─ id (PK)
├─ tournament_id (FK)
├─ round_number
├─ round_name
├─ match_number
├─ participant1_id (FK)
├─ participant2_id (FK)
├─ match_date
├─ match_time
├─ venue_id (FK)
├─ court_id (FK)
├─ status (enum)
├─ winner_participant_id (FK)
├─ score (JSON)
├─ scheduled_duration
├─ actual_start_time
├─ actual_end_time
├─ referee_id (FK)
├─ created_at
└─ updated_at
```

## Permission Matrix

```
┌──────────────┬───────────┬─────────────┬────────┐
│   Action     │ Organizer │ Participant │ Public │
├──────────────┼───────────┼─────────────┼────────┤
│ View         │     ✓     │      ✓      │   ✓    │
│ Reschedule   │     ✓     │      ✗      │   ✗    │
│ Cancel       │     ✓     │      ✗      │   ✗    │
│ Start        │     ✓     │      ✗      │   ✗    │
│ Complete     │     ✓     │      ✗      │   ✗    │
│ Assign Ref   │     ✓     │      ✗      │   ✗    │
└──────────────┴───────────┴─────────────┴────────┘
```

## Status State Machine

```
                    ┌─────────────┐
                    │  scheduled  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐  ┌────────┐  ┌──────────┐
        │postponed │  │ ready  │  │cancelled │
        └──────────┘  └───┬────┘  └──────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ in_progress │
                   └──────┬──────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌─────────┐ ┌─────────┐
        │completed │ │walkover │ │cancelled│
        └──────────┘ └─────────┘ └─────────┘
```

## File Dependencies

```
TournamentDetail.jsx
    │
    ├─ imports MatchScheduleTab.jsx
    │       │
    │       ├─ imports RescheduleMatchModal.jsx
    │       │       │
    │       │       └─ imports matchService.js
    │       │
    │       ├─ imports CancelMatchModal.jsx
    │       │       │
    │       │       └─ imports matchService.js
    │       │
    │       └─ imports matchService.js
    │
    └─ imports tournamentService.js
```

## Error Handling Flow

```
┌──────────────┐
│  User Action │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  API Call    │
└──────┬───────┘
       │
       ├─ Success ──────────┐
       │                    │
       └─ Error             ▼
           │         ┌──────────────┐
           │         │ Update UI    │
           │         │ Show Toast   │
           │         │ Refresh Data │
           │         └──────────────┘
           ▼
    ┌──────────────┐
    │ Catch Error  │
    └──────┬───────┘
           │
           ├─ Network Error
           ├─ 401 Unauthorized
           ├─ 403 Forbidden
           ├─ 404 Not Found
           └─ 400 Bad Request
                    │
                    ▼
            ┌──────────────┐
            │ Show Error   │
            │ - Toast      │
            │ - Modal      │
            │ - Inline     │
            └──────────────┘
```

## Responsive Layout

```
Desktop (1920px+)
┌────────────────────────────────────────┐
│  Navbar                                │
├────────────────────────────────────────┤
│  Tournament Header                     │
├──────────────────────┬─────────────────┤
│                      │                 │
│  Main Content        │    Sidebar      │
│  - Tabs              │    - Actions    │
│  - Match Schedule    │    - Stats      │
│                      │                 │
└──────────────────────┴─────────────────┘

Mobile (375px+)
┌────────────────┐
│  Navbar        │
├────────────────┤
│  Tournament    │
│  Header        │
├────────────────┤
│  Tabs          │
│  (Swipeable)   │
├────────────────┤
│  Match         │
│  Schedule      │
│  (Stacked)     │
├────────────────┤
│  Sidebar       │
│  (Below)       │
└────────────────┘
```

---

This architecture provides a scalable, maintainable, and user-friendly match scheduling system integrated seamlessly into the existing tournament management platform.
