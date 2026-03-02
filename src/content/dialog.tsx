import { createRoot, type Root } from "react-dom/client";
import type { TweetData } from "@/shared/types";
import { ReminderDialog } from "./ReminderDialog";
import contentCss from "@/globals.css?inline";

let currentRoot: Root | null = null;
let currentHost: HTMLDivElement | null = null;

export function mountDialog(
  tweetData: TweetData,
  onSetReminder: (timestamp: number) => void,
  onClose: () => void
) {
  unmountDialog();

  // Create shadow host
  const host = document.createElement("div");
  host.id = "remindme-shadow-host";
  document.body.appendChild(host);
  currentHost = host;

  // Attach shadow root
  const shadow = host.attachShadow({ mode: "open" });

  // Inject Tailwind CSS into shadow root
  const style = document.createElement("style");
  style.textContent = contentCss;
  shadow.appendChild(style);

  // Create React mount point inside shadow root
  const mountPoint = document.createElement("div");
  mountPoint.id = "remindme-root";
  shadow.appendChild(mountPoint);

  // Render React app
  const root = createRoot(mountPoint);
  currentRoot = root;

  root.render(
    <ReminderDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          unmountDialog();
        }
      }}
      tweetData={tweetData}
      onSetReminder={(timestamp) => {
        onSetReminder(timestamp);
        unmountDialog();
      }}
      container={mountPoint}
    />
  );
}

export function unmountDialog() {
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }
  if (currentHost) {
    currentHost.remove();
    currentHost = null;
  }
}
