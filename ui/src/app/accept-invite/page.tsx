"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

function AcceptInviteInner() {
  const { user, loading: authLoading, getAccessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasAccepted = useRef(false);

  const [state, setState] = useState<"working" | "success" | "error" | "no-auth">("working");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (authLoading || hasAccepted.current) return;
    if (!user) {
      setState("no-auth");
      return;
    }
    if (!token) {
      setState("error");
      setMessage("This invite link is missing its token. Ask your teammate to send it again.");
      return;
    }
    hasAccepted.current = true;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        const res = await fetch("/api/v1/organizations/members/accept-invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setState("success");
          setTimeout(() => router.push("/overview"), 1500);
        } else {
          const data = await res.json().catch(() => ({}));
          setState("error");
          setMessage(data.detail ?? "Invalid or expired invite link.");
        }
      } catch {
        setState("error");
        setMessage("Network error — please try again.");
      }
    })();
  }, [authLoading, user, token, getAccessToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Team Invitation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-8 text-center">
          {state === "working" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Accepting your invite…</p>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm">You&apos;ve joined the organization. Redirecting…</p>
            </>
          )}
          {state === "error" && (
            <>
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button variant="outline" onClick={() => router.push("/overview")}>Go to dashboard</Button>
            </>
          )}
          {state === "no-auth" && (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in (or create an account) first, then open this invite link again.
              </p>
              <Button onClick={() => router.push("/auth/login")}>Sign in</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteInner />
    </Suspense>
  );
}
