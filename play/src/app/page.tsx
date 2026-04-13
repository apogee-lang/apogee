"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import OutputPanel from "@/components/OutputPanel";
import { compile, type CompileResult } from "@/lib/compiler";
import { EXAMPLES } from "@/lib/examples";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

const DEFAULT_CODE = EXAMPLES[0].code;

export default function PlaygroundPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<CompileResult>({
    python: "",
    output: "",
    errors: [],
    timeMs: 0,
  });
  const [isCompiling, setIsCompiling] = useState(false);
  const [splitPercent, setSplitPercent] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Load code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("code");
    if (encoded) {
      try {
        const decoded = atob(encoded);
        setCode(decoded);
      } catch {
        // ignore invalid base64
      }
    }
  }, []);

  const handleRun = useCallback(() => {
    setIsCompiling(true);
    // Use requestAnimationFrame to let the UI update before blocking
    requestAnimationFrame(() => {
      const res = compile(code);
      setResult(res);
      setIsCompiling(false);
    });
  }, [code]);

  const handleShare = useCallback((): string => {
    const encoded = btoa(code);
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    window.history.replaceState(null, "", url);
    return url;
  }, [code]);

  const handleSelectExample = useCallback((exampleCode: string) => {
    setCode(exampleCode);
    setResult({ python: "", output: "", errors: [], timeMs: 0 });
  }, []);

  // Drag-to-resize panels
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(30, Math.min(80, pct)));
    }
    function handleMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        onSelectExample={handleSelectExample}
        onShare={handleShare}
        onRun={handleRun}
        isCompiling={isCompiling}
      />

      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 panel-container"
      >
        {/* Editor Panel */}
        <div
          className="editor-panel min-w-0 overflow-hidden"
          style={{ width: `${splitPercent}%` }}
        >
          <Editor
            value={code}
            onChange={setCode}
            onRun={handleRun}
            errors={result.errors}
          />
        </div>

        {/* Resize handle */}
        <div className="resize-handle" onMouseDown={handleMouseDown} />

        {/* Output Panel */}
        <div
          className="output-panel min-w-0 overflow-hidden border-l border-zinc-800/60"
          style={{ width: `${100 - splitPercent}%` }}
        >
          <OutputPanel
            output={result.output}
            python={result.python}
            errors={result.errors}
            timeMs={result.timeMs}
            isCompiling={isCompiling}
          />
        </div>
      </div>
    </div>
  );
}
