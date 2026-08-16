const parsePhrases = (value: string | undefined): string[] => {
	if (!value) {
		return [];
	}

	try {
		const phrases: unknown = JSON.parse(value);
		return Array.isArray(phrases) &&
			phrases.every((phrase) => typeof phrase === "string")
			? phrases
			: [];
	} catch {
		return [];
	}
};

const shufflePhrases = (
	phrases: readonly string[],
	previousPhrase?: string,
): string[] => {
	const shuffled = [...phrases];

	for (let index = shuffled.length - 1; index > 0; index--) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[randomIndex]] = [
			shuffled[randomIndex],
			shuffled[index],
		];
	}

	if (previousPhrase && shuffled[0] === previousPhrase) {
		const swapIndex = shuffled.findIndex(
			(phrase, index) => index > 0 && phrase !== previousPhrase,
		);

		if (swapIndex > 0) {
			[shuffled[0], shuffled[swapIndex]] = [
				shuffled[swapIndex],
				shuffled[0],
			];
		}
	}

	return shuffled;
};

const initGameCountPanels = (): void => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return;
	}

	const panels = document.querySelectorAll<HTMLElement>(
		"[data-game-count-panel]",
	);

	for (const panel of panels) {
		if (panel.dataset.initialized === "true") {
			continue;
		}

		const phraseElement = panel.querySelector<HTMLElement>(
			"[data-game-count-phrases]",
		);
		const phrases = parsePhrases(phraseElement?.dataset.gameCountPhrases);

		if (!phraseElement || phrases.length < 2) {
			continue;
		}

		panel.dataset.initialized = "true";
		const cycleIntervalMs = Number(panel.dataset.cycleIntervalMs) || 3000;
		let phraseQueue = shufflePhrases(phrases);
		let currentPhrase = phraseQueue.shift() ?? phrases[0];
		phraseElement.textContent = currentPhrase;

		window.setInterval(() => {
			if (phraseQueue.length === 0) {
				phraseQueue = shufflePhrases(phrases, currentPhrase);
			}

			const nextPhrase = phraseQueue.shift();
			if (!nextPhrase) {
				return;
			}

			phraseElement.classList.add("is-leaving");

			phraseElement.addEventListener(
				"animationend",
				() => {
					currentPhrase = nextPhrase;
					phraseElement.textContent = currentPhrase;
					phraseElement.classList.remove("is-leaving");
					phraseElement.classList.add("is-entering");

					phraseElement.addEventListener(
						"animationend",
						() => phraseElement.classList.remove("is-entering"),
						{ once: true },
					);
				},
				{ once: true },
			);
		}, cycleIntervalMs);
	}
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initGameCountPanels);
} else {
	initGameCountPanels();
}
