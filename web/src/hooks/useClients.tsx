'use client';

import { useState, useEffect, useCallback } from 'react';
import { clientStorage, Client } from '@/lib/clientStorage';

export interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refreshClients: (force?: boolean) => Promise<void>;
  getClientById: (id: string) => Client | null;
  getCacheInfo: () => { cached: boolean; timestamp?: number; expiresAt?: number; clientCount?: number };
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    clients,
    loading,
    error,
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