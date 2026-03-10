import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/primitives";

export function Header() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-50">Poker Advisor</h1>
          <p className="text-xs text-amber-300">Educational only. Offline analysis. Manual input.</p>
        </div>
        <Button variant="secondary" onClick={() => setDark((v) => !v)} aria-label="Toggle dark mode">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

