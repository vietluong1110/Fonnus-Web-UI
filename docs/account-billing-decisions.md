# Account and billing decisions

The rules behind Cài đặt and Gói dịch vụ: how a plan change is charged, what minutes an owner gets,
what happens past the limit, how a minute is counted, and how an account is deleted.

The screens and the mock already follow these rules, but the backend will be the one enforcing
them. Several were reached by reversing an earlier answer, and a rule without its reason gets
"fixed" back. So each entry records **what was decided, why, what the product does now, what the
backend must do, and what should make us reopen it.**

- **Where the wire shapes live:** [`api-contract.md`](./api-contract.md) §11.
- **What is still undecided:** [`open-questions.md`](./open-questions.md) Q26.
- **The screen rules:** [`ui-ux-principles.md`](../design-reference/ui-ux-principles.md) §14.

**Changing a decision:** add a dated line to its *History*, update the status, then change the
contract, the mock (`src/api/account.mock.ts`) and the screens (`src/app/pages/settings/`) to match.
Never delete an entry — a reversed decision is the most useful one to keep.

**Status:**
- **Decided** — the owner said so, on the date given.
- **As drawn** — built and explained to the owner, but not separately confirmed.
- **Deferred** — the direction is agreed, the work is not now.
- **Out** — decided against.
- **Open** — nothing decided yet.

Plans used in the examples (from `src/data/pricing.ts`, VAT included):

| Plan | Monthly | Minutes / month | Overage |
|---|---|---|---|
| Cơ bản | 2.500.000đ | 1.000 | 3.000đ / min |
| Tiêu chuẩn | 4.900.000đ | 2.500 | 2.500đ / min |
| Nâng cao | 9.900.000đ | 6.000 | 2.200đ / min |

Example cycle: the clinic renews on the 22nd, so cycle 22/08–21/09 has 31 days.

---

## At a glance

