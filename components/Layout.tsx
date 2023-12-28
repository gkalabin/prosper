import Header from "components/Header";
import SubHeader, { SubHeaderItem } from "components/SubHeader";
import { ReactNode } from "react";

const Layout = (props: {
  children: ReactNode | ReactNode[];
  subheader?: SubHeaderItem[];
}) => (
  <div>
    <Header />
    {props.subheader && <SubHeader items={props.subheader} />}
    <div className="flex justify-center">
      <div className="w-full sm:w-3/4 p-4">
        {props.children}
      </div>
    </div>
  </div>
);

export default Layout;
