# UI/UX principles

The rules that keep every Fonnus app screen feeling like the same product. They are
written from mistakes that were actually made here — each one existed as an
inconsistency on a real page before it became a rule.

**This is a living document.** At the end of a session that changed a screen, come back
and ask: did I invent a shape that is not in here? Did I have to fix the same thing
twice? If so, add the rule and say which page taught it. A rule with no page behind it
is a guess, and guesses do not belong in this file.

Related, and not repeated here:

- `../CLAUDE.md` — the repo's non-negotiables (no dependencies, hash routing,
  snake_case model, Vietnamese copy, load-bearing CSS).
- `../docs/visual-language.md` — colour, icons, shapes, patterns, `--icon-accent`.
- `Fonnus Visual Language.dc.html` — the drawn catalogue.

The audience for every screen in `#/app` is one person: the owner of a Vietnamese
clinic, on their own, usually in a hurry, often on a phone. They are not exploring the
product. They are answering questions so the receptionist can do her job. Everything
below follows from that.

---

## 1. One shape per meaning

The fastest way to make a product feel unfinished is to let one visual style mean two
different things. When it does, the owner has to read every instance to find out which
one it is, and the style has stopped carrying information.

**The dashed rounded rectangle means "content, not yet filled in".** Exactly two things
wear it:

| Dashed thing | What it says |
| --- | --- |
| `EmptyState` | this list is empty, and here is what goes in it |
| `Suggestion` | here is a ready-made line — press it and it becomes yours |

Nothing else. In particular it is **not** an add button. It used to be, on five
different pages, and the result was that half the dashed boxes on a screen were things
you read and half were things you pressed to make an empty row.

**Blush (`--surface-warm`) means speech** — the receptionist's own line inside a call
preview, and a merge-tag pill standing for words the mailer will say. Never a callout,
never a badge inside a form.

**The orb means "talk to her".** It is the call button in the header and the face of the
try-out panel, and it appears nowhere else — not as decoration, not inside a meter. A
readiness ring once held the orb in its hole; it looked pressable, and it repeated the
try-out orb one click away on the sub-page.

**Status is a fact about the clinic, never an obligation.** A row says what is currently
set — `2 số · Linh gọi chị Lan trước` — and a row with nothing in it says what she
cannot do without it, in her words, and wears the dashed edge. There is no "bắt buộc"
chip to reach for: `GateTag`, the `gate` prop on `Card` and on every field, and the
`.gateR1`/`.gateR2`/`.gateO`/`.gateSW` classes were deleted once the last three screens
stopped using them. The catalogue's R1/R2 gates still exist where they belong — in
`readiness.ts`, which decides what the product chases the owner about — not as a chip
sitting beside a field the owner is already looking at.

> **Check:** in one card, is anything dashed except an empty state or a suggestion? If
> yes, one of them is wearing the wrong clothes.

---

## 2. The action to add lives in the head of the card it adds to

Top right, in `Card`'s `actions` slot, as an `AddButton`. Never at the foot of the list.

Three reasons, in order of how much they matter:

1. **It does not move.** A foot button sits directly under the last row, so it is in a
   different place on every card and moves down the page every time the owner uses it.
   In the head it is where it was the first time, and where it is on every other card.
2. **It reads as the card's action, not as a row.** At the foot of a list, a full-width
   add button is the same width and shape as the rows above it — it looks like an empty
   record, which is what made it dashed in the first place (see §1).
3. **It survives a long list.** Ten holidays push a foot button below the fold; the head
   is always one scroll from the card's title.

This matches how Polaris treats a list's primary action: an empty state does not need
its own button when the section header already carries the call to action, sitting a
few dozen pixels above it.

`Card`'s head is a two-column grid — title and subtitle take what is left, the action is
pinned right at every width. It used to be a wrapping flex row, which put the action
inline on a desktop and *below the subtitle* in the narrower column beside the try-out
rail. That is the one place the reader most needs to know where the action lives.

