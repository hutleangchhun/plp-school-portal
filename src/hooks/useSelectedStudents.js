import { useState, useCallback, useEffect } from 'react';

const useSelectedStudents = () => {
  // Initialize from localStorage if available
  const [selectedStudents, setSelectedStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedStudents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [selectedStudentsData, setSelectedStudentsData] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedStudentsData');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever selection changes (with throttling to prevent excessive writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('selectedStudents', JSON.stringify(selectedStudents));
    }, 100); // Debounce localStorage writes
    return () => clearTimeout(timeoutId);
  }, [selectedStudents]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('selectedStudentsData', JSON.stringify(selectedStudentsData));
    }, 100); // Debounce localStorage writes
    return () => clearTimeout(timeoutId);
  }, [selectedStudentsData]);

  const handleSelectStudent = useCallback((student) => {
    const studentId = student.id;
    
    console.log('Selecting/Deselecting student:', student.name, 'ID:', studentId);
    
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        // Remove from selection
        console.log('Removing student from selection');
        setSelectedStudentsData(prevData => {
          const newData = { ...prevData };
          delete newData[studentId];
          return newData;
        });
        return prev.filter(id => id !== studentId);
      } else {
        // Add to selection and store complete student data
        console.log('Adding student to selection with data:', student);
        setSelectedStudentsData(prevData => ({
          ...prevData,
          [studentId]: {
            id: student.id,
            name: student.name,
            firstName: student.firstName,
            lastName: student.lastName,
            username: student.username,
            email: student.email,
            studentId: student.studentId,
            isActive: student.isActive,
            // Additional fields needed for StudentsManagement operations
            classId: student.classId,
            class_id: student.class_id,
            class: student.class,
            userId: student.userId,
            user_id: student.user_id,
            schoolId: student.schoolId,
            school_id: student.school_id
          }
        }));
        return [...prev, studentId];
      }
    });
  }, []);

  const removeStudent = useCallback((studentId) => {
    setSelectedStudents(prev => prev.filter(id => id !== studentId));
    setSelectedStudentsData(prevData => {
      const newData = { ...prevData };
      delete newData[studentId];
      return newData;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelectedStudents([]);
    setSelectedStudentsData({});
    // Also clear from localStorage
    localStorage.removeItem('selectedStudents');
    localStorage.removeItem('selectedStudentsData');
  }, []);

  const isSelected = useCallback((studentId) => {
    return selectedStudents.includes(studentId);
  }, [selectedStudents]);

  const getSelectedStudentsData = useCallback(() => {
    return selectedStudents.map(id => selectedStudentsData[id]).filter(Boolean);
  }, [selectedStudents, selectedStudentsData]);

  return {
    selectedStudents,
    selectedStudentsData,
    handleSelectStudent,
    removeStudent,
    clearAll,
    isSelected,
    getSelectedStudentsData,
    selectedCount: selectedStudents.length
  };
};

export default useSelectedStudents;