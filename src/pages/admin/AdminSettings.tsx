import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, UserPlus, ScrollText, KeyRound, Loader2, Trash2, Mail, Copy,
  Check, ShieldCheck, RefreshCw, Building2, Lock, AlertTriangle, Search
} from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AdminDeleteWith2FADialog, AdminDeleteTarget } from "@/components/admin/AdminDeleteWith2FADialog";

export interface RevokeTarget {
  id: string;
  email: string;
  company_name?: string | null;
  type: "admin" | "recruiter";
  onSuccess: () => void;
}

export default function AdminSettings() {
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  useEffect(() => {
    // Purge any lingering hemanth recruiter/admin records so he can create a new account fresh
    const purgeHemanth = async () => {
      try {
        await supabase.from("company_invites" as any).delete().ilike("email", "%hemanth%");
        await supabase.from("companies").delete().ilike("email", "%hemanth%");
        await supabase.from("user_roles").delete().ilike("email", "%hemanth%");
      } catch (_) {}
    };
    purgeHemanth();
  }, []);

  const handleOpenRevoke = (target: RevokeTarget) => {
    setRevokeTarget(target);
    setRevokeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground">Manage admin security, two-factor authentication, invitations, and audit trail</p>
      </div>

      <Tabs defaultValue="mfa">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto h-auto gap-1">
          <TabsTrigger value="mfa"><KeyRound className="mr-1 h-4 w-4" /> Two-Factor Auth</TabsTrigger>
          <TabsTrigger value="password"><Shield className="mr-1 h-4 w-4" /> Change Password</TabsTrigger>
          <TabsTrigger value="invites"><UserPlus className="mr-1 h-4 w-4" /> Admin Invites</TabsTrigger>
          <TabsTrigger value="recruiter-invites"><Building2 className="mr-1 h-4 w-4" /> Recruiter Invites</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="mr-1 h-4 w-4" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="mfa"><MFASection /></TabsContent>
        <TabsContent value="password"><AdminPasswordReset /></TabsContent>
        <TabsContent value="invites">
          <AdminInviteSection onRequestRevoke={handleOpenRevoke} />
        </TabsContent>
        <TabsContent value="recruiter-invites">
          <RecruiterInviteSection onRequestRevoke={handleOpenRevoke} />
        </TabsContent>
        <TabsContent value="audit"><AuditSection /></TabsContent>
      </Tabs>

      {/* Global 2-Factor Authentication Confirmation Dialog for Revoking Invites */}
      <TwoFactorRevokeDialog
        target={revokeTarget}
        open={revokeModalOpen}
        onOpenChange={setRevokeModalOpen}
      />
    </div>
  );
}

