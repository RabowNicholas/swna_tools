'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  ClipboardList,
  Database,
  CheckCircle,
  AlertCircle,
  FileDown,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  EMAIL_ADDRESSES,
  CoordinationItem,
  getCoordinationItems,
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

// Approved conditions offered for the DP referral's DX line, as they're
// written on the form — several are joined with a semicolon
const DP_CONDITIONS = [
  'Silicosis (J62.8)',
  'Obstructive sleep apnea (G47.33)',
  'Hypoxemia (R06.02)',
  'Asthma (J45.909)',
];

const SECTIONS: { key: CoordinationItem['section']; title: string }[] = [
  { key: 'email', title: 'IR Request Email' },
  { key: 'testing', title: 'Testing' },
  { key: 'ovn', title: 'OVN' },
];

/**
 * The EE-10 portal submission, logged as the first part of the entry. Its
 * reference number is required, so nothing is logged for an EE-10 that never
 * made it into the portal.
 */
export interface EE10Submission {
  /** The log text for the submission, e.g. `Submitted EE-10, ... (*12345)` */
  action: (reference: string) => string;
  /** Status tags added in the same write */
  statusAdd: string[];
  /** Status tags dropped in the same write, if the record holds them */
  statusRemove: string[];
  /** Tags the added ones go after, when the record holds them; otherwise they go first */
  statusAfter?: string[];
}

export interface IRCoordinationCardProps {
  client: Client;
  submission: EE10Submission;
  doctor: 'La Plata' | 'Dr. Lewis';
  clientStatus: string;
  clientState?: string;
  /** Patient details from the EE-10 form, for the Desert Pulmonary referral */
  patient: {
    name: string;
    phone: string;
    dob: string;
    caseId: string;
    addressMain: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
  };
}

/**
 * The EE-10's last step: paste the portal reference number, check off what
 * was done for this client's testing/OVN path — generating the Desert
 * Pulmonary referral inline when the path needs one — and log the submission
 * and the checked items to the client's Airtable Log in one entry, with the
 * IR tag swap in the same write. Give it a `key` that changes per submission
 * so a new EE-10 starts it fresh.
 */
