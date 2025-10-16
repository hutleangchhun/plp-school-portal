import React, { useState } from "react";

/**
 * Basic Collapse component for toggling visibility of children.
 * Usage:
 * <Collapse label="Section Title">Content here</Collapse>
 */
export function Collapse({ label, children, defaultOpen = false, className = "", ...props }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`collapse-component ${className}`} {...props}>
      <button
        type="button"
        className="collapse-toggle w-full text-left font-semibold py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <span className="float-right">{open ? "▲" : "▼"}</span>
      </button>
      <div
        className={`collapse-content transition-all duration-200 ease-in-out overflow-hidden" ${open ? "max-h-96 py-2 px-4" : "max-h-0 p-0"}`}
        style={{
          transition: "max-height 0.2s ease-in-out, padding 0.2s",
        }}
        aria-hidden={!open}
      >
        {open && children}
      </div>
    </div>
  );
}
