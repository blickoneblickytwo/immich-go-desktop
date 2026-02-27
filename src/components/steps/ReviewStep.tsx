import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { WizardState, DetectedOS, buildCommand, getSummaryItems } from "@/lib/command-builder";
import { Copy, Check, RotateCcw } from "lucide-react";

interface Props {
  state: WizardState;
  os: DetectedOS;
  onBack: () => void;
  onReset: () => void;
}

const ReviewStep: React.FC<Props> = ({ state, os, onBack, onReset }) => {
  const [copied, setCopied] = useState(false);
  const command = buildCommand(state, os);
  const summary = getSummaryItems(state);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Review & Copy</h2>
        <p className="text-sm text-muted-foreground">Verify the configuration, then copy the command to your terminal.</p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        {summary.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground text-right max-w-[60%] truncate">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Terminal Output */}
      <div className="rounded-lg bg-terminal-bg p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-terminal-fg whitespace-pre-wrap break-all leading-relaxed">
          <span className="text-terminal-green select-none">$ </span>
          {command}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button variant="outline" onClick={onReset} className="gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
        <Button onClick={copyToClipboard} className="gap-1.5">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy to Clipboard"}
        </Button>
      </div>
    </div>
  );
};

export default ReviewStep;
