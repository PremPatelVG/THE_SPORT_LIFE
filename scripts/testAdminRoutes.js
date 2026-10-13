/**
 * Test Admin Routes
 * Run: node scripts/testAdminRoutes.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

const testRoutes = async () => {
  console.log('\n🧪 Testing Admin Routes...\n');
  console.log('API URL:', API_URL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Admin Login
  console.log('1️⃣  Testing Admin Login...');
  try {
    const loginResponse = await axios.post(`${API_URL}/admin/login`, {
      email: 'admin@sportlife.com',
      password: 'Admin@123'
    });
    
    if (loginResponse.data.success) {
      console.log('   ✅ Admin login successful');
      const token = loginResponse.data.data.token;
      
      // Test 2: Dashboard Stats
      console.log('\n2️⃣  Testing Dashboard Stats...');
      try {
        const statsResponse = await axios.get(`${API_URL}/admin/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Dashboard stats:', statsResponse.data.data);
      } catch (error) {
        console.log('   ❌ Dashboard stats failed:', error.response?.data?.error || error.message);
      }

      // Test 3: Matches
      console.log('\n3️⃣  Testing Matches Endpoint...');
      try {
        const matchesResponse = await axios.get(`${API_URL}/admin/matches`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Matches endpoint working');
        console.log('   📊 Total matches:', matchesResponse.data.data.length);
      } catch (error) {
        console.log('   ❌ Matches endpoint failed:', error.response?.data?.error || error.message);
      }

      // Test 4: Tournaments
      console.log('\n4️⃣  Testing Tournaments Endpoint...');
      try {
        const tournamentsResponse = await axios.get(`${API_URL}/admin/tournaments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Tournaments endpoint working');
        console.log('   📊 Total tournaments:', tournamentsResponse.data.data.length);
      } catch (error) {
        console.log('   ❌ Tournaments endpoint failed:', error.response?.data?.error || error.message);
      }

      // Test 5: Users
      console.log('\n5️⃣  Testing Users Endpoint...');
      try {
        const usersResponse = await axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Users endpoint working');
        console.log('   📊 Total users:', usersResponse.data.data.length);
      } catch (error) {
        console.log('   ❌ Users endpoint failed:', error.response?.data?.error || error.message);
      }

    } else {
      console.log('   ❌ Admin login failed');
    }
  } catch (error) {
    console.log('   ❌ Admin login failed:', error.response?.data?.error || error.message);
    console.log('\n⚠️  BACKEND SERVER MAY NOT BE RUNNING OR ADMIN ROUTES NOT LOADED');
    console.log('   Please restart the backend server:');
    console.log('   cd sportlife-backend && npm start');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

testRoutes();
