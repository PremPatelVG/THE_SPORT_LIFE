# Backend Financial Fields - Already Configured ✅

## Summary
The backend is **already fully configured** to handle optional entry fee and prize money fields. No changes needed!

---

## Current Backend Configuration

### 1. Database Schema (`schema.sql`)

**Table: tournaments**
```sql
entry_fee DECIMAL(10,2) DEFAULT 0.00,
prize_money DECIMAL(10,2) DEFAULT 0.00,
```

**Constraints:**
```sql
CONSTRAINT check_entry_fee CHECK (entry_fee >= 0),
CONSTRAINT check_prize_money CHECK (prize_money >= 0)
```

✅ **Status:** Columns have default values of 0.00  
✅ **Validation:** Must be >= 0 (non-negative)  
✅ **Nullable:** No, but defaults to 0.00 which represents "free"

---

### 2. Validators (`tournamentValidator.js`)

**Create Tournament Validation:**
```javascript
body('entry_fee')
  .optional()
  .isFloat({ min: 0 })
  .withMessage('Entry fee must be a positive number'),

body('prize_money')
  .optional()
  .isFloat({ min: 0 })
  .withMessage('Prize money must be a positive number'),
```

✅ **Status:** Both fields are marked as `.optional()`  
✅ **Validation:** Must be >= 0 if provided  
✅ **Behavior:** Can be omitted from request

**Update Tournament Validation:**
```javascript
body('entry_fee')
  .optional()
  .isFloat({ min: 0 })
  .withMessage('Entry fee must be a positive number'),

body('prize_money')
  .optional()
  .isFloat({ min: 0 })
  .withMessage('Prize money must be a positive number'),
```

✅ **Status:** Optional in updates too  
⚠️ **Note:** Entry fee cannot be changed after tournament starts (line 52)

---

### 3. Model (`Tournament.js`)

**Create Function:**
```javascript
const create = async (tournamentData) => {
  const {
    // ... other fields
    entry_fee = 0,        // Default to 0
    prize_money = 0,      // Default to 0
    // ... other fields
  } = tournamentData;
  
  // Insert with defaults
  const sql = `INSERT INTO tournaments (..., entry_fee, prize_money, ...)`;
  
  await query(sql, [..., entry_fee, prize_money, ...]);
}
```

✅ **Status:** Defaults to 0 if not provided  
✅ **Behavior:** Handles missing values gracefully

---

### 4. Service Layer (`tournamentService.js`)

**No special handling needed** - the service layer passes data through to the model, which handles defaults.

✅ **Status:** Works correctly with optional fields

---

## How It Works

### Scenario 1: Free Tournament (No Entry Fee)
**Frontend sends:**
```json
{
  "name": "Community Cup",
  "entry_fee": 0,
  "prize_money": 0
}
```
or
```json
{
  "name": "Community Cup"
  // entry_fee and prize_money omitted
}
```

**Backend receives:**
- Validator: Passes (optional fields)
- Model: Sets `entry_fee = 0`, `prize_money = 0`
- Database: Stores 0.00 for both

**Result:** ✅ Free tournament created

---

### Scenario 2: Paid Tournament
**Frontend sends:**
```json
{
  "name": "Pro Championship",
  "entry_fee": 500,
  "prize_money": 10000
}
```

**Backend receives:**
- Validator: Passes (valid positive numbers)
- Model: Uses provided values
- Database: Stores 500.00 and 10000.00

**Result:** ✅ Paid tournament with prize money

---

### Scenario 3: Free with Prize
**Frontend sends:**
```json
{
  "name": "Charity Tournament",
  "entry_fee": 0,
  "prize_money": 5000
}
```

**Backend receives:**
- Validator: Passes
- Model: Uses provided values
- Database: Stores 0.00 and 5000.00

**Result:** ✅ Free tournament with prize money

---

## Validation Rules

### Entry Fee:
- ✅ Optional field
- ✅ Must be >= 0 if provided
- ✅ Defaults to 0.00
- ✅ Can be decimal (e.g., 99.99)
- ⚠️ Cannot be changed after tournament starts

### Prize Money:
- ✅ Optional field
- ✅ Must be >= 0 if provided
- ✅ Defaults to 0.00
- ✅ Can be decimal (e.g., 9999.99)
- ✅ Can be updated anytime (not restricted)

---

## API Examples

### Create Free Tournament
```bash
POST /api/tournaments
{
  "name": "Weekend League",
  "sport_id": 1,
  "venue_id": 2,
  "start_date": "2025-11-01",
  "end_date": "2025-11-03",
  "format_type": "knockout",
  "category": "singles"
  // entry_fee and prize_money omitted - defaults to 0
}
```

### Create Paid Tournament
```bash
POST /api/tournaments
{
  "name": "Championship Series",
  "sport_id": 1,
  "venue_id": 2,
  "start_date": "2025-11-01",
  "end_date": "2025-11-03",
  "format_type": "knockout",
  "category": "singles",
  "entry_fee": 500,
  "prize_money": 10000
}
```

### Update Prize Money
```bash
PUT /api/tournaments/:id
{
  "prize_money": 15000  // Can update prize money
}
```

### Try to Update Entry Fee (After Start)
```bash
PUT /api/tournaments/:id
{
  "entry_fee": 600  // Will fail if tournament status is 'ongoing' or 'completed'
}
```
**Response:** Error - "Cannot update entry fee after tournament starts"

---

## Database Queries

### Get Free Tournaments
```sql
SELECT * FROM tournaments WHERE entry_fee = 0;
```

### Get Paid Tournaments
```sql
SELECT * FROM tournaments WHERE entry_fee > 0;
```

### Get Tournaments with Prize Money
```sql
SELECT * FROM tournaments WHERE prize_money > 0;
```

---

## Payment Integration

The backend already handles payment logic:

**For Free Tournaments (entry_fee = 0):**
- No payment required
- Participants auto-confirmed
- No payment records created

**For Paid Tournaments (entry_fee > 0):**
- Payment required
- Participants pending until payment
- Payment records tracked
- Escrow account handling
- Platform commission calculated

---

## Conclusion

✅ **Backend is fully ready** - No changes needed!

The backend already supports:
- Optional entry fee and prize money
- Default values of 0.00
- Proper validation (>= 0)
- Free and paid tournaments
- Payment handling
- Prize money tracking

**Frontend changes made:**
- Added "(Optional)" labels
- Added informational banner
- Updated placeholders
- Added helper text

**Result:** Complete end-to-end support for both free and paid tournaments! 🎉
