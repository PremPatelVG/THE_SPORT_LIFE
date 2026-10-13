# Tournament Joining UI - Visual Components Guide

## 🎨 Complete UI Walkthrough

---

## 1. Tournament Detail Page - Singles

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Back                    City Singles Championship    [Open ✓]    │
│                           Badminton                                 │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┬──────────────────────────────┐
│                                     │  Quick Actions               │
│  🏆 Tournament Details              │                              │
│  Complete information               │  ┌────────────────────────┐  │
│                                     │  │  👤 Register Now       │  │
│  Description                        │  └────────────────────────┘  │
│  Annual singles championship...     │                              │
│                                     │  Registration Type:          │
│  📅 Start: Dec 1, 2024             │  Singles                     │
│  📅 End: Dec 5, 2024               │                              │
│  📍 Sports Complex, New York       │                              │
│  ℹ️  Format: Knockout              │                              │
│  👥 Category: Singles              │                              │
│  💰 Entry Fee: $500                │                              │
│  🏆 Prize: $10,000                 │                              │
│                                     │                              │
│  Organized By                       │                              │
│  [JD] John Doe                      │                              │
│       john@example.com              │                              │
│                                     │                              │
├─────────────────────────────────────┤                              │
│  👥 Participants                    │                              │
│  15 / 32 registered                 │                              │
│                                     │                              │
│  [1] Jane Smith         ✓ Confirmed │                              │
│  [2] Bob Johnson        ✓ Confirmed │                              │
│  [3] Alice Williams     ⏱ Pending   │                              │
│  ...                                │                              │
└─────────────────────────────────────┴──────────────────────────────┘
```

---

## 2. Tournament Detail Page - Teams

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Back              City Football Championship      [Open ✓]       │
│                     Football                                        │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┬──────────────────────────────┐
│                                     │  Quick Actions               │
│  🏆 Tournament Details              │                              │
│  Complete information               │  ┌────────────────────────┐  │
│                                     │  │  👤 Register Now       │  │
│  Description                        │  └────────────────────────┘  │
│  Team-based football tournament     │                              │
│                                     │  ┌────────────────────────┐  │
│  📅 Start: Dec 15, 2024            │  │ Registration Type:     │  │
│  📅 End: Dec 20, 2024              │  │ Teams                  │  │
│  📍 City Stadium                    │  │ 2 team(s) available    │  │
│  ℹ️  Format: Knockout              │  └────────────────────────┘  │
│  👥 Category: Teams                │                              │
│  💰 Entry Fee: $2,000              │                              │
│  🏆 Prize: $50,000                 │                              │
│                                     │                              │
│  Organized By                       │                              │
│  [MS] Mike Smith                    │                              │
│       mike@example.com              │                              │
│                                     │                              │
├─────────────────────────────────────┤                              │
│  👥 Participants                    │                              │
│  8 / 16 teams registered            │                              │
│                                     │                              │
│  [👥] Thunder Strikers  ✓ Confirmed │                              │
│  [👥] Lightning Bolts   ✓ Confirmed │                              │
│  [👥] Storm Chasers     ⏱ Pending   │                              │
│  ...                                │                              │
└─────────────────────────────────────┴──────────────────────────────┘
```

---

## 3. Team Selection Modal

