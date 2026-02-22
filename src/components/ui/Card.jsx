// src/components/ui/Card.js
import React from "react";

export function Card({ className = "", ...props }) {
  return (
    <div
      className={`rounded-xl bg-white/60 backdrop-blur border border-black/10 shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ title, actions, className = "", children, ...props }) {
  return (
    <div
      className={`p-4 border-b border-black/10 flex items-center justify-between ${className}`}
      {...props}
    >
      {title ? <h3 className="font-semibold">{title}</h3> : children}
      {actions}
    </div>
  );
}

export function CardBody({ className = "", ...props }) {
  return <div className={`p-4 ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={className} {...props} />;
}
