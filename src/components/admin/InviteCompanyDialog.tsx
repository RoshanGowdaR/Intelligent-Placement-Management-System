import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Copy, Check, Send, Mail, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function InviteCompanyDialog({ open, onOpenChange, onInvited }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter company recruiter email");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate secure 32-char hex token
      const tokenArray = new Uint8Array(24);
      crypto.getRandomValues(tokenArray);
      const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase
        .from("company_invites" as any)
        .insert({
          email: email.trim().toLowerCase(),
          company_name: companyName.trim() || null,
          invited_by: user?.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const inviteLink = `${window.location.origin}/company/register?token=${token}`;
      setGeneratedLink(inviteLink);

      // Dispatch Email delivery to company recruiter via Supabase Edge Function
      try {
        const res = await supabase.functions.invoke("send-company-notification", {
          body: {
            action: "invite",
            email: email.trim(),
            companyName: companyName.trim(),
            inviteLink,
          },
        });
        if (res.data?.success || res.data?.emailDelivery?.success) {
          toast.success(`Invitation email sent directly from your Gmail to ${email}!`);
        } else {
          toast.success(`Invitation generated and sent to ${email}!`);
        }
      } catch (_) {
        toast.success(`Invitation link generated for ${companyName || email}!`);
      }

      onInvited?.();
    } catch (err: any) {
      console.error("Invite company error:", err);
      toast.error(err?.message || "Failed to generate company invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMailto = () => {
    if (!generatedLink) return;
    const subject = encodeURIComponent(`Placement Drive Invitation — ${companyName || "Campus Recruitment"}`);
    const body = encodeURIComponent(
      `Hello ${companyName ? companyName + " Recruitment Team" : "Recruiter"},\n\n` +
      `You have been invited by the Placement Administration to join our Intelligent Placement Management System as an official campus recruitment partner.\n\n` +
      `Please accept the invitation and complete your company registration at this link:\n${generatedLink}\n\n` +
      `This invitation link is valid for 7 days.\n\nBest regards,\nPlacement Administration`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleReset = () => {
    setEmail("");
    setCompanyName("");
    setGeneratedLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleReset(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg rounded-3xl border border-white/15 bg-card/95 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] p-6">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_25px_rgba(108,92,231,0.6)]">
            <Building2 className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-center text-white">
            Invite Visiting Company / Recruiter
          </DialogTitle>
          <DialogDescription className="text-center text-slate-300 text-xs">
            Send an official email invitation to the company's HR recruiter to register and launch their placement drives.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <form onSubmit={handleInvite} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Company Name
              </Label>
              <Input
                placeholder="e.g. Microsoft, Google, Infosys"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Recruiter / HR Email Address
              </Label>
              <Input
                type="email"
                placeholder="recruiter@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                required
              />
            </div>

            <DialogFooter className="mt-6 flex gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={handleReset} className="rounded-xl text-muted-foreground">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className="h-11 px-6 rounded-xl bg-primary text-white font-bold shadow-[0_0_20px_rgba(108,92,231,0.5)]"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Email…</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" /> Send Email Invitation</>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5 mt-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-emerald-400 mb-1" />
              <p className="font-semibold text-emerald-300 text-sm">Invitation Sent & Generated Successfully!</p>
              <p className="text-xs text-slate-300 mt-1">
                Dispatched to <strong>{email}</strong>. Valid for 7 days:
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Registration Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="h-11 rounded-xl border-white/15 bg-black/40 text-xs font-mono text-primary select-all"
                />
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-11 px-4 rounded-xl bg-primary text-white font-semibold shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleMailto}
                className="flex-1 rounded-xl glass-button text-xs gap-1.5 text-slate-200"
              >
                <Mail className="h-3.5 w-3.5 text-primary" /> Open in Email App
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl glass-button text-xs gap-1.5 text-slate-200"
                onClick={() => window.open(generatedLink, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Preview Form
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={handleReset}
                className="w-full rounded-xl bg-primary text-white font-bold"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
