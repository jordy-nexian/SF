"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
	interface Window {
		turnstile?: {
			render: (
				container: HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					"error-callback"?: () => void;
					"expired-callback"?: () => void;
					theme?: "light" | "dark" | "auto";
					size?: "normal" | "compact";
				}
			) => string;
			reset: (widgetId: string) => void;
			remove: (widgetId: string) => void;
		};
	}
}

interface TurnstileWidgetProps {
	siteKey: string;
	onVerify: (token: string) => void;
	onError?: () => void;
	onExpired?: () => void;
	theme?: "light" | "dark" | "auto";
	size?: "normal" | "compact";
	className?: string;
}

export default function TurnstileWidget({
	siteKey,
	onVerify,
	onError,
	onExpired,
	theme = "auto",
	size = "normal",
	className = "",
}: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);

	const handleVerify = useCallback((token: string) => {
		onVerify(token);
	}, [onVerify]);

	const handleError = useCallback(() => {
		onError?.();
	}, [onError]);

	const handleExpired = useCallback(() => {
		onExpired?.();
		// Reset the widget when expired
		if (widgetIdRef.current && window.turnstile) {
			window.turnstile.reset(widgetIdRef.current);
		}
	}, [onExpired]);

	useEffect(() => {
		// Load the Turnstile script if not already loaded
		if (!document.getElementById("cf-turnstile-script")) {
			const script = document.createElement("script");
			script.id = "cf-turnstile-script";
			script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
			script.async = true;
			script.defer = true;
			script.onload = () => setIsLoaded(true);
			document.head.appendChild(script);
		} else if (window.turnstile) {
			setIsLoaded(true);
		} else {
			// Script exists but not loaded yet, wait for it
			const checkLoaded = setInterval(() => {
				if (window.turnstile) {
					setIsLoaded(true);
					clearInterval(checkLoaded);
				}
			}, 100);
			return () => clearInterval(checkLoaded);
		}
	}, []);

	useEffect(() => {
		if (!isLoaded || !containerRef.current || !window.turnstile) return;

		// Remove existing widget if any
		if (widgetIdRef.current) {
			try {
				window.turnstile.remove(widgetIdRef.current);
			} catch {
				// Widget might already be removed
			}
		}

		// Render new widget
		widgetIdRef.current = window.turnstile.render(containerRef.current, {
			sitekey: siteKey,
			callback: handleVerify,
			"error-callback": handleError,
			"expired-callback": handleExpired,
			theme,
			size,
		});

		return () => {
			if (widgetIdRef.current && window.turnstile) {
				try {
					window.turnstile.remove(widgetIdRef.current);
				} catch {
					// Widget might already be removed
				}
			}
		};
	}, [isLoaded, siteKey, handleVerify, handleError, handleExpired, theme, size]);

	return (
		<div ref={containerRef} className={className}>
			{!isLoaded && (
				<div className="h-[65px] flex items-center justify-center text-sm text-gray-500">
					Loading verification...
				</div>
			)}
		</div>
	);
}

/**
 * Reset the Turnstile widget (useful after form submission)
 */
export function resetTurnstile(widgetId: string | null): void {
	if (widgetId && window.turnstile) {
		try {
			window.turnstile.reset(widgetId);
		} catch {
			// Widget might be removed
		}
	}
}
