# Backend Routes Implementation Guide

## Current Status
- ✅ `/api/v1/students/school/:schoolId/classes` - Working with filters (classId, gradeLevel, status, search)
- ❌ `/api/v1/parents/school/:schoolId` - Needs implementation with studentId filter

## Route 1: Get Students by School Classes (Already Working)

**Endpoint:** `GET /api/v1/students/school/:schoolId/classes`

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `search` (string) - Search term for filtering
- `classId` (number) - Filter by specific class ID
- `gradeLevel` (number) - Filter by grade level (1-6)
- `status` (boolean) - Filter by active status (true/false)

**Example:**
```
GET /api/v1/students/school/76525/classes?page=1&limit=10&classId=26&gradeLevel=1&status=true&search=ដារ៉ូ
```

**Response:**
```json
{
  "data": [
    {
      "studentId": 123,
      "user": {
        "id": 456,
        "first_name": "ដារ៉ូ",
        "last_name": "សុខ",
        "username": "daro.sok",
        "email": "daro@school.edu",
        "phone": "012345678",
        "gender": "MALE",
        "date_of_birth": "2010-01-15",
        "profile_picture": null,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      "class": {
        "classId": 26,
        "name": "ថ្នាក់ទី​ ២ខ",
        "gradeLevel": 2
      },
      "academicYear": "2024-2025",
      "gradeLevel": 2,
      "averageScore": 85.5,
      "timeSpent": 120,
      "scores": [],
      "problemPoints": []
    }
  ],
  "total": 18,
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "schoolInfo": {
    "schoolId": 76525,
    "schoolName": "Example School"
  }
}
```

---

## Route 2: Get Parents by School with Student Filter (NEEDS IMPLEMENTATION)

**Endpoint:** `GET /api/v1/parents/school/:schoolId`

**Purpose:** Retrieve parents from a school with optional filtering by student

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `search` (string) - Search term (parent name, phone, email, student name, etc.)
- `studentId` (number, optional) - Filter parents by specific student ID

**Example Requests:**
```
GET /api/v1/parents/school/76525?page=1&limit=10
GET /api/v1/parents/school/76525?page=1&limit=10&search=John
GET /api/v1/parents/school/76525?page=1&limit=10&studentId=2170926
```