```
┌──────────────────────────────────────────────────────────────────┐
│  👥 Select Your Team                                         [X] │
│  Choose a team to register for City Football Championship       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✓ Available Teams (2)                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ [👥] Thunder Strikers                    [⚡ Captain]  │     │
│  │      👤 8 / 11 members                                 │     │
│  │      ✓ Ready to register                               │     │
│  │      Best team in the city...                     (●)  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ [👥] Lightning Bolts                     [⚡ Captain]  │     │
│  │      👤 6 / 11 members                                 │     │
│  │      ✓ Ready to register                               │     │
│  │      Fast and furious team...                     (○)  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ⚠️ Unavailable Teams (1)                                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ [👥] Storm Chasers                                     │     │
│  │      👤 4 / 11 members                                 │     │
│  │      ⚠️ Need at least 6 members                        │     │
│  │      ⚠️ Only captain or creator can register           │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  ➕ Create New Team for this Tournament                │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ ℹ️ Team Requirements:                                  │     │
│  │ • Team must have at least 6 members                    │     │
│  │ • Only team captain or creator can register            │     │
│  │ • Team must be created for this specific tournament    │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [Cancel]                                    [Register Team]    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Registration Confirmation Modal (Singles)

```
┌──────────────────────────────────────────────┐
│                                              │
│            ┌──────────────┐                  │
│            │   👤 Join    │                  │
│            └──────────────┘                  │
│                                              │
│      Register for Tournament                 │
│                                              │
│  Confirm your registration for              │
│  City Singles Championship                   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Entry Fee: $500                        │  │
│  │ Payment will be required after         │  │
│  │ registration                           │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Cancel]              [Confirm]             │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 5. Payment Modal

```
┌──────────────────────────────────────────────┐
│                                              │
│            ┌──────────────┐                  │
│            │   💰 Pay     │                  │
│            └──────────────┘                  │
│                                              │
│         Complete Payment                     │
│                                              │
│  Registration successful!                    │
│  Complete your payment to confirm.           │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Tournament: City Singles Championship  │  │
│  │ Entry Fee: $500                        │  │
│  │                                        │  │
│  │ ✓ Your spot is reserved for 24 hours  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │        💳 Pay with Card                │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │           Pay Later                    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Your registration will be confirmed         │
│  once payment is received                    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 6. Create Team Page

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Back                    Create Team                               │
│                           Build your team for tournament            │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Team Name *                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 👥 [Enter team name                                      ] │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Tournament *                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🏆 [City Football Championship - Football            ▼] │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Select the tournament this team will participate in            │
│                                                                  │
│  Maximum Players                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ [11                                                      ] │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Maximum number of players allowed in the team (2-50)           │
│                                                                  │
│  Description (Optional)                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Tell others about your team...                            │  │
│  │                                                            │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Optional description about your team's goals, playstyle, etc.  │
│                                                                  │
│  Team Logo URL (Optional)                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🖼️  [https://example.com/logo.png                       ] │  │
│  └────────────────────────────────────────────────────────────┘  │
│  URL to your team's logo image                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ℹ️ Team Creation Notes:                                   │  │
│  │ • You will be set as the team captain                     │  │
│  │ • You can invite other players after creating the team    │  │
│  │ • Team members can be managed from the team detail page   │  │
│  │ • Only the creator can delete the team                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Cancel]                                    [👥 Create Team]   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Success Message

```
┌──────────────────────────────────────────────────────────────────┐
│  ✓ Team created successfully!                                    │
│    Redirecting to tournament...                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Error Message

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️ Team does not meet minimum member requirements               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Primary Colors (Tournaments)
```
Background: bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50
Primary: bg-gradient-to-r from-emerald-600 to-teal-600
Text: text-emerald-600, text-teal-600
```

### Secondary Colors (Teams)
```
Primary: bg-gradient-to-r from-blue-600 to-blue-700
Accent: bg-blue-50, border-blue-200
Text: text-blue-600, text-blue-700
```

### Status Colors
```
Success: bg-emerald-50, text-emerald-700, border-emerald-500
Error: bg-red-50, text-red-700, border-red-500
Warning: bg-yellow-50, text-yellow-700, border-yellow-500
Info: bg-blue-50, text-blue-700, border-blue-200
```

---

## 🔘 Button Styles

### Primary Button
```css
bg-gradient-to-r from-emerald-600 to-teal-600
text-white font-semibold rounded-lg
shadow-lg hover:shadow-xl
transform hover:-translate-y-0.5
transition-all duration-200
```

### Secondary Button
```css
border-2 border-gray-300
text-gray-700 font-semibold rounded-lg
hover:bg-gray-50
transition-all
```

### Danger Button
```css
border-2 border-red-600
text-red-600 font-semibold rounded-lg
hover:bg-red-50
transition-all
```

