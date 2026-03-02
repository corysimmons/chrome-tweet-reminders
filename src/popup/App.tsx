import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, RefreshCw, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Reminder } from "@/shared/types";
import { ReminderCard } from "./ReminderCard";
import { EmptyState } from "./EmptyState";

export function App() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadReminders = useCallback(async () => {
    const response = await chrome.runtime.sendMessage({ type: "GET_REMINDERS" });
    const list: Reminder[] = response?.reminders || [];
    list.sort((a, b) => a.reminderTime - b.reminderTime);
    setReminders(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCheckNow = async () => {
    await chrome.runtime.sendMessage({ type: "CHECK_NOW" });
    loadReminders();
  };

  const handleDelete = async (id: string) => {
    await chrome.runtime.sendMessage({ type: "DELETE_REMINDER", id });
    loadReminders();
  };

  const handleExport = async () => {
    const response = await chrome.runtime.sendMessage({ type: "EXPORT_REMINDERS" });
    const data = response?.reminders || [];
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tweet-reminders-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        alert("Invalid file format. Expected a JSON array of reminders.");
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: "IMPORT_REMINDERS",
        reminders: parsed,
      });

      if (response?.success) {
        alert(`Imported ${response.imported} new reminder(s).`);
        loadReminders();
      }
    } catch (err: unknown) {
      alert("Failed to import: " + (err instanceof Error ? err.message : err));
    }

    event.target.value = "";
  };

  const overdueCount = reminders.filter((r) => r.reminderTime <= Date.now()).length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-[360px] max-h-[500px] bg-background text-foreground font-sans text-sm">
        <div className="p-4 pb-0">
          <header className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                <Bell className="size-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight leading-none">Tweet Reminders</h1>
                {!loading && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {reminders.length === 0
                      ? "No reminders"
                      : `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`}
                    {overdueCount > 0 && (
                      <span className="text-destructive font-medium"> · {overdueCount} overdue</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCheckNow}
                    data-testid="check-now-btn"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Check now</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleExport}
                    data-testid="export-btn"
                  >
                    <Download className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Export</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="import-btn"
                  >
                    <Upload className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Import</p></TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                hidden
              />
            </div>
          </header>

          <Separator />
        </div>

        {loading ? null : reminders.length === 0 ? (
          <div className="p-4">
            <EmptyState />
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div data-testid="reminders-list" className="flex flex-col gap-2 p-4">
              {reminders.map((r) => (
                <ReminderCard key={r.id} reminder={r} onDelete={handleDelete} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  );
}