| # | Rule | Status | Since |
|---|---|---|---|
| [D1](#d1--upgrade-price-prorated-difference-for-the-days-left) | Move up: pay the price difference for the days left | As drawn | 13 Sept 2026 |
| [D2](#d2--upgrade-minutes-the-full-new-allowance-at-once) | Move up: the full new allowance at once | **Decided** | 14 Sept 2026 |
| [D3](#d3--after-a-move-up-the-plan-is-held-to-the-end-of-the-next-full-cycle) | After a move up, a move down waits for the end of the next full cycle | **Decided** | 14 Sept 2026 |
| [D4](#d4--moves-down-and-switches-to-annual-wait-for-the-renewal-no-refund) | Moves down and switches to annual wait for the renewal; no refund | As drawn | 13 Sept 2026 |
| [D5](#d5--unused-minutes-do-not-roll-over) | Unused minutes do not roll over | **Decided** (reversed) | 14 Sept 2026 |
| [D6](#d6--past-the-limit-she-keeps-answering-overage-goes-on-the-next-invoice) | Past the limit: keep answering, bill overage on the next invoice | **Decided** | 14 Sept 2026 |
| [D7](#d7--an-owner-set-overage-cap) | Owner-set overage cap that forwards calls to the clinic | Deferred — after the pilot | 14 Sept 2026 |
| [D8](#d8--usage-alerts) | Usage alerts at 80% and 100% | Deferred — later | 14 Sept 2026 |
| [D9](#d9--how-a-minute-is-counted) | Count per second; skip spam, silent and very short calls | **Decided** (threshold open) | 14 Sept 2026 |
| [D10](#d10--top-up-minute-packs) | Top-up minute packs | Out | 14 Sept 2026 |
| [D11](#d11--minutes-on-an-annual-plan) | Annual plans: minutes per month, not a yearly pool | Open (drawn as monthly) | — |
| [D12](#d12--đổi-gói-is-always-secondary) | "Đổi gói" is always a secondary button | **Decided** | 14 Sept 2026 |
| [D13](#d13--a-14-day-deletion-window) | Deleting an account: a 14-day window | **Decided** | 14 Sept 2026 |
| [D14](#d14--cách-trả-stays-as-a-demo) | "Cách trả" stays on Cài đặt as a demo | **Decided** (reversed) | 14 Sept 2026 |
| [D15](#d15--outside-calendars-connect-from-lịch-hẹn) | Outside calendars connect from Lịch hẹn, not Cài đặt | **Decided** (direction open) | 14 Sept 2026 |

---

## Plan changes

### D1 · Upgrade price: prorated difference for the days left

**Status:** As drawn (13 Sept 2026). Explained to the owner on 14 Sept; they built D2 and D3 on it
without objecting, but never confirmed it on its own.

**Rule.** A monthly move to a higher plan starts today. The charge today is:

> (new monthly price − current monthly price) × days left in the cycle, today counted ÷ days in
> the cycle, rounded to the nearest 1.000đ

From the next renewal the owner pays the new plan's full price.

*Example:* Tiêu chuẩn → Nâng cao on 13/09. There are 9 days left of 31.
5.000.000 × 9 ÷ 31 = 1.451.613 → **1.452.000đ today**, then 9.900.000đ from 22/09.

**Why.** Paying only for the time used on each plan is the standard SaaS rule. Stripe prorates to
the second, and Paddle calls this the default. Owners in Vietnam read round thousands of đồng more
easily than exact figures [S1, S2].

**Now.**
- `PlanQuote.charge_today_vnd`, computed in `quoteOf()` in the mock.
- The drawer shows "Phần chênh cho N ngày còn lại của kỳ" and the total.

**Backend must.**
- Compute the quote on the server, and charge exactly the quoted figure.
- Count days in the clinic's time zone (Asia/Ho_Chi_Minh).

**Revisit if.**
- The e-invoice needs exact đồng.
- Annual billing gets mid-term upgrades — how to prorate a yearly price is still open (Q26).
- Plan changes become self-serve at the pilot, instead of a request an account manager handles.

### D2 · Upgrade minutes: the full new allowance at once

**Status:** Decided (owner, 14 Sept 2026).

**Rule.**
- A move up that applies now gives the **whole** new allowance for the current cycle. Minutes are
  not prorated.
- Minutes already used this cycle count against the new allowance.
- Overage for the cycle is settled against the plan in force when the cycle closes.

*Example:* on 13/09 a clinic has used 2.300 minutes on Tiêu chuẩn and moves to Nâng cao. It now
has 6.000 − 2.300 = 3.700 minutes left this cycle, not a share of the extra 3.500.

**Why.**
- An owner upgrades because they are running out. Getting less than the plan's name promises
  breaks trust at the exact moment they paid more.
- Chargebee grants a new plan's allowance "in full for the billing period". ElevenLabs and Netlify
  restart the cycle on upgrade, so the full allowance comes with it. We found nobody who prorates
  minutes [S3, S4, S5].
- None of the AI receptionist vendors we checked publishes its rule [S6], so this is ours to set.

**Now.**
- The mock changes `plan_id` straight away. The meter's limit becomes the new plan's `minutes`,
  and the overage in `next_charge_vnd` is recomputed against it.
- Before the button, the drawer's minutes line reads "+3.500 phút mỗi tháng — đủ 6.000 phút ngay kỳ này".

**Backend must.**
- Switch the allowance at the moment the change is paid.
- At cycle close, compute overage against the plan in force then, not the plan at cycle start.

**Revisit if.** D3's hold is ever removed — D2 is only safe because of it. Also revisit if minute
cost (Deepgram + Qwen + ElevenLabs) climbs close to the price gap between plans.

**History.** 14 Sept: the owner chose the full allowance over prorated minutes. Prorated would
have given 6.000 × 9/31 ≈ 1.740 minutes in the example.

### D3 · After a move up, the plan is held to the end of the next full cycle

**Status:** Decided (owner, 14 Sept 2026; my recommendation).

**Rule.**
- After a monthly move up, the new plan is **held** until the last day of the *next full cycle*.
- A move down can be booked at any time, but starts no earlier than the day after the hold ends.
- A second move up starts a new hold from that day.
- Switching the same plan between monthly and annual is not a move down, so the hold doesn't apply.

*Example:* moving up on 13/09 holds the plan to **21/10**, the end of cycle 22/09–21/10. A move
down booked on 14/09 starts on **22/10**, and the renewal on 22/09 still bills Nâng cao.

**Why — the hole it closes.** Without the hold, D1 and D2 together make overage close to free:

1. A clinic on Tiêu chuẩn is 1.000 minutes over. That is 2.500.000đ of overage.
2. On 21/09, the last day of the cycle, it moves up to Nâng cao for 5.000.000 × 1/31 ≈ **161.000đ**.
   The overage disappears, because the 6.000-minute allowance now covers it (D2).
3. It books a move back down for 22/09 and pays Tiêu chuẩn again.

With the hold, step 3 can't start before 22/10. The trick now costs a full month of Nâng cao
(9.900.000đ), which is more than the overage it avoided. An honest clinic that upgraded because it
was busy is unlikely to notice the rule.

**Evidence** [S6]:
- Rosie keeps a higher plan for at least two more billing periods after an upgrade.
- Ruby allows a downgrade only after three periods on a plan.
- ElevenLabs and Netlify restart the cycle on upgrade, so the full price is paid from that day.
- Stripe's "flexible" billing mode only credits what was actually paid [S1].

We chose the hold over restarting the cycle for two reasons: the renewal date stays fixed, and the
first clinics are invoiced by hand.

**Now.**
- `Subscription.held_until`, and `Subscription.scheduled.starts_on` (a held move down starts later
  than `renews_on`).
- `PlanQuote.held_until` for a move up. `PlanQuote.effective_on` for a held move down.
- The drawer shows it before the button, in `PlansPage.tsx`:
  - move up: "Giữ gói Nâng cao ít nhất đến hết 21/10 · Muốn chuyển xuống thì sớm nhất từ 22/10";
  - move down during a hold: "Vừa nâng gói nên gói Nâng cao được giữ đến hết 21/10".
- The done view and the booked plan card show the real start date.

**Backend must.**
- Store `held_until` when a move up is paid, and refuse to start a move down before it ends.
- Bill `renews_on` at the held plan.
- Put the rule in the terms, in the same words as the drawer.

**Open.**
- Does a hold survive cancelling the subscription or deleting the account? D13 already says no refund.
- Can support lift a hold as a goodwill gesture?

**Revisit if.**
- Owners say they feel locked in.
- Seasonal clinics (Tết, school holidays) upgrade for one busy month and resent paying for a second.

  **Softer alternative, if needed:** allow a move down at the very next renewal, but settle that
  cycle's overage against the *old* plan's minutes. The owner only keeps the full allowance if they
  stay on the new plan.

### D4 · Moves down and switches to annual wait for the renewal; no refund

**Status:** As drawn (13 Sept 2026).

**Rule.**
- These wait for the renewal: a move to a lower plan, any switch between monthly and annual, and any
  move up while paying yearly.
- The current plan runs until then, and nothing is refunded.
- A booked change can be cancelled until it starts.

**Why.**
- Near-universal practice: upgrades apply now, downgrades at the end of the term, and refunds
  (when there are any) come as credit, not cash [S4, S5, S7].
- Viettel drops remaining data on a package change with no refund [S8], so Vietnamese owners won't
  find this unusual.

**Now.**
- `PlanQuote.applies = 'renewal'`.
- The drawer reads "Đến lúc đó vẫn là gói …".
- Cancelling uses "Huỷ hẹn đổi gói" (`DELETE /subscription/scheduled`).

**Backend must.** Apply the scheduled change at `scheduled.starts_on`. D3 can push it past `renews_on`.

**Open (Q26).** Moving up while on an annual plan: now, and prorated over the year? Or at renewal?

**Revisit if.** Numbers on a lower plan: a move down to a plan with fewer numbers than the clinic
holds is currently only warned about. Decide what happens to the extra numbers.

---

## Minutes

### D5 · Unused minutes do not roll over

**Status:** Decided (owner, 14 Sept 2026) — **this reverses a "yes" from earlier the same day.**

**Rule.**
- Each cycle's allowance is the plan's `minutes`, reset at every renewal.
- Unused minutes are gone.
- Overage counts every minute past the plan's `minutes`.
- Nothing carries through a plan change, so a move down also carries nothing.

**Why.**
- **Expiry is the norm among direct competitors** [S6]: Ruby, AnswerConnect, Weave's dental AI
  receptionist, My AI Front Desk and Smith.ai monthly plans.
- **The same holds for large usage-based products** [S4, S9]: HubSpot, RingCentral, Zendesk and Freshworks.
- **Where rollover exists, it is always bounded and lost on downgrade.**
  - ElevenLabs keeps unused credits for 2 months, capped at 3× the monthly quota.
  - Netlify keeps them for one cycle and wipes them on any plan change [S5].
- **Unused allowance is not what drives churn.** In telecom panel data, customers who overpaid for a
  flat allowance did not churn more. Customers billed more than a flat plan would have cost churned
  several times faster [R1]. Trust depends on the bill, not on leftover minutes.
- **Vietnamese owners already expect expiry.** Viettel and VinaPhone packages don't carry data over;
  MobiFone does only on a few packages [S8].
- **Rollover costs overage revenue straight away.** The one theory paper on it treats rollover as a
  weapon for a small challenger, not a trust feature [R2].

**Now.**
- `UsageCycle` has no `carried_minutes`, and the meter's limit is the plan's minutes.
- Under the bar, "Làm mới 22/09" says when the minutes reset. There is no carry line.
- The "same on every plan" line no longer mentions carry-over.

**Backend must.** Reset the allowance at `renews_on`, and never store a carried balance.

**Revisit if.**
- Owners complain about "lost minutes", or a competitor in Vietnam makes rollover a selling point.
- If it comes back, decide all three from the start:
  - **how long carried minutes last** — one cycle is enough; longer windows cut how much is used [R3];
  - **a cap** — for example, one month's allowance;
  - **what a move down does to them** — lost, as the owner already said on 14 Sept.

**History.**
- 13 Sept: not in the design.
- 14 Sept (morning): owner said yes; built as `carried_minutes` with "Gồm N phút từ kỳ trước".
- 14 Sept (later): owner said no, and that carried minutes would not survive a downgrade. The
  research above backed that call, and the code was removed.

### D6 · Past the limit, she keeps answering; overage goes on the next invoice

**Status:** Decided (owner, 14 Sept 2026 — "generally, I prefer keep answering and bill overage on the next invoice").

**Rule.**
- When the minutes run out, the receptionist keeps answering.
- Each minute over is charged at the plan's `overage_vnd_per_minute`, on the next renewal's charge.
- No hard stop. No automatic move to a higher plan.

**Why.**
- For a clinic, a missed call is a lost patient.
- Hard stops exist only on prepaid developer platforms: Retell and Vapi stop calls at zero balance.
- The least owner-friendly rule we found is Rosie's automatic upgrade with a lock-in [S6].
- Pay-per-minute overage on the next invoice is the norm among receptionist services [S6].

**Now.**
- `Subscription.next_charge_vnd` includes this cycle's overage.
- When the month will run out, or has, the meter says so: "Hết phút Linh vẫn nghe máy bình
  thường — mỗi phút vượt tính 2.500đ". The overage and its cost in đồng are shown on the bar.

**Backend must.**
- Never block calls for being over the allowance.
- Invoice the overage with the renewal, as its own line.

**Revisit if.**
- An overage bill leads to a dispute or a cancellation. Build D8 before anything else.
- Per-minute cost rises above a plan's overage rate.

### D7 · An owner-set overage cap

**Status:** Deferred — after the pilot (owner, 14 Sept 2026).

**Idea.**
- The owner sets an optional monthly limit on overage spend.
- Past it, calls **forward to the clinic's own number** instead of being dropped.
- This is the model behind EU roaming, where there's a default cap and a warning at 80% [R4], and
  close to Zendesk's option that hands requests to live agents [S9].
- No receptionist vendor publishes a cap. Synthflow says its thresholds "are triggers, not spending
  caps" [S6].

**Revisit when.** After the pilot. Sooner if an overage bill surprises an owner.
**Needs:** a forwarding number (Chuyển máy already stores staff numbers), and a way to reset or raise the cap mid-cycle.

### D8 · Usage alerts

**Status:** Deferred — the owner does not want the scope now (14 Sept 2026).

**Idea.**
- Tell the owner at 80% and 100% of the allowance.
- Ruby alerts at 85% and 100%, and AnswerConnect at 80% and 100%. The AI-native receptionists
  publish nothing, and Rosie leaves monitoring to the owner [S6]. HubSpot alerts at 75/85/90% [S9].
- US regulators made carriers send exactly these alerts after one in six users had a bill shock [R5].
- Alerts give owners information they genuinely lack: people misjudge their own usage [R6].
- Keep them neutral. An alert that pushes a different plan can raise churn (see D12).

**Open.** The channel: email, SMS, or Zalo (ZNS needs an integration).

**Revisit when.** Billing is automated, or at the first overage complaint.

### D9 · How a minute is counted

**Status:** Decided (owner, 14 Sept 2026). The threshold and some details are still open.

**Rule.**
- Count **per second**, summed over the cycle — never rounded up per call.
- These calls **don't count**:
  - spam and robocalls;
  - calls where the caller never speaks;
  - calls shorter than a threshold — **10 s or 15 s, not yet chosen**.

**Why.** How minutes are counted is the biggest source of billing anger in this market [S6]:
- Ruby faced a class action for rounding a 2:01 call up to 2:30, and reportedly settled for up to $12M.
- AnswerConnect has BBB complaints about bills far above actual use.
- Newer products do better:
  - Retell bills per second.
  - Upfirst doesn't count spam or calls under 15 s.
  - Goodcall doesn't count repeat callers or callers who never speak.
  - Smith.ai doesn't charge spam and lets owners remove up to 10% of calls from each bill.

**Now.**
- The mock generates minutes and doesn't model calls, so this rule lives in the contract only.
- `UsageCycle.minutes_used` documents it; `api-contract.md` §11 has "How a minute is counted".

**Backend must.**
- Store billable seconds and the reason a call was excluded, on each call.
- Build `by_day` and `minutes_used` from the same rule, so the meter, Tổng quan and Cuộc gọi agree.

**Open.**
- 10 s or 15 s. The recommendation is 10 s.
- Who classifies spam and silence, and whether an owner can dispute a call.
- Whether talk time after a transfer to staff counts. Ruby doesn't count it.
- How the cycle's seconds become minutes — suggested: round the cycle total, never per call.

**Revisit if.** Owners dispute counted calls, or the spam classifier flags real patients.

### D10 · Top-up minute packs

**Status:** Out (owner, 14 Sept 2026).

**What was proposed.**
- Packs of minutes bought in advance, cheaper than overage.
- They would last 12 months and be used after the plan's minutes.
- That's how OpenAI, Anthropic, ElevenLabs, Descript and RingCentral handle bought credits [S4, S9],
  and it was the trust-friendly answer to "I want to keep my minutes" once D5 said no rollover.

**Why out.** Scope. D6 already covers busy months without a new product.

**Revisit if.** Owners ask to prepay or keep minutes, or automated billing arrives. Price packs
below overage, give them a long expiry, and never let bought minutes expire silently: Anthropic's
and OpenAI's one-year credit expiry drew public complaints [S10].

### D11 · Minutes on an annual plan

**Status:** Open — the screens assume a monthly allotment.

**Question.** Does a clinic paying yearly get `minutes` each month, or 12 × `minutes` as one pool?

**Evidence.**
- A monthly allotment is the norm for HubSpot, Intercom's example and Zendesk's new plans [S9].
- Yearly pools are mostly negotiated contracts (Salesforce, Zendesk legacy) or an outlier (Upfirst).
- A monthly allotment also limits how much the owner can lose to expiry at once [R3].

**Recommendation.** A monthly allotment.

**Revisit when.** The first clinic pays yearly.

---

## The page

### D12 · "Đổi gói" is always secondary

**Status:** Decided (owner, 14 Sept 2026).

**Rule.**
- The "Đổi gói" button in the plan panel is always a secondary button.
- Previously it turned primary when another plan would cost less at this month's projected minutes.

**Why.** In a telecom field experiment, recommending a cheaper plan raised churn from 6% to 10%.
The prompt made customers compare prices and look elsewhere [R7]. Each plan card on Gói dịch vụ
still shows its estimate ("Với mức dùng của bạn ≈ …") and the "Hợp mức dùng" tag, as information.

**Now.** `PlanPanel.tsx`.

**Not changed.** On Gói dịch vụ itself, the "Nâng lên …" button on the plan that fits this month's
minutes is still primary. That page is where the owner went to choose. Revisit that together with
this decision if needed.

**Revisit if.** Clinics stay on plans that cost them heavy overage month after month and never find
the page. Consider a neutral note under the meter before making a button louder.

---

## Data

### D13 · A 14-day deletion window

**Status:** Decided (owner, 14 Sept 2026). The window length was decided; what happens inside it
is as drawn.

**Rule.**
1. **The owner confirms deletion** by typing the clinic's name. The account is **deactivated at
   once**: the receptionist stops answering.
2. **For the next 14 days** the data is kept. The owner can still sign in and press "Huỷ xoá", and
   everything returns as it was. "Tải dữ liệu về trước" is offered before confirming.
3. **On day 14** calls, recordings, appointments and settings are erased for good. The numbers go
   back to the pool. The rest of the cycle is not refunded.

**Why.**
- The window catches mistakes: a wrong tap, someone else holding the owner's phone, regret the next day.
- Notion, GitHub and Atlassian use similar grace periods.
- Decree 356/2025/ND-CP requires deletion within 20 days of a request (30 when a processor is
  involved). This comes from secondary summaries, so **check it against the decree text**. 14 days
  leaves margin.

**Now.**
- `AccountOverview.deletion_grace_days` (server-owned, so it can change without a release) and
  `deletion.scheduled_for`.
- The confirmation lists what goes, with icons, before the button.
- `GRACE_DAYS` in the mock.

**Backend must.**
- Deactivate at once, but keep sign-in working so the owner can cancel.
- Erase on schedule, including recordings in storage.
- Log the request and the erasure for the decree.

**Open.**
- Are the clinic's numbers held until day 14, so cancelling restores them? The recommendation is yes.
- Is the export still downloadable during the window?
- What do callers hear while the account is deactivated?
- How long do backups keep the data?

**Revisit if.** A legal review changes the deadline, or a processor makes it 30 days.

---

## Earlier decisions from the same review

### D14 · "Cách trả" stays as a demo

**Status:** Decided (owner, 14 Sept 2026) — reversed once.

**Rule.**
- The payment-method tiles (VietQR, card, MoMo) stay on Cài đặt, as a demo.
- Automated billing is out of MVP; the first clinics are invoiced by hand.

**Now.** `AccountOverview.pay_method` and `PATCH /account/billing`, marked "demo" in the contract.

**History.** 14 Sept: the owner said remove it, then "keep it for now as demo". **Ask before removing it again.**

**Revisit when.** Billing is automated, or the pilot's invoicing is settled (Q26).

### D15 · Outside calendars connect from Lịch hẹn

**Status:** Decided (owner, 14 Sept 2026). The sync direction is as drawn.

**Rule.**
- There's no calendar switch in Cài đặt.
- Lịch hẹn has a "Kết nối lịch" button for Google Lịch and Microsoft Outlook.
- As drawn, sync is one-way: bookings are copied out to the owner's calendar and nothing is read back.

**Why.** "Can I see these on my own calendar?" is asked while looking at the calendar, and it has
nothing to do with signing in with Google.

**Now.** `CalendarConnect.tsx`, and the calendar methods in `api-contract.md` §9.

**Open (Q26).**
- Should busy time in the owner's calendar block the receptionist's slots?
- Which OAuth scopes are needed, and who holds the Google and Microsoft apps?

---

## Sources

Checked on 14 Sept 2026. **Vendor terms change — re-check before building billing.**

**Vendors and billing platforms**

- **S1** Stripe — prorations: https://docs.stripe.com/billing/subscriptions/prorations ·
  changing prices: https://docs.stripe.com/billing/subscriptions/change-price
- **S2** Paddle — proration: https://www.paddle.com/resources/proration
- **S3** Chargebee — mid-term changes with usage-based billing:
  https://www.chargebee.com/docs/billing/2.0/usage-based-billing/mid-term-subscription-changes-ubb
- **S4** ElevenLabs:
  - rollover: https://elevenlabs.io/docs/help-center/account/general/how-does-credit-rollover-work
  - upgrade and downgrade: https://elevenlabs.io/docs/help-center/account/general/what-happens-to-my-credits-when-i-upgrade-or-downgrade-my-subscription
- **S5** Netlify — https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/
- **S6** AI receptionist and answering services:
  - Rosie terms: https://heyrosie.com/legal/terms
  - Ruby: https://rubyhelpcenter.helpjuice.com/en_US/billing/ruby-billing-basics
  - AnswerConnect: https://www.answerconnect.com/help-center/billing/do-my-unused-minutes-roll-over/ ·
    https://www.answerconnect.com/help-center/billing/what-happens-if-i-go-over-my-plan-minutes/
  - Weave: https://www.getweave.com/legal/ai-receptionist-terms/
  - My AI Front Desk: https://www.myaifrontdesk.com/tutorials/how-does-billing-pricing-work-for-my-ai-front-desk
  - Smith.ai: https://smith.ai/pricing/ai-receptionist
  - Goodcall: https://www.goodcall.com/pricing
  - Upfirst: https://help.upfirst.ai/en/articles/11996964-upfirst-pricing-faqs
  - Retell: https://docs.retellai.com/accounts/billing
  - Synthflow: https://docs.synthflow.ai/usage
  - Ruby lawsuit: https://www.classaction.org/news/ruby-receptionists-sued-over-allegedly-deceptive-billing-practices
- **S7** Intercom — https://www.intercom.com/help/en/articles/8344189-how-to-manage-your-subscription
- **S8** Vietnamese carriers — reseller pages, not official:
  - https://4gviettelvn.com/uu-dai-viettel-co-duoc-bao-luu-cong-don-khong.html
  - https://vieteltelecom.vn/cap-nhat-danh-sach-goi-4g-mobifone-bao-luu-data-sang-thang-sau/
- **S9** Large usage-based products:
  - HubSpot credits: https://knowledge.hubspot.com/account-management/understand-hubspot-credits-and-billing
  - Zendesk: https://support.zendesk.com/hc/en-us/articles/10479587390106-Managing-resolution-allowances
  - RingCentral: https://www.ringcentral.com/legal/ringex-service-attachment.html
  - Freshdesk: https://support.freshdesk.com/support/solutions/articles/50000002842-freddy-sessions-billing-faqs
  - Descript: https://help.descript.com/hc/en-us/articles/40053604160909
- **S10** Complaints about expiring credits:
  - https://news.ycombinator.com/item?id=44793446
  - https://community.openai.com/t/credit-expired-without-notification/1256598

**Research**

- **R1** Lambrecht & Skiera (2006), *Paying Too Much and Being Happy About It*, JMR —
  https://journals.sagepub.com/doi/10.1509/jmkr.43.2.212
- **R2** Rollover as a competitive strategy (arXiv, game theory, not empirical) —
  https://arxiv.org/abs/1904.07970
- **R3** Shu & Gneezy (2010), longer windows to use something lower how much is used, JMR —
  https://journals.sagepub.com/doi/abs/10.1509/jmkr.47.5.933
- **R4** EU data-roaming cap and 80% warning (2010) —
  https://ec.europa.eu/commission/presscorner/detail/en/ip_10_215
- **R5** FCC — bill shock and usage alerts: https://www.fcc.gov/general/bill-shock-wireless-usage-alerts-consumers
- **R6** Grubb & Osborne (2015), *Cellular Service Demand*, AER —
  https://www.aeaweb.org/articles?id=10.1257%2Faer.20120283
- **R7** Ascarza, Iyengar & Schleicher (2016), *The Perils of Proactive Churn Prevention*, JMR —
  https://journals.sagepub.com/doi/abs/10.1509/jmr.13.0483
