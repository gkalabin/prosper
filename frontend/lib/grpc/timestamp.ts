import {assertDefined} from '@/lib/assert';
import {Timestamp} from '@/lib/grpc/gen/google/protobuf/timestamp';

// timestampToDate converts a protobuf Timestamp into a JS Date.
export function timestampToDate(ts: Timestamp | undefined): Date {
  assertDefined(ts, 'timestamp is missing');
  return new Date(timestampToEpoch(ts));
}

// timestampToEpoch converts a protobuf Timestamp into epoch milliseconds.
export function timestampToEpoch(ts: Timestamp | undefined): number {
  assertDefined(ts, 'timestamp is missing');
  return Number(ts.seconds) * 1000 + ts.nanos / 1e6;
}

// dateToTimestamp converts a JS Date into a protobuf Timestamp.
export function dateToTimestamp(d: Date): Timestamp {
  const ms = d.getTime();
  const seconds = BigInt(Math.floor(ms / 1000));
  const nanos = (ms % 1000) * 1_000_000;
  return {seconds, nanos};
}
