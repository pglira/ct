import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  type Entry,
  type Food,
  type Usage,
  byName,
  dayKey,
  exportFoods,
  isFoodList,
  kcalOf,
  loadEntries,
  loadFoods,
  loadLimit,
  loadPastEntries,
  recentEntries,
  saveEntries,
  saveFoods,
  saveLimit,
  usageOf,
} from './data';
import { Icon, type IconName } from './icons';
import { SwipeRow } from './SwipeRow';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, IconName> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The interval in which the app checks for the start of a new day.
const DAY_CHECK_MS = 60_000;

// The open sheet: an entry form (id null for a new entry), the food list, a
// food form (id null for a new food) or the settings.
type Sheet =
  | { kind: 'entry'; id: string | null }
  | { kind: 'foods' }
  | { kind: 'food'; id: string | null }
  | { kind: 'settings' }
  | null;

// The number of recent entries that the quick add row shows.
const QUICK_ADD_MAX = 8;

// The entries of one day, with the storage key of that day.
interface Day {
  key: string;
  entries: Entry[];
}

const loadDay = (): Day => ({ key: dayKey(), entries: loadEntries(dayKey()) });

export default function App() {
  const [limit, setLimit] = useState(loadLimit);
  const [foods, setFoods] = useState(loadFoods);
  const [day, setDay] = useState(loadDay);
  const [sheet, setSheet] = useState<Sheet>(null);
  // The id of the entry whose row shows the swipe actions.
  const [swiped, setSwiped] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveLimit(limit), [limit]);
  useEffect(() => saveFoods(foods), [foods]);
  useEffect(() => saveEntries(day.key, day.entries), [day]);

  // Show the entries of the new day after midnight, also when the app comes
  // back from the background.
  useEffect(() => {
    const check = () => setDay((d) => (d.key === dayKey() ? d : loadDay()));
    const timer = setInterval(check, DAY_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const setEntries = (update: (entries: Entry[]) => Entry[]) =>
    setDay((d) => ({ ...d, entries: update(d.entries) }));
  const removeEntry = (id: string) => setEntries((es) => es.filter((e) => e.id !== id));
  const addEntry = (entry: Omit<Entry, 'id'>) => setEntries((es) => [...es, { ...entry, id: crypto.randomUUID() }]);

  // The entries of the past days, for the usage of each food and the quick
  // add row.
  const past = useMemo(() => loadPastEntries(day.key), [day.key]);
  const history = [...past, ...day.entries];
  const usage = usageOf(history);
  const recent = recentEntries(history, foods, QUICK_ADD_MAX);

  const eaten = day.entries.reduce((sum, e) => sum + e.kcal, 0);
  const remaining = limit - eaten;
  const close = () => setSheet(null);
  const sheetEntry = sheet?.kind === 'entry' ? day.entries.find((e) => e.id === sheet.id) : undefined;
  const sheetFood = sheet?.kind === 'food' ? foods.find((f) => f.id === sheet.id) : undefined;

  return (
    <main>
      <header>
        <h1>CalTrack</h1>
        <div className="header-buttons">
          <button
            className="icon"
            onClick={nextTheme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
          >
            <Icon name={THEME_ICONS[theme]} />
          </button>
          <button
            className="icon"
            onClick={() => setSheet({ kind: 'foods' })}
            aria-label="Food list"
            title="Food list"
          >
            <Icon name="list" />
          </button>
          <button
            className="icon"
            onClick={() => setSheet({ kind: 'settings' })}
            aria-label="Settings"
            title="Settings"
          >
            <Icon name="settings" />
          </button>
          <button
            className="add"
            onClick={() => setSheet({ kind: 'entry', id: null })}
            aria-label="Add entry"
            title="Add entry"
          >
            <Icon name="plus" size={24} />
          </button>
        </div>
      </header>

      <section className={remaining < 0 ? 'summary over' : 'summary'}>
        <div className="totals">
          <div>
            <span className="label">Eaten</span>
            <span className="value">{eaten}</span>
          </div>
          <div className="right">
            <span className="label">{remaining < 0 ? 'Over' : 'Remaining'}</span>
            <span className="value">{Math.abs(remaining)}</span>
          </div>
        </div>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={eaten}>
          <div style={{ width: `${Math.min(100, (eaten / limit) * 100)}%` }} />
        </div>
        <span className="label">Daily limit: {limit} kcal</span>
      </section>

      {recent.length > 0 && (
        <div className="quick" role="group" aria-label="Quick add">
          {recent.map((entry) => (
            <button
              key={entry.foodId ? `food/${entry.foodId}/${entry.grams}` : `custom/${entry.name}/${entry.kcal}`}
              onClick={() => addEntry(entry)}
              title={`Add ${entry.name}`}
            >
              <Icon name="plus" size={16} />
              <span className="quick-name">{entry.name}</span>
              <small>{entry.grams ? `${entry.grams} g` : `${entry.kcal} kcal`}</small>
            </button>
          ))}
        </div>
      )}

      <div className="toolbar">
        <span>Today</span>
        <ClearButton disabled={day.entries.length === 0} onConfirm={() => setEntries(() => [])} />
      </div>

      {day.entries.length === 0 && <p className="empty">No entries. Tap + to add an entry.</p>}

      <ul>
        {day.entries.map((entry) => (
          <SwipeRow
            key={entry.id}
            className="row"
            open={swiped === entry.id}
            onOpen={() => setSwiped(entry.id)}
            onClose={() => setSwiped(null)}
            onEdit={() => {
              setSwiped(null);
              setSheet({ kind: 'entry', id: entry.id });
            }}
            onDelete={() => {
              setSwiped(null);
              removeEntry(entry.id);
            }}
          >
            <button className="info" onClick={() => setSheet({ kind: 'entry', id: entry.id })}>
              <span className="name">{entry.name}</span>
              <span className="detail">{entry.grams ? `${entry.grams} g` : 'Custom'}</span>
            </button>
            <span className="kcal">
              {entry.kcal}
              <small> kcal</small>
            </span>
          </SwipeRow>
        ))}
      </ul>

      {sheet?.kind === 'entry' && (
        <EntryForm
          key={sheet.id ?? 'new'}
          foods={foods}
          usage={usage}
          entry={sheetEntry}
          onCancel={close}
          onSave={(entry) => {
            if (sheetEntry) {
              setEntries((es) => es.map((e) => (e.id === sheetEntry.id ? { ...entry, id: e.id } : e)));
            } else {
              addEntry(entry);
            }
            close();
          }}
          onDelete={
            sheetEntry
              ? () => {
                  removeEntry(sheetEntry.id);
                  close();
                }
              : undefined
          }
        />
      )}

      {sheet?.kind === 'foods' && (
        <FoodList
          foods={foods}
          onSelect={(id) => setSheet({ kind: 'food', id })}
          onImport={setFoods}
          onClose={close}
        />
      )}

      {sheet?.kind === 'food' && (
        <FoodForm
          key={sheet.id ?? 'new'}
          food={sheetFood}
          onCancel={() => setSheet({ kind: 'foods' })}
          onSave={(name, kcalPer100g) => {
            setFoods((fs) =>
              sheetFood
                ? fs.map((f) => (f.id === sheetFood.id ? { ...f, name, kcalPer100g } : f))
                : [...fs, { id: crypto.randomUUID(), name, kcalPer100g }],
            );
            setSheet({ kind: 'foods' });
          }}
          onDelete={
            sheetFood
              ? () => {
                  setFoods((fs) => fs.filter((f) => f.id !== sheetFood.id));
                  setSheet({ kind: 'foods' });
                }
              : undefined
          }
        />
      )}

      {sheet?.kind === 'settings' && (
        <SettingsForm
          limit={limit}
          onCancel={close}
          onSave={(value) => {
            setLimit(value);
            close();
          }}
        />
      )}
    </main>
  );
}

const CONFIRM_MS = 3000;

// A button that calls onAction after a second tap. The button returns to its
// first state when the second tap does not come within CONFIRM_MS.
function ConfirmButton(props: {
  className?: string;
  armedClassName: string;
  disabled?: boolean;
  onAction: () => void;
  children: (armed: boolean) => ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      className={[props.className, armed && props.armedClassName].filter(Boolean).join(' ') || undefined}
      disabled={props.disabled}
      onClick={() => {
        if (armed) props.onAction();
        setArmed(!armed);
      }}
    >
      {props.children(armed)}
    </button>
  );
}

function ClearButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  return (
    <ConfirmButton armedClassName="armed" disabled={disabled} onAction={onConfirm}>
      {(armed) => (
        <>
          <Icon name="restart" size={18} />
          {armed ? 'Tap to confirm' : 'Clear day'}
        </>
      )}
    </ConfirmButton>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <ConfirmButton className="delete" armedClassName="armed" onAction={onDelete}>
      {(armed) => (armed ? 'Tap to delete' : 'Delete')}
    </ConfirmButton>
  );
}

function SheetFrame(props: {
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.onCancel]);

  return (
    <div className="backdrop" onClick={props.onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit();
        }}
      >
        <h2>{props.title}</h2>
        {props.children}
      </form>
    </div>
  );
}