A group band inside a card (the price list's headings) uses the same pair with
`band` — same pill, one step smaller, so a band still reads as a band.

**Deleting** is `DeleteButton` when there is room for the word, and
`IconButton name="trash" danger` inside a row or an entry head where there is not.

> **Check:** every list on a page — does its add button sit in a card head, right-aligned,
> reading `+ Thêm <the thing>`?

---

## 3. A repeated record is an entry inside one card, never a card of its own

A list of doctors, branches, questions or holidays is **one `Card`** containing
`styles.entries` → `styles.entry` blocks. Each entry opens with `entryHead`: an ordinal
label in micro caps (`BÁC SĨ 1`, `CHI NHÁNH 2`) and its own delete on the right.

A stack of top-level cards, one per record, loses the two things that make a list a
list: there is nowhere to put the count, and nowhere to put the add button, so it ends
up loose at the bottom of the page belonging to nothing.

The price list is the same idea one level deeper — rows that expand to edit, under
renamable group bands — because it is long enough to need scanning rather than reading.

**The choice between the two is about what a closed record can say.** If a record has a
one-line summary worth scanning, it is a row (`ExpandRow`); if every field matters and
there is nothing to scan, it is an entry. A doctor is a row, because "bác sĩ Hùng hôm nay
có làm không" is answered by the closed line; a question is a row, because the question
and the first words of its answer are the whole record; a branch and a holiday are
entries, because an address has nothing to summarise.

**And there is a third answer: neither.** A record of two short fields, in a list the
owner fills in one sitting, is a **table row that edits in place** — no press to open, no
summary, because there is nothing a summary could hide. `Từ hay nghe nhầm` was built as
an expanding row and it was wrong: a price row has eight fields worth folding away, a
keyterm has two, and thirty of them meant thirty extra presses to do one job. The test is
not "how many fields" but **how many of these will they fill in a row**. One record at a
time → expand. Thirty in a sitting → a table.

The row's geometry lives in `app/ui/Rows.tsx` — `RowList`, `ExpandRow`, `RowText`,
`RowValue`, `RowMeta`, `RowEdit` — not on the page that wrote it first. Four pages
hand-assembling the same spans is four pages that drift; and the container query the
row answers to (`rows`) has to be declared and queried in one stylesheet, because a
CSS-module container name is global while its classes are not.

A row's columns are fixed so every value in a list lands on one vertical, which means a
value that is a **set of marks rather than text** — a doctor's week — must be
`RowValue fixed`. Text that runs out ends in an ellipsis and loses a letter; a set of
marks loses its last day, silently, and the row then says something untrue.

**A setting that is *about* one record belongs inside that record's row, not on a card
above the list.** `Chuyển máy` had four cards over one shared list of phone numbers: when
may she agree, when does she offer, what happens at 21:00, and a separate emergency card
with a second phone field. Every clinic's actual question — *this* person in the day and
*that* one at night — was unanswerable, because the numbers were a list with no meaning
attached to any of them and the settings applied to all of them at once. One row per
person, carrying its number, its job, what makes her ring it and what she does when it
rings out, answers it and deletes three cards.

The test is **what does this setting vary with?** If two records could reasonably want
different answers, it is a field on the row. If the answer is a property of the clinic
rather than of a record — what she does with an ordinary call at 21:00 — it stays a card.

The corollary is that a record can absorb a *card*: the on-call doctor is no longer a
phone field of its own, it is the row whose trigger is `Khẩn cấp y tế`, and the clinical
red flags sit inside that row where they qualify something. The catalogue column
`after_hours_emergency_target` is then **derived** from the list, the way
`working_hours_note` is derived from a doctor's blocks — a page never asks for the same
fact in two places, and the backend still gets its column.

**Two cards that end in the same sentence are one card.** `Chuyển máy` asked "when may
she agree to fetch a person" and "which number does she ring" on two cards, and both
ended in the same `Said` line, because they are two settings of one decision. Printing
the sentence twice said the page had nothing to add the second time. They are now one
card: the tiles, then the numbered list under a `Rule` band, then one line. The card
that stayed separate — "when does she hand over *without being asked*" — earned it by
saying something different, because there she is offering rather than agreeing.

> **Check:** does the page have more than one card with the same title shape
> (`Câu hỏi 1`, `Câu hỏi 2`)? Then it wants to be one card of entries — or, if the first
> line of each would be worth scanning, one card of rows. And read the `Said` lines
> down the page: if two are the same sentence, the two cards are one question.

---

## 4. An empty list still has to teach

An empty state is the first thing a new owner reads on most of these pages, so it is
onboarding, not an error message. It is always two parts:

- **What it is** — `Chưa có gói combo`, not `Không có dữ liệu`.
- **What it buys them, with an example, in the receptionist's own terms** —
  *"Gộp vài dịch vụ thành một giá — VD: cạo vôi và tẩy trắng 2 triệu. Khách hỏi 'có
  combo không', Linh có gói để đọc."*

The second half is the whole point. `Chưa có gói combo` alone hands the work back to the
reader: they now have to guess what a combo is, whether they want one, and what it
changes about the call. Naming the caller's question — *khách hỏi…* — answers all three
in one sentence.

Every list gets one, including the ones that are usually full. `Bảng giá` shipped
without an empty state because it always arrives seeded from the dental template; the
one owner who cleared it saw a blank card that looked broken.

**And when the *idea* is the hard part, seed the list instead of explaining it.**
`Từ hay nghe nhầm` is about a phonetic hint, which is the most abstract thing anywhere in
Lễ tân, and the best empty state in the world still leaves the owner guessing what one
looks like. It now opens with five worked rows — `Invisalign → in-vi-da-lai` — that are
the clinic's **own** rows: rename, respell, delete. An example nobody can touch is a
screenshot, and a read-only row in a form is the one thing a reader least expects.

That is also why the words the other pages already knew — the clinic's name, its services,
its doctors — are no longer pulled onto this page as rows that read but do not edit. It
made the page longer the more of the product was filled in, and every one of those rows
offered a delete that was missing and a name that snapped back.

> **Check:** empty each list on the page in your head. Does each one still say what the
> thing is and what it changes about a call?

---

## 5. Suggestions live in the card they write into

A suggestion is a ready-made line the owner adopts by pressing it. It belongs **inside
the card holding the box or list it writes into**, below a hairline labelled `GỢI Ý` —
never in a card of its own.

A separate suggestions card asks the reader to carry the link between two sections
themselves, and it puts the examples furthest away at the one moment they are worth
most: when the box above is still blank. `Chỉ dẫn riêng` and `Câu hỏi thường gặp` both
had this, and both now read as one thing.

Use `Suggestions` + `Suggestion` from `app/ui`. Whole sentences are rows; short values
are dashed pills (`styles.suggest` — the shape `Dịch vụ không làm` uses), never
`ChipButton`s, which mean *a value that is on or off* rather than *a value you can take*.

**Three at a time, and the rest behind `SuggestionMore`.** Seven dashed rows on
`Câu hỏi` were taller than the list they wrote into, so the card read as a page of
examples with a list attached; three say what a good one looks like, which is all the
examples were ever for. The reveal is a ghost pill, not a dashed row — dashed is content
(§1), and this is a control.

---

## 6. A list moves the same way everywhere

A row never appears under the cursor and never blinks out. It grows into its place over
200ms on `--ease-arc`, and the rows below slide down with it; deleting runs the same
200ms backwards. One idiom for every list — a combo, a doctor, a holiday, a price row,
an escalation number — via `useAppear` in `app/ui`.

```tsx
const rows = useAppear(draft.branch_list.map((b) => b.id))
// …
<div ref={rows.ref(b.id)} className={styles.entry}>
  <IconButton name="trash" onClick={() => rows.leave(b.id, () => set('branch_list', (l) => l.filter((x) => x.id !== b.id)))} />
```

Three things about it are decisions, not incidental:

- **It animates the row itself, not a wrapper.** A wrapper animating `0fr` → `1fr` is
  the usual way to reach a natural height without measuring it, and it is what the
  holiday list used to do — but the price list draws the rule between two rows with
  `.svc + .svc::before`, and a div between them puts a hairline under every open,
  unfilled and dragging row in three lists. Measuring costs one layout read and leaves
  the markup alone, so it is the one that generalises. **Any motion added to a list has
  to survive that constraint.**
- **Everything that makes the row tall collapses with it** — padding, borders, and the
  parent's `row-gap`. Height alone leaves an `.entry` sitting at 30px of padding at the
  shut end, and leaves the gap to close in one frame at the very end: the jump the
  animation existed to remove, moved to the last frame.
- **An exit defers the data change, so the removal must read the draft, not close over
  it.** `set` and `patch` take an updater for exactly this. Two deletes inside the same
  200ms both close over the same array otherwise, and the second one puts the first row
  back — which is a data-loss bug, not a visual one.

Anything waiting on an animation needs a timer floor as well as the event.
`finish` never fires while the document timeline is stopped — a hidden tab, a throttled
window — and then an entrance leaves the row clipped (eating the focus ring off the
pills inside) and an exit leaves the delete unapplied. Events are the fast path; the
timer is the floor.

> **Check:** add a row, then delete two rows a frame apart. The count must fall by two.

---

## 7. Show, do not explain

The owner is answering questions, not reading a manual. Prose is the most expensive way
to say anything on these screens, so it is the last thing to reach for.

- A drawn state beats a sentence: the open/closed dot on `Giờ mở cửa`, the terracotta
  dot on a partial-closure pill, a dashed edge on a row that is missing the thing that
  makes it useful.
- **Every card ends in the sentence the receptionist would actually say**, built from
  the current draft (`Said`, `Linh đọc:`). One rendered sentence answers "what does this
  field do" better than a paragraph of hint text, and it updates as they type.
- **When the field is empty, `Said` shows the line she falls back to** — not nothing.
  "Dạ, câu này em xin ghi nhận và nhờ nhân viên gọi lại anh chị ạ." is the entire
  argument for filling the field in, and it makes the argument in her voice instead of
  in a warning. The fallbacks live on the `Exchange` in `answers.ts` beside the answers,
  so the form and the receptionist say the same words; `BHYT` reads as four answers
  being written rather than as four fields being filled because of it.
- **A closed set of options that are each a *thing* is a grid of drawn tiles**, not a
  list of radios: a payment method, a kind of insurance. The drawing is read before the
  label is, and the grid answers in one glance instead of one line at a time
  (`TileGrid` / `Tile`, `single` for a one-of choice). It is the wrong reach when the
  set is open-ended — that is a `ChipInput` — or when the labels are sentences.
- **Let the owner hear it when hearing is the point.** `Từ hay nghe nhầm` is the page
  an owner understands least, because "phonetic hint" is an abstraction. A play button
  beside the spelling, reading the word back *inside a sentence*, is the whole
  explanation: type, listen, fix, listen. The same button does the same job for
  `Cách đọc tên` on `Địa điểm`.
- **One worked example, not one per row.** Thirty identical placeholders down a column
  teach nothing the first one did not and turn the empty half of a table into noise. Put
  the example on the first row still missing a value; the column heading does the rest.
- **A default state is said, not drawn.** A weekday a doctor keeps the clinic's own hours
  on reads "Theo giờ phòng khám" in quiet text; only the exceptions wear pills. A pill
  for the default would claim the owner had set something, and five identical pills is
  five things to check that nobody chose.
- **A page whose output is not speech still ends in what it produces.** `Gửi email`
  makes an email, so the card shows the email — addressed, with its subject, filled in
  with one worked call, and the parts that change from call to call tinted. That tint is
  the entire explanation of what a variable is; the row of «tên_khách» chips it replaced
  asked an owner to learn a token vocabulary in order to read their own mail. Same test
  as `Said`: show the thing that actually leaves the building, not the template that
  makes it.
- **A placeholder is a word, not syntax.** `Gửi email` stored `«tên_khách»` and *showed*
  `«tên_khách»`, in a plain textarea, over a legend and a row of `tên_khách` chips. Snake
  case, guillemets and a vocabulary to learn, on a screen for somebody who wanted a
  notification. The value the mailer fills in has not changed; only the reading has
  (`TokenArea` in `app/ui`, the same bargain `DateField` makes with ISO dates). A variable
  is now a blush pill reading `Tên khách` that one backspace removes whole, `@` opens the
  list of what this message knows at the caret, and the pills under the box do the same
  for anyone who never tries `@`. **Whenever a field holds machine syntax, ask what the
  owner would call the thing, and show that instead.**
- **And write it for them.** The same page used to hand a clinic owner three subject
  lines and three bodies to compose, with tokens inserted at the caret. That is a
  copywriting job given to somebody who wanted a notification. Fonnus owns the wording —
  the frontend owns all Vietnamese copy anyway — the owner picks who receives it, and
  `Sửa lời` is one press away for the few who want their own.
- **Delete the question whose every answer is already the default.** `Chuyển máy` asked
  what she does with an ordinary call at 21:00 and offered three tiles: log a call-back,
  take a message, try a transfer. All three were things that already happen — the row
  with `Ngoài giờ` on it *is* the transfer, a number that rings out falls to that row's
  own fallback, and taking a message is what is left when neither applies. A control like
  that costs a decision, teaches nothing, and its only real message is "this product has
  settings". The test: **write out what happens if the owner never touches it, for each
  option in turn.** If the answers do not differ in a way a caller would notice, cut the
  control and the field behind it.
- **One weight means one kind.** The numbered rungs down the transfer list used to fill
  only the first circle, on the reasoning that the eye should find it before it reads a
  digit. But a difference in weight reads as a difference in *kind*, and there is none —
  the second number is a number she rings, exactly like the first, just later. The digit
  already carries the order. Reach for emphasis when one item is genuinely a different
  sort of thing, not when it is merely first.
- Every screen ends in something you can hear — the try-out rail. Nothing on these pages
  is theoretical.
- A hint under a field earns its place only if it says something the field cannot show.
  If it restates the label, delete it.
- Do not repeat the page's lede in a card subtitle. If the card needs the same sentence
  the page already gave, the card does not need a sentence.

---

## 8. The same page at three widths

Every screen has to work on a desktop, on a tablet, and on a phone the owner is holding
while a patient waits. The layout may change; **the rules above may not**. The add
button is top right at 1440px and at 375px.

The frame is the same everywhere: back link and title → one-line lede → work column
beside the try-out rail. The rail is separated by the **gutter** — 380px column, 40px
gap, a hairline down the middle of it — not by a fill.

**It is one file.** `SectionFrame` / `Section.module.css` holds the frame and the hub
row; `KnowledgeSection`, `ProfileSection` and `SkillsSection` are three lines each,
differing only in which hub the back link points at. Hồ sơ wrote the geometry and Kiến
thức restated it — 180 byte-identical lines across two stylesheets, each carrying a
comment saying "change them together" — and the third tab is what finally moved it. A
tab that needs the frame does not restate it.

**A tab without a hub is a tab you cannot stand back from.** Kỹ năng had a 220px list of
skills down the left of its own pages instead, and that cost it all three of the things
above: no way back, no lede, and no try-out rail — on the three screens about what she is
*allowed to do*, which is the part an owner most wants to hear before trusting it.

Traps that have each cost a session:

- A two-column grid that collapses to `flex-direction: column` **must** restate
  `align-items: stretch`. `align-items: start` is a grid instruction; left on a flex
  column it sizes every child to its own max-content, which blew a 375px page 620px wide.
- `overflow-x: clip`, never `hidden` — `hidden` makes an ancestor the scroll container
  and silently kills `position: sticky`.
- `scrollbar-gutter: stable` on `html`, or the centred column shifts 7–8px between a
  page that fits the viewport and one that does not.
- Never add `container-type` to `.card`. It implies `contain: layout`, which makes the
  card a containing block for fixed positioning and would break every anchored pop-up
  inside it. Measure with `useElementWidth`, or query a container on an inner list
  (`.services`, `.holidays`), as those two already do.
- **An input inside a shell that draws its own ring needs `:focus-visible` spelled out,
  not `outline: none`.** The global `:focus-visible { outline: 2px solid; outline-offset:
  2px }` in `tokens/base.css` is specificity (0,1,0) — exactly the same as `.myInput`, and
  it is emitted last, so it wins the tie. The result is a square ring floating two pixels
  inside a rounded box that is already showing focus: a box inside a box. Write
  `.myInput:focus, .myInput:focus-visible { outline: none }` — two selectors deep — the
  way `Field.module.css` does. It has now been missed three times (`ChipInput boxed`,
  `TileAdd`'s input, the call overlay's), so grep before adding a fourth: any
  `outline: none` in a base rule with no `:focus-visible` companion in the same file is
  the bug.
- **A control that can stand in a card *or* nest inside a row's editor carries its own
  container.** The week (`Week.module.css`) queried `rows` while it lived only inside a
  doctor's open row; standing in a card on `Đặt lịch` there is no `rows` container above
  it, and the phone layout would simply never have fired. It declares `week` on its own
  list instead, and both callers get the same breakpoint.
- **The page module must not be imported by what the pages import.** `SectionHead` lived
  in `LeTanPage.tsx`, which imports every section, so a frame importing it closed the
  loop — and Vite reports that as `does not provide an export named 'ProfileSection'`, a
  message naming the wrong module entirely. The head moved into `SectionFrame`, beside
  the frame that uses it.
- The bottom edge is one sticky stack anchored by the save bar. Anything else wanting
  that edge goes inside `.saveStack`. Never a hard-coded offset, and never measure the
  bar — its height changes as its message wraps.

> **Check:** at 375px — does the page scroll sideways? Is any action off the card? Both
> are measurable; `document.documentElement.scrollWidth > innerWidth` answers the first.

---

## 9. The hub's rail measures; the sub-page's rail talks

A hub page is rows beside `ReadinessPanel`; a sub-page is a form beside the try-out call,
with the section's slice of the same panel (`SectionReadinessCard`) above it. Same 380px
column, same gutter, so the two kinds of page share one geometry.

- **One number, one hue.** The panel leads with a single percentage in the hole of a
  hollow ring. The ring is cut into the three tabs, each filled to its own progress, so
  the breakdown *is* the ring and the parts add up to the number. Every unfilled arc is
  `--meter-track`, a paler step of the same terracotta — never grey.
- **Levels come from the gates, not from the percentage.** *Nghe máy được* is every R1
  check, *Trả lời tốt* every R2 check, *Lành nghề* everything. A level is a promise about
  what she can do, so it cannot be reached by filling nice-to-haves. The gates still never
  appear on a field (§1).
- **Only the jobs for the next level, with their price.** "Còn 2 việc để lên …", best value
  per minute first, each with how long it takes and what it adds (`+4%`). Past halfway,
  count what is left, not what is done. One prominent job and a button, and the rest
  behind one closed row, `Xem 3 việc còn lại`. Two loose jobs under the button read as a
  second list that did not add up to the count above it.
- **A meter moves; it never jumps.** The ring's arcs, the number in its hole, the row
  rings and the sub-page card all rise to a new value over ~900ms on the arc ease. Each
  place remembers what *it* last showed, so an owner who saves on a sub-page and goes
  back sees the hub rise from where they left it, even though the save landed first.
  Reduced motion jumps; a timer floor lands the value when frames are not running.
- **The row and the panel are the same measurement.** A hub row's icon sits in the ring
  the panel is drawn with; an empty row says what filling it adds. Once the number exists
  in two places they must never disagree, which is why both read `computeReadiness`.
- **A gain is a fact, not a reward.** No confetti, no badges, no points that buy nothing.

> **Check:** does the orb appear anywhere that does not start a call? Does any meter
> track use grey? Do the row rings, the tab labels and the number agree?

---

## 10. A page that reports, not a page that asks

`Tổng quan` is the first screen in the app whose subject is not the record. Everything
in Lễ tân is a question being answered; this one is an answer being read. Four things
follow, and they are what every later reporting tab — `Cuộc gọi`, `Lịch hẹn` — should
copy.

- **The frame is the same; the rail is not.** A Lễ tân page is a work column beside a
  380px rail, because every screen there ends in something you can hear. There is
  nothing to try out on a page about calls that already happened, so the rail goes and
  the width is the page's. (A page of *records* is different: it keeps the rail, for the one
  record that is open — §12.) What the rail would have carried — how ready she is — is a
  **band across the top**: the number, the level being worked towards, and **as many of
  the next jobs as the band has room for**, each its own pill, the best one filled. What
  does not fit folds into `+N việc`, which opens the full list on Lễ tân. The count is
  measured, not set per breakpoint — a Vietnamese job title runs from 12 to 30
  characters, so "three on desktop" either clips or leaves a hole. (The first version
  showed one job beside a "Làm ngay" button for that same job, and left 350px of empty
  band beside a line that said *còn 4 việc*.)
