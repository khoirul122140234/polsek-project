// src/components/ui/button.js
import React from "react";
export function Button({ className = "", ...props }) {
  return <button className={`px-4 py-2 rounded ${className}`} {...props} />;
}
export default Button;