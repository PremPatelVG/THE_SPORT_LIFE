# Seed Assignment API Fix

## Issue
The assign-seeds API endpoint was throwing validation errors because the validator expected `seeds[].id` but the frontend was sending `seeds[].participant_id`.

### Error Response
```json
{
    "success": false,
    "errors": [
        {
            "field": "seeds[0].id",
            "message": "Invalid participant ID"
        }
    ]
}
```

## Root Cause
Mismatch between:
1. **Validator** expected: `seeds.*.id`
2. **Frontend** sent: `seeds.*.participant_id`
3. **Model function** used: `p.id` (incorrect)

## Changes Made

### 1. Updated Validator (`src/validators/tournamentValidator.js`)
Changed validation field from `seeds.*.id` to `seeds.*.participant_id`:

```javascript
body('seeds.*.participant_id')  // Changed from seeds.*.id
  .isInt({ min: 1 })
  .withMessage('Invalid participant ID'),
```

### 2. Updated Model (`src/models/TournamentParticipant.js`)
Updated `bulkUpdateSeeds` function to use `participant_id`:

```javascript
const bulkUpdateSeeds = async (participants) => {
  if (!participants || participants.length === 0) return;

  const cases = participants.map(() => 'WHEN id = ? THEN ?').join(' ');
  const ids = participants.map(p => p.participant_id);  // Changed from p.id
  const values = participants.flatMap(p => [p.participant_id, p.seed_number]);  // Changed
  values.push(...ids);

  const sql = `
    UPDATE tournament_participants
    SET seed_number = CASE ${cases} END
    WHERE id IN (${ids.map(() => '?').join(',')})
  `;

  await query(sql, values);
}
```

### 3. Enhanced Service Validation (`src/services/tournamentService.js`)
Added participant ID validation to ensure IDs exist in the tournament:

```javascript
// Get all participants for this tournament
const participants = await TournamentParticipant.findByTournament(tournamentId);
const validParticipantIds = new Set(participants.map(p => p.id));

// Validate that all participant IDs exist in this tournament
for (const assignment of seedAssignments) {
  if (!validParticipantIds.has(assignment.participant_id)) {
    throw new Error(`Participant ID ${assignment.participant_id} not found in tournament`);
  }
}
```

## API Usage

### Endpoint
```
POST /api/v1/tournaments/:id/assign-seeds
```

### Request Body
```json
[
    {
        "participant_id": 2,
        "seed_number": 1
    },
    {
        "participant_id": 3,
        "seed_number": 2
    }
]
```

### Success Response
```json
{
    "success": true,
    "message": "Seeds assigned successfully"
}
```

### Error Responses

**Invalid participant ID:**
```json
{
    "success": false,
    "error": "Participant ID 999 not found in tournament"
}
```

**Duplicate seed numbers:**
```json
{
    "success": false,
    "error": "Duplicate seed numbers found"
}
```

**Not organizer:**
```json
{
    "success": false,
    "error": "Only the organizer can assign seeds"
}
```

## Testing

1. **Restart the backend server** to apply changes
2. Test the endpoint with valid participant IDs
3. Verify seeds are saved correctly in the database

```bash
cd sportlife-backend
npm restart
```

## Next Steps

After seed assignment works:
1. ✅ Assign Seeds (Fixed)
2. 🔄 Generate Brackets & Start Tournament (Next)
