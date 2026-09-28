import { useRef, type MouseEvent, type RefObject } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PortfolioIcon } from "./PortfolioIcon";
import { usePortfolioMotion } from "./usePortfolioMotion";
import assets from "./asset-map.json";
import "./PortfolioExperience.css";

/** The supplied creative-portfolio1.html, embedded below the existing portrait. */
export default function PortfolioExperience({ scroller }: { scroller: RefObject<HTMLDivElement | null> }) {
  const root = useRef<HTMLDivElement>(null);
  usePortfolioMotion(root, scroller);
  const navigate = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor || !root.current || !scroller.current) return;
    const id = anchor.getAttribute("href")!.slice(1);
    // The reference's unfinished footer links stay local, without resetting the portrait.
    if (!id) { event.preventDefault(); return; }
    const target = root.current.querySelector<HTMLElement>(`[id="${id}"]`);
    if (!target) return;
    event.preventDefault();
    const pin = ScrollTrigger.getAll().find(trigger => trigger.pin === target);
    const top = pin?.start ?? target.getBoundingClientRect().top - scroller.current.getBoundingClientRect().top + scroller.current.scrollTop;
    scroller.current.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div ref={root} className="creative-portfolio" onClick={navigate}>
    <div className="creative-cta-rail">
      <a href="#join" id="createcta" className="creative-create-cta bottom-5 right-5 md:bottom-8 md:right-8 z-[65] group flex items-center gap-8 bg-black text-white border border-white/25 pl-6 pr-2 py-2 hover:bg-neutral-800 transition-colors">
        <span className="text-sm font-medium">
          {"Create Card"}
        </span>
        <span className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center group-hover:rotate-45 transition-transform duration-300">
          <PortfolioIcon name="arrow-up-right" className="w-4 h-4" strokeWidth="1.5" />
        </span>
      </a>
    </div>
    <section id="hero" className="poster-section h-screen bg-[#4F46E5] divider-grid">
      <div id="noemaLoader" className="noema-loader" aria-hidden="true">
        <div className="loader-grid" />
        <div className="loader-mark">
          <svg viewBox="0 0 42 18" fill="none" aria-hidden="true">
            <path d="M3 9C8 1.8 14 1.8 21 9C28 16.2 34 16.2 39 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M3 9C8 16.2 14 16.2 21 9C28 1.8 34 1.8 39 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          </svg>
        </div>
        <div className="loader-brand">
          <div className="loader-brand-main" aria-label="NOEMA.ART">
            <span className="loader-letter">
              {"N"}
            </span>
            <span className="loader-letter">
              {"O"}
            </span>
            <span className="loader-letter">
              {"E"}
            </span>
            <span className="loader-letter">
              {"M"}
            </span>
            <span className="loader-letter">
              {"A"}
            </span>
            <span className="loader-letter loader-dot">
              {"."}
            </span>
            <span className="loader-letter">
              {"A"}
            </span>
            <span className="loader-letter">
              {"R"}
            </span>
            <span className="loader-letter">
              {"T"}
            </span>
          </div>
          <div className="loader-tag">
            {"Where your practice lives"}
          </div>
        </div>
        <div className="loader-meta">
          <span>
            {"001 / Portfolio OS"}
          </span>
          <span>
            {"Loading creative presence"}
          </span>
        </div>
        <div className="loader-strips">
          <span className="loader-strip" />
          <span className="loader-strip" />
          <span className="loader-strip" />
          <span className="loader-strip" />
          <span className="loader-strip" />
          <span className="loader-strip" />
          <span className="loader-strip" />
        </div>
        <div className="loader-scanline" />
      </div>
      <div id="heroWord" className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2 className="display text-white text-[28vw] md:text-[22vw] leading-none tracking-[-0.055em] whitespace-nowrap select-none" data-word-intro="">
          {"NOEMA.ART"}
        </h2>
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10" style={{"perspective": "1400px"}}>
        <div className="relative w-full max-w-5xl h-[62vh] flex items-center justify-center">
          <article id="card1" className="absolute w-40 sm:w-48 md:w-56 -translate-x-[58%] sm:-translate-x-[112%] will-change-transform" style={{"transform": "rotateY(22deg) rotateZ(-8deg)"}}>
            <div data-card-intro="">
              <div className="profile-card soft-sheen relative overflow-hidden p-4">
                <p className="display text-base leading-tight tracking-tight">
                  {"Mira"}
                  <br />
                  {"Saint"}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {"Artist · Montréal"}
                </p>
                <img src={assets["https://i.pravatar.cc/300?img=12"]} alt="Mira Saint" className="w-full aspect-square object-cover mt-3 grayscale" loading="lazy" decoding="async" />
                <button className="mt-3 w-full text-xs font-medium bg-white text-black rounded-full py-1.5" type="button">
                  {"Support Artist"}
                </button>
                <div className="mt-2 flex items-center justify-center gap-1.5 border border-white/30 rounded-md py-1.5">
                  <PortfolioIcon name="wallet" className="w-3.5 h-3.5" strokeWidth="1.5" />
                  <span className="text-xs">
                    {"Add to Apple Wallet"}
                  </span>
                </div>
              </div>
            </div>
          </article>
          <article id="card2" className="absolute w-44 sm:w-52 md:w-60 z-10 will-change-transform" style={{"transform": "rotateY(-4deg) rotateZ(2deg)"}}>
            <div data-card-intro="">
              <div data-card-float="">
                <div className="profile-card soft-sheen relative overflow-hidden p-4 shadow-[0_50px_80px_rgba(0,0,0,0.52)]">
                  <p className="display text-lg leading-tight tracking-tight">
                    {"Leigh"}
                    <br />
                    {"Witherell"}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    {"Painter · London"}
                  </p>
                  <img src={assets["https://i.pravatar.cc/300?img=47"]} alt="Leigh Witherell" className="w-full aspect-square object-cover mt-3 grayscale" loading="lazy" decoding="async" />
                  <button className="mt-3 w-full text-xs font-medium bg-white text-black rounded-full py-1.5" type="button">
                    {"Support Artist"}
                  </button>
                  <div className="mt-2 flex items-center justify-center gap-1.5 border border-white/30 rounded-md py-1.5">
                    <PortfolioIcon name="wallet" className="w-3.5 h-3.5" strokeWidth="1.5" />
                    <span className="text-xs">
                      {"Add to Apple Wallet"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article id="card3" className="absolute w-40 sm:w-48 md:w-56 translate-x-[58%] sm:translate-x-[112%] will-change-transform" style={{"transform": "rotateY(-22deg) rotateZ(9deg)"}}>
            <div data-card-intro="">
              <div className="profile-card soft-sheen relative overflow-hidden p-4 shadow-[-30px_40px_60px_rgba(0,0,0,0.45)]">
                <p className="display text-base leading-tight tracking-tight">
                  {"Glass Room"}
                  <br />
                  {"Archive"}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {"Curator · Berlin"}
                </p>
                <img src={assets["https://picsum.photos/seed/glassroom/300/300"]} alt="Glass Room Archive" className="w-full aspect-square object-cover mt-3 grayscale" loading="lazy" decoding="async" />
                <button className="mt-3 w-full text-xs font-medium bg-white text-black rounded-full py-1.5" type="button">
                  {"Support Artist"}
                </button>
                <div className="mt-2 flex items-center justify-center gap-1.5 border border-white/30 rounded-md py-1.5">
                  <PortfolioIcon name="wallet" className="w-3.5 h-3.5" strokeWidth="1.5" />
                  <span className="text-xs">
                    {"Add to Apple Wallet"}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
      <div id="heroCopy" className="absolute bottom-0 left-0 right-0 border-t border-white/40 z-20">
        <div className="px-5 md:px-8 py-5 flex items-end justify-between text-white" data-copy-intro="">
          <p className="text-base md:text-lg font-medium leading-snug max-w-sm">
            {"One card for your work, your story, and your next opportunity."}
          </p>
          <PortfolioIcon name="arrow-down" className="w-5 h-5 mb-1 animate-bounce" strokeWidth="1.5" />
        </div>
      </div>
    </section>
    <section id="interlude" className="poster-section h-screen bg-[#10B981] divider-grid dark-lines">
      <div id="interludeWipe" className="absolute -top-[8vw] left-0 right-0 h-[18vw] -rotate-2 origin-left bg-[#10B981] z-10" />
      <div id="brush1" className="absolute top-[55%] left-[8%] w-[34vw] h-[14vw] rounded-[50%] border-[1.2vw] opacity-85 -rotate-6 border-[#4F46E5] z-10" />
      <div id="brush2" className="absolute top-[30%] right-[10%] w-[18vw] h-[18vw] rounded-full blur-[2px] bg-[#F43F5E]/80 z-10" />
      <div className="absolute inset-0 flex items-center overflow-hidden z-20">
        <h2 id="artistsWord" className="display text-black text-[29vw] md:text-[24vw] leading-none tracking-[-0.06em] whitespace-nowrap select-none will-change-transform">
          {"ARTISTS CURATORS"}
        </h2>
      </div>
      <div id="interludeCopy" className="absolute bottom-0 left-0 right-0 border-t border-black/25 z-30">
        <div className="px-5 md:px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
          <p className="text-base font-semibold">
            {"For creators, designers and artists."}
          </p>
          <p className="text-base text-black/70 md:col-span-2 max-w-md">
            {"A living card for exhibitions, contact, bookings, press and support. Carried in every pocket."}
          </p>
        </div>
      </div>
    </section>
    <section id="product" className="poster-section h-screen bg-[#F43F5E] divider-grid dark-lines">
      <div id="theCardWord" className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform z-0">
        <h2 className="display text-black text-[30vw] md:text-[25vw] leading-none tracking-[-0.06em] whitespace-nowrap select-none">
          {"THE LINK"}
        </h2>
      </div>
      <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-center gap-9 md:gap-[14vw] pt-12 z-10" style={{"perspective": "1600px"}}>
        <article id="walletPass" className="w-56 md:w-64 will-change-transform">
          <div className="p-5 shadow-[20px_40px_70px_rgba(0,0,0,0.42)] relative overflow-hidden bg-[#4F46E5]" style={{"transform": "rotateY(14deg)"}}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/22 via-transparent to-black/20 pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <p className="display text-xs text-black uppercase tracking-tight">
                {"NOEMA.ART"}
              </p>
              <span className="text-xs text-black/70">
                {"PASS"}
              </span>
            </div>
            <div className="relative mt-4 border-t border-black/20 pt-4">
              <p className="display text-xl text-black leading-tight tracking-tight">
                {"Leigh"}
                <br />
                {"Witherell"}
              </p>
              <p className="text-xs text-black/70 mt-1">
                {"Painter · UK, London"}
              </p>
            </div>
            <div className="relative mt-5 bg-white p-3 flex items-center justify-center">
              <img src={assets["https://aura.collectui.pro/__mi/hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg"]} alt="QR code" className="w-32 h-32" loading="lazy" decoding="async" />
            </div>
            <div className="relative mt-4 flex items-center justify-between text-xs text-black/80">
              <span>
                {"noema.art/leigh"}
              </span>
              <PortfolioIcon name="scan-line" className="w-4 h-4" strokeWidth="1.5" />
            </div>
          </div>
        </article>
        <article id="phoneMock" className="w-56 md:w-64 will-change-transform">
          <div className="bg-black p-2 shadow-[-20px_40px_70px_rgba(0,0,0,0.45)] rounded-md" style={{"transform": "rotateY(-12deg)"}}>
            <div className="bg-neutral-950 text-white overflow-hidden">
              <img src={assets["https://picsum.photos/seed/noema-hero-art/500/280"]} alt="Artwork" className="w-full h-28 object-cover opacity-90" loading="lazy" decoding="async" />
              <div className="p-4 -mt-8 relative">
                <img src={assets["https://i.pravatar.cc/120?img=47"]} alt="Portrait" className="w-14 h-14 object-cover border-2 border-black grayscale" loading="lazy" decoding="async" />
                <p className="display text-base mt-3 tracking-tight">
                  {"Leigh Witherell"}
                </p>
                <p className="text-xs text-white/60">
                  {"Painter — large-scale oil works"}
                </p>
                <button className="mt-4 w-full text-xs font-medium bg-white text-black rounded-full py-2" type="button">
                  {"Support Artist"}
                </button>
                <div className="mt-2 flex items-center justify-center gap-1.5 border border-white/30 rounded-md py-2">
                  <PortfolioIcon name="wallet" className="w-3.5 h-3.5" strokeWidth="1.5" />
                  <span className="text-xs">
                    {"Add to Apple Wallet"}
                  </span>
                </div>
                <div className="mt-4 space-y-px">
                  <button className="w-full flex items-center justify-between text-xs py-2.5 px-3 bg-white/5 hover:bg-white/10 transition-colors" type="button">
                    <span>
                      {"Book studio visit"}
                    </span>
                    <PortfolioIcon name="arrow-right" className="w-3.5 h-3.5" strokeWidth="1.5" />
                  </button>
                  <button className="w-full flex items-center justify-between text-xs py-2.5 px-3 bg-white/5 hover:bg-white/10 transition-colors" type="button">
                    <span>
                      {"Get in touch"}
                    </span>
                    <PortfolioIcon name="arrow-right" className="w-3.5 h-3.5" strokeWidth="1.5" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-1">
                  <img src={assets["https://picsum.photos/seed/noema-a1/120/120"]} className="aspect-square object-cover" alt="" loading="lazy" decoding="async" />
                  <img src={assets["https://picsum.photos/seed/noema-a2/120/120"]} className="aspect-square object-cover" alt="" loading="lazy" decoding="async" />
                  <img src={assets["https://picsum.photos/seed/noema-a3/120/120"]} className="aspect-square object-cover" alt="" loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <div className="absolute bottom-0 left-0 right-0 border-t border-black/25 z-20">
        <div className="px-5 md:px-8 py-5 flex items-end justify-between text-black">
          <p className="text-base font-semibold max-w-xs leading-snug">
            {"A digital pass and a living profile. Everywhere you are."}
          </p>
          <p className="text-xs text-black/60 hidden sm:block">
            {"Scan · Save · Support"}
          </p>
        </div>
      </div>
    </section>
    <section id="manifesto" className="poster-section h-screen bg-[#f4efe7] divider-grid dark-lines flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.24),transparent_32%),radial-gradient(circle_at_80%_72%,rgba(244,63,94,0.22),transparent_30%)]" />
      <div className="relative z-10 manifesto-sentence text-black">
        <span className="manifesto-word">
          {"Everything"}
        </span>
        <span className="manifesto-word">
          {"your"}
        </span>
        <span className="manifesto-word">
          {"creative"}
        </span>
        <span className="manifesto-word">
          {"practice"}
        </span>
        <span className="manifesto-word">
          {"needs,"}
        </span>
        <span className="manifesto-word">
          {"gathered"}
        </span>
        <span className="manifesto-word">
          {"into"}
        </span>
        <span className="manifesto-word">
          {"one"}
        </span>
        <span className="manifesto-word">
          {"living"}
        </span>
        <span className="manifesto-word">
          {"portfolio."}
        </span>
      </div>
      <span id="finallyWord" className="hand absolute z-20 text-[#F43F5E] text-[18vw] md:text-[10vw] left-[18%] top-[55%] -rotate-12 select-none">
        {"finally"}
      </span>
      <div className="absolute top-[12%] left-[8%] display text-[9vw] leading-none text-black/5 rotate-[-8deg]">
        {"PORTFOLIO LINKS SUPPORT BOOKINGS CONTACT GALLERY PRESS PRACTICE STUDIO COMMUNITY"}
      </div>
      <p className="section-label text-black/60">
        {"04 / Manifesto"}
      </p>
    </section>
    <section id="archive" className="poster-section h-screen bg-black divider-grid flex items-center justify-center px-5">
      <h2 id="archiveWord" className="huge-word absolute z-0 text-white/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {"ARCHIVE"}
      </h2>
      <div className="archive-grid">
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-01/480/600"]} alt="Artwork archive 01" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-02/480/600"]} alt="Artwork archive 02" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-03/480/600"]} alt="Artwork archive 03" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-04/480/600"]} alt="Artwork archive 04" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-05/480/600"]} alt="Artwork archive 05" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-06/480/600"]} alt="Artwork archive 06" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-07/480/600"]} alt="Artwork archive 07" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-08/480/600"]} alt="Artwork archive 08" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-09/480/600"]} alt="Artwork archive 09" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-10/480/600"]} alt="Artwork archive 10" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-11/480/600"]} alt="Artwork archive 11" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-12/480/600"]} alt="Artwork archive 12" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-13/480/600"]} alt="Artwork archive 13" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-14/480/600"]} alt="Artwork archive 14" loading="lazy" decoding="async" />
        <img className="archive-img" src={assets["https://picsum.photos/seed/archive-15/480/600"]} alt="Artwork archive 15" loading="lazy" decoding="async" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/25 z-10">
        <div className="px-5 md:px-8 py-5 flex items-end justify-between text-white">
          <p className="text-base font-semibold max-w-sm leading-snug">
            {"From one focused work to a complete creative archive."}
          </p>
          <p className="text-xs text-white/55 hidden sm:block">
            {"3 × 5 living gallery"}
          </p>
        </div>
      </div>
    </section>
    <section id="builder" className="poster-section h-screen bg-[#f4efe7] divider-grid dark-lines">
      <h2 id="buildWord" className="huge-word absolute left-[-4vw] top-1/2 -translate-y-1/2 z-0 text-black">
        {"BUILD"}
      </h2>
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center gap-8 px-5 md:px-8 pt-24 pb-20">
        <div className="hidden lg:block" />
        <article id="builderCard" className="builder-shell ml-auto overflow-hidden">
          <header className="p-5 flex items-start justify-between border-b border-white/20">
            <div>
              <p className="display text-3xl tracking-tight leading-none">
                {"NOEMA PROFILE"}
              </p>
              <p className="text-xs text-white/55 mt-2">
                {"Live card system / v.01"}
              </p>
            </div>
            <PortfolioIcon name="scan-face" className="w-5 h-5 text-white/60" strokeWidth="1.5" />
          </header>
          <div className="builder-module p-5" data-number="01">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {"Bio"}
            </p>
            <p className="mt-2 text-sm text-white/82 max-w-xs">
              {"Painter working with gesture, memory and public space."}
            </p>
          </div>
          <div className="builder-module p-5" data-number="02">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {"Gallery"}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <img src={assets["https://picsum.photos/seed/build-a/120/120"]} alt="" className="aspect-square object-cover grayscale" loading="lazy" decoding="async" />
              <img src={assets["https://picsum.photos/seed/build-b/120/120"]} alt="" className="aspect-square object-cover grayscale" loading="lazy" decoding="async" />
              <img src={assets["https://picsum.photos/seed/build-c/120/120"]} alt="" className="aspect-square object-cover grayscale" loading="lazy" decoding="async" />
              <img src={assets["https://picsum.photos/seed/build-d/120/120"]} alt="" className="aspect-square object-cover grayscale" loading="lazy" decoding="async" />
            </div>
          </div>
          <div className="builder-module grid grid-cols-2" data-number="03">
            <button className="p-5 text-left border-r border-white/15 bg-white text-black text-sm font-semibold" type="button">
              {"Support"}
            </button>
            <button className="p-5 text-left text-sm font-semibold" type="button">
              {"Contact"}
            </button>
          </div>
          <div className="builder-module grid grid-cols-2" data-number="04">
            <button className="p-5 text-left text-sm font-semibold border-r border-white/15" type="button">
              {"Bookings"}
            </button>
            <button className="p-5 text-left text-sm font-semibold" type="button">
              {"Press"}
            </button>
          </div>
          <div className="builder-module p-5 flex items-center justify-between" data-number="05">
            <span className="text-sm font-semibold">
              {"Wallet pass"}
            </span>
            <span className="flex items-center gap-2 text-xs border border-white/25 px-3 py-2 rounded-md">
              <PortfolioIcon name="wallet" className="w-3.5 h-3.5" />
              {"Add"}
            </span>
          </div>
        </article>
      </div>
      <div className="absolute left-5 md:left-8 top-[26%] z-20 hidden md:block">
        <p className="display text-[11vw] leading-none tracking-[-0.055em] text-[#4F46E5]">
          {"01"}
        </p>
        <p className="text-xs uppercase tracking-[0.18em] max-w-[180px]">
          {"Assembled in real time as the page moves."}
        </p>
      </div>
    </section>
    <section id="board" className="poster-section min-h-screen bg-[#10B981] divider-grid dark-lines px-5 md:px-8 pt-28 pb-16 flex items-center">
      <h2 id="boardWord" className="huge-word absolute z-0 text-black/18 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {"BOARD"}
      </h2>
      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <article className="op-card">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {"Exhibition"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Open Call:"}
              <br />
              {"New Forms"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-white/58">
            <span>
              {"Montréal"}
              <br />
              {"Aug 12"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
        <article className="op-card">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {"Community"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Studio Visit"}
              <br />
              {"Night"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-white/58">
            <span>
              {"Toronto"}
              <br />
              {"Jul 04"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
        <article className="op-card">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {"Funding"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Emerging"}
              <br />
              {"Artist Grant"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-white/58">
            <span>
              {"Online"}
              <br />
              {"Sep 18"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
        <article className="op-card">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {"Collab"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Print"}
              <br />
              {"Exchange"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-white/58">
            <span>
              {"Brooklyn"}
              <br />
              {"Jul 22"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
        <article className="op-card lg:col-start-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {"Residency"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Quiet Room"}
              <br />
              {"Program"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-white/58">
            <span>
              {"Copenhagen"}
              <br />
              {"Oct 08"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
        <article className="op-card">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {"Mentorship"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Crit Circle"}
              <br />
              {"Online"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-white/58">
            <span>
              {"Remote"}
              <br />
              {"Aug 01"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
        <article className="op-card bg-[#F43F5E] text-black border-black/20">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/55">
              {"Studio"}
            </p>
            <h3 className="display text-3xl leading-none mt-3">
              {"Shared"}
              <br />
              {"Press Wall"}
            </h3>
          </div>
          <div className="flex items-end justify-between text-xs text-black/65">
            <span>
              {"Paris"}
              <br />
              {"Jul 30"}
            </span>
            <PortfolioIcon name="arrow-up-right" className="w-4 h-4" />
          </div>
        </article>
      </div>
      <svg className="absolute inset-0 w-full h-full z-[2] opacity-40 pointer-events-none" fill="none" stroke="black" strokeWidth="1">
        <path d="M90 220 C 360 110, 690 420, 1040 190" stroke-dasharray="6 10" />
        <path d="M120 680 C 420 520, 760 740, 1160 480" stroke-dasharray="6 10" />
      </svg>
    </section>
    <section id="support" className="poster-section h-screen bg-[#4F46E5] divider-grid px-5 md:px-8 flex items-center">
      <h2 id="supportWord" className="huge-word absolute z-0 text-black/35 left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
        {"SUPPORT"}
      </h2>
      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 pt-20 pb-20">
        <article className="support-panel support-step">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {"01 / Visitor"}
          </p>
          <h3 className="display text-5xl md:text-6xl leading-none mt-6">
            {"DISCOVERED"}
          </h3>
          <p className="text-sm text-white/58 mt-6 max-w-[220px]">
            {"Someone scans your card after a show, post, talk or studio visit."}
          </p>
        </article>
        <article className="support-panel support-step bg-white text-black">
          <p className="text-xs uppercase tracking-[0.2em] text-black/45">
            {"02 / Action"}
          </p>
          <h3 className="display text-5xl md:text-6xl leading-none mt-6">
            {"SUPPORTED"}
          </h3>
          <button className="mt-8 w-full bg-black text-white text-sm font-semibold py-3 rounded-full" type="button">
            {"Support Artist"}
          </button>
        </article>
        <article className="support-panel support-step">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {"03 / Creator"}
          </p>
          <h3 className="display text-5xl md:text-6xl leading-none mt-6">
            {"BACKED"}
          </h3>
          <p className="text-sm text-white/58 mt-6 max-w-[220px]">
            {"Support lands directly inside your creative practice."}
          </p>
        </article>
      </div>
      <div id="notifyCard" className="absolute z-20 right-5 md:right-[9vw] bottom-[16vh] w-72 bg-white text-black p-4 shadow-[20px_24px_70px_rgba(0,0,0,0.38)] border border-black/10">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-black/45">
            {"New support received"}
          </p>
          <PortfolioIcon name="sparkles" className="w-4 h-4" />
        </div>
        <p className="display text-4xl leading-none mt-4">
          {"$25"}
        </p>
        <p className="text-sm font-semibold mt-1">
          {"from Maya Chen"}
        </p>
        <p className="text-xs text-black/55 mt-2">
          {"For your studio practice"}
        </p>
      </div>
    </section>
    <section id="cta-build" className="poster-section h-screen bg-black">
      <div id="wipeRose" className="absolute inset-0 bg-[#F43F5E] origin-bottom scale-y-0" />
      <div id="wipeEmerald" className="absolute inset-0 bg-[#10B981] origin-left scale-x-0" />
      <div className="sweep-word text-white" id="seenWord">
        {"SEEN"}
      </div>
      <div className="sweep-word text-black" id="savedWord">
        {"SAVED"}
      </div>
      <div className="sweep-word text-white" id="supportedWord">
        {"SUPPORTED"}
      </div>
    </section>
    <section id="join" className="poster-section min-h-screen w-full z-10 flex flex-col bg-[#4F46E5] divider-grid dark-lines">
      <div className="relative flex-1 min-h-[88vh]">
        <div className="absolute inset-0 flex items-center justify-center md:justify-start md:pl-[4vw] overflow-hidden z-0">
          <h2 id="joinWord" className="display text-black text-[44vw] md:text-[32vw] leading-none tracking-[-0.07em] select-none will-change-transform">
            {"CREATE"}
          </h2>
        </div>
        <span id="yourCardWord" className="hand absolute text-white text-[15vw] md:text-[8vw] left-[28%] md:left-[36%] top-[45%] -rotate-12 select-none drop-shadow-lg z-10">
          {"your card"}
        </span>
        <img src={assets["https://i.pravatar.cc/120?img=15"]} className="member absolute w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white object-cover left-[14%] top-[28%] shadow-xl z-10" alt="" loading="lazy" decoding="async" />
        <img src={assets["https://i.pravatar.cc/120?img=32"]} className="member absolute w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white object-cover left-[30%] top-[68%] shadow-xl z-10" alt="" loading="lazy" decoding="async" />
        <img src={assets["https://i.pravatar.cc/120?img=5"]} className="member absolute w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white object-cover left-[52%] top-[24%] shadow-xl z-10" alt="" loading="lazy" decoding="async" />
        <img src={assets["https://i.pravatar.cc/120?img=58"]} className="member absolute w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white object-cover left-[8%] top-[58%] shadow-xl z-10" alt="" loading="lazy" decoding="async" />
        <img src={assets["https://i.pravatar.cc/120?img=23"]} className="member absolute w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white object-cover left-[44%] top-[78%] shadow-xl z-10" alt="" loading="lazy" decoding="async" />
        <img src={assets["https://i.pravatar.cc/120?img=68"]} className="member absolute w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white object-cover left-[24%] top-[12%] shadow-xl z-10" alt="" loading="lazy" decoding="async" />
        <div className="absolute right-5 md:right-[8vw] top-[23%] md:top-[31%] max-w-xs text-black z-20">
          <p className="text-lg md:text-xl font-semibold leading-snug">
            {"Create your NOEMA card and share your practice wherever it is seen."}
          </p>
          <svg id="handArrow" viewBox="0 0 120 90" className="w-24 md:w-32 mt-6 ml-auto text-black" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 10 C 40 20, 70 40, 100 72" />
            <path d="M86 68 L 102 74 L 96 56" />
          </svg>
        </div>
      </div>
      <footer className="relative border-t border-black/25 z-20">
        <div className="px-5 md:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
          <div>
            <p className="text-sm font-semibold">
              {"2026 © NOEMA.ART"}
            </p>
            <a href="mailto:hello@noema.art" className="text-sm underline underline-offset-2 hover:opacity-60 transition-opacity">
              {"hello@noema.art"}
            </a>
            <div className="flex items-center gap-3 mt-3">
              <a href="#" className="hover:opacity-60 transition-opacity" aria-label="Instagram">
                <PortfolioIcon name="instagram" className="w-4 h-4" strokeWidth="1.5" />
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity" aria-label="LinkedIn">
                <PortfolioIcon name="linkedin" className="w-4 h-4" strokeWidth="1.5" />
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity" aria-label="YouTube">
                <PortfolioIcon name="youtube" className="w-4 h-4" strokeWidth="1.5" />
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity" aria-label="Email">
                <PortfolioIcon name="at-sign" className="w-4 h-4" strokeWidth="1.5" />
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <a href="#" className="hover:opacity-60 transition-opacity">
              {"Brand Kit"}
            </a>
            <a href="#" className="hover:opacity-60 transition-opacity">
              {"Gift Card"}
            </a>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <a href="#" className="hover:opacity-60 transition-opacity">
              {"Terms & Conditions"}
            </a>
            <a href="#" className="hover:opacity-60 transition-opacity">
              {"Privacy Policy"}
            </a>
            <a href="#" className="hover:opacity-60 transition-opacity">
              {"Cookie Policy"}
            </a>
          </div>
        </div>
      </footer>
    </section>
  </div>;
}
