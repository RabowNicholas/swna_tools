export interface Client {
  id: string;
  fields: {
    Name?: string;
    "Case ID"?: string;
    "Social Security Number"?: string;
    "Street Address"?: string;
    City?: string;
    State?: string;
    "ZIP Code"?: string;
    Phone?: string;
    "Date of Birth"?: string;
    Billing?: string[];
    [key: string]: any;
  };
}

interface ClientCache {
  clients: Client[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_KEY = "swna_clients_cache";
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
    if (typeof window === "undefined") return false;

    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (!cacheData) return false;

      const cache: ClientCache = JSON.parse(cacheData);
      const now = Date.now();

      return cache.expiresAt > now;
    } catch (error) {
      console.error("Error checking cache validity:", error);
      return false;
    }
  }

  /**
   * Get clients from cache
   */
  private getFromCache(): Client[] | null {
    if (typeof window === "undefined") return null;

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
      console.error("Error reading from cache:", error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Store clients in cache (only essential fields to reduce size)
   */
  private storeInCache(clients: Client[]): void {
    if (typeof window === "undefined") return;

    try {
      const now = Date.now();

      // Only store essential fields to reduce localStorage usage
      const lightweightClients = clients.map((client) => ({
        id: client.id,
        fields: {
          Name: client.fields.Name,
          "Case ID": client.fields["Case ID"],
          "Social Security Number": client.fields["Social Security Number"],
          "Street Address": client.fields["Street Address"],
          City: client.fields.City,
          State: client.fields.State,
          "ZIP Code": client.fields["ZIP Code"],
          Phone: client.fields.Phone,
          "Date of Birth": client.fields["Date of Birth"],
          Billing: client.fields.Billing,
        },
      }));

      const cache: ClientCache = {
        clients: lightweightClients,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      };

      const cacheString = JSON.stringify(cache);
      const cacheSizeMB = new Blob([cacheString]).size / (1024 * 1024);

      // If cache is too large (>4MB), don't store it
      if (cacheSizeMB > 4) {
        console.warn(
          `Cache too large (${cacheSizeMB.toFixed(
            2
          )}MB), skipping localStorage cache`
        );
        return;
      }

      localStorage.setItem(CACHE_KEY, cacheString);
    } catch (error) {
      // Check if it's a quota error
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        console.warn(
          "localStorage quota exceeded, clearing old cache and skipping new cache"
        );
        this.clearCache();
      } else {
        console.error("Error storing to cache:", error);
      }
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Fetch clients from API
   */
  private async fetchFromAPI(): Promise<Client[]> {
    try {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.clients || data || [];
    } catch (error) {
      console.error("Error fetching clients from API:", error);
      throw new Error("Failed to fetch clients from server");
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
        const cacheData =
          typeof window !== "undefined"
            ? localStorage.getItem(CACHE_KEY)
            : null;
        if (cacheData) {
          try {
            const cache: ClientCache = JSON.parse(cacheData);
            console.warn("API failed, using expired cache as fallback");
            return cache.clients;
          } catch (parseError) {
            console.error("Error parsing fallback cache:", parseError);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Find a client by ID
   */
  async getClientById(
    id: string,
    forceRefresh: boolean = false
  ): Promise<Client | null> {
    const clients = await this.getClients(forceRefresh);
    return clients.find((client) => client.id === id) || null;
  }

  /**
   * Get cache info for debugging
   */
  getCacheInfo(): {
    cached: boolean;
    timestamp?: number;
    expiresAt?: number;
    clientCount?: number;
  } {
    if (typeof window === "undefined") {
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
        clientCount: cache.clients.length,
      };
    } catch (error) {
      console.error("Error getting cache info:", error);
      return { cached: false };
    }
  }
}

// Export singleton instance
export const clientStorage = ClientStorageService.getInstance();
