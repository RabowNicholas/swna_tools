// Talking to the SWNA DOL Portal Helper Chrome extension, whose bridge script
// runs on this app's pages and answers window.postMessage.

import type { PortalData } from "./portal-data";
import type { PortalCategory } from "./categories";

/** The extension version this app was built against */
export const HELPER_VERSION = "1.0.0";

type HelperMessage =
  | { source: "swna-helper"; type: "pong"; version: string }
  | { source: "swna-helper"; type: "fill-result"; id: string; ok: boolean; error?: string };

function listen<T extends HelperMessage>(match: (m: HelperMessage) => m is T, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== "swna-helper") return;
      if (match(event.data)) {
        cleanup();
        resolve(event.data);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
    window.addEventListener("message", onMessage);
  });
}

function post(message: Record<string, unknown>, transfer?: Transferable[]) {
  window.postMessage({ source: "swna-app", ...message }, window.location.origin, transfer);
}

/** The installed helper's version, or null when it isn't installed */
export async function detectHelper(): Promise<string | null> {
  const pong = listen((m): m is Extract<HelperMessage, { type: "pong" }> => m.type === "pong", 800);
  post({ type: "ping" });
  return (await pong)?.version ?? null;
}

/**
 * DOL says no special characters in uploaded file names, so only letters,
 * digits, spaces, hyphens and underscores survive: "IR Notice B. White 10.14.26.pdf"
 * goes up as "IR Notice B White 10 14 26.pdf".
 */
export function portalFileName(name: string): string {
  const stem = name.replace(/\.pdf$/i, "");
  const clean = stem.replace(/[^A-Za-z0-9 _-]/g, " ").replace(/\s+/g, " ").trim();
  return `${clean || "Document"}.pdf`;
}

/**
 * Hands the case and the file to the helper, which opens the portal, fills the
 * lookup, attaches the file under the category and stops at SUBMIT.
 */
export async function fillPortal({
  portal,
  category,
  blob,
  fileName,
}: {
  portal: PortalData;
  category: PortalCategory;
  blob: Blob;
  fileName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const id = crypto.randomUUID();
  const bytes = await blob.arrayBuffer();
  const result = listen(
    (m): m is Extract<HelperMessage, { type: "fill-result" }> => m.type === "fill-result" && m.id === id,
    10000
  );
  post(
    {
      type: "fill",
      id,
      job: {
        ...portal,
        category,
        file: { name: portalFileName(fileName), type: blob.type || "application/pdf", bytes },
      },
    },
    [bytes]
  );
  return (await result) ?? { ok: false, error: "The portal helper didn’t answer. Reload this page and try again." };
}
