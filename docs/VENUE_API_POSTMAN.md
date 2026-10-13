# Venue API - Postman Testing Guide

Complete API documentation for all venue-related endpoints with request/response examples.

**Base URL:** `http://localhost:3000/api/v1/venues`

---

## Authentication

Most endpoints require authentication. Add this header to authenticated requests:
```
Authorization: Bearer <your_jwt_token>
```

**Admin Role Required:** Create, Update, Delete operations require admin role.

---

## 1. VENUE MANAGEMENT

### 1.1 Create Venue
**POST** `/api/v1/venues`

**Auth Required:** ✅ (Admin only)

**Request Body:**
```json
{
  "name": "City Sports Complex",
  "description": "Premier sports facility with multiple courts",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "postal_code": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "contact_person": "John Doe",
  "contact_phone": "+91-9876543210",
  "contact_email": "contact@citysports.com",
  "website": "https://citysports.com",
  "facilities": ["parking", "locker_rooms", "cafeteria", "first_aid"],
  "operating_hours": {
    "monday": "06:00-22:00",
    "tuesday": "06:00-22:00",
    "wednesday": "06:00-22:00",
    "thursday": "06:00-22:00",
    "friday": "06:00-22:00",
    "saturday": "07:00-23:00",
    "sunday": "07:00-23:00"
  },
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "is_active": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "City Sports Complex",
    "description": "Premier sports facility with multiple courts",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postal_code": "400001",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "contact_person": "John Doe",
    "contact_phone": "+91-9876543210",
    "contact_email": "contact@citysports.com",
    "website": "https://citysports.com",
    "facilities": ["parking", "locker_rooms", "cafeteria", "first_aid"],
    "operating_hours": {...},
    "images": [...],
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "Venue created successfully"
}
```

---

### 1.2 Get All Venues
**GET** `/api/v1/venues`

**Auth Required:** ❌

**Query Parameters:**
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `country` (optional): Filter by country
- `is_active` (optional): Filter by active status (true/false)
- `search` (optional): Search in name, city, or address
- `limit` (optional): Limit number of results

**Example Request:**
```
GET /api/v1/venues?city=Mumbai&is_active=true&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "City Sports Complex",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "total_courts": 5,
      "available_courts": 4,
      ...
    }
  ],
  "total": 1
}
```

---

### 1.3 Get Venue by ID
**GET** `/api/v1/venues/:venueId`

**Auth Required:** ❌

**Example Request:**
```
GET /api/v1/venues/1
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "City Sports Complex",
    "description": "Premier sports facility",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "total_courts": 5,
    "available_courts": 4,
    "courts": [...],
    "statistics": {
      "total_matches": 150,
      "completed_matches": 120,
      "total_tournaments": 10
    }
  }
}
```

---

### 1.4 Update Venue
**PATCH** `/api/v1/venues/:venueId`

**Auth Required:** ✅ (Admin only)

**Request Body (all fields optional):**
```json
{
  "name": "Updated City Sports Complex",
  "description": "Updated description",
  "contact_phone": "+91-9876543211",
  "operating_hours": {
    "monday": "05:00-23:00"
  },
  "is_active": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated City Sports Complex",
    ...
  },
  "message": "Venue updated successfully"
}
```

---

### 1.5 Delete Venue
**DELETE** `/api/v1/venues/:venueId`

**Auth Required:** ✅ (Admin only)

**Example Request:**
```
DELETE /api/v1/venues/1
```

**Response (200):**
```json
{
  "success": true,
  "message": "Venue deleted successfully"
}
```

**Note:** Soft delete - sets `is_active` to false. Cannot delete venues with active tournaments.

---

### 1.6 Get Venue Statistics
**GET** `/api/v1/venues/:venueId/statistics`

**Auth Required:** ❌

**Example Request:**
```
GET /api/v1/venues/1/statistics
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "City Sports Complex",
    "total_courts": 5,
    "available_courts": 4,
    "total_matches": 150,
    "completed_matches": 120,
    "total_tournaments": 10
  }
}
```

---

### 1.7 Search Venues by Location
**GET** `/api/v1/venues/search/location`

**Auth Required:** ❌

**Query Parameters:**
- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `radius` (optional): Search radius in kilometers (default: 10)

