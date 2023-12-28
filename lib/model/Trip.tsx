import { Trip as DBTrip } from "@prisma/client";

export class Trip {
  private readonly _id: number;
  private readonly _name: string;
  private readonly _destination: string;
  private readonly _start: Date;
  private readonly _end: Date;
  private readonly dbValue: DBTrip;

  public constructor(init: DBTrip) {
    this.dbValue = init;
    this._id = init.id;
    this._name = init.name;
    this._destination = init.destination;
    this._start = init.start;
    this._end = init.end;
  }

  id() {
    return this._id;
  }
  name() {
    return this._name;
  }
  destination() {
    return this._destination;
  }
  start() {
    return this._start;
  }
  end() {
    return this._end;
  }
}
