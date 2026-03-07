import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WizardState, DetectedOS, getPathPlaceholder, presets } from "@/lib/command-builder";
import { FolderOpen, AlertTriangle } from "lucide-react";

interface Props {
  state: WizardState;
  os: DetectedOS;
  onChange: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const OptionsStep: React.FC<Props> = ({ state, os, onChange, onNext, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectoryPick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Browser only gives relative path; use webkitRelativePath
      const first = files[0];
      const rel = (first as any).webkitRelativePath as string;
      if (rel) {
        const folder = rel.split("/")[0];
        onChange({ folderPath: folder });
      }
    }
  };

  const applyPreset = (preset: typeof presets[number]) => {
    onChange(preset.apply);
  };

  const flags: { key: keyof WizardState; label: string; description: string }[] = [
    { key: "dryRun", label: "Dry Run", description: "Simulate without uploading" },
    { key: "createAlbums", label: "Create Albums", description: "Create albums from folder names" },
    { key: "createAlbumFolder", label: "Album per Folder", description: "One album per sub-folder" },
    { key: "ignoreErrors", label: "Ignore Errors", description: "Continue on file errors" },
    { key: "googlePhotos", label: "Google Photos", description: "Parse Google Takeout metadata" },
    { key: "pauseImmichJobs", label: "Pause Immich Jobs", description: "Pause server jobs during upload (needs admin)" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Folder & Options</h2>
        <p className="text-sm text-muted-foreground">
          Detected OS: <span className="font-medium text-foreground">{os === "macos" ? "macOS" : os === "windows" ? "Windows" : "Linux"}</span>
        </p>
      </div>

      {/* Presets */}
      <div className="space-y-1.5">
        <Label>Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button key={p.name} variant="outline" size="sm" onClick={() => applyPreset(p)} className="text-xs">
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Folder Path */}
      <div className="space-y-1.5">
        <Label htmlFor="folderPath">Folder Path</Label>
        <div className="flex gap-2">
          <Input
            id="folderPath"
            placeholder={getPathPlaceholder(os)}
            value={state.folderPath}
            onChange={(e) => onChange({ folderPath: e.target.value })}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleDirectoryPick} title="Browse folder">
            <FolderOpen className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
            onChange={handleFilesSelected}
          />
        </div>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-mac-yellow" />
          <span>Browser security prevents reading full paths. Verify the path in the text field before generating.</span>
        </div>
      </div>

      {/* Flags */}
      <div className="space-y-3">
        <Label>Options</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {flags.map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.description}</div>
              </div>
              <Switch
                checked={state[f.key] as boolean}
                onCheckedChange={(v) => onChange({ [f.key]: v })}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Advanced filters */}
      <div className="space-y-3">
        <Label>Advanced Filters</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="excludeFiles" className="text-xs">Exclude extensions</Label>
            <Input
              id="excludeFiles"
              placeholder="e.g. .mp4,.gif"
              value={state.excludeFiles}
              onChange={(e) => onChange({ excludeFiles: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="includeFiles" className="text-xs">Include extensions</Label>
            <Input
              id="includeFiles"
              placeholder="e.g. .jpg,.heic"
              value={state.includeFiles}
              onChange={(e) => onChange({ includeFiles: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="dateRange" className="text-xs">Date range</Label>
            <Input
              id="dateRange"
              placeholder="e.g. 2023-01-01,2023-12-31"
              value={state.dateRange}
              onChange={(e) => onChange({ dateRange: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
};

export default OptionsStep;
