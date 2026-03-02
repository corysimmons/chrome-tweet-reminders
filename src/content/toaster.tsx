import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import contentCss from "@/globals.css?inline";

let toastRoot: Root | null = null;
let toastHost: HTMLDivElement | null = null;

function getSonnerCss(): string {
  for (const el of document.querySelectorAll("style")) {
    if (el.textContent?.includes("[data-sonner-toaster]")) {
      return el.textContent;
    }
  }
  return "";
}

function ensureToaster() {
  if (toastHost && document.body.contains(toastHost)) return;

  const host = document.createElement("div");
  host.id = "remindme-toast-host";
  document.body.appendChild(host);
  toastHost = host;

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = contentCss + "\n" + getSonnerCss();
  shadow.appendChild(style);

  const mountPoint = document.createElement("div");
  mountPoint.id = "remindme-toast-root";
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  toastRoot = root;

  flushSync(() => {
    root.render(<Toaster />);
  });
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="#1d9bf0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${timeStr}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${timeStr}`;
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "\u2026";
}

export interface ToastInfo {
  authorHandle: string;
  tweetText: string;
  reminderTime: number;
}

export function showToast(info: ToastInfo | string) {
  ensureToaster();

  if (typeof info === "string") {
    toast(info);
    return;
  }

  toast.custom(() => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "14px 16px",
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        color: "var(--color-foreground)",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "13px",
        width: "var(--width)",
        boxSizing: "border-box",
        boxShadow: "0 4px 12px rgba(0,0,0,.3)",
      }}
    >
      <div style={{ flexShrink: 0, marginTop: "1px" }}>
        <BellIcon />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, lineHeight: "1.3" }}>
          Reminder set
        </div>
        <div
          style={{
            color: "var(--color-muted-foreground)",
            marginTop: "2px",
            lineHeight: "1.4",
          }}
        >
          <span>{formatTime(info.reminderTime)}</span>
          <span style={{ margin: "0 5px" }}>&middot;</span>
          <span>{info.authorHandle}</span>
        </div>
        {info.tweetText && (
          <div
            style={{
              color: "var(--color-muted-foreground)",
              opacity: 0.7,
              marginTop: "4px",
              lineHeight: "1.4",
            }}
          >
            {truncate(info.tweetText, 80)}
          </div>
        )}
      </div>
    </div>
  ));
}
