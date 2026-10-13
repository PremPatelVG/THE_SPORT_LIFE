# Tournament Management API Documentation

Complete tournament management system with registration, brackets, scheduling, and standings.

## Base URL
```
http://localhost:3000/api/v1/tournaments
```

---

## 📋 Table of Contents

1. [Tournament CRUD](#tournament-crud)
2. [Tournament Lifecycle](#tournament-lifecycle)
3. [Registration](#registration)
4. [Brackets & Scheduling](#brackets--scheduling)
5. [Standings & Statistics](#standings--statistics)
6. [Queries & Filters](#queries--filters)

---

## Tournament CRUD

### Create Tournament

**Endpoint:** `POST /`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Summer Tennis Championship 2024",
  "description": "Annual summer tennis tournament for all skill levels",
  "sport_id": 1,
  "venue_id": 5,
  "logo": "https://example.com/logo.png",
  "start_date": "2024-08-01",
  "end_date": "2024-08-10",
  "registration_start": "2024-06-01T00:00:00Z",
  "registration_end": "2024-07-25T23:59:59Z",
  "max_participants": 32,
  "entry_fee": 50.00,
  "prize_money": 1000.00,
  "format_type": "knockout",
  "category": "singles",
  "rules": {
    "best_of_sets": 3,
    "tiebreak_at": 6,
    "final_set_tiebreak": true
  },
  "platform_commission_percent": 10
}
```

**Required Fields:**
- `name` - Tournament name (3-255 characters)
- `sport_id` - Sport ID from sports table
- `start_date` - Tournament start date (ISO 8601)
- `end_date` - Tournament end date (ISO 8601)
- `registration_start` - Registration start datetime
- `registration_end` - Registration end datetime
- `format_type` - One of: `knockout`, `round_robin`, `groups_knockout`, `league`, `ladder`
- `category` - One of: `singles`, `doubles`, `teams`

**Optional Fields:**
- `description` - Tournament description
- `venue_id` - Venue ID
- `logo` - Logo URL
- `max_participants` - Maximum participants (2-1000)
- `entry_fee` - Entry fee amount (default: 0)
- `prize_money` - Total prize money (default: 0)
- `rules` - Custom rules object
- `platform_commission_percent` - Platform commission (default: 10)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Tournament created successfully",
  "data": {
    "id": 1,
    "name": "Summer Tennis Championship 2024",
    "status": "draft",
    "sport_name": "Tennis",
    "venue_name": "City Sports Complex",
    "organizer_first_name": "John",
    "organizer_last_name": "Doe",
    "participant_count": 0,
    "created_at": "2024-06-01T10:00:00.000Z"
  }
}
```

---

### Get All Tournaments

**Endpoint:** `GET /`

**Authentication:** Not required

**Query Parameters:**
- `status` - Filter by status (`draft`, `open`, `closed`, `ongoing`, `completed`, `cancelled`)
- `sport_id` - Filter by sport ID
- `category` - Filter by category (`singles`, `doubles`, `teams`)
- `format_type` - Filter by format
- `search` - Search in name and description
- `limit` - Results per page (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Example:**
```
GET /api/v1/tournaments?status=open&sport_id=1&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Tennis Championship 2024",
      "status": "open",
      "sport_name": "Tennis",
      "venue_name": "City Sports Complex",
      "venue_city": "New York",
      "start_date": "2024-08-01",
      "end_date": "2024-08-10",
      "entry_fee": 50.00,
      "participant_count": 15,
      "max_participants": 32
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

---

### Get Tournament by ID

**Endpoint:** `GET /:id`

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Summer Tennis Championship 2024",
    "description": "Annual summer tennis tournament",
    "status": "open",
    "sport_id": 1,
    "sport_name": "Tennis",
    "sport_category": "racquet",
    "venue_id": 5,
    "venue_name": "City Sports Complex",
    "venue_city": "New York",
    "organizer_id": 10,
    "organizer_first_name": "John",
    "organizer_last_name": "Doe",
    "organizer_email": "john@example.com",
    "start_date": "2024-08-01",
    "end_date": "2024-08-10",
    "registration_start": "2024-06-01T00:00:00.000Z",
    "registration_end": "2024-07-25T23:59:59.000Z",
    "max_participants": 32,
    "entry_fee": 50.00,
    "prize_money": 1000.00,
    "format_type": "knockout",
    "category": "singles",
    "rules": {
      "best_of_sets": 3,
      "tiebreak_at": 6
    },
    "participant_count": 15,
    "participants": [...],
    "statistics": {
      "total_participants": 15,
      "total_matches": 0,
      "completed_matches": 0,
      "total_collected": 750.00,
      "match_days": 0
    }
  }
}
```

---

### Update Tournament

**Endpoint:** `PUT /:id`

**Authentication:** Required (Organizer only)

**Request Body:**
```json
{
  "name": "Updated Tournament Name",
  "description": "Updated description",
  "max_participants": 64,
  "entry_fee": 75.00
}
```

**Note:** Cannot update `sport_id`, `format_type`, `category`, or `entry_fee` after tournament starts.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tournament updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Tournament Name",
    ...
  }
}
```

---

### Delete Tournament

**Endpoint:** `DELETE /:id`

**Authentication:** Required (Organizer only)

**Restrictions:**
- Cannot delete ongoing or completed tournaments
- Cannot delete tournaments with paid participants

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tournament deleted successfully"
}
```

---

## Tournament Lifecycle

### 1. Publish Tournament

**Endpoint:** `POST /:id/publish`

**Authentication:** Required (Organizer only)

**Description:** Opens tournament for registration

**Requirements:**
- Tournament must be in `draft` status
- All required fields must be filled

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tournament published successfully",
  "data": {
    "id": 1,
    "status": "open",
    ...
  }
}
```

---

### 2. Close Registration

**Endpoint:** `POST /:id/close-registration`

**Authentication:** Required (Organizer only)

**Description:** Closes registration, prepares for bracket generation

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration closed successfully",
  "data": {
    "id": 1,
    "status": "closed",
    ...
  }
}
```

---

### 3. Generate Brackets

**Endpoint:** `POST /:id/generate-brackets`

**Authentication:** Required (Organizer only)

**Description:** Generates tournament brackets based on format

**Requirements:**
- Tournament must be in `closed` status
- At least 2 confirmed participants

**Response (200 OK):**

**For Knockout:**
```json
{
  "success": true,
  "message": "Brackets generated successfully",
  "data": {
    "format": "knockout",
    "total_rounds": 5,
    "bracket_size": 32,
    "participants": 28,
    "byes": 4,
    "first_round_matches": 14
  }
}
```

**For Round Robin:**
```json
{
  "success": true,
  "message": "Brackets generated successfully",
  "data": {
    "format": "round_robin",
    "total_matches": 45,
    "participants": 10
  }
}
```

**For Groups + Knockout:**
```json
{
  "success": true,
  "message": "Brackets generated successfully",
  "data": {
    "format": "groups_knockout",
    "groups": 4,
    "group_stage_matches": 24,
    "participants": 16
  }
}
```

---

### 4. Complete Tournament

**Endpoint:** `POST /:id/complete`

**Authentication:** Required (Organizer only)

**Description:** Marks tournament as completed, processes payouts

**Requirements:**
- Tournament must be in `ongoing` status
- All matches must be completed

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tournament completed successfully",
  "data": {
    "id": 1,
    "status": "completed",
    ...
  }
}
```

---

## Registration

### Register for Tournament

**Endpoint:** `POST /:id/register`

**Authentication:** Required

**Description:** Register current user for tournament

**Requirements:**
- Tournament must be in `open` status
- Registration period must be active
- User not already registered
- Tournament not full
- Category must be `singles` (for individual registration)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully registered for tournament",
  "data": {
    "id": 1,
    "tournament_id": 1,
    "tournament_name": "Summer Tennis Championship 2024",
    "user_id": 5,
    "participant_name": "John Doe",
    "registration_date": "2024-06-15T10:00:00.000Z",
    "payment_status": "pending",
    "status": "registered",
    "entry_fee": 50.00
  }
}
```

---

### Withdraw from Tournament

**Endpoint:** `POST /:id/withdraw`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Personal reasons"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully withdrawn from tournament"
}
```

**Note:** Refunds are processed based on tournament refund policy.

---

## Brackets & Scheduling

### Get Tournament Matches

**Endpoint:** `GET /:id/matches`

**Authentication:** Not required

**Query Parameters:**
- `round` - Filter by round number
- `status` - Filter by match status

**Example:**
```
GET /api/v1/tournaments/1/matches?round=1&status=scheduled
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournament_id": 1,
      "round_number": 1,
      "match_number": 1,
      "round_name": "Round 1",
      "participant1_id": 10,
      "participant1_name": "John Doe",
      "participant2_id": 15,
      "participant2_name": "Jane Smith",
      "match_date": "2024-08-01",
      "match_time": "10:00:00",
      "court_name": "Court 1",
      "venue_name": "City Sports Complex",
      "status": "scheduled",
      "winner_participant_id": null,
      "score": null
    }
  ]
}
```

---

### Assign Seeds

**Endpoint:** `POST /:id/assign-seeds`

**Authentication:** Required (Organizer only)

**Description:** Manually assign seed numbers to participants

**Request Body:**
```json
{
  "seeds": [
    { "id": 10, "seed_number": 1 },
    { "id": 15, "seed_number": 2 },
    { "id": 20, "seed_number": 3 },
    { "id": 25, "seed_number": 4 }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Seeds assigned successfully"
}
```

---

## Standings & Statistics

### Get Tournament Standings

**Endpoint:** `GET /:id/standings`

**Authentication:** Not required

**Query Parameters:**
- `group_id` - Filter by group (for group stage tournaments)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournament_id": 1,
      "participant_id": 10,
      "participant_name": "John Doe",
      "position": 1,
      "matches_played": 5,
      "matches_won": 4,
      "matches_lost": 1,
      "matches_drawn": 0,
      "points": 12,
      "sets_won": 12,
      "sets_lost": 5,
      "games_won": 72,
      "games_lost": 45,
      "is_eliminated": false
    }
  ]
}
```

---

### Get Tournament Participants

**Endpoint:** `GET /:id/participants`

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournament_id": 1,
      "user_id": 10,
      "participant_name": "John Doe",
      "participant_image": "https://...",
      "seed_number": 1,
      "registration_date": "2024-06-15T10:00:00.000Z",
      "payment_status": "paid",
      "status": "confirmed"
    }
  ]
}
```

---

### Get Tournament Statistics

**Endpoint:** `GET /:id/statistics`

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_participants": 32,
    "total_matches": 31,
    "completed_matches": 15,
    "total_collected": 1600.00,
    "match_days": 5
  }
}
```

