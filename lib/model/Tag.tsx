import { Tag as DBTag } from "@prisma/client";

export class Tag {
  readonly id: number;
  readonly name: string;
  readonly dbValue: DBTag;

  public constructor(init: DBTag) {
    this.dbValue = init;
    this.id = init.id;
    this.name = init.name;
  }
}
