# Node.js backend patterns

Use these examples as decision patterns. Adapt APIs, error types, limits, and lifecycle hooks to the installed Node.js, framework, driver, and repository conventions.

## Contents

- [Bound batch concurrency](#bound-batch-concurrency)
- [Propagate a Mongoose transaction session](#propagate-a-mongoose-transaction-session)
- [Drain resources during shutdown](#drain-resources-during-shutdown)
- [Persist webhook intake idempotently](#persist-webhook-intake-idempotently)
- [Validate unknown input and bound outbound calls](#validate-unknown-input-and-bound-outbound-calls)

## Bound batch concurrency

Avoid starting work for an unbounded collection at once.

```ts
// Avoid: input size controls connection and memory pressure.
await Promise.all(records.map((record) => syncRecord(record)));
```

Use an existing concurrency utility when the repository has one. Otherwise, process a bounded window and choose the limit from dependency capacity and measurements.

```ts
const concurrency = 10;

for (let offset = 0; offset < records.length; offset += concurrency) {
  const batch = records.slice(offset, offset + concurrency);
  await Promise.all(batch.map((record) => syncRecord(record)));
}
```

Define whether one failure stops later batches, whether partial completion is safe, and how retries avoid duplicating side effects.

## Propagate a Mongoose transaction session

Do not start a transaction and then run participating writes outside its session.

```ts
// Avoid: the outbox write is not part of the transaction.
await connection.transaction(async (session) => {
  await Order.updateOne({ _id: orderId }, { $set: { status: 'paid' } }, { session });
  await Outbox.create({ type: 'order.paid', orderId });
});
```

Pass the session to every participating operation and record remote work for execution after commit.

```ts
await connection.transaction(async (session) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { $set: { status: 'paid' } },
    { new: true, session },
  );

  if (!order) throw new OrderStateConflictError(orderId);

  await Outbox.create(
    [{ type: 'order.paid', aggregateId: order.id, payload: { orderId: order.id } }],
    { session },
  );
});
```

Keep provider calls outside the transaction. Let an outbox publisher retry them idempotently after commit.

## Drain resources during shutdown

Do not close only the HTTP listener while leaving pools, consumers, or telemetry open.

```ts
import { once } from 'node:events';

let ready = true;
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;

  const deadline = setTimeout(() => {
    console.error({ signal }, 'Graceful shutdown deadline exceeded');
    process.exit(1);
  }, 10_000);
  deadline.unref();

  try {
    const closed = once(server, 'close');
    server.close();
    await closed;
    await worker.close();
    await mongoose.disconnect();
    await telemetry.shutdown();
  } finally {
    clearTimeout(deadline);
  }
}

function requestShutdown(signal: NodeJS.Signals): void {
  shutdown(signal).catch((error: unknown) => {
    console.error({ error, signal }, 'Graceful shutdown failed');
    process.exit(1);
  });
}

process.once('SIGTERM', () => requestShutdown('SIGTERM'));
process.once('SIGINT', () => requestShutdown('SIGINT'));
```

Make the readiness handler return not-ready after `ready` becomes false. Order shutdown according to the service: stop new jobs/traffic, drain current work, then close dependencies within a deadline.

## Persist webhook intake idempotently

Do not perform slow side effects before acknowledgment or rely on an in-memory deduplication set.

```ts
const event = verifyProviderSignature(req.rawBody, req.headers);

await WebhookInbox.updateOne(
  { _id: event.id },
  {
    $setOnInsert: {
      type: event.type,
      payload: event.data,
      status: 'pending',
      receivedAt: new Date(),
    },
  },
  { upsert: true },
);

res.sendStatus(202);
```

Capture the raw body before JSON parsing when the provider signs raw bytes. Enforce a unique event identifier, minimize or protect stored payload data, and define retention. Let a worker atomically claim pending records and make each side effect safe to retry.

## Validate unknown input and bound outbound calls

Do not use a TypeScript cast as runtime validation or allow an outbound request to wait indefinitely.

```ts
// Avoid: neither the request body nor the remote call is bounded.
const input = req.body as CreateContactInput;
const response = await fetch(providerUrl, { method: 'POST', body: JSON.stringify(input) });
```

Parse at the boundary and use the repository's deadline/cancellation utility. For supported Node.js versions, a simple deadline can use `AbortSignal.timeout`.

```ts
const input = CreateContactSchema.parse(req.body);

const response = await fetch(providerUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(input),
  signal: AbortSignal.timeout(5_000),
});

if (!response.ok) {
  throw new ProviderRequestError(response.status);
}
```

Propagate caller cancellation where the installed runtime supports combining signals. Retry only classified transient failures and only when the operation is idempotent.
