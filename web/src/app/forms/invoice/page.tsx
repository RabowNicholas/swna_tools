"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { trackEvent } from "@/lib/analytics";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Minus,
  FileDown,
  DollarSign,
  AlertCircle,
  MapPin,
  Receipt,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

// Invoice item options
const INVOICE_ITEMS = [
  "Physician File Review - Dr. Toupin",
  "Physician File Review - Dr. Herold",
  "B-read Imaging - Dr. Klepper",
  "B-read Imaging - Dr. Smith",
  "B-read 2nd Opinion - Dr. Smith",
  "Physician Response Memo - Dr. Toupin",
  "Physician Response Memo - Dr. Herold",
  "Discount",
];

// Zod schema for form validation
const invoiceItemSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  date: z.string().min(1, "Service date is required"),
});

const invoiceSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  case_id: z.string().min(1, "Case ID is required"),
  client_name: z.string().min(1, "Client name is required"),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z.string().min(1, "State is required"),
  address_zip: z.string().min(1, "ZIP code is required"),
  fd_letter_date: z.string().min(1, "FD letter date is required"),
  part_type: z.enum(["Part B", "Part E"]),
  ar_fee: z.string().optional(),
  awarded_amount: z.string().optional(),
  invoice_items: z
    .array(invoiceItemSchema)
    .min(1, "At least one invoice item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Street Address"?: string;
    City?: string;
    State?: string;
    "ZIP Code"?: string;
    "Case ID"?: string;
    [key: string]: string | undefined;
  };
}

