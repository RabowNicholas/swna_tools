"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  FileUp, 
  AlertTriangle,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: any;
  };
}

interface PortalData {
  caseId: string;
  lastName: string;
  ssnLast4: string;
  isValid: boolean;
  error?: string;
}

interface CopyFieldProps {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}

interface PortalHelperProps {
  client: Client;
  formType: string;
  onReferenceSubmitted?: (referenceNumber: string) => void;
  className?: string;
}

// Extract portal data from client record
function extractPortalData(client: Client): PortalData {
  try {
    const fields = client.fields;
    const name = fields.Name || "";
    const caseId = fields["Case ID"] || "";

    // Validate Case ID
    if (!caseId) {
      return {
        caseId: "",
        lastName: "",
        ssnLast4: "",
        isValid: false,
        error: "Case ID not found in client record"
      };
    }

    // Extract last name from "Last, First - XXXX" format
    let lastName = "";
    let ssnLast4 = "";

    if (name.includes(",")) {
      const parts = name.split(",");
      lastName = parts[0].trim();

      // Extract SSN last 4 from format "Last, First - 1234"
      if (name.includes(" - ")) {
        const ssnPart = name.split(" - ");
        if (ssnPart.length > 1) {
          ssnLast4 = ssnPart[ssnPart.length - 1].trim();
        }
      }
    } else {
      // Fallback: try to get last word as last name
      const nameParts = name.split(" ");
      lastName = nameParts[nameParts.length - 1];
    }

    // Validate extracted data
    if (!lastName) {
      return {
        caseId,
        lastName: "",
        ssnLast4: "",
        isValid: false,
        error: "Could not extract last name from client name"
      };
    }

    if (!ssnLast4 || ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
      return {
        caseId,
        lastName,
        ssnLast4: "",
        isValid: false,
        error: "Could not extract valid SSN last 4 digits from client name"
      };
    }

    return {
      caseId: caseId.trim(),
      lastName,
      ssnLast4,
      isValid: true
    };
  } catch (error) {
    return {
      caseId: "",
      lastName: "",
      ssnLast4: "",
      isValid: false,
      error: "Error extracting portal data from client record"
    };
  }
}

// Copy field component with one-click copy functionality
function CopyField({ label, value, hint, icon }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: select text for manual copy
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      {icon && (
        <div className="flex-shrink-0 text-gray-400">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="font-mono text-lg font-bold text-blue-600 break-all">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{hint}</div>
      </div>
      <Button
        onClick={handleCopy}
        variant={copied ? "default" : "outline"}
        size="sm"
        className={`flex-shrink-0 min-w-[80px] ${
          copied 
            ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-100" 
            : "hover:bg-gray-50"
        }`}
      >
        {copied ? (
          <>
            <Check className="mr-1 h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="mr-1 h-4 w-4" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}

// Reference capture component
function ReferenceCapture({ 
  clientId, 
  onReferenceSubmitted 
}: { 
  clientId: string; 
  onReferenceSubmitted?: (referenceNumber: string) => void;
}) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!referenceNumber.trim()) return;

    setSaving(true);
    try {
      // TODO: Implement Airtable integration
      // await saveReferenceToAirtable(clientId, referenceNumber);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaved(true);
      onReferenceSubmitted?.(referenceNumber);
      
      // Reset after success message
      setTimeout(() => {
        setSaved(false);
        setReferenceNumber("");
      }, 3000);
    } catch (error) {
      console.error("Failed to save reference number:", error);
      // TODO: Add proper error handling
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Check className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Reference number saved successfully!</strong> The DOL reference has been added to the client record.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <FileUp className="h-4 w-4" />
        After Portal Submission
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Paste DOL reference number here (e.g., DOL-2024-001234)"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          className="flex-1"
          disabled={saving}
        />
        <Button 
          onClick={handleSave}
          disabled={!referenceNumber.trim() || saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? "Saving..." : "Save Reference"}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Copy the reference number from the DOL confirmation page and paste it here to save to the client record.
      </p>
    </div>
  );
}

// Main portal helper component
export default function PortalHelper({ 
  client, 
  formType, 
  onReferenceSubmitted,
  className = "" 
}: PortalHelperProps) {
  const portalData = extractPortalData(client);

  const openPortal = () => {
    window.open("https://eclaimant.dol.gov/portal/?program_name=EN", "_blank");
  };

  if (!portalData.isValid) {
    return (
      <Card className={`border-orange-200 bg-orange-50 ${className}`}>
        <CardContent className="pt-6">
          <Alert className="border-orange-300 bg-orange-100">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Portal submission unavailable:</strong> {portalData.error}
              <br />
              <span className="text-sm">Expected name format: "Last, First - 1234"</span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <ExternalLink className="h-5 w-5" />
          DOL Portal Assistant
        </CardTitle>
        <div className="flex items-center gap-3">
          <Button 
            onClick={openPortal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open DOL Portal
          </Button>
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Badge variant="outline" className="bg-white border-blue-300">
              {formType}
            </Badge>
            <span>{client.fields.Name}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Copy Fields */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">
            📋 Copy these values into the portal:
          </h4>
          
          <CopyField
            label="Case ID"
            value={portalData.caseId}
            hint="Enter this in the 'Case Number' field"
            icon={<FileUp className="h-4 w-4" />}
          />
          
          <CopyField
            label="Last Name"
            value={portalData.lastName}
            hint="Enter this in the 'Last Name' field"
            icon={<Copy className="h-4 w-4" />}
          />
          
          <CopyField
            label="SSN Last 4"
            value={portalData.ssnLast4}
            hint="Enter this in the 'Last 4 SSN' field"
            icon={<Copy className="h-4 w-4" />}
          />
        </div>

        {/* Instructions */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-2">
              <strong>Follow these steps in the portal:</strong>
              <ol className="text-sm space-y-1 mt-2 ml-4 list-decimal">
                <li>Click "Upload Document to Existing Case"</li>
                <li>Copy and paste the values above into the form fields</li>
                <li>Click "Next" to proceed to the upload page</li>
                <li>Upload your generated {formType} PDF document</li>
                <li>Click "Submit" and wait for confirmation</li>
                <li>Copy the reference number from the success page</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        {/* Reference Capture */}
        <div className="pt-4 border-t border-blue-200">
          <ReferenceCapture 
            clientId={client.id} 
            onReferenceSubmitted={onReferenceSubmitted}
          />
        </div>
      </CardContent>
    </Card>
  );
}