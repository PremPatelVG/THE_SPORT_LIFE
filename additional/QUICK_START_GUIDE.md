# Tournament Joining - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you quickly understand and test the tournament joining flow.

---

## 📋 Prerequisites

- Backend server running on `http://localhost:5000`
- Frontend server running on `http://localhost:3000`
- Database with sample data
- User account created and logged in

---

## ⚡ Quick Test Scenarios

### Scenario 1: Join Singles Tournament (2 minutes)

1. **Navigate to Tournaments**
   ```
   http://localhost:3000/tournaments
   ```

2. **Find a Singles Tournament**
   - Look for tournaments with category "Singles"
   - Status should be "Open"

3. **Click on Tournament**
   - View tournament details
   - Check if "Register Now" button is visible

4. **Register**
   - Click "Register Now"
   - Confirm registration in modal
   - Check success message

**Expected Result**: ✅ Registration successful, participant added

---

### Scenario 2: Join Team Tournament with Existing Team (5 minutes)

1. **Create a Team First**
   ```
   Navigate to: http://localhost:3000/teams/create
   ```
   - Fill in team details
   - Select a team tournament
   - Set max players (e.g., 11)
   - Create team

2. **Invite Team Members** (Optional but recommended)
   - Go to team detail page
   - Invite at least 6 members (for 11-player team)
   - Wait for members to accept

3. **Navigate to Tournament**
   ```
   http://localhost:3000/tournaments/{tournament_id}
   ```

4. **Register Team**
   - Click "Register Now"
   - Team selection modal appears
   - Select your team
   - Click "Register Team"

**Expected Result**: ✅ Team registered successfully

---

### Scenario 3: Join Team Tournament by Creating New Team (3 minutes)

1. **Navigate to Team Tournament**
   ```
   http://localhost:3000/tournaments/{team_tournament_id}
   ```

2. **Click Register**
   - Click "Register Now"
   - Team selection modal appears

3. **Create New Team**
   - Click "Create New Team for this Tournament"
   - Redirects to create team page with tournament pre-selected
   - Fill in team details
   - Create team

4. **Return and Register**
   - Automatically redirected back to tournament
   - Click "Register Now" again
   - Select newly created team
   - Register

**Expected Result**: ✅ New team created and registered

---

## 🧪 Testing with API

### Test Join Options
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/1/join-options" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
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
        "existing_teams": [...],
        "can_create_team": true,
        "min_members_required": 6
      }
    }
  }
}
```

### Test Eligible Teams
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/1/eligible-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "name": "Thunder Strikers",
      "member_count": 8,
      "is_captain": true,
      "can_register": true,
      "reasons": []
    }
  ]
}
```

### Test Registration (Singles)
```bash
curl -X POST "http://localhost:5000/api/v1/tournaments/1/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test Registration (Teams)
```bash
curl -X POST "http://localhost:5000/api/v1/tournaments/1/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 25}'
```

---

## 🎯 Key Files to Check

### Backend
```
src/services/tournamentService.js    - Registration logic
src/controllers/tournamentController.js - API endpoints
src/routes/tournament.routes.js      - Route definitions
src/models/Team.js                   - Team model
src/models/TournamentParticipant.js  - Participant model
```

### Frontend
```
src/pages/TournamentDetail.jsx       - Main tournament page
src/components/TeamSelectionModal.jsx - Team selection UI
src/pages/CreateTeam.jsx             - Team creation
src/services/tournamentService.js    - API calls
```

---

## 🔍 Debugging Tips

### Backend Issues

**Problem**: Registration fails with "Team not found"
```bash
# Check if team exists
SELECT * FROM teams WHERE id = 25;

# Check if team belongs to tournament
SELECT * FROM teams WHERE id = 25 AND tournament_id = 1;
```

**Problem**: "Team does not meet minimum member requirements"
```bash
# Check team member count
SELECT COUNT(*) FROM team_members 
WHERE team_id = 25 AND is_active = TRUE;

# Check minimum required
SELECT max_players FROM teams WHERE id = 25;
# Min required = CEIL(max_players / 2)
```

**Problem**: "Only captain or creator can register"
```bash
# Check if user is captain or creator
SELECT captain_id, creator_id FROM teams WHERE id = 25;
```

### Frontend Issues

**Problem**: Team selection modal doesn't show teams
```javascript
// Check browser console for errors
// Check network tab for API response
// Verify authentication token is valid
```

**Problem**: Register button not showing
```javascript
// Check tournament status (should be 'open')
// Check if user is authenticated
// Check if user is already registered
// Check join options response
```

**Problem**: Modal doesn't close after registration
```javascript
// Check for JavaScript errors in console
// Verify state updates in React DevTools
// Check if success callback is triggered
```

---

## 📊 Sample Data Setup

### Create Sample Tournament (SQL)
```sql
INSERT INTO tournaments (
  name, sport_id, venue_id, organizer_id,
  start_date, end_date,
  registration_start, registration_end,
  max_participants, entry_fee, prize_money,
  format_type, category, status
) VALUES (
  'Test Team Tournament',
  1, -- badminton
  1, -- venue
  1, -- organizer
  '2024-12-15',
  '2024-12-20',
  NOW(),
  '2024-12-10 23:59:59',
  16,
  2000.00,
  50000.00,
  'knockout',
  'teams',
  'open'
);
```

### Create Sample Team (SQL)
```sql
INSERT INTO teams (
  name, tournament_id, creator_id, captain_id,
  description, max_players
) VALUES (
  'Test Team',
  1, -- tournament_id
  1, -- creator_id
  1, -- captain_id
  'Test team for development',
  11
);

