import { Bell } from "lucide-react";

export function EmptyState() {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center py-10 text-center">
      <div className="rounded-full bg-primary/10 p-3.5 mb-3">
        <Bell className="size-6 text-primary" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium text-foreground">No reminders set</p>
      <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
        Click the bell icon on any tweet to set a reminder.
      </p>
    </div>
  );
}