export function IRCoordinationCard({
  client,
  submission,
  doctor,
  clientStatus,
  clientState,
  patient,
}: IRCoordinationCardProps) {
  const { data: session } = useSession();
  const { refreshClients } = useClients();
  const items = getCoordinationItems(doctor, clientStatus, clientState);
  const dpItem = items.find((i) => i.dpReferral);

  const [referenceNumber, setReferenceNumber] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [conditions, setConditions] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [dpDownloading, setDpDownloading] = useState(false);
  const [dpError, setDpError] = useState<string | null>(null);

  const setItemChecked = (id: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const checkedTexts = items
    .filter((i) => i.logText && checked.has(i.id))
    .map((i) => i.logText as string);
  const reference = referenceNumber.trim();
  const trimmedNote = note.trim().replace(/\.+$/, '');
  const logAction = (ref: string) =>
    [[submission.action(ref), ...checkedTexts].join('; '), trimmedNote]
      .filter(Boolean)
      .join('. ');
  const ready = !!reference;

  const handleDpDownload = async () => {
    if (!conditions.length) {
      setDpError('Pick at least one approved condition.');
      return;
    }
    setDpDownloading(true);
    setDpError(null);
    try {
      const response = await fetch('/api/generate/desert-pulm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_record: client,
          form_data: {
            patient_name: patient.name,
            phone_number: patient.phone,
            dob: patient.dob,
            case_id: patient.caseId,
            address_main: patient.addressMain,
            address_city: patient.addressCity,
            address_state: patient.addressState,
            address_zip: patient.addressZip,
            // Kept in the order they're listed, however they were ticked
            dx_code: DP_CONDITIONS.filter((c) => conditions.includes(c)).join('; '),
          },
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate Desert Pulmonary referral');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Desert_Pulm_Referral_${patient.name.replace(/\s+/g, '_')}_${new Date()
        .toLocaleDateString('en-US')
        .replace(/\//g, '.')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (dpItem) setItemChecked(dpItem.id, true);
    } catch (error) {
      console.error('Error generating Desert Pulmonary referral:', error);
      setDpError(
        error instanceof Error ? error.message : 'Failed to generate Desert Pulmonary referral'
      );
    } finally {
      setDpDownloading(false);
    }
  };

  const handleLog = async () => {
    if (!ready) return;
    setLogging(true);
    setLogError(null);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: client.id,
          prepend: {
            Log: buildLogEntry(logAction(reference), session?.user?.email),
            // Merged ahead of the record's existing Status rather than replacing it
            ...(submission.statusAdd.length ? { Status: submission.statusAdd } : {}),
          },
          // Resolved against the record's current Status in the same PATCH
          ...(submission.statusRemove.length
            ? { remove: { Status: submission.statusRemove } }
            : {}),
          ...(submission.statusAfter?.length
            ? { after: { Status: submission.statusAfter } }
            : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || 'Failed to update client in Airtable'
        );
      }

      setLogged(true);
    } catch (error) {
      console.error('Error logging IR coordination to Airtable:', error);
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

  // DP referral email: to Roxy, cc Hunter
  const dpTo = [EMAIL_ADDRESSES.ao];
  const dpCc = [EMAIL_ADDRESSES.aoHunter];
  const dpSubject = getDPReferralSubjectLine(patient.name);
  const dpBody = formatDPReferralEmailBody(patient.name, availability);

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle>Coordination Checklist</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste the EE-10 reference number, check off what you&apos;ve done for this client&apos;s
          testing and OVN path, then log it all to Airtable in one entry
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">EE-10 Submission</h4>
            {logged ? (
              <p className="text-sm text-foreground">Reference {reference}</p>
            ) : (
              <Input
                label="Portal Reference Number"
                required
                placeholder="Paste the reference number from the portal"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={logging}
                helperText="Shown by the portal after you upload the EE-10"
              />
            )}
          </div>

          {SECTIONS.map(({ key, title }) => {
            const sectionItems = items.filter((i) => i.section === key);
            if (!sectionItems.length) return null;
            return (
              <div key={key}>
                <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
                <ul className="space-y-3">
                  {sectionItems.map((item) => (
                    <li key={item.id} className="space-y-3">
                      {item.logText ? (
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                            checked={checked.has(item.id)}
                            onChange={(e) => setItemChecked(item.id, e.target.checked)}
                            disabled={logged || logging}
                          />
                          <span className="text-sm text-foreground">{item.label}</span>
                        </label>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-7">{item.label}</p>
                      )}

                      {item.dpReferral && !logged && (
                        <div className="ml-7 p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">
                              Approved conditions (from the Final Decision)
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {DP_CONDITIONS.map((c) => (
                                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border accent-primary"
                                    checked={conditions.includes(c)}
                                    onChange={(e) =>
                                      setConditions((prev) =>
                                        e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)
                                      )
                                    }
                                  />
                                  {c}
                                </label>
                              ))}
                            </div>
                          </div>

                          <Input
                            label="Client's general availability"
                            placeholder="e.g. Weekday mornings, not Fridays"
                            value={availability}
                            onChange={(e) => setAvailability(e.target.value)}
                            helperText="Goes in the email to Roxy"
                          />

                          {dpError && (
                            <div className="flex items-start text-sm text-destructive">
                              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span className="ml-2">{dpError}</span>
                            </div>
                          )}

                          <Button
                            type="button"
                            onClick={handleDpDownload}
                            loading={dpDownloading}
                            disabled={dpDownloading}
                            icon={<FileDown className="h-4 w-4" />}
                          >
                            {dpDownloading ? 'Generating...' : 'Download Referral'}
                          </Button>

                          <div className="space-y-2 text-sm">
                            <p className="font-medium text-foreground">Email to AO</p>
                            <pre className="px-3 py-2 border border-border rounded-md bg-accent/50 font-mono text-xs text-foreground whitespace-pre-wrap">
                              {formatCompleteEmail(dpTo, dpCc, dpSubject, dpBody)}
                            </pre>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={<Copy className="h-4 w-4" />}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(dpBody);
                                  } catch (err) {
                                    console.error('Failed to copy:', err);
                                  }
                                }}
                              >
                                Copy Body
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                icon={<ExternalLink className="h-4 w-4" />}
                                onClick={() => {
                                  window.location.href = createMailtoLink(dpTo, dpCc, dpSubject, dpBody);
                                }}
                              >
                                Open in Email Client
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Attach the downloaded referral before sending.
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="border-t border-border pt-6 space-y-4">
            {logged ? (
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                <div className="ml-4">
                  <h3 className="text-base font-medium text-foreground mb-1">Airtable updated</h3>
                  <p className="text-sm text-muted-foreground">
                    Logged on {client.fields.Name ?? 'the client'}&apos;s record.
                    {submission.statusAdd.length > 0 && (
                      <>
                        {' '}
                        The {submission.statusAdd.join(' and ')} tag was added to Status.
                      </>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Textarea
                  label="Note (optional)"
                  placeholder="e.g. Client wants to see La Plata; AO already has a PFT w/ bronchodilators on file"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={logging}
                  rows={3}
                />

                {logError && (
                  <div className="flex items-start text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="ml-2">{logError}</span>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Adds to {client.fields.Name ?? 'the client'}&apos;s log:{' '}
                  <span className="font-medium text-foreground">
                    {buildLogEntry(logAction(reference || 'REFERENCE'), session?.user?.email)}
                  </span>
                </div>

                {submission.statusAdd.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Adds the {submission.statusAdd.join(' and ')} tag to the client&apos;s Status
                    {submission.statusRemove.length > 0 && (
                      <> and removes {submission.statusRemove.join(', ')} if present</>
                    )}
                    .
                  </p>
                )}

                <Button
                  type="button"
                  onClick={handleLog}
                  disabled={!ready || logging}
                  loading={logging}
                  icon={<Database className="h-5 w-5" />}
                >
                  {logging ? 'Logging...' : 'Log to Airtable'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
