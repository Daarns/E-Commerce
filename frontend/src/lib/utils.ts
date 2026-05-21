import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn convention: this file is auto-generated, keep only cn()
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
