'use client';
import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language?: string;
  height?: string;
}

export function CodeEditor({ code, onChange, language = 'typescript', height = '400px' }: CodeEditorProps) {
  const [editorRef, setEditorRef] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    setEditorRef(editor);
  };

  return (
    <Editor
      onMount={handleEditorDidMount}
      height={height}
      defaultLanguage={language}
      defaultValue={code}
      onChange={(value) => value && onChange(value)}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        lineNumbers: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
}