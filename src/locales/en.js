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
  loadingTeachers: 'Loading Teachers',
  people: 'People',

  //chart
  classStudentCounts: 'Class Student Counts',
  schoolPopulationDistribution: 'School Population Distribution',
  ethnicGroupsDistribution: 'Ethnic Groups Distribution',
  accessibilityDistribution: 'Accessibility Distribution',
  studentEthnicGroupDistribution: 'Student Ethnic Group Distribution',
  studentAccessibilityDistribution: 'Student Accessibility Distribution',
  topEthnicGroups: 'Top Ethnic Groups',
  loadingChartData: 'Loading Chart Data...',


  
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
  schoolPortal: 'School Portal',
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
  selectEmploymentType: 'Select Employment Type',
  employmentType: 'Employment Type',
  framework: 'Framework/Permanent',
  contract: 'Contract',
  agreement: 'Agreement',
  selectGradeLevel: 'Select Grade Level',
  teacherInformation: 'Teacher Information',
  updateYourPersionalDetails: 'Update your personal details and preferences',
  
  // Location fields
  provinceId: 'Province ID',
  districtId: 'District ID',
  communeId: 'Commune ID',
  villageId: 'Village ID',
  
  // User info display
  fullName: 'Full name',
  role: 'Role',
  rolesFor: 'For',
  status: 'Status',
  classes: 'Classes',
  gradeLevels: 'Grade Levels',
  teacher: 'Teacher',
  noTeacher: 'No Teacher',
  director: 'Director',
  
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
  generatedAt: 'Generated At',
  view: 'View',

  // Dashboard & Welcome
  assigned: 'Assigned',
  experience: 'Experience',
  professionalInformation: 'Professional Information',
  school: 'School',
  welcome: 'Welcome',
  years: 'Years',
  location: 'Location',
  availableSeats: 'Available Seat',
  totalTeachers: 'Total Teachers',
  studentBMIDistribution: 'Student BMI Distribution',
  bmiCategoryBreakdown: 'BMI Category Breakdown',
  systemOverview: 'System Overview',
  systemOverviewDesc: 'Overview of the entire school system',


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
  deselectAll: 'Deselect All',
  readyToTransfer: 'Ready To Transfter',
  manageSelectedStudents: 'Manage Selected Students',
  scrollToSeeMoreStudents: 'Scroll To See More Students',


  // Teacher Management
  addTeacher: 'Add Teacher',
  editTeacher: 'Edit Teacher',
  manageTeachers: 'Manage Teachers',
  teacherDetails: 'Teacher Details',
  teacherIdRequired: 'Teacher ID is required',
  errorFetchingTeachers: 'Error fetching teachers',
  teachersManagement: 'Teachers Management',
  teachers: 'Teachers',
  manageTeacherRecords: 'Manage teacher records for your school',
  createTeacher: 'Create Teacher',

  // Parent Management
  parents: 'Parents',
  parentsManagement: 'Parents Management',
  addParent: 'Add Parent',
  editParent: 'Edit Parent',
  parentDetails: 'Parent Details',
  manageParentsDescription: 'Manage parent information and contacts',
  loadingParents: 'Loading parents...',
  failedToLoadParents: 'Failed to load parents',
  noParentsFound: 'No parents found',
  noParentsMatchSearch: 'No parents match your search criteria',
  getStartedAddParent: 'Get started by adding a new parent',
  addFirstParent: 'Add First Parent',
  searchParents: 'Search parents by name, email, or phone...',
  parentCreatedSuccess: 'Parent created successfully',
  parentUpdatedSuccess: 'Parent updated successfully',
  parentDeletedSuccess: 'Parent deleted successfully',
  failedToCreateParent: 'Failed to create parent',
  failedToUpdateParent: 'Failed to update parent',
  failedToDeleteParent: 'Failed to delete parent',
  failedToSaveParent: 'Failed to save parent',
  confirmDeleteParent: 'Delete Parent',
  confirmDeleteParentMessage: 'Are you sure you want to delete this parent? This action cannot be undone.',
  creatingParent: 'Creating parent...',
  updatingParent: 'Updating parent...',
  deletingParent: 'Deleting parent...',
  relationship: 'Relationship',
  father: 'Father',
  mother: 'Mother',
  guardian: 'Guardian',
  occupation: 'Occupation',
  emergencyContact: 'Emergency Contact',
  enterFirstName: 'Enter first name',
  enterLastName: 'Enter last name',
  enterFullName: 'Enter full name',
  fullNameHelp: 'Leave empty to auto-generate from first and last name',
  enterEmail: 'Enter email address',
  enterPhone: 'Enter phone number',
  enterEmergencyContact: 'Enter emergency contact number',
  enterOccupation: 'Enter occupation',
  enterAddress: 'Enter address',
  enterNotes: 'Enter any additional notes',
  phoneRequired: 'Phone number is required',
  contactInformation: 'Contact Information',
  additionalInformation: 'Additional Information',
  unnamed: 'Unnamed',

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
  filterByStudent: 'Filter by Student',
  studentsWithoutClass: 'Without Class',
  selectClassFilter: 'Select Class',

  // Student assignment
  studentsAssignedSuccess: 'Students assigned successfully',
  errorAssigningStudents: 'Failed to assign students to class',
  classCapacityExceeded: 'Class capacity exceeded',
  removeSelected: 'Remove Selected',
  unselectAll: 'Unselect All',
  unselectedAllStudents: 'Unselected all students',

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
  sdGrade: 'SD Grade',
  weight: 'Weight',
  height: 'Height',
  bmi: 'BMI',
  age: 'Age',
  bmiStatus: 'BMI Status',
  ageInYears: 'Age in Years',
  ageInYearsAndMonths: 'Age in Years and Months',
  ageInMonths: 'Age in Months',
  recordDate: 'Record Date',


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
  suggestion: 'Suggestion',
  
  
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
  totalSchool: 'Total Schools',
  
  // Login page
  signInToAccount: 'Sign in to your account',
  enterUsername: 'Enter your username',
  enterPassword: 'Enter your password',
  signingIn: 'Signing in...',
  signIn: 'Sign in',
  usernameAndPhonenumber: 'Username or Phone Number',
  
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
  assignStudentsToParent: 'Assign Students to Parent',
  selectStudentsFor: 'Select students for',
  alreadyAssigned: 'Already assigned',
  selectedStudentsActions: 'Actions for selected students',
  resetFilters: 'Reset Filters',
  allDistricts: 'All Districts',
  allProvinces: 'All Provinces',
  selectAllStudents: 'Select all students',
  selectedAllStudents: 'Selected all students',
  deselectedAllStudents: 'All students deselected',
  selectingAllStudents: 'Selecting all students...',
  selectingAll: 'Selecting all...',
  selectedAllTeachers: 'Selected all teachers',
  deselectedAllTeachers: 'All teachers deselected',
  errorSelectingAllTeachers: 'Failed to select all teachers',
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
  noClassesAvailable: 'No Classes Available',
  selectedGradeLevelNoClasses: 'The selected grade level has no classes available.',
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
  searchTeachers: 'Search teachers...',
  hireDate: 'Hire Date',
  updateTeacher: 'Update Teacher',
  
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
  sortByMetric: 'Sort by metric',
  sortOrder: 'Sort order',
  ascending: 'Sort ascending',
  descending: 'Sort descending',
  schoolFilters: 'School filters',
  schoolFiltersDesc: 'Filter and sort schools for the chart',
  
  
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
  grade0: 'Kindergarten',
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
  organizationSchoolPortal: 'School Portal',
  primaryEducationDepartment: 'Primary Education Department',
  moeysOfCambodia: 'Moeys of Cambodia',
  schoolInformation: 'School Information',
  schoolId: 'School ID',
  enterSchoolId: 'Enter school ID',
  schoolProvince: 'School Province',
  schoolDistrict: 'School District',
  academicInformation: 'Academic Information',
  academicYear: 'Academic Year',
  enterAcademicYear: 'e.g., 2024',
  studentNumber: 'Student Number',
  enterStudentNumber: 'Enter student number',
  gradeLevel: 'Grade Level',
  enterGradeLevel: 'e.g., 1, 2, 3...',
  isKindergarten: 'Is Kindergarten',
  yes: 'Yes',
  no: 'No',
  
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
  teacherUpdatedSuccess: 'Teacher updated successfully',
  failedUpdateTeacher: 'Failed to update teacher',

  // Additional toast messages  
  achievementAddedSuccessfully: 'Achievement added successfully',
  loginFailed: 'Login failed. Please check your username and password.',
  loginSuccessful: 'Login successful!',
  unauthorizedAccess: 'Only authorized users can access this portal. Please contact your administrator.',
  selectAccount: 'Select Account',
  pleaseSelectAccount: 'Please select an account',
  multipleAccountsMessage: 'Multiple accounts found. Please select one to continue.',
  accountSelectionFailed: 'Failed to select account',
  studentNumber: 'Student Number',
  continue: 'Continue',
  settingsSavedSuccessfully: 'Settings saved successfully',
  studentsAssignedSuccessfully: '{count} students assigned to {className} successfully',
  studentsPromotedSuccessfully: 'Successfully promoted {count} students',
  errorFetchingReportData: 'Error fetching report data',
  reportExportedSuccessfully: '{reportName} exported successfully',
  errorExportingReport: 'Error exporting report',
  errorFetchingStudentData: 'Error fetching student data',
  attendanceSavedSuccessfully: 'Attendance saved successfully',
  errorSavingAttendance: 'Error saving attendance',
  cannotMarkFutureAttendance: 'Cannot mark future attendance',
  deleteUser: 'Delete User',
  confirmDeleteUser: 'Are you sure you want to delete this user? This action cannot be undone.',
  userDeletedSuccessfully: 'User has been deleted successfully',
  deleteUserFailed: 'Failed to delete user',

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

  // Export utilities
  notAvailable: 'N/A',
  role1User: 'Role 1 User',
  userID: 'User ID',
  accountStatus: 'Account Status',
  joinDate: 'Join Date',
  lastLogin: 'Last Login',
  active: 'Active',
  settings: 'Settings',
  sortBy: 'Sort by',
  sort: 'Sort',
  ascending: 'Ascending',
  descending: 'Descending',
  selectSortOrder: 'Select Sort Order',
  permission1: 'View dashboard analytics',
  permission2: 'Access specific reports',
  permission3: 'Update personal profile',
  permission4: 'View attendance',
  systemOverview: 'System Overview',
  systemOverviewDesc: 'Overview of the entire school system',
  adminUser: 'Admin User',
  totalSchools: 'Total Schools',
  schoolDistribution: 'School Distribution',
  schoolDistributionDesc: 'Distribution of schools by various metrics',
  adminDashboard: 'Admin Dashboard',
  allProvinces: 'All Provinces',
  selectProvince: 'Select Province',
  allDistricts: 'All Districts',
  selectDistrict: 'Select District',

 //report
   totalRecords: 'Total Records',
   totalStudents: 'Total Students',
  unknownEthnicGroup: 'Khmer', // Unknown ethnic group defaults to Khmer (majority)
  count: 'Count',
  students: 'Students',
  studentList: 'Student List',


  //school setting
  projectType: 'Project Type',
  selectProjectType: 'Select Project Type',
  schoolType: 'School Type',
  selectSchoolType: 'Select School Type',
  selectSchool: 'Select School',
  'ស្វែងរកគណនីសម្រាប់គ្រូ': 'Search Teacher Account',
  browseTeachers: 'Browse All Teachers',
  selectTeacherDescription: 'Choose a teacher from the list below. All teachers in your school are shown.',
  noTeachersFound: 'No teachers found',
  schoolSettings: 'School Settings',
  updateSchoolInformation: 'Update School Information',
  schoolName: 'School Name',
  enterSchoolName: 'Enter school name',
  schoolCode: 'School Code',
  enterSchoolCode: 'Enter school code',
  schoolNameRequired: 'School name is required',
  schoolCodeRequired: 'School code is required',
  schoolDataUpdated: 'School data updated successfully!',
  errorUpdatingSchool: 'Failed to update school',
  errorFetchingSchoolData: 'Failed to fetch school data',
  schoolProfile: 'School Profile Image',
  back: 'Back',
  saving: 'Saving...',
  village: 'Village',
  selectVillage: 'Select Village',
  clickToChange: 'Click to change image',
  imageLoadFailed: 'Image failed to load',
  clickToTryAgain: 'Click to retry',
  errorReadingImage: 'Error reading image file',
  basicInformation: 'Basic Information',
  mapPickerHint: 'Click on the map to update the school location and fill in the latitude and longitude',
  mapPicker: 'Click on the map to update the school location',

  // QR Code Generator
  studentQRCode: 'Student QR Codes',
  studentQRCodeGenerator: 'Student QR Code Generator',
  generateQRCodesForStudents: 'Generate and download QR codes for students by grade level and class',
  selectGradeLevel: 'Grade Level',
  chooseGradeLevel: 'Choose grade level...',
  allGradeLevels: 'All Grade Levels',
  selectClass: 'Class',
  allClasses: 'All Classes',
  generateQRCodes: 'Generate QR Codes',
  generatingQRCodes: 'Generating QR codes...',
  generatingProgress: 'Generating QR codes...',
  downloadAll: 'Download All',
  downloadQRCodes: 'Download QR Codes',
  selectDownloadOption: 'Select how you want to download the QR codes',
  downloadCurrent: 'Download Current Page',
  downloadCurrentDesc: 'One by one from current page only',
  downloadAllQueued: 'Download All (Queued)',
  downloadAllQueuedDesc: 'One by one for all items',
  downloadAllPDF: 'Download as PDF',
  downloadAllPDFDesc: '3 QR codes per row in one PDF',
  downloadedQRCodes: 'Downloaded {count} QR codes',
  failedQRCodes: 'Failed to download {count} QR codes',
  batchDownloadError: 'Error downloading QR codes',
  pdfDownloadSuccess: 'PDF downloaded with {count} QR codes',
  pdfDownloadError: 'Error downloading PDF',
  downloadError: 'Error downloading QR code',
  gridView: 'Grid View',
  listView: 'List View',
  generatedQRCodes: 'Generated QR Codes',
  download: 'Download',
  noStudentsSelected: 'No students found for the selected class',
  noQRCodesToDownload: 'No QR codes to download',
  qrCodesGenerated: 'QR codes generated successfully for {count} students',
  failedToGenerateQRCodes: 'Failed to generate QR codes',
  capturingCard: 'Capturing card...',
  downloaded: 'Downloaded',
  failedToDownloadCard: 'Failed to download card',
  downloadingAllCards: 'Creating combined QR code image...',
  allCardsDownloaded: 'Successfully downloaded all {count} QR codes as a single image.',
  failedToDownloadAllCards: 'Failed to download all QR codes',
  selectClassToGenerate: 'Please select a specific class to generate QR codes',
  loadingStudents: 'Loading students...',
  failedToLoadStudents: 'Failed to load students',
  failedToLoadClasses: 'Failed to load classes',
  name: 'Name',
  username: 'Username',
  studentNumber: 'Student Number',
  email: 'Email',
  actions: 'Actions',

  // QR Code Admin Management
  fetchingUsers: 'Fetching users...',
  loadingQRCodeManagement: 'Loading QR Code Management...',
  accessDenied: 'Access denied. This page is only for directors.',
  goBack: 'Go Back',
  qrCodeManagementAdmin: 'QR Code Management - Admin',
  manageQRCodesAllUsers: 'Manage QR codes for all teachers and students',
  totalUsers: 'Total Users',
  successful: 'Successful',
  failed: 'Failed',
  successRate: 'Success Rate',
  search: 'Search',
  allRoles: 'All Roles',
  teachers: 'Teachers',
  directors: 'Directors',
  students: 'Students',
  qrSize: 'QR Size',
  generating: 'Generating...',
  generateAll: 'Generate All',
  exportJSON: 'Export JSON',
  exportCSV: 'Export CSV',
  hide: 'Hide',
  show: 'Show',
  showing: 'Showing',
  of: 'of',
  users: 'users',
  selected: 'Selected',
  success: 'Success',
  error: 'Error',
  noUsersFound: 'No users found',
  fullName: 'Full Name',
  role: 'Role',
  qrCode: 'QR Code',
  status: 'Status',
  director: 'Director',
  teacher: 'Teacher',
  student: 'Student',
  duration: 'Duration',
  score: 'Score',
  details: 'Details',
  examType: 'Exam Type',
  examTitle: 'Exam Title',
  filter: 'Filter',
  filters: 'Filters',
  QRCodeManangement: 'QR Code Management',
  // exam record
  examRecords: 'Exam Records',
  studentName: 'Student Name',
  khmer: 'Khmer',
  math: 'Math',
  science: 'Science',
  ethics: 'Ethics-Civic Studies',
  sport: 'Sport',
  health: 'Health - Hygiene',
  life_skills: 'Life Skills Education',
  foreign_lang: 'Foreign Languages',
  totalScore: 'Total Score',
  average: 'Average',
  grading: 'Grade',

  // QR Code Card - Translations
  studentIdentification: 'Student Identification',
  teacherIdentification: 'Teacher Identification',
  idNumber: 'ID Number',
  generatedOn: 'Generated on',

  // BMI Dashboard & Analysis
  bmiAnalysis: 'BMI Data Analysis',
  bmiReportDescription: 'Analyze and manage BMI data for all users',
  bmiDistribution: 'BMI Distribution',
  bmiDistributionDesc: 'View BMI distribution across all students',
  filterBmiData: 'Filter BMI data',
  severeThinness: 'Severe Thinness',
  thinness: 'Thinness',
  normal: 'Normal',
  overweight: 'Overweight',
  obesity: 'Obesity',
  filteringBy: 'Filtering by',

  // BMI Summary Cards
  totalStudentsMeasured: 'Total Students Measured',
  healthyWeight: 'Healthy Weight',
  atRiskStudents: 'At Risk Students',
  obesityRate: 'Obesity Rate',
  ofTotal: 'of total',
  comparedTo: 'Compared to',

  // Growth Rate
  yearOverYearChange: 'Year-over-Year Change',

  // Detailed Table
  detailedBMIRecords: 'Detailed BMI Records',
  showingRecords: 'Showing',
  records: 'records',
  userName: 'User Name',
  recordedAt: 'Recorded At',
  noRecordsFound: 'No records found',
  page: 'Page',

  // Additional BMI-related
  all: 'All',
  selectYear: 'Select year',
  selectSchool: 'Select school',
  searchSchool: 'Search school...',
  noSchoolsFound: 'No schools found',

  // Additional missing translations (from km.js)
  // Months
  Apr: 'Apr',
  April: 'April',
  Aug: 'Aug',
  August: 'August',
  Dec: 'Dec',
  December: 'December',
  Feb: 'Feb',
  February: 'February',
  Jan: 'Jan',
  January: 'January',
  Jul: 'Jul',
  July: 'July',
  Jun: 'Jun',
  June: 'June',
  Mar: 'Mar',
  March: 'March',
  May: 'May',
  Nov: 'Nov',
  November: 'November',
  Oct: 'Oct',
  October: 'October',
  Sep: 'Sep',
  September: 'September',
  april: 'April',
  august: 'August',
  december: 'December',
  february: 'February',
  january: 'January',
  july: 'July',
  june: 'June',
  march: 'March',
  may: 'May',
  november: 'November',
  october: 'October',
  september: 'September',

  // Attendance
  absent: 'Absent',
  present: 'Present',
  late: 'Late',
  leave: 'Leave',
  weeklyAttendance: 'Weekly Attendance',
  attendanceAlreadyMarked: 'Attendance Already Marked',
  attendanceApprovals: 'Attendance Approvals',
  attendanceApproved: 'Attendance Approved',
  attendanceMarked: 'Attendance Marked',
  attendanceMarkedSuccess: 'Attendance Marked Successfully',
  attendanceRate: 'Attendance Rate',
  attendanceRejected: 'Attendance Rejected',
  attendanceSavedSuccess: 'Attendance Saved Successfully',
  attendanceStatus: 'Attendance Status',
  loadingAttendance: 'Loading Attendance...',
  markAllPresent: 'Mark All Present',
  markAttendance: 'Mark Attendance',
  markStudentAttendance: 'Mark Student Attendance',
  markTodayAttendance: 'Mark Today Attendance',
  markedAllPresent: 'Marked All Present',
  markingAgainWillUpdate: 'Marking Again Will Update',
  canOnlyMarkCurrentMonth: 'Can Only Mark Current Month',
  canOnlyMarkTodayAttendance: 'Can Only Mark Today Attendance',
  cannotEditPastAttendance: 'Cannot Edit Past Attendance',
  cannotMarkPastOrFuture: 'Cannot Mark Past Or Future',
  clickToMarkAttendance: 'Click To Mark Attendance',
  failedSaveAttendance: 'Failed to Save Attendance',
  failedToMarkAttendance: 'Failed To Mark Attendance',
  errorFetchingAttendance: 'Error Fetching Attendance',
  errorApprovingAttendance: 'Error Approving Attendance',
  errorRejectingAttendance: 'Error Rejecting Attendance',
  noAttendanceData: 'No Attendance Data',
  noAttendanceDataMessage: 'No Attendance Data Message',
  allAttendanceApproved: 'All Attendance Approved',
  noPendingApprovals: 'No Pending Approvals',
  reviewPendingApprovals: 'Review Pending Approvals',
  selectAttendanceFirst: 'Select Attendance First',
  selectClassToViewAttendance: 'Select Class To View Attendance',
  submittingAttendance: 'Submitting Attendance...',
  todayAttendanceOverview: 'Today Attendance Overview',
  viewingPastAttendance: 'Viewing Past Attendance',
  studentAttendance: 'Student Attendance',
  teacherAttendance: 'Teacher Attendance',
  teacherAttendanceTracking: 'Teacher Attendance Tracking',
  trackTeacherAttendance: 'Track Teacher Attendance',
  trackYourAttendance: 'Track Your Attendance',
  avgAbsences: 'Average Absences',
  highAbsences: 'High Absences',
  noAbsences: 'No Absences',
  noLeaves: 'No Leaves',
  totalAbsences: 'Total Absences',
  totalLeaves: 'Total Leaves',
  studentWithMostAbsences: 'Student With Most Absences',
  studentWithMostLeaves: 'Student With Most Leaves',
  topAbsentStudents: 'Top Absent Students',

  // Access & Permissions
  accessDeniedTeacherOnly: 'Access Denied - Teacher Only',
  accessibility: 'Accessibility',
  permissionDenied: 'Permission Denied',
  authenticationRequired: 'Authentication Required',

  // Account & User
  account: 'Account',
  userDetails: 'User Details',
  yourAccountDetails: 'Your Account Details',
  userDataUpdated: 'User Data Updated',
  failedToFetchAccountInfo: 'Failed To Fetch Account Info',
  failedToFetchUserData: 'Failed To Fetch User Data',
  failedToLoadUserData: 'Failed To Load User Data',

  // Actions & Operations
  apply: 'Apply',
  approve: 'Approve',
  reject: 'Reject',
  close: 'Close',
  done: 'Done',
  skipped: 'Skipped',
  submitted: 'Submitted',
  completed: 'Completed',
  completedAt: 'Completed At',
  created: 'Created',
  dateCreated: 'Date Created',
  startedAt: 'Started At',
  pending: 'Pending',
  inProgress: 'In Progress',
  cannotChange: 'Cannot Change',

  // Achievements & Placeholders
  achievementsPlaceholder: 'Enter student achievements...',
  enterNotesAchievements: 'Enter notes or achievements...',

  // Appointments
  appointed: 'Appointed',
  appointmentStatus: 'Appointment Status',

  // Approvals
  approveSelected: 'Approve Selected',
  bulkApproveSuccess: 'Bulk Approve Success',
  errorBulkApproving: 'Error Bulk Approving',
  approvalRequiredDisabled: 'Approval Required Disabled',
  approvalRequiredEnabled: 'Approval Required Enabled',
  requiresApproval: 'Requires Approval',
  requiresApprovalTooltip: 'Enable if teacher attendance requires director approval',

  // At
  at: 'At',

  // BMI Information
  bmiCategory: 'BMI Category',
  bmiInformation: 'BMI Information',
  bmiValue: 'BMI Value',
  healthAndBmiInformation: 'Health And BMI Information',
  healthInformation: 'Health Information',
  healthRecommendations: 'Health Recommendations',

  // Books
  bookSelected: 'Book Selected',
  booksSelected: 'Books Selected',
  chooseBooks: 'Choose Books',
  noBooksAvailable: 'No Books Available',
  noBooksSelected: 'No Books Selected',
  selectBooks: 'Select Books',
  selectedBooks: 'Selected Books',
  teacherBooks: 'Teacher Books',
  category: 'Category',
  allCategories: 'All Categories',
  filterByCategory: 'Filter By Category',
  statusBooK: 'Book Status',

  // Bulk Operations
  bulkStudentImport: 'Bulk Student Import',
  bulkUpdateSuccess: 'Bulk Update Successfully',
  errorBulkUpdating: 'Error Bulk Updating',

  // Burden
  burden: 'Burden',

  // Time Periods
  byMonth: 'By Month',
  bySemester1: 'By Semester 1',
  bySemester2: 'By Semester 2',
  byYear: 'By Year',
  currentWeek: 'Current Week',
  days: 'Days',
  today: 'Today',

  // Certificates
  certificate: 'Certificate',
  certificateScore: 'Certificate Score',
  downloadCertificate: 'Download Certificate',

  // Children & Family
  childName: 'Child Name',
  childStatus: 'Child Status',
  childrenInformation: 'Children Information',
  numberOfChildren: 'Number Of Children',
  familyInformation: 'Family Information',
  bothParents: 'Both Parents',
  oneParent: 'One Parent',
  noParents: 'No Parents',
  parentStatus: 'Parent Status',

  // Class Operations
  chooseClass: 'Choose Class',
  chooseYear: 'Choose Year',
  classAddedSuccessfully: 'Class Added Successfully',
  classDeletedSuccessfully: 'Class Deleted Successfully',
  classUpdatedSuccessfully: 'Class Updated Successfully',
  deleteClass: 'Delete Class',
  enterClassName: 'Enter Class Name',
  errorDeletingClass: 'Error Deleting Class',
  errorSavingClass: 'Error Saving Class',
  errorUpdatingClass: 'Error Updating Class',
  errorFetchingClassDetails: 'Error Fetching Class Details',
  mostEnrolledClass: 'Most Enrolled Class',
  noClassSelected: 'No Class Selected',
  noClasses: 'No Classes',
  noClassesAssignedMessage: 'No Classes Assigned - Contact Admin',
  noClassesDescription: 'Create classes for your school',
  noClassesForGrade: 'No Classes For Grade',
  noClassesFound: 'No Classes Found',
  noClassesMatchFilter: 'No Classes Match Filter',
  noClassesYet: 'No Classes Yet',
  searchClasses: 'Search Classes',
  selectClassFirstDesc: 'Select Class First',
  selectClassForReport4: 'Select Class For Report 4',
  selectClassRequired: 'Select Class Required',
  filterByClass: 'Filter By Class',
  pleaseSelectClassAbove: 'Please Select Class Above',
  myClasses: 'My Classes',
  yourClassesInSchool: 'Your Classes In School',

  // Clear & Reset
  clearFilters: 'Clear Filters',
  clearSearch: 'Clear Search',

  // Click Actions
  clickToUpload: 'Click To Upload',

  // Completeness
  complete: 'Complete',
  completeProfiles: 'Complete Profiles',
  completionPercentage: 'Completion Percentage',
  completionRate: 'Completion Rate',
  incomplete: 'Incomplete',
  incompleteInformation: 'Incomplete Information',
  incompleteOnly: 'Incomplete Only',
  incompleteProfiles: 'Incomplete Profiles',
  dataCompleteness: 'Data Completeness',
  dataCompletenessDesc: 'Track user profile completion status',
  dataCompletenessFilters: 'Data Completeness Filters',
  dataCompletenessFiltersDesc: 'Filter users by role, school, and completion',
  fieldCompleteness: 'Field Completeness',
  fieldCompletenessDesc: 'Track completion rate for each profile field',
  fieldCompletenessFilters: 'Field Completeness Filters',
  fieldCompletenessFiltersDesc: 'Filter fields by role and school',
  fieldName: 'Field Name',
  fields: 'Fields',
  fillRate: 'Fill Rate',
  filled: 'Filled',
  missing: 'Missing',
  missingFields: 'Missing Fields',
  allComplete: 'All Complete',

  // Comments & Notes
  enterComments: 'Enter Comments...',
  note: 'Note',
  notes: 'Notes',
  reason: 'Reason',
  reasonRequired: 'Reason Required',
  enterReason: 'Enter Reason...',

  // Confirm Actions
  confirmDeleteParents: 'Confirm Delete Parents',
  confirmDeleteParentsMessage: 'Are you sure you want to delete {{count}} parents? This action cannot be undone.',
  confirmDeleteTeacher: 'Confirm Delete Teacher',
  confirmMoveStudentToMaster: 'Confirm Move Student To Master',
  confirmMoveStudentsToMaster: 'Confirm Move Students To Master',
  confirmNewPassword: 'Confirm New Password',
  confirmPassword: 'Confirm Password',
  confirmRemoveStudentsMessage: 'Confirm Remove Students Message',
  thisActionCannotBeUndone: 'This Action Cannot Be Undone',

  // Contact
  contactAdminToAssignClasses: 'Contact Admin To Assign Classes',

  // Copy
  copyUsername: 'Copy Username',
  usernameCopied: 'Username Copied',

  // Correct/Incorrect
  correct: 'Correct',
  incorrect: 'Incorrect',

  // Current
  currentStudent: 'Current Student',

  // Dashboard
  dashboardGreeting: 'Welcome to School Management System',
  welcomeToDashboard: 'Welcome To Dashboard',

  // Delete Operations
  deleteParents: 'Delete Parents',
  deleteParentsDescription: 'This will permanently delete {{count}} parents. This action cannot be undone.',
  deleteParentsWarning: 'Delete Parents Warning',
  deleteSelected: 'Delete Selected',
  deleteTeacher: 'Delete Teacher',
  deleting: 'Deleting...',

  // Disabilities
  disabilityTypes: 'Disability Types',
  hearingImpairment: 'Hearing Impairment',
  intellectualDisability: 'Intellectual Disability',
  learningDisability: 'Learning Disability',
  multipleDisabilities: 'Multiple Disabilities',
  otherDisability: 'Other Disability',
  physicalDisability: 'Physical Disability',
  visualImpairment: 'Visual Impairment',
  studentsWithDisabilities: 'Students With Disabilities',

  // Approval Settings
  disableApprovalForSelected: 'Disable Approval For Selected',
  enableApprovalForSelected: 'Enable Approval For Selected',

  // Education
  educationLevel: 'Education Level',
  selectEducationLevel: 'Select Education Level',

  // Email
  emailAvailable: 'Email Available',
  emailNotAvailable: 'Email Not Available',
  emailValidationHint: 'Checking email availability...',

  // Employment
  employmentInformation: 'Employment Information',

  // Dates
  endDate: 'End Date',
  startDate: 'Start Date',
  selectDate: 'Select Date',
  selectDateOfBirth: 'Select Date Of Birth',
  selectEndDate: 'Select End Date',
  selectStartDate: 'Select Start Date',
  pickDate: 'Pick Date',

  // Enter Fields
  enterHeight: 'Enter Height (cm)',
  enterProfilePictureUrl: 'Enter Profile Picture URL',
  enterTeacherNumber: 'Enter Teacher Number',
  enterWeight: 'Enter Weight (kg)',

  // Errors
  errorSelectingAllStudents: 'Error Selecting All Students',
  errorUpdatingSettings: 'Error Updating Settings',

  // Ethnic Groups
  ethnicGroup: 'Ethnic Group',
  ethnicGroups: 'Ethnic Groups',
  ethnicMinorityStudents: 'Ethnic Minority Students',

  // Exams
  exam: 'Exam',
  examDetails: 'Exam Details',
  examFilters: 'Exam Filters',
  examRecord: 'Exam Record',
  examTypeExam: 'Exam',
  examTypeQuiz: 'Quiz',
  examTypeTest: 'Test',
  loadingExamRecords: 'Loading Exam Records...',
  noExamRecords: 'No Exam Records',
  noExamRecordsForStudent: 'No Exam Records For Student',
  noStudentExamRecords: 'No Student Exam Records',
  noStudentsWithRecords: 'No Students With Records',
  searchExams: 'Search Exams',
  studentExamRecords: 'Student Exam Records',
  totalExams: 'Total Exams',
  viewAllStudentExams: 'View All Student Exams',
  quiz: 'Quiz',
  test: 'Test',
  allExamTypes: 'All Exam Types',

  // Export
  exportFailed: 'Export Failed',
  exportToSeeAll: 'Export To See All',
  noDataToExport: 'No Data To Export',

  // Extra Learning
  extraLearningTool: 'Extra Learning Tool',
  hasPackage: 'Has Package',
  have: 'Have',
  notHave: 'Not Have',

  // Failed Operations
  failedToAddStudentToParents: 'Failed To Add Student To Parents',
  failedToAddStudentToSomeParents: 'Failed To Add Student To Some Parents',
  failedToFetchStudentDetails: 'Failed To Fetch Student Details',
  failedToFetchStudents: 'Failed To Fetch Students',
  failedToFetchTeachers: 'Failed To Fetch Teachers',
  failedTransferStudents: 'Failed To Transfer Students',

  // Feature
  featureComingSoon: 'Feature Coming Soon',

  // Filters
  adjustFiltersOrSearch: 'Adjust Filters Or Search',
  advancedFilters: 'Advanced Filters',
  filterByActionBelow: 'Filter By Action Below',
  filterByGradeLevel: 'Filter By Grade Level',
  filterByStatusSubjectDate: 'Filter By Status, Subject, Date',
  filtered: 'Filtered',
  filteredFrom: 'Filtered From',
  selectedFilters: 'Selected Filters',

  // Gender
  genderDistribution: 'Gender Distribution',

  // Geometry
  geometry: 'Geometry',

  // Hide/Show
  hideDetails: 'Hide Details',
  showDetails: 'Show Details',
  showAllTeachers: 'Show All Teachers',
  tryShowAllTeachers: 'Try Show All Teachers',
  showingTopStudents: 'Showing Top Students',

  // Images
  imageSizeLimit: 'Image Size Limit',
  maxSize: 'Max Size',
  supportedFormats: 'Supported Formats',

  // Interface
  interfaceLanguage: 'Interface Language',

  // Invalid
  invalidGradeLevel: 'Invalid Grade Level',
  invalidMaxStudents: 'Invalid Max Students',
  invalidUsernameAndPassword: 'Invalid Username And Password',

  // Kindergarten
  isKindergartener: 'Is Kindergartener',
  kindergarten: 'Kindergarten',

  // Language & Skills
  language: 'Language',
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',

  // Loading
  loadingBMIData: 'Loading BMI Data...',
  loadingReportData: 'Loading Report Data',
  loadingSchool: 'Loading School...',
  loadingSubjects: 'Loading Subjects...',

  // Manage
  manageParentRecords: 'Manage Parent Records',
  manageParents: 'Manage Parents',
  manageSelectedParents: 'Manage Selected Parents',
  manageYourStudents: 'Manage Your Students',

  // Marital Status
  maritalStatus: 'Marital Status',
  selectMaritalStatus: 'Select Marital Status',

  // Max Students
  maxStudents: 'Max Students',

  // Master Class
  moveSelectedToMaster: 'Move Selected To Master',
  moveStudentToMaster: 'Move Student To Master',
  moveStudentsToMaster: 'Move Students To Master',
  moveToMaster: 'Move To Master',
  moving: 'Moving...',
  studentsToMasterClass: 'Remove students from class? This will move them out of their current class.',
  toMasterClass: 'Remove student? This will move them out of their current class.',

  // Navigation
  firstPage: 'First Page',
  lastPage: 'Last Page',
  nextPage: 'Next Page',
  previousPage: 'Previous Page',
  pages: 'Pages',

  // No Data Messages
  noDataMessage: 'Please select filters and wait for data to load',
  noOptionsAvailable: 'No Options Available',
  noOptionsFound: 'No Options Found',
  noResults: 'No Results',
  noSchoolIdInAccount: 'No School ID In Account',
  noStudents: 'No Students',
  noStudentsDesc: 'No Students In Selected Class',
  noStudentsInClass: 'No Students In Class',
  noStudentsYet: 'No Students Yet',
  noTargetClassSelected: 'No Target Class Selected',
  noTeachersForGrade: 'No Teachers For Grade',
  noTeachersForGradeMessage: 'No Teachers Assigned To Grade',
  noTeachersSelected: 'No Teachers Selected',

  // Notifications
  notifications: 'Notifications',
  noNotifications: 'No Notifications',

  // Number
  number: 'Number',

  // Other
  other: 'Other',
  notSpecified: 'Not Specified',

  // Parents
  addStudentToParents: 'Add Student To Parents',
  addingStudentToParents: 'Adding Student To Parents...',
  noParentsSelected: 'No Parents Selected',
  selectedParents: 'Selected Parents',
  studentAddedToParentsSuccess: 'Student Added To Parents Successfully',
  studentWillBeAddedToParents: 'Student Will Be Added To Parents',
  viewSelectedParents: 'View Selected Parents',
  readyToAddStudent: 'Ready To Add Student',

  // Partner Information
  partnerJobPlace: 'Partner Job Place',
  partnerName: 'Partner Name',
  partnerPhone: 'Partner Phone',
  partnerPlaceOfBirth: 'Partner Place Of Birth',

  // Passed
  passed: 'Passed',

  // Password
  confirmNewPassword: 'Confirm New Password',
  lowercase: 'One lowercase letter',
  mediumPassword: 'Medium Security',
  minChars8: 'Minimum 8 characters',
  passwordRequirements: 'Password Requirements',
  passwordResetSuccess: 'Password Reset Successfully',
  passwordStrength: 'Password Strength',
  passwordSufficient: 'Sufficient Password',
  passwordTooShort: 'Password Too Short',
  passwordValid: 'Valid Password',
  passwordsDoNotMatch: 'Passwords Do Not Match',
  passwordsMatch: 'Passwords Match',
  resetPassword: 'Reset Password',
  resettingPasswordFor: 'Resetting Password For',
  special: 'One special character',
  strongPassword: 'Strong Security',
  uppercase: 'One uppercase letter',
  weakPassword: 'Weak Security',

  // Percentage
  percentage: 'Percentage',

  // Place
  place: 'Place',

  // Please Complete
  pleaseCompleteAllRequiredFields: 'Please Complete All Required Fields',
  pleaseCompleteFields: 'Please Complete Fields',
  pleaseSelectStudent: 'Please Select Student',

  // Poor Card
  poorCardGrade: 'Poor Card Grade',
  poorCardNumber: 'Poor Card Number',
  selectPoorCardGrade: 'Select Poor Card Grade',

  // Powered By
  poweredBy: 'Powered By',
  providedBy: 'Provided By',
  allRightsReserved: 'All Rights Reserved',

  // Profile
  profilePictureUrl: 'Profile Picture URL',
  profileSettings: 'Profile Settings',

  // Records
  recordsLoaded: 'Records Loaded',
  viewRecords: 'View Records',

  // Remove Students
  removeStudentsFromClasses: 'Remove Students From Classes',

  // Reports
  report10: 'Student Transfer List',
  report11: 'Dropout Student List',
  report12: 'Tracking Book',
  report13: 'Academic Book',
  report2: 'Class Roll Call List',
  report3: 'Student Average List',
  report4: 'Student Absence List',
  report5: 'Scholarship Student List',
  report6: 'Student Disability List',
  report7: 'Health Issue Student List',
  report8: 'Personal Issue Student List',
  report9: 'Ethnic Minority Student List',
  reportReadyToExport: '{{count}} records ready to export. Click "Export Report" above to download as Excel.',
  reportStudentNameInfo: 'Student Roll Call List',
  selectReportType: 'Select Report Type',

  // Roles
  roles: 'Roles',
  selectRole: 'Select Role',

  // Salary
  salaryType: 'Salary Type',
  selectSalaryType: 'Select Salary Type',

  // School
  schoolDetails: 'School Details',
  schoolInfoNotAvailable: 'School Info Not Available',
  schoolInfoStillLoading: 'School Info Still Loading',
  schoolManagement: 'School Management',
  schoolPopulationDistributionDesc: 'Staff Type Distribution',
  yourSchoolDetails: 'Your School Details',
  targetSchool: 'Target School',
  selectTargetSchool: 'Select Target School',
  selectSourceSchoolDesc: 'Select Source School',

  // Search
  searchByName: 'Search By Name',
  searchStudent: 'Search Student',
  searchTeacher: 'Search Teacher',

  // Select Options
  selectAcademicYear: 'Select Academic Year',
  selectGender: 'Select Gender',
  selectMonth: 'Select Month',
  selectNationality: 'Select Nationality',
  selectOption: 'Select Option',
  selectStatus: 'Select Status',
  selectStudent: 'Select Student',
  selectSubjects: 'Select Subjects',
  selectTeacherStatus: 'Select Teacher Status',
  selectTeacherType: 'Select Teacher Type',
  selectTeachers: 'Select Teachers',
  selectTeachingType: 'Select Teaching Type',
  selectTimePeriod: 'Select Time Period',
  selectTrainingType: 'Select Training Type',

  // Selected
  selectedCount: 'Selected',
  selectedTeachers: 'Selected Teachers',

  // Special Needs
  special: 'Special',
  specialNeedsStudents: 'Special Needs Students',

  // Statistics
  statistics: 'Statistics',
  summaryInfo: 'Summary Info',

  // Status
  allStatuses: 'All Statuses',

  // Student Operations
  myStudents: 'My Students',
  studentDetails: 'Student Details',
  studentTransfer: 'Student Transfer',
  studentsTransferredSuccess: 'Students Transferred Successfully',
  transferStudentsDesc: 'Transfer Students Across Schools',
  viewSelected: 'View Selected',

  // Subjects
  subjects: 'Subjects',
  allSubjects: 'All Subjects',

  // Teacher Operations
  teacherAssignedToDifferentGrade: 'Note: This teacher is teaching Grade {{grade}}',
  teacherInfo: 'Teacher Info',
  teacherNumberAvailable: 'Teacher Number Available',
  teacherNumberExists: 'Teacher Number Exists',
  teacherStatus: 'Teacher Status',
  teacherTransfer: 'Teacher Transfer',
  teacherType: 'Teacher Type',
  teachersToTransfer: 'Teachers To Transfer',
  teachingType: 'Teaching Type',
  thisTeacher: 'This Teacher',
  transferTeachersDesc: 'Manage And Transfer Teachers',
  totalDirectors: 'Total Directors',

  // Toggle
  toggleSortOrder: 'Toggle Sort Order',

  // Total
  total: 'Total',

  // Training
  trainingInformation: 'Training Information',
  trainingType: 'Training Type',

  // Updating
  updatingResults: 'Updating Results...',

  // User Activity
  userActivityLogs: 'User Activity Logs',
  userLogins: 'User Logins',
  userCreations: 'User Creations',
  userUpdates: 'User Updates',
  userDeletions: 'User Deletions',
  failedToLoadActivityCounts: 'Failed to load activity counts',

  // Username
  usernameAvailable: 'Username Available',
  usernameNotAvailable: 'Username Not Available',
  usernameSuggestionHint: 'Click suggestions to auto-generate username',

  // View
  viewDetails: 'View Details',

  // Will Be Transferred
  willBeTransferredTo: 'Will Be Transferred To',
};  