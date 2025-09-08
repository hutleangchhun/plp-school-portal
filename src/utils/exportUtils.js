import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

export const exportToExcel = (data, filename = 'students_data.xlsx', t = null) => {
  try {
    // Use Khmer translations if t function is provided
    const headers = {
      name: t ? t('name') : 'Name',
      username: t ? t('username') : 'Username', 
      email: t ? t('email') : 'Email',
      phone: t ? t('phone') : 'Phone',
      status: t ? t('status') : 'Status',
      dateAdded: t ? t('date') : 'Date Added'
    };
    
    const statusLabels = {
      active: t ? t('active') : 'Active',
      inactive: t ? t('inactive') : 'Inactive'
    };
    
    // Transform data to a more readable format
    const transformedData = data.map(student => ({
      [headers.name]: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'N/A',
      [headers.username]: student.username || 'N/A',
      [headers.email]: student.email || 'N/A',
      [headers.phone]: student.phone || 'N/A',
      [headers.status]: student.isActive ? statusLabels.active : statusLabels.inactive,
      [headers.dateAdded]: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'
    }));

    // Create a new workbook
    const ws = XLSX.utils.json_to_sheet(transformedData);
    const wb = XLSX.utils.book_new();
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    
    // Auto-size columns
    const range = XLSX.utils.decode_range(ws['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 0;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    ws['!cols'] = colWidths;
    
    // Write the file
    XLSX.writeFile(wb, filename);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

export const exportToCSV = (data, filename = 'students_data.csv', t = null) => {
  try {
    // Use Khmer translations if t function is provided
    const headers = {
      name: t ? t('name') : 'Name',
      username: t ? t('username') : 'Username', 
      email: t ? t('email') : 'Email',
      phone: t ? t('phone') : 'Phone',
      status: t ? t('status') : 'Status',
      dateAdded: t ? t('date') : 'Date Added'
    };
    
    const statusLabels = {
      active: t ? t('active') : 'Active',
      inactive: t ? t('inactive') : 'Inactive'
    };
    
    // Transform data to a more readable format
    const transformedData = data.map(student => ({
      [headers.name]: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'N/A',
      [headers.username]: student.username || 'N/A',
      [headers.email]: student.email || 'N/A',
      [headers.phone]: student.phone || 'N/A',
      [headers.status]: student.isActive ? statusLabels.active : statusLabels.inactive,
      [headers.dateAdded]: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'
    }));

    // Convert to CSV
    const csvHeaders = Object.keys(transformedData[0] || {});
    const csvContent = [
      csvHeaders.join(','), // Header row
      ...transformedData.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
    return true;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export to CSV');
  }
};

export const exportToPDF = async (data, classInfo, filename = 'students_data.pdf', t = null) => {
  try {
    // Use Khmer translations if t function is provided
    const labels = {
      title: t ? t('studentManagementReport') : 'Student Management Report',
      class: t ? t('class') : 'Class',
      grade: t ? t('grade') : 'Grade',
      section: t ? t('section') : 'Section',
      academicYear: t ? t('academicYear') : 'Academic Year',
      generated: t ? t('generated') : 'Generated',
      name: t ? t('name') : 'Name',
      username: t ? t('username') : 'Username',
      email: t ? t('email') : 'Email',
      phone: t ? t('phone') : 'Phone',
      status: t ? t('status') : 'Status',
      totalStudents: t ? t('totalStudents') : 'Total Students',
      active: t ? t('active') : 'Active',
      inactive: t ? t('inactive') : 'Inactive'
    };
    
    // Create a temporary HTML element for rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Hanuman, Khmer UI, Noto Sans Khmer, Arial Unicode MS, Arial, sans-serif';
    
    // Create HTML content with proper Unicode support
    const htmlContent = `
      <div style="font-family: 'Hanuman', 'Khmer UI', 'Noto Sans Khmer', 'Arial Unicode MS', 'Arial', sans-serif; padding: 20px; background: white;">
        <h1 style="font-size: 24px; margin-bottom: 20px; color: #1f2937;">${labels.title}</h1>
        
        ${classInfo ? `
          <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
            <p><strong>${labels.class}:</strong> ${classInfo.name || 'N/A'}</p>
            <p><strong>${labels.grade}:</strong> ${classInfo.gradeLevel || 'N/A'} | <strong>${labels.section}:</strong> ${classInfo.section || 'N/A'}</p>
            <p><strong>${labels.academicYear}:</strong> ${classInfo.academicYear || 'N/A'}</p>
            <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        ` : `
          <div style="margin-bottom: 20px; font-size: 14px;">
            <p><strong>${labels.generated}:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        `}
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.name}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.username}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.email}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.phone}</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${labels.status}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((student, index) => {
              const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'N/A';
              const username = student.username || 'N/A';
              const email = student.email || 'N/A';
              const phone = student.phone || 'N/A';
              const status = student.isActive ? labels.active : labels.inactive;
              const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
              
              return `
                <tr style="background-color: ${bgColor};">
                  <td style="border: 1px solid #ddd; padding: 8px;">${name}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${username}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${email}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${phone}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    <span style="color: ${student.isActive ? '#10b981' : '#6b7280'};">${status}</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          <p><strong>${labels.totalStudents}:</strong> ${data.length}</p>
        </div>
      </div>
    `;
    
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    
    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);
      
      return true;
    } finally {
      // Clean up the temporary element
      document.body.removeChild(tempDiv);
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export to PDF');
  }
};

// Helper function to get current timestamp for filenames
export const getTimestampedFilename = (baseName, extension) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `${baseName}_${timestamp}.${extension}`;
};