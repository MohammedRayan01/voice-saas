"use client";

import {
  AudioLines,
  Bot,
  ChevronRight,
  Megaphone,
  Mic,
  Phone,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

interface OverviewStats {
  totalCalls: string;
  activeAgents: string;
  campaigns: string;
  minutesUsed: string;
}

const QUICK_ACTIONS = [
  {
    title: "Build a Voice Agent",
    description: "Design conversational AI flows with the visual editor",
    href: "/workflow",
    icon: Bot,
    primary: true,
  },
  {
    title: "Launch a Campaign",
    description: "Run bulk outbound calls with smart retry logic",
    href: "/campaigns",
    icon: Megaphone,
    primary: false,
  },
  {
    title: "Configure Telephony",
    description: "Connect Twilio, Vonage, Plivo or other providers",
    href: "/telephony-configurations",
    icon: Phone,
    primary: false,
  },
  {
    title: "Manage Team",
    description: "Invite members and manage roles",
    href: "/settings",
    icon: Users,
    primary: false,
  },
];

export default function OverviewPage() {
  const { user, loading: authLoading, getAccessToken } = useAuth();
  const firstName = user?.displayName?.split(" ")[0];
  const hasFetched = useRef(false);
  const [stats, setStats] = useState<OverviewStats>({ totalCalls: "—", activeAgents: "—", campaigns: "—", minutesUsed: "—" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [usageRes, workflowRes, campaignRes] = await Promise.all([
          fetch("/api/v1/organizations/usage/current-period", { headers: h }),
          fetch("/api/v1/workflow/count", { headers: h }),
          fetch("/api/v1/campaign/", { headers: h }),
        ]);
        const updates: Partial<OverviewStats> = {};
        if (usageRes.ok) {
          const u = await usageRes.json();
          const mins = Math.round((u.total_duration_seconds ?? 0) / 60);
          updates.minutesUsed = mins.toString();
        }
        if (workflowRes.ok) {
          const w = await workflowRes.json();
          updates.activeAgents = (w.active ?? w.total ?? 0).toString();
          updates.totalCalls = (w.total_runs ?? "—").toString();
        }
        if (campaignRes.ok) {
          const c = await campaignRes.json();
          const running = Array.isArray(c.campaigns)
            ? c.campaigns.filter((x: { status: string }) => x.status === "in_progress").length
            : 0;
          updates.campaigns = running.toString();
        }
        setStats((s) => ({ ...s, ...updates }));
      } catch {
        // silent — stats stay as "—"
      }
    })();
  }, [authLoading, user]);

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 right-16 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2 text-blue-100 text-sm font-medium">
            <Zap className="h-4 w-4" />
            <span>Lynq Platform</span>
          </div>
          <h1 className="text-3xl font-bold">
            {firstName ? `Good to see you, ${firstName}` : "Welcome to Lynq"}
          </h1>
          <p className="mt-2 max-w-lg text-blue-100">
            Build, deploy, and manage intelligent voice agents — from inbound support to
            outbound campaigns, all in one place.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="bg-white text-primary hover:bg-blue-50 font-semibold shadow-sm">
              <Link href="/workflow">
                <Mic className="mr-2 h-4 w-4" />
                New Voice Agent
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
              <Link href="/campaigns">
                Run Campaign
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bento */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Calls", value: stats.totalCalls, sub: "This month", icon: Phone, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Active Agents", value: stats.activeAgents, sub: "Deployed", icon: Bot, color: "text-violet-500", bg: "bg-violet-50" },
          { label: "Campaigns", value: stats.campaigns, sub: "Running now", icon: Megaphone, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Minutes Used", value: stats.minutesUsed, sub: "This month", icon: AudioLines, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <div className={`${stat.bg} ${stat.color} rounded-xl p-2.5`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <Link href="/workflow" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className={`group h-full cursor-pointer border-border/60 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${action.primary ? "ring-1 ring-primary/20" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className={`mb-3 w-fit rounded-xl p-2.5 ${action.primary ? "gradient-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-primary"} transition-colors`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold leading-snug">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info strip */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground text-sm">Default voice model: Gemini 2.5 Flash Native Audio</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            STT + LLM + TTS in a single WebSocket — ultra-low latency at ~$0.023/min. Switch to premium pipeline per agent in Model Configurations.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 border-blue-200 text-primary hover:bg-blue-100">
          <Link href="/model-configurations">Configure</Link>
        </Button>
      </div>
    </div>
  );
}
