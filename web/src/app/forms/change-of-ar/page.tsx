"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  FileDown,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  UserX,
} from "lucide-react";
import Image from "next/image";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoading, PageError } from "@/components/ui/PageStatus";

const changeOfARSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  claimant_name: z.string().min(1, "Claimant name is required"),
  letter_date: z.string().min(1, "Letter date is required"),
  prev_rep_name: z.string().min(1, "Previous representative name is required"),
  phone: z.string().min(1, "Phone number is required"),
});

type ChangeOfARFormData = z.infer<typeof changeOfARSchema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    Phone?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function ChangeOfARForm() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClientContext();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);

  const form = useForm<ChangeOfARFormData>({
    resolver: zodResolver(changeOfARSchema),
    defaultValues: {
      client_id: "",
      claimant_name: "",
      letter_date: new Date().toISOString().split("T")[0],
      prev_rep_name: "",
      phone: "",
    },
  });

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId) as any;
    if (client) {
      form.reset();
      form.setValue("client_id", clientId);
      form.setValue(
        "claimant_name",
        parseClientName(client.fields.Name || "")
      );
      form.setValue("phone", client.fields["Phone"] || "");
      form.setValue("letter_date", new Date().toISOString().split("T")[0]);
    }
  };

  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PNG or JPEG image file.");
        return;
      }
      try {
        setSignatureFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setSignaturePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error loading signature image:", error);
        alert("Failed to load signature image. Please try a different image.");
      }
    }
  };

  const onSubmit = async (data: ChangeOfARFormData) => {
    setLoading(true);
    try {
      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const formDataForAPI = new FormData();
      formDataForAPI.append("client_record", JSON.stringify(selectedClient));

      const formDataPayload = {
        claimant_name: data.claimant_name,
        letter_date: data.letter_date,
        prev_rep_name: data.prev_rep_name,
        phone: data.phone,
      };
      formDataForAPI.append("form_data", JSON.stringify(formDataPayload));

      if (signatureFile) {
        formDataForAPI.append("signature_file", signatureFile);
      }

      const response = await fetch("/api/generate/change-of-ar", {
        method: "POST",
        body: formDataForAPI,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const nameForFile = data.claimant_name.replace(/\s+/g, "_");
        const currentDate = new Date()
          .toLocaleDateString("en-US")
          .replace(/\//g, ".");
        a.download = `Change_of_AR_${nameForFile}_${currentDate}.pdf`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setFormSubmitted(true);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate Change of AR letter"
        );
      }
    } catch (error) {
      console.error("Error generating Change of AR letter:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate Change of AR letter"
      );
    } finally {
      setLoading(false);
    }
  };

  if (clientsLoading) {
    return <PageLoading label="Loading clients…" />;
  }

  if (clientsError) {
    return <PageError title="Couldn’t load clients" message={clientsError} onRetry={() => refreshClients(true)} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader />

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

        {/* Letter Details */}
        {form.watch("client_id") && (
          <>
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <UserX className="h-5 w-5 text-primary" />
                  <CardTitle>Letter Details</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Client information and representative change details
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Claimant Name"
                      required
                      error={form.formState.errors.claimant_name?.message}
                      {...form.register("claimant_name")}
                      readOnly
                      className="bg-muted/30"
                    />

                    <Input
                      label="Phone Number"
                      required
                      error={form.formState.errors.phone?.message}
                      {...form.register("phone")}
                      readOnly
                      className="bg-muted/30"
                    />
                  </div>

                  <Input
                    label="Letter Date"
                    type="date"
                    required
                    error={form.formState.errors.letter_date?.message}
                    {...form.register("letter_date")}
                  />

                  <Input
                    label="Previous Representative"
                    required
                    error={form.formState.errors.prev_rep_name?.message}
                    placeholder="Enter previous representative's name"
                    {...form.register("prev_rep_name")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Signature Upload */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <CardTitle>Client Signature</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload the client&apos;s signature (PNG or JPEG)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="signature-upload"
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted/50 transition-colors text-sm">
                        <Upload className="h-4 w-4" />
                        {signatureFile ? "Change Signature" : "Upload Signature"}
                      </div>
                      <input
                        id="signature-upload"
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        className="hidden"
                        onChange={handleSignatureUpload}
                      />
                    </label>

                    {signatureFile && (
                      <span className="text-sm text-muted-foreground">
                        {signatureFile.name}
                      </span>
                    )}

                    {signaturePreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowSignaturePreview(!showSignaturePreview)
                        }
                        icon={
                          showSignaturePreview ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )
                        }
                      >
                        {showSignaturePreview ? "Hide" : "Show"} Preview
                      </Button>
                    )}
                  </div>

                  {showSignaturePreview && signaturePreview && (
                    <div className="border border-border rounded-md p-4 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-2">
                        Signature Preview:
                      </p>
                      <Image
                        src={signaturePreview}
                        alt="Signature preview"
                        width={300}
                        height={100}
                        className="max-h-[100px] w-auto object-contain"
                        unoptimized
                      />
                    </div>
                  )}

                  {!signatureFile && (
                    <p className="text-sm text-muted-foreground">
                      No signature uploaded. The letter will be generated
                      without a signature.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Generate Button */}
        <Card
          variant="elevated"
        >
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !form.watch("client_id") ||
                    !form.watch("prev_rep_name")
                  }
                  variant="primary"
                  hierarchy="primary"
                  size="xl"
                  loading={loading}
                  className="min-w-[250px]"
                  icon={<FileDown className="h-5 w-5" />}
                >
                  {loading ? "Generating Letter..." : "Generate Change of AR Letter"}
                </Button>
              </div>

              {!form.watch("client_id") && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to generate a Change of AR letter
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Success Message */}
      {formSubmitted && (
        <Card variant="elevated" className="bg-success/10 border-success/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Change of AR letter generated successfully!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your Change of AR letter has been downloaded. Please have the
                  client sign it and fax it to OWCP-DEEOIC.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
