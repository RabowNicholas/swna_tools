import { redirect } from "next/navigation";

// Build PDF and the DOL Portal page became one tool
export default function BuildPdfPage() {
  redirect("/portal");
}