// A positive number from the text of a number field, or 0.
const toNumber = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0);

// The keys of the keypad. 'back' removes the last character, 'clear' removes
// all characters.
const KEYS = ['7', '8', '9', 'back', '4', '5', '6', '1', '2', '3', 'clear', '0', '.'];
const MAX_CHARS = 6;

// Add a key to the text of a number. The text has at most MAX_CHARS
// characters, one decimal point, one decimal digit and no leading zeros.
function pressKey(text: string, key: string): string {
  if (key === 'back') return text.slice(0, -1);
  if (key === 'clear') return '';
  if (key === '.') return text.includes('.') ? text : (text || '0') + '.';
  if (text.length >= MAX_CHARS || /\.\d$/.test(text)) return text;
  return text === '0' ? key : text + key;
}

// A number field with an in-app keypad, so that the system keyboard does not
// open. A value that does not come from the keypad is preset: the first key
// replaces it. A hardware keyboard can also enter the number, except when the
// focus is in a text input. Enter submits the sheet.
function NumberPad(props: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  decimal?: boolean;
}) {
  const { value, onChange, decimal } = props;
  // The last value that the keypad made.
  const typed = useRef('');
  const preset = value !== typed.current;

  const press = (key: string) => {
    typed.current = pressKey(preset ? '' : value, key);
    onChange(typed.current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (decimal && (e.key === '.' || e.key === ',')) press('.');
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Delete') press('clear');
      else if (e.key === 'Enter') document.querySelector<HTMLFormElement>('form.sheet')?.requestSubmit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="number-pad">
      <span className="number-label">{props.label}</span>
      <output className={preset ? 'preset' : undefined} aria-live="polite">
        {value || '0'}
        <small> {props.unit}</small>
      </output>
      <div className={decimal ? 'keypad' : 'keypad no-decimal'}>
        {KEYS.filter((key) => decimal || key !== '.').map((key) => (
          <button
            key={key}
            type="button"
            className={`key key-${key === '.' ? 'dot' : key}`}
            onClick={() => press(key)}
            aria-label={key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear' : undefined}
          >
            {key === 'back' ? <Icon name="backspace" size={26} /> : key === 'clear' ? 'C' : key}
          </button>
        ))}
      </div>
    </div>
  );
}

// Show the foods whose name contains the search text, in the order of the
// name. With a usage and no search text, the most used foods come first.
function useFoodSearch(foods: Food[], usage?: Map<string, Usage>): [string, (text: string) => void, Food[]] {
  const [search, setSearch] = useState('');
  const text = search.trim().toLowerCase();
  const count = (f: Food) => (usage && !text ? (usage.get(f.id)?.count ?? 0) : 0);
  const matches = foods
    .filter((f) => f.name.toLowerCase().includes(text))
    .sort((a, b) => count(b) - count(a) || byName(a, b));
  return [search, setSearch, matches];
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="search"
      placeholder="Search"
      aria-label="Search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      // Enter in the search field does not submit the sheet.
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
    />
  );
}

type EntryMode = 'food' | 'custom';

interface EntryFormProps {
  foods: Food[];
  usage: Map<string, Usage>;
  entry?: Entry;
  onSave: (entry: Omit<Entry, 'id'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

// Add or edit an entry: a food from the food list with the grams, or a name
// with a custom kcal value. A tap on a food fills in the grams of the last
// entry of that food, so that Save adds the entry.
function EntryForm({ foods, usage, entry, onSave, onCancel, onDelete }: EntryFormProps) {
  const initialFood = foods.find((f) => f.id === entry?.foodId);
  const [mode, setMode] = useState<EntryMode>(
    initialFood || (!entry && foods.length > 0) ? 'food' : 'custom',
  );
  const [foodId, setFoodId] = useState(initialFood?.id ?? '');
  const [grams, setGrams] = useState(initialFood ? String(entry?.grams ?? '') : '');
  const [name, setName] = useState(initialFood ? '' : (entry?.name ?? ''));
  const [kcal, setKcal] = useState(initialFood ? '' : String(entry?.kcal ?? ''));
  const [search, setSearch, matches] = useFoodSearch(foods, usage);

  const selectFood = (id: string) => {
    setFoodId(id);
    const last = usage.get(id)?.grams;
    if (last) setGrams(String(last));
  };

  const food = foods.find((f) => f.id === foodId);
  const gramsValue = toNumber(grams);
  const result: Omit<Entry, 'id'> | null =
    mode === 'food'
      ? food && gramsValue > 0
        ? { foodId: food.id, name: food.name, grams: gramsValue, kcal: kcalOf(food, gramsValue) }
        : null
      : toNumber(kcal) > 0
        ? { name: name.trim() || 'Custom', kcal: Math.round(toNumber(kcal)) }
        : null;

  return (
    <SheetFrame
      title={entry ? 'Edit entry' : 'New entry'}
      onCancel={onCancel}
      onSubmit={() => result && onSave(result)}
    >
      <div className="segmented" role="radiogroup" aria-label="Entry type">
        {(['food', 'custom'] as EntryMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={m === mode}
            onClick={() => setMode(m)}
          >
            {m === 'food' ? 'Food list' : 'Custom kcal'}
          </button>
        ))}
      </div>

      {mode === 'food' && (
        <>
          {foods.length === 0 ? (
            <p className="hint">No foods. Add foods in the food list.</p>
          ) : (
            <>
              <SearchInput value={search} onChange={setSearch} />
              <div className="choices" role="radiogroup" aria-label="Food">
                {matches.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={f.id === foodId}
                    onClick={() => selectFood(f.id)}
                  >
                    <span>{f.name}</span>
                    <small>{f.kcalPer100g} kcal/100 g</small>
                  </button>
                ))}
                {matches.length === 0 && <p className="hint">No food matches the search.</p>}
              </div>
            </>
          )}
          <NumberPad label="Amount" unit="g" value={grams} onChange={setGrams} decimal />
        </>
      )}

      {mode === 'custom' && (
        <>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom" />
          </label>
          <NumberPad label="Energy" unit="kcal" value={kcal} onChange={setKcal} />
        </>
      )}

      {mode === 'food' && (
        <p className="preview">
          {food ? 'Energy: ' : 'Select a food.'}
          {food && <strong>{result?.kcal ?? 0} kcal</strong>}
        </p>
      )}

      <div className="buttons">
        {onDelete && <DeleteButton onDelete={onDelete} />}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!result}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

interface FoodListProps {
  foods: Food[];
  onSelect: (id: string | null) => void;
  onImport: (foods: Food[]) => void;
  onClose: () => void;
}

// The food list with the energy per 100 g of each food. The list can be
// exported to and imported from a JSON file.
function FoodList({ foods, onSelect, onImport, onClose }: FoodListProps) {
  const [search, setSearch, matches] = useFoodSearch(foods);
  const [error, setError] = useState('');

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so that the same file can be selected again.
    e.target.value = '';
    if (!file) return;
    try {
      const json: unknown = JSON.parse(await file.text());
      if (!isFoodList(json)) throw new Error();
      onImport(json);
      setError('');
    } catch {
      setError('The file is not a valid food list.');
    }
  };

  return (
    <SheetFrame title="Food list" onCancel={onClose} onSubmit={() => onSelect(null)}>
      {foods.length > 0 && <SearchInput value={search} onChange={setSearch} />}
      <div className="choices">
        {matches.map((f) => (
          <button key={f.id} type="button" onClick={() => onSelect(f.id)}>
            <span>{f.name}</span>
            <small>{f.kcalPer100g} kcal/100 g</small>
          </button>
        ))}
        {foods.length === 0 && <p className="hint">No foods. Tap New food to add a food.</p>}
        {foods.length > 0 && matches.length === 0 && <p className="hint">No food matches the search.</p>}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="file-buttons">
        <label className="file-button" title="Import from a JSON file">
          <Icon name="upload" size={18} />
          Import
          <input type="file" accept="application/json,.json" hidden onChange={importFile} />
        </label>
        <button
          type="button"
          className="file-button"
          disabled={foods.length === 0}
          onClick={() => exportFoods(foods)}
          title="Export to a JSON file"
        >
          <Icon name="download" size={18} />
          Export
        </button>
      </div>
      <div className="buttons">
        <button type="button" onClick={onClose}>
          Close
        </button>
        <button type="submit" className="primary">
          New food
        </button>
      </div>
    </SheetFrame>
  );
}

