import React from "react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, labels }) => {
  return (
    <nav aria-label="Progress" className="step-indicator">
      <span aria-current="step" aria-label={`Step ${currentStep} of ${totalSteps}: ${labels[currentStep - 1]}`}>
        Step {currentStep} of {totalSteps}
      </span>
    </nav>
  );
};

export default StepIndicator;
