import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import contentCss from "@/globals.css?inline";

let toastRoot: Root | null = null;
let toastHost: HTMLDivElement | null = null;

function ensureToaster() {
  if (toastHost && document.body.contains(toastHost)) return;

  // Create persistent shadow host
  const host = document.createElement("div");
  host.id = "remindme-toast-host";
  document.body.appendChild(host);
  toastHost = host;

  const shadow = host.attachShadow({ mode: "open" });

  // Inject Tailwind CSS
  const style = document.createElement("style");
  style.textContent = contentCss;
  shadow.appendChild(style);

  // Mount point
  const mountPoint = document.createElement("div");
  mountPoint.id = "remindme-toast-root";
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  toastRoot = root;

  // flushSync ensures Toaster is mounted before toast() is called
  flushSync(() => {
    root.render(<Toaster />);
  });
}

export function showToast(message: string) {
  ensureToaster();
  toast(message);
}
