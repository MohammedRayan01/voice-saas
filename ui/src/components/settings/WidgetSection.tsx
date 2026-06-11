"use client";

import { Check, Code, Copy, Globe, Mic } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function WidgetSection() {
  const { getAccessToken } = useAuth();
  const [workflowId, setWorkflowId] = useState("");
  const [domains, setDomains] = useState("");
  const [embedScript, setEmbedScript] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    const id = parseInt(workflowId.trim(), 10);
    if (!id || isNaN(id)) {
      setError("Please enter a valid numeric workflow ID.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const token = await getAccessToken();
      const allowedDomains = domains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await fetch(`/api/v1/workflow/${id}/embed-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          allowed_domains: allowedDomains.length > 0 ? allowedDomains : null,
          settings: { embedMode: "floating", position: "bottom-right" },
          usage_limit: null,
          expires_in_days: null,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        setError(`Failed to generate token (${res.status}). Check that the workflow ID exists.`);
        console.error("Embed token error:", detail);
        return;
      }

      const data = await res.json();
      setEmbedScript(data.embed_script ?? "");
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!embedScript) return;
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Info */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 pt-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary text-white">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Embeddable Voice Widget</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add a floating voice button to any website. Visitors can speak to your AI agent
              directly in the browser via WebRTC — no phone number needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tip: use per-workflow configure */}
      <Card className="border-amber-100 bg-amber-50/40">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Tip:</span> For full widget customisation (button
            colour, embed mode, domain whitelist), open a specific workflow → Settings →{" "}
            <span className="font-semibold">Add to Website</span> tab and click{" "}
            <span className="font-semibold">Configure Widget</span>.
          </p>
        </CardContent>
      </Card>

      {/* Generate token */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Generate Embed Token
          </CardTitle>
          <CardDescription>Each token is tied to a specific workflow and domain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="wf-id">Workflow ID</Label>
            <Input
              id="wf-id"
              placeholder="e.g. 42"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Found in the workflow URL: /workflow/<strong>42</strong>/settings
            </p>
          </div>
          <div>
            <Label htmlFor="domains">Allowed Domains</Label>
            <Input
              id="domains"
              placeholder="example.com, app.yoursite.com"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated. Leave empty to allow all origins.
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button
            onClick={handleGenerate}
            disabled={generating || !workflowId.trim()}
            className="gradient-primary text-white"
          >
            {generating ? "Generating…" : "Generate Embed Script"}
          </Button>
        </CardContent>
      </Card>

      {/* Embed snippet */}
      {embedScript && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="h-4 w-4 text-primary" />
                Embed Script
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <CardDescription>Paste this before the closing &lt;/body&gt; tag.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-xl bg-muted p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
              {embedScript}
            </pre>
            <p className="text-xs text-muted-foreground mt-3">
              The script tag loads the real widget from your Lynq deployment. Token is embedded
              in the URL — configuration changes in workflow settings apply automatically without
              re-pasting this snippet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
