import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// id はファイル名（例: 01-sets）。URL は slug、進捗の保存キーは chapterKey と役割を分ける。
const chapters = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/chapters', generateId: ({ entry }) => entry.replace(/\.mdx$/, '') }),
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    chapterKey: z.string().regex(/^[a-z0-9-]+-v\d+$/),
    order: z.number().int().min(0),
    part: z.enum(['はじめに', '集合と論理', '写像と関係', '無限と濃度', '公理と選択']),
    summary: z.string(),
    goals: z.array(z.string()).min(1),
    prereq: z.array(z.string()).default([]),
    minutes: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { chapters };
