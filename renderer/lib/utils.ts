import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeDue(timestamp?: string): string {
  if (!timestamp) {
    return "No due date";
  }

  const target = new Date(timestamp);
  const now = new Date();
  const hours = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (hours <= 0) {
    return "Due soon";
  }

  if (hours < 24) {
    return `Due in ${hours}h`;
  }

  return `Due ${Math.round(hours / 24)}d out`;
}
