# Fonnus ●

**Business Model Canvas**

*Version 1.0 • Internal and investor use • Not for customer distribution*

> **Distribution note.** This document contains cost structure and supplier information. It is safe for the Sonex team and for investors under NDA. Clinics and prospects receive the customer one-pager instead. Suppliers are named by function only, never by company.

**Positioning in one line:** Sonex answers the phone for Vietnamese clinics 24/7 in natural Vietnamese, so owners stop losing patients to voicemail.

**The competitor is the unanswered phone, not another AI product.**

---

## 1. Customer segments

### Beachhead (now)

- Owner-operated dental and aesthetic clinics, Vietnam
- 1 to 2 sites, single decision-maker who is also the practitioner and the person answering the phone at 9pm
- Missing enough calls that the loss is felt personally, not merely measured

### Expansion (sequenced, not current)

- **Adjacent healthcare:** ophthalmology, ENT, paediatrics, OB/GYN. Same buyer shape, same call taxonomy, minimal re-engineering.
- **Cross-vertical:** F&B, hotels. Named direction. Explicitly out of scope for MVP.

### Three roles inside one account

| Role | Who | What they want | Risk |
| --- | --- | --- | --- |
| **Buyer** | Clinic owner | Time back, recovered revenue | None. Motivated. |
| **User** | Front-desk staff | Not to be replaced | **Can quietly kill a pilot.** Position as relief from repetitive calls, never as headcount reduction. |
| **Beneficiary** | The caller | Someone to pick up | Never sees Sonex as a product, only as whether the clinic answered. |

---

## 2. Value propositions

### For the owner

- The phone stops being your problem after 5pm and on Sunday
- Calls that currently go unanswered become booked consultations
- No hiring, no training, no turnover, no coverage gaps
- Predictable monthly cost against an 8 to 15 million VND/month receptionist

### For front-desk staff

- Absorbs repetitive, interruptive calls (hours, directions, parking, insurance) so she can work with the patient in front of her
- Framed as relief, not replacement. This is commercial necessity, not diplomacy.

### For the caller

- Someone answers, at any hour, in natural Vietnamese, and gives a straight answer

### Claims we make and claims we do not

| We say | We do not say |
| --- | --- |
| Answers consistently, at any hour | "More accurate than a receptionist" (unprovable pre-launch) |
| Never improvises when it does not know | Any percentage of workload displaced (no validated call distribution data exists for Vietnamese SMB clinics) |
| Discloses that it is AI, and asks consent, on every call | Any guaranteed clinical or commercial outcome (breaches healthcare advertising rules) |

---

## 3. Channels

- **Direct founder outreach** to clinic owners. Primary channel at this stage.
- **Referral from pilot clinics.** The main engine in a market this relationship-driven.
- **Clinic-owner communities** on Zalo and Facebook, plus dental and aesthetic industry events.
- **Later:** resellers, clinic-software vendors, dental and aesthetic supply distributors.
- **Not paid advertising.** No channel currently justifies the spend.

---

## 4. Customer relationships

- **Concierge onboarding, not self-serve.** Self-serve is deferred. Pretending otherwise misrepresents the cost structure.
- **Operator-assisted go-live** for carrier call forwarding, which currently requires a human.
- **Zalo as the support channel**, because it is where the owner already is.
- **Monthly performance reporting as the retention mechanism.** This is where the owner re-sees the ROI and decides to keep paying. Churn is a reporting problem before it is a product problem.

---

## 5. Revenue streams

### 5.1 Subscription tiers

Consent gate, AI disclosure and escalation to a human are included in every tier including Trial, and are never gated.

| | **Trial**<br>Dùng thử | **Essential**<br>Cơ bản | **Standard**<br>Tiêu chuẩn | **Advanced**<br>Nâng cao |
| --- | --- | --- | --- | --- |
| **Price / month (VND)** | Free, 14 days | 2,500,000 | 4,900,000 | 9,900,000 |
| **Annual, per month (VND)**<br>*15% discount* | n/a | 2,125,000 | 4,165,000 | 8,415,000 |
| **Annual, billed once (VND)** | n/a | 25,500,000 | 49,980,000 | 100,980,000 |
| **USAGE** | | | | |
| Included minutes | 100 total | 1,000 | 2,500 | 6,000 |
| Effective VND / min | n/a | 2,500 | 1,960 | 1,650 |
| Overage VND / min | Hard stop | 3,000 | 2,500 | 2,200 |
| Simultaneous calls | 1 | 2 | 10 | 25 |
| Phone numbers included | 1 | 2 | 5 | 10 |
| Additional number (VND / month) | n/a | 500,000 | 500,000 | 500,000 |
| **ASSISTANT** | | | | |
| Voice library | 1 | 50+ | 50+ | 50+ |
| Custom voice | No | No | Yes | Yes |
| **SKILLS AND CONFIGURATION** | | | | |
| Agent prompt configuration | Yes | Yes | Yes | Yes |
| Call forwarding to staff | Yes | Yes | Yes | Yes |
| Glossary of key terms | Yes | Yes | Yes | Yes |
| Speech rate control | Yes | Yes | Yes | Yes |
| Sensitivity control | Yes | Yes | Yes | Yes |
| Response style control | Yes | Yes | Yes | Yes |
| Ambient call atmosphere | Yes | Yes | Yes | Yes |
| Scheduler (internal availability ledger) | No | Yes | Yes | Yes |
| Self-learning knowledge base | No | Yes | Yes | Yes |
| Internet search access | No | Yes | Yes | Yes |
| **PLATFORM** | | | | |
| Call recording | Yes | Yes | Yes | Yes |
| Dashboard | Yes | Yes | Yes | Yes |
| Calendar integration | No | Yes | Yes | Yes |
| **OPERATIONS AND SUPPORT** | | | | |
| Onboarding Academy (recorded) | Yes | Yes | Yes | Yes |
| Guided Setup (one-time, VND) | Not available | 2,000,000 | 2,000,000 | 2,000,000 |
| Dedicated account manager | No | No | No | Yes |