**Example Request:**
```
GET /api/v1/venues/search/location?latitude=19.0760&longitude=72.8777&radius=5
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "City Sports Complex",
      "city": "Mumbai",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "distance_km": 2.5,
      "total_courts": 5,
      ...
    }
  ],
  "total": 1
}
```

---

## 2. COURT MANAGEMENT

### 2.1 Get Venue Courts
**GET** `/api/v1/venues/:venueId/courts`

**Auth Required:** ❌

**Query Parameters:**
- `is_available` (optional): Filter by availability (true/false)
- `court_type` (optional): Filter by court type

**Example Request:**
```
GET /api/v1/venues/1/courts?is_available=true
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "venue_id": 1,
      "name": "Court A",
      "court_type": "indoor",
      "surface_type": "hardcourt",
      "dimensions": "23.77m x 10.97m",
      "sport_ids": [1, 2],
      "features": ["lighting", "air_conditioned"],
      "hourly_rate": 500,
      "is_available": true,
      "maintenance_schedule": {},
      "images": [],
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 2.2 Create Court
**POST** `/api/v1/venues/:venueId/courts`

**Auth Required:** ✅ (Admin only)

**Request Body:**
```json
{
  "name": "Court A",
  "court_type": "indoor",
  "surface_type": "hardcourt",
  "dimensions": "23.77m x 10.97m",
  "sport_ids": [1, 2],
  "features": ["lighting", "air_conditioned", "scoreboard"],
  "hourly_rate": 500,
  "is_available": true,
  "maintenance_schedule": {
    "weekly": "Sunday 06:00-08:00"
  },
  "images": ["https://example.com/court1.jpg"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "venue_id": 1,
    "name": "Court A",
    "court_type": "indoor",
    "surface_type": "hardcourt",
    ...
  },
  "message": "Court created successfully"
}
```

---

### 2.3 Get Court by ID
**GET** `/api/v1/venues/courts/:courtId`

**Auth Required:** ❌

**Example Request:**
```
GET /api/v1/venues/courts/1
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "venue_id": 1,
    "venue_name": "City Sports Complex",
    "venue_city": "Mumbai",
    "name": "Court A",
    "court_type": "indoor",
    "surface_type": "hardcourt",
    ...
  }
}
```

---

### 2.4 Update Court
**PATCH** `/api/v1/venues/courts/:courtId`

**Auth Required:** ✅ (Admin only)

**Request Body (all fields optional):**
```json
{
  "name": "Court A - Premium",
  "hourly_rate": 600,
  "is_available": false,
  "features": ["lighting", "air_conditioned", "scoreboard", "seating"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Court A - Premium",
    "hourly_rate": 600,
    ...
  },
  "message": "Court updated successfully"
}
```

---

### 2.5 Delete Court
**DELETE** `/api/v1/venues/courts/:courtId`

**Auth Required:** ✅ (Admin only)

**Example Request:**
```
DELETE /api/v1/venues/courts/1
```

**Response (200):**
```json
{
  "success": true,
  "message": "Court deleted successfully"
}
```

**Note:** Cannot delete courts with scheduled or ongoing matches.

---

### 2.6 Check Court Availability
**GET** `/api/v1/venues/courts/:courtId/availability`

**Auth Required:** ❌

**Query Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `start_time` (required): Start time in HH:MM:SS format
- `end_time` (required): End time in HH:MM:SS format

**Example Request:**
```
GET /api/v1/venues/courts/1/availability?date=2024-01-20&start_time=14:00:00&end_time=16:00:00
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "reason": null
  }
}
```

**Response (200) - Not Available:**
```json
{
  "success": true,
  "data": {
    "available": false,
    "reason": "Court is booked during this time"
  }
}
```

---

### 2.7 Get Available Courts for Date/Time
**GET** `/api/v1/venues/:venueId/available-courts`

**Auth Required:** ❌

**Query Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `start_time` (required): Start time in HH:MM:SS format
- `end_time` (required): End time in HH:MM:SS format

**Example Request:**
```
GET /api/v1/venues/1/available-courts?date=2024-01-20&start_time=14:00:00&end_time=16:00:00
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Court A",
      "court_type": "indoor",
      "hourly_rate": 500,
      ...
    },
    {
      "id": 3,
      "name": "Court C",
      "court_type": "outdoor",
      "hourly_rate": 300,
      ...
    }
  ],
  "total": 2
}
```

---

## 3. WEATHER ALERTS

### 3.1 Get Weather Alerts
**GET** `/api/v1/venues/:venueId/weather-alerts`

**Auth Required:** ❌

**Query Parameters:**
- `date` (optional): Filter by alert date (YYYY-MM-DD)
- `severity` (optional): Filter by severity (low/medium/high/critical)
- `unresolved` (optional): Show only unresolved alerts (true)
- `limit` (optional): Limit number of results

**Example Request:**
```
GET /api/v1/venues/1/weather-alerts?unresolved=true&severity=high
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "venue_id": 1,
      "alert_date": "2024-01-20",
      "alert_time": "14:30:00",
      "weather_condition": "heavy_rain",
      "severity": "high",
      "affected_courts": [1, 2, 3],
      "action_taken": "cancel",
      "notes": "Severe weather warning issued",
      "resolved_at": null,
      "created_at": "2024-01-20T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 3.2 Create Weather Alert
