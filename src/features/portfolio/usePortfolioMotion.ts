import { type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Keep the supplied portfolio's motion inside its own root and scroll container. */
export function usePortfolioMotion(
  root: RefObject<HTMLDivElement | null>,
  scroller: RefObject<HTMLDivElement | null>,
) {
  useGSAP(() => {
    const element = root.current;
    const scrollElement = scroller.current;
    if (!element || !scrollElement) return;

    const find = (selector: string) => element.querySelector<HTMLElement>(selector)!;
    const select = (selector: string) => Array.from(element.querySelectorAll(selector));
    let disposed = false;
    let refreshFrame = 0;
    let introFinished = false;
    const refresh = () => {
      if (disposed || refreshFrame) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        if (!disposed) ScrollTrigger.refresh();
      });
    };

    const media = gsap.matchMedia(element);
    media.add({
      reduce: "(prefers-reduced-motion: reduce)",
      desktop: "(min-width: 768px)",
      mobile: "(max-width: 767px)",
    }, (context) => {
      const hero = find("#hero");
      const loader = find("#noemaLoader");
      const cta = find("#createcta");

      // Register this after the pins, so its end includes their added scroll space.
      const createCtaTrigger = () => {
        if (!cta) return;
        gsap.set(cta, { autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: element,
          scroller: scrollElement,
          start: "top 60%",
          end: () => ScrollTrigger.maxScroll(scrollElement) + 1,
          onToggle: (self) => {
            cta.style.opacity = self.isActive ? "1" : "0";
            cta.style.visibility = self.isActive ? "visible" : "hidden";
          },
        });
      };

      if (context.conditions?.reduce) {
        introFinished = true;
        gsap.set(loader, { autoAlpha: 0 });
        // These words are hidden in the source CSS until their timeline runs.
        gsap.set(select(".sweep-word"), { autoAlpha: 1 });
        createCtaTrigger();
        refresh();
        return;
      }

      const floating = gsap.to(select("#card2 [data-card-float]"), {
        y: 10, repeat: -1, yoyo: true, duration: 2.4, ease: "sine.inOut", paused: true,
      });
      const floatVisibility = ScrollTrigger.create({
        trigger: hero,
        scroller: scrollElement,
        start: "top bottom",
        end: () => `+=${hero.offsetHeight + scrollElement.clientHeight * 2.3}`,
        onToggle: (self) => {
          if (self.isActive && introFinished) floating.play();
          else floating.pause();
        },
      });

      if (introFinished) {
        gsap.set(loader, { autoAlpha: 0 });
        if (floatVisibility.isActive) floating.play();
      } else {
        gsap.set(loader, { autoAlpha: 1 });
        gsap.set(select("[data-card-intro], [data-word-intro], [data-copy-intro]"), { autoAlpha: 0 });
        gsap.set(select(".loader-letter"), { yPercent: 115, autoAlpha: 0 });
        gsap.set(select(".loader-tag, .loader-meta"), { y: 14, autoAlpha: 0 });
        gsap.set(select(".loader-mark svg path"), { strokeDasharray: 80, strokeDashoffset: 80 });
        gsap.set(select(".loader-scanline"), { scaleX: 0 });

        const intro = gsap.timeline({
          paused: true,
          defaults: { ease: "power3.out" },
          onComplete: () => {
            introFinished = true;
            if (floatVisibility.isActive) floating.play();
          },
        });
        intro
          .to(select(".loader-mark svg path"), { strokeDashoffset: 0, duration: 0.62, stagger: 0.08, ease: "power2.out" }, 0)
          .to(select(".loader-letter"), { yPercent: 0, autoAlpha: 1, duration: 0.64, stagger: 0.035, ease: "expo.out" }, 0.14)
          .to(select(".loader-tag"), { y: 0, autoAlpha: 1, duration: 0.44 }, 0.54)
          .to(select(".loader-meta"), { y: 0, autoAlpha: 1, duration: 0.42 }, 0.66)
          .to(select(".loader-brand"), { y: -22, scale: 0.94, duration: 0.52, ease: "power2.inOut" }, 1.05)
          .to(select(".loader-scanline"), { scaleX: 1, duration: 0.46, ease: "power2.inOut" }, 1.08)
          .to(select(".loader-strip"), { scaleY: 1, duration: 0.72, stagger: { each: 0.065, from: "start" }, ease: "expo.inOut" }, 1.16)
          .to(loader, { yPercent: -100, duration: 0.76, ease: "expo.inOut" }, 1.82)
          .fromTo(select("[data-word-intro]"), { autoAlpha: 0, y: 36, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.84, ease: "expo.out" }, 1.94)
          .fromTo(select("[data-card-intro]"), { y: 95, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.82, ease: "power3.out" }, 2.16)
          .fromTo(select("[data-copy-intro]"), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.62, ease: "power2.out" }, 2.38)
          .set(loader, { autoAlpha: 0 }, 2.58);

        ScrollTrigger.create({
          trigger: hero,
          scroller: scrollElement,
          start: "top 70%",
          end: "bottom top",
          onEnter: () => { intro.play(); },
          onLeave: () => { intro.progress(1); },
          once: true,
        });
      }

      // Taller sections first scroll naturally, then pin at their bottom edge.
      // The animation starts during that natural travel, so upper rows are visible.
      const pinnedTimeline = (id: string, screens: number) => {
        const section = find(`#${id}`);
        const travel = () => Math.max(0, section.offsetHeight - scrollElement.clientHeight);
        ScrollTrigger.create({
          trigger: section,
          scroller: scrollElement,
          start: () => travel() > 1 ? "bottom bottom" : "top top",
          end: () => `+=${scrollElement.clientHeight * screens}`,
          pin: section,
          invalidateOnRefresh: true,
        });
        return gsap.timeline({
          scrollTrigger: {
            trigger: section,
            scroller: scrollElement,
            start: "top top",
            end: () => `+=${travel() + scrollElement.clientHeight * screens}`,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      };

      pinnedTimeline("hero", 1.3)
        .to(find("#card1"), { x: "-16vw", y: "6vh", rotate: -16, ease: "none" }, 0)
        .to(find("#card3"), { x: "16vw", y: "-5vh", rotate: 16, ease: "none" }, 0)
        .to(find("#card2"), { y: "-9vh", rotate: 4, scale: 1.05, ease: "none" }, 0)
        .to(find("#heroWord"), { scale: 1.12, y: "-6vh", ease: "none" }, 0)
        .to(find("#heroCopy"), { autoAlpha: 0, y: 40, ease: "none" }, 0.3);

      pinnedTimeline("interlude", 1.3)
        .fromTo(find("#artistsWord"), { x: "24vw", rotate: 5 }, { x: "-58vw", rotate: -3, ease: "none" }, 0)
        .fromTo(find("#brush1"), { x: "-8vw", scale: 0.6, rotate: -20 }, { x: "6vw", scale: 1.15, rotate: 4, ease: "none" }, 0)
        .fromTo(find("#brush2"), { y: "14vh", scale: 0.5 }, { y: "-8vh", scale: 1.1, ease: "none" }, 0)
        .from(find("#interludeCopy"), { autoAlpha: 0, y: 40, ease: "none" }, 0.2);

      pinnedTimeline("product", 1.7)
        .fromTo(find("#walletPass"), { x: "-65vw", y: "24vh", rotate: -32 }, { x: 0, y: 0, rotate: -7, ease: "none" }, 0)
        .fromTo(find("#phoneMock"), { x: "65vw", y: "32vh", rotate: 28 }, { x: 0, y: 0, rotate: 7, ease: "none" }, 0.08)
        .fromTo(find("#theCardWord"), { y: "8vh", scale: 1.05 }, { y: "-8vh", scale: 1, ease: "none" }, 0)
        .to(find("#walletPass"), { y: "-4vh", rotate: -9, ease: "none" }, 0.7)
        .to(find("#phoneMock"), { y: "4vh", rotate: 9, ease: "none" }, 0.7);

      const messyStarts = [
        { x: "-36vw", y: "-28vh", rotate: -18, scale: 0.78 },
        { x: "26vw", y: "-34vh", rotate: 14, scale: 0.6 },
        { x: "-12vw", y: "32vh", rotate: 24, scale: 0.72 },
        { x: "36vw", y: "26vh", rotate: -22, scale: 0.68 },
        { x: "-42vw", y: "8vh", rotate: 10, scale: 0.58 },
        { x: "18vw", y: "-10vh", rotate: -12, scale: 0.78 },
        { x: "-22vw", y: "-3vh", rotate: 28, scale: 0.62 },
        { x: "42vw", y: "-4vh", rotate: -8, scale: 0.72 },
        { x: "-30vw", y: "24vh", rotate: -16, scale: 0.64 },
        { x: "30vw", y: "30vh", rotate: 18, scale: 0.7 },
      ];
      pinnedTimeline("manifesto", 1.7)
        .fromTo(select(".manifesto-word"), {
          x: (index) => messyStarts[index].x,
          y: (index) => messyStarts[index].y,
          rotate: (index) => messyStarts[index].rotate,
          scale: (index) => messyStarts[index].scale,
        }, { x: 0, y: 0, rotate: 0, scale: 1, stagger: 0.025, ease: "none" }, 0)
        .fromTo(find("#finallyWord"), { autoAlpha: 0, x: "-20vw", rotate: -30, scale: 0.5 }, { autoAlpha: 1, x: 0, rotate: -12, scale: 1, ease: "none" }, 0.55);

      const archiveGrid = find(".archive-grid");
      pinnedTimeline("archive", 1.9)
        .fromTo(select(".archive-img"), {
          // Layout offsets ignore the current tween transform during refresh.
          x: (_index: number, image: HTMLElement) => archiveGrid.clientWidth / 2 - image.offsetLeft - image.offsetWidth / 2,
          y: (_index: number, image: HTMLElement) => archiveGrid.clientHeight / 2 - image.offsetTop - image.offsetHeight / 2,
          scale: (index) => index === 7 ? 1.9 : 0.24,
          autoAlpha: (index) => index === 7 ? 1 : 0,
          rotate: (index) => (index - 7) * 3,
          zIndex: (index) => index === 7 ? 5 : 1,
        }, {
          x: 0, y: 0, scale: 1, autoAlpha: 1, rotate: 0,
          stagger: { each: 0.025, from: "center" }, ease: "none",
        }, 0)
        .fromTo(find("#archiveWord"), { y: "8vh", scale: 1.08 }, { y: "-8vh", scale: 0.98, ease: "none" }, 0);

      pinnedTimeline("builder", 1.8)
        .fromTo(find("#builderCard"), { x: "38vw", rotate: 8, scale: 0.9 }, { x: 0, rotate: 0, scale: 1, ease: "none" }, 0)
        .fromTo(find("#buildWord"), { x: "-8vw", y: "7vh" }, { x: "3vw", y: "-5vh", ease: "none" }, 0)
        .from(select(".builder-module"), {
          x: (index) => [140, -120, 90, -70, 110][index] ?? 80,
          y: (index) => [-40, 50, 20, -20, 40][index] ?? 20,
          autoAlpha: 0, scale: 0.92, stagger: 0.12, ease: "none",
        }, 0.18);

      pinnedTimeline("board", 1.7)
        .fromTo(select(".op-card"), {
          x: (index) => [-260, 80, 240, -120, 180, -200, 130][index] ?? 0,
          y: (index) => [-120, 180, -80, 150, -150, 110, 200][index] ?? 0,
          rotate: (index) => [-16, 12, -9, 18, -14, 8, 15][index] ?? 0,
          scale: 0.86, autoAlpha: 0.35,
        }, { x: 0, y: 0, rotate: 0, scale: 1, autoAlpha: 1, stagger: 0.035, ease: "none" }, 0)
        .fromTo(find("#boardWord"), { xPercent: -58, yPercent: -50, rotate: -4 }, { xPercent: -48, yPercent: -50, rotate: 3, ease: "none" }, 0);

      const supportSteps = select(".support-step");
      pinnedTimeline("support", 1.7)
        .fromTo(supportSteps[0], { x: "-50vw", y: "8vh", rotate: -9, autoAlpha: 0 }, { x: 0, y: 0, rotate: 0, autoAlpha: 1, ease: "none" }, 0)
        .fromTo(supportSteps[1], { scale: 0.62, y: "18vh", autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, ease: "none" }, 0.18)
        .fromTo(supportSteps[2], { x: "50vw", y: "-8vh", rotate: 9, autoAlpha: 0 }, { x: 0, y: 0, rotate: 0, autoAlpha: 1, ease: "none" }, 0.36)
        .fromTo(find("#notifyCard"), { x: "34vw", y: "10vh", rotate: 8, scale: 0.82, autoAlpha: 0 }, { x: 0, y: 0, rotate: -2, scale: 1, autoAlpha: 1, ease: "none" }, 0.62)
        .fromTo(find("#supportWord"), { y: "8vh", scale: 1.1 }, { y: "-7vh", scale: 0.98, ease: "none" }, 0);

      pinnedTimeline("cta-build", 1.6)
        .fromTo(find("#seenWord"), { x: "-110vw", autoAlpha: 1 }, { x: 0, autoAlpha: 1, ease: "none" }, 0)
        .to(find("#seenWord"), { x: "110vw", autoAlpha: 0, ease: "none" }, 0.32)
        .to(find("#wipeRose"), { scaleY: 1, ease: "none" }, 0.24)
        .fromTo(find("#savedWord"), { y: "110vh", autoAlpha: 1 }, { y: 0, autoAlpha: 1, ease: "none" }, 0.34)
        .to(find("#savedWord"), { y: "-110vh", autoAlpha: 0, ease: "none" }, 0.64)
        .to(find("#wipeEmerald"), { scaleX: 1, ease: "none" }, 0.58)
        .fromTo(find("#supportedWord"), { x: "120vw", autoAlpha: 1 }, { x: 0, autoAlpha: 1, ease: "none" }, 0.68)
        .to(find("#supportedWord"), { scale: 1.12, autoAlpha: 0, ease: "none" }, 0.96);

      gsap.timeline({
        scrollTrigger: {
          trigger: find("#join"), scroller: scrollElement,
          start: "top 85%", end: "top 10%", scrub: 1, invalidateOnRefresh: true,
        },
      })
        .fromTo(find("#joinWord"), { y: "14vh" }, { y: 0, ease: "none" }, 0)
        .from(select(".member"), { scale: 0, rotate: -20, stagger: 0.06, ease: "none" }, 0.1)
        .from(find("#yourCardWord"), { autoAlpha: 0, scale: 0.4, rotate: -40, ease: "none" }, 0.4)
        .from(select("#handArrow path"), { strokeDasharray: 200, strokeDashoffset: 200, ease: "none" }, 0.5);

      createCtaTrigger();
      refresh();
    });

    const images = Array.from(element.querySelectorAll("img"));
    images.forEach((image) => {
      image.addEventListener("load", refresh);
      image.addEventListener("error", refresh);
    });
    void document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    // Observe the viewport, not pin spacers: refreshing spacers changes their size.
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(scrollElement);
    refresh();

    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      resizeObserver.disconnect();
      document.fonts.removeEventListener("loadingdone", refresh);
      images.forEach((image) => {
        image.removeEventListener("load", refresh);
        image.removeEventListener("error", refresh);
      });
      media.revert();
    };
  }, { scope: root, dependencies: [root, scroller], revertOnUpdate: true });
}
