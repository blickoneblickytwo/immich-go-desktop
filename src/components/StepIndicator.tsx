import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, labels }) => {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-3 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div aria-hidden="true" className={cn("h-px w-8", isDone ? "bg-step-done" : "bg-step-inactive")} />
            )}
            <div className="flex items-center gap-1.5" aria-current={isActive ? "step" : undefined}>
              <div
                aria-hidden="true"
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  isDone && "bg-step-done text-primary-foreground",
                  isActive && "bg-step-active text-primary-foreground",
                  !isDone && !isActive && "bg-step-inactive text-muted-foreground"
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span className="sr-only">
                {`Step ${step}${isDone ? ", completed" : isActive ? ", current" : ""}: ${labels[i]}`}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {labels[i]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default StepIndicator;
