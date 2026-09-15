export function SiteHeader() {
  return (
    <header className="site-header" data-site-header>
      <a className="site-brand" href="/">PRINCE / DIGITAL GARDEN</a>
      <nav aria-label="主要导航" className="site-nav">
        <a href="/work">WORK</a>
        <a href="/notes">NOTES</a>
        <a href="/about">ABOUT</a>
      </nav>
    </header>
  );
}
