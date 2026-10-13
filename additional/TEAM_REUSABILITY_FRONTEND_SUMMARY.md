# Team Reusability - Frontend Implementation Summary

## Overview
Updated the CreateTeam component to support both **tournament-specific** and **reusable** teams with a visual toggle interface.

---

## Changes Made

### File Updated: `src/pages/CreateTeam.jsx`

#### 1. New Imports
```javascript
import { getSports } from '../services/sportService';
import { Info } from 'lucide-react';  // Added Info icon
```

#### 2. Updated State
```javascript
const [formData, setFormData] = useState({
  name: '',
  tournament_id: tournamentIdFromUrl || '',
  description: '',
  max_players: 11,
  logo: '',
  is_tournament_specific: tournamentIdFromUrl ? true : false,  // NEW
  sport_id: '',                                                  // NEW
  is_public: false                                               // NEW
});

const [sports, setSports] = useState([]);           // NEW
const [loadingSports, setLoadingSports] = useState(false);  // NEW
```

#### 3. New Data Fetching
```javascript
useEffect(() => {
  // Existing: Fetch tournaments
  dispatch(fetchTournaments({ category: 'teams', status: 'open' }));

  // NEW: Fetch sports list
  const fetchSports = async () => {
    setLoadingSports(true);
    try {
      const response = await getSports();
      setSports(response.data || []);
    } catch (error) {
      toast.error('Failed to load sports');
    } finally {
      setLoadingSports(false);
    }
  };
  fetchSports();
}, [dispatch]);
```

#### 4. Updated Validation
```javascript
const validateForm = () => {
  const newErrors = {};

  // Name validation (unchanged)
  if (!formData.name.trim()) {
    newErrors.name = 'Team name is required';
  }

  // NEW: Conditional validation based on team type
  if (formData.is_tournament_specific) {
    if (!formData.tournament_id) {
      newErrors.tournament_id = 'Please select a tournament';
    }
  } else {
    if (!formData.sport_id) {
      newErrors.sport_id = 'Please select a sport';
    }
  }

  // Max players validation (unchanged)
  if (formData.max_players < 2 || formData.max_players > 50) {
    newErrors.max_players = 'Team must have 2-50 players';
  }

  return Object.keys(newErrors).length === 0;
};
```

#### 5. New Toggle Handler
```javascript
const handleTeamTypeToggle = (isTournamentSpecific) => {
  setFormData({
    ...formData,
    is_tournament_specific: isTournamentSpecific,
    tournament_id: isTournamentSpecific ? formData.tournament_id : '',
    sport_id: !isTournamentSpecific ? formData.sport_id : ''
  });
  // Clear related errors
  setErrors({
    ...errors,
    tournament_id: '',
    sport_id: ''
  });
};
```

#### 6. Updated Form Submission
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    toast.error('Please fix the errors in the form');
    return;
  }

  const teamData = {
    name: formData.name,
    description: formData.description,
    logo: formData.logo,
    max_players: parseInt(formData.max_players),
    captain_id: user.id,
    is_tournament_specific: formData.is_tournament_specific,
    is_public: formData.is_public
  };

  // Add tournament_id OR sport_id based on team type
  if (formData.is_tournament_specific) {
    teamData.tournament_id = parseInt(formData.tournament_id);
  } else {
    teamData.sport_id = parseInt(formData.sport_id);
  }

  await dispatch(createTeam(teamData));
};
```

---

## UI Components Added

### 1. Team Type Toggle (Visual Selection)

```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="flex items-start gap-3 mb-4">
    <Info className="w-5 h-5 text-blue-600" />
    <div>
      <h3 className="text-sm font-semibold text-blue-900">Team Type</h3>
      <p className="text-xs text-blue-700">
        Choose whether this team is for a specific tournament or can be reused.
      </p>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3">
    {/* Tournament-Based Button */}
    <button
      type="button"
      onClick={() => handleTeamTypeToggle(true)}
      className={`p-4 rounded-lg border-2 ${
        formData.is_tournament_specific
          ? 'border-blue-600 bg-blue-100 text-blue-900'
          : 'border-gray-300 bg-white text-gray-700'
      }`}
    >
      <Trophy className="w-6 h-6 mx-auto mb-2" />
      <p className="text-sm font-semibold">Tournament-Based</p>
      <p className="text-xs mt-1">For one tournament only</p>
    </button>

    {/* Reusable Team Button */}
    <button
      type="button"
      onClick={() => handleTeamTypeToggle(false)}
      className={`p-4 rounded-lg border-2 ${
        !formData.is_tournament_specific
          ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
          : 'border-gray-300 bg-white text-gray-700'
      }`}
    >
      <Users className="w-6 h-6 mx-auto mb-2" />
      <p className="text-sm font-semibold">Reusable Team</p>
      <p className="text-xs mt-1">Use in multiple tournaments</p>
    </button>
  </div>
