import { useCallback, useEffect, useMemo, useState } from "react";
import MacWindow from "@/components/MacWindow";
import SettingsDialog from "@/components/SettingsDialog";
import StepIndicator from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { detectOS } from "@/lib/os";
import { FLAG_REGISTRY } from "@/lib/flag-registry";
import {
  API_KEY_PLACEHOLDER,
  REMEMBER_KEY,
  SOURCE_API_KEY_PLACEHOLDER,
  buildFriendlyCommand,
  type CommandShell,
  defaultFriendlyState,
  getCommandChecklist,
  getCreateAlbumsLabel,
  getPathLabel,
  getPathPlaceholder,
  getPresets,
  getRawFlagPreview,
  getSourceLabel,
  getSupportedShells,
  sourceUsesPath,
  type FriendlyState,
  type UploadSource,
} from "@/lib/friendly-flow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ChevronDown, Cloud, Folder, Image as ImageIcon, Loader2, Monitor, Server, XCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";

const stepTransition = { duration: 0.18, ease: "easeOut" } as const;
const stepMotionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: stepTransition,
};

const stepLabels = ["What to upload", "Connect", "Choose style", "Done"];

const osDisplay: Record<"macos" | "windows" | "linux", string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const sourceOptions: { id: UploadSource; icon: typeof Folder; title: string; subtitle: string }[] = [
  { id: "folder", icon: Folder, title: "Photos from my computer", subtitle: "A folder of photos on your drive." },
  { id: "takeout", icon: ImageIcon, title: "Google Photos Takeout", subtitle: "A downloaded Google Takeout zip or folder." },
  { id: "icloud", icon: Cloud, title: "Apple iCloud export", subtitle: "Photos exported from iCloud / Apple." },
  { id: "immich", icon: Server, title: "Another Immich server", subtitle: "Migrate assets from a second Immich server." },
];

type KeyValidationLevel = "ok" | "warn" | "error";
type TestStatus = "idle" | "success" | "warning" | "error";

function validateApiKeyFormat(key: string): { level: KeyValidationLevel; message: string } {
  const trimmed = key.trim();
  if (!trimmed) return { level: "error", message: "API key is required." };
  if (trimmed.length < 20) return { level: "error", message: "Key seems too short. Check your Immich dashboard." };
  if (/\s/.test(trimmed)) return { level: "error", message: "API keys should not contain spaces." };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  const isToken = /^[A-Za-z0-9_\-+/=.]{20,}$/.test(trimmed);
  if (isUuid || isToken) {
    return { level: "ok", message: "Format looks valid." };
  }
  return {
    level: "warn",
    message: "Unusual format. Double-check your key, but it may still be valid.",
  };
}

