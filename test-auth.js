/**
 * Quick Authentication Module Test Script
 * Run this after starting the server to test basic auth functionality
 * 
 * Usage: node test-auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/auth';

// Test data
const testUser = {
  email: `test${Date.now()}@example.com`,
  phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  password: 'TestPass123',
  first_name: 'Test',
  last_name: 'User',
  gender: 'male',
  handedness: 'right',
  date_of_birth: '1995-05-15'
};

let accessToken = '';
let refreshToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}\n`)
};

// Test functions
async function testRegister() {
  try {
    log.section('TEST 1: User Registration');
    log.info(`Registering user: ${testUser.email}`);
    
    const response = await axios.post(`${BASE_URL}/register`, testUser);
    
    if (response.data.success) {
      log.success('Registration successful');
      log.info(`User ID: ${response.data.data.user.id}`);
      log.info(`Email: ${response.data.data.user.email}`);
      
      accessToken = response.data.data.tokens.accessToken;
      refreshToken = response.data.data.tokens.refreshToken;
      
      log.success('Access token received');
      log.success('Refresh token received');
      return true;
    }
  } catch (error) {
    log.error(`Registration failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testLogin() {
  try {
    log.section('TEST 2: User Login');
    log.info(`Logging in with: ${testUser.email}`);
    
    const response = await axios.post(`${BASE_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.data.success) {
      log.success('Login successful');
      log.info(`User: ${response.data.data.user.first_name} ${response.data.data.user.last_name}`);
      
      accessToken = response.data.data.tokens.accessToken;
      refreshToken = response.data.data.tokens.refreshToken;
      
      log.success('New tokens received');
      return true;
    }
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetProfile() {
  try {
    log.section('TEST 3: Get User Profile');
    log.info('Fetching user profile...');
    
    const response = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.data.success) {
      log.success('Profile retrieved successfully');
      const profile = response.data.data;
      log.info(`Name: ${profile.first_name} ${profile.last_name}`);
      log.info(`Email: ${profile.email}`);
      log.info(`Phone: ${profile.phone}`);
      log.info(`Role: ${profile.role}`);
      log.info(`Verified: ${profile.is_verified}`);
      return true;
    }
  } catch (error) {
    log.error(`Get profile failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testUpdateProfile() {
  try {
    log.section('TEST 4: Update User Profile');
    log.info('Updating profile...');
    
    const response = await axios.put(`${BASE_URL}/profile`, {
      first_name: 'Updated',
      last_name: 'Name'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.data.success) {
      log.success('Profile updated successfully');
      log.info(`New name: ${response.data.data.first_name} ${response.data.data.last_name}`);
      return true;
    }
  } catch (error) {
    log.error(`Update profile failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testRefreshToken() {
  try {
    log.section('TEST 5: Refresh Access Token');
    log.info('Refreshing access token...');
    
    const response = await axios.post(`${BASE_URL}/refresh-token`, {
      refreshToken: refreshToken
    });
    
    if (response.data.success) {
      log.success('Token refreshed successfully');
      accessToken = response.data.data.accessToken;
      log.success('New access token received');
      return true;
    }
  } catch (error) {
    log.error(`Refresh token failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetSessions() {
  try {
    log.section('TEST 6: Get Active Sessions');
    log.info('Fetching active sessions...');
    
    const response = await axios.get(`${BASE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.data.success) {
      log.success(`Found ${response.data.data.length} active session(s)`);
      response.data.data.forEach((session, index) => {
        log.info(`Session ${index + 1}:`);
        log.info(`  Device: ${session.device_info?.substring(0, 50)}...`);
        log.info(`  IP: ${session.ip_address}`);
        log.info(`  Created: ${new Date(session.created_at).toLocaleString()}`);
      });
      return true;
    }
  } catch (error) {
    log.error(`Get sessions failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testSendOTP() {
  try {
    log.section('TEST 7: Send OTP');
    const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    log.info(`Sending OTP to: ${phone}`);
    
    const response = await axios.post(`${BASE_URL}/send-otp`, { phone });
    
    if (response.data.success) {
      log.success('OTP sent successfully');
      log.info(`Expires in: ${response.data.data.expiresIn} seconds`);
      log.warn('Check console for OTP code (development mode)');
      return true;
    }
  } catch (error) {
    log.error(`Send OTP failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testForgotPassword() {
  try {
    log.section('TEST 8: Forgot Password');
    log.info(`Requesting password reset for: ${testUser.email}`);
    
    const response = await axios.post(`${BASE_URL}/forgot-password`, {
      email: testUser.email
    });
    
    if (response.data.success) {
      log.success('Password reset email sent');
      log.warn('Check console for reset link (development mode)');
      return true;
    }
  } catch (error) {
    log.error(`Forgot password failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testLogout() {
  try {
    log.section('TEST 9: Logout');
    log.info('Logging out...');
    
    const response = await axios.post(`${BASE_URL}/logout`, {
      refreshToken: refreshToken
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.data.success) {
      log.success('Logout successful');
      return true;
    }
  } catch (error) {
    log.error(`Logout failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testInvalidLogin() {
  try {
    log.section('TEST 10: Invalid Login (Should Fail)');
    log.info('Attempting login with wrong password...');
    
    await axios.post(`${BASE_URL}/login`, {
      email: testUser.email,
      password: 'WrongPassword123'
    });
    
    log.error('Test failed - should have rejected invalid credentials');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success('Correctly rejected invalid credentials');
      return true;
    }
    log.error(`Unexpected error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n');
  log.section('🚀 SPORTLIFE AUTHENTICATION MODULE TEST SUITE');
  log.info('Testing authentication endpoints...');
  log.warn('Make sure the server is running on http://localhost:3000');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Register', fn: testRegister },
    { name: 'Login', fn: testLogin },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Update Profile', fn: testUpdateProfile },
    { name: 'Refresh Token', fn: testRefreshToken },
    { name: 'Get Sessions', fn: testGetSessions },
    { name: 'Send OTP', fn: testSendOTP },
    { name: 'Forgot Password', fn: testForgotPassword },
    { name: 'Invalid Login', fn: testInvalidLogin },
    { name: 'Logout', fn: testLogout }
  ];

  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log.section('📊 TEST SUMMARY');
  log.info(`Total Tests: ${results.total}`);
  log.success(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    log.error(`Failed: ${results.failed}`);
  }
  
  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  log.info(`Success Rate: ${percentage}%`);
  
  if (results.failed === 0) {
    log.success('\n🎉 All tests passed! Authentication module is working correctly.\n');
  } else {
    log.warn('\n⚠️  Some tests failed. Check the errors above.\n');
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:3000');
    return true;
  } catch (error) {
    log.error('Server is not running on http://localhost:3000');
    log.info('Please start the server with: npm run dev');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
})();