### Dashed Button (Create)
```css
border-2 border-dashed border-blue-300
text-blue-600 font-semibold rounded-lg
hover:bg-blue-50 hover:border-blue-400
transition-all
```

---

## 📱 Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Full-width cards
- Stacked buttons
- Smaller text sizes

### Tablet (640px - 1024px)
- Two column grid
- Sidebar sticky
- Medium cards
- Comfortable spacing

### Desktop (> 1024px)
- Three column grid (2:1 ratio)
- Sticky sidebar
- Large cards
- Generous spacing

---

## 🎭 Interactive States

### Hover States
```
Cards: hover:bg-gray-50
Buttons: hover:shadow-xl, hover:-translate-y-0.5
Links: hover:text-emerald-700
Icons: hover:scale-105
```

### Focus States
```
Inputs: focus:ring-2 focus:ring-emerald-500
Buttons: focus:outline-none focus:ring-2
Links: focus:ring-2 focus:ring-offset-2
```

### Loading States
```
Spinner: animate-spin border-emerald-600
Disabled: opacity-50 cursor-not-allowed
Skeleton: animate-pulse bg-gray-200
```

### Active States
```
Selected: border-blue-600 bg-blue-50
Checked: bg-blue-600 text-white
Active: bg-emerald-100
```

---

## 🎯 Icon Usage

### Status Icons
- ✓ CheckCircle: Success, Confirmed
- ⚠️ AlertCircle: Warning, Error
- ⏱ Clock: Pending, Waiting
- ℹ️ Info: Information

### Action Icons
- 👤 UserPlus: Register, Join
- ➕ Plus: Create, Add
- ❌ X: Close, Cancel
- ← ArrowLeft: Back, Return

### Entity Icons
- 🏆 Trophy: Tournament
- 👥 Users: Team, Participants
- ⚡ Shield: Captain, Leader
- 💰 DollarSign: Payment, Fee

---

## 📐 Spacing System

### Padding
```
Small: p-3 (12px)
Medium: p-4 (16px)
Large: p-6 (24px)
XLarge: p-8 (32px)
```

### Margin
```
Small: mb-3 (12px)
Medium: mb-4 (16px)
Large: mb-6 (24px)
XLarge: mb-8 (32px)
```

### Gap
```
Small: gap-2 (8px)
Medium: gap-3 (12px)
Large: gap-4 (16px)
XLarge: gap-6 (24px)
```

---

## 🎨 Card Styles

### Standard Card
```css
bg-white rounded-2xl shadow-lg
p-8 border border-gray-100
```

### Info Card
```css
bg-blue-50 border border-blue-200
rounded-lg p-4
```

### Success Card
```css
bg-emerald-50 border-l-4 border-emerald-500
px-4 py-3 rounded-lg
```

### Error Card
```css
bg-red-50 border-l-4 border-red-500
px-4 py-3 rounded-lg
```

---

## 🔄 Animation Classes

### Fade In
```css
animate-in fade-in duration-200
```

### Zoom In
```css
animate-in zoom-in duration-200
```

### Slide Up
```css
transform hover:-translate-y-0.5
transition-all duration-200
```

### Spin
```css
animate-spin
```

---

## 📝 Typography

### Headings
```
H1: text-2xl font-bold
H2: text-xl font-bold
H3: text-lg font-semibold
H4: text-sm font-semibold
```

### Body Text
```
Regular: text-sm text-gray-600
Small: text-xs text-gray-500
Bold: font-semibold text-gray-900
```

### Links
```
text-emerald-600 hover:text-emerald-700
font-semibold
```

---

## 🎯 Accessibility

### ARIA Labels (To Add)
```javascript
aria-label="Register for tournament"
aria-describedby="registration-info"
role="dialog"
aria-modal="true"
```

### Keyboard Navigation
- Tab through interactive elements
- Enter to submit forms
- Escape to close modals
- Arrow keys for selection

### Screen Reader Support
- Semantic HTML elements
- Descriptive button text
- Error announcements
- Success confirmations

---

**Visual Guide Version**: 1.0.0
**Last Updated**: November 2024
**Design System**: Tailwind CSS + Lucide Icons