**Expected Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "parentId": 789,
      "user": {
        "id": 1001,
        "first_name": "John",
        "last_name": "Sok",
        "username": "john.sok",
        "email": "john.sok@email.com",
        "phone": "012111222",
        "profile_picture": null
      },
      "students": [
        {
          "studentId": 2170926,
          "student_number": "STD-2024-001",
          "first_name": "ដារ៉ូ",
          "last_name": "សុខ",
          "relationship": "FATHER",
          "class": {
            "classId": 26,
            "name": "ថ្នាក់ទី​ ២ខ",
            "gradeLevel": 2
          }
        },
        {
          "studentId": 2170927,
          "student_number": "STD-2024-002",
          "first_name": "ស្រីណា",
          "last_name": "សុខ",
          "relationship": "FATHER",
          "class": {
            "classId": 25,
            "name": "ថ្នាក់ទី ១ក",
            "gradeLevel": 1
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "schoolInfo": {
    "schoolId": 76525,
    "schoolName": "Example School"
  }
}
```

---

## Backend Implementation Steps

### For Node.js/Express:

```javascript
// routes/parents.js

router.get('/school/:schoolId', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 10, search = '', studentId } = req.query;

    // Build query to get distinct parents from the school
    let query = `
      SELECT DISTINCT
        p.parent_id,
        pu.id as user_id,
        pu.first_name,
        pu.last_name,
        pu.username,
        pu.email,
        pu.phone,
        pu.profile_picture
      FROM parents p
      JOIN users pu ON p.user_id = pu.id
      JOIN students s ON p.student_id = s.student_id
      JOIN class_students cs ON s.student_id = cs.student_id
      JOIN classes c ON cs.class_id = c.class_id
      WHERE c.school_id = ?
    `;

    const params = [schoolId];

    // Add studentId filter if provided
    if (studentId) {
      query += ` AND p.student_id = ?`;
      params.push(studentId);
    }

    // Add search filter (search in parent or student names)
    if (search) {
      query += ` AND (
        pu.first_name LIKE ? OR
        pu.last_name LIKE ? OR
        pu.username LIKE ? OR
        pu.email LIKE ? OR
        pu.phone LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Get total count before pagination
    const countQuery = query.replace(/SELECT DISTINCT.+FROM/, 'SELECT COUNT(DISTINCT p.parent_id) as total FROM');
    const [{ total }] = await db.query(countQuery, params);

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY pu.first_name, pu.last_name LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // Execute query
    const parents = await db.query(query, params);

    // Get student information for each parent
    const parentsWithStudents = await Promise.all(
      parents.map(async (parent) => {
        const students = await db.query(`
          SELECT
            s.student_id,
            s.student_number,
            su.first_name,
            su.last_name,
            p.relationship,
            c.class_id as classId,
            c.name as class_name,
            c.grade_level
          FROM parents p
          JOIN students s ON p.student_id = s.student_id
          JOIN users su ON s.user_id = su.id
          LEFT JOIN class_students cs ON s.student_id = cs.student_id
          LEFT JOIN classes c ON cs.class_id = c.class_id
          WHERE p.parent_id = ? AND c.school_id = ?
          ORDER BY c.grade_level, c.name
        `, [parent.parent_id, schoolId]);

        return {
          parentId: parent.parent_id,
          user: {
            id: parent.user_id,
            first_name: parent.first_name,
            last_name: parent.last_name,
            username: parent.username,
            email: parent.email,
            phone: parent.phone,
            profile_picture: parent.profile_picture
          },
          students: students.map(s => ({
            studentId: s.student_id,
            student_number: s.student_number,
            first_name: s.first_name,
            last_name: s.last_name,
            relationship: s.relationship,
            class: {
              classId: s.classId,
              name: s.class_name,
              gradeLevel: s.grade_level
            }
          }))
        };
      })
    );

    res.json({
      success: true,
      data: parentsWithStudents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      schoolInfo: {
        schoolId,
        schoolName: 'School Name' // Fetch from schools table if needed
      }
    });

  } catch (error) {
    console.error('Error fetching parents by school:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parents'
    });
  }
});
```

---

## Database Schema Reference

### Tables Needed:
```sql
-- Students table
CREATE TABLE students (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  student_number VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Parents table
CREATE TABLE parents (
  parent_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  relationship ENUM('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  occupation VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Class students junction table
CREATE TABLE class_students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  academic_year VARCHAR(20),
  grade_level INT,
  enrolled_date DATE,
  FOREIGN KEY (class_id) REFERENCES classes(class_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id)
);
```

---

## Testing the Endpoints

### 1. Test Parents Endpoint - Get all parents:
```bash
curl -X GET "http://localhost:8080/api/v1/parents/school/76525?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test with search:
```bash
curl -X GET "http://localhost:8080/api/v1/parents/school/76525?page=1&limit=10&search=John" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test with studentId filter:
```bash
curl -X GET "http://localhost:8080/api/v1/parents/school/76525?page=1&limit=10&studentId=2170926" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Integration (Already Done ✅)

### Students Management
The frontend filtering for `/students/school/:schoolId/classes` is **fully implemented** with:
- ✅ Class filter (dropdown)
- ✅ Grade level filter (dropdown)
- ✅ Status filter (Active/Inactive)
- ✅ Search functionality
- ✅ Pagination
- ✅ Server-side filtering

### Parents Management
The frontend support for `/parents/school/:schoolId` is **ready** with:
- ✅ studentId filter parameter added to parentService
- ✅ Search functionality
- ✅ Pagination
- ✅ Logging for debugging

Just implement the backend routes and everything will work perfectly!
