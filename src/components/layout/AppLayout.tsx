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
import {
  PaymentReturnNotice,
} from "../../features/payment/PaymentReturnNotice";

export function AppLayout() {
  return (
    <>
      <HashScroll />
      <SiteHeader />
      <PaymentReturnNotice />
      <PageBreadcrumb />
      <Outlet />
    </>
  );
}
