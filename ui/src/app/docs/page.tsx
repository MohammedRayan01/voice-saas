"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Book, Search } from "lucide-react";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      { id: "introduction", title: "Introduction" },
      { id: "prerequisites", title: "Prerequisites" },
    ],
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    items: [
      { id: "how-lynq-works", title: "How Lynq Works" },
      { id: "workflows-and-agents", title: "Workflows & Agents" },
      { id: "calls-and-runs", title: "Calls & Runs" },
      { id: "context-and-variables", title: "Context & Variables" },
      { id: "campaigns", title: "Campaigns" },
    ],
  },
  {
    id: "voice-agent",
    title: "Voice Agent Builder",
    items: [
      { id: "create-agent", title: "Creating a Voice Agent" },
      { id: "agent-node", title: "Agent Node" },
      { id: "start-call-node", title: "Start Call Node" },
      { id: "end-call-node", title: "End Call Node" },
      { id: "global-node", title: "Global Node" },
      { id: "webhook-node", title: "Webhook Node" },
      { id: "knowledge-base", title: "Knowledge Base" },
      { id: "template-variables", title: "Template Variables" },
      { id: "interruption", title: "Interruption Handling" },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    items: [
      { id: "tools-overview", title: "Tools Overview" },
      { id: "call-transfer", title: "Call Transfer" },
      { id: "calendar-booking", title: "Calendar Booking" },
      { id: "http-api-tool", title: "HTTP API Tool" },
    ],
  },
  {
    id: "configurations",
    title: "Configurations",
    items: [
      { id: "model-configurations", title: "Model Configurations" },
      { id: "llm-config", title: "LLM Configuration" },
      { id: "voice-config", title: "Voice (TTS)" },
      { id: "api-keys", title: "API Keys" },
    ],
  },
  {
    id: "telephony",
    title: "Telephony",
    items: [
      { id: "telephony-overview", title: "Overview" },
      { id: "twilio", title: "Twilio" },
      { id: "inbound-calling", title: "Inbound Calling" },
    ],
  },
  {
    id: "developer",
    title: "Developer",
    items: [
      { id: "workflow-schema", title: "Workflow Schema" },
      { id: "webhooks", title: "Webhook Payloads" },
      { id: "sdks", title: "SDKs" },
    ],
  },
];

