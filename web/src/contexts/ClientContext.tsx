'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { clientStorage, Client } from '@/lib/clientStorage';

interface ClientContextType {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refreshClients: (force?: boolean) => Promise<void>;
  getClientById: (id: string) => Client | null;
  getCacheInfo: () => { cached: boolean; timestamp?: number; expiresAt?: number; clientCount?: number };
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  // Whether a list has ever landed. Gates the loading flag below — see why it
  // matters there.
  const hasLoaded = useRef(false);

  const refreshClients = useCallback(async (force: boolean = false) => {
    // Only the first load blocks. Every form page renders a full-page spinner
    // while `loading` is true, so raising it for a background refresh unmounts
    // the open form along with whatever card asked for the refresh — the
    // Airtable log card would lose the reference number it had just written
    // and come back blank, making a successful write look like it reset.
    if (!hasLoaded.current) setLoading(true);
    setError(null);

    try {
      const fetchedClients = await clientStorage.getClients(force);
      setClients(fetchedClients);
      hasLoaded.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clients';
      setError(errorMessage);
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-initialize clients on mount
  useEffect(() => {
    if (hasInitialized.current) return;

    hasInitialized.current = true;
    refreshClients();
  }, [refreshClients]);

  const getClientById = useCallback((id: string): Client | null => {
    return clients.find(client => client.id === id) || null;
  }, [clients]);

  const getCacheInfo = useCallback(() => {
    return clientStorage.getCacheInfo();
  }, []);

  const value: ClientContextType = {
    clients,
    loading,
    error,
    refreshClients,
    getClientById,
    getCacheInfo,
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext(): ClientContextType {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
}