export interface Preset {
  label: string;
  ms?: number;
  absolute?: number;
  isDefault?: boolean;
}

export function getPresets(): Preset[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  return [
    { label: "1 hour", ms: 60 * 60 * 1000 },
    { label: "4 hours", ms: 4 * 60 * 60 * 1000 },
    { label: "Tomorrow 9 AM", absolute: tomorrow.getTime() },
    { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "2 weeks", ms: 14 * 24 * 60 * 60 * 1000, isDefault: true },
    { label: "1 month", ms: 30 * 24 * 60 * 60 * 1000 },
  ];
}
