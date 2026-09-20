import { SiteHeader } from "../../components/layout/SiteHeader";
import { KeyboardHero } from "../../features/keyboard/scene/KeyboardHero";
import "./HomePage.css";

type PlaceholderPageProps = Readonly<{ title: string }>;

export function HomePage() {
  return <main className="home-shell" id="main-content" tabIndex={-1}>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    <h1 className="sr-only">Keychron K2 HE 交互体验</h1>
    <div className="home-keyboard"><KeyboardHero /></div>
  </main>;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return <main className="placeholder-shell" id="main-content" tabIndex={-1}>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    <SiteHeader />
    <section className="placeholder-content">
      <h1>{title}</h1><p>内容正在整理</p>
      <a className="return-home" href="/">返回首页</a>
    </section>
  </main>;
}
