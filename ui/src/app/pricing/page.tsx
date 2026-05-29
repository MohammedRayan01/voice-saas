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
  Flame,
  Globe,
  Shield,
  Layers,
  BarChart3,
  Headphones,
  ChevronDown,
  ChevronUp,
  Zap,
  Star,
  TrendingUp,
  Key,
  Info,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─────────────────────────────────────────────── */
type BillingCycle = "monthly" | "annual";
type FeatureValue = boolean | string | null;

interface UsageItem {
  label: string;
  value: string;
  note?: string;
}

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

/* ─── Plans ──────────────────────────────────────────────── */
const PLANS = [
  {
    key: "starter",
    name: "Receptionist",
    tagline: "AI chatbot on WhatsApp & your website",
    channel: "Chat only",
    monthlyPrice: 11999,
    annualPrice: 10199,
    setupFee: 4999,
    setupWaivedAnnual: true,
    highlight: false,
    badge: null,
    cta: "Get started",
    color: "text-foreground",
    usage: [
      { label: "WhatsApp AI replies", value: "5,000 / mo", note: "~165 chats per day" },
      { label: "Broadcast messages", value: "1,500 / mo", note: "₹1.30 / msg extra" },
      { label: "Contacts", value: "1,000" },
      { label: "Documents (knowledge base)", value: "25 docs" },
      { label: "Voice calls", value: "Not included" },
    ] as UsageItem[],
    highlights: [
      "WhatsApp AI chatbot — 24/7 replies",
      "Website chat widget included",
      "Auto-answers FAQs instantly",
      "Captures leads to your CRM",
      "Books appointments via chat",
      "Appointment reminders sent for you",
      "Team shared inbox",
      "Personal setup by our team",
    ],
  },
  {
    key: "growth",
    name: "Sales Associate",
    tagline: "Chat + AI phone calls that qualify & close leads",
    channel: "Chat + Voice",
    monthlyPrice: 29999,
    annualPrice: 25499,
    setupFee: 14999,
    setupWaivedAnnual: true,
    highlight: true,
    badge: "Most Popular",
    cta: "Get started",
    color: "text-primary",
    usage: [
      { label: "WhatsApp AI replies", value: "8,000 / mo", note: "~260 chats per day" },
      { label: "Broadcast messages", value: "4,000 / mo", note: "₹1.15 / msg extra" },
      { label: "Voice call minutes", value: "600 min / mo", note: "≈ 170 AI calls · ₹6 / min extra" },
      { label: "Contacts", value: "25,000" },
      { label: "Documents (knowledge base)", value: "500 docs" },
    ] as UsageItem[],
    highlights: [
      "Everything in Receptionist",
      "AI answers & makes phone calls",
      "600 min / month ≈ 170 AI calls included",
      "Scores leads Hot / Warm / Cold automatically",
      "Sales pipeline & deal tracking",
      "Outbound call campaigns",
      "25,000 contacts",
      "Onboarding call with founder",
    ],
  },
  {
    key: "pro",
    name: "Sales Manager",
    tagline: "Full AI workforce — chat, voice & automation",
    channel: "All channels",
    monthlyPrice: 74999,
    annualPrice: 63749,
    setupFee: 49999,
    setupWaivedAnnual: false,
    highlight: false,
    badge: "Enterprise",
    cta: "Talk to us",
    color: "text-foreground",
    usage: [
      { label: "WhatsApp AI replies", value: "Unlimited" },
      { label: "Broadcast messages", value: "Unlimited" },
      { label: "Voice call minutes", value: "2,000 min / mo", note: "≈ 570 AI calls · ₹5 / min extra" },
      { label: "Contacts", value: "Unlimited" },
      { label: "Documents (knowledge base)", value: "Unlimited" },
    ] as UsageItem[],
    highlights: [
      "Everything in Sales Associate",
      "2,000 voice minutes / month",
      "Multiple AI agents working together",
      "Unlimited contacts & broadcasts",
      "White-label — your brand, your domain",
      "Custom AI trained on your data",
      "Dedicated success manager",
      "We build your workflows for you",
    ],
  },
];

