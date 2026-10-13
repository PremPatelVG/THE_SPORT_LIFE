# Backend Restart Required

## ⚠️ Important

The SQL GROUP BY fix has been applied to the code, but **you need to restart the backend server** for the changes to take effect.

---

## 🔄 How to Restart Backend

### **Option 1: Stop and Start**

```bash
# Stop the current server (Ctrl+C in the terminal)
^C

# Start the server again
cd sportlife-backend
npm run start
```

### **Option 2: Use nodemon (if installed)**

If you're using nodemon, it should auto-restart. If not, install it:

```bash
npm install -g nodemon
npm run dev  # If you have a dev script
```

---

## ✅ What Was Fixed

### **File:** `src/services/tournamentService.js`

### **Function:** `getEligibleTeams` (line 737-756)

**Changed:**
```javascript
// Before (❌ Error)
CASE WHEN tp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_registered
GROUP BY t.id

// After (✅ Fixed)
MAX(CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END) as is_registered
GROUP BY t.id, t.name, t.description, t.sport_id, t.tournament_id, t.max_players, 
         t.min_players, t.creator_id, t.captain_id, t.created_at, t.updated_at, t.deleted_at
```

---

## 🧪 After Restarting, Test These Endpoints

### **1. Eligible Teams**
```bash
GET http://localhost:5000/api/v1/tournaments/18/eligible-teams
```

**Expected:** ✅ Success with list of teams

### **2. Join Options**
```bash
GET http://localhost:5000/api/v1/tournaments/18/join-options
```

**Expected:** ✅ Success with join options

---

## 📝 Verification Steps

1. **Stop backend server** (Ctrl+C)
2. **Start backend server** (`npm run start`)
3. **Wait for "Database connected successfully"** message
4. **Test the endpoints** above
5. **Should work now!** ✅

---

## 🔍 If Still Getting Error

If you still get the GROUP BY error after restarting:

1. **Check the terminal** - Make sure the old process is actually stopped
2. **Check the port** - Make sure no other process is using port 5000
3. **Clear cache** - Sometimes Node caches modules

```bash
# Kill any process on port 5000
lsof -ti:5000 | xargs kill -9

# Clear npm cache (if needed)
npm cache clean --force

# Restart
npm run start
```

---

## 🎯 Summary

**Issue:** SQL GROUP BY error on `/tournaments/:id/join-options`

**Cause:** Old code still running (server not restarted)

**Solution:** **Restart the backend server**

**Status:** Code is fixed, just needs server restart ✅

---

**Please restart your backend server and try again!** 🚀
