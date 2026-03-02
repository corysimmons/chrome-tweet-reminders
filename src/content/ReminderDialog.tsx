import {
  Clock,
  Clock4,
  Sunrise,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getPresets } from "@/shared/presets";
import type { TweetData } from "@/shared/types";
import { DateTimePicker } from "./DateTimePicker";

const presetIcons = [Clock, Clock4, Sunrise, CalendarDays, CalendarRange];

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tweetData: TweetData;
  onSetReminder: (timestamp: number) => void;
  container?: HTMLElement | null;
}

export function ReminderDialog({
  open,
  onOpenChange,
  tweetData,
  onSetReminder,
  container,
}: ReminderDialogProps) {
  const presets = getPresets();

  const handlePreset = (preset: (typeof presets)[0]) => {
    const reminderTime = preset.absolute || Date.now() + (preset.ms || 0);
    onSetReminder(reminderTime);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={container} className="bg-card border-border max-w-[340px] gap-3 p-5 overflow-hidden">
        <DialogHeader className="gap-1 min-w-0">
          <DialogTitle className="text-base">Set a reminder</DialogTitle>
          <DialogDescription asChild>
            <div className="text-xs text-muted-foreground">
              <span>{tweetData.authorHandle}</span>
              {tweetData.tweetText && (
                <ScrollArea className="mt-1 max-h-[3.75rem]">
                  <p className="text-muted-foreground/60 leading-relaxed">{tweetData.tweetText}</p>
                </ScrollArea>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          {presets.map((preset, i) => {
            const Icon = presetIcons[i] || Clock;
            return (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start gap-3 h-9 px-3 text-[13px] font-normal text-foreground hover:bg-primary/10 hover:text-primary"
                onClick={() => handlePreset(preset)}
              >
                <Icon className="size-4 text-muted-foreground" />
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">custom</span>
          <Separator className="flex-1" />
        </div>

        <DateTimePicker onSetReminder={onSetReminder} container={container} />
      </DialogContent>
    </Dialog>
  );
}
