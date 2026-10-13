# 👨‍⚖️ Referee Management Module - Complete Guide

## Overview

The Referee Management module provides comprehensive functionality for managing referees, their certifications, availability, assignments, and performance tracking.

## 📁 Module Structure

```
src/
├── models/
│   └── Referee.js                 # Database operations
├── services/
│   └── refereeService.js          # Business logic (function-based)
├── controllers/
│   └── refereeController.js       # HTTP request handlers
└── routes/
    └── referee.routes.js          # API route definitions
```

## 🗄️ Database Tables

### 1. **referee_performance**
Tracks overall referee performance metrics.

```sql
- referee_id (UNIQUE)
- total_matches_assigned
- matches_completed
- matches_missed
- reliability_score
- average_rating
```

### 2. **referee_certifications**
Stores referee certifications for different sports.

```sql
- referee_id
- sport_id
- certification_level (beginner, intermediate, advanced, professional)
- certified_date
- expiry_date
- certificate_number
- issuing_authority
- is_active
```

### 3. **referee_availability**
Manages referee availability schedules.

```sql
- referee_id
- tournament_id (optional)
- available_date
- start_time
- end_time
- is_available
- reason
```

### 4. **referee_assignment_requests**
Tracks referee assignment requests and responses.

```sql
- match_id
- referee_id
- assigned_by
- status (pending, accepted, declined, cancelled)
- assigned_at
- responded_at
- decline_reason
- notification_sent
```

### 5. **referee_ratings**
Stores referee performance ratings after matches.

```sql
- match_id (UNIQUE)
- referee_id
- rating (1.0 - 5.0)
- feedback
- rated_by
```

## 🚀 API Endpoints

### 1. Get All Referees
```http
GET /api/v1/referees?sport_id=1&certification_level=professional&min_rating=4.0

Response:
{
  "success": true,
  "data": [
    {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "profile_image": "...",
      "is_active": true,
      "total_matches_assigned": 50,
      "matches_completed": 48,
      "reliability_score": 96.0,
      "average_rating": 4.5,
      "certified_sports_count": 3
    }
  ],
  "total": 1
}
```

**Query Parameters:**
- `sport_id` - Filter by sport
- `certification_level` - Filter by certification level
- `is_active` - Filter by active status
- `min_rating` - Minimum average rating
- `limit` - Limit results

### 2. Get Referee Profile
```http
GET /api/v1/referees/:refereeId

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profile_image": "...",
    "total_matches_assigned": 50,
    "matches_completed": 48,
    "reliability_score": 96.0,
    "average_rating": 4.5,
    "certifications": [
      {
        "id": 1,
        "sport_id": 1,
        "sport_name": "Tennis",
        "certification_level": "professional",
        "certified_date": "2024-01-01",
        "expiry_date": "2026-01-01",
        "is_active": true
      }
    ],
    "performance": {
      "total_matches_assigned": 50,
      "matches_completed": 48,
      "matches_missed": 2,
      "reliability_score": 96.0,
      "average_rating": 4.5
    }
  }
}
```

### 3. Add Certification
```http
POST /api/v1/referees/:refereeId/certifications
Authorization: Bearer <token>

Request Body:
{
  "sport_id": 1,
  "certification_level": "professional",
  "certified_date": "2024-01-01",
  "expiry_date": "2026-01-01",
  "certificate_number": "CERT-12345",
  "issuing_authority": "National Tennis Federation"
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "referee_id": 123,
    "sport_id": 1,
    "certification_level": "professional",
    ...
  },
  "message": "Certification added successfully"
}
```

### 4. Update Certification
```http
PATCH /api/v1/referees/certifications/:certificationId
Authorization: Bearer <token>

Request Body:
{
  "certification_level": "advanced",
  "expiry_date": "2027-01-01",
  "is_active": true
}

Response:
{
  "success": true,
  "data": { ... },
  "message": "Certification updated successfully"
}
```

### 5. Set Availability
```http
POST /api/v1/referees/:refereeId/availability
Authorization: Bearer <token>

Request Body:
{
  "available_date": "2025-10-20",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "is_available": true,
  "tournament_id": 456
}

Response:
{
  "success": true,
  "message": "Availability updated successfully"
}
```

