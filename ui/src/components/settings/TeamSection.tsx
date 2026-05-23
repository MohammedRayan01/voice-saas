"use client";

import { Crown, Mail, MoreHorizontal, Shield, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";

type Role = "owner" | "admin" | "member" | "viewer";

interface Member {
  id: number;
  user_id: string;
  invite_email: string | null;
  role: Role;
  accepted_at: string | null;
}

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_ICONS: Record<Role, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Users,
};

const ROLE_COLORS: Record<Role, string> = {
  owner: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  member: "bg-emerald-100 text-emerald-700 border-emerald-200",
  viewer: "bg-gray-100 text-gray-600 border-gray-200",
};

export function TeamSection() {
  const { user, loading: authLoading, getAccessToken } = useAuth();
  const hasFetched = useRef(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    fetchMembers();
  }, [authLoading, user]);

  const authHeaders = async () => {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/organizations/members", { headers: await authHeaders() });
      if (res.ok) setMembers(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/v1/organizations/members/invite", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setSuccess(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        await fetchMembers();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Failed to send invite");
      }
    } catch {
      setError("Network error");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      await fetch(`/api/v1/organizations/members/${memberId}`, { method: "DELETE", headers: await authHeaders() });
      await fetchMembers();
    } catch {
      // silent
    }
  };

  const handleRoleChange = async (memberId: number, newRole: Role) => {
    try {
      await fetch(`/api/v1/organizations/members/${memberId}`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      await fetchMembers();
    } catch {
      // silent
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Invite card */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite Team Member
          </CardTitle>
          <CardDescription>Add colleagues to your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gradient-primary text-white">
              <Mail className="mr-2 h-4 w-4" />
              {inviting ? "Sending…" : "Invite"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
        </CardContent>
      </Card>

      {/* Members list */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No members yet. Invite someone above.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => {
                const RoleIcon = ROLE_ICONS[m.role];
                return (
                  <div key={m.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary text-xs font-semibold">
                        {(m.invite_email ?? m.user_id ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.invite_email ?? m.user_id}</p>
                        {!m.accepted_at && (
                          <p className="text-xs text-amber-600">Pending invite</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-xs border ${ROLE_COLORS[m.role]} flex items-center gap-1`} variant="outline">
                        <RoleIcon className="h-2.5 w-2.5" />
                        {ROLE_LABELS[m.role]}
                      </Badge>
                      {m.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["admin", "member", "viewer"] as Role[]).map((r) => (
                              <DropdownMenuItem key={r} onClick={() => handleRoleChange(m.id, r)} className={m.role === r ? "font-medium text-primary" : ""}>
                                Change to {ROLE_LABELS[r]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={() => handleRemove(m.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
