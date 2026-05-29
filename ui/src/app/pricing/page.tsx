"use client";

import {
  Check,
  Minus,
  Sparkles,
  Phone,
  MessageSquare,
  Brain,
  Wrench,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  Key,
  AudioLines,
  Flame,
  Globe,
  Shield,
  Layers,
  BarChart3,
  Headphones,
  ChevronDown,
  ChevronUp,
  Zap,
  Bot,
  Star,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─────────────────────────────────────────────── */
type BillingCycle = "monthly" | "annual";
type FeatureValue = boolean | string | null;

interface Feature {
  label: string;
  sub?: string;
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

function SectionRow({
  group,
  open,
  onToggle,
}: {
  group: FeatureGroup;
  open: boolean;
  onToggle: () => void;
}) {
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
              {open ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </div>
        </td>
      </tr>
      {open &&
        group.features.map((f, i) => (
          <tr
            key={i}
            className="border-b border-border/40 hover:bg-muted/20 transition-colors"
          >
            <td className="px-6 py-3">
              <div className="text-sm text-muted-foreground">{f.label}</div>
              {f.sub && (
                <div className="text-xs text-muted-foreground/60 mt-0.5">
                  {f.sub}
                </div>
              )}
            </td>
            <td className="px-4 py-3 text-center">
              <FeatureCell value={f.starter} />
            </td>
            <td className="px-4 py-3 text-center bg-primary/[0.03]">
              <FeatureCell value={f.growth} />
            </td>
            <td className="px-4 py-3 text-center">
              <FeatureCell value={f.pro} />
            </td>
          </tr>
        ))}
    </>
  );
}

/* ─── Feature Data ───────────────────────────────────────── */
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "WhatsApp AI Chatbot (powered by Supbot)",
    icon: <MessageSquare className="h-4 w-4" />,
    features: [
      {
        label: "WhatsApp AI chatbot",
        sub: "AI automatically replies to customer messages on WhatsApp 24/7",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Shared team inbox",
        sub: "All WhatsApp conversations visible to your whole team in one place",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Auto-reply to common questions",
        sub: "AI answers FAQs, pricing, hours, and more without you lifting a finger",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Lead capture from WhatsApp",
        sub: "AI collects name, phone, interest, and saves to your CRM automatically",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Appointment booking via WhatsApp",
        sub: "Customers book slots directly in chat — synced to your Google Calendar",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Hand off to your team when needed",
        sub: "AI passes the chat to a human agent with full context when it can't help",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Bulk WhatsApp broadcast messages",
        sub: "Send a message to hundreds of contacts at once (promotions, updates)",
        starter: "500 / mo",
        growth: "4,000 / mo",
        pro: "Unlimited",
      },
      {
        label: "Automated follow-up sequences",
        sub: "Send a series of messages over days/weeks to nurture leads",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Click-to-WhatsApp ad integration",
        sub: "Leads from WhatsApp ads land directly in your inbox and CRM",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "WhatsApp number",
        starter: "1",
        growth: "2",
        pro: "5",
      },
    ],
  },
  {
    title: "Website Chat Widget",
    icon: <Globe className="h-4 w-4" />,
    features: [
      {
        label: "AI chat widget on your website",
        sub: "Add a chat bubble to your website with one line of code — AI handles it",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Same AI brain as WhatsApp",
        sub: "Website visitors and WhatsApp customers get the same consistent answers",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Continue chat on WhatsApp",
        sub: "Website visitor can switch to WhatsApp and the AI remembers the conversation",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Custom brand colors & logo",
        sub: "Widget matches your website's look and feel",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Restrict to your domain only",
        sub: "Prevents anyone else from copying your chat widget",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Voice call button in widget",
        sub: "Visitor can talk to your AI agent directly from your website",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "AI Phone Agent (Voice Calls)",
    icon: <Phone className="h-4 w-4" />,
    features: [
      {
        label: "AI that answers your phone",
        sub: "AI picks up inbound calls, talks to customers, and takes notes — like a receptionist",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "AI makes outbound calls",
        sub: "AI calls your leads list and qualifies them — no human dialing needed",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Indian languages (Hindi + more)",
        sub: "AI speaks Hindi, Tamil, Telugu — switches based on the customer's language",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Phone numbers",
        starter: false,
        growth: "5",
        pro: "Unlimited",
      },
      {
        label: "Call recording",
        sub: "Every call recorded and saved — listen anytime from your dashboard",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Call transcript",
        sub: "Automatic text version of every call — no note-taking needed",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Transfer call to your team",
        sub: "AI transfers the call to a human when the customer needs personal attention",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Concurrent calls",
        sub: "How many calls can happen at the same time",
        starter: false,
        growth: "10",
        pro: "Unlimited",
      },
      {
        label: "Telephony providers",
        sub: "Works with Exotel, Twilio, Plivo, Vonage, Telnyx — use your existing number",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "AI Brain & Conversation Quality",
    icon: <Brain className="h-4 w-4" />,
    features: [
      {
        label: "Powered by Google Gemini & OpenAI",
        sub: "Best-in-class AI models so your agent sounds natural and intelligent",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Answers from your own documents",
        sub: "Upload your price list, FAQ doc, brochure — AI answers from it instantly",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Documents in knowledge base",
        starter: "25 docs",
        growth: "500 docs",
        pro: "Unlimited",
      },
      {
        label: "AI learns from corrections",
        sub: "When AI gives a wrong answer, you correct it once — it won't repeat the mistake",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Lead qualification scoring (BANT)",
        sub: "AI rates each lead as Hot / Warm / Cold based on their Budget, Authority, Need, Timeline",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Custom AI fine-tuning on your data",
        sub: "Train the AI on your own past conversations for even better responses",
        starter: false,
        growth: false,
        pro: true,
      },
    ],
  },
  {
    title: "CRM & Contacts",
    icon: <Users className="h-4 w-4" />,
    features: [
      {
        label: "Contact directory",
        sub: "All your leads and customers in one searchable list",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Contacts",
        starter: "1,000",
        growth: "25,000",
        pro: "Unlimited",
      },
      {
        label: "Import contacts from Excel / CSV",
        sub: "Upload your existing contact list in seconds",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Full conversation history per contact",
        sub: "See every WhatsApp chat, voice call, and website visit for each contact",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Activity timeline per contact",
        sub: "See a full log of every interaction — calls, chats, notes, appointments",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Notes & comments on contacts",
        sub: "Add private notes to a contact so your whole team stays on the same page",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Contact source tracking",
        sub: "Know how each lead found you — WhatsApp, website, phone call, or imported",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Tags & custom fields",
        sub: 'Label contacts (e.g. "Hot Lead", "Site Visit Done") and add custom info fields',
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Sales pipeline (Kanban board)",
        sub: "Drag leads through stages: New → Contacted → Qualified → Proposal → Won",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Deal value tracking",
        sub: "Record the value of each deal so you know your pipeline worth at a glance",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Follow-up task reminders",
        sub: "Set a reminder to call or message a contact on a specific date",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Smart contact segments",
        sub: 'Create lists like "All leads from last 7 days who didn\'t book" — automatically updated',
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Lead scoring",
        sub: "AI ranks your contacts from hottest to coldest based on their engagement",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Bulk actions on contacts",
        sub: "Tag, assign, or message multiple contacts at once",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Duplicate contact detection",
        sub: "Automatically flags when the same person exists twice in your database",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Outbound Campaigns",
    icon: <TrendingUp className="h-4 w-4" />,
    features: [
      {
        label: "Outbound call campaigns",
        sub: "AI calls a list of contacts — useful for follow-ups, reminders, lead nurturing",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Campaign scheduling",
        sub: "Set campaigns to run at specific times (e.g. weekday mornings only)",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Track outcomes per call",
        sub: "Mark each call as: Interested / Not Interested / Callback Requested / No Answer",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Auto-retry missed calls",
        sub: "If no one picks up, AI tries again automatically up to 3 times",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        label: "Campaign performance report",
        sub: "See conversion rate, call duration, and outcomes in a simple report",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Appointment Booking",
    icon: <Calendar className="h-4 w-4" />,
    features: [
      {
        label: "Book appointments via chat or call",
        sub: "AI checks your calendar and books a slot — no back and forth",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Google Calendar sync",
        sub: "Bookings appear in your Google Calendar automatically",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "View & manage appointments in dashboard",
        sub: "See all upcoming appointments, cancel or reschedule from one place",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Automatic reminders to customers",
        sub: "AI sends a WhatsApp reminder 24 hours and 2 hours before the appointment",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Multiple calendars",
        sub: "Different team members can have their own calendars linked",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Escalations & Human Handoff",
    icon: <Flame className="h-4 w-4" />,
    features: [
      {
        label: "AI detects when a customer is upset",
        sub: "If sentiment turns negative, AI automatically alerts your team",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Escalation inbox for your team",
        sub: "Escalated conversations land in a separate inbox — review and take over",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "AI improves from escalated chats",
        sub: "Resolved escalations get added to the knowledge base so AI handles it next time",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Custom escalation rules",
        sub: 'Set your own triggers, e.g. "escalate if customer mentions refund"',
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Analytics & Reports",
    icon: <BarChart3 className="h-4 w-4" />,
    features: [
      {
        label: "Conversation history & logs",
        sub: "See every chat and call your AI handled",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "AI cost per conversation",
        sub: "Know exactly what you're spending on AI per month",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Leads generated report",
        sub: "How many new leads did your AI capture this week/month?",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Campaign performance reports",
        sub: "Call outcomes, conversion rates, and best-performing scripts",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Custom date range reports",
        sub: "Filter analytics by any date range",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Export reports to Excel",
        sub: "Download any report as a spreadsheet",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Workflow Builder (How you train your AI)",
    icon: <Wrench className="h-4 w-4" />,
    features: [
      {
        label: "Drag-and-drop conversation designer",
        sub: "Build your AI's script visually — like a flowchart, no coding",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Ready-made industry templates",
        sub: "Pre-built flows for Real Estate, Healthcare, Education, Auto, Finance",
        starter: "3 templates",
        growth: "Unlimited",
        pro: "Unlimited",
      },
      {
        label: "Custom branching logic",
        sub: "AI takes different paths based on what the customer says",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Connect to any external system",
        sub: "AI can look up or update your existing software (ERP, CRM, etc.) via API",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Google Calendar booking inside workflows",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Multi-agent orchestration",
        sub: "Multiple specialized AI agents working together (e.g. Qualifier + Closer + Concierge)",
        starter: false,
        growth: false,
        pro: true,
      },
    ],
  },
  {
    title: "Developer & API",
    icon: <Key className="h-4 w-4" />,
    features: [
      {
        label: "Full REST API access",
        sub: "Connect Lynq to any software via our API",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "API keys",
        starter: "2",
        growth: "10",
        pro: "Unlimited",
      },
      {
        label: "Webhooks",
        sub: "Get notified in real-time when events happen (new lead, call ended, etc.)",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Full API documentation",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Advanced tool catalog (MCP servers)",
        sub: "For technical teams who want to build and host their own AI tools",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Security & Team",
    icon: <Shield className="h-4 w-4" />,
    features: [
      {
        label: "Multiple team members",
        sub: "Add your sales team so they can all see conversations and contacts",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Admin & member roles",
        sub: "Control who can change settings vs. who can only view",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Single sign-on (SSO/SAML)",
        sub: "Log in with your company's Google Workspace or Microsoft account",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        label: "Audit logs",
        sub: "See who changed what and when — useful for compliance",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Data stored in India",
        sub: "All your data stays on Indian servers — DPDP Act compliant",
        starter: true,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    title: "Deployment",
    icon: <Layers className="h-4 w-4" />,
    features: [
      {
        label: "Hosted by us (nothing to install)",
        sub: "We run everything — you just log in and use it",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "White-label (your own brand)",
        sub: "Remove 'Powered by Lynq' — use your own domain and logo throughout",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        label: "Self-hosted / on-premise",
        sub: "Run everything inside your own servers or private cloud",
        starter: false,
        growth: false,
        pro: true,
      },
    ],
  },
  {
    title: "Support & Onboarding",
    icon: <Headphones className="h-4 w-4" />,
    features: [
      {
        label: "Personal setup by our team",
        sub: "We configure everything for you — you don't figure it out alone",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "WhatsApp support",
        starter: true,
        growth: true,
        pro: true,
      },
      {
        label: "Priority support (fast response)",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Onboarding call with founder",
        sub: "Direct call with Rayhan (founder) to get you live in 48 hours",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        label: "Dedicated success manager",
        sub: "One person responsible for your account — weekly check-in calls",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        label: "We build custom workflows for you",
        sub: "Don't want to touch the builder? We'll design the whole AI flow for you",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        label: "99.9% uptime guarantee",
        sub: "We credit your account if we miss this",
        starter: false,
        growth: false,
        pro: true,
      },
    ],
  },
];

/* ─── Pricing Constants ──────────────────────────────────── */
const PLANS = [
  {
    key: "starter",
    name: "Receptionist",
    tagline: "WhatsApp + website chatbot for your business",
    channel: "Chat only",
    channelNote: "WhatsApp & website chat",
    monthlyPrice: 11999,
    annualPrice: 10199,
    setupFee: 4999,
    setupWaivedAnnual: true,
    highlight: false,
    badge: null,
    cta: "Get started",
    color: "text-foreground",
    highlights: [
      "WhatsApp AI chatbot (24/7 replies)",
      "Website chat widget included",
      "Answers FAQs automatically",
      "Captures leads to your CRM",
      "Books appointments via chat",
      "Team shared inbox",
      "1,000 contacts",
      "Personal setup by our team",
    ],
  },
  {
    key: "growth",
    name: "Sales Associate",
    tagline: "Chat + voice AI that qualifies & closes leads",
    channel: "Chat + Voice",
    channelNote: "WhatsApp, website & phone calls",
    monthlyPrice: 29999,
    annualPrice: 25499,
    setupFee: 14999,
    setupWaivedAnnual: true,
    highlight: true,
    badge: "Most Popular",
    cta: "Get started",
    color: "text-primary",
    highlights: [
      "Everything in Receptionist",
      "AI that answers & makes phone calls",
      "Automatically scores leads (Hot/Warm/Cold)",
      "Sales pipeline & deal tracking",
      "Outbound call campaigns",
      "25,000 contacts",
      "Follow-up task reminders",
      "Onboarding call with founder",
    ],
  },
  {
    key: "pro",
    name: "Sales Manager",
    tagline: "Full AI workforce — chat, voice & multi-agent",
    channel: "All channels",
    channelNote: "Chat, voice, email & more",
    monthlyPrice: 74999,
    annualPrice: 63749,
    setupFee: 49999,
    setupWaivedAnnual: false,
    highlight: false,
    badge: "Enterprise",
    cta: "Talk to us",
    color: "text-foreground",
    highlights: [
      "Everything in Sales Associate",
      "Multiple AI agents collaborating",
      "Unlimited contacts & calls",
      "White-label (your brand, your domain)",
      "Custom AI trained on your data",
      "Dedicated success manager",
      "We build your workflows for you",
      "99.9% uptime SLA",
    ],
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
    setOpenSections(
      Object.fromEntries(FEATURE_GROUPS.map((g) => [g.title, false]))
    );
  const expandAll = () =>
    setOpenSections(
      Object.fromEntries(FEATURE_GROUPS.map((g) => [g.title, true]))
    );

  const allOpen = Object.values(openSections).every(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          14-day money-back guarantee · Setup done for you · No contracts
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Your AI Employee, Live in 48 Hours
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Lynq handles WhatsApp, your website chat, and phone calls — answering
          questions, booking appointments, and capturing leads while you sleep.
          Costs less than a receptionist. Works 24/7.
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
            const price =
              billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Lynq
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {plan.channel}
                    </span>
                  </div>
                  <h2 className={cn("text-2xl font-bold", plan.color)}>
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.tagline}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground/70">
                    {plan.channelNote}
                  </p>
                </div>

                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      ₹
                    </span>
                    <span className="text-4xl font-bold text-foreground tabular-nums">
                      {price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">
                      /mo
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    + GST · Billed{" "}
                    {billing === "annual" ? "annually" : "monthly"}
                  </p>
                  {plan.setupFee > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {billing === "annual" && plan.setupWaivedAnnual ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✓ Setup fee waived on annual plan
                        </span>
                      ) : (
                        <span>
                          + ₹{plan.setupFee.toLocaleString("en-IN")} one-time
                          setup
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

                {/* Highlights */}
                <ul className="space-y-2.5 text-sm">
                  {plan.highlights.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
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

      {/* What's included strip */}
      <div className="border-y bg-muted/20 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Every plan includes
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: <Zap className="h-5 w-5" />, label: "Personal setup by our team", sub: "We configure it — you just use it" },
              { icon: <MessageSquare className="h-5 w-5" />, label: "WhatsApp + website chatbot", sub: "Both channels included from day one" },
              { icon: <Calendar className="h-5 w-5" />, label: "Appointment booking", sub: "Synced with Google Calendar" },
              { icon: <Star className="h-5 w-5" />, label: "14-day money-back guarantee", sub: "No questions asked" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <span className="text-primary mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full feature comparison table */}
      <div className="mx-auto max-w-6xl px-4 py-16 pb-24">
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold">Everything that's included</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Expand each section to see the full detail
          </p>
        </div>

        <div className="mb-6 flex items-center justify-end">
          <button
            onClick={allOpen ? collapseAll : expandAll}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {allOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
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
                      plan.highlight
                        ? "bg-primary/5 text-primary"
                        : "text-foreground"
                    )}
                  >
                    <div>{plan.name}</div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                      ₹
                      {(billing === "monthly"
                        ? plan.monthlyPrice
                        : plan.annualPrice
                      ).toLocaleString("en-IN")}
                      /mo
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

        <p className="mt-6 text-center text-xs text-muted-foreground">
          All prices exclusive of GST (18%). Annual billing saves 15% vs
          monthly. Setup fees waived on annual plans for Receptionist and Sales
          Associate. Contact us for custom enterprise pricing.
        </p>
      </div>

      {/* Social proof / guarantee strip */}
      <div className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
          <div>
            <div className="text-3xl font-bold text-foreground">48 hrs</div>
            <div className="mt-1 text-sm text-muted-foreground">
              From payment to your AI live on WhatsApp
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">24/7</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Never misses a message — even at 2am on Sunday
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">14-day</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Money-back guarantee — if it's not right, full refund
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
