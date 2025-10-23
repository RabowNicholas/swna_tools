'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Globe, Copy, ExternalLink } from 'lucide-react';

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | undefined;
  };
}

interface PortalData {
  caseId: string;
  lastName: string;
  ssnLast4: string;
}

function extractPortalData(client: Client): PortalData {
  const fields = client.fields;
  const name = fields.Name || "";
  const caseId = fields["Case ID"] || "";

  let lastName = "";
  let ssnLast4 = "";

  if (name.includes(",")) {
    const parts = name.split(",");
    lastName = parts[0].trim();

    if (name.includes(" - ")) {
      const ssnPart = name.split(" - ");
      if (ssnPart.length > 1) {
        ssnLast4 = ssnPart[ssnPart.length - 1].trim();
      }
    }
  }

  return {
    caseId: caseId.trim(),
    lastName,
    ssnLast4,
  };
}

function CopyField({
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
}

export function PortalAccess({ client, autoOpen = true }: PortalAccessProps) {
  const portalData = extractPortalData(client);

  useEffect(() => {
    if (autoOpen) {
      // Small delay to ensure component has rendered
      const timer = setTimeout(() => {
        openPortal();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  const openPortal = () => {
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

    window.open(portalUrl, "DOLPortal", windowFeatures);
  };

  return (
    <div className="space-y-8">
      {/* Portal Status */}
      <Card variant="elevated" className="bg-success/10 border-success/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-success" />
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
        <CardContent>
          <div className="space-y-6">
            <CopyField
              label="Case ID"
              value={portalData.caseId}
            />
            <CopyField
              label="Last Name"
              value={portalData.lastName}
            />
            <CopyField
              label="SSN Last 4 Digits"
              value={portalData.ssnLast4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