**POST** `/api/v1/venues/:venueId/weather-alerts`

**Auth Required:** ✅ (Admin only)

**Request Body:**
```json
{
  "alert_date": "2024-01-20",
  "alert_time": "14:30:00",
  "weather_condition": "heavy_rain",
  "severity": "high",
  "affected_courts": [1, 2, 3],
  "action_taken": "cancel",
  "notes": "Severe weather warning issued"
}
```

**Field Options:**
- `severity`: "low", "medium", "high", "critical"
- `action_taken`: "monitor", "delay", "cancel", "reschedule"
- `weather_condition`: "rain", "heavy_rain", "storm", "extreme_heat", "fog", etc.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "alert_id": 1,
    "message": "Weather alert created successfully"
  },
  "message": "Weather alert created successfully"
}
```

**Note:** If `action_taken` is "cancel" or "delay", affected matches will be automatically updated.

---

### 3.3 Resolve Weather Alert
**POST** `/api/v1/venues/weather-alerts/:alertId/resolve`

**Auth Required:** ✅ (Admin only)

**Request Body:** Empty

**Example Request:**
```
POST /api/v1/venues/weather-alerts/1/resolve
```

**Response (200):**
```json
{
  "success": true,
  "message": "Weather alert resolved successfully"
}
```

---

## ERROR RESPONSES

### 400 Bad Request
```json
{
  "success": false,
  "error": "date, start_time, and end_time are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Only admins can create venues"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Venue not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error message"
}
```

---

## POSTMAN COLLECTION SETUP

### Environment Variables
Create a Postman environment with these variables:

```
base_url: http://localhost:3000
api_version: v1
token: <your_jwt_token>
venue_id: 1
court_id: 1
alert_id: 1
```

### Pre-request Script (for authenticated requests)
```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('token')
});
```

---

## TESTING WORKFLOW

### 1. Setup
1. Start the server
2. Login to get JWT token (use auth endpoints)
3. Set token in Postman environment

### 2. Venue CRUD Flow
1. Create Venue (Admin)
2. Get All Venues
3. Get Venue by ID
4. Update Venue (Admin)
5. Get Venue Statistics

### 3. Court Management Flow
1. Create Court (Admin)
2. Get Venue Courts
3. Get Court by ID
4. Check Court Availability
5. Get Available Courts
6. Update Court (Admin)

### 4. Weather Alerts Flow
1. Create Weather Alert (Admin)
2. Get Weather Alerts
3. Resolve Weather Alert (Admin)

### 5. Location Search
1. Search Venues by Location (with coordinates)

---

## NOTES

- **Admin Authentication:** Most write operations require admin role
- **Soft Delete:** Venues are soft-deleted (is_active = false)
- **JSON Fields:** facilities, operating_hours, images, sport_ids, features are JSON arrays/objects
- **Date Format:** YYYY-MM-DD
- **Time Format:** HH:MM:SS
- **Coordinates:** latitude/longitude as decimal numbers
- **Validation:** Server validates required fields and data types
- **Cascading:** Weather alerts can automatically affect matches on courts

---

## SAMPLE DATA

### Minimal Venue Creation
```json
{
  "name": "Test Venue",
  "address": "Test Address",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India"
}
```

### Minimal Court Creation
```json
{
  "name": "Test Court",
  "court_type": "indoor"
}
```

### Minimal Weather Alert
```json
{
  "alert_date": "2024-01-20",
  "alert_time": "14:00:00",
  "weather_condition": "rain",
  "severity": "medium"
}
```
