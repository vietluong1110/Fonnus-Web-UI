/**
 * System-written (SW) and system-derived (SD) values from the catalogue.
 * The tenant sees these, never edits them. Legal review happens once, here.
 */

/** A6 · `greeting_compliance_block` + A9 · `ai_disclosure_script` / `consent_notice_script`. */
export const GREETING_COMPLIANCE_BLOCK =
  'Đây là trợ lý AI của phòng khám, cuộc gọi được ghi âm để phục vụ chất lượng dịch vụ.'

/** A6 · `verbosity_cap` */
export const VERBOSITY_CAP_SENTENCES = 2

/** A7 · `max_call_duration_seconds` */
export const MAX_CALL_DURATION_SECONDS = 600

/** A9 · `recording_retention` — by plan tier. */
export const RECORDING_RETENTION_DAYS = 30

/** A9 · `pdpl_data_minimisation_rule` */
export const PDPL_DATA_MINIMISATION =
  'Chỉ ghi nhận tên và số điện thoại khi đặt lịch. Không bao giờ hỏi CCCD hay số tài khoản.'

/** A9 · `unresolvable_fallback_script` */
export const UNRESOLVABLE_FALLBACK_SCRIPT = 'Em xin ghi nhận, nhân viên sẽ gọi lại anh/chị ạ.'

/** A5 · `escalation_triggers` — base set; tenant may add, never remove. */
export const ESCALATION_TRIGGERS_BASE = [
  'Khách yêu cầu gặp nhân viên',
  'Khách tỏ ra bực bội',
  'Linh nghe không rõ hai lần liên tiếp',
]

/**
 * The trigger with a rule attached: the row that takes it is the on-call
 * doctor, so it is what `after_hours_emergency_target` is derived from and
 * what makes a row show the red-flag list. Matched by value, the way
 * `ESCALATION_TRIGGERS_BASE` already is.
 */
export const EMERGENCY_TRIGGER = 'Khẩn cấp y tế'

/**
 * The four cases a clinic reaches for a person, offered on every row of
 * `Chuyển máy`. They are suggestions, not a closed set — a trigger is a
 * sentence in the clinic's own words, and the box takes any of them.
 */
export const TRANSFER_TRIGGERS = ['Khách yêu cầu gặp nhân viên', 'Khách hỏi tư vấn y khoa', 'Có câu Linh không trả lời được', EMERGENCY_TRIGGER]

/** The rest of what a dental clinic adds, behind "thêm gợi ý". */
export const TRANSFER_TRIGGERS_MORE = ['Khách muốn nghe ý kiến bác sĩ', 'Khách nói tiếng nước ngoài']

/** B3 · `emergency_red_flags` — vertical pack; tenant may add rows, never remove one. */
export const EMERGENCY_RED_FLAGS_PACK = [
  'chảy máu không cầm',
  'khó thở',
  'sưng lan',
  'sốt cao sau tiểu phẫu',
  'ngất, choáng',
]

/** B3 · `emergency_instruction_script` */
export const EMERGENCY_INSTRUCTION_SCRIPT = 'Anh/chị giữ máy, em nối máy với bác sĩ ngay ạ.'

/** B3 · `medical_advice_refusal_script` */
export const MEDICAL_ADVICE_REFUSAL_SCRIPT =
  'Em không tư vấn y khoa được ạ. Em xin nối máy với bác sĩ để anh/chị được trả lời chính xác.'

/** B3 · `symptom_capture_rule` */
export const SYMPTOM_CAPTURE_RULE = 'Ghi nhận nguyên văn lời khách, không diễn giải hay suy đoán.'

/** A3 · the sentence appended to every price the agent voices under the `range` policy. */
export const PRICE_QUALIFIER = 'Giá chính xác sau khi bác sĩ thăm khám.'

/** A7 · `keyterms` — the vertical pack rows. */
export const KEYTERMS_PACK = ['Invisalign', 'Implant', 'Veneer', 'Cone Beam', 'Zirconia', 'Titan']
