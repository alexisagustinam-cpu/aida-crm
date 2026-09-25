# Genera src/app/(crm)/theme-light.css a partir de los colores de mockup.css (modo oscuro).
# Uso: pip install tinycss2 && python3 scripts/light-theme.py 'src/app/(crm)/mockup.css' > 'src/app/(crm)/theme-light.css'
import tinycss2, colorsys, re, sys
src=open(sys.argv[1]).read()
HEX=re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
# texto blanco que va sobre un color de acento o fondo blanco: no se invierte
KEEP_WHITE=re.compile(r"primary-button|nav-link\.active|event-day|\.toast|circle-arrow|client-logo|client-mark")
def conv(h,prop,sel):
    h=h[1:]
    if len(h)==3: h="".join(c*2 for c in h)
    a=h[6:] if len(h)==8 else ""
    r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    hh,l,s=colorsys.rgb_to_hls(r,g,b)
    if re.search(r"client-mark|client-logo",sel): return None               # insignias claras del cliente
    if prop.startswith("background") and l>0.9: return None               # elementos claros a propósito
    if h[:6].lower()=="ffffff":
        if KEEP_WHITE.search(sel) : return None
        if prop in("background","background-color"): return None
        return "#0b1b33"+a
    if a and l<0.12: return "#0b1b33"+("33" if prop=="box-shadow" else "55")   # sombras y velos
    if prop in("color","fill") and s>=0.45 and l>0.55: l2=0.34; s2=min(s,0.85)  # textos de acento: más oscuros sobre claro
    elif s>=0.55 and 0.35<=l<=0.66: return None                            # acentos de marca
    elif s>=0.45 and 0.66<l<0.85: l2=0.40; s2=min(s,0.8)                          # textos de acento claros
    elif s>=0.45 and l<0.35 and prop.startswith("background"): l2=0.93; s2=min(s,0.7)  # fondos teñidos
    else:
        l2=1-l
        if prop.startswith("background"): l2=min(0.995,0.9+ (l2-0.8)*0.5) if l2>0.8 else l2
        if prop in("color","fill") and l2<0.5: l2=max(0.16,l2*0.75)
        if "border" in prop or prop=="stroke": l2=min(l2,0.86)
        s2=s*0.8
    r,g,b=colorsys.hls_to_rgb(hh,l2,s2)
    return "#%02x%02x%02x"%(round(r*255),round(g*255),round(b*255))+a
out=[]
def walk(rules,wrap=None):
    for rule in rules:
        if rule.type=="qualified-rule":
            sel=tinycss2.serialize(rule.prelude).strip()
            decls=tinycss2.parse_declaration_list(rule.content,skip_whitespace=True,skip_comments=True)
            new=[]
            for d in decls:
                if d.type!="declaration": continue
                val=tinycss2.serialize(d.value)
                if not HEX.search(val) or d.name.startswith("--"): continue
                changed=False
                def rep(m):
                    nonlocal changed
                    c=conv(m.group(0),d.name,sel)
                    if c is None: return m.group(0)
                    changed=True; return c
                v2=HEX.sub(rep,val)
                if changed: new.append(f"{d.name}:{v2.strip()}{'!important' if d.important else ''}")
            if new:
                sels=",".join(f"html[data-theme=light] {s.strip()}" if not s.strip().startswith(":root") else "html[data-theme=light]" for s in sel.split(","))
                out.append((wrap,f"{sels}{{{';'.join(new)}}}"))
        elif rule.type=="at-rule" and rule.lower_at_keyword=="media":
            walk(tinycss2.parse_rule_list(rule.content,skip_whitespace=True,skip_comments=True),"@media"+tinycss2.serialize(rule.prelude))
walk(tinycss2.parse_stylesheet(src,skip_whitespace=True,skip_comments=True))
res=["/* Modo claro de AIDA: generado a partir de los colores del modo oscuro */",
     "html[data-theme=light]{--bg:#f4f7fb;--panel:#ffffff;--panel2:#f1f5fb;--line:#dce5ef;--line2:#cfdbe8;--text:#0b1b33;--muted:#5b6b82;--green:#1a9b62;color-scheme:light}"]
for w,r in out: res.append(f"{w}{{{r}}}" if w else r)
print("\n".join(res))
