'use client';
import {cn} from '@/lib/utils';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

export type SubHeaderItem = {
  title: string;
  onSelected?: () => void;
  path?: string;
};

const validate = (items: SubHeaderItem[]) => {
  if (!items || !items.length) {
    throw new Error(`Subheader has no items`);
  }
  const titles = new Set<string>();
  for (const i of items) {
    if (titles.has(i.title)) {
      throw new Error(`Title ${i.title} present more than once`);
    }
    titles.add(i.title);
    if (!i.onSelected && !i.path) {
      throw new Error(`Item ${i.title} doesn't have a callback or target path`);
    }
    if (i.onSelected && i.path) {
      throw new Error(`Item ${i.title} can have either callback or the path`);
    }
  }
};

export const SubHeader = (props: {items: SubHeaderItem[]}) => {
  validate(props.items);
  const pathname = usePathname();
  const activeItem = props.items.find(i => i.path == pathname);
  const [active, setActive] = useState<SubHeaderItem | undefined>(activeItem);
  const handleClick = (item: SubHeaderItem) => {
    setActive(item);
    if (item.onSelected) {
      item.onSelected();
    }
  };

  return (
    <nav className="bg-gray-600">
      <div className="mx-auto max-w-7xl space-x-2 px-2 py-1 sm:space-x-4 sm:px-6 lg:px-8">
        {props.items.map(item => (
          <div key={item.title} className="my-1 inline-block">
            <Button item={item} active={active} onClick={handleClick} />
          </div>
        ))}
      </div>
    </nav>
  );
};

function Button({
  item,
  active,
  onClick,
}: {
  item: SubHeaderItem;
  active?: SubHeaderItem;
  onClick: (item: SubHeaderItem) => void;
}) {
  return (
    <>
      {item.onSelected && (
        <button type="button" onClick={() => onClick(item)}>
          <ButtonContent
            text={item.title}
            isActive={item.title == active?.title}
          />
        </button>
      )}
      {item.path && (
        <Link href={item.path}>
          <ButtonContent
            text={item.title}
            isActive={item.title == active?.title}
          />
        </Link>
      )}
    </>
  );
}

function ButtonContent({text, isActive}: {text: string; isActive: boolean}) {
  return (
    <div
      className={cn(
        isActive
          ? 'bg-gray-800 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
        'rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap'
      )}
    >
      {text}
    </div>
  );
}
