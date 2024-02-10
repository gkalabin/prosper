import {Trip as DBTrip} from '@prisma/client';

export type Trip = {
  id: number;
  name: string;
  destination: string | null;
  startEpoch: number | null;
  endEpoch: number | null;
};

export function tripModelFromDB(init: DBTrip): Trip {
  return {
    id: init.id,
    name: init.name,
    destination: init.destination,
    startEpoch: init.start?.getTime() ?? null,
    endEpoch: init.end?.getTime() ?? null,
  };
}
