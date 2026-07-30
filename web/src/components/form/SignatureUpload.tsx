"use client";

/**
 * The optional client-signature upload that rides along with an EE-1.
 *
 * Shared with Claims Assembly, which generates an EE-1 of its own — the
 * accepted file types have to match what /api/generate/ee1 can embed.
 */

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Upload, Eye, EyeOff, CheckCircle, Info } from "lucide-react";

export interface SignatureUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function SignatureUpload({ file, onChange }: SignatureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Keep the preview in step with the file the parent holds — selecting a
  // different client clears the file from outside this component.
  const [lastFile, setLastFile] = useState(file);
  if (file !== lastFile) {
    setLastFile(file);
    if (!file) {
      setPreview(null);
      setShowPreview(false);
    }
  }

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(selected.type)) {
      alert("Please upload a PNG or JPEG image file.");
      return;
    }

    try {
      // Use the original file without any processing — the generator's
      // isolateInk() does the cleanup server-side.
      onChange(selected);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selected);
    } catch (error) {
      console.error("Error loading signature image:", error);
      alert("Failed to load signature image. Please try a different image.");
    }
  };

  return (
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
                <p className="font-medium text-info">
                  Signature Upload Guidelines:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Upload a clear image of the signature on a white or light
                    background
                  </li>
                  <li>PNG or JPG format accepted</li>
                  <li>Use dark ink (black or dark blue) for best results</li>
                  <li>
                    Background will be automatically removed during processing
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Input
            type="file"
            label="Upload Client's Signature (Optional)"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleUpload}
            helperText="Upload a clear image file of the client's signature (PNG, JPG, or JPEG format). This field is optional."
          />

          {file && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>Client signature uploaded successfully</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  icon={
                    showPreview ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )
                  }
                >
                  {showPreview ? "Hide" : "Preview"} Signature
                </Button>
              </div>

              {showPreview && preview && (
                <Card variant="outlined">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2">
                      Client&apos;s Signature Preview:
                    </p>
                    <Image
                      src={preview}
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
  );
}
