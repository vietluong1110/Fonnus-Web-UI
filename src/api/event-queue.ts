/**
 * A push-in, `for await`-out queue.
 *
 * The voice and assistant transports produce events whenever they happen, but
 * consumers read them in a loop. This is the adapter between the two, and it is
 * small enough not to be worth a dependency.
 */
export class EventQueue<T> {
  private readonly buffer: T[] = []
  private readonly waiting: ((r: IteratorResult<T>) => void)[] = []
  private closed = false

  push(value: T): void {
    if (this.closed) return
    const next = this.waiting.shift()
    if (next) next({ value, done: false })
    else this.buffer.push(value)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    // Release every reader, or a `for await` hangs for the life of the page.
    while (this.waiting.length) {
      this.waiting.shift()?.({ value: undefined as never, done: true })
    }
  }

  /** Single-consumer. Two `for await` loops over one queue would split the events. */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.buffer.length) {
          return Promise.resolve({ value: this.buffer.shift() as T, done: false })
        }
        if (this.closed) return Promise.resolve({ value: undefined as never, done: true })
        return new Promise((resolve) => this.waiting.push(resolve))
      },
      return: (): Promise<IteratorResult<T>> => {
        this.close()
        return Promise.resolve({ value: undefined as never, done: true })
      },
    }
  }
}
