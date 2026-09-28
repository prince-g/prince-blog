from html.parser import HTMLParser
from pathlib import Path
import json, re

base = Path('E:/project/front/prince-blog')
source = Path('E:/download/creative-portfolio1.html').read_text(encoding='utf-8')
void = {'img','br','hr','meta','link','input','source'}
class Node:
    def __init__(self, tag, attrs=(), children=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), list(children)
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('root'); self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs); self.stack[-1].children.append(n)
        if tag not in void: self.stack.append(n)
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag, attrs)
    def handle_endtag(self, tag):
        if self.stack[-1].tag == tag: self.stack.pop()
    def handle_data(self, data):
        if data.strip(): self.stack[-1].children.append(re.sub(r'\s+', ' ', data).strip())
p = Parser(); p.feed(source)
def walk(n):
    if isinstance(n,str): return
    yield n
    for child in n.children: yield from walk(child)
nodes = list(walk(p.root))
body = next(n for n in nodes if n.tag == 'body')
sections = [n for n in body.children if isinstance(n,Node) and n.tag == 'section']
loader = next(n for n in nodes if n.attrs.get('id') == 'noemaLoader')
cta = next(n for n in nodes if n.attrs.get('id') == 'createcta')
cta.attrs['class'] = cta.attrs['class'].replace('fixed ', 'creative-create-cta ')
sections[0].children.insert(0, loader)
for n in nodes:
    ident = n.attrs.get('id')
    if n.tag == 'h1': n.tag = 'h2'
    if ident in ['card1','card2','card3']:
        inside = n.children
        if ident == 'card2': inside = [Node('div', [('data-card-float','')], inside)]
        n.children = [Node('div', [('data-card-intro','')], inside)]
    if ident == 'heroWord':
        n.children[0].attrs['data-word-intro'] = ''
    if ident == 'heroCopy':
        n.children[0].attrs['data-copy-intro'] = ''
aliases = {'class':'className','stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin','fill-rule':'fillRule','clip-rule':'clipRule','tabindex':'tabIndex'}
def render(n, depth=2):
    pad = '  '*depth
    if isinstance(n,str): return pad + '{' + json.dumps(n,ensure_ascii=False) + '}'
    tag = 'PortfolioIcon' if n.tag == 'i' and 'data-lucide' in n.attrs else n.tag
    attrs = []
    for k,v in n.attrs.items():
        k = aliases.get(k,k)
        if k == 'data-lucide': k='name'
        if k == 'style':
            vals={re.sub(r'-([a-z])',lambda m:m[1].upper(),a.strip()):b.strip() for rule in v.split(';') if ':' in rule for a,b in [rule.split(':',1)]}
            attrs.append('style={' + json.dumps(vals) + '}')
        elif k=='src' and v.startswith('https:'): attrs.append('src={assets['+json.dumps(v)+']}')
        else: attrs.append(k+'='+json.dumps(v if v is not None else '',ensure_ascii=False))
    if tag=='img': attrs += ['loading="lazy"','decoding="async"']
    if tag=='button': attrs += ['type="button"']
    start = pad+'<'+tag+(' '+ ' '.join(attrs) if attrs else '')
    if tag in void or tag=='PortfolioIcon': return start+' />'
    if not n.children: return start+' />'
    return start+'>\n'+'\n'.join(render(c,depth+1) for c in n.children)+'\n'+pad+'</'+tag+'>'
prefix = '''import { useRef, type MouseEvent, type RefObject } from "react";
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
'''
out = prefix + render(cta,3) + '\n    </div>\n' + '\n'.join(render(s) for s in sections) + '\n  </div>;\n}\n'
(base/'src/features/portfolio/PortfolioExperience.tsx').write_text(out,encoding='utf-8')
# Scoped source styles; media rules are handled by PostCSS in the next step.
styles = re.findall(r'<style>([\s\S]*?)</style>', source)
(base/'scripts/.creative-source.css').write_text(styles[0],encoding='utf-8')