export default function InvoiceForm() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClients();
  const [loading, setLoading] = useState(false);

  // Track form view
  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed('invoice', session.user.id);
    }
  }, [session]);
  const [lastSelectedClient, setLastSelectedClient] = useState<string>("");

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: "",
      invoice_number: "1",
      invoice_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days from now
      case_id: "",
      client_name: "",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      fd_letter_date: new Date().toISOString().split("T")[0],
      part_type: "Part B",
      ar_fee: "2.0",
      awarded_amount: "",
      invoice_items: [
        {
          name: "",
          date: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invoice_items",
  });

  // Show error if clients failed to load
  useEffect(() => {
    if (clientsError) {
      console.error("Failed to load clients:", clientsError);
    }
  }, [clientsError]);

  // Handle client selection
  const handleClientChange = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Only fetch invoice items if this is a different client (like Streamlit logic)
      const shouldFetchItems = lastSelectedClient !== clientId;
      setLastSelectedClient(clientId);
      // Parse client name using shared utility
      const displayName = parseClientName(client.fields.Name || "");
      form.setValue("client_name", displayName);

      // Set case ID
      const caseId = client.fields["Case ID"];
      if (caseId) {
        form.setValue("case_id", caseId);
      }

      // Set address fields
      form.setValue("address_main", client.fields["Street Address"] || "");
      form.setValue("address_city", client.fields["City"] || "");
      form.setValue("address_state", client.fields["State"] || "");
      form.setValue("address_zip", client.fields["ZIP Code"] || "");

      // Auto-populate invoice items from client's invoicing history (only on client change)
      if (shouldFetchItems) {
        const invoicingField = client.fields["Invoicing"];
        const invoicingIds = Array.isArray(invoicingField)
          ? invoicingField
          : [];
        const newInvoiceItems: { name: string; date: string }[] = [];

        for (const invoiceId of invoicingIds) {
          try {
            const response = await fetch(`/api/invoices/${invoiceId}`);
            if (response.ok) {
              const invoiceData = await response.json();
              const rawName = (invoiceData.fields?.Name || "").toLowerCase();

              // Skip pending or completed payments
              if (
                rawName.includes("pending") ||
                rawName.includes("payment complete")
              ) {
                continue;
              }

              // Determine service type based on Streamlit logic
              let serviceName = "";
              if (rawName.includes("toupin") && rawName.includes("memo")) {
                serviceName = "Physician Response Memo - Dr. Toupin";
              } else if (rawName.includes("toupin")) {
                serviceName = "Physician File Review - Dr. Toupin";
              } else if (
                rawName.includes("herold") &&
                rawName.includes("memo")
              ) {
                serviceName = "Physician Response Memo - Dr. Herold";
              } else if (rawName.includes("herold")) {
                serviceName = "Physician File Review - Dr. Herold";
              } else if (
                rawName.includes("klepper") &&
                rawName.includes("2nd")
              ) {
                serviceName = "B-read 2nd Opinion - Dr. Smith";
              } else if (
                rawName.includes("klepper") ||
                rawName.includes("b-read")
              ) {
                serviceName = "B-read Imaging - Dr. Klepper";
              } else if (rawName.includes("smith") && rawName.includes("2nd")) {
                serviceName = "B-read 2nd Opinion - Dr. Smith";
              } else if (
                rawName.includes("smith") ||
                rawName.includes("b-read")
              ) {
                serviceName = "B-read Imaging - Dr. Smith";
              } else if (
                rawName.includes("discount") ||
                rawName.includes("-$") ||
                rawName.includes("$-")
              ) {
                serviceName = "Discount";
              }

              // Extract date using regex (matches Streamlit logic)
              const dateMatches = rawName.match(
                /(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g
              );
              let serviceDate = "";
              if (dateMatches && dateMatches.length > 0) {
                const lastMatch = dateMatches[dateMatches.length - 1];
                const [, m, d, y] =
                  lastMatch.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/) || [];
                if (m && d && y) {
                  const year = y.length === 2 ? `20${y}` : y;
                  const month = String(parseInt(m)).padStart(2, "0");
                  const day = String(parseInt(d)).padStart(2, "0");
                  serviceDate = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD for input[type="date"]
                }
              }

              if (serviceName) {
                newInvoiceItems.push({
                  name: serviceName,
                  date: serviceDate,
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch invoice ${invoiceId}:`, error);
          }
        }

        // Update form with auto-populated items or default empty item
        if (newInvoiceItems.length > 0) {
          form.setValue("invoice_items", newInvoiceItems);
        } else {
          form.setValue("invoice_items", [{ name: "", date: "" }]);
        }
      }
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: data,
      };

      const response = await fetch("/api/generate/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        // Download the Excel file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Format filename
        const amount =
          data.part_type === "Part E"
            ? parseFloat(data.awarded_amount || "0")
            : 150000;
        const amountStr =
          amount % 1000 !== 0
            ? `$${(amount / 1000).toFixed(1)}k`
            : `$${Math.floor(amount / 1000)}k`;
        const shortName = data.client_name.split(" ").pop() || "Client";
        const firstInitial = data.client_name.charAt(0) || "X";
        const nameStr = `${firstInitial}. ${shortName}`;
        const todayStr = new Date()
          .toLocaleDateString("en-US")
          .replace(/\//g, ".");

        a.download = `Invoice ${data.part_type} ${amountStr} ${nameStr} ${todayStr}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('invoice', session.user.id, data.client_id);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate invoice");
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate invoice"
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate form completion progress
  const watchedFields = form.watch();
  const partType = watchedFields.part_type;

  const requiredFieldCount = partType === "Part B" ? 11 : 11; // Same number for both types
  const completedBaseFields = [
    watchedFields.client_id,
    watchedFields.invoice_number,
    watchedFields.invoice_date,
    watchedFields.case_id,
    watchedFields.client_name,
    watchedFields.address_main,
    watchedFields.address_city,
    watchedFields.address_state,
    watchedFields.address_zip,
    watchedFields.fd_letter_date,
    partType === "Part B" ? watchedFields.ar_fee : watchedFields.awarded_amount,
  ].filter(Boolean).length;

  const completedItemFields =
    watchedFields.invoice_items?.reduce((acc, item) => {
      return acc + (item.name && item.date ? 1 : 0);
    }, 0) || 0;

  const totalItemFields = watchedFields.invoice_items?.length || 0;
  const progressPercentage =
    requiredFieldCount + totalItemFields > 0
      ? ((completedBaseFields + completedItemFields) /
          (requiredFieldCount + totalItemFields)) *
        100
      : 0;

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" label="Loading clients..." />
      </div>
    );
  }

  if (clientsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error Loading Clients
          </h3>
          <p className="text-muted-foreground">{clientsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header with Progress */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Generate Invoice
            </h1>
            <p className="text-muted-foreground">
              Professional billing and invoicing with automatic calculations
            </p>
          </div>
        </div>

      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Client Selection */}
        <ClientSelector
          clients={clients as any}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={form.formState.errors.client_id?.message}
        />

        {/* Invoice Details */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-success" />
              <CardTitle>Invoice Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Invoice Number"
                required
                error={form.formState.errors.invoice_number?.message}
                {...form.register("invoice_number")}
              />

              <Input
                type="date"
                label="Invoice Date"
                required
                error={form.formState.errors.invoice_date?.message}
                {...form.register("invoice_date")}
              />

              <Input
                label="Case ID"
                required
                error={form.formState.errors.case_id?.message}
                {...form.register("case_id")}
              />

              <Input
                label="Client Name"
                required
                error={form.formState.errors.client_name?.message}
                {...form.register("client_name")}
              />

              <Input
                type="date"
                label="Date on FD Letter"
                required
                error={form.formState.errors.fd_letter_date?.message}
                {...form.register("fd_letter_date")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Address Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="Street Address"
                  required
                  error={form.formState.errors.address_main?.message}
                  {...form.register("address_main")}
                />
              </div>

              <Input
                label="City"
                required
                error={form.formState.errors.address_city?.message}
                {...form.register("address_city")}
              />

              <Input
                label="State"
                required
                error={form.formState.errors.address_state?.message}
                {...form.register("address_state")}
              />

              <Input
                label="ZIP Code"
                required
                error={form.formState.errors.address_zip?.message}
                {...form.register("address_zip")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Award Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-success" />
              <CardTitle>Award Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Award Type
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Part B"
                      {...form.register("part_type")}
                      className="text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium">
                      Part B ($150,000)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Part E"
                      {...form.register("part_type")}
                      className="text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium">
                      Part E (Custom Amount)
                    </span>
                  </label>
                </div>
              </div>

              {watchedFields.part_type === "Part B" && (
                <Input
                  label="AR Fee (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  helperText="Attorney fee percentage (default: 2%)"
                  error={form.formState.errors.ar_fee?.message}
                  {...form.register("ar_fee")}
                />
              )}

              {watchedFields.part_type === "Part E" && (
                <Input
                  label="Amount Awarded"
                  type="number"
                  placeholder="e.g., 2000"
                  helperText="Enter the awarded amount in dollars"
                  error={form.formState.errors.awarded_amount?.message}
                  {...form.register("awarded_amount")}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-primary" />
                <CardTitle>Invoice Items</CardTitle>
                <Badge variant="outline">
                  {fields.length} Item{fields.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <Button
                type="button"
                onClick={() => append({ name: "", date: "" })}
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
              >
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} variant="outlined" className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-foreground">
                      Item #{index + 1}
                    </h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => remove(index)}
                        variant="tertiary"
                        size="sm"
                        icon={<Minus className="h-4 w-4" />}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Service"
                      required
                      error={
                        form.formState.errors.invoice_items?.[index]?.name
                          ?.message
                      }
                      {...form.register(`invoice_items.${index}.name`)}
                      placeholder="Select a service..."
                    >
                      {INVOICE_ITEMS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>

                    <Input
                      type="date"
                      label="Service Date"
                      required
                      error={
                        form.formState.errors.invoice_items?.[index]?.date
                          ?.message
                      }
                      {...form.register(`invoice_items.${index}.date`)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card
          variant="elevated"
          className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-success/5"
        >
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Progress indicator */}
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-colors",
                      progressPercentage === 100
                        ? "bg-success animate-pulse"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    Form{" "}
                    {progressPercentage === 100 ? "Complete" : "In Progress"}
                  </span>
                </div>

                {progressPercentage < 100 && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground max-w-md mx-auto">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      Complete all required fields to generate your professional
                      invoice
                    </span>
                  </div>
                )}
              </div>

              {/* Main action button */}
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || progressPercentage < 100}
                  variant={progressPercentage === 100 ? "primary" : "secondary"}
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className={cn(
                    "min-w-[200px] transition-all duration-200",
                    loading && "animate-pulse"
                  )}
                  icon={loading ? undefined : <FileDown className="h-5 w-5" />}
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Generating Invoice...</span>
                    </span>
                  ) : progressPercentage === 100 ? (
                    "Generate Professional Invoice"
                  ) : (
                    "Complete Form to Generate"
                  )}
                </Button>
              </div>

              {/* Additional context when ready */}
              {progressPercentage === 100 && !loading && (
                <div className="text-xs text-muted-foreground bg-success/10 border border-success/20 rounded-lg p-3 max-w-md mx-auto">
                  ✓ Ready to generate your Excel invoice with automatic
                  calculations
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