**Doanh nghiệp (Enterprise):** custom pricing for hospital groups and high-concurrency deployments.

**Monthly and annual differ on price only.** Every feature, limit and allowance is identical. Annual is billed once at a 15% discount.

**Guided Setup is optional at every paid tier.** Tenants can configure the agent themselves at no extra cost. Minimum context completeness remains a hard go-live gate either way (Section 10).

### 5.2 Billing unit

**We bill answered call time by the second, with a 30-second minimum per answered call.**

- A 45-second call consumes 45 seconds. A 20-second call consumes 30 seconds. A 4-minute call consumes 240 seconds.
- Unanswered and failed calls are not billed.

Two reasons:

- **Rounding up to whole minutes would triple the charge on our most common call type.** A "what time do you open" call lasts about twenty seconds. Minute-rounding bills it as sixty.
- **It removes the incentive to build a chatty agent.** Under minute-rounding, a longer agent turn earns more revenue. Under per-second billing, a short call is good for the clinic and neutral for us, so we can cap verbosity without fighting our own P&L.

The 30-second floor exists because every answered call costs us the same setup, greeting, consent and disclosure regardless of how short it is.

## 6. Key activities

- **Tenant context capture and onboarding.** The quality ceiling on the entire product. No amount of pipeline work compensates for an empty service catalogue.
- **Prompt authorship and evaluation.** Owned in-house, per vertical.
- **Voice pipeline operation.** Latency management, graceful degradation, uptime.
- **Telephony provisioning and go-live assistance.** Number assignment plus carrier call-forwarding setup, currently human-dependent.
- **Regulatory compliance maintenance.** Consent gating and AI disclosure, tracked against changing law.
- **Direct sales and clinic discovery.** Founder-led.

---

## 7. Key resources

- Vietnamese-language voice pipeline tuned for latency under real telephony conditions
- **The context field catalogue and onboarding methodology.** State this plainly: speech recognition, language models and speech synthesis are all rented. The defensible asset is the clinic-domain knowledge encoded in what we ask a tenant and how we make an agent behave safely. A competitor can rent the same suppliers in a week. They cannot rent this.
- Accumulated call data and transcripts across tenants
- Telephony carrier relationship and number inventory
- Three-person team, with concentrated single-point risk on both engineering and product

---

## 8. Key partners

Named by function only.

| Function | Strategic note |
| --- | --- |
| Speech recognition provider | Substitutable. Moderate switching cost. |
| Language model provider | Substitutable. Minor share of variable cost. |
| **Speech synthesis provider** | **Highest cost concentration. Highest switching sensitivity.** |
| **Telephony carrier and SIP trunk** | **Highest lock-in. Regulatory dependency.** |
| Payment gateway | Commodity. |
| External data-protection and AI counsel | Required for compliance sign-off. Not optional. |
| Future distribution: clinic software vendors, dental and aesthetic distributors, industry associations | Not active. |

**Concentration risk, stated openly:** speech synthesis dominates variable cost, so a single supplier's pricing decision moves gross margin materially. Mitigation is a qualified, maintained fallback provider, not a theoretical one.

---

## 9. Cost structure

The story is entirely in the variable line.

### Variable, per minute of call

| Line | Share of voice COGS |
| --- | --- |
| **Speech synthesis** | **Dominant. 60 to 87%.** |
| Speech recognition | Second largest |
| Language model | Minor. Low single digits. |
| Telephony termination and DID rental | Fixed per number plus per minute |

### Variable, per tenant

- Onboarding labour: context build, prompt tuning, go-live support
- Ongoing support

### Fixed

- Team salaries. Largest fixed cost by a wide margin.
- Infrastructure, database, logging, storage
- Legal and compliance
- Tooling

### Not in the model

- Paid advertising. Excluded until a channel justifies it.

---

## 10. Regulatory position

Not a feature. A licence to operate in this market.

- **Consent gate is a pipeline constraint, not a form field.** It must fire before the first caller utterance is recorded. In a post-procedure call the caller states health data within the first three seconds, which is sensitive personal data under Law 91/2025/QH15 regardless of what is subsequently stored.
- **AI disclosure to the caller is a legal requirement** under Law 134/2025/QH15, effective March 2026. It is not a UX choice and it is not tenant-configurable.
- **Compliance scripts are system-authored.** Tenants cannot write or edit them.
- **Minimum context completeness is a hard go-live gate** regardless of whether Guided Setup was purchased. Optional means optional help, not optional data. A live number on an unpopulated context is a product failure attributed to Sonex.
- None of the above substitutes for counsel sign-off before commercial launch.

---

*Sonex • Confidential • Internal and investor use only*
