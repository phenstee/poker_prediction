import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { clsx } from "clsx";

type ButtonVariant = "default" | "secondary" | "ghost" | "danger";

const variantMap: Record<ButtonVariant, string> = {
  default: "bg-accent text-slate-900 hover:bg-emerald-400",
  secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600",
  ghost: "bg-transparent text-slate-200 hover:bg-slate-800",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = "default", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantMap[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-xl2 border border-slate-700/80 bg-card p-5 shadow-card", className)}>{children}</section>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100",
        "placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        props.className,
      )}
    />
  );
}

