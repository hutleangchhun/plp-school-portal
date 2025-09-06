// English translations
export const en = {
  // Common
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  update: 'Update',
  delete: 'Delete',
  edit: 'Edit',
  refresh: 'Refresh',
  
  // Navigation
  dashboard: 'Dashboard',
  teacherPortal: 'Teacher Portal',
  backToDashboard: 'Back to Dashboard',
  profile: 'Profile',
  logout: 'Logout',
  
  // Profile
  profileInformation: 'Profile Information',
  personalInformation: 'Personal Information',
  updateProfileTitle: 'Update Profile',
  accountInformation: 'Account Information',
  locationInformation: 'Location Information',
  
  // Form fields
  username: 'Username',
  usernameRequired: 'Username *',
  firstName: 'First Name',
  firstNameRequired: 'First Name *',
  lastName: 'Last Name',
  lastNameRequired: 'Last Name *',
  email: 'Email',
  emailRequired: 'Email *',
  phone: 'Phone Number',
  password: 'Password',
  newPassword: 'New Password (leave empty to keep current)',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  genderRequired: 'Gender *',
  male: 'Male',
  female: 'Female',
  nationality: 'Nationality',
  profilePicture: 'Profile Picture (filename)',
  teacherNumber: 'Teacher Number',
  teacherId: 'Teacher ID',
  
  // Location fields
  provinceId: 'Province ID',
  districtId: 'District ID',
  communeId: 'Commune ID',
  villageId: 'Village ID',
  
  // User info display
  fullName: 'Full name',
  role: 'Role',
  status: 'Status',
  classes: 'Classes',
  gradeLevels: 'Grade Levels',
  teacher: 'Teacher',
  
  // Validation messages
  usernameRequiredMsg: 'Username is required',
  firstNameRequiredMsg: 'First name is required',
  lastNameRequiredMsg: 'Last name is required',
  emailRequiredMsg: 'Email is required',
  validEmailRequired: 'Please enter a valid email address',
  passwordMinLength: 'New password must be at least 6 characters',
  validPhoneRequired: 'Please enter a valid phone number',
  
  // Messages
  profileUpdatedSuccess: 'Profile updated successfully!',
  updateFailed: 'Update failed',
  requestTimeout: 'Request timed out. Please try again.',
  loadingUserData: 'Loading user data...',
  updating: 'Updating...',
  
  // Dialogs
  confirmUpdate: 'Confirm Update',
  confirmUpdateMessage: 'Are you sure you want to update your profile information?',
  confirmLogout: 'Confirm Logout',
  confirmLogoutMessage: 'Are you sure you want to logout?',
  
  // Gender display
  genderMale: 'Male',
  genderFemale: 'Female',
  
  // Profile picture
  currentPicture: 'Current picture:',
  newPicturePreview: 'New picture preview:',
  choosePicture: 'Choose a new profile picture (JPG, PNG, etc.)',
  uploadingImage: 'Uploading image...',
  failedUploadPicture: 'Failed to upload profile picture',
  viewPicture: 'View Picture',
  uploadNewPicture: 'Upload New Picture',
  newPictureSelected: 'New picture selected',

  // Dashboard & Welcome
  assigned: 'Assigned',
  experience: 'Experience',
  professionalInformation: 'Professional Information',
  school: 'School',
  welcome: 'Welcome',
  years: 'Years',
  location: 'Location',

  // Student Management
  addStudent: 'Add Student',
  editStudent: 'Edit Student',
  errorFetchingStudents: 'Error fetching students',
  manageStudentRecords: 'Manage Student',
  promote: 'Promote',
  promoteStudents: 'Promote Students',
  promoteStudentsToNextGrade: 'Promote students to the next grade level',
  selectStudents: 'Please select students to promote',
  selectTargetGrade: 'Please select target grade',
  selected: 'selected',
  selectedStudents: 'Selected Students',
  student: 'Student',
  studentAchievements: 'Student Achievements',
  studentGradeManagement: 'Student Grade Management',
  studentId: 'Student ID',
  students: 'Students',
  studentsManagement: 'Students Management',
  studentsPromoted: 'Successfully promoted students',
  studentsSelected: 'students selected',
  studentsTo: 'student(s) to',
  studentsWillBePromoted: 'student(s) will be promoted to',
  targetGrade: 'Target Grade',
  updateStudent: 'Update Student',

  // Class Management
  addClass: 'Add Class',
  capacity: 'Capacity',
  class: 'Class',
  className: 'Class Name',
  classesManagement: 'Classes Management',
  editClass: 'Edit Class',
  grade: 'Grade',
  manageClassSchedules: 'Manage class schedules and assignments',
  room: 'Room',
  schedule: 'Schedule',
  selectSubject: 'Select Subject',
  selectTeacher: 'Select Teacher',
  subject: 'Subject',
  updateClass: 'Update Class',
  description: 'Description',

  // Attendance
  attendanceFor: 'Attendance for',
  attendanceReport: 'Attendance Report',
  attendanceTracking: 'Attendance Tracking',
  saveAttendance: 'Save Attendance',
  trackAchievements: 'Track student achievements and milestones',
  trackStudentAttendance: 'Track student attendance efficiently',
  attendance: 'Attendance',
  achievements: 'Achievements',

  // Reports & Analytics
  academicPerformance: 'Academic Performance',
  achievementsReport: 'Achievements Report',
  exportReport: 'Export Report',
  overviewReport: 'Overview Report',
  reportType: 'Report Type',
  reports: 'Reports',
  viewAnalytics: 'View comprehensive reports and analytics',

  // UI Components & Actions
  actions: 'Actions',
  addAchievement: 'Add Achievement',
  confirmDelete: 'Confirm Delete',
  confirmDeleteClass: 'Are you sure you want to delete this class?',
  confirmDeleteStudent: 'Are you sure you want to delete this student?',
  confirmPromotion: 'Confirm Student Promotion',
  confirmPromotionMessage: 'Are you sure you want to promote',
  saving: 'Saving...',
  search: 'Search',
  searchStudents: 'Search students...',
  selectAll: 'Select All',
  selectGrade: 'Select Grade',

  // Navigation & Pages
  comingSoon: 'Coming Soon',
  manageSettings: 'Manage system settings and preferences',
  navigation: 'Navigation',
  pageUnderDevelopment: 'This page is under development',
  returnToDashboard: 'Return to Dashboard',
  settings: 'Settings',
  stayTuned: 'Stay tuned for updates!',

  // Error Messages
  errorFetchingGrades: 'Error fetching grades',
  errorPromotingStudents: 'Error promoting students',

  // Time & Date
  date: 'Date',
  thisMonth: 'This Month',
  thisQuarter: 'This Quarter',
  thisWeek: 'This Week',
  thisYear: 'This Year',
  timePeriod: 'Time Period',

  // Other
  address: 'Address',
  contact: 'Contact',
  
  // StudentsManagement component
  failedLoadAvailableStudents: 'Failed to load available students',
  studentsAddedSuccess: 'Students added successfully',
  failedAddStudents: 'Failed to add students',
  searchStudentsByNameEmail: 'Search students by name or email...',
  noStudentsMatchSearch: 'No students match your search criteria.',
  noStudentsAvailableAdd: 'There are no students available to add.',
  noStudentsFound: 'No students found',
  addStudentsToClass: 'Add Students to Class',
  
  // Login page
  signInToAccount: 'Sign in to your account',
  enterUsername: 'Enter your username',
  enterPassword: 'Enter your password',
  signingIn: 'Signing in...',
  signIn: 'Sign in',
};  