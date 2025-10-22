"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: any;
  };
}

interface PortalSubmitButtonProps {
  client: Client;
  formType: string;
  onPortalSuccess?: () => void;
  onPortalError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface PortalData {
  caseId: string;
  lastName: string;
  ssnLast4: string;
}

interface PortalStatus {
  status: 'idle' | 'validating' | 'opening' | 'automating' | 'success' | 'error';
  message: string;
  error?: string;
}

export default function PortalSubmitButton({
  client,
  formType,
  onPortalSuccess,
  onPortalError,
  disabled = false,
  className = ""
}: PortalSubmitButtonProps) {
  const [portalStatus, setPortalStatus] = useState<PortalStatus>({
    status: 'idle',
    message: ''
  });

  // Extract portal data from client record
  const extractPortalData = (client: Client): PortalData | null => {
    try {
      const fields = client.fields;
      const name = fields.Name || "";
      const caseId = fields["Case ID"] || "";

      // Extract Case ID
      if (!caseId) {
        throw new Error("Case ID not found in client record");
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

      if (!lastName) {
        throw new Error("Could not extract last name from client name");
      }

      if (!ssnLast4 || ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
        throw new Error("Could not extract valid SSN last 4 digits from client name");
      }

      return {
        caseId: caseId.trim(),
        lastName: lastName,
        ssnLast4: ssnLast4
      };
    } catch (error) {
      return null;
    }
  };

  const handlePortalSubmit = async () => {
    try {
      setPortalStatus({ status: 'validating', message: 'Validating client data...' });

      // Extract portal data
      const portalData = extractPortalData(client);
      if (!portalData) {
        throw new Error("Unable to extract required portal data from client record. Please check the client's name format and Case ID.");
      }

      setPortalStatus({ status: 'opening', message: 'Opening DOL portal...' });

      // Call portal API
      const response = await fetch("/api/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          case_id: portalData.caseId,
          last_name: portalData.lastName,
          ssn_last4: portalData.ssnLast4,
          client_name: client.fields.Name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Portal automation failed");
      }

      setPortalStatus({ 
        status: 'success', 
        message: `Portal opened successfully! Ready to upload your ${formType} document.` 
      });

      onPortalSuccess?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Portal automation failed";
      setPortalStatus({ 
        status: 'error', 
        message: 'Portal automation failed',
        error: errorMessage
      });
      
      onPortalError?.(errorMessage);
    }
  };

  const resetStatus = () => {
    setPortalStatus({ status: 'idle', message: '' });
  };

  // Extract portal data for display
  const portalData = extractPortalData(client);
  const canSubmitToPortal = portalData !== null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Portal Submit Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handlePortalSubmit}
          disabled={disabled || !canSubmitToPortal || portalStatus.status === 'opening' || portalStatus.status === 'validating'}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {portalStatus.status === 'validating' || portalStatus.status === 'opening' ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {portalStatus.status === 'validating' ? 'Validating...' : 'Opening Portal...'}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Submit to DOL Portal
            </>
          )}
        </Button>

        {portalData && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {portalData.caseId}
            </Badge>
            <span>{portalData.lastName} (****{portalData.ssnLast4})</span>
          </div>
        )}
      </div>

      {/* Portal Data Validation Warning */}
      {!canSubmitToPortal && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Portal submission unavailable: Missing or invalid client data (Case ID, Name format, or SSN).
            Expected name format: "Last, First - 1234"
          </AlertDescription>
        </Alert>
      )}

      {/* Status Messages */}
      {portalStatus.status === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-2">
              <p>{portalStatus.message}</p>
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4" />
                <span>The browser window is ready for you to upload your document.</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {portalStatus.status === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p className="font-medium">{portalStatus.message}</p>
              {portalStatus.error && (
                <p className="text-sm">{portalStatus.error}</p>
              )}
              <Button
                onClick={resetStatus}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Help Text */}
      {canSubmitToPortal && portalStatus.status === 'idle' && (
        <p className="text-sm text-muted-foreground">
          This will open the DOL portal and automatically fill in your case information. 
          You'll then need to manually upload your generated {formType} document.
        </p>
      )}
    </div>
  );
}