### 6. Get Availability
```http
GET /api/v1/referees/:refereeId/availability?start_date=2025-10-01&end_date=2025-10-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "referee_id": 123,
      "available_date": "2025-10-20",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "is_available": true,
      "tournament_id": 456
    }
  ]
}
```

### 7. Get Assignments
```http
GET /api/v1/referees/:refereeId/assignments?status=scheduled&limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 789,
      "tournament_name": "Summer Championship",
      "sport_name": "Tennis",
      "match_date": "2025-10-20",
      "match_time": "14:00:00",
      "venue_name": "Central Court",
      "court_name": "Court 1",
      "status": "scheduled",
      "assignment_status": "accepted"
    }
  ],
  "total": 1
}
```

### 8. Get Assignment Requests
```http
GET /api/v1/referees/:refereeId/requests?status=pending
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "match_id": 789,
      "match_date": "2025-10-20",
      "match_time": "14:00:00",
      "tournament_name": "Summer Championship",
      "sport_name": "Tennis",
      "status": "pending",
      "assigned_at": "2025-10-15T10:00:00Z",
      "assigned_by_first_name": "Jane",
      "assigned_by_last_name": "Smith"
    }
  ],
  "total": 1
}
```

### 9. Assign Referee to Match
```http
POST /api/v1/referees/assign
Authorization: Bearer <token>

Request Body:
{
  "match_id": 789,
  "referee_id": 123
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Referee assignment request created",
    "matchId": 789,
    "refereeId": 123
  },
  "message": "Referee assignment request created"
}
```

### 10. Respond to Assignment
```http
POST /api/v1/referees/requests/:requestId/respond
Authorization: Bearer <token>

Request Body:
{
  "response": "accepted",
  "reason": null
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Assignment accepted successfully",
    "requestId": 1,
    "response": "accepted"
  },
  "message": "Assignment accepted successfully"
}
```

**Response values:** `"accepted"` or `"declined"`

### 11. Cancel Assignment
```http
DELETE /api/v1/referees/assign/:matchId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Referee assignment cancelled successfully"
}
```

### 12. Get Available Referees for Match
```http
GET /api/v1/referees/available/:matchId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "reliability_score": 96.0,
      "average_rating": 4.5,
      "total_matches_assigned": 50,
      "matches_completed": 48,
      "certification_level": "professional"
    }
  ],
  "total": 1
}
```

### 13. Get Performance Stats
```http
GET /api/v1/referees/:refereeId/performance

Response:
{
  "success": true,
  "data": {
    "referee_id": 123,
    "total_matches_assigned": 50,
    "matches_completed": 48,
    "matches_missed": 2,
    "reliability_score": 96.0,
    "average_rating": 4.5
  }
}
```

### 14. Rate Referee Performance
```http
POST /api/v1/referees/rate
Authorization: Bearer <token>

Request Body:
{
  "match_id": 789,
  "rating": 4.5,
  "feedback": "Excellent officiating, fair decisions"
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Referee rated successfully",
    "rating": 4.5
  },
  "message": "Referee rated successfully"
}
```

**Rating:** Must be between 1.0 and 5.0

### 15. Get Referee Statistics
```http
GET /api/v1/referees/:refereeId/statistics

Response:
{
  "success": true,
  "data": {
    "performance": {
      "total_matches_assigned": 50,
      "matches_completed": 48,
      "reliability_score": 96.0,
      "average_rating": 4.5
    },
    "certifications": {
      "total": 3,
      "active": 3,
      "sports": [
        {
          "sport_name": "Tennis",
          "level": "professional",
          "is_active": true
        }
      ]
    },
    "assignments": {
      "total": 50,
      "upcoming": 5,
      "completed": 48
    }
  }
}
```

## 🔐 Authorization

### Public Endpoints (No Auth Required)
- GET `/api/v1/referees` - List all referees
- GET `/api/v1/referees/:refereeId` - Get referee profile
- GET `/api/v1/referees/:refereeId/certifications` - Get certifications
- GET `/api/v1/referees/:refereeId/performance` - Get performance
- GET `/api/v1/referees/:refereeId/statistics` - Get statistics

### Protected Endpoints (Auth Required)
All other endpoints require authentication via JWT token.

