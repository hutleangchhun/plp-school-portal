import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { classService } from '../../utils/api/services/classService';
import { Card } from '../../components/ui/card';
import { Collapse } from '../../components/ui/Collapse';
import { Users } from 'lucide-react';

export default function TeacherClasses({ user }) {
  const { t } = useLanguage();
  const [classes, setClasses] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [studentsByClass, setStudentsByClass] = useState({});

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;
      try {
        // Fetch classes assigned to this teacher/user using the BY_USER endpoint
        const res = await classService.getClassByUser(user.id);
        console.log('Classes for user:', res);
        if (res.success && Array.isArray(res.classes)) {
          setClasses(res.classes);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    }
    fetchClasses();
  }, [user]);

  const handleExpand = async (classId) => {
    setExpanded(expanded === classId ? null : classId);
    if (!studentsByClass[classId]) {
      try {
        // Fetch students for this class using classService
        const res = await classService.getClassStudents(classId);
        console.log('Students for class', classId, ':', res);
        if (res.data && Array.isArray(res.data)) {
          setStudentsByClass(prev => ({ ...prev, [classId]: res.data }));
        }
      } catch (error) {
        console.error('Error fetching students for class:', error);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">{t('yourClasses', 'Your Classes')}</h2>
      {classes.length === 0 ? (
        <div className="text-gray-500">{t('noClassesAssigned', 'No classes assigned.')}</div>
      ) : (
        classes.map(cls => (
          <Card key={cls.id} className="mb-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpand(cls.id)}>
              <div>
                <div className="font-semibold text-lg">{cls.name || t('class', 'Class')} {cls.className || ''}</div>
                <div className="text-sm text-gray-500">{t('classId', 'Class ID')}: {cls.id}</div>
              </div>
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <Collapse isOpen={expanded === cls.id}>
              <div className="mt-2">
                <h4 className="font-medium mb-2">{t('students', 'Students')}</h4>
                {studentsByClass[cls.id] ? (
                  studentsByClass[cls.id].length > 0 ? (
                    <ul className="list-disc pl-5">
                      {studentsByClass[cls.id].map(stu => (
                        <li key={stu.id} className="mb-1">{stu.name} <span className="text-xs text-gray-400">({stu.studentId || stu.username})</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-400">{t('noStudentsInClass', 'No students in this class.')}</div>
                  )
                ) : (
                  <div className="text-gray-400">{t('loading', 'Loading...')}</div>
                )}
              </div>
            </Collapse>
          </Card>
        ))
      )}
    </div>
  );
}
