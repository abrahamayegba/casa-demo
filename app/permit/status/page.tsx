import { Suspense } from "react";
import PermitStatusClient from "./PermitStatusClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PermitStatusClient />
    </Suspense>
  );
}
