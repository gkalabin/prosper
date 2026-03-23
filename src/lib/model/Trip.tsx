import {Trip as PbTrip} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';

export type Trip = {
  id: number;
  name: string;
  destination: string | null;
  startEpoch: number | null;
  endEpoch: number | null;
};

export function tripModelFromDB(init: PbTrip): Trip {
  return {
    id: init.id,
    name: init.name,
    destination: init.destination ?? null,
    startEpoch: init.start ? timestampToEpoch(init.start) : null,
    endEpoch: init.end ? timestampToEpoch(init.end) : null,
  };
}
