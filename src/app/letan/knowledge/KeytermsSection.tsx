import { useElementWidth } from '../../../hooks/useElementWidth'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { AddButton, Card, EmptyState, IconButton, PlayButton, SaveBar, TableHead, TableRow, TextField, useAppear } from '../../ui'
import { keytermSentence } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'
import styles from './Knowledge.module.css'

const KEYS = ['keyterms'] as const

/**
 * Under this much table the two halves of a term no longer fit side by side —
 * ~140px each is where "Nha khoa Việt Smile" stops being readable — so the
 * word takes its own line above its spelling.
 */
const TERM_STACKED = 380

const COLS = 'minmax(0, 1fr) minmax(0, 1fr) 34px 32px'
const COLS_STACKED = 'minmax(0, 1fr) 34px 32px'

/** `keyterms` rows the system derives (SD) — shown so the tenant does not retype them. */
export function derivedKeyterms(cfg: { business_name: string; service_catalog: { service_name: string; service_aliases: string[] }[]; practitioner_roster: { practitioner_name: string }[] }): string[] {
  const out = new Set<string>()
  if (cfg.business_name.trim()) out.add(cfg.business_name.trim())
  for (const s of cfg.service_catalog) {
    if (s.service_name.trim()) out.add(s.service_name.trim())
    for (const a of s.service_aliases) out.add(a)
  }
  for (const p of cfg.practitioner_roster) if (p.practitioner_name.trim()) out.add(p.practitioner_name.trim())
  return [...out]
}

/** One line of the table, whichever half of the list it came from. */
interface Row {
  /** Stable across the moment a derived word gains a stored row: the word itself. */
  key: string
  term: string
  phonetic: string
  /** The owner typed this word here, so it is theirs to rename and to delete. */
  own: boolean
  /** Only set once the row exists in `keyterms`. */
  id?: string
}

/**
 * `#/app/le-tan/kien-thuc/tu-khoa` — the words the machine mishears.
 *
 * This is the page an owner understands least, because "phonetic hint" is an
 * abstraction and nothing about it is visible. So the page teaches by ear:
 * every row has a play button that reads its word back **inside a sentence**
 * — the only place a word ever actually has to survive. Type, listen, fix the
 * spelling, listen again.
 *
 * **One table, and every word in it is one the clinic owns.** The words
 * already written on the other pages — the clinic's name, every service and
 * alias, every doctor — are rows here rather than a separate read-only
 * panel, because they are exactly the words that need a spelling and the
 * owner had no way to give them one. They carry their name as text rather
 * than as an input: renaming a service happens on Dịch vụ, and an input that
 * snapped back would be a lie. Nothing Fonnus maintains privately appears at
 * all; a word the owner cannot reach from anywhere in the product has no
 * business on their screen.
 *
 * Rows edit in place. They used to open one at a time like a price row, and
 * that is wrong here: a price row has eight fields worth hiding, a term has
 * two, and there are thirty of them to fill in one sitting. An extra press
 * per word is thirty presses.
 */
