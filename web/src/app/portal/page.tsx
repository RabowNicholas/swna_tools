"use client";
import "../globals.css";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useClients } from "@/hooks/useClients";
import { Client } from "@/lib/clientStorage";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle,
  User,
  Globe,
  Copy,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface PortalData {
  caseId: string;
  lastName: string;
  ssnLast4: string;
  isValid: boolean;
  error?: string;
}

function extractPortalData(client: Client): PortalData {
  try {
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
      isValid: true,
    };
  } catch (error) {
    return {
      caseId: "",
      lastName: "",
      ssnLast4: "",
      isValid: false,
      error: "Error extracting portal data",
    };
  }
}

function CopyField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showValue, setShowValue] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setShowValue(true);
      onCopy(value);
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
                "{value}" copied!
              </span>
            ) : (
              value || "Not available"
            )}
          </div>
        </div>
        <Button
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

function PortalPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clients, loading, error, refreshClients, getCacheInfo } =
    useClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const clientId = searchParams.get("clientId");
  const formType = searchParams.get("formType") || "form";

  // Handle client pre-selection from URL params and auto-open portal
  useEffect(() => {
    if (clientId && clients.length > 0 && !selectedClient) {
      const preselectedClient = clients.find((c: Client) => c.id === clientId);
      if (preselectedClient) {
        setSelectedClient(preselectedClient);
        setSearchTerm(""); // Clear search when client is preselected
      }
    }
  }, [clientId, clients, selectedClient]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".relative")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-open portal when page loads
  useEffect(() => {
    // Small delay to ensure page has loaded
    const timer = setTimeout(() => {
      openPortal();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

    // TODO: Replace with actual DOL portal URL
    const portalUrl = "https://eclaimant.dol.gov/portal/?program_name=EN";

    window.open(portalUrl, "DOLPortal", windowFeatures);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" label="Loading clients..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error Loading Clients
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refreshClients(true)}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Calculate completion progress
  const isClientSelected = !!selectedClient;
  const portalData = selectedClient ? extractPortalData(selectedClient) : null;
  const hasValidData = portalData?.isValid || false;
  const progressPercentage =
    isClientSelected && hasValidData ? 100 : isClientSelected ? 50 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header with Progress */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              🌐 DOL Portal Helper
            </h1>
            <p className="text-muted-foreground">
              Submit your {formType} to the Department of Labor portal with
              pre-filled client information
            </p>
            {(() => {
              const cacheInfo = getCacheInfo();
              return cacheInfo.cached ? (
                <p className="text-xs text-success mt-1">
                  ✓ Clients loaded from cache ({cacheInfo.clientCount} clients)
                </p>
              ) : null;
            })()}
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          </div>
        </div>

      </div>

      {/* Client Selection */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Client Selection</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Choose which client you're preparing portal access for *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedClient?.fields.Name || searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) {
                      setSelectedClient(null);
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type to search clients..."
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-[#18181b] border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                    {clients
                      .filter(
                        (client) =>
                          (client.fields.Name || "")
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (client.fields["Case ID"] || "")
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                      )
                      .map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClient(client);
                            setSearchTerm("");
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border last:border-b-0 focus:outline-none focus:bg-accent"
                        >
                          <div className="font-medium text-foreground">
                            {client.fields.Name || "Unnamed Client"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Case ID: {client.fields["Case ID"] || "Not set"}
                          </div>
                        </button>
                      ))}
                    {clients.filter(
                      (client) =>
                        (client.fields.Name || "")
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        (client.fields["Case ID"] || "")
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    ).length === 0 &&
                      searchTerm && (
                        <div className="px-3 py-2 text-muted-foreground text-sm">
                          No clients found matching "{searchTerm}"
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {selectedClient && (
              <div className="mt-2 text-sm text-success flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Selected: {selectedClient.fields.Name}
              </div>
            )}

            {clients.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {clients.length} clients available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClient && (
        <div className="space-y-8">
          {portalData && portalData.isValid ? (
            <>
              {/* Portal Status */}
              <Card
                variant="elevated"
                className="bg-success/10 border-success/20"
              >
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
                    The DOL portal opened automatically when you accessed this
                    page. If it didn't open or you closed it, use the button
                    below.
                  </p>
                  <Button
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
                    Copy these values and paste them into the DOL portal login
                    form.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <CopyField
                      label="Case ID"
                      value={portalData.caseId}
                      onCopy={(value) => console.log("Copied Case ID:", value)}
                    />
                    <CopyField
                      label="Last Name"
                      value={portalData.lastName}
                      onCopy={(value) =>
                        console.log("Copied Last Name:", value)
                      }
                    />
                    <CopyField
                      label="SSN Last 4 Digits"
                      value={portalData.ssnLast4}
                      onCopy={(value) => console.log("Copied SSN:", value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card
              variant="elevated"
              className="bg-destructive/10 border-destructive/20"
            >
              <CardContent>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="font-medium text-destructive mb-2">
                      Invalid Client Data
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {portalData?.error ||
                        "This client does not have the required information for portal access."}
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Please ensure the client has a properly formatted name
                      (Last, First - XXXX) and Case ID.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading portal...</p>
          </div>
        </div>
      }
    >
      <PortalPageContent />
    </Suspense>
  );
}