</div>
```

### 2. Conditional Tournament Selection

Shows only when `is_tournament_specific = true`:

```jsx
{formData.is_tournament_specific && (
  <div>
    <label>Tournament <span className="text-red-500">*</span></label>
    <select
      name="tournament_id"
      value={formData.tournament_id}
      onChange={handleChange}
    >
      <option value="">Select a tournament</option>
      {tournaments.map(tournament => (
        <option key={tournament.id} value={tournament.id}>
          {tournament.name} - {tournament.sport_name}
        </option>
      ))}
    </select>
  </div>
)}
```

### 3. Conditional Sport Selection

Shows only when `is_tournament_specific = false`:

```jsx
{!formData.is_tournament_specific && (
  <div>
    <label>Sport <span className="text-red-500">*</span></label>
    <select
      name="sport_id"
      value={formData.sport_id}
      onChange={handleChange}
    >
      <option value="">Select a sport</option>
      {sports.map(sport => (
        <option key={sport.id} value={sport.id}>
          {sport.name}
        </option>
      ))}
    </select>
  </div>
)}
```

### 4. Public/Private Toggle (Reusable Teams Only)

Shows only when `is_tournament_specific = false`:

```jsx
{!formData.is_tournament_specific && (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        name="is_public"
        checked={formData.is_public}
        onChange={handleChange}
        className="mt-1 w-4 h-4 text-emerald-600"
      />
      <div>
        <span className="text-sm font-semibold">Make team public</span>
        <p className="text-xs text-gray-600 mt-1">
          Public teams are visible to all users. Private teams are only visible to invited members.
        </p>
      </div>
    </label>
  </div>
)}
```

---

## User Flow

### Creating Tournament-Specific Team:

1. User clicks "Create Team"
2. Sees toggle with two options (Tournament-Based selected by default if from tournament page)
3. Selects "Tournament-Based"
4. Selects tournament from dropdown
5. Fills in team name, max players, description
6. Submits form
7. Team created for that specific tournament

### Creating Reusable Team:

1. User clicks "Create Team"
2. Clicks "Reusable Team" toggle
3. Selects sport type (Football, Cricket, etc.)
4. Fills in team name, max players, description
5. Optionally checks "Make team public"
6. Submits form
7. Team created as reusable (can be used in multiple tournaments)

---

## Visual Design

### Color Scheme:
- **Tournament-Based:** Blue theme (`border-blue-600`, `bg-blue-100`)
- **Reusable Team:** Emerald/Green theme (`border-emerald-600`, `bg-emerald-100`)

### Icons:
- **Tournament-Based:** Trophy icon
- **Reusable Team:** Users icon
- **Info Banner:** Info icon

### States:
- **Selected:** Bold border, colored background
- **Unselected:** Gray border, white background
- **Hover:** Lighter border color
- **Disabled:** Opacity 50%, cursor not-allowed

---

## Edge Cases Handled

### 1. Coming from Tournament Page
- If `tournament_id` is in URL, team type is locked to "Tournament-Based"
- Toggle buttons are disabled
- Tournament is pre-selected

### 2. No Tournaments Available
- Shows warning message
- User can still create reusable team

### 3. Loading States
- "Loading tournaments..." placeholder
- "Loading sports..." placeholder
- Disabled dropdowns during loading

### 4. Validation
- Tournament required for tournament-based teams
- Sport required for reusable teams
- Clear error messages for each field

---

## API Payload Examples

### Tournament-Specific Team:
```json
{
  "name": "Warriors FC",
  "description": "Competitive football team",
  "max_players": 11,
  "captain_id": 5,
  "tournament_id": 10,
  "is_tournament_specific": true,
  "is_public": false
}
```

### Reusable Team:
```json
{
  "name": "City Champions",
  "description": "Professional cricket team",
  "max_players": 11,
  "captain_id": 5,
  "sport_id": 2,
  "is_tournament_specific": false,
  "is_public": true
}
```

---

## Testing Checklist

- [ ] Toggle switches between team types correctly
- [ ] Tournament dropdown shows only when tournament-based selected
- [ ] Sport dropdown shows only when reusable selected
- [ ] Public checkbox shows only for reusable teams
- [ ] Validation works for both team types
- [ ] Form submission sends correct data
- [ ] Coming from tournament page locks to tournament-based
- [ ] Error messages display correctly
- [ ] Loading states work properly
- [ ] Success message and redirect work

---

## Next Steps (Future Enhancements)

1. **Team Registration UI:**
   - Add interface to register reusable teams for tournaments
   - Show list of user's reusable teams when registering for tournament

2. **Team Management:**
   - Show team type badge on team cards
   - Filter teams by type (tournament-specific vs reusable)
   - Show tournaments a reusable team is registered for

3. **Tournament Registration:**
   - Add "Use Existing Team" option on tournament registration
   - Show compatible reusable teams based on sport

4. **Team Detail Page:**
   - Display team type clearly
   - Show tournament history for reusable teams
   - Add "Register for Tournament" button for reusable teams

---

## Summary

✅ **Frontend Complete!**

The CreateTeam component now supports:
- Visual toggle for team type selection
- Conditional fields based on team type
- Tournament selection for tournament-based teams
- Sport selection for reusable teams
- Public/private visibility for reusable teams
- Proper validation for both team types
- Clean, intuitive UI with color-coded options

Users can now easily create both tournament-specific and reusable teams with a clear understanding of the difference between them!
