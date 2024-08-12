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
