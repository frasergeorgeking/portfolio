"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LightRays } from "./LightRays";

interface BackgroundProps extends React.HTMLProps<HTMLDivElement> {
	children: React.ReactNode;
}

export const Background = ({
	className,
	children,
	...props
}: BackgroundProps) => {
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		setIsLoaded(true);
	}, []);

	return (
		<main>
			<div
				className={cn(
					"transition-bg relative min-h-screen bg-background text-foreground transition-opacity duration-1400 ease-in-out",
					isLoaded ? "opacity-100" : "opacity-0",
					className,
				)}
				{...props}
			>
				<div className="absolute inset-0 overflow-hidden">
					<div className="absolute inset-0 -skew-y-3 scale-110 origin-top-left">
						<LightRays
							count={10}
							color="rgba(255, 202, 10, 0.2)"
							blur={36}
							speed={14}
							length="250vh"
						/>
					</div>
				</div>
				{children}
			</div>
		</main>
	);
};
