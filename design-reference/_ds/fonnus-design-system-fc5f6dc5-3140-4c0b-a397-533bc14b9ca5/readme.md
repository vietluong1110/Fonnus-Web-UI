# Fonnus Design System

Fonnus is an **AI voice assistant that answers the phone for small businesses in Vietnam**. The first market is dental and aesthetic clinics with one or two locations; the pilot runs at the end of 2026. A patient calls the clinic's familiar phone number, Fonnus picks up in Vietnamese 24/7, answers prices and opening hours from the clinic's own data, holds the appointment, and hands the call to a doctor when the question is clinical.

Tagline: **"Không cuộc gọi nào bị bỏ lỡ."** (No call goes unanswered.)
Mission: **"Xoá sổ cuộc gọi bị bỏ lỡ."** — not "answer as well as a big company", but "make that way of losing customers stop existing".
Vision 2030: **"Fonnus là lớp lễ tân của kinh tế Việt Nam."** Every call to a business gets answered within three rings, in Vietnamese, whatever the hour.

The three numbers the company holds itself to: share of calls answered (denominator = every time the phone rings, including 10pm and Tết), hours returned to the owner, appointments actually kept.

Expansion path (each step reuses one core: answer, understand Vietnamese, book, know when to hand off): dental & aesthetics today → wider healthcare (eye, ENT, paediatrics, obstetrics) → any appointment-driven trade (spa, garage, vet, tutoring, law) → micro-businesses.

## Sources this system was built from

| Source | What was taken from it |
| --- | --- |
| `uploads/Fonnus_Healthcare_AI_Identity_v2.pptx` — "Bộ nhận diện thương hiệu", Bản 1.0, Tháng 8 2026, 34 slides | Every value in this system: strategy, brand attributes, voice, word lists, logo construction, colour tokens + measured contrast ratios, dark mode, the three typefaces, the type scale, Vietnamese typesetting rules, logo do/don't, the six shipping surfaces, open questions. The deck is image-only (each slide is four PNG tiles), so the content was read from the rendered slides; speaker notes were extracted to `scraps/deck-notes.txt` and full-slide renders to `scraps/slides/`. |
| `uploads/fonnus-mark.svg`, `-mark-mono`, `-mark-dark` | The real brand marks, copied verbatim into `assets/`. Nothing was redrawn. |
| `uploads/fonnus-lockup-horizontal-4f942fb1.svg`, `-stacked-2d5f2fb1.svg` + `.png` / `.jpg` of each (supplied later, as a correction) | The correct lockups: the wordmark is **outlined vector**, not live type. These replaced an earlier pair of lockup SVGs that set the wordmark as `<text>` in a fallback font and therefore rendered with the wrong letterforms. |

No codebase, Figma file or live product was provided. Nothing here is reconstructed from memory, and no screens were invented: the two UI kits are built strictly from surfaces the deck names (mobile owner dashboard, landing page) using its own copy samples.

Deck slides worth reopening: 10 (brand attributes), 11 (voice), 13 (word lists), 14 ("this brand is not"), 18–20 (logo construction), 22–24 (colour + dark), 26–28 (type), 30–32 (rules and surfaces), 33 (open questions).

## Content fundamentals

**Language.** Vietnamese first, always. English words appear only where Vietnamese business practice already uses them (dashboard, landing page, implant, Zalo OA). Product copy is written for a clinic owner and a receptionist, not for a CTO.

**Person and address.** Fonnus refers to itself as **"em"** on the phone (the polite service register) and addresses callers as **"anh / chị"**; marketing and product UI address the owner as **"bạn"** or **"anh chị"**. Company voice in decks is first-person plural: "ba con số **chúng ta** đo".

**Sentence shape.** Short declaratives. Facts before benefits. The verb comes early: "Nghe máy 24/7", "Giữ cái hẹn", "Chuyển cho bác sĩ". A statement is allowed to be absolute ("Không cuộc gọi nào bị bỏ lỡ.") but never comparative or superlative about competitors.

