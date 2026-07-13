import React from "react";
import { Settings } from "lucide-react";

interface MacWindowProps {
  children: React.ReactNode;
  onSettingsClick?: () => void;
}

const MacWindow: React.FC<MacWindowProps> = ({ children, onSettingsClick }) => {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-mac-window-border bg-card shadow-[0_32px_80px_-8px_hsl(var(--mac-window-shadow)/0.14),0_8px_24px_-4px_hsl(var(--mac-window-shadow)/0.08)] overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center px-4 py-3 bg-mac-titlebar border-b border-mac-window-border">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-mac-red" />
          <span className="w-3 h-3 rounded-full bg-mac-yellow" />
          <span className="w-3 h-3 rounded-full bg-mac-green" />
        </div>
        <span className="flex-1 flex justify-center select-none">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="immich-go desktop" className="h-[22px]" />
        </span>
        <div className="w-[52px] flex justify-end">
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              aria-label="Settings"
              className="text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default MacWindow;
