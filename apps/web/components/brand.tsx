"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Brand() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <Link className="brand" href="/" onClick={closeMenu}>
        <span className="brand-mark" aria-hidden="true">
          <span className="mark-image" />
        </span>
        <span>ProofLayer</span>
      </Link>

      <button
        className={`nav-toggle${open ? " is-open" : ""}`}
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`mobile-nav-panel${open ? " is-open" : ""}`}
        id="mobile-navigation"
        aria-hidden={!open}
      >
        <Link href="/app" onClick={closeMenu}>Workspace</Link>
        <Link href="/app/claims/new" onClick={closeMenu}>Verify proof</Link>
        <Link href="/#how" onClick={closeMenu}>How it works</Link>
      </div>
    </>
  );
}
