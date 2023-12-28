import classNames from "classnames";
import { useState } from "react";

export type SubHeaderItem = {
  title: string;
  onSelected: () => void;
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
  }
};

const SubHeader = (props: { items: SubHeaderItem[] }) => {
  validate(props.items);
  const [active, setActive] = useState(props.items[0]);
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
                <button
                  type="button"
                  key={item.title}
                  className={classNames(
                    item.title == active.title
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "rounded-md px-3 py-2 text-sm font-medium"
                  )}
                  onClick={() => handleClick(item)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SubHeader;