**Casing.** Sentence case everywhere — headings, buttons, labels. Uppercase is reserved for the eyebrow (12px, 0.16em, ≤4 words). **Never set a long Vietnamese sentence in ALL CAPS**: stacked diacritics over capitals ride high and clip the line above.

**Numbers.** Vietnamese format: `1.250.000 đ`, `300.000 đ`, `090 123 45 67`, `98,6%`. Always IBM Plex Sans with tabular figures, right-aligned in columns. Only numbers the company can defend get shown — no vanity metrics, no "hơn 1000 khách hàng".

**Domain.** `fonnus.ai`. Contact copy in samples: `fonnus.ai`, `xinchao@fonnus.ai`.

**Always say:** nghe máy · cái hẹn · thời gian của bạn · tiếng Việt · giá rõ ràng · không bỏ lỡ · buổi tối · chuyển cho bác sĩ · lễ tân.

**Never say:** chuyển đổi số · công nghệ 4.0 · giải pháp toàn diện · đột phá · hệ sinh thái · chatbot · chốt sale.

**Red zone — legal risk, never in any surface:** chẩn đoán · điều trị · khỏi bệnh · thay thế bác sĩ. Fonnus sells time, not medicine, and never technology.

**Disclosure.** Every call greeting states that Fonnus is an AI assistant, in the first sentence, out loud: *"Em là Fonnus, trợ lý AI của phòng khám."* This is a legal requirement in the pilot and cannot be toggled off in the product.

**Emoji: never.** Not in UI, not in decks, not in Zalo messages. The only pictographic characters used are `✓`, `✕`, `▾`, `·` and `—`.

**Tone examples.**
- Greeting: *"Phòng khám Nha khoa Minh Anh xin nghe. Em là Fonnus, trợ lý AI của phòng khám. Anh chị cần đặt lịch hay hỏi thông tin ạ?"*
- Price + action: *"Cạo vôi răng tại phòng khám là 300.000 đ. Chị muốn em giữ lịch 9 giờ sáng thứ Bảy không?"*
- Handoff: *"Câu này em xin phép chuyển cho bác sĩ trả lời trực tiếp. Em nối máy ngay ạ."*
- Toast: *"Đã lưu lịch hẹn 9:00 thứ Bảy"* — state the fact, no exclamation, no praise.

**The four brand attributes, each with a design consequence:** Điềm tĩnh (airy layout, no countdowns, no blinking) · Gần gũi (earth colours, round strokes, "bạn / anh chị") · Rõ ràng (price, time, address answered straight; tabular numbers) · Chu đáo (the "nn" kern, diacritics never clipped).

**This brand is not:** enterprise SaaS (no indigo, no "omnichannel", no stock photo of a headset) · a public hospital (no cold blue + emergency red, no medical cross, no all-caps) · futuristic AI (no purple-blue gradient, no sparkles, no robots) · a growth-hacking startup (no promo countdowns, no "chỉ còn 3 suất").

## Visual foundations

**Ground.** Warm paper, not white. `Giấy #F7EFE1` is the page; `Sữa #FFFBF2` is the card. Panels separate from the page **by fill, never by shadow**. Second grounds: `blush #F3DCC9` (assistant speech, section grounds), `sage #E2E7D4` (resolution, handoff, "nên"), `rose #F8E3DF` (legal-risk callouts). Maximum two background colours per deck or page.

**Colour.** Ink `#261F18` for all reading text; `Mực nhạt #5C5248` for secondary. Earth accent in three measured steps: `Đất nung #B85C2B` (4.0:1 — UI and text ≥24px **only**), `Đậm #8A4118` (6.5:1 — links and emphasis at reading size), `Nút #A04E1F` (5.4:1 — primary button ground with `Kem #FFF6E8` text). `Lá sả #6E7F53` is the second voice: charts and states. Semantic: success `#3E7B47`, warning `#8F6300`, error `#B23A2E`, info `#2F6D7E` — always as tinted ground + saturated text, never a large saturated fill (white on bright red reads as an emergency sign). Every ratio in `guidelines/colors-contrast.card.html` is computed with the WCAG formula, not estimated.

