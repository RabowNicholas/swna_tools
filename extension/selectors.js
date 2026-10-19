// Every DOL portal page detail the helper relies on, in one place, so a change
// on DOL's side is a one-line fix here. Mapped from the live portal 2026-10-14.
const DOL = {
  portalUrl: "https://eclaimant.dol.gov/portal/?program_name=EN",

  // Landing page: the button that starts an upload to an existing case
  landingButtons: "input.button-submit",
  uploadToCaseLabel: "Upload Document to Existing Case",

  // Case lookup
  caseNumber: "#case_number",
  lastName: "#last_name",
  ssnLast4: "#last_4_ssn",
  next: "#btnNext",

  // Upload page (jQuery File Upload)
  uploadForm: "form#fileupload",
  fileInput: "input.addportalfiles",
  // Row waiting to be sent to DOL's holding area, with its Upload button
  pendingRow: "tr.template-upload",
  pendingStart: "button[id^='start_']",
  // Row once the file is held, with the category dropdown
  heldRow: "tr.template-download",
  categorySelect: "select[id^='select_']",
  // A row DOL rejected, with its message
  rowError: "#uploadtable td.error",
  // Optional author date on the held row, MM/DD/YYYY
  authorDate: "input[id^='date_']",
  // Files the case for real. The helper never clicks it. It opens an in-page
  // confirmation (Send / Cancel), and only Send files anything.
  submit: "input.submitportalfiles",

  // Page after Send (AddToOISServlet), mapped 2026-10-19: one row per filed
  // document, with STATUS ("Processed") and DCN ("*PE5039626") columns. The DCN
  // has been "PE" + the held row's doc id.
  resultTable: "#docTable",
  dcnPrefix: "PE",

  // Text the portal shows when the lookup fails or the session is gone
  errorTexts: ["No Matching case found", "logged out", "session is timed out"],
};
