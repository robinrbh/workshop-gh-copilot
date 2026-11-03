import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGames,
    getAllCategories,
    getAllPublishers,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    describe('filtering', () => {
        let ids: { strategy: number; puzzle: number; pubA: number; pubB: number };

        beforeEach(async () => {
            const [strategy] = await db.insert(categories).values({ name: 'Strategy', description: 'c' }).returning({ id: categories.id });
            const [puzzle] = await db.insert(categories).values({ name: 'Puzzle', description: 'c' }).returning({ id: categories.id });
            const [pubA] = await db.insert(publishers).values({ name: 'Zeta', description: 'p' }).returning({ id: publishers.id });
            const [pubB] = await db.insert(publishers).values({ name: 'Alpha', description: 'p' }).returning({ id: publishers.id });
            ids = { strategy: strategy.id, puzzle: puzzle.id, pubA: pubA.id, pubB: pubB.id };
            await db.insert(games).values([
                { title: 'A', description: 'd', categoryId: strategy.id, publisherId: pubA.id },
                { title: 'B', description: 'd', categoryId: strategy.id, publisherId: pubB.id },
                { title: 'C', description: 'd', categoryId: puzzle.id, publisherId: pubA.id },
            ]);
        });

        const titles = async (filters: Parameters<typeof getGames>[1]): Promise<string[]> =>
            (await getGames(db, filters)).map((g) => g.title);

        it('returns everything when no filters are given', async () => {
            expect(await titles({})).toEqual(['A', 'B', 'C']);
            expect(await titles({ categoryIds: [], publisherId: null })).toEqual(['A', 'B', 'C']);
        });

        it('filters by one or more categories', async () => {
            expect(await titles({ categoryIds: [ids.strategy] })).toEqual(['A', 'B']);
            expect(await titles({ categoryIds: [ids.strategy, ids.puzzle] })).toEqual(['A', 'B', 'C']);
        });

        it('filters by publisher', async () => {
            expect(await titles({ publisherId: ids.pubA })).toEqual(['A', 'C']);
        });

        it('combines category and publisher filters', async () => {
            expect(await titles({ categoryIds: [ids.strategy], publisherId: ids.pubA })).toEqual(['A']);
            expect(await titles({ categoryIds: [ids.puzzle], publisherId: ids.pubB })).toEqual([]);
        });

        it('lists categories and publishers ordered by name', async () => {
            expect((await getAllCategories(db)).map((c) => c.name)).toEqual(['Puzzle', 'Strategy']);
            expect((await getAllPublishers(db)).map((p) => p.name)).toEqual(['Alpha', 'Zeta']);
        });
    });
});
