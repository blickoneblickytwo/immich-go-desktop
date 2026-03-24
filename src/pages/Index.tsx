import { useCallback, useEffect, useMemo, useState } from "react";
import MacWindow from "@/components/MacWindow";
import StepIndicator from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { detectOS } from "@/lib/command-builder";
import { FLAG_REGISTRY } from "@/lib/flag-registry";
import {
  REMEMBER_KEY,
  buildFriendlyCommand,
  type CommandShell,
  defaultFriendlyState,
  getCommandChecklist,
  getPathLabel,
  getPathPlaceholder,
  getPresets,
  getRawFlagPreview,
  getSourceLabel,
  getSupportedShells,
  type FriendlyState,
  type UploadSource,
} from "@/lib/friendly-flow";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Folder, Image as ImageIcon, Loader2, XCircle } from "lucide-react";

const stepLabels = ["What to upload", "Connect", "Choose style", "Done"];

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
  const [connectError, setConnectError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyWarning, setApiKeyWarning] = useState("");
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
    setConnectError("");
    setServerError("");
    setApiKeyError("");
    setApiKeyWarning("");
    setTestStatus("idle");
    setTestMessage("");
  }, []);

  const presets = useMemo(() => getPresets(state.source), [state.source]);
  const command = useMemo(() => buildFriendlyCommand(state, os, selectedShell), [state, os, selectedShell]);
  const checklist = useMemo(() => getCommandChecklist(state, os), [state, os]);
  const isDryRun = command.includes(FLAG_REGISTRY.dryRun.name);
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

  const maskApiKey = (cmd: string) => {
    if (showKey) return cmd;
    return cmd.replace(
      new RegExp(`(${FLAG_REGISTRY.apiKey.name}=)([^\\s\\\\` + "`" + `]+)`, "g"),
      (_m, prefix) => `${prefix}●●●●●●●●`
    );
  };

  const highlightedCommand = useMemo(() => {
    const masked = maskApiKey(command);
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

  const validateConnection = async () => {
    const server = state.serverUrl.trim();
    const key = state.apiKey.trim();
    setServerError("");
    setApiKeyError("");
    setApiKeyWarning("");
    setConnectError("");
    setTestStatus("idle");
    setTestMessage("");

    let blocked = false;
    if (!server) {
      setServerError("Enter your Immich server URL.");
      blocked = true;
    } else if (!/^https?:\/\//i.test(server)) {
      setServerError("Don't forget http:// or https:// at the start.");
      blocked = true;
    }
    const keyValidation = validateApiKeyFormat(key);
    if (keyValidation.level === "error") {
      setApiKeyError(keyValidation.message);
      blocked = true;
    } else if (keyValidation.level === "warn") {
      setApiKeyWarning(keyValidation.message);
    }
    if (blocked) return;

    setConnecting(true);
    try {
      const url = server.replace(/\/+$/, "");
      const response = await fetch(`${url}/api/server/about`, {
        headers: { "x-api-key": key },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setTestStatus("error");
          setTestMessage("Server reached, but the API key was rejected.");
          setConnectError("API key rejected by server.");
          return;
        }
        setTestStatus("error");
        setTestMessage(`Server responded with HTTP ${response.status}.`);
        setConnectError(`Connection test failed with HTTP ${response.status}.`);
        return;
      }

      setTestStatus("success");
      setTestMessage("Connected successfully.");

      if (state.rememberOnDevice) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ serverUrl: state.serverUrl.trim(), apiKey: state.apiKey.trim() })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      setStep(3);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const likelyCorsOrNetwork = /failed to fetch|networkerror|load failed|fetch/i.test(message);
      const privateHost = isPrivateHost(server);

      if (likelyCorsOrNetwork && privateHost) {
        const warning =
          "Browser blocked the test request (likely CORS). This is common for local IPs like 192.168.x.x. If your URL and key are correct, continue anyway.";
        setTestStatus("warning");
        setTestMessage(warning);
        setConnectError(warning);
        return;
      }

      if (likelyCorsOrNetwork) {
        const warning =
          "Network or CORS blocked the browser test. Verify your URL and key; if they are correct, you can continue anyway.";
        setTestStatus("warning");
        setTestMessage(warning);
        setConnectError(warning);
        return;
      }

      setTestStatus("error");
      setTestMessage("Connection test failed.");
      setConnectError("Couldn't connect right now. Check URL/key and try again.");
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
      const confirmed = window.confirm("Are you sure? This will upload real files.");
      if (!confirmed) return;
    }
    update({ preset });
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
      <MacWindow>
        <StepIndicator currentStep={step} totalSteps={4} labels={stepLabels} />
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Platform</span>
          <select
            value={platformOverride}
            onChange={(e) => setPlatformOverride(e.target.value as typeof platformOverride)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="auto">Auto ({detectedOs})</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
            <option value="windows">Windows</option>
          </select>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">What would you like to upload?</h2>
              <p className="text-sm text-muted-foreground">
                Pick one option. You can change it anytime.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectSource("folder")}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  state.source === "folder"
                    ? "border-step-active bg-step-active/10"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <Folder className="mb-3 h-6 w-6 text-step-active" />
                <div className="font-medium">Photos from my computer</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  A folder of photos on your drive.
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectSource("takeout")}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  state.source === "takeout"
                    ? "border-step-active bg-step-active/10"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <ImageIcon className="mb-3 h-6 w-6 text-step-active" />
                <div className="font-medium">Google Photos Takeout</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  A downloaded Google Takeout zip or folder.
                </div>
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Not sure? Most people choose <span className="font-medium text-foreground">Photos from my computer</span>.
            </p>

            <div className="flex justify-end">
              <Button onClick={handleSourceContinue} disabled={!state.source}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Connect to your Immich server</h2>
              <p className="text-sm text-muted-foreground">
                Source: {getSourceLabel(state.source)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="server-url">Your server address</Label>
              <Input
                id="server-url"
                value={state.serverUrl}
                onChange={(e) => update({ serverUrl: e.target.value })}
                placeholder="https://photos.example.com"
              />
              <p className="text-xs text-muted-foreground">This is the URL you use to open Immich.</p>
              {serverError && <p className="text-xs text-destructive">{serverError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">Your API key</Label>
              <Input
                id="api-key"
                type="password"
                value={state.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="Paste your API key"
              />
              <p className="text-xs text-muted-foreground">
                Immich API keys can be UUID-style or token-style strings.
              </p>
              <a
                href="https://immich.app/docs/features/command-line-interface/#generate-the-api-key"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline underline-offset-2"
              >
                Where do I find my API key?
              </a>
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

            {connectError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {connectError}
              </div>
            )}

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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-2">
                {connectError && (
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Continue anyway
                  </Button>
                )}
                <Button onClick={validateConnection} disabled={connecting}>
                  {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Choose your style</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll map your choice to the right command automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="input-path">{getPathLabel(state.source)}</Label>
              <Input
                id="input-path"
                value={state.inputPath}
                onChange={(e) => update({ inputPath: e.target.value })}
                placeholder={getPathPlaceholder(state.source, os)}
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

            <div className="space-y-2">
              <Label>How should we handle this?</Label>
              <div className="grid gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selectedPreset === preset.id
                        ? "border-step-active bg-step-active/10"
                        : "border-border hover:bg-muted/50"
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
                          <span className="rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
                            live upload
                          </span>
                        ) : (
                          <span className="rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
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
                          const confirmed = window.confirm("Are you sure? This will upload real files.");
                          if (!confirmed) return;
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

                <div className="flex items-center justify-between">
                  <Label>Create albums from folders?</Label>
                  <Switch
                    checked={state.customCreateAlbums}
                    onCheckedChange={(checked) => update({ customCreateAlbums: checked })}
                  />
                </div>

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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!state.inputPath.trim() || !state.preset}
              >
                Generate command
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
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

            <div className="rounded-lg bg-terminal-bg p-4">
              <pre className="text-sm font-mono text-terminal-fg whitespace-pre-wrap break-all leading-relaxed">
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
              <div className="text-sm font-medium">What does this command do?</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {checklist.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              Don&apos;t have immich-go installed?{" "}
              <a
                href="https://github.com/simulot/immich-go"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                How to install (takes ~2 minutes)
              </a>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            </div>
          </div>
        )}
      </MacWindow>
      <span className="fixed bottom-2 left-3 text-[10px] text-white/60 drop-shadow-sm">
        Photo by Luca Micheli on Unsplash
      </span>
    </div>
  );
};

export default Index;
