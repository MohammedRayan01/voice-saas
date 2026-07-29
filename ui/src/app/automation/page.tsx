import { redirect } from "next/navigation";

// Automation now lives in the WhatsApp suite; this legacy route only
// existed as a "Coming Soon" placeholder.
export default function AutomationPage() {
    redirect("/whatsapp/automations");
}
