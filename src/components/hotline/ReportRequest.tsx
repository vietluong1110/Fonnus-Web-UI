import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, RefObject } from 'react'
import { api, messageFor } from '../../api'
import { AddButton, IconButton } from '../../app/ui/Bits'
import { useAppear } from '../../app/ui/appear'
import { isValidEmail } from '../../auth/phone'
import { SAMPLE_REPORT } from '../../data/hotlineReport'
import { Button, Icon, Input } from '../../design-system'
import section from '../../styles/section.module.css'
import styles from './ReportRequest.module.css'

interface Location {
  id: string
  address: string
  phone: string
}

let seq = 0
// The time as well as the counter: a hot reload restarts the counter while React keeps the rows it made.
const newLocation = (): Location => ({ id: `hotline-location-${Date.now().toString(36)}-${++seq}`, address: '', phone: '' })

/** A chain larger than this is a sales conversation, not a form. */
const MAX_LOCATIONS = 20

const EMPTY = { name: '', email: '', clinic: '' }

/** Field ids double as the keys of their problems, so the first problem is the field to focus. */
const FIELD = { name: 'hotline-name', email: 'hotline-email', clinic: 'hotline-clinic' } as const
const addressId = (l: Location) => `${l.id}-address`
const phoneId = (l: Location) => `${l.id}-phone`

/**
 * A published line in national form, digits only. `auth/phone` knows mobiles,
 * because sign-up has to send an SMS; a clinic's hotline is as often a landline
 * (028 3822 1234, eleven digits) or a 1900 number.
 */
function hotlineDigits(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return d.startsWith('84') ? `0${d.slice(2)}` : d
}

function isHotline(raw: string): boolean {
  const d = hotlineDigits(raw)
  return /^0\d{9,10}$/.test(d) || /^1[89]00\d{4,6}$/.test(d)
}

/** Every problem with the draft, keyed by field id, in the order the fields appear. */
function problems(person: typeof EMPTY, locations: Location[]): Map<string, string> {
  const out = new Map<string, string>()
  if (!person.name.trim()) out.set(FIELD.name, 'Nhập tên của bạn.')
  if (!person.email.trim()) out.set(FIELD.email, 'Nhập email để nhận báo cáo.')
  else if (!isValidEmail(person.email)) out.set(FIELD.email, 'Email này chưa đúng, kiểm tra lại giúp mình nhé.')
  if (!person.clinic.trim()) out.set(FIELD.clinic, 'Nhập tên phòng khám.')
  locations.forEach((l) => {
    if (!l.address.trim()) out.set(addressId(l), 'Nhập địa chỉ của cơ sở này.')
    if (!l.phone.trim()) out.set(phoneId(l), 'Nhập số hotline khách hay gọi.')
    else if (!isHotline(l.phone)) out.set(phoneId(l), 'Số này chưa đúng. VD: 028 3822 1234')
  })
  return out
}

/**
 * The ask: who you are, and which numbers to ring.
 *
 * One card, one column of fields, and the locations as a list in the card's own
 * shape (CLAUDE.md, "the shape of a list"): the add button in the list's head,
 * each location an entry with its ordinal and its delete, rows that grow in and
 * collapse out on `useAppear`. The reference drew "add another location" as a
 * dashed row at the foot; dashed means content here, never a control.
 *
 * Errors appear when a field is left, not while it is typed, and disappear the
 * moment it is fixed. Submitting shows them all and focuses the first. The
 * form is a one-shot POST with nothing else waiting on it, so it calls
 * `api.leads` directly with local state (CLAUDE.md).
 */
