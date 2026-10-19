// Runs in every frame of the DOL portal. When the app has handed over a job,
// it walks the portal one page at a time: landing → case lookup → upload page,
// where it attaches the file, picks the category and stops at SUBMIT for a
// person to check and click. It never clicks SUBMIT. When the confirmation page
// loads after the person submits, it reads the DCN and sends it to the app.

// A job older than this is stale (the person wandered off), so it's dropped
const JOB_TTL_MS = 15 * 60 * 1000;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function getJob() {
  const { job } = await chrome.storage.local.get("job");
  if (!job) return null;
  if (Date.now() - job.createdAt > JOB_TTL_MS) {
    await clearJob();
    return null;
  }
  return job;
}

async function setStage(job, stage) {
  job.stage = stage;
  await chrome.storage.local.set({ job });
}

async function clearJob() {
  await chrome.storage.local.remove("job");
}

/** Waits for `find()` to return something, checking every 250ms */
function waitFor(find, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const found = find();
      if (found) return resolve(found);
      if (Date.now() - started > timeoutMs) return reject(new Error("timed out"));
      setTimeout(tick, 250);
    };
    tick();
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setValue(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function banner(tone, html) {
  let el = document.getElementById("swna-helper-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "swna-helper-banner";
    el.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px 16px;" +
      "font:600 14px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)";
    document.body.appendChild(el);
  }
  const colors = { info: ["#1e3a8a", "#fff"], done: ["#065f46", "#fff"], error: ["#991b1b", "#fff"] };
  [el.style.background, el.style.color] = colors[tone];
  el.innerHTML = `SWNA helper: ${html}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function pageError() {
  const text = document.body?.innerText ?? "";
  return DOL.errorTexts.find((t) => text.toLowerCase().includes(t.toLowerCase())) ?? null;
}

async function fail(message) {
  await clearJob();
  banner("error", `${escapeHtml(message)} Nothing was submitted. Finish this one by hand.`);
}

function base64ToFile({ name, type, base64 }) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: type || "application/pdf" });
}

async function onLanding(job) {
  if (job.stage !== "start") return;
  const button = $$(DOL.landingButtons).find((b) => b.value?.trim() === DOL.uploadToCaseLabel);
  if (!button) return;
  await setStage(job, "landing");
  banner("info", "opening Upload Document to Existing Case…");
  button.click();
}

async function onLookup(job) {
  // Back on the lookup after already submitting it: the lookup failed
  if (job.stage === "lookup") {
    return fail(`DOL didn’t accept the case lookup${pageError() ? ` (“${pageError()}”)` : ""}. Check the case ID, last name and SSN last 4.`);
  }
  if (job.stage !== "start" && job.stage !== "landing") return;
  setValue($(DOL.caseNumber), job.caseId);
  setValue($(DOL.lastName), job.lastName);
  setValue($(DOL.ssnLast4), job.ssnLast4);
  await setStage(job, "lookup");
  banner("info", `looking up case ${escapeHtml(job.caseId)}…`);
  $(DOL.next).click();
}

async function onUpload(job) {
  if (job.stage === "attaching" || job.stage === "attached") return;
  await setStage(job, "attaching");
  banner("info", `attaching ${escapeHtml(job.file.name)}…`);

  try {
    // Dropdowns already on the page, so the new file's one can be told apart
    const selectsBefore = new Set($$(DOL.categorySelect).map((el) => el.id));
    const errorsBefore = $$(DOL.rowError).length;

    // Hand the file to the uploader as if it had been picked in ADD FILE
    const input = $(DOL.fileInput);
    const transfer = new DataTransfer();
    transfer.items.add(base64ToFile(job.file));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Send it to DOL's holding area. Held files aren't on the case until SUBMIT.
    const start = await waitFor(() => {
      const rows = $$(DOL.pendingRow);
      return rows.length ? $(DOL.pendingStart, rows[rows.length - 1]) : null;
    });
    start.click();

    // DOL draws the held row first and adds its category dropdown on a redraw,
    // so wait for the new dropdown itself. A row error (e.g. a file DOL won't
    // take) ends the wait with DOL's own message.
    const found = await waitFor(() => {
      const errors = $$(DOL.rowError);
      if (errors.length > errorsBefore) return { error: errors[errors.length - 1].innerText.trim() };
      const fresh = $$(DOL.categorySelect).find((el) => !selectsBefore.has(el.id));
      return fresh ? { select: fresh } : null;
    }, 60000);
    if (found.error) throw new Error(`DOL said: ${found.error}`);
    const docId = found.select.id.replace("select_", "");

    // The portal also redraws the table about a second after Upload, which
    // wipes anything picked before that. So let it settle, set the category
    // and date, then check they stuck and set them again if not.
    const today = new Date();
    const authorDate = [today.getMonth() + 1, today.getDate()]
      .map((n) => String(n).padStart(2, "0"))
      .concat(String(today.getFullYear()))
      .join("/");

    await sleep(2500);
    let option = null;
    let dateSet = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const select = document.getElementById(`select_${docId}`);
      const date = document.getElementById(`date_${docId}`);
      option = select ? [...select.options].find((o) => o.value === String(job.category.value)) : null;
      if (option && select.value !== option.value) setValue(select, option.value);
      if (date && date.value !== authorDate) setValue(date, authorDate);
      await sleep(1500);
      const selectNow = document.getElementById(`select_${docId}`);
      const dateNow = document.getElementById(`date_${docId}`);
      dateSet = !!dateNow && dateNow.value === authorDate;
      if ((!option || selectNow?.value === option.value) && (!dateNow || dateSet)) break;
    }

    const submit = $(DOL.submit);
    if (submit) {
      submit.style.outline = "4px solid #f59e0b";
      submit.style.outlineOffset = "3px";
      submit.scrollIntoView({ block: "center" });
    }

    // Keep the job until the confirmation page, so its DCN can be matched to
    // this file. The person gets the full TTL from here to check and submit.
    job.docId = docId;
    job.createdAt = Date.now();
    await setStage(job, "attached");
    banner(
      "done",
      `attached <u>${escapeHtml(job.file.name)}</u>` +
        (option
          ? ` as <u>${escapeHtml(option.textContent.trim())}</u>`
          : `, but couldn’t pick “${escapeHtml(job.category.label)}”. Pick the category by hand`) +
        (dateSet ? `, dated ${authorDate}.` : ". Add the author date by hand if you want one.") +
        " Check it, then click SUBMIT and Send yourself. The helper never submits." +
        " Once DOL files it, the DCN goes back to the app."
    );
  } catch (e) {
    await fail(`Couldn’t attach the file (${e.message}).`);
  }
}

async function onFiled(job) {
  await clearJob();
  const table = $(DOL.resultTable);
  const headers = [...(table.rows[0]?.cells ?? [])].map((c) => c.innerText.trim().toUpperCase());
  const dcnCol = headers.indexOf("DCN");
  const statusCol = headers.indexOf("STATUS");
  const docCol = headers.indexOf("DOCUMENT");
  const rows = [...table.rows].slice(1).map((r) => ({
    dcn: (r.cells[dcnCol]?.innerText ?? "").trim().replace(/^\*/, ""),
    status: (r.cells[statusCol]?.innerText ?? "").trim(),
    // DOL shortens long names, e.g. "DOL Status Update K"
    name: (r.cells[docCol]?.innerText ?? "").trim().replace(/\.+$/, ""),
  }));
  const filed = rows.filter((r) => r.dcn);

  // The page is the source of truth. The DCN predicted from the held row picks
  // out this file; failing that, a lone row whose name matches is this file.
  // Anything else could be a different upload made while the job was waiting.
  const expected = `${DOL.dcnPrefix}${job.docId}`;
  const lone = filed.length === 1 && filed[0].name && job.file.name.startsWith(filed[0].name) ? filed[0] : null;
  const row = filed.find((r) => r.dcn === expected) ?? lone;
  if (dcnCol < 0 || !row) {
    banner("error", "DOL filed this, but the helper couldn’t tell which DCN is this file’s. Copy it into the app by hand.");
    return;
  }

  chrome.runtime.sendMessage({
    type: "filed",
    appTabId: job.appTabId,
    filed: { caseId: job.caseId, dcn: row.dcn, status: row.status, fileName: job.file.name },
  });
  const processed = row.status.toLowerCase() === "processed";
  banner(
    processed ? "done" : "error",
    `filed ${escapeHtml(job.file.name)}. DCN <u>${escapeHtml(row.dcn)}</u>` +
      (processed ? "" : `, but DOL shows its status as “${escapeHtml(row.status || "blank")}”`) +
      ". It’s filled in on the app’s Airtable card."
  );
}

(async () => {
  const job = await getJob();
  if (!job) return;

  if (job.stage === "attached") {
    if ($(DOL.resultTable)) return onFiled(job);
    return;
  }

  if ($(DOL.uploadForm)) return onUpload(job);
  if ($(DOL.caseNumber)) return onLookup(job);
  if ($$(DOL.landingButtons).some((b) => b.value?.trim() === DOL.uploadToCaseLabel)) return onLanding(job);

  // Some other DOL page while a lookup is in flight, e.g. "session timed out"
  if (job.stage === "lookup" && document.body && pageError()) {
    return fail(`DOL said “${pageError()}”.`);
  }
})();
