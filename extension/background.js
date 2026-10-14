// Holds the job the app sent and opens the DOL portal for it. The job goes in
// chrome.storage so it survives this service worker being stopped between
// portal pages.

importScripts("selectors.js");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "fill") return;
  (async () => {
    await chrome.storage.local.set({
      job: { ...message.job, stage: "start", createdAt: Date.now() },
    });
    // Reuse an open portal tab rather than stacking up new ones
    const [existing] = await chrome.tabs.query({ url: "https://eclaimant.dol.gov/*" });
    if (existing?.id) {
      await chrome.tabs.update(existing.id, { url: DOL.portalUrl, active: true });
      if (existing.windowId) await chrome.windows.update(existing.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: DOL.portalUrl });
    }
    sendResponse({ ok: true });
  })().catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true;
});
