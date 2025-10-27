'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClientContext } from '@/contexts/ClientContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, CheckCircle, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PortalAccess } from '@/components/portal/PortalAccess';
import { ClientSelector, parseClientName } from '@/components/form/ClientSelector';

// Zod schema for form validation
const withdrawalSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Client name is required"),
  case_id: z.string().min(1, "Case ID is required"),
  letter_date: z.string().min(1, "Letter date is required"),
  claimed_condition: z.string().min(1, "Claimed condition is required"),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function WithdrawalForm() {
  const { clients, loading: clientsLoading, error: clientsError } = useClientContext();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      client_id: "",
      claimant_name: "",
      case_id: "",
      letter_date: new Date().toISOString().split("T")[0],
      claimed_condition: "",
    },
  });

  // Handle client selection and auto-fill
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      // Parse client name using shared utility
      const displayName = parseClientName(client.fields.Name || '');
      form.setValue("claimant_name", displayName);
      form.setValue("case_id", client.fields["Case ID"] || "");
    }
  };

  const onSubmit = async (data: WithdrawalFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const requestData = {
        client_record: selectedClient,
        form_data: {
          claimant_name: data.claimant_name,
          case_id: data.case_id,
          letter_date: data.letter_date,
          claimed_condition: data.claimed_condition,
        },
      };

      const response = await fetch("/api/generate/withdrawal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Generate filename
        const nameForFile = data.claimant_name.replace(/\s+/g, "_");
        const currentDate = new Date().toLocaleDateString("en-US").replace(/\//g, ".");
        a.download = `Withdrawal_Letter_${nameForFile}_${currentDate}.pdf`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate withdrawal letter");
      }
    } catch (error) {
      console.error("Error generating withdrawal letter:", error);
      alert(error instanceof Error ? error.message : "Failed to generate withdrawal letter");
    } finally {
      setLoading(false);
    }
  };

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
        <Card variant="elevated" className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-4">
              <X className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Clients</h3>
            <p className="text-muted-foreground">{clientsError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <X className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle className="text-2xl">Withdrawal Letter Generator</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate withdrawal letter for client's claim
                </p>
              </div>
            </div>
            <Badge variant="destructive" size="lg">
              DOL Letter
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Client Selection */}
        <ClientSelector
          clients={clients}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          error={form.formState.errors.client_id?.message}
        />

        {/* Letter Details */}
        {form.watch("client_id") && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-warning" />
                <CardTitle>Withdrawal Letter Details</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Information for the withdrawal letter
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Claimant Name"
                    required
                    error={form.formState.errors.claimant_name?.message}
                    helperText="Client's full name as it should appear in the letter"
                    {...form.register("claimant_name")}
                    readOnly
                    className="bg-muted/30"
                  />

                  <Input
                    label="Case ID"
                    required
                    error={form.formState.errors.case_id?.message}
                    helperText="Case ID from Airtable client record"
                    {...form.register("case_id")}
                    readOnly
                    className="bg-muted/30"
                  />
                </div>

                <Input
                  label="Letter Date"
                  type="date"
                  required
                  error={form.formState.errors.letter_date?.message}
                  helperText="Date for the withdrawal letter"
                  {...form.register("letter_date")}
                />

                <Input
                  label="Claimed Condition"
                  required
                  error={form.formState.errors.claimed_condition?.message}
                  placeholder="e.g., Lung cancer, Beryllium sensitivity, etc."
                  helperText="The specific condition being withdrawn from the claim"
                  {...form.register("claimed_condition")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        <Card variant="elevated" className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-success/5">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || !form.watch("client_id") || !form.watch("claimed_condition")}
                  variant="primary"
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className="min-w-[250px]"
                  icon={<FileText className="h-5 w-5" />}
                >
                  {loading ? "Generating Withdrawal Letter..." : "Generate Withdrawal Letter"}
                </Button>
              </div>

              {!form.watch("client_id") && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate their withdrawal letter
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Success Message and Portal Access */}
      {formSubmitted && submittedClient && (
        <>
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    🎉 Withdrawal letter generated successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your formal withdrawal letter has been downloaded and is ready for submission to the Department of Labor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PortalAccess client={submittedClient} autoOpen={true} />
        </>
      )}
    </div>
  );
}
