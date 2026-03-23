import {Tag as PbTag} from '@/lib/grpc/gen/prosper/v1/ledger';

export type Tag = {
  id: number;
  name: string;
};

export function tagModelFromDB(init: PbTag): Tag {
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