-- Add team members
INSERT INTO team_members (team_id, user_id, is_active)
VALUES 
  (1, 1, TRUE),
  (1, 2, TRUE),
  (1, 3, TRUE),
  (1, 4, TRUE),
  (1, 5, TRUE),
  (1, 6, TRUE);
```

---

## 🎨 UI Components Overview

### TournamentDetail Page
- **Location**: `/tournaments/:id`
- **Shows**: Tournament info, participants, registration button
- **Actions**: Register, Withdraw, View details

### TeamSelectionModal
- **Triggered by**: Clicking "Register Now" on team tournament
- **Shows**: Eligible teams, ineligible teams, create option
- **Actions**: Select team, Create new team, Cancel

### CreateTeam Page
- **Location**: `/teams/create?tournament_id=X`
- **Shows**: Team creation form
- **Actions**: Create team, Cancel

---

## 🔄 Complete Flow Walkthrough

### Step-by-Step: Team Tournament Registration

1. **User logs in**
   - Navigate to login page
   - Enter credentials
   - Get authentication token

2. **Browse tournaments**
   - Navigate to `/tournaments`
   - Filter by category: "teams"
   - Find open tournament

3. **View tournament details**
   - Click on tournament card
   - Navigate to `/tournaments/:id`
   - See tournament information

4. **Check eligibility**
   - System fetches join options
   - Shows "Register Now" if eligible
   - Shows registration type info

5. **Click Register**
   - Click "Register Now" button
   - System detects category = "teams"
   - Opens TeamSelectionModal

6. **View teams**
   - Modal fetches eligible teams
   - Shows teams with status
   - Highlights eligible teams

7. **Select team**
   - Click on eligible team
   - Team card highlights
   - "Register Team" button enables

8. **Confirm registration**
   - Click "Register Team"
   - API call to register
   - Success message shows

9. **Payment (if required)**
   - Payment modal opens
   - User completes payment
   - Registration confirmed

10. **Success**
    - Modal closes
    - Page refreshes
    - Team appears in participants

---

## 🎯 Success Indicators

### Registration Successful
- ✅ Success message appears
- ✅ User appears in participants list
- ✅ "Register Now" button disappears
- ✅ "Withdraw" button appears (if tournament still open)

### Team Selection Working
- ✅ Modal opens smoothly
- ✅ Teams load and display
- ✅ Eligible teams are selectable
- ✅ Ineligible teams show reasons
- ✅ Create team button works

### Navigation Working
- ✅ Create team redirects back
- ✅ Registration refreshes data
- ✅ No broken links
- ✅ Smooth transitions

---

## 🚨 Common Errors & Solutions

### Error: "Tournament registration is not open"
**Solution**: Check tournament status, should be 'open'

### Error: "Team does not belong to this tournament"
**Solution**: Create team for the specific tournament

### Error: "Team does not meet minimum member requirements"
**Solution**: Add more members to team (need at least 50% of max_players)

### Error: "Only team captain or creator can register"
**Solution**: Ask captain to register, or transfer captaincy

### Error: "This team is already registered"
**Solution**: Team is already registered, cannot register twice

### Error: "Tournament is full"
**Solution**: Tournament reached max participants, cannot register

---

## 📱 Mobile Testing

### Test on Mobile
1. Open Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device
4. Test all flows

### Check:
- ✅ Buttons are touch-friendly
- ✅ Modals are scrollable
- ✅ Text is readable
- ✅ Forms are usable
- ✅ Navigation works

---

## 🎓 Next Steps

### After Testing
1. Review code structure
2. Check documentation
3. Test edge cases
4. Verify security
5. Optimize performance

### For Production
1. Add error tracking (Sentry)
2. Add analytics (Google Analytics)
3. Set up monitoring
4. Configure alerts
5. Prepare rollback plan

---

## 📞 Need Help?

### Resources
- **API Documentation**: `docs/TOURNAMENT_JOINING_API_GUIDE.md`
- **UI Guide**: `UI_COMPONENTS_GUIDE.md`
- **Implementation**: `TOURNAMENT_JOINING_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference**: `TOURNAMENT_JOINING_QUICK_REFERENCE.md`

### Troubleshooting
1. Check browser console
2. Check network tab
3. Review API responses
4. Check database records
5. Review error logs

---

## ✅ Checklist

Before marking as complete:

- [ ] Backend APIs tested
- [ ] Frontend UI tested
- [ ] Singles flow works
- [ ] Team flow works
- [ ] Validation works
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Documentation reviewed
- [ ] Code reviewed
- [ ] Ready for production

---

**Quick Start Version**: 1.0.0  
**Last Updated**: November 2024  
**Estimated Time**: 15 minutes to test all flows  

**Happy Testing! 🎉**
