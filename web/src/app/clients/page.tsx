'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useClients } from '@/hooks/useClients';
import { Users, Search, Edit, AlertCircle, RefreshCw } from 'lucide-react';

// Using Client interface from centralized storage
import { Client } from '@/lib/clientStorage';

export default function ClientsPage() {
  const { clients, loading, error, refreshClients, getCacheInfo } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Show error if clients failed to load
  useEffect(() => {
    if (error) {
      console.error('Failed to load clients:', error);
    }
  }, [error]);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.fields.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.fields['Case ID']?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFieldValue = (value: string | undefined): string => {
    if (value === undefined || value === null || value === '') {
      return 'Not set';
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" label="Loading clients..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-destructive mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Clients</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button
            onClick={() => refreshClients(true)}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Client Data Manager</h1>
              <p className="text-muted-foreground">Manage client information and contact details</p>
              {(() => {
                const cacheInfo = getCacheInfo();
                return cacheInfo.cached ? (
                  <p className="text-xs text-success mt-1">
                    ✓ Clients loaded from cache ({cacheInfo.clientCount} clients)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Clients loaded from server
                  </p>
                );
              })()}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshClients(true)}
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Search clients by name or case ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            aria-label="Search clients"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <Card className="bg-card border-2 border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              Clients ({filteredClients.length})
            </h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm ? 'No clients found matching your search.' : 'No clients available.'}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    className={`w-full p-4 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      selectedClient?.id === client.id ? 'bg-accent border-r-4 border-primary' : ''
                    }`}
                    onClick={() => setSelectedClient(client)}
                    aria-pressed={selectedClient?.id === client.id}
                    aria-label={`Select client ${client.fields.Name || 'Unnamed Client'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-card-foreground">
                          {client.fields.Name || 'Unnamed Client'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Case ID: {client.fields['Case ID'] || 'Not set'}
                        </p>
                      </div>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Client Details */}
        <Card className="bg-card border-2 border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              {selectedClient ? 'Client Details' : 'Select a Client'}
            </h2>
          </div>
          
          {selectedClient ? (
            <CardContent>
              <div className="space-y-6">
                {/* Basic Information */}
                <section aria-labelledby="basic-info-heading">
                  <h3 id="basic-info-heading" className="text-sm font-medium text-foreground mb-3">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields.Name)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Case ID:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields['Case ID'])}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">SSN:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields['Social Security Number'])}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date of Birth:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields['Date of Birth'])}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Contact Information */}
                <section aria-labelledby="contact-info-heading">
                  <h3 id="contact-info-heading" className="text-sm font-medium text-foreground mb-3">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Phone:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields.Phone)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields.Email)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Address Information */}
                <section aria-labelledby="address-info-heading">
                  <h3 id="address-info-heading" className="text-sm font-medium text-foreground mb-3">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Street:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields['Street Address'])}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">City:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields.City)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">State:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields.State)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ZIP Code:</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatFieldValue(selectedClient.fields['ZIP Code'])}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Action Button */}
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" className="w-full" disabled>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Client Information
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Full editing functionality coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>Select a client from the list to view their details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8 bg-accent/30 border-2 border-primary/20">
        <CardContent>
          <h3 className="text-lg font-semibold text-foreground mb-2">Quick Actions</h3>
          <p className="text-muted-foreground mb-4">
            Use this client data in your document generation forms. All forms will automatically
            load and populate client information when you select a client.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/forms/ee3" className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              Generate EE-3 Form
            </Link>
            <Link href="/forms/invoice" className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              Create Invoice
            </Link>
            <Link href="/" className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              View All Tools
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}