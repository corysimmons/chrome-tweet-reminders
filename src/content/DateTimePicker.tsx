import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  onSetReminder: (timestamp: number) => void;
  container?: HTMLElement | null;
}

export function DateTimePicker({ onSetReminder, container }: DateTimePickerProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
  const [time, setTime] = useState(
    `${String(defaultTime.getHours()).padStart(2, "0")}:${String(defaultTime.getMinutes()).padStart(2, "0")}`
  );
  const [error, setError] = useState("");

  const handleSet = () => {
    if (!date) {
      setError("Pick a date");
      return;
    }
    const [hours, minutes] = time.split(":").map(Number);
    const reminderDate = new Date(date);
    reminderDate.setHours(hours, minutes, 0, 0);

    if (reminderDate.getTime() <= Date.now()) {
      setError("Pick a future time!");
      setTimeout(() => setError(""), 2000);
      return;
    }

    onSetReminder(reminderDate.getTime());
  };

  return (
    <div className="flex items-center gap-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal text-xs h-8",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 size-3.5" />
            {date ? format(date, "MMM d") : "Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" container={container}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="w-[110px] h-8 text-xs [color-scheme:dark]"
      />

      <Button
        onClick={handleSet}
        size="sm"
        className={cn(
          "flex-1 h-8 text-xs rounded-full",
          error && "bg-destructive hover:bg-destructive/90"
        )}
      >
        {error || "Set Reminder"}
      </Button>
    </div>
  );
}
