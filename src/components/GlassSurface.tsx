import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface GlassSurfaceProps {
	children?: React.ReactNode;
	width?: number | string;
	height?: number | string;
	borderRadius?: number;
	className?: string;
	style?: React.CSSProperties;
}

const useDarkMode = () => {
	// Start with undefined to avoid hydration mismatch
	const [isDark, setIsDark] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		setIsDark(mediaQuery.matches);

		const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	return isDark;
};

const GlassSurface: React.FC<GlassSurfaceProps> = ({
	children,
	width = 200,
	height = 80,
	borderRadius = 20,
	className = "",
	style = {},
}) => {
	const containerRef = useRef<HTMLDivElement>(null);

	const isDarkMode = useDarkMode();

	// Track whether we're on the client to avoid hydration mismatches
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const supportsBackdropFilter = () => {
		if (typeof window === "undefined") return false;
		return CSS.supports("backdrop-filter", "blur(10px)");
	};

	const getContainerStyles = (): React.CSSProperties => {
		const baseStyles: React.CSSProperties = {
			...style,
			width: typeof width === "number" ? `${width}px` : width,
			height: typeof height === "number" ? `${height}px` : height,
			borderRadius: `${borderRadius}px`,
		} as React.CSSProperties;

		// Use fallback styles during SSR and until client-side checks complete
		if (!isClient || isDarkMode === undefined) {
			return {
				...baseStyles,
				background: "rgba(255, 255, 255, 0.25)",
				backdropFilter: "blur(12px) saturate(1.8) brightness(1.1)",
				WebkitBackdropFilter: "blur(12px) saturate(1.8) brightness(1.1)",
				border: "1px solid rgba(255, 255, 255, 0.3)",
				boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.2),
                    0 2px 16px 0 rgba(31, 38, 135, 0.1),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)`,
			};
		}

		const backdropFilterSupported = supportsBackdropFilter();

		if (isDarkMode) {
			if (!backdropFilterSupported) {
				return {
					...baseStyles,
					background: "rgba(0, 0, 0, 0.4)",
					border: "1px solid rgba(255, 255, 255, 0.2)",
					boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                      inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)`,
				};
			} else {
				return {
					...baseStyles,
					background: "rgba(255, 255, 255, 0.1)",
					backdropFilter: "blur(12px) saturate(1.8) brightness(1.2)",
					WebkitBackdropFilter: "blur(12px) saturate(1.8) brightness(1.2)",
					border: "1px solid rgba(255, 255, 255, 0.2)",
					boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
                      inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)`,
				};
			}
		} else {
			if (!backdropFilterSupported) {
				return {
					...baseStyles,
					background: "rgba(255, 255, 255, 0.4)",
					border: "1px solid rgba(255, 255, 255, 0.3)",
					boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                      inset 0 -1px 0 0 rgba(255, 255, 255, 0.3)`,
				};
			} else {
				return {
					...baseStyles,
					background: "rgba(255, 255, 255, 0.25)",
					backdropFilter: "blur(12px) saturate(1.8) brightness(1.1)",
					WebkitBackdropFilter: "blur(12px) saturate(1.8) brightness(1.1)",
					border: "1px solid rgba(255, 255, 255, 0.3)",
					boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.2),
                      0 2px 16px 0 rgba(31, 38, 135, 0.1),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                      inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)`,
				};
			}
		}
	};

	const glassSurfaceClasses =
		"relative flex items-center justify-center overflow-hidden transition-opacity duration-[260ms] ease-out";

	const focusVisibleClasses = isDarkMode
		? "focus-visible:outline-2 focus-visible:outline-[#0A84FF] focus-visible:outline-offset-2"
		: "focus-visible:outline-2 focus-visible:outline-[#007AFF] focus-visible:outline-offset-2";

	return (
		<div
			ref={containerRef}
			className={`${glassSurfaceClasses} ${focusVisibleClasses} ${className}`}
			style={getContainerStyles()}
		>
			<div
				className={`w-full h-full flex items-center justify-center rounded-[inherit] relative z-10`}
			>
				{children}
			</div>
		</div>
	);
};

export default GlassSurface;
