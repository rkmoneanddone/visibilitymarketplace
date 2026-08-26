import {
  Outlet,
} from "react-router-dom";

import {
  SiteHeader,
} from "./SiteHeader";
import {
  PageBreadcrumb,
} from "./PageBreadcrumb";
import {
  HashScroll,
} from "./HashScroll";

export function AppLayout() {
  return (
    <>
      <HashScroll />
      <SiteHeader />
      <PageBreadcrumb />
      <Outlet />
    </>
  );
}