function isPrivateHost(serverUrl: string): boolean {
  try {
    const host = new URL(serverUrl).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

const Index = () => {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<FriendlyState>({ ...defaultFriendlyState });
  const [platformOverride, setPlatformOverride] = useState<"auto" | "linux" | "macos" | "windows">("auto");
  const [windowsShell, setWindowsShell] = useState<"windows-powershell" | "windows-cmd">("windows-powershell");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"privacy" | "help" | "about">("privacy");
  const [serverError, setServerError] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyWarning, setApiKeyWarning] = useState("");
  const [fromServerError, setFromServerError] = useState("");
  const [fromApiKeyError, setFromApiKeyError] = useState("");
  const [pendingLiveAction, setPendingLiveAction] = useState<
    { type: "preset"; preset: NonNullable<FriendlyState["preset"]> } | { type: "dry-run-off" } | null
  >(null);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const detectedOs = useMemo(() => detectOS(), []);
  const os = platformOverride === "auto" ? detectedOs : platformOverride;
  const selectedShell: CommandShell = os === "windows" ? windowsShell : "unix";

  const update = useCallback((partial: Partial<FriendlyState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return;
    try {
      const remembered = JSON.parse(raw) as { serverUrl?: string; apiKey?: string };
      if (remembered.serverUrl || remembered.apiKey) {
        setState((prev) => ({
          ...prev,
          serverUrl: remembered.serverUrl ?? prev.serverUrl,
          apiKey: remembered.apiKey ?? prev.apiKey,
          rememberOnDevice: true,
        }));
      }
    } catch {
      // Ignore malformed local storage.
    }
  }, []);

  const reset = useCallback(() => {
    setState({ ...defaultFriendlyState });
    setStep(1);
    setServerError("");
    setApiKeyError("");
    setApiKeyWarning("");
    setFromServerError("");
    setFromApiKeyError("");
    setTestStatus("idle");
    setTestMessage("");
  }, []);

  const presets = useMemo(() => getPresets(state.source), [state.source]);
  const command = useMemo(() => buildFriendlyCommand(state, os, selectedShell), [state, os, selectedShell]);
  const checklist = useMemo(() => getCommandChecklist(state, os), [state, os]);
  const isDryRun = command.includes(FLAG_REGISTRY.dryRun.name);
  const missingDestKey = !state.apiKey.trim();
  const missingSourceKey = state.source === "immich" && !state.fromApiKey.trim();
  const usesKeyPlaceholder = missingDestKey || missingSourceKey;
  const shellOptions = useMemo(() => getSupportedShells(os), [os]);
  const shellLabel = selectedShell === "windows-cmd"
    ? "Windows CMD"
    : selectedShell === "windows-powershell"
      ? "Windows PowerShell"
      : os === "macos"
        ? "macOS"
        : "Linux";
  const speedHint = state.customSpeed === "slow"
    ? "Gentle on your server"
    : state.customSpeed === "fast"
      ? "Fastest throughput"
      : "Balanced speed and safety";

  const highlightedCommand = useMemo(() => {
    // Masks both --api-key= (destination) and --from-api-key= (from-immich source) —
    // but leaves placeholder values (YOUR_API_KEY / YOUR_SOURCE_API_KEY) visible, since
    // the whole point is that the user can see exactly what to swap in.
    const masked = showKey
      ? command
      : command.replace(
          new RegExp(`(--(?:from-)?api-key=)([^\\s\\\\` + "`" + `]+)`, "g"),
          (fullMatch, prefix, value) => {
            if (value === API_KEY_PLACEHOLDER || value === SOURCE_API_KEY_PLACEHOLDER) return fullMatch;
            return `${prefix}●●●●●●●●`;
          }
        );
    const parts = masked.split(FLAG_REGISTRY.dryRun.name);
    return parts.reduce<React.ReactNode[]>((acc, segment, index) => {
      if (index > 0) {
        acc.push(
          <span key={`dry-${index}`} className="text-step-done font-semibold">
            {FLAG_REGISTRY.dryRun.name}
          </span>
        );
      }
      if (segment) acc.push(<span key={`seg-${index}`}>{segment}</span>);
      return acc;
    }, []);
  }, [command, showKey]);

  const handleSourceContinue = () => {
    if (!state.source) return;
    if (!state.preset) {
      update({ preset: "test-run" });
    }
    setStep(2);
  };

  // Shared field validation for both Continue and Test connection. The server URL(s)
  // are always required — the command is meaningless without them. The API key(s) are
  // only required when `requireKey` is set (Test connection needs a real key to ping;
  // Continue doesn't — a blank key becomes a placeholder in the generated command, so
  // it never has to touch this page at all). Format issues on a non-empty key (short,
  // unusual shape) are always just a soft warning, never a blocker.
  const requiredFieldsPresent = useCallback((opts?: { requireKey?: boolean }) => {
    const requireKey = opts?.requireKey ?? false;
    const server = state.serverUrl.trim();
    const key = state.apiKey.trim();
    setServerError("");
    setApiKeyError("");
    setApiKeyWarning("");
    setFromServerError("");
    setFromApiKeyError("");

    let missing = false;
    if (!server) {
      setServerError("Enter your Immich server URL.");
      missing = true;
    } else if (!/^https?:\/\//i.test(server)) {
      setServerError("Don't forget http:// or https:// at the start.");
      missing = true;
    }
    if (!key) {
      if (requireKey) {
        setApiKeyError("Enter your key to test the connection, or continue without one.");
        missing = true;
      }
    } else {
      const keyValidation = validateApiKeyFormat(key);
      if (keyValidation.level !== "ok") {
        setApiKeyWarning(keyValidation.message);
      }
    }
    if (state.source === "immich") {
      const fromServer = state.fromServerUrl.trim();
      if (!fromServer) {
        setFromServerError("Enter the source Immich server URL.");
        missing = true;
      } else if (!/^https?:\/\//i.test(fromServer)) {
        setFromServerError("Don't forget http:// or https:// at the start.");
        missing = true;
      }
      if (!state.fromApiKey.trim() && requireKey) {
        setFromApiKeyError("Enter your source key to test, or continue without one.");
        missing = true;
      }
    }
    return !missing;
  }, [state.serverUrl, state.apiKey, state.source, state.fromServerUrl, state.fromApiKey]);

  const rememberCredentials = useCallback(() => {
    if (state.rememberOnDevice) {
      const key = state.apiKey.trim();
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify(
          key ? { serverUrl: state.serverUrl.trim(), apiKey: key } : { serverUrl: state.serverUrl.trim() }
        )
      );
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [state.rememberOnDevice, state.serverUrl, state.apiKey]);

  // Continue always works once the fields the command needs are present — the
  // connection test below is informational only and never gates this.
  const proceed = () => {
    if (!requiredFieldsPresent()) return;
    rememberCredentials();
    setStep(3);
  };

  const runConnectionTest = async () => {
    setTestStatus("idle");
    setTestMessage("");
    if (!requiredFieldsPresent({ requireKey: true })) return;

    const server = state.serverUrl.trim();
    const key = state.apiKey.trim();
    setConnecting(true);
    try {
      const url = server.replace(/\/+$/, "");
      const response = await fetch(`${url}/api/server/about`, {
        headers: { "x-api-key": key },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setTestStatus("error");
          setTestMessage("Server reached, but the API key was rejected. You can still Continue if you're sure it's right.");
          return;
        }
        setTestStatus("error");
        setTestMessage(`Server responded with HTTP ${response.status}. You can still Continue.`);
        return;
      }

      setTestStatus("success");
      setTestMessage("Connected successfully.");
      rememberCredentials();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const likelyCorsOrNetwork = /failed to fetch|networkerror|load failed|fetch/i.test(message);
      const privateHost = isPrivateHost(server);

      if (likelyCorsOrNetwork && privateHost) {
        setTestStatus("warning");
        setTestMessage(
          "Browser blocked the test request (likely CORS). This is common for local IPs like 192.168.x.x — Continue still works, this check is just informational."
        );
        return;
      }

      if (likelyCorsOrNetwork) {
        setTestStatus("warning");
        setTestMessage("Network or CORS blocked the browser test. Continue still works — this check is just informational.");
        return;
      }

      setTestStatus("error");
      setTestMessage("Couldn't reach the server. You can still Continue if you're sure the URL/key are correct.");
    } finally {
      setConnecting(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadScript = () => {
    const ext = selectedShell === "windows-cmd" ? "cmd" : selectedShell === "windows-powershell" ? "ps1" : "sh";
    const blob = new Blob([`${command}\n`], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `immich-go-upload.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const selectSource = (source: UploadSource) => {
    update({ source, preset: "test-run", inputPath: "" });
  };

  const selectedPreset = state.preset ?? "test-run";
  const presetKeepsDryRun = (preset: FriendlyState["preset"]) => {
    if (preset === "test-run") return true;
    if (preset === "custom") return state.customDryRun;
    return false;
  };
  const handlePresetChange = (preset: FriendlyState["preset"]) => {
    if (!preset) return;
    const nextDryRun = presetKeepsDryRun(preset);
    if (isDryRun && !nextDryRun) {
      setPendingLiveAction({ type: "preset", preset });
      return;
    }
    update({ preset });
  };
  const confirmLiveAction = () => {
    if (!pendingLiveAction) return;
    if (pendingLiveAction.type === "preset") {
      update({ preset: pendingLiveAction.preset });
    } else {
      update({ customDryRun: false });
    }
    setPendingLiveAction(null);
  };

  const bgUrl = `${import.meta.env.BASE_URL}luca-micheli-ruWkmt3nU58-unsplash.jpg`;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-4"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <MacWindow onSettingsClick={() => { setSettingsTab("privacy"); setSettingsOpen(true); }}>
        <StepIndicator currentStep={step} totalSteps={4} labels={stepLabels} />
        {/* Dashed divider — separates step indicator from step content */}
        <div className="border-t border-dashed border-border -mx-6 mb-6" />
        {step >= 3 && (
          <div className="mb-4 flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  {osDisplay[os]}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={platformOverride}
                  onValueChange={(value) => setPlatformOverride(value as typeof platformOverride)}
                >
                  <DropdownMenuRadioItem value="auto">Auto ({osDisplay[detectedOs]})</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="macos">macOS</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="windows">Windows</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="linux">Linux</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
        {step === 1 && (
          <m.div key="step-1" {...stepMotionProps} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">What would you like to upload?</h2>
              <p className="text-sm text-muted-foreground">
                Pick one option. You can change it anytime.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {sourceOptions.map(({ id, icon: Icon, title, subtitle }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectSource(id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-[color,background-color,border-color,transform] active:scale-[0.985] bg-muted/60",
                    state.source === id
                      ? "border-step-active bg-step-active/10"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <Icon className="mb-3 h-6 w-6 text-step-active" />
                  <div className="font-medium">{title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
                </button>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Not sure? Most people choose <span className="font-medium text-foreground">Photos from my computer</span>.
            </p>

            {/* Dashed divider above footer */}
            <div className="border-t border-dashed border-border -mx-6 mt-2 mb-4" />
            <div className="flex justify-end">
              <Button onClick={handleSourceContinue} disabled={!state.source}>
                Continue
              </Button>
            </div>
          </m.div>
        )}

        {step === 2 && (
          <m.div key="step-2" {...stepMotionProps} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                {state.source === "immich" ? "Connect both Immich servers" : "Connect to your Immich server"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Source: {getSourceLabel(state.source)}
              </p>
            </div>

            {state.source === "immich" && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-medium">Source server (migrate from)</h3>
                <div className="space-y-2">
                  <Label htmlFor="from-server-url">Source server address</Label>
                  <Input
                    id="from-server-url"
                    value={state.fromServerUrl}
                    onChange={(e) => update({ fromServerUrl: e.target.value })}
                    placeholder="https://old-immich.example.com"
                    inputMode="url"
                    autoComplete="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {fromServerError && <p className="text-xs text-destructive">{fromServerError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-api-key">
                    Source API key <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="from-api-key"
                    type="password"
                    value={state.fromApiKey}
                    onChange={(e) => update({ fromApiKey: e.target.value })}
                    placeholder="API key for the source server"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank for a <code className="font-mono">{SOURCE_API_KEY_PLACEHOLDER}</code> placeholder.
                  </p>
                  {fromApiKeyError && <p className="text-xs text-destructive">{fromApiKeyError}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="server-url">
                {state.source === "immich" ? "Destination server address" : "Your server address"}
              </Label>
              <Input
                id="server-url"
                value={state.serverUrl}
                onChange={(e) => update({ serverUrl: e.target.value })}
                placeholder="https://photos.example.com"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">This is the URL you use to open Immich.</p>
              {serverError && <p className="text-xs text-destructive">{serverError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">
                {state.source === "immich" ? "Destination API key" : "Your API key"}{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="api-key"
                type="password"
                value={state.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="Paste your API key"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Leave this blank and the command will contain{" "}
                <code className="font-mono">{API_KEY_PLACEHOLDER}</code> for you to swap in
                yourself — your key never has to touch this page at all.
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <a
                  href="https://immich.app/docs/features/command-line-interface/#generate-the-api-key"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline underline-offset-2 text-foreground/70 hover:text-foreground"
                >
                  Where do I find my API key?
                </a>
                <button
                  type="button"
                  onClick={() => { setSettingsTab("help"); setSettingsOpen(true); }}
                  className="text-xs underline underline-offset-2 text-foreground/70 hover:text-foreground"
                >
                  What permissions does my key need?
                </button>
              </div>
              {apiKeyError && <p className="text-xs text-destructive">{apiKeyError}</p>}
              {!apiKeyError && apiKeyWarning && (
                <p className="text-xs text-mac-yellow">{apiKeyWarning}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={state.rememberOnDevice}
                onCheckedChange={(checked) => update({ rememberOnDevice: Boolean(checked) })}
              />
              Remember on this device
            </label>

            {testStatus !== "idle" && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-xs",
                  testStatus === "success" && "border-step-done/30 bg-step-done/10 text-step-done",
                  testStatus === "warning" && "border-mac-yellow/40 bg-mac-yellow/10 text-foreground",
                  testStatus === "error" && "border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                {testStatus === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                {testStatus === "warning" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {testStatus === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{testMessage}</span>
              </div>
            )}

            {/* Dashed divider above footer */}
            <div className="border-t border-dashed border-border -mx-6 mt-2 mb-4" />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={runConnectionTest} disabled={connecting}>
                  {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Test connection
                </Button>
                <Button onClick={proceed}>Continue</Button>
              </div>
            </div>
          </m.div>
        )}

        {step === 3 && (
          <m.div key="step-3" {...stepMotionProps} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Choose your style</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll map your choice to the right command automatically.
              </p>
            </div>

            {sourceUsesPath(state.source) && (
              <div className="space-y-2">
                <Label htmlFor="input-path">{getPathLabel(state.source)}</Label>
                <Input
                  id="input-path"
                  value={state.inputPath}
                  onChange={(e) => update({ inputPath: e.target.value })}
                  placeholder={getPathPlaceholder(state.source, os)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: drag the folder/file into Terminal to get the full path, then paste it here.
                </p>
                {state.source === "takeout" && (
                  <p className="text-xs text-mac-yellow">
                    Google Takeout exports multiple zip files. Use a wildcard pattern
                    like <code className="font-mono">takeout-*.zip</code> to include
                    them all, or point to the folder containing the extracted files.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {/* Section label — muted xs style like Linear */}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">How should we handle this?</p>
              <div className="grid gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-[color,background-color,border-color,transform] active:scale-[0.985] bg-muted/60",
                      selectedPreset === preset.id
                        ? "border-step-active bg-step-active/10"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{preset.title}</div>
                        <div className="text-sm text-muted-foreground">{preset.subtitle}</div>
                        {preset.hint && (
                          <div className="mt-1 text-xs text-muted-foreground">{preset.hint}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {preset.recommended && (
                          <span className="rounded-full bg-step-done/15 px-2 py-1 text-xs font-medium text-step-done">
                            recommended
                          </span>
                        )}
                        {preset.id === "test-run" || (preset.id === "custom" && state.customDryRun) ? (
                          <span className="rounded-full bg-step-done/15 px-2 py-1 text-xs font-medium text-step-done">
                            dry run
                          </span>
                        ) : preset.id !== "custom" ? (
                          <span className="rounded-full bg-step-active/15 px-2 py-1 text-xs font-medium text-step-active">
                            live upload
                          </span>
                        ) : (
                          <span className="rounded-full bg-step-active/15 px-2 py-1 text-xs font-medium text-step-active">
                            live upload
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedPreset === "custom" && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="font-medium">Custom settings</h3>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Start with a test run?</Label>
                    <Switch
                      checked={state.customDryRun}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          setPendingLiveAction({ type: "dry-run-off" });
                          return;
                        }
                        update({ customDryRun: checked });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Yes means nothing gets uploaded until you disable it.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Upload speed</Label>
                  <div className="flex gap-2">
                    {(["slow", "balanced", "fast"] as const).map((speed) => (
                      <Button
                        key={speed}
                        type="button"
                        variant={state.customSpeed === speed ? "default" : "outline"}
                        size="sm"
                        onClick={() => update({ customSpeed: speed })}
                      >
                        {speed[0].toUpperCase() + speed.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{speedHint}</p>
                </div>

                {getCreateAlbumsLabel(state.source) && (
                  <div className="flex items-center justify-between">
                    <Label>{getCreateAlbumsLabel(state.source)}</Label>
                    <Switch
                      checked={state.customCreateAlbums}
                      onCheckedChange={(checked) => update({ customCreateAlbums: checked })}
                    />
                  </div>
                )}

                {state.source !== "immich" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Do you shoot RAW + JPEG?</Label>
                    <Switch
                      checked={state.customShootsRawJpeg}
                      onCheckedChange={(checked) => update({ customShootsRawJpeg: checked })}
                    />
                  </div>
                  {state.customShootsRawJpeg && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={state.customRawCover === "jpeg" ? "default" : "outline"}
                        size="sm"
                        onClick={() => update({ customRawCover: "jpeg" })}
                      >
                        Show JPEG version
                      </Button>
                      <Button
                        type="button"
                        variant={state.customRawCover === "raw" ? "default" : "outline"}
                        size="sm"
                        onClick={() => update({ customRawCover: "raw" })}
                      >
                        Show RAW version
                      </Button>
                    </div>
                  )}
                </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Only upload photos from a specific date range?</Label>
                    <Switch
                      checked={state.customUseDateRange}
                      onCheckedChange={(checked) => update({ customUseDateRange: checked })}
                    />
                  </div>
                  {state.customUseDateRange && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={state.customDateFrom}
                        onChange={(e) => update({ customDateFrom: e.target.value })}
                      />
                      <Input
                        type="date"
                        value={state.customDateTo}
                        onChange={(e) => update({ customDateTo: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-tag">Add a tag to this upload?</Label>
                  <Input
                    id="custom-tag"
                    value={state.customTag}
                    onChange={(e) => update({ customTag: e.target.value })}
                    placeholder="e.g. vacation-2024"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Helps you find this batch later.
                  </p>
                </div>

                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2"
                  onClick={() => update({ showRawFlags: !state.showRawFlags })}
                >
                  {state.showRawFlags ? "Hide raw command flags" : "Show raw command flags"}
                </button>

                {state.showRawFlags && (
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      These are the real CLI flags generated from your answers.
                    </p>
                    <ul className="space-y-1 font-mono text-xs">
                      {getRawFlagPreview(state).map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Dashed divider above footer */}
            <div className="border-t border-dashed border-border -mx-6 mt-2 mb-4" />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={(sourceUsesPath(state.source) && !state.inputPath.trim()) || !state.preset}
              >
                Generate command
              </Button>
            </div>
          </m.div>
        )}

        {step === 4 && (
          <m.div key="step-4" {...stepMotionProps} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">You&apos;re all set</h2>
              <p className="text-sm text-muted-foreground">
                Copy this command and run it in your terminal.
              </p>
            </div>

            <div className={cn(
              "rounded-md border px-3 py-2 text-base font-semibold",
              isDryRun
                ? "border-step-done/30 bg-step-done/10 text-step-done"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            )}>
              {isDryRun
                ? "🛡️ This is a test run — nothing will upload."
                : "⚠️ Live mode — files will be uploaded to your server."}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs">
                Platform: {os}
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs">
                Shell: {shellLabel}
              </span>
              {os === "windows" && (
                <div className="ml-auto flex gap-2">
                  {shellOptions.map((shell) => (
                    <Button
                      key={shell}
                      type="button"
                      size="sm"
                      variant={selectedShell === shell ? "default" : "outline"}
                      onClick={() => setWindowsShell(shell as "windows-powershell" | "windows-cmd")}
                    >
                      {shell === "windows-powershell" ? "PowerShell" : "CMD"}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {usesKeyPlaceholder && (
              <div className="flex items-start gap-2 rounded-md border border-mac-yellow/40 bg-mac-yellow/10 p-3 text-xs text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Replace{" "}
                  <code className="font-mono">
                    {missingDestKey ? API_KEY_PLACEHOLDER : ""}
                    {missingDestKey && missingSourceKey ? " and " : ""}
                    {missingSourceKey ? SOURCE_API_KEY_PLACEHOLDER : ""}
                  </code>{" "}
                  with your real key{missingDestKey && missingSourceKey ? "s" : ""} before running.
                </span>
              </div>
            )}

            <div className="rounded-lg bg-terminal-bg p-4">
              <pre className="text-sm font-mono text-terminal-fg overflow-x-auto whitespace-pre leading-relaxed">
                <span className="text-terminal-green select-none">$ </span>
                {highlightedCommand}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                className="min-w-[220px]"
                onClick={handleCopy}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : null}
                {copied ? "Copied" : "Copy command"}
              </Button>
              <Button variant="link" onClick={handleDownloadScript}>
                Download as script
              </Button>
              <Button variant="ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? "Hide key" : "Reveal key"}
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What does this command do?</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {checklist.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">After you run it</p>
              <p className="mt-2 text-sm text-muted-foreground">
                immich-go prints its progress as it goes. When it's done, check your Immich library
                — if your photos are there, you're all set. A line like{" "}
                <code className="font-mono text-xs">WARNING: N assets did not reach a final state</code>{" "}
                is usually harmless (common with multi-part Google Takeout exports) — it doesn't
                mean anything failed. See{" "}
                <button
                  type="button"
                  onClick={() => { setSettingsTab("help"); setSettingsOpen(true); }}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Settings → Help
                </button>{" "}
                for more.
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              Don&apos;t have immich-go installed?{" "}
              <a
                href="https://github.com/simulot/immich-go"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 text-foreground/70 hover:text-foreground"
              >
                How to install (takes ~2 minutes)
              </a>
            </div>

            {/* Dashed divider above footer */}
            <div className="border-t border-dashed border-border -mx-6 mt-2 mb-4" />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            </div>
          </m.div>
        )}
        </AnimatePresence>
        <AlertDialog
          open={pendingLiveAction !== null}
          onOpenChange={(open) => {
            if (!open) setPendingLiveAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to live upload?</AlertDialogTitle>
              <AlertDialogDescription>
                This turns off the test run. The generated command will upload real files to your
                server when you run it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep test run</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLiveAction}>Switch to live</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MacWindow>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tab={settingsTab}
        onTabChange={setSettingsTab}
      />
      <span className="fixed bottom-2 left-3 text-[10px] text-white/60 drop-shadow-sm">
        Photo by Luca Micheli on Unsplash
      </span>
    </div>
  );
};

export default Index;
