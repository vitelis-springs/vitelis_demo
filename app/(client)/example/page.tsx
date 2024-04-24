import Link from 'next/link';

export default function ExamplePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="mb-4 text-3xl">Example Components</h1>
      <ul className="flex flex-col items-center gap-4 text-blue-400">
        <li>
          <Link href="/example/dynamic/123">Dynamic Example</Link>
        </li>
        <li>
          <Link href="/example/fetching">Fetching Example</Link>
        </li>
        <li>
          <Link href="/example/query-string?hello=world&code=clean">QueryString Example</Link>
        </li>
        <li>
          <Link href="/example/react-query">React Query Example</Link>
        </li>
        <li>
          <Link href="/example/server-actions">Server Actions Example</Link>
        </li>
      </ul>
    </main>
  );
}