- **Every figure carries a comparison, or it is not a figure.** Eighteen calls is good
  or bad only against last Sunday. `today` compares against the *same weekday* a week
  ago, never yesterday — a clinic's Sunday and its Tuesday are different businesses, and
  a Monday measured against Sunday reports a boom every week. When there is no history
  the delta is **absent**, not `+100%`.
- **A change is a fact, not a verdict.** No green, no red. A clinic closed for Tết took
  fewer calls and did nothing wrong; a product that paints that red is scolding an owner
  for a holiday.
- **Two zeroes are two screens.** A clinic that has never taken a call needs to be told
  what will appear here. A clinic opening the page at seven in the morning has simply not
  been rung yet, knows what the page is, and wants the week — telling *them* "khi số
  Fonnus đổ chuông…" reads as the product having forgotten them. The week behind the
  figure tells the two apart, which is why it is on every response whatever the range.
- **Four figures side by side must each say something different underneath.** The first
  pass gave all four the same footnote — *so với 7 ngày trước đó* — which is one fact
  printed four times. The comparison moved into the delta's tooltip, where it belongs,
  and each foot now carries something only that tile knows: the busiest day, the share
  of calls that became appointments, the hours that count as "ngoài giờ".
- **Two numbers about the same thing must never disagree, and they will.** The figure
  read `120` while its own sparkline summed to `132`, because the trend counted a whole
  day the figure had only reached the middle of. Any figure and any chart drawn from the
  same data need one source and one cut-off. Same rule as §9's ring and rows; it is just
  easier to break when the two are a number and a picture rather than two numbers.

