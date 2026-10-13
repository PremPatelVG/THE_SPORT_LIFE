# Enhanced Tournament Creation - Implementation Guide

## Overview
This document provides a complete implementation guide for the enhanced tournament creation flow with sport-specific match configurations.

---

## ✅ COMPLETED - Backend Implementation

### 1. Database Schema ✓
**File:** `/sportlife-backend/migrations/ALTER_TOURNAMENTS_ENHANCED.sql`

**New Fields Added:**
- `tournament_type` ENUM('open', 'closed')
- `match_config` JSON
- `logo_url` VARCHAR(500)

**New Table Created:**
- `sport_match_configs` - Stores default configurations for each sport

**Sports Configured:**
1. Badminton (set-based, 21 points)
2. Football (time-based, 2x45 min)
3. Padel (set-based, 6 games)
4. Pickleball (game-based, 11 points)
5. Squash (game-based, 11 points)
6. Table Tennis (game-based, 11 points)
7. Tennis (set-based, 6 games)
8. Volleyball (set-based, 25 points)

### 2. Backend Models ✓
**Files Created:**
- `/sportlife-backend/src/models/SportMatchConfig.js`

**Methods:**
- `getBySportId()` - Get config for specific sport
- `getAll()` - Get all sport configs
- `isCategorySupported()` - Check if category supported
- `getDefaultConfig()` - Get default match config
- `validateMatchConfig()` - Validate configuration
- `getPresets()` - Get preset configurations
- `calculateEstimatedDuration()` - Calculate match duration

**Files Updated:**
- `/sportlife-backend/src/models/Tournament.js` - Added new fields support

### 3. Backend Controllers ✓
**Files Created:**
- `/sportlife-backend/src/controllers/sportConfigController.js`

**Endpoints:**
- `GET /api/v1/sport-configs` - Get all configurations
- `GET /api/v1/sport-configs/:sportId` - Get specific config
- `GET /api/v1/sport-configs/:sportId/presets` - Get presets
- `POST /api/v1/sport-configs/validate` - Validate config
- `POST /api/v1/sport-configs/calculate-duration` - Calculate duration

### 4. Backend Routes ✓
**Files Created:**
- `/sportlife-backend/src/routes/sportConfig.routes.js`

**Files Updated:**
- `/sportlife-backend/src/app.js` - Added sport-configs route

### 5. Backend Validators ✓
**Files Updated:**
- `/sportlife-backend/src/validators/tournamentValidator.js`

**New Validations:**
- `tournament_type` validation
- `match_config` object validation
- `logo_url` URL validation
- Match structure validation

### 6. Backend Services ✓
**Files Updated:**
- `/sportlife-backend/src/services/tournamentService.js`

**New Features:**
- Sport-category compatibility check
- Auto-load default match config
- Match config validation
- Enhanced error messages

---

## 📋 TODO - Frontend Implementation

### Frontend Service Layer
**File to Create:** `/sportlife-frontend/src/services/sportConfigService.js`

```javascript
import api from './api';

export const getSportConfigs = async () => {
  const response = await api.get('/sport-configs');
  return response.data;
};

export const getSportConfig = async (sportId) => {
  const response = await api.get(`/sport-configs/${sportId}`);
  return response.data;
};

export const getSportPresets = async (sportId) => {
  const response = await api.get(`/sport-configs/${sportId}/presets`);
  return response.data;
};

export const validateMatchConfig = async (matchConfig, matchStructure) => {
  const response = await api.post('/sport-configs/validate', {
    match_config: matchConfig,
    match_structure: matchStructure
  });
  return response.data;
};

export const calculateDuration = async (matchConfig, matchStructure) => {
  const response = await api.post('/sport-configs/calculate-duration', {
    match_config: matchConfig,
    match_structure: matchStructure
  });
  return response.data;
};
```

### Frontend Components to Update

#### 1. Update CreateTournament.jsx
**Location:** `/sportlife-frontend/src/pages/CreateTournament.jsx`

**Changes Needed:**

**A. Add New State Variables:**
```javascript
const [sportConfig, setSportConfig] = useState(null);
const [sportPresets, setSportPresets] = useState([]);
const [matchConfigForm, setMatchConfigForm] = useState({});
const [selectedPreset, setSelectedPreset] = useState('');
```

**B. Add New Form Fields:**
```javascript
const [formData, setFormData] = useState({
  // Existing fields...
  logo_url: '',
  tournament_type: 'open',
  match_config: null
});
```

**C. Add Sport Config Loading:**
```javascript
useEffect(() => {
  if (formData.sport_id) {
    loadSportConfiguration(formData.sport_id);
  }
}, [formData.sport_id]);

const loadSportConfiguration = async (sportId) => {
  try {
    const [configRes, presetsRes] = await Promise.all([
      getSportConfig(sportId),
      getSportPresets(sportId)
    ]);
    setSportConfig(configRes.data);
    setSportPresets(presetsRes.data || []);
    
    // Set default config
    if (configRes.data.default_config) {
      setMatchConfigForm(configRes.data.default_config);
      setFormData(prev => ({
        ...prev,
        match_config: configRes.data.default_config
      }));
    }
  } catch (error) {
    console.error('Failed to load sport configuration:', error);
  }
};
```

