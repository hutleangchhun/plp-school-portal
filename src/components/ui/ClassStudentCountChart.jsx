import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import classService from '../../utils/api/services/classService';

export default function ClassStudentCountChart({ schoolId, className = "" }) {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const [classesData, setClassesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClassStudentCounts = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      startLoading('fetchClassStudentCounts', t('loadingChartData', 'Loading chart data...'));

      // First, get all classes for the school
      const classesResponse = await classService.getBySchool(schoolId);

      if (classesResponse.success && Array.isArray(classesResponse.classes) && classesResponse.classes.length > 0) {
        // For each class, get the student count
        const classesWithCounts = [];

        for (const classItem of classesResponse.classes) {
          try {
            // Get students for this class
            const studentsResponse = await classService.getClassStudents(classItem.id);

            const studentCount = studentsResponse.data ? studentsResponse.data.length : 0;

            classesWithCounts.push({
              className: classItem.name || `${t('grade', 'Grade')} ${classItem.gradeLevel}${classItem.section ? ` ${classItem.section}` : ''}`,
              students: studentCount,
              classId: classItem.id,
              gradeLevel: classItem.gradeLevel
            });
          } catch (studentError) {
            console.warn(`Failed to get students for class ${classItem.id}:`, studentError);
            // Still include the class with 0 students
            classesWithCounts.push({
              className: classItem.name || `${t('grade', 'Grade')} ${classItem.gradeLevel}${classItem.section ? ` ${classItem.section}` : ''}`,
              students: 0,
              classId: classItem.id,
              gradeLevel: classItem.gradeLevel
            });
          }
        }

        // Sort by grade level and then by class name
        classesWithCounts.sort((a, b) => {
          if (a.gradeLevel !== b.gradeLevel) {
            return parseInt(a.gradeLevel) - parseInt(b.gradeLevel);
          }
          return a.className.localeCompare(b.className);
        });

        setClassesData(classesWithCounts);
      } else {
        setClassesData([]);
      }
    } catch (err) {
      console.error('Failed to fetch class student counts:', err);
      setError(err.message);
      setClassesData([]);
    } finally {
      setLoading(false);
      stopLoading('fetchClassStudentCounts');
    }
  }, [schoolId, t, startLoading, stopLoading]);

  useEffect(() => {
    fetchClassStudentCounts();
  }, [fetchClassStudentCounts]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div className='grid gap-2'>
          <h3 className="text-md font-bold text-gray-900">
            {t('classStudentCounts', 'Class Student Counts')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('studentsPerClass', 'Number of students in each class')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          {t('loadingChartData', 'Loading chart data...')}
        </div>
      ) : error ? (
        <div className="h-[300px] flex items-center justify-center text-red-500">
          {t('errorLoadingChart', 'Error loading chart data')}
        </div>
      ) : classesData.length > 0 ? (
        <ChartContainer
          config={{
            students: {
              label: t('students', 'Students'),
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[350px]"
        >
          <BarChart data={classesData}>
            <XAxis
              dataKey="className"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              height={80}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            <Bar
              dataKey="students"
              fill="var(--color-students)"
              radius={[4, 4, 0, 0]}
              cursor={false}
              style={{ cursor: 'default' }}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <LabelList
                dataKey="students"
                position="top"
                offset={5}
                style={{
                  fill: '#374151',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAnchor: 'middle'
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          {t('noDataAvailable', 'No data available')}
        </div>
      )}
    </div>
  );
}