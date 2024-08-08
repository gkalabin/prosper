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

export function mustFindTagByName(name: string, tags: Tag[]): Tag {
  const found = tags.find(t => t.name == name);
  if (!found) {
    throw new Error(`Tag ${name} not found`);
  }
  return found;
}
