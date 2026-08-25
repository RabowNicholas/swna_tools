"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { trackEvent } from "@/lib/analytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { MessageSquare, Zap } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TextTemplateCard } from "@/components/text/TextTemplateCard";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";

interface Client {
  id: string;
  fields: {
    Name: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function TextMessageForm() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClients();
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed("text-message", session.user.id);
    }
  }, [session]);

  const selectedClient = clients.find((c) => c.id === clientId) as
    | Client
    | undefined;

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
              <Zap className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Error Loading Clients
            </h3>
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
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Text a Client</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a client and a canned message, then log it once it&apos;s
                sent
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Client Selection */}
      <ClientSelector
        clients={clients as any}
        value={clientId}
        onChange={(id) => setClientId(id)}
        onRefresh={() => refreshClients(true)}
        label="Select Client"
        cardTitle="Client Selection"
      />

      {/* Template picker, message preview, and Airtable logging — keyed by
          client so switching clients starts the card fresh instead of
          carrying over the previous client's picked template or edits */}
      {selectedClient && (
        <TextTemplateCard
          key={selectedClient.id}
          client={selectedClient}
          defaultClientName={parseClientName(selectedClient.fields.Name || "")}
        />
      )}
    </div>
  );
}
