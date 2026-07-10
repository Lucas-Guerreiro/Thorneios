import React from 'react';

export function Card({ children, style, t, ...props }) {
  const isDark = t?.bg === "#0F1116";
  const defaultStyle = {
    background: t?.card || "#0D0E12",
    borderRadius: 12,
    padding: "24px",
    border: `1px solid ${t?.cardBorder || "#334155"}`,
    boxShadow: !isDark ? "0 4px 20px rgba(0,0,0,0.04)" : "none",
    transition: "all 0.25s"
  };

  return (
    <div 
      style={{ ...defaultStyle, ...style }} 
      {...props}
    >
      {children}
    </div>
  );
}
