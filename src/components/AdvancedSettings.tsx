import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { advancedChangeCount, defaultAdvancedOptions, supportsPhotoStacking, type AdvancedOptions } from "@/lib/advanced-options";
import type { UploadSource } from "@/lib/friendly-flow";

interface Props { value: AdvancedOptions; source: UploadSource | null; onChange: (value: AdvancedOptions) => void }

export default function AdvancedSettings({ value, source, onChange }: Props) {
  const count = advancedChangeCount(value, source);
  const update = (partial: Partial<AdvancedOptions>) => onChange({ ...value, ...partial });
  return <details className="quiet-details advanced-settings">
    <summary>Advanced{count > 0 && <span className="advanced-count">{count} changed</span>}</summary>
    <div className="details-content advanced-fields">
      <p className="text-xs text-muted-foreground">Optional. These settings apply only while Custom is selected.</p>
      {source === "folder" && <div className="space-y-2">
        <Label htmlFor="advanced-album">Put this import into an album</Label>
        <Input id="advanced-album" value={value.album} onChange={e => update({ album: e.target.value })} placeholder="Optional album name" maxLength={200} />
        <p className="field-note">Adds the imported photos to this album, alongside any folder albums you chose.</p>
      </div>}
      {source === "takeout" && <div className="space-y-2">
        <Label htmlFor="advanced-source-album">Import only this Takeout album</Label>
        <Input id="advanced-source-album" value={value.sourceAlbum} onChange={e => update({ sourceAlbum: e.target.value })} placeholder="Leave blank for all albums" maxLength={200} />
        <p className="field-note">Use the exact album name from your Google Photos export.</p>
      </div>}
      {supportsPhotoStacking(source) && <>
        <div className="space-y-2">
          <Label htmlFor="advanced-burst">Burst photos</Label>
          <select id="advanced-burst" className="quiet-select" value={value.burst} onChange={e => update({ burst: e.target.value as AdvancedOptions["burst"] })}>
            <option value="NoStack">Keep photos separate</option><option value="Stack">Group into stacks</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="advanced-heic">Matching HEIC + JPEG photos</Label>
          <select id="advanced-heic" className="quiet-select" value={value.heic} onChange={e => update({ heic: e.target.value as AdvancedOptions["heic"] })}>
            <option value="NoStack">Keep both separate</option><option value="StackCoverHeic">Stack both, show HEIC</option><option value="StackCoverJPG">Stack both, show JPEG</option>
          </select>
          <p className="field-note">Stacking keeps both versions in the import.</p>
        </div>
      </>}
      <div className="space-y-2">
        <Label htmlFor="advanced-time-zone">Time-zone override</Label>
        <Input id="advanced-time-zone" value={value.timeZone} onChange={e => update({ timeZone: e.target.value })} placeholder="e.g. Europe/London" autoCapitalize="none" spellCheck={false} />
        <p className="field-note">Used when interpreting dates without a time zone. Leave blank to use the computer’s time zone.</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4"><Label htmlFor="advanced-session">Tag this import session</Label>
          <Switch id="advanced-session" checked={value.sessionTag} onCheckedChange={sessionTag => update({ sessionTag })} /></div>
        <p className="field-note">Adds an immich-go timestamp tag to help find this batch later.</p>
      </div>
      <div className="advanced-grid">
        <div className="space-y-2"><Label htmlFor="advanced-concurrency">Concurrent tasks</Label>
          <Input id="advanced-concurrency" type="number" min={1} max={20} step={1} value={value.concurrency} onChange={e => update({ concurrency: e.target.value })} placeholder="Use speed setting" />
          <p className="field-note">1–20. Overrides Upload speed.</p>
        </div>
        <div className="space-y-2"><Label htmlFor="advanced-timeout">Request timeout (min)</Label>
          <Input id="advanced-timeout" type="number" min={1} max={1440} step={1} value={value.timeoutMinutes} onChange={e => update({ timeoutMinutes: e.target.value })} placeholder="20" />
          <p className="field-note">1–1440. Longer for large videos.</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onChange({ ...defaultAdvancedOptions })} disabled={count === 0}>Reset Advanced</Button>
    </div>
  </details>;
}
