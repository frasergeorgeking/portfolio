"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import Beams from "../Beams";

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
					<Beams
						beamWidth={1.2}
						beamHeight={30}
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