export function ReportRequest({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const [person, setPerson] = useState(EMPTY)
  const [locations, setLocations] = useState<Location[]>(() => [newLocation()])
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [sent, setSent] = useState<{ email: string; count: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const focusNext = useRef<string | null>(null)
  const rows = useAppear(locations.map((l) => l.id))

  const issues = problems(person, locations)
  const shown = (id: string) => (tried || touched.has(id) ? issues.get(id) : undefined)
  const touch = (id: string) => () => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)))

  // A new location's address takes the caret once the row is in the DOM — after the commit, not on a frame
  // timer, which does not run in a tab that is not painting.
  useEffect(() => {
    if (!focusNext.current) return
    document.getElementById(focusNext.current)?.focus()
    focusNext.current = null
  }, [locations])

  // The thanks is shorter than the form; bring it back into view rather than leave the visitor in the footer.
  useEffect(() => {
    if (sent) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sent])

  const setPersonField = (key: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) => {
    setFailure(null)
    const value = e.target.value
    setPerson((p) => ({ ...p, [key]: value }))
  }

  const setLocationField = (id: string, key: 'address' | 'phone') => (e: ChangeEvent<HTMLInputElement>) => {
    setFailure(null)
    const value = e.target.value
    setLocations((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: value } : l)))
  }

  function addLocation() {
    const next = newLocation()
    // A row the visitor just asked for is not a mistake yet: stop flagging every
    // blank on the form, but keep the ones already on screen.
    if (tried) {
      setTouched((t) => new Set([...t, ...issues.keys()]))
      setTried(false)
    }
    focusNext.current = addressId(next)
    setLocations((ls) => [...ls, next])
  }

  // The removal waits for the row to collapse, so it reads the list then, not now (ui-ux-principles §6).
  function removeLocation(id: string) {
    rows.leave(id, () => setLocations((ls) => ls.filter((l) => l.id !== id)))
  }

  async function submit() {
    setFailure(null)
    const first = issues.keys().next().value
    if (first) {
      setTried(true)
      document.getElementById(first)?.focus()
      return
    }

    setBusy(true)
    try {
      await api.leads.requestHotlineReport({
        contact_name: person.name.trim(),
        email: person.email.trim(),
        clinic_name: person.clinic.trim(),
        locations: locations.map((l) => ({ address: l.address.trim(), phone: hotlineDigits(l.phone) })),
      })
      setSent({ email: person.email.trim(), count: locations.length })
    } catch (e) {
      setFailure(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setPerson(EMPTY)
    setLocations([newLocation()])
    setTouched(new Set())
    setTried(false)
    setFailure(null)
    setSent(null)
  }

  return (
    <section ref={sectionRef} id="nhan-bao-cao" className={`${section.section} ${section.milk}`}>
      <div className={`${section.inner} ${styles.layout}`}>
        <div data-reveal="0" className={styles.head}>
          <div className={section.eyebrow}>Miễn phí cho phòng khám</div>
          <h2 className={`${section.heading} ${styles.heading}`}>Để Fonnus gọi thử hotline của bạn</h2>
          <p className={`${section.lede} ${styles.lede}`}>
            Chúng tôi gọi tới từng cơ sở của bạn <b>5–7 lần</b> trong vài ngày, như một bệnh nhân thật, rồi chấm
            điểm từng cuộc gọi.
          </p>
        </div>

        <SampleReport />

        <div ref={cardRef} data-reveal="1" className={styles.formCard}>
          {sent ? (
            <Sent email={sent.email} count={sent.count} onAgain={reset} />
          ) : (
            <form
              className={styles.form}
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <div className={styles.pair}>
                <Input
                  id={FIELD.name}
                  label="Họ và tên"
                  placeholder="Nguyễn Minh Anh"
                  autoComplete="name"
                  value={person.name}
                  onChange={setPersonField('name')}
                  onBlur={touch(FIELD.name)}
                  error={shown(FIELD.name)}
                  aria-invalid={shown(FIELD.name) ? true : undefined}
                />
                <Input
                  id={FIELD.email}
                  label="Email công việc"
                  placeholder="ten@phongkham.vn"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={person.email}
                  onChange={setPersonField('email')}
                  onBlur={touch(FIELD.email)}
                  error={shown(FIELD.email)}
                  aria-invalid={shown(FIELD.email) ? true : undefined}
                />
              </div>

              <Input
                id={FIELD.clinic}
                label="Tên phòng khám hoặc chuỗi phòng khám"
                placeholder="Nha khoa Minh Anh"
                autoComplete="organization"
                value={person.clinic}
                onChange={setPersonField('clinic')}
                onBlur={touch(FIELD.clinic)}
                error={shown(FIELD.clinic)}
                aria-invalid={shown(FIELD.clinic) ? true : undefined}
              />

              <div className={styles.locations}>
                <div className={styles.locationsHead}>
                  <span className={styles.locationsTitle}>
                    Các cơ sở
                    <span className={styles.count}>{locations.length}</span>
                  </span>
                  {locations.length < MAX_LOCATIONS ? <AddButton label="Thêm cơ sở" onClick={addLocation} /> : null}
                </div>

                <div className={styles.entries}>
                  {locations.map((loc, i) => (
                    <div key={loc.id} ref={rows.ref(loc.id)} className={styles.entry}>
                      <div className={styles.entryHead}>
                        <span className={styles.entryLabel}>
                          <Icon name="location" size={15} />
                          Cơ sở {i + 1}
                        </span>
                        {locations.length > 1 ? (
                          <IconButton
                            name="trash"
                            label={`Xoá cơ sở ${i + 1}`}
                            danger
                            onClick={() => removeLocation(loc.id)}
                          />
                        ) : null}
                      </div>

                      <div className={styles.pairAddress}>
                        <Input
                          id={addressId(loc)}
                          label="Địa chỉ"
                          placeholder="12 Nguyễn Trãi, Quận 1, TP.HCM"
                          // Off, so the browser does not offer the visitor's home address for a clinic.
                          autoComplete="off"
                          value={loc.address}
                          onChange={setLocationField(loc.id, 'address')}
                          onBlur={touch(addressId(loc))}
                          error={shown(addressId(loc))}
                          aria-invalid={shown(addressId(loc)) ? true : undefined}
                        />
                        <Input
                          id={phoneId(loc)}
                          label="Số hotline"
                          placeholder="028 3822 1234"
                          type="tel"
                          inputMode="tel"
                          autoComplete="off"
                          numeric
                          value={loc.phone}
                          onChange={setLocationField(loc.id, 'phone')}
                          onBlur={touch(phoneId(loc))}
                          error={shown(phoneId(loc))}
                          aria-invalid={shown(phoneId(loc)) ? true : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.submit}>
                <Button type="submit" size="lg" fullWidth disabled={busy}>
                  {busy ? 'Đang gửi…' : 'Nhận báo cáo miễn phí'}
                </Button>
                {failure ? (
                  <p className={styles.failure} role="alert">
                    {failure}
                  </p>
                ) : null}
                <p className={styles.privacy}>
                  <Icon name="privacy" size={15} />
                  Thông tin chỉ dùng để gọi thử và gửi báo cáo cho bạn. Cuộc gọi thử không đặt lịch thật.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * What the visitor gets, drawn rather than described: the four things every
 * test call is scored on, each against the national average. Sample figures,
 * and the card says so.
 */
function SampleReport() {
  return (
    <figure data-reveal="1" className={styles.preview}>
      <div className={styles.report}>
        <div className={styles.reportHead}>
          <span className={styles.reportIcon} aria-hidden="true">
            <Icon name="report" size={20} />
          </span>
          <span className={styles.reportTitle}>
            <span className={styles.reportEyebrow}>Báo cáo mẫu</span>
            <span className={styles.reportName}>Nha khoa của bạn</span>
          </span>
          <span className={styles.reportScale}>Điểm / 100</span>
        </div>

        <ul className={styles.metrics}>
          {SAMPLE_REPORT.map((m, i) => (
            <li
              key={m.key}
              className={styles.metric}
              style={{ '--you': `${m.you}%`, '--avg': `${m.average}%`, '--i': i } as CSSProperties}
            >
              <span className={styles.metricLabel}>
                <Icon name={m.icon} size={16} />
                {m.label}
              </span>
              <span className={styles.metricValue}>
                {m.you}
                <span className={styles.srOnly}>, trung bình {m.average}</span>
              </span>
              <span className={styles.metricTrack} aria-hidden="true">
                <span className={styles.metricFill} />
                <span className={styles.metricAverage} />
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.reportKey} aria-hidden="true">
          <span className={styles.key}>
            <span className={styles.keyYou} />
            Phòng khám của bạn
          </span>
          <span className={styles.key}>
            <span className={styles.keyAverage} />
            Trung bình toàn quốc
          </span>
        </div>
      </div>

      <figcaption className={styles.caption}>
        Bạn nhận một báo cáo chi tiết, so với hàng chục nghìn cuộc gọi tới các phòng khám khắp Việt Nam — thấy rõ
        mình đang đứng ở đâu, và cải thiện chỗ nào thì được nhiều nhất.
      </figcaption>
    </figure>
  )
}

/** The thanks, with what happens next drawn as the three steps it is. */
function Sent({ email, count, onAgain }: { email: string; count: number; onAgain: () => void }) {
  return (
    <div className={styles.sent} role="status">
      <span className={styles.sentTick}>
        <Icon name="done" size={28} />
      </span>
      <h3 className={styles.sentTitle}>Đã nhận yêu cầu</h3>
      <p className={styles.sentBody}>
        Báo cáo sẽ gửi về <b>{email}</b>.
      </p>

      <ol className={styles.steps}>
        <li className={`${styles.step} ${styles.stepDone}`}>
          <span className={styles.stepIcon}>
            <Icon name="check" size={16} />
          </span>
          Đã gửi thông tin
        </li>
        <li className={styles.step}>
          <span className={styles.stepIcon}>
            <Icon name="answered" size={18} />
          </span>
          {count > 1 ? `Gọi thử ${count} cơ sở, mỗi nơi 5–7 lần, trong vài ngày` : 'Gọi thử 5–7 lần trong vài ngày'}
        </li>
        <li className={styles.step}>
          <span className={styles.stepIcon}>
            <Icon name="report" size={18} />
          </span>
          Nhận báo cáo qua email
        </li>
      </ol>

      <Button variant="ghost" onClick={onAgain}>
        Gửi cho phòng khám khác
      </Button>
    </div>
  )
}
