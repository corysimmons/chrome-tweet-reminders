import {
  Clock,
  Clock4,
  Sunrise,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from "lucide-react";
import {
  BaseDialog,
  BaseDialogPopup,
  BaseDialogHeader,
  BaseDialogTitle,
  BaseDialogDescription,
} from "@/components/ui/base-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getPresets } from "@/shared/presets";
import type { TweetData } from "@/shared/types";
import { DateTimePicker } from "./DateTimePicker";

const presetIcons = [Clock, Clock4, Sunrise, CalendarDays, CalendarClock, CalendarRange];

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
    <BaseDialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogPopup container={container} className="bg-card border-border max-w-[340px] gap-3 p-5 overflow-visible">
        <BaseDialogHeader className="gap-1 min-w-0">
          <BaseDialogTitle className="text-base">Set a reminder</BaseDialogTitle>
          <BaseDialogDescription>
            <div className="text-xs text-muted-foreground">
              <span>{tweetData.authorHandle}</span>
              {tweetData.tweetText && (
                <div className="mt-1 max-h-40 overflow-y-auto">
                  <p className="text-muted-foreground/60 leading-relaxed">{tweetData.tweetText}</p>
                </div>
              )}
            </div>
          </BaseDialogDescription>
        </BaseDialogHeader>

        <div className="grid grid-cols-3 gap-1.5">
          {presets.map((preset, i) => {
            const Icon = presetIcons[i] || Clock;
            return (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-9 text-xs font-normal text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                onClick={() => handlePreset(preset)}
              >
                <Icon className="size-3.5 text-muted-foreground" />
                {preset.label}
              </Button>
            );
          })}
        </div>

        <Separator />

        <DateTimePicker onSetReminder={onSetReminder} container={container} />
      </BaseDialogPopup>
    </BaseDialog>
  );
}
