"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useClients } from "@/hooks/useClients";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  FileDown,
  Heart,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info,
  User,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Image from "next/image";
import {
  ClientSelector,
  parseClientName,
} from "@/components/form/ClientSelector";
import { trackEvent } from "@/lib/analytics";
import Pica from "pica";

// State name to abbreviation mapping
const STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
  "Puerto Rico": "PR",
  "Virgin Islands": "VI",
  "American Samoa": "AS",
  Guam: "GU",
  "Northern Mariana Islands": "MP",
};

// Helper function to get state abbreviation
const getStateAbbreviation = (stateName: string): string => {
  if (!stateName) {
    return "";
  }

  // Check exact match first
  if (stateName in STATE_NAME_TO_ABBR) {
    return STATE_NAME_TO_ABBR[stateName];
  }

  // Check case-insensitive match
  for (const [fullName, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (stateName.toLowerCase() === fullName.toLowerCase()) {
      return abbr;
    }
  }

  // If it's already an abbreviation (2 letters), return as-is
  if (stateName.length === 2 && /^[A-Za-z]+$/.test(stateName)) {
    return stateName.toUpperCase();
  }

  // Return original string if no match found
  return stateName;
};

// Diagnosis structure matching the generator
interface DiagnosisEntry {
  text: string;
  date: Date | null;
}

interface DiagnosisCategories {
  cancer: {
    selected: boolean;
    diagnoses: [DiagnosisEntry, DiagnosisEntry, DiagnosisEntry];
  };
  beryllium_sensitivity: {
    selected: boolean;
    date: Date | null;
  };
  chronic_beryllium_disease: {
    selected: boolean;
    date: Date | null;
  };
  chronic_silicosis: {
    selected: boolean;
    date: Date | null;
  };
  other: {
    selected: boolean;
    diagnoses: [DiagnosisEntry, DiagnosisEntry, DiagnosisEntry];
  };
}

// Zod schema for form validation
const ee1Schema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
  dob: z.string().min(1, "Date of birth is required"),
  sex: z
    .enum(["Male", "Female"])
    .refine((val) => val, { message: "Sex is required" }),
  address_main: z.string().min(1, "Street address is required"),
  address_city: z.string().min(1, "City is required"),
  address_state: z
    .string()
    .min(2, "State is required")
    .max(2, "State must be 2 characters"),
  address_zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  phone: z
    .string()
    .regex(
      /^\d{3}\.\d{3}\.\d{4}$/,
      "Phone number must be in format: 123.123.1234"
    ),
});

type EE1FormData = z.infer<typeof ee1Schema>;

interface Client {
  id: string;
  fields: {
    Name: string;
    "Social Security Number"?: string;
    "Case ID"?: string;
    "Street Address"?: string;
    City?: string;
    State?: string;
    "ZIP Code"?: string;
    Phone?: string;
    "Date of Birth"?: string;
    [key: string]: string | undefined;
  };
}

