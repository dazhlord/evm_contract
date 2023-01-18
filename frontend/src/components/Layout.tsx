import { Box } from "@mui/material";
import { ReactNode } from "react";

type LayoutProps = {
  pageTitle?: string;
  children: ReactNode;
};

const Layout = ({ pageTitle, children }: LayoutProps) => {
  return (
    <Box>
      <div>
        <h1>{pageTitle}</h1>

        <main>{children}</main>
      </div>
    </Box>
  );
};

export default Layout;
