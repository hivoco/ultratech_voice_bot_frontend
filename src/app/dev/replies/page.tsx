import { notFound } from "next/navigation";
import { DevReplies } from "./DevReplies";

/**
 * Dev-only break-ui page (docs/break-ui.md): every chat reply layout rendered from raw backend-shaped
 * fixtures, behind a Demo / Worst case / Empty / One toggle (`?data=`). Not available in production.
 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevReplies />;
}
