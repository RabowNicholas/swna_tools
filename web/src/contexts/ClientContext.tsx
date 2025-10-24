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

  const refreshClients = useCallback(async (force: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const fetchedClients = await clientStorage.getClients(force);
      setClients(fetchedClients);
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