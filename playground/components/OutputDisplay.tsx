export function OutputDisplay({ output, setShowOutput }: { output: string; setShowOutput: React.Dispatch<React.SetStateAction<boolean>> }) {
  return (
    <div
      className="bg-white rounded-lg p-4 shadow-sm mt-4"
      style={{ display: 'block' }}
    >
      <h3 className="text-sm font-medium text-gray-500 mb-2">Output</h3>
      <pre className="text-xs text-gray-900 whitespace-pre-wrap">{output}</pre>
      <button
        onClick={() => setShowOutput(false)}
        className="text-xs text-gray-400 float-right mt-2"
        aria-label="Close output"
      >
        &times;
      </button>
    </div>
  );
}