interface FoodFormProps {
  food?: Food;
  onSave: (name: string, kcalPer100g: number) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function FoodForm({ food, onSave, onCancel, onDelete }: FoodFormProps) {
  const [name, setName] = useState(food?.name ?? '');
  const [kcal, setKcal] = useState(food ? String(food.kcalPer100g) : '');
  const kcalValue = toNumber(kcal);
  const valid = name.trim() !== '' && kcalValue > 0;

  return (
    <SheetFrame
      title={food ? 'Edit food' : 'New food'}
      onCancel={onCancel}
      onSubmit={() => valid && onSave(name.trim(), kcalValue)}
    >
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!food} />
      </label>
      <NumberPad label="Energy per 100 g" unit="kcal" value={kcal} onChange={setKcal} decimal />
      <div className="buttons">
        {onDelete && <DeleteButton onDelete={onDelete} />}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!valid}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

function SettingsForm(props: { limit: number; onSave: (limit: number) => void; onCancel: () => void }) {
  const [limit, setLimit] = useState(String(props.limit));
  const value = Math.round(toNumber(limit));

  return (
    <SheetFrame title="Settings" onCancel={props.onCancel} onSubmit={() => value > 0 && props.onSave(value)}>
      <NumberPad label="Daily limit" unit="kcal" value={limit} onChange={setLimit} />
      <div className="buttons">
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={value <= 0}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}
