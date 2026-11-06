import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/useAuditLog";

export interface AdminDeleteTarget {
  title: string;
  itemType?: string;
  description?: string;
  onConfirmDelete: () => Promise<void> | void;
}

interface AdminDeleteWith2FADialogProps {
  target: AdminDeleteTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminDeleteWith2FADialog({
  target,
  open,
  onOpenChange,
}: AdminDeleteWith2FADialogProps) {
  const [step, setStep] = useState<"confirm" | "2fa">("confirm");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { log } = useAuditLog();

  // Reset state whenever the dialog opens or target changes
  useEffect(() => {
    if (open) {
      setStep("confirm");
      setCode("");
      setVerifying(false);
    }
  }, [open, target]);

  const handleProceedTo2FA = () => {
    setStep("2fa");
    setCode("");
  };

  const handleVerifyAndExecuteDelete = async () => {
    if (!target) return;
    if (code.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit Authenticator code.");
      return;
    }

    setVerifying(true);

    try {
      // 1. Fetch active session and check user
      const { data: userData } = await supabase.auth.getUser();
      const currentEmail = userData.user?.email?.toLowerCase();

      // 2. Fetch active TOTP factors for the authorized admin
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        toast.error("Failed to check 2FA status: " + listError.message);
        setVerifying(false);
        return;
      }

      const verifiedFactor = (factors?.totp ?? []).find((f: any) => f.status === "verified");

      if (!verifiedFactor) {
        toast.error("Two-Factor Authentication is required for gowdaroshan49@gmail.com to delete items in the admin portal. Please enable 2FA under Security Settings first.");
        setVerifying(false);
        onOpenChange(false);
        return;
      }

      // 3. Create TOTP challenge
      const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
      if (challenge.error) {
        toast.error(challenge.error.message || "2FA challenge could not be initialized");
        setVerifying(false);
        return;
      }

      // 4. Verify the 6-digit code against Supabase MFA
      const verify = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });

      if (verify.error) {
        toast.error("Invalid 2-Factor Authentication code. Deletion rejected.");
        setVerifying(false);
        return;
      }

      // 5. Code is valid! Proceed with the deletion
      await target.onConfirmDelete();

      // Log forensic audit event
      try {
        await log("item_deleted_with_2fa", target.itemType || "admin_resource", undefined, {
          title: target.title,
          authorized_by: currentEmail || "gowdaroshan49@gmail.com",
        });
      } catch (_) {}

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Deletion failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">Confirm Deletion</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Step 1 of 2: Confirm deletion intention
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-1.5 text-xs">
                <p className="font-semibold text-foreground text-sm">
                  Are you sure you want to delete <span className="text-destructive font-bold">"{target?.title}"</span>?
                </p>
                {target?.description && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {target.description}
                  </p>
                )}
                <p className="text-[11px] text-destructive font-medium pt-1 border-t border-destructive/20">
                  ⚠️ This action is permanent and cannot be undone. Next, you will be required to authenticate with your 2-Factor Authentication code.
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center font-medium">
                Do you want to proceed with deleting this item?
              </p>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2 sm:gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full font-semibold"
              >
                No, Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedTo2FA}
                className="w-full font-bold gap-1.5"
              >
                Yes, Proceed <ShieldAlert className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shrink-0">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">2-Factor Authentication Required</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Step 2 of 2: Super Admin 2FA Authorization
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-xl border bg-muted/40 p-3 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Deleting:</span>
                  <span className="font-semibold text-foreground truncate max-w-[240px]">{target?.title}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-border/40">
                  <span className="text-muted-foreground font-medium">Authorized Admin:</span>
                  <span className="font-mono text-[11px] text-primary font-bold">gowdaroshan49@gmail.com</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                  Enter the 6-digit verification code currently displayed in <strong>gowdaroshan49@gmail.com</strong>'s <strong>Google Authenticator</strong> app to authorize this deletion.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>6-Digit Authenticator Code</span>
                  <span className="text-[10px] text-primary font-medium">gowdaroshan49@gmail.com</span>
                </Label>
                <Input
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="font-mono text-xl tracking-widest text-center h-12 rounded-xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && code.trim().length === 6) {
                      handleVerifyAndExecuteDelete();
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2 sm:gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("confirm")}
                disabled={verifying}
                className="w-full font-semibold"
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleVerifyAndExecuteDelete}
                disabled={code.trim().length !== 6 || verifying}
                className="w-full font-bold gap-1.5"
              >
                {verifying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Verify &amp; Delete</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