---

## Queries & Filters

### Get My Tournaments

**Endpoint:** `GET /my/tournaments`

**Authentication:** Required

**Description:** Get tournaments where user is organizer or participant

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Tennis Championship 2024",
      "status": "ongoing",
      "user_role": "organizer",
      "sport_name": "Tennis",
      "start_date": "2024-08-01",
      "participant_count": 32
    },
    {
      "id": 2,
      "name": "City Badminton League",
      "status": "open",
      "user_role": "participant",
      "sport_name": "Badminton",
      "start_date": "2024-09-01",
      "participant_count": 18
    }
  ]
}
```

---

### Get Upcoming Tournaments

**Endpoint:** `GET /upcoming`

**Authentication:** Not required

**Query Parameters:**
- `limit` - Number of results (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Tennis Championship 2024",
      "status": "open",
      "sport_name": "Tennis",
      "venue_name": "City Sports Complex",
      "venue_city": "New York",
      "start_date": "2024-08-01",
      "entry_fee": 50.00,
      "participant_count": 15,
      "max_participants": 32
    }
  ]
}
```

---

### Get Ongoing Tournaments

**Endpoint:** `GET /ongoing`

**Authentication:** Not required

**Query Parameters:**
- `limit` - Number of results (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "City Football League",
      "status": "ongoing",
      "sport_name": "Football",
      "venue_name": "Stadium",
      "start_date": "2024-07-01",
      "end_date": "2024-07-31",
      "participant_count": 16
    }
  ]
}
```

---

## Tournament Status Flow

```
draft → open → closed → ongoing → completed
         ↓                         ↓
      cancelled                cancelled
