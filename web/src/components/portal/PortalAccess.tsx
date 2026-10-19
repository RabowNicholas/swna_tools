'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Globe, Copy, ExternalLink, Send, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { extractPortalData } from '@/lib/portal/portal-data';
import { DOL_CATEGORIES, DEFAULT_CATEGORY, categoryFor } from '@/lib/portal/categories';
import { detectHelper, fillPortal, onFiled, portalFileName, type Filed } from '@/lib/portal/helper';
import { DESTINATIONS, fileNameFor, type DestinationId } from '@/lib/files/destinations';

interface Client {
  id: string;
  fields: {
    Name?: string;
    "Case ID"?: string;
    [key: string]: unknown;
  };
}

export function CopyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showValue, setShowValue] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setShowValue(true);
      setTimeout(() => {
        setCopied(false);
        setShowValue(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
          <div className="text-sm font-mono text-foreground">
            {showValue ? (
              <span className="text-success font-semibold">
                &quot;{value}&quot; copied!
              </span>
            ) : (
              value || "Not available"
            )}
          </div>
        </div>
        <Button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          variant={copied ? "success" : "outline"}
          size="sm"
          icon={<Copy className="h-4 w-4" />}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export interface PortalAccessProps {
  client: Client;
  autoOpen?: boolean;
  /** The document to upload. With the portal helper installed, it fills the portal for you. */
  file?: Blob | null;
  /** Which tool made the file, for its name and default DOL category */
  tool?: DestinationId;
}

/**
 * The portal window this tab has open, if it still is.
 *
 * The portal is opened under a window name so a second call reuses the window
 * instead of stacking up tabs — but reuse means `window.open` NAVIGATES it.
 * Firing it again while a submission is half-entered drops the user back at
 * the portal's front page and loses the work. Holding the reference lets an
 * open portal be focused rather than reloaded. Module scope, because the
 * window outlives any one mount of this component.
 */
let portalWindow: Window | null = null;

export function PortalAccess({ client, autoOpen = true, file, tool }: PortalAccessProps) {
  const portalData = extractPortalData(client);
  // undefined while checking, null when the helper isn't installed
  const [helper, setHelper] = useState<string | null | undefined>(undefined);
  const [category, setCategory] = useState(() => categoryFor((tool && DEFAULT_CATEGORY[tool]) ?? 20));
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [changingCategory, setChangingCategory] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [filed, setFiled] = useState<Filed | null>(null);

  const canFill = !!(file && tool);
  const fileName = tool ? portalFileName(fileNameFor(DESTINATIONS[tool].doc, client.fields.Name ?? '')) : '';
  const useHelper = canFill && !!helper;

  useEffect(() => {
    detectHelper().then(setHelper);
  }, []);

  useEffect(() => {
    if (!portalData.caseId) return;
    return onFiled(portalData.caseId, setFiled);
  }, [portalData.caseId]);

  useEffect(() => {
    // With the helper, the portal opens when "Open portal and fill" is clicked instead
    if (autoOpen && helper !== undefined && !useHelper) {
      // Small delay to ensure component has rendered
      const timer = setTimeout(() => {
        openPortal();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoOpen, helper, useHelper]);

  const handleFill = async () => {
    if (!file) return;
    setFilling(true);
    setFillResult(null);
    setFillResult(await fillPortal({ portal: portalData, category, blob: file, fileName }));
    setFilling(false);
  };

  const openPortal = () => {
    // Already open — bring it forward. Re-opening would reload it out from
    // under whatever is entered in it.
    if (portalWindow && !portalWindow.closed) {
      portalWindow.focus();
      return;
    }

    // Open in a new window with specific dimensions and features
    const windowFeatures = [
      "width=1200",
      "height=800",
      "scrollbars=yes",
      "resizable=yes",
      "toolbar=no",
      "menubar=no",
      "location=yes",
      "status=no",
      "left=" + (screen.width / 2 - 600),
      "top=" + (screen.height / 2 - 400),
    ].join(",");

    const portalUrl = "https://eclaimant.dol.gov/portal/?program_name=EN";

    portalWindow = window.open(portalUrl, "DOLPortal", windowFeatures);
  };

  const copyFields = (
    <div className="space-y-6">
      <CopyField label="Case ID" value={portalData.caseId} />
      <CopyField label="Last Name" value={portalData.lastName} />
      <CopyField label="SSN Last 4 Digits" value={portalData.ssnLast4} />
    </div>
  );

  if (useHelper) {
    const missing = !portalData.caseId || !portalData.lastName || !portalData.ssnLast4;
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle>Submit to DOL</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            Case {portalData.caseId || "—"} · {portalData.lastName || "—"} · SSN {portalData.ssnLast4 || "—"}
          </p>

          {changingCategory ? (
            <Select
              label="Category"
              value={String(category.value)}
              onChange={(e) => {
                setCategory(categoryFor(Number(e.target.value)));
                setChangingCategory(false);
              }}
              autoFocus
            >
              {DOL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              Category: <span className="text-foreground">{category.label}</span>{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setChangingCategory(true)}
              >
                change
              </button>
            </p>
          )}

          {filed ? (
            <div className="flex items-start gap-2 text-sm text-foreground">
              {filed.status.toLowerCase() === "processed" ? (
                <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
              )}
              <span>
                Filed with DOL. DCN <span className="font-mono">{filed.dcn}</span>
                {filed.status.toLowerCase() === "processed"
                  ? "."
                  : `, but DOL shows its status as “${filed.status || "blank"}”. Check the case in ECOMP.`}
              </span>
            </div>
          ) : fillResult?.ok ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                Portal opened. Check it, then click SUBMIT and Send. The DCN comes back here.
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleFill} loading={filling}>
                Open portal again
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                size="lg"
                onClick={handleFill}
                loading={filling}
                disabled={filling || missing}
                icon={<ExternalLink className="h-5 w-5" />}
              >
                Open portal and fill
              </Button>
              <p className="text-sm text-muted-foreground">
                {missing
                  ? "The client is missing a case ID, last name or SSN last 4, so the portal can't be filled."
                  : "Stops at SUBMIT. You check it and submit."}
              </p>
            </div>
          )}

          {fillResult && !fillResult.ok && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {fillResult.error}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowManual((v) => !v)}
              aria-expanded={showManual}
            >
              {showManual ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Fill by hand instead
            </button>
            {showManual && (
              <div className="mt-4 space-y-6">
                <Button
                  type="button"
                  onClick={openPortal}
                  variant="outline"
                  size="sm"
                  icon={<ExternalLink className="h-4 w-4" />}
                >
                  Open DOL Portal
                </Button>
                {copyFields}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Portal Status */}
      <Card variant="elevated" className="bg-success/10 border-success/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-success">
              DOL Portal Status
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
            <span className="text-success font-medium">
              Portal Auto-Opened in New Window
            </span>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            The DOL portal opened automatically. If it didn&apos;t open or you closed it, use the button below.
          </p>
          <Button
            type="button"
            onClick={openPortal}
            variant="outline"
            size="sm"
            icon={<ExternalLink className="h-4 w-4" />}
          >
            Reopen DOL Portal
          </Button>
          {canFill && helper === null && (
            <p className="text-sm text-muted-foreground mt-4">
              Install the DOL portal helper in{' '}
              <Link href="/settings" className="text-primary underline">Settings</Link> and it will fill this in for
              you.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Portal Login Information */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Copy className="h-5 w-5 text-primary" />
            <CardTitle>Portal Login Information</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Copy these values and paste them into the DOL portal login form.
          </p>
        </CardHeader>
        <CardContent>{copyFields}</CardContent>
      </Card>
    </div>
  );
}
