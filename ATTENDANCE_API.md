# Attendance API Documentation

## Overview
The Attendance API provides endpoints for managing attendance records with check-in/check-out functionality and approval workflow for teachers.

## Base URL
```
/api/v1/attendance
```

---

## Endpoints

### 1. Create Attendance Record

**POST** `/attendance`

Creates a new attendance record with optional check-in time.

#### Request Body
```json
{
  "userId": 123,
  "classId": 1,
  "date": "2025-12-16",
  "status": "PRESENT",
  "reason": "On time",
  "checkInTime": "2025-12-16T08:15:00Z",
  "checkOutTime": "2025-12-16T17:30:00Z"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | Yes | User ID of the person |
| classId | number | No | Class ID (null for directors/admin) |
| date | string | Yes | Attendance date (YYYY-MM-DD) |
| status | enum | No | PRESENT, ABSENT, LATE, LEAVE (default: PRESENT) |
| reason | string | No | Reason for absence or status |
| checkInTime | string | No | ISO 8601 timestamp when user checked in |
| checkOutTime | string | No | ISO 8601 timestamp when user checked out |

#### Response (201 Created)
```json
{
  "id": 1,
  "userId": 123,
  "classId": 1,
  "date": "2025-12-16T00:00:00.000Z",
  "status": "PRESENT",
  "reason": "On time",
  "checkInTime": "2025-12-16T08:15:00.000Z",
  "checkOutTime": "2025-12-16T17:30:00.000Z",
  "hoursWorked": 9.25,
  "isCheckedOut": true,
  "approvalStatus": "PENDING",
  "approvedBy": null,
  "approvedAt": null,
  "approvalComments": null,
  "submittedAt": "2025-12-16T08:15:00.000Z",
  "createdAt": "2025-12-16T08:15:00.000Z",
  "updatedAt": "2025-12-16T08:15:00.000Z",
  "user": {
    "id": 123,
    "username": "teacher1",
    "first_name": "John",
    "last_name": "Doe"
  },
  "class": {
    "classId": 1,
    "name": "Grade 1A"
  }
}
```

#### Notes
- If user is a TEACHER with `requiresApproval=true`, `approvalStatus` will be set to `PENDING`
- Director receives notification when approval is required
- `hoursWorked` is automatically calculated from check-in and check-out times
- `isCheckedOut` indicates whether user has checked out

---

### 2. Bulk Create Attendance

**POST** `/attendance/bulk`

Creates multiple attendance records in one request.

#### Request Body
```json
{
  "records": [
    {
      "userId": 123,
      "classId": 1,
      "date": "2025-12-16",
      "status": "PRESENT",
      "checkInTime": "2025-12-16T08:00:00Z"
    },
    {
      "userId": 124,
      "classId": 1,
      "date": "2025-12-16",
      "status": "LATE",
      "checkInTime": "2025-12-16T08:30:00Z"
    }
  ]
}
```

#### Response (201 Created)
```json
{
  "successful": [
    { /* attendance record 1 */ },
    { /* attendance record 2 */ }
  ],
  "failed": [],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

### 3. Update Attendance (Check-out)

**PATCH** `/attendance/:id`

Updates an existing attendance record. Commonly used for checking out.

#### Request Body
```json
{
  "checkOutTime": "2025-12-16T17:30:00Z"
}
```

#### All Updatable Fields
```json
{
  "classId": 1,
  "userId": 123,
  "date": "2025-12-16",
  "status": "PRESENT",
  "reason": "Updated reason",
  "checkInTime": "2025-12-16T08:15:00Z",
  "checkOutTime": "2025-12-16T17:30:00Z"
}
```

#### Response (200 OK)
```json
{
  "id": 1,
  "checkInTime": "2025-12-16T08:15:00.000Z",
  "checkOutTime": "2025-12-16T17:30:00.000Z",
  "hoursWorked": 9.25,
  "isCheckedOut": true,
  "approvalStatus": "PENDING"
  // ... other fields
}
```

#### Notes
- Can update check-out time even if approval is PENDING
- `hoursWorked` recalculated automatically
- One approval covers both check-in and check-out

---

### 4. Bulk Update Attendance

**PATCH** `/attendance/bulk`

Updates multiple attendance records in one request.

#### Request Body
```json
{
  "records": [
    {
      "id": 1,
      "checkOutTime": "2025-12-16T17:30:00Z"
    },
    {
      "id": 2,
      "checkOutTime": "2025-12-16T17:45:00Z"
    }
  ]
}
```

#### Response (200 OK)
```json
{
  "successful": [
    { /* updated record 1 */ },
    { /* updated record 2 */ }
  ],
  "failed": [],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

### 5. Get All Attendance Records

**GET** `/attendance`

Retrieves paginated list of attendance records with filters.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10, max: 400) |
| classId | number | No | Filter by class ID |
| userId | number | No | Filter by user ID |
| date | string | No | Filter by specific date (YYYY-MM-DD) |
| startDate | string | No | Filter from date (YYYY-MM-DD) |
| endDate | string | No | Filter to date (YYYY-MM-DD) |
| studentName | string | No | Search by student name |

#### Example Request
```
GET /attendance?page=1&limit=10&userId=123&startDate=2025-12-01&endDate=2025-12-31
```

#### Response (200 OK)
```json
{
  "data": [
    {
      "id": 1,
      "userId": 123,
      "checkInTime": "2025-12-16T08:15:00.000Z",
      "checkOutTime": "2025-12-16T17:30:00.000Z",
      "hoursWorked": 9.25,
      "isCheckedOut": true
      // ... other fields
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### 6. Get Single Attendance Record

**GET** `/attendance/:id`

Retrieves a specific attendance record by ID.

#### Response (200 OK)
```json
{
  "id": 1,
  "userId": 123,
  "classId": 1,
  "date": "2025-12-16T00:00:00.000Z",
  "status": "PRESENT",
  "checkInTime": "2025-12-16T08:15:00.000Z",
  "checkOutTime": "2025-12-16T17:30:00.000Z",
  "hoursWorked": 9.25,
  "isCheckedOut": true,
  "approvalStatus": "APPROVED"
  // ... other fields
}
```

---

### 7. Delete Attendance Record

**DELETE** `/attendance/:id`

Deletes an attendance record by ID.

#### Response (200 OK)
```json
{
  "message": "Attendance record deleted successfully"
}
```

---

### 8. Get Attendance Summary

**GET** `/attendance/summary/:userId`

Gets attendance statistics for a specific user.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date (YYYY-MM-DD) |
| endDate | string | No | End date (YYYY-MM-DD) |

#### Response (200 OK)
```json
{
  "userId": 123,
  "user": {
    "id": 123,
    "username": "teacher1",
    "first_name": "John",
    "last_name": "Doe"
  },
  "totalRecords": 20,
  "presentCount": 18,
  "absentCount": 1,
  "lateCount": 1,
  "leaveCount": 0,
  "attendancePercentage": 95.00,
  "dateRange": {
    "startDate": "2025-12-01T00:00:00.000Z",
    "endDate": "2025-12-20T00:00:00.000Z"
  }
}
```

---

### 9. Get Attendance Summary with Records

**GET** `/attendance/summary-records/:userId`

Gets attendance statistics with paginated records.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10, max: 400) |
| startDate | string | No | Start date (YYYY-MM-DD) |
| endDate | string | No | End date (YYYY-MM-DD) |

#### Response (200 OK)
```json
{
  "userId": 123,
  "user": { /* user info */ },
  "summary": {
    "totalRecords": 20,
    "presentCount": 18,
    "absentCount": 1,
    "lateCount": 1,
    "leaveCount": 0,
    "attendancePercentage": 95.00,
    "dateRange": { /* date range */ }
  },
  "records": [
    { /* attendance record 1 */ },
    { /* attendance record 2 */ }
  ],
  "page": 1,
  "limit": 10,
  "total": 20,
  "totalPages": 2
}
```

---

## Approval Workflow Endpoints

### 10. Approve/Reject Attendance

**PATCH** `/attendance/:id/approve`

Approves or rejects a teacher's attendance record.

#### Request Body
```json
{
  "approvalStatus": "APPROVED",
  "approvalComments": "Approved - valid reason"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| approvalStatus | enum | Yes | APPROVED or REJECTED |
| approvalComments | string | No | Comments from approver |

#### Response (200 OK)
```json
{
  "id": 1,
  "approvalStatus": "APPROVED",
  "approvedBy": 456,
  "approvedAt": "2025-12-16T20:00:00.000Z",
  "approvalComments": "Approved - valid reason"
  // ... other fields
}
```

#### Notes
- If **APPROVED**: Both check-in and check-out times are approved together
- If **REJECTED**: Entire attendance record is DELETED
- Teacher receives notification in both cases
- One approval covers the entire day (both check-in and check-out)

---

### 11. Get Pending Approvals

**GET** `/attendance/pending/approval`

Gets list of attendance records pending approval.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10, max: 400) |
| schoolId | number | No | Filter by school ID |

#### Example Request
```
GET /attendance/pending/approval?page=1&limit=10&schoolId=103777
```

#### Response (200 OK)
```json
{
  "data": [
    {
      "id": 1,
      "userId": 123,
      "userDetails": {
        "id": 123,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      },
      "date": "2025-12-16T00:00:00.000Z",
      "status": "PRESENT",
      "reason": "Traffic",
      "submittedAt": "2025-12-16T08:15:00.000Z",
      "createdAt": "2025-12-16T08:15:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### Notes
- Only shows teachers from specified school who require approval
- Filters by `teacher.schoolId` and `requiresApproval = true`
- Ordered by `submittedAt` ascending (oldest first)

---

## Check-in/Check-out Workflow

### Typical Flow

#### 1. Teacher Checks In (Morning)
```http
POST /attendance
Content-Type: application/json

{
  "userId": 123,
  "classId": 1,
  "date": "2025-12-16",
  "checkInTime": "2025-12-16T08:15:00Z",
  "status": "PRESENT"
}
```

**Response:** `approvalStatus: "PENDING"` (if requiresApproval)

---

#### 2. Teacher Checks Out (Evening)
```http
PATCH /attendance/1
Content-Type: application/json

{
  "checkOutTime": "2025-12-16T17:30:00Z"
}
```

**Response:**
```json
{
  "id": 1,
  "checkInTime": "2025-12-16T08:15:00.000Z",
  "checkOutTime": "2025-12-16T17:30:00.000Z",
  "hoursWorked": 9.25,
  "isCheckedOut": true,
  "approvalStatus": "PENDING"
}
```

---

#### 3. Director Approves
```http
PATCH /attendance/1/approve
Content-Type: application/json

{
  "approvalStatus": "APPROVED",
  "approvalComments": "Approved"
}
```

**Result:** Both check-in and check-out approved together

---

## Response Fields Reference

### Attendance Response Object

| Field | Type | Description |
|-------|------|-------------|
| id | number | Attendance record ID |
| userId | number | User ID |
| classId | number \| null | Class ID (null for directors/admin) |
| date | Date | Attendance date |
| status | enum | PRESENT, ABSENT, LATE, LEAVE |
| reason | string | Reason for absence or status |
| **checkInTime** | Date | Timestamp when user checked in |
| **checkOutTime** | Date | Timestamp when user checked out |
| **hoursWorked** | number | Hours worked (calculated) |
| **isCheckedOut** | boolean | Whether user has checked out |
| approvalStatus | enum | null, PENDING, APPROVED, REJECTED |
| approvedBy | number | ID of user who approved |
| approvedAt | Date | When it was approved |
| approvalComments | string | Comments from approver |
| submittedAt | Date | When attendance was submitted |
| createdAt | Date | Record creation timestamp |
| updatedAt | Date | Last update timestamp |
| user | object | User details (id, username, first_name, last_name) |
| class | object | Class details (classId, name) |

---

## Status Enums

### AttendanceStatus
- `PRESENT` - User was present
- `ABSENT` - User was absent
- `LATE` - User arrived late
- `LEAVE` - User on leave

### ApprovalStatus
- `null` - Auto-approved (no approval required)
- `PENDING` - Awaiting director approval
- `APPROVED` - Director approved
- `REJECTED` - Director rejected (record deleted)

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid input or duplicate record",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Attendance record with ID 999 not found",
  "error": "Not Found"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

---

## Role-Based Access

| Endpoint | Roles Required |
|----------|----------------|
| POST /attendance | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL |
| POST /attendance/bulk | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL |
| PATCH /attendance/:id | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL |
| PATCH /attendance/bulk | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL |
| GET /attendance | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL, DIRECTOR |
| GET /attendance/:id | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL, DIRECTOR |
| DELETE /attendance/:id | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL, DIRECTOR |
| GET /attendance/summary/:userId | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL, DIRECTOR |
| PATCH /attendance/:id/approve | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL, DIRECTOR |
| GET /attendance/pending/approval | ADMIN, TEACHER, SCHOOLMANAGEMENT, PRINCIPAL, DIRECTOR |

---

## Notes

### Hours Worked Calculation
```typescript
hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60)
// Result rounded to 2 decimal places
// Example: 9.25 hours
```

### Check-out Before Approval
- Teachers can check-out even if check-in is PENDING approval
- Director approves both check-in and check-out together with one action
- If rejected, both times are deleted (entire record removed)

### Multiple Classes Per Day
- Teachers can have multiple attendance records per day
- One record per class (identified by unique userId + classId + date)
- Each record has its own check-in/check-out times
- Each record has separate approval status

---

## Examples

### Example 1: Full Day Workflow

```bash
# 1. Check-in (morning)
curl -X POST http://localhost:3000/api/v1/attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "classId": 1,
    "date": "2025-12-16",
    "checkInTime": "2025-12-16T08:15:00Z"
  }'

# 2. Check-out (evening)
curl -X PATCH http://localhost:3000/api/v1/attendance/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "checkOutTime": "2025-12-16T17:30:00Z"
  }'

# 3. Director approves
curl -X PATCH http://localhost:3000/api/v1/attendance/1/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvalStatus": "APPROVED",
    "approvalComments": "Approved"
  }'
```

### Example 2: Two Shifts in One Day

```bash
# Morning class
curl -X POST http://localhost:3000/api/v1/attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "classId": 1,
    "date": "2025-12-16",
    "checkInTime": "2025-12-16T08:00:00Z",
    "checkOutTime": "2025-12-16T12:00:00Z"
  }'

# Afternoon class
curl -X POST http://localhost:3000/api/v1/attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "classId": 2,
    "date": "2025-12-16",
    "checkInTime": "2025-12-16T13:00:00Z",
    "checkOutTime": "2025-12-16T17:00:00Z"
  }'
```

---

## Changelog

### Version 2.0.0 (2025-12-16)
- Added `checkInTime` and `checkOutTime` fields
- Added calculated `hoursWorked` field
- Added `isCheckedOut` boolean field
- Updated approval workflow to cover both check-in and check-out times
- Maintained backward compatibility with existing approval system

### Version 1.0.0 (Initial)
- Basic attendance CRUD operations
- Approval workflow for teachers
- Bulk operations support
