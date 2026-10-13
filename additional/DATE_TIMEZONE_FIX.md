# Date Timezone Fix

## Problem
When selecting dates in the DatePicker, the dates were being converted to UTC timezone using `toISOString()`, which was causing date shifts in the API payload.

### Example of the Issue:
- **User selects:** 02/11/2025 12:30 AM (local time)
- **What was sent:** 2025-11-01T19:00:00.000Z (UTC, which is previous day in IST)
- **What should be sent:** 2025-11-02 00:30:00 (local time)

## Solution
Created a `formatDateForBackend()` helper function that formats dates in local timezone.

### Implementation:
```javascript
const formatDateForBackend = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  // Format as YYYY-MM-DD HH:MM:SS in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
```

### Applied to Submit Handler:
```javascript
const tournamentData = {
  ...formData,
  // Format dates properly for backend
  start_date: formatDateForBackend(formData.start_date),
  end_date: formatDateForBackend(formData.end_date),
  registration_start: formatDateForBackend(formData.registration_start),
  registration_end: formatDateForBackend(formData.registration_end)
};
```

## Result
Now when you select dates in the UI, they are sent to the backend in the correct local timezone format:

### Before Fix:
```json
{
  "start_date": "2025-11-01T19:00:00.000Z",  // Wrong! UTC timezone
  "end_date": "2025-11-14T19:30:00.000Z"
}
```

### After Fix:
```json
{
  "start_date": "2025-11-02 00:30:00",  // Correct! Local timezone
  "end_date": "2025-11-15 01:00:00"
}
```

## How It Works

1. **User selects date:** 02/11/2025 12:30 AM in DatePicker
2. **Stored internally:** As JavaScript Date object
3. **On form submit:** `formatDateForBackend()` extracts year, month, day, hours, minutes, seconds from the Date object using local timezone methods
4. **Sent to backend:** "2025-11-02 00:30:00" (exactly what user selected)

## Key Points

- ✅ No timezone conversion
- ✅ Preserves user's selected date and time exactly
- ✅ Format: `YYYY-MM-DD HH:MM:SS`
- ✅ Compatible with MySQL/PostgreSQL datetime format
- ✅ Works for all four date fields:
  - Start Date
  - End Date
  - Registration Start
  - Registration End

## Testing

1. Select a date and time in the Create Tournament form
2. Open browser DevTools → Network tab
3. Submit the form
4. Check the request payload
5. Verify dates match what you selected (no timezone shift)

## Note

This fix ensures that the date and time you see in the UI is exactly what gets sent to the backend, without any timezone conversions that could cause confusion or data errors.