**Dark mode** is optional, for night dashboard shifts and the investor deck: warm night brown `#221B14` / surface `#2D251C`, never blue-grey. Cream `#F3E9DA`, arc and accents `#E08A50`, charts `#AFBE93`.

**Type.** Three faces, all SIL OFL with complete Vietnamese subsets and pre-composed tone marks: **Baloo 2 600** for display and headings (44–64px / 1.2 marketing, 24–28px / 1.3 headings), **Be Vietnam Pro** for body (16px / 1.65) and UI labels (13.5px / 1.4, weight 500), **IBM Plex Sans 500 tnum** for number columns only. Tracking: −0.01em on display, −0.03em on the wordmark's "nn" pair. Line-height never below 1.2, headings included. The logo wordmark is a separate custom drawing, supplied as outlined vector — it is not Baloo 2 and must never be re-typed.

**Imagery.** Real clinic photography, warm-toned; no stock robots, no people wearing headsets, no waveforms. There are no brand illustrations, patterns or textures in the source — do not invent any. Background treatment is flat colour: no gradients at all, and the purple-blue "AI" gradient is banned outright, decks included.

**Spacing & layout.** 4px base scale (4 → 64). 24px card padding, 20px between sibling cards, 64px desktop page margin, 72px slide margin, 64ch max reading measure. Layout is airy and left-aligned; big statements sit on a single left column with the right half deliberately empty. Sticky header on the landing page (72px, paper at 88% with an 8px blur — the only blur besides the modal scrim). Card grids are 3–4 across, and **only one card in a sequence is filled terracotta** — the step that is live now; a future step is a dashed outline with no fill.

**Shape.** Radii 6 / 8 / 12 / 16 / 20 / 28 / pill; 16px is the default card, 12px controls, 20px hero panels and modals, pill for badges and tags. Borders are hairlines: `rgba(38,31,24,.10)` inset, `.22` for interactive outlines, and a dashed `rgba(184,92,43,.40)` for "not yet".

**Elevation.** Flat by default. `--shadow-overlay: 0 12px 32px rgba(38,31,24,.14)` is for true overlays only (dialog, toast, device frame). No inner shadows, no protection gradients — a scrim (`rgba(38,31,24,.36)` + 2px blur) is used instead when text must sit over an image.

**Motion.** One idiom: the rising arc — a short lift and settle on `cubic-bezier(.2,.7,.3,1)`. Durations 120 / 200 / 320ms, 520ms for the arc gesture itself. Fades and small translations only: no bounce, no spin, no blink, no countdown, no shimmer. Respect `prefers-reduced-motion` by dropping to opacity.

**Interaction states.** Hover **darkens** one step (primary → `#8A4118`; secondary → `#FBF3E4`; ghost → terracotta at 8%) and never lightens. Press scales to `.985`, no colour change. Focus is a 2px `#B85C2B` outline at 2px offset (`--ring-focus` for inset use). Disabled is 42% opacity, no greyscale filter. Selected state fills terracotta with cream text.

## Iconography

The source contains **no icon set** — only the mark and the unicode characters `✓ ✕ ▾ · —` used in the deck's do/don't lists and tables.

