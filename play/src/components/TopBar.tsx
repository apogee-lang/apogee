"use client";

import { useState, useRef, useEffect } from "react";
import { EXAMPLES, type Example } from "@/lib/examples";

interface Props {
  onSelectExample: (code: string) => void;
  onShare: () => string;
  onRun: () => void;
  isCompiling: boolean;
}

export default function TopBar({
  onSelectExample,
  onShare,
  onRun,
  isCompiling,
}: Props) {
  const [showExamples, setShowExamples] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowExamples(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleShare() {
    const url = onShare();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleTweet() {
    const url = onShare();
    const text = encodeURIComponent(
      "I just wrote this in #Apogee \u2014 the new AI-era programming language. Try it:"
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  }

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[#060a12] border-b border-zinc-800/60 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#a8ff60] flex items-center justify-center">
            <span className="text-[#060a12] text-xs font-black">A</span>
          </div>
          <span className="font-semibold text-white tracking-tight">
            Apogee
          </span>
          <span className="text-zinc-600 text-xs font-mono">playground</span>
        </div>
      </div>

      {/* Center: Actions */}
      <div className="flex items-center gap-2">
        {/* Examples dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Examples
            <svg
              className={`w-3 h-3 transition-transform ${showExamples ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showExamples && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[#111827] border border-zinc-700/50 rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
              {EXAMPLES.map((ex: Example, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    onSelectExample(ex.code);
                    setShowExamples(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-[#a8ff60]/10 hover:text-[#a8ff60] transition-colors"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={isCompiling}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#a8ff60] text-[#060a12] rounded-md hover:bg-[#b8ff80] transition-colors disabled:opacity-50"
        >
          {isCompiling ? (
            <svg
              className="animate-spin w-3.5 h-3.5"
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
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          Run
          <kbd className="hidden sm:inline text-[10px] opacity-60 ml-1">
            {typeof navigator !== "undefined" &&
            navigator.platform?.includes("Mac")
              ? "\u2318"
              : "Ctrl"}
            +\u23CE
          </kbd>
        </button>
      </div>

      {/* Right: Share */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <svg
                className="w-3.5 h-3.5 text-[#a8ff60]"
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
              <span className="text-[#a8ff60]">Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Share
            </>
          )}
        </button>
        <button
          onClick={handleTweet}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-md transition-colors"
          title="Share on Twitter"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
