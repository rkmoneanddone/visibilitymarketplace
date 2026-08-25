import {
  Outlet,
} from "react-router-dom";

import {
  SiteHeader,
} from "./SiteHeader";
import {
  PageBreadcrumb,
} from "./PageBreadcrumb";

export function AppLayout() {
  return (
    <>
      <SiteHeader />
      <PageBreadcrumb />
      <Outlet />
    </>
  );
}