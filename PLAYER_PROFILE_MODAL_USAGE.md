# Player Profile Modal - Usage Guide

## Overview
The `PlayerProfileModal` is a reusable, professional modal component that displays complete player information including personal details, sports, and statistics. It can be used anywhere in the project.

## Features
- ✅ Professional, modern UI design
- ✅ Two tabs: Overview & Statistics
- ✅ Personal information display
- ✅ Sport-specific statistics (ready for API integration)
- ✅ Tournament performance tracking
- ✅ Teams & partnerships display
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

## Installation

### 1. Import the Component
```javascript
import PlayerProfileModal from '../components/PlayerProfileModal';
```

### 2. Add State Variables
```javascript
const [selectedPlayerId, setSelectedPlayerId] = useState(null);
const [showPlayerProfile, setShowPlayerProfile] = useState(false);
```

### 3. Add Modal to JSX
```javascript
{/* Player Profile Modal */}
{showPlayerProfile && selectedPlayerId && (
  <PlayerProfileModal
    userId={selectedPlayerId}
    onClose={() => {
      setShowPlayerProfile(false);
      setSelectedPlayerId(null);
    }}
  />
)}
```

### 4. Trigger Modal on Click
```javascript
<div 
  onClick={() => {
    setSelectedPlayerId(userId);
    setShowPlayerProfile(true);
  }}
  className="cursor-pointer"
>
  {/* Player name or avatar */}
  Click to view profile
</div>
```

## Complete Example

### Example 1: Team Members List
```javascript
import { useState } from 'react';
import PlayerProfileModal from '../components/PlayerProfileModal';

const TeamMembersList = ({ members }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  return (
    <div>
      {members.map((member) => (
        <div
          key={member.user_id}
          onClick={() => {
            setSelectedPlayerId(member.user_id);
            setShowPlayerProfile(true);
          }}
          className="cursor-pointer hover:bg-gray-100 p-4 rounded-lg"
        >
          <p>{member.first_name} {member.last_name}</p>
        </div>
      ))}

      {/* Player Profile Modal */}
      {showPlayerProfile && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};
```

### Example 2: Match Participants
```javascript
import { useState } from 'react';
import PlayerProfileModal from '../components/PlayerProfileModal';

const MatchParticipants = ({ participant1, participant2 }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  const handlePlayerClick = (userId) => {
    setSelectedPlayerId(userId);
    setShowPlayerProfile(true);
  };

  return (
    <div>
      <div onClick={() => handlePlayerClick(participant1.id)}>
        {participant1.name}
      </div>
      <div onClick={() => handlePlayerClick(participant2.id)}>
        {participant2.name}
      </div>

      {showPlayerProfile && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};
```

### Example 3: Leaderboard
```javascript
import { useState } from 'react';
import PlayerProfileModal from '../components/PlayerProfileModal';

const Leaderboard = ({ players }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);

  return (
    <div>
      <table>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.id}>
              <td>{index + 1}</td>
              <td
                onClick={() => {
                  setSelectedPlayerId(player.id);
                  setShowPlayerProfile(true);
                }}
                className="cursor-pointer text-blue-600 hover:underline"
              >
                {player.name}
              </td>
              <td>{player.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showPlayerProfile && selectedPlayerId && (
        <PlayerProfileModal
          userId={selectedPlayerId}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerId(null);
          }}
        />
      )}
    </div>
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | number | Yes | The ID of the user/player to display |
| `onClose` | function | Yes | Callback function when modal is closed |

## Modal Sections

### Overview Tab
- **Quick Stats**: Tournaments, Matches, Wins, Win Rate
- **Personal Information**: Name, Email, Phone, Location, Member Since, Player ID
- **Sports & Preferences**: List of sports the player participates in
- **Recent Activity**: Recent matches and tournaments

### Statistics Tab
- **Sport Filter**: Filter statistics by sport
- **Overall Performance**: Total matches, wins, losses, win rate
- **Tournament Performance**: Tournaments played, championships, runner-up, semi-finals
- **Sport-Specific Stats**: Detailed statistics for each sport
- **Teams & Partnerships**: Number of teams and partnerships

## API Integration

The modal currently uses a mock API endpoint. To integrate with your backend:

### Backend Endpoint Required
```
GET /api/v1/users/:userId/profile
```

### Expected Response Format
```json
{
  "success": true,
  "data": {
    "id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+91 9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "profile_image": "uploads/profiles/123.jpg",
    "created_at": "2025-01-01T00:00:00Z",
    "sports": [
      {
        "id": 1,
        "name": "Volleyball",
        "statistics": {
          "matches_played": 50,
          "wins": 35,
          "losses": 15,
          "tournaments": 10,
          "championships": 2
        }
      }
    ],
    "teams": [
      {
        "id": 1,
        "name": "Team A",
        "sport": "Volleyball"
      }
    ],
    "partnerships": [
      {
        "id": 1,
        "partner_name": "Jane Doe",
        "sport": "Badminton"
      }
    ]
  }
}
```

## Styling

The modal uses:
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Gradient backgrounds** for modern look
- **Smooth animations** for better UX
- **Responsive design** for all screen sizes

## Where to Use

You can use this modal in:
- ✅ Team detail pages (members list)
- ✅ Pair detail pages (partner profiles)
- ✅ Match details (participant profiles)
- ✅ Tournament participants
- ✅ Leaderboards
- ✅ Search results
- ✅ Invitations list
- ✅ Any place where user names are displayed

## Customization

To customize the modal:

1. **Change colors**: Update the gradient classes in `PlayerProfileModal.jsx`
2. **Add sections**: Add new sections in `OverviewTab` or `StatisticsTab`
3. **Modify stats**: Update the `StatsBox` and `StatCard` components
4. **Add animations**: Use Tailwind's animation utilities

## Notes

- The modal automatically fetches player data when opened
- Loading states are handled automatically
- Error handling is built-in (falls back to mock data)
- Statistics sections are ready for API integration
- All sections are responsive and mobile-friendly

## Support

For issues or questions, check:
- Component file: `src/components/PlayerProfileModal.jsx`
- Example usage: `src/pages/TeamDetailPage.jsx`
