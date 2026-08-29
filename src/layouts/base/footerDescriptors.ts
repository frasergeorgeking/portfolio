// biome-ignore format: descriptors list is more readable this way.
const descriptors = [
	"200ml of milk", "Cthulhu (the great old one)", "Internet Explorer 8 compatibility",
	"a badly out of tune piano", "a lot of coffee", "a rejection of the Oxford comma",
	"attitude", "awe", "bounce", "care", "cellotape", "charm", "cheek", "child-safe glitter",
	"courage", "craftsmanship", "curiosity", "dark mode", "dedication", "determination",
	"diligence", "fear", "flair", "flamboyance", "focus", "funk", "good vibes", "grit",
	"hard work", "horse-free glue", "impeccable taste", "jazz", "joy",
	"lofi beats to code/relax to", "love", "magic", "mettle", "mojo", "optimism", "pep",
	"pizzazz", "plywood", "pride", "quirk", "resilience", "rhythm", "self-awareness",
	"serendipity", "soul", "spaghetti", "splendour", "stardust", "swagger",
	"the TypeScript any type", "three LLMs in a trench coat", "thrill", "valour", "vigilance",
	"whimsy", "wit", "wonder", "wool", "zest", "↑ ↑ ↓ ↓ ← → ← → B A Start",
];

const getDescriptors = (count: number): string[] => {
	const available = [...descriptors];
	const result: string[] = [];

	for (let i = 0; i < Math.min(count, available.length); i++) {
		const randomIndex = Math.floor(Math.random() * available.length);
		result.push(available[randomIndex]);
		available.splice(randomIndex, 1);
	}

	return result;
};

// Initialize the footer descriptors when the DOM is ready
const initFooterDescriptors = (): void => {
	const element = document.getElementById("footer-descriptors");
	if (element) {
		element.textContent = getDescriptors(2).join(", ");
	}
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initFooterDescriptors);
} else {
	initFooterDescriptors();
}
