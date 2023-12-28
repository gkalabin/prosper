import classNames from "classnames";
import { AnchorUnstyled } from "components/ui/buttons";
import { useRouter } from "next/router";
import { useState } from "react";

export type SubHeaderItem = {
  title: string;
  onSelected?: () => void;
  path?: string;
};

const validate = (items: SubHeaderItem[]) => {
  if (!items || !items.length) {
    throw new Error(`Subheader has no items`);
  }
  const titles = {};
  for (const i of items) {
    if (titles[i.title]) {
      throw new Error(`Title ${i.title} present more than once`);
    }
    titles[i.title] = 1;
    if (!i.onSelected && !i.path) {
      throw new Error(`Item ${i.title} doesn't have a callback or target path`);
    }
    if (i.onSelected && i.path) {
      throw new Error(`Item ${i.title} can have either callback or the path`);
    }
  }
};

export const SubHeader = (props: { items: SubHeaderItem[] }) => {
  validate(props.items);
  const router = useRouter();
  const activeItem = props.items.find((i) => i.path == router.pathname);
  const [active, setActive] = useState(activeItem ?? props.items[0]);
  const handleClick = (item: SubHeaderItem) => {
    setActive(item);
    item.onSelected();
  };

  return (
    <nav className="bg-gray-600">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-12 items-center justify-between">
          <div className="flex flex-1 items-stretch justify-start">
            <div className="flex space-x-4">
              {props.items.map((item) => (
                <Button
                  key={item.title}
                  item={item}
                  active={active}
                  onClick={handleClick}
                />
              ))}
            </div>
          </div>
        </div>
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
  active: SubHeaderItem;
  onClick: (item: SubHeaderItem) => void;
}) {
  return (
    <>
      {item.onSelected && (
        <button type="button" onClick={() => onClick(item)}>
          <ButtonContent
            text={item.title}
            isActive={item.title == active.title}
          />
        </button>
      )}
      {item.path && (
        <AnchorUnstyled href={item.path}>
          <ButtonContent
            text={item.title}
            isActive={item.title == active.title}
          />
        </AnchorUnstyled>
      )}
    </>
  );
}

function ButtonContent({
  text,
  isActive,
}: {
  text: string;
  isActive: boolean;
}) {
  return (
    <span
      className={classNames(
        isActive
          ? "bg-gray-800 text-white"
          : "text-gray-300 hover:bg-gray-700 hover:text-white",
        "rounded-md px-3 py-2 text-sm font-medium"
      )}
    >
      {text}
    </span>
  );
}
