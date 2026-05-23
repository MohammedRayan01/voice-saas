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
  const [embedToken, setEmbedToken] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [domains, setDomains] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!workflowId.trim()) return;
    setGenerating(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/v1/embed/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          workflow_id: workflowId,
          domain_whitelist: domains.split(",").map((d) => d.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmbedToken(data.token ?? data.embed_token ?? "");
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const snippet = embedToken
    ? `<script src="https://cdn.yourdomain.com/widget.js"></script>\n<script>\n  VoiceWidget.init({\n    token: '${embedToken}',\n    workflowId: '${workflowId}'\n  });\n</script>`
    : "";

  const handleCopy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
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
              Add a floating voice button to any website. Visitors can speak to your AI agent directly in the browser via WebRTC — no phone number needed.
            </p>
          </div>
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
              placeholder="Enter your workflow ID"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              className="mt-1.5"
            />
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
            <p className="text-xs text-muted-foreground mt-1">Comma-separated. Leave empty to allow all origins.</p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !workflowId.trim()}
            className="gradient-primary text-white"
          >
            {generating ? "Generating…" : "Generate Token"}
          </Button>
        </CardContent>
      </Card>

      {/* Embed snippet */}
      {snippet && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="h-4 w-4 text-primary" />
                Embed Snippet
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
              {snippet}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
