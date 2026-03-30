'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ClipboardList } from 'lucide-react';
import { getCoordinationSteps } from '@/lib/email-utils';

interface CoordinationChecklistProps {
  doctor: "La Plata" | "Dr. Lewis";
  clientStatus: string;
  clientState?: string;
}

export function CoordinationChecklist({ doctor, clientStatus, clientState }: CoordinationChecklistProps) {
  const steps = getCoordinationSteps(doctor, clientStatus, clientState);

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle>Coordination Checklist</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Next steps for testing and OVN based on this client's path
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Testing</h4>
            <ul className="space-y-2">
              {steps.testing.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                    readOnly
                  />
                  <span className="text-sm text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">OVN</h4>
            <ul className="space-y-2">
              {steps.ovn.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                    readOnly
                  />
                  <span className="text-sm text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
