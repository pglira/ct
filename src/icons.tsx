// Line icons on a 24 × 24 grid with one stroke width and square ends, so that
// all icons have the same weight. The icons use the current text color.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  auto: 'M12 4a8 8 0 0 1 0 16a8 8 0 0 1 0-16zM12 4v16',
  sun: 'M12 8a4 4 0 0 1 0 8a4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  moon: 'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z',
  settings: 'M4 7h4M12 7h8M4 17h8M16 17h4M8 5h4v4H8zM12 15h4v4h-4z',
  list: 'M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10',
  restart: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
  edit: 'M4 20v-4L15 5l4 4L8 20zM12 8l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  download: 'M12 4v11M7 10l5 5l5-5M4 20h16',
  upload: 'M12 15V4M7 9l5-5l5 5M4 20h16',
  star: 'M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2-5.6-3.2-5.6 3.2 1.3-6.2L3 9.5l6.3-.7z',
  backspace: 'M8 6h12v12H8l-5-6zM11 9l6 6M17 9l-6 6',
};

export type IconName = keyof typeof PATHS;

// A filled icon uses the current text color also for its area.
export function Icon({ name, size = 20, filled }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      className="svg-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
