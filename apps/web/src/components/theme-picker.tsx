import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import { THEME_CHOICES, type ThemeChoice, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: Record<ThemeChoice, { label: string; icon: typeof Sun }> = {
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
  system: { label: 'Auto', icon: Monitor },
};

export function ThemePicker() {
  const [choice, setChoice] = useTheme();
  const name = useId();
  return (
    <fieldset className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
      <legend className="sr-only">Colours: light, dark or follow this device</legend>
      {THEME_CHOICES.map((option) => {
        const { label, icon: Icon } = OPTIONS[option];
        return (
          <label
            key={option}
            className={cn(
              'flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors duration-150 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/60',
              choice === option ? 'bg-card text-foreground shadow-panel' : 'text-muted-foreground',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={choice === option}
              onChange={() => {
                setChoice(option);
              }}
            />
            <Icon className="size-4" aria-hidden />
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}
