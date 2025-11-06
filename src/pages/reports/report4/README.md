# Report 4: Absence Report - Modular Structure

This folder contains all Report 4 (Absence Report) related functionality organized in a modular, maintainable structure.

## 📁 File Structure

```
report4/
├── index.js              # Central export point
├── useReport4Data.js     # Custom hook for data fetching
├── Report4Preview.jsx    # Preview component
└── README.md            # This file
```

## 📦 Components

### 1. **useReport4Data.js** - Data Fetching Hook

Custom React hook that handles all data fetching logic for Report 4.

**Usage:**
```javascript
import { useReport4Data } from './report4';

const { data, loading, error, fetchData } = useReport4Data();

// Fetch data
await fetchData({
  schoolId: '123',
  classId: '26',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  apiLimit: 200
});
```

**What it does:**
1. Fetches all students in the selected class
2. Fetches attendance records for the date range
3. Fetches full student details (studentNumber, gender, etc.)
4. Combines students with their attendance records
5. Returns processed data ready for display/export

**Returns:**
- `data` - Array of students with attendance
- `loading` - Boolean loading state
- `error` - Error message if any
- `fetchData` - Function to trigger data fetch

---

### 2. **Report4Preview.jsx** - Preview Component

React component that displays the preview of Report 4 data.

**Usage:**
```javascript
import { Report4Preview } from './report4';

<Report4Preview data={reportData} />
```

**What it displays:**
- Table 1: Student with most absences (អច្ប)
- Table 2: Student with most leaves (ច្ប)
- Each table shows: Student Number, Name, Gender, Count, Attendance Rate

**Features:**
- Color-coded tables (red for absences, orange for leaves)
- Attendance rate badges with color coding
- Empty state handling
- Khmer translations support

---

### 3. **index.js** - Central Export

Exports all Report 4 functionality from one place.

```javascript
export { useReport4Data } from './useReport4Data';
export { Report4Preview } from './Report4Preview';
export { exportReport4ToExcel } from '../../../utils/report4ExportUtils';
```

---

## 🔧 How to Use in Reports.jsx

### Step 1: Import

```javascript
import { useReport4Data, Report4Preview, exportReport4ToExcel } from './report4';
```

### Step 2: Initialize Hook (Optional - if you want to use the hook directly)

```javascript
const report4 = useReport4Data();
```

### Step 3: Fetch Data

**Option A: Use existing fetchReportData logic (current approach)**
```javascript
// In fetchReportData function for report4
if (selectedReport === 'report4') {
  // ... existing logic ...
}
```

**Option B: Use the custom hook (cleaner approach)**
```javascript
if (selectedReport === 'report4') {
  const result = await report4.fetchData({
    schoolId,
    classId: selectedClass,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    apiLimit
  });
  
  if (result.success) {
    setReportData(result.data);
  }
}
```

### Step 4: Display Preview

```javascript
// In renderDataPreview function
if (selectedReport === 'report4') {
  return <Report4Preview data={reportData} />;
}
```

### Step 5: Export

```javascript
// In handleExportReport function
if (selectedReport === 'report4') {
  const result = await exportReport4ToExcel(reportData, {
    schoolName,
    className,
    selectedDate,
    period: selectedPeriod,
    periodName,
    monthName,
    selectedYear,
    startDate,
    endDate
  });
}
```

---

## ✨ Benefits of This Structure

### 1. **Separation of Concerns**
- Data fetching logic separated from UI
- Preview component independent
- Export logic in its own file

### 2. **Reusability**
- Hook can be used in other components
- Preview component can be used standalone
- Export function can be called from anywhere

### 3. **Maintainability**
- Easy to find and fix bugs
- Clear responsibility for each file
- Simple to add new features

### 4. **Testability**
- Each component can be tested independently
- Mock data easily for preview testing
- Hook can be tested without UI

### 5. **Scalability**
- Easy to add new features (e.g., filters, sorting)
- Can add more preview variations
- Simple to extend export formats

---

## 🎯 Future Improvements

### Potential Enhancements:

1. **Add Transformer Function**
   ```javascript
   // report4/transformers.js
   export const transformAbsenceData = (rawData) => {
     // Transform logic here
   };
   ```

2. **Add Validators**
   ```javascript
   // report4/validators.js
   export const validateReport4Filters = (filters) => {
     // Validation logic
   };
   ```

3. **Add Constants**
   ```javascript
   // report4/constants.js
   export const REPORT4_API_LIMITS = {
     MONTHLY: 200,
     SEMESTER: 1000,
     YEARLY: 2000
   };
   ```

4. **Add Types (if using TypeScript)**
   ```typescript
   // report4/types.ts
   export interface Report4Data {
     userId: string;
     studentNumber: string;
     // ...
   }
   ```

---

## 📝 Example: Complete Integration

```javascript
// Reports.jsx

import { useReport4Data, Report4Preview, exportReport4ToExcel } from './report4';

function Reports() {
  const report4 = useReport4Data();
  
  // Fetch data
  const fetchReportData = async () => {
    if (selectedReport === 'report4') {
      await report4.fetchData({
        schoolId,
        classId: selectedClass,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        apiLimit: calculateApiLimit()
      });
    }
  };
  
  // Render preview
  const renderDataPreview = () => {
    if (selectedReport === 'report4') {
      return <Report4Preview data={report4.data} />;
    }
  };
  
  // Export
  const handleExport = async () => {
    if (selectedReport === 'report4') {
      await exportReport4ToExcel(report4.data, exportOptions);
    }
  };
}
```

---

## 🔍 Data Flow

```
User Selects Filters
        ↓
useReport4Data.fetchData()
        ↓
1. Fetch students in class
2. Fetch attendance records
3. Fetch full student details
4. Combine all data
        ↓
Report4Preview Component
        ↓
Display tables with stats
        ↓
User clicks Export
        ↓
exportReport4ToExcel()
        ↓
Excel file downloaded
```

---

## 🎨 Component Hierarchy

```
Reports.jsx (Main)
    ├── useReport4Data (Hook)
    │   ├── studentService.getStudentsBySchoolClasses
    │   ├── attendanceService.getAttendance
    │   └── studentService.getStudentById
    │
    ├── Report4Preview (Component)
    │   ├── Table: Most Absences
    │   └── Table: Most Leaves
    │
    └── exportReport4ToExcel (Function)
        └── Excel file generation
```

---

This modular structure makes Report 4 easy to maintain, test, and extend! 🎉
