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
    <nav aria-label="Progress" className="step-indicator">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div aria-hidden="true" className="step-connector" />
            )}
            <div className="step-item" aria-current={isActive ? "step" : undefined}>
              <div
                aria-hidden="true"
                className={cn(
                  "step-number",
                  isDone && "step-number-done",
                  isActive && "step-number-active"
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
                  "step-label",
                  isActive && "step-label-active"
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
