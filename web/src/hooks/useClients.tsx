'use client';

import { useState, useEffect, useCallback } from 'react';
import { clientStorage, Client } from '@/lib/clientStorage';
import { useClientContext } from '@/contexts/ClientContext';

export interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refreshClients: (force?: boolean) => Promise<void>;
  getClientById: (id: string) => Client | null;
  getCacheInfo: () => { cached: boolean; timestamp?: number; expiresAt?: number; clientCount?: number };
}

export function useClients(): UseClientsReturn {
  // Fallback local implementation (always initialize hooks first)
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const refreshClients = useCallback(async (force: boolean = false) => {
    setLoading(true);
    setLocalError(null);

    try {
      const fetchedClients = await clientStorage.getClients(force);
      setClients(fetchedClients);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clients';
      setLocalError(errorMessage);
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getClientById = useCallback((id: string): Client | null => {
    return clients.find(client => client.id === id) || null;
  }, [clients]);

  const getCacheInfo = useCallback(() => {
    return clientStorage.getCacheInfo();
  }, []);

  // Load clients on mount
  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  // Try to use context, fallback to local state
  try {
    const context = useClientContext();
    return {
      clients: context.clients,
      loading: context.loading,
      error: context.error,
      refreshClients: context.refreshClients,
      getClientById: context.getClientById,
      getCacheInfo: context.getCacheInfo
    };
  } catch {
    // Context not available, return local implementation
    console.warn('ClientContext not available, using local implementation');
  }

  return {
    clients,
    loading,
    error: localError,
    refreshClients,
    getClientById,
    getCacheInfo
  };
}

// Hook for getting a specific client by ID with automatic loading
export function useClient(clientId: string | null): {
  client: Client | null;
  loading: boolean;
  error: string | null;
} {
  const { clients, loading, error } = useClients();
  
  const client = clientId ? clients.find(c => c.id === clientId) || null : null;
  
  return {
    client,
    loading,
    error
  };
}