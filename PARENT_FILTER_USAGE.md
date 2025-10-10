# Parent Filtering by Student - Usage Guide

## ✅ Status: READY TO USE

The parent filtering by student is **fully implemented** on both frontend and backend!

## API Endpoint

```
GET /api/v1/parents/school/:schoolId?page=1&limit=10&studentId=:studentId
```

## Frontend Service

The `parentService.js` has been updated to support the `studentId` filter parameter.

### Usage Example:

```javascript
import parentService from '@/utils/api/services/parentService';

// Fetch all parents from school
const allParents = await parentService.getParentsBySchool(schoolId, {
  page: 1,
  limit: 10,
  search: ''
});

// Fetch parents filtered by specific student
const studentParents = await parentService.getParentsBySchool(schoolId, {
  page: 1,
  limit: 10,
  studentId: 919751  // Filter by student ID
});
```

## How to Add Student Filter to ParentsManagement UI

### Option 1: Add Student Dropdown Filter

In `ParentsManagement.jsx`, add:

```javascript
// Add state for student filter
const [selectedStudentId, setSelectedStudentId] = useState('all');
const [students, setStudents] = useState([]);

// Fetch students for the dropdown
useEffect(() => {
  const fetchStudents = async () => {
    if (schoolId) {
      const response = await studentService.getStudentsBySchoolClasses(schoolId, {
        page: 1,
        limit: 1000 // Get all students for filter
      });
      if (response.success) {
        setStudents(response.data);
      }
    }
  };
  fetchStudents();
}, [schoolId]);

// Update fetchParents to include studentId
const response = await parentService.getParentsBySchool(schoolId, {
  page: pagination.page,
  limit: pagination.limit,
  search: searchTerm,
  studentId: selectedStudentId !== 'all' ? selectedStudentId : undefined
});

// Add dropdown in the UI
<Dropdown
  value={selectedStudentId}
  onValueChange={setSelectedStudentId}
  options={[
    { value: 'all', label: 'All Students' },
    ...students.map(student => ({
      value: student.studentId.toString(),
      label: `${student.firstName} ${student.lastName} (${student.class?.name || 'No Class'})`
    }))
  ]}
  placeholder="Filter by Student"
/>
```

### Option 2: Pass studentId from Parent Component

If you want to filter parents when viewing a specific student:

```javascript
// In StudentViewModal.jsx or similar
const { data: studentParents } = await parentService.getParentsBySchool(
  student.schoolId,
  {
    studentId: student.studentId
  }
);
```

## API Response Format

```json
{
  "data": [
    {
      "parentId": 5,
      "occupation": null,
      "user": {
        "id": "2217440",
        "username": "johncena3",
        "first_name": "ចន",
        "last_name": "ស៊ីណា",
        "email": "john.cena3@example.com",
        "phone": "0123456789"
      },
      "students": [
        {
          "studentId": 919751,
          "relationship": "ម្ដាយ",
          "isPrimaryContact": true,
          "user": {
            "id": "261410",
            "username": "student1960306",
            "first_name": "គី",
            "last_name": "តិចម៉េង",
            "email": "student1960306@school.edu.kh",
            "phone": null
          },
          "schoolId": 76525,
          "classId": 20,
          "studentNumber": "ST196941",
          "status": "ACTIVE"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

## Testing

Test the API directly:

```bash
# Get all parents
curl "http://localhost:8080/api/v1/parents/school/76525?page=1&limit=10"

# Filter by student
curl "http://localhost:8080/api/v1/parents/school/76525?page=1&limit=10&studentId=919751"

# Search with student filter
curl "http://localhost:8080/api/v1/parents/school/76525?page=1&limit=10&studentId=919751&search=John"
```

## Summary

✅ **Backend API:** Working
✅ **Frontend Service:** Updated with `studentId` parameter
✅ **Ready to Use:** Just add the UI dropdown or pass studentId directly

The implementation is complete and ready to use! 🎉
