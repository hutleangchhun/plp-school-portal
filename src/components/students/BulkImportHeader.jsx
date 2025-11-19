import { useRef } from 'react';
import { Plus, Upload, Download, Save, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/Button';

const BulkImportHeader = ({ 
  onExcelImport, 
  onDownloadTemplate, 
  onAddRow, 
  onSubmit, 
  loading, 
  schoolId,
  canSubmit
}) => {
  const fileInputRef = useRef(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ការចុះឈ្មោះសិស្ស
            </h1>
            <p className="text-gray-600 text-sm">
              ការចុះឈ្មោះសិស្សសម្រាប់ប្រើប្រាស់ប្រព័ន្ធPLP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Excel/CSV Import */}
          <label className="inline-block">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onExcelImport}
              className="hidden"
            />
            <div className="inline-flex items-center px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
              នាំចូល Excel/CSV
            </div>
          </label>

          {/* Download Template */}
          <Button
            onClick={onDownloadTemplate}
            variant="outline"
            size="sm"
          >
            <Download className="h-5 w-5 mr-2" />
            ទាញយកគំរូ
          </Button>

          <Button
            onClick={onAddRow}
            variant="outline"
            size="sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            បន្ថែមជួរ
          </Button>
          <Button
            onClick={onSubmit}
            variant="primary"
            size="sm"
            disabled={loading || !schoolId || !canSubmit}
          >
            <Save className="h-5 w-5 mr-2" />
            {loading ? 'កំពុងនាំចូល...' : 'នាំចូល'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportHeader;
