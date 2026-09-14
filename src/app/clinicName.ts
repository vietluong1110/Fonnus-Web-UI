/*
 * The clinic's name as the sidebar reads it ("Tên gọn", Sept 2026).
 *
 * The account block has one line for the name, and a clinic's registered name opens with
 * what kind of clinic it is — "Nha khoa Việt Smile", "Phòng khám Nha khoa Quốc tế …". The
 * owner knows what kind of clinic they run, so the kind is dropped and the clinic's own words
 * are kept: "Việt Smile". The full name is still the one in the account menu, on every other
 * screen, and in the block's accessible name.
 *
 * A name that is only a kind ("Nha khoa") is left alone. What is still too long for the line
 * fades at its edge and glides to its end while pointed at — that is the shell's job.
 */

/** Longest first, so "phòng khám đa khoa" is taken whole rather than as "phòng khám". */
const KINDS = [
  'phòng khám đa khoa',
  'phòng khám chuyên khoa',
  'phòng khám',
  'thẩm mỹ viện',
  'viện thẩm mỹ',
  'bệnh viện',
  'trung tâm',
  'nha khoa',
  'clinic',
  'spa',
]

/** What may sit between the kind and the name: "Nha khoa - Việt Smile", "Nha khoa: Việt Smile". */
const JOINERS = /^[\s\-–—·:,.]+/

export function shortClinicName(name: string): string {
  let rest = name.normalize('NFC').trim().replace(/\s+/g, ' ')
  for (;;) {
    const low = rest.toLocaleLowerCase('vi')
    const kind = KINDS.find((k) => low.startsWith(k) && (low.length === k.length || JOINERS.test(low.slice(k.length))))
    if (!kind) return rest
    const next = rest.slice(kind.length).replace(JOINERS, '')
    if (!next) return rest
    rest = next
  }
}
