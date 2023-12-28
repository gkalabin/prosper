import Header from "components/Header";
import React, { ReactNode } from "react";
import SubHeader, { SubHeaderItem } from "components/SubHeader";

const Layout = (props: {
  children: ReactNode;
  subheader?: SubHeaderItem[];
}) => (
  <div>
    <Header />
    {props.subheader && <SubHeader items={props.subheader} />}
    <div className="flex justify-center">
      <div className="sm:w-2/3">
        <div className="px-8 py-4">{props.children}</div>
      </div>
    </div>
  </div>
);

export default Layout;
