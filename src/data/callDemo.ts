/**
 * Copy and timings for the "Nghe thử" call screen.
 *
 * A chip is a question the caller asks — it goes to the voice session the same
 * way a typed line does. How long the agent then talks is the session's
 * business, not the chip's: mocked it is the constant below, live it is however
 * long the real reply takes.
 */
export interface SuggestionChip {
  label: string
}

export const CHIPS: SuggestionChip[] = [
  { label: 'Cạo vôi răng bao nhiêu?' },
  { label: '9h sáng thứ Bảy còn trống không?' },
  { label: 'Phòng khám ở đâu?' },
]

export interface Voice {
  name: string
  desc: string
}

export const VOICES: Voice[] = [
  { name: 'Linh', desc: 'Nữ · miền Nam, ấm áp' },
  { name: 'Mai', desc: 'Nữ · miền Bắc, nhẹ nhàng' },
  { name: 'An', desc: 'Nữ · trẻ trung, rõ ràng' },
  { name: 'Minh', desc: 'Nam · trầm, điềm tĩnh' },
  { name: 'Quân', desc: 'Nam · miền Nam, thân thiện' },
]

/** How long a typed question makes the agent speak. */
export const TYPED_SPEAK_MS = 4400
/** How long a voice preview plays. */
export const VOICE_PREVIEW_MS = 2600
