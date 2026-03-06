import { useState, useCallback } from "react";
import MacWindow from "@/components/MacWindow";
import StepIndicator from "@/components/StepIndicator";
import ConnectionStep from "@/components/steps/ConnectionStep";
import OptionsStep from "@/components/steps/OptionsStep";
import ReviewStep from "@/components/steps/ReviewStep";
import CommandPreview from "@/components/CommandPreview";
import { WizardState, defaultState, detectOS } from "@/lib/command-builder";

const stepLabels = ["Connection", "Options", "Review"];

const Index = () => {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({ ...defaultState });
  const os = detectOS();

  const update = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...defaultState });
    setStep(1);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <MacWindow>
        <StepIndicator currentStep={step} totalSteps={3} labels={stepLabels} />
        {step === 1 && (
          <ConnectionStep state={state} onChange={update} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <OptionsStep state={state} os={os} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <ReviewStep state={state} os={os} onBack={() => setStep(2)} onReset={reset} />
        )}
      </MacWindow>
    </div>
  );
};

export default Index;
