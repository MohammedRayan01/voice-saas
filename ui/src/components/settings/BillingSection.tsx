"use client";

import { Check, CreditCard, Loader2, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

interface BillingStatus {
  plan: string;
  subscription_status: string | null;
  minutes_limit: number | null;
  seats_limit: number | null;
  trial_ends_at: string | null;
  current_period_minutes: number;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "₹2,999",
    period: "/mo",
    minutes: "500 min",
    seats: "2 seats",
    features: ["Inbound calls only", "Visual workflow builder", "Basic analytics", "Email support"],
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹7,999",
    period: "/mo",
    minutes: "2,000 min",
    seats: "5 seats",
    features: ["Inbound + outbound", "Campaign engine", "Web voice widget", "Webhooks & integrations", "Priority support"],
    highlight: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "₹24,999",
    period: "/mo",
    minutes: "Unlimited",
    seats: "20 seats",
    features: ["Everything in Growth", "SLA guarantee", "Custom integrations", "Dedicated success manager"],
    highlight: false,
  },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

export function BillingSection() {
  const { user, loading: authLoading, getAccessToken } = useAuth();
  const hasFetched = useRef(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    fetchStatus();
  }, [authLoading, user]);

  const authHeaders = async (extra?: Record<string, string>) => {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/billing/status", { headers: await authHeaders() });
      if (res.ok) setStatus(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.payment_link) {
        window.open(data.payment_link, "_blank");
      } else {
        alert(data.detail ?? "Razorpay not configured yet");
      }
    } catch {
      // silent
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlan = status?.plan ?? "free";
  const minutesUsed = status?.current_period_minutes ?? 0;
  const minutesLimit = status?.minutes_limit;
  const usagePct = minutesLimit ? Math.min((minutesUsed / minutesLimit) * 100, 100) : 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Current plan summary */}
      {!loading && status && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" />
                Current Plan
              </CardTitle>
              {status.subscription_status && (
                <Badge className={`text-xs capitalize ${STATUS_COLORS[status.subscription_status] ?? "bg-gray-100 text-gray-600"}`}>
                  {status.subscription_status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold capitalize">{currentPlan}</span>
              {status.trial_ends_at && (
                <span className="text-sm text-muted-foreground">
                  Trial ends {new Date(status.trial_ends_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {minutesLimit && (
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Minutes used this month</span>
                  <span>{minutesUsed} / {minutesLimit}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usagePct > 90 ? "bg-destructive" : usagePct > 70 ? "bg-amber-500" : "gradient-primary"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Plans</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative border-border/60 transition-all ${plan.highlight ? "ring-2 ring-primary shadow-md" : "shadow-sm"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-white border-0 px-3 py-0.5 text-xs font-semibold shadow-sm">
                      <Zap className="mr-1 h-3 w-3" />
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </CardDescription>
                  <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                    <span>{plan.minutes}</span>
                    <span>·</span>
                    <span>{plan.seats}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${isCurrentPlan ? "" : plan.highlight ? "gradient-primary text-white" : ""}`}
                    variant={isCurrentPlan ? "outline" : plan.highlight ? "default" : "outline"}
                    disabled={isCurrentPlan || upgrading !== null}
                    onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                  >
                    {upgrading === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isCurrentPlan ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
