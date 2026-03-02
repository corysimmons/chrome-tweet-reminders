import { ExternalLink, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Reminder } from "@/shared/types";
import { formatRelativeTime } from "@/shared/format";

interface ReminderCardProps {
  reminder: Reminder;
  onDelete: (id: string) => void;
}

export function ReminderCard({ reminder, onDelete }: ReminderCardProps) {
  const isPast = reminder.reminderTime <= Date.now();

  return (
    <div
      data-testid="reminder-card"
      className={`group rounded-lg border p-3 transition-colors hover:bg-card ${
        isPast ? "border-destructive/30 bg-destructive/5" : "border-border bg-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span data-testid="reminder-author" className="text-[13px] font-medium truncate">
              {reminder.authorHandle}
            </span>
            <Badge
              data-testid="reminder-time"
              variant={isPast ? "destructive" : "secondary"}
              className="text-[10px] shrink-0 gap-1 font-normal"
              title={new Date(reminder.reminderTime).toLocaleString()}
            >
              <Clock className="size-2.5" />
              {isPast ? "Overdue" : formatRelativeTime(reminder.reminderTime)}
            </Badge>
          </div>
          <p
            data-testid="reminder-text"
            className="text-xs text-muted-foreground leading-relaxed line-clamp-2"
          >
            {reminder.tweetText || "(no text)"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 -mb-0.5 -ml-1">
        <Button
          variant="ghost"
          size="xs"
          asChild
          className="text-muted-foreground hover:text-primary"
          data-testid="reminder-open"
        >
          <a
            href={reminder.tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink />
            Open
          </a>
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onDelete(reminder.id)}
          className="text-muted-foreground hover:text-destructive"
          data-testid="reminder-delete"
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </div>
  );
}
