import React, { useLayoutEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";

interface MacWindowProps {
  children: React.ReactNode;
  onSettingsClick?: () => void;
}

const MacWindow: React.FC<MacWindowProps> = ({ children, onSettingsClick }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const stacked = window.matchMedia("(max-width: 640px)").matches;
      const gradientHeight = stacked ? gradientRef.current?.offsetHeight ?? 0 : 0;
      setHeight(Math.ceil(body.getBoundingClientRect().height) + gradientHeight + 20);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-shell">
      <m.div
        className="import-window"
        initial={false}
        animate={height ? { height } : undefined}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 34, mass: 0.8 }}
      >
        <div ref={gradientRef} className="gradient-panel" aria-hidden="true" />
        <div ref={bodyRef} className="window-body">
          <main className="window-content">{children}</main>
        </div>
      </m.div>
      <footer className="app-meta">
        <span className="app-brand">
          <span className="app-logo">
            <img className="app-logo-wordmark" src={`${import.meta.env.BASE_URL}logo.png`} alt="Go Desktop" width={219} height={55} />
            <img className="app-logo-icon" src={`${import.meta.env.BASE_URL}logo.png`} alt="" aria-hidden="true" width={219} height={55} />
          </span>
        </span>
        {onSettingsClick && <button type="button" onClick={onSettingsClick}>Settings</button>}
      </footer>
    </div>
  );
};

export default MacWindow;
