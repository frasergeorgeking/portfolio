export interface Contributor {
	name: string;
	url?: string;
}

// Games reference these stable IDs; update names and links here.
export const contributors = {
	"fraser-king": {
		name: "Fraser King",
	},
	"melanie-townsend": {
		name: "Melanie Townsend",
	},
	"dan-pokladek": {
		name: "Dan Pokladek",
		url: "https://www.danielpokladek.me",
	},
	"kyle-bodin": {
		name: "Kyle Bodin",
	},
	"zoey-turner": {
		name: "Zoey Turner",
	},
	"katie-millar": {
		name: "Katie Millar",
	},
	"meadhbh-black": {
		name: "Meadhbh Black",
	},
	"dan-marsh": {
		name: "Dan Marsh",
	},
	"jayden-murray": {
		name: "Jayden Murray",
	},
	"sam-mcmillan": {
		name: "Sam McMillan",
	},
} satisfies Record<string, Contributor>;

export type ContributorId = keyof typeof contributors;
