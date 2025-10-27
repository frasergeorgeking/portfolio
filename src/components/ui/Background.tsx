"use client";
import { cn } from "@/lib/utils";
import React from "react";
import Beams from "../Beams";

interface BackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
}

export const Background = ({
  className,
  children,
  ...props
}: BackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "transition-bg relative min-h-screen bg-zinc-950 text-slate-50",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <Beams
            beamWidth={2.2}
            beamHeight={15}
            beamNumber={12}
            lightColor="#FFCA0A"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
          />
        </div>
        {children}
      </div>
    </main>
  );
};
