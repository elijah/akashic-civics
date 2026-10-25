"use client";

import { TutorialPlayer } from '@/components/TutorialPlayer';
import { CodeEditor } from '@/components/CodeEditor';
import { OutputDisplay } from '@/components/OutputDisplay';
import { useState } from 'react';
import { createTutorialPlayer } from 'akashic-civics/documentation';

export default function PlaygroundPage() {
  const player = createTutorialPlayer();
  const tutorials = player.getTutorials();
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userCode, setUserCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [showOutput, setShowOutput] = useState<boolean>(false);

  const handleCodeChange = (code: string) => {
    setUserCode(code);
    setOutput(`Code loaded: ${code.substring(0, 50)}${code.length > 50 ? '...' : ''}`);
    setShowOutput(true);
  };

  const handleRunCode = () => {
    setOutput(`Executing...\n${userCode}\n\nResult: Analysis complete.`);
    setShowOutput(true);
  };

  const handleCompleteStep = (stepId: string) => {
    setCurrentStep(prev => {
      const tutorial = tutorials.find(t => t.id === selectedTutorial);
      if (!tutorial) return prev;
      const stepIndex = tutorial.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return prev;
      return Math.min(prev + 1, tutorial.steps.length);
    });
  };

  const handleSelectTutorial = (tutorialId: string) => {
    setSelectedTutorial(tutorialId);
    setCurrentStep(0);
    setUserCode('');
    setOutput('');
    setShowOutput(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow border-b" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Akashic Civics Playground
            </h1>
            <button
              onClick={() => handleSelectTutorial(tutorials[0]?.id || '')}
              className="text-sm text-gray-500 hover:text-gray-700"
              aria-label="Reset tutorial"
            >
              &lt;
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {selectedTutorial ? (
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-medium text-gray-600 mb-3">Tutorials</h2>
              <ul className="space-y-1">
                {tutorials.map((tutorial) => (
                  <li
                    key={tutorial.id}
                    onClick={() => handleSelectTutorial(tutorial.id)}
                    className={`p-3 border rounded ${selectedTutorial === tutorial.id ? 'bg-blue-50 text-blue-600' : ''} cursor-pointer`}
                  >
                    <h3 className="font-medium text-gray-800">{tutorial.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{tutorial.description}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <TutorialPlayer
                player={player}
                selectedTutorial={selectedTutorial}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                handleCompleteStep={handleCompleteStep}
                handleCodeChange={handleCodeChange}
                handleRunCode={handleRunCode}
                userCode={userCode}
                showOutput={showOutput}
                setShowOutput={setShowOutput}
                output={output}
              />
            </div>
          </div>
        ) : (
          <IntroSection
            tutorials={tutorials}
            handleSelectTutorial={handleSelectTutorial}
          />
        )}
      </main>
    </div>
  );
}

function IntroSection({
  tutorials,
  handleSelectTutorial,
}: {
  tutorials: any[];
  handleSelectTutorial: (id: string) => void;
}) {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to the Akashic Civics Playground
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        Step-by-step guided tutorials for criminal justice disparity analysis
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => handleSelectTutorial('getting-started')}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Get Started
        </button>
        <button
          onClick={() => handleSelectTutorial('disparity-analysis')}
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Disparity Analysis
        </button>
      </div>
    </div>
  );
}