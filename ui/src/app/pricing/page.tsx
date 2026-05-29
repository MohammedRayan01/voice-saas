"use client";

import { Check, Minus, Sparkles, Zap, Building2, Phone, MessageSquare, Brain, Wrench, Calendar, Users, FileText, TrendingUp, Key, AudioLines, Flame, Bot, Globe, Shield, Layers, RefreshCw, BarChart3, Headphones, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─────────────────────────────────────────────── */
type BillingCycle = "monthly" | "annual";
type FeatureValue = boolean | string | null;

interface Feature {
  label: string;
  tooltip?: string;
  starter: FeatureValue;
  growth: FeatureValue;
  pro: FeatureValue;
}

interface FeatureGroup {
  title: string;
  icon: React.ReactNode;
  features: Feature[];
}

/* ─── Helpers ────────────────────────────────────────────── */
function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-emerald-500" />;
  if (value === false || value === null)
    return <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />;
  return (
    <span className="text-sm font-medium text-foreground">{value}</span>
  );
}

function SectionRow({ group, open, onToggle }: { group: FeatureGroup; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className="cursor-pointer select-none bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={onToggle}
      >
        <td className="px-6 py-3" colSpan={4}>
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <span className="text-primary">{group.icon}</span>
            {group.title}
            <span className="ml-auto text-muted-foreground">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </td>
      </tr>
      {open && group.features.map((f, i) => (
        <tr
          key={i}
          className="border-b border-border/40 hover:bg-muted/20 transition-colors"
        >
          <td className="px-6 py-3">
            <span className="text-sm text-muted-foreground">{f.label}</span>
          </td>
          <td className="px-4 py-3 text-center"><FeatureCell value={f.starter} /></td>
          <td className="px-4 py-3 text-center bg-primary/[0.03]"><FeatureCell value={f.growth} /></td>
          <td className="px-4 py-3 text-center"><FeatureCell value={f.pro} /></td>
        </tr>
      ))}
    </>
  );
}

