import { OctagonAlert } from 'lucide-react';
import StudentTableRow from './StudentTableRow';

const BulkImportTable = ({
  students,
  columns,
  schoolName,
  updateCell,
  removeRow,
  isCellInvalid,
  isCellSelected,
  handleCellClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleCellMouseUp,
  selectedRange,
  tableRef
}) => {
  // Function to check if any student has father information
  const hasAnyFatherInfo = () => {
    return students.some(student => student.fatherFirstName && student.fatherFirstName.trim());
  };

  // Function to check if any student has mother information
  const hasAnyMotherInfo = () => {
    return students.some(student => student.motherFirstName && student.motherFirstName.trim());
  };

  // Function to get dynamic header text with conditional asterisk
  const getHeaderText = (column) => {
    if (column.key === 'fatherPhone' && !hasAnyFatherInfo()) {
      // Remove asterisk if no father info provided
      return column.header.replace('*', '').trim();
    }
    if (column.key === 'motherPhone' && !hasAnyMotherInfo()) {
      // Remove asterisk if no mother info provided
      return column.header.replace('*', '').trim();
    }
    return column.header;
  };

  // Function to count columns for each section
  const getColumnCounts = () => {
    const nonActionColumns = columns.filter(col => col.key !== 'actions');

    let studentInfoCount = 0;
    let fatherInfoCount = 0;
    let motherInfoCount = 0;
    let additionalInfoCount = 0;

    nonActionColumns.forEach(col => {
      if (['lastName', 'firstName', 'username', 'password', 'email', 'dateOfBirth', 'gender', 'phone', 'nationality', 'schoolId', 'academicYear', 'gradeLevel', 'residenceFullAddress'].includes(col.key)) {
        studentInfoCount++;
      } else if (['fatherFirstName', 'fatherLastName', 'fatherPhone', 'fatherOccupation', 'fatherDateOfBirth', 'fatherResidenceFullAddress'].includes(col.key)) {
        fatherInfoCount++;
      } else if (['motherFirstName', 'motherLastName', 'motherPhone', 'motherOccupation', 'motherDateOfBirth', 'motherResidenceFullAddress'].includes(col.key)) {
        motherInfoCount++;
      } else if (['ethnicGroup', 'accessibility'].includes(col.key)) {
        additionalInfoCount++;
      }
    });

    return { studentInfoCount, fatherInfoCount, motherInfoCount, additionalInfoCount };
  };

  const { studentInfoCount, fatherInfoCount, motherInfoCount, additionalInfoCount } = getColumnCounts();

  return (
    <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200 bg-transparent">
      <div className="bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">តារាងបញ្ចូលសិស្ស</h2>
        <div className='text-sm flex justify-between items-center gap-4 flex-col sm:flex-row'>
          <div>
            <p>សូមបំពេញព័ត៌មានសិស្សនៅក្នុងតារាងខាងក្រោម ឬនាំចូលពីឯកសារ Excel។</p>
          </div>
          <div className='text-red-600 flex justify-between items-center'>
            <OctagonAlert className="h-5 w-5 mr-1" />
            <div className='pt-1'><p>ចំណាំ៖ អ្នកអាចបន្ថែមបានច្រើនបំផុត 70 នាក់ក្នុងមួយពេល</p></div>
          </div>
        </div>
      </div>
      <div className="relative overflow-auto" ref={tableRef} style={{ position: 'relative', zIndex: 10, height: '600px' }}>
        <table className="min-w-full border-collapse bg-white">
          <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
            {/* Main Header Row */}
            <tr className="border-b border-gray-300">
              <th rowSpan="2" className="w-12 px-3 py-3 text-center text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50">
                #
              </th>
              {/* Student Basic Info */}
              {studentInfoCount > 0 && (
                <th colSpan={studentInfoCount} className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-blue-100 border-r border-gray-200">
                  ព័ត៌មានសិស្ស
                </th>
              )}
              {/* Father Info */}
              {fatherInfoCount > 0 && (
                <th colSpan={fatherInfoCount} className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-green-100 border-r border-gray-200">
                  ព័ត៌មានឪពុក
                </th>
              )}
              {/* Mother Info */}
              {motherInfoCount > 0 && (
                <th colSpan={motherInfoCount} className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-rose-100 border-r border-gray-200">
                  ព័ត៌មានម្តាយ
                </th>
              )}
              {/* Additional Info */}
              {additionalInfoCount > 0 && (
                <th colSpan={additionalInfoCount} className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-amber-100 border-r border-gray-200">
                  ព័ត៌មានបន្ថែម
                </th>
              )}
              {/* Actions Column */}
              <th rowSpan="2" className="w-20 px-3 py-3 text-center text-xs font-medium text-gray-700 bg-gray-50 sticky right-0 border-l border-gray-300 shadow-lg">
                សកម្មភាព
              </th>
            </tr>
            {/* Sub Header Row */}
            <tr>
              {columns.filter(col => col.key !== 'actions').map((column, colIndex) => (
                <th
                  key={column.key}
                  className={`px-3 py-3 text-center text-xs font-medium text-gray-700 border-r border-gray-200 bg-gray-50 ${column.width}`}
                >
                  {getHeaderText(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {students.map((student, rowIndex) => (
              <StudentTableRow
                key={rowIndex}
                student={student}
                rowIndex={rowIndex}
                columns={columns}
                schoolName={schoolName}
                updateCell={updateCell}
                removeRow={removeRow}
                isCellInvalid={isCellInvalid}
                isCellSelected={isCellSelected}
                handleCellClick={handleCellClick}
                handleCellMouseDown={handleCellMouseDown}
                handleCellMouseEnter={handleCellMouseEnter}
                handleCellMouseUp={handleCellMouseUp}
                selectedRange={selectedRange}
                studentsLength={students.length}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BulkImportTable;
