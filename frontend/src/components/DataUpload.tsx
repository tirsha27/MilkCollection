// src/components/DataUpload.tsx
import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DataUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);
  const API_BASE = "http://localhost:8000/api/v1";

  // -----------------------------
  // Excel Upload → Backend
  // -----------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, dataType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      // ✅ Make sure we send FormData, not JSON
      const formData = new FormData();
      formData.append("file", file);

      let endpoint = "";
      if (dataType === "chilling_centers") endpoint = `${API_BASE}/storage-hubs/upload`;
      else if (dataType === "vehicles") endpoint = `${API_BASE}/fleet/upload`;
      else if (dataType === "farmers") endpoint = `${API_BASE}/vendors/upload`;

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Upload failed (${res.status})`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Upload failed");
      }

      // Notify pages like ChillingCenters.tsx
      window.dispatchEvent(new CustomEvent("data-uploaded", { detail: { type: dataType } }));

      setUploadResult({
        type: "success",
        message: data.message,
        details: `Inserted: ${data.inserted_count || 0}, Failed: ${data.failed_count || 0}`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadResult({
        type: "error",
        message: "Failed to upload Excel file",
        details: error.message,
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // -----------------------------
  // ✅ FIXED: Download Excel Template
  // -----------------------------
  const downloadTemplate = (dataType: string) => {
    let headers: string[] = [];
    let sampleData: any[][] = [];

    if (dataType === 'chilling_centers') {
      headers = ['Hub Name', 'Location', 'Contact', 'Latitude', 'Longitude', 'Capacity (Liters)'];
      sampleData = [
        ['Central Hub Guntur', 'Guntur District', '9876543220', 16.3067, 80.4365, 5000],
        ['Vijayawada Collection Center', 'Krishna District', '9876543221', 16.5062, 80.6480, 8000],
        ['Tenali Storage Hub', 'Guntur District', '9876543222', 16.2428, 80.6428, 6000]
      ];
    } else if (dataType === 'vehicles') {
      headers = ['Vehicle Name', 'Vehicle Number', 'Category', 'Capacity (Cans)', 'Model', 'Manufacturer', 'Fuel Type', 'Driver Name', 'Driver Contact', 'Avg Speed (kmph)'];
      sampleData = [
        ['Mini Van 1', 'AP01AB1234', 'mini', 50, 'Eeco', 'Maruti Suzuki', 'Diesel', 'Rajesh', '9876543230', 40],
        ['Small Truck 1', 'AP02CD5678', 'small', 100, 'Ace', 'Tata', 'Diesel', 'Suresh', '9876543231', 45],
        ['Mini Van 2', 'AP03EF9012', 'mini', 50, 'Supro', 'Mahindra', 'CNG', 'Ramesh', '9876543232', 40]
      ];
    } else if (dataType === 'farmers') {
      headers = ['Vendor Name', 'Village/Area', 'Contact', 'Latitude', 'Longitude', 'Milk Quantity (Cans)'];
      sampleData = [
        ['Ramesh Kumar', 'Guntur', '9876543210', 16.3067, 80.4365, 5],
        ['Lakshmi Devi', 'Vijayawada', '9876543211', 16.5062, 80.6480, 8],
        ['Venkata Rao', 'Tenali', '9876543212', 16.2428, 80.6428, 6]
      ];
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet data: headers + sample rows
    const wsData = [headers, ...sampleData];
    
    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Write and download file
    XLSX.writeFile(wb, `${dataType}_template.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Data Upload</h2>
        <p className="text-slate-600 mt-1">Import master data from Excel files</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Excel File Format</h3>
            <p className="text-sm text-blue-800 leading-relaxed mb-3">
              Upload Excel files (.xlsx or .xls). The first row should contain column headers.
              Download the template files below to see the expected format for each data type.
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use .xlsx format</li>
              <li>First row must contain headers</li>
              <li>Ensure data types match the expected format</li>
              <li>Empty cells will be treated as null</li>
            </ul>
          </div>
        </div>
      </div>

      {uploadResult && (
        <div
          className={`rounded-xl p-6 border ${
            uploadResult.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-4">
            {uploadResult.type === 'success' ? (
              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
            )}
            <div>
              <h3
                className={`font-semibold mb-2 ${
                  uploadResult.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {uploadResult.message}
              </h3>
              {uploadResult.details && (
                <pre
                  className={`text-sm whitespace-pre-wrap ${
                    uploadResult.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {uploadResult.details}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { type: 'chilling_centers', title: 'Chilling Centers', color: 'blue' },
          { type: 'vehicles', title: 'Vehicles', color: 'green' },
          { type: 'farmers', title: 'Farmers', color: 'amber' },
        ].map(({ type, title, color }) => (
          <div key={type} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`h-12 w-12 bg-${color}-100 rounded-lg flex items-center justify-center`}
              >
                <FileSpreadsheet className={`h-6 w-6 text-${color}-600`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Upload Excel file with {title.toLowerCase()} details.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => downloadTemplate(type)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileUpload(e, type)}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}