/* ─── Feature Data ───────────────────────────────────────── */
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Voice Agents",
    icon: <Bot className="h-4 w-4" />,
    features: [
      { label: "Visual node-based workflow builder", starter: true, growth: true, pro: true },
      { label: "Agent runs per month", starter: "500", growth: "5,000", pro: "Unlimited" },
      { label: "Concurrent voice calls", starter: "2", growth: "10", pro: "Unlimited" },
      { label: "Workflow versions & history", starter: true, growth: true, pro: true },
      { label: "Workflow templates", starter: "3", growth: "Unlimited", pro: "Unlimited" },
      { label: "Duplicate & remix workflows", starter: true, growth: true, pro: true },
      { label: "Variable extraction (BANT, NER)", starter: false, growth: true, pro: true },
      { label: "Multi-agent orchestration", starter: false, growth: false, pro: true },
      { label: "Ambient noise cancellation", starter: false, growth: true, pro: true },
      { label: "Call transfer to human", starter: false, growth: true, pro: true },
      { label: "Max call duration control", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "AI Models",
    icon: <Brain className="h-4 w-4" />,
    features: [
      { label: "LLM providers (OpenAI, Google, Groq, Azure, AWS Bedrock, OpenRouter)", starter: true, growth: true, pro: true },
      { label: "Gemini Live realtime audio", starter: true, growth: true, pro: true },
      { label: "OpenAI Realtime API", starter: false, growth: true, pro: true },
      { label: "STT providers (Deepgram, AssemblyAI, Gladia, Speechmatics, Sarvam)", starter: true, growth: true, pro: true },
      { label: "TTS providers (ElevenLabs, Cartesia, Rime, Camb, Sarvam)", starter: true, growth: true, pro: true },
      { label: "Model configuration profiles (save & reuse)", starter: true, growth: true, pro: true },
      { label: "Multiple API keys with round-robin load balancing", starter: false, growth: true, pro: true },
      { label: "Custom fine-tuned model support", starter: false, growth: false, pro: true },
    ],
  },
  {
    title: "Telephony",
    icon: <Phone className="h-4 w-4" />,
    features: [
      { label: "Inbound calls", starter: true, growth: true, pro: true },
      { label: "Outbound calls", starter: false, growth: true, pro: true },
      { label: "Telephony providers (Exotel, Twilio, Plivo, Vonage, Telnyx)", starter: true, growth: true, pro: true },
      { label: "Phone numbers", starter: "1", growth: "5", pro: "Unlimited" },
      { label: "SIP / VoIP (Vobiz, Cloudonix, ARI)", starter: false, growth: true, pro: true },
      { label: "Call recording", starter: true, growth: true, pro: true },
      { label: "Call transcript", starter: true, growth: true, pro: true },
      { label: "DTMF input handling", starter: false, growth: true, pro: true },
      { label: "Webhook configuration per number", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Web Widget (WebRTC)",
    icon: <Globe className="h-4 w-4" />,
    features: [
      { label: "Embeddable voice widget (JavaScript snippet)", starter: true, growth: true, pro: true },
      { label: "Domain whitelisting", starter: true, growth: true, pro: true },
      { label: "Custom widget branding", starter: false, growth: true, pro: true },
      { label: "Multiple embed tokens per workflow", starter: false, growth: true, pro: true },
      { label: "WebRTC session management", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Knowledge Base & Files",
    icon: <FileText className="h-4 w-4" />,
    features: [
      { label: "Document upload (PDF, DOCX, TXT, MD)", starter: true, growth: true, pro: true },
      { label: "Documents per org", starter: "25", growth: "500", pro: "Unlimited" },
      { label: "Semantic vector search (pgvector)", starter: true, growth: true, pro: true },
      { label: "Knowledge base per workflow", starter: true, growth: true, pro: true },
      { label: "Storage retention", starter: "30 days", growth: "90 days", pro: "1 year" },
      { label: "S3 / MinIO storage backend", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Tools & Integrations",
    icon: <Wrench className="h-4 w-4" />,
    features: [
      { label: "HTTP API tool (call any external endpoint)", starter: true, growth: true, pro: true },
      { label: "Google Calendar (check availability, book, cancel)", starter: true, growth: true, pro: true },
      { label: "Calculator tool", starter: true, growth: true, pro: true },
      { label: "MCP server integration (custom tool catalogs)", starter: false, growth: true, pro: true },
      { label: "End call tool", starter: true, growth: true, pro: true },
      { label: "Call transfer tool", starter: false, growth: true, pro: true },
      { label: "Custom tool builder", starter: true, growth: true, pro: true },
      { label: "Tool versioning", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Campaigns",
    icon: <TrendingUp className="h-4 w-4" />,
    features: [
      { label: "Outbound call campaigns", starter: false, growth: true, pro: true },
      { label: "CSV contact list upload", starter: false, growth: true, pro: true },
      { label: "Campaign scheduling", starter: false, growth: true, pro: true },
      { label: "Pause / resume campaigns", starter: false, growth: true, pro: true },
      { label: "Per-call disposition tracking", starter: false, growth: true, pro: true },
      { label: "Campaign analytics", starter: false, growth: true, pro: true },
      { label: "Retry logic on no-answer", starter: false, growth: false, pro: true },
    ],
  },
  {
    title: "Contacts & CRM",
    icon: <Users className="h-4 w-4" />,
    features: [
      { label: "Contact directory", starter: true, growth: true, pro: true },
      { label: "Contacts", starter: "1,000", growth: "25,000", pro: "Unlimited" },
      { label: "CSV import / export", starter: true, growth: true, pro: true },
      { label: "Contact tags & custom fields", starter: false, growth: true, pro: true },
      { label: "Call history per contact", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Calendar & Appointments",
    icon: <Calendar className="h-4 w-4" />,
    features: [
      { label: "Appointment booking via voice", starter: true, growth: true, pro: true },
      { label: "Google Calendar sync (OAuth)", starter: true, growth: true, pro: true },
      { label: "View & cancel appointments in dashboard", starter: true, growth: true, pro: true },
      { label: "Availability check during calls", starter: true, growth: true, pro: true },
      { label: "Multiple calendar integrations", starter: false, growth: true, pro: true },
    ],
  },
  {
    title: "Escalations",
    icon: <Flame className="h-4 w-4" />,
    features: [
      { label: "Auto-escalation on negative sentiment", starter: true, growth: true, pro: true },
      { label: "Escalation inbox (review & resolve)", starter: true, growth: true, pro: true },
      { label: "Escalation → knowledge base feedback loop", starter: false, growth: true, pro: true },
      { label: "Custom escalation triggers", starter: false, growth: true, pro: true },
    ],
  },
  {
    title: "Recordings & Transcripts",
    icon: <AudioLines className="h-4 w-4" />,
    features: [
      { label: "Call recordings", starter: true, growth: true, pro: true },
      { label: "Full call transcripts", starter: true, growth: true, pro: true },
      { label: "Recording playback in dashboard", starter: true, growth: true, pro: true },
      { label: "Recording storage retention", starter: "30 days", growth: "90 days", pro: "1 year" },
      { label: "Recording download", starter: false, growth: true, pro: true },
    ],
  },
  {
    title: "Analytics & Reports",
    icon: <BarChart3 className="h-4 w-4" />,
    features: [
      { label: "Agent run history", starter: true, growth: true, pro: true },
      { label: "Cost per run (USD + INR)", starter: true, growth: true, pro: true },
      { label: "Call duration analytics", starter: true, growth: true, pro: true },
      { label: "Token & model usage breakdown", starter: true, growth: true, pro: true },
      { label: "Campaign performance reports", starter: false, growth: true, pro: true },
      { label: "Custom date range reports", starter: false, growth: true, pro: true },
      { label: "Langfuse tracing integration", starter: false, growth: true, pro: true },
      { label: "Export reports (CSV)", starter: false, growth: true, pro: true },
    ],
  },
  {
    title: "Developer & API",
    icon: <Key className="h-4 w-4" />,
    features: [
      { label: "REST API access", starter: true, growth: true, pro: true },
      { label: "API keys", starter: "2", growth: "10", pro: "Unlimited" },
      { label: "Webhooks (inbound call events)", starter: true, growth: true, pro: true },
      { label: "OpenAPI / Swagger docs", starter: true, growth: true, pro: true },
      { label: "MCP server support (host your own tools)", starter: false, growth: true, pro: true },
      { label: "Webhook signing & verification", starter: false, growth: true, pro: true },
    ],
  },
  {
    title: "Security & Compliance",
    icon: <Shield className="h-4 w-4" />,
    features: [
      { label: "Multi-organization support", starter: true, growth: true, pro: true },
      { label: "Role-based access (admin / member)", starter: true, growth: true, pro: true },
      { label: "SSO / SAML", starter: false, growth: false, pro: true },
      { label: "Audit logs", starter: false, growth: true, pro: true },
      { label: "SOC 2 (in progress)", starter: false, growth: false, pro: true },
      { label: "Data residency (India region)", starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Deployment",
    icon: <Layers className="h-4 w-4" />,
    features: [
      { label: "Cloud hosted (managed)", starter: true, growth: true, pro: true },
      { label: "Self-hosted / OSS Docker deploy", starter: true, growth: true, pro: true },
      { label: "White-label (custom domain + branding)", starter: false, growth: false, pro: true },
      { label: "On-premise / VPC deployment", starter: false, growth: false, pro: true },
    ],
  },
  {
    title: "Support",
    icon: <Headphones className="h-4 w-4" />,
    features: [
      { label: "Community support", starter: true, growth: true, pro: true },
      { label: "Email support", starter: true, growth: true, pro: true },
      { label: "Priority WhatsApp support", starter: false, growth: true, pro: true },
      { label: "Onboarding call with founder", starter: false, growth: true, pro: true },
      { label: "Dedicated success manager", starter: false, growth: false, pro: true },
      { label: "Custom workflow engineering", starter: false, growth: false, pro: true },
      { label: "Weekly strategy calls", starter: false, growth: false, pro: true },
      { label: "SLA 99.9%", starter: false, growth: false, pro: true },
    ],
  },
];

/* ─── Pricing Constants ──────────────────────────────────── */
const PLANS = [
  {
    key: "starter",
    name: "Receptionist",
    tagline: "AI that handles your inbound calls",
    monthlyPrice: 11999,
    annualPrice: 10199,
    setupFee: 4999,
    setupWaivedAnnual: true,
    highlight: false,
    badge: null,
    cta: "Get started",
    color: "text-foreground",
    accentBg: "bg-muted",
  },
  {
    key: "growth",
    name: "Sales Associate",
    tagline: "AI that qualifies leads & books calls",
    monthlyPrice: 29999,
    annualPrice: 25499,
    setupFee: 14999,
    setupWaivedAnnual: true,
    highlight: true,
    badge: "Most Popular",
    cta: "Get started",
    color: "text-primary",
    accentBg: "bg-primary/5",
  },
  {
    key: "pro",
    name: "Sales Manager",
    tagline: "Multi-agent AI workforce for scale",
    monthlyPrice: 74999,
    annualPrice: 63749,
    setupFee: 49999,
    setupWaivedAnnual: false,
    highlight: false,
    badge: "Enterprise",
    cta: "Talk to us",
    color: "text-foreground",
    accentBg: "bg-muted",
  },
];

/* ─── Page ───────────────────────────────────────────────── */
export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURE_GROUPS.map((g) => [g.title, true]))
  );

  const toggleSection = (title: string) =>
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const collapseAll = () =>
    setOpenSections(Object.fromEntries(FEATURE_GROUPS.map((g) => [g.title, false])));
  const expandAll = () =>
    setOpenSections(Object.fromEntries(FEATURE_GROUPS.map((g) => [g.title, true])));

  const allOpen = Object.values(openSections).every(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          14-day money-back guarantee · No contracts
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Hire an AI Employee
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Lynq replaces a ₹25,000/month receptionist — works 24/7, never takes leave, never misses a call.
          Personal onboarding by our team on every plan.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border bg-muted/50 p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all",
              billing === "monthly"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all flex items-center gap-2",
              billing === "annual"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              SAVE 15%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
            return (
              <div
                key={plan.key}
                className={cn(
                  "relative rounded-2xl border p-8 flex flex-col gap-6 transition-all",
                  plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10 bg-card"
                    : "border-border bg-card"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className={cn(
                        "text-xs font-semibold px-3 py-1",
                        plan.highlight
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Lynq
                  </p>
                  <h2 className={cn("text-2xl font-bold", plan.color)}>{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                </div>

                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-sm font-medium text-muted-foreground">₹</span>
                    <span className="text-4xl font-bold text-foreground tabular-nums">
                      {price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/mo</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    + GST · Billed {billing === "annual" ? "annually" : "monthly"}
                  </p>
                  {plan.setupFee > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {billing === "annual" && plan.setupWaivedAnnual ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✓ Setup fee waived on annual plan
                        </span>
                      ) : (
                        <span>
                          + ₹{plan.setupFee.toLocaleString("en-IN")} setup fee
                          {plan.setupWaivedAnnual && " (waived on annual)"}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  className={cn(
                    "w-full font-semibold",
                    plan.highlight ? "gradient-primary text-white" : ""
                  )}
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                >
                  {plan.cta}
                </Button>

                {/* Quick highlights */}
                <ul className="space-y-2.5 text-sm">
                  {plan.key === "starter" && [
                    "500 agent runs / month",
                    "1 phone number",
                    "Visual workflow builder",
                    "Knowledge base (25 docs)",
                    "Google Calendar booking",
                    "Call recordings & transcripts",
                    "Embeddable web widget",
                    "Email support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                  {plan.key === "growth" && [
                    "5,000 agent runs / month",
                    "5 phone numbers",
                    "Outbound calling + campaigns",
                    "Variable extraction & BANT scoring",
                    "MCP server integrations",
                    "Unlimited knowledge base",
                    "Advanced analytics + Langfuse",
                    "Onboarding call with founder",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                  {plan.key === "pro" && [
                    "Unlimited agent runs",
                    "Unlimited phone numbers",
                    "Multi-agent orchestration",
                    "White-label (your domain + branding)",
                    "SSO / SAML",
                    "On-premise / VPC deployment",
                    "Dedicated success manager",
                    "Custom workflow engineering",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full feature comparison table */}
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Full feature comparison</h2>
          <button
            onClick={allOpen ? collapseAll : expandAll}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {allOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground w-[44%]">
                  Feature
                </th>
                {PLANS.map((plan) => (
                  <th
                    key={plan.key}
                    className={cn(
                      "px-4 py-4 text-center text-sm font-semibold w-[18%]",
                      plan.highlight ? "bg-primary/5 text-primary" : "text-foreground"
                    )}
                  >
                    <div>{plan.name}</div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                      ₹{(billing === "monthly" ? plan.monthlyPrice : plan.annualPrice).toLocaleString("en-IN")}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((group) => (
                <SectionRow
                  key={group.title}
                  group={group}
                  open={openSections[group.title] ?? true}
                  onToggle={() => toggleSection(group.title)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          All prices exclusive of GST (18%). Annual billing saves 15% vs monthly.
          Setup fees are waived on annual plans for Receptionist and Sales Associate.
          Contact us for custom enterprise pricing.
        </p>
      </div>

      {/* FAQ / social proof strip */}
      <div className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
          <div>
            <div className="text-3xl font-bold text-foreground">14-day</div>
            <div className="mt-1 text-sm text-muted-foreground">Money-back guarantee — no questions asked</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">24/7</div>
            <div className="mt-1 text-sm text-muted-foreground">Your AI employee never sleeps, never takes leave</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">48h</div>
            <div className="mt-1 text-sm text-muted-foreground">Typical time from signup to live AI on your number</div>
          </div>
        </div>
      </div>
    </div>
  );
}
