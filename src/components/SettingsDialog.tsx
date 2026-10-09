import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_KEY_PLACEHOLDER, REMEMBER_KEY } from "@/lib/friendly-flow";

const APP_VERSION = "0.3.0";
const IMMICH_GO_BASELINE = "v0.32.0";
const REPOSITORY = "https://github.com/blickoneblickytwo/immich-go-desktop";
const MINIMAL_PERMISSIONS = [
  "asset.read", "asset.statistics", "asset.update", "asset.upload", "asset.copy",
  "asset.delete", "asset.download", "album.create", "album.read", "albumAsset.create",
  "server.about", "stack.create", "tag.asset", "tag.create", "user.read",
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: "privacy" | "help" | "about";
  onTabChange: (tab: "privacy" | "help" | "about") => void;
}

function ResourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="settings-link" href={href} target="_blank" rel="noreferrer">
    {children}<ArrowUpRight aria-hidden="true" />
  </a>;
}

function CopyPermissionsButton() {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MINIMAL_PERMISSIONS.join(", "));
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };
  return <div className="permissions-copy">
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {status === "copied" ? "Copied" : "Copy permissions"}
    </Button>
    <p className="sr-only" role="status">{status === "copied" ? "Permissions copied to clipboard." : ""}</p>
    {status === "error" && <p className="settings-note" role="status">Clipboard access failed. Select and copy the permissions above.</p>}
  </div>;
}

function SavedConnection() {
  const readSaved = () => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return { saved: false, keySaved: false, available: true };
      let keySaved = false;
      try { keySaved = Boolean(JSON.parse(raw).apiKey); } catch { /* Keep malformed entries clearable. */ }
      return { saved: true, keySaved, available: true };
    } catch {
      return { saved: false, keySaved: false, available: false };
    }
  };
  const [connection, setConnection] = useState(readSaved);
  const [message, setMessage] = useState("");
  const clear = () => {
    try {
      localStorage.removeItem(REMEMBER_KEY);
      setConnection({ saved: false, keySaved: false, available: true });
      setMessage("Saved connection cleared from this browser.");
    } catch {
      setMessage("Unable to clear browser storage. Try clearing this site’s data in your browser settings.");
    }
  };
  return <section className="settings-section">
    <div className="settings-section-heading">
      <h3>Saved connection</h3>
      <span className="settings-status">{!connection.available ? "Unavailable" : connection.saved ? "Saved locally" : "Not saved"}</span>
    </div>
    <p>{!connection.available ? "Browser storage is unavailable. Check this site’s storage permissions in your browser settings." : connection.saved
      ? connection.keySaved ? "Your server address and API key are stored in this browser." : "Your server address is stored in this browser. No API key is saved."
      : "Connection details are saved only when you choose Remember on this device."}</p>
    {connection.saved && <Button variant="outline" size="sm" onClick={clear}>Clear saved connection</Button>}
    <p className="settings-note" role="status">{message}</p>
  </section>;
}

export default function SettingsDialog({ open, onOpenChange, tab, onTabChange }: SettingsDialogProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="settings-dialog"
      onOpenAutoFocus={() => {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }}
      onCloseAutoFocus={(event) => {
        if (returnFocusRef.current?.isConnected) {
          event.preventDefault();
          returnFocusRef.current.focus();
        }
      }}
    >
      <DialogHeader className="settings-header">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Privacy, saved connections, and import help.</DialogDescription>
      </DialogHeader>
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as typeof tab)} className="settings-tabs">
        <TabsList className="settings-tablist">
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <div className="settings-body">
          <TabsContent value="privacy" className="settings-panel">
            <section className="settings-section">
              <h3>Your API key stays under your control</h3>
              <p>Leave the key field blank to add <code>{API_KEY_PLACEHOLDER}</code> yourself after copying the command.</p>
              <p>If you enter a key, it is sent to your Immich server only when you choose Test connection. Otherwise it is used to build the command in this browser.</p>
            </section>
            <SavedConnection />
            <section className="settings-section">
              <h3>No analytics or app backend</h3>
              <p>This command builder has no analytics or application backend. The photo import runs separately through immich-go on your computer.</p>
              <ResourceLink href={REPOSITORY + "#run-it-locally-optional"}>Run the app locally</ResourceLink>
            </section>
          </TabsContent>
          <TabsContent value="help" className="settings-panel">
            <section className="settings-section">
              <h3>Start with a test run</h3>
              <p>Preview the import first. When you are ready, choose a live upload and run the generated command in your terminal.</p>
              <ResourceLink href="https://immich.app/docs/features/command-line-interface/#generate-the-api-key">Create an Immich API key</ResourceLink>
            </section>
            <details className="quiet-details settings-detail">
              <summary>Required API permissions</summary>
              <div className="details-content">
                <p className="settings-note">Use these permissions for a scoped API key.</p>
                <ul className="permission-list">{MINIMAL_PERMISSIONS.map((permission) => <li key={permission}><code>{permission}</code></li>)}</ul>
                <CopyPermissionsButton />
                <p className="settings-note">Add <code>job.create</code> and <code>job.read</code> on an admin-linked key if you want to pause background jobs.</p>
              </div>
            </details>
            <details className="quiet-details settings-detail">
              <summary>Why a connection test can fail</summary>
              <p className="details-content settings-note">Check the server URL and key. Browser restrictions, CORS, or a VPN can also prevent the test from reaching your server. The test never blocks Continue; verify your connection details before running the command.</p>
            </details>
            <details className="quiet-details settings-detail">
              <summary>Reading import results</summary>
              <p className="details-content settings-note">Check immich-go’s summary and your Immich library. If it reports assets that did not reach a final state, check for missing photos and review its log before treating the import as complete.</p>
            </details>
            <ResourceLink href="https://github.com/simulot/immich-go">Install immich-go</ResourceLink>
          </TabsContent>
          <TabsContent value="about" className="settings-panel">
            <div className="settings-app">
              <span className="settings-app-mark" aria-hidden="true" />
              <div><h3>immich-go desktop</h3><p>A simpler way to prepare your photo import.</p></div>
            </div>
            <dl className="settings-facts">
              <div><dt>App version</dt><dd>{APP_VERSION}</dd></div>
              <div><dt>immich-go baseline</dt><dd>{IMMICH_GO_BASELINE}</dd></div>
              <div><dt>License</dt><dd><a href={REPOSITORY + "/blob/main/LICENSE"} target="_blank" rel="noreferrer">MIT</a></dd></div>
            </dl>
            <div className="settings-resources">
              <ResourceLink href={REPOSITORY}>View source on GitHub</ResourceLink>
              <ResourceLink href={REPOSITORY + "/issues"}>Report an issue or suggest a feature</ResourceLink>
              <ResourceLink href="https://github.com/simulot/immich-go">About immich-go</ResourceLink>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </DialogContent>
  </Dialog>;
}