**And the queue is what makes the page worth opening.** "Cần bạn xem" is not a checklist
— it is a list of gaps *real callers found*, each one press from the field that closes
it. A readiness meter says an owner is at 68%; *"5 khách hỏi giá cấy ghép implant — Linh
chưa có giá để đọc"* says what 68% costs them, in their own callers' words, and that is
the whole argument for filling anything in. §1 still decides the clothes: a row naming
something she does not know is content not yet filled in and wears the dashed edge; a row
that is only a fact about the day — two appointments waiting, four calls to return —
stays solid.

There is no "mọi thứ đều ổn" card. An empty queue is the normal state of a well-set-up
clinic, and a card saying so would sit there for ever reporting nothing.

**Every page has its own address.** Tổng quan is `#/app/tong-quan`, like `#/app/cuoc-goi`;
a bare `#/app` forwards there with `location.replace`, because it is still the door that
sign-in, the OAuth return URI and old bookmarks use — and a pushed entry would make Back
land on a hash that bounces straight forward again.

**A chart answers the pointer at once, and the same way everywhere.** No hover delay on a
plot — the tip is the reading, not an interruption — the whole slot is the target, the
mark lights and its neighbours step back, and one night-paper tip glides between marks.
The rules and the reason for each are in `docs/visual-language.md` § Charts; the one to
remember when building the next reporting page is that **a tip adds exactly one thing
the chart does not already print** — against the average, *cứ 10 cuộc có 3 cuộc* — or it
is the same number shown twice.

