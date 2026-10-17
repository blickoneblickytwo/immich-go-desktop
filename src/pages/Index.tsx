import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MacWindow from "@/components/MacWindow";
import SettingsDialog from "@/components/SettingsDialog";
import StepIndicator from "@/components/StepIndicator";
import AdvancedSettings from "@/components/AdvancedSettings";
import { advancedForSource } from "@/lib/advanced-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { detectOS } from "@/lib/os";
import { FLAG_REGISTRY } from "@/lib/flag-registry";
import {
  API_KEY_PLACEHOLDER,
  SOURCE_API_KEY_PLACEHOLDER,
  buildFriendlyCommand,
  buildMaskedCommand,
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
  isDryRun as isTestRun,
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
import { parseServerUrl, testDestinationConnection } from "@/lib/connection";
import { clearSavedConnection, readSavedConnection, saveConnection } from "@/lib/connection-storage";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Loader2, XCircle } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";

const LogReview = lazy(() => import("@/pages/LogReview"));

const stepLabels = ["What to upload", "Connect", "Choose style", "Done"];

const osDisplay: Record<"macos" | "windows" | "linux", string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const sourceOptions: { id: UploadSource; title: string; subtitle: string; tag: string }[] = [
  { id: "folder", title: "Photos from my computer", subtitle: "Import a folder of photos from your computer into Immich.", tag: "photo folder" },
  { id: "takeout", title: "Google Photos Takeout", subtitle: "Bring your Google Photos library into Immich from a Takeout export.", tag: "google takeout" },
  { id: "icloud", title: "Apple iCloud export", subtitle: "Bring your photos into Immich from an Apple iCloud export.", tag: "icloud export" },
  { id: "immich", title: "Another Immich server", subtitle: "Move your library from another Immich server into this one.", tag: "immich server" },
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
  const [searchParams] = useSearchParams();
  // Query-based view works on static hosting without a server-side route fallback.
  const reviewingLog = searchParams.get("view") === "import-report";
  const wizard = useRef<HTMLDivElement>(null);
  const wasReviewingLog = useRef(reviewingLog);
  useEffect(() => {
    if (wasReviewingLog.current && !reviewingLog) {
      const heading = wizard.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    }
    wasReviewingLog.current = reviewingLog;
  }, [reviewingLog]);
  const reducedMotion = useReducedMotion();
  const stepMotionProps = {
    initial: { opacity: 0, y: reducedMotion ? 0 : 6 },
    animate: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0.12 : 0.32, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, y: reducedMotion ? 0 : -4, transition: { duration: reducedMotion ? 0.08 : 0.16, ease: "easeIn" as const } },
  };
  const [step, setStep] = useState(1);
  const [state, setState] = useState<FriendlyState>({ ...defaultFriendlyState });
  const [platformOverride, setPlatformOverride] = useState<"auto" | "linux" | "macos" | "windows">("auto");
  const [windowsShell, setWindowsShell] = useState<"windows-powershell" | "windows-cmd">("windows-powershell");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [scriptMessage, setScriptMessage] = useState("");
  const [scriptDownloaded, setScriptDownloaded] = useState(false);
  const scriptRequest = useRef({ active: true, request: 0 });
  const [storageMessage, setStorageMessage] = useState("");
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
  useEffect(() => {
    const context = { active: true, request: 0 };
    scriptRequest.current = context;
    setScriptMessage(""); setScriptDownloaded(false);
    return () => { context.active = false; };
  }, [state, os, step, reviewingLog]);

  const update = useCallback((partial: Partial<FriendlyState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    // Long option/command screens must not leave the next step halfway down the page.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step, reviewingLog]);

  useEffect(() => {
    const saved = readSavedConnection();
    if (saved.connection) {
      setState((prev) => ({ ...prev, ...saved.connection, rememberOnDevice: true }));
    }
  }, []);

  useEffect(() => { setShowKey(false); }, [state.apiKey, state.fromApiKey]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const reset = useCallback(() => {
    setState({ ...defaultFriendlyState });
    setShowKey(false);
    setCopyError("");
    setStorageMessage("");
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
  const selectedSource = sourceOptions.find((source) => source.id === state.source);
  const { command, maskedCommand, commandError } = useMemo(() => {
    try {
      return { command: buildFriendlyCommand(state, os, selectedShell), maskedCommand: buildMaskedCommand(state, os, selectedShell), commandError: "" };
    } catch (error) {
      return { command: "", maskedCommand: "", commandError: error instanceof Error ? error.message : "Check your command inputs." };
    }
  }, [state, os, selectedShell]);
  const guidedError = useMemo(() => {
    try {
      // The guided download omits form keys and always uses PowerShell on Windows.
      buildFriendlyCommand({ ...state, apiKey: "", fromApiKey: "" }, os, os === "windows" ? "windows-powershell" : "unix");
      return "";
    } catch (error) { return error instanceof Error ? error.message : "Check your import settings."; }
  }, [state, os]);
  const checklist = useMemo(() => getCommandChecklist(state, os), [state, os]);
  const isDryRun = isTestRun(state);
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
  const speedHint = state.advanced.concurrency.trim()
    ? "Concurrent tasks in Advanced overrides this setting."
    : state.customSpeed === "slow" ? "2 concurrent tasks. Gentler on your server."
    : state.customSpeed === "fast" ? "8 concurrent tasks. Uses more resources."
    : "Let immich-go choose concurrency for this computer.";

  const highlightedCommand = useMemo(() => {
    const masked = showKey ? command : maskedCommand;
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
  }, [command, maskedCommand, showKey]);

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
  const requiredFieldsPresent = useCallback((opts?: { requireKey?: boolean; destinationOnly?: boolean }) => {
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
    } else {
      try { parseServerUrl(server); } catch (error) {
        setServerError(error instanceof Error ? error.message : "Check the server address.");
        missing = true;
      }
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
    if (state.source === "immich" && !opts?.destinationOnly) {
      const fromServer = state.fromServerUrl.trim();
      if (!fromServer) {
        setFromServerError("Enter the source Immich server URL.");
        missing = true;
      } else {
        try { parseServerUrl(fromServer); } catch (error) {
          setFromServerError(error instanceof Error ? error.message : "Check the source server address.");
          missing = true;
        }
      }
    }
    return !missing;
  }, [state.serverUrl, state.apiKey, state.source, state.fromServerUrl]);

  const rememberCredentials = useCallback(() => {
    const success = state.rememberOnDevice
      ? saveConnection({ serverUrl: state.serverUrl, apiKey: state.apiKey })
      : clearSavedConnection();
    setStorageMessage(success ? "" : state.rememberOnDevice
      ? "Browser storage is unavailable. Connection details were not saved; you can still continue."
      : "Could not clear saved details. Clear this site’s data in your browser settings.");
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
    if (!requiredFieldsPresent({ requireKey: true, destinationOnly: true })) return;

    const server = state.serverUrl.trim();
    const key = state.apiKey.trim();
    setConnecting(true);
    try {
      const result = await testDestinationConnection(server, key);
      if (result.status < 200 || result.status >= 300) {
        setTestStatus("error");
        setTestMessage(result.status === 401 || result.status === 403
          ? "The server rejected this test. Check the destination key and server.about permission; Continue still works."
          : `Server responded with HTTP ${result.status}. You can still Continue.`);
        return;
      }
      if (!result.isImmichResponse) {
        setTestStatus("warning");
        setTestMessage("The server responded without Immich version information. Check the base URL; Continue still works.");
        return;
      }

      setTestStatus("success");
      setTestMessage("Destination server responded. This does not verify all import permissions or the source server.");
      rememberCredentials();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const likelyCorsOrNetwork = /failed to fetch|networkerror|load failed|fetch/i.test(message);
      const privateHost = isPrivateHost(server);

      if (likelyCorsOrNetwork && privateHost) {
        setTestStatus("warning");
        setTestMessage(
          "The test could not complete. Check the address, CORS, redirects, and local-network access. Continue still works."
        );
        return;
      }

      if (likelyCorsOrNetwork) {
        setTestStatus("warning");
        setTestMessage("The browser could not complete the test. Network restrictions, CORS, or a redirect may be responsible. Continue still works.");
        return;
      }

      setTestStatus("error");
      setTestMessage("The test failed or timed out. Verify the destination URL and key before running your command.");
    } finally {
      setConnecting(false);
    }
  };

  const handleCopy = async () => {
    if (commandError) return;
    setCopyError("");
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopyError("Clipboard access failed. Reveal the key if needed, then select and copy the command.");
    }
  };

  const handleDownloadScript = () => {
    if (guidedError) return;
    const context = scriptRequest.current;
    const request = ++context.request;
    setScriptMessage("Preparing your guided script…");
    import("@/lib/guided-script").then(({ buildGuidedScript }) => {
      if (!context.active || request !== context.request) return;
      const script = buildGuidedScript(state, os);
      const blob = new Blob([script.content], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = script.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setScriptMessage(`Downloaded ${script.filename}. Follow the instructions below to run it.`);
      setScriptDownloaded(true);
    }).catch(() => {
      if (context.active && request === context.request) setScriptMessage("The script could not be prepared. Check your settings and try again.");
    });
  };

  const selectSource = (source: UploadSource) => {
    update({ source, preset: "test-run", inputPath: "", advanced: advancedForSource(state.advanced, source) });
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

  return (
    <><div ref={wizard} hidden={reviewingLog}>
    <div className="import-page">
      <MacWindow onSettingsClick={() => { setSettingsTab("privacy"); setSettingsOpen(true); }}>
        <StepIndicator currentStep={step} totalSteps={4} labels={stepLabels} />
        {storageMessage && <p role="status" className="mb-4 text-xs text-destructive">{storageMessage}</p>}
        {step >= 3 && (
          <div className="platform-control">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                >
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
          <m.div key="step-1" {...stepMotionProps} className="source-step">
            <div>
              <h1 className="step-heading">Bring your photos to Immich.</h1>
              <AnimatePresence mode="wait" initial={false}>
                <m.p
                  key={state.source ?? "intro"}
                  className="source-description"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.1 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {selectedSource?.subtitle ?? "Choose where your photos are coming from. We’ll prepare a command for your import."}
                </m.p>
              </AnimatePresence>
            </div>
            <div className="source-actions">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="source-picker" type="button" aria-label={selectedSource ? `Upload source: ${selectedSource.title}` : "Upload source"}>
                    {selectedSource?.tag ?? "choose source"}
                    <ChevronDown aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={10} className="source-menu">
                  <DropdownMenuRadioGroup value={state.source ?? ""} onValueChange={(value) => selectSource(value as UploadSource)}>
                    {sourceOptions.map(({ id, title }) => (
                      <DropdownMenuRadioItem key={id} value={id}>{title}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="round-action" size="icon" onClick={handleSourceContinue} disabled={!state.source} aria-label="Continue" title="Continue">
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </m.div>
        )}

        {step === 2 && (
          <m.div key="step-2" {...stepMotionProps} className="space-y-5">
            <div className="space-y-1">
              <h1 className="step-heading">
                {state.source === "immich" ? "Connect both servers." : "Connect to Immich."}
              </h1>
              <p className="text-sm text-muted-foreground">
                Source: {getSourceLabel(state.source)}
              </p>
            </div>

            {state.source === "immich" && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <h2 className="text-sm font-medium">Source server (migrate from)</h2>
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
                    The guided script asks for this key when run. Manual commands use <code className="font-mono">{SOURCE_API_KEY_PLACEHOLDER}</code> if blank.
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
              {serverError && <p className="text-xs text-destructive">{serverError}</p>}
              {state.serverUrl.trim().toLowerCase().startsWith("http://") && <p className="text-xs text-step-active">HTTP does not encrypt the connection-test key. Use HTTPS when available.</p>}
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
                The guided script asks for your key when run. Enter it here only for a browser test or manual command.
              </p>
              <details className="quiet-details">
                <summary>API key help</summary>
                <div className="details-content flex flex-wrap gap-x-3 gap-y-2">
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
              </details>
              {apiKeyError && <p className="text-xs text-destructive">{apiKeyError}</p>}
              {!apiKeyError && apiKeyWarning && (
                <p className="text-xs text-step-active">{apiKeyWarning}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={state.rememberOnDevice}
                onCheckedChange={(checked) => {
                  const remember = Boolean(checked);
                  update({ rememberOnDevice: remember });
                  if (!remember && !clearSavedConnection()) {
                    setStorageMessage("Could not clear saved details. Clear this site’s data in your browser settings.");
                  } else { setStorageMessage(""); }
                }}
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

            <div className="step-footer">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={runConnectionTest} disabled={connecting}>
                  {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {state.source === "immich" ? "Test destination" : "Test connection"}
                </Button>
                <Button className="round-action" size="icon" onClick={proceed} aria-label="Continue" title="Continue"><ArrowRight aria-hidden="true" /></Button>
              </div>
            </div>
          </m.div>
        )}

        {step === 3 && (
          <m.div key="step-3" {...stepMotionProps} className="space-y-5">
            <div className="space-y-1">
              <h1 className="step-heading">Choose your import.</h1>
              <p className="text-sm text-muted-foreground">
                Start with a test run, or upload when you’re ready.
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
                  <p className="text-xs text-muted-foreground">
                    Google Takeout exports multiple zip files. Use a wildcard pattern
                    like <code className="font-mono">takeout-*.zip</code> to include
                    them all, or point to the folder containing the extracted files.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="grid gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    aria-pressed={selectedPreset === preset.id}
                    className={cn(
                      "preset-card",
                      selectedPreset === preset.id && "preset-card-selected"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{preset.title}</div>
                        <div className="text-xs text-muted-foreground">{preset.subtitle}</div>
                        {selectedPreset === preset.id && preset.hint && (
                          <div className="mt-1 text-xs text-muted-foreground">{preset.hint}</div>
                        )}
                      </div>
                      {selectedPreset === preset.id && <div className="shrink-0">
                        {preset.id === "test-run" || (preset.id === "custom" && state.customDryRun) ? (
                          <span className="mode-tag text-step-done">
                            dry run
                          </span>
                        ) : preset.id !== "custom" ? (
                          <span className="mode-tag text-step-active">
                            live upload
                          </span>
                        ) : (
                          <span className="mode-tag text-step-active">
                            live upload
                          </span>
                        )}
                      </div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedPreset === "custom" && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                <h2 className="font-medium">Custom settings</h2>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
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
                    Photo uploads are disabled, but a test run still makes server requests.
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
                  <div className="flex items-center justify-between gap-4">
                    <Label>{getCreateAlbumsLabel(state.source)}</Label>
                    <Switch
                      checked={state.customCreateAlbums}
                      onCheckedChange={(checked) => update({ customCreateAlbums: checked })}
                    />
                  </div>
                )}

                {state.source !== "immich" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
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
                  <div className="flex items-center justify-between gap-4">
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

                <AdvancedSettings source={state.source} value={state.advanced} onChange={advanced => update({ advanced })} />
                {guidedError && <p role="alert" className="text-xs text-destructive">{guidedError}</p>}
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2"
                  onClick={() => update({ showRawFlags: !state.showRawFlags })}
                >
                  {state.showRawFlags ? "Hide raw command flags" : "Show raw command flags"}
                </button>

                {state.showRawFlags && !commandError && (
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

            <div className="step-footer">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={(sourceUsesPath(state.source) && !state.inputPath.trim()) || !state.preset || Boolean(guidedError)}
              >
                Prepare import
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </m.div>
        )}

        {step === 4 && (
          <m.div key="step-4" {...stepMotionProps} className="space-y-5">
            <div className="space-y-1">
              <h1 className="step-heading">Ready for your test run.</h1>
              <p className="text-sm text-muted-foreground">
                Download a guided script. It sets up immich-go, asks for your keys, and tests before offering to upload.
              </p>
            </div>

            <Button size="lg" className="w-full" onClick={handleDownloadScript} disabled={Boolean(guidedError)}>Download guided script</Button>
            {guidedError && <p role="alert" className="text-sm text-destructive">{guidedError}</p>}
            <p className="text-xs text-muted-foreground">No separate immich-go installation needed. API keys entered here are left out of this download.</p>
            {scriptMessage && <p className="text-xs text-muted-foreground" role="status">{scriptMessage}</p>}
            <details className="quiet-details" open={scriptDownloaded || undefined}>
              <summary>How to run the download</summary>
              <div className="details-content space-y-2 text-sm text-muted-foreground">
                <p>Save it in Downloads on the computer with your photos. Open {os === "windows" ? "PowerShell" : "Terminal"}, then run:</p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs"><code>{os === "windows" ? '& "$HOME\\Downloads\\go-desktop-import.ps1"' : 'bash "$HOME/Downloads/go-desktop-import.sh"'}</code></pre>
                <p>Review the script before running. It checks your photo path and server, then runs a test. Type <strong>UPLOAD</strong> only when you are ready to upload using these settings. Enter stops after the test.</p>
                <p>Logs are saved in your user profile; the script prints their exact folder. They can contain private details.</p>
                {os === "windows" && <p>If Windows blocks the downloaded script, follow your device’s script policy or ask its administrator. This app does not change execution policies.</p>}
              </div>
            </details>

            <details className="quiet-details">
              <summary>Manual command</summary>
              <div className="details-content space-y-4">
            <p className="text-xs text-muted-foreground">For an existing immich-go installation. This command runs the selected mode directly; it does not include guided setup or prompts.</p>
            <div className={cn(
              "import-status text-sm",
              isDryRun
                ? "text-step-done"
                : "text-destructive"
            )}>
              {isDryRun
                ? "Test run. No photo uploads; server requests still occur when run."
                : "Live upload. This command uploads photos when run."}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {shellLabel}
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

            {commandError && <p role="alert" className="text-sm text-destructive">{commandError}</p>}
            {!commandError && <div className="command-panel rounded-2xl bg-terminal-bg p-5">
              <pre className="text-sm font-mono text-terminal-fg overflow-x-auto whitespace-pre leading-relaxed">
                <span className="text-terminal-green select-none">$ </span>
                {highlightedCommand}
              </pre>
            </div>}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                className="min-w-[220px]"
                onClick={handleCopy}
                disabled={Boolean(commandError)}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : null}
                {copied ? "Copied" : "Copy command"}
              </Button>
              {Boolean(state.apiKey.trim() || (state.source === "immich" && state.fromApiKey.trim())) && <Button variant="ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? "Hide key" : "Reveal key"}
              </Button>}
            </div>

            <p className="text-xs text-muted-foreground">Copied manual commands include any keys entered, even when the preview hides them. Keep them private. The guided download asks for keys when run.</p>
            {copyError && <p role="status" className="text-xs text-destructive">{copyError}</p>}

            <details className="quiet-details">
              <summary>What does this command do?</summary>
              <ul className="details-content space-y-1 text-sm text-muted-foreground">
                {checklist.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </details>
              </div>
            </details>

            <details className="quiet-details">
              <summary>After you run it</summary>
              <p className="details-content text-sm text-muted-foreground">
                immich-go prints its progress as it goes. When it's done, check your Immich library
                and review the final summary. A line like{" "}
                <code className="font-mono text-xs">WARNING: N assets did not reach a final state</code>{" "}
                needs a check for missing photos and a review of the log before treating the import as complete. See{" "}
                <button
                  type="button"
                  onClick={() => { setSettingsTab("help"); setSettingsOpen(true); }}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Settings → Help
                </button>{" "}
                for more.
              </p>
              <Link to="/?view=import-report" className="review-log-link">Review an import log</Link>
            </details>

            <div className="text-xs text-muted-foreground">
              <a
                href="https://github.com/simulot/immich-go"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 text-foreground/70 hover:text-foreground"
              >
                Manual immich-go installation guide
              </a>
            </div>

            <div className="step-footer">
              <Button variant="ghost" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button variant="ghost" onClick={reset}>
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
              <AlertDialogTitle>Use these upload settings?</AlertDialogTitle>
              <AlertDialogDescription>
                The guided download will still test first and ask before uploading. The manual
                command will upload real files to your server when run.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep test run</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLiveAction}>Use upload settings</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MacWindow>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tab={settingsTab}
        onTabChange={setSettingsTab}
        onForgetSavedConnection={() => update({ rememberOnDevice: false })}
      />
    </div>
    </div>{reviewingLog && <Suspense fallback={<p className="review-loading" role="status">Opening log review…</p>}><LogReview /></Suspense>}</>
  );
};

export default Index;
