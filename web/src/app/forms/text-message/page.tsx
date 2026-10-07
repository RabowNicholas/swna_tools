"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { TextTemplateCard } from "@/components/text/TextTemplateCard";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLoading, PageError } from "@/components/ui/PageStatus";

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

  const selectedClient = clients.find((c) => c.id === clientId) as
    | Client
    | undefined;

  if (clientsLoading) {
    return <PageLoading label="Loading clients…" />;
  }

  if (clientsError) {
    return <PageError title="Couldn’t load clients" message={clientsError} onRetry={() => refreshClients(true)} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader />

      {/* Client Selection */}
      <ClientSelector
        clients={clients as any}
        value={clientId}
        onChange={(id) => setClientId(id)}
        onRefresh={() => refreshClients(true)}
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
