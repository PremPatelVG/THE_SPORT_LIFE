# Bulk Scheduling Improvements - Multiple Venues & Flexible Match Count

## Summary of Changes

I've updated the Bulk Scheduling feature to support:
1. **Multiple venue selection** - Select multiple venues and distribute matches across them
2. **Flexible matches per day** - Input any number from 1-50 instead of fixed options
3. **Smart distribution** - Matches are intelligently distributed across selected venues

## Changes Made

### 1. **BulkSchedulingModal.jsx** - Main Scheduling Logic

#### Changed State Structure
```javascript
// Before
venue_id: '',  // Single venue

// After
venue_ids: [], // Array of venue IDs for multiple selection
```

#### Updated Schedule Generation Algorithm
- **Distributes matches across multiple venues**
- Calculates matches per venue per day
- Handles remainder matches fairly
- Rotates through venues, then moves to next day

**Example Distribution:**
- 10 matches/day with 3 venues = 3,3,4 matches per venue
- 8 matches/day with 2 venues = 4,4 matches per venue

#### New UI Components

**Matches Per Day - Number Input:**
```jsx
<input
  type="number"
  min="1"
  max="50"
  value={formData.matches_per_day}
  placeholder="Enter number of matches (1-50)"
/>
```

**Multiple Venue Selection - Checkboxes:**
```jsx
<div className="space-y-2">
  {venues.map(venue => (
    <label className="flex items-center gap-3">
      <input type="checkbox" />
      <div>
        <p>{venue.name}</p>
        <p>{venue.address}</p>
      </div>
    </label>
  ))}
</div>
```

**Preview Shows Venue Assignment:**
```jsx
{item.venue_name && (
  <p className="text-xs text-purple-600 mt-1 font-medium">
    📍 {item.venue_name}
  </p>
)}
```

### 2. **TournamentBracket.jsx** - Component Integration

Added `venues` prop:
```javascript
const TournamentBracket = ({ 
  tournament, 
  matches, 
  venues = [],  // Added
  onMatchClick, 
  onScheduleUpdate, 
  isOrganizer 
}) => {
```

Passes venues to BulkSchedulingModal:
```jsx
<BulkSchedulingModal
  matches={matches}
  venues={venues}  // Now passes actual venues
  onClose={() => setShowBulkScheduling(false)}
  onSave={onScheduleUpdate}
/>
```

### 3. **TournamentDetail.jsx** - Data Fetching

#### Added Venue Service Import
```javascript
import { getVenues } from '../services/venueService';
```

#### Added Venue State
```javascript
const [venues, setVenues] = useState([]);
const [loadingVenues, setLoadingVenues] = useState(false);
```

#### Added Venue Fetching Function
```javascript
const fetchVenuesData = async () => {
  try {
    setLoadingVenues(true);
    const venuesData = await getVenues({ is_active: true });
    setVenues(venuesData?.data || []);
  } catch (err) {
    console.error('Failed to fetch venues:', err);
  } finally {
    setLoadingVenues(false);
  }
};
```

#### Passes Venues to TournamentBracket
```jsx
<TournamentBracket
  tournament={tournament}
  matches={matches}
  venues={venues}  // Added
  onMatchClick={handleMatchClick}
  onScheduleUpdate={handleBulkSchedule}
  isOrganizer={isOrganizer()}
/>
```

## How It Works

### Distribution Algorithm

```javascript
// Example: 10 matches/day, 3 venues selected
const matchesPerVenuePerDay = Math.floor(10 / 3);  // = 3
const extraMatches = 10 % 3;                        // = 1

// Distribution: Venue 1 (3), Venue 2 (3), Venue 3 (4)
// The extra match goes to the last venue
```

### Scheduling Flow

1. **User selects venues** (checkboxes)
2. **User enters matches per day** (1-50)
3. **System calculates distribution**
4. **Generates schedule:**
   - Assigns matches to venues in rotation
   - When all venues used for the day, moves to next day
   - Resets venue rotation for new day

### Example Scenario

**Configuration:**
- Start Date: Nov 3, 2025
- Start Time: 09:00 AM
- Match Duration: 60 minutes
- Break: 15 minutes
- Matches Per Day: 6
- Venues Selected: Court A, Court B, Court C

**Result:**
```
Day 1 (Nov 3):
  09:00 - Match 1 @ Court A
  10:15 - Match 2 @ Court B
  11:30 - Match 3 @ Court C
  12:45 - Match 4 @ Court A
  14:00 - Match 5 @ Court B
  15:15 - Match 6 @ Court C

Day 2 (Nov 4):
  09:00 - Match 7 @ Court A
  ... continues
```

## Benefits

### 1. **Flexibility**
- No longer limited to 4,6,8,10,12 matches
- Can schedule any number from 1-50

### 2. **Multi-Venue Support**
- Parallel matches at different venues
- Better resource utilization
- Faster tournament completion

### 3. **Smart Distribution**
- Evenly distributes matches across venues
- Handles remainder matches fairly
- Maintains chronological order

### 4. **Better UX**
- Visual venue selection with checkboxes
- Shows venue count and distribution info
- Preview displays venue assignments

## Testing Checklist

- [ ] Select single venue - matches assigned to that venue
- [ ] Select multiple venues - matches distributed evenly
- [ ] Select no venues - matches have no venue (allowed)
- [ ] Enter 1 match per day - works correctly
- [ ] Enter 50 matches per day - works correctly
- [ ] Preview shows correct venue assignments
- [ ] Saved matches have correct venue_id in database
- [ ] Multiple venues with odd number of matches - distribution is fair

## Future Enhancements

1. **Venue Capacity Checking**
   - Validate venue can handle assigned matches
   - Check for time conflicts

2. **Venue Preferences**
   - Allow setting priority venues
   - Consider venue ratings/quality

3. **Advanced Distribution**
   - Distribute by round (all Round 1 at Venue A, etc.)
   - Distribute by participant location
   - Consider travel time between venues

4. **Venue Availability**
   - Check venue calendar
   - Block unavailable time slots
   - Show venue booking conflicts
