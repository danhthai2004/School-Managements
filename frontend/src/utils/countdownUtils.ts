import { useState, useEffect } from "react";

/**
 * Format countdown from pendingDeleteAt to deletion time (14 days later).
 * Returns "X ngày Y giờ Z phút M giây" or "Y giờ Z phút M giây" if < 24h.
 */
export function formatCountdown(pendingDeleteAt: string): string {
  const deleteAt = new Date(pendingDeleteAt);
  deleteAt.setDate(deleteAt.getDate() + 14); // Add 14 days
  
  const now = new Date();
  const diff = deleteAt.getTime() - now.getTime();
  
  if (diff <= 0) {
    return "Đã hết hạn";
  }
  
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) {
    return `Còn ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`;
  }
  return `Còn ${hours} giờ ${minutes} phút ${seconds} giây`;
}

/**
 * Hook for live countdown updates.
 */
export function useCountdown(pendingDeleteAt: string | null): string {
  const [countdown, setCountdown] = useState<string>("");
  
  useEffect(() => {
    if (!pendingDeleteAt) {
      setCountdown("");
      return;
    }
    
    const update = () => setCountdown(formatCountdown(pendingDeleteAt));
    update();
    
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [pendingDeleteAt]);
  
  return countdown;
}