- **Substitution (please confirm):** `components/core/Icon.jsx` pulls **Lucide** glyphs (v0.469.0, jsDelivr CDN) as CSS masks so they inherit `currentColor`. Lucide's 2px rounded-cap stroke is the closest available match to the mark's geometry. If Fonnus has, or wants, a drawn set, replace that one file.
- House set in use: `phone-call`, `phone-incoming`, `phone-missed`, `calendar-check`, `clock`, `user-round`, `message-circle`, `banknote`, `settings`, `search`, `plus`, `arrow-left`, `arrow-right`, `check`, `x`, `info`, `house`.
- Icon size is 16 / 18 / 20 / 22px, coloured `--text-accent` on light and `--terracotta-night` on dark. Icons never carry meaning alone — always paired with a label.
- **Banned motifs, from the deck:** sound waves, stethoscopes, chat bubbles with tails, sparkles, robots, medical crosses. No emoji.
- Brand assets live in `assets/`, split by format into `SVG/`, `PNG/` and `JPG/`. Each of the five artworks — `fonnus-mark`, `fonnus-mark-mono`, `fonnus-mark-dark`, `fonnus-lockup-horizontal`, `fonnus-lockup-stacked` — exists in all three (marks in SVG/PNG/JPG; lockups in SVG/PNG/JPG). **SVG is the source of truth**; PNG (2400px, transparent) for web and slides; JPG (2400px, cream `#FFFBF2` ground, dark variant on night brown) only where alpha is rejected. `mark-mono` is for one-colour print and thermal receipts, `mark-dark` for night surfaces. The wordmark is never re-set as live text: use these files. Below 24px the wordmark is dropped and only the mark is used; Zalo avatars are cropped round, so the horizontal lockup is forbidden there.

## Components

Brand-guidelines-only source, so this is a standard primitive set sized to the surfaces the deck names. Import from `window.FonnusDesignSystem_fc5f6d`.

- `components/core/` — **Button**, **IconButton**, **Card**, **Badge**, **Tag**, **Stat**, **Logo**, **Icon**, **SpeechBubble**
- `components/forms/` — **Input**, **Select**, **Checkbox**, **Radio**, **Switch**
- `components/navigation/` — **Tabs**
- `components/feedback/` — **Dialog**, **Toast**, **Tooltip**

**Intentional additions** (not in the source as components, but required by it):
- **Logo** — the only correct way to place the supplied SVGs, with the below-24px mark fallback baked in.
- **Icon** — wrapper for the substituted Lucide set.
- **Stat** — the deck mandates IBM Plex tabular figures for every number column; this enforces it.
- **SpeechBubble** — the deck defines three speech grounds (blush / milk / sage) as a brand device; quoted call script is core Fonnus content.

Each component directory has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and one `@dsCard` HTML showing its states.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The only entry point consumers link — `@import` list, nothing else |
| `tokens/` | `fonts.css` (Google Fonts import), `colors.css`, `typography.css`, `spacing.css`, `shape.css`, `motion.css`, `base.css` |
| `assets/SVG` `assets/PNG` `assets/JPG` | Brand marks and lockups, one folder per format. SVG is the source of truth; PNG is 2400px transparent; JPG is 2400px on a cream `#FFFBF2` ground (dark-mode JPG on night brown). Code always references `assets/SVG/`. |
| `components/core|forms|navigation|feedback/` | 18 React primitives + prop contracts + usage prompts |
| `guidelines/*.card.html` | 24 foundation specimen cards: Colors, Type, Spacing, Motion, Voice, Brand |
| `ui_kits/landing/` | Landing page recreation — header, hero with live call sample, four steps, script tabs, three numbers, pricing with annual switch, dark footer, "call me" dialog |
| `ui_kits/dashboard/` | Owner dashboard (390×844) — phone login → OTP, Hôm nay, call list with filters, call detail with transcript, appointments, settings incl. dark-mode switch |
| `slides/` | `SlideKit.jsx` + 9 tagged 1280×720 slide types: title, section divider, statement, card grid, numbered rows, table, do/don't, call script, closing |
| `templates/identity-deck/` | Copyable deck starter for consuming projects |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent Skills front-matter so this folder works inside Claude Code |
| `scraps/` | Working extracts from the PPTX: `deck-notes.txt`, `slides/slide-01…34.png` |

## Open questions carried over from the deck (slide 33)

1. Trademark search for "Fonnus" at NOIP, plus native read-aloud checks across regions.
2. The AI disclosure sentence needs a lawyer's review against current regulation.
3. Co-branding: with patients Fonnus speaks in the clinic's name; the Fonnus logo lives on owner and investor surfaces.
4. Currency format: settle on one standard (`1.250.000 đ`) product-wide.
5. Production wordmark: commission a custom outline pass before trademark filing.
6. Zalo OA spec: confirm round avatar crop and ~2:1 cover at account creation.
