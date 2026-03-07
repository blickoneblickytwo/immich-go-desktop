import React, { useState } from "react";
import { WizardState, DetectedOS, buildCommand } from "@/lib/command-builder";
import { FLAG_REGISTRY } from "@/lib/flag-registry";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  state: WizardState;
  os: DetectedOS;
}

const CommandPreview: React.FC<Props> = ({ state, os }) => {
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const command = buildCommand(state, os);
  const apiKeyFlags = [FLAG_REGISTRY.apiKey.name, ...(FLAG_REGISTRY.apiKey.alias ?? [])];
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const displayCommand = showKey
    ? command
    : apiKeyFlags.reduce(
        (masked, flag) =>
          masked.replace(
            new RegExp(`(${escapeRegex(flag)}=)([^\\s\\\\` + "`" + `]+)`, "g"),
            (_m, prefix) => `${prefix}●●●●●●●●`
          ),
        command
      );
  const dryRunFlag = FLAG_REGISTRY.dryRun.name;
  const commandWithDryRunHighlight = displayCommand.split(dryRunFlag).reduce<React.ReactNode[]>(
    (acc, segment, index) => {
      if (index > 0) {
        acc.push(
          <span key={`dry-run-${index}`} className="text-step-done font-semibold">
            {dryRunFlag}
          </span>
        );
      }
      if (segment) {
        acc.push(<React.Fragment key={`segment-${index}`}>{segment}</React.Fragment>);
      }
      return acc;
    },
    []
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          💻 Live Command Preview
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showKey ? "Hide" : "Reveal"} key
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={copyToClipboard}
          >
            {copied ? <Check className="w-3 h-3 text-step-done" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
      <div className={`mx-4 mt-3 rounded-md px-3 py-2 text-xs font-medium ${state.dryRun ? "bg-step-done/10 text-step-done border border-step-done/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
        {state.dryRun
          ? "🛡️ DRY RUN — no files will be uploaded"
          : "⚠️ LIVE MODE — files will be uploaded to your server"}
      </div>
      {/* Command */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-[13px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
          <span className="text-muted-foreground select-none">$ </span>
          {commandWithDryRunHighlight}
        </pre>
      </div>
      <div className="px-4 pb-3 text-xs text-muted-foreground">
        Run with dry-run first to verify file count, then turn it off for the real upload
      </div>
    </div>
  );
};

export default CommandPreview;
