/**
 * Test script for EE-3 Form Generator
 * Run with: node test-ee3.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample client record
const clientRecord = {
  fields: {
    Name: "Williams, Robert - 1234",
    'Case ID': "DEF456",
    'Social Security Number': "123456789",
  }
};

// Comprehensive sample form data
const formData = {
  // Employee Information
  first_name: "Robert",
  last_name: "Williams",
  former_name: "Bob Williams",
  ssn: "123-45-6789",

  // Employee Contact Information
  employee_address: "456 Oak Avenue",
  employee_city: "Santa Fe",
  employee_state: "NM",
  employee_zip: "87501",
  phone_home: "(505) 555-1234",
  phone_work: "(505) 555-5678",
  phone_cell: "(505) 555-9999",

  // Contact Person Information
  contact_first_name: "Maria",
  contact_last_name: "Williams",
  contact_address: "456 Oak Avenue",
  contact_city: "Santa Fe",
  contact_state: "NM",
  contact_zip: "87501",

  // Employment History with 3 employers
  employment_history: [
    {
      start_date: "1980-03-15",
      end_date: "1985-08-30",
      facility_name: "Los Alamos National Laboratory",
      specific_location: "Technical Area 21",
      city: "Los Alamos",
      state: "NM",
      contractor: "University of California",
      position_title: "Nuclear Technician",
      work_duties: "Handling radioactive materials in controlled laboratory environment, performing routine equipment maintenance and calibration procedures",
      union_member: false,
      dosimetry_worn: true,
    },
    {
      start_date: "1985-09-01",
      end_date: "1992-12-31",
      facility_name: "Pantex Plant",
      specific_location: "Assembly Building 12-44",
      city: "Amarillo",
      state: "TX",
      contractor: "Mason & Hanger Corporation",
      position_title: "Weapons Assembly Technician",
      work_duties: "Nuclear weapon assembly and disassembly operations, high explosives handling, beryllium machining",
      union_member: true,
      dosimetry_worn: true,
    },
    {
      start_date: "1993-01-15",
      end_date: "2000-06-30",
      facility_name: "Sandia National Laboratories",
      specific_location: "Area IV",
      city: "Albuquerque",
      state: "NM",
      contractor: "Sandia Corporation",
      position_title: "Senior Research Technician",
      work_duties: "Research and development of nuclear weapons components, testing and evaluation procedures",
      union_member: false,
      dosimetry_worn: true,
    }
  ]
};

console.log('🧪 Generating test EE-3 form...');
console.log('📋 Sample data:');
console.log(`   Employee: ${formData.last_name}, ${formData.first_name}`);
console.log(`   SSN: ${formData.ssn}`);
console.log(`   Employers: ${formData.employment_history.length}`);
console.log('');

try {
  // Import and use the generator
  const { EE3Generator } = await import('./src/lib/generators/ee3-generator.ts');

  const generator = new EE3Generator();
  const result = await generator.generate(clientRecord, '', formData);

  // Save the PDF
  const outputPath = path.join(__dirname, `test_${result.filename}`);
  fs.writeFileSync(outputPath, result.pdfBytes);

  console.log('✅ Test EE-3 PDF generated successfully!');
  console.log(`📄 Saved to: ${outputPath}`);
  console.log('');
  console.log('🔍 Check the PDF to verify:');
  console.log('   • Employee name and SSN on page 1');
  console.log('   • Former name field');
  console.log('   • All 3 employer sections');
  console.log('   • Employment dates formatted correctly');
  console.log('   • Work duties text wrapping');
  console.log('   • Union member checkboxes');
  console.log('   • Dosimetry checkboxes');
  console.log('   • All text alignment with template fields');
  console.log('');

} catch (error) {
  console.error('❌ Error generating EE-3:', error);
  process.exit(1);
}