> **Check:** cover the charts. Does the page still say what to do next? Cover the queue.
> Does the page still say what happened? If either answer is no, one half is carrying the
> other.

---

## 11. Copy

All of it Vietnamese, all of it owned by the frontend. Code, comments and this document
are English.

- Say what the caller asks, not what the field stores. `khách gọi nhầm nơi, Linh đọc địa
  chỉ và số của chi nhánh đúng` — not `Danh sách chi nhánh`.
- Name the receptionist. `Linh báo…`, `Linh đọc…`. She is the reason any of this is
  being filled in, and the sentence stops being abstract the moment she is in it.
- A card subtitle is a phrase in sentence case, not a heading. It sits beside the title
  on a wide screen and wraps under it on a narrow one, so it has to read either way.
- No English leaks — including error text and anything a server sends back. The API
  returns machine codes; this app maps them.

---

## 12. A list of records, with one of them open

`Cuộc gọi` is the first screen whose subject is a list of records the product made — not
settings being answered (Lễ tân), not figures being read (Tổng quan), but calls to look
through one at a time. What it settled, for `Lịch hẹn` and anything else shaped like it:

- **The Lễ tân frame serves list–detail too.** The list is the work column; the open record
  is the 380px rail behind the gutter, sticky. On Lễ tân that rail is the try-out call; here
  it is the call that already happened — still a conversation, still in that column. §10's
  "the rail goes" is about a page of figures; a page of records keeps it. Under 1181px the
  record opens as a drawer from the right, under 640px as a sheet over the tab bar. The
  geometry now lives in three stylesheets (`Section.module.css`, `.withRail`,
  `Calls.module.css`); a fourth copy should move it into `app/ui`.
