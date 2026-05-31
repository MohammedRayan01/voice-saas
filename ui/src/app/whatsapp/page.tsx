"use client";

export default function WhatsAppPage() {
  return (
    <div className="h-[calc(100vh-53px)] w-full overflow-hidden">
      <iframe
        src="https://supbot.naazailabs.com"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
        title="WhatsApp — Supbot"
      />
    </div>
  );
}
