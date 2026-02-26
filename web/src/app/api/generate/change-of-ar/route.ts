import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ChangeOfARGenerator } from "@/lib/generators/change-of-ar-generator";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();

    const clientRecordStr = formData.get("client_record") as string;
    const formDataStr = formData.get("form_data") as string;
    const signatureFile = formData.get("signature_file") as File | null;

    if (!clientRecordStr || !formDataStr) {
      return NextResponse.json(
        { error: "Missing client_record or form_data" },
        { status: 400 }
      );
    }

    const client_record = JSON.parse(clientRecordStr);
    const parsedFormData = JSON.parse(formDataStr);

    // Convert signature file to base64 if present
    if (signatureFile) {
      const fileBuffer = await signatureFile.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString("base64");
      parsedFormData.signature_file = {
        data: base64Data,
      };
    }

    const generator = new ChangeOfARGenerator();
    const result = await generator.generate(client_record, "", parsedFormData);

    return new NextResponse(result.pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Change of AR generation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
