import { useState } from 'react'
import { COMPARISON_MATRIX } from '../../data/pricing'
import styles from './ComparisonMatrix.module.css'

const COLUMNS = ['Dùng thử', 'Cơ bản', 'Tiêu chuẩn', 'Nâng cao']

interface ComparisonMatrixProps {
  defaultOpen?: boolean
}

export function ComparisonMatrix({ defaultOpen = false }: ComparisonMatrixProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div data-reveal="1" style={{ marginTop: 40 }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className={styles.toggle}>
        <span>{open ? 'Thu gọn bảng so sánh đầy đủ' : 'Xem bảng so sánh đầy đủ'}</span>
        <span className={open ? styles.caretOpen : styles.caret}>▾</span>
      </button>

      {open ? (
        <div className={styles.scroller}>
          <div className={styles.table}>
            <div className={styles.head}>
              <span />
              {COLUMNS.map((col) => (
                <span key={col} className={styles.headCell}>
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
                    <span key={c} className={styles.cell}>
                      {cell}
                    </span>
                  ))}
                </div>
              ),
            )}

            <p className={styles.footnote}>
              Cổng đồng ý, câu công bố trợ lý AI và việc chuyển cho người thật có ở mọi gói, kể cả Dùng thử.
              Trả tháng và trả năm khác nhau ở giá, không khác ở tính năng.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
