export interface Food {
  id: string;
  name: string;
  kcalPer100g: number;
  // Favorite foods come first in the lists.
  favorite?: boolean;
}

// One food that the user ate. An entry from the food list has the id of the
// food and the grams; an entry with a custom value has the kcal only.
export interface Entry {
  id: string;
  foodId?: string;
  name: string;
  grams?: number;
  kcal: number;
}

export const DEFAULT_LIMIT = 2200;

// The name of the app in a backup file.
export const BACKUP_APP = 'cal-track-app';

const LIMIT_KEY = 'dailyLimit';
const FOODS_KEY = 'foodDb';

// The entries of each day have their own key, so a new day starts empty.
export function dayKey(date = new Date()): string {
  return `entries_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked; the data stays in memory only.
  }
}

export const loadLimit = () => load(LIMIT_KEY, DEFAULT_LIMIT);
export const saveLimit = (limit: number) => save(LIMIT_KEY, limit);
export const loadFoods = () => load<Food[]>(FOODS_KEY, []);
export const saveFoods = (foods: Food[]) => save(FOODS_KEY, foods);
export const loadEntries = (key: string) => load<Entry[]>(key, []);
export const saveEntries = (key: string, entries: Entry[]) => save(key, entries);

export const kcalOf = (food: Food, grams: number) => Math.round((food.kcalPer100g * grams) / 100);

export const byName = (a: Food, b: Food) => a.name.localeCompare(b.name);

// Favorite foods first.
export const byFavorite = (a: Food, b: Food) => Number(!!b.favorite) - Number(!!a.favorite);

export function isFoodList(value: unknown): value is Food[] {
  return (
    Array.isArray(value) &&
    value.every(
      (f) => typeof f?.id === 'string' && typeof f.name === 'string' && typeof f.kcalPer100g === 'number',
    )
  );
}

export function exportFoods(foods: Food[]): void {
  const blob = new Blob([JSON.stringify(foods, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'foodDb.json';
  a.click();
  URL.revokeObjectURL(url);
}

// The entries of all stored days except the day with the key exclude, oldest
// day first.
export function loadPastEntries(exclude: string): Entry[] {
  const days: [number, Entry[]][] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^entries_(\d+)-(\d+)-(\d+)$/);
      if (!key || !match || key === exclude) continue;
      const time = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
      days.push([time, loadEntries(key)]);
    }
  } catch {
    // Storage is blocked; there are no past entries.
  }
  return days.sort((a, b) => a[0] - b[0]).flatMap(([, entries]) => entries);
}

// How often the user ate a food and the grams of the last entry.
export interface Usage {
  count: number;
  grams: number;
}

export function usageOf(entries: Entry[]): Map<string, Usage> {
  const usage = new Map<string, Usage>();
  for (const e of entries) {
    if (!e.foodId || !e.grams) continue;
    usage.set(e.foodId, { count: (usage.get(e.foodId)?.count ?? 0) + 1, grams: e.grams });
  }
  return usage;
}

// One kind of entry for the quick add row: a food with the grams, or a name
// with a custom kcal value.
export type QuickEntry = Omit<Entry, 'id'>;

// How often the user added a kind of entry, and when the user added it last.
export interface QuickStat {
  entry: QuickEntry;
  count: number;
  last: number;
}

// The data of the quick add row: the statistics of each kind of entry and the
// keys of the favorite entries. Clearing a day does not change this data.
export interface Quick {
  stats: Record<string, QuickStat>;
  favorites: string[];
}

const QUICK_KEY = 'quickAdd';

// The storage keys of all data of the app. The theme is not data.
export const isDataKey = (key: string) =>
  key === LIMIT_KEY || key === FOODS_KEY || key === QUICK_KEY || /^entries_\d+-\d+-\d+$/.test(key);

export const quickKey = (e: QuickEntry) =>
  e.foodId && e.grams ? `food/${e.foodId}/${e.grams}` : `custom/${e.name}/${e.kcal}`;

// Count an entry once more (delta 1) or once less (delta -1). A kind of entry
// with a count of 0 is removed, except a favorite.
export function countEntry(quick: Quick, entry: QuickEntry, delta: 1 | -1, time = Date.now()): Quick {
  const key = quickKey(entry);
  const old = quick.stats[key];
  const count = Math.max(0, (old?.count ?? 0) + delta);
  const { [key]: _, ...stats } = quick.stats;
  if (count > 0 || quick.favorites.includes(key)) {
    const { foodId, name, grams, kcal } = entry;
    stats[key] = { entry: { foodId, name, grams, kcal }, count, last: delta > 0 ? time : (old?.last ?? 0) };
  }
  return { ...quick, stats };
}

export function toggleFavoriteEntry(quick: Quick, entry: QuickEntry): Quick {
  const key = quickKey(entry);
  if (quick.favorites.includes(key)) {
    const next = { ...quick, favorites: quick.favorites.filter((k) => k !== key) };
    return quick.stats[key]?.count ? next : countEntry(next, entry, -1);
  }
  const stats = quick.stats[key] ? quick.stats : { ...quick.stats, [key]: { entry, count: 0, last: 0 } };
  return { stats, favorites: [...quick.favorites, key] };
}

// The stored quick add data. Without stored data, the statistics come from the
// entries of all stored days.
export function loadQuick(): Quick {
  const stored = load<Quick | null>(QUICK_KEY, null);
  if (stored) return stored;
  return loadPastEntries('').reduce<Quick>((q, e, i) => countEntry(q, e, 1, i), { stats: {}, favorites: [] });
}

export const saveQuick = (quick: Quick) => save(QUICK_KEY, quick);

export interface QuickItem {
  key: string;
  entry: QuickEntry;
  favorite: boolean;
}

// The kinds of entries for the quick add row: all favorites first, then the
// most frequent other entries up to `max` items in total. In each group, the
// most frequent entries come first, then the newest. A food entry gets the
// current name and kcal of its food; an entry of a deleted food is left out.
export function quickItems(quick: Quick, foods: Food[], max: number): QuickItem[] {
  const items: (QuickItem & { count: number; last: number })[] = [];
  for (const [key, { entry, count, last }] of Object.entries(quick.stats)) {
    const favorite = quick.favorites.includes(key);
    if (entry.foodId && entry.grams) {
      const food = foods.find((f) => f.id === entry.foodId);
      if (!food) continue;
      const current = {
        foodId: food.id,
        name: food.name,
        grams: entry.grams,
        kcal: kcalOf(food, entry.grams),
      };
      items.push({ key, entry: current, favorite, count, last });
    } else {
      items.push({ key, entry, favorite, count, last });
    }
  }
  items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.count - a.count || b.last - a.last);
  const favorites = items.filter((i) => i.favorite).length;
  return items
    .slice(0, Math.max(favorites, max))
    .map(({ key, entry, favorite }) => ({ key, entry, favorite }));
}
