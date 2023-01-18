import { ReactNode } from "react";

type LayoutProps = {
  pageTitle?: string;
  children: ReactNode;
};

const Layout = ({ pageTitle, children }: LayoutProps) => {
  return (
    <div>
      <h1>{pageTitle}</h1>

      <main>{children}</main>
    </div>
  );
};

export default Layout;
