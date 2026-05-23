"use client";

import { Calculator, Check, Info, Phone, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

// ─── Plan definitions ────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceINR: 2999,
    minutesIncluded: 500,
    seats: 2,
    overage: null, // no overage — capped
    features: ["Inbound calls only", "Visual workflow builder", "Basic analytics", "Email support"],
    color: "border-border",
    badge: null,
  },
  {
    id: "growth",
    name: "Growth",
    priceINR: 7999,
    minutesIncluded: 2000,
    seats: 5,
    overage: 6, // ₹6 per extra minute
    features: ["Inbound + outbound", "Campaign engine", "Web voice widget", "Webhooks & integrations", "Priority support"],
    color: "border-primary ring-2 ring-primary",
    badge: "Most Popular",
  },
  {
    id: "scale",
    name: "Scale",
    priceINR: 24999,
    minutesIncluded: Infinity,
    seats: 20,
    overage: 0,
    features: ["Everything in Growth", "Unlimited minutes", "SLA guarantee", "Dedicated success manager"],
    color: "border-border",
    badge: null,
  },
];

// AI cost: Gemini Live ~₹1.92/min (≈$0.023 at ₹83/USD)
const GEMINI_COST_PER_MIN_INR = 1.92;
const USD_TO_INR = 83;

function formatINR(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function RecommendedBadge() {
  return (
    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
      Recommended
    </Badge>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PricingCalculator() {
  const [minutesPerMonth, setMinutesPerMonth] = useState(500);
  const [seats, setSeats] = useState(2);
  const [callsPerMonth, setCallsPerMonth] = useState(100);

  const avgCallDuration = minutesPerMonth > 0 && callsPerMonth > 0
    ? (minutesPerMonth / callsPerMonth).toFixed(1)
    : "0";

  // Cost per plan
  const planCosts = useMemo(() => {
    return PLANS.map((plan) => {
      const aiCost = minutesPerMonth * GEMINI_COST_PER_MIN_INR;

      let platformCost: number;
      let overageNote: string | null = null;

      if (minutesPerMonth <= plan.minutesIncluded || plan.minutesIncluded === Infinity) {
        platformCost = plan.priceINR;
      } else {
        const overageMins = minutesPerMonth - plan.minutesIncluded;
        const overageCost = plan.overage ? overageMins * plan.overage : 0;
        platformCost = plan.priceINR + overageCost;
        overageNote = plan.overage
          ? `+${overageMins} overage mins @ ₹${plan.overage}/min`
          : "Plan cap reached — upgrade needed";
      }

      const total = platformCost + aiCost;
      const perCall = callsPerMonth > 0 ? total / callsPerMonth : 0;
      const perMinute = minutesPerMonth > 0 ? total / minutesPerMonth : 0;

      const seatsFit = seats <= plan.seats;

      return {
        ...plan,
        platformCost,
        aiCost,
        total,
        perCall,
        perMinute,
        overageNote,
        seatsFit,
        eligible: seatsFit && (minutesPerMonth <= plan.minutesIncluded || plan.minutesIncluded === Infinity || plan.overage !== null),
      };
    });
  }, [minutesPerMonth, seats, callsPerMonth]);

  // Best plan = cheapest eligible
  const bestPlan = planCosts.reduce<typeof planCosts[0] | null>((best, p) => {
    if (!p.eligible) return best;
    if (!best) return p;
    return p.total < best.total ? p : best;
  }, null);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Cost Calculator</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Adjust your expected usage below to find the right plan and estimate your monthly bill.
        </p>
      </div>

      {/* Sliders */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Minutes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total call minutes / month</span>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">
                {minutesPerMonth.toLocaleString()} min
              </span>
            </div>
            <Slider
              min={100}
              max={10000}
              step={100}
              value={[minutesPerMonth]}
              onValueChange={([v]) => setMinutesPerMonth(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>100 min</span>
              <span>5,000</span>
              <span>10,000 min</span>
            </div>
          </div>

          {/* Calls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Number of calls / month</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-xs text-muted-foreground">~{avgCallDuration} min/call avg</span>
                <span className="text-sm font-bold text-primary tabular-nums">
                  {callsPerMonth.toLocaleString()} calls
                </span>
              </div>
            </div>
            <Slider
              min={10}
              max={5000}
              step={10}
              value={[callsPerMonth]}
              onValueChange={([v]) => setCallsPerMonth(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>10 calls</span>
              <span>2,500</span>
              <span>5,000 calls</span>
            </div>
          </div>

          {/* Seats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Team members</span>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">
                {seats} seat{seats !== 1 ? "s" : ""}
              </span>
            </div>
            <Slider
              min={1}
              max={25}
              step={1}
              value={[seats]}
              onValueChange={([v]) => setSeats(v)}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>1 seat</span>
              <span>13</span>
              <span>25 seats</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI cost info */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 p-3.5 text-sm text-blue-800 dark:text-blue-200">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium">AI cost included in estimates.</span>
          {" "}Lynq uses Gemini Live for voice AI — approximately{" "}
          <span className="font-semibold">₹1.92/min</span> (≈ $0.023/min).
          This is charged by Google and passed through at cost. Platform subscription fee is separate.
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Estimated Monthly Cost
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {planCosts.map((plan) => {
            const isRecommended = bestPlan?.id === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative border transition-all shadow-sm ${plan.color} ${
                  !plan.eligible ? "opacity-50 grayscale-[30%]" : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold shadow-sm px-2.5 py-0.5">
                      <Zap className="mr-1 h-2.5 w-2.5" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isRecommended && <RecommendedBadge />}
                  </div>
                  <CardDescription className="text-xs">
                    ₹{plan.priceINR.toLocaleString("en-IN")}/mo platform
                    {plan.minutesIncluded !== Infinity
                      ? ` · ${plan.minutesIncluded.toLocaleString()} min included`
                      : " · unlimited minutes"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Cost breakdown */}
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Platform</span>
                      <span>{formatINR(plan.platformCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>AI ({minutesPerMonth.toLocaleString()} min × ₹1.92)</span>
                      <span>{formatINR(plan.aiCost)}</span>
                    </div>
                    {plan.overageNote && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 pt-0.5">
                        ⚠ {plan.overageNote}
                      </div>
                    )}
                    <div className="border-t border-border/60 pt-1.5 flex justify-between font-semibold text-sm">
                      <span>Total / month</span>
                      <span className={isRecommended ? "text-primary" : ""}>
                        {formatINR(plan.total)}
                      </span>
                    </div>
                  </div>

                  {/* Per-unit costs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/30 p-2 text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">per call</div>
                      <div className="text-xs font-semibold">
                        {formatINR(plan.perCall)}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2 text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">per minute</div>
                      <div className="text-xs font-semibold">
                        ₹{plan.perMinute.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-start gap-1.5 text-[11px] ${plan.eligible ? "text-foreground" : "text-muted-foreground"}`}>
                        <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                    {!plan.seatsFit && (
                      <li className="flex items-start gap-1.5 text-[11px] text-destructive">
                        <span className="mt-0.5">✕</span>
                        Only {plan.seats} seat{plan.seats !== 1 ? "s" : ""} — your team needs {seats}
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Summary callout */}
      {bestPlan && (
        <Card className="border-primary/30 bg-primary/5 shadow-none">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  Best value for your usage: <span className="text-primary">{bestPlan.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  At {minutesPerMonth.toLocaleString()} min/mo across {callsPerMonth.toLocaleString()} calls with {seats} team member{seats !== 1 ? "s" : ""},
                  your estimated total is{" "}
                  <span className="font-medium text-foreground">{formatINR(bestPlan.total)}/month</span>
                  {" "}({formatINR(bestPlan.perCall)}/call · ₹{bestPlan.perMinute.toFixed(2)}/min).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fine print */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Estimates are indicative. AI costs (Gemini Live) are billed by Google at ~$0.023/min and converted at ₹83/USD.
        Overage rates apply on Growth plan only. Scale plan includes unlimited minutes.
        Actual costs may vary based on call duration, model usage, and currency exchange rates.
      </p>
    </div>
  );
}
