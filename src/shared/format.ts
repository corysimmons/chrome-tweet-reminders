export function formatRelativeTime(timestamp: number): string {
  const diff = timestamp - Date.now();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `in ${months} month${months === 1 ? "" : "s"}`;
  }
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes > 0) return `in ${minutes} min`;
  return "very soon";
}
