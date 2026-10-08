import React from "react";
import { Settings } from "lucide-react";

interface MacWindowProps {
  children: React.ReactNode;
  onSettingsClick?: () => void;
}

const MacWindow: React.FC<MacWindowProps> = ({ children, onSettingsClick }) => {
  return (
    <div className="import-window">
      <aside className="gradient-panel" aria-hidden="true" />
      <div className="window-body">
        <header className="window-header">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="immich-go desktop" className="h-6" />
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              aria-label="Settings"
              className="settings-trigger"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </header>
        <main className="window-content">{children}</main>
      </div>
    </div>
  );
};

export default MacWindow;
