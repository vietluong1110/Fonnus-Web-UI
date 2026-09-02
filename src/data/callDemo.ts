/**
 * The "Nghe thử" gadget is a mockup: nothing is recorded, nothing is sent.
 * Chips and the typed input only decide how long the orb pretends to speak.
 */
export interface SuggestionChip {
  label: string
  /** How long the scripted reply "lasts", in ms. */
  speakMs: number
}

export const CHIPS: SuggestionChip[] = [
  { label: 'Cạo vôi răng bao nhiêu?', speakMs: 4200 },
  { label: '9h sáng thứ Bảy còn trống không?', speakMs: 4600 },
  { label: 'Phòng khám ở đâu?', speakMs: 3800 },
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
