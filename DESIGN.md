# Design System: Legal Help App

Reference for every screen in the app. Built from the home screen and the contract review screen. When a new screen is designed, follow this file before inventing anything.

## 1. Product

- **What it is:** An app that helps ordinary people with everyday legal problems without hiring a lawyer for every small thing. Ask a question, get a document drafted, or have a contract explained.
- **Who uses it:** Non-lawyers. Freelancers, tenants, small shop owners. Often stressed or confused, mostly on phones.
- **Feeling to aim for:** A sensible person explaining things across a desk. Calm, confident, human.
- **Feeling to avoid:** Tech startup, old law firm website, chatbot app.

## 2. Core principles

1. **One job per screen.** Every screen answers a single question: what should the person do or understand right now?
2. **Three things maximum on the first view.** If a fourth thing wants to appear, cut something or move it to another screen.
3. **One bold choice, everything else quiet.** The bold choice is the marigold accent. Plain background, plain text, lots of empty space.
4. **Colour means something.** Marigold marks "look here" or "start here". It is never decoration.
5. **One primary button per screen.**
6. **Words do the work.** Plain language, no legal jargon unless it is explained in the same line.

## 3. Colour

Light mode only for now.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAFAF8` | Screen background |
| `--stage` | `#ECECE8` | Backdrop behind the phone frame on desktop |
| `--ink` | `#17191C` | Headlines, body text, primary button |
| `--muted` | `#5F656D` | Supporting text, back link, secondary tags |
| `--line` | `#DCDDD8` | Dividers, outline borders |
| `--accent` | `#F4B400` | Marigold. Input block, "Check this" tag |
| `--on-accent` | `#17191C` | Text on marigold |

**Rules**
- Marigold is the only colour. No second accent, no gradients, no shadows for decoration.
- Text on marigold is always `--ink`, never white.
- Never rely on colour alone. Every tag also has a text label.

## 4. Typography

| Role | Font | Weight | Size | Line height |
|---|---|---|---|---|
| Headline | Young Serif | 400 | 40 to 46px | 1.05 to 1.08 |
| Subtext | Figtree | 400 | 17px | 1.45 |
| Body | Figtree | 400 | 16px | 1.5 |
| Item title | Figtree | 600 | 19px | default |
| Input text | Figtree | 500 | 19px | 1.4 |
| Button | Figtree | 600 | 16 to 17px | default |
| Tag | Figtree | 600 | 14px | default |

**Rules**
- Headline letter spacing is `-0.01em`. Everything else is default.
- Sentence case everywhere. No all caps, no tracked-out labels.
- Keep line lengths under about 34 characters for subtext and under 45 for body.
- Headlines are written as plain sentences: "Tell us what happened." Not slogans.
- Fonts load from Google Fonts. Fallbacks: Georgia for headlines, system-ui for text.

## 5. Layout

- **Screen width:** max 420px, centred. On a real phone it fills the width.
- **Side padding:** 24px.
- **Top padding:** 72px on the home screen (no back link). 28px on screens that start with a back link.
- **Bottom padding:** 32px plus the device safe area.
- **Alignment:** left aligned. The only centred element is the small footnote under the primary button.
- **Vertical order:** back link, headline, subtext, main content, primary button, footnote.
- **Spacing scale:** 8, 14, 22, 28, 32, 36, 40px. Headline to subtext is 14px. Subtext to content is 32 to 36px.
- **Primary button** sits at the bottom of the screen with at least 36px of space above it.

## 6. Components

### Headline
Young Serif, left aligned, 14px below it comes the subtext. One headline per screen.

### Input block (home screen)
- Background `--accent`, radius 22px, padding 20px 20px 16px.
- Transparent textarea inside, min height 132px, no resize, no border.
- Placeholder is a real example in 62% opacity ink: "My landlord won't return my deposit after I moved out..."
- Primary button sits inside, bottom right.
- On focus, a 3px `--ink` ring around the whole block.

### Primary button
- **Inside the marigold block:** `--ink` background, white text, pill shape, padding 13px 22px.
- **Full width at screen bottom:** `--ink` background, white text, pill shape, padding 17px 22px.
- One per screen. Label says exactly what happens: "Get answer", "Ask what to change".
- Focus: 3px `--ink` outline, 3px offset.

### Quick-start rows
- Plain rows, not cards. 18px text, weight 500, padding 18px 2px.
- 1px `--line` border on top of each row and on the bottom of the last one.
- A muted "+" on the right.
- Tapping one fills the input. Maximum two or three rows.

### Tags
- Pill, 14px, weight 600, padding 5px 12px.
- **Check this:** `--accent` fill, `--ink` text.
- **Fine:** 1.5px `--line` outline, `--muted` text, no fill.

### List item (contract review)
- 22px vertical padding, 1px `--line` divider above, one more below the last item.
- Order inside: tag, title (19px, 600), one explanation (16px, `--muted`).
- Explanations are one to two sentences with a clear action: "Ask for a clear deadline."
- Show three items at most. Collapse the rest into one quiet line.

### Back link
- Chevron icon plus the word "Back", 16px, weight 500, `--muted`, top left.

### Footnote
- 14px, `--muted`, centred, 14px below the primary button.

## 7. Content and copy

- **Write for a worried person.** Say where they stand, then what to do next.
- **Use real content.** Real clause names, real durations, real amounts. Never lorem ipsum, never "Item 1".
- **Name things by what they are.** "Deposit refund", not "Clause 7.2".
- **Buttons are verbs.** "Get answer", "Draft the notice", "Ask what to change". Never "Submit" or "Continue".
- **Keep names consistent.** A thing keeps the same name on every screen.
- **Errors explain and fix.** State what went wrong and what to do. Do not apologise.
- **Empty states invite action.** Tell the person what they can do here.
- **Honesty line.** Screens that give legal guidance include a short note that this is general guidance, not a lawyer's advice.

## 8. Do not use

- Gradients, glow, glass effects, dark neon backgrounds
- Scales of justice, gavels, or other legal clip art
- Emoji as icons
- Rows of identical feature cards
- Chat bubble layouts
- Hero banners with taglines
- All caps labels, numbered markers on non-sequential content
- Stats, banners, or menus on the home screen
- Decoration added only to fill empty space

## 9. Motion

- None on page load.
- Motion only in response to a tap: an expand, a fill, a confirmation.
- Respect reduced motion settings.

## 10. Accessibility

- Visible focus on every interactive element (3px `--ink` outline).
- Body text at least 16px.
- Contrast: `--ink` on `--bg` and `--ink` on `--accent` both pass AA. `--muted` on `--bg` passes AA for body text.
- Tap targets at least 44px tall.
- Respect the device safe areas at the top and bottom.

## 11. Screens

| Screen | Status | Job |
|---|---|---|
| Home | Built | Get the person to start |
| Contract review | Built | Show which clauses matter |
| Answer | Next | Give a plain answer and one next step |
| Draft | Planned | Show a generated document, let them edit and download |
| History | Planned | List past questions and documents |

### Answer screen (spec)
- The person's question, small, at the top.
- Short answer, 2 to 3 sentences.
- One primary button for the next step.
- General guidance footnote.
- No chat thread layout.

## 12. Checklist for any new screen

- Does it have one job?
- Are there three things or fewer in the first view?
- Is marigold used only where it means "look here"?
- Is there exactly one primary button, labelled with a verb?
- Is all content real and in plain language?
- Could half of it be removed? If yes, remove half.