"use client";

import { useState } from "react";
import type { CompilerError } from "@/lib/compiler";

type Tab = "output" | "python" | "errors";

interface Props {
  output: string;
  python: string;
  errors: CompilerError[];
  timeMs: number;
  isCompiling: boolean;
}

export default function OutputPanel({
  output,
  python,
  errors,
  timeMs,
  isCompiling,
}: Props) {
  const [tab, setTab] = useState<Tab>("output");

  // Auto-switch to errors tab when there are errors
  const activeTab = errors.length > 0 && tab === "output" ? "errors" : tab;

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] text-zinc-200">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-1">
        <div className="flex">
          {(["output", "python", "errors"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                activeTab === t
                  ? "text-[#a8ff60] border-b-2 border-[#a8ff60]"
                  : "text-zinc-500 hover:text-zinc-300"
              } ${t === "errors" && errors.length > 0 ? "text-red-400" : ""}`}
            >
              {t}
              {t === "errors" && errors.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full">
                  {errors.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {timeMs > 0 && (
          <span className="text-[11px] text-zinc-600 pr-3 font-mono">
            {timeMs.toFixed(1)}ms
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {isCompiling ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Compiling...
          </div>
        ) : activeTab === "output" ? (
          <OutputView output={output} python={python} />
        ) : activeTab === "python" ? (
          <PythonView python={python} />
        ) : (
          <ErrorsView errors={errors} />
        )}
      </div>
    </div>
  );
}

function OutputView({ output, python }: { output: string; python: string }) {
  if (!output && !python) {
    return (
      <div className="text-zinc-600 italic">
        Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-xs">Cmd+Enter</kbd> or click Run to compile
      </div>
    );
  }
  if (!output && python) {
    return (
      <div className="text-zinc-500 italic">
        Compiled successfully. Switch to the Python tab to see the output.
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-zinc-200 leading-relaxed">
      {output}
    </pre>
  );
}

function PythonView({ python }: { python: string }) {
  if (!python) {
    return (
      <div className="text-zinc-600 italic">No compiled output yet.</div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
      {python}
    </pre>
  );
}

function ErrorsView({ errors }: { errors: CompilerError[] }) {
  if (!errors.length) {
    return (
      <div className="flex items-center gap-2 text-[#a8ff60]">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        No errors
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {errors.map((e, i) => (
        <div key={i} className="border border-red-500/20 rounded-lg p-3 bg-red-500/5">
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5 shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <line x1="15" y1="9" x2="9" y2="15" strokeWidth={2} />
                <line x1="9" y1="9" x2="15" y2="15" strokeWidth={2} />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-red-300">{e.msg}</div>
              <div className="text-zinc-600 text-xs mt-1">
                [{e.phase}] line {e.line}, col {e.col}
              </div>
              {e.suggestion && (
                <div className="mt-2 text-xs text-yellow-300/80 bg-yellow-500/5 rounded px-2 py-1.5">
                  Suggestion: {e.suggestion}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
