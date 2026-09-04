import { useState } from 'react'
import { Icon } from '../../design-system'
import { COMPARISON_MATRIX } from '../../data/pricing'
import styles from './ComparisonMatrix.module.css'

const COLUMNS = ['Dùng thử', 'Cơ bản', 'Tiêu chuẩn', 'Nâng cao']
/** Index into COLUMNS of the plan the cards recommend. */
const FEATURED = 2

interface ComparisonMatrixProps {
  defaultOpen?: boolean
}

export function ComparisonMatrix({ defaultOpen = false }: ComparisonMatrixProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div data-reveal="0" style={{ marginTop: 40 }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={styles.toggle}>
        <span>{open ? 'Thu gọn bảng so sánh đầy đủ' : 'Xem bảng so sánh đầy đủ'}</span>
        <span className={open ? styles.caretOpen : styles.caret} aria-hidden="true">
          <Icon name="chevron-down" size={16} />
        </span>
      </button>

      {/*
        Kept mounted and collapsed to 0fr rather than unmounted, which is what
        lets the open ease instead of appearing in one frame.
      */}
      <div className={open ? styles.revealOpen : styles.reveal} aria-hidden={!open}>
        <div className={styles.revealInner}>
          <div className={styles.scroller}>
            <div className={styles.table}>
              <div className={styles.grid}>
                {/*
                  A column-wide band behind the rows, on the same track template
                  so it lands exactly under the featured plan's cells.
                */}
                <div className={styles.columns} aria-hidden="true">
                  <span />
                  {COLUMNS.map((col, i) => (
                    <span key={col} className={i === FEATURED ? styles.colOn : undefined} />
                  ))}
                </div>

                <div className={styles.head}>
                  <span />
                  {COLUMNS.map((col, i) => (
                    <span key={col} className={i === FEATURED ? styles.headCellOn : styles.headCell}>
                      {col}
                    </span>
                  ))}
                </div>

                {COMPARISON_MATRIX.map((row, i) =>
                  row.kind === 'group' ? (
                    <div key={`${row.label}-${i}`} className={styles.groupRow}>
                      <span className={styles.groupLabel}>{row.label}</span>
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : (
                    <div key={`${row.label}-${i}`} className={styles.row}>
                      <span className={styles.label}>{row.label}</span>
                      {row.cells.map((cell, c) => (
                        <span key={c} className={c === FEATURED ? styles.cellOn : styles.cell}>
                          {cell}
                        </span>
                      ))}
                    </div>
                  ),
                )}
              </div>

              <p className={styles.footnote}>
                Cổng đồng ý, câu công bố trợ lý AI và việc chuyển cho người thật có ở mọi gói, kể cả Dùng
                thử. Trả tháng và trả năm khác nhau ở giá, không khác ở tính năng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
