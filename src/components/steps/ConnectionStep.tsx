import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WizardState } from "@/lib/command-builder";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Props {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
  onNext: () => void;
}

const ConnectionStep: React.FC<Props> = ({ state, onChange, onNext }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const testConnection = async () => {
    if (!state.serverUrl || !state.apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const url = state.serverUrl.replace(/\/+$/, "");
      const res = await fetch(`${url}/api/server/about`, {
        headers: { "x-api-key": state.apiKey },
      });
      setTestResult(res.ok ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  };

  const canProceed = state.serverUrl && state.apiKey;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Connection Setup</h2>
        <p className="text-sm text-muted-foreground">Enter your Immich server details. Credentials never leave your browser.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="serverUrl">Immich Server URL</Label>
          <Input
            id="serverUrl"
            placeholder="https://immich.example.com"
            value={state.serverUrl}
            onChange={(e) => onChange({ serverUrl: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Your Immich API key"
            value={state.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="adminApiKey">Admin API Key</Label>
            <span className="text-xs text-muted-foreground">(optional)</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">
                Required only for the <code className="font-mono">-pause-immich-jobs</code> flag if your primary key lacks admin privileges.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="adminApiKey"
            type="password"
            placeholder="Admin key (if needed)"
            value={state.adminApiKey}
            onChange={(e) => onChange({ adminApiKey: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={testConnection}
          disabled={!canProceed || testing}
        >
          {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Test Connection
        </Button>
        {testResult === "success" && (
          <span className="flex items-center gap-1 text-sm text-step-done">
            <CheckCircle2 className="w-4 h-4" /> Connected
          </span>
        )}
        {testResult === "error" && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <XCircle className="w-4 h-4" /> Failed
          </span>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default ConnectionStep;