const content: Record<string, React.ReactNode> = {
  introduction: (
    <div>
      <h1>Introduction</h1>
      <h2>About Lynq</h2>
      <p>
        <strong>Lynq is an open-source voice AI platform</strong> — it helps you build voice AI agents with an
        easy drag-and-drop workflow builder. Lynq gives you:
      </p>
      <ul>
        <li><strong>100% open source</strong> — no vendor lock-in, full transparency</li>
        <li><strong>Self-hostable</strong> — deploy anywhere, own your infrastructure</li>
        <li><strong>Complete control</strong> — every line of code is open and customizable</li>
        <li><strong>2-minute setup</strong> — from zero to working voice bot in under 2 minutes</li>
      </ul>
      <h2>Overview</h2>
      <p>
        Lynq is a platform for building and running voice AI agents. You define a conversation flow,
        connect a phone number, and Lynq handles the rest — transcribing the caller&apos;s speech (STT),
        generating intelligent responses (LLM), speaking them back in a natural voice (TTS), and
        returning structured results when the call ends.
      </p>
      <h2>Next Steps</h2>
      <p>
        See <strong>How Lynq Works</strong> for the big-picture architecture, then <strong>Creating a Voice Agent</strong> to
        build your first agent.
      </p>
    </div>
  ),

  prerequisites: (
    <div>
      <h1>Prerequisites</h1>
      <p>Before getting started with Lynq, make sure you have:</p>
      <ul>
        <li>A modern web browser (Chrome, Firefox, Safari, Edge)</li>
        <li>Microphone access for web call testing</li>
        <li>API keys for your chosen AI providers (LLM, TTS, STT) — or use the Lynq default models</li>
        <li>A telephony account (Twilio, Telnyx, Plivo, etc.) if you want phone calling</li>
      </ul>
      <h2>System Requirements (Self-hosted)</h2>
      <ul>
        <li>Docker and Docker Compose</li>
        <li>4 GB RAM minimum (8 GB recommended)</li>
        <li>10 GB disk space</li>
        <li>A publicly accessible domain for inbound calling webhooks</li>
      </ul>
      <h2>Quick Start</h2>
      <p>The fastest way to run Lynq locally:</p>
      <pre>{`curl -o docker-compose.yaml https://raw.githubusercontent.com/dograh-hq/dograh/main/docker-compose.yaml
ENABLE_TELEMETRY=true docker compose up --pull always`}</pre>
    </div>
  ),

  "how-lynq-works": (
    <div>
      <h1>How Lynq Works</h1>
      <p>
        Lynq is a platform for building and running voice AI agents. You define a conversation flow,
        connect a phone number, and Lynq handles the rest — transcribing the caller&apos;s speech (STT),
        generating intelligent responses (LLM), speaking them back in a natural voice (TTS), and
        returning structured results when the call ends.
      </p>
      <h2>The Core Loop</h2>
      <ol>
        <li>Lynq instructs your telephony provider to dial the number</li>
        <li>When the caller answers, a real-time audio pipeline opens</li>
        <li>The caller&apos;s speech is transcribed by the STT provider</li>
        <li>The transcript is sent to the LLM with the active node&apos;s prompt and conversation history</li>
        <li>The LLM responds — the response is synthesized to audio by the TTS provider and streamed to the caller</li>
        <li>When an edge condition is met, Lynq transitions to the next node</li>
        <li>When an end node is reached, the call ends</li>
        <li>Post-call: context is extracted, webhooks fire, the run record is saved</li>
      </ol>
      <h2>Key Components</h2>
      <table>
        <thead><tr><th>Component</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><strong>Workflows (Agents)</strong></td><td>The conversation logic. A graph of nodes (steps) connected by edges (transitions).</td></tr>
          <tr><td><strong>Runs</strong></td><td>Every execution of a workflow. Contains transcript, recording, extracted data, and cost.</td></tr>
          <tr><td><strong>Telephony</strong></td><td>Phone infrastructure. Connects to Twilio, Vonage, etc. for real calls.</td></tr>
          <tr><td><strong>Transcriber (STT)</strong></td><td>Converts caller speech to text in real time.</td></tr>
          <tr><td><strong>LLM Provider</strong></td><td>Processes transcript and node prompt to generate the agent&apos;s response.</td></tr>
          <tr><td><strong>Voice Synthesizer (TTS)</strong></td><td>Converts LLM text to audio and streams it to the caller.</td></tr>
        </tbody>
      </table>
    </div>
  ),

  "workflows-and-agents": (
    <div>
      <h1>Workflows &amp; Agents</h1>
      <p>
        In Lynq, what you see as an <strong>agent</strong> in the dashboard is called a <strong>workflow</strong> in the API.
        They are the same thing — a workflow is the underlying definition, agent is the product name for it.
      </p>
      <blockquote>
        Anywhere the API says <code>workflow</code>, think &quot;agent&quot;. Anywhere the API says <code>workflow_definition</code>,
        think &quot;the conversation logic inside your agent&quot;.
      </blockquote>
      <h2>The Graph Model</h2>
      <p>
        A workflow is a <strong>directed graph</strong> — a set of nodes connected by edges.
      </p>
      <p>
        <strong>Nodes</strong> are the steps in the conversation. Each node has a prompt that tells the LLM what to say and do at that point.
      </p>
      <p>
        <strong>Edges</strong> are the transitions between nodes. Each edge has a condition — a natural language description of when to move on.
        The LLM evaluates whether the condition has been met based on the conversation so far.
      </p>
      <h2>Node Types</h2>
      <table>
        <thead><tr><th>Type</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><code>startCall</code></td><td>Entry point for telephony calls. The first thing the agent says.</td></tr>
          <tr><td><code>agentNode</code></td><td>An LLM-powered conversation step. The core building block.</td></tr>
          <tr><td><code>globalNode</code></td><td>Instructions that apply across all agent nodes (tone, language, fallback).</td></tr>
          <tr><td><code>endCall</code></td><td>Terminates the call.</td></tr>
          <tr><td><code>trigger</code></td><td>Entry point for API-triggered runs (non-telephony).</td></tr>
          <tr><td><code>webhook</code></td><td>Fires an HTTP request when reached — for CRM updates, notifications.</td></tr>
          <tr><td><code>qa</code></td><td>Runs automated quality analysis on the completed call.</td></tr>
        </tbody>
      </table>
      <h2>Versioning</h2>
      <p>
        Every time you update a workflow&apos;s <code>workflow_definition</code>, Lynq saves a new version while keeping the history.
        The current version is always what runs. Old versions are retained for auditing.
      </p>
      <h2>Creating Workflows</h2>
      <p>There are two ways to create a workflow:</p>
      <ul>
        <li><strong>From a definition</strong> — provide the full node/edge graph yourself. Best for programmatic generation.</li>
        <li><strong>From a template</strong> — describe the use case in natural language and Lynq generates the initial graph using an LLM.</li>
      </ul>
    </div>
  ),

  "calls-and-runs": (
    <div>
      <h1>Calls &amp; Runs</h1>
      <p>
        Every time a workflow executes, Lynq creates a <strong>run</strong>. The run is the record of that execution:
        what was said, what data was collected, how long it took, and what it cost.
      </p>
      <h2>Calls vs Runs</h2>
      <p>
        A <strong>call</strong> is the audio connection — whether over the phone via a telephony provider, or through
        the browser via Web Call.
      </p>
      <p>
        A <strong>run</strong> is the Lynq record of the workflow execution. Every call — outbound, inbound, web, or
        campaign — creates a run with the same contents: transcript, recording, gathered context, usage, and cost.
      </p>
      <h2>Inbound vs Outbound</h2>
      <p>
        <strong>Outbound calls</strong> are initiated by Lynq — you trigger them via the API or dashboard with a phone
        number and agent. Used for proactive outreach, reminders, and campaigns.
      </p>
      <p>
        <strong>Inbound calls</strong> are initiated by the caller — your telephony provider routes incoming calls to
        a Lynq agent via a webhook URL. Used for support lines, hotlines, and IVR replacement.
      </p>
      <h2>Web Calls</h2>
      <p>
        Web Call lets you talk to your agent directly from the browser — no phone number or telephony setup required.
        It runs the full pipeline: STT, LLM, TTS, recording, and transcript, exactly the same as a phone call.
      </p>
      <p>Use it to try out your agent before going live.</p>
      <h2>What a Run Contains</h2>
      <table>
        <thead><tr><th>Field</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>status</code></td><td>Final run state</td></tr>
          <tr><td><code>recording_url</code></td><td>Download URL for the call audio</td></tr>
          <tr><td><code>transcript_url</code></td><td>Download URL for the conversation transcript</td></tr>
          <tr><td><code>gathered_context</code></td><td>Structured data extracted by the agent during the call</td></tr>
          <tr><td><code>initial_context</code></td><td>The data passed in when the call was triggered</td></tr>
          <tr><td><code>usage_info</code></td><td>Duration in seconds, token count</td></tr>
          <tr><td><code>cost_info</code></td><td>Cost breakdown</td></tr>
        </tbody>
      </table>
    </div>
  ),

  "context-and-variables": (
    <div>
      <h1>Context &amp; Variables</h1>
      <p>
        Lynq has a simple data model for passing information through a call. Understanding it is key to building
        agents that feel personalised and to extracting useful results after a call.
      </p>
      <h2>The Three Context Objects</h2>
      <ul>
        <li><strong>initial_context</strong> — data available to the agent before the call starts</li>
        <li><strong>template variables</strong> — values from initial_context used in prompts via <code>{"{{variable_name}}"}</code></li>
        <li><strong>gathered_context</strong> — data the agent collects during the call</li>
      </ul>
      <h2>initial_context</h2>
      <p>Data available to the agent before the call starts — the contact&apos;s name, account details, etc. Set from:</p>
      <ul>
        <li><strong>API trigger</strong> — pass it in the request body</li>
        <li><strong>Campaign CSV</strong> — columns beyond <code>phone_number</code> automatically become <code>initial_context</code> fields</li>
        <li><strong>Dashboard</strong> — set default template context variables on the agent</li>
      </ul>
      <pre>{`{
  "phone_number": "+14155550100",
  "initial_context": {
    "customer_name": "Jane Smith",
    "plan": "premium",
    "renewal_date": "April 1"
  }
}`}</pre>
      <h2>Template Variables</h2>
      <p>Values from <code>initial_context</code> are available in prompts using <code>{"{{double_brace}}"}</code> syntax:</p>
      <pre>{`You are calling {{customer_name}} about their {{plan}} plan,
which renews on {{renewal_date}}.`}</pre>
      <h2>Fallback Values</h2>
      <p>Use a pipe (<code>|</code>) to provide a default when a variable might be missing:</p>
      <pre>{`Hello {{customer_name | there}}, we're calling about your {{plan | current}} plan.`}</pre>
      <h2>Default Variables</h2>
      <table>
        <thead><tr><th>Variable</th><th>Description</th><th>Example</th></tr></thead>
        <tbody>
          <tr><td><code>{"{{current_time}}"}</code></td><td>Current time in UTC</td><td>2026-04-02 14:30:45 UTC</td></tr>
          <tr><td><code>{"{{current_weekday}}"}</code></td><td>Current weekday name</td><td>Thursday</td></tr>
          <tr><td><code>{"{{caller_number}}"}</code></td><td>Phone number that initiated the call</td><td>+14155550100</td></tr>
          <tr><td><code>{"{{called_number}}"}</code></td><td>Phone number that received the call</td><td>+18005550199</td></tr>
        </tbody>
      </table>
      <p>You can also use timezone suffixes: <code>{"{{current_time_Asia/Kolkata}}"}</code></p>
      <h2>gathered_context</h2>
      <p>
        Data the agent collects <em>during</em> the call. You configure what to extract in the agent node&apos;s
        extraction settings — each variable has a name, type, and a description that tells the LLM what to look for.
        <code>gathered_context</code> is returned in the run record after the call completes.
      </p>
    </div>
  ),

  campaigns: (
    <div>
      <h1>Campaigns (Bulk Outbound Calls)</h1>
      <p>
        A campaign is how you run a workflow against many contacts automatically. Instead of triggering calls one by
        one, you upload a list of phone numbers and Lynq dials them for you — respecting scheduling windows,
        concurrency limits, and retry rules.
      </p>
      <h2>How a Campaign Works</h2>
      <ol>
        <li><strong>Upload a contacts CSV</strong> — must have a <code>phone_number</code> column; extra columns become <code>initial_context</code></li>
        <li><strong>Create the campaign</strong> — link to a workflow, set concurrency, time slots, and retry behaviour</li>
        <li><strong>Start it</strong> — Lynq begins dialing contacts up to your concurrency limit</li>
        <li><strong>Monitor progress</strong> — track processed, completed, failed, and pending counts in real time</li>
        <li><strong>Pause and resume</strong> — stop and restart at any point without losing progress</li>
      </ol>
      <h2>The Contacts CSV</h2>
      <pre>{`phone_number,customer_name,account_id,plan
+14155550100,Jane Smith,acc_001,premium
+14155550101,Bob Jones,acc_002,basic`}</pre>
      <p>Columns beyond <code>phone_number</code> are automatically passed as <code>initial_context</code> to each call.</p>
      <h2>Scheduling and Concurrency</h2>
      <p>
        <strong>Concurrency</strong> controls how many calls run simultaneously. Set it conservatively to start.
      </p>
      <p><strong>Time slots</strong> restrict when Lynq is allowed to dial:</p>
      <pre>{`{
  "timezone": "America/New_York",
  "time_slots": [
    { "day": "monday", "start": "09:00", "end": "17:00" },
    { "day": "tuesday", "start": "09:00", "end": "17:00" }
  ]
}`}</pre>
      <h2>Retry Behaviour</h2>
      <pre>{`{
  "retry_config": {
    "max_attempts": 3,
    "retry_interval_minutes": 60
  }
}`}</pre>
      <h2>Circuit Breaker</h2>
      <p>
        Automatically pauses a campaign when the call failure rate gets too high — protecting against wasted spend
        and telephony reputation issues.
      </p>
      <table>
        <thead><tr><th>Setting</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>Failure Threshold (%)</td><td>50</td><td>Pause when failure rate exceeds this percentage</td></tr>
          <tr><td>Window (seconds)</td><td>120</td><td>Rolling time window for failure rate calculation</td></tr>
          <tr><td>Min Calls in Window</td><td>5</td><td>Minimum calls before circuit breaker can trip</td></tr>
        </tbody>
      </table>
      <h2>Campaign Lifecycle</h2>
      <table>
        <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>draft</code></td><td>Created but not started</td></tr>
          <tr><td><code>running</code></td><td>Actively dialing</td></tr>
          <tr><td><code>paused</code></td><td>Stopped; resumes from where it left off</td></tr>
          <tr><td><code>completed</code></td><td>All contacts processed</td></tr>
          <tr><td><code>failed</code></td><td>Encountered a fatal error</td></tr>
        </tbody>
      </table>
    </div>
  ),

  "create-agent": (
    <div>
      <h1>Creating a Voice Agent</h1>
      <p>
        A <strong>Voice Agent</strong> is an AI-powered phone bot that can hold real, natural conversations —
        answering questions, collecting information, booking appointments, or handling support requests — entirely
        by voice, 24/7, without human intervention.
      </p>
      <p>
        Under the hood, each agent is a <strong>workflow</strong>: a directed graph of conversation steps connected
        by conditions. The AI navigates this graph in real time based on what the caller says.
      </p>
      <blockquote>On Lynq, &quot;Agent&quot; and &quot;Workflow&quot; refer to the same thing.</blockquote>
      <h2>Step 1 — Open the Create Agent Form</h2>
      <p>Navigate to <strong>Voice Agents</strong> in the sidebar, then click <strong>Create Agent</strong>.</p>
      <table>
        <thead><tr><th>Field</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><strong>Call Type</strong></td><td>Whether this agent handles incoming, outgoing, or both</td></tr>
          <tr><td><strong>Use Case</strong></td><td>A short label for what the agent does (e.g. &quot;Customer Support&quot;)</td></tr>
          <tr><td><strong>Description</strong></td><td>Natural language description used by AI to generate your initial workflow</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Tip:</strong> The more specific your description, the better the generated workflow. Include tone,
        key tasks, and must-cover topics.
      </p>
      <h2>Step 2 — Generate the Workflow</h2>
      <p>
        Click <strong>Create Agent</strong>. Lynq sends your description to the AI, which generates an initial
        conversation graph in seconds. You&apos;ll land on the Workflow Builder — a visual canvas showing your agent
        as a connected graph of nodes.
      </p>
      <h2>Step 3 — Understand the Workflow Canvas</h2>
      <p>Every agent has at minimum two nodes:</p>
      <ul>
        <li>
          <strong>Start Call Node</strong> — the entry point. Contains the greeting message, system prompt,
          and interruption settings.
        </li>
        <li>
          <strong>End Call Node</strong> — marks where the call terminates.
        </li>
      </ul>
      <h2>Step 4 — Test with a Browser Call</h2>
      <p>
        You don&apos;t need a phone number to test. Lynq includes a <strong>WebRTC browser call</strong> that lets you
        speak directly to your agent from your computer.
      </p>
      <ol>
        <li>Click <strong>Start Web Call</strong> on the workflow detail page</li>
        <li>Allow microphone access when prompted</li>
        <li>Wait for the agent to greet you — usually starts within 1–2 seconds</li>
        <li>Have a conversation</li>
        <li>Click <strong>End Call</strong> when done</li>
      </ol>
      <h2>Step 5 — Review Recordings &amp; Transcripts</h2>
      <p>
        After every call ends, Lynq automatically saves the full audio recording and complete transcript.
        Go to <strong>Recordings</strong> in the sidebar to see all past calls.
      </p>
    </div>
  ),

  "agent-node": (
    <div>
      <h1>Agent Node</h1>
      <p>
        An <strong>Agent Node</strong> is a single stage of a conversation. Each node has its own prompt, its own
        set of tools, and its own edges (transitions) that tell the agent when and where to move next.
      </p>
      <p>
        A workflow is made up of multiple agent nodes chained together. The agent can only do what its current
        node&apos;s prompt and tools allow — it gets a fresh context when it enters each new node.
      </p>
      <h2>Prompt</h2>
      <p>The system instruction the LLM follows while inside this node. Write it as direct instructions:</p>
      <pre>{`You are speaking with a caller who wants to book an appointment.

1. Ask for their preferred date and time.
2. Ask for their name if you don't have it yet.
3. Once you have both, call book_appointment.
4. Confirm the booking and say goodbye.`}</pre>
      <p><strong>Tips for good prompts:</strong></p>
      <ul>
        <li>Be specific about what the agent should ask and in what order</li>
        <li>Tell the agent explicitly when to call a tool</li>
        <li>Tell the agent explicitly when to move to the next node</li>
        <li>Keep it focused — one job per node</li>
      </ul>
      <h2>Global Prompt</h2>
      <p>
        Toggle <strong>Add Global Prompt</strong> to inject your Global Node instructions into this node. Enable
        this on almost every agent node so the agent always knows the company context, tone, and language.
      </p>
      <h2>Tools</h2>
      <p>Attach tools the agent can invoke while in this node. Built-in tools:</p>
      <ul>
        <li><strong>End Call</strong> — hangs up the call</li>
        <li><strong>Call Transfer</strong> — transfers to a phone number or SIP endpoint</li>
        <li><strong>Calendar Booking</strong> — books, checks, and cancels appointments</li>
      </ul>
      <p>Custom tools:</p>
      <ul>
        <li><strong>HTTP API</strong> — calls any REST endpoint</li>
        <li><strong>MCP Tool</strong> — connects to an MCP server</li>
      </ul>
      <h2>Knowledge Base</h2>
      <p>
        Attach documents the agent can search during this node. The agent uses semantic search to find relevant
        information and answer questions from it.
      </p>
      <h2>Variable Extraction</h2>
      <p>
        Define structured variables to extract from the conversation when the agent is in this node. Extracted
        variables are saved to the run&apos;s <code>gathered_context</code> and can be referenced in later nodes using
        <code>{"{{variable_name}}"}</code>.
      </p>
      <table>
        <thead><tr><th>Field</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>Name</td><td>Variable key (e.g. <code>caller_name</code>)</td></tr>
          <tr><td>Type</td><td><code>string</code>, <code>number</code>, <code>boolean</code></td></tr>
          <tr><td>Description</td><td>What the LLM should look for</td></tr>
        </tbody>
      </table>
      <h2>Edges (Transitions)</h2>
      <p>Edges connect this node to the next. Each edge becomes a callable function the LLM invokes.</p>
      <table>
        <thead><tr><th>Field</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>Label</td><td>The function name the LLM calls (e.g. <code>proceed_to_booking</code>)</td></tr>
          <tr><td>Condition</td><td>Natural language description of when to transition</td></tr>
          <tr><td>Transition Speech</td><td>Optional phrase the agent speaks before switching nodes</td></tr>
        </tbody>
      </table>
      <p>Name your edges clearly — <code>appointment_confirmed</code> is better than <code>next</code>.</p>
    </div>
  ),

  "start-call-node": (
    <div>
      <h1>Start Call Node</h1>
      <p>
        The <strong>Start Call Node</strong> is the entry point of every telephony call. It fires the moment a call
        connects.
      </p>
      <blockquote>You should have only one Start Call node per Voice Agent.</blockquote>
      <h2>Configuration</h2>
      <ul>
        <li><strong>Greeting Message</strong> — the first thing your agent says when the call connects</li>
        <li><strong>System Prompt</strong> — the AI&apos;s core instructions: personality, goals, constraints, knowledge</li>
        <li><strong>Allow Interruption</strong> — if on, the caller can interrupt the agent mid-sentence</li>
      </ul>
      <h2>Greeting Message Best Practices</h2>
      <p>Keep greetings short and natural. The caller should know immediately who they reached and that they can speak.</p>
      <p><strong>Good:</strong> <em>&quot;Hello! Thanks for calling Acme Support. How can I help you today?&quot;</em></p>
      <p><strong>Avoid:</strong> Long, robotic intros that feel automated.</p>
      <h2>System Prompt — What to Include</h2>
      <ul>
        <li><strong>Identity</strong>: Who the agent is and who it represents</li>
        <li><strong>Goal</strong>: What it should accomplish on this call</li>
        <li><strong>Tone</strong>: Formal, friendly, concise, empathetic</li>
        <li><strong>Knowledge</strong>: Key facts the agent needs (products, policies, FAQs)</li>
        <li><strong>Boundaries</strong>: What it should NOT do</li>
      </ul>
      <pre>{`You are Alex, a friendly support agent for Acme Corp.
Your goal is to help callers troubleshoot common product issues.
Speak in a warm, professional tone. Keep responses concise.
If the caller asks about refunds or billing, tell them you'll
transfer them to the billing team and end the call politely.`}</pre>
    </div>
  ),

  "end-call-node": (
    <div>
      <h1>End Call Node</h1>
      <p>
        The <strong>End Call Node</strong> marks the point where the call terminates. When the workflow reaches this
        node, the call hangs up.
      </p>
      <h2>Configuration</h2>
      <ul>
        <li>A closing statement for the agent to say before hanging up</li>
        <li>Variables to extract from the conversation (name, intent, outcome)</li>
      </ul>
      <h2>Best Practices</h2>
      <ul>
        <li>Always have a warm, complete closing statement before hanging up</li>
        <li>Extract key variables (call outcome, next steps) at the end node</li>
        <li>Use the End Call tool in agent nodes to gracefully terminate mid-conversation when appropriate</li>
      </ul>
      <h2>Example End Call Prompt</h2>
      <pre>{`The call has been completed.
Thank the caller warmly for their time.
Summarize what was accomplished (e.g. "Your appointment is booked for [date]").
Say a warm goodbye.
Then immediately call end_call to hang up.`}</pre>
    </div>
  ),

  "global-node": (
    <div>
      <h1>Global Node</h1>
      <p>
        The <strong>Global Node</strong> defines instructions that apply across all agent nodes in a workflow. Think
        of it as the agent&apos;s persistent personality, language, and ground rules that follow it through every step
        of the conversation.
      </p>
      <h2>What to Put in the Global Node</h2>
      <ul>
        <li><strong>Company identity</strong> — who the company is, what it does</li>
        <li><strong>Tone and language</strong> — formal vs casual, language to use</li>
        <li><strong>Fallback behaviour</strong> — what to do if the caller goes off-topic</li>
        <li><strong>Guardrails</strong> — things the agent must never say or do</li>
        <li><strong>Contact details</strong> — website, support email, hours</li>
      </ul>
      <h2>How to Enable</h2>
      <p>
        In each Agent Node, toggle <strong>Add Global Prompt</strong> to inject the Global Node&apos;s prompt into
        that node. Enable this on almost every node so the agent always has the full company context available.
      </p>
      <h2>Example Global Prompt</h2>
      <pre>{`You represent Acme Corp — a B2B software company specializing in
project management tools.

Tone: Professional, helpful, and concise. Never use slang.
Language: Always respond in the same language the caller uses.
Guardrails:
- Never discuss competitor products
- Never make pricing commitments not in your knowledge base
- If asked something you don't know, say "I'll have someone follow up"
Hours: Monday–Friday, 9am–6pm EST.`}</pre>
    </div>
  ),

  "webhook-node": (
    <div>
      <h1>Webhook Node</h1>
      <p>
        The <strong>Webhook Node</strong> fires an HTTP request when the workflow reaches it. Use it for CRM updates,
        notifications, or triggering downstream automations after a call.
      </p>
      <h2>Configuration</h2>
      <table>
        <thead><tr><th>Field</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>enabled</code></td><td>Whether this webhook fires when reached</td></tr>
          <tr><td><code>http_method</code></td><td>GET, POST, PUT, PATCH, or DELETE</td></tr>
          <tr><td><code>endpoint_url</code></td><td>Target URL</td></tr>
          <tr><td><code>custom_headers</code></td><td>Additional request headers</td></tr>
          <tr><td><code>payload_template</code></td><td>Request body template (supports context variables)</td></tr>
        </tbody>
      </table>
      <h2>Payload Context Variables</h2>
      <table>
        <thead><tr><th>Variable</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>{"{{workflow_run_id}}"}</code></td><td>ID of the completed run</td></tr>
          <tr><td><code>{"{{initial_context.field}}"}</code></td><td>Data passed when the call was initiated</td></tr>
          <tr><td><code>{"{{gathered_context.field}}"}</code></td><td>Data extracted during the call</td></tr>
          <tr><td><code>{"{{recording_url}}"}</code></td><td>Download URL for the call recording</td></tr>
          <tr><td><code>{"{{transcript_url}}"}</code></td><td>Download URL for the call transcript</td></tr>
        </tbody>
      </table>
      <h2>Example Payload</h2>
      <pre>{`{
  "run_id": "{{workflow_run_id}}",
  "customer": "{{initial_context.customer_name}}",
  "outcome": "{{gathered_context.resolution}}",
  "recording": "{{recording_url}}"
}`}</pre>
      <h2>Authentication</h2>
      <p>Webhook requests support: No auth, API Key, Bearer Token, Basic Auth, and Custom Header.</p>
    </div>
  ),

  "knowledge-base": (
    <div>
      <h1>Knowledge Base</h1>
      <p>
        The Knowledge Base lets you upload documents that your voice agents can reference during conversations.
        Instead of encoding all information into prompts, you provide source documents and let the agent retrieve
        relevant content on the fly.
      </p>
      <h2>How It Works</h2>
      <ol>
        <li>You <strong>upload</strong> a document (PDF, DOCX, TXT, or JSON)</li>
        <li>You <strong>choose a retrieval mode</strong> — Full Document or Chunked Search</li>
        <li>Lynq <strong>processes</strong> the document based on the selected mode</li>
        <li>You <strong>attach</strong> the document to one or more workflow nodes</li>
        <li>During a call, the agent <strong>retrieves</strong> information from the document</li>
      </ol>
      <h2>Supported File Types</h2>
      <table>
        <thead><tr><th>Format</th><th>Extension</th></tr></thead>
        <tbody>
          <tr><td>PDF</td><td>.pdf</td></tr>
          <tr><td>Word</td><td>.docx, .doc</td></tr>
          <tr><td>Text</td><td>.txt</td></tr>
          <tr><td>JSON</td><td>.json</td></tr>
        </tbody>
      </table>
      <p>Maximum file size: <strong>5 MB</strong></p>
      <h2>Retrieval Modes</h2>
      <p>
        <strong>Full Document</strong> — the entire document text is provided to the agent whenever it queries the
        knowledge base. Best for menus, price lists, FAQs, and short reference sheets.
      </p>
      <p>
        <strong>Chunked Search</strong> — the document is split into smaller chunks and indexed with vector
        embeddings. Only the most relevant chunks are returned. Best for large documents like policies, manuals,
        or contracts. Requires an embedding API key.
      </p>
      <h2>Attaching Documents to Nodes</h2>
      <ol>
        <li>Open the node edit dialog</li>
        <li>Scroll to the <strong>Knowledge Base Documents</strong> section</li>
        <li>Select one or more documents for the agent to reference</li>
      </ol>
      <h2>Best Practices</h2>
      <ul>
        <li>Use Full Document for small reference files</li>
        <li>Use Chunked Search for large documents</li>
        <li>Keep documents focused — one topic per document</li>
        <li>Attach selectively — only attach documents relevant to a specific node</li>
        <li>Keep documents up to date — re-upload when source information changes</li>
      </ul>
    </div>
  ),

  "template-variables": (
    <div>
      <h1>Template Variables</h1>
      <p>
        You can use template variables in your agent node prompts. They reference values passed as{" "}
        <code>initial_context</code> (via API trigger or campaign CSV) or any extracted variable as{" "}
        <code>gathered_context</code>.
      </p>
      <h2>Template Rendering</h2>
      <p>Template rendering supports nested values:</p>
      <pre>{`// initial_context:
{
  "initial_context": {
    "user": {
      "name": "John"
    }
  }
}

// Prompt usage:
You are Alice, who is talking to {{initial_context.user.name}}.`}</pre>
      <h2>Using Template Variables for Testing</h2>
      <p>
        Template variables defined in your workflow <strong>Settings &gt; Context Variables</strong> are included in
        test calls from the workflow editor. This lets you simulate data that would normally come from telephony or
        an API trigger.
      </p>
      <blockquote>
        Context variables are only used during test calls. On production inbound and campaign calls, the actual
        telephony data is used and these values are ignored.
      </blockquote>
      <h2>Fallback Values</h2>
      <p>Use a pipe character to specify fallback values when variables might be missing:</p>
      <pre>{`Hello {{customer_name | valued customer}}`}</pre>
    </div>
  ),

  interruption: (
    <div>
      <h1>Interruption Handling</h1>
      <p>
        Interruption handling controls whether the user can &quot;barge in&quot; and interrupt the bot while it is speaking.
        This is configured <strong>per node</strong> in the workflow editor.
      </p>
      <h2>How It Works</h2>
      <p>Each node has an <strong>Allow Interruption</strong> toggle:</p>
      <ul>
        <li>
          <strong>Disabled (default)</strong> — the bot finishes its entire response before accepting user input.
          The user&apos;s microphone is temporarily muted while the bot speaks.
        </li>
        <li>
          <strong>Enabled</strong> — the bot stops speaking as soon as the user starts talking, and immediately
          processes their input. Creates a natural, conversational experience.
        </li>
      </ul>
      <h2>When to Disable Interruption</h2>
      <ul>
        <li><strong>Legal disclaimers</strong> — ensure the full disclaimer is spoken</li>
        <li><strong>Critical instructions</strong> — step-by-step directions that lose meaning if partial</li>
        <li><strong>Greeting or introduction</strong> — let the bot finish its opening</li>
        <li><strong>Confirmation summaries</strong> — read back appointment times, order totals in full</li>
      </ul>
      <h2>When to Enable Interruption</h2>
      <ul>
        <li><strong>Q&amp;A or objection handling</strong> — let the user jump in naturally</li>
        <li><strong>Open-ended discussion</strong> — feels more human when either party can interject</li>
        <li><strong>Long responses</strong> — allow the user to redirect if the bot goes off track</li>
      </ul>
      <h2>Behavior Summary</h2>
      <table>
        <thead><tr><th>Setting</th><th>Bot Speaking</th><th>User Speaks</th><th>Result</th></tr></thead>
        <tbody>
          <tr><td>Enabled</td><td>Yes</td><td>Yes</td><td>Bot stops, processes user input</td></tr>
          <tr><td>Disabled</td><td>Yes</td><td>Yes</td><td>Bot continues, user input ignored until done</td></tr>
          <tr><td>Either</td><td>No</td><td>Yes</td><td>User input processed normally</td></tr>
        </tbody>
      </table>
    </div>
  ),

  "tools-overview": (
    <div>
      <h1>Tools</h1>
      <p>
        Tools let your AI agent take actions during a conversation — transfer calls, end calls, call external APIs,
        or invoke remote MCP servers — based on the context of the conversation and your prompt instructions.
      </p>
      <p>
        When a tool is attached to a workflow node, the LLM decides <strong>when</strong> to invoke it and{" "}
        <strong>what parameters</strong> to pass, based on the user&apos;s spoken intent and your node-level instructions.
      </p>
      <h2>Tool Types</h2>
      <h3>Built-in Tools</h3>
      <p>Pre-configured tools that handle common operations out of the box:</p>
      <ul>
        <li><strong>Call Transfer</strong> — transfer the active call to a phone number or SIP endpoint</li>
        <li><strong>End Call</strong> — terminate the call when the conversation is complete</li>
        <li><strong>Calendar Booking</strong> — check availability, book, and cancel appointments</li>
      </ul>
      <h3>Custom Tools</h3>
      <ul>
        <li><strong>HTTP API</strong> — call any REST API endpoint during a conversation</li>
        <li><strong>MCP Tool</strong> — connect an external MCP server and expose its tools to the LLM</li>
      </ul>
      <h2>How Tools Work</h2>
      <ol>
        <li>You <strong>define</strong> a tool with a name, description, and parameters</li>
        <li>You <strong>attach</strong> the tool to one or more workflow nodes</li>
        <li>During a call, the LLM reads your node prompt, the tool description, and the caller&apos;s intent to decide whether to invoke the tool</li>
        <li>The tool executes and returns a result the agent can use to continue the conversation</li>
      </ol>
      <h2>Best Practices</h2>
      <ul>
        <li><strong>Attach only relevant tools to each node</strong> — fewer tools means more reliable invocations</li>
        <li><strong>Write clear tool descriptions</strong> — the LLM uses these to decide when to call the tool</li>
        <li><strong>Guide the LLM in your node prompt</strong> — explicitly describe when a tool should be used</li>
        <li><strong>Test tool behavior</strong> — verify your agent invokes tools at the right moments</li>
      </ul>
    </div>
  ),

  "call-transfer": (
    <div>
      <h1>Call Transfer</h1>
      <p>
        The Call Transfer tool enables your AI agent to transfer active calls to phone numbers or SIP endpoints.
        When configured, your agent can seamlessly transfer callers to human operators, departments, or other
        systems while maintaining a professional experience.
      </p>
      <h2>Supported Providers</h2>
      <p>Call transfer is available for telephony calls using Twilio, Telnyx, or Asterisk ARI providers. Web calls do not support transfer.</p>
      <h2>How It Works</h2>
      <p>The Call Transfer tool performs <strong>blind transfers</strong> where no call context is shared with the destination:</p>
      <ol>
        <li>Your AI agent determines a transfer is needed and calls the transfer function</li>
        <li>(Optional) Agent plays a pre-transfer message like &quot;Let me transfer you to our sales team&quot;</li>
        <li>Caller hears hold music while the transfer is processed</li>
        <li>Once the destination answers, the caller is connected directly</li>
        <li>The AI agent ends its involvement in the call</li>
      </ol>
      <h2>Configuration</h2>
      <ul>
        <li><strong>Destination</strong> — phone number (E.164 format: <code>+1234567890</code>) or SIP endpoint (<code>PJSIP/sales-queue</code>)</li>
        <li><strong>Timeout</strong> — how long to wait for destination to answer (default 30 seconds)</li>
        <li><strong>Pre-transfer Message</strong> — optional custom message played before transfer</li>
      </ul>
      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Destination not reachable</strong> — verify destination number/endpoint is valid</li>
        <li><strong>Tool not available</strong> — check that Call Transfer is added to the correct agent node</li>
      </ul>
    </div>
  ),

  "calendar-booking": (
    <div>
      <h1>Calendar Booking</h1>
      <p>
        The <strong>Calendar Booking</strong> tool gives your agent three callable functions during a live call:
      </p>
      <table>
        <thead><tr><th>Function</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><code>check_availability</code></td><td>Returns available time slots on a given date</td></tr>
          <tr><td><code>book_appointment</code></td><td>Creates an appointment and saves it to the calendar</td></tr>
          <tr><td><code>cancel_appointment</code></td><td>Cancels an existing appointment by its ID</td></tr>
        </tbody>
      </table>
      <p>All appointments are stored in your <strong>Calendar</strong> dashboard and are visible immediately after booking.</p>
      <p>Google Calendar sync is optional — connect a Google account in <strong>Settings → Integrations</strong>.</p>
      <h2>Setup</h2>
      <ol>
        <li>Go to <strong>Tools</strong> in the sidebar → <strong>New Tool</strong> → select category <strong>Calendar Booking</strong></li>
        <li>In your workflow, open the agent node → add the Calendar Booking tool under <strong>Tools</strong></li>
        <li>Write the node prompt to tell the agent when and how to use each function</li>
      </ol>
      <h2>Function Reference</h2>
      <h3>check_availability</h3>
      <p>Checks what slots are free on a given date.</p>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>date</code></td><td>string</td><td>Yes</td><td>Date in ISO format (YYYY-MM-DD)</td></tr>
          <tr><td><code>duration_minutes</code></td><td>integer</td><td>No</td><td>Slot length in minutes. Default: 30</td></tr>
        </tbody>
      </table>
      <h3>book_appointment</h3>
      <p>Creates an appointment and saves it to the Lynq calendar. Returns an <code>appointment_id</code>.</p>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>start_time</code></td><td>string</td><td>Yes</td><td>Start datetime in ISO 8601 format</td></tr>
          <tr><td><code>end_time</code></td><td>string</td><td>Yes</td><td>End datetime in ISO 8601 format</td></tr>
          <tr><td><code>summary</code></td><td>string</td><td>Yes</td><td>Title of the appointment (e.g. &quot;Appointment - John&quot;)</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>No</td><td>Additional notes</td></tr>
          <tr><td><code>attendee_email</code></td><td>string</td><td>No</td><td>Email to invite (only if Google Calendar connected)</td></tr>
        </tbody>
      </table>
      <h3>cancel_appointment</h3>
      <p>Cancels an appointment using the <code>appointment_id</code> returned by <code>book_appointment</code>.</p>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>appointment_id</code></td><td>string</td><td>Yes</td><td>The UUID returned by book_appointment</td></tr>
        </tbody>
      </table>
      <h2>Example Node Prompt</h2>
      <pre>{`You are booking an appointment for the caller. Be warm and efficient.

1. Ask for their preferred date and time if you do not already have it.
2. Ask for their name if you do not already have it.
3. Once you have both, call book_appointment with:
   - start_time: their preferred time in ISO format (e.g. 2026-05-27T10:00:00Z)
   - end_time: 30 minutes after start_time
   - summary: "Appointment - {caller name}"
4. After booking confirm it: "I have booked your appointment for [date] at [time]."
5. Ask if there is anything else. If not, say goodbye and call end_call.

If the caller wants to cancel the appointment just booked, call
cancel_appointment with the appointment_id from the booking response.`}</pre>
      <h2>Google Calendar Sync (Optional)</h2>
      <ol>
        <li>Go to <strong>Settings → Integrations</strong></li>
        <li>Under <strong>Google Calendar</strong>, enter your Google Cloud OAuth credentials</li>
        <li>Click <strong>Connect Google Calendar</strong> and authorise access</li>
      </ol>
    </div>
  ),

  "http-api-tool": (
    <div>
      <h1>HTTP API Tool</h1>
      <p>
        HTTP API tools allow you to attach external REST API calls directly to workflow nodes, enabling your voice
        agents to call any internal or external system during live conversations based on LLM judgment and your prompts.
      </p>
      <h2>What is an HTTP API Tool?</h2>
      <p>An HTTP API Tool is a REST API definition that the LLM can invoke at runtime.</p>
      <p><strong>Typical use cases:</strong></p>
      <ul>
        <li>Call your own backend endpoints</li>
        <li>Trigger n8n automations</li>
        <li>Sync data with a CRM</li>
        <li>Fetch data from external APIs (weather, pricing, availability)</li>
        <li>Write/update/read data using REST API</li>
      </ul>
      <h2>Defining an HTTP API Tool</h2>
      <h3>Tool Name</h3>
      <p>Must be clear and action-oriented. Examples: <code>capture_lead_interest</code>, <code>fetch_weather</code>, <code>create_crm_contact</code></p>
      <h3>Tool Description</h3>
      <p>
        Extremely important — this is how the LLM decides <strong>when</strong> to use the tool. Write it in plain,
        explicit English.
      </p>
      <p><strong>Bad:</strong> &quot;API to capture data&quot;</p>
      <p><strong>Good:</strong> &quot;This tool captures interest. Use this tool when the user clearly expresses interest in the product or wants to be contacted.&quot;</p>
      <h3>Endpoint Configuration</h3>
      <ul>
        <li>Full URL (<strong>must include http:// or https://</strong>)</li>
        <li>Supports REST methods (GET, POST, PUT, DELETE)</li>
        <li>Add custom authentication headers as needed</li>
      </ul>
      <h3>Parameters</h3>
      <p>Each parameter must have: Name, Type, Description, Required/Optional flag.</p>
      <p><strong>Parameter descriptions matter more than types.</strong> Be explicit in what the value represents.</p>
      <pre>{`interest (string):
"Set to true if the user clearly shows intent to buy or wants follow-up. Otherwise false."`}</pre>
      <h2>Attaching Tools to Workflow Nodes</h2>
      <ul>
        <li>You can attach <strong>multiple tools to a single node</strong></li>
        <li>Tools are only callable when attached to that node</li>
        <li>Inside the node, guide the LLM using simple English instructions</li>
      </ul>
      <h2>Key Best Practices</h2>
      <ul>
        <li>Name tools clearly and use action-based names</li>
        <li>Write detailed, action-based descriptions</li>
        <li>Keep parameters simple at first</li>
        <li>Always include http/https in URLs</li>
        <li>Use plain English in node instructions</li>
        <li>Attach only relevant tools to each node</li>
      </ul>
      <p><strong>Well-defined tools + clear prompts = reliable, production-grade voice agents.</strong></p>
    </div>
  ),

  "model-configurations": (
    <div>
      <h1>Model Configurations</h1>
      <p>
        Voice Agents need AI Models to work: LLM (Large Language Model), TTS (Voice), and STT (Transcriber). You
        can use any provider with Lynq to run your Voice Agent.
      </p>
      <h2>How Model Configuration Works</h2>
      <p>Lynq uses a <strong>two-level configuration system</strong> for AI models:</p>
      <ol>
        <li><strong>Global configuration</strong> — a single set of model settings (LLM, TTS, STT) that applies to all agents by default</li>
        <li><strong>Agent-level overrides</strong> — optional per-agent settings that override the global configuration</li>
      </ol>
      <h2>Configuring Global Models</h2>
      <p>Go to <strong>Model Configurations</strong> in your dashboard and configure each service:</p>
      <table>
        <thead><tr><th>Service</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><strong>LLM</strong></td><td>The language model that generates responses (e.g. OpenAI GPT-4.1, Anthropic Claude)</td></tr>
          <tr><td><strong>TTS (Voice)</strong></td><td>Text-to-speech model that converts responses to audio (e.g. ElevenLabs, Cartesia)</td></tr>
          <tr><td><strong>STT (Transcriber)</strong></td><td>Speech-to-text model that transcribes user speech (e.g. Deepgram, AssemblyAI)</td></tr>
          <tr><td><strong>Realtime</strong></td><td>A single speech-to-speech model handling LLM, TTS, and STT in one (e.g. Gemini Live)</td></tr>
        </tbody>
      </table>
      <h2>Agent-Level Model Overrides</h2>
      <p>You can override the global model configuration for any individual agent:</p>
      <ol>
        <li>Open the agent you want to customize</li>
        <li>Go to <strong>Settings</strong> in the agent detail page</li>
        <li>Select the <strong>Model Overrides</strong> tab</li>
        <li>Toggle <strong>Override</strong> on for the service you want to change</li>
        <li>Configure the provider, model, and settings</li>
      </ol>
      <h2>Gemini Live (Realtime)</h2>
      <p>
        Gemini Live is Google&apos;s realtime multimodal API that handles both LLM and voice in a single model. Instead
        of configuring separate LLM, TTS, and STT services, Gemini Live acts as an all-in-one realtime provider.
      </p>
      <p>Available voices: Puck, Charon, Kore, Fenrir, Aoede</p>
      <p>
        When using a Realtime provider, you do <strong>not</strong> need separate TTS and STT services. However, you
        <strong> must</strong> still configure an LLM — it powers variable extraction and QA analysis.
      </p>
    </div>
  ),

  "llm-config": (
    <div>
      <h1>LLM Configuration</h1>
      <p>
        Voice Agents use LLMs (Large Language Models) to understand conversational context and respond to users.
        You can currently use OpenAI, Google, Groq, Azure, and Anthropic LLMs.
      </p>
      <h2>Available Providers</h2>
      <ul>
        <li><strong>OpenAI</strong> — GPT-4.1, GPT-4o, and other models</li>
        <li><strong>Google</strong> — Gemini models</li>
        <li><strong>Anthropic</strong> — Claude models</li>
        <li><strong>Groq</strong> — Fast inference for Llama, Mixtral models</li>
        <li><strong>Azure OpenAI</strong> — Enterprise Azure-hosted OpenAI models</li>
      </ul>
      <h2>Configuration</h2>
      <p>
        Go to <strong>Model Configurations</strong> in the dashboard. Select your LLM provider from the dropdown,
        enter your API key, and choose your model. If you don&apos;t find your model in the dropdown, you can always
        add a model manually.
      </p>
      <h2>Per-Agent LLM Override</h2>
      <p>
        To use a different LLM for a specific agent, go to that agent&apos;s settings → <strong>Model Overrides</strong>
        tab → toggle the LLM override on and configure the desired provider/model.
      </p>
    </div>
  ),

  "voice-config": (
    <div>
      <h1>Voice (TTS) Configuration</h1>
      <p>
        Voice Agents use TTS (Text-to-Speech) to generate audio for LLM responses. Lynq ships with ElevenLabs,
        Deepgram, OpenAI, and Cartesia TTS engines by default.
      </p>
      <h2>Supported TTS Providers</h2>
      <ul>
        <li><strong>ElevenLabs</strong> — High-quality, natural-sounding voices</li>
        <li><strong>Deepgram Aura</strong> — Fast, low-latency voices</li>
        <li><strong>OpenAI TTS</strong> — alloy, echo, fable, onyx, nova, shimmer</li>
        <li><strong>Cartesia</strong> — Ultra-low-latency TTS</li>
      </ul>
      <h2>Configuration</h2>
      <p>
        Go to <strong>Model Configurations</strong> in the dashboard. Under the <strong>Voice (TTS)</strong> section,
        select a provider and enter your API key. Choose a voice from the dropdown or add a voice ID manually for
        voices not listed.
      </p>
      <p>
        Refer to each provider&apos;s API documentation to find the voice IDs most relevant for your language requirement.
      </p>
    </div>
  ),

  "api-keys": (
    <div>
      <h1>API Keys</h1>
      <p>
        Lynq uses two types of keys: <strong>API Keys</strong> for authenticating programmatic access to the Lynq
        API, and <strong>Service Keys</strong> for accessing Lynq&apos;s own hosted AI models.
      </p>
      <h2>API Keys</h2>
      <p>
        API Keys authenticate requests to the Lynq REST API. Generate one from <strong>/api-keys</strong> in the
        dashboard.
      </p>
      <p>Include the API key in all requests using the <code>X-API-Key</code> header:</p>
      <pre>{`curl -H "X-API-Key: YOUR_API_KEY" https://api.lynq.naazailabs.com/api/v1/agents`}</pre>
      <h2>Key Permissions</h2>
      <p>Each API key has a permission level:</p>
      <ul>
        <li><strong>Read</strong> — can read agents, runs, and campaigns but cannot create or modify</li>
        <li><strong>Write</strong> — can create and modify agents, runs, and campaigns</li>
        <li><strong>Admin</strong> — full access including billing and user management</li>
      </ul>
      <h2>Key Rotation</h2>
      <p>
        Rotate API keys regularly for security. Old keys can be archived (deactivated) without deleting them, so
        you can track when they were last used.
      </p>
    </div>
  ),

  "telephony-overview": (
    <div>
      <h1>Telephony Integration</h1>
      <p>
        Lynq&apos;s telephony integration provides a unified interface for connecting with various telephony providers.
        The same configuration powers both outbound calls (initiated from Lynq) and inbound calls (received on a
        phone number you own).
      </p>
      <h2>Supported Providers</h2>
      <ul>
        <li><strong>Twilio</strong> — industry-leading cloud communications with global reach</li>
        <li><strong>Vonage</strong> — high-quality voice with 16kHz audio and excellent international coverage</li>
        <li><strong>Plivo</strong> — cloud communications with programmable voice and global PSTN reach</li>
        <li><strong>Telnyx</strong> — enterprise-grade communications</li>
        <li><strong>Cloudonix</strong> — SIP-based telephony with flexible trunk configuration</li>
        <li><strong>Vobiz</strong> — cloud-based telephony with global reach</li>
        <li><strong>Asterisk ARI</strong> — connect to your own Asterisk PBX</li>
      </ul>
      <h2>Configuration</h2>
      <ol>
        <li>Navigate to <strong>/telephony-configurations</strong> and click <strong>Add configuration</strong></li>
        <li>Select your provider</li>
        <li>Enter your credentials and save</li>
        <li>Open the new configuration and add at least one <strong>phone number</strong></li>
        <li>Optionally assign an <strong>Inbound workflow</strong> to a phone number to enable inbound calling</li>
      </ol>
      <h2>Common Features</h2>
      <ul>
        <li><strong>Outbound Calls</strong> — initiate calls to any phone number from a workflow or campaign</li>
        <li><strong>Inbound Calls</strong> — route incoming calls to the right voice agent</li>
        <li><strong>Call Transfer</strong> — transfer in-progress calls to a human or another number</li>
        <li><strong>Call Status Tracking</strong> — monitor call lifecycle events in real time</li>
        <li><strong>WebSocket Audio Streaming</strong> — real-time, bidirectional audio between caller and agent</li>
      </ul>
      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Calls not connecting</strong> — verify credentials, check phone number format (E.164 with country code), ensure webhook URLs are publicly accessible</li>
        <li><strong>Audio quality issues</strong> — check network bandwidth, latency, and WebSocket connection stability</li>
        <li><strong>Webhook validation failing</strong> — confirm auth tokens match between provider and Lynq configuration</li>
      </ul>
    </div>
  ),

  twilio: (
    <div>
      <h1>Twilio Integration</h1>
      <p>Twilio is a cloud communications platform. Lynq&apos;s Twilio integration provides seamless connectivity for your voice agents.</p>
      <h2>Prerequisites</h2>
      <ul>
        <li>A Twilio account</li>
        <li>Account SID and Auth Token from your Twilio Console</li>
        <li>At least one Twilio phone number</li>
        <li>Lynq instance running and accessible</li>
      </ul>
      <h2>Step 1: Get Twilio Credentials</h2>
      <ol>
        <li>Log in to your Twilio Console</li>
        <li>Find your <strong>Account SID</strong> and <strong>Auth Token</strong> on the dashboard</li>
        <li>Navigate to <strong>Phone Numbers → Manage → Active Numbers</strong></li>
        <li>Copy your phone number(s)</li>
      </ol>
      <h2>Step 2: Configure in Lynq</h2>
      <ol>
        <li>Navigate to <strong>/telephony-configurations</strong> and click <strong>Add configuration</strong></li>
        <li>Select <strong>Twilio</strong> as your provider</li>
        <li>Enter Account SID and Auth Token</li>
        <li>Click <strong>Save Configuration</strong></li>
        <li>Open the configuration and add at least one phone number in E.164 format (e.g. <code>+1234567890</code>)</li>
      </ol>
      <h2>Inbound Calling Setup</h2>
      <p>
        When you save an inbound workflow on a phone number, Lynq automatically pushes the webhook URL to that
        number&apos;s VoiceUrl in your Twilio account.
      </p>
      <ol>
        <li>In your Twilio configuration, edit the phone number</li>
        <li>Set its <strong>Inbound workflow</strong> to the agent that should answer</li>
        <li>Save — Lynq auto-configures the Twilio webhook</li>
      </ol>
      <p>
        If auto-push fails, manually set the webhook in Twilio Console: <strong>Phone Numbers → [your number] →
        Voice Configuration → Webhook</strong> = <code>https://api.lynq.naazailabs.com/api/v1/telephony/inbound/run</code>
      </p>
    </div>
  ),

  "inbound-calling": (
    <div>
      <h1>Inbound Calling</h1>
      <p>
        Inbound calling routes calls made <em>to</em> your phone number to the right Lynq voice agent automatically.
      </p>
      <h2>How Inbound Routing Works</h2>
      <ol>
        <li>A caller dials your phone number</li>
        <li>Your telephony provider sends a webhook to Lynq</li>
        <li>Lynq resolves which org owns that phone number</li>
        <li>Lynq routes the call to the agent assigned to that number as the <strong>Inbound workflow</strong></li>
        <li>The agent answers and the conversation begins</li>
      </ol>
      <h2>Setup</h2>
      <ol>
        <li>Go to <strong>Telephony Configurations</strong> in the dashboard</li>
        <li>Select your configuration and open the phone number you want to receive inbound calls</li>
        <li>Set the <strong>Inbound workflow</strong> to the agent that should handle calls to this number</li>
        <li>Save — Lynq automatically configures the webhook with your telephony provider</li>
      </ol>
      <h2>Inbound Webhook URL</h2>
      <p>Lynq uses a single org-wide inbound webhook URL:</p>
      <pre>{`https://api.lynq.naazailabs.com/api/v1/telephony/inbound/run`}</pre>
      <p>This URL handles calls from all configured providers and routes them to the correct agent.</p>
    </div>
  ),

  "workflow-schema": (
    <div>
      <h1>Workflow Definition Schema</h1>
      <p>
        The <code>workflow_definition</code> object defines the full conversation graph. It is the same structure
        the dashboard&apos;s visual workflow builder reads and writes — building an agent in the UI produces a
        <code>workflow_definition</code> under the hood.
      </p>
      <pre>{`{
  "nodes": [...],
  "edges": [...]
}`}</pre>
      <h2>Nodes</h2>
      <pre>{`{
  "id": "uuid-string",
  "type": "agentNode",
  "position": { "x": 100, "y": 200 },
  "data": { ... }
}`}</pre>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>string</td><td>Unique node ID (UUID recommended)</td></tr>
          <tr><td><code>type</code></td><td>string</td><td>startCall, endCall, agentNode, globalNode, trigger, webhook, qa</td></tr>
          <tr><td><code>position</code></td><td>object</td><td>Visual coordinates in the workflow builder</td></tr>
          <tr><td><code>data</code></td><td>object</td><td>Node configuration — fields vary by type</td></tr>
        </tbody>
      </table>
      <h2>Common Node Data Fields</h2>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>name</code></td><td>string</td><td>Display name for the node</td></tr>
          <tr><td><code>prompt</code></td><td>string</td><td>LLM system prompt</td></tr>
          <tr><td><code>allow_interrupt</code></td><td>boolean</td><td>Allow caller to interrupt mid-speech</td></tr>
          <tr><td><code>add_global_prompt</code></td><td>boolean</td><td>Merge the globalNode prompt into this node</td></tr>
          <tr><td><code>tool_uuids</code></td><td>string[]</td><td>IDs of tools attached to this node</td></tr>
          <tr><td><code>document_uuids</code></td><td>string[]</td><td>IDs of knowledge base documents</td></tr>
        </tbody>
      </table>
      <h2>Edges</h2>
      <pre>{`{
  "id": "edge-uuid",
  "source": "node-uuid-a",
  "target": "node-uuid-b",
  "data": {
    "label": "Customer confirms",
    "condition": "The customer has confirmed their appointment",
    "transition_speech": "Great, I've got that noted."
  }
}`}</pre>
      <h2>Minimal Example</h2>
      <pre>{`{
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
      "data": {
        "name": "End",
        "prompt": "Thank the caller and say goodbye."
      }
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
}`}</pre>
    </div>
  ),

  webhooks: (
    <div>
      <h1>Webhook Payloads</h1>
      <p>
        Lynq executes <strong>webhook nodes</strong> asynchronously after a workflow run completes. You configure
        the target URL, HTTP method, headers, and payload template directly in the workflow definition.
      </p>
      <h2>How Webhooks Work</h2>
      <ol>
        <li>A call completes (or a run finishes)</li>
        <li>Lynq executes any <code>webhook</code> nodes in the workflow asynchronously</li>
        <li>The payload template is rendered with the run&apos;s context and sent as JSON to your endpoint</li>
        <li>Non-200 responses are logged but do not block or retry by default</li>
      </ol>
      <h2>Payload Context Variables</h2>
      <table>
        <thead><tr><th>Variable</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>{"{{workflow_run_id}}"}</code></td><td>integer</td><td>ID of the completed run</td></tr>
          <tr><td><code>{"{{workflow_name}}"}</code></td><td>string</td><td>Name of the workflow</td></tr>
          <tr><td><code>{"{{campaign_id}}"}</code></td><td>integer | null</td><td>Campaign ID (null for ad-hoc runs)</td></tr>
          <tr><td><code>{"{{call_time}}"}</code></td><td>string</td><td>ISO-8601 UTC timestamp of call creation</td></tr>
          <tr><td><code>{"{{initial_context}}"}</code></td><td>object</td><td>Context passed when the call was initiated</td></tr>
          <tr><td><code>{"{{gathered_context}}"}</code></td><td>object</td><td>Data extracted during the call</td></tr>
          <tr><td><code>{"{{recording_url}}"}</code></td><td>string | null</td><td>Public download URL for the recording</td></tr>
          <tr><td><code>{"{{transcript_url}}"}</code></td><td>string | null</td><td>Public download URL for the transcript</td></tr>
        </tbody>
      </table>
      <h2>Example Payload Template</h2>
      <pre>{`{
  "run_id": "{{workflow_run_id}}",
  "customer": "{{initial_context.customer_name}}",
  "outcome": "{{gathered_context.resolution}}",
  "recording": "{{recording_url}}"
}`}</pre>
      <h2>Authentication</h2>
      <table>
        <thead><tr><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>NONE</code></td><td>No authentication</td></tr>
          <tr><td><code>API_KEY</code></td><td>Sends the key in a custom header (e.g. X-API-Key)</td></tr>
          <tr><td><code>BEARER_TOKEN</code></td><td>Sends Authorization: Bearer &lt;token&gt;</td></tr>
          <tr><td><code>BASIC_AUTH</code></td><td>HTTP Basic authentication</td></tr>
        </tbody>
      </table>
      <h2>Minimal Example Receiver (Python)</h2>
      <pre>{`from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhook/lynq")
async def handle_lynq_webhook(request: Request):
    payload = await request.json()
    run_id = payload.get("run_id")
    outcome = payload.get("outcome")
    # process the call result...
    return {"status": "ok"}`}</pre>
    </div>
  ),

  sdks: (
    <div>
      <h1>SDKs</h1>
      <p>
        Lynq ships official SDKs for <strong>Python</strong> and <strong>TypeScript</strong> that wrap the Lynq
        REST API and the workflow builder. Use them to create or edit agents, place outbound calls, and inspect
        runs from your own code.
      </p>
      <h2>Install</h2>
      <pre>{`# Python
pip install dograh-sdk

# TypeScript / Node.js
npm install @dograh/sdk`}</pre>
      <h2>Authenticate</h2>
      <p>
        Generate an API key at <strong>/api-keys</strong> in the dashboard. Both SDKs read the API key from the
        <code>DOGRAH_API_KEY</code> environment variable by default.
      </p>
      <pre>{`# Python
from dograh_sdk import DograhClient

client = DograhClient(
    base_url="https://api.lynq.naazailabs.com",
    api_key="YOUR_API_KEY",
)`}</pre>
      <pre>{`// TypeScript
import { DograhClient } from "@dograh/sdk";

const client = new DograhClient({
    baseUrl: "https://api.lynq.naazailabs.com",
    apiKey: "YOUR_API_KEY",
});`}</pre>
      <h2>Quick Tour</h2>
      <p>List the agents in your workspace:</p>
      <pre>{`# Python
workflows = client.list_workflows()
for wf in workflows:
    print(wf.id, wf.name)

# TypeScript
const workflows = await client.listWorkflows();
for (const wf of workflows) {
    console.log(wf.id, wf.name);
}`}</pre>
      <h2>Place an Outbound Call</h2>
      <pre>{`# Python
call = client.trigger_call(
    workflow_id="your-workflow-uuid",
    phone_number="+14155550100",
    initial_context={
        "customer_name": "Jane Smith",
        "plan": "premium"
    }
)
print("Call started:", call.run_id)`}</pre>
      <h2>Next Steps</h2>
      <ul>
        <li>See the <strong>API Reference</strong> tab for full endpoint documentation</li>
        <li>Use the <strong>MCP Server</strong> to drive Lynq from Claude, Cursor, or other AI tools</li>
      </ul>
    </div>
  ),
};

function SidebarItem({
  id,
  title,
  active,
  onClick,
}: {
  id: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
        active
          ? "bg-green-50 text-green-700 font-medium dark:bg-green-900/30 dark:text-green-400"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      )}
    >
      {title}
    </button>
  );
}

