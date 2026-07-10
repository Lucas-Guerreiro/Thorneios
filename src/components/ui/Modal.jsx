import React from 'react';

export function Modal({ isOpen, onClose, title, children, t, style, ...props }) {
  if (!isOpen) return null;

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(4px)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    boxSizing: "border-box"
  };

  const boxStyle = {
    background: t?.card || "#0D0E12",
    borderRadius: 16,
    padding: "24px",
    border: `1px solid ${t?.cardBorder || "#334155"}`,
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    ...style
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()} {...props}>
        {title && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${t?.cardBorder || "#334155"}`, paddingBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: t?.text || "#fff", margin: 0 }}>{title}</h3>
            <button 
              onClick={onClose} 
              style={{ background: "none", border: "none", color: t?.textSec || "#64748B", fontSize: 18, cursor: "pointer", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
