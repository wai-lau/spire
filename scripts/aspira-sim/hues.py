# the seven tower hues, OKLCH 360/7 apart (owner 2026-10-19: "7 equidistant slots, calibrated for human colour discrimination"); python3 hues.py [anchor]
# ruff: noqa
import math, colorsys, sys
def srgb_to_lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lin_to_srgb(c): return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def rgb_to_oklab(r,g,b):
    r,g,b=map(srgb_to_lin,(r,g,b))
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b; m=0.2119034982*r+0.6806995451*g+0.1073969566*b; s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=l**(1/3),m**(1/3),s**(1/3)
    return (0.2104542553*l+0.7936177850*m-0.0040720468*s, 1.9779984951*l-2.4285922050*m+0.4505937099*s, 0.0259040371*l+0.7827717662*m-0.8086757660*s)
def oklab_to_rgb(L,a,b):
    l=L+0.3963377774*a+0.2158037573*b; m=L-0.1055613458*a-0.0638541728*b; s=L-0.0894841775*a-1.2914855480*b
    l,m,s=l**3,m**3,s**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s; g=-1.2684380046*l+2.6097574011*m-0.3413193965*s; b=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return tuple(lin_to_srgb(x) for x in (r,g,b))
def hsl_to_rgb(h,s,l): return colorsys.hls_to_rgb(h/360,l/100,s/100)
def rgb_to_hsl(r,g,b):
    h,l,s=colorsys.rgb_to_hls(r,g,b); return (h*360,s*100,l*100)
def to_lch(r,g,b):
    L,a,bb=rgb_to_oklab(r,g,b); return L,math.hypot(a,bb),(math.degrees(math.atan2(bb,a))%360)
def from_lch(L,C,h):
    a=C*math.cos(math.radians(h)); b=C*math.sin(math.radians(h)); return oklab_to_rgb(L,a,b)
def in_gamut(rgb): return all(-1e-6<=c<=1+1e-6 for c in rgb)
def gamut_map(L,C,h):
    while C>0 and not in_gamut(from_lch(L,C,h)): C-=0.001
    return tuple(min(1,max(0,c)) for c in from_lch(L,C,h)),C
# CIEDE2000 on CIELAB D65
def rgb_to_lab(r,g,b):
    r,g,b=map(srgb_to_lin,(r,g,b))
    X=0.4124564*r+0.3575761*g+0.1804375*b; Y=0.2126729*r+0.7151522*g+0.0721750*b; Z=0.0193339*r+0.1191920*g+0.9503041*b
    def f(t): return t**(1/3) if t>0.008856 else 7.787*t+16/116
    fx,fy,fz=f(X/0.95047),f(Y/1.0),f(Z/1.08883)
    return 116*fy-16,500*(fx-fy),200*(fy-fz)
def de2000(lab1,lab2):
    L1,a1,b1=lab1;L2,a2,b2=lab2
    C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7)))
    a1p=(1+G)*a1;a2p=(1+G)*a2
    C1p=math.hypot(a1p,b1);C2p=math.hypot(a2p,b2)
    def hp(a,b):
        if a==0 and b==0: return 0
        h=math.degrees(math.atan2(b,a)); return h+360 if h<0 else h
    h1p=hp(a1p,b1);h2p=hp(a2p,b2)
    dLp=L2-L1;dCp=C2p-C1p
    if C1p*C2p==0: dhp=0
    elif abs(h2p-h1p)<=180: dhp=h2p-h1p
    elif h2p-h1p>180: dhp=h2p-h1p-360
    else: dhp=h2p-h1p+360
    dHp=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dhp/2))
    Lbp=(L1+L2)/2;Cbp=(C1p+C2p)/2
    if C1p*C2p==0: hbp=h1p+h2p
    elif abs(h1p-h2p)<=180: hbp=(h1p+h2p)/2
    elif h1p+h2p<360: hbp=(h1p+h2p+360)/2
    else: hbp=(h1p+h2p-360)/2
    T=1-0.17*math.cos(math.radians(hbp-30))+0.24*math.cos(math.radians(2*hbp))+0.32*math.cos(math.radians(3*hbp+6))-0.20*math.cos(math.radians(4*hbp-63))
    dth=30*math.exp(-((hbp-275)/25)**2)
    RC=2*math.sqrt(Cbp**7/(Cbp**7+25**7))
    SL=1+0.015*(Lbp-50)**2/math.sqrt(20+(Lbp-50)**2);SC=1+0.045*Cbp;SH=1+0.015*Cbp*T
    RT=-math.sin(math.radians(2*dth))*RC
    return math.sqrt((dLp/SL)**2+(dCp/SC)**2+(dHp/SH)**2+RT*(dCp/SC)*(dHp/SH))

# the CURRENT tokens (HSL) each existing tower keeps its OKLCH L and C from; the inks shift by their tower's hue delta
CUR={"sol":(353,100,78),"arc":(35,96,67),"acd":(94,55,64),"frz":(179,98,45),"crr":(207,99,48),"grv":(285,99,38)}
INK={"grv":(272,80,78),"crr":(216,100,74)}
NAME={"sol":"SOL","arc":"ARC","acd":"ACD","frz":"FRZ","crr":"CRR","grv":"GRV","ifr":"IFR"}
ORDER=["sol","ifr","arc","acd","frz","crr","grv"]
cur={k:to_lch(*hsl_to_rgb(*v)) for k,v in CUR.items()}
def tok(rgb):
    h,s,l=rgb_to_hsl(*rgb); return "%d %d%% %d%%"%(round(h),round(s),round(l))
def ring(anchor):
    out={}; step=360/7
    for i,k in enumerate(ORDER):
        h=(anchor+(i-1)*step)%360
        if k=="ifr": L,C=0.76,0.19
        else: L,C,_=cur[k]
        if k=="arc": L=0.88
        rgb,_=gamut_map(L,C,h); out[k]=(h,rgb)
    return out
def main():
    anchor=float(sys.argv[1]) if len(sys.argv)>1 else 50.0
    r=ring(anchor)
    for k in ORDER: print("%s h%.0f  %s"%(NAME[k],r[k][0],tok(r[k][1])))
    for k,v in INK.items():
        L,C,h0=to_lch(*hsl_to_rgb(*v)); d=r[k][0]-cur[k][2]
        rgb,_=gamut_map(L,C,(h0+d)%360); print("%s ink  %s"%(NAME[k],tok(rgb)))
    print("neighbour dE2000:")
    for i,k in enumerate(ORDER):
        k2=ORDER[(i+1)%7]
        print("  %s-%s %.0f"%(NAME[k],NAME[k2],de2000(rgb_to_lab(*r[k][1]),rgb_to_lab(*r[k2][1]))))
if __name__=="__main__": main()