- **The open record lives in the address.** `#/app/cuoc-goi/{id}`, so a queue row elsewhere
  can point at one call and Back closes an overlay. On a desktop a new selection *replaces*
  the entry — twenty calls looked at should not be twenty presses of Back; on a tablet or a
  phone it *pushes*, because there Back is how you close.
- **Summary first, evidence second.** The person and the one action (`Gọi lại`) → a sentence
  of what happened → the facts it left → the recording → the turns. An owner reads the top
  and opens the transcript to check it; the order says which is which.
- **One fact row per thing the record left behind**, in the Tổng quan queue row's geometry,
  one icon each: the callback owed, the appointment, the transfer — and, dashed, what she did
  not know, one press from the field that fixes it. It carries the same values as the queue
  item of the same kind, so the queue and the call behind it cannot name different things.
- **A paged list filters, searches and counts on the server.** Counts over the rows that
  happened to load are wrong from page one. The chips' numbers ignore the filter — they are
  the choices; each day band's number respects it — it is what is under the band.
- **What she did sits between the turns**, as a code the frontend words — `Đã giữ lịch · T5
  17/09 · 15:00`. "Why did she transfer?" is answered where it happened, not in a log.
- **Pressing a line plays it; the line being played lights up and the rest wait at half
  strength.** Following the recording scrolls by `scrollTop`. A press that ends a text
  selection does not seek — an owner copying what a caller said is not asking to hear it —
  and the timestamp is the line's keyboard target.
- **The player is drawn in arcs and dots, not as a waveform.** One line on the meter track,
  the logo's ink dot as the playhead, a terracotta dot where an appointment was held, ink dots
  for anything else she did, a dashed ring where she first did not know something. A waveform
  of a phone call shows loudness, which nobody acts on.
- **A label another tab already says is imported, not restated.** An outcome reads `Linh chưa
  trả lời được` on both tabs because both call `outcomeLabel`. The canvas drew its own words
  for the same four outcomes, and they had already drifted by the second pass.
- **The dashed mark keys on the gap, not on the outcome.** `Linh đang đọc giờ mẫu cho chủ
  nhật` is an answered call and a gap; `đổi lịch` she could not do is unanswered and not a gap.
- **Content is not copy.** A transcript, a topic and a summary are about the call and come
  from the server; every word around them is still this app's. The contract says which fields
  are which (`api-contract.md` §8, Q24), so the line does not blur one field at a time.
- **Marking a callback done is optimistic.** The dot leaves the row and the chip count falls at
  once; a failure puts both back and says why beside the button — no toast.
- **A list folds on its own width** — a container query on the list, not a media query —
  because it is narrow beside the rail on a small laptop as well as on a phone. `display:
  contents` lets two cells be two grid columns when wide and one flex line when narrow, from
  one markup.

> **Check:** on a phone, open a call and press Back — does it close the sheet rather than leave
> the tab? Mark a callback done — do the dot and the chip count move together? Search `217` —
> does it find the number, and `nieng` the word `niềng`?

---

## Verifying a change

The pane's screenshots are unreliable on these pages, so do not let a picture be the
only evidence. Measure:

```js
// in the browser console — every card's action, at the current width
[...document.querySelectorAll('section')]
  .filter(s => s.querySelector(':scope > div > div > h3'))
  .map(card => {
    const head = card.querySelector(':scope > div')
    const acts = head.children[1]
    const cr = card.getBoundingClientRect()
    const r = acts && acts.getBoundingClientRect()
    return {
      title: head.querySelector('h3').textContent.trim(),
      action: acts && acts.textContent.trim(),
      gapFromCardRight: r && Math.round(cr.right - r.right), // want: the card's padding
      overflows: r && (r.right > cr.right + 1 || r.left < cr.left - 1), // want: false
    }
  })
```

**A row that has just appeared measures 0 in the pane.** `useAppear` animates height, and
the Browser pane stops the document timeline whenever it is not painting — so the
animation sits at `currentTime: 0` for ever and every new row reports `height: 0`. The
tell is `document.timeline.currentTime` not advancing across an `await`. Finish them
before measuring:

```js
;[...list.children].forEach((r) => r.getAnimations().forEach((a) => a.finish()))
```

Then the repo's own gate: `npm run typecheck` clean, and the demo login still works
(`0914378064` / `111002`).

---

## Lessons log

Newest first. One line per session that taught something; the rule itself goes above.

- **2026-09-13 (evening) — Cuộc gọi, the first list of records.** Three directions were drawn
  on a clickable canvas (list + rail, rows that open in place, a page per call); the owner
  picked the rail, and it was built the same day with a new `calls` API group. Its mock takes
  each day's volume from the insights mock, so the list and Tổng quan's figure count the same
  calls — bookings do not reconcile yet, and the contract says they must. Four things worth
  carrying: a paged list cannot filter or count on the client; outcome labels must be imported
  from the tab that said them first (the canvas's own words had already drifted by its second
  pass); the dashed mark keys on the gap rather than on an outcome; and a mock recording is a
  generated silent WAV, so seeking, speed and "ended" run through the real `<audio>` path
  instead of a pretend clock. Research that shaped it: owner-facing call logs (Jobber,
  Smith.ai, Rosie) lead with outcome and follow-up and keep the transcript as evidence, while
  developer consoles (Retell, Vapi, Synthflow) are the wrong model. Not yet checked on screen
  — typecheck and a production build are clean. → §12.