function SidebarSection({
  section,
  activeId,
  onSelect,
}: {
  section: (typeof sections)[0];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {section.title}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-0.5">
          {section.items.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              title={item.title}
              active={activeId === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState("introduction");
  const [search, setSearch] = useState("");

  const filteredSections = search
    ? sections.map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          i.title.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : sections;

  const activeContent = content[activeId];

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Book className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-900 dark:text-white">Documentation</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredSections.map((section) => (
            <SidebarSection
              key={section.id}
              section={section}
              activeId={activeId}
              onSelect={setActiveId}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h1:mb-4 prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-p:text-gray-600 prose-p:leading-relaxed dark:prose-p:text-gray-400 prose-li:text-gray-600 dark:prose-li:text-gray-400 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-green-700 prose-code:bg-green-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm dark:prose-code:text-green-400 dark:prose-code:bg-green-900/20 prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-th:text-gray-700 dark:prose-th:text-gray-300 prose-td:text-gray-600 dark:prose-td:text-gray-400 prose-blockquote:border-green-500 prose-blockquote:bg-green-50 prose-blockquote:p-3 prose-blockquote:rounded-md dark:prose-blockquote:bg-green-900/20">
            {activeContent ?? (
              <div className="text-gray-400">Select a topic from the sidebar.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