**D. Add New Sections to Form:**

1. **Logo Upload Section** (after Tournament Name):
```jsx
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Tournament Logo <span className="text-gray-400">(Optional)</span>
  </label>
  <input
    name="logo_url"
    type="url"
    value={formData.logo_url}
    onChange={handleChange}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg..."
    placeholder="https://example.com/logo.png"
  />
  {formData.logo_url && (
    <img src={formData.logo_url} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded" />
  )}
</div>
```

2. **Tournament Type Field** (in Tournament Settings):
```jsx
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Tournament Type <span className="text-red-500">*</span>
  </label>
  <select
    name="tournament_type"
    value={formData.tournament_type}
    onChange={handleChange}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg..."
  >
    <option value="open">Open - Anyone can register</option>
    <option value="closed">Closed - Invitation only</option>
  </select>
</div>
```

3. **Match Configuration Section** (new section after Tournament Settings):
```jsx
{sportConfig && (
  <div className="pt-6 border-t border-gray-100">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <Settings className="w-5 h-5 text-purple-600" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Match Configuration</h3>
        <p className="text-xs text-gray-500">
          {sportConfig.sport_name} - {sportConfig.match_structure} format
        </p>
      </div>
    </div>

    {/* Render sport-specific fields */}
    {renderMatchConfigFields()}
  </div>
)}
```

4. **Match Config Rendering Function:**
```javascript
const renderMatchConfigFields = () => {
  if (!sportConfig) return null;

  const { match_structure } = sportConfig;

  // SET-BASED SPORTS (Badminton, Tennis, Padel, Volleyball)
  if (match_structure === 'set_based') {
    const usesGames = sportConfig.default_config.games_per_set !== undefined;
    
    return (
      <div className="space-y-4">
        {/* Preset Selector */}
        {sportPresets.length > 0 && (
          <select onChange={handlePresetChange}>
            <option value="">Custom Configuration</option>
            {sportPresets.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        )}

        {/* Total Sets */}
        <select name="total_sets" onChange={handleMatchConfigChange}>
          <option value={3}>Best of 3</option>
          <option value={5}>Best of 5</option>
        </select>

        {/* Points or Games per Set */}
        {usesGames ? (
          <input type="number" name="games_per_set" />
        ) : (
          <input type="number" name="points_per_set" />
        )}

        {/* Additional fields based on sport */}
      </div>
    );
  }

  // GAME-BASED SPORTS (Squash, Table Tennis, Pickleball)
  if (match_structure === 'game_based') {
    return (
      <div className="space-y-4">
        <select name="total_games">
          <option value={3}>Best of 3</option>
          <option value={5}>Best of 5</option>
          <option value={7}>Best of 7</option>
        </select>
        
        <select name="points_per_game">
          <option value={11}>11 Points</option>
          <option value={15}>15 Points</option>
          <option value={21}>21 Points</option>
        </select>

        <input type="number" name="win_by_margin" />
        <input type="checkbox" name="deuce_enabled" />
      </div>
    );
  }

  // TIME-BASED SPORTS (Football, Volleyball)
  if (match_structure === 'time_based') {
    return (
      <div className="space-y-4">
        <input type="number" name="periods" placeholder="Number of periods" />
        <input type="number" name="period_duration" placeholder="Duration (minutes)" />
        <input type="number" name="break_duration" placeholder="Break (minutes)" />
      </div>
    );
  }
};
```

**E. Update Category Filtering:**
```javascript
const isCategorySupported = (category) => {
  if (!sportConfig || !sportConfig.category_support) return true;
  return sportConfig.category_support[category] === true;
};

// In category select:
<select name="category">
  <option value="singles" disabled={!isCategorySupported('singles')}>
    Singles {!isCategorySupported('singles') && '(Not supported)'}
  </option>
  <option value="doubles" disabled={!isCategorySupported('doubles')}>
    Doubles {!isCategorySupported('doubles') && '(Not supported)'}
  </option>
  <option value="teams" disabled={!isCategorySupported('teams')}>
    Teams {!isCategorySupported('teams') && '(Not supported)'}
  </option>
</select>
```

---

## 🗄️ Database Migration Steps

### Step 1: Backup Database
```bash
mysqldump -u your_user -p sportlife_db > backup_before_migration.sql
```

### Step 2: Run Migration Script
```bash
mysql -u your_user -p sportlife_db < migrations/ALTER_TOURNAMENTS_ENHANCED.sql
```

