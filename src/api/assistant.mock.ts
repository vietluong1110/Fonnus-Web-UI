/**
 * The setup assistant, with no model behind it.
 *
 * This is the logic that used to live inside `chatStore.tsx`: the answer is
 * matched against the question the rail is currently on, using the regex
 * parsers in `questions.ts`. A parseable sentence writes its field; anything
 * else comes back as a correction rather than a silent no-op.
 *
 * Attachments are acknowledged but never read — there is no extraction service,
 * and the UI promises the owner in writing that they review every suggestion
 * before the agent uses it. Saying "em đã điền giúp anh chị" here would be a
 * promise the product cannot keep.
 */
import { buildQuestions } from '../app/letan/questions'
import type { AssistantApi, AssistantEvent, AssistantTurn, AttachmentRef } from './contracts'
import { attachmentKindOf } from './attachments'
import { delay, maybeFail } from './mock-support'

async function* run(turn: AssistantTurn, signal?: AbortSignal): AsyncIterable<AssistantEvent> {
  // A beat, so the panel can show a typing indicator the way a real stream would.
  await delay(0.8, signal)

  const said = turn.text.trim()

  // Files land, and that is all that honestly happens to them.
  if (turn.attachments.length && !said) {
    const n = turn.attachments.length
    yield {
      type: 'delta',
      text: `Em nhận được ${n} tệp rồi ạ. Hiện em chưa đọc được nội dung — anh chị điền giúp em vài câu nữa nhé.`,
    }
    yield { type: 'done' }
    return
  }

  const question = turn.questionId
    ? buildQuestions(turn.config).find((q) => q.id === turn.questionId)
    : undefined

  if (!question) {
    yield { type: 'delta', text: 'Em ghi nhận rồi ạ.' }
    yield { type: 'done' }
    return
  }

  const result = question.applyText(turn.config, said)

  if ('error' in result) {
    // The question stays open — the caller leaves `asked` pointing at it.
    yield { type: 'rejected', reason: result.error }
    yield { type: 'done' }
    return
  }

  yield {
    type: 'patch',
    patch: result,
    confirm: `${question.confirm({ ...turn.config, ...result })} vào ${question.sectionLabel}`,
  }
  yield { type: 'done' }
}

export const assistantMock: AssistantApi = {
  send(turn, opts) {
    return run(turn, opts.signal)
  },

  async upload(file, opts) {
    await delay(1.2, opts?.signal)
    maybeFail()
    const ref: AttachmentRef = {
      id: `att-${Date.now().toString(36)}`,
      name: file.name,
      kind: attachmentKindOf(file.name, file.type),
      size: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }
    return ref
  },
}
