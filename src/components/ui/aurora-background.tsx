"use client";
import { cn } from "@/lib/utils";
import React from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "transition-bg relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-slate-50",
          className,
        )}
        {...props}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={
            {
              "--aurora-dark":
                "repeating-linear-gradient(100deg,#eab308_10%,#facc15_15%,#fde047_20%,#eab308_25%,#ca8a04_30%)",
              "--dark-gradient":
                "repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)",
              "--yellow-500": "#eab308",
              "--yellow-400": "#facc15",
              "--yellow-300": "#fde047",
              "--yellow-600": "#ca8a04",
              "--yellow-700": "#a16207",
              "--black": "#000",
              "--transparent": "transparent",
            } as React.CSSProperties
          }
        >
          <div
            className={cn(
              "after:animate-aurora pointer-events-none absolute -inset-[10px] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] blur-[10px] filter will-change-transform after:absolute after:inset-0 after:[background-size:200%,_100%] after:[background-attachment:fixed] after:content-[''] opacity-50 [background-image:var(--dark-gradient),var(--aurora-dark)] after:[background-image:var(--dark-gradient),var(--aurora-dark)] after:mix-blend-screen [--aurora-dark:repeating-linear-gradient(100deg,var(--yellow-500)_10%,var(--yellow-400)_15%,var(--yellow-300)_20%,var(--yellow-500)_25%,var(--yellow-700)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]",
              showRadialGradient &&
              "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]",
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};