- **2026-09-13 (later) — Tổng quan, second pass on the owner's audit.** Four things the
  owner saw and three measured: the intent bars were 86px and 94px wide in the same card
  (the figure beside each bar set its width); the day chart's counts sat in a row up to
  48px above short bars; thirty days of 24px bars at a 2px gap were a barcode with a label
  on every bar; the readiness band had a 352px spacer. Also found: the sparkline's end dot
  rendered as a flattened lozenge, because a `<circle>` inside `preserveAspectRatio="none"`
  stretches with the box (dots are now positioned elements over the line); the 30-day tile
  foot read *Đông nhất · 28 cuộc* with no day, because the column label it borrowed was
  blank on a dense axis; and the three bottom cards' notes hung at three heights (now
  `margin-top: auto`). The chart kit moved to `app/ui/Charts.tsx` so the next reporting
  page takes the same hover model rather than a copy. One trap: the day's in-progress
  column must stay out of the average and out of "quietest day", or at nine in the morning
  it drags the line down and wins the label every day. → §10, docs/visual-language.md §
  Charts.

- **2026-09-13 — Tổng quan, the first tab that reports.** Three directions were drawn on
  a canvas (a hero-led day, a dense stat band, a drawn 24-hour timeline); the owner picked
  the stat band. Building it turned up more about *numbers* than about layout. The one
  finding worth carrying everywhere: **`--chart-1/2/3` are not a categorical palette** —
  run through a CVD validator, terracotta against lemongrass separates by ΔE 5.4 for a
  deutan reader (floor 8) and 13.9 for normal vision (floor 15), so two such bars are the
  same bar to a common form of colour blindness. Charts are now one hue in five steps
  (`--chart-step-1…5`), which is what the readiness meter had already been doing alone.
  Three bugs that are each a rule above: a figure and its own sparkline disagreed (120 vs
  132) because the trend counted a whole day the figure had only half of; four tiles
  printed the same footnote; and the empty state told a two-hundred-day-old clinic the
  first-day story at seven in the morning. Two smaller traps: a grid item spanning
  `1 / -1` pushes whatever follows it in the DOM onto a *third* row, so a phone layout
  that wants "name and value, then bar" has to place all three explicitly; and the queue
  rows are the **second** copy of `Section.module.css`'s `.rowLink` geometry — a third
  use should move that box into `app/ui`, the way the section frame moved once Kỹ năng
  needed it. Also noted and **not** fixed: `[data-theme="dark"]` exists in the tokens but
  nothing in the app sets it, and all 90 colour declarations under `src/app` use the raw
  `--ink` / `--ink-soft` rather than the `--text-body` / `--text-muted` aliases that
  flip — so dark mode is currently unreachable *and* would not work if it were. That is a
  repo-wide sweep, not this page's to make. → §10, and docs/visual-language.md § Charts.

- **2026-09-11 — the assistant goes, the rail measures.** The setup assistant cost more to
  build than it saved, and removing it left a 380px hole on every hub. Three layouts were
  tried on a canvas; the owner picked a readiness rail, then rejected two things about it:
  the orb in the ring's hole (the orb means "call", and it repeated the sub-page's try-out
  orb), and a follow-up that turned the panel into a lifecycle of states after 100%. What
  shipped is a hollow ring split by tab with the number in the hole, three levels tied to
  the R1/R2 gates, and the next jobs with time and gain. `readiness.ts` was rewritten from
  a flat list of gate checks into thirteen sections, because the ring, the rows and the
  sub-page card all had to show the same number. Second round, same day: the level line was drawn after the previous dot and cut
  through its check (dots now sit at `z-index: 1`), and the job list became one offer plus
  a closed `Xem N việc còn lại`. One trap: `.ring svg { position:
  absolute }` also caught the icon *inside* the ring and threw it into the corner — scope
  it to `.ring > svg`. → §1, §9.

- **2026-09-07 (sixth round — three notes on Chuyển máy)** — All three were the owner
  seeing the seams. `Ngoài giờ, cuộc gọi thường` was cut along with its catalogue field:
  every one of its three options was already what happens, so it only advertised that the
  product has settings. The rung circles were unified — filling only the first implied a
  difference in kind where there is only a difference in order. And the reported "box
  inside a box" on a focused tag field turned out to be the global `:focus-visible`
  winning a specificity tie against a plain `outline: none`; a repo-wide grep found two
  more of the same (`TileAdd`'s input and the landing page's call overlay), neither of
  which anyone had reported. Worth knowing for next time: the Browser pane's document
  never takes real OS focus, so `el.focus()` will not reproduce a `:focus-visible` bug —
  read the cascade out of `document.styleSheets` instead, or grep the source. → §7, §8.

