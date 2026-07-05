# UI Refresh Plan — Fonts, Cards, Colors, Effects, Mobile-First + Homepage Redesign

Proposal produced 2026-07. **Direction approved: "calm premium" + homepage Option B (conservative polish).**

## Status

| Phase | Status |
|---|---|
| UI-1 typography | ✅ Done — 183 tiny-label patterns → `text-[11px] font-semibold tracking-wide`; 679 `font-black` → `font-bold` (87 files) |
| UI-2 card system | ✅ Done — `--radius-card`/`--radius-card-lg` tokens; 157 arbitrary radii mapped to `rounded-card`/`rounded-card-lg`. `Card` primitive: opportunistic |
| UI-4 effects | ✅ Core done — 12 decorative `animate-pulse` removed (live/loading/alert keepers documented below); Hero `animate-bounce` badge stilled; `prefers-reduced-motion` now disables CSS pulse/bounce (framer was already covered). Remaining: emoji→lucide in portal stat cards, shadow-2xl audit — opportunistic |
| UI-6B homepage | ✅ Done — Hero: pulsing shapes → static radial-gradient wash, 🚀 → `ArrowRight`, red pulsing "New" → calm secondary pill, `MonitorCheck` icon on CBT CTA, stat row `grid-cols-2 sm:grid-cols-4` |
| UI-5 mobile pass | ✅ Core done — 39 card paddings → responsive (`p-5/6 md:p-8..12`), 17 hero-size figures → `text-3xl/4xl md:text-5xl/6xl`, AdminCurriculum table got the missing scroll wrapper (all 12 admin tables now scroll-safe), whiteboard panel close buttons enlarged. Remaining (enhancement, not blocker): stacked-card mobile variant for admin tables — do per-page when each is next touched |
| UI-3 color | ✅ Done — 405 raw `blue-600` classes → `primary` tokens (43 files; dark-rooted pages excluded so navy doesn't vanish on black); `--color-primary-soft` + gold tokens added; rating stars → gold |
| Dark mode (found half-built) | ✅ Functional — the toggle previously only recolored the shell (zero `dark:` variants existed). Now: class-scoped `@custom-variant dark` (applies only inside the portal shell), 608 `dark:` variants across 41 portal files (cards, borders, text, hovers; gradient panels deliberately untouched). Needs a visual pass with the toggle on |
| "Become a Tutor" wizard inputs | ✅ Fixed — inputs on the dark wizard had 5%-white borders (invisible) and dim labels; now `border-white/15`, labels lightened, placeholders raised a step |

**Pulse keep-list** (semantic uses that stay): skeletons, Suspense fallbacks, loading text, ExamTimer <5min, "Live Now" badges, whiteboard coaching dot, WebRTC waiting state, admin alert badges, notification unread dot, "auto-redirecting" text.

**Visual review requested:** typography now reads noticeably calmer everywhere — spot-check the portals and homepage in the browser; anything that lost too much emphasis can be selectively re-weighted.

## Where the UI stands today (measured)

| Signal | Finding |
|---|---|
| Font weights | **862× `font-black`**, 431× `font-bold`, only 70× `font-semibold` — everything shouts, so nothing stands out. The earlier typography rule ("black = display titles only") was applied to shells only |
| Card radii | Five arbitrary values in use: `rounded-[2rem]`×58, `[2.5rem]`×55, `[3rem]`×38, `[1.5rem]`×5, `[3.5rem]`×1 — no system, cards look related-but-off across pages |
| Color | Token set is solid (navy `#1e40af` + sky secondary) but portals bypass it with raw `blue-600`/`slate-*` classes; the brand never shows up as a *surface*, only as button fills |
| Effects | `animate-pulse` runs constantly on decorative elements (Hero background, badges, empty-state icons) — motion without meaning; heavy `shadow-2xl` everywhere flattens depth hierarchy |
| Icons | Emoji used as UI iconography (🚀 ✏️ 📂 🎓 💰) in buttons and stat cards — inconsistent rendering across OS/devices, reads unpolished |
| Mobile | Layouts are responsive but desktop-first: `p-10`/`p-12` card padding and `text-6xl` figures on mobile, a 4-column stat row in the Hero that cramps at 375px, `rounded-[3rem]` panels eating small screens |
| Fonts | Inter (body) + Outfit (display) + Amiri (Arabic) — good trio, underused: Outfit only appears via `.font-display` sporadically |

## Direction (recommended): "Calm premium"

Keep the navy/sky identity; earn the premium feel through **restraint** — fewer weights, one radius scale, motion only on interaction, real icons. No rebrand, no new dependencies.

---

### UI-1 — Typography discipline
- **Scale:** display = Outfit `font-bold` (not black); section titles = Outfit `font-semibold`; body = Inter `font-normal`; labels/badges = Inter `font-semibold` + `tracking-wide` (drop the `tracking-widest` + `font-black` combo).
- **Mechanical pass:** `font-black` → `font-bold` everywhere except `font-display` headings (scripted, same technique as the contrast pass); `text-[10px] font-black uppercase tracking-widest` label pattern → `text-[11px] font-semibold uppercase tracking-wide`.
- Minimum text size 11px (finishes what the a11y pass started).

### UI-2 — Card system (one scale, tokenized)
Add radius tokens and map the five arbitrary values onto three:
```css
--radius-card:    1.25rem;  /* rounded-card    — default cards, modals   */
--radius-card-lg: 1.75rem;  /* rounded-card-lg — feature/hero panels     */
--radius-pill:    9999px;
```
Scripted mapping: `[1.5rem]`,`[2rem]` → `rounded-card` · `[2.5rem]`,`[3rem]`,`[3.5rem]` → `rounded-card-lg`. One `Card` primitive in `components/ui/Card.jsx` (surface, border, `--shadow-sm`, hover elevate to `--shadow-md`) adopted opportunistically.

### UI-3 — Color: let the brand be a surface
- Keep tokens; add two: `--color-primary-soft: #eff6ff` (tinted section backgrounds) and `--color-gold: #d97706`-family accent used *sparingly* (Islamic-education accents, ratings, "premium" moments) — differentiates the two curricula visually.
- Portal rule: page background `surface`, cards `surface-raised`, ONE accent element per view (stat highlight or primary CTA), everything else neutral.
- Replace raw `blue-600` CTAs with `primary`/`accent` tokens during the weight pass (same script).

### UI-4 — Effects: motion on interaction only
- Remove all decorative `animate-pulse` (keep it solely for skeletons and the <5-min exam timer).
- Standard interactions: cards `hover:-translate-y-0.5 hover:shadow-md transition`, buttons `active:scale-[0.98]`; drop `hover:scale-[1.02]` on large panels (janky on low-end phones).
- Replace emoji iconography with lucide icons (already a dependency) — scripted for the common ones, manual for stat cards.
- Shadows: `shadow-sm` resting / `shadow-md` hover / `shadow-xl` reserved for modals & the hero. Delete `shadow-2xl` from flat cards.

### UI-5 — Mobile-first pass
- Card padding: `p-5 md:p-8` (portals currently `p-8`–`p-12` flat).
- Big figures: `text-3xl md:text-5xl` (wallet balance is `text-6xl` on a 360px screen today).
- Hero stat row: `grid-cols-2 sm:grid-cols-4`.
- Tables → stacked cards under `sm` for admin lists (AdminStudents/Tutors/Transactions are horizontal-scroll today).
- Touch targets ≥44px on icon buttons (several are `p-1.5`).
- Test matrix: 360px / 390px / 768px / 1280px.

### UI-6 — Homepage redesign (needs your pick)
Current: Hero (pulsing abstract circles + emoji CTAs) → Features → About → Tutors → Curriculum → TrialForm → footer. Two directions:

**Option A — "Two worlds, one platform" (recommended).** Split hero: left Western academia, right Islamic scholarship (gold accent + subtle Amiri calligraphy motif), converging on one CTA pair (Free Trial / Explore Tutors). Below: proof strip (tutor count, sessions delivered, exam pass focus) → *interactive* curriculum picker (tabs: Islamic / Western / Exam Prep — replaces two static sections) → tutor carousel with real profiles → single conversion section (TrialForm) → tightened footer. Cuts page length ~40%, gives the brand a memorable visual identity, and the dual-curriculum story is the product's actual differentiator.

**Option B — conservative polish.** Keep the section order; apply UI-1..UI-5 to it, swap emoji for icons, replace pulsing shapes with a static gradient mesh, add real screenshots of the CBT/whiteboard as hero imagery. Half the effort, half the impact.

---

## Sequencing & effort

| Phase | Effort | Risk |
|---|---|---|
| UI-1 typography | scripted + spot-check | low |
| UI-2 cards | scripted + Card primitive | low |
| UI-4 effects | mostly scripted | low |
| UI-3 color | script + judgment per portal | medium (visual review needed) |
| UI-5 mobile | manual, page-by-page | medium |
| UI-6 homepage | manual build | A: high · B: low |

Recommended order: UI-1+2+4 in one pass (all scripted, one visual review), then UI-6, then UI-5, then UI-3. Each phase ends with a build + your visual check in the browser before the next.
