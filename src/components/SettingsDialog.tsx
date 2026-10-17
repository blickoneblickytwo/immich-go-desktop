import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_KEY_PLACEHOLDER } from "@/lib/friendly-flow";
import { clearSavedConnection, readSavedConnection } from "@/lib/connection-storage";
import { Link } from "react-router-dom";

const APP_VERSION = "0.3.0";
const IMMICH_GO_BASELINE = "v0.32.0";
const REPOSITORY = "https://github.com/blickoneblickytwo/immich-go-desktop";
const IMPORT_PERMISSIONS = [
  "asset.read", "asset.statistics", "asset.update", "asset.upload", "asset.copy",
  "asset.delete", "asset.download", "album.create", "album.read", "albumAsset.create",
  "server.about", "stack.create", "tag.asset", "tag.create", "user.read",
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: "privacy" | "help" | "about";
  onTabChange: (tab: "privacy" | "help" | "about") => void;
  onForgetSavedConnection: () => void;
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
      await navigator.clipboard.writeText(IMPORT_PERMISSIONS.join(", "));
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

function SavedConnection({ onCleared }: { onCleared: () => void }) {
  const [connection, setConnection] = useState(readSavedConnection);
  const [message, setMessage] = useState("");
  const clear = () => {
    if (clearSavedConnection()) {
      setConnection(readSavedConnection());
      onCleared();
      setMessage("Saved details cleared and Remember switched off. Values already in the form remain until you start over or reload.");
    } else {
      setMessage("Unable to clear browser storage. Clear this site’s data in your browser settings.");
    }
  };
  return <section className="settings-section">
    <div className="settings-section-heading">
      <h3>Saved connection</h3>
      <span className="settings-status">{!connection.available ? "Unavailable" : connection.saved ? "Saved locally" : "Not saved"}</span>
    </div>
    <p>{!connection.available ? "Browser storage is unavailable. Check this site’s storage permissions in your browser settings." : connection.saved
      ? !connection.connection ? "Stored data could not be restored. You can clear it below." : connection.connection.apiKey ? "Your destination address and API key are saved as plain text in this browser." : "Your destination address is saved in this browser. No API key is saved."
      : "Remember saves destination details on Continue or after a successful connection test. Source-server details are not saved."}</p>
    <p className="settings-note">Saved details are not encrypted by this app and can be read by scripts on the same origin. Avoid saving keys on shared devices.</p>
    {connection.saved && <Button variant="outline" size="sm" onClick={clear}>Clear saved connection</Button>}
    <p className="settings-note" role="status">{message}</p>
  </section>;
}

export default function SettingsDialog({ open, onOpenChange, tab, onTabChange, onForgetSavedConnection }: SettingsDialogProps) {
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
              <h3>Keys and commands</h3>
              <p>The guided download asks for keys with hidden input when it runs. Keys entered here are not embedded in that download. A copied manual command uses <code>{API_KEY_PLACEHOLDER}</code> when its destination key is blank.</p>
              <p>The connection test sends the destination key to the server address you enter. Redirects are blocked; the source server is not tested. HTTPS encrypts the connection; HTTP does not.</p>
              <p>Copied manual commands contain entered keys even when the preview hides them. The guided script passes runtime keys to immich-go; process information and CLI logs may expose them. Keep logs private.</p>
            </section>
            <SavedConnection onCleared={onForgetSavedConnection} />
            <section className="settings-section">
              <h3>This page and its host</h3>
              <p>This version has no analytics or app backend receiving form details. The host serves the page and its assets and may log request metadata. External help links open third-party sites.</p>
              <p>This web page does not scan your photo library or upload photos. Running a downloaded script separately sets up immich-go if needed, checks files and servers, and runs a test. Uploading requires typing UPLOAD after that test.</p>
              <p>Log review reads only the log file you choose, in browser memory. The app does not upload or save log contents. Logs may contain credentials and private paths.</p>
              <ResourceLink href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub hosting privacy</ResourceLink>
              <ResourceLink href={REPOSITORY + "#run-it-locally-optional"}>Run the app locally</ResourceLink>
            </section>
          </TabsContent>
          <TabsContent value="help" className="settings-panel">
            <section className="settings-section">
              <h3>Start with a test run</h3>
              <p>The guided download sets up immich-go v0.32.0 if needed and runs a test first. It asks for keys when run. Type UPLOAD after reviewing the test to begin uploading; Enter stops. A test skips photo uploads but still makes server requests.</p>
              <ResourceLink href="https://immich.app/docs/features/command-line-interface/#generate-the-api-key">Create an Immich API key</ResourceLink>
            </section>
            <details className="quiet-details settings-detail">
              <summary>Import API permissions</summary>
              <div className="details-content">
                <p className="settings-note">Review these baseline import permissions against your source and options. The browser connection test only checks the destination server-info endpoint; it does not validate every import permission.</p>
                <ul className="permission-list">{IMPORT_PERMISSIONS.map((permission) => <li key={permission}><code>{permission}</code></li>)}</ul>
                <CopyPermissionsButton />
                <p className="settings-note">Add <code>job.create</code> and <code>job.read</code> on an admin-linked key if you want to pause background jobs.</p>
              </div>
            </details>
            <details className="quiet-details settings-detail">
              <summary>Why a connection test can fail</summary>
              <p className="details-content settings-note">Check the server URL and key. Browser restrictions, CORS, a redirect, or a VPN can also prevent the test from completing. It times out after 10 seconds. The test never blocks Continue; verify your connection details before running the command.</p>
            </details>
            <details className="quiet-details settings-detail">
              <summary>Reading import results</summary>
              <p className="details-content settings-note">Check immich-go’s summary and your Immich library. If it reports assets that did not reach a final state, check for missing photos and review its log before treating the import as complete.</p>
              <Link to="/?view=import-report" onClick={() => onOpenChange(false)} className="review-log-link">Review an import log</Link>
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
              <div><dt>License</dt><dd><a href={REPOSITORY + "/blob/main/LICENSE"} target="_blank" rel="noreferrer">PolyForm Noncommercial</a></dd></div>
            </dl>
            <div className="settings-resources">
              <p className="settings-note">Free for permitted noncommercial use. For commercial use outside those terms, request a separate license on GitHub.</p>
              <ResourceLink href={REPOSITORY + "/issues/new?template=commercial-license.yml"}>Request a commercial license</ResourceLink>
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
