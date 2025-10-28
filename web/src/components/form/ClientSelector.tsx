"use client";

import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { User, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface ClientSelectorClient {
  id: string;
  fields: {
    Name: string;
    "Case ID"?: string;
    "Street Address"?: string;
    City?: string;
    State?: string;
    "ZIP Code"?: string;
    [key: string]: string | string[] | undefined;
  };
}

export interface ClientSelectorProps {
  /**
   * List of clients to display
   */
  clients: ClientSelectorClient[];

  /**
   * Currently selected client ID
   */
  value: string;

  /**
   * Callback when client is selected
   */
  onChange: (clientId: string, client?: ClientSelectorClient) => void;

  /**
   * Error message from form validation
   */
  error?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Whether to use Combobox (searchable) or regular Select dropdown
   * @default 'combobox'
   */
  variant?: "combobox" | "select";

  /**
   * Custom label for the field
   * @default 'Select Client'
   */
  label?: string;

  /**
   * Custom placeholder text
   */
  placeholder?: string;

  /**
   * Whether to show the field in a Card wrapper
   * @default true
   */
  showCard?: boolean;

  /**
   * Whether to show the selected client confirmation
   * @default true
   */
  showConfirmation?: boolean;

  /**
   * Custom card title when showCard is true
   * @default 'Client Selection'
   */
  cardTitle?: string;

  /**
   * Additional className for the wrapper
   */
  className?: string;

  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;

  /**
   * Optional callback to refresh the client list
   * When provided, shows a refresh button in the header
   */
  onRefresh?: () => Promise<void>;
}

/**
 * Reusable client selector component used across all forms.
 * Provides both Combobox (searchable) and Select (dropdown) variants.
 *
 * @example
 * // With Combobox (default) and refresh button
 * const { clients, refreshClients } = useClientContext();
 *
 * <ClientSelector
 *   clients={clients}
 *   value={form.watch('client_id')}
 *   onChange={(clientId, client) => {
 *     form.setValue('client_id', clientId);
 *     handleClientChange(clientId, client);
 *   }}
 *   onRefresh={() => refreshClients(true)}
 *   error={form.formState.errors.client_id?.message}
 * />
 *
 * @example
 * // With Select dropdown
 * <ClientSelector
 *   variant="select"
 *   clients={clients}
 *   value={form.watch('client_id')}
 *   onChange={(clientId) => {
 *     form.setValue('client_id', clientId);
 *     handleClientChange(clientId);
 *   }}
 * />
 *
 * @example
 * // Without card wrapper
 * <ClientSelector
 *   showCard={false}
 *   clients={clients}
 *   value={clientId}
 *   onChange={setClientId}
 * />
 */
export function ClientSelector({
  clients,
  value,
  onChange,
  error,
  required = true,
  variant = "combobox",
  label = "Select Client",
  placeholder,
  showCard = true,
  showConfirmation = true,
  cardTitle = "Client Selection",
  className,
  disabled = false,
  onRefresh,
}: ClientSelectorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedClient = clients.find((c) => c.id === value);

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Error refreshing clients:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    onChange(clientId, client);
  };

  const selectorContent = (
    <div className={cn(!showCard && className)}>
      {variant === "combobox" ? (
        <Combobox
          label={label}
          placeholder={placeholder || "Type to search clients..."}
          required={required}
          error={error}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          options={clients.map((client) => ({
            id: client.id,
            name: client.fields.Name || "Unnamed Client",
          }))}
        />
      ) : (
        <Select
          label={label}
          placeholder={placeholder || "Select..."}
          required={required}
          error={error}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.fields.Name || "Unnamed Client"}
            </option>
          ))}
        </Select>
      )}

      {showConfirmation && value && selectedClient && (
        <div className="mt-2 text-sm text-success flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          Selected: {selectedClient.fields.Name}
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return selectorContent;
  }

  return (
    <Card variant="elevated" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>{cardTitle}</CardTitle>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || disabled}
              icon={
                <RefreshCw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
              }
              aria-label="Refresh client list"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{selectorContent}</CardContent>
    </Card>
  );
}

/**
 * Utility function to parse client name from "Last, First - SSN" format to "First Last"
 * This is the common pattern used across all forms.
 *
 * @param rawName - The raw name string from Airtable (e.g., "Smith, John - 1234")
 * @returns Formatted name as "First Last" or original string if parsing fails
 *
 * @example
 * parseClientName("Smith, John - 1234") // returns "John Smith"
 * parseClientName("Invalid") // returns "Invalid"
 */
export function parseClientName(rawName: string): string {
  if (!rawName) return "";

  try {
    // Parse format: "Last, First - XXXX" -> "First Last"
    const [lastName, rest] = rawName.split(",", 2);
    if (!rest) return rawName;

    const firstName = rest.split("-")[0]?.trim() || "";
    if (firstName && lastName) {
      return `${firstName} ${lastName.trim()}`;
    }
    return rawName;
  } catch {
    return rawName;
  }
}
