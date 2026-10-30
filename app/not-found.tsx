import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

/** Shared screen for unknown routes and `notFound()`. Forbidden resources use it too, so their existence is not revealed. */
export default function NotFound() {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>The address may have changed, or the page may have been removed.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/" className={buttonVariants()}>
          Go home
        </Link>
      </EmptyContent>
    </Empty>
  );
}
