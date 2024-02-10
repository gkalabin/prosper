import {Tag as DBTag} from '@prisma/client';

export type Tag = {
  id: number;
  name: string;
};

export function tagModelFromDB(init: DBTag): Tag {
  return {
    id: init.id,
    name: init.name,
  };
}

// export class Tag {
//   private readonly _id: number;
//   private readonly _name: string;
//   private readonly _dbValue: DBTag;

//   public constructor(init: DBTag) {
//     this._dbValue = init;
//     this._id = init.id;
//     this._name = init.name;
//   }
//   id() {
//     return this._id;
//   }
//   name() {
//     return this._name;
//   }
// }
