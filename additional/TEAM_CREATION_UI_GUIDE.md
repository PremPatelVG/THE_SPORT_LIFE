# Team Creation UI Guide

## Visual Layout

### 1. Team Type Toggle Section

```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️  Team Type                                               │
│  Choose whether this team is for a specific tournament or   │
│  can be reused across multiple tournaments.                 │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │      🏆              │  │      👥              │        │
│  │  Tournament-Based    │  │   Reusable Team      │        │
│  │ For one tournament   │  │ Use in multiple      │        │
│  │       only           │  │   tournaments        │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**When Tournament-Based is selected:**
- Left button: Blue border, blue background
- Right button: Gray border, white background

**When Reusable Team is selected:**
- Left button: Gray border, white background
- Right button: Emerald border, emerald background

---

### 2. Tournament-Based Team Form

```
┌─────────────────────────────────────────────────────────────┐
│  Team Name *                                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👥 Enter team name                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Team Type Toggle - Tournament-Based Selected]             │
│                                                              │
│  Tournament *                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🏆 Select a tournament ▼                              │  │
│  │    - Summer Championship - Football                   │  │
│  │    - Winter League - Cricket                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  Select the tournament this team will participate in        │
│                                                              │
│  Maximum Players                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 11                                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  Maximum number of players allowed in the team (2-50)       │
│                                                              │
│  Description (Optional)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Tell others about your team...                        │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Cancel]  [Create Team]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Reusable Team Form

```
┌─────────────────────────────────────────────────────────────┐
│  Team Name *                                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👥 Enter team name                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Team Type Toggle - Reusable Team Selected]                │
│                                                              │
│  Sport *                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🏆 Select a sport ▼                                   │  │
│  │    - Football                                         │  │
│  │    - Cricket                                          │  │
│  │    - Basketball                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  Select the sport type for this reusable team               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑️ Make team public                                  │    │
│  │ Public teams are visible to all users and can be    │    │
│  │ joined by anyone. Private teams are only visible    │    │
│  │ to invited members.                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Maximum Players                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 11                                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  Maximum number of players allowed in the team (2-50)       │
│                                                              │
│  Description (Optional)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Tell others about your team...                        │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Cancel]  [Create Team]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Color Coding

### Tournament-Based (Blue Theme)
- **Border:** `border-blue-600` (#2563EB)
- **Background:** `bg-blue-100` (#DBEAFE)
- **Text:** `text-blue-900` (#1E3A8A)
- **Focus Ring:** `focus:ring-blue-500`

### Reusable Team (Emerald Theme)
- **Border:** `border-emerald-600` (#059669)
- **Background:** `bg-emerald-100` (#D1FAE5)
- **Text:** `text-emerald-900` (#064E3B)
- **Focus Ring:** `focus:ring-emerald-500`

### Info Banner (Blue)
- **Background:** `bg-blue-50` (#EFF6FF)
- **Border:** `border-blue-200` (#BFDBFE)
- **Text:** `text-blue-700` (#1D4ED8)

### Public Checkbox Section (Gray)
- **Background:** `bg-gray-50` (#F9FAFB)
- **Border:** `border-gray-200` (#E5E7EB)
- **Checkbox:** `text-emerald-600`

---

## Interactive States

### Toggle Buttons

**Default (Unselected):**
```
┌──────────────────────┐
│ border-gray-300      │
│ bg-white             │
│ text-gray-700        │
│ hover:border-blue-300│
└──────────────────────┘
```

**Selected:**
```
┌──────────────────────┐
│ border-blue-600      │
│ bg-blue-100          │
│ text-blue-900        │
│ font-semibold        │
└──────────────────────┘
```

**Disabled (from tournament page):**
```
┌──────────────────────┐
│ opacity-50           │
│ cursor-not-allowed   │
└──────────────────────┘
```

---

## Validation Messages

### Error States

**Missing Team Name:**
```
Team Name *
┌─────────────────────────────┐
│ 👥 [empty field]            │ ← Red border
└─────────────────────────────┘
❌ Team name is required
```

**Missing Tournament (Tournament-Based):**
```
Tournament *
┌─────────────────────────────┐
│ 🏆 Select a tournament ▼    │ ← Red border
└─────────────────────────────┘
❌ Please select a tournament
```

**Missing Sport (Reusable):**
```
Sport *
┌─────────────────────────────┐
│ 🏆 Select a sport ▼         │ ← Red border
└─────────────────────────────┘
❌ Please select a sport
```

---

## Success/Error Alerts

### Success Message
```
┌─────────────────────────────────────────────────────┐
│ ✅ Team created successfully!                       │
│    Redirecting to your teams...                     │
└─────────────────────────────────────────────────────┘
```

### Error Message
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  A team with this name already exists in this    │
│    tournament                                        │
└─────────────────────────────────────────────────────┘
```

### Warning (No Tournaments)
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  No open team tournaments available. Please      │
│    check back later or contact an admin.            │
└─────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (> 768px)
- Toggle buttons: Side by side (grid-cols-2)
- Full width form fields
- Comfortable spacing

### Mobile (< 768px)
- Toggle buttons: Stack vertically
- Full width form fields
- Reduced padding
- Touch-friendly button sizes

---

## Accessibility Features

✅ **Keyboard Navigation:**
- Tab through all form fields
- Space/Enter to toggle team type
- Arrow keys in dropdowns

✅ **Screen Readers:**
- Proper label associations
- Required field indicators
- Error message announcements

✅ **Visual Indicators:**
- Clear focus states
- Color + icon + text (not color alone)
- High contrast text

✅ **Form Validation:**
- Inline error messages
- Clear error descriptions
- Focus on first error field

---

## User Experience Flow

### Scenario 1: Creating Team from Tournament Page

1. User clicks "Create Team" on tournament detail page
2. Form opens with tournament pre-selected
3. Team type locked to "Tournament-Based"
4. User only needs to enter team name and details
5. Submit → Team created for that tournament

### Scenario 2: Creating Reusable Team

1. User navigates to "Create Team"
2. Clicks "Reusable Team" toggle
3. Selects sport type
4. Optionally makes team public
5. Enters team details
6. Submit → Team created as reusable

### Scenario 3: Creating Tournament Team (General)

1. User navigates to "Create Team"
2. "Tournament-Based" selected by default
3. Selects tournament from list
4. Enters team details
5. Submit → Team created for selected tournament

---

## Tips for Users

💡 **Tournament-Based Teams:**
- Perfect for one-time tournaments
- Automatically registered for the tournament
- Cannot be used in other tournaments

💡 **Reusable Teams:**
- Build once, use many times
- Register for multiple tournaments
- Keep your roster together across events
- Make public to allow others to join

💡 **Public vs Private:**
- **Public:** Anyone can see and request to join
- **Private:** Only invited members can see the team

---

## Summary

The UI provides:
- ✅ Clear visual distinction between team types
- ✅ Intuitive toggle interface
- ✅ Conditional fields based on selection
- ✅ Helpful descriptions and hints
- ✅ Color-coded for easy recognition
- ✅ Responsive and accessible
- ✅ Clear validation messages
- ✅ Smooth user experience

Users can easily understand and choose the right team type for their needs!
