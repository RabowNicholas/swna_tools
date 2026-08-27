'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Mail, Copy, ExternalLink, CheckCircle, Database, AlertCircle } from 'lucide-react';
import {
  EMAIL_ADDRESSES,
  formatDPReferralEmailBody,
  getDPReferralSubjectLine,
  createMailtoLink,
  formatCompleteEmail,
} from '@/lib/email-utils';
import { buildLogEntry } from '@/lib/airtable-log';

interface Client {
  id: string;
  fields: {
    Name?: string;
    [key: string]: string | string[] | undefined;
  };
}

export interface DPReferralEmailDraftProps {
  patientName: string;
  client: Client;
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

export function DPReferralEmailDraft({ patientName, client }: DPReferralEmailDraftProps) {
  const { data: session } = useSession();
  const { refreshClients } = useClients();
  const to = [EMAIL_ADDRESSES.ao];
  const cc: string[] = [];
  const subject = getDPReferralSubjectLine(patientName);
  const body = formatDPReferralEmailBody(patientName);

  const mailtoLink = createMailtoLink(to, cc, subject, body);
  const completeEmail = formatCompleteEmail(to, cc, subject, body);

  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const handleLog = async () => {
    setLogging(true);
    setLogError(null);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: client.id,
          prepend: {
            Log: buildLogEntry(
              `Sent Desert Pulmonary referral to ${to.join(', ')}`,
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
            'Failed to update client in Airtable'
        );
      }

      setLogged(true);
    } catch (error) {
      console.error('Error logging Desert Pulmonary referral to Airtable:', error);
      setLogError(
        error instanceof Error
          ? `${error.message}. Please try again.`
          : 'Failed to log to Airtable. Please try again.'
      );
      setLogging(false);
      return;
    }

    // After the fact — a stale cache must not be reported as a failed write,
    // since the log entry has already landed
    try {
      await refreshClients(true);
    } catch (error) {
      console.error('Failed to refresh client cache after logging:', error);
    }
    setLogging(false);
  };

  return (
    <div className="space-y-8">
      <Card variant="elevated" className="bg-success/5 border-success/20">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Draft - Ready to Send</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Send this email to Roxy at AO with the Desert Pulmonary referral attached
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">TO</label>
              <div className="flex items-center space-x-3">
                <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
                  <div className="text-sm font-mono text-foreground">
                    {to.join(', ')}
                  </div>
                </div>
                <CopyButton value={to.join(', ')} label="Copy" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Subject</label>
              <div className="flex items-center space-x-3">
                <div className="flex-1 px-3 py-2 border border-border rounded-md bg-accent/50">
                  <div className="text-sm font-mono text-foreground">{subject}</div>
                </div>
                <CopyButton value={subject} label="Copy" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Body</label>
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
              &quot;Copy All&quot; copies the complete email with headers. &quot;Open in Email Client&quot; opens your default email application with everything pre-filled. Attach the downloaded referral PDF before sending.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Update Airtable</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Once you&apos;ve sent the email, log it here to note the referral
            went to {to.join(', ')}.
          </p>
        </CardHeader>
        <CardContent>
          {logError && (
            <div className="flex items-start text-sm text-destructive mb-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="ml-2">{logError}</span>
            </div>
          )}

          {logged ? (
            <div className="flex items-center text-sm text-success">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="ml-2">
                Logged on {client.fields.Name ?? "the client"}&apos;s record
              </span>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleLog}
              disabled={logging}
              loading={logging}
              icon={<Database className="h-4 w-4" />}
            >
              {logging ? "Logging..." : "Log to Airtable"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
