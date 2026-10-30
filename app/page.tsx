export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Ready to start</h1>
      <p className="text-muted-foreground">
        This is the default home page. Replace{" "}
        <code className="font-mono text-sm">app/page.tsx</code> with your service&apos;s landing page.
      </p>
      <p className="text-sm text-muted-foreground">
        To set up the project, follow &ldquo;Project setup&rdquo; in
        the README.
      </p>
    </main>
  );
}
