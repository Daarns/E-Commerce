import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VerificationDialogProps {
  open: boolean;
  pendingEmail: string;
  onOpenChange: (open: boolean) => void;
  onVerify: () => void;
}

export const VerificationDialog = ({
  open,
  pendingEmail,
  onOpenChange,
  onVerify,
}: VerificationDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-lg">Verify Your Email</DialogTitle>
        <DialogDescription className="text-base pt-2">
          Your account hasn&apos;t been verified yet. Please verify your email address to complete your login.
        </DialogDescription>
      </DialogHeader>
      <div className="py-3 px-3 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-sm text-blue-900">
          ✉️ A verification code was sent to <span className="font-semibold">{pendingEmail}</span>
        </p>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Go Back
        </Button>
        <Button
          onClick={onVerify}
          className="bg-primary hover:bg-primary/90"
        >
          Verify Email
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