export default function EE1Form() {
  const { data: session } = useSession();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refreshClients,
  } = useClients();
  const [loading, setLoading] = useState(false);

  // Track form view
  useEffect(() => {
    if (session?.user) {
      trackEvent.formViewed('ee1', session.user.id);
    }
  }, [session]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<Client | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [diagnosisErrors, setDiagnosisErrors] = useState<
    Record<string, string[]>
  >({
    cancer: [],
    beryllium_sensitivity: [],
    chronic_beryllium_disease: [],
    chronic_silicosis: [],
    other: [],
    general: [],
  });

  // Initialize diagnosis categories
  const [diagnosisCategories, setDiagnosisCategories] =
    useState<DiagnosisCategories>({
      cancer: {
        selected: false,
        diagnoses: [
          { text: "", date: null },
          { text: "", date: null },
          { text: "", date: null },
        ],
      },
      beryllium_sensitivity: { selected: false, date: null },
      chronic_beryllium_disease: { selected: false, date: null },
      chronic_silicosis: { selected: false, date: null },
      other: {
        selected: false,
        diagnoses: [
          { text: "", date: null },
          { text: "", date: null },
          { text: "", date: null },
        ],
      },
    });

  const form = useForm<EE1FormData>({
    resolver: zodResolver(ee1Schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      client_id: "",
      first_name: "",
      last_name: "",
      ssn: "",
      dob: "",
      sex: "Male",
      address_main: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      phone: "",
    },
  });

  // Show error if clients failed to load
  useEffect(() => {
    if (clientsError) {
      console.error("Failed to load clients:", clientsError);
    }
  }, [clientsError]);

  // Handle client selection and auto-fill
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId) as any;
    if (client) {
      const fields = client.fields;

      // Parse name using shared utility
      const rawName = fields.Name || "";
      const fullName = parseClientName(rawName);
      const nameParts = fullName.split(" ");
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        form.setValue("first_name", firstName);
        form.setValue("last_name", lastName);
      }

      // Set other fields
      const ssn = fields["Social Security Number"];
      if (ssn) {
        const cleanSSN = ssn.toString().replace(/\D/g, "");
        if (cleanSSN.length === 9) {
          form.setValue("ssn", cleanSSN);
        }
      }

      form.setValue("address_main", fields["Street Address"] || "");
      form.setValue("address_city", fields["City"] || "");
      form.setValue(
        "address_state",
        getStateAbbreviation(fields["State"] || "")
      );
      form.setValue("address_zip", fields["ZIP Code"] || "");
      form.setValue("phone", fields["Phone"] || "");

      // Handle DOB
      const dob = fields["Date of Birth"];
      if (dob) {
        try {
          const date = new Date(dob);
          if (!isNaN(date.getTime())) {
            form.setValue("dob", date.toISOString().split("T")[0]);
          }
        } catch {
          // Ignore invalid dates
        }
      }
    }
  };

  // Process signature image client-side using Pica (Lanczos3 - Adobe quality)
  const processSignatureImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = async () => {
          try {
            const pica = Pica();

            // Target dimensions for EE1 signature
            const maxWidth = 200;
            const maxHeight = 50;

            // Step 1: Remove background automatically
            const bgRemovalCanvas = document.createElement('canvas');
            bgRemovalCanvas.width = img.width;
            bgRemovalCanvas.height = img.height;
            const bgCtx = bgRemovalCanvas.getContext('2d', { willReadFrequently: true });

            if (!bgCtx) {
              reject(new Error('Failed to get background removal context'));
              return;
            }

            // Draw original image
            bgCtx.drawImage(img, 0, 0);

            // Get pixel data for background removal
            const imageData = bgCtx.getImageData(0, 0, bgRemovalCanvas.width, bgRemovalCanvas.height);
            const data = imageData.data;

            // Remove white/light backgrounds (threshold-based)
            const threshold = 240; // RGB values above this are considered "background"
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // If pixel is light (near white), make it transparent
              if (r > threshold && g > threshold && b > threshold) {
                data[i + 3] = 0; // Set alpha to 0 (fully transparent)
              }
              // Keep original color for signature pixels (preserves blue/black ink)
              else {
                // Just ensure full opacity - preserve original color
                data[i + 3] = 255;
              }
            }

            // Put modified image data back
            bgCtx.putImageData(imageData, 0, 0);

            // Step 2: Find bounding box of signature content
            let minX = bgRemovalCanvas.width;
            let maxX = 0;
            let minY = bgRemovalCanvas.height;
            let maxY = 0;

            // Scan all pixels to find signature bounds
            for (let y = 0; y < bgRemovalCanvas.height; y++) {
              for (let x = 0; x < bgRemovalCanvas.width; x++) {
                const alpha = data[(y * bgRemovalCanvas.width + x) * 4 + 3];
                if (alpha > 128) { // Non-transparent pixel (signature content)
                  minX = Math.min(minX, x);
                  maxX = Math.max(maxX, x);
                  minY = Math.min(minY, y);
                  maxY = Math.max(maxY, y);
                }
              }
            }

            // Add small padding around signature
            const padding = 10;
            minX = Math.max(0, minX - padding);
            maxX = Math.min(bgRemovalCanvas.width - 1, maxX + padding);
            minY = Math.max(0, minY - padding);
            maxY = Math.min(bgRemovalCanvas.height - 1, maxY + padding);

            const contentWidth = maxX - minX + 1;
            const contentHeight = maxY - minY + 1;

            // Step 3: Crop to signature content
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = contentWidth;
            croppedCanvas.height = contentHeight;
            const croppedCtx = croppedCanvas.getContext('2d');

            if (!croppedCtx) {
              reject(new Error('Failed to get cropped canvas context'));
              return;
            }

            // Draw only the signature content area
            croppedCtx.drawImage(
              bgRemovalCanvas,
              minX, minY, contentWidth, contentHeight,
              0, 0, contentWidth, contentHeight
            );

            // Step 4: Calculate final dimensions to fit in target box
            const aspectRatio = contentWidth / contentHeight;
            let finalWidth = maxWidth;
            let finalHeight = maxHeight;

            if (aspectRatio > maxWidth / maxHeight) {
              // Width-limited (signature is wider)
              finalHeight = Math.round(maxWidth / aspectRatio);
            } else {
              // Height-limited (signature is taller)
              finalWidth = Math.round(maxHeight * aspectRatio);
            }

            // Create destination canvas at calculated size
            const destCanvas = document.createElement('canvas');
            destCanvas.width = finalWidth;
            destCanvas.height = finalHeight;

            // Step 5: Resize with Pica using Lanczos filter (high quality)
            await pica.resize(croppedCanvas, destCanvas, {
              unsharpAmount: 160,      // Increased sharpening for crisp signatures
              unsharpRadius: 0.5,      // Tighter radius for fine details
              unsharpThreshold: 0,     // Sharpen all pixels
              quality: 2,              // Lanczos2 (faster, same quality as Lanczos3)
            });

            // Convert to PNG blob with maximum quality
            destCanvas.toBlob((blob) => {
              if (blob) {
                const processedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '.png'),
                  { type: 'image/png' }
                );
                resolve(processedFile);
              } else {
                reject(new Error('Failed to create blob'));
              }
            }, 'image/png', 1.0);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle signature file upload
  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PNG or JPEG image file.");
        return;
      }

      try {
        // Process image client-side (resize, flatten, convert to PNG)
        const processedFile = await processSignatureImage(file);
        setSignatureFile(processedFile);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setSignaturePreview(e.target?.result as string);
        };
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error('Error processing signature image:', error);
        alert('Failed to process signature image. Please try a different image.');
      }
    }
  };

  // Update diagnosis category
  const updateDiagnosisCategory = (
    category: keyof DiagnosisCategories,
    updates: Partial<DiagnosisCategories[keyof DiagnosisCategories]>
  ) => {
    setDiagnosisCategories((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates,
      },
    }));
  };

  // Update specific diagnosis entry
  const updateDiagnosisEntry = (
    category: "cancer" | "other",
    index: number,
    field: "text" | "date",
    value: string | Date | null
  ) => {
    setDiagnosisCategories((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        diagnoses: prev[category].diagnoses.map((diagnosis, i) =>
          i === index ? { ...diagnosis, [field]: value } : diagnosis
        ) as [DiagnosisEntry, DiagnosisEntry, DiagnosisEntry],
      },
    }));
  };

  // Helper to validate date is in past and reasonable
  const validateDate = (date: Date | null, label: string): string | null => {
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date("1900-01-01");
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck > today) {
      return `${label} cannot be in the future.`;
    }

    if (dateToCheck < minDate) {
      return `${label} must be after January 1, 1900.`;
    }

    return null;
  };

  // Validation helper
  const validateDiagnoses = () => {
    const errors: Record<string, string[]> = {
      cancer: [],
      beryllium_sensitivity: [],
      chronic_beryllium_disease: [],
      chronic_silicosis: [],
      other: [],
      general: [],
    };

    const categories = diagnosisCategories;
    let hasValidDiagnosis = false;

    // Check Cancer
    if (categories.cancer.selected) {
      let cancerHasValid = false;
      categories.cancer.diagnoses.forEach((diagnosis, i) => {
        const label = String.fromCharCode(65 + i);
        if (diagnosis.text) {
          if (diagnosis.date) {
            const dateError = validateDate(
              diagnosis.date,
              `Cancer diagnosis ${label}`
            );
            if (dateError) {
              errors.cancer.push(dateError);
            } else {
              cancerHasValid = true;
            }
          } else {
            errors.cancer.push(`Cancer diagnosis ${label} requires a date.`);
          }
        }
      });
      if (cancerHasValid) hasValidDiagnosis = true;
      else if (!categories.cancer.diagnoses.some((d) => d.text)) {
        errors.cancer.push(
          "At least one specific cancer diagnosis is required when Cancer is selected."
        );
      }
    }

    // Check individual conditions
    const conditions = [
      { key: "beryllium_sensitivity", label: "Beryllium Sensitivity" },
      { key: "chronic_beryllium_disease", label: "Chronic Beryllium Disease" },
      { key: "chronic_silicosis", label: "Chronic Silicosis" },
    ] as const;

    conditions.forEach(({ key, label }) => {
      if (categories[key].selected) {
        if (categories[key].date) {
          const dateError = validateDate(categories[key].date, label);
          if (dateError) {
            errors[key].push(dateError);
          } else {
            hasValidDiagnosis = true;
          }
        } else {
          errors[key].push(`${label} date of diagnosis is required.`);
        }
      }
    });

    // Check Other conditions
    if (categories.other.selected) {
      let otherHasValid = false;
      categories.other.diagnoses.forEach((diagnosis, i) => {
        const label = String.fromCharCode(65 + i);
        if (diagnosis.text) {
          if (diagnosis.date) {
            const dateError = validateDate(
              diagnosis.date,
              `Other condition ${label}`
            );
            if (dateError) {
              errors.other.push(dateError);
            } else {
              otherHasValid = true;
            }
          } else {
            errors.other.push(`Other condition ${label} requires a date.`);
          }
        }
      });
      if (otherHasValid) hasValidDiagnosis = true;
      else if (!categories.other.diagnoses.some((d) => d.text)) {
        errors.other.push(
          "At least one specific other condition is required when Other is selected."
        );
      }
    }

    if (!hasValidDiagnosis) {
      errors.general.push(
        "At least one diagnosis category with date is required."
      );
    }

    setDiagnosisErrors(errors);

    // Return flat array for backward compatibility
    return Object.values(errors).flat();
  };

  const handleSubmitClick = async () => {
    setAttemptedSubmit(true);

    // Trigger validation
    const isValid = await form.trigger();

    if (!isValid) {
      // Find the first error field and scroll to it
      const errors = form.formState.errors;
      let firstErrorField: string | null = null;

      // Check fields in order of appearance
      if (errors.client_id) firstErrorField = "client_id";
      else if (errors.first_name) firstErrorField = "first_name";
      else if (errors.last_name) firstErrorField = "last_name";
      else if (errors.ssn) firstErrorField = "ssn";
      else if (errors.dob) firstErrorField = "dob";
      else if (errors.sex) firstErrorField = "sex";
      else if (errors.address_main) firstErrorField = "address_main";
      else if (errors.address_city) firstErrorField = "address_city";
      else if (errors.address_state) firstErrorField = "address_state";
      else if (errors.address_zip) firstErrorField = "address_zip";
      else if (errors.phone) firstErrorField = "phone";

      // Scroll to and focus the first error field
      if (firstErrorField) {
        setTimeout(() => {
          const element = document.querySelector(
            `[name="${firstErrorField}"]`
          ) as HTMLElement;
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
          }
        }, 100);
      }

      return;
    }

    // Check diagnosis validation
    const diagnosisErrorsList = validateDiagnoses();
    if (diagnosisErrorsList.length > 0) {
      // Scroll to diagnosis section
      setTimeout(() => {
        const diagnosisSection = document.getElementById("diagnosis-section");
        if (diagnosisSection) {
          diagnosisSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
      return;
    }

    // If valid, submit the form
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: EE1FormData) => {
    setLoading(true);
    try {
      // Validate diagnoses
      const diagnosisErrors = validateDiagnoses();
      if (diagnosisErrors.length > 0) {
        diagnosisErrors.forEach((error) => alert(error));
        setLoading(false);
        return;
      }

      const selectedClient = clients.find((c) => c.id === data.client_id) as any;
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      // Create FormData for file upload support
      const formDataForAPI = new FormData();
      formDataForAPI.append("client_record", JSON.stringify(selectedClient));

      // Create form data without signature file
      const formDataWithoutFile = {
        first_name: data.first_name,
        last_name: data.last_name,
        ssn: `${data.ssn.slice(0, 3)}-${data.ssn.slice(3, 5)}-${data.ssn.slice(
          5
        )}`,
        dob: data.dob, // Keep as string in YYYY-MM-DD format
        sex: data.sex,
        address_main: data.address_main,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        phone: data.phone,
        diagnosis_categories: diagnosisCategories,
      };

      formDataForAPI.append("form_data", JSON.stringify(formDataWithoutFile));

      // Add signature file if present
      if (signatureFile) {
        formDataForAPI.append("signature_file", signatureFile);
      }

      const response = await fetch("/api/generate/ee1", {
        method: "POST",
        body: formDataForAPI,
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `EE1_${data.first_name.charAt(0) || "X"}.${
          data.last_name
        }_${new Date().toLocaleDateString("en-US").replace(/\//g, ".")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Track PDF generation
        if (session?.user) {
          trackEvent.pdfGenerated('ee1', session.user.id, data.client_id);
        }

        setFormSubmitted(true);
        setSubmittedClient(selectedClient);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate EE-1");
      }
    } catch (error) {
      console.error("Error generating EE-1:", error);
      alert(error instanceof Error ? error.message : "Failed to generate EE-1");
    } finally {
      setLoading(false);
    }
  };

  // Calculate form completion
  const watchedFields = form.watch();
  const requiredFieldsComplete = [
    watchedFields.client_id,
    watchedFields.first_name,
    watchedFields.last_name,
    watchedFields.ssn,
    watchedFields.dob,
    watchedFields.sex,
  ].filter(Boolean).length;

  const hasValidDiagnosis = Object.values(diagnosisCategories).some(
    (category) => {
      if ("selected" in category && category.selected) {
        if ("date" in category) return category.date;
        if ("diagnoses" in category) {
          return category.diagnoses.some(
            (d: DiagnosisEntry) => d.text && d.date
          );
        }
      }
      return false;
    }
  );

  const totalRequiredFields = 6; // 6 required form fields
  const progressPercentage =
    hasValidDiagnosis && requiredFieldsComplete === totalRequiredFields
      ? 100
      : (requiredFieldsComplete / totalRequiredFields) * 80 +
        (hasValidDiagnosis ? 20 : 0);

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" label="Loading clients..." />
      </div>
    );
  }

  if (clientsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Clients
          </h3>
          <p className="text-gray-600">{clientsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Generate EE-1 Form
          </h1>
          <p className="text-muted-foreground">
            Worker&apos;s Claim for Benefits Under the Energy Employees
            Occupational Illness Compensation Program Act
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Client Selection */}
        <ClientSelector
          clients={clients as any}
          value={form.watch("client_id")}
          onChange={(clientId) => {
            form.setValue("client_id", clientId);
            handleClientChange(clientId);
          }}
          onRefresh={() => refreshClients(true)}
          error={form.formState.errors.client_id?.message}
          label="Choose which client you're preparing this form for"
        />

        {/* Personal Information */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-success" />
              <CardTitle>Client Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the client&apos;s personal information as it appears on
              their official documents
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details Column */}
              <div className="space-y-6">
                <h4 className="font-medium text-foreground">
                  👤 Personal Details
                </h4>

                <Input
                  label="Client's First Name"
                  required
                  error={form.formState.errors.first_name?.message}
                  helperText="Client's legal first name as it appears on their official documents"
                  {...form.register("first_name")}
                />

                <Input
                  label="Client's Last Name"
                  required
                  error={form.formState.errors.last_name?.message}
                  helperText="Client's legal last name as it appears on their official documents"
                  {...form.register("last_name")}
                />

                <Input
                  label="Client's Social Security Number"
                  placeholder="123456789"
                  maxLength={9}
                  required
                  error={form.formState.errors.ssn?.message}
                  helperText="Enter 9 digits only (dashes will be added automatically)"
                  {...form.register("ssn")}
                />

                <Input
                  label="Client's Date of Birth"
                  type="date"
                  required
                  error={form.formState.errors.dob?.message}
                  helperText="Select the client's date of birth"
                  {...form.register("dob")}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Client&apos;s Sex *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="Male"
                        {...form.register("sex")}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="Female"
                        {...form.register("sex")}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Information Column */}
              <div className="space-y-6">
                <h4 className="font-medium text-foreground">
                  🏠 Client&apos;s Contact Information
                </h4>

                <Input
                  label="Client's Street Address"
                  required
                  error={form.formState.errors.address_main?.message}
                  helperText="Client's street address (include apartment/unit number if applicable)"
                  {...form.register("address_main")}
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Client's City"
                      required
                      error={form.formState.errors.address_city?.message}
                      {...form.register("address_city")}
                    />
                  </div>
                  <Input
                    label="State"
                    required
                    maxLength={2}
                    placeholder="NY"
                    error={form.formState.errors.address_state?.message}
                    helperText="2-letter code"
                    {...form.register("address_state")}
                  />
                </div>

                <Input
                  label="Client's ZIP Code"
                  required
                  maxLength={10}
                  placeholder="12345"
                  error={form.formState.errors.address_zip?.message}
                  helperText="5-digit ZIP code (e.g., 12345 or 12345-6789)"
                  {...form.register("address_zip")}
                />

                <Input
                  label="Client's Phone Number"
                  required
                  placeholder="555.123.4567"
                  error={form.formState.errors.phone?.message}
                  helperText="Phone number in format: 123.123.1234"
                  {...form.register("phone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Diagnoses Section */}
        <Card variant="elevated" id="diagnosis-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-error" />
                <CardTitle>Client&apos;s Medical Diagnoses</CardTitle>
              </div>
              {attemptedSubmit &&
                Object.values(diagnosisErrors).flat().length > 0 && (
                  <Badge variant="error" size="sm">
                    {Object.values(diagnosisErrors).flat().length} Error
                    {Object.values(diagnosisErrors).flat().length !== 1
                      ? "s"
                      : ""}
                  </Badge>
                )}
            </div>
            <p className="text-sm text-muted-foreground">
              Client&apos;s Diagnosed Condition(s) Being Claimed as Work-Related
            </p>
            {attemptedSubmit && diagnosisErrors.general.length > 0 && (
              <div
                className="mt-3 p-3 border-2 rounded-lg"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--destructive) 15%, transparent)",
                  borderColor: "var(--destructive)",
                }}
              >
                {diagnosisErrors.general.map((error, i) => (
                  <div
                    key={i}
                    className="flex items-center text-sm text-destructive font-medium"
                  >
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {error}
                  </div>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cancer Section */}
            <Card
              variant="outlined"
              className={
                attemptedSubmit && diagnosisErrors.cancer.length > 0
                  ? "border-destructive bg-destructive/10"
                  : diagnosisCategories.cancer.selected
                  ? "border-warning/50 bg-warning/5"
                  : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={diagnosisCategories.cancer.selected}
                        onChange={(e) =>
                          updateDiagnosisCategory("cancer", {
                            selected: e.target.checked,
                          })
                        }
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <CardTitle className="text-lg">
                        🎗️ Cancer (List Specific Diagnosis Below)
                      </CardTitle>
                    </label>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Check this box if the client has been diagnosed with any
                  cancer
                </p>
              </CardHeader>

              {diagnosisCategories.cancer.selected && (
                <CardContent className="pt-0">
                  <p className="font-medium mb-4">
                    Enter up to 3 specific cancer diagnoses for this client:
                  </p>
                  <div className="space-y-4">
                    {diagnosisCategories.cancer.diagnoses.map(
                      (diagnosis, i) => (
                        <div key={i} className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label={`Cancer diagnosis ${String.fromCharCode(
                                65 + i
                              )}`}
                              placeholder="e.g., Lung cancer, Mesothelioma, etc."
                              value={diagnosis.text}
                              onChange={(e) =>
                                updateDiagnosisEntry(
                                  "cancer",
                                  i,
                                  "text",
                                  e.target.value
                                )
                              }
                            />
                            {diagnosis.text && (
                              <Input
                                label={`Diagnosis Date ${String.fromCharCode(
                                  65 + i
                                )}`}
                                type="date"
                                value={
                                  diagnosis.date
                                    ? diagnosis.date.toISOString().split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  updateDiagnosisEntry(
                                    "cancer",
                                    i,
                                    "date",
                                    e.target.value
                                      ? new Date(e.target.value)
                                      : null
                                  )
                                }
                                helperText="Date when the client was diagnosed with this cancer"
                              />
                            )}
                          </div>
                          {i < 2 && <hr className="border-border/50" />}
                        </div>
                      )
                    )}
                  </div>
                  {attemptedSubmit && diagnosisErrors.cancer.length > 0 && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                      {diagnosisErrors.cancer.map((error, i) => (
                        <div
                          key={i}
                          className="flex items-start text-sm text-destructive"
                        >
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Individual Conditions */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">
                🔬 Specific Occupational Conditions
              </h4>

              {[
                {
                  key: "beryllium_sensitivity",
                  label: "Beryllium Sensitivity",
                  icon: "🟡",
                },
                {
                  key: "chronic_beryllium_disease",
                  label: "Chronic Beryllium Disease (CBD)",
                  icon: "🔴",
                },
                {
                  key: "chronic_silicosis",
                  label: "Chronic Silicosis",
                  icon: "⚫",
                },
              ].map(({ key, label, icon }) => (
                <Card
                  key={key}
                  variant="outlined"
                  className={
                    attemptedSubmit &&
                    diagnosisErrors[key as keyof typeof diagnosisErrors]
                      ?.length > 0
                      ? "border-destructive bg-destructive/10"
                      : diagnosisCategories[key as keyof DiagnosisCategories]
                          .selected
                      ? "border-info/50 bg-info/5"
                      : ""
                  }
                >
                  <CardContent className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            (
                              diagnosisCategories[
                                key as keyof DiagnosisCategories
                              ] as { selected: boolean }
                            ).selected
                          }
                          onChange={(event) =>
                            updateDiagnosisCategory(
                              key as keyof DiagnosisCategories,
                              { selected: event.target.checked }
                            )
                          }
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="font-medium">
                          {icon} {label}
                        </span>
                      </label>
                      {(
                        diagnosisCategories[
                          key as keyof DiagnosisCategories
                        ] as { selected: boolean; date: Date | null }
                      ).selected && (
                        <Input
                          label="Diagnosis Date"
                          type="date"
                          value={
                            (
                              diagnosisCategories[
                                key as keyof DiagnosisCategories
                              ] as { selected: boolean; date: Date | null }
                            ).date
                              ? (
                                  diagnosisCategories[
                                    key as keyof DiagnosisCategories
                                  ] as { selected: boolean; date: Date | null }
                                )
                                  .date!.toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            updateDiagnosisCategory(
                              key as keyof DiagnosisCategories,
                              {
                                date: e.target.value
                                  ? new Date(e.target.value)
                                  : null,
                              }
                            )
                          }
                          helperText={`Date when client was diagnosed with ${label.toLowerCase()}`}
                        />
                      )}
                    </div>
                    {attemptedSubmit &&
                      diagnosisErrors[key as keyof typeof diagnosisErrors]
                        ?.length > 0 && (
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                          {diagnosisErrors[
                            key as keyof typeof diagnosisErrors
                          ].map((error, i) => (
                            <div
                              key={i}
                              className="flex items-start text-sm text-destructive"
                            >
                              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                              {error}
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Other Work-Related Conditions */}
            <Card
              variant="outlined"
              className={
                attemptedSubmit && diagnosisErrors.other.length > 0
                  ? "border-destructive bg-destructive/10"
                  : diagnosisCategories.other.selected
                  ? "border-secondary/50 bg-secondary/5"
                  : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={diagnosisCategories.other.selected}
                        onChange={(e) =>
                          updateDiagnosisCategory("other", {
                            selected: e.target.checked,
                          })
                        }
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <CardTitle className="text-lg">
                        ⚕️ Other Work-Related Conditions
                      </CardTitle>
                    </label>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Due to exposure to toxic substances or radiation
                </p>
              </CardHeader>

              {diagnosisCategories.other.selected && (
                <CardContent className="pt-0">
                  <p className="font-medium mb-4">
                    Enter up to 3 specific conditions for this client:
                  </p>
                  <div className="space-y-4">
                    {diagnosisCategories.other.diagnoses.map((diagnosis, i) => (
                      <div key={i} className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label={`Other condition ${String.fromCharCode(
                              65 + i
                            )}`}
                            placeholder="e.g., Pulmonary fibrosis, Respiratory disease, etc."
                            value={diagnosis.text}
                            onChange={(e) =>
                              updateDiagnosisEntry(
                                "other",
                                i,
                                "text",
                                e.target.value
                              )
                            }
                          />
                          {diagnosis.text && (
                            <Input
                              label={`Diagnosis Date ${String.fromCharCode(
                                65 + i
                              )}`}
                              type="date"
                              value={
                                diagnosis.date
                                  ? diagnosis.date.toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) =>
                                updateDiagnosisEntry(
                                  "other",
                                  i,
                                  "date",
                                  e.target.value
                                    ? new Date(e.target.value)
                                    : null
                                )
                              }
                              helperText="Date when the client was diagnosed with this condition"
                            />
                          )}
                        </div>
                        {i < 2 && <hr className="border-border/50" />}
                      </div>
                    ))}
                  </div>
                  {attemptedSubmit && diagnosisErrors.other.length > 0 && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                      {diagnosisErrors.other.map((error, i) => (
                        <div
                          key={i}
                          className="flex items-start text-sm text-destructive"
                        >
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Client Signature</CardTitle>
            </div>
            <div className="flex items-start space-x-2 text-sm text-info">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>Note:</strong> Signature upload is optional. Signature
                placement is not always perfect - if you find this happening,
                regenerate the form without the signature and add it manually in
                Adobe.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-info">Signature Upload Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Upload a clear image of the signature on a white or light background</li>
                      <li>PNG or JPG format accepted</li>
                      <li>Use dark ink (black or dark blue) for best results</li>
                      <li>Background will be automatically removed during processing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Input
                type="file"
                label="Upload Client's Signature (Optional)"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleSignatureUpload}
                helperText="Upload a clear image file of the client's signature (PNG, JPG, or JPEG format). This field is optional."
              />

              {signatureFile && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>Client signature uploaded successfully</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowSignaturePreview(!showSignaturePreview)
                      }
                      icon={
                        showSignaturePreview ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )
                      }
                    >
                      {showSignaturePreview ? "Hide" : "Preview"} Signature
                    </Button>
                  </div>

                  {showSignaturePreview && signaturePreview && (
                    <Card variant="outlined">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-2">
                          Client&apos;s Signature Preview:
                        </p>
                        <Image
                          src={signaturePreview}
                          alt="Client's Signature"
                          width={300}
                          height={200}
                          className="max-w-full h-auto border border-border rounded"
                          style={{ maxHeight: "200px" }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col gap-4 items-center">
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading}
            size="lg"
            loading={loading}
            icon={<FileDown className="h-4 w-4" />}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50"
          >
            {loading ? "Generating..." : "Generate EE-1"}
          </Button>

          {attemptedSubmit &&
            (Object.keys(form.formState.errors).length > 0 ||
              !hasValidDiagnosis) && (
              <div className="flex items-center text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mr-2" />
                Please complete all required fields and select at least one
                diagnosis before generating the form.
              </div>
            )}
        </div>

        {/* Success Message */}
        {formSubmitted && (
          <Card variant="elevated" className="bg-success/10 border-success/20">
            <CardContent>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    EE-1 Generated Successfully!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your EE-1 form has been downloaded and is ready for
                    submission.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
