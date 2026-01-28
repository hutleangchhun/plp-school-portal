import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { classService } from '../../utils/api/services/classService';
import { Users, BookOpen } from 'lucide-react';
import ClassCard from '../../components/ui/ClassCard';
import EmptyState from '@/components/ui/EmptyState';

export default function TeacherClasses({ user }) {
  const { t } = useLanguage();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;
      try {
        // Fetch classes assigned to this teacher/user
        const res = await classService.getMyClasses();
        console.log('Classes for user:', res);
        if (res.data && Array.isArray(res.data)) {
          setClasses(res.data);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    }
    fetchClasses();
  }, [user]);

  return (
    <div className="p-6">
      <div className='bg-white p-4 border-2 rounded-lg border-gray-100 shadow-sm'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='h-10 w-10 bg-blue-100 rounded-lg border border-blue-200 flex items-center justify-center'>
            <BookOpen className="inline h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base mb-4">{t('yourClasses', 'Your Classes')}</h2>
          </div>
        </div>
        {classes.length === 0 ? (
          <div className='mx-auto w-full'>
            <EmptyState
              icon={Users}
              title={t('noClassesAssigned', 'No classes assigned.')}
              description={t('contactAdminToAssignClasses', 'Please contact your administrator to assign classes.')}
              variant="info"
            />
          </div>
        ) : (
          classes.map(cls => (
            <div className='grid grid-cols-4 gap-2'>
              <ClassCard
                key={cls.id}
                title={cls.name || t('untitledClass', 'Untitled Class')}
                subtitleParts={[
                  cls.grade ? `${t('gradeLevel', 'Grade Level')} ${cls.grade}` : null,
                  cls.section ? `${t('section', 'Section')} ${cls.section}` : null,
                  cls.academicYear || null,
                  user ? user.name : null,
                ].filter(Boolean)}
                enrolled={cls.enrolledCount || 0}
                capacity={cls.maxStudents || 0}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
