"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  MessageSquare,
  Copy,
  Database,
  CheckCircle,
  AlertCircle,
  Phone,
} from "lucide-react";
import { buildLogEntry } from "@/lib/airtable-log";
import {
  fillTemplate,
  formatAmount,
  getTemplatesForTool,
} from "@/lib/text-templates";

interface Client {
  id: string;
  fields: {
    Name: string;
    [key: string]: string | string[] | undefined;
  };
}

/** Copy-to-clipboard button that confirms itself for a few seconds */
function CopyButton({
  value,
  label,
  variant = "outline",
  size = "default",
}: {
  value: string;
  label: string;
  variant?: "outline" | "secondary";
  size?: "sm" | "default";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant={copied ? "success" : variant}
      size={size}
      icon={<Copy className="h-4 w-4" />}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}

export interface TextTemplateCardProps {
  client: Client;
  /** Which form this card is on — selects the templates it offers */
  tool: string;
  /** Client name as the form already parsed it, used to seed the name field */
  defaultClientName: string;
}

export function TextTemplateCard({
  client,
  tool,
  defaultClientName,
}: TextTemplateCardProps) {
  const { data: session } = useSession();
  const { refreshClients } = useClients();

  const templates = useMemo(() => getTemplatesForTool(tool), [tool]);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [clientName, setClientName] = useState(defaultClientName);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // Edits the user makes to the composed message. Cleared whenever an input
  // changes, so a stale hand-edit can't outlive the values it was based on.
  const [edited, setEdited] = useState<string | null>(null);

  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);

  // Airtable stores Phone as a plain string, but the record type allows arrays
  const rawPhone = client.fields.Phone;
  const phone = (typeof rawPhone === "string" ? rawPhone : "").trim();

  // Sender is whoever is signed in — the account's name, or the email local
  // part if a name was never set on it
  const senderName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "your advocate";

  const tokenValues: Record<string, string> = {
    client_name: clientName,
    sender_name: senderName,
    ...Object.fromEntries(
      Object.entries(fieldValues).map(([key, value]) => [
        key,
        key === "amount" ? formatAmount(value) : value,
      ])
    ),
  };

  const composed = template ? fillTemplate(template.body, tokenValues) : "";
  const message = edited ?? composed;

  // Any change to the inputs recomposes the message from scratch
  const resetComposed = () => {
    setEdited(null);
    setLogged(false);
    setLogError(null);
  };

  const missingRequired = (template?.fields ?? []).some(
    (field) => field.required && !fieldValues[field.key]?.trim()
  );

  const handleLog = async () => {
    if (!template || !message.trim() || missingRequired) return;

    setLogging(true);
    setLogError(null);
    try {
      const summary = fillTemplate(template.logSummary, tokenValues);
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: client.id,
          prepend: {
            Log: buildLogEntry(
              `Texted client re: ${summary}`,
              session?.user?.email
            ),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details ||
            errorData.error ||
            "Failed to update client in Airtable"
        );
      }

      setLogged(true);
    } catch (error) {
      console.error("Error logging text to Airtable:", error);
      setLogError(
        error instanceof Error
          ? `${error.message}. Please try again.`
          : "Failed to log to Airtable. Please try again."
      );
      setLogging(false);
      return;
    }

    // After the fact — a stale cache must not be reported as a failed write,
    // since the log entry has already landed
    try {
      await refreshClients(true);
    } catch (error) {
      console.error("Failed to refresh client cache after logging:", error);
    }
    setLogging(false);
  };

  if (!template) return null;

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>Text the Client</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Copy the message below, then log it here once you&apos;ve sent it.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Template picker — hidden when a tool only offers one */}
          {templates.length > 1 && (
            <div className="space-y-3">
              {templates.map((option) => {
                const selected = option.id === templateId;
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.id}
                      checked={selected}
                      onChange={() => {
                        setTemplateId(option.id);
                        resetComposed();
                      }}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <div>
                      <div className="font-medium text-foreground">
                        {option.name}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Client Name"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                resetComposed();
              }}
              helperText="How they're addressed in the text — a first name reads better"
            />

            {(template.fields ?? []).map((field) => (
              <Input
                key={field.key}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                helperText={field.helperText}
                value={fieldValues[field.key] ?? ""}
                onChange={(e) => {
                  setFieldValues((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }));
                  resetComposed();
                }}
              />
            ))}
          </div>

          <Textarea
            label="Message"
            value={message}
            onChange={(e) => {
              setEdited(e.target.value);
              setLogged(false);
            }}
            rows={6}
            helperText="Edit freely — the copy button takes whatever is in this box"
          />

          {logError && (
            <div className="flex items-start text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="ml-2">{logError}</span>
            </div>
          )}

          {/* The number to send it to, straight off the client record */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted-foreground">Client Phone</div>
              {phone ? (
                <div className="font-mono text-base font-medium text-foreground break-all">
                  {phone}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No phone number on {client.fields.Name}&apos;s record
                </div>
              )}
            </div>
            {phone && (
              <CopyButton
                value={phone}
                label="Copy Number"
                variant="secondary"
                size="sm"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CopyButton value={message} label="Copy Message" />

            {logged ? (
              <div className="flex items-center text-sm text-success">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="ml-2">
                  Logged on {client.fields.Name}&apos;s record
                </span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleLog}
                disabled={!message.trim() || missingRequired || logging}
                loading={logging}
                icon={<Database className="h-4 w-4" />}
              >
                {logging ? "Logging..." : "Log to Airtable"}
              </Button>
            )}
          </div>

          {missingRequired && (
            <p className="text-sm text-muted-foreground">
              Fill in every required field above before logging.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
