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
              <th colSpan="14" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-blue-100 border-r border-gray-200">
                ព័ត៌មានសិស្ស
              </th>
              {/* Father Info */}
              <th colSpan="6" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-green-100 border-r border-gray-200">
                ព័ត៌មានឪពុក
              </th>
              {/* Mother Info */}
              <th colSpan="6" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-rose-100 border-r border-gray-200">
                ព័ត៌មានម្តាយ
              </th>
              {/* Additional Info */}
              <th colSpan="2" className="px-3 py-3 text-center text-xs font-bold text-gray-800 bg-amber-100 border-r border-gray-200">
                ព័ត៌មានបន្ថែម
              </th>
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
                  {column.header}
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
