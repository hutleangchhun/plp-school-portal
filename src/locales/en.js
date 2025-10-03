import { se } from "date-fns/locale";

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
  
  // Error handling
  networkError: 'Network Error',
  serverError: 'Server Error',
  connectionError: 'Connection Error',
  authenticationError: 'Authentication Error',
  networkErrorDesc: 'Please check your internet connection and try again.',
  serverErrorDesc: 'Server is temporarily unavailable. Please try again later.',
  generalErrorDesc: 'Something went wrong. Please try again.',
  authErrorDesc: 'Your session has expired. Please login again.',
  failedToParseUserData: 'Failed to parse user data',
  failedToFetchClasses: 'Failed to fetch classes',
  checkConnection: 'Please check your connection and try again.',
  
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
  village: 'Village',
  commune: 'Commune',
  district: 'District',
  province: 'Province',
  selectProvince: 'Select Province',
  selectDistrict: 'Select District', 
  selectCommune: 'Select Commune',
  selectVillage: 'Select Village',
  loadingProvinces: 'Loading provinces...',
  loadingDistricts: 'Loading districts...',
  loadingCommunes: 'Loading communes...',
  loadingVillages: 'Loading villages...',
  currentResidence: 'Current Residence',
  
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
  enterNewPassword: 'Enter new password',
  
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
  availableSeats: 'Available Seat',

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

  // Transfer student
  transferStudent: 'Transfer Student',
  selectTargetClass: 'Select the class to transfer the student to',
  currentClass: 'Current Class',
  targetClass: 'Target Class',
  transfer: 'Transfer',
  transferring: 'Transferring...',
  studentTransferredSuccess: 'Student transferred successfully',
  failedTransferStudent: 'Failed to transfer student',
  noStudentOrClassSelected: 'No student or target class selected',
  noClass: "Don't have class",
  updateStudent: 'Update Student',

  // Student filters
  classFilter: 'Class Status',
  allStudents: 'All Students',
  studentsWithoutClass: 'Without Class',
  selectClassFilter: 'Select Class',

  // Student assignment
  studentsAssignedSuccess: 'Students assigned successfully',
  errorAssigningStudents: 'Failed to assign students to class',
  classCapacityExceeded: 'Class capacity exceeded',
  removeSelected: 'Remove Selected',

  // Class Management
  addClass: 'Add Class',
  capacity: 'Capacity',
  class: 'Class',
  className: 'Class Name',
  classesManagement: 'Classes Management',
  editClass: 'Edit Class',
  grade: 'Grade Level',
  manageClassSchedules: 'Manage class',
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
  
  // Table and UI elements
  name: 'Name',
  noName: 'No Name',
  active: 'Active',
  inactive: 'Inactive',
  removeStudent: 'Remove Student',
  confirmRemoveStudent: 'Are you sure you want to remove',
  thisStudent: 'this student',
  fromYourClass: 'from your class? This action cannot be undone.',
  removing: 'Removing...',
  remove: 'Remove',
  studentRemovedSuccess: 'Student removed successfully',
  failedRemoveStudent: 'Failed to remove student',
  filterByGrade: 'Filter by grade',
  allGrades: 'All Grades',
  
  // Pagination
  showing: 'Showing',
  to: 'to',
  of: 'of',
  results: 'results',
  previous: 'Previous',
  next: 'Next',
  
  // Bulk operations
  studentsRemovedSuccess: 'Students removed successfully',
  failedRemoveStudents: 'Failed to remove students',
  removeStudents: 'Remove Students',
  confirmRemoveStudents: 'Are you sure you want to remove',
  studentsFromClass: 'students from your class? This action cannot be undone.',
  clearSelection: 'Clear Selection',
  removeSelected: 'Remove Selected',
  
  // Export functionality
  export: 'Export',
  exportSuccess: 'Data exported successfully',
  exportError: 'Failed to export data',
  studentManagementReport: 'Student Management Report',
  classField: 'Class',
  section: 'Section',
  academicYear: 'Academic Year',
  generated: 'Generated',
  totalStudents: 'Total Students',
  
  // Login page
  signInToAccount: 'Sign in to your account',
  enterUsername: 'Enter your username',
  enterPassword: 'Enter your password',
  signingIn: 'Signing in...',
  signIn: 'Sign in',
  
  // Student Selection
  studentSelection: 'Student Selection',
  selectStudentsForAction: 'Select students to add to class',
  backToStudents: 'Back to Students',
  assignToClass: 'Assign to Class',
  selectClass: 'Select Class',
  selectClassToAssign: 'Select a class to assign selected students to',
  selectClassFirst: 'Please select a class first',
  assignStudents: 'Assign Students',
  assigning: 'Assigning...',
  errorAssigningStudents: 'Error assigning students to class',
  selectedStudentsActions: 'Actions for selected students',
  resetFilters: 'Reset Filters',
  allDistricts: 'All Districts',
  allProvinces: 'All Provinces',
  selectAllStudents: 'Select all students',
  selectedAllStudents: 'Selected all students',
  selectingAllStudents: 'Selecting all students...',
  selectingAll: 'Selecting all...',
  allGenders: 'All Genders',
  selectAllOnPage: 'Select all students on this page',
  deselectAllOnPage: 'Deselect all students on this page',
  viewSelectedStudents: 'View Selected Students',

  
  // Class selection
  allClasses: 'All Classes',
  
  // General UI
  errorFetchingData: 'Error fetching data',
  noDataFound: 'No data found',
  errorPerformingAction: 'Error performing action',
  withSelected: 'With selected...',
  updateStatus: 'Update Status',
  
  // Additional missing translations
  selectAllClasses: 'Select All Classes',
  manageClasses: 'Manage Classes',
  viewClassDetails: 'View Class Details',
  classInformation: 'Class Information',
  gradeLevel: 'Grade Level',
  noStudentsFoundMatchingCriteria: 'No students found matching your criteria.',
  searchStudentsByNameOrEmail: 'Search students by name or email...',
  
  // Toast and action messages  
  studentAssignmentSuccess: 'Student assigned to class successfully',
  studentsAssignmentSuccess: 'Students assigned to class successfully',
  assignmentFailed: 'Failed to assign students',
  operationSuccessful: 'Operation successful',
  operationFailed: 'Operation failed',
  pleaseSelectClass: 'Please select a class first',
  pleaseSelectStudents: 'Please select students first',
  
  // Additional UI elements
  showingResults: 'Showing results',
  fromTotal: 'from total',
  noDataAvailable: 'No data available',
  loadingData: 'Loading data...',
  selectAction: 'Select action',
  performAction: 'Perform action',
  confirmAction: 'Confirm action',
  actionCompleted: 'Action completed',
  
  // Dashboard specific  
  loadingDashboard: 'Loading dashboard...',
  error: 'Error',
  retry: 'Retry',
  notAssigned: 'Not assigned',
  placeOfBirth: 'Place of Birth',
  residence: 'Residence',
  
  // Navigation items that might be missing  
  myGrades: 'My Grades',
  myAttendance: 'My Attendance',
  myAssignments: 'My Assignments',
  
  // Additional fallback text that might appear
  Dashboard: 'Dashboard',
  Students: 'Students', 
  Classes: 'Classes',
  'Loading dashboard...': 'Loading dashboard...',
  'Not assigned': 'Not assigned',
  Error: 'Error',
  Retry: 'Retry',
  Edit: 'Edit',
  Refresh: 'Refresh',
  
  // Stats cards
  'Total Classes': 'Total Classes',
  'Total Students': 'Total Students', 
  'Active Today': 'Active Today',
  'Average Load': 'Average Load',
  totalClasses: 'Total Classes',
  activeToday: 'Active Today',
  averageLoad: 'Average Load',
  
  // Common alt texts and titles
  Remove: 'Remove',
  'Profile Preview': 'Profile Preview',
  'MoEYS Logo': 'MoEYS Logo',
  'PLP Logo': 'PLP Logo',
  Profile: 'Profile',
  
  // Classes Management specific
  Teacher: 'Teacher',
  'Teacher:': 'Teacher:',
  Subject: 'Subject',
  Room: 'Room',
  enrollment: 'Enrollment',
  Enrollment: 'Enrollment',
  Capacity: 'Capacity',
  Schedule: 'Schedule',
  
  // Days of the week
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday',
  Sunday: 'Sunday',
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
  Sun: 'Sun',
  'Mon, Wed, Fri': 'Mon, Wed, Fri',
  'Tue, Thu': 'Tue, Thu',
  'Mon-Fri': 'Mon-Fri',
  
  // Grade levels
  'Grade': 'Grade',
  'Grade 1': 'Grade 1',
  'Grade 2': 'Grade 2',
  'Grade 3': 'Grade 3',
  'Grade 4': 'Grade 4',
  'Grade 5': 'Grade 5',
  'Grade 6': 'Grade 6',
  'Grade 7': 'Grade 7',
  'Grade 8': 'Grade 8',
  'Grade 9': 'Grade 9',
  'Grade 10': 'Grade 10',
  'Grade 11': 'Grade 11',
  'Grade 12': 'Grade 12',
  
  // Subject names (common ones)
  'Subject 1': 'Subject 1',
  'Subject 2': 'Subject 2',
  Mathematics: 'Mathematics',
  Science: 'Science',
  English: 'English',
  Khmer: 'Khmer',
  History: 'History',
  Geography: 'Geography',
  
  // Class sections
  'Section A': 'Section A',
  'Section B': 'Section B',
  'Section C': 'Section C',
  '(A)': '(A)',
  '(B)': '(B)',
  '(C)': '(C)',
  
  // Room numbers
  'Room 21': 'Room 21',
  'Room ': 'Room ',
  
  // Dashboard specific translations
  goodMorning: 'Good Morning',
  goodAfternoon: 'Good Afternoon', 
  goodEvening: 'Good Evening',
  lastUpdated: 'Last Updated',
  liveUpdates: 'Live Updates',
  liveMode: 'Live Mode',
  manualMode: 'Manual Mode',
  failedToLoadDashboard: 'Failed to load dashboard data',
  
  // Dashboard stats
  dashboardClasses: 'Classes',
  assignedStudents: 'Assigned Students',
  inYourClasses: 'In Your Classes',
  unassignedStudents: 'Unassigned Students', 
  awaitingAssignment: 'Awaiting Assignment',
  avgEnrollment: 'Avg Enrollment',
  studentsPerClass: 'Students Per Class',
  
  // User data validation
  noValidUserData: 'No valid user data received from API',
  
  // Dashboard quick actions and components
  quickActions: 'Quick Actions',
  dashboardAssignStudents: 'Assign Students',
  dashboardManageClasses: 'Manage Classes',
  manageStudents: 'Manage Students',
  updateProfile: 'Update Profile',
  classEnrollment: 'Class Enrollment',
  enrolled: 'Enrolled',
  classCapacity: 'Capacity',
  totalEnrolled: 'Total Enrolled',
  avgPerClass: 'Average Per Class',
  studentsCount: 'Students',
  
  // Export functionality
  exportToExcel: 'Export to Excel',
  exportToCSV: 'Export to CSV',
  exportToPDF: 'Export to PDF',
  chooseAnOption: 'Choose an option...',
  selectClassDropdown: 'Select class...',
  month: 'Month',
  year: 'Year',
  allClassesFilter: 'All Classes',
  
  // Grade levels for dropdown
  grade1: 'Grade 1',
  grade2: 'Grade 2',
  grade3: 'Grade 3',
  grade4: 'Grade 4',
  grade5: 'Grade 5',
  grade6: 'Grade 6',
  grade7: 'Grade 7',
  grade8: 'Grade 8',
  grade9: 'Grade 9',
  grade10: 'Grade 10',
  grade11: 'Grade 11',
  grade12: 'Grade 12',
  
  // Achievement categories
  academic: 'Academic',
  sports: 'Sports',
  arts: 'Arts',
  leadership: 'Leadership',
  adding: 'Adding...',
  
  // Accessibility and UI
  closeNotification: 'Close notification',
  closeWelcomeMessage: 'Close welcome message',
  pagination: 'Pagination',
  
  // Additional organization info
  organizationTeacherPortal: 'Teacher Portal',
  primaryEducationDepartment: 'Primary Education Department',
  moeysOfCambodia: 'Moeys of Cambodia',
  schoolInformation: 'School Information',
  
  // Form placeholders
  sectionPlaceholder: 'e.g., A, B, C',
  capacityPlaceholder: 'Maximum 200 students',
  
  // Loading states
  loadingText: 'Loading...',
  loadingClasses: 'Loading classes...',
  loadingStudents: 'Loading students...',
  loadingStudentSelection: 'Loading student selection...',
  loadingProfile: 'Loading profile...',
  loadingPage: 'Loading page...',
  
  // Additional student management messages
  noClassesAssigned: 'No classes assigned',
  noSchoolIdFound: 'No school ID found for your account',
  failedToFetchSchoolId: 'Failed to fetch school information',
  noStudentSelected: 'No student selected',
  cannotFindStudentClass: 'Cannot determine student class. The student may not be assigned to any class.',
  unauthorizedAction: 'You are not authorized to remove students from this class',
  studentRemovedFromClass: 'Student removed from class successfully',
  studentsMovedToMasterSuccess: '{count} students moved to master class successfully',
  someStudentsNotRemoved: 'Some students could not be removed. Check console for details.',
  studentsRemovedFromClass: '{count} students removed from class successfully',
  studentUpdatedSuccess: 'Student updated successfully',
  failedUpdateStudent: 'Failed to update student',
  unauthorizedClassAccess: 'You do not have permission to view students from this class',

  // Additional toast messages  
  achievementAddedSuccessfully: 'Achievement added successfully',
  loginFailed: 'Login failed. Please check your username and password.',
  loginSuccessful: 'Login successful!',
  settingsSavedSuccessfully: 'Settings saved successfully',
  studentsAssignedSuccessfully: '{count} students assigned to {className} successfully',
  studentsPromotedSuccessfully: 'Successfully promoted {count} students',
  errorFetchingReportData: 'Error fetching report data',
  reportExportedSuccessfully: '{reportName} exported successfully',
  errorExportingReport: 'Error exporting report',
  errorFetchingStudentData: 'Error fetching student data',
  attendanceSavedSuccessfully: 'Attendance saved successfully',
  errorSavingAttendance: 'Error saving attendance',

  // Additional navigation/action translations that may appear
  'Assign Students': 'Assign Students',
  'Manage Classes': 'Manage Classes',
  'Manage Students': 'Manage Students',
  'Update Profile': 'Update Profile',
  'Quick Actions': 'Quick Actions',
  'Class Enrollment': 'Class Enrollment',
  'Total Enrolled': 'Total Enrolled',
  'Average Per Class': 'Average Per Class',
  'Awaiting Assignment': 'Awaiting Assignment',

  // 404 page
  thePageYouAreLookingForDoesNotExist: 'The page you are looking for does not exist',
  goBackToDashboard: 'Go Back to Dashboard',
  pageNotFound: 'Page Not Found',
  oopsSomethingWentWrong: 'Oops! Something went wrong',
  tryAgainLater: 'Try again later',
  contactSupport: 'Contact Support',
};  