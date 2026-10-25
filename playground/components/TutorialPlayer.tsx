"use client";

import { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { OutputDisplay } from './OutputDisplay';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  code?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}

interface TutorialPlayerProps {
  player: { getTutorials: () => Tutorial[] };
  selectedTutorial: string;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  handleCompleteStep: (stepId: string) => void;
  handleCodeChange: (code: string) => void;
  handleRunCode: () => void;
  userCode: string;
  showOutput: boolean;
  setShowOutput: React.Dispatch<React.SetStateAction<boolean>>;
  output: string;
}

export function TutorialPlayer({
  player,
  selectedTutorial,
  currentStep,
  setCurrentStep,
  handleCompleteStep,
  handleCodeChange,
  handleRunCode,
  userCode,
  showOutput,
  setShowOutput,
  output,
}: TutorialPlayerProps) {
  const tutorial = player.getTutorials().find((t) => t.id === selectedTutorial);
  if (!tutorial) return null;

  const step = tutorial.steps[currentStep] || tutorial.steps[0];

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-600 mb-2">{step.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{step.description}</p>

      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Code</h3>
        <CodeEditor
          code={step.code || ''}
          onChange={(code) => handleCodeChange(code)}
          language="typescript"
        />
      </div>

      <div>
        <button
          onClick={() => handleCompleteStep(step.id)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Complete Step
        </button>
        <span className="text-xs text-gray-400 ml-2">
          {`Step ${currentStep + 1} of ${tutorial.steps.length}`}
        </span>
      </div>

      {showOutput && (
        <OutputDisplay
          output={output}
          setShowOutput={setShowOutput}
        />
      )}
    </div>
  );
}