export function KeytermsSection() {
  const { config } = useConfig()
  const d = useDraft(KEYS, 'Từ hay nghe nhầm')
  const { draft, set } = d
  const agent = config.agent_name || 'Linh'
  const live = { ...config, ...draft }
  const [listRef, listWidth] = useElementWidth()
  const stacked = listWidth > 0 && listWidth < TERM_STACKED
  const columns = stacked ? COLS_STACKED : COLS

  /*
   * The table is the owner's own words followed by the words the other pages
   * already know. A derived word has no stored row until it is given a
   * spelling — writing one materialises it — so the list is built from the
   * derivation each render and the store is only consulted for what has been
   * filled in.
   */
  const own = draft.keyterms.filter((k) => k.source === 'tenant')
  const stored = new Map(draft.keyterms.filter((k) => k.source === 'derived').map((k) => [k.term, k]))
  const rows: Row[] = [
    ...own.map((k) => ({ key: k.id, term: k.term, phonetic: k.phonetic_hint, own: true, id: k.id })),
    ...derivedKeyterms(config).map((term) => ({ key: `d:${term}`, term, phonetic: stored.get(term)?.phonetic_hint ?? '', own: false, id: stored.get(term)?.id })),
  ]

  const appear = useAppear(own.map((k) => k.id))

  const setOwn = (id: string, patch: { term?: string; phonetic?: string }) =>
    set('keyterms', (list) => list.map((k) => (k.id === id ? { ...k, ...(patch.term !== undefined ? { term: patch.term } : {}), ...(patch.phonetic !== undefined ? { phonetic_hint: patch.phonetic } : {}) } : k)))

  /**
   * Writing a spelling for a derived word creates its row the first time.
   * Through the updater form, not by reading `draft` — two keystrokes inside
   * one commit would otherwise each see "no row yet" and add one.
   */
  const setDerived = (term: string, phonetic: string) =>
    set('keyterms', (list) => {
      const i = list.findIndex((k) => k.source === 'derived' && k.term === term)
      if (i === -1) return [...list, { id: newId('kt'), term, phonetic_hint: phonetic, source: 'derived' as const }]
      return list.map((k, j) => (j === i ? { ...k, phonetic_hint: phonetic } : k))
    })

  const add = () => set('keyterms', [...draft.keyterms, { id: newId('kt'), term: '', phonetic_hint: '', source: 'tenant' }])
  const remove = (id: string) => appear.leave(id, () => set('keyterms', (list) => list.filter((k) => k.id !== id)))

  const spelled = rows.filter((r) => r.term.trim() && r.phonetic.trim()).length
  /*
   * One worked example, on the first row still missing a spelling. Thirty
   * identical "VD: in-vi-za-lai" placeholders down a column teach nothing the
   * first one did not, and turn the empty half of the table into noise; the
   * column heading is what says what the field is for.
   */
  const exampleKey = rows.find((r) => !r.phonetic.trim())?.key

  return (
    <KnowledgeSection
      title="Từ hay nghe nhầm"
      lede={`Tên riêng, thương hiệu, tên đường — những từ máy nghe dễ nhầm. Viết cách khách thường đọc từng từ, rồi bấm nghe thử xem ${agent} đã đọc đúng chưa.`}
      rail={<TryPanel section="tu-khoa" config={live} />}
      bar={<SaveBar {...d.bar} sub={`${spelled}/${rows.length} từ có cách đọc · áp dụng cho cuộc gọi tiếp theo`} />}
    >
      <Card
        title="Từ của phòng khám"
        subtitle={rows.length ? `${spelled}/${rows.length} từ có cách đọc · tên phòng khám, dịch vụ và bác sĩ tự lấy từ các mục khác` : 'từ bạn thêm, và cách khách thường đọc nó'}
        actions={<AddButton label="Thêm từ" onClick={add} />}
      >
        {rows.length ? (
          <div ref={listRef}>
            <TableHead columns={columns}>
              {stacked ? null : <span>Từ</span>}
              <span>Khách hay đọc thành</span>
              <span />
              <span />
            </TableHead>
            {rows.map((r) => (
              <TableRow key={r.key} ref={r.own && r.id ? appear.ref(r.id) : undefined} columns={columns}>
                {r.own ? (
                  <TextField
                    compact
                    aria-label="Từ"
                    value={r.term}
                    onChange={(e) => setOwn(r.id!, { term: e.target.value })}
                    placeholder="VD: Nha khoa Kim"
                    style={stacked ? { gridColumn: '1 / -1' } : undefined}
                  />
                ) : (
                  // From another page, so it reads rather than edits: renaming a
                  // service happens on Dịch vụ, and an input that snapped back
                  // would be a lie about who owns the word.
                  <span className={styles.termFixed} style={stacked ? { gridColumn: '1 / -1' } : undefined} title="Tự lấy từ các mục khác — đổi ở mục đó thì từ này đổi theo">
                    {r.term}
                  </span>
                )}
                <TextField
                  compact
                  aria-label={`Khách hay đọc "${r.term}" thành`}
                  value={r.phonetic}
                  onChange={(e) => (r.own ? setOwn(r.id!, { phonetic: e.target.value }) : setDerived(r.term, e.target.value))}
                  placeholder={r.key === exampleKey ? 'VD: in-vi-za-lai' : ''}
                />
                <PlayButton text={keytermSentence(r.term, r.phonetic)} label={`Nghe ${agent} đọc "${r.term}"`} />
                {r.own && r.id ? <IconButton name="trash" label="Xoá từ" danger onClick={() => remove(r.id!)} /> : <span />}
              </TableRow>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có từ nào">
            Thêm những từ {agent} dễ nghe nhầm: tên đối thủ khách hay so sánh ("Nha khoa Kim"), tên thuốc, tên hẻm ("Hẻm Sư Vạn Hạnh"), thương hiệu ("Osstem"). Tên phòng khám, dịch vụ và bác sĩ sẽ tự hiện ở đây khi bạn điền các mục khác.
          </EmptyState>
        )}
      </Card>
    </KnowledgeSection>
  )
}