```

**Status Descriptions:**
- `draft` - Tournament created, not published
- `open` - Published, registration open
- `closed` - Registration closed, awaiting bracket generation
- `ongoing` - Brackets generated, matches in progress
- `completed` - All matches finished, payouts processed
- `cancelled` - Tournament cancelled

---

## Tournament Formats

### 1. Knockout (Single Elimination)

**Description:** Participants are eliminated after one loss

**Features:**
- Standard seeding (1 vs lowest seed, 2 vs second-lowest, etc.)
- Automatic bye assignment for non-power-of-2 participants
- Winner advances to next round

**Best For:** Quick tournaments, large participant counts

---

### 2. Round Robin

**Description:** Every participant plays every other participant once

**Features:**
- Points system (Win: 3, Draw: 1, Loss: 0)
- Standings based on points, then head-to-head
- No elimination

**Best For:** Small groups, fair competition

---

### 3. Groups + Knockout

**Description:** Group stage (round robin) followed by knockout

**Features:**
- Participants divided into groups
- Round robin within each group
- Top N from each group advance to knockout
- Best for medium to large tournaments

**Best For:** Balanced competition, multiple stages

---

## Payment & Financial Flow

### Entry Fee Collection

1. User registers for tournament
2. Payment status set to `pending`
3. User completes payment (via payment gateway)
4. Payment status updated to `paid`
5. Participant status updated to `confirmed`

### Payout Distribution

When tournament completes:

```
Total Collected = Entry Fee × Participants
Platform Commission = Total × Commission %
Prize Money = Configured amount
Organizer Payout = Total - Commission - Prizes
```

Example:
```
32 participants × $50 = $1,600
Platform (10%) = $160
Prize Money = $500
Organizer = $940
```

---

## Error Responses

### Common Errors

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Tournament registration is not open"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Only the organizer can update this tournament"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Tournament not found"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "start_date",
      "message": "Start date cannot be in the past"
    },
    {
      "field": "max_participants",
      "message": "Max participants must be between 2 and 1000"
    }
  ]
}
```

