'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Mail, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import {
  detectClientStatus,
  getEmailRecipients,
  formatEmailBody,
  getSubjectLine,
  createMailtoLink,
  formatCompleteEmail,
} from '@/lib/email-utils';

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    [key: string]: string | string[] | undefined;
  };
}

export interface EmailDraftProps {
  client: Client;
  doctor: "La Plata" | "Dr. Lewis";
  formData: {
    name: string;
    caseId: string;
    phone: string;
    address: string;
    dob: string;
    workHistoryDates?: string;
    hhcLocation?: 'NV' | 'TN';
  };
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant={copied ? 'success' : 'outline'}
      size="sm"
      icon={<Copy className="h-4 w-4" />}
    >
      {copied ? 'Copied!' : label}
    </Button>
  );
}

export function EmailDraft({ client, doctor, formData }: EmailDraftProps) {
  const clientStatus = detectClientStatus(client);

  // Generate email data directly from props
  const recipients = getEmailRecipients(doctor, clientStatus, formData.hhcLocation);
  const subject = getSubjectLine(formData.name);
  const body = formatEmailBody(
    doctor,
    formData.name,
    formData.phone,
    formData.dob,
    formData.caseId,
    formData.address,
    formData.workHistoryDates
  );

  const mailtoLink = createMailtoLink(recipients.to, recipients.cc, subject, body);
  const completeEmail = formatCompleteEmail(recipients.to, recipients.cc, subject, body);

  return (
    <div className="space-y-8">
      {/* Header with client status */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Preview - Ready to Send</CardTitle>
            </div>
            {clientStatus && (
              <Badge variant={clientStatus === "AO Client" ? "default" : "secondary"}>
                {clientStatus}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            IR request email to {doctor} with client information
          </p>
        </CardHeader>
        <CardContent>
          {/* Auto-populated client info (read-only display) */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Client Information (from form)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="text-foreground font-mono">{formData.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Case ID:</span>{' '}
                <span className="text-foreground font-mono">{formData.caseId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>{' '}
                <span className="text-foreground font-mono">{formData.phone}</span>
              </div>
              <div>
                <span className="text-muted-foreground">DOB:</span>{' '}
                <span className="text-foreground font-mono">{formData.dob}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Address:</span>{' '}
                <span className="text-foreground font-mono whitespace-pre-line">{formData.address}</span>
              </div>
              {formData.workHistoryDates && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Work History:</span>{' '}
                  <span className="text-foreground font-mono">{formData.workHistoryDates}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview */}
      <>
          <Card variant="elevated" className="bg-success/5 border-success/20">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <CardTitle className="text-success">Email Preview</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Review the email details and copy or open in your email client
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* TO */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    TO
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
                      <div className="text-sm font-mono text-foreground">
                        {recipients.to.join(', ')}
                      </div>
                    </div>
                    <CopyButton value={recipients.to.join(', ')} label="Copy" />
                  </div>
                </div>

                {/* CC */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    CC
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
                      <div className="text-sm font-mono text-foreground">
                        {recipients.cc.join(', ')}
                      </div>
                    </div>
                    <CopyButton value={recipients.cc.join(', ')} label="Copy" />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Subject
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
                      <div className="text-sm font-mono text-foreground">
                        {subject}
                      </div>
                    </div>
                    <CopyButton value={subject} label="Copy" />
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Body
                  </label>
                  <div className="space-y-3">
                    <div className="px-3 py-2 border border-border rounded-md bg-accent/50">
                      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                        {body}
                      </pre>
                    </div>
                    <CopyButton value={body} label="Copy Body" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card variant="elevated">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 items-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(completeEmail);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }}
                    variant="outline"
                    size="lg"
                    icon={<Copy className="h-5 w-5" />}
                  >
                    Copy All to Clipboard
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      window.location.href = mailtoLink;
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                    icon={<ExternalLink className="h-5 w-5" />}
                  >
                    Open in Email Client
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center max-w-xl">
                  &quot;Copy All&quot; copies the complete email with headers. &quot;Open in Email Client&quot; opens your default email application with everything pre-filled.
                </p>
              </div>
            </CardContent>
          </Card>
      </>
    </div>
  );
}
