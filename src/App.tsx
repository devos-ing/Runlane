import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  BookOpenIcon,
  CheckIcon,
  CodeIcon,
  FileTextIcon,
  GitBranchIcon,
  LinkIcon,
  ListIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type DocPage,
  documentHref,
  documents,
  headingId,
  headingsFor,
} from "./docs";

/** Loads the interactive graph only on pages that embed the demonstration. */
const FlowPlayground = lazy(() => import("./FlowPlayground"));

/** Renders a document heading with a stable, shareable anchor. */
function MarkdownHeading({ children }: { children?: ReactNode }) {
  const text = String(children ?? "");
  return (
    <h2 id={headingId(text)}>
      {children}
      <a
        className="heading-anchor"
        href={`#${headingId(text)}`}
        aria-label={`Link to ${text}`}
      >
        #
      </a>
    </h2>
  );
}

/** Preserves native anchors while resolving links between Markdown documents. */
function MarkdownLink({
  href = "",
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={documentHref(href)}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {children}
      {external && <ArrowSquareOutIcon className="inline-icon" size={12} />}
    </a>
  );
}

const markdownComponents: Components = { h2: MarkdownHeading, a: MarkdownLink };

/** Renders a page's Markdown and its explicitly placed canvas demonstration. */
function DocumentBody({ page }: { page: DocPage }) {
  const sections = page.markdown.split(/\n<!-- playground -->\n/);
  return (
    <>
      {sections.map((section, index) => (
        <div key={`${page.id}-${section.slice(0, 80)}`}>
          <div className="prose">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {section}
            </Markdown>
          </div>
          {index < sections.length - 1 && (
            <Suspense
              fallback={
                <div className="flow-loading">Loading interactive canvas…</div>
              }
            >
              <FlowPlayground />
            </Suspense>
          )}
        </div>
      ))}
    </>
  );
}

/** Provides searchable Markdown documentation with a responsive reading layout. */
export default function App() {
  const requestedId =
    new URLSearchParams(window.location.search).get("doc") ?? "overview";
  const page = documents.find((item) => item.id === requestedId);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const groups = [...new Set(documents.map((item) => item.group))];
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? documents.filter((item) =>
        `${item.title} ${item.description} ${item.markdown}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : [];
  const pageIndex = documents.findIndex((item) => item.id === page?.id);
  const previous = documents[pageIndex - 1];
  const next = documents[pageIndex + 1];
  const headings = page ? headingsFor(page.markdown) : [];

  useEffect(() => {
    document.title = `${page?.title ?? "Page not found"} · Runlane`;
  }, [page?.title]);

  useEffect(() => {
    /** Focuses documentation search and closes transient navigation with Escape. */
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setMenuOpen(false);
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  /** Copies the current page and heading URL, reporting unsupported clipboard access. */
  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="icon-button mobile-menu-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="docs-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <XIcon size={20} /> : <ListIcon size={20} />}
          </button>
          <a className="brand" href="?doc=overview">
            <span className="brand-symbol">
              <GitBranchIcon size={21} weight="bold" />
            </span>
            <span>Runlane</span>
            <span className="brand-divider" />
            <span className="brand-docs">Docs</span>
          </a>
          <div className="header-search">
            <MagnifyingGlassIcon size={17} />
            <input
              ref={searchRef}
              type="search"
              aria-label="Search documentation"
              placeholder="Search docs…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
            {normalizedQuery && (
              <div className="search-results">
                <span className="search-caption">
                  {searchResults.length}{" "}
                  {searchResults.length === 1 ? "page" : "pages"} found
                </span>
                {searchResults.length === 0 ? (
                  <p>No matching pages. Try “trace”, “loop”, or “model”.</p>
                ) : (
                  searchResults.map((item) => (
                    <a href={`?doc=${item.id}`} key={item.id}>
                      <FileTextIcon size={17} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                      <ArrowRightIcon size={14} />
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
          <a href="?doc=decisions" className="header-status">
            <span className="tiny-dot amber" />
            Design preview<span className="version-label">v0.1</span>
          </a>
        </div>
      </header>
      <div className="site-shell">
        <aside
          id="docs-navigation"
          className={`sidebar${menuOpen ? " open" : ""}`}
        >
          <a className="sidebar-home" href="?doc=overview">
            <BookOpenIcon size={18} />
            Design documentation
          </a>
          <nav aria-label="Documentation">
            {groups.map((group) => (
              <div className="nav-group" key={group}>
                <h2>{group}</h2>
                {documents
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <a
                      href={`?doc=${item.id}`}
                      key={item.id}
                      aria-current={page?.id === item.id ? "page" : undefined}
                      className={
                        page?.id === item.id ? "nav-link active" : "nav-link"
                      }
                    >
                      {item.id === "react-flow" && <GitBranchIcon size={14} />}
                      {item.title}
                      {item.id === "react-flow" && (
                        <span className="nav-new">Demo</span>
                      )}
                    </a>
                  ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="tiny-dot green" />
            <div>
              <strong>Built from Markdown</strong>
              <p>
                Readable in the browser.
                <br />
                Editable in your repository.
              </p>
            </div>
          </div>
        </aside>
        {menuOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <main className="docs-main" id="main-content">
          {page ? (
            <>
              <div className="page-meta">
                <span>{page.group}</span>
                <span>/</span>
                <span>{page.title}</span>
                <span className="page-draft">Working design</span>
              </div>
              <article>
                <DocumentBody page={page} />
              </article>
              <div className="page-tools">
                <a href={page.sourceUrl} download={`${page.id}.md`}>
                  <CodeIcon size={15} />
                  View Markdown
                </a>
                <button type="button" onClick={copyPageLink}>
                  {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />}
                  {copied ? "Page link copied" : "Copy page link"}
                </button>
                {copyError && (
                  <span role="status">
                    Copy the page URL from your browser.
                  </span>
                )}
              </div>
              <nav
                className="page-pagination"
                aria-label="Adjacent documentation pages"
              >
                {previous ? (
                  <a href={`?doc=${previous.id}`}>
                    <ArrowLeftIcon size={17} />
                    <span>
                      <small>Previous</small>
                      {previous.title}
                    </span>
                  </a>
                ) : (
                  <span />
                )}
                {next ? (
                  <a href={`?doc=${next.id}`} className="next-page">
                    <span>
                      <small>Next</small>
                      {next.title}
                    </span>
                    <ArrowRightIcon size={17} />
                  </a>
                ) : (
                  <span />
                )}
              </nav>
              <footer className="page-footer">
                <span>Runlane design · September 2026</span>
                <span>Runtime implementation is still planned.</span>
              </footer>
            </>
          ) : (
            <div className="not-found">
              <span className="overline">Documentation</span>
              <h1>Page not found</h1>
              <p>This page is not in the documentation set.</p>
              <a className="button primary" href="?doc=overview">
                Back to overview <ArrowRightIcon size={16} />
              </a>
            </div>
          )}
        </main>
        <aside className="table-of-contents" aria-label="On this page">
          <span className="overline">On this page</span>
          <nav>
            {headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`}>
                {heading.title}
              </a>
            ))}
          </nav>
          <div className="toc-divider" />
          <a
            className="toc-source"
            href={page?.sourceUrl}
            download={page ? `${page.id}.md` : undefined}
          >
            <CodeIcon size={14} />
            Markdown source
          </a>
          <a className="toc-source" href="?doc=decisions">
            <BookOpenIcon size={14} />
            Team discussion
          </a>
        </aside>
      </div>
    </>
  );
}
