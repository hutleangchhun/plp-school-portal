/**
 * Manual Test Script for Multi-Role Dashboard
 *
 * Copy and paste this into your browser console to manually test the multi-role dashboard
 * without waiting for backend implementation
 *
 * Run this after logging in with any teacher user
 */

console.log('=== Multi-Role Dashboard Manual Test ===\n');

// Step 1: Get current user data
const userData = JSON.parse(localStorage.getItem('user'));
console.log('Current user:', userData.username);
console.log('Current role:', userData.roleEn, '(roleId:', userData.roleId + ')');

// Step 2: Check if already has multi-role data
if (userData.officerRoles && userData.officerRoles.length > 0) {
  console.warn('⚠️  User already has multi-role data!');
  console.log('officerRoles:', userData.officerRoles);
  console.log('No need to manually add it');
  console.log('\nRefresh the page - dashboard should already be visible');
  process.exit(0);
}

// Step 3: Add multi-role data
console.log('\n📝 Adding multi-role data to user...');

userData.roles = userData.roles || [userData.roleEn];
userData.officerRoles = ['PROVINCIAL_OFFICER'];
userData.provincialOfficer = {
  provincialOfficerId: 1,
  provinceId: 12
};
userData.districtOfficer = null;
userData.communeOfficer = null;

// Save updated user data
localStorage.setItem('user', JSON.stringify(userData));
console.log('✅ Multi-role data added!');

// Step 4: Verify changes
const verifyData = JSON.parse(localStorage.getItem('user'));
console.log('\n📊 Verification:');
console.log('  - roles:', verifyData.roles);
console.log('  - officerRoles:', verifyData.officerRoles);
console.log('  - provincialOfficer:', verifyData.provincialOfficer);

// Step 5: Check helper functions
console.log('\n🔍 Testing helper functions:');
try {
  const { userUtils } = require('./src/utils/api/services/userService');
  console.log('  - hasMultipleRoles:', userUtils.hasMultipleRoles(verifyData));
  console.log('  - isProvincialOfficer:', userUtils.isProvincialOfficer(verifyData));
  console.log('  - isTeacher:', verifyData.roleId === 8);
} catch (e) {
  console.log('  ⚠️  Could not import userUtils (this is normal in console)');
}

// Step 6: Instructions
console.log('\n📌 Next steps:');
console.log('1. Refresh the page (Ctrl+R or Cmd+R)');
console.log('2. Look for "Multi-Role Dashboard" section above "School Statistics"');
console.log('3. You should see three tabs:');
console.log('   - Overview: Teaching + Officer responsibilities');
console.log('   - Teacher Statistics: Classes and students');
console.log('   - Officer Statistics: School distribution for province');
console.log('\n✨ Manual test complete! Refresh the page now...\n');

// Step 7: Auto-refresh option
console.log('🔄 Refreshing page in 3 seconds...');
setTimeout(() => {
  window.location.reload();
}, 3000);