### Permission Rules
- **Referees** can:
  - Set their own availability
  - View their assignments and requests
  - Respond to assignment requests
  
- **Tournament Organizers** can:
  - Assign referees to matches
  - Cancel assignments
  - Rate referee performance
  
- **Admins** can:
  - Add/update certifications for any referee
  - All organizer permissions

## 💡 Use Cases

### 1. Referee Registration & Certification
```javascript
// 1. User registers as player (can become referee)
POST /api/v1/auth/register

// 2. Admin adds certification
POST /api/v1/referees/123/certifications
{
  "sport_id": 1,
  "certification_level": "professional",
  "certified_date": "2024-01-01",
  "expiry_date": "2026-01-01"
}
```

### 2. Setting Availability
```javascript
// Referee sets availability for multiple dates
POST /api/v1/referees/123/availability
{
  "available_date": "2025-10-20",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "is_available": true
}
```

### 3. Match Assignment Flow
```javascript
// 1. Organizer gets available referees
GET /api/v1/referees/available/789

// 2. Organizer assigns referee
POST /api/v1/referees/assign
{
  "match_id": 789,
  "referee_id": 123
}

// 3. Referee receives request
GET /api/v1/referees/123/requests?status=pending

// 4. Referee accepts/declines
POST /api/v1/referees/requests/1/respond
{
  "response": "accepted"
}
```

### 4. Post-Match Rating
```javascript
// After match completion, organizer rates referee
POST /api/v1/referees/rate
{
  "match_id": 789,
  "rating": 4.5,
  "feedback": "Great job!"
}
```

## 🔍 Business Logic

### Availability Checking
The system automatically checks:
- ✅ Referee is certified for the sport
- ✅ Referee is not already assigned to another match at same time
- ✅ Referee is not a participant in the match (conflict of interest)
- ✅ Referee has marked themselves as available

### Reliability Score
Calculated as: `(matches_completed / total_matches_assigned) * 100`

### Average Rating
Calculated from all referee_ratings entries for the referee.

### Assignment Status Flow
```
pending → accepted → (match completed) → rated
        ↓
      declined
```

## 🧪 Testing Examples

### Test Scenario 1: Complete Referee Workflow
```bash
# 1. Get all professional tennis referees
curl -X GET "http://localhost:3000/api/v1/referees?sport_id=1&certification_level=professional"

# 2. Get referee profile
curl -X GET "http://localhost:3000/api/v1/referees/123"

# 3. Set availability
curl -X POST "http://localhost:3000/api/v1/referees/123/availability" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "available_date": "2025-10-20",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "is_available": true
  }'

# 4. Assign to match
curl -X POST "http://localhost:3000/api/v1/referees/assign" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": 789,
    "referee_id": 123
  }'
```

## 📊 Performance Metrics

### Database Indexes
- `idx_referee_performance_score` - Fast sorting by reliability
- `idx_referee_availability_date` - Quick availability lookups
- `idx_certifications_sport` - Filter by sport
- `idx_referee_requests_status` - Filter pending requests

### Query Optimization
- Uses JOINs to minimize database calls
- Indexes on foreign keys
- Efficient filtering with WHERE clauses

## 🚨 Error Handling

| Error | Status | Cause |
|-------|--------|-------|
| Referee not found | 404 | Invalid referee ID |
| Only admin or referee can add certifications | 403 | Permission denied |
| Referee is already_assigned | 400 | Time conflict |
| Referee is conflict_of_interest | 400 | Playing in match |
| Referee is not certified | 400 | Missing certification |
| Assignment already responded | 400 | Duplicate response |

## 🎯 Future Enhancements

- [ ] Automated referee assignment based on availability & rating
- [ ] Referee training module
- [ ] Certification renewal reminders
- [ ] Multi-language support for certifications
- [ ] Mobile app for referees
- [ ] Real-time notifications for assignments
- [ ] Referee scheduling optimization algorithm
- [ ] Performance analytics dashboard

## 📝 Notes

- Referees are users with role 'player' or 'admin'
- Certifications can expire and need renewal
- Reliability score updates automatically after each match
- Average rating updates after each rating submission
- Assignment requests can be cancelled before response

---

**Module Status**: ✅ Complete and Production Ready

**Last Updated**: October 15, 2025
