import { Bell } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Reminder, TweetData } from "@/shared/types";

function formatReminderTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${timeStr}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${timeStr}`;
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
}

interface ExistingReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder;
  tweetData: TweetData;
  onCancel: () => void;
  onChangeTime: () => void;
  container?: HTMLElement | null;
}

export function ExistingReminderDialog({
  open,
  onOpenChange,
  reminder,
  onCancel,
  onChangeTime,
  container,
}: ExistingReminderDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        size="sm"
        container={container}
        className="bg-card border-border"
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10">
            <Bell className="text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base">
            Reminder already set
          </AlertDialogTitle>
          <AlertDialogDescription>
            {formatReminderTime(reminder.reminderTime)}
            {reminder.authorHandle && (
              <span className="text-muted-foreground/60">
                {" "}&middot; {reminder.authorHandle}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">Keep</AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            variant="outline"
            onClick={onChangeTime}
          >
            Change time
          </AlertDialogAction>
        </AlertDialogFooter>
        <AlertDialogAction
          size="sm"
          variant="destructive"
          className="mx-auto"
          onClick={onCancel}
        >
          Cancel reminder
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
