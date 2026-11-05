"use client";

import { useState } from "react";

// Copies text to the clipboard (used for pasting into Messenger or Viber).
export function CopyButton({
  text,
  label = "Copy message",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers block clipboard access: let the person copy by hand.
      window.prompt("Copy this message:", text);
    }
  }

  return (
    <button type="button" onClick={copy} className="md-btn md-btn-tonal md-btn-sm">
      {copied ? "Copied!" : label}
    </button>
  );
}