/* ─── Feature Groups ─────────────────────────────────────── */
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "WhatsApp AI Chatbot",
    icon: <MessageSquare className="h-4 w-4" />,
    features: [
      {
        label: "WhatsApp AI chatbot — 24/7 replies",
        sub: "AI automatically responds to every inbound WhatsApp message, day or night",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Shared team inbox",
        sub: "Every WhatsApp conversation is visible to your whole team in one place",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Auto-answers FAQs",
        sub: "AI replies instantly to common questions — pricing, timings, availability, etc.",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Captures lead details automatically",
        sub: "AI asks for name, phone, and what they need — saves it to your CRM without you doing anything",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Books appointments through chat",
        sub: "Customer picks a slot directly in WhatsApp — instantly confirmed in your calendar",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Hands off to your team when needed",
        sub: "AI passes the conversation to a human agent with full context when it can't handle it",
        starter: true, growth: true, pro: true,
      },
      {
        label: "WhatsApp AI replies per month",
        sub: "How many AI-handled chat turns are included (avg conversation = 3–5 turns)",
        starter: "5,000", growth: "8,000", pro: "Unlimited",
      },
      {
        label: "Broadcast messages per month",
        sub: "Send promotional or update messages to your contact list",
        starter: "1,500", growth: "4,000", pro: "Unlimited",
      },
      {
        label: "Overage rate per extra broadcast",
        sub: "Rates reviewed quarterly and adjusted with Meta pricing changes",
        starter: "₹1.30 / msg", growth: "₹1.15 / msg", pro: "Included",
      },
      {
        label: "Automated follow-up sequences",
        sub: "Send a series of messages over several days to nurture leads (e.g. Day 1 intro → Day 3 follow-up → Day 7 offer)",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Click-to-WhatsApp ad integration",
        sub: "Leads from WhatsApp ads land directly in your inbox and CRM automatically",
        starter: false, growth: true, pro: true,
      },
      {
        label: "WhatsApp numbers",
        starter: "1", growth: "2", pro: "5",
      },
    ],
  },
  {
    title: "Website Chat Widget",
    icon: <Globe className="h-4 w-4" />,
    features: [
      {
        label: "AI chat bubble on your website",
        sub: "Paste one line of code — a chat widget appears on your site, handled by AI",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Same AI as WhatsApp",
        sub: "Website visitors and WhatsApp customers get the same answers from the same AI brain",
        starter: true, growth: true, pro: true,
      },
      {
        label: "\"Continue on WhatsApp\" handoff",
        sub: "Website visitor switches to WhatsApp — AI remembers the full conversation",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Restricted to your domain only",
        sub: "Nobody else can copy your chat widget and use it on another site",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Custom colours and logo",
        sub: "Chat widget matches your website's brand",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Voice call button in chat widget",
        sub: "Website visitor can tap to talk to your AI phone agent directly from your site",
        starter: false, growth: true, pro: true,
      },
    ],
  },
  {
    title: "AI Phone Agent (Voice Calls)",
    icon: <Phone className="h-4 w-4" />,
    features: [
      {
        label: "AI answers inbound phone calls",
        sub: "AI picks up your calls, talks to customers naturally, and logs everything",
        starter: false, growth: true, pro: true,
      },
      {
        label: "AI makes outbound calls",
        sub: "AI dials your leads list and qualifies them — no human dialling needed",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Voice call minutes per month",
        sub: "How many minutes of AI phone calls are included",
        starter: "—", growth: "600 min", pro: "2,000 min",
      },
      {
        label: "Cost per extra minute",
        starter: "—", growth: "₹6 / min", pro: "₹5 / min",
      },
      {
        label: "Call recording",
        sub: "Every call is recorded and saved — listen back from your dashboard anytime",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Call transcript",
        sub: "Automatic written summary of every call — no note-taking needed",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Transfer call to your team",
        sub: "AI hands the call to a human agent when the customer needs personal attention",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Simultaneous calls",
        sub: "How many calls can happen at the same time",
        starter: "—", growth: "10", pro: "Unlimited",
      },
      {
        label: "Phone number",
        sub: "Indian phone number included — we handle setup with the telephony provider",
        starter: "—", growth: "1 number", pro: "Up to 5",
      },
    ],
  },
  {
    title: "AI Quality & Intelligence",
    icon: <Brain className="h-4 w-4" />,
    features: [
      {
        label: "Powered by Google Gemini (managed by us)",
        sub: "We use Google Gemini for conversations and Sarvam AI for Indian languages. No API keys needed — fully managed.",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Answers from your own documents",
        sub: "Upload your price list, FAQ sheet, product brochure — AI answers from them instantly",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Documents in knowledge base",
        starter: "25 docs", growth: "500 docs", pro: "Unlimited",
      },
      {
        label: "Hindi & Indian language support",
        sub: "AI speaks and understands Hindi. More Indian languages on higher plans.",
        starter: "Hindi", growth: "Hindi + Tamil", pro: "5 languages",
      },
      {
        label: "AI learns from corrections",
        sub: "When AI gives a wrong answer, you correct it once — it won't repeat the mistake",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Lead qualification scoring",
        sub: "AI rates each lead as Hot / Warm / Cold based on their Budget, Authority, Need, and Timeline",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Custom AI trained on your data",
        sub: "AI is fine-tuned on your past conversations and business patterns for even better results",
        starter: false, growth: false, pro: true,
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
        starter: true, growth: true, pro: true,
      },
      {
        label: "Total contacts",
        starter: "1,000", growth: "25,000", pro: "Unlimited",
      },
      {
        label: "Import contacts from Excel or CSV",
        sub: "Upload your existing contact list in seconds",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Full conversation history per contact",
        sub: "See every WhatsApp chat, voice call, and website visit for each contact in one place",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Activity timeline",
        sub: "Full log of every interaction — calls, chats, notes, appointments — for each contact",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Add notes to contacts",
        sub: "Your team can add private notes to any contact so everyone stays on the same page",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Where did this lead come from?",
        sub: "Each contact is tagged with their source — WhatsApp, website, phone call, or imported",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Tags and custom fields",
        sub: 'Label contacts (e.g. "Hot Lead", "Site Visit Done") and add your own info fields',
        starter: false, growth: true, pro: true,
      },
      {
        label: "Sales pipeline (Kanban board)",
        sub: "Drag and drop leads through stages: New → Contacted → Qualified → Proposal Sent → Won",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Deal value tracking",
        sub: "Record the value of each deal so you know the total worth of your pipeline at a glance",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Follow-up task reminders",
        sub: "Set a reminder to call or message a contact on a specific date — never let a lead go cold",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Smart segments (auto-updating lists)",
        sub: 'Example: "All leads from last 7 days who haven\'t booked yet" — always up to date',
        starter: false, growth: true, pro: true,
      },
      {
        label: "Lead score per contact",
        sub: "AI ranks your contacts hottest to coldest based on engagement and behaviour",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Bulk actions",
        sub: "Tag, assign, or send a message to multiple contacts at once",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Duplicate contact detection",
        sub: "Automatically flags when the same person appears twice in your database",
        starter: false, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Outbound Campaigns",
    icon: <TrendingUp className="h-4 w-4" />,
    features: [
      {
        label: "Outbound call campaigns",
        sub: "AI calls a list of contacts automatically — for follow-ups, reminders, lead nurturing",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Campaign scheduling",
        sub: "Set campaigns to run at specific times, e.g. weekday mornings only",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Track what happened on each call",
        sub: "Mark each call: Interested / Not Interested / Callback Requested / No Answer",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Auto-retry missed calls",
        sub: "If no one picks up, AI tries again automatically — up to 3 times with spacing",
        starter: false, growth: false, pro: true,
      },
      {
        label: "Campaign report",
        sub: "See how many calls were made, how many converted, and what the best-performing scripts are",
        starter: false, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Appointment Booking",
    icon: <Calendar className="h-4 w-4" />,
    features: [
      {
        label: "Books appointments via chat or call",
        sub: "AI checks your calendar and books a slot without any back-and-forth",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Google Calendar sync",
        sub: "Bookings appear in your Google Calendar automatically",
        starter: true, growth: true, pro: true,
      },
      {
        label: "View and manage all appointments",
        sub: "See all upcoming appointments in your dashboard — cancel or reschedule in one click",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Automatic reminders to customers",
        sub: "AI sends a WhatsApp reminder 24 hours and 2 hours before the appointment — automatically",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Multiple team calendars",
        sub: "Different team members can each have their own calendar connected",
        starter: false, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Escalations & Human Handoff",
    icon: <Flame className="h-4 w-4" />,
    features: [
      {
        label: "AI detects unhappy customers",
        sub: "If a customer sounds frustrated or upset, AI automatically alerts your team",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Escalation inbox for your team",
        sub: "Flagged conversations land in a separate inbox — your team picks them up and takes over",
        starter: true, growth: true, pro: true,
      },
      {
        label: "AI improves from escalated cases",
        sub: "Once your team resolves an escalation, that answer is added to the AI's knowledge base",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Custom escalation rules",
        sub: 'Set your own triggers, e.g. "escalate if customer mentions refund or complaint"',
        starter: false, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Analytics & Reports",
    icon: <BarChart3 className="h-4 w-4" />,
    features: [
      {
        label: "All conversations and call logs",
        sub: "See every chat and call your AI handled",
        starter: true, growth: true, pro: true,
      },
      {
        label: "AI cost per month",
        sub: "Know exactly what you're spending on AI so there are no surprises",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Leads generated this month",
        sub: "How many new leads did your AI capture?",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Campaign performance reports",
        sub: "Call outcomes, conversion rates, and best-performing scripts",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Custom date range filtering",
        sub: "Slice and dice analytics by any time period",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Export any report to Excel",
        sub: "Download any report as a spreadsheet",
        starter: false, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Workflow Builder (How you set up your AI)",
    icon: <Wrench className="h-4 w-4" />,
    features: [
      {
        label: "Drag-and-drop conversation designer",
        sub: "Build your AI's script visually — like a flowchart, no coding required",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Ready-made industry templates",
        sub: "Pre-built scripts for Real Estate, Healthcare, Education, Automotive, Finance",
        starter: "3", growth: "Unlimited", pro: "Unlimited",
      },
      {
        label: "Custom conversation paths",
        sub: "AI takes different routes based on what the customer says",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Connect to your existing software",
        sub: "AI can look up or update your ERP, CRM, or any other system via its API",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Multiple AI agents collaborating",
        sub: "E.g. Qualifier AI → Closer AI → Concierge AI all working together on one customer journey",
        starter: false, growth: false, pro: true,
      },
    ],
  },
  {
    title: "Developer & API",
    icon: <Key className="h-4 w-4" />,
    features: [
      {
        label: "Full REST API",
        sub: "Connect Lynq to any of your software via API",
        starter: true, growth: true, pro: true,
      },
      {
        label: "API keys",
        starter: "2", growth: "10", pro: "Unlimited",
      },
      {
        label: "Webhooks",
        sub: "Get notified in real-time when events happen — new lead, call ended, appointment booked",
        starter: true, growth: true, pro: true,
      },
      {
        label: "API documentation",
        starter: true, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Security & Team",
    icon: <Shield className="h-4 w-4" />,
    features: [
      {
        label: "Multiple team members",
        sub: "Add your entire sales team so they can all view conversations and contacts",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Admin and member roles",
        sub: "Control who can change settings vs. who can only view",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Single sign-on (Google Workspace / Microsoft)",
        sub: "Log in with your company email account",
        starter: false, growth: false, pro: true,
      },
      {
        label: "Audit logs",
        sub: "See who changed what and when — useful for compliance",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Data stored in India",
        sub: "All data stays on Indian servers — DPDP Act compliant",
        starter: true, growth: true, pro: true,
      },
    ],
  },
  {
    title: "Deployment",
    icon: <Layers className="h-4 w-4" />,
    features: [
      {
        label: "Hosted by us — nothing to install",
        sub: "We run everything. You just log in and use it.",
        starter: true, growth: true, pro: true,
      },
      {
        label: "White-label (your own brand)",
        sub: "Remove all Lynq branding — use your own domain and logo throughout",
        starter: false, growth: false, pro: true,
      },
      {
        label: "Self-hosted / on-premise",
        sub: "Run on your own servers or private cloud",
        starter: false, growth: false, pro: true,
      },
    ],
  },
  {
    title: "Support & Onboarding",
    icon: <Headphones className="h-4 w-4" />,
    features: [
      {
        label: "We set everything up for you",
        sub: "Our team configures your AI, loads your documents, and connects your WhatsApp — you don't do it alone",
        starter: true, growth: true, pro: true,
      },
      {
        label: "WhatsApp support",
        starter: true, growth: true, pro: true,
      },
      {
        label: "Priority support",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Onboarding call with founder",
        sub: "Direct call with Rayhan (founder) to get you live within 48 hours",
        starter: false, growth: true, pro: true,
      },
      {
        label: "Dedicated success manager",
        sub: "One person responsible for your account — weekly check-in calls included",
        starter: false, growth: false, pro: true,
      },
      {
        label: "We build custom workflows for you",
        sub: "Don't want to use the builder? We design your entire AI conversation flow",
        starter: false, growth: false, pro: true,
      },
      {
        label: "99.9% uptime guarantee with credits",
        starter: false, growth: false, pro: true,
      },
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
          14-day money-back guarantee · We set it up for you · No contracts
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Your AI Employee, Live in 48 Hours
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Lynq handles WhatsApp, your website, and phone calls — answering
          questions, booking appointments, and capturing leads while you sleep.
          One flat monthly price. No API bills. No hidden costs.
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
      <div className="mx-auto max-w-6xl px-4 pb-8">
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
                          ✓ One-time setup fee waived on annual
                        </span>
                      ) : (
                        <span>
                          + ₹{plan.setupFee.toLocaleString("en-IN")} one-time setup
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

                {/* Usage included block */}
                <div className="rounded-xl bg-muted/40 p-4 space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Included every month
                  </p>
                  {plan.usage.map((u) => (
                    <div key={u.label} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-muted-foreground leading-snug">
                        {u.label}
                      </span>
                      <div className="text-right shrink-0">
                        <span className={cn("text-xs font-semibold", u.value === "Not included" ? "text-muted-foreground/50" : "text-foreground")}>
                          {u.value}
                        </span>
                        {u.note && (
                          <div className="text-[10px] text-muted-foreground/70">{u.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature highlights */}
                <ul className="space-y-2.5 text-sm">
                  {plan.highlights.map((f) => (
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

      {/* Managed AI & infra callout */}
      <div className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-muted/30 px-6 py-5 flex items-start gap-4">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              We manage all the AI, cloud, and telephony — you pay one flat price
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We select the best and most cost-efficient AI models for each task (currently Google Gemini Flash for chat, Gemini 2.5 for complex reasoning, and Sarvam AI for Indian language calls). We also manage telephony through Exotel for Indian numbers. You never need to set up API keys, manage providers, or worry about model upgrades.
            </p>
          </div>
        </div>
      </div>

      {/* Overage & add-on rates */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <h3 className="text-lg font-semibold mb-1">Pay-as-you-go overage rates</h3>
        <p className="text-sm text-muted-foreground mb-6">
          If you go over your monthly limits, you're charged per unit — no surprises. You can also buy add-on packs in advance at a small discount.
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground w-[35%]">
                  What
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                  Receptionist
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-primary bg-primary/5">
                  Sales Associate
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                  Sales Manager
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Extra broadcast message",
                  sub: "Per WhatsApp marketing message beyond plan limit. Rate reviewed quarterly with Meta pricing.",
                  starter: "₹1.30 / msg",
                  growth: "₹1.15 / msg",
                  pro: "Included",
                },
                {
                  label: "Extra AI reply",
                  sub: "Per chat turn handled by AI beyond plan limit",
                  starter: "₹0.15 / reply",
                  growth: "₹0.12 / reply",
                  pro: "Included",
                },
                {
                  label: "Extra voice minute",
                  sub: "Per minute of AI phone call beyond plan limit (avg call = 3–4 min → ~₹18–24 per extra call on Tier 2)",
                  starter: "Not available",
                  growth: "₹6 / min",
                  pro: "₹5 / min",
                },
                {
                  label: "Extra contact",
                  sub: "Per 1,000 contacts added beyond plan limit",
                  starter: "₹199 / 1,000",
                  growth: "₹149 / 1,000",
                  pro: "Included",
                },
                {
                  label: "Extra WhatsApp number",
                  sub: "Per additional WhatsApp Business number",
                  starter: "—",
                  growth: "₹999 / mo",
                  pro: "₹499 / mo",
                },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3">
                    <div className="text-sm text-foreground font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">{row.sub}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">{row.starter}</td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground bg-primary/[0.03]">{row.growth}</td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Overage is charged at the end of each billing cycle. You can set a spending cap in your dashboard to prevent unexpected charges.
          Broadcast rates are tied to Meta (WhatsApp) platform pricing and are reviewed quarterly — you will be notified 30 days before any change.
        </p>
      </div>

      {/* What's on every plan strip */}
      <div className="border-y bg-muted/20 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Every plan includes
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                icon: <Zap className="h-5 w-5" />,
                label: "We set it up for you",
                sub: "Our team configures everything — you just use it",
              },
              {
                icon: <MessageSquare className="h-5 w-5" />,
                label: "WhatsApp + website chatbot",
                sub: "Both channels included from day one",
              },
              {
                icon: <Calendar className="h-5 w-5" />,
                label: "Appointment booking",
                sub: "Synced with Google Calendar automatically",
              },
              {
                icon: <Star className="h-5 w-5" />,
                label: "14-day money-back",
                sub: "Full refund, no questions asked",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <span className="text-primary mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full feature comparison table */}
      <div className="mx-auto max-w-6xl px-4 py-16 pb-24">
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold">Full feature breakdown</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every feature explained in plain language — expand any section to read the details
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
          All prices are exclusive of GST (18%). Annual billing saves 15% vs
          monthly. Setup fees are waived on annual plans for Receptionist and
          Sales Associate tiers. Contact us for custom enterprise pricing.
        </p>
      </div>

      {/* Bottom guarantee strip */}
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
              Money-back guarantee — full refund if it's not right
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
