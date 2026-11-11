"use client";

import { createPortal } from 'react-dom';

// A backdrop-filter ancestor changes the containing block of fixed children.
// Open overlays at the document root so they stay aligned with the viewport.
export default function ViewportOverlay({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
