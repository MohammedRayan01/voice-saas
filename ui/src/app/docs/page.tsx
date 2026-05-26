"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Book,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Check,
  ExternalLink,
  Search,
  X,
  Zap,
  Layers,
  Phone,
  Wrench,
  Settings,
  Globe,
  Terminal,
} from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────

const NAV = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "prerequisites", label: "Prerequisites" },
    ],
  },
  {
    id: "core-concepts",
    label: "Core Concepts",
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    items: [
      { id: "how-lynq-works", label: "How Lynq Works" },
      { id: "workflows-and-agents", label: "Workflows & Agents" },
      { id: "calls-and-runs", label: "Calls & Runs" },
      { id: "context-and-variables", label: "Context & Variables" },
      { id: "campaigns", label: "Campaigns" },
    ],
  },
  {
    id: "voice-agent",
    label: "Voice Agent Builder",
    icon: BookOpen,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    items: [
      { id: "create-agent", label: "Creating a Voice Agent" },
      { id: "agent-node", label: "Agent Node" },
      { id: "start-call-node", label: "Start Call Node" },
      { id: "end-call-node", label: "End Call Node" },
      { id: "global-node", label: "Global Node" },
      { id: "webhook-node", label: "Webhook Node" },
      { id: "knowledge-base", label: "Knowledge Base" },
      { id: "template-variables", label: "Template Variables" },
      { id: "interruption", label: "Interruption Handling" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    items: [
      { id: "tools-overview", label: "Overview" },
      { id: "call-transfer", label: "Call Transfer" },
      { id: "calendar-booking", label: "Calendar Booking" },
      { id: "http-api-tool", label: "HTTP API Tool" },
    ],
  },
  {
    id: "configurations",
    label: "Configurations",
    icon: Settings,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    items: [
      { id: "model-configurations", label: "Model Configurations" },
      { id: "llm-config", label: "LLM" },
      { id: "voice-config", label: "Voice (TTS)" },
      { id: "api-keys", label: "API Keys" },
    ],
  },
  {
    id: "telephony",
    label: "Telephony",
    icon: Phone,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    items: [
      { id: "telephony-overview", label: "Overview" },
      { id: "twilio", label: "Twilio" },
      { id: "inbound-calling", label: "Inbound Calling" },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    icon: Terminal,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    items: [
      { id: "workflow-schema", label: "Workflow Schema" },
      { id: "webhooks", label: "Webhook Payloads" },
      { id: "sdks", label: "SDKs" },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function CodeBlock({ children, lang = "bash" }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-gray-800 bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-gray-300 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Callout({
  type = "note",
  children,
}: {
  type?: "note" | "tip" | "warning" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    note: "border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-300",
    tip: "border-green-500/30 bg-green-50/50 dark:bg-green-900/10 text-green-900 dark:text-green-300",
    warning: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-300",
    info: "border-purple-500/30 bg-purple-50/50 dark:bg-purple-900/10 text-purple-900 dark:text-purple-300",
  };
  const icons = { note: "ℹ️", tip: "💡", warning: "⚠️", info: "🔗" };
  return (
    <div className={cn("my-4 flex gap-3 rounded-lg border px-4 py-3 text-sm", styles[type])}>
      <span className="mt-0.5 shrink-0">{icons[type]}</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-mono bg-gray-100 dark:bg-gray-800 text-green-700 dark:text-green-400 border border-gray-200 dark:border-gray-700">
      {children}
    </code>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
      {children}
    </h1>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 dark:text-white mt-10 mb-3 flex items-center gap-2 before:content-[''] before:block before:w-1 before:h-4 before:rounded-full before:bg-green-500">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-2">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed my-2">
      {children}
    </p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="my-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400 list-none pl-0">
      {children}
    </ul>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="my-3 space-y-2 text-sm text-gray-600 dark:text-gray-400 list-none pl-0 counter-reset-step">
      {children}
    </ol>
  );
}

function OLI({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed">
      <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Divider() {
  return <hr className="my-8 border-gray-100 dark:border-gray-800" />;
}

// ─── Page content ──────────────────────────────────────────────────────────

const PAGES: Record<string, { title: string; subtitle: string; content: React.ReactNode }> = {
  introduction: {
    title: "Introduction",
    subtitle: "What is Lynq and how do you get started",
    content: (
      <>
        <P>
          <strong className="text-gray-900 dark:text-white">Lynq</strong> is an open-source voice AI platform
          for building and deploying conversational AI agents with telephony and WebRTC support. It gives you a
          drag-and-drop workflow builder, a real-time call pipeline, and a complete API — all self-hostable.
        </P>
        <div className="my-6 grid grid-cols-2 gap-3">
          {[
            { icon: "🔓", title: "100% Open Source", desc: "No vendor lock-in, full transparency" },
            { icon: "🏠", title: "Self-hostable", desc: "Deploy anywhere, own your infrastructure" },
            { icon: "⚡", title: "2-minute setup", desc: "From zero to working voice bot fast" },
            { icon: "🎛️", title: "Full control", desc: "Every line of code is yours to customize" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/30"
            >
              <div className="text-xl mb-2">{f.icon}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{f.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
        <H2>Quick Start</H2>
        <P>Run Lynq locally with Docker in a single command:</P>
        <CodeBlock lang="bash">{`curl -o docker-compose.yaml https://raw.githubusercontent.com/dograh-hq/dograh/main/docker-compose.yaml
ENABLE_TELEMETRY=true docker compose up --pull always`}</CodeBlock>
        <H2>What you can build</H2>
        <UL>
          <LI>Inbound support lines — replace IVR with a natural-language AI agent</LI>
          <LI>Outbound campaigns — call thousands of contacts automatically with personalised scripts</LI>
          <LI>Appointment booking — agent checks availability and books slots during a live call</LI>
          <LI>Lead qualification — collect intent, score leads, and sync to your CRM via webhook</LI>
        </UL>
      </>
    ),
  },

  prerequisites: {
    title: "Prerequisites",
    subtitle: "What you need before getting started",
    content: (
      <>
        <H2>For hosted use</H2>
        <UL>
          <LI>A modern web browser (Chrome, Firefox, Safari, Edge)</LI>
          <LI>Microphone access for web call testing</LI>
          <LI>API keys for your chosen AI providers (LLM, TTS, STT) — or use Lynq default models</LI>
          <LI>A telephony account (Twilio, Telnyx, Plivo, etc.) if you want real phone calls</LI>
        </UL>
        <H2>For self-hosted deployment</H2>
        <UL>
          <LI>Docker and Docker Compose installed</LI>
          <LI>4 GB RAM minimum (8 GB recommended for production)</LI>
          <LI>10 GB disk space</LI>
          <LI>A publicly accessible domain for inbound calling webhooks</LI>
        </UL>
        <Callout type="tip">
          You can test everything — including full calls — using the browser WebRTC call without any telephony
          setup. Telephony is only needed for real phone numbers.
        </Callout>
      </>
    ),
  },

  "how-lynq-works": {
    title: "How Lynq Works",
    subtitle: "The big picture — from API call to phone conversation to transcript",
    content: (
      <>
        <P>
          Lynq is a platform for building and running voice AI agents. You define a conversation flow, connect a
          phone number, and Lynq handles the rest — transcribing the caller's speech (STT), generating intelligent
          responses (LLM), speaking them back in a natural voice (TTS), and returning structured results when the
          call ends.
        </P>
        <H2>The core loop</H2>
        <div className="my-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
          <div className="flex flex-col gap-0">
            {[
              { step: "1", label: "Call triggered", desc: "Dashboard or API initiates outbound call" },
              { step: "2", label: "Caller answers", desc: "Real-time audio pipeline opens" },
              { step: "3", label: "Speech → Text", desc: "STT provider transcribes caller audio" },
              { step: "4", label: "Text → LLM", desc: "Active node prompt + transcript sent to LLM" },
              { step: "5", label: "Text → Speech", desc: "TTS provider synthesizes and streams response" },
              { step: "6", label: "Transition", desc: "LLM evaluates edge conditions, moves to next node" },
              { step: "7", label: "Call ends", desc: "End node reached, post-call processing begins" },
              { step: "8", label: "Run record saved", desc: "Transcript, recording, context, webhooks" },
            ].map((s, i, arr) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400 shrink-0">
                    {s.step}
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />}
                </div>
                <div className="pb-4">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400"> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <H2>Key components</H2>
        <Table
          headers={["Component", "Description"]}
          rows={[
            ["Workflows (Agents)", "Conversation logic — a graph of nodes (steps) connected by edges (transitions)"],
            ["Runs", "Every workflow execution. Contains transcript, recording, extracted data, and cost."],
            ["Telephony", "Phone infrastructure. Connects to Twilio, Vonage, etc. for real calls."],
            ["Transcriber (STT)", "Converts caller speech to text in real time."],
            ["LLM Provider", "Processes transcript + node prompt to generate the agent's response."],
            ["Voice Synthesizer (TTS)", "Converts LLM text to audio and streams it to the caller."],
          ]}
        />
      </>
    ),
  },

  "workflows-and-agents": {
    title: "Workflows & Agents",
    subtitle: "How conversation flows are defined in Lynq",
    content: (
      <>
        <Callout type="info">
          In Lynq, <strong>agent</strong> (dashboard) and <strong>workflow</strong> (API) are the same thing.
          A workflow is the underlying definition; agent is the product name for it.
        </Callout>
        <H2>The graph model</H2>
        <P>
          A workflow is a <strong>directed graph</strong> — a set of nodes connected by edges. Nodes are
          conversation steps, edges are the conditions that trigger transitions between them.
        </P>
        <div className="my-4 flex items-center gap-2 overflow-x-auto pb-2">
          {["Start Call", "Qualify Intent", "Support Agent", "End Call"].map((n, i, arr) => (
            <div key={n} className="flex items-center gap-2">
              <div className="shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                {n}
              </div>
              {i < arr.length - 1 && (
                <div className="flex items-center gap-1">
                  <div className="h-px w-6 bg-gray-300 dark:bg-gray-600" />
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
        <H2>Node types</H2>
        <Table
          headers={["Type", "Description"]}
          rows={[
            [<InlineCode key="sc">startCall</InlineCode>, "Entry point for telephony calls. First thing the agent says."],
            [<InlineCode key="an">agentNode</InlineCode>, "LLM-powered conversation step. The core building block."],
            [<InlineCode key="gn">globalNode</InlineCode>, "Instructions applying across all nodes (tone, language, fallback)."],
            [<InlineCode key="ec">endCall</InlineCode>, "Terminates the call."],
            [<InlineCode key="tr">trigger</InlineCode>, "Entry point for API-triggered runs (non-telephony)."],
            [<InlineCode key="wh">webhook</InlineCode>, "Fires an HTTP request when reached — CRM updates, notifications."],
            [<InlineCode key="qa">qa</InlineCode>, "Runs automated quality analysis on the completed call."],
          ]}
        />
        <H2>Edges and transitions</H2>
        <P>
          Each edge connects two nodes and fires when its condition is satisfied. The LLM evaluates the
          condition in natural language — no regex, no strict matching.
        </P>
        <div className="my-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4 text-sm space-y-2">
          <div className="flex gap-3"><span className="w-28 shrink-0 text-xs text-gray-500 font-medium uppercase tracking-wide pt-0.5">Label</span><code className="text-green-700 dark:text-green-400 font-mono text-xs">appointment_confirmed</code></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 text-xs text-gray-500 font-medium uppercase tracking-wide pt-0.5">Condition</span><span className="text-gray-700 dark:text-gray-300 text-xs">The caller has agreed to a specific date and time for their appointment</span></div>
          <div className="flex gap-3"><span className="w-28 shrink-0 text-xs text-gray-500 font-medium uppercase tracking-wide pt-0.5">Speech</span><span className="text-gray-700 dark:text-gray-300 text-xs">Let me get that booked for you right away.</span></div>
        </div>
        <Callout type="tip">
          Name your edges clearly — the LLM uses the label as a function name.{" "}
          <InlineCode>appointment_confirmed</InlineCode> is better than <InlineCode>next</InlineCode>.
        </Callout>
      </>
    ),
  },

  "calls-and-runs": {
    title: "Calls & Runs",
    subtitle: "The lifecycle of a call and how runs capture its results",
    content: (
      <>
        <P>
          Every time a workflow executes, Lynq creates a <strong>run</strong> — the record of that execution:
          what was said, what data was collected, how long it took, and what it cost.
        </P>
        <H2>Calls vs runs</H2>
        <div className="my-4 grid grid-cols-2 gap-3">
          {[
            { title: "Call", color: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300", desc: "The audio connection — over the phone via telephony, or through the browser via WebRTC." },
            { title: "Run", color: "border-green-200 dark:border-green-800", badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300", desc: "The Lynq record of the workflow execution. Contains transcript, recording, context, usage, and cost." },
          ].map((item) => (
            <div key={item.title} className={cn("rounded-xl border p-4", item.color)}>
              <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2", item.badge)}>{item.title}</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <H2>Call types</H2>
        <UL>
          <LI><strong className="text-gray-900 dark:text-white">Outbound</strong> — Lynq dials the contact. Used for campaigns, reminders, lead qualification.</LI>
          <LI><strong className="text-gray-900 dark:text-white">Inbound</strong> — Caller dials your number, routed to a Lynq agent via webhook. Used for support lines and hotlines.</LI>
          <LI><strong className="text-gray-900 dark:text-white">Web Call</strong> — Browser call via WebRTC. No phone number needed. Identical AI pipeline, great for testing.</LI>
        </UL>
        <H2>What a run contains</H2>
        <Table
          headers={["Field", "Description"]}
          rows={[
            [<InlineCode key="s">status</InlineCode>, "Final run state"],
            [<InlineCode key="r">recording_url</InlineCode>, "Download URL for the call audio"],
            [<InlineCode key="t">transcript_url</InlineCode>, "Download URL for the conversation transcript"],
            [<InlineCode key="gc">gathered_context</InlineCode>, "Structured data extracted by the agent during the call"],
            [<InlineCode key="ic">initial_context</InlineCode>, "Data passed in when the call was triggered"],
            [<InlineCode key="u">usage_info</InlineCode>, "Duration in seconds, token count"],
            [<InlineCode key="c">cost_info</InlineCode>, "Cost breakdown by service"],
          ]}
        />
      </>
    ),
  },

  "context-and-variables": {
    title: "Context & Variables",
    subtitle: "How data flows into, through, and out of a conversation",
    content: (
      <>
        <P>
          Lynq has a simple data model for passing information through a call. Understanding it is key to
          building agents that feel personalised and to extracting useful results after a call.
        </P>
        <H2>The three context objects</H2>
        <div className="my-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {[
            { name: "initial_context", color: "bg-blue-500", desc: "Data available before the call starts — contact name, account details, appointment info." },
            { name: "template variables", color: "bg-purple-500", desc: "Values from initial_context injected into prompts via {{variable_name}} syntax." },
            { name: "gathered_context", color: "bg-green-500", desc: "Structured data collected during the call, returned in the run record." },
          ].map((c, i, arr) => (
            <div key={c.name} className={cn("flex items-start gap-3 p-4", i < arr.length - 1 && "border-b border-gray-100 dark:border-gray-800")}>
              <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", c.color)} />
              <div>
                <InlineCode>{c.name}</InlineCode>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <H2>Template variables</H2>
        <P>Use <InlineCode>{"{{variable_name}}"}</InlineCode> in prompts to inject values from <InlineCode>initial_context</InlineCode>:</P>
        <CodeBlock lang="text">{`You are calling {{customer_name}} about their {{plan}} plan,
which renews on {{renewal_date}}. Be friendly and confirm
whether they'd like to continue.`}</CodeBlock>
        <P>Add a fallback with <InlineCode>|</InlineCode> for missing values:</P>
        <CodeBlock lang="text">{`Hello {{customer_name | there}}, calling about your {{plan | current}} plan.`}</CodeBlock>
        <H2>Built-in variables</H2>
        <Table
          headers={["Variable", "Description", "Example"]}
          rows={[
            [<InlineCode key="ct">{"{{current_time}}"}</InlineCode>, "Current time in UTC", "2026-04-02 14:30 UTC"],
            [<InlineCode key="cw">{"{{current_weekday}}"}</InlineCode>, "Current weekday", "Thursday"],
            [<InlineCode key="cn">{"{{caller_number}}"}</InlineCode>, "Phone that initiated the call", "+14155550100"],
            [<InlineCode key="cdn">{"{{called_number}}"}</InlineCode>, "Phone that received the call", "+18005550199"],
          ]}
        />
        <Callout type="tip">
          Use timezone suffixes for local time: <InlineCode>{"{{current_time_Asia/Kolkata}}"}</InlineCode>
        </Callout>
      </>
    ),
  },

  campaigns: {
    title: "Campaigns",
    subtitle: "Running a voice agent against a list of contacts at scale",
    content: (
      <>
        <P>
          A campaign runs a workflow against many contacts automatically. Upload a contact list, set scheduling
          and retry rules, and Lynq dials them — respecting concurrency limits and time windows.
        </P>
        <H2>How a campaign works</H2>
        <OL>
          <OLI n={1}><strong>Upload a contacts CSV</strong> — must have a <InlineCode>phone_number</InlineCode> column; extra columns become <InlineCode>initial_context</InlineCode></OLI>
          <OLI n={2}><strong>Create the campaign</strong> — link to a workflow, set concurrency, time slots, and retry behaviour</OLI>
          <OLI n={3}><strong>Start it</strong> — Lynq begins dialing up to your concurrency limit</OLI>
          <OLI n={4}><strong>Monitor progress</strong> — real-time counts of processed, completed, failed, pending</OLI>
          <OLI n={5}><strong>Pause and resume</strong> — stop and restart without losing progress</OLI>
        </OL>
        <H2>Contacts CSV format</H2>
        <CodeBlock lang="csv">{`phone_number,customer_name,account_id,plan
+14155550100,Jane Smith,acc_001,premium
+14155550101,Bob Jones,acc_002,basic`}</CodeBlock>
        <H2>Scheduling &amp; concurrency</H2>
        <CodeBlock lang="json">{`{
  "timezone": "America/New_York",
  "time_slots": [
    { "day": "monday", "start": "09:00", "end": "17:00" },
    { "day": "tuesday", "start": "09:00", "end": "17:00" }
  ],
  "retry_config": {
    "max_attempts": 3,
    "retry_interval_minutes": 60
  }
}`}</CodeBlock>
        <H2>Circuit breaker</H2>
        <P>Automatically pauses when the failure rate gets too high — protecting against wasted spend.</P>
        <Table
          headers={["Setting", "Default", "Description"]}
          rows={[
            ["Failure Threshold", "50%", "Pause when failure rate exceeds this percentage"],
            ["Window", "120s", "Rolling time window for failure rate calculation"],
            ["Min Calls", "5", "Minimum calls before circuit breaker can trip"],
          ]}
        />
        <H2>Campaign lifecycle</H2>
        <div className="my-4 flex flex-wrap gap-2">
          {[
            { s: "draft", c: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
            { s: "running", c: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
            { s: "paused", c: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
            { s: "completed", c: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
            { s: "failed", c: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
          ].map(({ s, c }) => (
            <span key={s} className={cn("px-2.5 py-1 rounded-full text-xs font-medium", c)}>{s}</span>
          ))}
        </div>
      </>
    ),
  },

  "create-agent": {
    title: "Creating a Voice Agent",
    subtitle: "From first click to a live conversation",
    content: (
      <>
        <P>
          A <strong>Voice Agent</strong> is an AI-powered phone bot that can hold real, natural conversations —
          answering questions, collecting information, booking appointments — 24/7 without human intervention.
        </P>
        <H2>Step 1 — Open the Create Agent form</H2>
        <P>Navigate to <strong>Voice Agents</strong> in the sidebar → click <strong>Create Agent</strong>.</P>
        <Table
          headers={["Field", "What it does"]}
          rows={[
            ["Call Type", "Inbound (agent answers calls) or Outbound (agent places calls)"],
            ["Use Case", "Short label: e.g. Customer Support, Appointment Booking"],
            ["Description", "Natural language — the AI generates your initial workflow from this"],
          ]}
        />
        <Callout type="tip">
          The more specific your description, the better the generated workflow. Include tone, key tasks, and
          must-cover topics.
        </Callout>
        <H2>Step 2 — Generate the workflow</H2>
        <P>
          Click <strong>Create Agent</strong>. Lynq sends your description to the AI, which generates an initial
          conversation graph in seconds. You land on the Workflow Builder — a visual canvas showing your agent
          as a connected graph of nodes.
        </P>
        <H2>Step 3 — Test with a browser call</H2>
        <P>No phone number needed. Lynq includes a WebRTC browser call:</P>
        <OL>
          <OLI n={1}>Click <strong>Start Web Call</strong> on the workflow page</OLI>
          <OLI n={2}>Allow microphone access when prompted</OLI>
          <OLI n={3}>The agent greets you within 1–2 seconds</OLI>
          <OLI n={4}>Have a natural conversation</OLI>
          <OLI n={5}>Click <strong>End Call</strong> when done</OLI>
        </OL>
        <Callout type="note">
          The browser call uses your real agent pipeline — same AI, same logic, same voice. What you test is
          exactly what callers will experience.
        </Callout>
        <H2>Step 4 — Review recordings &amp; transcripts</H2>
        <P>
          After every call, Lynq saves a full audio recording and complete transcript. Go to{" "}
          <strong>Recordings</strong> in the sidebar to see all past calls.
        </P>
      </>
    ),
  },

  "agent-node": {
    title: "Agent Node",
    subtitle: "The core building block of every workflow",
    content: (
      <>
        <P>
          An <strong>Agent Node</strong> is a single stage of a conversation — its own prompt, its own tools, and
          its own edges. The agent can only do what its current node's prompt and tools allow.
        </P>
        <H2>Prompt</H2>
        <CodeBlock lang="text">{`You are speaking with a caller who wants to book an appointment.

1. Ask for their preferred date and time.
2. Ask for their name if you don't have it yet.
3. Once you have both, call book_appointment.
4. Confirm the booking and say goodbye.`}</CodeBlock>
        <UL>
          <LI>Be specific about what the agent should ask and in what order</LI>
          <LI>Tell the agent explicitly when to call a tool</LI>
          <LI>Tell the agent explicitly when to transition to the next node</LI>
          <LI>One job per node — keep it focused</LI>
        </UL>
        <H2>Tools</H2>
        <P>Attach tools the agent can invoke while in this node:</P>
        <div className="my-3 grid grid-cols-2 gap-2">
          {[
            { name: "End Call", type: "built-in", desc: "Hangs up the call" },
            { name: "Call Transfer", type: "built-in", desc: "Transfers to a phone number or SIP endpoint" },
            { name: "Calendar Booking", type: "built-in", desc: "Books, checks, and cancels appointments" },
            { name: "HTTP API", type: "custom", desc: "Calls any REST endpoint" },
          ].map((t) => (
            <div key={t.name} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{t.name}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", t.type === "built-in" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400")}>{t.type}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
            </div>
          ))}
        </div>
        <H2>Variable extraction</H2>
        <Table
          headers={["Field", "Description"]}
          rows={[
            ["Name", "Variable key, e.g. caller_name"],
            ["Type", "string, number, or boolean"],
            ["Description", "What the LLM should look for in the conversation"],
          ]}
        />
        <H2>Edges (transitions)</H2>
        <Table
          headers={["Field", "Description"]}
          rows={[
            ["Label", "The function name the LLM calls, e.g. proceed_to_booking"],
            ["Condition", "Natural language: when to transition"],
            ["Transition Speech", "Optional phrase the agent says before switching nodes"],
          ]}
        />
      </>
    ),
  },

  "start-call-node": {
    title: "Start Call Node",
    subtitle: "Entry point of every telephony call",
    content: (
      <>
        <Callout type="warning">You should have only one Start Call node per Voice Agent.</Callout>
        <P>The Start Call Node fires the moment a call connects. It contains the greeting, system prompt, and interruption settings.</P>
        <H2>Greeting message</H2>
        <P>The first thing your agent says. Keep it short and natural:</P>
        <div className="my-3 space-y-2">
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">✓ Good</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">&quot;Hello! Thanks for calling Acme Support. How can I help you today?&quot;</p>
          </div>
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-3">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">✗ Avoid</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">&quot;Welcome to the automated Acme Corporation customer service hotline. Please wait...&quot;</p>
          </div>
        </div>
        <H2>System prompt — what to include</H2>
        <CodeBlock lang="text">{`You are Alex, a friendly support agent for Acme Corp.
Your goal is to help callers troubleshoot common product issues.
Speak in a warm, professional tone. Keep responses concise.
If the caller asks about refunds or billing, tell them you'll
transfer them to the billing team and end the call politely.`}</CodeBlock>
        <UL>
          <LI><strong>Identity</strong> — who the agent is and who it represents</LI>
          <LI><strong>Goal</strong> — what it should accomplish on this call</LI>
          <LI><strong>Tone</strong> — formal, friendly, concise, empathetic</LI>
          <LI><strong>Boundaries</strong> — what it must NOT do</LI>
        </UL>
      </>
    ),
  },

  "end-call-node": {
    title: "End Call Node",
    subtitle: "Terminates the call when the conversation is complete",
    content: (
      <>
        <P>When the workflow reaches the End Call Node, the call hangs up. Configure a closing statement and any final variable extraction.</P>
        <H2>Example end call prompt</H2>
        <CodeBlock lang="text">{`The call has been completed.
Thank the caller warmly for their time.
Summarize what was accomplished (e.g. "Your appointment is booked for [date]").
Say a warm goodbye.
Then immediately call end_call to hang up.`}</CodeBlock>
        <Callout type="tip">
          Use the <strong>End Call tool</strong> in agent nodes (not the End Call node) when you need to
          terminate mid-conversation conditionally — e.g. after the caller says goodbye.
        </Callout>
      </>
    ),
  },

  "global-node": {
    title: "Global Node",
    subtitle: "Persistent instructions that follow the agent through every step",
    content: (
      <>
        <P>
          The Global Node defines instructions that apply across all agent nodes. Think of it as the agent's
          persistent personality, language, and ground rules.
        </P>
        <H2>What to include</H2>
        <UL>
          <LI><strong>Company identity</strong> — who the company is, what it does</LI>
          <LI><strong>Tone and language</strong> — formal vs casual, which language to use</LI>
          <LI><strong>Fallback behaviour</strong> — what to do if the caller goes off-topic</LI>
          <LI><strong>Guardrails</strong> — things the agent must never say or do</LI>
          <LI><strong>Contact details</strong> — website, support email, hours</LI>
        </UL>
        <H2>Example global prompt</H2>
        <CodeBlock lang="text">{`You represent Acme Corp — a B2B software company specializing in
project management tools.

Tone: Professional, helpful, and concise. Never use slang.
Language: Always respond in the same language the caller uses.

Guardrails:
- Never discuss competitor products
- Never make pricing commitments not in your knowledge base
- If asked something you don't know, say "I'll have someone follow up"

Hours: Monday–Friday, 9am–6pm EST.`}</CodeBlock>
        <H2>How to enable</H2>
        <P>
          In each Agent Node, toggle <strong>Add Global Prompt</strong> to inject the Global Node's prompt
          into that node. Enable this on almost every node.
        </P>
      </>
    ),
  },

  "webhook-node": {
    title: "Webhook Node",
    subtitle: "Fire HTTP requests when your workflow reaches a node",
    content: (
      <>
        <P>The Webhook Node fires an HTTP request when the workflow reaches it. Use it for CRM updates, notifications, or triggering downstream automations.</P>
        <H2>Configuration</H2>
        <Table
          headers={["Field", "Description"]}
          rows={[
            [<InlineCode key="e">enabled</InlineCode>, "Whether this webhook fires when reached"],
            [<InlineCode key="m">http_method</InlineCode>, "GET, POST, PUT, PATCH, or DELETE"],
            [<InlineCode key="u">endpoint_url</InlineCode>, "Target URL"],
            [<InlineCode key="h">custom_headers</InlineCode>, "Additional request headers"],
            [<InlineCode key="p">payload_template</InlineCode>, "Request body template (supports context variables)"],
          ]}
        />
        <H2>Available context variables</H2>
        <Table
          headers={["Variable", "Description"]}
          rows={[
            [<InlineCode key="id">{"{{workflow_run_id}}"}</InlineCode>, "ID of the completed run"],
            [<InlineCode key="ic">{"{{initial_context.field}}"}</InlineCode>, "Data passed when the call was initiated"],
            [<InlineCode key="gc">{"{{gathered_context.field}}"}</InlineCode>, "Data extracted during the call"],
            [<InlineCode key="ru">{"{{recording_url}}"}</InlineCode>, "Download URL for the call recording"],
            [<InlineCode key="tu">{"{{transcript_url}}"}</InlineCode>, "Download URL for the call transcript"],
          ]}
        />
        <H2>Example payload</H2>
        <CodeBlock lang="json">{`{
  "run_id": "{{workflow_run_id}}",
  "customer": "{{initial_context.customer_name}}",
  "outcome": "{{gathered_context.resolution}}",
  "recording": "{{recording_url}}"
}`}</CodeBlock>
      </>
    ),
  },

  "knowledge-base": {
    title: "Knowledge Base",
    subtitle: "Upload documents your voice agent references during live conversations",
    content: (
      <>
        <P>Instead of encoding all information into prompts, upload source documents and let the agent retrieve relevant content on the fly.</P>
        <Callout type="warning">
          An embedding API key is required for <strong>Chunked Search</strong> mode. Full Document mode does
          not require embeddings.
        </Callout>
        <H2>Retrieval modes</H2>
        <div className="my-4 grid grid-cols-2 gap-3">
          {[
            {
              title: "Full Document",
              badge: "No embeddings needed",
              badgeColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
              desc: "The entire document is provided to the agent. Best for menus, price lists, FAQs, and short reference sheets.",
            },
            {
              title: "Chunked Search",
              badge: "Requires embeddings",
              badgeColor: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
              desc: "Document split into chunks, indexed with vector embeddings. Only relevant chunks returned. Best for large policies, manuals, or contracts.",
            },
          ].map((m) => (
            <div key={m.title} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{m.title}</div>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", m.badgeColor)}>{m.badge}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
        <H2>Supported file types</H2>
        <div className="my-3 flex flex-wrap gap-2">
          {[".pdf", ".docx", ".doc", ".txt", ".json"].map((ext) => (
            <span key={ext} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{ext}</span>
          ))}
          <span className="text-xs text-gray-400 self-center">Max 5 MB per file</span>
        </div>
        <H2>Best practices</H2>
        <UL>
          <LI>Use Full Document for small reference files (menus, FAQs)</LI>
          <LI>Use Chunked Search for large documents (policies, manuals)</LI>
          <LI>Keep documents focused — one topic per document produces better results</LI>
          <LI>Attach selectively — only attach documents relevant to a specific node</LI>
          <LI>Re-upload when source information changes</LI>
        </UL>
      </>
    ),
  },

  "template-variables": {
    title: "Template Variables",
    subtitle: "Use dynamic values in prompts and webhook payloads",
    content: (
      <>
        <P>Template variables reference values from <InlineCode>initial_context</InlineCode> (passed via API or campaign CSV) or <InlineCode>gathered_context</InlineCode> (extracted during the call).</P>
        <H2>Syntax</H2>
        <CodeBlock lang="text">{`You are Alice, calling {{initial_context.user.name}} about {{plan}}.`}</CodeBlock>
        <P>Nested values are supported via dot notation.</P>
        <H2>Fallback values</H2>
        <CodeBlock lang="text">{`Hello {{customer_name | valued customer}}`}</CodeBlock>
        <P>When <InlineCode>customer_name</InlineCode> is not set, the agent says &quot;valued customer&quot; instead.</P>
        <H2>Testing with context variables</H2>
        <P>Set context variables in <strong>workflow Settings → Context Variables</strong> to simulate data in test calls. These values are ignored on production inbound and campaign calls.</P>
        <Callout type="note">
          Setting <InlineCode>caller_number</InlineCode> and <InlineCode>called_number</InlineCode> as context variables
          lets you test Pre-Call Data Fetch without a real inbound call.
        </Callout>
      </>
    ),
  },

  interruption: {
    title: "Interruption Handling",
    subtitle: "Control whether callers can interrupt the agent while it's speaking",
    content: (
      <>
        <P>Configured <strong>per node</strong> — giving you fine-grained control over conversation flow.</P>
        <H2>Settings</H2>
        <div className="my-4 space-y-3">
          {[
            { label: "Enabled", color: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10", badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400", desc: "Bot stops speaking as soon as the user starts talking. Creates a natural, conversational experience." },
            { label: "Disabled (default)", color: "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30", badge: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", desc: "Bot finishes its entire response before accepting user input. User's microphone is muted while bot speaks." },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-lg border p-4", s.color)}>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", s.badge)}>{s.label}</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
        <H2>When to disable</H2>
        <UL>
          <LI>Legal disclaimers — ensure the full disclaimer is spoken</LI>
          <LI>Critical instructions that lose meaning if heard partially</LI>
          <LI>Greeting or introduction — let the bot finish its opening</LI>
          <LI>Confirmation summaries — appointment times, order totals</LI>
        </UL>
      </>
    ),
  },

  "tools-overview": {
    title: "Tools",
    subtitle: "Extend your voice agent with actions during live conversations",
    content: (
      <>
        <P>Tools let your AI agent take actions during a conversation. The LLM decides when to invoke them and what parameters to pass based on the caller's intent and your node instructions.</P>
        <H2>Built-in tools</H2>
        <div className="my-3 space-y-2">
          {[
            { name: "Call Transfer", desc: "Transfer the active call to a phone number or SIP endpoint", badge: "Twilio · Telnyx · Asterisk ARI" },
            { name: "End Call", desc: "Terminate the call when the conversation is complete", badge: "All providers" },
            { name: "Calendar Booking", desc: "Check availability, book, and cancel appointments", badge: "Built-in + Google Calendar" },
          ].map((t) => (
            <div key={t.name} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</div>
                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">{t.badge}</span>
              </div>
            </div>
          ))}
        </div>
        <H2>Custom tools</H2>
        <div className="my-3 space-y-2">
          {[
            { name: "HTTP API", desc: "Call any REST endpoint — CRM updates, data lookups, n8n automations" },
            { name: "MCP Tool", desc: "Connect an external MCP server and expose its tools to the LLM" },
          ].map((t) => (
            <div key={t.name} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <H2>Best practices</H2>
        <UL>
          <LI>Attach only relevant tools to each node — fewer tools = more reliable invocations</LI>
          <LI>Write clear tool descriptions — the LLM uses these to decide when to call a tool</LI>
          <LI>Guide the LLM in your node prompt — explicitly say when a tool should be used</LI>
          <LI>Test tool behavior with web and phone calls before going live</LI>
        </UL>
      </>
    ),
  },

  "call-transfer": {
    title: "Call Transfer",
    subtitle: "Transfer active calls to phone numbers or SIP endpoints",
    content: (
      <>
        <Callout type="info">Available for Twilio, Telnyx, and Asterisk ARI. Web calls do not support transfer.</Callout>
        <H2>How it works</H2>
        <OL>
          <OLI n={1}>Agent determines a transfer is needed and calls the transfer function</OLI>
          <OLI n={2}>(Optional) Agent plays a pre-transfer message</OLI>
          <OLI n={3}>Caller hears hold music while transfer is processed</OLI>
          <OLI n={4}>Once destination answers, caller is connected directly</OLI>
          <OLI n={5}>AI agent ends its involvement</OLI>
        </OL>
        <H2>Destination formats</H2>
        <Table
          headers={["Provider", "Format", "Example"]}
          rows={[
            ["Twilio", "E.164 phone number", "+1234567890"],
            ["Telnyx", "E.164 phone number", "+1234567890"],
            ["Asterisk ARI", "SIP endpoint only", "PJSIP/sales-queue"],
          ]}
        />
        <H2>Configuration</H2>
        <UL>
          <LI><strong>Destination</strong> — phone number or SIP endpoint</LI>
          <LI><strong>Timeout</strong> — how long to wait for destination to answer (default 30s)</LI>
          <LI><strong>Pre-transfer Message</strong> — optional message played before transfer</LI>
        </UL>
      </>
    ),
  },

  "calendar-booking": {
    title: "Calendar Booking",
    subtitle: "Let your voice agent check availability, book, and cancel appointments",
    content: (
      <>
        <P>The Calendar Booking tool gives your agent three callable functions during a live call. All appointments are stored in your Lynq Calendar dashboard immediately after booking.</P>
        <H2>Functions</H2>
        <div className="my-4 space-y-3">
          {[
            { fn: "check_availability", desc: "Returns available time slots on a given date", params: [{ name: "date", type: "string", req: true, desc: "YYYY-MM-DD" }, { name: "duration_minutes", type: "integer", req: false, desc: "Default: 30" }] },
            { fn: "book_appointment", desc: "Creates an appointment. Returns appointment_id.", params: [{ name: "start_time", type: "string", req: true, desc: "ISO 8601" }, { name: "end_time", type: "string", req: true, desc: "ISO 8601" }, { name: "summary", type: "string", req: true, desc: 'e.g. "Appointment - John"' }, { name: "description", type: "string", req: false, desc: "Additional notes" }] },
            { fn: "cancel_appointment", desc: "Cancels an appointment by UUID", params: [{ name: "appointment_id", type: "string", req: true, desc: "UUID from book_appointment" }] },
          ].map((f) => (
            <div key={f.fn} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <InlineCode>{f.fn}</InlineCode>
                <span className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {f.params.map((p) => (
                  <div key={p.name} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <InlineCode>{p.name}</InlineCode>
                    <span className="text-gray-400 font-mono">{p.type}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", p.req ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500")}>
                      {p.req ? "required" : "optional"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <H2>Example node prompt</H2>
        <CodeBlock lang="text">{`You are booking an appointment for the caller. Be warm and efficient.

1. Ask for their preferred date and time if you don't have it.
2. Ask for their name if you don't have it.
3. Once you have both, call book_appointment with:
   - start_time in ISO format (e.g. 2026-05-27T10:00:00Z)
   - end_time: 30 minutes after start_time
   - summary: "Appointment - {caller name}"
4. Confirm: "I have booked your appointment for [date] at [time]."
5. Ask if there's anything else. If not, say goodbye and call end_call.

If the caller wants to cancel, call cancel_appointment with the
appointment_id from the booking response.`}</CodeBlock>
        <H2>Google Calendar sync (optional)</H2>
        <OL>
          <OLI n={1}>Go to <strong>Settings → Integrations</strong></OLI>
          <OLI n={2}>Under Google Calendar, enter your Google Cloud OAuth credentials</OLI>
          <OLI n={3}>Click <strong>Connect Google Calendar</strong> and authorise access</OLI>
        </OL>
      </>
    ),
  },

  "http-api-tool": {
    title: "HTTP API Tool",
    subtitle: "Call any REST API endpoint during live conversations",
    content: (
      <>
        <P>HTTP API tools attach external REST API calls to workflow nodes. Your voice agents can call any internal or external system during live conversations — the LLM decides when and what to send.</P>
        <H2>Common use cases</H2>
        <UL>
          <LI>Call your own backend endpoints</LI>
          <LI>Trigger n8n automations or Zapier webhooks</LI>
          <LI>Sync data with a CRM (Salesforce, HubSpot)</LI>
          <LI>Fetch real-time data (pricing, availability, weather)</LI>
        </UL>
        <H2>Defining a tool</H2>
        <H3>Tool name</H3>
        <P>Clear and action-oriented. The LLM reads this when deciding which tool to use.</P>
        <div className="my-3 flex gap-3">
          <div className="flex-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-3">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">✗ Bad</span>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mt-1">api_call</p>
          </div>
          <div className="flex-1 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3">
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Good</span>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mt-1">capture_lead_interest</p>
          </div>
        </div>
        <H3>Tool description</H3>
        <P>Explains <em>when</em> to call the tool. Write it in plain, explicit English.</P>
        <div className="my-3 flex gap-3">
          <div className="flex-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-3">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">✗ Bad</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">&quot;API to capture data&quot;</p>
          </div>
          <div className="flex-1 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3">
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Good</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">&quot;Use when user clearly expresses interest in the product or wants to be contacted.&quot;</p>
          </div>
        </div>
        <H3>Parameters</H3>
        <P>Each parameter needs: Name, Type, Description, Required flag. Parameter descriptions matter more than types — be explicit.</P>
        <Callout type="warning">Always include <strong>https://</strong> in the URL — the most common setup mistake.</Callout>
      </>
    ),
  },

  "model-configurations": {
    title: "Model Configurations",
    subtitle: "Configure AI models for your voice agents",
    content: (
      <>
        <P>Lynq uses a two-level configuration system. Global settings apply to all agents by default; per-agent overrides let you customise individual agents.</P>
        <H2>Services</H2>
        <Table
          headers={["Service", "What it does", "Examples"]}
          rows={[
            ["LLM", "Generates agent responses", "OpenAI GPT-4.1, Claude, Gemini"],
            ["TTS (Voice)", "Converts text to speech", "ElevenLabs, Deepgram, OpenAI"],
            ["STT (Transcriber)", "Transcribes caller speech", "Deepgram, AssemblyAI"],
            ["Realtime", "Speech-to-speech in a single model", "Gemini Live"],
          ]}
        />
        <H2>Agent-level overrides</H2>
        <P>Go to the agent&apos;s <strong>Settings → Model Overrides</strong> tab. Toggle the service you want to override — you can override just one service while inheriting the rest from global config.</P>
        <H2>Gemini Live (Realtime)</H2>
        <P>Gemini Live handles STT, LLM, and TTS in a single real-time connection — eliminating the 600–1500ms latency of chaining three separate services.</P>
        <Callout type="note">
          When using a Realtime provider, you still need to configure an <strong>LLM</strong> — it's used for
          variable extraction and QA analysis, which the realtime model does not perform.
        </Callout>
        <P>Available voices: <strong>Puck</strong>, Charon, Kore, Fenrir, Aoede</P>
      </>
    ),
  },

  "llm-config": {
    title: "LLM Configuration",
    subtitle: "Choose and configure the language model powering your agents",
    content: (
      <>
        <H2>Supported providers</H2>
        <div className="my-4 grid grid-cols-2 gap-2">
          {["OpenAI", "Google (Gemini)", "Anthropic (Claude)", "Groq", "Azure OpenAI"].map((p) => (
            <div key={p} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {p}
            </div>
          ))}
        </div>
        <H2>Configuration</H2>
        <P>Go to <strong>Model Configurations</strong> in the dashboard. Select your LLM provider, enter your API key, and choose your model. If your model isn&apos;t in the dropdown, you can add it manually.</P>
        <H2>Per-agent override</H2>
        <P>Go to the agent&apos;s <strong>Settings → Model Overrides → LLM tab</strong>. Toggle the LLM override on and configure the desired provider/model independently for this agent.</P>
      </>
    ),
  },

  "voice-config": {
    title: "Voice (TTS) Configuration",
    subtitle: "Choose the voice your agents use when speaking",
    content: (
      <>
        <H2>Supported TTS providers</H2>
        <Table
          headers={["Provider", "Notes"]}
          rows={[
            ["ElevenLabs", "High-quality, natural-sounding voices"],
            ["Deepgram Aura", "Fast, low-latency voices"],
            ["OpenAI TTS", "alloy, echo, fable, onyx, nova, shimmer"],
            ["Cartesia", "Ultra-low-latency TTS"],
          ]}
        />
        <H2>Configuration</H2>
        <P>Go to <strong>Model Configurations → Voice (TTS)</strong>. Select a provider, enter your API key, and choose a voice from the dropdown. If your preferred voice isn&apos;t listed, add the voice ID manually — refer to each provider&apos;s API docs for valid voice IDs.</P>
        <Callout type="tip">
          When using <strong>Gemini Live</strong> (Realtime mode), you don&apos;t configure TTS separately —
          Gemini handles voice output natively as part of the speech-to-speech connection.
        </Callout>
      </>
    ),
  },

  "api-keys": {
    title: "API Keys",
    subtitle: "Authenticate programmatic access to the Lynq API",
    content: (
      <>
        <P>Lynq uses API Keys to authenticate requests. Generate one from <strong>/api-keys</strong> in the dashboard.</P>
        <H2>Usage</H2>
        <CodeBlock lang="bash">{`curl -H "X-API-Key: YOUR_API_KEY" \\
  https://api.lynq.naazailabs.com/api/v1/agents`}</CodeBlock>
        <H2>Key permissions</H2>
        <Table
          headers={["Level", "Access"]}
          rows={[
            ["Read", "Read agents, runs, and campaigns — cannot create or modify"],
            ["Write", "Create and modify agents, runs, and campaigns"],
            ["Admin", "Full access including billing and user management"],
          ]}
        />
        <H2>Key rotation</H2>
        <P>Rotate API keys regularly. Old keys can be archived (deactivated) without deleting so you can track when they were last used.</P>
      </>
    ),
  },

  "telephony-overview": {
    title: "Telephony Integration",
    subtitle: "Connect voice agents with real phone infrastructure",
    content: (
      <>
        <P>Lynq&apos;s telephony integration provides a unified interface for all supported providers. The same configuration powers both outbound and inbound calls.</P>
        <H2>Supported providers</H2>
        <div className="my-4 grid grid-cols-2 gap-2">
          {[
            { name: "Twilio", desc: "Industry-leading, global reach" },
            { name: "Vonage", desc: "16kHz audio, international coverage" },
            { name: "Plivo", desc: "Programmable voice, global PSTN" },
            { name: "Telnyx", desc: "Enterprise-grade communications" },
            { name: "Cloudonix", desc: "SIP-based, flexible trunks" },
            { name: "Asterisk ARI", desc: "Your own Asterisk PBX" },
          ].map((p) => (
            <div key={p.name} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.desc}</div>
            </div>
          ))}
        </div>
        <H2>Setup</H2>
        <OL>
          <OLI n={1}>Navigate to <strong>/telephony-configurations</strong> → <strong>Add configuration</strong></OLI>
          <OLI n={2}>Select your provider and enter credentials</OLI>
          <OLI n={3}>Add at least one phone number</OLI>
          <OLI n={4}>(Optional) Assign an Inbound workflow to a phone number for inbound calling</OLI>
        </OL>
        <H2>Troubleshooting</H2>
        <UL>
          <LI><strong>Calls not connecting</strong> — verify credentials, check E.164 phone number format (+1234567890), ensure webhooks are publicly accessible</LI>
          <LI><strong>Audio quality issues</strong> — check network bandwidth, latency, WebSocket stability</LI>
          <LI><strong>Webhook validation failing</strong> — confirm auth tokens match between provider and Lynq config</LI>
        </UL>
      </>
    ),
  },

  twilio: {
    title: "Twilio",
    subtitle: "Configure Twilio for voice communication in Lynq",
    content: (
      <>
        <H2>Prerequisites</H2>
        <UL>
          <LI>A Twilio account</LI>
          <LI>Account SID and Auth Token from your Twilio Console</LI>
          <LI>At least one Twilio phone number</LI>
        </UL>
        <H2>Setup</H2>
        <OL>
          <OLI n={1}>Log in to Twilio Console → copy your <strong>Account SID</strong> and <strong>Auth Token</strong></OLI>
          <OLI n={2}>In Lynq, go to <strong>/telephony-configurations</strong> → <strong>Add configuration</strong> → select <strong>Twilio</strong></OLI>
          <OLI n={3}>Enter Account SID and Auth Token → save</OLI>
          <OLI n={4}>Open the configuration → add your phone numbers in E.164 format</OLI>
        </OL>
        <H2>Inbound calling</H2>
        <P>Lynq automatically configures the Twilio webhook when you assign an inbound workflow to a phone number. If auto-configuration fails, manually set:</P>
        <div className="my-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
          <div className="text-xs text-gray-500 mb-1">Twilio Console → Phone Numbers → [your number] → Voice Configuration → Webhook</div>
          <code className="text-sm font-mono text-green-700 dark:text-green-400 break-all">
            https://api.lynq.naazailabs.com/api/v1/telephony/inbound/run
          </code>
          <div className="text-xs text-gray-500 mt-1">HTTP Method: POST</div>
        </div>
      </>
    ),
  },

  "inbound-calling": {
    title: "Inbound Calling",
    subtitle: "Route incoming calls to the right voice agent automatically",
    content: (
      <>
        <H2>How routing works</H2>
        <OL>
          <OLI n={1}>Caller dials your phone number</OLI>
          <OLI n={2}>Your telephony provider sends a webhook to Lynq</OLI>
          <OLI n={3}>Lynq resolves which org owns that phone number</OLI>
          <OLI n={4}>Lynq routes the call to the agent assigned to that number</OLI>
          <OLI n={5}>Agent answers and the conversation begins</OLI>
        </OL>
        <H2>Setup</H2>
        <OL>
          <OLI n={1}>Go to <strong>Telephony Configurations</strong></OLI>
          <OLI n={2}>Select your configuration and open the phone number</OLI>
          <OLI n={3}>Set the <strong>Inbound workflow</strong> to the agent that should handle calls</OLI>
          <OLI n={4}>Save — Lynq auto-configures the webhook with your telephony provider</OLI>
        </OL>
        <H2>Inbound webhook URL</H2>
        <div className="my-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
          <div className="text-xs text-gray-500 mb-1">Single org-wide URL for all providers</div>
          <code className="text-sm font-mono text-green-700 dark:text-green-400 break-all">
            https://api.lynq.naazailabs.com/api/v1/telephony/inbound/run
          </code>
        </div>
      </>
    ),
  },

  "workflow-schema": {
    title: "Workflow Definition Schema",
    subtitle: "JSON reference for the workflow_definition object",
    content: (
      <>
        <P>The <InlineCode>workflow_definition</InlineCode> object defines the full conversation graph. It&apos;s the same structure the visual workflow builder reads and writes.</P>
        <CodeBlock lang="json">{`{
  "nodes": [...],
  "edges": [...]
}`}</CodeBlock>
        <H2>Node object</H2>
        <CodeBlock lang="json">{`{
  "id": "uuid-string",
  "type": "agentNode",
  "position": { "x": 100, "y": 200 },
  "data": { ... }
}`}</CodeBlock>
        <H2>Common data fields</H2>
        <Table
          headers={["Field", "Type", "Description"]}
          rows={[
            [<InlineCode key="n">name</InlineCode>, "string", "Display name for the node"],
            [<InlineCode key="p">prompt</InlineCode>, "string", "LLM system prompt"],
            [<InlineCode key="ai">allow_interrupt</InlineCode>, "boolean", "Allow caller to interrupt mid-speech"],
            [<InlineCode key="agp">add_global_prompt</InlineCode>, "boolean", "Merge globalNode prompt into this node"],
            [<InlineCode key="tu">tool_uuids</InlineCode>, "string[]", "IDs of tools attached to this node"],
            [<InlineCode key="du">document_uuids</InlineCode>, "string[]", "IDs of knowledge base documents"],
          ]}
        />
        <H2>Edge object</H2>
        <CodeBlock lang="json">{`{
  "id": "edge-uuid",
  "source": "node-uuid-a",
  "target": "node-uuid-b",
  "data": {
    "label": "Customer confirms",
    "condition": "The customer has confirmed their appointment",
    "transition_speech": "Great, I've got that noted."
  }
}`}</CodeBlock>
        <H2>Minimal example</H2>
        <CodeBlock lang="json">{`{
  "nodes": [
    {
      "id": "start-1",
      "type": "startCall",
      "position": { "x": 0, "y": 0 },
      "data": {
        "name": "Start",
        "prompt": "You are a friendly assistant. Greet the caller and ask how you can help."
      }
    },
    {
      "id": "end-1",
      "type": "endCall",
      "position": { "x": 400, "y": 0 },
      "data": { "name": "End", "prompt": "Thank the caller and say goodbye." }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "start-1",
      "target": "end-1",
      "data": {
        "label": "Done",
        "condition": "The caller's question has been answered and they want to end the call"
      }
    }
  ]
}`}</CodeBlock>
      </>
    ),
  },

  webhooks: {
    title: "Webhook Payloads",
    subtitle: "Context variables available in webhook nodes after a call",
    content: (
      <>
        <P>Lynq executes webhook nodes asynchronously after a workflow run completes. Configure the target URL, method, headers, and payload template directly in the workflow.</P>
        <H2>Available context variables</H2>
        <Table
          headers={["Variable", "Type", "Description"]}
          rows={[
            [<InlineCode key="rid">{"{{workflow_run_id}}"}</InlineCode>, "integer", "ID of the completed run"],
            [<InlineCode key="wn">{"{{workflow_name}}"}</InlineCode>, "string", "Name of the workflow"],
            [<InlineCode key="cid">{"{{campaign_id}}"}</InlineCode>, "integer | null", "Campaign ID (null for ad-hoc runs)"],
            [<InlineCode key="ct">{"{{call_time}}"}</InlineCode>, "string", "ISO-8601 UTC timestamp"],
            [<InlineCode key="ic">{"{{initial_context}}"}</InlineCode>, "object", "Context passed when the call was initiated"],
            [<InlineCode key="gc">{"{{gathered_context}}"}</InlineCode>, "object", "Data extracted during the call"],
            [<InlineCode key="ru">{"{{recording_url}}"}</InlineCode>, "string | null", "Download URL for the recording"],
            [<InlineCode key="tu">{"{{transcript_url}}"}</InlineCode>, "string | null", "Download URL for the transcript"],
          ]}
        />
        <H2>Example payload</H2>
        <CodeBlock lang="json">{`{
  "run_id": "{{workflow_run_id}}",
  "customer": "{{initial_context.customer_name}}",
  "outcome": "{{gathered_context.resolution}}",
  "recording": "{{recording_url}}"
}`}</CodeBlock>
        <H2>Receiver example (Python)</H2>
        <CodeBlock lang="python">{`from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhook/lynq")
async def handle_webhook(request: Request):
    payload = await request.json()
    run_id = payload.get("run_id")
    outcome = payload.get("outcome")
    # process the call result...
    return {"status": "ok"}`}</CodeBlock>
        <H2>Authentication methods</H2>
        <Table
          headers={["Type", "Description"]}
          rows={[
            ["NONE", "No authentication"],
            ["API_KEY", "Sends the key in a custom header (e.g. X-API-Key)"],
            ["BEARER_TOKEN", "Sends Authorization: Bearer <token>"],
            ["BASIC_AUTH", "HTTP Basic authentication (username + password)"],
          ]}
        />
      </>
    ),
  },

  sdks: {
    title: "SDKs",
    subtitle: "Build and operate Lynq voice agents programmatically",
    content: (
      <>
        <P>Official SDKs for Python and TypeScript wrap the Lynq REST API. Use them to create agents, place calls, and inspect runs from your own code.</P>
        <H2>Install</H2>
        <CodeBlock lang="bash">{`# Python
pip install dograh-sdk

# TypeScript / Node.js
npm install @dograh/sdk`}</CodeBlock>
        <H2>Authenticate</H2>
        <P>Generate an API key at <strong>/api-keys</strong>. Both SDKs read from <InlineCode>DOGRAH_API_KEY</InlineCode> env var by default.</P>
        <CodeBlock lang="python">{`from dograh_sdk import DograhClient

client = DograhClient(
    base_url="https://api.lynq.naazailabs.com",
    api_key="YOUR_API_KEY",
)`}</CodeBlock>
        <CodeBlock lang="typescript">{`import { DograhClient } from "@dograh/sdk";

const client = new DograhClient({
    baseUrl: "https://api.lynq.naazailabs.com",
    apiKey: "YOUR_API_KEY",
});`}</CodeBlock>
        <H2>List agents</H2>
        <CodeBlock lang="python">{`workflows = client.list_workflows()
for wf in workflows:
    print(wf.id, wf.name)`}</CodeBlock>
        <H2>Place an outbound call</H2>
        <CodeBlock lang="python">{`call = client.trigger_call(
    workflow_id="your-workflow-uuid",
    phone_number="+14155550100",
    initial_context={
        "customer_name": "Jane Smith",
        "plan": "premium"
    }
)
print("Run ID:", call.run_id)`}</CodeBlock>
      </>
    ),
  },
};

// ─── Main ──────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeId, setActiveId] = useState("introduction");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const page = PAGES[activeId];

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileNavOpen(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const filteredNav = search
    ? NAV.map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          i.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : NAV;

  // find active section for breadcrumb
  const activeSection = NAV.find((s) => s.items.some((i) => i.id === activeId));

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "w-60 shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/70 dark:bg-gray-900/50",
          "transition-all duration-200"
        )}
      >
        {/* Logo / header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-green-600 flex items-center justify-center">
              <Book className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Docs</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 placeholder-gray-400 text-gray-700 dark:text-gray-300"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-2">
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {filteredNav.map((section) => (
            <SidebarGroup
              key={section.id}
              section={section}
              activeId={activeId}
              onSelect={handleSelect}
            />
          ))}
        </nav>
      </aside>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          {/* Breadcrumb */}
          {activeSection && (
            <div className="flex items-center gap-1.5 mb-6 text-xs text-gray-400">
              <span>{activeSection.label}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-600 dark:text-gray-300">{page?.title}</span>
            </div>
          )}

          {/* Page header */}
          {page && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {page.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  {page.subtitle}
                </p>
              </div>
              <hr className="border-gray-100 dark:border-gray-800 mb-6" />
              <div>{page.content}</div>
            </>
          )}

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400">Lynq Documentation</span>
            <a
              href="https://github.com/dograh-hq/dograh"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({
  section,
  activeId,
  onSelect,
}: {
  section: (typeof NAV)[0];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const hasActive = section.items.some((i) => i.id === activeId);
  const [open, setOpen] = useState<boolean>(hasActive || false);
  const Icon = section.icon;

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className={cn("flex h-5 w-5 items-center justify-center rounded", section.bg)}>
          <Icon className={cn("h-3 w-3", section.color)} />
        </span>
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform duration-150", open ? "rotate-0" : "-rotate-90")}
        />
      </button>
      {open && (
        <div className="mt-0.5 ml-2 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 mb-1">
          {section.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors",
                activeId === item.id
                  ? "text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800/40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
