import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import {
	type ContributorId,
	contributors,
} from "./data/game-jams/contributors";

const contributorIds = Object.keys(contributors) as [
	ContributorId,
	...ContributorId[],
];

const gameJams = defineCollection({
	loader: glob({ pattern: "*.md", base: "./src/data/game-jams" }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			label: z.string(),
			summary: z.array(z.string()).min(1),
			madeWith: z
				.array(z.enum(contributorIds).transform((id) => contributors[id]))
				.min(1),
			order: z.number().int().positive(),
			published: z.boolean().default(true),
			tags: z.array(z.string()).default([]),
			theme: z
				.object({
					name: z.string(),
					emoji: z.string(),
				})
				.optional(),
			timeLimit: z
				.object({
					value: z.number().positive(),
					unit: z.enum(["minutes", "hours", "days", "weeks"]),
				})
				.optional(),
			event: z.string().optional(),
			date: z.coerce.date().optional(),
			case: z.object({
				front: image(),
				back: image(),
				promo: image(),
				inner: image().optional(),
				discFront: image(),
				discBack: image().optional(),
			}),
			links: z
				.object({
					play: z.url().optional(),
					source: z.url().optional(),
				})
				.optional(),
		}),
});

export const collections = { gameJams };