- **2026-09-06 (fifth round — on the owner's feedback)** — Three pages, one theme: *stop
  showing the owner the machine's own shape*. `Gửi email` printed `«tên_khách»` in a
  textarea over a legend and a rack of snake_case chips; it now draws a variable as a
  blush pill reading `Tên khách`, with an `@` menu at the caret (`TokenArea` in `app/ui` —
  a `contentEditable` that serialises back to the same guillemet string the mailer reads,
  because the *stored* value was never the problem). `Chuyển máy` was four cards over one
  anonymous list of numbers, so a clinic could not send the day calls to the manager and
  the night calls to the on-call doctor; it is one row per person now, and the emergency
  card folded into a row whose trigger is `Khẩn cấp y tế`, with the catalogue's
  `after_hours_emergency_target` and `escalation_triggers_custom` derived off the list.
  `Từ hay nghe nhầm` stopped importing the words the other pages knew as rows nobody could
  rename, and seeds five worked examples instead. Two rules that were genuinely new: a
  setting that varies per record is a field on the row, not a card above the list; and a
  field holding machine syntax should show what the owner would call the thing. One trap:
  Chrome writes a trailing space in a `contentEditable` as `&nbsp;`, so a merge-tag field
  has to normalise U+00A0 on the way out or it silently stores a character that is not a
  space — and its Enter wraps the line in a `<div>`, so take Enter yourself and insert a
  line break. → §3, §4, §7.

- **2026-09-06 (fourth round — the dead kit)** — Rebuilding Kỹ năng retired the last
  users of four pieces of `app/ui`, and a repo-wide grep found nothing else reaching for
  any of them, so they went: `GateTag` + the `Gate` type + the `gate` prop threaded
  through `Card`, `FieldFrame`, `TextField`, `TextArea`, `SelectField`, `NumberField`,
  `MoneyRangeField`, `DateField`, `DateRangeField` and `TimeField`; `SpeechBubble`;
  `Notice`; and `EmptyState`'s `action` slot, which let an add button appear inside an
  empty state and then jump to the card head once a row existed (§2 — it must not move).
  About 300 lines. Two things worth knowing before deleting anything similar: every
  place in the app that draws speech owns its own bubble — the landing page's
  `CallDemoPlayer`, `SetupChat`, `AuthPanel` — so nothing depended on the kit's, and
  `PlayButton` sits *inside* `SpeechBubble` in the file while being used by five other
  screens, so the cut has to be made between them. The `ticks` pattern is now drawn by
  nothing; it stays in the catalogue, marked unused, the way `rings` already was. → §1.

- **2026-09-06 (third round — Kỹ năng)** — Rebuilt `Chuyển máy`, `Gửi email` and
  `Đặt lịch hẹn`, the last three pages still speaking the old vocabulary: `gate=` and
  `SpeechBubble` appeared in exactly these three files and nowhere else in the repo, and
  a `Notice tone="warm"` was doing callout duty inside a form — the one thing §1 forbids
  blush from being. The tab had no hub, so its pages had no way back, no lede and **no
  try-out rail**, on the three screens about what she is allowed to do. Giving it one
  forced three things into the open: the section frame, which had been living as two
  byte-identical copies (now `SectionFrame` / `Section.module.css`); the
  week-and-time-blocks control `Bác sĩ` wrote, which `Đặt lịch` needed for exactly the
  same question and which retired the last native `<input type="time">` in the app (now
  `../Week`); and the fact that a control moving between a card and a row's editor has to
  carry its own container query. Two rules that were genuinely new: two cards ending in
  the same `Said` are one card, and a page whose output is an email ends in the
  **email** — filled in with a worked call, its variable parts tinted — rather than in a
  template and a legend. And one decision that was about the product rather than the
  layout: an owner who wanted a notification should not be handed three email templates
  to write. → §3, §7, §8.

- **2026-09-06 (second round, on the owner's feedback)** — Three things the first pass
  got wrong. A doctor's hours were one free-text line, which cannot say "15:00–17:00 and
  20:00–22:00 on Monday, 09:00–10:00 on Tuesday": now a block list per weekday
  (`[ext] working_shifts`), where a ticked day with no block *inherits the clinic's
  hours* and says so — so a normal roster still costs no typing, and the catalogue's
  `working_hours_note` is written from the blocks the way `promo_description` is written
  from a promotion's services. `Từ hay nghe nhầm` went back from expanding rows to a
  table that edits in place, and the words derived from the other pages joined it instead
  of sitting in a read-only panel nobody could act on — with the rule that **nothing the
  owner cannot reach from somewhere in the product belongs on their screen**, which took
  the industry pack off the page entirely. And a select's list scrolled by fourteen
  pixels because `OPTION_HEIGHT` under-counted by half a pixel per row: the fix was to
  measure, not to restyle the scrollbar. → §3, §7.
- **2026-09-06** — Redesigned `BHYT`, `Bác sĩ`, `Câu hỏi` and `Từ khoá` together, which
  is why so much of what they needed turned out to be shared. `Dịch vụ` had privately
  owned three ideas the other pages wanted: the `Said` line, the row that reads closed
  and opens to edit, and the drawn tile grid. All three moved to `app/ui`
  (`Rows.tsx`/`Rows.module.css`, `Tiles.tsx`), and `Dịch vụ` and `Giờ mở cửa` now import
  what they wrote. Two things fell out of the move: a CSS-module `container-name` is
  **not** scoped (classes are), so the container and its queries must share a file or
  they silently detach; and a `RowValue` holding marks rather than text has to refuse to
  shrink, or the phone quietly clipped a doctor's Sunday. The rules that were genuinely
  new: a `Said` on an empty field shows the **fallback she actually says**, which argues
  for filling the field better than any warning; a closed set of options that are each a
  thing is a tile grid; and the page whose subject is *sound* (`Từ khoá`) is explained
  by a play button, not by a sentence about phonetics. → §3, §5, §7.

- **2026-09-05** — The holiday list was the only one whose new rows grew into place;
  every other list popped. Generalised it as `useAppear` and put it on all nine lists,
  with the matching exit. Two things fell out that were bugs rather than polish: an
  animation's `finish` never fires while the document timeline is stopped, so a delete
  waiting on it could be swallowed; and deferring a removal by 200ms meant two quick
  deletes each closed over the same array, so the second restored the first row —
  `set`/`patch` now take an updater. → §6.
- **2026-09-05** — Add buttons at the foot of a list (`Ngày nghỉ`, `Chi nhánh khác`,
  `Từ khoá`, `Bác sĩ`, `Câu hỏi`) contradicted `Gói combo`'s head button, and wore the
  dashed style that elsewhere means "content". Moved every one into its card head as a
  shared `AddButton`; made `Card`'s head a grid so the action stays pinned right in the
  narrow column beside the rail; split the dashed style into `EmptyState` /
  `Suggestion`; rebuilt `Bác sĩ` and `Câu hỏi` as entries in one card; merged both
  suggestion cards into the card they write into; gave `Bảng giá` the empty state it
  never had. → §1, §2, §3, §4, §5.
