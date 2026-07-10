import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  bg, 
  color, 
  style, 
  t, 
  ...props 
}) {
  const isDark = t?.bg === "#0F1116";
  const backColor = bg || (variant === 'primary' ? (t?.accent || "#22b7d9") : (t?.inputBg || "#1E293B"));
  const isNeonGreen = backColor?.toLowerCase() === "#20e278" || backColor?.toLowerCase() === "#00e676" || backColor?.toLowerCase() === "#1d9e75" || backColor?.toLowerCase() === "#06aa48";
  
  let textColor = color;
  if (!textColor) {
    if (variant === 'primary') {
      textColor = isNeonGreen ? "#0F1116" : "#fff";
    } else {
      textColor = isNeonGreen ? "#0F1116" : (t?.text || "#E2E8F0");
    }
  }

  const defaultStyle = variant === 'primary' ? {
    padding: "10px 18px",
    borderRadius: 12,
    border: "none",
    background: backColor,
    color: textColor,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.2s ease",
    boxShadow: isNeonGreen && !isDark ? "0 4px 12px rgba(6, 170, 72, 0.25)" : "none"
  } : {
    padding: "6px 14px",
    borderRadius: 12,
    border: `1px solid ${t?.cardBorder || "#334155"}`,
    background: backColor,
    color: textColor,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.2s ease"
  };

  return (
    <button 
      style={{ ...defaultStyle, ...style }} 
      {...props}
    >
      {children}
    </button>
  );
}
