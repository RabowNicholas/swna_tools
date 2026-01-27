'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Mail, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import {
  detectClientStatus,
  getEmailRecipients,
  formatIRNoticeEmailBody,
  getIRNoticeSubjectLine,
  createMailtoLink,
  formatCompleteEmail,
} from '@/lib/email-utils';

interface Client {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    State?: string;
    [key: string]: string | string[] | undefined;
  };
}

export interface IRNoticeEmailDraftProps {
  client: Client;
  clientName: string;
  provider: "La Plata Medical" | "Dr. Lewis";
  appointmentDate: string;
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

export function IRNoticeEmailDraft({ client, clientName, provider, appointmentDate }: IRNoticeEmailDraftProps) {
  const clientStatus = detectClientStatus(client);

  // Map provider name to doctor key for email recipients
  const doctorKey: "La Plata" | "Dr. Lewis" = provider === "La Plata Medical" ? "La Plata" : "Dr. Lewis";

  // Determine HHC location based on client state
  const clientState = client.fields.State;
  let hhcLocation: 'NV' | 'TN' | undefined;
  if (clientStatus === 'GHHC Client' && clientState) {
    if (clientState.includes('NV') || clientState.toLowerCase().includes('nevada')) {
      hhcLocation = 'NV';
    } else if (clientState.includes('TN') || clientState.toLowerCase().includes('tennessee')) {
      hhcLocation = 'TN';
    }
  }

  // Format the appointment date for display
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate email data
  const recipients = getEmailRecipients(doctorKey, clientStatus, hhcLocation);
  const subject = getIRNoticeSubjectLine(clientName);
  const body = formatIRNoticeEmailBody(clientName, provider, formattedDate);

  const mailtoLink = createMailtoLink(recipients.to, recipients.cc, subject, body);
  const completeEmail = formatCompleteEmail(recipients.to, recipients.cc, subject, body);

  return (
    <div className="space-y-8">
      {/* Email Preview Card */}
      <Card variant="elevated" className="bg-success/5 border-success/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Draft - Ready to Send</CardTitle>
            </div>
            {clientStatus && (
              <Badge variant={clientStatus === "AO Client" ? "default" : "secondary"}>
                {clientStatus}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Send this email to notify {provider} about the IR appointment
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
            {recipients.cc.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  CC
                </label>
                <div className="space-y-2">
                  {recipients.cc.map((email, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
                        <div className="text-sm font-mono text-foreground">
                          {email}
                        </div>
                      </div>
                      <CopyButton value={email} label="Copy" />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
    </div>
  );
}
