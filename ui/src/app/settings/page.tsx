"use client";

import { ExternalLink } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { MCPSection } from "@/components/MCPSection";
import { TelemetrySection } from "@/components/TelemetrySection";
import { BillingSection } from "@/components/settings/BillingSection";
import { GoogleCalendarSection } from "@/components/settings/GoogleCalendarSection";
import { PricingCalculator } from "@/components/settings/PricingCalculator";
import { TeamSection } from "@/components/settings/TeamSection";
import { WebhooksSection } from "@/components/settings/WebhooksSection";
import { WidgetSection } from "@/components/settings/WidgetSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing" },
  { id: "calculator", label: "Cost Calculator" },
  { id: "webhooks", label: "Webhooks" },
  { id: "integrations", label: "Integrations" },
  { id: "widget", label: "Widget" },
  { id: "platform", label: "Platform" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "team";

  const setTab = (tab: string) => {
    router.push(`/settings?tab=${tab}`);
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your workspace, billing, and integrations.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "team" && <TeamSection />}
      {activeTab === "billing" && <BillingSection />}
      {activeTab === "calculator" && <PricingCalculator />}
      {activeTab === "webhooks" && <WebhooksSection />}
      {activeTab === "integrations" && <GoogleCalendarSection />}
      {activeTab === "widget" && <WidgetSection />}
      {activeTab === "platform" && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MCP Server</CardTitle>
              <CardDescription>
                Let AI agents access your workspace via the Model Context Protocol.{" "}
                <a
                  href="https://docs.lynq.com/integrations/mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline"
                >
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MCPSection />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Telemetry</CardTitle>
              <CardDescription>
                Configure Langfuse tracing for your voice agent calls.{" "}
                <a
                  href="https://docs.lynq.com/configurations/tracing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 underline"
                >
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelemetrySection />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground text-sm">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
