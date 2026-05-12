import type { ReactNode } from "react";

type Props = {
  overlay: string;
  children: ReactNode;
  className?: string;
};

export function PageShell({ overlay, children, className }: Props) {
  return (
    <div className={className ?? "min-h-screen"}>
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-center bg-cover bg-gradient-to-br from-[#4a00e0] to-[#8e2de2]"
        />
        <div className="absolute inset-0" style={{ backgroundColor: overlay }} />
      </div>
      {children}
    </div>
  );
}

export const glassCardClass =
  "rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-[0_30px_110px_-80px_rgba(0,0,0,0.95)]";

