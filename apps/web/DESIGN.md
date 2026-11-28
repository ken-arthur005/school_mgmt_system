# Design

Records what was built in Sprint 3. Colour values live in `src/index.css`; this says how to use
them.

## Colour

| Token                 | Light             | Dark                     | Use                                                                 |
| --------------------- | ----------------- | ------------------------ | ------------------------------------------------------------------- |
| `primary`             | spruce `#004f2d`  | gold `#ffda22`           | Main actions, current menu item                                     |
| `foreground`          | navy `#14213d`    | `#eef1f6`                | Text                                                                |
| `background` / `card` | pale grey / white | charcoal / navy-charcoal | Ground and panels                                                   |
| `gold`                | `#ffda22`         | same                     | Fill under navy text only: main-contact badge, photo ring, ID strip |
| `avatar`              | thistle tint      | plum                     | Initials circles                                                    |
| `warning`             | amber tint        | amber shade              | Medical notes, offline banner, form problems                        |

Gold is never text on a light surface (1.4:1).

## Type and shape

Figtree (self-hosted), 16px body, bold headings. Buttons and search are pills; panels have a 18px
radius and one soft shadow. No borders around panels.

## Layout

Phone first (360px): top search, content, bottom tabs (three places plus "More"). From `md`, a side
menu replaces the tabs. Dialogs rise from the bottom on phones and centre on larger screens.

## Signature

- The **ID card** header on a student profile: gold strip, ringed photo, name, number, class.
- One **deep green card** on the home screen, for a teacher's own class.

## Motion

150–250 ms, ease-out: press shrink, task cards lift, route cross-fade, dialogs slide. All of it
stops under `prefers-reduced-motion`.

## Every screen

Loading skeleton, empty, error, offline and not-allowed states (`components/states.tsx`), a `?`
help button, plain English kept in the feature's `copy.ts`.
