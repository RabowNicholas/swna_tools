export interface Client {
  id: string;
  fields: {
    Name?: string;
    'Case ID'?: string;
    'Social Security Number'?: string;
    'Street Address'?: string;
    City?: string;
    State?: string;
    'ZIP Code'?: string;
    Phone?: string;
    'Date of Birth'?: string;
    [key: string]: any;
  };
}

interface ClientCache {
  clients: Client[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_KEY = 'swna_clients_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export class ClientStorageService {
  private static instance: ClientStorageService;

  static getInstance(): ClientStorageService {
    if (!ClientStorageService.instance) {
      ClientStorageService.instance = new ClientStorageService();
    }
    return ClientStorageService.instance;
  }

  private constructor() {}

  /**
   * Check if the cache is valid and not expired
   */
  private isCacheValid(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (!cacheData) return false;

      const cache: ClientCache = JSON.parse(cacheData);
      const now = Date.now();
      
      return cache.expiresAt > now;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Get clients from cache
   */
  private getFromCache(): Client[] | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (!cacheData) return null;

      const cache: ClientCache = JSON.parse(cacheData);
      const now = Date.now();
      
      if (cache.expiresAt > now) {
        return cache.clients;
      } else {
        // Cache expired, remove it
        this.clearCache();
        return null;
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Store clients in cache
   */
  private storeInCache(clients: Client[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      const now = Date.now();
      const cache: ClientCache = {
        clients,
        timestamp: now,
        expiresAt: now + CACHE_DURATION
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error storing to cache:', error);
      // If storage fails (quota exceeded, etc.), clear cache and continue
      this.clearCache();
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Fetch clients from API
   */
  private async fetchFromAPI(): Promise<Client[]> {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.clients || data || [];
    } catch (error) {
      console.error('Error fetching clients from API:', error);
      throw new Error('Failed to fetch clients from server');
    }
  }

  /**
   * Get clients - tries cache first, then API
   */
  async getClients(forceRefresh: boolean = false): Promise<Client[]> {
    // If not forcing refresh, try cache first
    if (!forceRefresh) {
      const cachedClients = this.getFromCache();
      if (cachedClients) {
        return cachedClients;
      }
    }

    // Cache miss or force refresh - fetch from API
    try {
      const clients = await this.fetchFromAPI();
      this.storeInCache(clients);
      return clients;
    } catch (error) {
      // If API fails and we have expired cache, return it as fallback
      if (!forceRefresh) {
        const cacheData = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
        if (cacheData) {
          try {
            const cache: ClientCache = JSON.parse(cacheData);
            console.warn('API failed, using expired cache as fallback');
            return cache.clients;
          } catch (parseError) {
            console.error('Error parsing fallback cache:', parseError);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Find a client by ID
   */
  async getClientById(id: string, forceRefresh: boolean = false): Promise<Client | null> {
    const clients = await this.getClients(forceRefresh);
    return clients.find(client => client.id === id) || null;
  }

  /**
   * Get cache info for debugging
   */
  getCacheInfo(): { cached: boolean; timestamp?: number; expiresAt?: number; clientCount?: number } {
    if (typeof window === 'undefined') {
      return { cached: false };
    }
    
    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (!cacheData) {
        return { cached: false };
      }

      const cache: ClientCache = JSON.parse(cacheData);
      const isValid = cache.expiresAt > Date.now();
      
      return {
        cached: isValid,
        timestamp: cache.timestamp,
        expiresAt: cache.expiresAt,
        clientCount: cache.clients.length
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { cached: false };
    }
  }
}

// Export singleton instance
export const clientStorage = ClientStorageService.getInstance();