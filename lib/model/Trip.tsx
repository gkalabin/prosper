import { Trip as DBTrip } from "@prisma/client";

export class Trip {
  readonly id: string;
  readonly destination: string;
  readonly start: Date;
  readonly end: Date;
  readonly dbValue: DBTrip;

  public constructor(init: DBTrip) {
    this.dbValue = init;
    this.id = init.id;
    this.destination = init.destination;
    this.start = init.start;
    this.end = init.end;
  }
}
