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

export function mustFindTag(id: number, tags: Tag[]): Tag {
  const tag = tags.find(t => t.id == id);
  if (!tag) {
    throw new Error(`Cannot find tag with id ${id}`);
  }
  return tag;
}
