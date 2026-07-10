import React from 'react';

export function Input({ style, t, ...props }) {
  const defaultStyle = {
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${t?.inputBorder || "#334155"}`,
    fontSize: "14px",
    background: t?.inputBg || "#0F1116",
    color: t?.inputColor || "#fff",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "all 0.2s ease"
  };

  return (
    <input 
      style={{ ...defaultStyle, ...style }} 
      {...props}
    />
  );
}
