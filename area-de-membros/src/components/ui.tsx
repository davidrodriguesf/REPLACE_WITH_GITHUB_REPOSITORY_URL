"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText = "Salvando...",
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: "primary" | "secondary" | "danger" | "ghost" | "light" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} className={`btn btn-${variant} ${className}`} {...props}>
      {pending ? pendingText : children}
    </button>
  );
}

export function ConfirmButton({ children, message, variant = "danger", className = "" }: { children: ReactNode; message: string; variant?: "danger" | "ghost" | "secondary"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-${variant} ${className}`}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "..." : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (!state) return null;
  if (state.error) return <p className="alert alert-error">{state.error}</p>;
  if (state.success) return <p className="alert alert-success">{state.success}</p>;
  return null;
}
