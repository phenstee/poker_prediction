import { clsx } from "clsx";
import type { ReactNode } from "react";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Array<{ value: string; label: string }>;
  children: ReactNode;
}

export function Tabs({ value, onValueChange, tabs, children }: TabsProps) {
  return (
    <div>
      <div className="mb-4 inline-flex rounded-xl border border-slate-700 bg-slate-900/70 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              value === tab.value ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200",
            )}
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function TabsContent({ value, current, children }: { value: string; current: string; children: ReactNode }) {
  if (value !== current) {
    return null;
  }
  return <div>{children}</div>;
}

