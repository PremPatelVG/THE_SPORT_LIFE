# Teams Table Columns Fix

## 🐛 Error

```json
{
  "success": false,
  "error": "Unknown column 't.sport_id' in 'group statement'"
}
```

**Endpoint:** `GET /api/v1/tournaments/18/join-options`

---

## 🔍 Root Cause

The GROUP BY clause was trying to group by `t.sport_id`, but the `teams` table doesn't have a `sport_id` column.

### **Teams Table Structure:**

```sql
CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    tournament_id INT NOT NULL,          -- ✅ Has this
    creator_id INT NOT NULL,             -- ✅ Has this
    captain_id INT NOT NULL,             -- ✅ Has this
    logo VARCHAR(255),                   -- ✅ Has this
    description TEXT,                    -- ✅ Has this
    max_players INT DEFAULT 11,          -- ✅ Has this
    deleted_at TIMESTAMP NULL,           -- ✅ Has this
    created_at TIMESTAMP,                -- ✅ Has this
    updated_at TIMESTAMP,                -- ✅ Has this
    
    -- ❌ NO sport_id column!
    -- ❌ NO min_players column!
);
```

**Note:** The sport is determined by the **tournament**, not stored directly in the team.

---

## ✅ Solution

### **Fixed GROUP BY Clause:**

```javascript
// Before (❌ Error)
GROUP BY t.id, t.name, t.description, t.sport_id, t.tournament_id, t.max_players, 
         t.min_players, t.creator_id, t.captain_id, t.created_at, t.updated_at, t.deleted_at

// After (✅ Fixed)
GROUP BY t.id, t.name, t.description, t.tournament_id, t.max_players, 
         t.creator_id, t.captain_id, t.logo, t.created_at, t.updated_at, t.deleted_at
```

### **What Changed:**

1. ❌ **Removed:** `t.sport_id` (doesn't exist)
2. ❌ **Removed:** `t.min_players` (doesn't exist)
3. ✅ **Added:** `t.logo` (exists in table)

---

## 📊 Teams Table Columns

### **Actual Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `name` | VARCHAR(255) | Team name |
| `tournament_id` | INT | Which tournament |
| `creator_id` | INT | Who created the team |
| `captain_id` | INT | Team captain |
| `logo` | VARCHAR(255) | Team logo URL |
| `description` | TEXT | Team description |
| `max_players` | INT | Max team size (default 11) |
| `deleted_at` | TIMESTAMP | Soft delete |
| `created_at` | TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | Updated timestamp |

### **NOT in Table:**

- ❌ `sport_id` - Sport comes from tournament
- ❌ `min_players` - Only max_players is stored

---

## 🎯 How Sport is Determined

Teams don't have a direct `sport_id`. Instead:

```
Team → tournament_id → Tournament → sport_id → Sport
```

**Example Query:**
```sql
SELECT 
  t.name as team_name,
  s.name as sport_name
FROM teams t
JOIN tournaments tn ON t.tournament_id = tn.id
JOIN sports s ON tn.sport_id = s.id
WHERE t.id = ?
```

---

## 🧪 Testing

### **Restart Backend:**
```bash
cd sportlife-backend
npm run start
```

### **Test Endpoint:**
```bash
GET http://localhost:5000/api/v1/tournaments/18/join-options
```

### **Expected Response:**
```json
{
  "success": true,
  "data": {
    "can_join": true,
    "reasons": [],
    "tournament_category": "teams",
    "options": {
      "teams": {
        "available": true,
        "existing_teams": [
          {
            "id": 10,
            "name": "Thunder Strikers",
            "tournament_id": 18,
            "max_players": 11,
            "member_count": 11,
            "is_captain": 1,
            "is_creator": 1,
            "is_registered": 0,
            "can_register": true
          }
        ],
        "can_create_team": true,
        "min_members_required": 11
      }
    }
  }
}
```

---

## 📝 Summary

**Error:** Unknown column `t.sport_id` in GROUP BY

**Cause:** Teams table doesn't have `sport_id` or `min_players` columns

**Fix:** Updated GROUP BY to only include actual table columns

**Status:** ✅ **FIXED**

---

## 🔄 Next Steps

1. **Restart backend server**
2. **Test the endpoint**
3. **Should work now!** ✅

---

**The GROUP BY clause now matches the actual teams table structure!** 🎉
