import React from "react";

interface MacWindowProps {
  children: React.ReactNode;
}

const MacWindow: React.FC<MacWindowProps> = ({ children }) => {
  return (
    <div className="w-full max-w-2xl rounded-xl border border-mac-window-border bg-card shadow-[0_20px_60px_-10px_hsl(var(--mac-window-shadow)/0.25)] overflow-hidden">
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
        <div className="w-[52px]" /> {/* spacer to balance dots */}
      </div>
      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default MacWindow;