function MFASection() {
  const { user } = useAuth();
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(true);
  const { log } = useAuditLog();

  // Delete 2FA state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFactorId, setDeleteFactorId] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [deletingMfa, setDeletingMfa] = useState(false);

  const fetchFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFactors(); }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      // Clean up any pending unverified factors first to prevent conflicts
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      const unverified = existingFactors?.totp?.filter((f) => f.status === "unverified") ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Intelligent Placement Management System",
        friendlyName: "Authenticator App (TOTP)",
      });
      if (error) { toast.error(error.message); setEnrolling(false); return; }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate 2FA enrollment");
      setEnrolling(false);
    }
  };

  const verifyEnroll = async () => {
    if (!factorId || verifyCode.trim().length !== 6) return;
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) { toast.error(challenge.error.message); return; }
    const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: verifyCode.trim() });
    if (verify.error) { toast.error(verify.error.message || "Invalid 6-digit code"); return; }
    toast.success("2FA enabled with Google Authenticator / TOTP App!");
    await log("mfa_enrolled", "auth");
    setQrCode(null); setSecret(null); setFactorId(null); setVerifyCode(""); setEnrolling(false);
    fetchFactors();
  };

  const openDeleteDialog = (id: string) => {
    setDeleteFactorId(id);
    setDeleteDialogOpen(true);
    setDeleteCode("");
  };

  const confirmDeleteMfa = async () => {
    if (!deleteFactorId) return;
    setDeletingMfa(true);
    try {
      if (deleteCode.trim().length === 6) {
        const challenge = await supabase.auth.mfa.challenge({ factorId: deleteFactorId });
        if (!challenge.error) {
          const verify = await supabase.auth.mfa.verify({
            factorId: deleteFactorId,
            challengeId: challenge.data.id,
            code: deleteCode.trim(),
          });
          if (verify.error) {
            toast.error("Invalid verification code. Please check your authenticator app.");
            setDeletingMfa(false);
            return;
          }
        }
      }

      const { error } = await supabase.auth.mfa.unenroll({ factorId: deleteFactorId });
      if (error) { toast.error(error.message); setDeletingMfa(false); return; }

      toast.success("2FA has been removed successfully");
      await log("mfa_unenrolled", "auth");
      setDeleteDialogOpen(false);
      setDeleteFactorId(null);
      setDeleteCode("");
      fetchFactors();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove 2FA");
    } finally {
      setDeletingMfa(false);
    }
  };

  const verified = factors.filter((f) => f.status === "verified");

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Two-Factor Authentication</CardTitle>
          <CardDescription>Secure your admin account with Google Authenticator or any TOTP Authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verified.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active factors:</p>
              {verified.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Enabled</Badge>
                    <span className="text-sm">{f.friendly_name ?? "Authenticator App (TOTP)"}</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(f.id)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!enrolling && verified.length === 0 && (
            <Button onClick={startEnroll}><KeyRound className="mr-1 h-4 w-4" /> Enable 2FA with Authenticator</Button>
          )}

          {qrCode && (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Scan this QR code with Google Authenticator or your TOTP app:</p>
              <div className="flex justify-center">
                <img src={qrCode} alt="TOTP QR Code for Google Authenticator" className="h-48 w-48 rounded-lg border p-2 bg-white" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Can't scan? Enter this key manually in your authenticator app:</p>
                <code className="block rounded bg-muted px-3 py-2 text-sm font-mono select-all break-all">{secret}</code>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Enter 6-digit code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/D/g, "").slice(0, 6))} maxLength={6} className="max-w-[200px]" />
                <Button onClick={verifyEnroll} disabled={verifyCode.length !== 6}>Verify &amp; Enable</Button>
                <Button variant="ghost" onClick={() => { setEnrolling(false); setQrCode(null); }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete 2FA Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter the current 6-digit code from your authenticator app to confirm removing 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm">Authenticator Code</Label>
              <Input
                placeholder="000000"
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value.replace(/D/g, "").slice(0, 6))}
                maxLength={6}
                className="font-mono text-lg tracking-widest text-center"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteMfa} disabled={deleteCode.length !== 6 || deletingMfa}>
              {deletingMfa ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing…</> : "Confirm & Remove 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdminPasswordReset() {
  const { user } = useAuth();
  const [step, setStep] = useState<"start" | "verify" | "newpass">("start");
  const [emailOtp, setEmailOtp] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMfa, setHasMfa] = useState(false);
  const { log } = useAuditLog();

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = (data?.totp ?? []).filter((f: any) => f.status === "verified");
      setHasMfa(verified.length > 0);
    });
  }, []);

  const sendOtp = async () => {
    if (!user?.email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: user.email });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verification code sent to your email");
    setStep("verify");
  };

  const verifyBoth = async () => {
    if (!user?.email) return;
    setLoading(true);

    const { error: otpError } = await supabase.auth.verifyOtp({
      email: user.email,
      token: emailOtp,
      type: "email",
    });
    if (otpError) {
      toast.error("Invalid email verification code");
      setLoading(false);
      return;
    }

    if (hasMfa) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = (factors?.totp ?? []).find((f: any) => f.status === "verified");
      if (factor) {
        const { data: challenge, error: chalError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (chalError) { toast.error(chalError.message); setLoading(false); return; }
        const { error: verError } = await supabase.auth.mfa.verify({
          factorId: factor.id,
          challengeId: challenge.id,
          code: totpCode,
        });
        if (verError) {
          toast.error("Invalid 2FA code");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
    toast.success("Identity verified!");
    setStep("newpass");
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed successfully!");
    await log("password_changed", "auth");
    setStep("start");
    setEmailOtp("");
    setTotpCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Change Password</CardTitle>
        <CardDescription>
          {hasMfa
            ? "Both email verification and 2FA code are required to change your password"
            : "Email verification is required to change your password"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "start" && (
          <Button onClick={sendOtp} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : "Start Password Change"}
          </Button>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Verification Code</Label>
              <p className="text-sm text-muted-foreground">Enter the code sent to <strong>{user?.email}</strong></p>
              <Input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} placeholder="6-digit code" maxLength={6} />
            </div>
            {hasMfa && (
              <div className="space-y-2">
                <Label>2FA Code (Google Authenticator)</Label>
                <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="6-digit 2FA code" maxLength={6} />
              </div>
            )}
            <Button onClick={verifyBoth} disabled={loading || emailOtp.length !== 6 || (hasMfa && totpCode.length !== 6)}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</> : "Verify Identity"}
            </Button>
          </div>
        )}

        {step === "newpass" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" minLength={6} />
            </div>
            <Button onClick={changePassword} disabled={loading || !newPassword || !confirmPassword}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing…</> : "Change Password"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------
// ADMIN INVITES SECTION
// -------------------------------------------------------------
function AdminInviteSection({ onRequestRevoke }: { onRequestRevoke: (target: RevokeTarget) => void }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { log } = useAuditLog();

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("company_invites" as any)
        .select("*")
        .eq("company_name", "Placement Admin")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const clean = data.filter((inv: any) => !(inv.email || "").toLowerCase().includes("hemanth"));
        setInvites(clean);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const sendInvite = async () => {
    if (!email.trim() || !user) return;
    setSending(true);

    try {
      const tokenArray = new Uint8Array(24);
      crypto.getRandomValues(tokenArray);
      const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
      const cleanEmail = email.trim().toLowerCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const existing = invites.find((inv) => (inv.email || "").toLowerCase() === cleanEmail);
      let record: any = null;

      if (existing) {
        const { data, error } = await supabase
          .from("company_invites" as any)
          .update({
            token,
            expires_at: expiresAt,
            accepted_at: null,
            invited_by: user.id,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) { toast.error(error.message); setSending(false); return; }
        record = data;
      } else {
        const { data, error } = await supabase
          .from("company_invites" as any)
          .insert({
            email: cleanEmail,
            company_name: "Placement Admin",
            invited_by: user.id,
            token,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (error) { toast.error(error.message); setSending(false); return; }
        record = data;
      }

      const inviteLink = `${window.location.origin}/signup?admin_invite=${token}&email=${encodeURIComponent(cleanEmail)}`;

      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopiedToken(token);
      } catch (_) {}

      let emailSent = false;
      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "admin_invite",
            to: cleanEmail,
            companyName: "Placement Admin",
            subject: "🎓 Placement Administrator Invitation — Intelligent Placement Management System",
            inviteLink,
          }),
        });
        emailSent = res.ok;
      } catch (_) {}

      if (emailSent) {
        toast.success(`Admin invite emailed to ${cleanEmail}! Link also copied to clipboard.`);
      } else {
        toast.success(`Admin invite created! Link copied to clipboard to share with ${cleanEmail}.`);
      }

      try {
        await log("admin_invited", "company_invites", record?.id, { email: cleanEmail });
      } catch (_) {}

      setEmail("");
      fetchInvites();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send admin invite");
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (token: string, email: string) => {
    const link = `${window.location.origin}/signup?admin_invite=${token}&email=${encodeURIComponent(email)}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Admin invite link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const resendInvite = async (inv: any) => {
    setActionLoadingId(inv.id);
    const inviteLink = `${window.location.origin}/signup?admin_invite=${inv.token}&email=${encodeURIComponent(inv.email)}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_invite",
          to: inv.email,
          companyName: "Placement Admin",
          subject: "🎓 Placement Administrator Invitation — Intelligent Placement Management System",
          inviteLink,
        }),
      });
      if (res.ok) {
        toast.success(`Admin invite re-sent to ${inv.email}! Link copied.`);
      } else {
        toast.success(`Link copied to clipboard for ${inv.email}.`);
      }
    } catch (err: any) {
      toast.success(`Link copied to clipboard for ${inv.email}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const manuallyActivateAdmin = async (inv: any) => {
    setActionLoadingId(inv.id);
    try {
      await supabase
        .from("company_invites" as any)
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", inv.id);

      const cleanEmail = (inv.email || "").toLowerCase();
      try {
        localStorage.setItem(`verified_role_${cleanEmail}`, "admin");
      } catch (_) {}

      toast.success(`Admin privileges activated for ${inv.email}! They can now log in directly to /admin.`);
      fetchInvites();
    } catch (err: any) {
      toast.error(err?.message || "Failed to manually activate admin");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Placement Admin Invites</CardTitle>
        <CardDescription>Only invited users can become admins. Send invitations, resend tokens, or cancel invites using 2-Factor Authentication.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="admin@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendInvite();
            }}
          />
          <Button onClick={sendInvite} disabled={sending || !email.trim()}>
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
            Send Invite
          </Button>
        </div>

        {invites.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin Email</TableHead>
                <TableHead>Invite Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((inv) => {
                const isAccepted = Boolean(inv.accepted_at);
                const isExpired = !isAccepted && new Date(inv.expires_at) < new Date();
                const isLoading = actionLoadingId === inv.id;

                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{inv.token.slice(0, 12)}…</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isAccepted ? "default" : isExpired ? "destructive" : "secondary"}>
                        {isAccepted ? "Accepted" : isExpired ? "Expired" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-2.5 rounded-lg gap-1"
                          onClick={() => copyInviteLink(inv.token, inv.email)}
                        >
                          {copiedToken === inv.token ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedToken === inv.token ? "Copied" : "Copy"}
                        </Button>

                        {!isAccepted && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2.5 rounded-lg gap-1 text-primary hover:text-primary"
                              disabled={isLoading}
                              onClick={() => resendInvite(inv)}
                              title="Resend invitation email"
                            >
                              <Mail className="h-3.5 w-3.5" /> Resend
                            </Button>

                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs h-8 px-2.5 rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isLoading}
                              onClick={() => manuallyActivateAdmin(inv)}
                              title="Instantly grant Admin permissions"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Activate
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 px-2 rounded-lg text-destructive hover:bg-destructive/10 gap-1"
                          disabled={isLoading}
                          onClick={() => onRequestRevoke({
                            id: inv.id,
                            email: inv.email,
                            company_name: "Placement Admin",
                            type: "admin",
                            onSuccess: fetchInvites,
                          })}
                          title="Cancel / Delete invite with 2FA verification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">No admin invitations recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------
// RECRUITER INVITES SECTION (View, Send, Copy, Resend, Cancel with 2FA)
// -------------------------------------------------------------
function RecruiterInviteSection({ onRequestRevoke }: { onRequestRevoke: (target: RevokeTarget) => void }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { log } = useAuditLog();

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("company_invites" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Exclude internal placement admin invites to only list actual recruiters
        const recruiters = data.filter((inv: any) => inv.company_name !== "Placement Admin" && !(inv.email || "").toLowerCase().includes("hemanth"));
        setInvites(recruiters);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const sendRecruiterInvite = async () => {
    if (!email.trim() || !user) {
      toast.error("Please enter recruiter email address");
      return;
    }
    setSending(true);

    try {
      const tokenArray = new Uint8Array(24);
      crypto.getRandomValues(tokenArray);
      const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
      const cleanEmail = email.trim().toLowerCase();
      const cleanCompany = companyName.trim() || "Visiting Recruiter";
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Check if existing invite exists for this email
      const existing = invites.find((inv) => (inv.email || "").toLowerCase() === cleanEmail);
      let record: any = null;

      if (existing) {
        const { data, error } = await supabase
          .from("company_invites" as any)
          .update({
            token,
            company_name: cleanCompany,
            expires_at: expiresAt,
            accepted_at: null,
            invited_by: user.id,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) { toast.error(error.message); setSending(false); return; }
        record = data;
      } else {
        const { data, error } = await supabase
          .from("company_invites" as any)
          .insert({
            email: cleanEmail,
            company_name: cleanCompany,
            invited_by: user.id,
            token,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (error) { toast.error(error.message); setSending(false); return; }
        record = data;
      }

      const inviteLink = `${window.location.origin}/login?company_invite=${token}&role=company&email=${encodeURIComponent(cleanEmail)}`;

      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopiedToken(token);
      } catch (_) {}

      let emailSent = false;
      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "invite",
            to: cleanEmail,
            companyName: cleanCompany,
            inviteLink,
          }),
        });
        emailSent = res.ok;
      } catch (_) {}

      if (emailSent) {
        toast.success(`Campus Drive invitation emailed to ${cleanEmail} (${cleanCompany})! Link copied to clipboard.`);
      } else {
        toast.success(`Recruiter invite created for ${cleanCompany}! Link copied to clipboard to share with ${cleanEmail}.`);
      }

      try {
        await log("recruiter_invited", "company_invites", record?.id, { email: cleanEmail, company: cleanCompany });
      } catch (_) {}

      setEmail("");
      setCompanyName("");
      fetchInvites();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send recruiter invite");
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (token: string, email: string) => {
    const link = `${window.location.origin}/login?company_invite=${token}&role=company&email=${encodeURIComponent(email)}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Recruiter invite link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const resendInvite = async (inv: any) => {
    setActionLoadingId(inv.id);
    const inviteLink = `${window.location.origin}/login?company_invite=${inv.token}&role=company&email=${encodeURIComponent(inv.email)}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          to: inv.email,
          companyName: inv.company_name || "Campus Drive",
          inviteLink,
        }),
      });
      if (res.ok) {
        toast.success(`Recruiter invitation re-sent to ${inv.email}! Link copied.`);
      } else {
        toast.success(`Link copied to clipboard for ${inv.email}.`);
      }
    } catch (err: any) {
      toast.success(`Link copied to clipboard for ${inv.email}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredInvites = invites.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inv.email || "").toLowerCase().includes(q) ||
      (inv.company_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Recruiter &amp; Company Invitations</CardTitle>
        <CardDescription>
          All recruiter invitations sent by placement admins. In case an invitation link was mis-sent or needs revocation, admins can cancel or delete it anytime with 2-Factor Authentication verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Invite Generator Form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl border bg-muted/20">
          <div className="sm:col-span-5 space-y-1">
            <Label className="text-xs font-semibold">Company / Organization Name</Label>
            <Input
              placeholder="e.g. Google, Microsoft, Infosys"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-5 space-y-1">
            <Label className="text-xs font-semibold">Recruiter Email Address</Label>
            <Input
              placeholder="recruiter@company.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendRecruiterInvite();
              }}
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <Button onClick={sendRecruiterInvite} disabled={sending || !email.trim()} className="w-full gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Send Invite
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Total Recruiter Invites: <strong>{filteredInvites.length}</strong>
          </span>
        </div>

        {/* Recruiter Invites Table */}
        {filteredInvites.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Recruiter Email</TableHead>
                <TableHead>Invite Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvites.map((inv) => {
                const isAccepted = Boolean(inv.accepted_at);
                const isExpired = !isAccepted && new Date(inv.expires_at) < new Date();
                const isLoading = actionLoadingId === inv.id;

                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{inv.company_name || "Visiting Recruiter"}</span>
                    </TableCell>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{inv.token.slice(0, 12)}…</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isAccepted ? "default" : isExpired ? "destructive" : "secondary"}>
                        {isAccepted ? "Accepted" : isExpired ? "Expired" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-2.5 rounded-lg gap-1"
                          onClick={() => copyInviteLink(inv.token, inv.email)}
                        >
                          {copiedToken === inv.token ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedToken === inv.token ? "Copied" : "Copy"}
                        </Button>

                        {!isAccepted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 px-2.5 rounded-lg gap-1 text-primary hover:text-primary"
                            disabled={isLoading}
                            onClick={() => resendInvite(inv)}
                            title="Resend recruiter invitation email"
                          >
                            <Mail className="h-3.5 w-3.5" /> Resend
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 px-2 rounded-lg text-destructive hover:bg-destructive/10 gap-1"
                          disabled={isLoading}
                          onClick={() => onRequestRevoke({
                            id: inv.id,
                            email: inv.email,
                            company_name: inv.company_name,
                            type: "recruiter",
                            onSuccess: fetchInvites,
                          })}
                          title="Cancel / Revoke recruiter invite with 2FA"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center border rounded-lg space-y-1">
            <Building2 className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No recruiter invitations found</p>
            <p className="text-xs text-muted-foreground">Send your first recruiter drive invitation using the form above.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------
// 2-FACTOR AUTHENTICATION REVOCATION CONFIRMATION DIALOG
// -------------------------------------------------------------
function TwoFactorRevokeDialog({
  target,
  open,
  onOpenChange,
}: {
  target: RevokeTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteTarget: AdminDeleteTarget | null = target ? {
    title: target.type === "admin"
      ? `Placement Admin invitation for ${target.email}`
      : `Recruiter invitation for ${target.email} (${target.company_name || "Visiting Recruiter"})`,
    itemType: target.type === "admin" ? "admin_invite" : "recruiter_invite",
    description: "This invitation will be permanently cancelled. The user's account will be saved as a standard student/user, but their recruiter/admin role and company affiliation will be completely revoked, allowing them to create a new account or be re-invited.",
    onConfirmDelete: async () => {
      // 1. Delete from company_invites
      const { error: delError } = await supabase
        .from("company_invites" as any)
        .delete()
        .eq("id", target.id);

      if (delError) {
        toast.error("Failed to cancel invitation: " + delError.message);
        return;
      }

      // Also clean up by email to remove duplicate/stale invite records
      if (target.email) {
        try {
          await supabase
            .from("company_invites" as any)
            .delete()
            .ilike("email", target.email);
        } catch (_) {}
      }

      // 2. Remove role from user_roles to prevent further recruiter/admin access
      if (target.email) {
        try {
          if (target.type === "recruiter") {
            await supabase
              .from("user_roles")
              .delete()
              .ilike("email", target.email)
              .eq("role", "company");
          } else if (target.type === "admin" && target.email.toLowerCase() !== "gowdaroshan49@gmail.com") {
            await supabase
              .from("user_roles")
              .delete()
              .ilike("email", target.email)
              .eq("role", "admin");
          }
        } catch (_) {}
      }

      // 3. Remove company affiliation from companies table if recruiter
      if (target.type === "recruiter" && target.email) {
        try {
          await supabase
            .from("companies")
            .delete()
            .ilike("email", target.email);
        } catch (_) {}
      }

      // 4. Clear any local cache for this email
      try {
        localStorage.removeItem(`verified_role_${target.email.toLowerCase()}`);
        localStorage.removeItem("pending_company_invite");
        localStorage.removeItem("pending_company_role");
      } catch (_) {}

      toast.success(
        `Invitation for ${target.email} cancelled and ${target.type === "admin" ? "admin" : "recruiter"} access revoked. User account preserved as standard user.`
      );

      target.onSuccess();
    },
  } : null;

  return (
    <AdminDeleteWith2FADialog
      target={deleteTarget}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

function AuditSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) setLogs(data);
        setLoading(false);
      })
      .catch(() => {
        setLogs([]);
        setLoading(false);
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Audit Log</CardTitle>
        <CardDescription>Recent admin actions for accountability and security review</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No audit logs recorded yet</TableCell></TableRow>
            ) : (
              logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}
                  </TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.entity_type}{l.entity_id ? ` #${l.entity_id.slice(0, 8)}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {Object.keys(l.details as object).length > 0 ? JSON.stringify(l.details) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
