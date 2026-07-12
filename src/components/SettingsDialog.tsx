import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REMEMBER_KEY } from "@/lib/friendly-flow";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";

const APP_VERSION = "0.2.0";
const IMMICH_GO_BASELINE = "v0.32.0";

const MINIMAL_PERMISSIONS = [
  "asset.read",
  "asset.statistics",
  "asset.update",
  "asset.upload",
  "asset.copy",
  "asset.delete",
  "asset.download",
  "album.create",
  "album.read",
  "albumAsset.create",
  "server.about",
  "stack.create",
  "tag.asset",
  "tag.create",
  "user.read",
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: "privacy" | "help" | "about";
  onTabChange: (tab: "privacy" | "help" | "about") => void;
}

function CopyPermissionsButton() {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(MINIMAL_PERMISSIONS.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy list"}
    </Button>
  );
}

function ForgetCredentialsButton() {
  const [cleared, setCleared] = useState(false);
  const hasSaved = typeof window !== "undefined" && !!localStorage.getItem(REMEMBER_KEY);
  const handleForget = () => {
    localStorage.removeItem(REMEMBER_KEY);
    setCleared(true);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleForget}
      disabled={!hasSaved && !cleared}
    >
      {cleared || !hasSaved ? "No credentials saved" : "Forget saved credentials"}
    </Button>
  );
}

export default function SettingsDialog({ open, onOpenChange, tab, onTabChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-step-active" />
            Settings
          </DialogTitle>
          <DialogDescription className="sr-only">
            Privacy details, help, and information about this app.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => onTabChange(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Where your API key goes</p>
              <p className="text-muted-foreground">
                Your key never leaves your browser except for one thing: if you click{" "}
                <span className="font-medium text-foreground">Test connection</span>, it's sent
                straight to the server URL <span className="font-medium text-foreground">you</span>{" "}
                typed in — nowhere else. If you skip the test, it isn't sent anywhere at all; it
                only ends up in the command text on your screen.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">No backend, no tracking</p>
              <p className="text-muted-foreground">
                This app is a static page with no server behind it. There's no analytics, no
                logging, nothing watching what you type. Nobody but you ever sees your key.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Local storage, only if you ask for it</p>
              <p className="text-muted-foreground">
                Ticking "Remember on this device" saves your server URL and key in your browser's
                local storage, on your machine. Nothing is uploaded.
              </p>
              <ForgetCredentialsButton />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Don't take our word for it</p>
              <p className="text-muted-foreground">
                The code is open source (MIT) — read exactly what it does, or open your browser's
                dev tools, go to the Network tab, and watch while you use it. You'll see nothing go
                out except that one optional test. You can also{" "}
                <a
                  href="https://github.com/blickoneblickytwo/immich-go-desktop#run-it-locally-optional"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  run it locally
                </a>{" "}
                for maximum peace of mind.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="help" className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium">What permissions does my API key need?</p>
              <p className="text-muted-foreground">
                Easiest: grant your key all permissions when you create it in Immich. If you'd
                rather scope it down, this is the minimal set immich-go actually uses:
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <ul className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {MINIMAL_PERMISSIONS.map((p) => (
                    <li key={p} className="rounded bg-background px-1.5 py-0.5 border border-border">
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <CopyPermissionsButton />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Also add <code className="font-mono">job.create</code> and{" "}
                <code className="font-mono">job.read</code> (on an admin-linked key) if you want
                Immich background jobs paused during upload.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">"WARNING: N assets did not reach a final state"</p>
              <p className="text-muted-foreground">
                Usually harmless. It commonly shows up with Google Takeout exports split across
                multiple zip files, where immich-go's bookkeeping counts an asset as "pending" even
                though it uploaded fine. Check your Immich library first — if your photos are
                there, you're done. Only dig further if photos are genuinely missing.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">My command didn't work when I pasted it</p>
              <p className="text-muted-foreground">
                This was a real bug (missing line-continuation on the first line) that's since been
                fixed. Generate a fresh command from the current version of the app and it should
                paste and run correctly in PowerShell, cmd, or bash.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-y-1.5 text-muted-foreground">
              <span>App version</span>
              <span className="text-foreground">{APP_VERSION}</span>
              <span>immich-go baseline</span>
              <span className="text-foreground">{IMMICH_GO_BASELINE}</span>
              <span>License</span>
              <span className="text-foreground">MIT</span>
            </div>
            <div className="flex flex-col gap-1.5 pt-2 border-t border-dashed border-border">
              <a
                href="https://github.com/blickoneblickytwo/immich-go-desktop"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 text-foreground/70 hover:text-foreground"
              >
                GitHub repository
              </a>
              <a
                href="https://github.com/blickoneblickytwo/immich-go-desktop/issues"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 text-foreground/70 hover:text-foreground"
              >
                Report a bug / request a feature
              </a>
              <a
                href="https://github.com/simulot/immich-go"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 text-foreground/70 hover:text-foreground"
              >
                immich-go (the CLI this app wraps)
              </a>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
