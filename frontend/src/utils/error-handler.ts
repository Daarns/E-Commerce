import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  context: string;
  showToast?: boolean;
  throwError?: boolean;
}

export function handleError(error: unknown, options: ErrorHandlerOptions): string {
  const { context, showToast = true, throwError = false } = options;

  const message = error instanceof Error ? error.message : `${context} failed`;

  console.error(context, error);

  if (showToast) {
    toast.error(message);
  }

  if (throwError) {
    throw error;
  }

  return message;
}
