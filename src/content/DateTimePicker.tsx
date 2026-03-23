import { useState, useMemo } from "react";
import { getDaysInMonth } from "date-fns";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => String(currentYear + i));
}

function getDayOptions(month: number | null, year: number | null) {
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();
  const count = getDaysInMonth(new Date(y, m));
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

interface DateTimePickerProps {
  onSetReminder: (timestamp: number) => void;
  container?: HTMLElement | null;
}

export function DateTimePicker({ onSetReminder, container }: DateTimePickerProps) {
  const now = new Date();
  const [month, setMonth] = useState<string | null>(MONTHS[now.getMonth()]);
  const [day, setDay] = useState<string | null>(String(now.getDate()));
  const [year, setYear] = useState<string | null>(String(now.getFullYear()));
  const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
  const [time, setTime] = useState(
    `${String(defaultTime.getHours()).padStart(2, "0")}:${String(defaultTime.getMinutes()).padStart(2, "0")}`
  );
  const [error, setError] = useState("");

  const monthIndex = month ? MONTHS.indexOf(month) : null;
  const yearNum = year ? Number(year) : null;

  const dayOptions = useMemo(
    () => getDayOptions(monthIndex, yearNum),
    [monthIndex, yearNum]
  );

  // Clamp day when month/year changes reduce available days
  const clampedDay = day && Number(day) > dayOptions.length ? String(dayOptions.length) : day;
  if (clampedDay !== day) setDay(clampedDay);

  const yearOptions = useMemo(() => getYearOptions(), []);

  const handleSet = () => {
    if (!month || !clampedDay || !year) {
      setError("Pick a date");
      setTimeout(() => setError(""), 2000);
      return;
    }
    const [hours, minutes] = time.split(":").map(Number);
    const reminderDate = new Date(
      Number(year),
      MONTHS.indexOf(month),
      Number(clampedDay),
      hours,
      minutes,
      0,
      0
    );

    if (reminderDate.getTime() <= Date.now()) {
      setError("Pick a future time!");
      setTimeout(() => setError(""), 2000);
      return;
    }

    onSetReminder(reminderDate.getTime());
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        <Combobox
          items={MONTHS}
          value={month}
          onValueChange={setMonth}
          autoHighlight
        >
          <ComboboxInput
            placeholder="Month"
            showTrigger={false}
            className="h-8 text-xs [&_input]:text-xs [&_input]:px-2"
          />
          <ComboboxContent container={container} side="top" className="min-w-[140px]">
            <ComboboxEmpty>No match.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item} className="text-xs">
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Combobox
          items={dayOptions}
          value={clampedDay}
          onValueChange={setDay}
          autoHighlight
        >
          <ComboboxInput
            placeholder="Day"
            showTrigger={false}
            className="h-8 text-xs [&_input]:text-xs [&_input]:px-2"
          />
          <ComboboxContent container={container} side="top" className="min-w-[80px]">
            <ComboboxEmpty>No match.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item} className="text-xs">
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Combobox
          items={yearOptions}
          value={year}
          onValueChange={setYear}
          autoHighlight
        >
          <ComboboxInput
            placeholder="Year"
            showTrigger={false}
            className="h-8 text-xs [&_input]:text-xs [&_input]:px-2"
          />
          <ComboboxContent container={container} side="top" className="min-w-[90px]">
            <ComboboxEmpty>No match.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item} className="text-xs">
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-1.5">
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full h-8 text-xs [color-scheme:dark]"
        />

        <Button
          onClick={handleSet}
          size="sm"
          className={cn(
            "w-full h-8 text-xs rounded-full",
            error && "bg-destructive hover:bg-destructive/90"
          )}
        >
          {error || "Set Reminder"}
        </Button>
      </div>
    </div>
  );
}