---

## Best Practices

### For Organizers

1. **Create Draft First:** Create tournament in draft, review all details
2. **Set Realistic Dates:** Allow enough time for registration and matches
3. **Configure Rules:** Set clear rules before publishing
4. **Assign Seeds:** Manually seed top players for fair brackets
5. **Monitor Registration:** Close registration when target reached
6. **Generate Brackets Early:** Generate brackets before tournament start
7. **Complete Promptly:** Mark tournament complete after all matches

### For Participants

1. **Register Early:** Popular tournaments fill up quickly
2. **Complete Payment:** Confirm registration by paying entry fee
3. **Check Schedule:** Review match schedule after brackets generated
4. **Withdraw Responsibly:** Withdraw early if unable to participate
5. **Verify Results:** Check match results and standings

---

## Rate Limits

- **Public Endpoints:** 100 requests per 15 minutes
- **Authenticated Endpoints:** 200 requests per 15 minutes
- **Tournament Creation:** 10 per hour per user

---

## Testing

### Using cURL

**Create Tournament:**
```bash
curl -X POST http://localhost:3000/api/v1/tournaments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament",
    "sport_id": 1,
    "start_date": "2024-12-01",
    "end_date": "2024-12-10",
    "registration_start": "2024-10-01T00:00:00Z",
    "registration_end": "2024-11-25T23:59:59Z",
    "format_type": "knockout",
    "category": "singles"
  }'
```

**Register for Tournament:**
```bash
curl -X POST http://localhost:3000/api/v1/tournaments/1/register \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Tournaments:**
```bash
curl http://localhost:3000/api/v1/tournaments?status=open&sport_id=1
```

---

**Last Updated:** October 15, 2024  
**API Version:** v1
