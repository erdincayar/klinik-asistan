/**
 * Minimal in-process FIFO job queue.
 *
 * This is a stopgap until we move catalog pipeline jobs to BullMQ
 * in Sprint 2. Jobs run one-at-a-time inside the Node.js server
 * process. They survive only until the process restarts.
 *
 * TODO(sprint2): replace with BullMQ
 *   - npm i bullmq ioredis
 *   - Queue name: "catalog-pipeline"
 *   - Workers in a separate process (pm2 fork)
 *   - Status persisted via Redis; GET project status reads from Redis
 *   - Retries, rate limiting, dead-letter queue
 */

type Worker = () => Promise<void>;

interface QueueStats {
  running: boolean;
  pending: number;
  processed: number;
  failed: number;
}

class InProcessJobQueue {
  private queue: Worker[] = [];
  private running = false;
  private processed = 0;
  private failed = 0;

  enqueue(fn: Worker): void {
    this.queue.push(fn);
    if (!this.running) void this.drain();
  }

  stats(): QueueStats {
    return {
      running: this.running,
      pending: this.queue.length,
      processed: this.processed,
      failed: this.failed,
    };
  }

  private async drain(): Promise<void> {
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        try {
          await job();
          this.processed++;
        } catch (err) {
          this.failed++;
          console.error("[catalog jobQueue] worker failed:", err);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

// Module-level singleton (survives hot-reload via globalThis cache)
const g = globalThis as unknown as { __catalogQueue?: InProcessJobQueue };
export const catalogJobQueue: InProcessJobQueue =
  g.__catalogQueue ?? (g.__catalogQueue = new InProcessJobQueue());
