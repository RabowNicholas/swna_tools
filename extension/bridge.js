// Runs on the SWNA tools app. The app talks to it with window.postMessage:
//   { source: "swna-app", type: "ping" }  →  { source: "swna-helper", type: "pong", version }
//   { source: "swna-app", type: "fill", id, job }  →  { source: "swna-helper", type: "fill-result", id, ok, error? }
// and, once the person submits in DOL and the confirmation loads:
//   { source: "swna-helper", type: "filed", caseId, dcn, status, fileName }
// The job's file arrives as an ArrayBuffer and is stored as base64.

const VERSION = chrome.runtime.getManifest().version;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function reply(message) {
  window.postMessage({ source: "swna-helper", ...message }, window.location.origin);
}

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (data?.source !== "swna-app") return;

  if (data.type === "ping") {
    reply({ type: "pong", version: VERSION });
    return;
  }

  if (data.type === "fill") {
    try {
      const { file, ...rest } = data.job;
      const job = { ...rest, file: { name: file.name, type: file.type, base64: toBase64(file.bytes) } };
      const result = await chrome.runtime.sendMessage({ type: "fill", job });
      reply({ type: "fill-result", id: data.id, ok: !!result?.ok, error: result?.error });
    } catch (e) {
      reply({ type: "fill-result", id: data.id, ok: false, error: String(e) });
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "filed") reply({ type: "filed", ...message.filed });
});

// Lets the app know the helper is here even if it pinged before this loaded
reply({ type: "pong", version: VERSION });
