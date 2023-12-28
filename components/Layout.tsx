import classNames from "classnames";
import Header from "components/Header";
import { SubHeader, SubHeaderItem } from "components/SubHeader";
import { ReactNode } from "react";

const Layout = ({
  children,
  subheader,
  className,
}: {
  children: ReactNode | ReactNode[];
  subheader?: SubHeaderItem[];
  className?: string;
}) => {
  return (
    <div>
      <Header />
      {subheader && <SubHeader items={subheader} />}
      <div className="flex justify-center">
        <div className={classNames("w-full p-4 sm:w-3/4", className)}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
