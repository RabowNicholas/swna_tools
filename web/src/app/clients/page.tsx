'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useClients } from '@/hooks/useClients';
import { Users, Edit, AlertCircle, RefreshCw, Save, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  validateClientData,
  formatDateForInput,
} from '@/lib/validation';
import { ClientSelector } from '@/components/form/ClientSelector';

// Using Client interface from centralized storage
import { Client } from '@/lib/clientStorage';

export default function ClientsPage() {
  const { clients, loading, error, refreshClients, getCacheInfo } = useClients();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedFields, setEditedFields] = useState<Partial<Client['fields']>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Show error if clients failed to load
  useEffect(() => {
    if (error) {
      console.error('Failed to load clients:', error);
    }
  }, [error]);

  // Reset edit state when selecting a different client
  useEffect(() => {
    if (selectedClient) {
      setIsEditing(false);
      setEditedFields({});
      setValidationErrors({});
    }
  }, [selectedClient?.id]);

  // Handle client selection
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
  };

  const formatFieldValue = (value: string | undefined): string => {
    if (value === undefined || value === null || value === '') {
      return 'Not set';
    }
    return String(value);
  };

  const handleEdit = () => {
    if (!selectedClient) return;

    // Initialize edit fields with current values
    setEditedFields({
      'Date of Birth': selectedClient.fields['Date of Birth'] || '',
      Phone: selectedClient.fields.Phone || '',
      Email: selectedClient.fields.Email || '',
      'Street Address': selectedClient.fields['Street Address'] || '',
      City: selectedClient.fields.City || '',
      State: selectedClient.fields.State || '',
      'ZIP Code': selectedClient.fields['ZIP Code'] || '',
    });
    setIsEditing(true);
    setValidationErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedFields({});
    setValidationErrors({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // Clear validation error for this field when user types
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return;

    // Validate all fields
    const validation = validateClientData({
      email: editedFields.Email,
      phone: editedFields.Phone,
      dob: editedFields['Date of Birth'],
      street: editedFields['Street Address'],
      city: editedFields.City,
      state: editedFields.State,
      zip: editedFields['ZIP Code'],
    });

    if (!validation.isValid) {
      // Map validation errors to field names
      const fieldErrors: Record<string, string> = {};
      if (validation.errors.email) fieldErrors.Email = validation.errors.email;
      if (validation.errors.phone) fieldErrors.Phone = validation.errors.phone;
      if (validation.errors.dob) fieldErrors['Date of Birth'] = validation.errors.dob;
      if (validation.errors.street) fieldErrors['Street Address'] = validation.errors.street;
      if (validation.errors.city) fieldErrors.City = validation.errors.city;
      if (validation.errors.state) fieldErrors.State = validation.errors.state;
      if (validation.errors.zip) fieldErrors['ZIP Code'] = validation.errors.zip;

      setValidationErrors(fieldErrors);
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);

    try {
      // Filter out empty values and fields we don't want to update
      const fieldsToUpdate: Record<string, string> = {};
      Object.entries(editedFields).forEach(([key, value]) => {
        // Skip empty values and SSN field
        if (value && value.trim() !== '' && key !== 'Social Security Number') {
          fieldsToUpdate[key] = value;
        }
      });

      // Call API to update client
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: selectedClient.id,
          fields: fieldsToUpdate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }

      // Success!
      toast.success('Client updated successfully');

      // Refresh clients data to show updated info
      await refreshClients(true);

      // Re-fetch the updated client from state after refresh
      // The clients state will be updated by the refreshClients callback
      setTimeout(() => {
        const updatedClient = clients.find(c => c.id === selectedClient.id);
        if (updatedClient) {
          setSelectedClient(updatedClient);
        }
      }, 100);

      // Exit edit mode
      setIsEditing(false);
      setEditedFields({});
      setValidationErrors({});
    } catch (err) {
      console.error('Failed to update client:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setIsSaving(false);
    }
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
    <>
      <Toaster position="top-right" richColors />
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Client Data Manager
              </h1>
              <p className="text-muted-foreground">
                Manage client information and contact details
              </p>
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <ClientSelector
          clients={clients as any}
          value={selectedClientId}
          onChange={handleClientChange}
          onRefresh={() => refreshClients(true)}
          label="Select Client"
        />

        {/* Client Details */}
        <Card className="bg-card border-2 border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              {selectedClient ? (isEditing ? 'Edit Client Details' : 'Client Details') : 'Select a Client'}
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
                      {/* Name - Read Only */}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatFieldValue(selectedClient.fields.Name)}
                        </span>
                      </div>

                      {/* Case ID - Read Only */}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Case ID:</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatFieldValue(selectedClient.fields['Case ID'])}
                        </span>
                      </div>

                      {/* SSN - Read Only */}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SSN:</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatFieldValue(selectedClient.fields['Social Security Number'])}
                        </span>
                      </div>

                      {/* Date of Birth - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">Date of Birth:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="date"
                              value={formatDateForInput(editedFields['Date of Birth'])}
                              onChange={(e) => handleFieldChange('Date of Birth', e.target.value)}
                              className={validationErrors['Date of Birth'] ? 'border-destructive' : ''}
                            />
                            {validationErrors['Date of Birth'] && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors['Date of Birth']}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields['Date of Birth'])}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Contact Information */}
                  <section aria-labelledby="contact-info-heading">
                    <h3 id="contact-info-heading" className="text-sm font-medium text-foreground mb-3">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Phone - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">Phone:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="tel"
                              value={editedFields.Phone || ''}
                              onChange={(e) => handleFieldChange('Phone', e.target.value)}
                              placeholder="(555) 123-4567"
                              className={validationErrors.Phone ? 'border-destructive' : ''}
                            />
                            {validationErrors.Phone && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors.Phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields.Phone)}
                          </span>
                        )}
                      </div>

                      {/* Email - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">Email:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="email"
                              value={editedFields.Email || ''}
                              onChange={(e) => handleFieldChange('Email', e.target.value)}
                              placeholder="client@example.com"
                              className={validationErrors.Email ? 'border-destructive' : ''}
                            />
                            {validationErrors.Email && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors.Email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields.Email)}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Address Information */}
                  <section aria-labelledby="address-info-heading">
                    <h3 id="address-info-heading" className="text-sm font-medium text-foreground mb-3">
                      Address Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Street - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">Street:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="text"
                              value={editedFields['Street Address'] || ''}
                              onChange={(e) => handleFieldChange('Street Address', e.target.value)}
                              placeholder="123 Main St"
                              className={validationErrors['Street Address'] ? 'border-destructive' : ''}
                            />
                            {validationErrors['Street Address'] && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors['Street Address']}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields['Street Address'])}
                          </span>
                        )}
                      </div>

                      {/* City - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">City:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="text"
                              value={editedFields.City || ''}
                              onChange={(e) => handleFieldChange('City', e.target.value)}
                              placeholder="Albuquerque"
                              className={validationErrors.City ? 'border-destructive' : ''}
                            />
                            {validationErrors.City && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors.City}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields.City)}
                          </span>
                        )}
                      </div>

                      {/* State - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">State:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="text"
                              value={editedFields.State || ''}
                              onChange={(e) => handleFieldChange('State', e.target.value)}
                              placeholder="NM"
                              className={validationErrors.State ? 'border-destructive' : ''}
                            />
                            {validationErrors.State && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors.State}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields.State)}
                          </span>
                        )}
                      </div>

                      {/* ZIP Code - Editable */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">ZIP Code:</label>
                        {isEditing ? (
                          <div>
                            <Input
                              type="text"
                              value={editedFields['ZIP Code'] || ''}
                              onChange={(e) => handleFieldChange('ZIP Code', e.target.value)}
                              placeholder="87101"
                              maxLength={5}
                              className={validationErrors['ZIP Code'] ? 'border-destructive' : ''}
                            />
                            {validationErrors['ZIP Code'] && (
                              <p className="text-xs text-destructive mt-1">
                                {validationErrors['ZIP Code']}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {formatFieldValue(selectedClient.fields['ZIP Code'])}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-border">
                    {isEditing ? (
                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          className="flex-1"
                          onClick={handleSave}
                          disabled={isSaving}
                          loading={isSaving}
                          icon={<Save className="h-4 w-4" />}
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleCancel}
                          disabled={isSaving}
                          icon={<X className="h-4 w-4" />}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleEdit}
                        icon={<Edit className="h-4 w-4" />}
                      >
                        Edit Client Information
                      </Button>
                    )}
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
    </>
  );
}
