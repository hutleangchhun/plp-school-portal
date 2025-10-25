# School Portal - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [Director Features](#director-features)
6. [Teacher Features](#teacher-features)
7. [API Integration](#api-integration)
8. [Installation & Setup](#installation--setup)
9. [Usage Guide](#usage-guide)

---

## Overview

**School Portal** is a comprehensive school management system built with React that enables directors and teachers to manage academic operations, attendance, student records, and classroom management.

### Key Highlights
- 🎓 **Multi-Role System** - Designed for Directors and Teachers
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌐 **Bilingual Support** - English and Khmer language support
- 🔐 **Secure Authentication** - JWT-based authentication
- ⚡ **Real-time Updates** - Live data synchronization
- 📊 **Dashboard Analytics** - Visual insights and reports

---

## System Architecture

### Technology Stack
- **Frontend Framework**: React 18+
- **Routing**: React Router v6
- **State Management**: React Context API & Local State
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **UI Components**: Lucide React Icons
- **Build Tool**: Vite

### File Structure
```
src/
├── pages/              # Page components
│   ├── auth/          # Login & Registration
│   ├── dashboard/     # Dashboard pages
│   ├── students/      # Student management
│   ├── classes/       # Class management
│   ├── teachers/      # Teacher management
│   ├── parents/       # Parent management
│   └── attendance/    # Attendance tracking
├── components/        # Reusable UI components
│   ├── layout/       # Layout wrappers
│   ├── ui/           # Generic UI components
│   └── common/       # Common components
├── contexts/         # React Context providers
├── hooks/            # Custom React hooks
├── utils/
│   ├── api/          # API services
│   └── formatters/   # Data formatters
└── locales/          # i18n translations
```

---

## User Roles & Permissions

### Role Identification
- **Teacher**: `roleId = 8`, `isDirector = false` or `undefined`
- **Director**: `roleId = 8`, `isDirector = true`

### Access Control
The portal is **restricted to teachers and directors only** (roleId = 8). Other users are automatically logged out.

---

## Core Features

### 1. Authentication System

#### Login Page
- **Route**: `/login`
- **Features**:
  - Username/Email login
  - Password authentication
  - Remember me option
  - Student registration link
  - Automatic redirect based on role

#### Student Registration
- **Route**: `/register/student`
- **Features**:
  - Public registration page
  - Student account creation
  - Parent information collection
  - Email verification

#### Session Management
- JWT token storage in localStorage
- Automatic logout on 401 unauthorized
- Token refresh on API calls
- Secure session handling

### 2. User Profile Management

#### Profile Update
- **Route**: `/profile`
- **Features**:
  - Update personal information (name, email, phone)
  - Change password
  - Location information (province, district, commune, village)
  - Profile picture upload
  - Gender selection
  - Date of birth
  - Nationality information

---

## Director Features

### 1. Dashboard
- **Route**: `/dashboard`
- **Features**:
  - School statistics overview
  - Teacher and student population distribution
  - Class management overview
  - Quick action buttons
  - Recent activity feed
  - School information display

### 2. Student Management
- **Route**: `/students`
- **Features**:
  - View all students
  - Create new students
  - Edit student information
  - Delete student records
  - Search and filter students
  - Assign students to classes
  - **Bulk Import**: Upload multiple students via CSV/Excel
  - Student selection utility

### 3. Class Management
- **Route**: `/classes`
- **Features**:
  - Create new classes
  - Edit class details (name, grade level, section)
  - Assign teachers to classes
  - Set academic year
  - Configure max students per class
  - **Flexible Teacher Selection**:
    - Cascade filtering by grade level (default)
    - "Show all teachers" toggle for flexibility
  - Delete classes
  - View class roster

### 4. Teacher Management
- **Route**: `/teachers`
- **Features**:
  - View all teachers
  - Add new teachers
  - Edit teacher information
  - Deactivate/activate teachers
  - Assign teachers to grades
  - View teacher workload
  - Search and filter teachers

### 5. Parent Management
- **Route**: `/parents`
- **Features**:
  - View all parents
  - Add new parent records
  - Edit parent information
  - Link parents to students
  - Contact information management
  - View parent-student relationships

### 6. Teacher Attendance Tracking
- **Route**: `/teacher-attendance`
- **Features**:
  - Track teacher attendance by week
  - View attendance status (Present, Absent, Late, Leave)
  - Weekly view with date navigation
  - Search teachers by name
  - **Approval Settings Management**:
    - Toggle approval requirement per teacher
    - Individual update for single teachers
    - **Bulk update feature**:
      - Select multiple teachers with checkboxes
      - Enable/disable approval for selected teachers
      - Uses API endpoint: `PATCH /teacher-settings/bulk`
    - Real-time status indicator
    - Visual feedback with toasts

### 7. Attendance Approval
- **Route**: `/attendance/approval`
- **Features**:
  - Review pending attendance records
  - Approve or reject attendance submissions
  - Add approval comments
  - Filter by status and date

---

## Teacher Features

### 1. My Classes
- **Route**: `/my-classes`
- **Features**:
  - View assigned classes
  - Class roster management
  - View class schedule
  - Access class materials
  - Manage class announcements

### 2. My Students
- **Route**: `/my-students`
- **Features**:
  - View students in assigned classes
  - View student details
  - Track student progress
  - Access student contact information

### 3. My Attendance
- **Route**: `/my-attendance`
- **Features**:
  - Self attendance marking
  - Mark present, absent, late, or leave
  - View attendance history
  - Submit approval for attendance
  - Track approval status

### 4. Student Attendance
- **Route**: `/attendance`
- **Features**:
  - Mark student attendance
  - Bulk attendance marking
  - View attendance reports
  - Filter by class and date
  - Attendance history

---

## API Integration

### Authentication Service
```javascript
POST /auth/login              // User login
POST /auth/logout             // User logout
GET  /auth/verify             // Verify token
POST /auth/refresh            // Refresh token
```

### Student Service
```javascript
GET    /students              // List all students
POST   /students              // Create student
PUT    /students/{id}         // Update student
DELETE /students/{id}         // Delete student
GET    /students/{id}         // Get student details
```

### Teacher Service
```javascript
GET    /teachers              // List all teachers
GET    /teachers/school/{id}  // Get school teachers
POST   /teachers              // Create teacher
PUT    /teachers/{id}         // Update teacher
DELETE /teachers/{id}         // Delete teacher
```

### Class Service
```javascript
GET    /classes               // List all classes
POST   /classes               // Create class
PUT    /classes/{id}          // Update class
DELETE /classes/{id}          // Delete class
GET    /classes/{id}          // Get class details
```

### Attendance Service
```javascript
GET    /attendance            // Get attendance records
POST   /attendance            // Create attendance record
PUT    /attendance/{id}       // Update attendance
GET    /attendance/approval   // Get pending approvals
PATCH  /attendance/{id}/approve  // Approve attendance
```

### Teacher Settings Service
```javascript
GET    /teacher-settings/{teacherId}           // Get teacher settings
PATCH  /teacher-settings/{teacherId}           // Update single teacher
PATCH  /teacher-settings/bulk                  // Bulk update teachers

// Bulk update request format:
{
  "teachers": [
    { "teacherId": 4259, "requiresApproval": true },
    { "teacherId": 4260, "requiresApproval": false }
  ]
}
```

---

## Installation & Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd teacher-portal

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your API endpoint:
# VITE_API_BASE_URL=http://localhost:8080/api/v1

# 4. Start development server
npm run dev
```

### Development Server
- **URL**: http://localhost:3002
- **Hot Reload**: Enabled
- **Port**: 3002 (or next available if 3002 is in use)

### Build for Production
```bash
npm run build       # Build production bundle
npm run preview     # Preview production build
```

---

## Usage Guide

### For Directors

#### 1. Managing Teachers
1. Navigate to **Teachers** from sidebar
2. Click **"Add Teacher"** button
3. Fill in teacher details (name, email, phone, etc.)
4. Assign grade level
5. Click **"Save"**

#### 2. Managing Classes
1. Go to **Classes**
2. Click **"Create Class"**
3. Enter class name and select grade level
4. **Select Teacher**:
   - Default: Shows only teachers for that grade
   - Click **"Show all teachers"** to see all available teachers
5. Set academic year and max students
6. Click **"Create"**

#### 3. Managing Student Attendance Approval
1. Navigate to **Teacher Attendance**
2. Find the teacher you want to configure
3. **Option A - Individual Toggle**:
   - Click the toggle switch next to teacher name
   - Switch will turn blue (enabled) or gray (disabled)
   - Setting is saved immediately
4. **Option B - Bulk Update**:
   - Check multiple teacher checkboxes
   - Blue toolbar appears showing selected count
   - Click **"Enable Approval"** or **"Disable Approval"**
   - All selected teachers are updated at once
   - Success message appears when complete

#### 4. Bulk Student Import
1. Go to **Students** → **Bulk Import**
2. Download CSV template
3. Fill in student data (name, email, class, etc.)
4. Upload CSV file
5. Review import preview
6. Click **"Import"** to add all students

### For Teachers

#### 1. Marking Self-Attendance
1. Go to **My Attendance**
2. Click **"Mark Attendance"**
3. Select status (Present/Absent/Late/Leave)
4. Add notes if required
5. Click **"Submit"**
6. Wait for director approval if configured

#### 2. Marking Student Attendance
1. Navigate to **Attendance**
2. Select date and class
3. Click each student to mark status
4. Bulk mark option for quick marking
5. Submit attendance
6. View approval status

#### 3. Managing Class Information
1. Go to **My Classes**
2. Click class name to view details
3. View and manage class roster
4. Access class schedule and materials
5. Make announcements

---

## Troubleshooting

### Common Issues

#### Login Issues
- **Problem**: Cannot log in
  - **Solution**: Verify API endpoint is correct in `.env`
  - Check internet connection
  - Clear browser cache and cookies
  - Verify credentials are correct

#### Attendance Not Saving
- **Problem**: Attendance records not persisted
  - **Solution**: Check network tab in DevTools for errors
  - Verify teacher/student exists in database
  - Check for approval requirements blocking submission

#### Bulk Import Fails
- **Problem**: CSV import returns error
  - **Solution**: Verify CSV format matches template
  - Check for required fields (name, email, class)
  - Ensure no duplicate email addresses
  - Validate file encoding (UTF-8)

#### Bulk Teacher Settings Not Updating
- **Problem**: Bulk update shows success but toggles don't change
  - **Solution**: Refresh page to reload from server
  - Check network tab for API errors
  - Verify teacher IDs are correct
  - Check browser console for JavaScript errors

---

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access Control**: Directors and Teachers only
- **Session Management**: Automatic logout on unauthorized
- **Data Validation**: Client-side and server-side validation
- **CORS Handling**: Proper cross-origin request configuration
- **Secure Headers**: API client includes authorization headers

---

## Performance Optimizations

- **Code Splitting**: Route-based lazy loading
- **Memoization**: useMemo for expensive computations
- **Debouncing**: Search input debouncing (500ms)
- **Pagination**: List pagination for large datasets
- **Caching**: API response caching with error handling
- **Virtual Scrolling**: For large lists (when applicable)

---

## Internationalization (i18n)

### Supported Languages
- **Khmer** (km) - Default
- **English** (en) - Available

### Language Switching
- Available in sidebar
- Persists across sessions
- Real-time UI translation
- All pages support both languages

### Adding Translations
Edit `src/locales/km.js` and corresponding language file:
```javascript
export const km = {
  // Common
  save: 'រក្សាទុក',
  cancel: 'បោះបង់',
  // ... more translations
};
```

---

## Recent Features Added

### Teacher Approval Settings
- Enabled directors to require approval for teacher attendance
- Individual toggle per teacher
- Bulk update capability for multiple teachers at once
- Uses `teacher_id` from teachers table (not user_id)
- API endpoint: `PATCH /teacher-settings/bulk`

### Flexible Class Teacher Selection
- Cascade filtering by grade level (default behavior)
- "Show all teachers" toggle option
- Can assign any teacher to any class
- Visual indicator when teacher is in different grade

### Enhanced Teacher Attendance UI
- Weekly view with date navigation
- Search functionality
- Individual approval toggle per teacher
- Bulk selection with checkboxes
- Bulk action toolbar with multiple options
- Blue highlight for selected teachers
- Real-time loading states

---

## Development Guidelines

### Code Standards
- Use functional components and hooks
- Implement error boundaries
- Add proper loading states
- Provide user feedback via toasts
- Handle async operations properly
- Use meaningful variable names

### Git Workflow
```bash
git checkout -b feature/feature-name
git add .
git commit -m "feature: description"
git push origin feature/feature-name
```

### Commit Message Format
- `feat: ` - New feature
- `fix: ` - Bug fix
- `docs: ` - Documentation
- `refactor: ` - Code refactoring
- `test: ` - Testing
- `chore: ` - Maintenance

---

## Support & Contact

For issues, bugs, or feature requests:
1. Check existing documentation
2. Review GitHub issues
3. Contact development team
4. Submit bug reports with:
   - Error message
   - Steps to reproduce
   - Browser/device information
   - Screenshots/screen recordings

---

## Version History

- **v1.0.0** - Initial release
  - Basic dashboard
  - Student management
  - Teacher management
  - Class management
  - Attendance tracking

- **v1.1.0** - Enhanced features
  - Teacher approval settings
  - Bulk operations
  - Flexible teacher assignment
  - Improved UI/UX

---

## License

This project is licensed under the GPL License - see the LICENSE file for details.

---

## Changelog

### Latest Updates
- ✅ Added bulk teacher approval settings management
- ✅ Implemented flexible teacher selection in class management
- ✅ Enhanced teacher attendance UI with bulk actions
- ✅ Fixed login page infinite refresh issue
- ✅ Improved API response handling
- ✅ Added comprehensive error messages
- ✅ Bilingual support (English/Khmer)

---

**Last Updated**: October 25, 2025
**Maintained By**: Development Team
**Status**: Active Development