### Step 3: Verify Migration
```sql
-- Check new columns
DESCRIBE tournaments;

-- Check sport configs
SELECT * FROM sport_match_configs;

-- Verify existing tournaments have default config
SELECT id, name, tournament_type, match_config FROM tournaments LIMIT 5;
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] GET /api/v1/sport-configs returns all sports
- [ ] GET /api/v1/sport-configs/:sportId returns specific config
- [ ] GET /api/v1/sport-configs/:sportId/presets returns presets
- [ ] POST /api/v1/tournaments with match_config works
- [ ] Category validation works (e.g., Football doesn't allow singles)
- [ ] Default config auto-applied when not provided
- [ ] Match config validation catches errors

### Frontend Tests
- [ ] Sport selection loads configuration
- [ ] Match config fields change based on sport
- [ ] Presets populate form correctly
- [ ] Category dropdown disables unsupported options
- [ ] Logo preview works
- [ ] Tournament type selection works
- [ ] Form submission includes all new fields
- [ ] Validation messages display properly

---

## 📊 Sport-Specific Configuration Examples

### Badminton (Set-Based)
```json
{
  "match_structure": "set_based",
  "sets_to_win": 2,
  "total_sets": 3,
  "points_per_set": 21,
  "win_by_margin": 2,
  "max_points": 30,
  "deuce_enabled": true
}
```

### Tennis (Set-Based with Games)
```json
{
  "match_structure": "set_based",
  "sets_to_win": 2,
  "total_sets": 3,
  "games_per_set": 6,
  "tiebreak_at": 6,
  "tiebreak_points": 7,
  "scoring_system": "tennis"
}
```

### Table Tennis (Game-Based)
```json
{
  "match_structure": "game_based",
  "games_to_win": 4,
  "total_games": 7,
  "points_per_game": 11,
  "win_by_margin": 2,
  "deuce_enabled": true
}
```

### Football (Time-Based)
```json
{
  "match_structure": "time_based",
  "periods": 2,
  "period_duration": 45,
  "break_duration": 15,
  "extra_time_enabled": false
}
```

---

## 🎨 UI/UX Guidelines

### Form Layout
1. **Section 1:** Basic Information (Name, Logo, Description)
2. **Section 2:** Tournament Settings (Sport, Format, Category, Type, Max Participants)
3. **Section 3:** Match Configuration (Sport-specific fields)
4. **Section 4:** Schedule & Venue (Dates, Venue)
5. **Section 5:** Financial Details (Entry Fee, Prize Money)

### Visual Indicators
- Use icons for each section
- Show sport logo/icon when selected
- Display estimated match duration
- Highlight unsupported categories
- Show preset descriptions

### Validation
- Real-time validation for match config
- Show errors inline
- Disable submit until valid
- Confirm before submission

---

## 🚀 Deployment Steps

### 1. Backend Deployment
```bash
# Pull latest code
git pull origin main

# Run migration
mysql -u user -p database < migrations/ALTER_TOURNAMENTS_ENHANCED.sql

# Restart backend
pm2 restart sportlife-backend
```

### 2. Frontend Deployment
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Deploy
pm2 restart sportlife-frontend
```

### 3. Verification
- Test tournament creation with each sport
- Verify match configs are saved
- Check category restrictions
- Test preset selection

---

## 📝 API Documentation Updates

### New Endpoints

#### GET /api/v1/sport-configs
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sport_id": 1,
      "sport_name": "Badminton",
      "match_structure": "set_based",
      "default_config": {...},
      "category_support": {
        "singles": true,
        "doubles": true,
        "teams": true
      }
    }
  ]
}
```

#### POST /api/v1/tournaments (Updated)
**Request:**
```json
{
  "name": "Summer Championship",
  "logo_url": "https://example.com/logo.png",
  "description": "Annual tournament",
  "sport_id": 1,
  "format_type": "knockout",
  "category": "singles",
  "tournament_type": "open",
  "match_config": {
    "match_structure": "set_based",
    "sets_to_win": 2,
    "total_sets": 3,
    "points_per_set": 21
  },
  "start_date": "2024-12-01 09:00:00",
  "end_date": "2024-12-03 18:00:00",
  "registration_start": "2024-11-01 00:00:00",
  "registration_end": "2024-11-30 23:59:59",
  "venue_id": 1,
  "max_participants": 32,
  "entry_fee": 500,
  "prize_money": 10000
}
```

---

## ✅ Summary

### Completed
✅ Database schema updated
✅ Backend models created/updated
✅ Backend controllers created
✅ Backend routes configured
✅ Backend validators updated
✅ Backend services enhanced
✅ Sport configurations seeded
✅ API endpoints documented

### Remaining
🔲 Frontend service layer
🔲 Frontend component updates
🔲 Match config UI components
🔲 Category filtering logic
🔲 Preset selection UI
🔲 Form validation
🔲 Testing
🔲 Documentation

---

## 🎯 Next Steps

1. **Create Frontend Service** - sportConfigService.js
2. **Update CreateTournament Component** - Add new sections
3. **Create Match Config Components** - Reusable config forms
4. **Add Validation** - Real-time validation
5. **Test End-to-End** - Complete flow testing
6. **Deploy** - Production deployment

---

**Implementation Status:** Backend Complete ✅ | Frontend In Progress 🔄
