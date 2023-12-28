import Header from "components/Header";
import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const Layout: React.FC<Props> = (props) => (
  <div>
    <Header />
    <div className="flex justify-center">
      <div className="sm:w-2/3">
        <div className="px-8 py-4">{props.children}</div>
      </div>
    </div>
  </div>
);

export default Layout;
