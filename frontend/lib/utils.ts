import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(
  address: string,
  prefix: number,
  suffix: number
): string {
  return `${address.slice(0, prefix)}…${address.slice(suffix)}`;
}

export function formatTimeRemaining(createdAt: number): string {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const twentyFourHours = 24 * 60 * 60; // 24 hours in seconds
  const expirationTime = createdAt + twentyFourHours;
  const timeRemaining = expirationTime - now;

  if (timeRemaining <= 0) {
    const timeExpired = Math.abs(timeRemaining);
    const hoursExpired = Math.floor(timeExpired / 3600);
    const minutesExpired = Math.floor((timeExpired % 3600) / 60);

    if (hoursExpired > 0) {
      return `Expired ${hoursExpired}h ${minutesExpired}m ago`;
    } else {
      return `Expired ${minutesExpired}m ago`;
    }
  }

  const hoursRemaining = Math.floor(timeRemaining / 3600);
  const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

  if (hoursRemaining > 0) {
    return `${hoursRemaining}h ${minutesRemaining}m remaining`;
  } else {
    return `${minutesRemaining}m remaining`;
  }
}
