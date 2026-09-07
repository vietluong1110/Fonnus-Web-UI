import { useElementWidth } from '../../../hooks/useElementWidth'
import { newId } from '../model'
import { useConfig, useDraft } from '../store'
import { AddButton, Card, EmptyState, IconButton, PlayButton, SaveBar, TableHead, TableRow, TextField, useAppear } from '../../ui'
import { keytermSentence } from './answers'
import { TryPanel } from '../tryout/TryPanel'
import { KnowledgeSection } from './KnowledgeSection'

const KEYS = ['keyterms'] as const

/**
 * Under this much table the two halves of a term no longer fit side by side —
 * ~140px each is where "Nha khoa Việt Smile" stops being readable — so the
 * word takes its own line above its spelling.
 */
const TERM_STACKED = 380

const COLS = 'minmax(0, 1fr) minmax(0, 1fr) 34px 32px'
const COLS_STACKED = 'minmax(0, 1fr) 34px 32px'

/**
 * `#/app/le-tan/kien-thuc/tu-khoa` — the words the machine mishears.
 *
 * This is the page an owner understands least, because "phonetic hint" is an
 * abstraction and nothing about it is visible. So the page teaches by ear:
 * every row has a play button that reads its word back **inside a sentence**
 * — the only place a word ever actually has to survive. Type, listen, fix the
 * spelling, listen again. And it opens with a handful of worked examples
 * already spelled (`defaults.ts`), because a blank table teaches nothing about
 * an abstraction; every one of them is the clinic's own row, so the first
 * thing an owner can do with an example is change it.
 *
 * **One table, and every word in it was typed here.** The clinic's name, its
 * services and its doctors used to be pulled in from the other pages as rows
 * that read but did not edit — a table half of which the owner could not
 * rename or delete, with a tooltip explaining why. That is a report, not a
 * form: it made the page longer the more of the product was filled in, and
 * the one action it offered on those rows was the one the reader least
 * expected to be missing. The words are gone; anyone who wants a spelling for
 * their clinic's name types it here like any other word.
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

  const rows = draft.keyterms.filter((k) => k.source === 'tenant')
  const appear = useAppear(rows.map((k) => k.id))

  const setRow = (id: string, patch: { term?: string; phonetic?: string }) =>
    set('keyterms', (list) =>
      list.map((k) =>
        k.id === id
          ? { ...k, ...(patch.term !== undefined ? { term: patch.term } : {}), ...(patch.phonetic !== undefined ? { phonetic_hint: patch.phonetic } : {}) }
          : k,
      ),
    )

  const add = () => set('keyterms', [...draft.keyterms, { id: newId('kt'), term: '', phonetic_hint: '', source: 'tenant' }])
  const remove = (id: string) => appear.leave(id, () => set('keyterms', (list) => list.filter((k) => k.id !== id)))

  const spelled = rows.filter((r) => r.term.trim() && r.phonetic_hint.trim()).length
  /*
   * One worked example, on the first row still missing a spelling. Thirty
   * identical "VD: in-vi-za-lai" placeholders down a column teach nothing the
   * first one did not, and turn the empty half of the table into noise; the
   * column heading is what says what the field is for.
   */
  const exampleId = rows.find((r) => !r.phonetic_hint.trim())?.id

  return (
    <KnowledgeSection
      title="Từ hay nghe nhầm"
      lede={`Tên riêng, thương hiệu, tên đường — những từ máy nghe dễ nhầm. Viết cách khách thường đọc từng từ, rồi bấm nghe thử xem ${agent} đã đọc đúng chưa.`}
      rail={<TryPanel section="tu-khoa" config={live} />}
      bar={<SaveBar {...d.bar} sub={`${spelled}/${rows.length} từ có cách đọc · áp dụng cho cuộc gọi tiếp theo`} />}
    >
      <Card
        title="Từ của phòng khám"
        subtitle={rows.length ? `${spelled}/${rows.length} từ có cách đọc · nghe thử từng từ để kiểm tra` : 'từ bạn thêm, và cách khách thường đọc nó'}
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
              <TableRow key={r.id} ref={appear.ref(r.id)} columns={columns}>
                <TextField
                  compact
                  aria-label="Từ"
                  value={r.term}
                  onChange={(e) => setRow(r.id, { term: e.target.value })}
                  placeholder="VD: Nha khoa Kim"
                  style={stacked ? { gridColumn: '1 / -1' } : undefined}
                />
                <TextField
                  compact
                  aria-label={`Khách hay đọc "${r.term}" thành`}
                  value={r.phonetic_hint}
                  onChange={(e) => setRow(r.id, { phonetic: e.target.value })}
                  placeholder={r.id === exampleId ? 'VD: in-vi-da-lai' : ''}
                />
                <PlayButton text={keytermSentence(r.term, r.phonetic_hint)} label={`Nghe ${agent} đọc "${r.term}"`} />
                <IconButton name="trash" label="Xoá từ" danger onClick={() => remove(r.id)} />
              </TableRow>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có từ nào">
            Thêm những từ {agent} dễ nghe nhầm: tên phòng khám, tên đối thủ khách hay so sánh ("Nha khoa Kim"), tên thuốc, tên hẻm ("Hẻm Sư Vạn Hạnh"), thương hiệu
            ("Osstem").
          </EmptyState>
        )}
      </Card>
    </KnowledgeSection>
  )
}
