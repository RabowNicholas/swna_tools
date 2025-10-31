interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: string | number | boolean | undefined;
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
}

export class AirtableService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    const token = process.env.AIRTABLE_PAT;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!token || !baseId) {
      throw new Error('Missing Airtable configuration. Please set AIRTABLE_PAT and AIRTABLE_BASE_ID environment variables.');
    }

    this.baseUrl = `https://api.airtable.com/v0/${baseId}`;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getClients(): Promise<AirtableRecord[]> {
    try {
      let allRecords: AirtableRecord[] = [];
      let offset: string | undefined;

      do {
        const url = new URL(`${this.baseUrl}/Clients`);
        url.searchParams.append('sort[0][field]', 'Name');
        url.searchParams.append('sort[0][direction]', 'asc');
        url.searchParams.append('pageSize', '100'); // Maximum page size
        
        if (offset) {
          url.searchParams.append('offset', offset);
        }

        const response = await fetch(url.toString(), {
          headers: this.headers,
        });

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableResponse & { offset?: string } = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      return allRecords;
    } catch (error) {
      console.error('Error fetching clients from Airtable:', error);
      throw error;
    }
  }

  async getClient(recordId: string): Promise<AirtableRecord> {
    try {
      const response = await fetch(`${this.baseUrl}/Clients/${recordId}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching client from Airtable:', error);
      throw error;
    }
  }

  async updateClient(recordId: string, fields: Record<string, string | number | boolean>): Promise<AirtableRecord> {
    try {
      console.log('Updating client with fields:', fields);
      const response = await fetch(`${this.baseUrl}/Clients/${recordId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Airtable error response:', errorBody);
        throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating client in Airtable:', error);
      throw error;
    }
  }

  async getInvoiceById(recordId: string): Promise<AirtableRecord> {
    try {
      const response = await fetch(`${this.baseUrl}/Invoicing/${recordId}`, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching invoice from Airtable:', error);
      throw error;
    }
  }

  async getInvoices(): Promise<AirtableRecord[]> {
    try {
      let allRecords: AirtableRecord[] = [];
      let offset: string | undefined;

      do {
        const url = new URL(`${this.baseUrl}/Invoicing`);
        url.searchParams.append('pageSize', '100');
        
        if (offset) {
          url.searchParams.append('offset', offset);
        }

        const response = await fetch(url.toString(), {
          headers: this.headers,
        });

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableResponse & { offset?: string } = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;
      } while (offset);

      return allRecords;
    } catch (error) {
      console.error('Error fetching invoices from Airtable:', error);
      throw error;
    }
  }
}

export const airtableService = new AirtableService();