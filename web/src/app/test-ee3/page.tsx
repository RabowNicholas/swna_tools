'use client';

import { useState } from 'react';

export default function TestEE3Page() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');

  const generateTestPDF = async () => {
    setIsGenerating(true);
    setStatus('Generating test EE-3 form...');

    try {
      // Sample client record
      const clientRecord = {
        fields: {
          Name: 'Williams, Robert - 1234',
          'Case ID': 'DEF456',
          'Social Security Number': '123456789',
        },
      };

      // Comprehensive sample form data
      const formData = {
        // Employee Information
        first_name: 'Robert',
        last_name: 'Williams',
        former_name: 'Bob Williams',
        ssn: '123-45-6789',

        // Employee Contact Information
        employee_address: '456 Oak Avenue',
        employee_city: 'Santa Fe',
        employee_state: 'NM',
        employee_zip: '87501',
        phone_home: '(505) 555-1234',
        phone_work: '(505) 555-5678',
        phone_cell: '(505) 555-9999',

        // Contact Person Information
        contact_first_name: 'Maria',
        contact_last_name: 'Williams',
        contact_address: '456 Oak Avenue',
        contact_city: 'Santa Fe',
        contact_state: 'NM',
        contact_zip: '87501',

        // Employment History with 3 employers
        employment_history: [
          {
            start_date: '1980-03-15',
            end_date: '1985-08-30',
            facility_name: 'Los Alamos National Laboratory',
            specific_location: 'Technical Area 21',
            city: 'Los Alamos',
            state: 'NM',
            contractor: 'University of California',
            position_title: 'Nuclear Technician',
            work_duties:
              'Handling radioactive materials in controlled laboratory environment, performing routine equipment maintenance and calibration procedures',
            union_member: true,
            dosimetry_worn: true,
          },
          {
            start_date: '1985-09-01',
            end_date: '1992-12-31',
            facility_name: 'Pantex Plant',
            specific_location: 'Assembly Building 12-44',
            city: 'Amarillo',
            state: 'TX',
            contractor: 'Mason & Hanger Corporation',
            position_title: 'Weapons Assembly Technician',
            work_duties:
              'Nuclear weapon assembly and disassembly operations, high explosives handling, beryllium machining',
            union_member: true,
            dosimetry_worn: true,
          },
          {
            start_date: '1993-01-15',
            end_date: '2000-06-30',
            facility_name: 'Sandia National Laboratories',
            specific_location: 'Area IV',
            city: 'Albuquerque',
            state: 'NM',
            contractor: 'Sandia Corporation',
            position_title: 'Senior Research Technician',
            work_duties:
              'Research and development of nuclear weapons components, testing and evaluation procedures',
            union_member: true,
            dosimetry_worn: true,
          },
        ],
      };

      setStatus('Sending request to API...');

      // Call the API route
      const response = await fetch('/api/generate/ee3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_record: clientRecord,
          doctor: '',
          form_data: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setStatus('PDF generated! Downloading...');

      // Get the PDF blob and download it
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'EE3_test.pdf'
        : 'EE3_test.pdf';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(`✅ Successfully generated: ${filename}`);
    } catch (error) {
      console.error('Error generating EE-3:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            EE-3 Form Test Generator
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Click the button below to generate a test EE-3 form with comprehensive sample data.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Sample Data Included:</h2>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Employee: Williams, Robert (SSN: 123-45-6789)</li>
              <li>• Former name: Bob Williams</li>
              <li>• Complete contact information</li>
              <li>• Contact person: Maria Williams</li>
              <li>• 3 employment records:</li>
              <li className="ml-6">- Los Alamos National Laboratory (1980-1985)</li>
              <li className="ml-6">- Pantex Plant (1985-1992)</li>
              <li className="ml-6">- Sandia National Laboratories (1993-2000)</li>
              <li>• Work duties, union membership, and dosimetry badges</li>
            </ul>
          </div>

          <button
            onClick={generateTestPDF}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate Test EE-3 PDF'}
          </button>

          {status && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">{status}</p>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">What to Check:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>✓ Employee name and SSN alignment on page 1</li>
              <li>✓ Former name field placement</li>
              <li>✓ All 3 employer sections (1 on page 1, 2 on page 2)</li>
              <li>✓ Employment dates formatted as MM/DD/YYYY</li>
              <li>✓ Facility names, locations, and contractors</li>
              <li>✓ Work duties text wrapping (max 4 lines)</li>
              <li>✓ Union member checkboxes (checked for Pantex)</li>
              <li>✓ Dosimetry checkboxes (all checked)</li>
              <li>✓ All text properly aligned with template fields</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
