(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=e(i);fetch(i.href,r)}})();/**
 * @license
 * Copyright 2010-2023 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const _r="160",ic=0,Fr=1,sc=2,ma=1,ga=2,sn=3,Mn=0,Pe=1,Le=2,_n=0,ri=1,Br=2,Or=3,Gr=4,rc=5,Cn=100,oc=101,ac=102,zr=103,kr=104,cc=200,lc=201,hc=202,dc=203,sr=204,rr=205,uc=206,fc=207,pc=208,mc=209,gc=210,_c=211,vc=212,xc=213,Mc=214,yc=0,Sc=1,Ec=2,as=3,wc=4,bc=5,Tc=6,Ac=7,_a=0,Cc=1,Rc=2,vn=0,Lc=1,Pc=2,Dc=3,va=4,Ic=5,Uc=6,xa=300,ai=301,ci=302,or=303,ar=304,gs=306,cr=1e3,Xe=1001,lr=1002,Te=1003,Hr=1004,bs=1005,Ge=1006,Nc=1007,Ti=1008,xn=1009,Fc=1010,Bc=1011,vr=1012,Ma=1013,mn=1014,gn=1015,Ai=1016,ya=1017,Sa=1018,Ln=1020,Oc=1021,qe=1023,Gc=1024,zc=1025,Pn=1026,li=1027,kc=1028,Ea=1029,Hc=1030,wa=1031,ba=1033,Ts=33776,As=33777,Cs=33778,Rs=33779,Vr=35840,Wr=35841,Xr=35842,qr=35843,Ta=36196,Yr=37492,$r=37496,jr=37808,Zr=37809,Kr=37810,Jr=37811,Qr=37812,to=37813,eo=37814,no=37815,io=37816,so=37817,ro=37818,oo=37819,ao=37820,co=37821,Ls=36492,lo=36494,ho=36495,Vc=36283,uo=36284,fo=36285,po=36286,Aa=3e3,Dn=3001,Wc=3200,Xc=3201,Ca=0,qc=1,ke="",ge="srgb",cn="srgb-linear",xr="display-p3",_s="display-p3-linear",cs="linear",ee="srgb",ls="rec709",hs="p3",Bn=7680,mo=519,Yc=512,$c=513,jc=514,Ra=515,Zc=516,Kc=517,Jc=518,Qc=519,hr=35044,go="300 es",dr=1035,rn=2e3,ds=2001;class di{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const r=i.indexOf(e);r!==-1&&i.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let r=0,a=i.length;r<a;r++)i[r].call(this,t);t.target=null}}}const ve=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let _o=1234567;const Si=Math.PI/180,Ci=180/Math.PI;function an(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(ve[s&255]+ve[s>>8&255]+ve[s>>16&255]+ve[s>>24&255]+"-"+ve[t&255]+ve[t>>8&255]+"-"+ve[t>>16&15|64]+ve[t>>24&255]+"-"+ve[e&63|128]+ve[e>>8&255]+"-"+ve[e>>16&255]+ve[e>>24&255]+ve[n&255]+ve[n>>8&255]+ve[n>>16&255]+ve[n>>24&255]).toLowerCase()}function Ae(s,t,e){return Math.max(t,Math.min(e,s))}function Mr(s,t){return(s%t+t)%t}function tl(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function el(s,t,e){return s!==t?(e-s)/(t-s):0}function Ei(s,t,e){return(1-e)*s+e*t}function nl(s,t,e,n){return Ei(s,t,1-Math.exp(-e*n))}function il(s,t=1){return t-Math.abs(Mr(s,t*2)-t)}function sl(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function rl(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function ol(s,t){return s+Math.floor(Math.random()*(t-s+1))}function al(s,t){return s+Math.random()*(t-s)}function cl(s){return s*(.5-Math.random())}function ll(s){s!==void 0&&(_o=s);let t=_o+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function hl(s){return s*Si}function dl(s){return s*Ci}function ur(s){return(s&s-1)===0&&s!==0}function ul(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function us(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function fl(s,t,e,n,i){const r=Math.cos,a=Math.sin,o=r(e/2),c=a(e/2),l=r((t+n)/2),h=a((t+n)/2),d=r((t-n)/2),u=a((t-n)/2),m=r((n-t)/2),g=a((n-t)/2);switch(i){case"XYX":s.set(o*h,c*d,c*u,o*l);break;case"YZY":s.set(c*u,o*h,c*d,o*l);break;case"ZXZ":s.set(c*d,c*u,o*h,o*l);break;case"XZX":s.set(o*h,c*g,c*m,o*l);break;case"YXY":s.set(c*m,o*h,c*g,o*l);break;case"ZYZ":s.set(c*g,c*m,o*h,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Ze(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Zt(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const pl={DEG2RAD:Si,RAD2DEG:Ci,generateUUID:an,clamp:Ae,euclideanModulo:Mr,mapLinear:tl,inverseLerp:el,lerp:Ei,damp:nl,pingpong:il,smoothstep:sl,smootherstep:rl,randInt:ol,randFloat:al,randFloatSpread:cl,seededRandom:ll,degToRad:hl,radToDeg:dl,isPowerOfTwo:ur,ceilPowerOfTwo:ul,floorPowerOfTwo:us,setQuaternionFromProperEuler:fl,normalize:Zt,denormalize:Ze};class xt{constructor(t=0,e=0){xt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Ae(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*i+t.x,this.y=r*i+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class kt{constructor(t,e,n,i,r,a,o,c,l){kt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,a,o,c,l)}set(t,e,n,i,r,a,o,c,l){const h=this.elements;return h[0]=t,h[1]=i,h[2]=o,h[3]=e,h[4]=r,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],m=n[5],g=n[8],_=i[0],p=i[3],f=i[6],M=i[1],v=i[4],w=i[7],R=i[2],S=i[5],A=i[8];return r[0]=a*_+o*M+c*R,r[3]=a*p+o*v+c*S,r[6]=a*f+o*w+c*A,r[1]=l*_+h*M+d*R,r[4]=l*p+h*v+d*S,r[7]=l*f+h*w+d*A,r[2]=u*_+m*M+g*R,r[5]=u*p+m*v+g*S,r[8]=u*f+m*w+g*A,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8];return e*a*h-e*o*l-n*r*h+n*o*c+i*r*l-i*a*c}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],d=h*a-o*l,u=o*c-h*r,m=l*r-a*c,g=e*d+n*u+i*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=d*_,t[1]=(i*l-h*n)*_,t[2]=(o*n-i*a)*_,t[3]=u*_,t[4]=(h*e-i*c)*_,t[5]=(i*r-o*e)*_,t[6]=m*_,t[7]=(n*c-l*e)*_,t[8]=(a*e-n*r)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,r,a,o){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+t,-i*l,i*c,-i*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(Ps.makeScale(t,e)),this}rotate(t){return this.premultiply(Ps.makeRotation(-t)),this}translate(t,e){return this.premultiply(Ps.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const Ps=new kt;function La(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function fs(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function ml(){const s=fs("canvas");return s.style.display="block",s}const vo={};function wi(s){s in vo||(vo[s]=!0,console.warn(s))}const xo=new kt().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Mo=new kt().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Ui={[cn]:{transfer:cs,primaries:ls,toReference:s=>s,fromReference:s=>s},[ge]:{transfer:ee,primaries:ls,toReference:s=>s.convertSRGBToLinear(),fromReference:s=>s.convertLinearToSRGB()},[_s]:{transfer:cs,primaries:hs,toReference:s=>s.applyMatrix3(Mo),fromReference:s=>s.applyMatrix3(xo)},[xr]:{transfer:ee,primaries:hs,toReference:s=>s.convertSRGBToLinear().applyMatrix3(Mo),fromReference:s=>s.applyMatrix3(xo).convertLinearToSRGB()}},gl=new Set([cn,_s]),Kt={enabled:!0,_workingColorSpace:cn,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(s){if(!gl.has(s))throw new Error(`Unsupported working color space, "${s}".`);this._workingColorSpace=s},convert:function(s,t,e){if(this.enabled===!1||t===e||!t||!e)return s;const n=Ui[t].toReference,i=Ui[e].fromReference;return i(n(s))},fromWorkingColorSpace:function(s,t){return this.convert(s,this._workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this._workingColorSpace)},getPrimaries:function(s){return Ui[s].primaries},getTransfer:function(s){return s===ke?cs:Ui[s].transfer}};function oi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Ds(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let On;class Pa{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{On===void 0&&(On=fs("canvas")),On.width=t.width,On.height=t.height;const n=On.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=On}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=fs("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),r=i.data;for(let a=0;a<r.length;a++)r[a]=oi(r[a]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(oi(e[n]/255)*255):e[n]=oi(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let _l=0;class Da{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:_l++}),this.uuid=an(),this.data=t,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?r.push(Is(i[a].image)):r.push(Is(i[a]))}else r=Is(i);n.url=r}return e||(t.images[this.uuid]=n),n}}function Is(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Pa.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let vl=0;class De extends di{constructor(t=De.DEFAULT_IMAGE,e=De.DEFAULT_MAPPING,n=Xe,i=Xe,r=Ge,a=Ti,o=qe,c=xn,l=De.DEFAULT_ANISOTROPY,h=ke){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:vl++}),this.uuid=an(),this.name="",this.source=new Da(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new xt(0,0),this.repeat=new xt(1,1),this.center=new xt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new kt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(wi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===Dn?ge:ke),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==xa)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case cr:t.x=t.x-Math.floor(t.x);break;case Xe:t.x=t.x<0?0:1;break;case lr:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case cr:t.y=t.y-Math.floor(t.y);break;case Xe:t.y=t.y<0?0:1;break;case lr:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return wi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===ge?Dn:Aa}set encoding(t){wi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=t===Dn?ge:ke}}De.DEFAULT_IMAGE=null;De.DEFAULT_MAPPING=xa;De.DEFAULT_ANISOTROPY=1;class ne{constructor(t=0,e=0,n=0,i=1){ne.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*i+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*i+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*i+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*i+a[15]*r,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,r;const c=t.elements,l=c[0],h=c[4],d=c[8],u=c[1],m=c[5],g=c[9],_=c[2],p=c[6],f=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+_)<.1&&Math.abs(g+p)<.1&&Math.abs(l+m+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const v=(l+1)/2,w=(m+1)/2,R=(f+1)/2,S=(h+u)/4,A=(d+_)/4,I=(g+p)/4;return v>w&&v>R?v<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(v),i=S/n,r=A/n):w>R?w<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(w),n=S/i,r=I/i):R<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(R),n=A/r,i=I/r),this.set(n,i,r,e),this}let M=Math.sqrt((p-g)*(p-g)+(d-_)*(d-_)+(u-h)*(u-h));return Math.abs(M)<.001&&(M=1),this.x=(p-g)/M,this.y=(d-_)/M,this.z=(u-h)/M,this.w=Math.acos((l+m+f-1)/2),this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class xl extends di{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new ne(0,0,t,e),this.scissorTest=!1,this.viewport=new ne(0,0,t,e);const i={width:t,height:e,depth:1};n.encoding!==void 0&&(wi("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),n.colorSpace=n.encoding===Dn?ge:ke),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ge,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},n),this.texture=new De(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=n.generateMipmaps,this.texture.internalFormat=n.internalFormat,this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}setSize(t,e,n=1){(this.width!==t||this.height!==e||this.depth!==n)&&(this.width=t,this.height=e,this.depth=n,this.texture.image.width=t,this.texture.image.height=e,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.texture=t.texture.clone(),this.texture.isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new Da(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Un extends xl{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class Ia extends De{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Te,this.minFilter=Te,this.wrapR=Xe,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ml extends De{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Te,this.minFilter=Te,this.wrapR=Xe,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ri{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,r,a,o){let c=n[i+0],l=n[i+1],h=n[i+2],d=n[i+3];const u=r[a+0],m=r[a+1],g=r[a+2],_=r[a+3];if(o===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d;return}if(o===1){t[e+0]=u,t[e+1]=m,t[e+2]=g,t[e+3]=_;return}if(d!==_||c!==u||l!==m||h!==g){let p=1-o;const f=c*u+l*m+h*g+d*_,M=f>=0?1:-1,v=1-f*f;if(v>Number.EPSILON){const R=Math.sqrt(v),S=Math.atan2(R,f*M);p=Math.sin(p*S)/R,o=Math.sin(o*S)/R}const w=o*M;if(c=c*p+u*w,l=l*p+m*w,h=h*p+g*w,d=d*p+_*w,p===1-o){const R=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=R,l*=R,h*=R,d*=R}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,r,a){const o=n[i],c=n[i+1],l=n[i+2],h=n[i+3],d=r[a],u=r[a+1],m=r[a+2],g=r[a+3];return t[e]=o*g+h*d+c*m-l*u,t[e+1]=c*g+h*u+l*d-o*m,t[e+2]=l*g+h*m+o*u-c*d,t[e+3]=h*g-o*d-c*u-l*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,r=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(i/2),d=o(r/2),u=c(n/2),m=c(i/2),g=c(r/2);switch(a){case"XYZ":this._x=u*h*d+l*m*g,this._y=l*m*d-u*h*g,this._z=l*h*g+u*m*d,this._w=l*h*d-u*m*g;break;case"YXZ":this._x=u*h*d+l*m*g,this._y=l*m*d-u*h*g,this._z=l*h*g-u*m*d,this._w=l*h*d+u*m*g;break;case"ZXY":this._x=u*h*d-l*m*g,this._y=l*m*d+u*h*g,this._z=l*h*g+u*m*d,this._w=l*h*d-u*m*g;break;case"ZYX":this._x=u*h*d-l*m*g,this._y=l*m*d+u*h*g,this._z=l*h*g-u*m*d,this._w=l*h*d+u*m*g;break;case"YZX":this._x=u*h*d+l*m*g,this._y=l*m*d+u*h*g,this._z=l*h*g-u*m*d,this._w=l*h*d-u*m*g;break;case"XZY":this._x=u*h*d-l*m*g,this._y=l*m*d-u*h*g,this._z=l*h*g+u*m*d,this._w=l*h*d+u*m*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],r=e[8],a=e[1],o=e[5],c=e[9],l=e[2],h=e[6],d=e[10],u=n+o+d;if(u>0){const m=.5/Math.sqrt(u+1);this._w=.25/m,this._x=(h-c)*m,this._y=(r-l)*m,this._z=(a-i)*m}else if(n>o&&n>d){const m=2*Math.sqrt(1+n-o-d);this._w=(h-c)/m,this._x=.25*m,this._y=(i+a)/m,this._z=(r+l)/m}else if(o>d){const m=2*Math.sqrt(1+o-n-d);this._w=(r-l)/m,this._x=(i+a)/m,this._y=.25*m,this._z=(c+h)/m}else{const m=2*Math.sqrt(1+d-n-o);this._w=(a-i)/m,this._x=(r+l)/m,this._y=(c+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ae(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,r=t._z,a=t._w,o=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+a*o+i*l-r*c,this._y=i*h+a*c+r*o-n*l,this._z=r*h+a*l+n*c-i*o,this._w=a*h-n*o-i*c-r*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,r=this._z,a=this._w;let o=a*t._w+n*t._x+i*t._y+r*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=a,this._x=n,this._y=i,this._z=r,this;const c=1-o*o;if(c<=Number.EPSILON){const m=1-e;return this._w=m*a+e*this._w,this._x=m*n+e*this._x,this._y=m*i+e*this._y,this._z=m*r+e*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,o),d=Math.sin((1-e)*h)/l,u=Math.sin(e*h)/l;return this._w=a*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=r*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=Math.random(),e=Math.sqrt(1-t),n=Math.sqrt(t),i=2*Math.PI*Math.random(),r=2*Math.PI*Math.random();return this.set(e*Math.cos(i),n*Math.sin(r),n*Math.cos(r),e*Math.sin(i))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{constructor(t=0,e=0,n=0){C.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(yo.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(yo.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*i,this.y=r[1]*e+r[4]*n+r[7]*i,this.z=r[2]*e+r[5]*n+r[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*i+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*i+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*i+r[14])*a,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,r=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*i-o*n),h=2*(o*e-r*i),d=2*(r*n-a*e);return this.x=e+c*l+a*d-o*h,this.y=n+c*h+o*l-r*d,this.z=i+c*d+r*h-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i,this.y=r[1]*e+r[5]*n+r[9]*i,this.z=r[2]*e+r[6]*n+r[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,r=t.z,a=e.x,o=e.y,c=e.z;return this.x=i*c-r*o,this.y=r*a-n*c,this.z=n*o-i*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Us.copy(this).projectOnVector(t),this.sub(Us)}reflect(t){return this.sub(Us.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Ae(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=(Math.random()-.5)*2,e=Math.random()*Math.PI*2,n=Math.sqrt(1-t**2);return this.x=n*Math.cos(e),this.y=n*Math.sin(e),this.z=t,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Us=new C,yo=new Ri;class Li{constructor(t=new C(1/0,1/0,1/0),e=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(He.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(He.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=He.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,He):He.fromBufferAttribute(r,a),He.applyMatrix4(t.matrixWorld),this.expandByPoint(He);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ni.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ni.copy(n.boundingBox)),Ni.applyMatrix4(t.matrixWorld),this.union(Ni)}const i=t.children;for(let r=0,a=i.length;r<a;r++)this.expandByObject(i[r],e);return this}containsPoint(t){return!(t.x<this.min.x||t.x>this.max.x||t.y<this.min.y||t.y>this.max.y||t.z<this.min.z||t.z>this.max.z)}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return!(t.max.x<this.min.x||t.min.x>this.max.x||t.max.y<this.min.y||t.min.y>this.max.y||t.max.z<this.min.z||t.min.z>this.max.z)}intersectsSphere(t){return this.clampPoint(t.center,He),He.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(pi),Fi.subVectors(this.max,pi),Gn.subVectors(t.a,pi),zn.subVectors(t.b,pi),kn.subVectors(t.c,pi),ln.subVectors(zn,Gn),hn.subVectors(kn,zn),En.subVectors(Gn,kn);let e=[0,-ln.z,ln.y,0,-hn.z,hn.y,0,-En.z,En.y,ln.z,0,-ln.x,hn.z,0,-hn.x,En.z,0,-En.x,-ln.y,ln.x,0,-hn.y,hn.x,0,-En.y,En.x,0];return!Ns(e,Gn,zn,kn,Fi)||(e=[1,0,0,0,1,0,0,0,1],!Ns(e,Gn,zn,kn,Fi))?!1:(Bi.crossVectors(ln,hn),e=[Bi.x,Bi.y,Bi.z],Ns(e,Gn,zn,kn,Fi))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,He).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(He).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Je[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Je[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Je[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Je[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Je[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Je[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Je[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Je[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Je),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Je=[new C,new C,new C,new C,new C,new C,new C,new C],He=new C,Ni=new Li,Gn=new C,zn=new C,kn=new C,ln=new C,hn=new C,En=new C,pi=new C,Fi=new C,Bi=new C,wn=new C;function Ns(s,t,e,n,i){for(let r=0,a=s.length-3;r<=a;r+=3){wn.fromArray(s,r);const o=i.x*Math.abs(wn.x)+i.y*Math.abs(wn.y)+i.z*Math.abs(wn.z),c=t.dot(wn),l=e.dot(wn),h=n.dot(wn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}const yl=new Li,mi=new C,Fs=new C;class vs{constructor(t=new C,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):yl.setFromPoints(t).getCenter(n);let i=0;for(let r=0,a=t.length;r<a;r++)i=Math.max(i,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;mi.subVectors(t,this.center);const e=mi.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(mi,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Fs.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(mi.copy(t.center).add(Fs)),this.expandByPoint(mi.copy(t.center).sub(Fs))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Qe=new C,Bs=new C,Oi=new C,dn=new C,Os=new C,Gi=new C,Gs=new C;class yr{constructor(t=new C,e=new C(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Qe)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Qe.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Qe.copy(this.origin).addScaledVector(this.direction,e),Qe.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){Bs.copy(t).add(e).multiplyScalar(.5),Oi.copy(e).sub(t).normalize(),dn.copy(this.origin).sub(Bs);const r=t.distanceTo(e)*.5,a=-this.direction.dot(Oi),o=dn.dot(this.direction),c=-dn.dot(Oi),l=dn.lengthSq(),h=Math.abs(1-a*a);let d,u,m,g;if(h>0)if(d=a*c-o,u=a*o-c,g=r*h,d>=0)if(u>=-g)if(u<=g){const _=1/h;d*=_,u*=_,m=d*(d+a*u+2*o)+u*(a*d+u+2*c)+l}else u=r,d=Math.max(0,-(a*u+o)),m=-d*d+u*(u+2*c)+l;else u=-r,d=Math.max(0,-(a*u+o)),m=-d*d+u*(u+2*c)+l;else u<=-g?(d=Math.max(0,-(-a*r+o)),u=d>0?-r:Math.min(Math.max(-r,-c),r),m=-d*d+u*(u+2*c)+l):u<=g?(d=0,u=Math.min(Math.max(-r,-c),r),m=u*(u+2*c)+l):(d=Math.max(0,-(a*r+o)),u=d>0?r:Math.min(Math.max(-r,-c),r),m=-d*d+u*(u+2*c)+l);else u=a>0?-r:r,d=Math.max(0,-(a*u+o)),m=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(Bs).addScaledVector(Oi,u),m}intersectSphere(t,e){Qe.subVectors(t.center,this.origin);const n=Qe.dot(this.direction),i=Qe.dot(Qe)-n*n,r=t.radius*t.radius;if(i>r)return null;const a=Math.sqrt(r-i),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,r,a,o,c;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(t.min.x-u.x)*l,i=(t.max.x-u.x)*l):(n=(t.max.x-u.x)*l,i=(t.min.x-u.x)*l),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>i||((r>n||isNaN(n))&&(n=r),(a<i||isNaN(i))&&(i=a),d>=0?(o=(t.min.z-u.z)*d,c=(t.max.z-u.z)*d):(o=(t.max.z-u.z)*d,c=(t.min.z-u.z)*d),n>c||o>i)||((o>n||n!==n)&&(n=o),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Qe)!==null}intersectTriangle(t,e,n,i,r){Os.subVectors(e,t),Gi.subVectors(n,t),Gs.crossVectors(Os,Gi);let a=this.direction.dot(Gs),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;dn.subVectors(this.origin,t);const c=o*this.direction.dot(Gi.crossVectors(dn,Gi));if(c<0)return null;const l=o*this.direction.dot(Os.cross(dn));if(l<0||c+l>a)return null;const h=-o*dn.dot(Gs);return h<0?null:this.at(h/a,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ae{constructor(t,e,n,i,r,a,o,c,l,h,d,u,m,g,_,p){ae.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,a,o,c,l,h,d,u,m,g,_,p)}set(t,e,n,i,r,a,o,c,l,h,d,u,m,g,_,p){const f=this.elements;return f[0]=t,f[4]=e,f[8]=n,f[12]=i,f[1]=r,f[5]=a,f[9]=o,f[13]=c,f[2]=l,f[6]=h,f[10]=d,f[14]=u,f[3]=m,f[7]=g,f[11]=_,f[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ae().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/Hn.setFromMatrixColumn(t,0).length(),r=1/Hn.setFromMatrixColumn(t,1).length(),a=1/Hn.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){const u=a*h,m=a*d,g=o*h,_=o*d;e[0]=c*h,e[4]=-c*d,e[8]=l,e[1]=m+g*l,e[5]=u-_*l,e[9]=-o*c,e[2]=_-u*l,e[6]=g+m*l,e[10]=a*c}else if(t.order==="YXZ"){const u=c*h,m=c*d,g=l*h,_=l*d;e[0]=u+_*o,e[4]=g*o-m,e[8]=a*l,e[1]=a*d,e[5]=a*h,e[9]=-o,e[2]=m*o-g,e[6]=_+u*o,e[10]=a*c}else if(t.order==="ZXY"){const u=c*h,m=c*d,g=l*h,_=l*d;e[0]=u-_*o,e[4]=-a*d,e[8]=g+m*o,e[1]=m+g*o,e[5]=a*h,e[9]=_-u*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){const u=a*h,m=a*d,g=o*h,_=o*d;e[0]=c*h,e[4]=g*l-m,e[8]=u*l+_,e[1]=c*d,e[5]=_*l+u,e[9]=m*l-g,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){const u=a*c,m=a*l,g=o*c,_=o*l;e[0]=c*h,e[4]=_-u*d,e[8]=g*d+m,e[1]=d,e[5]=a*h,e[9]=-o*h,e[2]=-l*h,e[6]=m*d+g,e[10]=u-_*d}else if(t.order==="XZY"){const u=a*c,m=a*l,g=o*c,_=o*l;e[0]=c*h,e[4]=-d,e[8]=l*h,e[1]=u*d+_,e[5]=a*h,e[9]=m*d-g,e[2]=g*d-m,e[6]=o*h,e[10]=_*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Sl,t,El)}lookAt(t,e,n){const i=this.elements;return Ue.subVectors(t,e),Ue.lengthSq()===0&&(Ue.z=1),Ue.normalize(),un.crossVectors(n,Ue),un.lengthSq()===0&&(Math.abs(n.z)===1?Ue.x+=1e-4:Ue.z+=1e-4,Ue.normalize(),un.crossVectors(n,Ue)),un.normalize(),zi.crossVectors(Ue,un),i[0]=un.x,i[4]=zi.x,i[8]=Ue.x,i[1]=un.y,i[5]=zi.y,i[9]=Ue.y,i[2]=un.z,i[6]=zi.z,i[10]=Ue.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],m=n[13],g=n[2],_=n[6],p=n[10],f=n[14],M=n[3],v=n[7],w=n[11],R=n[15],S=i[0],A=i[4],I=i[8],y=i[12],b=i[1],z=i[5],H=i[9],tt=i[13],P=i[2],O=i[6],W=i[10],Y=i[14],X=i[3],q=i[7],$=i[11],et=i[15];return r[0]=a*S+o*b+c*P+l*X,r[4]=a*A+o*z+c*O+l*q,r[8]=a*I+o*H+c*W+l*$,r[12]=a*y+o*tt+c*Y+l*et,r[1]=h*S+d*b+u*P+m*X,r[5]=h*A+d*z+u*O+m*q,r[9]=h*I+d*H+u*W+m*$,r[13]=h*y+d*tt+u*Y+m*et,r[2]=g*S+_*b+p*P+f*X,r[6]=g*A+_*z+p*O+f*q,r[10]=g*I+_*H+p*W+f*$,r[14]=g*y+_*tt+p*Y+f*et,r[3]=M*S+v*b+w*P+R*X,r[7]=M*A+v*z+w*O+R*q,r[11]=M*I+v*H+w*W+R*$,r[15]=M*y+v*tt+w*Y+R*et,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],r=t[12],a=t[1],o=t[5],c=t[9],l=t[13],h=t[2],d=t[6],u=t[10],m=t[14],g=t[3],_=t[7],p=t[11],f=t[15];return g*(+r*c*d-i*l*d-r*o*u+n*l*u+i*o*m-n*c*m)+_*(+e*c*m-e*l*u+r*a*u-i*a*m+i*l*h-r*c*h)+p*(+e*l*d-e*o*m-r*a*d+n*a*m+r*o*h-n*l*h)+f*(-i*o*h-e*c*d+e*o*u+i*a*d-n*a*u+n*c*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],d=t[9],u=t[10],m=t[11],g=t[12],_=t[13],p=t[14],f=t[15],M=d*p*l-_*u*l+_*c*m-o*p*m-d*c*f+o*u*f,v=g*u*l-h*p*l-g*c*m+a*p*m+h*c*f-a*u*f,w=h*_*l-g*d*l+g*o*m-a*_*m-h*o*f+a*d*f,R=g*d*c-h*_*c-g*o*u+a*_*u+h*o*p-a*d*p,S=e*M+n*v+i*w+r*R;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/S;return t[0]=M*A,t[1]=(_*u*r-d*p*r-_*i*m+n*p*m+d*i*f-n*u*f)*A,t[2]=(o*p*r-_*c*r+_*i*l-n*p*l-o*i*f+n*c*f)*A,t[3]=(d*c*r-o*u*r-d*i*l+n*u*l+o*i*m-n*c*m)*A,t[4]=v*A,t[5]=(h*p*r-g*u*r+g*i*m-e*p*m-h*i*f+e*u*f)*A,t[6]=(g*c*r-a*p*r-g*i*l+e*p*l+a*i*f-e*c*f)*A,t[7]=(a*u*r-h*c*r+h*i*l-e*u*l-a*i*m+e*c*m)*A,t[8]=w*A,t[9]=(g*d*r-h*_*r-g*n*m+e*_*m+h*n*f-e*d*f)*A,t[10]=(a*_*r-g*o*r+g*n*l-e*_*l-a*n*f+e*o*f)*A,t[11]=(h*o*r-a*d*r-h*n*l+e*d*l+a*n*m-e*o*m)*A,t[12]=R*A,t[13]=(h*_*i-g*d*i+g*n*u-e*_*u-h*n*p+e*d*p)*A,t[14]=(g*o*i-a*_*i-g*n*c+e*_*c+a*n*p-e*o*p)*A,t[15]=(a*d*i-h*o*i+h*n*c-e*d*c-a*n*u+e*o*u)*A,this}scale(t){const e=this.elements,n=t.x,i=t.y,r=t.z;return e[0]*=n,e[4]*=i,e[8]*=r,e[1]*=n,e[5]*=i,e[9]*=r,e[2]*=n,e[6]*=i,e[10]*=r,e[3]*=n,e[7]*=i,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),r=1-n,a=t.x,o=t.y,c=t.z,l=r*a,h=r*o;return this.set(l*a+n,l*o-i*c,l*c+i*o,0,l*o+i*c,h*o+n,h*c-i*a,0,l*c-i*o,h*c+i*a,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,r,a){return this.set(1,n,r,0,t,1,a,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,r=e._x,a=e._y,o=e._z,c=e._w,l=r+r,h=a+a,d=o+o,u=r*l,m=r*h,g=r*d,_=a*h,p=a*d,f=o*d,M=c*l,v=c*h,w=c*d,R=n.x,S=n.y,A=n.z;return i[0]=(1-(_+f))*R,i[1]=(m+w)*R,i[2]=(g-v)*R,i[3]=0,i[4]=(m-w)*S,i[5]=(1-(u+f))*S,i[6]=(p+M)*S,i[7]=0,i[8]=(g+v)*A,i[9]=(p-M)*A,i[10]=(1-(u+_))*A,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let r=Hn.set(i[0],i[1],i[2]).length();const a=Hn.set(i[4],i[5],i[6]).length(),o=Hn.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),t.x=i[12],t.y=i[13],t.z=i[14],Ve.copy(this);const l=1/r,h=1/a,d=1/o;return Ve.elements[0]*=l,Ve.elements[1]*=l,Ve.elements[2]*=l,Ve.elements[4]*=h,Ve.elements[5]*=h,Ve.elements[6]*=h,Ve.elements[8]*=d,Ve.elements[9]*=d,Ve.elements[10]*=d,e.setFromRotationMatrix(Ve),n.x=r,n.y=a,n.z=o,this}makePerspective(t,e,n,i,r,a,o=rn){const c=this.elements,l=2*r/(e-t),h=2*r/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let m,g;if(o===rn)m=-(a+r)/(a-r),g=-2*a*r/(a-r);else if(o===ds)m=-a/(a-r),g=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=u,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,i,r,a,o=rn){const c=this.elements,l=1/(e-t),h=1/(n-i),d=1/(a-r),u=(e+t)*l,m=(n+i)*h;let g,_;if(o===rn)g=(a+r)*d,_=-2*d;else if(o===ds)g=r*d,_=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-u,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-m,c[2]=0,c[6]=0,c[10]=_,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Hn=new C,Ve=new ae,Sl=new C(0,0,0),El=new C(1,1,1),un=new C,zi=new C,Ue=new C,So=new ae,Eo=new Ri;class xs{constructor(t=0,e=0,n=0,i=xs.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,r=i[0],a=i[4],o=i[8],c=i[1],l=i[5],h=i[9],d=i[2],u=i[6],m=i[10];switch(e){case"XYZ":this._y=Math.asin(Ae(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ae(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ae(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,m),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Ae(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,m),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Ae(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(o,m));break;case"XZY":this._z=Math.asin(-Ae(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return So.makeRotationFromQuaternion(t),this.setFromRotationMatrix(So,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Eo.setFromEuler(this),this.setFromQuaternion(Eo,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}xs.DEFAULT_ORDER="XYZ";class Sr{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let wl=0;const wo=new C,Vn=new Ri,tn=new ae,ki=new C,gi=new C,bl=new C,Tl=new Ri,bo=new C(1,0,0),To=new C(0,1,0),Ao=new C(0,0,1),Al={type:"added"},Cl={type:"removed"};class he extends di{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wl++}),this.uuid=an(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=he.DEFAULT_UP.clone();const t=new C,e=new xs,n=new Ri,i=new C(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ae},normalMatrix:{value:new kt}}),this.matrix=new ae,this.matrixWorld=new ae,this.matrixAutoUpdate=he.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=he.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Sr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Vn.setFromAxisAngle(t,e),this.quaternion.multiply(Vn),this}rotateOnWorldAxis(t,e){return Vn.setFromAxisAngle(t,e),this.quaternion.premultiply(Vn),this}rotateX(t){return this.rotateOnAxis(bo,t)}rotateY(t){return this.rotateOnAxis(To,t)}rotateZ(t){return this.rotateOnAxis(Ao,t)}translateOnAxis(t,e){return wo.copy(t).applyQuaternion(this.quaternion),this.position.add(wo.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(bo,t)}translateY(t){return this.translateOnAxis(To,t)}translateZ(t){return this.translateOnAxis(Ao,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(tn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?ki.copy(t):ki.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),gi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?tn.lookAt(gi,ki,this.up):tn.lookAt(ki,gi,this.up),this.quaternion.setFromRotationMatrix(tn),i&&(tn.extractRotation(i.matrixWorld),Vn.setFromRotationMatrix(tn),this.quaternion.premultiply(Vn.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.parent!==null&&t.parent.remove(t),t.parent=this,this.children.push(t),t.dispatchEvent(Al)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Cl)),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),tn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),tn.multiply(t.parent.matrixWorld)),t.applyMatrix4(tn),this.add(t),t.updateWorldMatrix(!1,!0),this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let r=0,a=i.length;r<a;r++)i[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gi,t,bl),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gi,Tl,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++){const r=e[n];(r.matrixWorldAutoUpdate===!0||t===!0)&&r.updateMatrixWorld(t)}}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),e===!0){const i=this.children;for(let r=0,a=i.length;r<a;r++){const o=i[r];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),i.maxGeometryCount=this._maxGeometryCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const d=c[l];r(t.shapes,d)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(t.materials,this.material[c]));i.material=o}else i.material=r(t.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];i.animations.push(r(t.animations,c))}}if(e){const o=a(t.geometries),c=a(t.materials),l=a(t.textures),h=a(t.images),d=a(t.shapes),u=a(t.skeletons),m=a(t.animations),g=a(t.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),m.length>0&&(n.animations=m),g.length>0&&(n.nodes=g)}return n.object=i,n;function a(o){const c=[];for(const l in o){const h=o[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}he.DEFAULT_UP=new C(0,1,0);he.DEFAULT_MATRIX_AUTO_UPDATE=!0;he.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const We=new C,en=new C,zs=new C,nn=new C,Wn=new C,Xn=new C,Co=new C,ks=new C,Hs=new C,Vs=new C;let Hi=!1;class ze{constructor(t=new C,e=new C,n=new C){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),We.subVectors(t,e),i.cross(We);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(t,e,n,i,r){We.subVectors(i,e),en.subVectors(n,e),zs.subVectors(t,e);const a=We.dot(We),o=We.dot(en),c=We.dot(zs),l=en.dot(en),h=en.dot(zs),d=a*l-o*o;if(d===0)return r.set(0,0,0),null;const u=1/d,m=(l*c-o*h)*u,g=(a*h-o*c)*u;return r.set(1-m-g,g,m)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,nn)===null?!1:nn.x>=0&&nn.y>=0&&nn.x+nn.y<=1}static getUV(t,e,n,i,r,a,o,c){return Hi===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Hi=!0),this.getInterpolation(t,e,n,i,r,a,o,c)}static getInterpolation(t,e,n,i,r,a,o,c){return this.getBarycoord(t,e,n,i,nn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,nn.x),c.addScaledVector(a,nn.y),c.addScaledVector(o,nn.z),c)}static isFrontFacing(t,e,n,i){return We.subVectors(n,e),en.subVectors(t,e),We.cross(en).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return We.subVectors(this.c,this.b),en.subVectors(this.a,this.b),We.cross(en).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ze.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return ze.getBarycoord(t,this.a,this.b,this.c,e)}getUV(t,e,n,i,r){return Hi===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Hi=!0),ze.getInterpolation(t,this.a,this.b,this.c,e,n,i,r)}getInterpolation(t,e,n,i,r){return ze.getInterpolation(t,this.a,this.b,this.c,e,n,i,r)}containsPoint(t){return ze.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ze.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,r=this.c;let a,o;Wn.subVectors(i,n),Xn.subVectors(r,n),ks.subVectors(t,n);const c=Wn.dot(ks),l=Xn.dot(ks);if(c<=0&&l<=0)return e.copy(n);Hs.subVectors(t,i);const h=Wn.dot(Hs),d=Xn.dot(Hs);if(h>=0&&d<=h)return e.copy(i);const u=c*d-h*l;if(u<=0&&c>=0&&h<=0)return a=c/(c-h),e.copy(n).addScaledVector(Wn,a);Vs.subVectors(t,r);const m=Wn.dot(Vs),g=Xn.dot(Vs);if(g>=0&&m<=g)return e.copy(r);const _=m*l-c*g;if(_<=0&&l>=0&&g<=0)return o=l/(l-g),e.copy(n).addScaledVector(Xn,o);const p=h*g-m*d;if(p<=0&&d-h>=0&&m-g>=0)return Co.subVectors(r,i),o=(d-h)/(d-h+(m-g)),e.copy(i).addScaledVector(Co,o);const f=1/(p+_+u);return a=_*f,o=u*f,e.copy(n).addScaledVector(Wn,a).addScaledVector(Xn,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Ua={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},fn={h:0,s:0,l:0},Vi={h:0,s:0,l:0};function Ws(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Ht{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ge){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Kt.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=Kt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Kt.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=Kt.workingColorSpace){if(t=Mr(t,1),e=Ae(e,0,1),n=Ae(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=Ws(a,r,t+1/3),this.g=Ws(a,r,t),this.b=Ws(a,r,t-1/3)}return Kt.toWorkingColorSpace(this,i),this}setStyle(t,e=ge){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const a=i[1],o=i[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=i[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ge){const n=Ua[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=oi(t.r),this.g=oi(t.g),this.b=oi(t.b),this}copyLinearToSRGB(t){return this.r=Ds(t.r),this.g=Ds(t.g),this.b=Ds(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ge){return Kt.fromWorkingColorSpace(xe.copy(this),t),Math.round(Ae(xe.r*255,0,255))*65536+Math.round(Ae(xe.g*255,0,255))*256+Math.round(Ae(xe.b*255,0,255))}getHexString(t=ge){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Kt.workingColorSpace){Kt.fromWorkingColorSpace(xe.copy(this),e);const n=xe.r,i=xe.g,r=xe.b,a=Math.max(n,i,r),o=Math.min(n,i,r);let c,l;const h=(o+a)/2;if(o===a)c=0,l=0;else{const d=a-o;switch(l=h<=.5?d/(a+o):d/(2-a-o),a){case n:c=(i-r)/d+(i<r?6:0);break;case i:c=(r-n)/d+2;break;case r:c=(n-i)/d+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=Kt.workingColorSpace){return Kt.fromWorkingColorSpace(xe.copy(this),e),t.r=xe.r,t.g=xe.g,t.b=xe.b,t}getStyle(t=ge){Kt.fromWorkingColorSpace(xe.copy(this),t);const e=xe.r,n=xe.g,i=xe.b;return t!==ge?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(fn),this.setHSL(fn.h+t,fn.s+e,fn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(fn),t.getHSL(Vi);const n=Ei(fn.h,Vi.h,e),i=Ei(fn.s,Vi.s,e),r=Ei(fn.l,Vi.l,e);return this.setHSL(n,i,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*i,this.g=r[1]*e+r[4]*n+r[7]*i,this.b=r[2]*e+r[5]*n+r[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const xe=new Ht;Ht.NAMES=Ua;let Rl=0;class Fn extends di{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Rl++}),this.uuid=an(),this.name="",this.type="Material",this.blending=ri,this.side=Mn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=sr,this.blendDst=rr,this.blendEquation=Cn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ht(0,0,0),this.blendAlpha=0,this.depthFunc=as,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=mo,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Bn,this.stencilZFail=Bn,this.stencilZPass=Bn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ri&&(n.blending=this.blending),this.side!==Mn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==sr&&(n.blendSrc=this.blendSrc),this.blendDst!==rr&&(n.blendDst=this.blendDst),this.blendEquation!==Cn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==as&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==mo&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Bn&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Bn&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Bn&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const a=[];for(const o in r){const c=r[o];delete c.metadata,a.push(c)}return a}if(e){const r=i(t.textures),a=i(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Ce extends Fn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ht(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=_a,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const le=new C,Wi=new xt;class Ye{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=hr,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=gn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Wi.fromBufferAttribute(this,e),Wi.applyMatrix3(t),this.setXY(e,Wi.x,Wi.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)le.fromBufferAttribute(this,e),le.applyMatrix3(t),this.setXYZ(e,le.x,le.y,le.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)le.fromBufferAttribute(this,e),le.applyMatrix4(t),this.setXYZ(e,le.x,le.y,le.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)le.fromBufferAttribute(this,e),le.applyNormalMatrix(t),this.setXYZ(e,le.x,le.y,le.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)le.fromBufferAttribute(this,e),le.transformDirection(t),this.setXYZ(e,le.x,le.y,le.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ze(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Zt(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ze(e,this.array)),e}setX(t,e){return this.normalized&&(e=Zt(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ze(e,this.array)),e}setY(t,e){return this.normalized&&(e=Zt(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ze(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Zt(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ze(e,this.array)),e}setW(t,e){return this.normalized&&(e=Zt(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Zt(e,this.array),n=Zt(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=Zt(e,this.array),n=Zt(n,this.array),i=Zt(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t*=this.itemSize,this.normalized&&(e=Zt(e,this.array),n=Zt(n,this.array),i=Zt(i,this.array),r=Zt(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==hr&&(t.usage=this.usage),t}}class Na extends Ye{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class Fa extends Ye{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class $t extends Ye{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Ll=0;const Be=new ae,Xs=new he,qn=new C,Ne=new Li,_i=new Li,me=new C;class Me extends di{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ll++}),this.uuid=an(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(La(t)?Fa:Na)(t,1):this.index=t,this}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new kt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Be.makeRotationFromQuaternion(t),this.applyMatrix4(Be),this}rotateX(t){return Be.makeRotationX(t),this.applyMatrix4(Be),this}rotateY(t){return Be.makeRotationY(t),this.applyMatrix4(Be),this}rotateZ(t){return Be.makeRotationZ(t),this.applyMatrix4(Be),this}translate(t,e,n){return Be.makeTranslation(t,e,n),this.applyMatrix4(Be),this}scale(t,e,n){return Be.makeScale(t,e,n),this.applyMatrix4(Be),this}lookAt(t){return Xs.lookAt(t),Xs.updateMatrix(),this.applyMatrix4(Xs.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(qn).negate(),this.translate(qn.x,qn.y,qn.z),this}setFromPoints(t){const e=[];for(let n=0,i=t.length;n<i;n++){const r=t[n];e.push(r.x,r.y,r.z||0)}return this.setAttribute("position",new $t(e,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Li);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const r=e[n];Ne.setFromBufferAttribute(r),this.morphTargetsRelative?(me.addVectors(this.boundingBox.min,Ne.min),this.boundingBox.expandByPoint(me),me.addVectors(this.boundingBox.max,Ne.max),this.boundingBox.expandByPoint(me)):(this.boundingBox.expandByPoint(Ne.min),this.boundingBox.expandByPoint(Ne.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new vs);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new C,1/0);return}if(t){const n=this.boundingSphere.center;if(Ne.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){const o=e[r];_i.setFromBufferAttribute(o),this.morphTargetsRelative?(me.addVectors(Ne.min,_i.min),Ne.expandByPoint(me),me.addVectors(Ne.max,_i.max),Ne.expandByPoint(me)):(Ne.expandByPoint(_i.min),Ne.expandByPoint(_i.max))}Ne.getCenter(n);let i=0;for(let r=0,a=t.count;r<a;r++)me.fromBufferAttribute(t,r),i=Math.max(i,n.distanceToSquared(me));if(e)for(let r=0,a=e.length;r<a;r++){const o=e[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)me.fromBufferAttribute(o,l),c&&(qn.fromBufferAttribute(t,l),me.add(qn)),i=Math.max(i,n.distanceToSquared(me))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.array,i=e.position.array,r=e.normal.array,a=e.uv.array,o=i.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ye(new Float32Array(4*o),4));const c=this.getAttribute("tangent").array,l=[],h=[];for(let b=0;b<o;b++)l[b]=new C,h[b]=new C;const d=new C,u=new C,m=new C,g=new xt,_=new xt,p=new xt,f=new C,M=new C;function v(b,z,H){d.fromArray(i,b*3),u.fromArray(i,z*3),m.fromArray(i,H*3),g.fromArray(a,b*2),_.fromArray(a,z*2),p.fromArray(a,H*2),u.sub(d),m.sub(d),_.sub(g),p.sub(g);const tt=1/(_.x*p.y-p.x*_.y);isFinite(tt)&&(f.copy(u).multiplyScalar(p.y).addScaledVector(m,-_.y).multiplyScalar(tt),M.copy(m).multiplyScalar(_.x).addScaledVector(u,-p.x).multiplyScalar(tt),l[b].add(f),l[z].add(f),l[H].add(f),h[b].add(M),h[z].add(M),h[H].add(M))}let w=this.groups;w.length===0&&(w=[{start:0,count:n.length}]);for(let b=0,z=w.length;b<z;++b){const H=w[b],tt=H.start,P=H.count;for(let O=tt,W=tt+P;O<W;O+=3)v(n[O+0],n[O+1],n[O+2])}const R=new C,S=new C,A=new C,I=new C;function y(b){A.fromArray(r,b*3),I.copy(A);const z=l[b];R.copy(z),R.sub(A.multiplyScalar(A.dot(z))).normalize(),S.crossVectors(I,z);const tt=S.dot(h[b])<0?-1:1;c[b*4]=R.x,c[b*4+1]=R.y,c[b*4+2]=R.z,c[b*4+3]=tt}for(let b=0,z=w.length;b<z;++b){const H=w[b],tt=H.start,P=H.count;for(let O=tt,W=tt+P;O<W;O+=3)y(n[O+0]),y(n[O+1]),y(n[O+2])}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ye(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,m=n.count;u<m;u++)n.setXYZ(u,0,0,0);const i=new C,r=new C,a=new C,o=new C,c=new C,l=new C,h=new C,d=new C;if(t)for(let u=0,m=t.count;u<m;u+=3){const g=t.getX(u+0),_=t.getX(u+1),p=t.getX(u+2);i.fromBufferAttribute(e,g),r.fromBufferAttribute(e,_),a.fromBufferAttribute(e,p),h.subVectors(a,r),d.subVectors(i,r),h.cross(d),o.fromBufferAttribute(n,g),c.fromBufferAttribute(n,_),l.fromBufferAttribute(n,p),o.add(h),c.add(h),l.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,c.x,c.y,c.z),n.setXYZ(p,l.x,l.y,l.z)}else for(let u=0,m=e.count;u<m;u+=3)i.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),d.subVectors(i,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)me.fromBufferAttribute(t,e),me.normalize(),t.setXYZ(e,me.x,me.y,me.z)}toNonIndexed(){function t(o,c){const l=o.array,h=o.itemSize,d=o.normalized,u=new l.constructor(c.length*h);let m=0,g=0;for(let _=0,p=c.length;_<p;_++){o.isInterleavedBufferAttribute?m=c[_]*o.data.stride+o.offset:m=c[_]*h;for(let f=0;f<h;f++)u[g++]=l[m++]}return new Ye(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Me,n=this.index.array,i=this.attributes;for(const o in i){const c=i[o],l=t(c,n);e.setAttribute(o,l)}const r=this.morphAttributes;for(const o in r){const c=[],l=r[o];for(let h=0,d=l.length;h<d;h++){const u=l[h],m=t(u,n);c.push(m)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const c in n){const l=n[c];t.data.attributes[c]=l.toJSON(t.data)}const i={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){const m=l[d];h.push(m.toJSON(t.data))}h.length>0&&(i[c]=h,r=!0)}r&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(e))}const r=t.morphAttributes;for(const l in r){const h=[],d=r[l];for(let u=0,m=d.length;u<m;u++)h.push(d[u].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let l=0,h=a.length;l<h;l++){const d=a[l];this.addGroup(d.start,d.count,d.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ro=new ae,bn=new yr,Xi=new vs,Lo=new C,Yn=new C,$n=new C,jn=new C,qs=new C,qi=new C,Yi=new xt,$i=new xt,ji=new xt,Po=new C,Do=new C,Io=new C,Zi=new C,Ki=new C;class G extends he{constructor(t=new Me,e=new Ce){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const o=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const o=this.morphTargetInfluences;if(r&&o){qi.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=o[c],d=r[c];h!==0&&(qs.fromBufferAttribute(d,t),a?qi.addScaledVector(qs,h):qi.addScaledVector(qs.sub(e),h))}e.add(qi)}return e}raycast(t,e){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Xi.copy(n.boundingSphere),Xi.applyMatrix4(r),bn.copy(t.ray).recast(t.near),!(Xi.containsPoint(bn.origin)===!1&&(bn.intersectSphere(Xi,Lo)===null||bn.origin.distanceToSquared(Lo)>(t.far-t.near)**2))&&(Ro.copy(r).invert(),bn.copy(t.ray).applyMatrix4(Ro),!(n.boundingBox!==null&&bn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,bn)))}_computeIntersections(t,e,n){let i;const r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,m=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=u.length;g<_;g++){const p=u[g],f=a[p.materialIndex],M=Math.max(p.start,m.start),v=Math.min(o.count,Math.min(p.start+p.count,m.start+m.count));for(let w=M,R=v;w<R;w+=3){const S=o.getX(w),A=o.getX(w+1),I=o.getX(w+2);i=Ji(this,f,t,n,l,h,d,S,A,I),i&&(i.faceIndex=Math.floor(w/3),i.face.materialIndex=p.materialIndex,e.push(i))}}else{const g=Math.max(0,m.start),_=Math.min(o.count,m.start+m.count);for(let p=g,f=_;p<f;p+=3){const M=o.getX(p),v=o.getX(p+1),w=o.getX(p+2);i=Ji(this,a,t,n,l,h,d,M,v,w),i&&(i.faceIndex=Math.floor(p/3),e.push(i))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,_=u.length;g<_;g++){const p=u[g],f=a[p.materialIndex],M=Math.max(p.start,m.start),v=Math.min(c.count,Math.min(p.start+p.count,m.start+m.count));for(let w=M,R=v;w<R;w+=3){const S=w,A=w+1,I=w+2;i=Ji(this,f,t,n,l,h,d,S,A,I),i&&(i.faceIndex=Math.floor(w/3),i.face.materialIndex=p.materialIndex,e.push(i))}}else{const g=Math.max(0,m.start),_=Math.min(c.count,m.start+m.count);for(let p=g,f=_;p<f;p+=3){const M=p,v=p+1,w=p+2;i=Ji(this,a,t,n,l,h,d,M,v,w),i&&(i.faceIndex=Math.floor(p/3),e.push(i))}}}}function Pl(s,t,e,n,i,r,a,o){let c;if(t.side===Pe?c=n.intersectTriangle(a,r,i,!0,o):c=n.intersectTriangle(i,r,a,t.side===Mn,o),c===null)return null;Ki.copy(o),Ki.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(Ki);return l<e.near||l>e.far?null:{distance:l,point:Ki.clone(),object:s}}function Ji(s,t,e,n,i,r,a,o,c,l){s.getVertexPosition(o,Yn),s.getVertexPosition(c,$n),s.getVertexPosition(l,jn);const h=Pl(s,t,e,n,Yn,$n,jn,Zi);if(h){i&&(Yi.fromBufferAttribute(i,o),$i.fromBufferAttribute(i,c),ji.fromBufferAttribute(i,l),h.uv=ze.getInterpolation(Zi,Yn,$n,jn,Yi,$i,ji,new xt)),r&&(Yi.fromBufferAttribute(r,o),$i.fromBufferAttribute(r,c),ji.fromBufferAttribute(r,l),h.uv1=ze.getInterpolation(Zi,Yn,$n,jn,Yi,$i,ji,new xt),h.uv2=h.uv1),a&&(Po.fromBufferAttribute(a,o),Do.fromBufferAttribute(a,c),Io.fromBufferAttribute(a,l),h.normal=ze.getInterpolation(Zi,Yn,$n,jn,Po,Do,Io,new C),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a:o,b:c,c:l,normal:new C,materialIndex:0};ze.getNormal(Yn,$n,jn,d.normal),h.face=d}return h}class ct extends Me{constructor(t=1,e=1,n=1,i=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:r,depthSegments:a};const o=this;i=Math.floor(i),r=Math.floor(r),a=Math.floor(a);const c=[],l=[],h=[],d=[];let u=0,m=0;g("z","y","x",-1,-1,n,e,t,a,r,0),g("z","y","x",1,-1,n,e,-t,a,r,1),g("x","z","y",1,1,t,n,e,i,a,2),g("x","z","y",1,-1,t,n,-e,i,a,3),g("x","y","z",1,-1,t,e,n,i,r,4),g("x","y","z",-1,-1,t,e,-n,i,r,5),this.setIndex(c),this.setAttribute("position",new $t(l,3)),this.setAttribute("normal",new $t(h,3)),this.setAttribute("uv",new $t(d,2));function g(_,p,f,M,v,w,R,S,A,I,y){const b=w/A,z=R/I,H=w/2,tt=R/2,P=S/2,O=A+1,W=I+1;let Y=0,X=0;const q=new C;for(let $=0;$<W;$++){const et=$*z-tt;for(let nt=0;nt<O;nt++){const V=nt*b-H;q[_]=V*M,q[p]=et*v,q[f]=P,l.push(q.x,q.y,q.z),q[_]=0,q[p]=0,q[f]=S>0?1:-1,h.push(q.x,q.y,q.z),d.push(nt/A),d.push(1-$/I),Y+=1}}for(let $=0;$<I;$++)for(let et=0;et<A;et++){const nt=u+et+O*$,V=u+et+O*($+1),j=u+(et+1)+O*($+1),lt=u+(et+1)+O*$;c.push(nt,V,lt),c.push(V,j,lt),X+=6}o.addGroup(m,X,y),m+=X,u+=Y}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ct(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function hi(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function be(s){const t={};for(let e=0;e<s.length;e++){const n=hi(s[e]);for(const i in n)t[i]=n[i]}return t}function Dl(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function Ba(s){return s.getRenderTarget()===null?s.outputColorSpace:Kt.workingColorSpace}const Il={clone:hi,merge:be};var Ul=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Nl=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Nn extends Fn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ul,this.fragmentShader=Nl,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=hi(t.uniforms),this.uniformsGroups=Dl(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const a=this.uniforms[i].value;a&&a.isTexture?e.uniforms[i]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[i]={type:"m4",value:a.toArray()}:e.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class Oa extends he{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ae,this.projectionMatrix=new ae,this.projectionMatrixInverse=new ae,this.coordinateSystem=rn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}class Re extends Oa{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Ci*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Si*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Ci*2*Math.atan(Math.tan(Si*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(t,e,n,i,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Si*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,r=-.5*i;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*i/c,e-=a.offsetY*n/l,i*=a.width/c,n*=a.height/l}const o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Zn=-90,Kn=1;class Fl extends he{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Re(Zn,Kn,t,e);i.layers=this.layers,this.add(i);const r=new Re(Zn,Kn,t,e);r.layers=this.layers,this.add(r);const a=new Re(Zn,Kn,t,e);a.layers=this.layers,this.add(a);const o=new Re(Zn,Kn,t,e);o.layers=this.layers,this.add(o);const c=new Re(Zn,Kn,t,e);c.layers=this.layers,this.add(c);const l=new Re(Zn,Kn,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,r,a,o,c]=e;for(const l of e)this.remove(l);if(t===rn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===ds)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,c,l,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,r),t.setRenderTarget(n,1,i),t.render(e,a),t.setRenderTarget(n,2,i),t.render(e,o),t.setRenderTarget(n,3,i),t.render(e,c),t.setRenderTarget(n,4,i),t.render(e,l),n.texture.generateMipmaps=_,t.setRenderTarget(n,5,i),t.render(e,h),t.setRenderTarget(d,u,m),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class Ga extends De{constructor(t,e,n,i,r,a,o,c,l,h){t=t!==void 0?t:[],e=e!==void 0?e:ai,super(t,e,n,i,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Bl extends Un{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];e.encoding!==void 0&&(wi("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),e.colorSpace=e.encoding===Dn?ge:ke),this.texture=new Ga(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:Ge}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new ct(5,5,5),r=new Nn({name:"CubemapFromEquirect",uniforms:hi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Pe,blending:_n});r.uniforms.tEquirect.value=e;const a=new G(i,r),o=e.minFilter;return e.minFilter===Ti&&(e.minFilter=Ge),new Fl(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e,n,i){const r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,i);t.setRenderTarget(r)}}const Ys=new C,Ol=new C,Gl=new kt;class pn{constructor(t=new C(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Ys.subVectors(n,e).cross(Ol.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ys),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Gl.getNormalMatrix(t),i=this.coplanarPoint(Ys).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Tn=new vs,Qi=new C;class Er{constructor(t=new pn,e=new pn,n=new pn,i=new pn,r=new pn,a=new pn){this.planes=[t,e,n,i,r,a]}set(t,e,n,i,r,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(i),o[4].copy(r),o[5].copy(a),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=rn){const n=this.planes,i=t.elements,r=i[0],a=i[1],o=i[2],c=i[3],l=i[4],h=i[5],d=i[6],u=i[7],m=i[8],g=i[9],_=i[10],p=i[11],f=i[12],M=i[13],v=i[14],w=i[15];if(n[0].setComponents(c-r,u-l,p-m,w-f).normalize(),n[1].setComponents(c+r,u+l,p+m,w+f).normalize(),n[2].setComponents(c+a,u+h,p+g,w+M).normalize(),n[3].setComponents(c-a,u-h,p-g,w-M).normalize(),n[4].setComponents(c-o,u-d,p-_,w-v).normalize(),e===rn)n[5].setComponents(c+o,u+d,p+_,w+v).normalize();else if(e===ds)n[5].setComponents(o,d,_,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Tn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Tn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Tn)}intersectsSprite(t){return Tn.center.set(0,0,0),Tn.radius=.7071067811865476,Tn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Tn)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(Qi.x=i.normal.x>0?t.max.x:t.min.x,Qi.y=i.normal.y>0?t.max.y:t.min.y,Qi.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(Qi)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function za(){let s=null,t=!1,e=null,n=null;function i(r,a){e(r,a),n=s.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){s=r}}}function zl(s,t){const e=t.isWebGL2,n=new WeakMap;function i(l,h){const d=l.array,u=l.usage,m=d.byteLength,g=s.createBuffer();s.bindBuffer(h,g),s.bufferData(h,d,u),l.onUploadCallback();let _;if(d instanceof Float32Array)_=s.FLOAT;else if(d instanceof Uint16Array)if(l.isFloat16BufferAttribute)if(e)_=s.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else _=s.UNSIGNED_SHORT;else if(d instanceof Int16Array)_=s.SHORT;else if(d instanceof Uint32Array)_=s.UNSIGNED_INT;else if(d instanceof Int32Array)_=s.INT;else if(d instanceof Int8Array)_=s.BYTE;else if(d instanceof Uint8Array)_=s.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)_=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:g,type:_,bytesPerElement:d.BYTES_PER_ELEMENT,version:l.version,size:m}}function r(l,h,d){const u=h.array,m=h._updateRange,g=h.updateRanges;if(s.bindBuffer(d,l),m.count===-1&&g.length===0&&s.bufferSubData(d,0,u),g.length!==0){for(let _=0,p=g.length;_<p;_++){const f=g[_];e?s.bufferSubData(d,f.start*u.BYTES_PER_ELEMENT,u,f.start,f.count):s.bufferSubData(d,f.start*u.BYTES_PER_ELEMENT,u.subarray(f.start,f.start+f.count))}h.clearUpdateRanges()}m.count!==-1&&(e?s.bufferSubData(d,m.offset*u.BYTES_PER_ELEMENT,u,m.offset,m.count):s.bufferSubData(d,m.offset*u.BYTES_PER_ELEMENT,u.subarray(m.offset,m.offset+m.count)),m.count=-1),h.onUploadCallback()}function a(l){return l.isInterleavedBufferAttribute&&(l=l.data),n.get(l)}function o(l){l.isInterleavedBufferAttribute&&(l=l.data);const h=n.get(l);h&&(s.deleteBuffer(h.buffer),n.delete(l))}function c(l,h){if(l.isGLBufferAttribute){const u=n.get(l);(!u||u.version<l.version)&&n.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}l.isInterleavedBufferAttribute&&(l=l.data);const d=n.get(l);if(d===void 0)n.set(l,i(l,h));else if(d.version<l.version){if(d.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(d.buffer,l,h),d.version=l.version}}return{get:a,remove:o,update:c}}class on extends Me{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const r=t/2,a=e/2,o=Math.floor(n),c=Math.floor(i),l=o+1,h=c+1,d=t/o,u=e/c,m=[],g=[],_=[],p=[];for(let f=0;f<h;f++){const M=f*u-a;for(let v=0;v<l;v++){const w=v*d-r;g.push(w,-M,0),_.push(0,0,1),p.push(v/o),p.push(1-f/c)}}for(let f=0;f<c;f++)for(let M=0;M<o;M++){const v=M+l*f,w=M+l*(f+1),R=M+1+l*(f+1),S=M+1+l*f;m.push(v,w,S),m.push(w,R,S)}this.setIndex(m),this.setAttribute("position",new $t(g,3)),this.setAttribute("normal",new $t(_,3)),this.setAttribute("uv",new $t(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new on(t.width,t.height,t.widthSegments,t.heightSegments)}}var kl=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Hl=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Vl=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Wl=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Xl=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,ql=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Yl=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,$l=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,jl=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Zl=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,Kl=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Jl=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ql=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,th=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,eh=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,nh=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,ih=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,sh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,rh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,oh=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,ah=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,ch=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,lh=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,hh=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,dh=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,uh=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,fh=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,ph=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,mh=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,gh=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,_h="gl_FragColor = linearToOutputTexel( gl_FragColor );",vh=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,xh=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Mh=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,yh=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Sh=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Eh=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,wh=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,bh=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Th=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ah=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ch=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Rh=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,Lh=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ph=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Dh=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Ih=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Uh=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Nh=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Fh=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Bh=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Oh=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Gh=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,zh=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,kh=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Hh=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Vh=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Wh=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Xh=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,qh=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,Yh=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,$h=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,jh=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Zh=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Kh=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Jh=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Qh=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,td=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,ed=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,nd=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,id=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,sd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,rd=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,od=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ad=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,cd=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,ld=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,hd=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,dd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ud=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,fd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,pd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,md=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,gd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,_d=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,vd=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,xd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Md=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,yd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Sd=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,Ed=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,wd=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,bd=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Td=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ad=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Cd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Rd=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Ld=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Pd=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Dd=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Id=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Ud=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Nd=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Fd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Bd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Od=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Gd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const zd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,kd=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Vd=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Xd=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qd=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Yd=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,$d=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,jd=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Zd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Kd=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Jd=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Qd=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,tu=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,eu=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nu=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,iu=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,su=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,ru=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ou=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,au=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,cu=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,lu=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hu=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,du=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,uu=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fu=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pu=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,mu=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gu=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_u=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,vu=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,xu=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ut={alphahash_fragment:kl,alphahash_pars_fragment:Hl,alphamap_fragment:Vl,alphamap_pars_fragment:Wl,alphatest_fragment:Xl,alphatest_pars_fragment:ql,aomap_fragment:Yl,aomap_pars_fragment:$l,batching_pars_vertex:jl,batching_vertex:Zl,begin_vertex:Kl,beginnormal_vertex:Jl,bsdfs:Ql,iridescence_fragment:th,bumpmap_pars_fragment:eh,clipping_planes_fragment:nh,clipping_planes_pars_fragment:ih,clipping_planes_pars_vertex:sh,clipping_planes_vertex:rh,color_fragment:oh,color_pars_fragment:ah,color_pars_vertex:ch,color_vertex:lh,common:hh,cube_uv_reflection_fragment:dh,defaultnormal_vertex:uh,displacementmap_pars_vertex:fh,displacementmap_vertex:ph,emissivemap_fragment:mh,emissivemap_pars_fragment:gh,colorspace_fragment:_h,colorspace_pars_fragment:vh,envmap_fragment:xh,envmap_common_pars_fragment:Mh,envmap_pars_fragment:yh,envmap_pars_vertex:Sh,envmap_physical_pars_fragment:Uh,envmap_vertex:Eh,fog_vertex:wh,fog_pars_vertex:bh,fog_fragment:Th,fog_pars_fragment:Ah,gradientmap_pars_fragment:Ch,lightmap_fragment:Rh,lightmap_pars_fragment:Lh,lights_lambert_fragment:Ph,lights_lambert_pars_fragment:Dh,lights_pars_begin:Ih,lights_toon_fragment:Nh,lights_toon_pars_fragment:Fh,lights_phong_fragment:Bh,lights_phong_pars_fragment:Oh,lights_physical_fragment:Gh,lights_physical_pars_fragment:zh,lights_fragment_begin:kh,lights_fragment_maps:Hh,lights_fragment_end:Vh,logdepthbuf_fragment:Wh,logdepthbuf_pars_fragment:Xh,logdepthbuf_pars_vertex:qh,logdepthbuf_vertex:Yh,map_fragment:$h,map_pars_fragment:jh,map_particle_fragment:Zh,map_particle_pars_fragment:Kh,metalnessmap_fragment:Jh,metalnessmap_pars_fragment:Qh,morphcolor_vertex:td,morphnormal_vertex:ed,morphtarget_pars_vertex:nd,morphtarget_vertex:id,normal_fragment_begin:sd,normal_fragment_maps:rd,normal_pars_fragment:od,normal_pars_vertex:ad,normal_vertex:cd,normalmap_pars_fragment:ld,clearcoat_normal_fragment_begin:hd,clearcoat_normal_fragment_maps:dd,clearcoat_pars_fragment:ud,iridescence_pars_fragment:fd,opaque_fragment:pd,packing:md,premultiplied_alpha_fragment:gd,project_vertex:_d,dithering_fragment:vd,dithering_pars_fragment:xd,roughnessmap_fragment:Md,roughnessmap_pars_fragment:yd,shadowmap_pars_fragment:Sd,shadowmap_pars_vertex:Ed,shadowmap_vertex:wd,shadowmask_pars_fragment:bd,skinbase_vertex:Td,skinning_pars_vertex:Ad,skinning_vertex:Cd,skinnormal_vertex:Rd,specularmap_fragment:Ld,specularmap_pars_fragment:Pd,tonemapping_fragment:Dd,tonemapping_pars_fragment:Id,transmission_fragment:Ud,transmission_pars_fragment:Nd,uv_pars_fragment:Fd,uv_pars_vertex:Bd,uv_vertex:Od,worldpos_vertex:Gd,background_vert:zd,background_frag:kd,backgroundCube_vert:Hd,backgroundCube_frag:Vd,cube_vert:Wd,cube_frag:Xd,depth_vert:qd,depth_frag:Yd,distanceRGBA_vert:$d,distanceRGBA_frag:jd,equirect_vert:Zd,equirect_frag:Kd,linedashed_vert:Jd,linedashed_frag:Qd,meshbasic_vert:tu,meshbasic_frag:eu,meshlambert_vert:nu,meshlambert_frag:iu,meshmatcap_vert:su,meshmatcap_frag:ru,meshnormal_vert:ou,meshnormal_frag:au,meshphong_vert:cu,meshphong_frag:lu,meshphysical_vert:hu,meshphysical_frag:du,meshtoon_vert:uu,meshtoon_frag:fu,points_vert:pu,points_frag:mu,shadow_vert:gu,shadow_frag:_u,sprite_vert:vu,sprite_frag:xu},st={common:{diffuse:{value:new Ht(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new kt},alphaMap:{value:null},alphaMapTransform:{value:new kt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new kt}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new kt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new kt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new kt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new kt},normalScale:{value:new xt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new kt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new kt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new kt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new kt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ht(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ht(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new kt},alphaTest:{value:0},uvTransform:{value:new kt}},sprite:{diffuse:{value:new Ht(16777215)},opacity:{value:1},center:{value:new xt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new kt},alphaMap:{value:null},alphaMapTransform:{value:new kt},alphaTest:{value:0}}},je={basic:{uniforms:be([st.common,st.specularmap,st.envmap,st.aomap,st.lightmap,st.fog]),vertexShader:Ut.meshbasic_vert,fragmentShader:Ut.meshbasic_frag},lambert:{uniforms:be([st.common,st.specularmap,st.envmap,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.fog,st.lights,{emissive:{value:new Ht(0)}}]),vertexShader:Ut.meshlambert_vert,fragmentShader:Ut.meshlambert_frag},phong:{uniforms:be([st.common,st.specularmap,st.envmap,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.fog,st.lights,{emissive:{value:new Ht(0)},specular:{value:new Ht(1118481)},shininess:{value:30}}]),vertexShader:Ut.meshphong_vert,fragmentShader:Ut.meshphong_frag},standard:{uniforms:be([st.common,st.envmap,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.roughnessmap,st.metalnessmap,st.fog,st.lights,{emissive:{value:new Ht(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ut.meshphysical_vert,fragmentShader:Ut.meshphysical_frag},toon:{uniforms:be([st.common,st.aomap,st.lightmap,st.emissivemap,st.bumpmap,st.normalmap,st.displacementmap,st.gradientmap,st.fog,st.lights,{emissive:{value:new Ht(0)}}]),vertexShader:Ut.meshtoon_vert,fragmentShader:Ut.meshtoon_frag},matcap:{uniforms:be([st.common,st.bumpmap,st.normalmap,st.displacementmap,st.fog,{matcap:{value:null}}]),vertexShader:Ut.meshmatcap_vert,fragmentShader:Ut.meshmatcap_frag},points:{uniforms:be([st.points,st.fog]),vertexShader:Ut.points_vert,fragmentShader:Ut.points_frag},dashed:{uniforms:be([st.common,st.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ut.linedashed_vert,fragmentShader:Ut.linedashed_frag},depth:{uniforms:be([st.common,st.displacementmap]),vertexShader:Ut.depth_vert,fragmentShader:Ut.depth_frag},normal:{uniforms:be([st.common,st.bumpmap,st.normalmap,st.displacementmap,{opacity:{value:1}}]),vertexShader:Ut.meshnormal_vert,fragmentShader:Ut.meshnormal_frag},sprite:{uniforms:be([st.sprite,st.fog]),vertexShader:Ut.sprite_vert,fragmentShader:Ut.sprite_frag},background:{uniforms:{uvTransform:{value:new kt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ut.background_vert,fragmentShader:Ut.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Ut.backgroundCube_vert,fragmentShader:Ut.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ut.cube_vert,fragmentShader:Ut.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ut.equirect_vert,fragmentShader:Ut.equirect_frag},distanceRGBA:{uniforms:be([st.common,st.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ut.distanceRGBA_vert,fragmentShader:Ut.distanceRGBA_frag},shadow:{uniforms:be([st.lights,st.fog,{color:{value:new Ht(0)},opacity:{value:1}}]),vertexShader:Ut.shadow_vert,fragmentShader:Ut.shadow_frag}};je.physical={uniforms:be([je.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new kt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new kt},clearcoatNormalScale:{value:new xt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new kt},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new kt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new kt},sheen:{value:0},sheenColor:{value:new Ht(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new kt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new kt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new kt},transmissionSamplerSize:{value:new xt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new kt},attenuationDistance:{value:0},attenuationColor:{value:new Ht(0)},specularColor:{value:new Ht(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new kt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new kt},anisotropyVector:{value:new xt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new kt}}]),vertexShader:Ut.meshphysical_vert,fragmentShader:Ut.meshphysical_frag};const ts={r:0,b:0,g:0};function Mu(s,t,e,n,i,r,a){const o=new Ht(0);let c=r===!0?0:1,l,h,d=null,u=0,m=null;function g(p,f){let M=!1,v=f.isScene===!0?f.background:null;v&&v.isTexture&&(v=(f.backgroundBlurriness>0?e:t).get(v)),v===null?_(o,c):v&&v.isColor&&(_(v,1),M=!0);const w=s.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(s.autoClear||M)&&s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil),v&&(v.isCubeTexture||v.mapping===gs)?(h===void 0&&(h=new G(new ct(1,1,1),new Nn({name:"BackgroundCubeMaterial",uniforms:hi(je.backgroundCube.uniforms),vertexShader:je.backgroundCube.vertexShader,fragmentShader:je.backgroundCube.fragmentShader,side:Pe,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(R,S,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=f.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=f.backgroundIntensity,h.material.toneMapped=Kt.getTransfer(v.colorSpace)!==ee,(d!==v||u!==v.version||m!==s.toneMapping)&&(h.material.needsUpdate=!0,d=v,u=v.version,m=s.toneMapping),h.layers.enableAll(),p.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new G(new on(2,2),new Nn({name:"BackgroundMaterial",uniforms:hi(je.background.uniforms),vertexShader:je.background.vertexShader,fragmentShader:je.background.fragmentShader,side:Mn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=f.backgroundIntensity,l.material.toneMapped=Kt.getTransfer(v.colorSpace)!==ee,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(d!==v||u!==v.version||m!==s.toneMapping)&&(l.material.needsUpdate=!0,d=v,u=v.version,m=s.toneMapping),l.layers.enableAll(),p.unshift(l,l.geometry,l.material,0,0,null))}function _(p,f){p.getRGB(ts,Ba(s)),n.buffers.color.setClear(ts.r,ts.g,ts.b,f,a)}return{getClearColor:function(){return o},setClearColor:function(p,f=1){o.set(p),c=f,_(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(p){c=p,_(o,c)},render:g}}function yu(s,t,e,n){const i=s.getParameter(s.MAX_VERTEX_ATTRIBS),r=n.isWebGL2?null:t.get("OES_vertex_array_object"),a=n.isWebGL2||r!==null,o={},c=p(null);let l=c,h=!1;function d(P,O,W,Y,X){let q=!1;if(a){const $=_(Y,W,O);l!==$&&(l=$,m(l.object)),q=f(P,Y,W,X),q&&M(P,Y,W,X)}else{const $=O.wireframe===!0;(l.geometry!==Y.id||l.program!==W.id||l.wireframe!==$)&&(l.geometry=Y.id,l.program=W.id,l.wireframe=$,q=!0)}X!==null&&e.update(X,s.ELEMENT_ARRAY_BUFFER),(q||h)&&(h=!1,I(P,O,W,Y),X!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(X).buffer))}function u(){return n.isWebGL2?s.createVertexArray():r.createVertexArrayOES()}function m(P){return n.isWebGL2?s.bindVertexArray(P):r.bindVertexArrayOES(P)}function g(P){return n.isWebGL2?s.deleteVertexArray(P):r.deleteVertexArrayOES(P)}function _(P,O,W){const Y=W.wireframe===!0;let X=o[P.id];X===void 0&&(X={},o[P.id]=X);let q=X[O.id];q===void 0&&(q={},X[O.id]=q);let $=q[Y];return $===void 0&&($=p(u()),q[Y]=$),$}function p(P){const O=[],W=[],Y=[];for(let X=0;X<i;X++)O[X]=0,W[X]=0,Y[X]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:O,enabledAttributes:W,attributeDivisors:Y,object:P,attributes:{},index:null}}function f(P,O,W,Y){const X=l.attributes,q=O.attributes;let $=0;const et=W.getAttributes();for(const nt in et)if(et[nt].location>=0){const j=X[nt];let lt=q[nt];if(lt===void 0&&(nt==="instanceMatrix"&&P.instanceMatrix&&(lt=P.instanceMatrix),nt==="instanceColor"&&P.instanceColor&&(lt=P.instanceColor)),j===void 0||j.attribute!==lt||lt&&j.data!==lt.data)return!0;$++}return l.attributesNum!==$||l.index!==Y}function M(P,O,W,Y){const X={},q=O.attributes;let $=0;const et=W.getAttributes();for(const nt in et)if(et[nt].location>=0){let j=q[nt];j===void 0&&(nt==="instanceMatrix"&&P.instanceMatrix&&(j=P.instanceMatrix),nt==="instanceColor"&&P.instanceColor&&(j=P.instanceColor));const lt={};lt.attribute=j,j&&j.data&&(lt.data=j.data),X[nt]=lt,$++}l.attributes=X,l.attributesNum=$,l.index=Y}function v(){const P=l.newAttributes;for(let O=0,W=P.length;O<W;O++)P[O]=0}function w(P){R(P,0)}function R(P,O){const W=l.newAttributes,Y=l.enabledAttributes,X=l.attributeDivisors;W[P]=1,Y[P]===0&&(s.enableVertexAttribArray(P),Y[P]=1),X[P]!==O&&((n.isWebGL2?s:t.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](P,O),X[P]=O)}function S(){const P=l.newAttributes,O=l.enabledAttributes;for(let W=0,Y=O.length;W<Y;W++)O[W]!==P[W]&&(s.disableVertexAttribArray(W),O[W]=0)}function A(P,O,W,Y,X,q,$){$===!0?s.vertexAttribIPointer(P,O,W,X,q):s.vertexAttribPointer(P,O,W,Y,X,q)}function I(P,O,W,Y){if(n.isWebGL2===!1&&(P.isInstancedMesh||Y.isInstancedBufferGeometry)&&t.get("ANGLE_instanced_arrays")===null)return;v();const X=Y.attributes,q=W.getAttributes(),$=O.defaultAttributeValues;for(const et in q){const nt=q[et];if(nt.location>=0){let V=X[et];if(V===void 0&&(et==="instanceMatrix"&&P.instanceMatrix&&(V=P.instanceMatrix),et==="instanceColor"&&P.instanceColor&&(V=P.instanceColor)),V!==void 0){const j=V.normalized,lt=V.itemSize,_t=e.get(V);if(_t===void 0)continue;const gt=_t.buffer,Lt=_t.type,Dt=_t.bytesPerElement,wt=n.isWebGL2===!0&&(Lt===s.INT||Lt===s.UNSIGNED_INT||V.gpuType===Ma);if(V.isInterleavedBufferAttribute){const Xt=V.data,U=Xt.stride,ye=V.offset;if(Xt.isInstancedInterleavedBuffer){for(let Mt=0;Mt<nt.locationSize;Mt++)R(nt.location+Mt,Xt.meshPerAttribute);P.isInstancedMesh!==!0&&Y._maxInstanceCount===void 0&&(Y._maxInstanceCount=Xt.meshPerAttribute*Xt.count)}else for(let Mt=0;Mt<nt.locationSize;Mt++)w(nt.location+Mt);s.bindBuffer(s.ARRAY_BUFFER,gt);for(let Mt=0;Mt<nt.locationSize;Mt++)A(nt.location+Mt,lt/nt.locationSize,Lt,j,U*Dt,(ye+lt/nt.locationSize*Mt)*Dt,wt)}else{if(V.isInstancedBufferAttribute){for(let Xt=0;Xt<nt.locationSize;Xt++)R(nt.location+Xt,V.meshPerAttribute);P.isInstancedMesh!==!0&&Y._maxInstanceCount===void 0&&(Y._maxInstanceCount=V.meshPerAttribute*V.count)}else for(let Xt=0;Xt<nt.locationSize;Xt++)w(nt.location+Xt);s.bindBuffer(s.ARRAY_BUFFER,gt);for(let Xt=0;Xt<nt.locationSize;Xt++)A(nt.location+Xt,lt/nt.locationSize,Lt,j,lt*Dt,lt/nt.locationSize*Xt*Dt,wt)}}else if($!==void 0){const j=$[et];if(j!==void 0)switch(j.length){case 2:s.vertexAttrib2fv(nt.location,j);break;case 3:s.vertexAttrib3fv(nt.location,j);break;case 4:s.vertexAttrib4fv(nt.location,j);break;default:s.vertexAttrib1fv(nt.location,j)}}}}S()}function y(){H();for(const P in o){const O=o[P];for(const W in O){const Y=O[W];for(const X in Y)g(Y[X].object),delete Y[X];delete O[W]}delete o[P]}}function b(P){if(o[P.id]===void 0)return;const O=o[P.id];for(const W in O){const Y=O[W];for(const X in Y)g(Y[X].object),delete Y[X];delete O[W]}delete o[P.id]}function z(P){for(const O in o){const W=o[O];if(W[P.id]===void 0)continue;const Y=W[P.id];for(const X in Y)g(Y[X].object),delete Y[X];delete W[P.id]}}function H(){tt(),h=!0,l!==c&&(l=c,m(l.object))}function tt(){c.geometry=null,c.program=null,c.wireframe=!1}return{setup:d,reset:H,resetDefaultState:tt,dispose:y,releaseStatesOfGeometry:b,releaseStatesOfProgram:z,initAttributes:v,enableAttribute:w,disableUnusedAttributes:S}}function Su(s,t,e,n){const i=n.isWebGL2;let r;function a(h){r=h}function o(h,d){s.drawArrays(r,h,d),e.update(d,r,1)}function c(h,d,u){if(u===0)return;let m,g;if(i)m=s,g="drawArraysInstanced";else if(m=t.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",m===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[g](r,h,d,u),e.update(d,r,u)}function l(h,d,u){if(u===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<u;g++)this.render(h[g],d[g]);else{m.multiDrawArraysWEBGL(r,h,0,d,0,u);let g=0;for(let _=0;_<u;_++)g+=d[_];e.update(g,r,1)}}this.setMode=a,this.render=o,this.renderInstances=c,this.renderMultiDraw=l}function Eu(s,t,e){let n;function i(){if(n!==void 0)return n;if(t.has("EXT_texture_filter_anisotropic")===!0){const A=t.get("EXT_texture_filter_anisotropic");n=s.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function r(A){if(A==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}const a=typeof WebGL2RenderingContext<"u"&&s.constructor.name==="WebGL2RenderingContext";let o=e.precision!==void 0?e.precision:"highp";const c=r(o);c!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",c,"instead."),o=c);const l=a||t.has("WEBGL_draw_buffers"),h=e.logarithmicDepthBuffer===!0,d=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),u=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),m=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),_=s.getParameter(s.MAX_VERTEX_ATTRIBS),p=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),f=s.getParameter(s.MAX_VARYING_VECTORS),M=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),v=u>0,w=a||t.has("OES_texture_float"),R=v&&w,S=a?s.getParameter(s.MAX_SAMPLES):0;return{isWebGL2:a,drawBuffers:l,getMaxAnisotropy:i,getMaxPrecision:r,precision:o,logarithmicDepthBuffer:h,maxTextures:d,maxVertexTextures:u,maxTextureSize:m,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:p,maxVaryings:f,maxFragmentUniforms:M,vertexTextures:v,floatFragmentTextures:w,floatVertexTextures:R,maxSamples:S}}function wu(s){const t=this;let e=null,n=0,i=!1,r=!1;const a=new pn,o=new kt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const m=d.length!==0||u||n!==0||i;return i=u,n=d.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,m){const g=d.clippingPlanes,_=d.clipIntersection,p=d.clipShadows,f=s.get(d);if(!i||g===null||g.length===0||r&&!p)r?h(null):l();else{const M=r?0:n,v=M*4;let w=f.clippingState||null;c.value=w,w=h(g,u,v,m);for(let R=0;R!==v;++R)w[R]=e[R];f.clippingState=w,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=M}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,m,g){const _=d!==null?d.length:0;let p=null;if(_!==0){if(p=c.value,g!==!0||p===null){const f=m+_*4,M=u.matrixWorldInverse;o.getNormalMatrix(M),(p===null||p.length<f)&&(p=new Float32Array(f));for(let v=0,w=m;v!==_;++v,w+=4)a.copy(d[v]).applyMatrix4(M,o),a.normal.toArray(p,w),p[w+3]=a.constant}c.value=p,c.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,p}}function bu(s){let t=new WeakMap;function e(a,o){return o===or?a.mapping=ai:o===ar&&(a.mapping=ci),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===or||o===ar)if(t.has(a)){const c=t.get(a).texture;return e(c,a.mapping)}else{const c=a.image;if(c&&c.height>0){const l=new Bl(c.height/2);return l.fromEquirectangularTexture(s,a),t.set(a,l),a.addEventListener("dispose",i),e(l.texture,a.mapping)}else return null}}return a}function i(a){const o=a.target;o.removeEventListener("dispose",i);const c=t.get(o);c!==void 0&&(t.delete(o),c.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}class wr extends Oa{constructor(t=-1,e=1,n=1,i=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-t,a=n+t,o=i+e,c=i-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const ii=4,Uo=[.125,.215,.35,.446,.526,.582],Rn=20,$s=new wr,No=new Ht;let js=null,Zs=0,Ks=0;const An=(1+Math.sqrt(5))/2,Jn=1/An,Fo=[new C(1,1,1),new C(-1,1,1),new C(1,1,-1),new C(-1,1,-1),new C(0,An,Jn),new C(0,An,-Jn),new C(Jn,0,An),new C(-Jn,0,An),new C(An,Jn,0),new C(-An,Jn,0)];class Bo{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){js=this._renderer.getRenderTarget(),Zs=this._renderer.getActiveCubeFace(),Ks=this._renderer.getActiveMipmapLevel(),this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,n,i,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=zo(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Go(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(js,Zs,Ks),t.scissorTest=!1,es(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===ai||t.mapping===ci?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),js=this._renderer.getRenderTarget(),Zs=this._renderer.getActiveCubeFace(),Ks=this._renderer.getActiveMipmapLevel();const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Ge,minFilter:Ge,generateMipmaps:!1,type:Ai,format:qe,colorSpace:cn,depthBuffer:!1},i=Oo(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Oo(t,e,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Tu(r)),this._blurMaterial=Au(r,t,e)}return i}_compileMaterial(t){const e=new G(this._lodPlanes[0],t);this._renderer.compile(e,$s)}_sceneToCubeUV(t,e,n,i){const o=new Re(90,1,e,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(No),h.toneMapping=vn,h.autoClear=!1;const m=new Ce({name:"PMREM.Background",side:Pe,depthWrite:!1,depthTest:!1}),g=new G(new ct,m);let _=!1;const p=t.background;p?p.isColor&&(m.color.copy(p),t.background=null,_=!0):(m.color.copy(No),_=!0);for(let f=0;f<6;f++){const M=f%3;M===0?(o.up.set(0,c[f],0),o.lookAt(l[f],0,0)):M===1?(o.up.set(0,0,c[f]),o.lookAt(0,l[f],0)):(o.up.set(0,c[f],0),o.lookAt(0,0,l[f]));const v=this._cubeSize;es(i,M*v,f>2?v:0,v,v),h.setRenderTarget(i),_&&h.render(g,o),h.render(t,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=p}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===ai||t.mapping===ci;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=zo()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Go());const r=i?this._cubemapMaterial:this._equirectMaterial,a=new G(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=t;const c=this._cubeSize;es(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(a,$s)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;for(let i=1;i<this._lodPlanes.length;i++){const r=Math.sqrt(this._sigmas[i]*this._sigmas[i]-this._sigmas[i-1]*this._sigmas[i-1]),a=Fo[(i-1)%Fo.length];this._blur(t,i-1,i,r,a)}e.autoClear=n}_blur(t,e,n,i,r){const a=this._pingPongRenderTarget;this._halfBlur(t,a,e,n,i,"latitudinal",r),this._halfBlur(a,t,n,n,i,"longitudinal",r)}_halfBlur(t,e,n,i,r,a,o){const c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new G(this._lodPlanes[i],l),u=l.uniforms,m=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*Rn-1),_=r/g,p=isFinite(r)?1+Math.floor(h*_):Rn;p>Rn&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Rn}`);const f=[];let M=0;for(let A=0;A<Rn;++A){const I=A/_,y=Math.exp(-I*I/2);f.push(y),A===0?M+=y:A<p&&(M+=2*y)}for(let A=0;A<f.length;A++)f[A]=f[A]/M;u.envMap.value=t.texture,u.samples.value=p,u.weights.value=f,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:v}=this;u.dTheta.value=g,u.mipInt.value=v-n;const w=this._sizeLods[i],R=3*w*(i>v-ii?i-v+ii:0),S=4*(this._cubeSize-w);es(e,R,S,3*w,2*w),c.setRenderTarget(e),c.render(d,$s)}}function Tu(s){const t=[],e=[],n=[];let i=s;const r=s-ii+1+Uo.length;for(let a=0;a<r;a++){const o=Math.pow(2,i);e.push(o);let c=1/o;a>s-ii?c=Uo[a-s+ii-1]:a===0&&(c=0),n.push(c);const l=1/(o-2),h=-l,d=1+l,u=[h,h,d,h,d,d,h,h,d,d,h,d],m=6,g=6,_=3,p=2,f=1,M=new Float32Array(_*g*m),v=new Float32Array(p*g*m),w=new Float32Array(f*g*m);for(let S=0;S<m;S++){const A=S%3*2/3-1,I=S>2?0:-1,y=[A,I,0,A+2/3,I,0,A+2/3,I+1,0,A,I,0,A+2/3,I+1,0,A,I+1,0];M.set(y,_*g*S),v.set(u,p*g*S);const b=[S,S,S,S,S,S];w.set(b,f*g*S)}const R=new Me;R.setAttribute("position",new Ye(M,_)),R.setAttribute("uv",new Ye(v,p)),R.setAttribute("faceIndex",new Ye(w,f)),t.push(R),i>ii&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function Oo(s,t,e){const n=new Un(s,t,e);return n.texture.mapping=gs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function es(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function Au(s,t,e){const n=new Float32Array(Rn),i=new C(0,1,0);return new Nn({name:"SphericalGaussianBlur",defines:{n:Rn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:br(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:_n,depthTest:!1,depthWrite:!1})}function Go(){return new Nn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:br(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:_n,depthTest:!1,depthWrite:!1})}function zo(){return new Nn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:br(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:_n,depthTest:!1,depthWrite:!1})}function br(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Cu(s){let t=new WeakMap,e=null;function n(o){if(o&&o.isTexture){const c=o.mapping,l=c===or||c===ar,h=c===ai||c===ci;if(l||h)if(o.isRenderTargetTexture&&o.needsPMREMUpdate===!0){o.needsPMREMUpdate=!1;let d=t.get(o);return e===null&&(e=new Bo(s)),d=l?e.fromEquirectangular(o,d):e.fromCubemap(o,d),t.set(o,d),d.texture}else{if(t.has(o))return t.get(o).texture;{const d=o.image;if(l&&d&&d.height>0||h&&d&&i(d)){e===null&&(e=new Bo(s));const u=l?e.fromEquirectangular(o):e.fromCubemap(o);return t.set(o,u),o.addEventListener("dispose",r),u.texture}else return null}}}return o}function i(o){let c=0;const l=6;for(let h=0;h<l;h++)o[h]!==void 0&&c++;return c===l}function r(o){const c=o.target;c.removeEventListener("dispose",r);const l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function a(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:a}}function Ru(s){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(n){n.isWebGL2?(e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance")):(e("WEBGL_depth_texture"),e("OES_texture_float"),e("OES_texture_half_float"),e("OES_texture_half_float_linear"),e("OES_standard_derivatives"),e("OES_element_index_uint"),e("OES_vertex_array_object"),e("ANGLE_instanced_arrays")),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture")},get:function(n){const i=e(n);return i===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function Lu(s,t,e,n){const i={},r=new WeakMap;function a(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const g in u.attributes)t.remove(u.attributes[g]);for(const g in u.morphAttributes){const _=u.morphAttributes[g];for(let p=0,f=_.length;p<f;p++)t.remove(_[p])}u.removeEventListener("dispose",a),delete i[u.id];const m=r.get(u);m&&(t.remove(m),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(d,u){return i[u.id]===!0||(u.addEventListener("dispose",a),i[u.id]=!0,e.memory.geometries++),u}function c(d){const u=d.attributes;for(const g in u)t.update(u[g],s.ARRAY_BUFFER);const m=d.morphAttributes;for(const g in m){const _=m[g];for(let p=0,f=_.length;p<f;p++)t.update(_[p],s.ARRAY_BUFFER)}}function l(d){const u=[],m=d.index,g=d.attributes.position;let _=0;if(m!==null){const M=m.array;_=m.version;for(let v=0,w=M.length;v<w;v+=3){const R=M[v+0],S=M[v+1],A=M[v+2];u.push(R,S,S,A,A,R)}}else if(g!==void 0){const M=g.array;_=g.version;for(let v=0,w=M.length/3-1;v<w;v+=3){const R=v+0,S=v+1,A=v+2;u.push(R,S,S,A,A,R)}}else return;const p=new(La(u)?Fa:Na)(u,1);p.version=_;const f=r.get(d);f&&t.remove(f),r.set(d,p)}function h(d){const u=r.get(d);if(u){const m=d.index;m!==null&&u.version<m.version&&l(d)}else l(d);return r.get(d)}return{get:o,update:c,getWireframeAttribute:h}}function Pu(s,t,e,n){const i=n.isWebGL2;let r;function a(m){r=m}let o,c;function l(m){o=m.type,c=m.bytesPerElement}function h(m,g){s.drawElements(r,g,o,m*c),e.update(g,r,1)}function d(m,g,_){if(_===0)return;let p,f;if(i)p=s,f="drawElementsInstanced";else if(p=t.get("ANGLE_instanced_arrays"),f="drawElementsInstancedANGLE",p===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}p[f](r,g,o,m*c,_),e.update(g,r,_)}function u(m,g,_){if(_===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let f=0;f<_;f++)this.render(m[f]/c,g[f]);else{p.multiDrawElementsWEBGL(r,g,0,o,m,0,_);let f=0;for(let M=0;M<_;M++)f+=g[M];e.update(f,r,1)}}this.setMode=a,this.setIndex=l,this.render=h,this.renderInstances=d,this.renderMultiDraw=u}function Du(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case s.TRIANGLES:e.triangles+=o*(r/3);break;case s.LINES:e.lines+=o*(r/2);break;case s.LINE_STRIP:e.lines+=o*(r-1);break;case s.LINE_LOOP:e.lines+=o*r;break;case s.POINTS:e.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function Iu(s,t){return s[0]-t[0]}function Uu(s,t){return Math.abs(t[1])-Math.abs(s[1])}function Nu(s,t,e){const n={},i=new Float32Array(8),r=new WeakMap,a=new ne,o=[];for(let l=0;l<8;l++)o[l]=[l,0];function c(l,h,d){const u=l.morphTargetInfluences;if(t.isWebGL2===!0){const g=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,_=g!==void 0?g.length:0;let p=r.get(h);if(p===void 0||p.count!==_){let O=function(){tt.dispose(),r.delete(h),h.removeEventListener("dispose",O)};var m=O;p!==void 0&&p.texture.dispose();const v=h.morphAttributes.position!==void 0,w=h.morphAttributes.normal!==void 0,R=h.morphAttributes.color!==void 0,S=h.morphAttributes.position||[],A=h.morphAttributes.normal||[],I=h.morphAttributes.color||[];let y=0;v===!0&&(y=1),w===!0&&(y=2),R===!0&&(y=3);let b=h.attributes.position.count*y,z=1;b>t.maxTextureSize&&(z=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);const H=new Float32Array(b*z*4*_),tt=new Ia(H,b,z,_);tt.type=gn,tt.needsUpdate=!0;const P=y*4;for(let W=0;W<_;W++){const Y=S[W],X=A[W],q=I[W],$=b*z*4*W;for(let et=0;et<Y.count;et++){const nt=et*P;v===!0&&(a.fromBufferAttribute(Y,et),H[$+nt+0]=a.x,H[$+nt+1]=a.y,H[$+nt+2]=a.z,H[$+nt+3]=0),w===!0&&(a.fromBufferAttribute(X,et),H[$+nt+4]=a.x,H[$+nt+5]=a.y,H[$+nt+6]=a.z,H[$+nt+7]=0),R===!0&&(a.fromBufferAttribute(q,et),H[$+nt+8]=a.x,H[$+nt+9]=a.y,H[$+nt+10]=a.z,H[$+nt+11]=q.itemSize===4?a.w:1)}}p={count:_,texture:tt,size:new xt(b,z)},r.set(h,p),h.addEventListener("dispose",O)}let f=0;for(let v=0;v<u.length;v++)f+=u[v];const M=h.morphTargetsRelative?1:1-f;d.getUniforms().setValue(s,"morphTargetBaseInfluence",M),d.getUniforms().setValue(s,"morphTargetInfluences",u),d.getUniforms().setValue(s,"morphTargetsTexture",p.texture,e),d.getUniforms().setValue(s,"morphTargetsTextureSize",p.size)}else{const g=u===void 0?0:u.length;let _=n[h.id];if(_===void 0||_.length!==g){_=[];for(let w=0;w<g;w++)_[w]=[w,0];n[h.id]=_}for(let w=0;w<g;w++){const R=_[w];R[0]=w,R[1]=u[w]}_.sort(Uu);for(let w=0;w<8;w++)w<g&&_[w][1]?(o[w][0]=_[w][0],o[w][1]=_[w][1]):(o[w][0]=Number.MAX_SAFE_INTEGER,o[w][1]=0);o.sort(Iu);const p=h.morphAttributes.position,f=h.morphAttributes.normal;let M=0;for(let w=0;w<8;w++){const R=o[w],S=R[0],A=R[1];S!==Number.MAX_SAFE_INTEGER&&A?(p&&h.getAttribute("morphTarget"+w)!==p[S]&&h.setAttribute("morphTarget"+w,p[S]),f&&h.getAttribute("morphNormal"+w)!==f[S]&&h.setAttribute("morphNormal"+w,f[S]),i[w]=A,M+=A):(p&&h.hasAttribute("morphTarget"+w)===!0&&h.deleteAttribute("morphTarget"+w),f&&h.hasAttribute("morphNormal"+w)===!0&&h.deleteAttribute("morphNormal"+w),i[w]=0)}const v=h.morphTargetsRelative?1:1-M;d.getUniforms().setValue(s,"morphTargetBaseInfluence",v),d.getUniforms().setValue(s,"morphTargetInfluences",i)}}return{update:c}}function Fu(s,t,e,n){let i=new WeakMap;function r(c){const l=n.render.frame,h=c.geometry,d=t.get(c,h);if(i.get(d)!==l&&(t.update(d),i.set(d,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),i.get(c)!==l&&(e.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,s.ARRAY_BUFFER),i.set(c,l))),c.isSkinnedMesh){const u=c.skeleton;i.get(u)!==l&&(u.update(),i.set(u,l))}return d}function a(){i=new WeakMap}function o(c){const l=c.target;l.removeEventListener("dispose",o),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:r,dispose:a}}class ka extends De{constructor(t,e,n,i,r,a,o,c,l,h){if(h=h!==void 0?h:Pn,h!==Pn&&h!==li)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Pn&&(n=mn),n===void 0&&h===li&&(n=Ln),super(null,i,r,a,o,c,h,n,l),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=o!==void 0?o:Te,this.minFilter=c!==void 0?c:Te,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const Ha=new De,Va=new ka(1,1);Va.compareFunction=Ra;const Wa=new Ia,Xa=new Ml,qa=new Ga,ko=[],Ho=[],Vo=new Float32Array(16),Wo=new Float32Array(9),Xo=new Float32Array(4);function ui(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let r=ko[i];if(r===void 0&&(r=new Float32Array(i),ko[i]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,s[a].toArray(r,o)}return r}function de(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function ue(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function Ms(s,t){let e=Ho[t];e===void 0&&(e=new Int32Array(t),Ho[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function Bu(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function Ou(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(de(e,t))return;s.uniform2fv(this.addr,t),ue(e,t)}}function Gu(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(de(e,t))return;s.uniform3fv(this.addr,t),ue(e,t)}}function zu(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(de(e,t))return;s.uniform4fv(this.addr,t),ue(e,t)}}function ku(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(de(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),ue(e,t)}else{if(de(e,n))return;Xo.set(n),s.uniformMatrix2fv(this.addr,!1,Xo),ue(e,n)}}function Hu(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(de(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),ue(e,t)}else{if(de(e,n))return;Wo.set(n),s.uniformMatrix3fv(this.addr,!1,Wo),ue(e,n)}}function Vu(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(de(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),ue(e,t)}else{if(de(e,n))return;Vo.set(n),s.uniformMatrix4fv(this.addr,!1,Vo),ue(e,n)}}function Wu(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function Xu(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(de(e,t))return;s.uniform2iv(this.addr,t),ue(e,t)}}function qu(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(de(e,t))return;s.uniform3iv(this.addr,t),ue(e,t)}}function Yu(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(de(e,t))return;s.uniform4iv(this.addr,t),ue(e,t)}}function $u(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function ju(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(de(e,t))return;s.uniform2uiv(this.addr,t),ue(e,t)}}function Zu(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(de(e,t))return;s.uniform3uiv(this.addr,t),ue(e,t)}}function Ku(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(de(e,t))return;s.uniform4uiv(this.addr,t),ue(e,t)}}function Ju(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);const r=this.type===s.SAMPLER_2D_SHADOW?Va:Ha;e.setTexture2D(t||r,i)}function Qu(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||Xa,i)}function tf(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||qa,i)}function ef(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||Wa,i)}function nf(s){switch(s){case 5126:return Bu;case 35664:return Ou;case 35665:return Gu;case 35666:return zu;case 35674:return ku;case 35675:return Hu;case 35676:return Vu;case 5124:case 35670:return Wu;case 35667:case 35671:return Xu;case 35668:case 35672:return qu;case 35669:case 35673:return Yu;case 5125:return $u;case 36294:return ju;case 36295:return Zu;case 36296:return Ku;case 35678:case 36198:case 36298:case 36306:case 35682:return Ju;case 35679:case 36299:case 36307:return Qu;case 35680:case 36300:case 36308:case 36293:return tf;case 36289:case 36303:case 36311:case 36292:return ef}}function sf(s,t){s.uniform1fv(this.addr,t)}function rf(s,t){const e=ui(t,this.size,2);s.uniform2fv(this.addr,e)}function of(s,t){const e=ui(t,this.size,3);s.uniform3fv(this.addr,e)}function af(s,t){const e=ui(t,this.size,4);s.uniform4fv(this.addr,e)}function cf(s,t){const e=ui(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function lf(s,t){const e=ui(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function hf(s,t){const e=ui(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function df(s,t){s.uniform1iv(this.addr,t)}function uf(s,t){s.uniform2iv(this.addr,t)}function ff(s,t){s.uniform3iv(this.addr,t)}function pf(s,t){s.uniform4iv(this.addr,t)}function mf(s,t){s.uniform1uiv(this.addr,t)}function gf(s,t){s.uniform2uiv(this.addr,t)}function _f(s,t){s.uniform3uiv(this.addr,t)}function vf(s,t){s.uniform4uiv(this.addr,t)}function xf(s,t,e){const n=this.cache,i=t.length,r=Ms(e,i);de(n,r)||(s.uniform1iv(this.addr,r),ue(n,r));for(let a=0;a!==i;++a)e.setTexture2D(t[a]||Ha,r[a])}function Mf(s,t,e){const n=this.cache,i=t.length,r=Ms(e,i);de(n,r)||(s.uniform1iv(this.addr,r),ue(n,r));for(let a=0;a!==i;++a)e.setTexture3D(t[a]||Xa,r[a])}function yf(s,t,e){const n=this.cache,i=t.length,r=Ms(e,i);de(n,r)||(s.uniform1iv(this.addr,r),ue(n,r));for(let a=0;a!==i;++a)e.setTextureCube(t[a]||qa,r[a])}function Sf(s,t,e){const n=this.cache,i=t.length,r=Ms(e,i);de(n,r)||(s.uniform1iv(this.addr,r),ue(n,r));for(let a=0;a!==i;++a)e.setTexture2DArray(t[a]||Wa,r[a])}function Ef(s){switch(s){case 5126:return sf;case 35664:return rf;case 35665:return of;case 35666:return af;case 35674:return cf;case 35675:return lf;case 35676:return hf;case 5124:case 35670:return df;case 35667:case 35671:return uf;case 35668:case 35672:return ff;case 35669:case 35673:return pf;case 5125:return mf;case 36294:return gf;case 36295:return _f;case 36296:return vf;case 35678:case 36198:case 36298:case 36306:case 35682:return xf;case 35679:case 36299:case 36307:return Mf;case 35680:case 36300:case 36308:case 36293:return yf;case 36289:case 36303:case 36311:case 36292:return Sf}}class wf{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=nf(e.type)}}class bf{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Ef(e.type)}}class Tf{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let r=0,a=i.length;r!==a;++r){const o=i[r];o.setValue(t,e[o.id],n)}}}const Js=/(\w+)(\])?(\[|\.)?/g;function qo(s,t){s.seq.push(t),s.map[t.id]=t}function Af(s,t,e){const n=s.name,i=n.length;for(Js.lastIndex=0;;){const r=Js.exec(n),a=Js.lastIndex;let o=r[1];const c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===i){qo(e,l===void 0?new wf(o,s,t):new bf(o,s,t));break}else{let d=e.map[o];d===void 0&&(d=new Tf(o),qo(e,d)),e=d}}}class os{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=t.getActiveUniform(e,i),a=t.getUniformLocation(e,r.name);Af(r,a,this)}}setValue(t,e,n,i){const r=this.map[e];r!==void 0&&r.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let r=0,a=e.length;r!==a;++r){const o=e[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,r=t.length;i!==r;++i){const a=t[i];a.id in e&&n.push(a)}return n}}function Yo(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const Cf=37297;let Rf=0;function Lf(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=i;a<r;a++){const o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}function Pf(s){const t=Kt.getPrimaries(Kt.workingColorSpace),e=Kt.getPrimaries(s);let n;switch(t===e?n="":t===hs&&e===ls?n="LinearDisplayP3ToLinearSRGB":t===ls&&e===hs&&(n="LinearSRGBToLinearDisplayP3"),s){case cn:case _s:return[n,"LinearTransferOETF"];case ge:case xr:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",s),[n,"LinearTransferOETF"]}}function $o(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),i=s.getShaderInfoLog(t).trim();if(n&&i==="")return"";const r=/ERROR: 0:(\d+)/.exec(i);if(r){const a=parseInt(r[1]);return e.toUpperCase()+`

`+i+`

`+Lf(s.getShaderSource(t),a)}else return i}function Df(s,t){const e=Pf(t);return`vec4 ${s}( vec4 value ) { return ${e[0]}( ${e[1]}( value ) ); }`}function If(s,t){let e;switch(t){case Lc:e="Linear";break;case Pc:e="Reinhard";break;case Dc:e="OptimizedCineon";break;case va:e="ACESFilmic";break;case Uc:e="AgX";break;case Ic:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}function Uf(s){return[s.extensionDerivatives||s.envMapCubeUVHeight||s.bumpMap||s.normalMapTangentSpace||s.clearcoatNormalMap||s.flatShading||s.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(s.extensionFragDepth||s.logarithmicDepthBuffer)&&s.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",s.extensionDrawBuffers&&s.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(s.extensionShaderTextureLOD||s.envMap||s.transmission)&&s.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(si).join(`
`)}function Nf(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(si).join(`
`)}function Ff(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Bf(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(t,i),a=r.name;let o=1;r.type===s.FLOAT_MAT2&&(o=2),r.type===s.FLOAT_MAT3&&(o=3),r.type===s.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:s.getAttribLocation(t,a),locationSize:o}}return e}function si(s){return s!==""}function jo(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Zo(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Of=/^[ \t]*#include +<([\w\d./]+)>/gm;function fr(s){return s.replace(Of,zf)}const Gf=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function zf(s,t){let e=Ut[t];if(e===void 0){const n=Gf.get(t);if(n!==void 0)e=Ut[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return fr(e)}const kf=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ko(s){return s.replace(kf,Hf)}function Hf(s,t,e,n){let i="";for(let r=parseInt(t);r<parseInt(e);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function Jo(s){let t="precision "+s.precision+` float;
precision `+s.precision+" int;";return s.precision==="highp"?t+=`
#define HIGH_PRECISION`:s.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Vf(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===ma?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===ga?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===sn&&(t="SHADOWMAP_TYPE_VSM"),t}function Wf(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ai:case ci:t="ENVMAP_TYPE_CUBE";break;case gs:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Xf(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case ci:t="ENVMAP_MODE_REFRACTION";break}return t}function qf(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case _a:t="ENVMAP_BLENDING_MULTIPLY";break;case Cc:t="ENVMAP_BLENDING_MIX";break;case Rc:t="ENVMAP_BLENDING_ADD";break}return t}function Yf(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function $f(s,t,e,n){const i=s.getContext(),r=e.defines;let a=e.vertexShader,o=e.fragmentShader;const c=Vf(e),l=Wf(e),h=Xf(e),d=qf(e),u=Yf(e),m=e.isWebGL2?"":Uf(e),g=Nf(e),_=Ff(r),p=i.createProgram();let f,M,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(si).join(`
`),f.length>0&&(f+=`
`),M=[m,"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(si).join(`
`),M.length>0&&(M+=`
`)):(f=[Jo(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors&&e.isWebGL2?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.useLegacyLights?"#define LEGACY_LIGHTS":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.logarithmicDepthBuffer&&e.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(si).join(`
`),M=[m,Jo(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.useLegacyLights?"#define LEGACY_LIGHTS":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.logarithmicDepthBuffer&&e.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==vn?"#define TONE_MAPPING":"",e.toneMapping!==vn?Ut.tonemapping_pars_fragment:"",e.toneMapping!==vn?If("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Ut.colorspace_pars_fragment,Df("linearToOutputTexel",e.outputColorSpace),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(si).join(`
`)),a=fr(a),a=jo(a,e),a=Zo(a,e),o=fr(o),o=jo(o,e),o=Zo(o,e),a=Ko(a),o=Ko(o),e.isWebGL2&&e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,f=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+f,M=["precision mediump sampler2DArray;","#define varying in",e.glslVersion===go?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===go?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+M);const w=v+f+a,R=v+M+o,S=Yo(i,i.VERTEX_SHADER,w),A=Yo(i,i.FRAGMENT_SHADER,R);i.attachShader(p,S),i.attachShader(p,A),e.index0AttributeName!==void 0?i.bindAttribLocation(p,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(p,0,"position"),i.linkProgram(p);function I(H){if(s.debug.checkShaderErrors){const tt=i.getProgramInfoLog(p).trim(),P=i.getShaderInfoLog(S).trim(),O=i.getShaderInfoLog(A).trim();let W=!0,Y=!0;if(i.getProgramParameter(p,i.LINK_STATUS)===!1)if(W=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,p,S,A);else{const X=$o(i,S,"vertex"),q=$o(i,A,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(p,i.VALIDATE_STATUS)+`

Program Info Log: `+tt+`
`+X+`
`+q)}else tt!==""?console.warn("THREE.WebGLProgram: Program Info Log:",tt):(P===""||O==="")&&(Y=!1);Y&&(H.diagnostics={runnable:W,programLog:tt,vertexShader:{log:P,prefix:f},fragmentShader:{log:O,prefix:M}})}i.deleteShader(S),i.deleteShader(A),y=new os(i,p),b=Bf(i,p)}let y;this.getUniforms=function(){return y===void 0&&I(this),y};let b;this.getAttributes=function(){return b===void 0&&I(this),b};let z=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return z===!1&&(z=i.getProgramParameter(p,Cf)),z},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(p),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Rf++,this.cacheKey=t,this.usedTimes=1,this.program=p,this.vertexShader=S,this.fragmentShader=A,this}let jf=0;class Zf{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(t);return a.has(i)===!1&&(a.add(i),i.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new Kf(t),e.set(t,n)),n}}class Kf{constructor(t){this.id=jf++,this.code=t,this.usedTimes=0}}function Jf(s,t,e,n,i,r,a){const o=new Sr,c=new Zf,l=[],h=i.isWebGL2,d=i.logarithmicDepthBuffer,u=i.vertexTextures;let m=i.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(y){return y===0?"uv":`uv${y}`}function p(y,b,z,H,tt){const P=H.fog,O=tt.geometry,W=y.isMeshStandardMaterial?H.environment:null,Y=(y.isMeshStandardMaterial?e:t).get(y.envMap||W),X=Y&&Y.mapping===gs?Y.image.height:null,q=g[y.type];y.precision!==null&&(m=i.getMaxPrecision(y.precision),m!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",m,"instead."));const $=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,et=$!==void 0?$.length:0;let nt=0;O.morphAttributes.position!==void 0&&(nt=1),O.morphAttributes.normal!==void 0&&(nt=2),O.morphAttributes.color!==void 0&&(nt=3);let V,j,lt,_t;if(q){const Se=je[q];V=Se.vertexShader,j=Se.fragmentShader}else V=y.vertexShader,j=y.fragmentShader,c.update(y),lt=c.getVertexShaderID(y),_t=c.getFragmentShaderID(y);const gt=s.getRenderTarget(),Lt=tt.isInstancedMesh===!0,Dt=tt.isBatchedMesh===!0,wt=!!y.map,Xt=!!y.matcap,U=!!Y,ye=!!y.aoMap,Mt=!!y.lightMap,Ct=!!y.bumpMap,ft=!!y.normalMap,ie=!!y.displacementMap,Nt=!!y.emissiveMap,T=!!y.metalnessMap,x=!!y.roughnessMap,F=y.anisotropy>0,J=y.clearcoat>0,K=y.iridescence>0,Q=y.sheen>0,pt=y.transmission>0,at=F&&!!y.anisotropyMap,dt=J&&!!y.clearcoatMap,Et=J&&!!y.clearcoatNormalMap,Ft=J&&!!y.clearcoatRoughnessMap,Z=K&&!!y.iridescenceMap,jt=K&&!!y.iridescenceThicknessMap,Vt=Q&&!!y.sheenColorMap,At=Q&&!!y.sheenRoughnessMap,vt=!!y.specularMap,ut=!!y.specularColorMap,It=!!y.specularIntensityMap,Yt=pt&&!!y.transmissionMap,re=pt&&!!y.thicknessMap,Ot=!!y.gradientMap,it=!!y.alphaMap,L=y.alphaTest>0,rt=!!y.alphaHash,ot=!!y.extensions,bt=!!O.attributes.uv1,yt=!!O.attributes.uv2,Jt=!!O.attributes.uv3;let Qt=vn;return y.toneMapped&&(gt===null||gt.isXRRenderTarget===!0)&&(Qt=s.toneMapping),{isWebGL2:h,shaderID:q,shaderType:y.type,shaderName:y.name,vertexShader:V,fragmentShader:j,defines:y.defines,customVertexShaderID:lt,customFragmentShaderID:_t,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:m,batching:Dt,instancing:Lt,instancingColor:Lt&&tt.instanceColor!==null,supportsVertexTextures:u,outputColorSpace:gt===null?s.outputColorSpace:gt.isXRRenderTarget===!0?gt.texture.colorSpace:cn,map:wt,matcap:Xt,envMap:U,envMapMode:U&&Y.mapping,envMapCubeUVHeight:X,aoMap:ye,lightMap:Mt,bumpMap:Ct,normalMap:ft,displacementMap:u&&ie,emissiveMap:Nt,normalMapObjectSpace:ft&&y.normalMapType===qc,normalMapTangentSpace:ft&&y.normalMapType===Ca,metalnessMap:T,roughnessMap:x,anisotropy:F,anisotropyMap:at,clearcoat:J,clearcoatMap:dt,clearcoatNormalMap:Et,clearcoatRoughnessMap:Ft,iridescence:K,iridescenceMap:Z,iridescenceThicknessMap:jt,sheen:Q,sheenColorMap:Vt,sheenRoughnessMap:At,specularMap:vt,specularColorMap:ut,specularIntensityMap:It,transmission:pt,transmissionMap:Yt,thicknessMap:re,gradientMap:Ot,opaque:y.transparent===!1&&y.blending===ri,alphaMap:it,alphaTest:L,alphaHash:rt,combine:y.combine,mapUv:wt&&_(y.map.channel),aoMapUv:ye&&_(y.aoMap.channel),lightMapUv:Mt&&_(y.lightMap.channel),bumpMapUv:Ct&&_(y.bumpMap.channel),normalMapUv:ft&&_(y.normalMap.channel),displacementMapUv:ie&&_(y.displacementMap.channel),emissiveMapUv:Nt&&_(y.emissiveMap.channel),metalnessMapUv:T&&_(y.metalnessMap.channel),roughnessMapUv:x&&_(y.roughnessMap.channel),anisotropyMapUv:at&&_(y.anisotropyMap.channel),clearcoatMapUv:dt&&_(y.clearcoatMap.channel),clearcoatNormalMapUv:Et&&_(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ft&&_(y.clearcoatRoughnessMap.channel),iridescenceMapUv:Z&&_(y.iridescenceMap.channel),iridescenceThicknessMapUv:jt&&_(y.iridescenceThicknessMap.channel),sheenColorMapUv:Vt&&_(y.sheenColorMap.channel),sheenRoughnessMapUv:At&&_(y.sheenRoughnessMap.channel),specularMapUv:vt&&_(y.specularMap.channel),specularColorMapUv:ut&&_(y.specularColorMap.channel),specularIntensityMapUv:It&&_(y.specularIntensityMap.channel),transmissionMapUv:Yt&&_(y.transmissionMap.channel),thicknessMapUv:re&&_(y.thicknessMap.channel),alphaMapUv:it&&_(y.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&(ft||F),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,vertexUv1s:bt,vertexUv2s:yt,vertexUv3s:Jt,pointsUvs:tt.isPoints===!0&&!!O.attributes.uv&&(wt||it),fog:!!P,useFog:y.fog===!0,fogExp2:P&&P.isFogExp2,flatShading:y.flatShading===!0,sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,skinning:tt.isSkinnedMesh===!0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:et,morphTextureStride:nt,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:y.dithering,shadowMapEnabled:s.shadowMap.enabled&&z.length>0,shadowMapType:s.shadowMap.type,toneMapping:Qt,useLegacyLights:s._useLegacyLights,decodeVideoTexture:wt&&y.map.isVideoTexture===!0&&Kt.getTransfer(y.map.colorSpace)===ee,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===Le,flipSided:y.side===Pe,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionDerivatives:ot&&y.extensions.derivatives===!0,extensionFragDepth:ot&&y.extensions.fragDepth===!0,extensionDrawBuffers:ot&&y.extensions.drawBuffers===!0,extensionShaderTextureLOD:ot&&y.extensions.shaderTextureLOD===!0,extensionClipCullDistance:ot&&y.extensions.clipCullDistance&&n.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:h||n.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||n.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||n.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()}}function f(y){const b=[];if(y.shaderID?b.push(y.shaderID):(b.push(y.customVertexShaderID),b.push(y.customFragmentShaderID)),y.defines!==void 0)for(const z in y.defines)b.push(z),b.push(y.defines[z]);return y.isRawShaderMaterial===!1&&(M(b,y),v(b,y),b.push(s.outputColorSpace)),b.push(y.customProgramCacheKey),b.join()}function M(y,b){y.push(b.precision),y.push(b.outputColorSpace),y.push(b.envMapMode),y.push(b.envMapCubeUVHeight),y.push(b.mapUv),y.push(b.alphaMapUv),y.push(b.lightMapUv),y.push(b.aoMapUv),y.push(b.bumpMapUv),y.push(b.normalMapUv),y.push(b.displacementMapUv),y.push(b.emissiveMapUv),y.push(b.metalnessMapUv),y.push(b.roughnessMapUv),y.push(b.anisotropyMapUv),y.push(b.clearcoatMapUv),y.push(b.clearcoatNormalMapUv),y.push(b.clearcoatRoughnessMapUv),y.push(b.iridescenceMapUv),y.push(b.iridescenceThicknessMapUv),y.push(b.sheenColorMapUv),y.push(b.sheenRoughnessMapUv),y.push(b.specularMapUv),y.push(b.specularColorMapUv),y.push(b.specularIntensityMapUv),y.push(b.transmissionMapUv),y.push(b.thicknessMapUv),y.push(b.combine),y.push(b.fogExp2),y.push(b.sizeAttenuation),y.push(b.morphTargetsCount),y.push(b.morphAttributeCount),y.push(b.numDirLights),y.push(b.numPointLights),y.push(b.numSpotLights),y.push(b.numSpotLightMaps),y.push(b.numHemiLights),y.push(b.numRectAreaLights),y.push(b.numDirLightShadows),y.push(b.numPointLightShadows),y.push(b.numSpotLightShadows),y.push(b.numSpotLightShadowsWithMaps),y.push(b.numLightProbes),y.push(b.shadowMapType),y.push(b.toneMapping),y.push(b.numClippingPlanes),y.push(b.numClipIntersection),y.push(b.depthPacking)}function v(y,b){o.disableAll(),b.isWebGL2&&o.enable(0),b.supportsVertexTextures&&o.enable(1),b.instancing&&o.enable(2),b.instancingColor&&o.enable(3),b.matcap&&o.enable(4),b.envMap&&o.enable(5),b.normalMapObjectSpace&&o.enable(6),b.normalMapTangentSpace&&o.enable(7),b.clearcoat&&o.enable(8),b.iridescence&&o.enable(9),b.alphaTest&&o.enable(10),b.vertexColors&&o.enable(11),b.vertexAlphas&&o.enable(12),b.vertexUv1s&&o.enable(13),b.vertexUv2s&&o.enable(14),b.vertexUv3s&&o.enable(15),b.vertexTangents&&o.enable(16),b.anisotropy&&o.enable(17),b.alphaHash&&o.enable(18),b.batching&&o.enable(19),y.push(o.mask),o.disableAll(),b.fog&&o.enable(0),b.useFog&&o.enable(1),b.flatShading&&o.enable(2),b.logarithmicDepthBuffer&&o.enable(3),b.skinning&&o.enable(4),b.morphTargets&&o.enable(5),b.morphNormals&&o.enable(6),b.morphColors&&o.enable(7),b.premultipliedAlpha&&o.enable(8),b.shadowMapEnabled&&o.enable(9),b.useLegacyLights&&o.enable(10),b.doubleSided&&o.enable(11),b.flipSided&&o.enable(12),b.useDepthPacking&&o.enable(13),b.dithering&&o.enable(14),b.transmission&&o.enable(15),b.sheen&&o.enable(16),b.opaque&&o.enable(17),b.pointsUvs&&o.enable(18),b.decodeVideoTexture&&o.enable(19),y.push(o.mask)}function w(y){const b=g[y.type];let z;if(b){const H=je[b];z=Il.clone(H.uniforms)}else z=y.uniforms;return z}function R(y,b){let z;for(let H=0,tt=l.length;H<tt;H++){const P=l[H];if(P.cacheKey===b){z=P,++z.usedTimes;break}}return z===void 0&&(z=new $f(s,b,y,r),l.push(z)),z}function S(y){if(--y.usedTimes===0){const b=l.indexOf(y);l[b]=l[l.length-1],l.pop(),y.destroy()}}function A(y){c.remove(y)}function I(){c.dispose()}return{getParameters:p,getProgramCacheKey:f,getUniforms:w,acquireProgram:R,releaseProgram:S,releaseShaderCache:A,programs:l,dispose:I}}function Qf(){let s=new WeakMap;function t(r){let a=s.get(r);return a===void 0&&(a={},s.set(r,a)),a}function e(r){s.delete(r)}function n(r,a,o){s.get(r)[a]=o}function i(){s=new WeakMap}return{get:t,remove:e,update:n,dispose:i}}function tp(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function Qo(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function ta(){const s=[];let t=0;const e=[],n=[],i=[];function r(){t=0,e.length=0,n.length=0,i.length=0}function a(d,u,m,g,_,p){let f=s[t];return f===void 0?(f={id:d.id,object:d,geometry:u,material:m,groupOrder:g,renderOrder:d.renderOrder,z:_,group:p},s[t]=f):(f.id=d.id,f.object=d,f.geometry=u,f.material=m,f.groupOrder=g,f.renderOrder=d.renderOrder,f.z=_,f.group=p),t++,f}function o(d,u,m,g,_,p){const f=a(d,u,m,g,_,p);m.transmission>0?n.push(f):m.transparent===!0?i.push(f):e.push(f)}function c(d,u,m,g,_,p){const f=a(d,u,m,g,_,p);m.transmission>0?n.unshift(f):m.transparent===!0?i.unshift(f):e.unshift(f)}function l(d,u){e.length>1&&e.sort(d||tp),n.length>1&&n.sort(u||Qo),i.length>1&&i.sort(u||Qo)}function h(){for(let d=t,u=s.length;d<u;d++){const m=s[d];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:n,transparent:i,init:r,push:o,unshift:c,finish:h,sort:l}}function ep(){let s=new WeakMap;function t(n,i){const r=s.get(n);let a;return r===void 0?(a=new ta,s.set(n,[a])):i>=r.length?(a=new ta,r.push(a)):a=r[i],a}function e(){s=new WeakMap}return{get:t,dispose:e}}function np(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new C,color:new Ht};break;case"SpotLight":e={position:new C,direction:new C,color:new Ht,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new C,color:new Ht,distance:0,decay:0};break;case"HemisphereLight":e={direction:new C,skyColor:new Ht,groundColor:new Ht};break;case"RectAreaLight":e={color:new Ht,position:new C,halfWidth:new C,halfHeight:new C};break}return s[t.id]=e,e}}}function ip(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xt};break;case"SpotLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xt};break;case"PointLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xt,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let sp=0;function rp(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function op(s,t){const e=new np,n=ip(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)i.probe.push(new C);const r=new C,a=new ae,o=new ae;function c(h,d){let u=0,m=0,g=0;for(let H=0;H<9;H++)i.probe[H].set(0,0,0);let _=0,p=0,f=0,M=0,v=0,w=0,R=0,S=0,A=0,I=0,y=0;h.sort(rp);const b=d===!0?Math.PI:1;for(let H=0,tt=h.length;H<tt;H++){const P=h[H],O=P.color,W=P.intensity,Y=P.distance,X=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)u+=O.r*W*b,m+=O.g*W*b,g+=O.b*W*b;else if(P.isLightProbe){for(let q=0;q<9;q++)i.probe[q].addScaledVector(P.sh.coefficients[q],W);y++}else if(P.isDirectionalLight){const q=e.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity*b),P.castShadow){const $=P.shadow,et=n.get(P);et.shadowBias=$.bias,et.shadowNormalBias=$.normalBias,et.shadowRadius=$.radius,et.shadowMapSize=$.mapSize,i.directionalShadow[_]=et,i.directionalShadowMap[_]=X,i.directionalShadowMatrix[_]=P.shadow.matrix,w++}i.directional[_]=q,_++}else if(P.isSpotLight){const q=e.get(P);q.position.setFromMatrixPosition(P.matrixWorld),q.color.copy(O).multiplyScalar(W*b),q.distance=Y,q.coneCos=Math.cos(P.angle),q.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),q.decay=P.decay,i.spot[f]=q;const $=P.shadow;if(P.map&&(i.spotLightMap[A]=P.map,A++,$.updateMatrices(P),P.castShadow&&I++),i.spotLightMatrix[f]=$.matrix,P.castShadow){const et=n.get(P);et.shadowBias=$.bias,et.shadowNormalBias=$.normalBias,et.shadowRadius=$.radius,et.shadowMapSize=$.mapSize,i.spotShadow[f]=et,i.spotShadowMap[f]=X,S++}f++}else if(P.isRectAreaLight){const q=e.get(P);q.color.copy(O).multiplyScalar(W),q.halfWidth.set(P.width*.5,0,0),q.halfHeight.set(0,P.height*.5,0),i.rectArea[M]=q,M++}else if(P.isPointLight){const q=e.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity*b),q.distance=P.distance,q.decay=P.decay,P.castShadow){const $=P.shadow,et=n.get(P);et.shadowBias=$.bias,et.shadowNormalBias=$.normalBias,et.shadowRadius=$.radius,et.shadowMapSize=$.mapSize,et.shadowCameraNear=$.camera.near,et.shadowCameraFar=$.camera.far,i.pointShadow[p]=et,i.pointShadowMap[p]=X,i.pointShadowMatrix[p]=P.shadow.matrix,R++}i.point[p]=q,p++}else if(P.isHemisphereLight){const q=e.get(P);q.skyColor.copy(P.color).multiplyScalar(W*b),q.groundColor.copy(P.groundColor).multiplyScalar(W*b),i.hemi[v]=q,v++}}M>0&&(t.isWebGL2?s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=st.LTC_FLOAT_1,i.rectAreaLTC2=st.LTC_FLOAT_2):(i.rectAreaLTC1=st.LTC_HALF_1,i.rectAreaLTC2=st.LTC_HALF_2):s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=st.LTC_FLOAT_1,i.rectAreaLTC2=st.LTC_FLOAT_2):s.has("OES_texture_half_float_linear")===!0?(i.rectAreaLTC1=st.LTC_HALF_1,i.rectAreaLTC2=st.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),i.ambient[0]=u,i.ambient[1]=m,i.ambient[2]=g;const z=i.hash;(z.directionalLength!==_||z.pointLength!==p||z.spotLength!==f||z.rectAreaLength!==M||z.hemiLength!==v||z.numDirectionalShadows!==w||z.numPointShadows!==R||z.numSpotShadows!==S||z.numSpotMaps!==A||z.numLightProbes!==y)&&(i.directional.length=_,i.spot.length=f,i.rectArea.length=M,i.point.length=p,i.hemi.length=v,i.directionalShadow.length=w,i.directionalShadowMap.length=w,i.pointShadow.length=R,i.pointShadowMap.length=R,i.spotShadow.length=S,i.spotShadowMap.length=S,i.directionalShadowMatrix.length=w,i.pointShadowMatrix.length=R,i.spotLightMatrix.length=S+A-I,i.spotLightMap.length=A,i.numSpotLightShadowsWithMaps=I,i.numLightProbes=y,z.directionalLength=_,z.pointLength=p,z.spotLength=f,z.rectAreaLength=M,z.hemiLength=v,z.numDirectionalShadows=w,z.numPointShadows=R,z.numSpotShadows=S,z.numSpotMaps=A,z.numLightProbes=y,i.version=sp++)}function l(h,d){let u=0,m=0,g=0,_=0,p=0;const f=d.matrixWorldInverse;for(let M=0,v=h.length;M<v;M++){const w=h[M];if(w.isDirectionalLight){const R=i.directional[u];R.direction.setFromMatrixPosition(w.matrixWorld),r.setFromMatrixPosition(w.target.matrixWorld),R.direction.sub(r),R.direction.transformDirection(f),u++}else if(w.isSpotLight){const R=i.spot[g];R.position.setFromMatrixPosition(w.matrixWorld),R.position.applyMatrix4(f),R.direction.setFromMatrixPosition(w.matrixWorld),r.setFromMatrixPosition(w.target.matrixWorld),R.direction.sub(r),R.direction.transformDirection(f),g++}else if(w.isRectAreaLight){const R=i.rectArea[_];R.position.setFromMatrixPosition(w.matrixWorld),R.position.applyMatrix4(f),o.identity(),a.copy(w.matrixWorld),a.premultiply(f),o.extractRotation(a),R.halfWidth.set(w.width*.5,0,0),R.halfHeight.set(0,w.height*.5,0),R.halfWidth.applyMatrix4(o),R.halfHeight.applyMatrix4(o),_++}else if(w.isPointLight){const R=i.point[m];R.position.setFromMatrixPosition(w.matrixWorld),R.position.applyMatrix4(f),m++}else if(w.isHemisphereLight){const R=i.hemi[p];R.direction.setFromMatrixPosition(w.matrixWorld),R.direction.transformDirection(f),p++}}}return{setup:c,setupView:l,state:i}}function ea(s,t){const e=new op(s,t),n=[],i=[];function r(){n.length=0,i.length=0}function a(d){n.push(d)}function o(d){i.push(d)}function c(d){e.setup(n,d)}function l(d){e.setupView(n,d)}return{init:r,state:{lightsArray:n,shadowsArray:i,lights:e},setupLights:c,setupLightsView:l,pushLight:a,pushShadow:o}}function ap(s,t){let e=new WeakMap;function n(r,a=0){const o=e.get(r);let c;return o===void 0?(c=new ea(s,t),e.set(r,[c])):a>=o.length?(c=new ea(s,t),o.push(c)):c=o[a],c}function i(){e=new WeakMap}return{get:n,dispose:i}}class cp extends Fn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Wc,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class lp extends Fn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const hp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,dp=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function up(s,t,e){let n=new Er;const i=new xt,r=new xt,a=new ne,o=new cp({depthPacking:Xc}),c=new lp,l={},h=e.maxTextureSize,d={[Mn]:Pe,[Pe]:Mn,[Le]:Le},u=new Nn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new xt},radius:{value:4}},vertexShader:hp,fragmentShader:dp}),m=u.clone();m.defines.HORIZONTAL_PASS=1;const g=new Me;g.setAttribute("position",new Ye(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new G(g,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ma;let f=this.type;this.render=function(S,A,I){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||S.length===0)return;const y=s.getRenderTarget(),b=s.getActiveCubeFace(),z=s.getActiveMipmapLevel(),H=s.state;H.setBlending(_n),H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const tt=f!==sn&&this.type===sn,P=f===sn&&this.type!==sn;for(let O=0,W=S.length;O<W;O++){const Y=S[O],X=Y.shadow;if(X===void 0){console.warn("THREE.WebGLShadowMap:",Y,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;i.copy(X.mapSize);const q=X.getFrameExtents();if(i.multiply(q),r.copy(X.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/q.x),i.x=r.x*q.x,X.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/q.y),i.y=r.y*q.y,X.mapSize.y=r.y)),X.map===null||tt===!0||P===!0){const et=this.type!==sn?{minFilter:Te,magFilter:Te}:{};X.map!==null&&X.map.dispose(),X.map=new Un(i.x,i.y,et),X.map.texture.name=Y.name+".shadowMap",X.camera.updateProjectionMatrix()}s.setRenderTarget(X.map),s.clear();const $=X.getViewportCount();for(let et=0;et<$;et++){const nt=X.getViewport(et);a.set(r.x*nt.x,r.y*nt.y,r.x*nt.z,r.y*nt.w),H.viewport(a),X.updateMatrices(Y,et),n=X.getFrustum(),w(A,I,X.camera,Y,this.type)}X.isPointLightShadow!==!0&&this.type===sn&&M(X,I),X.needsUpdate=!1}f=this.type,p.needsUpdate=!1,s.setRenderTarget(y,b,z)};function M(S,A){const I=t.update(_);u.defines.VSM_SAMPLES!==S.blurSamples&&(u.defines.VSM_SAMPLES=S.blurSamples,m.defines.VSM_SAMPLES=S.blurSamples,u.needsUpdate=!0,m.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Un(i.x,i.y)),u.uniforms.shadow_pass.value=S.map.texture,u.uniforms.resolution.value=S.mapSize,u.uniforms.radius.value=S.radius,s.setRenderTarget(S.mapPass),s.clear(),s.renderBufferDirect(A,null,I,u,_,null),m.uniforms.shadow_pass.value=S.mapPass.texture,m.uniforms.resolution.value=S.mapSize,m.uniforms.radius.value=S.radius,s.setRenderTarget(S.map),s.clear(),s.renderBufferDirect(A,null,I,m,_,null)}function v(S,A,I,y){let b=null;const z=I.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(z!==void 0)b=z;else if(b=I.isPointLight===!0?c:o,s.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){const H=b.uuid,tt=A.uuid;let P=l[H];P===void 0&&(P={},l[H]=P);let O=P[tt];O===void 0&&(O=b.clone(),P[tt]=O,A.addEventListener("dispose",R)),b=O}if(b.visible=A.visible,b.wireframe=A.wireframe,y===sn?b.side=A.shadowSide!==null?A.shadowSide:A.side:b.side=A.shadowSide!==null?A.shadowSide:d[A.side],b.alphaMap=A.alphaMap,b.alphaTest=A.alphaTest,b.map=A.map,b.clipShadows=A.clipShadows,b.clippingPlanes=A.clippingPlanes,b.clipIntersection=A.clipIntersection,b.displacementMap=A.displacementMap,b.displacementScale=A.displacementScale,b.displacementBias=A.displacementBias,b.wireframeLinewidth=A.wireframeLinewidth,b.linewidth=A.linewidth,I.isPointLight===!0&&b.isMeshDistanceMaterial===!0){const H=s.properties.get(b);H.light=I}return b}function w(S,A,I,y,b){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&b===sn)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,S.matrixWorld);const tt=t.update(S),P=S.material;if(Array.isArray(P)){const O=tt.groups;for(let W=0,Y=O.length;W<Y;W++){const X=O[W],q=P[X.materialIndex];if(q&&q.visible){const $=v(S,q,y,b);S.onBeforeShadow(s,S,A,I,tt,$,X),s.renderBufferDirect(I,null,tt,$,S,X),S.onAfterShadow(s,S,A,I,tt,$,X)}}}else if(P.visible){const O=v(S,P,y,b);S.onBeforeShadow(s,S,A,I,tt,O,null),s.renderBufferDirect(I,null,tt,O,S,null),S.onAfterShadow(s,S,A,I,tt,O,null)}}const H=S.children;for(let tt=0,P=H.length;tt<P;tt++)w(H[tt],A,I,y,b)}function R(S){S.target.removeEventListener("dispose",R);for(const I in l){const y=l[I],b=S.target.uuid;b in y&&(y[b].dispose(),delete y[b])}}}function fp(s,t,e){const n=e.isWebGL2;function i(){let L=!1;const rt=new ne;let ot=null;const bt=new ne(0,0,0,0);return{setMask:function(yt){ot!==yt&&!L&&(s.colorMask(yt,yt,yt,yt),ot=yt)},setLocked:function(yt){L=yt},setClear:function(yt,Jt,Qt,fe,Se){Se===!0&&(yt*=fe,Jt*=fe,Qt*=fe),rt.set(yt,Jt,Qt,fe),bt.equals(rt)===!1&&(s.clearColor(yt,Jt,Qt,fe),bt.copy(rt))},reset:function(){L=!1,ot=null,bt.set(-1,0,0,0)}}}function r(){let L=!1,rt=null,ot=null,bt=null;return{setTest:function(yt){yt?Dt(s.DEPTH_TEST):wt(s.DEPTH_TEST)},setMask:function(yt){rt!==yt&&!L&&(s.depthMask(yt),rt=yt)},setFunc:function(yt){if(ot!==yt){switch(yt){case yc:s.depthFunc(s.NEVER);break;case Sc:s.depthFunc(s.ALWAYS);break;case Ec:s.depthFunc(s.LESS);break;case as:s.depthFunc(s.LEQUAL);break;case wc:s.depthFunc(s.EQUAL);break;case bc:s.depthFunc(s.GEQUAL);break;case Tc:s.depthFunc(s.GREATER);break;case Ac:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}ot=yt}},setLocked:function(yt){L=yt},setClear:function(yt){bt!==yt&&(s.clearDepth(yt),bt=yt)},reset:function(){L=!1,rt=null,ot=null,bt=null}}}function a(){let L=!1,rt=null,ot=null,bt=null,yt=null,Jt=null,Qt=null,fe=null,Se=null;return{setTest:function(te){L||(te?Dt(s.STENCIL_TEST):wt(s.STENCIL_TEST))},setMask:function(te){rt!==te&&!L&&(s.stencilMask(te),rt=te)},setFunc:function(te,Ee,$e){(ot!==te||bt!==Ee||yt!==$e)&&(s.stencilFunc(te,Ee,$e),ot=te,bt=Ee,yt=$e)},setOp:function(te,Ee,$e){(Jt!==te||Qt!==Ee||fe!==$e)&&(s.stencilOp(te,Ee,$e),Jt=te,Qt=Ee,fe=$e)},setLocked:function(te){L=te},setClear:function(te){Se!==te&&(s.clearStencil(te),Se=te)},reset:function(){L=!1,rt=null,ot=null,bt=null,yt=null,Jt=null,Qt=null,fe=null,Se=null}}}const o=new i,c=new r,l=new a,h=new WeakMap,d=new WeakMap;let u={},m={},g=new WeakMap,_=[],p=null,f=!1,M=null,v=null,w=null,R=null,S=null,A=null,I=null,y=new Ht(0,0,0),b=0,z=!1,H=null,tt=null,P=null,O=null,W=null;const Y=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let X=!1,q=0;const $=s.getParameter(s.VERSION);$.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec($)[1]),X=q>=1):$.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),X=q>=2);let et=null,nt={};const V=s.getParameter(s.SCISSOR_BOX),j=s.getParameter(s.VIEWPORT),lt=new ne().fromArray(V),_t=new ne().fromArray(j);function gt(L,rt,ot,bt){const yt=new Uint8Array(4),Jt=s.createTexture();s.bindTexture(L,Jt),s.texParameteri(L,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(L,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Qt=0;Qt<ot;Qt++)n&&(L===s.TEXTURE_3D||L===s.TEXTURE_2D_ARRAY)?s.texImage3D(rt,0,s.RGBA,1,1,bt,0,s.RGBA,s.UNSIGNED_BYTE,yt):s.texImage2D(rt+Qt,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,yt);return Jt}const Lt={};Lt[s.TEXTURE_2D]=gt(s.TEXTURE_2D,s.TEXTURE_2D,1),Lt[s.TEXTURE_CUBE_MAP]=gt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),n&&(Lt[s.TEXTURE_2D_ARRAY]=gt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),Lt[s.TEXTURE_3D]=gt(s.TEXTURE_3D,s.TEXTURE_3D,1,1)),o.setClear(0,0,0,1),c.setClear(1),l.setClear(0),Dt(s.DEPTH_TEST),c.setFunc(as),Nt(!1),T(Fr),Dt(s.CULL_FACE),ft(_n);function Dt(L){u[L]!==!0&&(s.enable(L),u[L]=!0)}function wt(L){u[L]!==!1&&(s.disable(L),u[L]=!1)}function Xt(L,rt){return m[L]!==rt?(s.bindFramebuffer(L,rt),m[L]=rt,n&&(L===s.DRAW_FRAMEBUFFER&&(m[s.FRAMEBUFFER]=rt),L===s.FRAMEBUFFER&&(m[s.DRAW_FRAMEBUFFER]=rt)),!0):!1}function U(L,rt){let ot=_,bt=!1;if(L)if(ot=g.get(rt),ot===void 0&&(ot=[],g.set(rt,ot)),L.isWebGLMultipleRenderTargets){const yt=L.texture;if(ot.length!==yt.length||ot[0]!==s.COLOR_ATTACHMENT0){for(let Jt=0,Qt=yt.length;Jt<Qt;Jt++)ot[Jt]=s.COLOR_ATTACHMENT0+Jt;ot.length=yt.length,bt=!0}}else ot[0]!==s.COLOR_ATTACHMENT0&&(ot[0]=s.COLOR_ATTACHMENT0,bt=!0);else ot[0]!==s.BACK&&(ot[0]=s.BACK,bt=!0);bt&&(e.isWebGL2?s.drawBuffers(ot):t.get("WEBGL_draw_buffers").drawBuffersWEBGL(ot))}function ye(L){return p!==L?(s.useProgram(L),p=L,!0):!1}const Mt={[Cn]:s.FUNC_ADD,[oc]:s.FUNC_SUBTRACT,[ac]:s.FUNC_REVERSE_SUBTRACT};if(n)Mt[zr]=s.MIN,Mt[kr]=s.MAX;else{const L=t.get("EXT_blend_minmax");L!==null&&(Mt[zr]=L.MIN_EXT,Mt[kr]=L.MAX_EXT)}const Ct={[cc]:s.ZERO,[lc]:s.ONE,[hc]:s.SRC_COLOR,[sr]:s.SRC_ALPHA,[gc]:s.SRC_ALPHA_SATURATE,[pc]:s.DST_COLOR,[uc]:s.DST_ALPHA,[dc]:s.ONE_MINUS_SRC_COLOR,[rr]:s.ONE_MINUS_SRC_ALPHA,[mc]:s.ONE_MINUS_DST_COLOR,[fc]:s.ONE_MINUS_DST_ALPHA,[_c]:s.CONSTANT_COLOR,[vc]:s.ONE_MINUS_CONSTANT_COLOR,[xc]:s.CONSTANT_ALPHA,[Mc]:s.ONE_MINUS_CONSTANT_ALPHA};function ft(L,rt,ot,bt,yt,Jt,Qt,fe,Se,te){if(L===_n){f===!0&&(wt(s.BLEND),f=!1);return}if(f===!1&&(Dt(s.BLEND),f=!0),L!==rc){if(L!==M||te!==z){if((v!==Cn||S!==Cn)&&(s.blendEquation(s.FUNC_ADD),v=Cn,S=Cn),te)switch(L){case ri:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Br:s.blendFunc(s.ONE,s.ONE);break;case Or:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Gr:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}else switch(L){case ri:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Br:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case Or:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Gr:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}w=null,R=null,A=null,I=null,y.set(0,0,0),b=0,M=L,z=te}return}yt=yt||rt,Jt=Jt||ot,Qt=Qt||bt,(rt!==v||yt!==S)&&(s.blendEquationSeparate(Mt[rt],Mt[yt]),v=rt,S=yt),(ot!==w||bt!==R||Jt!==A||Qt!==I)&&(s.blendFuncSeparate(Ct[ot],Ct[bt],Ct[Jt],Ct[Qt]),w=ot,R=bt,A=Jt,I=Qt),(fe.equals(y)===!1||Se!==b)&&(s.blendColor(fe.r,fe.g,fe.b,Se),y.copy(fe),b=Se),M=L,z=!1}function ie(L,rt){L.side===Le?wt(s.CULL_FACE):Dt(s.CULL_FACE);let ot=L.side===Pe;rt&&(ot=!ot),Nt(ot),L.blending===ri&&L.transparent===!1?ft(_n):ft(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),c.setFunc(L.depthFunc),c.setTest(L.depthTest),c.setMask(L.depthWrite),o.setMask(L.colorWrite);const bt=L.stencilWrite;l.setTest(bt),bt&&(l.setMask(L.stencilWriteMask),l.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),l.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),F(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?Dt(s.SAMPLE_ALPHA_TO_COVERAGE):wt(s.SAMPLE_ALPHA_TO_COVERAGE)}function Nt(L){H!==L&&(L?s.frontFace(s.CW):s.frontFace(s.CCW),H=L)}function T(L){L!==ic?(Dt(s.CULL_FACE),L!==tt&&(L===Fr?s.cullFace(s.BACK):L===sc?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):wt(s.CULL_FACE),tt=L}function x(L){L!==P&&(X&&s.lineWidth(L),P=L)}function F(L,rt,ot){L?(Dt(s.POLYGON_OFFSET_FILL),(O!==rt||W!==ot)&&(s.polygonOffset(rt,ot),O=rt,W=ot)):wt(s.POLYGON_OFFSET_FILL)}function J(L){L?Dt(s.SCISSOR_TEST):wt(s.SCISSOR_TEST)}function K(L){L===void 0&&(L=s.TEXTURE0+Y-1),et!==L&&(s.activeTexture(L),et=L)}function Q(L,rt,ot){ot===void 0&&(et===null?ot=s.TEXTURE0+Y-1:ot=et);let bt=nt[ot];bt===void 0&&(bt={type:void 0,texture:void 0},nt[ot]=bt),(bt.type!==L||bt.texture!==rt)&&(et!==ot&&(s.activeTexture(ot),et=ot),s.bindTexture(L,rt||Lt[L]),bt.type=L,bt.texture=rt)}function pt(){const L=nt[et];L!==void 0&&L.type!==void 0&&(s.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function at(){try{s.compressedTexImage2D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function dt(){try{s.compressedTexImage3D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Et(){try{s.texSubImage2D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Ft(){try{s.texSubImage3D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Z(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function jt(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Vt(){try{s.texStorage2D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function At(){try{s.texStorage3D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function vt(){try{s.texImage2D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ut(){try{s.texImage3D.apply(s,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function It(L){lt.equals(L)===!1&&(s.scissor(L.x,L.y,L.z,L.w),lt.copy(L))}function Yt(L){_t.equals(L)===!1&&(s.viewport(L.x,L.y,L.z,L.w),_t.copy(L))}function re(L,rt){let ot=d.get(rt);ot===void 0&&(ot=new WeakMap,d.set(rt,ot));let bt=ot.get(L);bt===void 0&&(bt=s.getUniformBlockIndex(rt,L.name),ot.set(L,bt))}function Ot(L,rt){const bt=d.get(rt).get(L);h.get(rt)!==bt&&(s.uniformBlockBinding(rt,bt,L.__bindingPointIndex),h.set(rt,bt))}function it(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),n===!0&&(s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null)),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),u={},et=null,nt={},m={},g=new WeakMap,_=[],p=null,f=!1,M=null,v=null,w=null,R=null,S=null,A=null,I=null,y=new Ht(0,0,0),b=0,z=!1,H=null,tt=null,P=null,O=null,W=null,lt.set(0,0,s.canvas.width,s.canvas.height),_t.set(0,0,s.canvas.width,s.canvas.height),o.reset(),c.reset(),l.reset()}return{buffers:{color:o,depth:c,stencil:l},enable:Dt,disable:wt,bindFramebuffer:Xt,drawBuffers:U,useProgram:ye,setBlending:ft,setMaterial:ie,setFlipSided:Nt,setCullFace:T,setLineWidth:x,setPolygonOffset:F,setScissorTest:J,activeTexture:K,bindTexture:Q,unbindTexture:pt,compressedTexImage2D:at,compressedTexImage3D:dt,texImage2D:vt,texImage3D:ut,updateUBOMapping:re,uniformBlockBinding:Ot,texStorage2D:Vt,texStorage3D:At,texSubImage2D:Et,texSubImage3D:Ft,compressedTexSubImage2D:Z,compressedTexSubImage3D:jt,scissor:It,viewport:Yt,reset:it}}function pp(s,t,e,n,i,r,a){const o=i.isWebGL2,c=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new WeakMap;let d;const u=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(T,x){return m?new OffscreenCanvas(T,x):fs("canvas")}function _(T,x,F,J){let K=1;if((T.width>J||T.height>J)&&(K=J/Math.max(T.width,T.height)),K<1||x===!0)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap){const Q=x?us:Math.floor,pt=Q(K*T.width),at=Q(K*T.height);d===void 0&&(d=g(pt,at));const dt=F?g(pt,at):d;return dt.width=pt,dt.height=at,dt.getContext("2d").drawImage(T,0,0,pt,at),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+T.width+"x"+T.height+") to ("+pt+"x"+at+")."),dt}else return"data"in T&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+T.width+"x"+T.height+")."),T;return T}function p(T){return ur(T.width)&&ur(T.height)}function f(T){return o?!1:T.wrapS!==Xe||T.wrapT!==Xe||T.minFilter!==Te&&T.minFilter!==Ge}function M(T,x){return T.generateMipmaps&&x&&T.minFilter!==Te&&T.minFilter!==Ge}function v(T){s.generateMipmap(T)}function w(T,x,F,J,K=!1){if(o===!1)return x;if(T!==null){if(s[T]!==void 0)return s[T];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let Q=x;if(x===s.RED&&(F===s.FLOAT&&(Q=s.R32F),F===s.HALF_FLOAT&&(Q=s.R16F),F===s.UNSIGNED_BYTE&&(Q=s.R8)),x===s.RED_INTEGER&&(F===s.UNSIGNED_BYTE&&(Q=s.R8UI),F===s.UNSIGNED_SHORT&&(Q=s.R16UI),F===s.UNSIGNED_INT&&(Q=s.R32UI),F===s.BYTE&&(Q=s.R8I),F===s.SHORT&&(Q=s.R16I),F===s.INT&&(Q=s.R32I)),x===s.RG&&(F===s.FLOAT&&(Q=s.RG32F),F===s.HALF_FLOAT&&(Q=s.RG16F),F===s.UNSIGNED_BYTE&&(Q=s.RG8)),x===s.RGBA){const pt=K?cs:Kt.getTransfer(J);F===s.FLOAT&&(Q=s.RGBA32F),F===s.HALF_FLOAT&&(Q=s.RGBA16F),F===s.UNSIGNED_BYTE&&(Q=pt===ee?s.SRGB8_ALPHA8:s.RGBA8),F===s.UNSIGNED_SHORT_4_4_4_4&&(Q=s.RGBA4),F===s.UNSIGNED_SHORT_5_5_5_1&&(Q=s.RGB5_A1)}return(Q===s.R16F||Q===s.R32F||Q===s.RG16F||Q===s.RG32F||Q===s.RGBA16F||Q===s.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function R(T,x,F){return M(T,F)===!0||T.isFramebufferTexture&&T.minFilter!==Te&&T.minFilter!==Ge?Math.log2(Math.max(x.width,x.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?x.mipmaps.length:1}function S(T){return T===Te||T===Hr||T===bs?s.NEAREST:s.LINEAR}function A(T){const x=T.target;x.removeEventListener("dispose",A),y(x),x.isVideoTexture&&h.delete(x)}function I(T){const x=T.target;x.removeEventListener("dispose",I),z(x)}function y(T){const x=n.get(T);if(x.__webglInit===void 0)return;const F=T.source,J=u.get(F);if(J){const K=J[x.__cacheKey];K.usedTimes--,K.usedTimes===0&&b(T),Object.keys(J).length===0&&u.delete(F)}n.remove(T)}function b(T){const x=n.get(T);s.deleteTexture(x.__webglTexture);const F=T.source,J=u.get(F);delete J[x.__cacheKey],a.memory.textures--}function z(T){const x=T.texture,F=n.get(T),J=n.get(x);if(J.__webglTexture!==void 0&&(s.deleteTexture(J.__webglTexture),a.memory.textures--),T.depthTexture&&T.depthTexture.dispose(),T.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(F.__webglFramebuffer[K]))for(let Q=0;Q<F.__webglFramebuffer[K].length;Q++)s.deleteFramebuffer(F.__webglFramebuffer[K][Q]);else s.deleteFramebuffer(F.__webglFramebuffer[K]);F.__webglDepthbuffer&&s.deleteRenderbuffer(F.__webglDepthbuffer[K])}else{if(Array.isArray(F.__webglFramebuffer))for(let K=0;K<F.__webglFramebuffer.length;K++)s.deleteFramebuffer(F.__webglFramebuffer[K]);else s.deleteFramebuffer(F.__webglFramebuffer);if(F.__webglDepthbuffer&&s.deleteRenderbuffer(F.__webglDepthbuffer),F.__webglMultisampledFramebuffer&&s.deleteFramebuffer(F.__webglMultisampledFramebuffer),F.__webglColorRenderbuffer)for(let K=0;K<F.__webglColorRenderbuffer.length;K++)F.__webglColorRenderbuffer[K]&&s.deleteRenderbuffer(F.__webglColorRenderbuffer[K]);F.__webglDepthRenderbuffer&&s.deleteRenderbuffer(F.__webglDepthRenderbuffer)}if(T.isWebGLMultipleRenderTargets)for(let K=0,Q=x.length;K<Q;K++){const pt=n.get(x[K]);pt.__webglTexture&&(s.deleteTexture(pt.__webglTexture),a.memory.textures--),n.remove(x[K])}n.remove(x),n.remove(T)}let H=0;function tt(){H=0}function P(){const T=H;return T>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+i.maxTextures),H+=1,T}function O(T){const x=[];return x.push(T.wrapS),x.push(T.wrapT),x.push(T.wrapR||0),x.push(T.magFilter),x.push(T.minFilter),x.push(T.anisotropy),x.push(T.internalFormat),x.push(T.format),x.push(T.type),x.push(T.generateMipmaps),x.push(T.premultiplyAlpha),x.push(T.flipY),x.push(T.unpackAlignment),x.push(T.colorSpace),x.join()}function W(T,x){const F=n.get(T);if(T.isVideoTexture&&ie(T),T.isRenderTargetTexture===!1&&T.version>0&&F.__version!==T.version){const J=T.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{lt(F,T,x);return}}e.bindTexture(s.TEXTURE_2D,F.__webglTexture,s.TEXTURE0+x)}function Y(T,x){const F=n.get(T);if(T.version>0&&F.__version!==T.version){lt(F,T,x);return}e.bindTexture(s.TEXTURE_2D_ARRAY,F.__webglTexture,s.TEXTURE0+x)}function X(T,x){const F=n.get(T);if(T.version>0&&F.__version!==T.version){lt(F,T,x);return}e.bindTexture(s.TEXTURE_3D,F.__webglTexture,s.TEXTURE0+x)}function q(T,x){const F=n.get(T);if(T.version>0&&F.__version!==T.version){_t(F,T,x);return}e.bindTexture(s.TEXTURE_CUBE_MAP,F.__webglTexture,s.TEXTURE0+x)}const $={[cr]:s.REPEAT,[Xe]:s.CLAMP_TO_EDGE,[lr]:s.MIRRORED_REPEAT},et={[Te]:s.NEAREST,[Hr]:s.NEAREST_MIPMAP_NEAREST,[bs]:s.NEAREST_MIPMAP_LINEAR,[Ge]:s.LINEAR,[Nc]:s.LINEAR_MIPMAP_NEAREST,[Ti]:s.LINEAR_MIPMAP_LINEAR},nt={[Yc]:s.NEVER,[Qc]:s.ALWAYS,[$c]:s.LESS,[Ra]:s.LEQUAL,[jc]:s.EQUAL,[Jc]:s.GEQUAL,[Zc]:s.GREATER,[Kc]:s.NOTEQUAL};function V(T,x,F){if(F?(s.texParameteri(T,s.TEXTURE_WRAP_S,$[x.wrapS]),s.texParameteri(T,s.TEXTURE_WRAP_T,$[x.wrapT]),(T===s.TEXTURE_3D||T===s.TEXTURE_2D_ARRAY)&&s.texParameteri(T,s.TEXTURE_WRAP_R,$[x.wrapR]),s.texParameteri(T,s.TEXTURE_MAG_FILTER,et[x.magFilter]),s.texParameteri(T,s.TEXTURE_MIN_FILTER,et[x.minFilter])):(s.texParameteri(T,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(T,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),(T===s.TEXTURE_3D||T===s.TEXTURE_2D_ARRAY)&&s.texParameteri(T,s.TEXTURE_WRAP_R,s.CLAMP_TO_EDGE),(x.wrapS!==Xe||x.wrapT!==Xe)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),s.texParameteri(T,s.TEXTURE_MAG_FILTER,S(x.magFilter)),s.texParameteri(T,s.TEXTURE_MIN_FILTER,S(x.minFilter)),x.minFilter!==Te&&x.minFilter!==Ge&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),x.compareFunction&&(s.texParameteri(T,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(T,s.TEXTURE_COMPARE_FUNC,nt[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){const J=t.get("EXT_texture_filter_anisotropic");if(x.magFilter===Te||x.minFilter!==bs&&x.minFilter!==Ti||x.type===gn&&t.has("OES_texture_float_linear")===!1||o===!1&&x.type===Ai&&t.has("OES_texture_half_float_linear")===!1)return;(x.anisotropy>1||n.get(x).__currentAnisotropy)&&(s.texParameterf(T,J.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,i.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy)}}function j(T,x){let F=!1;T.__webglInit===void 0&&(T.__webglInit=!0,x.addEventListener("dispose",A));const J=x.source;let K=u.get(J);K===void 0&&(K={},u.set(J,K));const Q=O(x);if(Q!==T.__cacheKey){K[Q]===void 0&&(K[Q]={texture:s.createTexture(),usedTimes:0},a.memory.textures++,F=!0),K[Q].usedTimes++;const pt=K[T.__cacheKey];pt!==void 0&&(K[T.__cacheKey].usedTimes--,pt.usedTimes===0&&b(x)),T.__cacheKey=Q,T.__webglTexture=K[Q].texture}return F}function lt(T,x,F){let J=s.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(J=s.TEXTURE_2D_ARRAY),x.isData3DTexture&&(J=s.TEXTURE_3D);const K=j(T,x),Q=x.source;e.bindTexture(J,T.__webglTexture,s.TEXTURE0+F);const pt=n.get(Q);if(Q.version!==pt.__version||K===!0){e.activeTexture(s.TEXTURE0+F);const at=Kt.getPrimaries(Kt.workingColorSpace),dt=x.colorSpace===ke?null:Kt.getPrimaries(x.colorSpace),Et=x.colorSpace===ke||at===dt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,x.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,x.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Et);const Ft=f(x)&&p(x.image)===!1;let Z=_(x.image,Ft,!1,i.maxTextureSize);Z=Nt(x,Z);const jt=p(Z)||o,Vt=r.convert(x.format,x.colorSpace);let At=r.convert(x.type),vt=w(x.internalFormat,Vt,At,x.colorSpace,x.isVideoTexture);V(J,x,jt);let ut;const It=x.mipmaps,Yt=o&&x.isVideoTexture!==!0&&vt!==Ta,re=pt.__version===void 0||K===!0,Ot=R(x,Z,jt);if(x.isDepthTexture)vt=s.DEPTH_COMPONENT,o?x.type===gn?vt=s.DEPTH_COMPONENT32F:x.type===mn?vt=s.DEPTH_COMPONENT24:x.type===Ln?vt=s.DEPTH24_STENCIL8:vt=s.DEPTH_COMPONENT16:x.type===gn&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),x.format===Pn&&vt===s.DEPTH_COMPONENT&&x.type!==vr&&x.type!==mn&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),x.type=mn,At=r.convert(x.type)),x.format===li&&vt===s.DEPTH_COMPONENT&&(vt=s.DEPTH_STENCIL,x.type!==Ln&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),x.type=Ln,At=r.convert(x.type))),re&&(Yt?e.texStorage2D(s.TEXTURE_2D,1,vt,Z.width,Z.height):e.texImage2D(s.TEXTURE_2D,0,vt,Z.width,Z.height,0,Vt,At,null));else if(x.isDataTexture)if(It.length>0&&jt){Yt&&re&&e.texStorage2D(s.TEXTURE_2D,Ot,vt,It[0].width,It[0].height);for(let it=0,L=It.length;it<L;it++)ut=It[it],Yt?e.texSubImage2D(s.TEXTURE_2D,it,0,0,ut.width,ut.height,Vt,At,ut.data):e.texImage2D(s.TEXTURE_2D,it,vt,ut.width,ut.height,0,Vt,At,ut.data);x.generateMipmaps=!1}else Yt?(re&&e.texStorage2D(s.TEXTURE_2D,Ot,vt,Z.width,Z.height),e.texSubImage2D(s.TEXTURE_2D,0,0,0,Z.width,Z.height,Vt,At,Z.data)):e.texImage2D(s.TEXTURE_2D,0,vt,Z.width,Z.height,0,Vt,At,Z.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){Yt&&re&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Ot,vt,It[0].width,It[0].height,Z.depth);for(let it=0,L=It.length;it<L;it++)ut=It[it],x.format!==qe?Vt!==null?Yt?e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,it,0,0,0,ut.width,ut.height,Z.depth,Vt,ut.data,0,0):e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,it,vt,ut.width,ut.height,Z.depth,0,ut.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Yt?e.texSubImage3D(s.TEXTURE_2D_ARRAY,it,0,0,0,ut.width,ut.height,Z.depth,Vt,At,ut.data):e.texImage3D(s.TEXTURE_2D_ARRAY,it,vt,ut.width,ut.height,Z.depth,0,Vt,At,ut.data)}else{Yt&&re&&e.texStorage2D(s.TEXTURE_2D,Ot,vt,It[0].width,It[0].height);for(let it=0,L=It.length;it<L;it++)ut=It[it],x.format!==qe?Vt!==null?Yt?e.compressedTexSubImage2D(s.TEXTURE_2D,it,0,0,ut.width,ut.height,Vt,ut.data):e.compressedTexImage2D(s.TEXTURE_2D,it,vt,ut.width,ut.height,0,ut.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Yt?e.texSubImage2D(s.TEXTURE_2D,it,0,0,ut.width,ut.height,Vt,At,ut.data):e.texImage2D(s.TEXTURE_2D,it,vt,ut.width,ut.height,0,Vt,At,ut.data)}else if(x.isDataArrayTexture)Yt?(re&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Ot,vt,Z.width,Z.height,Z.depth),e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,Z.width,Z.height,Z.depth,Vt,At,Z.data)):e.texImage3D(s.TEXTURE_2D_ARRAY,0,vt,Z.width,Z.height,Z.depth,0,Vt,At,Z.data);else if(x.isData3DTexture)Yt?(re&&e.texStorage3D(s.TEXTURE_3D,Ot,vt,Z.width,Z.height,Z.depth),e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,Z.width,Z.height,Z.depth,Vt,At,Z.data)):e.texImage3D(s.TEXTURE_3D,0,vt,Z.width,Z.height,Z.depth,0,Vt,At,Z.data);else if(x.isFramebufferTexture){if(re)if(Yt)e.texStorage2D(s.TEXTURE_2D,Ot,vt,Z.width,Z.height);else{let it=Z.width,L=Z.height;for(let rt=0;rt<Ot;rt++)e.texImage2D(s.TEXTURE_2D,rt,vt,it,L,0,Vt,At,null),it>>=1,L>>=1}}else if(It.length>0&&jt){Yt&&re&&e.texStorage2D(s.TEXTURE_2D,Ot,vt,It[0].width,It[0].height);for(let it=0,L=It.length;it<L;it++)ut=It[it],Yt?e.texSubImage2D(s.TEXTURE_2D,it,0,0,Vt,At,ut):e.texImage2D(s.TEXTURE_2D,it,vt,Vt,At,ut);x.generateMipmaps=!1}else Yt?(re&&e.texStorage2D(s.TEXTURE_2D,Ot,vt,Z.width,Z.height),e.texSubImage2D(s.TEXTURE_2D,0,0,0,Vt,At,Z)):e.texImage2D(s.TEXTURE_2D,0,vt,Vt,At,Z);M(x,jt)&&v(J),pt.__version=Q.version,x.onUpdate&&x.onUpdate(x)}T.__version=x.version}function _t(T,x,F){if(x.image.length!==6)return;const J=j(T,x),K=x.source;e.bindTexture(s.TEXTURE_CUBE_MAP,T.__webglTexture,s.TEXTURE0+F);const Q=n.get(K);if(K.version!==Q.__version||J===!0){e.activeTexture(s.TEXTURE0+F);const pt=Kt.getPrimaries(Kt.workingColorSpace),at=x.colorSpace===ke?null:Kt.getPrimaries(x.colorSpace),dt=x.colorSpace===ke||pt===at?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,x.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,x.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,dt);const Et=x.isCompressedTexture||x.image[0].isCompressedTexture,Ft=x.image[0]&&x.image[0].isDataTexture,Z=[];for(let it=0;it<6;it++)!Et&&!Ft?Z[it]=_(x.image[it],!1,!0,i.maxCubemapSize):Z[it]=Ft?x.image[it].image:x.image[it],Z[it]=Nt(x,Z[it]);const jt=Z[0],Vt=p(jt)||o,At=r.convert(x.format,x.colorSpace),vt=r.convert(x.type),ut=w(x.internalFormat,At,vt,x.colorSpace),It=o&&x.isVideoTexture!==!0,Yt=Q.__version===void 0||J===!0;let re=R(x,jt,Vt);V(s.TEXTURE_CUBE_MAP,x,Vt);let Ot;if(Et){It&&Yt&&e.texStorage2D(s.TEXTURE_CUBE_MAP,re,ut,jt.width,jt.height);for(let it=0;it<6;it++){Ot=Z[it].mipmaps;for(let L=0;L<Ot.length;L++){const rt=Ot[L];x.format!==qe?At!==null?It?e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L,0,0,rt.width,rt.height,At,rt.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L,ut,rt.width,rt.height,0,rt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):It?e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L,0,0,rt.width,rt.height,At,vt,rt.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L,ut,rt.width,rt.height,0,At,vt,rt.data)}}}else{Ot=x.mipmaps,It&&Yt&&(Ot.length>0&&re++,e.texStorage2D(s.TEXTURE_CUBE_MAP,re,ut,Z[0].width,Z[0].height));for(let it=0;it<6;it++)if(Ft){It?e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,Z[it].width,Z[it].height,At,vt,Z[it].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,ut,Z[it].width,Z[it].height,0,At,vt,Z[it].data);for(let L=0;L<Ot.length;L++){const ot=Ot[L].image[it].image;It?e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L+1,0,0,ot.width,ot.height,At,vt,ot.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L+1,ut,ot.width,ot.height,0,At,vt,ot.data)}}else{It?e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,At,vt,Z[it]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,ut,At,vt,Z[it]);for(let L=0;L<Ot.length;L++){const rt=Ot[L];It?e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L+1,0,0,At,vt,rt.image[it]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+it,L+1,ut,At,vt,rt.image[it])}}}M(x,Vt)&&v(s.TEXTURE_CUBE_MAP),Q.__version=K.version,x.onUpdate&&x.onUpdate(x)}T.__version=x.version}function gt(T,x,F,J,K,Q){const pt=r.convert(F.format,F.colorSpace),at=r.convert(F.type),dt=w(F.internalFormat,pt,at,F.colorSpace);if(!n.get(x).__hasExternalTextures){const Ft=Math.max(1,x.width>>Q),Z=Math.max(1,x.height>>Q);K===s.TEXTURE_3D||K===s.TEXTURE_2D_ARRAY?e.texImage3D(K,Q,dt,Ft,Z,x.depth,0,pt,at,null):e.texImage2D(K,Q,dt,Ft,Z,0,pt,at,null)}e.bindFramebuffer(s.FRAMEBUFFER,T),ft(x)?c.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,J,K,n.get(F).__webglTexture,0,Ct(x)):(K===s.TEXTURE_2D||K>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,J,K,n.get(F).__webglTexture,Q),e.bindFramebuffer(s.FRAMEBUFFER,null)}function Lt(T,x,F){if(s.bindRenderbuffer(s.RENDERBUFFER,T),x.depthBuffer&&!x.stencilBuffer){let J=o===!0?s.DEPTH_COMPONENT24:s.DEPTH_COMPONENT16;if(F||ft(x)){const K=x.depthTexture;K&&K.isDepthTexture&&(K.type===gn?J=s.DEPTH_COMPONENT32F:K.type===mn&&(J=s.DEPTH_COMPONENT24));const Q=Ct(x);ft(x)?c.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Q,J,x.width,x.height):s.renderbufferStorageMultisample(s.RENDERBUFFER,Q,J,x.width,x.height)}else s.renderbufferStorage(s.RENDERBUFFER,J,x.width,x.height);s.framebufferRenderbuffer(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.RENDERBUFFER,T)}else if(x.depthBuffer&&x.stencilBuffer){const J=Ct(x);F&&ft(x)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,J,s.DEPTH24_STENCIL8,x.width,x.height):ft(x)?c.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,J,s.DEPTH24_STENCIL8,x.width,x.height):s.renderbufferStorage(s.RENDERBUFFER,s.DEPTH_STENCIL,x.width,x.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.RENDERBUFFER,T)}else{const J=x.isWebGLMultipleRenderTargets===!0?x.texture:[x.texture];for(let K=0;K<J.length;K++){const Q=J[K],pt=r.convert(Q.format,Q.colorSpace),at=r.convert(Q.type),dt=w(Q.internalFormat,pt,at,Q.colorSpace),Et=Ct(x);F&&ft(x)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,Et,dt,x.width,x.height):ft(x)?c.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Et,dt,x.width,x.height):s.renderbufferStorage(s.RENDERBUFFER,dt,x.width,x.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function Dt(T,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,T),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(x.depthTexture).__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),W(x.depthTexture,0);const J=n.get(x.depthTexture).__webglTexture,K=Ct(x);if(x.depthTexture.format===Pn)ft(x)?c.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,J,0,K):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,J,0);else if(x.depthTexture.format===li)ft(x)?c.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,J,0,K):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function wt(T){const x=n.get(T),F=T.isWebGLCubeRenderTarget===!0;if(T.depthTexture&&!x.__autoAllocateDepthBuffer){if(F)throw new Error("target.depthTexture not supported in Cube render targets");Dt(x.__webglFramebuffer,T)}else if(F){x.__webglDepthbuffer=[];for(let J=0;J<6;J++)e.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer[J]),x.__webglDepthbuffer[J]=s.createRenderbuffer(),Lt(x.__webglDepthbuffer[J],T,!1)}else e.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer=s.createRenderbuffer(),Lt(x.__webglDepthbuffer,T,!1);e.bindFramebuffer(s.FRAMEBUFFER,null)}function Xt(T,x,F){const J=n.get(T);x!==void 0&&gt(J.__webglFramebuffer,T,T.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),F!==void 0&&wt(T)}function U(T){const x=T.texture,F=n.get(T),J=n.get(x);T.addEventListener("dispose",I),T.isWebGLMultipleRenderTargets!==!0&&(J.__webglTexture===void 0&&(J.__webglTexture=s.createTexture()),J.__version=x.version,a.memory.textures++);const K=T.isWebGLCubeRenderTarget===!0,Q=T.isWebGLMultipleRenderTargets===!0,pt=p(T)||o;if(K){F.__webglFramebuffer=[];for(let at=0;at<6;at++)if(o&&x.mipmaps&&x.mipmaps.length>0){F.__webglFramebuffer[at]=[];for(let dt=0;dt<x.mipmaps.length;dt++)F.__webglFramebuffer[at][dt]=s.createFramebuffer()}else F.__webglFramebuffer[at]=s.createFramebuffer()}else{if(o&&x.mipmaps&&x.mipmaps.length>0){F.__webglFramebuffer=[];for(let at=0;at<x.mipmaps.length;at++)F.__webglFramebuffer[at]=s.createFramebuffer()}else F.__webglFramebuffer=s.createFramebuffer();if(Q)if(i.drawBuffers){const at=T.texture;for(let dt=0,Et=at.length;dt<Et;dt++){const Ft=n.get(at[dt]);Ft.__webglTexture===void 0&&(Ft.__webglTexture=s.createTexture(),a.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(o&&T.samples>0&&ft(T)===!1){const at=Q?x:[x];F.__webglMultisampledFramebuffer=s.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let dt=0;dt<at.length;dt++){const Et=at[dt];F.__webglColorRenderbuffer[dt]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,F.__webglColorRenderbuffer[dt]);const Ft=r.convert(Et.format,Et.colorSpace),Z=r.convert(Et.type),jt=w(Et.internalFormat,Ft,Z,Et.colorSpace,T.isXRRenderTarget===!0),Vt=Ct(T);s.renderbufferStorageMultisample(s.RENDERBUFFER,Vt,jt,T.width,T.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+dt,s.RENDERBUFFER,F.__webglColorRenderbuffer[dt])}s.bindRenderbuffer(s.RENDERBUFFER,null),T.depthBuffer&&(F.__webglDepthRenderbuffer=s.createRenderbuffer(),Lt(F.__webglDepthRenderbuffer,T,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(K){e.bindTexture(s.TEXTURE_CUBE_MAP,J.__webglTexture),V(s.TEXTURE_CUBE_MAP,x,pt);for(let at=0;at<6;at++)if(o&&x.mipmaps&&x.mipmaps.length>0)for(let dt=0;dt<x.mipmaps.length;dt++)gt(F.__webglFramebuffer[at][dt],T,x,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+at,dt);else gt(F.__webglFramebuffer[at],T,x,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+at,0);M(x,pt)&&v(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Q){const at=T.texture;for(let dt=0,Et=at.length;dt<Et;dt++){const Ft=at[dt],Z=n.get(Ft);e.bindTexture(s.TEXTURE_2D,Z.__webglTexture),V(s.TEXTURE_2D,Ft,pt),gt(F.__webglFramebuffer,T,Ft,s.COLOR_ATTACHMENT0+dt,s.TEXTURE_2D,0),M(Ft,pt)&&v(s.TEXTURE_2D)}e.unbindTexture()}else{let at=s.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(o?at=T.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),e.bindTexture(at,J.__webglTexture),V(at,x,pt),o&&x.mipmaps&&x.mipmaps.length>0)for(let dt=0;dt<x.mipmaps.length;dt++)gt(F.__webglFramebuffer[dt],T,x,s.COLOR_ATTACHMENT0,at,dt);else gt(F.__webglFramebuffer,T,x,s.COLOR_ATTACHMENT0,at,0);M(x,pt)&&v(at),e.unbindTexture()}T.depthBuffer&&wt(T)}function ye(T){const x=p(T)||o,F=T.isWebGLMultipleRenderTargets===!0?T.texture:[T.texture];for(let J=0,K=F.length;J<K;J++){const Q=F[J];if(M(Q,x)){const pt=T.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:s.TEXTURE_2D,at=n.get(Q).__webglTexture;e.bindTexture(pt,at),v(pt),e.unbindTexture()}}}function Mt(T){if(o&&T.samples>0&&ft(T)===!1){const x=T.isWebGLMultipleRenderTargets?T.texture:[T.texture],F=T.width,J=T.height;let K=s.COLOR_BUFFER_BIT;const Q=[],pt=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,at=n.get(T),dt=T.isWebGLMultipleRenderTargets===!0;if(dt)for(let Et=0;Et<x.length;Et++)e.bindFramebuffer(s.FRAMEBUFFER,at.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Et,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,at.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Et,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,at.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,at.__webglFramebuffer);for(let Et=0;Et<x.length;Et++){Q.push(s.COLOR_ATTACHMENT0+Et),T.depthBuffer&&Q.push(pt);const Ft=at.__ignoreDepthValues!==void 0?at.__ignoreDepthValues:!1;if(Ft===!1&&(T.depthBuffer&&(K|=s.DEPTH_BUFFER_BIT),T.stencilBuffer&&(K|=s.STENCIL_BUFFER_BIT)),dt&&s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,at.__webglColorRenderbuffer[Et]),Ft===!0&&(s.invalidateFramebuffer(s.READ_FRAMEBUFFER,[pt]),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[pt])),dt){const Z=n.get(x[Et]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Z,0)}s.blitFramebuffer(0,0,F,J,0,0,F,J,K,s.NEAREST),l&&s.invalidateFramebuffer(s.READ_FRAMEBUFFER,Q)}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),dt)for(let Et=0;Et<x.length;Et++){e.bindFramebuffer(s.FRAMEBUFFER,at.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Et,s.RENDERBUFFER,at.__webglColorRenderbuffer[Et]);const Ft=n.get(x[Et]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,at.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Et,s.TEXTURE_2D,Ft,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,at.__webglMultisampledFramebuffer)}}function Ct(T){return Math.min(i.maxSamples,T.samples)}function ft(T){const x=n.get(T);return o&&T.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function ie(T){const x=a.render.frame;h.get(T)!==x&&(h.set(T,x),T.update())}function Nt(T,x){const F=T.colorSpace,J=T.format,K=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||T.format===dr||F!==cn&&F!==ke&&(Kt.getTransfer(F)===ee?o===!1?t.has("EXT_sRGB")===!0&&J===qe?(T.format=dr,T.minFilter=Ge,T.generateMipmaps=!1):x=Pa.sRGBToLinear(x):(J!==qe||K!==xn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",F)),x}this.allocateTextureUnit=P,this.resetTextureUnits=tt,this.setTexture2D=W,this.setTexture2DArray=Y,this.setTexture3D=X,this.setTextureCube=q,this.rebindTextures=Xt,this.setupRenderTarget=U,this.updateRenderTargetMipmap=ye,this.updateMultisampleRenderTarget=Mt,this.setupDepthRenderbuffer=wt,this.setupFrameBufferTexture=gt,this.useMultisampledRTT=ft}function mp(s,t,e){const n=e.isWebGL2;function i(r,a=ke){let o;const c=Kt.getTransfer(a);if(r===xn)return s.UNSIGNED_BYTE;if(r===ya)return s.UNSIGNED_SHORT_4_4_4_4;if(r===Sa)return s.UNSIGNED_SHORT_5_5_5_1;if(r===Fc)return s.BYTE;if(r===Bc)return s.SHORT;if(r===vr)return s.UNSIGNED_SHORT;if(r===Ma)return s.INT;if(r===mn)return s.UNSIGNED_INT;if(r===gn)return s.FLOAT;if(r===Ai)return n?s.HALF_FLOAT:(o=t.get("OES_texture_half_float"),o!==null?o.HALF_FLOAT_OES:null);if(r===Oc)return s.ALPHA;if(r===qe)return s.RGBA;if(r===Gc)return s.LUMINANCE;if(r===zc)return s.LUMINANCE_ALPHA;if(r===Pn)return s.DEPTH_COMPONENT;if(r===li)return s.DEPTH_STENCIL;if(r===dr)return o=t.get("EXT_sRGB"),o!==null?o.SRGB_ALPHA_EXT:null;if(r===kc)return s.RED;if(r===Ea)return s.RED_INTEGER;if(r===Hc)return s.RG;if(r===wa)return s.RG_INTEGER;if(r===ba)return s.RGBA_INTEGER;if(r===Ts||r===As||r===Cs||r===Rs)if(c===ee)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(r===Ts)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===As)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===Cs)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Rs)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(r===Ts)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===As)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===Cs)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Rs)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Vr||r===Wr||r===Xr||r===qr)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(r===Vr)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Wr)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Xr)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===qr)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Ta)return o=t.get("WEBGL_compressed_texture_etc1"),o!==null?o.COMPRESSED_RGB_ETC1_WEBGL:null;if(r===Yr||r===$r)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(r===Yr)return c===ee?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(r===$r)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(r===jr||r===Zr||r===Kr||r===Jr||r===Qr||r===to||r===eo||r===no||r===io||r===so||r===ro||r===oo||r===ao||r===co)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(r===jr)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Zr)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Kr)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Jr)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Qr)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===to)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===eo)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===no)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===io)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===so)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===ro)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===oo)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===ao)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===co)return c===ee?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===Ls||r===lo||r===ho)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(r===Ls)return c===ee?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===lo)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===ho)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Vc||r===uo||r===fo||r===po)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(r===Ls)return o.COMPRESSED_RED_RGTC1_EXT;if(r===uo)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===fo)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===po)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===Ln?n?s.UNSIGNED_INT_24_8:(o=t.get("WEBGL_depth_texture"),o!==null?o.UNSIGNED_INT_24_8_WEBGL:null):s[r]!==void 0?s[r]:null}return{convert:i}}class gp extends Re{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Wt extends he{constructor(){super(),this.isGroup=!0,this.type="Group"}}const _p={type:"move"};class Qs{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Wt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Wt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Wt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,r=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(const _ of t.hand.values()){const p=e.getJointPose(_,n),f=this._getHandJoint(l,_);p!==null&&(f.matrix.fromArray(p.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=p.radius),f.visible=p!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),m=.02,g=.005;l.inputState.pinching&&u>m+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&u<=m-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(_p)))}return o!==null&&(o.visible=i!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Wt;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}class vp extends di{constructor(t,e){super();const n=this;let i=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,d=null,u=null,m=null,g=null;const _=e.getContextAttributes();let p=null,f=null;const M=[],v=[],w=new xt;let R=null;const S=new Re;S.layers.enable(1),S.viewport=new ne;const A=new Re;A.layers.enable(2),A.viewport=new ne;const I=[S,A],y=new gp;y.layers.enable(1),y.layers.enable(2);let b=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(V){let j=M[V];return j===void 0&&(j=new Qs,M[V]=j),j.getTargetRaySpace()},this.getControllerGrip=function(V){let j=M[V];return j===void 0&&(j=new Qs,M[V]=j),j.getGripSpace()},this.getHand=function(V){let j=M[V];return j===void 0&&(j=new Qs,M[V]=j),j.getHandSpace()};function H(V){const j=v.indexOf(V.inputSource);if(j===-1)return;const lt=M[j];lt!==void 0&&(lt.update(V.inputSource,V.frame,l||a),lt.dispatchEvent({type:V.type,data:V.inputSource}))}function tt(){i.removeEventListener("select",H),i.removeEventListener("selectstart",H),i.removeEventListener("selectend",H),i.removeEventListener("squeeze",H),i.removeEventListener("squeezestart",H),i.removeEventListener("squeezeend",H),i.removeEventListener("end",tt),i.removeEventListener("inputsourceschange",P);for(let V=0;V<M.length;V++){const j=v[V];j!==null&&(v[V]=null,M[V].disconnect(j))}b=null,z=null,t.setRenderTarget(p),m=null,u=null,d=null,i=null,f=null,nt.stop(),n.isPresenting=!1,t.setPixelRatio(R),t.setSize(w.width,w.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(V){r=V,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(V){o=V,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(V){l=V},this.getBaseLayer=function(){return u!==null?u:m},this.getBinding=function(){return d},this.getFrame=function(){return g},this.getSession=function(){return i},this.setSession=async function(V){if(i=V,i!==null){if(p=t.getRenderTarget(),i.addEventListener("select",H),i.addEventListener("selectstart",H),i.addEventListener("selectend",H),i.addEventListener("squeeze",H),i.addEventListener("squeezestart",H),i.addEventListener("squeezeend",H),i.addEventListener("end",tt),i.addEventListener("inputsourceschange",P),_.xrCompatible!==!0&&await e.makeXRCompatible(),R=t.getPixelRatio(),t.getSize(w),i.renderState.layers===void 0||t.capabilities.isWebGL2===!1){const j={antialias:i.renderState.layers===void 0?_.antialias:!0,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(i,e,j),i.updateRenderState({baseLayer:m}),t.setPixelRatio(1),t.setSize(m.framebufferWidth,m.framebufferHeight,!1),f=new Un(m.framebufferWidth,m.framebufferHeight,{format:qe,type:xn,colorSpace:t.outputColorSpace,stencilBuffer:_.stencil})}else{let j=null,lt=null,_t=null;_.depth&&(_t=_.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,j=_.stencil?li:Pn,lt=_.stencil?Ln:mn);const gt={colorFormat:e.RGBA8,depthFormat:_t,scaleFactor:r};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(gt),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),f=new Un(u.textureWidth,u.textureHeight,{format:qe,type:xn,depthTexture:new ka(u.textureWidth,u.textureHeight,lt,void 0,void 0,void 0,void 0,void 0,void 0,j),stencilBuffer:_.stencil,colorSpace:t.outputColorSpace,samples:_.antialias?4:0});const Lt=t.properties.get(f);Lt.__ignoreDepthValues=u.ignoreDepthValues}f.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await i.requestReferenceSpace(o),nt.setContext(i),nt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode};function P(V){for(let j=0;j<V.removed.length;j++){const lt=V.removed[j],_t=v.indexOf(lt);_t>=0&&(v[_t]=null,M[_t].disconnect(lt))}for(let j=0;j<V.added.length;j++){const lt=V.added[j];let _t=v.indexOf(lt);if(_t===-1){for(let Lt=0;Lt<M.length;Lt++)if(Lt>=v.length){v.push(lt),_t=Lt;break}else if(v[Lt]===null){v[Lt]=lt,_t=Lt;break}if(_t===-1)break}const gt=M[_t];gt&&gt.connect(lt)}}const O=new C,W=new C;function Y(V,j,lt){O.setFromMatrixPosition(j.matrixWorld),W.setFromMatrixPosition(lt.matrixWorld);const _t=O.distanceTo(W),gt=j.projectionMatrix.elements,Lt=lt.projectionMatrix.elements,Dt=gt[14]/(gt[10]-1),wt=gt[14]/(gt[10]+1),Xt=(gt[9]+1)/gt[5],U=(gt[9]-1)/gt[5],ye=(gt[8]-1)/gt[0],Mt=(Lt[8]+1)/Lt[0],Ct=Dt*ye,ft=Dt*Mt,ie=_t/(-ye+Mt),Nt=ie*-ye;j.matrixWorld.decompose(V.position,V.quaternion,V.scale),V.translateX(Nt),V.translateZ(ie),V.matrixWorld.compose(V.position,V.quaternion,V.scale),V.matrixWorldInverse.copy(V.matrixWorld).invert();const T=Dt+ie,x=wt+ie,F=Ct-Nt,J=ft+(_t-Nt),K=Xt*wt/x*T,Q=U*wt/x*T;V.projectionMatrix.makePerspective(F,J,K,Q,T,x),V.projectionMatrixInverse.copy(V.projectionMatrix).invert()}function X(V,j){j===null?V.matrixWorld.copy(V.matrix):V.matrixWorld.multiplyMatrices(j.matrixWorld,V.matrix),V.matrixWorldInverse.copy(V.matrixWorld).invert()}this.updateCamera=function(V){if(i===null)return;y.near=A.near=S.near=V.near,y.far=A.far=S.far=V.far,(b!==y.near||z!==y.far)&&(i.updateRenderState({depthNear:y.near,depthFar:y.far}),b=y.near,z=y.far);const j=V.parent,lt=y.cameras;X(y,j);for(let _t=0;_t<lt.length;_t++)X(lt[_t],j);lt.length===2?Y(y,S,A):y.projectionMatrix.copy(S.projectionMatrix),q(V,y,j)};function q(V,j,lt){lt===null?V.matrix.copy(j.matrixWorld):(V.matrix.copy(lt.matrixWorld),V.matrix.invert(),V.matrix.multiply(j.matrixWorld)),V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld(!0),V.projectionMatrix.copy(j.projectionMatrix),V.projectionMatrixInverse.copy(j.projectionMatrixInverse),V.isPerspectiveCamera&&(V.fov=Ci*2*Math.atan(1/V.projectionMatrix.elements[5]),V.zoom=1)}this.getCamera=function(){return y},this.getFoveation=function(){if(!(u===null&&m===null))return c},this.setFoveation=function(V){c=V,u!==null&&(u.fixedFoveation=V),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=V)};let $=null;function et(V,j){if(h=j.getViewerPose(l||a),g=j,h!==null){const lt=h.views;m!==null&&(t.setRenderTargetFramebuffer(f,m.framebuffer),t.setRenderTarget(f));let _t=!1;lt.length!==y.cameras.length&&(y.cameras.length=0,_t=!0);for(let gt=0;gt<lt.length;gt++){const Lt=lt[gt];let Dt=null;if(m!==null)Dt=m.getViewport(Lt);else{const Xt=d.getViewSubImage(u,Lt);Dt=Xt.viewport,gt===0&&(t.setRenderTargetTextures(f,Xt.colorTexture,u.ignoreDepthValues?void 0:Xt.depthStencilTexture),t.setRenderTarget(f))}let wt=I[gt];wt===void 0&&(wt=new Re,wt.layers.enable(gt),wt.viewport=new ne,I[gt]=wt),wt.matrix.fromArray(Lt.transform.matrix),wt.matrix.decompose(wt.position,wt.quaternion,wt.scale),wt.projectionMatrix.fromArray(Lt.projectionMatrix),wt.projectionMatrixInverse.copy(wt.projectionMatrix).invert(),wt.viewport.set(Dt.x,Dt.y,Dt.width,Dt.height),gt===0&&(y.matrix.copy(wt.matrix),y.matrix.decompose(y.position,y.quaternion,y.scale)),_t===!0&&y.cameras.push(wt)}}for(let lt=0;lt<M.length;lt++){const _t=v[lt],gt=M[lt];_t!==null&&gt!==void 0&&gt.update(_t,j,l||a)}$&&$(V,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),g=null}const nt=new za;nt.setAnimationLoop(et),this.setAnimationLoop=function(V){$=V},this.dispose=function(){}}}function xp(s,t){function e(p,f){p.matrixAutoUpdate===!0&&p.updateMatrix(),f.value.copy(p.matrix)}function n(p,f){f.color.getRGB(p.fogColor.value,Ba(s)),f.isFog?(p.fogNear.value=f.near,p.fogFar.value=f.far):f.isFogExp2&&(p.fogDensity.value=f.density)}function i(p,f,M,v,w){f.isMeshBasicMaterial||f.isMeshLambertMaterial?r(p,f):f.isMeshToonMaterial?(r(p,f),d(p,f)):f.isMeshPhongMaterial?(r(p,f),h(p,f)):f.isMeshStandardMaterial?(r(p,f),u(p,f),f.isMeshPhysicalMaterial&&m(p,f,w)):f.isMeshMatcapMaterial?(r(p,f),g(p,f)):f.isMeshDepthMaterial?r(p,f):f.isMeshDistanceMaterial?(r(p,f),_(p,f)):f.isMeshNormalMaterial?r(p,f):f.isLineBasicMaterial?(a(p,f),f.isLineDashedMaterial&&o(p,f)):f.isPointsMaterial?c(p,f,M,v):f.isSpriteMaterial?l(p,f):f.isShadowMaterial?(p.color.value.copy(f.color),p.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(p,f){p.opacity.value=f.opacity,f.color&&p.diffuse.value.copy(f.color),f.emissive&&p.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(p.map.value=f.map,e(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.bumpMap&&(p.bumpMap.value=f.bumpMap,e(f.bumpMap,p.bumpMapTransform),p.bumpScale.value=f.bumpScale,f.side===Pe&&(p.bumpScale.value*=-1)),f.normalMap&&(p.normalMap.value=f.normalMap,e(f.normalMap,p.normalMapTransform),p.normalScale.value.copy(f.normalScale),f.side===Pe&&p.normalScale.value.negate()),f.displacementMap&&(p.displacementMap.value=f.displacementMap,e(f.displacementMap,p.displacementMapTransform),p.displacementScale.value=f.displacementScale,p.displacementBias.value=f.displacementBias),f.emissiveMap&&(p.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,p.emissiveMapTransform)),f.specularMap&&(p.specularMap.value=f.specularMap,e(f.specularMap,p.specularMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest);const M=t.get(f).envMap;if(M&&(p.envMap.value=M,p.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=f.reflectivity,p.ior.value=f.ior,p.refractionRatio.value=f.refractionRatio),f.lightMap){p.lightMap.value=f.lightMap;const v=s._useLegacyLights===!0?Math.PI:1;p.lightMapIntensity.value=f.lightMapIntensity*v,e(f.lightMap,p.lightMapTransform)}f.aoMap&&(p.aoMap.value=f.aoMap,p.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,p.aoMapTransform))}function a(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,f.map&&(p.map.value=f.map,e(f.map,p.mapTransform))}function o(p,f){p.dashSize.value=f.dashSize,p.totalSize.value=f.dashSize+f.gapSize,p.scale.value=f.scale}function c(p,f,M,v){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.size.value=f.size*M,p.scale.value=v*.5,f.map&&(p.map.value=f.map,e(f.map,p.uvTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function l(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.rotation.value=f.rotation,f.map&&(p.map.value=f.map,e(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function h(p,f){p.specular.value.copy(f.specular),p.shininess.value=Math.max(f.shininess,1e-4)}function d(p,f){f.gradientMap&&(p.gradientMap.value=f.gradientMap)}function u(p,f){p.metalness.value=f.metalness,f.metalnessMap&&(p.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,p.metalnessMapTransform)),p.roughness.value=f.roughness,f.roughnessMap&&(p.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,p.roughnessMapTransform)),t.get(f).envMap&&(p.envMapIntensity.value=f.envMapIntensity)}function m(p,f,M){p.ior.value=f.ior,f.sheen>0&&(p.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),p.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(p.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,p.sheenColorMapTransform)),f.sheenRoughnessMap&&(p.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,p.sheenRoughnessMapTransform))),f.clearcoat>0&&(p.clearcoat.value=f.clearcoat,p.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(p.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,p.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(p.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Pe&&p.clearcoatNormalScale.value.negate())),f.iridescence>0&&(p.iridescence.value=f.iridescence,p.iridescenceIOR.value=f.iridescenceIOR,p.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(p.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,p.iridescenceMapTransform)),f.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),f.transmission>0&&(p.transmission.value=f.transmission,p.transmissionSamplerMap.value=M.texture,p.transmissionSamplerSize.value.set(M.width,M.height),f.transmissionMap&&(p.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,p.transmissionMapTransform)),p.thickness.value=f.thickness,f.thicknessMap&&(p.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=f.attenuationDistance,p.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(p.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(p.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=f.specularIntensity,p.specularColor.value.copy(f.specularColor),f.specularColorMap&&(p.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,p.specularColorMapTransform)),f.specularIntensityMap&&(p.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,f){f.matcap&&(p.matcap.value=f.matcap)}function _(p,f){const M=t.get(f).light;p.referencePosition.value.setFromMatrixPosition(M.matrixWorld),p.nearDistance.value=M.shadow.camera.near,p.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function Mp(s,t,e,n){let i={},r={},a=[];const o=e.isWebGL2?s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS):0;function c(M,v){const w=v.program;n.uniformBlockBinding(M,w)}function l(M,v){let w=i[M.id];w===void 0&&(g(M),w=h(M),i[M.id]=w,M.addEventListener("dispose",p));const R=v.program;n.updateUBOMapping(M,R);const S=t.render.frame;r[M.id]!==S&&(u(M),r[M.id]=S)}function h(M){const v=d();M.__bindingPointIndex=v;const w=s.createBuffer(),R=M.__size,S=M.usage;return s.bindBuffer(s.UNIFORM_BUFFER,w),s.bufferData(s.UNIFORM_BUFFER,R,S),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,v,w),w}function d(){for(let M=0;M<o;M++)if(a.indexOf(M)===-1)return a.push(M),M;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(M){const v=i[M.id],w=M.uniforms,R=M.__cache;s.bindBuffer(s.UNIFORM_BUFFER,v);for(let S=0,A=w.length;S<A;S++){const I=Array.isArray(w[S])?w[S]:[w[S]];for(let y=0,b=I.length;y<b;y++){const z=I[y];if(m(z,S,y,R)===!0){const H=z.__offset,tt=Array.isArray(z.value)?z.value:[z.value];let P=0;for(let O=0;O<tt.length;O++){const W=tt[O],Y=_(W);typeof W=="number"||typeof W=="boolean"?(z.__data[0]=W,s.bufferSubData(s.UNIFORM_BUFFER,H+P,z.__data)):W.isMatrix3?(z.__data[0]=W.elements[0],z.__data[1]=W.elements[1],z.__data[2]=W.elements[2],z.__data[3]=0,z.__data[4]=W.elements[3],z.__data[5]=W.elements[4],z.__data[6]=W.elements[5],z.__data[7]=0,z.__data[8]=W.elements[6],z.__data[9]=W.elements[7],z.__data[10]=W.elements[8],z.__data[11]=0):(W.toArray(z.__data,P),P+=Y.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,H,z.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function m(M,v,w,R){const S=M.value,A=v+"_"+w;if(R[A]===void 0)return typeof S=="number"||typeof S=="boolean"?R[A]=S:R[A]=S.clone(),!0;{const I=R[A];if(typeof S=="number"||typeof S=="boolean"){if(I!==S)return R[A]=S,!0}else if(I.equals(S)===!1)return I.copy(S),!0}return!1}function g(M){const v=M.uniforms;let w=0;const R=16;for(let A=0,I=v.length;A<I;A++){const y=Array.isArray(v[A])?v[A]:[v[A]];for(let b=0,z=y.length;b<z;b++){const H=y[b],tt=Array.isArray(H.value)?H.value:[H.value];for(let P=0,O=tt.length;P<O;P++){const W=tt[P],Y=_(W),X=w%R;X!==0&&R-X<Y.boundary&&(w+=R-X),H.__data=new Float32Array(Y.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=w,w+=Y.storage}}}const S=w%R;return S>0&&(w+=R-S),M.__size=w,M.__cache={},this}function _(M){const v={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(v.boundary=4,v.storage=4):M.isVector2?(v.boundary=8,v.storage=8):M.isVector3||M.isColor?(v.boundary=16,v.storage=12):M.isVector4?(v.boundary=16,v.storage=16):M.isMatrix3?(v.boundary=48,v.storage=48):M.isMatrix4?(v.boundary=64,v.storage=64):M.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",M),v}function p(M){const v=M.target;v.removeEventListener("dispose",p);const w=a.indexOf(v.__bindingPointIndex);a.splice(w,1),s.deleteBuffer(i[v.id]),delete i[v.id],delete r[v.id]}function f(){for(const M in i)s.deleteBuffer(i[M]);a=[],i={},r={}}return{bind:c,update:l,dispose:f}}class Ya{constructor(t={}){const{canvas:e=ml(),context:n=null,depth:i=!0,stencil:r=!0,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1}=t;this.isWebGLRenderer=!0;let u;n!==null?u=n.getContextAttributes().alpha:u=a;const m=new Uint32Array(4),g=new Int32Array(4);let _=null,p=null;const f=[],M=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=ge,this._useLegacyLights=!1,this.toneMapping=vn,this.toneMappingExposure=1;const v=this;let w=!1,R=0,S=0,A=null,I=-1,y=null;const b=new ne,z=new ne;let H=null;const tt=new Ht(0);let P=0,O=e.width,W=e.height,Y=1,X=null,q=null;const $=new ne(0,0,O,W),et=new ne(0,0,O,W);let nt=!1;const V=new Er;let j=!1,lt=!1,_t=null;const gt=new ae,Lt=new xt,Dt=new C,wt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Xt(){return A===null?Y:1}let U=n;function ye(E,D){for(let B=0;B<E.length;B++){const k=E[B],N=e.getContext(k,D);if(N!==null)return N}return null}try{const E={alpha:!0,depth:i,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${_r}`),e.addEventListener("webglcontextlost",it,!1),e.addEventListener("webglcontextrestored",L,!1),e.addEventListener("webglcontextcreationerror",rt,!1),U===null){const D=["webgl2","webgl","experimental-webgl"];if(v.isWebGL1Renderer===!0&&D.shift(),U=ye(D,E),U===null)throw ye(D)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&U instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),U.getShaderPrecisionFormat===void 0&&(U.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let Mt,Ct,ft,ie,Nt,T,x,F,J,K,Q,pt,at,dt,Et,Ft,Z,jt,Vt,At,vt,ut,It,Yt;function re(){Mt=new Ru(U),Ct=new Eu(U,Mt,t),Mt.init(Ct),ut=new mp(U,Mt,Ct),ft=new fp(U,Mt,Ct),ie=new Du(U),Nt=new Qf,T=new pp(U,Mt,ft,Nt,Ct,ut,ie),x=new bu(v),F=new Cu(v),J=new zl(U,Ct),It=new yu(U,Mt,J,Ct),K=new Lu(U,J,ie,It),Q=new Fu(U,K,J,ie),Vt=new Nu(U,Ct,T),Ft=new wu(Nt),pt=new Jf(v,x,F,Mt,Ct,It,Ft),at=new xp(v,Nt),dt=new ep,Et=new ap(Mt,Ct),jt=new Mu(v,x,F,ft,Q,u,c),Z=new up(v,Q,Ct),Yt=new Mp(U,ie,Ct,ft),At=new Su(U,Mt,ie,Ct),vt=new Pu(U,Mt,ie,Ct),ie.programs=pt.programs,v.capabilities=Ct,v.extensions=Mt,v.properties=Nt,v.renderLists=dt,v.shadowMap=Z,v.state=ft,v.info=ie}re();const Ot=new vp(v,U);this.xr=Ot,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const E=Mt.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Mt.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return Y},this.setPixelRatio=function(E){E!==void 0&&(Y=E,this.setSize(O,W,!1))},this.getSize=function(E){return E.set(O,W)},this.setSize=function(E,D,B=!0){if(Ot.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}O=E,W=D,e.width=Math.floor(E*Y),e.height=Math.floor(D*Y),B===!0&&(e.style.width=E+"px",e.style.height=D+"px"),this.setViewport(0,0,E,D)},this.getDrawingBufferSize=function(E){return E.set(O*Y,W*Y).floor()},this.setDrawingBufferSize=function(E,D,B){O=E,W=D,Y=B,e.width=Math.floor(E*B),e.height=Math.floor(D*B),this.setViewport(0,0,E,D)},this.getCurrentViewport=function(E){return E.copy(b)},this.getViewport=function(E){return E.copy($)},this.setViewport=function(E,D,B,k){E.isVector4?$.set(E.x,E.y,E.z,E.w):$.set(E,D,B,k),ft.viewport(b.copy($).multiplyScalar(Y).floor())},this.getScissor=function(E){return E.copy(et)},this.setScissor=function(E,D,B,k){E.isVector4?et.set(E.x,E.y,E.z,E.w):et.set(E,D,B,k),ft.scissor(z.copy(et).multiplyScalar(Y).floor())},this.getScissorTest=function(){return nt},this.setScissorTest=function(E){ft.setScissorTest(nt=E)},this.setOpaqueSort=function(E){X=E},this.setTransparentSort=function(E){q=E},this.getClearColor=function(E){return E.copy(jt.getClearColor())},this.setClearColor=function(){jt.setClearColor.apply(jt,arguments)},this.getClearAlpha=function(){return jt.getClearAlpha()},this.setClearAlpha=function(){jt.setClearAlpha.apply(jt,arguments)},this.clear=function(E=!0,D=!0,B=!0){let k=0;if(E){let N=!1;if(A!==null){const ht=A.texture.format;N=ht===ba||ht===wa||ht===Ea}if(N){const ht=A.texture.type,mt=ht===xn||ht===mn||ht===vr||ht===Ln||ht===ya||ht===Sa,St=jt.getClearColor(),Tt=jt.getClearAlpha(),Bt=St.r,Rt=St.g,Pt=St.b;mt?(m[0]=Bt,m[1]=Rt,m[2]=Pt,m[3]=Tt,U.clearBufferuiv(U.COLOR,0,m)):(g[0]=Bt,g[1]=Rt,g[2]=Pt,g[3]=Tt,U.clearBufferiv(U.COLOR,0,g))}else k|=U.COLOR_BUFFER_BIT}D&&(k|=U.DEPTH_BUFFER_BIT),B&&(k|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),U.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",it,!1),e.removeEventListener("webglcontextrestored",L,!1),e.removeEventListener("webglcontextcreationerror",rt,!1),dt.dispose(),Et.dispose(),Nt.dispose(),x.dispose(),F.dispose(),Q.dispose(),It.dispose(),Yt.dispose(),pt.dispose(),Ot.dispose(),Ot.removeEventListener("sessionstart",Se),Ot.removeEventListener("sessionend",te),_t&&(_t.dispose(),_t=null),Ee.stop()};function it(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),w=!0}function L(){console.log("THREE.WebGLRenderer: Context Restored."),w=!1;const E=ie.autoReset,D=Z.enabled,B=Z.autoUpdate,k=Z.needsUpdate,N=Z.type;re(),ie.autoReset=E,Z.enabled=D,Z.autoUpdate=B,Z.needsUpdate=k,Z.type=N}function rt(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function ot(E){const D=E.target;D.removeEventListener("dispose",ot),bt(D)}function bt(E){yt(E),Nt.remove(E)}function yt(E){const D=Nt.get(E).programs;D!==void 0&&(D.forEach(function(B){pt.releaseProgram(B)}),E.isShaderMaterial&&pt.releaseShaderCache(E))}this.renderBufferDirect=function(E,D,B,k,N,ht){D===null&&(D=wt);const mt=N.isMesh&&N.matrixWorld.determinant()<0,St=Qa(E,D,B,k,N);ft.setMaterial(k,mt);let Tt=B.index,Bt=1;if(k.wireframe===!0){if(Tt=K.getWireframeAttribute(B),Tt===void 0)return;Bt=2}const Rt=B.drawRange,Pt=B.attributes.position;let ce=Rt.start*Bt,Ie=(Rt.start+Rt.count)*Bt;ht!==null&&(ce=Math.max(ce,ht.start*Bt),Ie=Math.min(Ie,(ht.start+ht.count)*Bt)),Tt!==null?(ce=Math.max(ce,0),Ie=Math.min(Ie,Tt.count)):Pt!=null&&(ce=Math.max(ce,0),Ie=Math.min(Ie,Pt.count));const pe=Ie-ce;if(pe<0||pe===1/0)return;It.setup(N,k,St,B,Tt);let Ke,se=At;if(Tt!==null&&(Ke=J.get(Tt),se=vt,se.setIndex(Ke)),N.isMesh)k.wireframe===!0?(ft.setLineWidth(k.wireframeLinewidth*Xt()),se.setMode(U.LINES)):se.setMode(U.TRIANGLES);else if(N.isLine){let Gt=k.linewidth;Gt===void 0&&(Gt=1),ft.setLineWidth(Gt*Xt()),N.isLineSegments?se.setMode(U.LINES):N.isLineLoop?se.setMode(U.LINE_LOOP):se.setMode(U.LINE_STRIP)}else N.isPoints?se.setMode(U.POINTS):N.isSprite&&se.setMode(U.TRIANGLES);if(N.isBatchedMesh)se.renderMultiDraw(N._multiDrawStarts,N._multiDrawCounts,N._multiDrawCount);else if(N.isInstancedMesh)se.renderInstances(ce,pe,N.count);else if(B.isInstancedBufferGeometry){const Gt=B._maxInstanceCount!==void 0?B._maxInstanceCount:1/0,ys=Math.min(B.instanceCount,Gt);se.renderInstances(ce,pe,ys)}else se.render(ce,pe)};function Jt(E,D,B){E.transparent===!0&&E.side===Le&&E.forceSinglePass===!1?(E.side=Pe,E.needsUpdate=!0,Ii(E,D,B),E.side=Mn,E.needsUpdate=!0,Ii(E,D,B),E.side=Le):Ii(E,D,B)}this.compile=function(E,D,B=null){B===null&&(B=E),p=Et.get(B),p.init(),M.push(p),B.traverseVisible(function(N){N.isLight&&N.layers.test(D.layers)&&(p.pushLight(N),N.castShadow&&p.pushShadow(N))}),E!==B&&E.traverseVisible(function(N){N.isLight&&N.layers.test(D.layers)&&(p.pushLight(N),N.castShadow&&p.pushShadow(N))}),p.setupLights(v._useLegacyLights);const k=new Set;return E.traverse(function(N){const ht=N.material;if(ht)if(Array.isArray(ht))for(let mt=0;mt<ht.length;mt++){const St=ht[mt];Jt(St,B,N),k.add(St)}else Jt(ht,B,N),k.add(ht)}),M.pop(),p=null,k},this.compileAsync=function(E,D,B=null){const k=this.compile(E,D,B);return new Promise(N=>{function ht(){if(k.forEach(function(mt){Nt.get(mt).currentProgram.isReady()&&k.delete(mt)}),k.size===0){N(E);return}setTimeout(ht,10)}Mt.get("KHR_parallel_shader_compile")!==null?ht():setTimeout(ht,10)})};let Qt=null;function fe(E){Qt&&Qt(E)}function Se(){Ee.stop()}function te(){Ee.start()}const Ee=new za;Ee.setAnimationLoop(fe),typeof self<"u"&&Ee.setContext(self),this.setAnimationLoop=function(E){Qt=E,Ot.setAnimationLoop(E),E===null?Ee.stop():Ee.start()},Ot.addEventListener("sessionstart",Se),Ot.addEventListener("sessionend",te),this.render=function(E,D){if(D!==void 0&&D.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(w===!0)return;E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),Ot.enabled===!0&&Ot.isPresenting===!0&&(Ot.cameraAutoUpdate===!0&&Ot.updateCamera(D),D=Ot.getCamera()),E.isScene===!0&&E.onBeforeRender(v,E,D,A),p=Et.get(E,M.length),p.init(),M.push(p),gt.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),V.setFromProjectionMatrix(gt),lt=this.localClippingEnabled,j=Ft.init(this.clippingPlanes,lt),_=dt.get(E,f.length),_.init(),f.push(_),$e(E,D,0,v.sortObjects),_.finish(),v.sortObjects===!0&&_.sort(X,q),this.info.render.frame++,j===!0&&Ft.beginShadows();const B=p.state.shadowsArray;if(Z.render(B,E,D),j===!0&&Ft.endShadows(),this.info.autoReset===!0&&this.info.reset(),jt.render(_,E),p.setupLights(v._useLegacyLights),D.isArrayCamera){const k=D.cameras;for(let N=0,ht=k.length;N<ht;N++){const mt=k[N];Lr(_,E,mt,mt.viewport)}}else Lr(_,E,D);A!==null&&(T.updateMultisampleRenderTarget(A),T.updateRenderTargetMipmap(A)),E.isScene===!0&&E.onAfterRender(v,E,D),It.resetDefaultState(),I=-1,y=null,M.pop(),M.length>0?p=M[M.length-1]:p=null,f.pop(),f.length>0?_=f[f.length-1]:_=null};function $e(E,D,B,k){if(E.visible===!1)return;if(E.layers.test(D.layers)){if(E.isGroup)B=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(D);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||V.intersectsSprite(E)){k&&Dt.setFromMatrixPosition(E.matrixWorld).applyMatrix4(gt);const mt=Q.update(E),St=E.material;St.visible&&_.push(E,mt,St,B,Dt.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||V.intersectsObject(E))){const mt=Q.update(E),St=E.material;if(k&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Dt.copy(E.boundingSphere.center)):(mt.boundingSphere===null&&mt.computeBoundingSphere(),Dt.copy(mt.boundingSphere.center)),Dt.applyMatrix4(E.matrixWorld).applyMatrix4(gt)),Array.isArray(St)){const Tt=mt.groups;for(let Bt=0,Rt=Tt.length;Bt<Rt;Bt++){const Pt=Tt[Bt],ce=St[Pt.materialIndex];ce&&ce.visible&&_.push(E,mt,ce,B,Dt.z,Pt)}}else St.visible&&_.push(E,mt,St,B,Dt.z,null)}}const ht=E.children;for(let mt=0,St=ht.length;mt<St;mt++)$e(ht[mt],D,B,k)}function Lr(E,D,B,k){const N=E.opaque,ht=E.transmissive,mt=E.transparent;p.setupLightsView(B),j===!0&&Ft.setGlobalState(v.clippingPlanes,B),ht.length>0&&Ja(N,ht,D,B),k&&ft.viewport(b.copy(k)),N.length>0&&Di(N,D,B),ht.length>0&&Di(ht,D,B),mt.length>0&&Di(mt,D,B),ft.buffers.depth.setTest(!0),ft.buffers.depth.setMask(!0),ft.buffers.color.setMask(!0),ft.setPolygonOffset(!1)}function Ja(E,D,B,k){if((B.isScene===!0?B.overrideMaterial:null)!==null)return;const ht=Ct.isWebGL2;_t===null&&(_t=new Un(1,1,{generateMipmaps:!0,type:Mt.has("EXT_color_buffer_half_float")?Ai:xn,minFilter:Ti,samples:ht?4:0})),v.getDrawingBufferSize(Lt),ht?_t.setSize(Lt.x,Lt.y):_t.setSize(us(Lt.x),us(Lt.y));const mt=v.getRenderTarget();v.setRenderTarget(_t),v.getClearColor(tt),P=v.getClearAlpha(),P<1&&v.setClearColor(16777215,.5),v.clear();const St=v.toneMapping;v.toneMapping=vn,Di(E,B,k),T.updateMultisampleRenderTarget(_t),T.updateRenderTargetMipmap(_t);let Tt=!1;for(let Bt=0,Rt=D.length;Bt<Rt;Bt++){const Pt=D[Bt],ce=Pt.object,Ie=Pt.geometry,pe=Pt.material,Ke=Pt.group;if(pe.side===Le&&ce.layers.test(k.layers)){const se=pe.side;pe.side=Pe,pe.needsUpdate=!0,Pr(ce,B,k,Ie,pe,Ke),pe.side=se,pe.needsUpdate=!0,Tt=!0}}Tt===!0&&(T.updateMultisampleRenderTarget(_t),T.updateRenderTargetMipmap(_t)),v.setRenderTarget(mt),v.setClearColor(tt,P),v.toneMapping=St}function Di(E,D,B){const k=D.isScene===!0?D.overrideMaterial:null;for(let N=0,ht=E.length;N<ht;N++){const mt=E[N],St=mt.object,Tt=mt.geometry,Bt=k===null?mt.material:k,Rt=mt.group;St.layers.test(B.layers)&&Pr(St,D,B,Tt,Bt,Rt)}}function Pr(E,D,B,k,N,ht){E.onBeforeRender(v,D,B,k,N,ht),E.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),N.onBeforeRender(v,D,B,k,E,ht),N.transparent===!0&&N.side===Le&&N.forceSinglePass===!1?(N.side=Pe,N.needsUpdate=!0,v.renderBufferDirect(B,D,k,N,E,ht),N.side=Mn,N.needsUpdate=!0,v.renderBufferDirect(B,D,k,N,E,ht),N.side=Le):v.renderBufferDirect(B,D,k,N,E,ht),E.onAfterRender(v,D,B,k,N,ht)}function Ii(E,D,B){D.isScene!==!0&&(D=wt);const k=Nt.get(E),N=p.state.lights,ht=p.state.shadowsArray,mt=N.state.version,St=pt.getParameters(E,N.state,ht,D,B),Tt=pt.getProgramCacheKey(St);let Bt=k.programs;k.environment=E.isMeshStandardMaterial?D.environment:null,k.fog=D.fog,k.envMap=(E.isMeshStandardMaterial?F:x).get(E.envMap||k.environment),Bt===void 0&&(E.addEventListener("dispose",ot),Bt=new Map,k.programs=Bt);let Rt=Bt.get(Tt);if(Rt!==void 0){if(k.currentProgram===Rt&&k.lightsStateVersion===mt)return Ir(E,St),Rt}else St.uniforms=pt.getUniforms(E),E.onBuild(B,St,v),E.onBeforeCompile(St,v),Rt=pt.acquireProgram(St,Tt),Bt.set(Tt,Rt),k.uniforms=St.uniforms;const Pt=k.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Pt.clippingPlanes=Ft.uniform),Ir(E,St),k.needsLights=ec(E),k.lightsStateVersion=mt,k.needsLights&&(Pt.ambientLightColor.value=N.state.ambient,Pt.lightProbe.value=N.state.probe,Pt.directionalLights.value=N.state.directional,Pt.directionalLightShadows.value=N.state.directionalShadow,Pt.spotLights.value=N.state.spot,Pt.spotLightShadows.value=N.state.spotShadow,Pt.rectAreaLights.value=N.state.rectArea,Pt.ltc_1.value=N.state.rectAreaLTC1,Pt.ltc_2.value=N.state.rectAreaLTC2,Pt.pointLights.value=N.state.point,Pt.pointLightShadows.value=N.state.pointShadow,Pt.hemisphereLights.value=N.state.hemi,Pt.directionalShadowMap.value=N.state.directionalShadowMap,Pt.directionalShadowMatrix.value=N.state.directionalShadowMatrix,Pt.spotShadowMap.value=N.state.spotShadowMap,Pt.spotLightMatrix.value=N.state.spotLightMatrix,Pt.spotLightMap.value=N.state.spotLightMap,Pt.pointShadowMap.value=N.state.pointShadowMap,Pt.pointShadowMatrix.value=N.state.pointShadowMatrix),k.currentProgram=Rt,k.uniformsList=null,Rt}function Dr(E){if(E.uniformsList===null){const D=E.currentProgram.getUniforms();E.uniformsList=os.seqWithValue(D.seq,E.uniforms)}return E.uniformsList}function Ir(E,D){const B=Nt.get(E);B.outputColorSpace=D.outputColorSpace,B.batching=D.batching,B.instancing=D.instancing,B.instancingColor=D.instancingColor,B.skinning=D.skinning,B.morphTargets=D.morphTargets,B.morphNormals=D.morphNormals,B.morphColors=D.morphColors,B.morphTargetsCount=D.morphTargetsCount,B.numClippingPlanes=D.numClippingPlanes,B.numIntersection=D.numClipIntersection,B.vertexAlphas=D.vertexAlphas,B.vertexTangents=D.vertexTangents,B.toneMapping=D.toneMapping}function Qa(E,D,B,k,N){D.isScene!==!0&&(D=wt),T.resetTextureUnits();const ht=D.fog,mt=k.isMeshStandardMaterial?D.environment:null,St=A===null?v.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:cn,Tt=(k.isMeshStandardMaterial?F:x).get(k.envMap||mt),Bt=k.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,Rt=!!B.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Pt=!!B.morphAttributes.position,ce=!!B.morphAttributes.normal,Ie=!!B.morphAttributes.color;let pe=vn;k.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(pe=v.toneMapping);const Ke=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,se=Ke!==void 0?Ke.length:0,Gt=Nt.get(k),ys=p.state.lights;if(j===!0&&(lt===!0||E!==y)){const Fe=E===y&&k.id===I;Ft.setState(k,E,Fe)}let oe=!1;k.version===Gt.__version?(Gt.needsLights&&Gt.lightsStateVersion!==ys.state.version||Gt.outputColorSpace!==St||N.isBatchedMesh&&Gt.batching===!1||!N.isBatchedMesh&&Gt.batching===!0||N.isInstancedMesh&&Gt.instancing===!1||!N.isInstancedMesh&&Gt.instancing===!0||N.isSkinnedMesh&&Gt.skinning===!1||!N.isSkinnedMesh&&Gt.skinning===!0||N.isInstancedMesh&&Gt.instancingColor===!0&&N.instanceColor===null||N.isInstancedMesh&&Gt.instancingColor===!1&&N.instanceColor!==null||Gt.envMap!==Tt||k.fog===!0&&Gt.fog!==ht||Gt.numClippingPlanes!==void 0&&(Gt.numClippingPlanes!==Ft.numPlanes||Gt.numIntersection!==Ft.numIntersection)||Gt.vertexAlphas!==Bt||Gt.vertexTangents!==Rt||Gt.morphTargets!==Pt||Gt.morphNormals!==ce||Gt.morphColors!==Ie||Gt.toneMapping!==pe||Ct.isWebGL2===!0&&Gt.morphTargetsCount!==se)&&(oe=!0):(oe=!0,Gt.__version=k.version);let yn=Gt.currentProgram;oe===!0&&(yn=Ii(k,D,N));let Ur=!1,fi=!1,Ss=!1;const _e=yn.getUniforms(),Sn=Gt.uniforms;if(ft.useProgram(yn.program)&&(Ur=!0,fi=!0,Ss=!0),k.id!==I&&(I=k.id,fi=!0),Ur||y!==E){_e.setValue(U,"projectionMatrix",E.projectionMatrix),_e.setValue(U,"viewMatrix",E.matrixWorldInverse);const Fe=_e.map.cameraPosition;Fe!==void 0&&Fe.setValue(U,Dt.setFromMatrixPosition(E.matrixWorld)),Ct.logarithmicDepthBuffer&&_e.setValue(U,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&_e.setValue(U,"isOrthographic",E.isOrthographicCamera===!0),y!==E&&(y=E,fi=!0,Ss=!0)}if(N.isSkinnedMesh){_e.setOptional(U,N,"bindMatrix"),_e.setOptional(U,N,"bindMatrixInverse");const Fe=N.skeleton;Fe&&(Ct.floatVertexTextures?(Fe.boneTexture===null&&Fe.computeBoneTexture(),_e.setValue(U,"boneTexture",Fe.boneTexture,T)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}N.isBatchedMesh&&(_e.setOptional(U,N,"batchingTexture"),_e.setValue(U,"batchingTexture",N._matricesTexture,T));const Es=B.morphAttributes;if((Es.position!==void 0||Es.normal!==void 0||Es.color!==void 0&&Ct.isWebGL2===!0)&&Vt.update(N,B,yn),(fi||Gt.receiveShadow!==N.receiveShadow)&&(Gt.receiveShadow=N.receiveShadow,_e.setValue(U,"receiveShadow",N.receiveShadow)),k.isMeshGouraudMaterial&&k.envMap!==null&&(Sn.envMap.value=Tt,Sn.flipEnvMap.value=Tt.isCubeTexture&&Tt.isRenderTargetTexture===!1?-1:1),fi&&(_e.setValue(U,"toneMappingExposure",v.toneMappingExposure),Gt.needsLights&&tc(Sn,Ss),ht&&k.fog===!0&&at.refreshFogUniforms(Sn,ht),at.refreshMaterialUniforms(Sn,k,Y,W,_t),os.upload(U,Dr(Gt),Sn,T)),k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(os.upload(U,Dr(Gt),Sn,T),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&_e.setValue(U,"center",N.center),_e.setValue(U,"modelViewMatrix",N.modelViewMatrix),_e.setValue(U,"normalMatrix",N.normalMatrix),_e.setValue(U,"modelMatrix",N.matrixWorld),k.isShaderMaterial||k.isRawShaderMaterial){const Fe=k.uniformsGroups;for(let ws=0,nc=Fe.length;ws<nc;ws++)if(Ct.isWebGL2){const Nr=Fe[ws];Yt.update(Nr,yn),Yt.bind(Nr,yn)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return yn}function tc(E,D){E.ambientLightColor.needsUpdate=D,E.lightProbe.needsUpdate=D,E.directionalLights.needsUpdate=D,E.directionalLightShadows.needsUpdate=D,E.pointLights.needsUpdate=D,E.pointLightShadows.needsUpdate=D,E.spotLights.needsUpdate=D,E.spotLightShadows.needsUpdate=D,E.rectAreaLights.needsUpdate=D,E.hemisphereLights.needsUpdate=D}function ec(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return R},this.getActiveMipmapLevel=function(){return S},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(E,D,B){Nt.get(E.texture).__webglTexture=D,Nt.get(E.depthTexture).__webglTexture=B;const k=Nt.get(E);k.__hasExternalTextures=!0,k.__hasExternalTextures&&(k.__autoAllocateDepthBuffer=B===void 0,k.__autoAllocateDepthBuffer||Mt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),k.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(E,D){const B=Nt.get(E);B.__webglFramebuffer=D,B.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(E,D=0,B=0){A=E,R=D,S=B;let k=!0,N=null,ht=!1,mt=!1;if(E){const Tt=Nt.get(E);Tt.__useDefaultFramebuffer!==void 0?(ft.bindFramebuffer(U.FRAMEBUFFER,null),k=!1):Tt.__webglFramebuffer===void 0?T.setupRenderTarget(E):Tt.__hasExternalTextures&&T.rebindTextures(E,Nt.get(E.texture).__webglTexture,Nt.get(E.depthTexture).__webglTexture);const Bt=E.texture;(Bt.isData3DTexture||Bt.isDataArrayTexture||Bt.isCompressedArrayTexture)&&(mt=!0);const Rt=Nt.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Rt[D])?N=Rt[D][B]:N=Rt[D],ht=!0):Ct.isWebGL2&&E.samples>0&&T.useMultisampledRTT(E)===!1?N=Nt.get(E).__webglMultisampledFramebuffer:Array.isArray(Rt)?N=Rt[B]:N=Rt,b.copy(E.viewport),z.copy(E.scissor),H=E.scissorTest}else b.copy($).multiplyScalar(Y).floor(),z.copy(et).multiplyScalar(Y).floor(),H=nt;if(ft.bindFramebuffer(U.FRAMEBUFFER,N)&&Ct.drawBuffers&&k&&ft.drawBuffers(E,N),ft.viewport(b),ft.scissor(z),ft.setScissorTest(H),ht){const Tt=Nt.get(E.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+D,Tt.__webglTexture,B)}else if(mt){const Tt=Nt.get(E.texture),Bt=D||0;U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,Tt.__webglTexture,B||0,Bt)}I=-1},this.readRenderTargetPixels=function(E,D,B,k,N,ht,mt){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let St=Nt.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&mt!==void 0&&(St=St[mt]),St){ft.bindFramebuffer(U.FRAMEBUFFER,St);try{const Tt=E.texture,Bt=Tt.format,Rt=Tt.type;if(Bt!==qe&&ut.convert(Bt)!==U.getParameter(U.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const Pt=Rt===Ai&&(Mt.has("EXT_color_buffer_half_float")||Ct.isWebGL2&&Mt.has("EXT_color_buffer_float"));if(Rt!==xn&&ut.convert(Rt)!==U.getParameter(U.IMPLEMENTATION_COLOR_READ_TYPE)&&!(Rt===gn&&(Ct.isWebGL2||Mt.has("OES_texture_float")||Mt.has("WEBGL_color_buffer_float")))&&!Pt){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=E.width-k&&B>=0&&B<=E.height-N&&U.readPixels(D,B,k,N,ut.convert(Bt),ut.convert(Rt),ht)}finally{const Tt=A!==null?Nt.get(A).__webglFramebuffer:null;ft.bindFramebuffer(U.FRAMEBUFFER,Tt)}}},this.copyFramebufferToTexture=function(E,D,B=0){const k=Math.pow(2,-B),N=Math.floor(D.image.width*k),ht=Math.floor(D.image.height*k);T.setTexture2D(D,0),U.copyTexSubImage2D(U.TEXTURE_2D,B,0,0,E.x,E.y,N,ht),ft.unbindTexture()},this.copyTextureToTexture=function(E,D,B,k=0){const N=D.image.width,ht=D.image.height,mt=ut.convert(B.format),St=ut.convert(B.type);T.setTexture2D(B,0),U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,B.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,B.unpackAlignment),D.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,k,E.x,E.y,N,ht,mt,St,D.image.data):D.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,k,E.x,E.y,D.mipmaps[0].width,D.mipmaps[0].height,mt,D.mipmaps[0].data):U.texSubImage2D(U.TEXTURE_2D,k,E.x,E.y,mt,St,D.image),k===0&&B.generateMipmaps&&U.generateMipmap(U.TEXTURE_2D),ft.unbindTexture()},this.copyTextureToTexture3D=function(E,D,B,k,N=0){if(v.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const ht=E.max.x-E.min.x+1,mt=E.max.y-E.min.y+1,St=E.max.z-E.min.z+1,Tt=ut.convert(k.format),Bt=ut.convert(k.type);let Rt;if(k.isData3DTexture)T.setTexture3D(k,0),Rt=U.TEXTURE_3D;else if(k.isDataArrayTexture||k.isCompressedArrayTexture)T.setTexture2DArray(k,0),Rt=U.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,k.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,k.unpackAlignment);const Pt=U.getParameter(U.UNPACK_ROW_LENGTH),ce=U.getParameter(U.UNPACK_IMAGE_HEIGHT),Ie=U.getParameter(U.UNPACK_SKIP_PIXELS),pe=U.getParameter(U.UNPACK_SKIP_ROWS),Ke=U.getParameter(U.UNPACK_SKIP_IMAGES),se=B.isCompressedTexture?B.mipmaps[N]:B.image;U.pixelStorei(U.UNPACK_ROW_LENGTH,se.width),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,se.height),U.pixelStorei(U.UNPACK_SKIP_PIXELS,E.min.x),U.pixelStorei(U.UNPACK_SKIP_ROWS,E.min.y),U.pixelStorei(U.UNPACK_SKIP_IMAGES,E.min.z),B.isDataTexture||B.isData3DTexture?U.texSubImage3D(Rt,N,D.x,D.y,D.z,ht,mt,St,Tt,Bt,se.data):B.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),U.compressedTexSubImage3D(Rt,N,D.x,D.y,D.z,ht,mt,St,Tt,se.data)):U.texSubImage3D(Rt,N,D.x,D.y,D.z,ht,mt,St,Tt,Bt,se),U.pixelStorei(U.UNPACK_ROW_LENGTH,Pt),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,ce),U.pixelStorei(U.UNPACK_SKIP_PIXELS,Ie),U.pixelStorei(U.UNPACK_SKIP_ROWS,pe),U.pixelStorei(U.UNPACK_SKIP_IMAGES,Ke),N===0&&k.generateMipmaps&&U.generateMipmap(Rt),ft.unbindTexture()},this.initTexture=function(E){E.isCubeTexture?T.setTextureCube(E,0):E.isData3DTexture?T.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?T.setTexture2DArray(E,0):T.setTexture2D(E,0),ft.unbindTexture()},this.resetState=function(){R=0,S=0,A=null,ft.reset(),It.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return rn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=t===xr?"display-p3":"srgb",e.unpackColorSpace=Kt.workingColorSpace===_s?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===ge?Dn:Aa}set outputEncoding(t){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=t===Dn?ge:cn}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(t){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=t}}class yp extends Ya{}yp.prototype.isWebGL1Renderer=!0;class Tr{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new Ht(t),this.near=e,this.far=n}clone(){return new Tr(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Sp extends he{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e}}class Ep{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=hr,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.version=0,this.uuid=an()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}get updateRange(){return console.warn("THREE.InterleavedBuffer: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let i=0,r=this.stride;i<r;i++)this.array[t+i]=e.array[n+i];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=an()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){return t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=an()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const we=new C;class ps{constructor(t,e,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)we.fromBufferAttribute(this,e),we.applyMatrix4(t),this.setXYZ(e,we.x,we.y,we.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)we.fromBufferAttribute(this,e),we.applyNormalMatrix(t),this.setXYZ(e,we.x,we.y,we.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)we.fromBufferAttribute(this,e),we.transformDirection(t),this.setXYZ(e,we.x,we.y,we.z);return this}setX(t,e){return this.normalized&&(e=Zt(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=Zt(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=Zt(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=Zt(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=Ze(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=Ze(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=Ze(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=Ze(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=Zt(e,this.array),n=Zt(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,i){return t=t*this.data.stride+this.offset,this.normalized&&(e=Zt(e,this.array),n=Zt(n,this.array),i=Zt(i,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=Zt(e,this.array),n=Zt(n,this.array),i=Zt(i,this.array),r=Zt(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this.data.array[t+3]=r,this}clone(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[i+r])}return new Ye(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new ps(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class pr extends Fn{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ht(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}let Qn;const vi=new C,ti=new C,ei=new C,ni=new xt,xi=new xt,$a=new ae,ns=new C,Mi=new C,is=new C,na=new xt,tr=new xt,ia=new xt;class sa extends he{constructor(t=new pr){if(super(),this.isSprite=!0,this.type="Sprite",Qn===void 0){Qn=new Me;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Ep(e,5);Qn.setIndex([0,1,2,0,2,3]),Qn.setAttribute("position",new ps(n,3,0,!1)),Qn.setAttribute("uv",new ps(n,2,3,!1))}this.geometry=Qn,this.material=t,this.center=new xt(.5,.5)}raycast(t,e){t.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ti.setFromMatrixScale(this.matrixWorld),$a.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),ei.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ti.multiplyScalar(-ei.z);const n=this.material.rotation;let i,r;n!==0&&(r=Math.cos(n),i=Math.sin(n));const a=this.center;ss(ns.set(-.5,-.5,0),ei,a,ti,i,r),ss(Mi.set(.5,-.5,0),ei,a,ti,i,r),ss(is.set(.5,.5,0),ei,a,ti,i,r),na.set(0,0),tr.set(1,0),ia.set(1,1);let o=t.ray.intersectTriangle(ns,Mi,is,!1,vi);if(o===null&&(ss(Mi.set(-.5,.5,0),ei,a,ti,i,r),tr.set(0,1),o=t.ray.intersectTriangle(ns,is,Mi,!1,vi),o===null))return;const c=t.ray.origin.distanceTo(vi);c<t.near||c>t.far||e.push({distance:c,point:vi.clone(),uv:ze.getInterpolation(vi,ns,Mi,is,na,tr,ia,new xt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}}function ss(s,t,e,n,i,r){ni.subVectors(s,e).addScalar(.5).multiply(n),i!==void 0?(xi.x=r*ni.x-i*ni.y,xi.y=i*ni.x+r*ni.y):xi.copy(ni),s.copy(t),s.x+=xi.x,s.y+=xi.y,s.applyMatrix4($a)}class ja extends Fn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ht(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const ra=new C,oa=new C,aa=new ae,er=new yr,rs=new vs;class wp extends he{constructor(t=new Me,e=new ja){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[0];for(let i=1,r=e.count;i<r;i++)ra.fromBufferAttribute(e,i-1),oa.fromBufferAttribute(e,i),n[i]=n[i-1],n[i]+=ra.distanceTo(oa);t.setAttribute("lineDistance",new $t(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),rs.copy(n.boundingSphere),rs.applyMatrix4(i),rs.radius+=r,t.ray.intersectsSphere(rs)===!1)return;aa.copy(i).invert(),er.copy(t.ray).applyMatrix4(aa);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=new C,h=new C,d=new C,u=new C,m=this.isLineSegments?2:1,g=n.index,p=n.attributes.position;if(g!==null){const f=Math.max(0,a.start),M=Math.min(g.count,a.start+a.count);for(let v=f,w=M-1;v<w;v+=m){const R=g.getX(v),S=g.getX(v+1);if(l.fromBufferAttribute(p,R),h.fromBufferAttribute(p,S),er.distanceSqToSegment(l,h,u,d)>c)continue;u.applyMatrix4(this.matrixWorld);const I=t.ray.origin.distanceTo(u);I<t.near||I>t.far||e.push({distance:I,point:d.clone().applyMatrix4(this.matrixWorld),index:v,face:null,faceIndex:null,object:this})}}else{const f=Math.max(0,a.start),M=Math.min(p.count,a.start+a.count);for(let v=f,w=M-1;v<w;v+=m){if(l.fromBufferAttribute(p,v),h.fromBufferAttribute(p,v+1),er.distanceSqToSegment(l,h,u,d)>c)continue;u.applyMatrix4(this.matrixWorld);const S=t.ray.origin.distanceTo(u);S<t.near||S>t.far||e.push({distance:S,point:d.clone().applyMatrix4(this.matrixWorld),index:v,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const o=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}const ca=new C,la=new C;class bp extends wp{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[];for(let i=0,r=e.count;i<r;i+=2)ca.fromBufferAttribute(e,i),la.fromBufferAttribute(e,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+ca.distanceTo(la);t.setAttribute("lineDistance",new $t(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class mr extends De{constructor(t,e,n,i,r,a,o,c,l){super(t,e,n,i,r,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class ms extends Me{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const r=[],a=[],o=[],c=[],l=new C,h=new xt;a.push(0,0,0),o.push(0,0,1),c.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const m=n+d/e*i;l.x=t*Math.cos(m),l.y=t*Math.sin(m),a.push(l.x,l.y,l.z),o.push(0,0,1),h.x=(a[u]/t+1)/2,h.y=(a[u+1]/t+1)/2,c.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new $t(a,3)),this.setAttribute("normal",new $t(o,3)),this.setAttribute("uv",new $t(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ms(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class qt extends Me{constructor(t=1,e=1,n=1,i=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};const l=this;i=Math.floor(i),r=Math.floor(r);const h=[],d=[],u=[],m=[];let g=0;const _=[],p=n/2;let f=0;M(),a===!1&&(t>0&&v(!0),e>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new $t(d,3)),this.setAttribute("normal",new $t(u,3)),this.setAttribute("uv",new $t(m,2));function M(){const w=new C,R=new C;let S=0;const A=(e-t)/n;for(let I=0;I<=r;I++){const y=[],b=I/r,z=b*(e-t)+t;for(let H=0;H<=i;H++){const tt=H/i,P=tt*c+o,O=Math.sin(P),W=Math.cos(P);R.x=z*O,R.y=-b*n+p,R.z=z*W,d.push(R.x,R.y,R.z),w.set(O,A,W).normalize(),u.push(w.x,w.y,w.z),m.push(tt,1-b),y.push(g++)}_.push(y)}for(let I=0;I<i;I++)for(let y=0;y<r;y++){const b=_[y][I],z=_[y+1][I],H=_[y+1][I+1],tt=_[y][I+1];h.push(b,z,tt),h.push(z,H,tt),S+=6}l.addGroup(f,S,0),f+=S}function v(w){const R=g,S=new xt,A=new C;let I=0;const y=w===!0?t:e,b=w===!0?1:-1;for(let H=1;H<=i;H++)d.push(0,p*b,0),u.push(0,b,0),m.push(.5,.5),g++;const z=g;for(let H=0;H<=i;H++){const P=H/i*c+o,O=Math.cos(P),W=Math.sin(P);A.x=y*W,A.y=p*b,A.z=y*O,d.push(A.x,A.y,A.z),u.push(0,b,0),S.x=O*.5+.5,S.y=W*.5*b+.5,m.push(S.x,S.y),g++}for(let H=0;H<i;H++){const tt=R+H,P=z+H;w===!0?h.push(P,P+1,tt):h.push(P+1,P,tt),I+=3}l.addGroup(f,I,w===!0?1:2),f+=I}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new qt(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Oe extends qt{constructor(t=1,e=1,n=32,i=1,r=!1,a=0,o=Math.PI*2){super(0,t,e,n,i,r,a,o),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:r,thetaStart:a,thetaLength:o}}static fromJSON(t){return new Oe(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ar extends Me{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const r=[],a=[];o(i),l(n),h(),this.setAttribute("position",new $t(r,3)),this.setAttribute("normal",new $t(r.slice(),3)),this.setAttribute("uv",new $t(a,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function o(M){const v=new C,w=new C,R=new C;for(let S=0;S<e.length;S+=3)m(e[S+0],v),m(e[S+1],w),m(e[S+2],R),c(v,w,R,M)}function c(M,v,w,R){const S=R+1,A=[];for(let I=0;I<=S;I++){A[I]=[];const y=M.clone().lerp(w,I/S),b=v.clone().lerp(w,I/S),z=S-I;for(let H=0;H<=z;H++)H===0&&I===S?A[I][H]=y:A[I][H]=y.clone().lerp(b,H/z)}for(let I=0;I<S;I++)for(let y=0;y<2*(S-I)-1;y++){const b=Math.floor(y/2);y%2===0?(u(A[I][b+1]),u(A[I+1][b]),u(A[I][b])):(u(A[I][b+1]),u(A[I+1][b+1]),u(A[I+1][b]))}}function l(M){const v=new C;for(let w=0;w<r.length;w+=3)v.x=r[w+0],v.y=r[w+1],v.z=r[w+2],v.normalize().multiplyScalar(M),r[w+0]=v.x,r[w+1]=v.y,r[w+2]=v.z}function h(){const M=new C;for(let v=0;v<r.length;v+=3){M.x=r[v+0],M.y=r[v+1],M.z=r[v+2];const w=p(M)/2/Math.PI+.5,R=f(M)/Math.PI+.5;a.push(w,1-R)}g(),d()}function d(){for(let M=0;M<a.length;M+=6){const v=a[M+0],w=a[M+2],R=a[M+4],S=Math.max(v,w,R),A=Math.min(v,w,R);S>.9&&A<.1&&(v<.2&&(a[M+0]+=1),w<.2&&(a[M+2]+=1),R<.2&&(a[M+4]+=1))}}function u(M){r.push(M.x,M.y,M.z)}function m(M,v){const w=M*3;v.x=t[w+0],v.y=t[w+1],v.z=t[w+2]}function g(){const M=new C,v=new C,w=new C,R=new C,S=new xt,A=new xt,I=new xt;for(let y=0,b=0;y<r.length;y+=9,b+=6){M.set(r[y+0],r[y+1],r[y+2]),v.set(r[y+3],r[y+4],r[y+5]),w.set(r[y+6],r[y+7],r[y+8]),S.set(a[b+0],a[b+1]),A.set(a[b+2],a[b+3]),I.set(a[b+4],a[b+5]),R.copy(M).add(v).add(w).divideScalar(3);const z=p(R);_(S,b+0,M,z),_(A,b+2,v,z),_(I,b+4,w,z)}}function _(M,v,w,R){R<0&&M.x===1&&(a[v]=M.x-1),w.x===0&&w.z===0&&(a[v]=R/2/Math.PI+.5)}function p(M){return Math.atan2(M.z,-M.x)}function f(M){return Math.atan2(-M.y,Math.sqrt(M.x*M.x+M.z*M.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ar(t.vertices,t.indices,t.radius,t.details)}}class Cr extends Ar{constructor(t=1,e=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],i=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,i,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Cr(t.radius,t.detail)}}class Pi extends Me{constructor(t=.5,e=1,n=32,i=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:i,thetaStart:r,thetaLength:a},n=Math.max(3,n),i=Math.max(1,i);const o=[],c=[],l=[],h=[];let d=t;const u=(e-t)/i,m=new C,g=new xt;for(let _=0;_<=i;_++){for(let p=0;p<=n;p++){const f=r+p/n*a;m.x=d*Math.cos(f),m.y=d*Math.sin(f),c.push(m.x,m.y,m.z),l.push(0,0,1),g.x=(m.x/e+1)/2,g.y=(m.y/e+1)/2,h.push(g.x,g.y)}d+=u}for(let _=0;_<i;_++){const p=_*(n+1);for(let f=0;f<n;f++){const M=f+p,v=M,w=M+n+1,R=M+n+2,S=M+1;o.push(v,w,S),o.push(w,R,S)}}this.setIndex(o),this.setAttribute("position",new $t(c,3)),this.setAttribute("normal",new $t(l,3)),this.setAttribute("uv",new $t(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Pi(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}}class In extends Me{constructor(t=1,e=32,n=16,i=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const c=Math.min(a+o,Math.PI);let l=0;const h=[],d=new C,u=new C,m=[],g=[],_=[],p=[];for(let f=0;f<=n;f++){const M=[],v=f/n;let w=0;f===0&&a===0?w=.5/e:f===n&&c===Math.PI&&(w=-.5/e);for(let R=0;R<=e;R++){const S=R/e;d.x=-t*Math.cos(i+S*r)*Math.sin(a+v*o),d.y=t*Math.cos(a+v*o),d.z=t*Math.sin(i+S*r)*Math.sin(a+v*o),g.push(d.x,d.y,d.z),u.copy(d).normalize(),_.push(u.x,u.y,u.z),p.push(S+w,1-v),M.push(l++)}h.push(M)}for(let f=0;f<n;f++)for(let M=0;M<e;M++){const v=h[f][M+1],w=h[f][M],R=h[f+1][M],S=h[f+1][M+1];(f!==0||a>0)&&m.push(v,w,S),(f!==n-1||c<Math.PI)&&m.push(w,R,S)}this.setIndex(m),this.setAttribute("position",new $t(g,3)),this.setAttribute("normal",new $t(_,3)),this.setAttribute("uv",new $t(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new In(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class bi extends Me{constructor(t=1,e=.4,n=12,i=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:r},n=Math.floor(n),i=Math.floor(i);const a=[],o=[],c=[],l=[],h=new C,d=new C,u=new C;for(let m=0;m<=n;m++)for(let g=0;g<=i;g++){const _=g/i*r,p=m/n*Math.PI*2;d.x=(t+e*Math.cos(p))*Math.cos(_),d.y=(t+e*Math.cos(p))*Math.sin(_),d.z=e*Math.sin(p),o.push(d.x,d.y,d.z),h.x=t*Math.cos(_),h.y=t*Math.sin(_),u.subVectors(d,h).normalize(),c.push(u.x,u.y,u.z),l.push(g/i),l.push(m/n)}for(let m=1;m<=n;m++)for(let g=1;g<=i;g++){const _=(i+1)*m+g-1,p=(i+1)*(m-1)+g-1,f=(i+1)*(m-1)+g,M=(i+1)*m+g;a.push(_,p,M),a.push(p,f,M)}this.setIndex(a),this.setAttribute("position",new $t(o,3)),this.setAttribute("normal",new $t(c,3)),this.setAttribute("uv",new $t(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new bi(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class zt extends Fn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ht(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ht(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ca,this.normalScale=new xt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Rr extends he{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ht(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),e}}class Tp extends Rr{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(he.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ht(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const nr=new ae,ha=new C,da=new C;class Za{constructor(t){this.camera=t,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new xt(512,512),this.map=null,this.mapPass=null,this.matrix=new ae,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Er,this._frameExtents=new xt(1,1),this._viewportCount=1,this._viewports=[new ne(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;ha.setFromMatrixPosition(t.matrixWorld),e.position.copy(ha),da.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(da),e.updateMatrixWorld(),nr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(nr),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(nr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const ua=new ae,yi=new C,ir=new C;class Ap extends Za{constructor(){super(new Re(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new xt(4,2),this._viewportCount=6,this._viewports=[new ne(2,1,1,1),new ne(0,1,1,1),new ne(3,1,1,1),new ne(1,1,1,1),new ne(3,0,1,1),new ne(1,0,1,1)],this._cubeDirections=[new C(1,0,0),new C(-1,0,0),new C(0,0,1),new C(0,0,-1),new C(0,1,0),new C(0,-1,0)],this._cubeUps=[new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,0,1),new C(0,0,-1)]}updateMatrices(t,e=0){const n=this.camera,i=this.matrix,r=t.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),yi.setFromMatrixPosition(t.matrixWorld),n.position.copy(yi),ir.copy(n.position),ir.add(this._cubeDirections[e]),n.up.copy(this._cubeUps[e]),n.lookAt(ir),n.updateMatrixWorld(),i.makeTranslation(-yi.x,-yi.y,-yi.z),ua.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ua)}}class Cp extends Rr{constructor(t,e,n=0,i=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Ap}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}}class Rp extends Za{constructor(){super(new wr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Lp extends Rr{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(he.DEFAULT_UP),this.updateMatrix(),this.target=new he,this.shadow=new Rp}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class Pp{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=fa(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=fa();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}function fa(){return(typeof performance>"u"?Date:performance).now()}class Ka{constructor(t,e,n=0,i=1/0){this.ray=new yr(t,e),this.near=n,this.far=i,this.camera=null,this.layers=new Sr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}intersectObject(t,e=!0,n=[]){return gr(t,this,n,e),n.sort(pa),n}intersectObjects(t,e=!0,n=[]){for(let i=0,r=t.length;i<r;i++)gr(t[i],this,n,e);return n.sort(pa),n}}function pa(s,t){return s.distance-t.distance}function gr(s,t,e,n){if(s.layers.test(t.layers)&&s.raycast(t,e),n===!0){const i=s.children;for(let r=0,a=i.length;r<a;r++)gr(i[r],t,e,!0)}}class Dp extends bp{constructor(t=10,e=10,n=4473924,i=8947848){n=new Ht(n),i=new Ht(i);const r=e/2,a=t/e,o=t/2,c=[],l=[];for(let u=0,m=0,g=-o;u<=e;u++,g+=a){c.push(-o,0,g,o,0,g),c.push(g,0,-o,g,0,o);const _=u===r?n:i;_.toArray(l,m),m+=3,_.toArray(l,m),m+=3,_.toArray(l,m),m+=3,_.toArray(l,m),m+=3}const h=new Me;h.setAttribute("position",new $t(c,3)),h.setAttribute("color",new $t(l,3));const d=new ja({vertexColors:!0,toneMapped:!1});super(h,d),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:_r}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=_r);class Ip{constructor(t){this.container=t,this.scene=new Sp,this.scene.background=new Ht(3693694),this.scene.fog=null,this.renderer=new Ya({antialias:!0,powerPreference:"high-performance"}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=ga,this.renderer.toneMapping=va,this.renderer.toneMappingExposure=1.15,this.container.appendChild(this.renderer.domElement),this._initCameras(),this._initLights(),this._initGround(),window.addEventListener("resize",this.onWindowResize.bind(this))}_initCameras(){const t=window.innerWidth/window.innerHeight;this.builderZoom=68,this.builderTarget=new C(0,0,0),this.builderCamera=new wr(-this.builderZoom*t,this.builderZoom*t,this.builderZoom,-this.builderZoom,1,1200),this.builderCamera.position.set(90,105,90),this.builderCamera.lookAt(this.builderTarget),this.combatCamera=new Re(65,t,.5,600),this.combatCamera.position.set(0,15,-25),this.combatCamera.lookAt(0,2,0),this.reconCamera=new Re(54,t,1,800),this.reconCamera.position.set(0,155,85),this.reconCamera.lookAt(0,0,0),this.activeCamera=this.builderCamera,this.swoopTween=null,this._initBuilderCameraControls()}panBy(t,e){if(this.activeCamera!==this.builderCamera)return;const n=2*this.builderZoom/window.innerHeight,i=t*n,r=e*n,a=-i*.707-r*.707*1.3,o=i*.707-r*.707*1.3;this.builderTarget.x+=a,this.builderTarget.z+=o,this.builderTarget.x=Math.max(-85,Math.min(85,this.builderTarget.x)),this.builderTarget.z=Math.max(-85,Math.min(85,this.builderTarget.z)),this.builderCamera.position.set(this.builderTarget.x+70,80,this.builderTarget.z+70),this.builderCamera.lookAt(this.builderTarget)}setZoom(t){this.builderZoom=Math.max(15,Math.min(100,t));const e=window.innerWidth/window.innerHeight;this.builderCamera.left=-this.builderZoom*e,this.builderCamera.right=this.builderZoom*e,this.builderCamera.top=this.builderZoom,this.builderCamera.bottom=-this.builderZoom,this.builderCamera.updateProjectionMatrix()}_initBuilderCameraControls(){this.isPanning=!1,this.panStart={x:0,y:0},window.addEventListener("contextmenu",n=>{this.activeCamera===this.builderCamera&&n.preventDefault()}),window.addEventListener("pointerdown",n=>{this.activeCamera===this.builderCamera&&(n.button===2||n.button===1)&&(this.isPanning=!0,this.panStart={x:n.clientX,y:n.clientY})}),window.addEventListener("pointermove",n=>{if(!this.isPanning||this.activeCamera!==this.builderCamera)return;const i=n.clientX-this.panStart.x,r=n.clientY-this.panStart.y;this.panStart={x:n.clientX,y:n.clientY},this.panBy(i,r)}),window.addEventListener("pointerup",n=>{(n.button===2||n.button===1)&&(this.isPanning=!1)}),window.addEventListener("wheel",n=>{if(this.activeCamera===this.builderCamera){n.preventDefault();const i=n.ctrlKey?3:5,r=Math.sign(n.deltaY)*i;this.setZoom(this.builderZoom+r)}},{passive:!1});let t=0,e=this.builderZoom;window.addEventListener("touchstart",n=>{if(this.activeCamera===this.builderCamera&&n.touches.length===2){n.preventDefault();const i=n.touches[0].clientX-n.touches[1].clientX,r=n.touches[0].clientY-n.touches[1].clientY;t=Math.hypot(i,r),e=this.builderZoom}},{passive:!1}),window.addEventListener("touchmove",n=>{if(this.activeCamera===this.builderCamera&&n.touches.length===2&&t>0){n.preventDefault();const i=n.touches[0].clientX-n.touches[1].clientX,r=n.touches[0].clientY-n.touches[1].clientY,a=Math.hypot(i,r);if(a>5){const o=t/a;this.setZoom(e*o)}}},{passive:!1}),window.addEventListener("touchend",n=>{n.touches.length<2&&(t=0)}),window.addEventListener("keydown",n=>{if(this.activeCamera!==this.builderCamera)return;if(n.ctrlKey&&["+","=","-","_","0"].includes(n.key)){n.preventDefault(),["+","="].includes(n.key)?this.setZoom(this.builderZoom-6):["-","_"].includes(n.key)?this.setZoom(this.builderZoom+6):n.key==="0"&&this.setZoom(48);return}const i=22;n.key==="ArrowLeft"?this.panBy(i,0):n.key==="ArrowRight"?this.panBy(-i,0):n.key==="ArrowUp"?this.panBy(0,i):n.key==="ArrowDown"&&this.panBy(0,-i)})}_initLights(){this.hemiLight=new Tp(15069951,3032626,.95),this.hemiLight.position.set(0,60,0),this.scene.add(this.hemiLight),this.sunLight=new Lp(16775914,1.75),this.sunLight.position.set(80,130,60),this.sunLight.castShadow=!0,this.sunLight.shadow.mapSize.width=2048,this.sunLight.shadow.mapSize.height=2048,this.sunLight.shadow.camera.near=10,this.sunLight.shadow.camera.far=300;const t=80;this.sunLight.shadow.camera.left=-t,this.sunLight.shadow.camera.right=t,this.sunLight.shadow.camera.top=t,this.sunLight.shadow.camera.bottom=-t,this.sunLight.shadow.bias=-5e-4,this.scene.add(this.sunLight),this.alarmLight=new Cp(16711680,0,120),this.alarmLight.position.set(0,25,0),this.scene.add(this.alarmLight)}_initGround(){const e=new on(340,340),n=new zt({color:4026420,roughness:.88,metalness:.02});this.ground=new G(e,n),this.ground.rotation.x=-Math.PI/2,this.ground.position.y=0,this.ground.receiveShadow=!0,this.scene.add(this.ground),this.gridHelper=new Dp(165,30,58879,2374447),this.gridHelper.position.y=.02,this.gridHelper.visible=!1,this.scene.add(this.gridHelper);const i=new Pi(82,83.2,64),r=new Ce({color:58879,side:Le,transparent:!0,opacity:.4});this.cityBorderRing=new G(i,r),this.cityBorderRing.rotation.x=-Math.PI/2,this.cityBorderRing.position.y=.03,this.cityBorderRing.visible=!1,this.scene.add(this.cityBorderRing),this._initPerimeter(82.5)}_initPerimeter(t){this.perimeterGroup=new Wt,this.perimeterGroup.name="city_perimeter";const e=new zt({color:3622735,roughness:.7}),n=3.5,i=36,r=Math.PI*2/i,a=Math.PI*2*t/i*1.05;for(let o=0;o<i;o++){const c=o*r,l=Math.abs(c-3*Math.PI/2)<.22,h=Math.abs(c-0)<.22||Math.abs(c-Math.PI*2)<.22,d=Math.abs(c-Math.PI/2)<.22;if(l||h||d)continue;const u=Math.cos(c)*t,m=Math.sin(c)*t,g=new G(new ct(a,n,1.2),e);g.position.set(u,n/2,m),g.rotation.y=-c+Math.PI/2,g.castShadow=!0,g.receiveShadow=!0,this.perimeterGroup.add(g)}this.scene.add(this.perimeterGroup)}setAlarmLighting(t,e=0){if(!t){this.alarmLight.intensity=0;return}const n=Math.sin(e*10);this.alarmLight.color.setHex(n>0?16711748:26367),this.alarmLight.intensity=2.5+Math.abs(n)*3}setCameraMode(t){t==="builder"?(this.activeCamera=this.builderCamera,this.scene.fog=null,this.scene.background.setHex(3693694)):t==="recon"?(this.activeCamera=this.reconCamera,this.scene.fog=null,this.scene.background.setHex(1713716),this.setDesignGridVisible(!1)):t==="combat"&&(this.activeCamera=this.combatCamera,this.scene.fog=new Tr(1713716,160,340),this.scene.background.setHex(1713716),this.setDesignGridVisible(!1))}setDesignGridVisible(t){this.gridHelper&&(this.gridHelper.visible=t),this.cityBorderRing&&(this.cityBorderRing.visible=t)}onWindowResize(){const t=window.innerWidth,e=window.innerHeight,n=t/e,i=50;this.builderCamera.left=-i*n,this.builderCamera.right=i*n,this.builderCamera.top=i,this.builderCamera.bottom=-i,this.builderCamera.updateProjectionMatrix(),this.combatCamera.aspect=n,this.combatCamera.updateProjectionMatrix(),this.reconCamera.aspect=n,this.reconCamera.updateProjectionMatrix(),this.renderer.setSize(t,e)}startCameraSwoop(t,e,n,i,r=1.5,a=null){this.swoopTween={startPos:t.clone(),startLook:e.clone(),endPos:n.clone(),endLook:i.clone(),duration:r,elapsed:0,onComplete:a},this.combatCamera.position.copy(t),this.combatCamera.lookAt(e),this.activeCamera=this.combatCamera,this.gridHelper.visible=!1}update(t){if(this.swoopTween){const e=this.swoopTween;e.elapsed+=t;const n=Math.min(1,e.elapsed/e.duration),i=n<.5?4*n*n*n:1-Math.pow(-2*n+2,3)/2,r=new C().lerpVectors(e.startPos,e.endPos,i);r.y+=Math.sin(n*Math.PI)*12;const a=new C().lerpVectors(e.startLook,e.endLook,i);if(this.combatCamera.position.copy(r),this.combatCamera.lookAt(a),n>=1){const o=e.onComplete;this.swoopTween=null,o&&o()}}}render(){this.renderer.render(this.scene,this.activeCamera)}}class Up{constructor(){this._initSharedMaterials()}_initSharedMaterials(){this.materials={woodDark:new zt({color:6045747,roughness:.85}),woodLight:new zt({color:10254923,roughness:.8}),logRoof:new zt({color:8011293,roughness:.75}),stone:new zt({color:7896194,roughness:.9}),leaves:new zt({color:3046706,roughness:.7}),leavesLight:new zt({color:5025616,roughness:.65}),brickRed:new zt({color:10369067,roughness:.8}),concrete:new zt({color:10395294,roughness:.85}),ironDark:new zt({color:2503224,metalness:.7,roughness:.4}),steel:new zt({color:7901340,metalness:.8,roughness:.3}),moltenIron:new zt({color:16733986,emissive:16727296,emissiveIntensity:.8}),cyberBlue:new zt({color:48340,emissive:33679,emissiveIntensity:.6}),neonCyan:new zt({color:58879,emissive:58879,emissiveIntensity:.9}),neonYellow:new zt({color:16771899,emissive:16498733,emissiveIntensity:.8}),neonRed:new zt({color:16007990,emissive:13840175,emissiveIntensity:.85}),gold:new zt({color:16766720,metalness:.9,roughness:.2}),policeBlue:new zt({color:870305,roughness:.5}),policeWhite:new zt({color:16119285,roughness:.4}),policeBlack:new zt({color:1710618,roughness:.5}),sirenRed:new zt({color:16717636,emissive:16717636,emissiveIntensity:1}),sirenBlue:new zt({color:2718207,emissive:2718207,emissiveIntensity:1}),tireRubber:new zt({color:1579032,roughness:.9}),carPaintRed:new zt({color:13840175,metalness:.5,roughness:.3}),carGlass:new zt({color:1122867,roughness:.1,transparent:!0,opacity:.85}),headlight:new zt({color:16775620,emissive:16774557,emissiveIntensity:.9}),taillight:new zt({color:16717636,emissive:13959168,emissiveIntensity:.8}),hazardStripe:new zt({color:16761095,roughness:.5}),gasRed:new zt({color:13959168,roughness:.4}),asphalt:new zt({color:2829616,roughness:.92}),dirtRoad:new zt({color:7162945,roughness:.95}),roadLine:new zt({color:16771899,roughness:.6}),sidewalk:new zt({color:11583173,roughness:.85})}}createTownHall(t=1){const e=new Wt;if(e.name=`townhall_lvl${t}`,t===1){const n=new G(new ct(4.2,2.2,3.8),this.materials.woodDark);n.position.y=1.1,n.castShadow=!0,n.receiveShadow=!0,e.add(n);const i=new Oe(3.6,2,4);i.rotateY(Math.PI/4);const r=new G(i,this.materials.logRoof);r.position.y=3.2,r.scale.set(1.1,1,.95),r.castShadow=!0,e.add(r);const a=new G(new ct(.7,3.2,.7),this.materials.stone);a.position.set(1.4,2.5,.9),a.castShadow=!0,e.add(a);const o=new G(new ct(2.4,.2,1.2),this.materials.woodLight);o.position.set(0,.1,2.4),e.add(o)}else if(t===2){const n=new G(new ct(4.8,3.2,4.2),this.materials.brickRed);n.position.y=1.6,n.castShadow=!0,n.receiveShadow=!0,e.add(n);const i=new G(new ct(2,3.2,2),this.materials.concrete);i.position.set(0,4.6,0),i.castShadow=!0,e.add(i);const r=new G(new qt(.6,.6,.1,16),this.materials.policeWhite);r.rotation.x=Math.PI/2,r.position.set(0,5.2,1.05),e.add(r);const a=new G(new Oe(1.8,1.8,4),this.materials.ironDark);a.position.y=7.1,a.rotation.y=Math.PI/4,e.add(a)}else{const n=new G(new ct(5,6.5,4.5),this.materials.ironDark);n.position.y=3.25,n.castShadow=!0,e.add(n);const i=new G(new ct(3.8,4,3.8),this.materials.cyberBlue);i.position.y=7.5,e.add(i);const r=new G(new qt(2.2,2.2,.3,16),this.materials.concrete);r.position.y=9.6,e.add(r);const a=new G(new ct(1.4,.05,.3),this.materials.neonYellow);a.position.y=9.8,e.add(a);const o=new G(new qt(.08,.25,4,8),this.materials.steel);o.position.set(1.5,11.5,-1.5),e.add(o);const c=new G(new In(.35,8,8),this.materials.neonCyan);c.position.set(1.5,13.5,-1.5),e.add(c)}return e}createLumberMill(t=1){const e=new Wt;e.name=`lumbermill_lvl${t}`;const n=new G(new ct(3.6,2,3.2),this.materials.woodDark);n.position.y=1,n.castShadow=!0,e.add(n);const i=new G(new Oe(2.8,1.4,4),this.materials.logRoof);i.position.y=2.7,i.rotation.y=Math.PI/4,e.add(i);for(let a=0;a<3;a++){const o=new G(new qt(.3,.3,2.5,8),this.materials.woodLight);o.rotation.z=Math.PI/2,o.position.set(0,.3+a*.35,2.2),e.add(o)}const r=new G(new qt(.8,.8,.05,16),this.materials.steel);return r.rotation.x=Math.PI/2,r.position.set(-1.9,.8,.5),e.add(r),e.userData.animator=a=>{r.rotation.z+=a*15},e}createIronFoundry(t=1){const e=new Wt;e.name=`ironfoundry_lvl${t}`;const n=new G(new ct(4,2.4,3.6),this.materials.ironDark);n.position.y=1.2,n.castShadow=!0,e.add(n);for(let a of[-1.1,1.1]){const o=new G(new qt(.45,.55,3.6,12),this.materials.stone);o.position.set(a,3.6,-.6),o.castShadow=!0,e.add(o)}const i=new G(new qt(1.1,.9,.8,12),this.materials.steel);i.position.set(0,.4,1.6),e.add(i);const r=new G(new qt(.9,.9,.2,12),this.materials.moltenIron);return r.position.set(0,.8,1.6),e.add(r),e}createCashMint(t=1){const e=new Wt;e.name=`cashmint_lvl${t}`;const n=new G(new ct(4.2,2.8,3.8),this.materials.concrete);n.position.y=1.4,n.castShadow=!0,e.add(n);for(let a of[-1.6,-.5,.5,1.6]){const o=new G(new qt(.2,.2,2.6,8),this.materials.gold);o.position.set(a,1.4,2),e.add(o)}const i=new G(new qt(.9,.9,.2,16),this.materials.steel);i.rotation.x=Math.PI/2,i.position.set(0,1.2,1.95),e.add(i);const r=new G(new bi(.6,.15,8,16),this.materials.gold);return r.position.set(0,3.6,0),e.add(r),e}createBuilderHut(t=1){const e=new Wt;e.name=`builderhut_lvl${t}`;const n=new G(new ct(3.2,2,2.8),this.materials.woodLight);n.position.y=1,n.castShadow=!0,e.add(n);const i=new G(new Oe(2.4,1.4,4),this.materials.logRoof);i.position.y=2.6,i.rotation.y=Math.PI/4,e.add(i);const r=new G(new ct(1.6,.7,.7),this.materials.woodDark);r.position.set(0,.35,1.8),e.add(r);const a=new G(new ct(.5,.3,.3),this.materials.steel);a.position.set(.3,.85,1.8),e.add(a);const o=new Wt;o.position.set(-.5,0,1.8);const c=new G(new ct(.35,.45,.25),this.materials.policeBlue);c.position.y=.45,o.add(c);const l=new G(new In(.16,8,8),this.materials.woodLight);l.position.y=.8,o.add(l);const h=new G(new In(.2,8,8),this.materials.neonYellow);h.position.y=.88,o.add(h);const d=new Wt;d.position.set(.2,.55,0);const u=new G(new ct(.1,.3,.1),this.materials.woodLight);u.position.y=-.1,d.add(u);const m=new G(new ct(.2,.1,.1),this.materials.steel);return m.position.set(0,-.25,.08),d.add(m),o.add(d),e.add(o),e.userData.animator=(g,_)=>{d.rotation.x=Math.sin(_*8)*.7-.3},e}createPetrolPump(){const t=new Wt;t.name="petrol_pump",t.userData.isExplosive=!0;const e=new G(new ct(4.8,.35,4.2),this.materials.policeWhite);e.position.y=2.8,e.castShadow=!0,t.add(e);const n=new G(new ct(4.85,.2,4.25),this.materials.gasRed);n.position.y=2.8,t.add(n);for(let l of[-1.8,1.8])for(let h of[-1.4,1.4]){const d=new G(new qt(.12,.12,2.8,8),this.materials.steel);d.position.set(l,1.4,h),t.add(d)}const i=new G(new ct(1.6,.2,2.6),this.materials.concrete);i.position.y=.1,t.add(i);for(let l of[-.6,.6]){const h=new G(new ct(.5,1.4,.6),this.materials.gasRed);h.position.set(0,.8,l),h.castShadow=!0,t.add(h);const d=new G(new ct(.52,.35,.3),this.materials.policeWhite);d.position.set(0,1.1,l),t.add(d)}const r=new G(new qt(.8,.8,2.2,16),this.materials.gasRed);r.rotation.z=Math.PI/2,r.position.set(0,.8,-2.4),r.castShadow=!0,t.add(r);const a=new G(new ct(.1,.5,.5),this.materials.hazardStripe);a.rotation.x=Math.PI/4,a.position.set(1.15,.8,-2.4),t.add(a);const o=new G(new qt(.1,.1,4.2,8),this.materials.ironDark);o.position.set(2.6,2.1,1.8),t.add(o);const c=new G(new ct(1.2,.9,.15),this.materials.neonYellow);return c.position.set(2.6,3.8,1.8),t.add(c),t}createPoliceStation(t=1){const e=new Wt;e.name="police_station",e.userData.spawnsPolice=!0;const n=new G(new ct(4.6,3.2,4.2),this.materials.policeBlue);n.position.y=1.6,n.castShadow=!0,e.add(n);const i=new G(new ct(4.7,.4,4.3),this.materials.policeWhite);i.position.y=2.4,e.add(i);const r=new G(new ct(2.4,1.8,.1),this.materials.ironDark);r.position.set(0,.9,2.15),e.add(r);const a=new G(new qt(.7,.1,.3,12),this.materials.steel);a.rotation.x=.5,a.position.set(1.4,3.6,.8),e.add(a);const o=new G(new qt(.2,.2,.3,8),this.materials.sirenRed);o.position.set(-1.2,3.35,1.4),e.add(o);const c=new G(new qt(.2,.2,.3,8),this.materials.sirenBlue);return c.position.set(1.2,3.35,1.4),e.add(c),e.userData.beacons=[o,c],e.userData.animator=(l,h)=>{const d=Math.sin(h*12)>0;o.material.emissiveIntensity=d?2:.2,c.material.emissiveIntensity=d?.2:2},e}createMainGate(t="North Gate",e=0){const n=new Wt;n.name=`main_gate_${t.toLowerCase().replace(" ","_")}`,n.userData.isMainGate=!0,n.userData.gateName=t,n.userData.isBreached=!1,n.userData.hp=600,n.userData.maxHp=600;const i=new G(new ct(1.6,5.2,1.6),this.materials.concrete);i.position.set(-3.2,2.6,0),i.castShadow=!0,n.add(i);const r=new G(new ct(1.6,5.2,1.6),this.materials.concrete);r.position.set(3.2,2.6,0),r.castShadow=!0,n.add(r);const a=new G(new ct(8,1.2,1.8),this.materials.ironDark);a.position.set(0,5,0),a.castShadow=!0,n.add(a);const o=new G(new ct(4,.6,.2),this.materials.policeWhite);o.position.set(0,5,.95),n.add(o);const c=new G(new ct(2.3,3.8,.4),this.materials.steel);c.position.set(-1.2,1.9,0),c.castShadow=!0,n.add(c);const l=new G(new ct(2.3,3.8,.4),this.materials.steel);l.position.set(1.2,1.9,0),l.castShadow=!0,n.add(l),n.userData.doors=[c,l];const h=new G(new ct(1.7,.8,1.7),this.materials.hazardStripe);h.position.set(-3.2,.4,0),n.add(h);const d=new G(new ct(1.7,.8,1.7),this.materials.hazardStripe);d.position.set(3.2,.4,0),n.add(d);for(let u of[-3.2,3.2]){const m=new G(new qt(.6,.7,.4,12),this.materials.ironDark);m.position.set(u,5.4,0),n.add(m);const g=new G(new qt(.1,.1,1.2,8),this.materials.steel);g.rotation.x=Math.PI/2,g.position.set(u,5.7,.6),n.add(g)}return n.rotation.y=e,n}createSpikeTrap(){const t=new Wt;t.name="spike_trap",t.userData.isTrap=!0;const e=new G(new ct(3,.1,2),this.materials.ironDark);e.position.y=.05,t.add(e);for(let n=-1.2;n<=1.2;n+=.6)for(let i=-.6;i<=.6;i+=.6){const r=new G(new Oe(.12,.5,6),this.materials.steel);r.position.set(n,.35,i),t.add(r)}return t}createRoadblock(){const t=new Wt;t.name="roadblock_barrier",t.userData.isRoadblock=!0,t.userData.hp=180;const e=new G(new ct(3.4,1.1,.8),this.materials.concrete);e.position.y=.55,e.castShadow=!0,t.add(e);const n=new G(new ct(3.45,.35,.85),this.materials.hazardStripe);return n.position.y=.55,t.add(n),t}createAttackVehicle(){const t=new Wt;t.name="player_attack_vehicle";const e=new G(new ct(1.4,.65,3.8),this.materials.carPaintRed);e.position.y=.65,e.castShadow=!0,t.add(e);const n=new G(new ct(1.1,.6,1.8),this.materials.ironDark);n.position.set(0,1.15,-.2),n.castShadow=!0,t.add(n);const i=new G(new ct(1,.45,.1),this.materials.carGlass);i.position.set(0,1.15,.75),i.rotation.x=-.35,t.add(i);const r=new G(new ct(1.5,.55,.4),this.materials.ironDark);r.position.set(0,.55,2),r.castShadow=!0,t.add(r);const a=new G(new ct(.32,.3,1.2),this.materials.ironDark);a.position.set(-.45,1.5,-.1),t.add(a);const o=new G(new ct(.32,.3,1.2),this.materials.ironDark);o.position.set(.45,1.5,-.1),t.add(o);const c=new G(new Oe(.1,.28,8),this.materials.neonRed);c.rotation.x=Math.PI/2,c.position.set(-.45,1.5,.6),t.add(c);const l=new G(new Oe(.1,.28,8),this.materials.neonRed);l.rotation.x=Math.PI/2,l.position.set(.45,1.5,.6),t.add(l);const h=new G(new qt(.15,.22,.4,12),this.materials.steel);h.rotation.x=Math.PI/2,h.position.set(-.35,.6,-1.95),t.add(h);const d=new G(new qt(.15,.22,.4,12),this.materials.steel);d.rotation.x=Math.PI/2,d.position.set(.35,.6,-1.95),t.add(d);const u=new G(new Oe(.18,.8,8),this.materials.neonCyan);u.rotation.x=-Math.PI/2,u.position.set(-.35,.6,-2.5),u.visible=!1,t.add(u);const m=new G(new Oe(.18,.8,8),this.materials.neonCyan);m.rotation.x=-Math.PI/2,m.position.set(.35,.6,-2.5),m.visible=!1,t.add(m),t.userData.flames=[u,m];const g=new G(new ct(.25,.18,.1),this.materials.headlight);g.position.set(-.5,.65,1.95),t.add(g);const _=new G(new ct(.25,.18,.1),this.materials.headlight);_.position.set(.5,.65,1.95),t.add(_);const p=[];return[[-.8,.45,1.2],[.8,.45,1.2],[-.8,.5,-1.2],[.8,.5,-1.2]].forEach((M,v)=>{const w=new Wt;w.position.set(...M);const R=new G(new qt(.42,.42,.3,16),this.materials.tireRubber);R.rotation.z=Math.PI/2,R.castShadow=!0,w.add(R);const S=new G(new qt(.24,.24,.31,8),this.materials.steel);S.rotation.z=Math.PI/2,w.add(S),t.add(w),p.push(w)}),t.userData.wheels=p,t}createGateBeacon(t="North Gate"){const e=new Wt;e.name=`beacon_${t.toLowerCase().replace(" ","_")}`;const n=new qt(.8,1.6,28,16,1,!0),i=new Ce({color:58879,transparent:!0,opacity:.38,side:Le}),r=new G(n,i);r.position.y=14,e.add(r);const a=new bi(3.5,.15,8,24),o=new Ce({color:58879,wireframe:!0}),c=new G(a,o);c.rotation.x=Math.PI/2,c.position.y=10,e.add(c);const l=new bi(2.4,.15,8,24),h=new Ce({color:16717636,wireframe:!0}),d=new G(l,h);d.rotation.x=Math.PI/2,d.position.y=14,e.add(d);const u=new Cr(1.4,0),m=new zt({color:16771899,emissive:16752640,emissiveIntensity:1.2}),g=new G(u,m);g.position.y=20,e.add(g);const _=document.createElement("canvas");_.width=512,_.height=128;const p=_.getContext("2d");p.fillStyle="rgba(10, 20, 35, 0.85)",p.roundRect(10,10,492,108,24),p.fill(),p.lineWidth=4,p.strokeStyle="#00e5ff",p.stroke(),p.font="bold 36px sans-serif",p.fillStyle="#ffffff",p.textAlign="center",p.fillText(`⛩️ ${t.toUpperCase()}`,256,54),p.font="bold 24px sans-serif",p.fillStyle="#ff1744",p.fillText("⚡ TAP TO BREACH HERE ⚡",256,92);const f=new mr(_),M=new pr({map:f,transparent:!0}),v=new sa(M);v.scale.set(16,4,1),v.position.y=25,e.add(v);const w=new Pi(2.5,3.2,32),R=new Ce({color:58879,side:Le,transparent:!0,opacity:.7}),S=new G(w,R);return S.rotation.x=-Math.PI/2,S.position.y=.15,e.add(S),e.userData.animator=(A,I)=>{c.rotation.z+=A*1.5,d.rotation.z-=A*2,g.rotation.y+=A*2.2,g.position.y=20+Math.sin(I*3)*1.2;const y=Math.sin(I*5)*.2+.8;S.scale.setScalar(y)},e}createPoliceVehicle(){const t=new Wt;t.name="police_cruiser",t.userData.isPolice=!0,t.userData.hp=140;const e=new G(new ct(1.9,.65,3.6),this.materials.policeBlack);e.position.y=.6,e.castShadow=!0,t.add(e);const n=new G(new ct(1.92,.45,1.6),this.materials.policeWhite);n.position.set(0,.7,0),t.add(n);const i=new G(new ct(1.5,.55,1.8),this.materials.carGlass);i.position.set(0,1.1,-.1),t.add(i);const r=new G(new ct(1.9,.5,.3),this.materials.ironDark);r.position.set(0,.5,1.85),t.add(r);const a=new G(new ct(1.1,.08,.25),this.materials.ironDark);a.position.set(0,1.42,-.1),t.add(a);const o=new G(new ct(.45,.14,.2),this.materials.sirenRed);o.position.set(-.3,1.48,-.1),t.add(o);const c=new G(new ct(.45,.14,.2),this.materials.sirenBlue);c.position.set(.3,1.48,-.1),t.add(c),t.userData.redLight=o,t.userData.blueLight=c;const l=[];return[[-1,.38,1.1],[1,.38,1.1],[-1,.38,-1.1],[1,.38,-1.1]].forEach(d=>{const u=new G(new qt(.38,.38,.25,16),this.materials.tireRubber);u.rotation.z=Math.PI/2,u.position.set(...d),u.castShadow=!0,t.add(u),l.push(u)}),t.userData.wheels=l,t}createPineTree(){const t=new Wt,e=new G(new qt(.2,.3,1.6,8),this.materials.woodDark);return e.position.y=.8,e.castShadow=!0,t.add(e),[{r:1.4,h:1.5,y:1.8},{r:1.1,h:1.3,y:2.6},{r:.7,h:1.1,y:3.3}].forEach(i=>{const r=new G(new Oe(i.r,i.h,7),this.materials.leaves);r.position.y=i.y,r.castShadow=!0,t.add(r)}),t}createStreetLight(){const t=new Wt,e=new G(new qt(.08,.12,4,8),this.materials.steel);e.position.y=2,t.add(e);const n=new G(new ct(.1,.1,1.2),this.materials.steel);n.position.set(0,3.9,.5),t.add(n);const i=new G(new ct(.35,.15,.4),this.materials.headlight);return i.position.set(0,3.8,1),t.add(i),t}createResourceBubble(t){const e=document.createElement("canvas");e.width=256,e.height=256;const n=e.getContext("2d");let i="#ffd700",r="rgba(255, 215, 0, 0.45)",a="💰";t==="wood"?(i="#8bc34a",r="rgba(139, 195, 74, 0.45)",a="🪵"):t==="iron"&&(i="#00e5ff",r="rgba(0, 229, 255, 0.45)",a="⚙️");const o=n.createRadialGradient(128,128,60,128,128,120);o.addColorStop(0,r),o.addColorStop(1,"rgba(0,0,0,0)"),n.fillStyle=o,n.beginPath(),n.arc(128,128,120,0,Math.PI*2),n.fill(),n.beginPath(),n.arc(128,128,76,0,Math.PI*2),n.fillStyle="rgba(12, 22, 36, 0.92)",n.fill(),n.lineWidth=8,n.strokeStyle=i,n.stroke(),n.beginPath(),n.arc(128,128,66,0,Math.PI*2),n.lineWidth=2,n.strokeStyle="rgba(255, 255, 255, 0.4)",n.stroke(),n.font="82px sans-serif",n.textAlign="center",n.textBaseline="middle",n.fillText(a,128,126),n.fillStyle=i,n.beginPath(),n.roundRect(64,182,128,30,12),n.fill(),n.font='bold 16px "Segoe UI", sans-serif',n.fillStyle="#06101c",n.textAlign="center",n.textBaseline="middle",n.fillText("COLLECT",128,197);const c=new mr(e);c.needsUpdate=!0;const l=new pr({map:c,transparent:!0,depthTest:!1,depthWrite:!1}),h=new sa(l);return h.scale.set(4.2,4.2,1),h.renderOrder=999,h.userData={isResourceBubble:!0,resourceType:t,baseScale:4.2},h}createConstructionHammer(){const t=new Wt;t.name="construction_hammer";const e=new qt(.18,.18,2.4,8),n=new G(e,this.materials.woodDark);n.position.y=1,n.castShadow=!0,t.add(n);const i=new ct(.85,.65,1.4),r=new G(i,this.materials.ironDark);r.position.set(0,2,.2),r.castShadow=!0,t.add(r);const a=new ct(.9,.2,.9),o=new G(a,this.materials.hazardStripe);return o.position.set(0,2,.2),t.add(o),t}}class Np{constructor(){this.ctx=null,this.isMuted=!1,this.masterGain=null,this.engineNode=null,this.engineGain=null,this.engineFilter=null,this.sirenOsc=null,this.sirenGain=null,this.sirenLfo=null,this.nitroGain=null,this.driftGain=null,this.initialized=!1}init(){if(!this.initialized)try{const t=window.AudioContext||window.webkitAudioContext;this.ctx=new t,this.masterGain=this.ctx.createGain(),this.masterGain.gain.setValueAtTime(.35,this.ctx.currentTime),this.masterGain.connect(this.ctx.destination),this._initEngineAudio(),this._initSirenAudio(),this._initDriftAudio(),this.initialized=!0}catch(t){console.warn("AudioContext initialization deferred until user interaction:",t)}}ensureStarted(){this.initialized||this.init(),this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}setMuted(t){this.isMuted=t,this.masterGain&&this.ctx&&this.masterGain.gain.setValueAtTime(t?0:.35,this.ctx.currentTime)}_initEngineAudio(){this.ctx&&(this.engineOsc1=this.ctx.createOscillator(),this.engineOsc2=this.ctx.createOscillator(),this.engineOsc1.type="sawtooth",this.engineOsc2.type="triangle",this.engineOsc1.frequency.setValueAtTime(45,this.ctx.currentTime),this.engineOsc2.frequency.setValueAtTime(46,this.ctx.currentTime),this.engineFilter=this.ctx.createBiquadFilter(),this.engineFilter.type="lowpass",this.engineFilter.frequency.setValueAtTime(250,this.ctx.currentTime),this.engineGain=this.ctx.createGain(),this.engineGain.gain.setValueAtTime(0,this.ctx.currentTime),this.engineOsc1.connect(this.engineFilter),this.engineOsc2.connect(this.engineFilter),this.engineFilter.connect(this.engineGain),this.engineGain.connect(this.masterGain),this.engineOsc1.start(),this.engineOsc2.start())}updateEngine(t,e,n=!0){if(!this.ctx||!this.engineGain)return;const i=this.ctx.currentTime;if(!n||this.isMuted){this.engineGain.gain.setTargetAtTime(0,i,.1);return}const r=42+t*95+(e?22:0);this.engineOsc1.frequency.setTargetAtTime(r,i,.08),this.engineOsc2.frequency.setTargetAtTime(r*1.5,i,.08);const a=180+t*850+(e?300:0);this.engineFilter.frequency.setTargetAtTime(a,i,.08);const o=.22+t*.18+(e?.12:0);this.engineGain.gain.setTargetAtTime(o,i,.08)}_initDriftAudio(){if(!this.ctx)return;const t=this.ctx.sampleRate*2,e=this.ctx.createBuffer(1,t,this.ctx.sampleRate),n=e.getChannelData(0);for(let a=0;a<t;a++)n[a]=Math.random()*2-1;const i=this.ctx.createBufferSource();i.buffer=e,i.loop=!0;const r=this.ctx.createBiquadFilter();r.type="bandpass",r.frequency.setValueAtTime(1400,this.ctx.currentTime),r.Q.setValueAtTime(3,this.ctx.currentTime),this.driftGain=this.ctx.createGain(),this.driftGain.gain.setValueAtTime(0,this.ctx.currentTime),i.connect(r),r.connect(this.driftGain),this.driftGain.connect(this.masterGain),i.start()}updateDrift(t){if(!this.ctx||!this.driftGain)return;const e=this.ctx.currentTime,n=Math.min(.35,Math.max(0,(t-.25)*.5));this.driftGain.gain.setTargetAtTime(this.isMuted?0:n,e,.05)}_initSirenAudio(){if(!this.ctx)return;this.sirenOsc=this.ctx.createOscillator(),this.sirenOsc.type="sawtooth",this.sirenOsc.frequency.setValueAtTime(750,this.ctx.currentTime),this.sirenLfo=this.ctx.createOscillator(),this.sirenLfo.frequency.setValueAtTime(1.8,this.ctx.currentTime);const t=this.ctx.createGain();t.gain.setValueAtTime(260,this.ctx.currentTime),this.sirenLfo.connect(t),t.connect(this.sirenOsc.frequency);const e=this.ctx.createBiquadFilter();e.type="lowpass",e.frequency.setValueAtTime(1800,this.ctx.currentTime),this.sirenGain=this.ctx.createGain(),this.sirenGain.gain.setValueAtTime(0,this.ctx.currentTime),this.sirenOsc.connect(e),e.connect(this.sirenGain),this.sirenGain.connect(this.masterGain),this.sirenOsc.start(),this.sirenLfo.start()}setSirenActive(t,e=1){if(!this.ctx||!this.sirenGain)return;const n=this.ctx.currentTime,i=t&&!this.isMuted?Math.min(.28,.28*e):0;this.sirenGain.gain.setTargetAtTime(i,n,.15)}playExplosion(t="medium"){if(!this.ctx||this.isMuted)return;const e=this.ctx.currentTime,n=this.ctx.createOscillator(),i=this.ctx.createGain();n.type="triangle";const r=t==="huge"?140:180;n.frequency.setValueAtTime(r,e),n.frequency.exponentialRampToValueAtTime(28,e+.5),i.gain.setValueAtTime(t==="huge"?.7:.45,e),i.gain.exponentialRampToValueAtTime(.001,e+(t==="huge"?1.2:.7)),n.connect(i),i.connect(this.masterGain),n.start(e),n.stop(e+1.3);const a=t==="huge"?1.4:.8,o=Math.floor(this.ctx.sampleRate*a),c=this.ctx.createBuffer(1,o,this.ctx.sampleRate),l=c.getChannelData(0);for(let m=0;m<o;m++)l[m]=(Math.random()*2-1)*Math.exp(-m/(this.ctx.sampleRate*.25));const h=this.ctx.createBufferSource();h.buffer=c;const d=this.ctx.createBiquadFilter();d.type="lowpass",d.frequency.setValueAtTime(t==="huge"?650:900,e),d.frequency.exponentialRampToValueAtTime(100,e+a);const u=this.ctx.createGain();u.gain.setValueAtTime(t==="huge"?.6:.35,e),u.gain.exponentialRampToValueAtTime(.001,e+a),h.connect(d),d.connect(u),u.connect(this.masterGain),h.start(e)}playCrash(t=1){if(!this.ctx||this.isMuted)return;const e=this.ctx.currentTime,n=this.ctx.createOscillator(),i=this.ctx.createGain();n.type="sawtooth",n.frequency.setValueAtTime(220*t,e),n.frequency.exponentialRampToValueAtTime(40,e+.2),i.gain.setValueAtTime(Math.min(.5,.25*t),e),i.gain.exponentialRampToValueAtTime(.001,e+.25),n.connect(i),i.connect(this.masterGain),n.start(e),n.stop(e+.3)}playMissileLaunch(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="sawtooth",e.frequency.setValueAtTime(320,t),e.frequency.exponentialRampToValueAtTime(1100,t+.4),n.gain.setValueAtTime(.3,t),n.gain.exponentialRampToValueAtTime(.001,t+.45),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.5)}playBigJump(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="sine",e.frequency.setValueAtTime(110,t),e.frequency.exponentialRampToValueAtTime(450,t+.35),n.gain.setValueAtTime(.4,t),n.gain.exponentialRampToValueAtTime(.01,t+.45),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.5)}playInvisibility(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime;[440,659.25,880,1318.5].forEach((n,i)=>{const r=this.ctx.createOscillator(),a=this.ctx.createGain();r.type="sine",r.frequency.setValueAtTime(n,t+i*.08),a.gain.setValueAtTime(0,t+i*.08),a.gain.linearRampToValueAtTime(.18,t+i*.08+.05),a.gain.exponentialRampToValueAtTime(.001,t+i*.08+.7),r.connect(a),a.connect(this.masterGain),r.start(t+i*.08),r.stop(t+i*.08+.75)})}playNitro(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="sawtooth",e.frequency.setValueAtTime(240,t),e.frequency.linearRampToValueAtTime(620,t+.5),n.gain.setValueAtTime(.35,t),n.gain.exponentialRampToValueAtTime(.001,t+1.2),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+1.3)}playBombDrop(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="square",e.frequency.setValueAtTime(800,t),e.frequency.setValueAtTime(1200,t+.06),n.gain.setValueAtTime(.2,t),n.gain.exponentialRampToValueAtTime(.001,t+.15),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.2)}playTurretFire(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="sawtooth",e.frequency.setValueAtTime(600,t),e.frequency.exponentialRampToValueAtTime(90,t+.12),n.gain.setValueAtTime(.25,t),n.gain.exponentialRampToValueAtTime(.001,t+.15),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.18)}playClick(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="sine",e.frequency.setValueAtTime(600,t),n.gain.setValueAtTime(.12,t),n.gain.exponentialRampToValueAtTime(.001,t+.06),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.08)}playPlace(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="triangle",e.frequency.setValueAtTime(220,t),e.frequency.setValueAtTime(440,t+.08),n.gain.setValueAtTime(.25,t),n.gain.exponentialRampToValueAtTime(.001,t+.2),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.22)}playUpgrade(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime;[330,415.3,493.88,659.25].forEach((n,i)=>{const r=this.ctx.createOscillator(),a=this.ctx.createGain();r.type="sine",r.frequency.setValueAtTime(n,t+i*.06),a.gain.setValueAtTime(.15,t+i*.06),a.gain.exponentialRampToValueAtTime(.001,t+i*.06+.4),r.connect(a),a.connect(this.masterGain),r.start(t+i*.06),r.stop(t+i*.06+.45)})}playLoot(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime,e=this.ctx.createOscillator(),n=this.ctx.createGain();e.type="sine",e.frequency.setValueAtTime(987.77,t),e.frequency.setValueAtTime(1318.5,t+.05),n.gain.setValueAtTime(.15,t),n.gain.exponentialRampToValueAtTime(.001,t+.2),e.connect(n),n.connect(this.masterGain),e.start(t),e.stop(t+.22)}playCollectChime(){if(!this.ctx||this.isMuted)return;const t=this.ctx.currentTime;[659.25,830.61,987.77,1318.51].forEach((n,i)=>{const r=this.ctx.createOscillator(),a=this.ctx.createGain();r.type="sine",r.frequency.setValueAtTime(n,t+i*.05),a.gain.setValueAtTime(.18,t+i*.05),a.gain.exponentialRampToValueAtTime(.001,t+i*.05+.35),r.connect(a),a.connect(this.masterGain),r.start(t+i*.05),r.stop(t+i*.05+.38)})}}const Fp=new Np;class Bp{constructor(t,e){this.scene=t,this.assetFactory=e,this.roads=new Map,this.roadGroup=new Wt,this.roadGroup.name="city_road_network",this.scene.add(this.roadGroup),this.tileSize=5.5}getKey(t,e){return`${t},${e}`}hasRoad(t,e){return this.roads.has(this.getKey(t,e))}addRoad(t,e){const n=this.getKey(t,e);return this.roads.has(n)?!1:(this.roads.set(n,{gx:t,gz:e,mesh:null}),this.refreshTileAndNeighbors(t,e),!0)}removeRoad(t,e){const n=this.getKey(t,e);if(!this.roads.has(n))return!1;const i=this.roads.get(n);return i.mesh&&this.roadGroup.remove(i.mesh),this.roads.delete(n),this._refreshNeighbors(t,e),!0}_refreshNeighbors(t,e){[[t,e-1],[t,e+1],[t+1,e],[t-1,e],[t+1,e-1],[t-1,e-1],[t+1,e+1],[t-1,e+1]].forEach(([i,r])=>{this.hasRoad(i,r)&&this.updateTileMesh(i,r)})}refreshTileAndNeighbors(t,e){this.updateTileMesh(t,e),this._refreshNeighbors(t,e)}updateTileMesh(t,e){const n=this.getKey(t,e),i=this.roads.get(n);if(!i)return;i.mesh&&(this.roadGroup.remove(i.mesh),i.mesh=null);const r=this.hasRoad(t,e-1),a=this.hasRoad(t,e+1),o=this.hasRoad(t+1,e),c=this.hasRoad(t-1,e),l=this.hasRoad(t+1,e-1),h=this.hasRoad(t-1,e-1),d=this.hasRoad(t+1,e+1),u=this.hasRoad(t-1,e+1),m=t*this.tileSize,g=e*this.tileSize,_=this._createRoadSegment(r,a,o,c,l,h,d,u);_.position.set(m,.04,g),this.roadGroup.add(_),i.mesh=_}_createRoadSegment(t,e,n,i,r,a,o,c){const l=new Wt,h=this.tileSize,d=h/2,u=new on(h,h),m=new G(u,this.assetFactory.materials.asphalt);m.rotation.x=-Math.PI/2,m.receiveShadow=!0,l.add(m);const g=this.assetFactory.materials.sidewalk,_=.12,p=.45;if(!t){const S=new G(new ct(h,_,p),g);S.position.set(0,_/2,-d+p/2),l.add(S)}if(!e){const S=new G(new ct(h,_,p),g);S.position.set(0,_/2,d-p/2),l.add(S)}if(!i){const S=new G(new ct(p,_,h),g);S.position.set(-d+p/2,_/2,0),l.add(S)}if(!n){const S=new G(new ct(p,_,h),g);S.position.set(d-p/2,_/2,0),l.add(S)}const f=new on(p*2,p*2);if(!t&&!n&&r){const S=new G(f,this.assetFactory.materials.asphalt);S.rotation.x=-Math.PI/2,S.position.set(d,.01,-d),l.add(S)}if(!t&&!i&&a){const S=new G(f,this.assetFactory.materials.asphalt);S.rotation.x=-Math.PI/2,S.position.set(-d,.01,-d),l.add(S)}if(!e&&!n&&o){const S=new G(f,this.assetFactory.materials.asphalt);S.rotation.x=-Math.PI/2,S.position.set(d,.01,d),l.add(S)}if(!e&&!i&&c){const S=new G(f,this.assetFactory.materials.asphalt);S.rotation.x=-Math.PI/2,S.position.set(-d,.01,d),l.add(S)}const M=this.assetFactory.materials.roadLine,v=new on(3,.28),w=new on(.28,3),R=(t?1:0)+(e?1:0)+(n?1:0)+(i?1:0);if(R===0||R===1){const S=new G(t||e?w:v,M);S.rotation.x=-Math.PI/2,S.position.y=.01,l.add(S)}else if(R===2)if(t&&e){const S=new G(w,M);S.rotation.x=-Math.PI/2,S.position.y=.01,l.add(S)}else if(n&&i){const S=new G(v,M);S.rotation.x=-Math.PI/2,S.position.y=.01,l.add(S)}else{const S=new G(new ms(.5,12),M);S.rotation.x=-Math.PI/2,S.position.y=.01,l.add(S)}else{const S=new G(new ms(.6,12),M);S.rotation.x=-Math.PI/2,S.position.y=.01,l.add(S)}return l}getRoadContainment(t,e){const n=Math.round(t/this.tileSize),i=Math.round(e/this.tileSize);let r=1/0,a=null;for(let l=-1;l<=1;l++)for(let h=-1;h<=1;h++)if(this.hasRoad(n+l,i+h)){const d=(n+l)*this.tileSize,u=(i+h)*this.tileSize,m=(t-d)**2+(e-u)**2;m<r&&(r=m,a={x:d,z:u})}const o=this.tileSize*.58,c=Math.sqrt(r);return{onRoad:c<=o,distance:c,maxRadius:o,nearestRoad:a}}clear(){const t=this.roads.size;return this.roads.forEach(e=>{e.mesh&&this.roadGroup.remove(e.mesh)}),this.roads.clear(),t}}class Op{constructor(){this.cash=1500,this.iron=800,this.wood=1e3,this.inventory={road:35,lumber_mill:1,spike_trap:2,roadblock:2,tree:3},this.onUpdate=null,this.onInventoryUpdate=null,this.load(),this.inventory.road===void 0&&(this.inventory.road=35)}update(t){}getResources(){return{cash:Math.floor(this.cash),iron:Math.floor(this.iron),wood:Math.floor(this.wood)}}collectFromBuilding(t,e){if(e<=0)return 0;const n=Math.floor(e);return t==="wood"?this.wood+=n:t==="iron"?this.iron+=n:this.cash+=n,this.save(),this.onUpdate&&this.onUpdate(this.getResources()),n}addToInventory(t,e=1){this.inventory[t]=(this.inventory[t]||0)+e,this.save(),this.onInventoryUpdate&&this.onInventoryUpdate(this.inventory)}consumeFromInventory(t){return(this.inventory[t]||0)>0?(this.inventory[t]--,this.inventory[t]===0&&delete this.inventory[t],this.save(),this.onInventoryUpdate&&this.onInventoryUpdate(this.inventory),!0):!1}getInventoryCount(t){return this.inventory[t]||0}getTotalInventoryCount(){return Object.values(this.inventory).reduce((t,e)=>t+(e||0),0)}canAfford(t){return this.cash>=(t.cash||0)&&this.iron>=(t.iron||0)&&this.wood>=(t.wood||0)}deduct(t){return this.canAfford(t)?(this.cash-=t.cash||0,this.iron-=t.iron||0,this.wood-=t.wood||0,this.save(),this.onUpdate&&this.onUpdate(this.getResources()),!0):!1}rewardLoot(t){this.cash+=t.cash||0,this.iron+=t.iron||0,this.wood+=t.wood||0,this.save(),this.onUpdate&&this.onUpdate(this.getResources())}save(){try{const t={cash:this.cash,iron:this.iron,wood:this.wood,inventory:this.inventory};localStorage.setItem("city_siege_eco",JSON.stringify(t))}catch{}}load(){try{const t=localStorage.getItem("city_siege_eco");if(t){const e=JSON.parse(t);this.cash=e.cash??this.cash,this.iron=e.iron??this.iron,this.wood=e.wood??this.wood,e.inventory&&typeof e.inventory=="object"&&(this.inventory=e.inventory)}}catch{}}}class Gp{constructor(t,e,n,i){this.scene=t,this.assetFactory=e,this.roadNetwork=n,this.economy=i,this.buildings=[],this.buildingGroup=new Wt,this.buildingGroup.name="city_buildings",this.scene.add(this.buildingGroup),this.activeBuildTasks=[],this.onBuildersChanged=null,this.onConstructionFinished=null,this.catalog={town_hall:{name:"Town Hall",category:"civil",cost:{cash:500,iron:250,wood:400},maxHp:1200,footprint:2,desc:"Heart of the city. Upgrade to unlock new structural tiers."},vehicle_lab:{name:"Vehicle Tuning Lab",category:"defense",cost:{cash:450,iron:250,wood:300},maxHp:750,footprint:2,desc:"High-octane lab to upgrade vehicle top speed, acceleration, nitro, and jump height."},weapons_lab:{name:"Weapons & Munitions Lab",category:"defense",cost:{cash:550,iron:350,wood:250},maxHp:850,footprint:2,desc:"Explosive lab to upgrade bomb blast radius, explosion damage, rockets, and EMP duration."},sniper_tower:{name:"Sniper Watchtower",category:"defense",cost:{cash:350,iron:200,wood:250},maxHp:700,footprint:2,desc:"Elevated marksman nest firing high-velocity rounds at intruder buggies."},tesla_coil:{name:"Tesla Defense Coil",category:"defense",cost:{cash:500,iron:350,wood:200},maxHp:850,footprint:2,desc:"High-voltage electric arcs that zap nearby attacker vehicles."},laser_obelisk:{name:"Laser Obelisk",category:"defense",cost:{cash:750,iron:500,wood:300},maxHp:1350,footprint:2,desc:"Continuous focused thermal heat laser cutting through vehicle armor."},main_gate:{name:"Fortified Main Gate",category:"defense",cost:{cash:350,iron:300,wood:200},maxHp:800,footprint:3,desc:"Heavy perimeter defense gate with automated defense turrets."},police_station:{name:"Police Station",category:"defense",cost:{cash:400,iron:200,wood:250},maxHp:650,footprint:2,desc:"Houses pursuit cruisers that deploy immediately when sirens sound."},petrol_pump:{name:"Petrol Pump",category:"economy",cost:{cash:300,iron:150,wood:100},maxHp:400,footprint:2,desc:"High economic output! Warning: highly explosive during attacks."},lumber_mill:{name:"Lumber Mill",category:"economy",cost:{cash:150,iron:50,wood:100},maxHp:450,footprint:2,desc:"Mines Wood continuously to supply construction."},iron_foundry:{name:"Iron Foundry",category:"economy",cost:{cash:250,iron:100,wood:150},maxHp:550,footprint:2,desc:"Mines Iron continuously to forge heavy fortifications."},cash_mint:{name:"Cash Mint",category:"economy",cost:{cash:350,iron:150,wood:200},maxHp:500,footprint:2,desc:"Produces Cash continuously for the treasury."},spike_trap:{name:"Spike Trap",category:"defense",cost:{cash:80,iron:120,wood:40},maxHp:200,footprint:1,desc:"Hidden road trap that shreds attacker tires."},roadblock:{name:"Roadblock Barrier",category:"defense",cost:{cash:50,iron:80,wood:30},maxHp:300,footprint:1,desc:"Concrete barrier to block enemy attack routes."},builder_hut:{name:"Hire a Labour",category:"civil",cost:{cash:200,iron:80,wood:150},maxHp:350,footprint:2,desc:"Hire a dedicated labourer to construct and upgrade buildings. Provides +1 active Labour slot."},tree:{name:"Pine Tree",category:"civil",cost:{cash:10,iron:0,wood:20},maxHp:100,footprint:1,desc:"Countryside greenery."},road:{name:"Paved Asphalt Road (x5 Tiles)",category:"roads",cost:{cash:25,iron:15,wood:20},packCount:5,footprint:1,desc:"Durable paved asphalt tiles to connect structures and gates in your city."}}}initDefaultCity(){this.clearAll(),[[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[0,12],[0,13],[0,14],[0,15],[0,-1],[0,-2],[0,-3],[0,-4],[0,-5],[0,-6],[0,-7],[0,-8],[0,-9],[0,-10],[0,-11],[0,-12],[0,-13],[0,-14],[0,-15],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[-1,0],[-2,0],[-3,0],[-4,0],[-5,0],[-6,0],[-7,0],[-8,0],[-9,0],[-10,0],[-11,0],[-12,0],[-13,0],[-14,0],[-15,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[1,6],[2,6],[3,6],[4,6],[5,6],[-6,1],[-6,2],[-6,3],[-6,4],[-6,5],[-6,6],[-1,6],[-2,6],[-3,6],[-4,6],[-5,6],[6,-1],[6,-2],[6,-3],[6,-4],[6,-5],[6,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],[-6,-1],[-6,-2],[-6,-3],[-6,-4],[-6,-5],[-6,-6],[-1,-6],[-2,-6],[-3,-6],[-4,-6],[-5,-6]].forEach(([n,i])=>{this.roadNetwork.addRoad(n,i)}),this.addBuilding("town_hall",3,3,1),this.addMainGate("North Gate",0,-15,0),this.addMainGate("East Gate",15,0,Math.PI/2),this.addMainGate("South Gate",0,15,Math.PI),this.addBuilding("police_station",-4,-3,1),this.addBuilding("police_station",4,8,1),this.addBuilding("petrol_pump",-3,3,1),this.addBuilding("petrol_pump",8,-3,1),this.addBuilding("lumber_mill",-8,-8,1),this.addBuilding("iron_foundry",-8,8,1),this.addBuilding("cash_mint",8,4,1),this.addBuilding("builder_hut",4,-4,1),this.addBuilding("builder_hut",-4,4,1),this.addBuilding("spike_trap",0,-11,1),this.addBuilding("roadblock",0,11,1),this.addBuilding("roadblock",11,0,1),[[-10,-3],[-11,-5],[-12,-7],[-10,3],[-12,5],[10,-8],[11,-10],[9,9],[12,11],[-3,11]].forEach(([n,i])=>{this.addBuilding("tree",n,i,1)})}get tileSize(){return this.roadNetwork?this.roadNetwork.tileSize:5.5}moveBuilding(t,e,n){t.gx=e,t.gz=n,t.mesh&&t.mesh.position.set(e*this.tileSize,0,n*this.tileSize)}applyPreset(t){if(this.clearAll(),t==="metropolis"){for(let e=-14;e<=14;e++)this.roadNetwork.addRoad(e,0),this.roadNetwork.addRoad(e,-7),this.roadNetwork.addRoad(e,7);for(let e=-14;e<=14;e++)this.roadNetwork.addRoad(0,e),this.roadNetwork.addRoad(-7,e),this.roadNetwork.addRoad(7,e);this.addBuilding("town_hall",3,3,2),this.addMainGate("North Gate",0,-14,0),this.addMainGate("East Gate",14,0,Math.PI/2),this.addMainGate("South Gate",0,14,Math.PI),this.addBuilding("police_station",-7,-3,2),this.addBuilding("police_station",7,7,2),this.addBuilding("petrol_pump",-3,7,1),this.addBuilding("petrol_pump",7,-3,1),this.addBuilding("cash_mint",3,-7,2),this.addBuilding("iron_foundry",-7,7,2),this.addBuilding("lumber_mill",-11,-11,2),this.addBuilding("builder_hut",-3,-3,1),this.addBuilding("builder_hut",3,7,1)}else t==="valley"?([[0,-14],[0,-13],[1,-12],[2,-11],[3,-10],[3,-9],[2,-8],[1,-7],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-3,-2],[-2,-1],[-1,0],[0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12],[13,13],[14,14],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[0,12],[0,13],[0,14]].forEach(([n,i])=>this.roadNetwork.addRoad(n,i)),this.addBuilding("town_hall",-2,-2,1),this.addMainGate("North Gate",0,-14,0),this.addMainGate("East Gate",14,0,Math.PI/2),this.addMainGate("South Gate",0,14,Math.PI),this.addBuilding("lumber_mill",6,2,1),this.addBuilding("iron_foundry",-6,2,1),this.addBuilding("cash_mint",2,6,1),this.addBuilding("police_station",-4,-6,1),this.addBuilding("petrol_pump",6,-4,1),this.addBuilding("builder_hut",-1,3,1),this.addBuilding("spike_trap",2,-11,1)):this.initDefaultCity()}addMainGate(t,e,n,i){const r=this.assetFactory.createMainGate(t,i);r.position.set(e*this.tileSize,0,n*this.tileSize),this.buildingGroup.add(r);const a={id:`gate_${t.toLowerCase().replace(" ","_")}`,type:"main_gate",name:t,level:1,gx:e,gz:n,rotation:i,hp:800,maxHp:800,mesh:r,isMainGate:!0};return this.buildings.push(a),a}addBuilding(t,e,n,i=1){const r=this.catalog[t];if(!r)return null;let a=null;if(t==="town_hall"?a=this.assetFactory.createTownHall(i):t==="police_station"?a=this.assetFactory.createPoliceStation(i):t==="petrol_pump"?a=this.assetFactory.createPetrolPump():t==="lumber_mill"?a=this.assetFactory.createLumberMill(i):t==="iron_foundry"?a=this.assetFactory.createIronFoundry(i):t==="cash_mint"?a=this.assetFactory.createCashMint(i):t==="spike_trap"?a=this.assetFactory.createSpikeTrap():t==="roadblock"?a=this.assetFactory.createRoadblock():t==="builder_hut"?a=this.assetFactory.createBuilderHut(i):t==="tree"&&(a=this.assetFactory.createPineTree()),!a)return null;a.position.set(e*this.tileSize,0,n*this.tileSize),this.buildingGroup.add(a);const o={id:`b_${Date.now()}_${Math.floor(Math.random()*1e3)}`,type:t,name:r.name,level:i,gx:e,gz:n,hp:r.maxHp*(i===3?2.2:i===2?1.5:1),maxHp:r.maxHp*(i===3?2.2:i===2?1.5:1),mesh:a,isDestroyed:!1,isExplosive:t==="petrol_pump",spawnsPolice:t==="police_station",bubbleMesh:null};return t==="lumber_mill"?(o.produceType="wood",o.produceRate=3.5*i,o.stored=16,o.maxCapacity=300*i):t==="iron_foundry"?(o.produceType="iron",o.produceRate=2.5*i,o.stored=14,o.maxCapacity=250*i):t==="cash_mint"?(o.produceType="cash",o.produceRate=5*i,o.stored=25,o.maxCapacity=400*i):t==="petrol_pump"&&(o.produceType="cash",o.produceRate=7.5*i,o.stored=35,o.maxCapacity=500*i),this.buildings.push(o),o}get totalBuilders(){const t=this.buildings.filter(e=>e.type==="builder_hut"&&!e.isDestroyed).length;return Math.max(2,t)}get busyBuilders(){return this.activeBuildTasks.length}get freeBuilders(){return Math.max(0,this.totalBuilders-this.busyBuilders)}getTownHallLevel(){const t=this.buildings.find(e=>e.type==="town_hall");return t&&t.level||1}getBuildTime(t,e=1){const i={roadblock:5,spike_trap:5,spring_trap:6,landmine:7,freeze_trap:8,lumber_mill:10,iron_foundry:10,petrol_pump:10,cash_mint:12,builder_hut:15,police_station:15,sniper_tower:15,vehicle_lab:15,weapons_lab:20,main_gate:20,tesla_coil:25,laser_obelisk:30,town_hall:25}[t]||10;return Math.min(120,Math.round(i*Math.pow(1.5,Math.max(0,e-1))))}upgradeBuilding(t,e=null){if(t.isUnderConstruction)return{ok:!1,reason:"ALREADY_IN_PROGRESS"};const n=(t.level||1)+1,i=this.getTownHallLevel();if(t.type==="town_hall"){if(n>12)return{ok:!1,reason:"MAX_TOWN_HALL"}}else{if(n>i)return{ok:!1,reason:"TOWN_HALL_CAP",requiredTH:n};if(n>12)return{ok:!1,reason:"MAX_LEVEL"}}if(this.freeBuilders<=0)return{ok:!1,reason:"NO_FREE_BUILDERS"};const r=this.getUpgradeCost(t);if(!this.economy.deduct(r))return{ok:!1,reason:"INSUFFICIENT_RESOURCES"};const a=this.getBuildTime(t.type,n),o={id:`task_${Date.now()}_${Math.floor(Math.random()*1e3)}`,building:t,targetLevel:n,remaining:a,total:a,onComplete:e};if(this.activeBuildTasks.push(o),t.isUnderConstruction=!0,t.buildTask=o,this.assetFactory&&this.assetFactory.createConstructionHammer){const c=this.assetFactory.createConstructionHammer();c.position.set(t.gx*this.tileSize,5.8,t.gz*this.tileSize),this.buildingGroup.add(c),t.constructionMesh=c}return this.onBuildersChanged&&this.onBuildersChanged(),{ok:!0,duration:a,task:o}}completeConstruction(t){const e=t.building,n=t.targetLevel;e.level=n;const i=e.mesh.position.clone(),r=e.mesh.rotation.y;this.buildingGroup.remove(e.mesh),e.constructionMesh&&(this.buildingGroup.remove(e.constructionMesh),e.constructionMesh=null);let a=null;e.type==="town_hall"?a=this.assetFactory.createTownHall(Math.min(3,n)):e.type==="lumber_mill"?a=this.assetFactory.createLumberMill(Math.min(3,n)):e.type==="iron_foundry"?a=this.assetFactory.createIronFoundry(Math.min(3,n)):e.type==="cash_mint"?a=this.assetFactory.createCashMint(Math.min(3,n)):e.type==="police_station"?a=this.assetFactory.createPoliceStation(Math.min(3,n)):e.type==="builder_hut"?a=this.assetFactory.createBuilderHut(Math.min(3,n)):a=this.assetFactory.createTownHall(Math.min(3,n)),a.position.copy(i),a.rotation.y=r,this.buildingGroup.add(a),e.mesh=a;const o=this.catalog[e.type]||{maxHp:500},c=1+(n-1)*.55;e.maxHp=Math.round(o.maxHp*c),e.hp=e.maxHp,e.produceRate&&(e.produceRate*=1.35,e.maxCapacity=Math.round(e.maxCapacity*1.4)),e.isUnderConstruction=!1,e.buildTask=null,t.onComplete&&t.onComplete(e),this.onConstructionFinished&&this.onConstructionFinished(e),this.onBuildersChanged&&this.onBuildersChanged()}finishConstructionInstantly(t){const e=this.activeBuildTasks.find(n=>n.building===t);if(e){this.completeConstruction(e);const n=this.activeBuildTasks.indexOf(e);return n>=0&&this.activeBuildTasks.splice(n,1),!0}return!1}getUpgradeCost(t){var i;const e=((i=this.catalog[t.type])==null?void 0:i.cost)||{cash:100,iron:50,wood:50},n=Math.pow(1.7,t.level||1);return{cash:Math.round(e.cash*n),iron:Math.round(e.iron*n),wood:Math.round(e.wood*n)}}collectBuilding(t){if(!t||!t.produceType||(t.stored||0)<=0)return null;const e=Math.floor(t.stored),n=t.produceType;return this.economy.collectFromBuilding(n,e),t.stored=0,t.bubbleMesh&&(this.buildingGroup.remove(t.bubbleMesh),t.bubbleMesh=null),{type:n,amount:e,building:t}}stowBuilding(t){return!t||t.isMainGate||t.type==="town_hall"?!1:(this.economy.addToInventory(t.type,1),this.removeBuilding(t),!0)}removeBuilding(t){const e=this.buildings.indexOf(t);e!==-1&&(t.mesh&&this.buildingGroup.remove(t.mesh),t.bubbleMesh&&(this.buildingGroup.remove(t.bubbleMesh),t.bubbleMesh=null),this.buildings.splice(e,1))}clearAll(){this.buildings.forEach(t=>{t.mesh&&this.buildingGroup.remove(t.mesh),t.bubbleMesh&&this.buildingGroup.remove(t.bubbleMesh)}),this.buildings=[],this.roadNetwork.clear()}getMainGates(){return this.buildings.filter(t=>t.isMainGate)}getPoliceStations(){return this.buildings.filter(t=>t.spawnsPolice&&!t.isDestroyed)}update(t,e){for(let n=this.activeBuildTasks.length-1;n>=0;n--){const i=this.activeBuildTasks[n];i.remaining-=t,i.building.constructionMesh&&(i.building.constructionMesh.rotation.y+=t*1.6,i.building.constructionMesh.rotation.z=Math.sin(e*9)*.45,i.building.constructionMesh.position.y=5.8+Math.sin(e*4)*.25),i.remaining<=0&&(this.completeConstruction(i),this.activeBuildTasks.splice(n,1))}this.buildings.forEach(n=>{if(n.mesh&&n.mesh.userData&&n.mesh.userData.animator&&n.mesh.userData.animator(t,e),n.produceType&&!n.isDestroyed)if(n.stored=Math.min(n.maxCapacity,(n.stored||0)+n.produceRate*t),n.stored>=12){if(!n.bubbleMesh){const a=this.assetFactory.createResourceBubble(n.produceType);a.position.set(n.gx*this.tileSize,5,n.gz*this.tileSize),a.userData.parentBuilding=n,this.buildingGroup.add(a),n.bubbleMesh=a}const i=Math.sin(e*3.5+n.gx*.8)*.4;n.bubbleMesh.position.y=5.2+i;const r=4.2+Math.sin(e*3.5+n.gx*.8)*.2;n.bubbleMesh.scale.set(r,r,1)}else n.bubbleMesh&&n.stored<12&&(this.buildingGroup.remove(n.bubbleMesh),n.bubbleMesh=null)})}}class zp{constructor(t,e,n,i,r,a,o=null){this.scene=t,this.camera=e,this.roadNetwork=n,this.buildingManager=i,this.economy=r,this.sound=a,this.sceneManager=o,this.raycaster=new Ka,this.mouse=new xt,this.plane=new pn(new C(0,1,0),0),this.mode="home",this.selectedBuildingType=null,this.relocatingBuilding=null,this.isPointerDown=!1,this.lastGridTile=null,this.pointerStartPos={x:0,y:0},this.pointerCurrentPos={x:0,y:0},this.hasMovedPastThreshold=!1,this.maxCityRadius=15,this.onSelectBuilding=null,this.onHarvest=null,this.onInventoryPlaced=null,this.onOutOfRoads=null,this.onRoadUpdated=null;const c=this.tileSize;this.cursorMesh=new G(new ct(c*.95,.2,c*.95),new Ce({color:58879,transparent:!0,opacity:.45})),this.cursorMesh.position.y=.1,this.cursorMesh.visible=!1,this.scene.add(this.cursorMesh),this._initEvents()}get tileSize(){return this.roadNetwork?this.roadNetwork.tileSize:5.5}_initEvents(){window.addEventListener("pointerdown",this.onPointerDown.bind(this)),window.addEventListener("pointermove",this.onPointerMove.bind(this)),window.addEventListener("pointerup",this.onPointerUp.bind(this))}setMode(t,e=null){if(this.mode=t,this.selectedBuildingType=null,this.relocatingBuilding=null,t==="home"||t==="design_select"?document.body.style.cursor="grab":t==="draw_road"||t==="erase_road"?document.body.style.cursor="crosshair":document.body.style.cursor="default",this.cursorMesh.visible=t==="draw_road"||t==="erase_road"||t==="place_inventory"||t==="relocate",t==="draw_road")this.cursorMesh.material.color.setHex(16771899),this.cursorMesh.scale.set(1,1,1);else if(t==="erase_road")this.cursorMesh.material.color.setHex(16007990),this.cursorMesh.scale.set(1,1,1);else if(t==="place_inventory"&&e){this.selectedBuildingType=e;const n=this.buildingManager.catalog[e],i=n&&n.footprint||1;this.cursorMesh.scale.set(i,1,i),this.cursorMesh.material.color.setHex(58998)}else if(t==="relocate"&&e){this.relocatingBuilding=e;const n=this.buildingManager.catalog[e.type],i=n&&n.footprint||1;this.cursorMesh.scale.set(i,1,i),this.cursorMesh.material.color.setHex(58879)}}getWorldIntersection(t){this.mouse.x=t.clientX/window.innerWidth*2-1,this.mouse.y=-(t.clientY/window.innerHeight)*2+1,this.raycaster.setFromCamera(this.mouse,this.camera);const e=new C;return this.raycaster.ray.intersectPlane(this.plane,e)?e:null}worldToGrid(t){const e=Math.round(t.x/this.tileSize),n=Math.round(t.z/this.tileSize);return{gx:e,gz:n}}findBuildingFromRaycast(t){this.mouse.x=t.clientX/window.innerWidth*2-1,this.mouse.y=-(t.clientY/window.innerHeight)*2+1,this.raycaster.setFromCamera(this.mouse,this.camera);const e=[];this.buildingManager.buildings.forEach(i=>{i.mesh&&e.push(i.mesh),i.bubbleMesh&&e.push(i.bubbleMesh)});const n=this.raycaster.intersectObjects(e,!0);if(n.length>0)for(const i of n){let r=i.object;for(;r&&r!==this.scene;){if(r.userData&&r.userData.parentBuilding)return r.userData.parentBuilding;const a=this.buildingManager.buildings.find(o=>o.mesh===r||o.bubbleMesh===r);if(a)return a;r=r.parent}}return null}onPointerDown(t){if(t.button!==0||t.target.closest("#ui-container button, #ui-container .modal-backdrop, #ui-container .build-drawer, #ui-container .design-bottom-drawer, #ui-container .shop-screen, #ui-container .blueprint-card"))return;this.isPointerDown=!0,this.pointerStartPos={x:t.clientX,y:t.clientY},this.pointerCurrentPos={x:t.clientX,y:t.clientY},this.hasMovedPastThreshold=!1;const e=this.getWorldIntersection(t);if(!e)return;const{gx:n,gz:i}=this.worldToGrid(e);this.lastGridTile={gx:n,gz:i},(this.mode==="draw_road"||this.mode==="erase_road"||this.mode==="place_inventory"||this.mode==="relocate")&&this.handleTileAction(n,i,e,t)}onPointerMove(t){const e=this.getWorldIntersection(t);if(e){const{gx:n,gz:i}=this.worldToGrid(e),r=Math.hypot(n,i)>this.maxCityRadius;if(this.cursorMesh.visible)if(this.cursorMesh.position.set(n*this.tileSize,.12,i*this.tileSize),r)this.cursorMesh.material.color.setHex(16717636);else if(this.mode==="draw_road"){const a=this.economy.getInventoryCount("road")>0;this.cursorMesh.material.color.setHex(a?16771899:16732754)}else this.mode==="erase_road"?this.cursorMesh.material.color.setHex(16007990):this.mode==="place_inventory"&&this.cursorMesh.material.color.setHex(58998);this.isPointerDown&&(this.mode==="draw_road"||this.mode==="erase_road")&&(!this.lastGridTile||this.lastGridTile.gx!==n||this.lastGridTile.gz!==i)&&(this.lastGridTile={gx:n,gz:i},this.handleTileAction(n,i,e,t))}if(this.isPointerDown&&(this.mode==="home"||this.mode==="design_select")){const n=t.clientX-this.pointerCurrentPos.x,i=t.clientY-this.pointerCurrentPos.y;this.pointerCurrentPos={x:t.clientX,y:t.clientY},Math.hypot(t.clientX-this.pointerStartPos.x,t.clientY-this.pointerStartPos.y)>4&&(this.hasMovedPastThreshold=!0),this.hasMovedPastThreshold&&this.sceneManager&&(this.sceneManager.panBy(n,i),document.body.style.cursor="grabbing")}}onPointerUp(t){if(this.isPointerDown){if(this.isPointerDown=!1,document.body.style.cursor="",(this.mode==="home"||this.mode==="design_select")&&!this.hasMovedPastThreshold){const e=this.getWorldIntersection(t);if(e){const{gx:n,gz:i}=this.worldToGrid(e);this.handleTileAction(n,i,e,t)}}this.lastGridTile=null,this.hasMovedPastThreshold=!1}}handleTileAction(t,e,n,i){const r=Math.hypot(t,e)>this.maxCityRadius;if(this.mode==="home"){const a=this.findBuildingFromRaycast(i)||this.buildingManager.buildings.find(o=>Math.abs(o.gx-t)<=1&&Math.abs(o.gz-e)<=1);if(!a)return;if(a.produceType&&(a.stored||0)>=12){const o=this.buildingManager.collectBuilding(a);o&&(this.sound.playCollectChime(),this.onHarvest&&this.onHarvest({type:o.type,amount:o.amount,clientX:i.clientX,clientY:i.clientY,worldPos:a.mesh.position}))}else this.selectedBuilding=a,this.onSelectBuilding&&this.onSelectBuilding(this.selectedBuilding),this.sound.playClick();return}if(!r){if(this.mode==="draw_road"){if(this.roadNetwork.hasRoad(t,e))return;if(this.economy.getInventoryCount("road")<=0){this.onOutOfRoads&&this.onOutOfRoads();return}this.roadNetwork.addRoad(t,e)&&(this.economy.consumeFromInventory("road"),this.sound.playPlace(),this.onRoadUpdated&&this.onRoadUpdated());return}if(this.mode==="erase_road"){this.roadNetwork.removeRoad(t,e)&&(this.economy.addToInventory("road",1),this.sound.playClick(),this.onRoadUpdated&&this.onRoadUpdated());return}if(this.mode==="place_inventory"&&this.selectedBuildingType){const a=this.selectedBuildingType;if(this.economy.getInventoryCount(a)<=0){alert("You have no more of this item in your inventory! Visit the Shop to purchase more."),this.setMode("design_select");return}if(this.buildingManager.buildings.some(h=>Math.abs(h.gx-t)<=1&&Math.abs(h.gz-e)<=1)){this.sound.playCrash(.3);return}this.economy.consumeFromInventory(a),this.buildingManager.addBuilding(a,t,e,1)&&(this.sound.playPlace(),this.onInventoryPlaced&&this.onInventoryPlaced(a),this.economy.getInventoryCount(a)<=0&&this.setMode("design_select"));return}if(this.mode==="relocate"&&this.relocatingBuilding){this.buildingManager.moveBuilding(this.relocatingBuilding,t,e),this.relocatingBuilding.bubbleMesh&&this.relocatingBuilding.bubbleMesh.position.set(t*this.tileSize,5,e*this.tileSize),this.sound.playPlace(),this.setMode("design_select");return}if(this.mode==="design_select"){const a=this.findBuildingFromRaycast(i)||this.buildingManager.buildings.find(o=>Math.abs(o.gx-t)<=1&&Math.abs(o.gz-e)<=1);this.selectedBuilding=a||null,this.onSelectBuilding&&this.onSelectBuilding(this.selectedBuilding),a&&this.sound.playClick()}}}updateCamera(t){this.camera=t}}class kp{constructor(t,e,n,i){this.scene=t,this.camera=e,this.assetFactory=n,this.sound=i,this.mesh=this.assetFactory.createAttackVehicle(),this.scene.add(this.mesh),this.position=new C(0,0,0),this.heading=0,this.speed=0,this.maxForwardSpeed=30,this.maxReverseSpeed=-12,this.acceleration=24,this.braking=36,this.friction=8,this.turnSpeed=2.4,this.driftFactor=0,this.verticalY=0,this.velocityY=0,this.gravity=-36,this.isAirborne=!1,this.maxHp=500,this.hp=500,this.maxShield=200,this.shield=200,this.isCrashed=!1,this.isInvulnerable=!1,this.isInvisible=!1,this.isNitro=!1,this.damageImmunityTimer=0,this.inputs={forward:!1,reverse:!1,left:!1,right:!1,handbrake:!1,fire:!1},this.fireCooldown=0,this.fireInterval=.14,this.projectiles=[],this.projectilesGroup=new Wt,this.projectilesGroup.name="vehicle_projectiles",this.scene.add(this.projectilesGroup),this.camDistance=11,this.camHeight=4.2,this.camLookAhead=6,this.camCurrentPos=new C,this.camShake=0,this.originalMaterials=new Map,this._cacheOriginalMaterials(),this._initInputListeners()}_initInputListeners(){this.onJumpRequested=null,window.addEventListener("keydown",t=>{["KeyW","ArrowUp"].includes(t.code)&&(this.inputs.forward=!0),["KeyS","ArrowDown"].includes(t.code)&&(this.inputs.reverse=!0),["KeyA","ArrowLeft"].includes(t.code)&&(this.inputs.left=!0),["KeyD","ArrowRight"].includes(t.code)&&(this.inputs.right=!0),["ShiftLeft","ShiftRight","KeyC"].includes(t.code)&&(this.inputs.handbrake=!0),t.code==="KeyF"&&(this.inputs.fire=!0),(t.code==="Space"||t.code==="KeyJ")&&(t.target.closest("input, textarea")||(t.preventDefault(),this.onJumpRequested?this.onJumpRequested():this.triggerBigJump()))}),window.addEventListener("keyup",t=>{["KeyW","ArrowUp"].includes(t.code)&&(this.inputs.forward=!1),["KeyS","ArrowDown"].includes(t.code)&&(this.inputs.reverse=!1),["KeyA","ArrowLeft"].includes(t.code)&&(this.inputs.left=!1),["KeyD","ArrowRight"].includes(t.code)&&(this.inputs.right=!1),["ShiftLeft","ShiftRight","KeyC"].includes(t.code)&&(this.inputs.handbrake=!1),t.code==="KeyF"&&(this.inputs.fire=!1)}),window.addEventListener("pointerdown",t=>{t.button===0&&this.mesh.visible&&!this.isCrashed&&(t.target.closest("#ui-container button, #ui-container .action-card, #ui-container .modal-backdrop, #ui-container .touch-btn")||(this.inputs.fire=!0))}),window.addEventListener("pointerup",t=>{t.button===0&&(this.inputs.fire=!1)})}_cacheOriginalMaterials(){this.mesh.traverse(t=>{t.isMesh&&t.material&&this.originalMaterials.set(t,t.material)})}setRoadNetwork(t){this.roadNetwork=t}spawnAt(t,e,n=0){this.position.set(t,0,e),this.heading=n,this.speed=0,this.verticalY=0,this.velocityY=0,this.isAirborne=!1,this.hp=this.maxHp,this.shield=this.maxShield,this.isCrashed=!1,this.damageImmunityTimer=0,this.mesh.visible=!0,this.mesh.position.set(t,0,e),this.mesh.rotation.set(0,n,0);const i=new C(Math.sin(this.heading),0,Math.cos(this.heading));this.camCurrentPos.copy(this.position).sub(i.clone().multiplyScalar(this.camDistance)).add(new C(0,this.camHeight,0)),this.camera.position.copy(this.camCurrentPos)}takeDamage(t){this.isInvulnerable||this.isCrashed||this.damageImmunityTimer>0||this.isAirborne||(this.damageImmunityTimer=.35,this.sound.playCrash(1.2),this.camShake=Math.min(2.5,this.camShake+.8),this.shield>0?(this.shield-=t,this.shield<0&&(this.hp+=this.shield,this.shield=0)):this.hp-=t,this.hp<=0&&(this.hp=0,this.isCrashed=!0,this.sound.playExplosion("huge")))}triggerBigJump(t=14,e=25){this.isAirborne||this.isCrashed||(this.isAirborne=!0,this.velocityY=e,this.speed=Math.max(this.speed+t,24),this.sound.playBigJump(),this.camShake=1.3)}setInvisibility(t){if(this.isInvisible=t,t){this.sound.playInvisibility();const e=new Ce({color:8444159,transparent:!0,opacity:.35,wireframe:!0});this.mesh.traverse(n=>{n.isMesh&&(n.material=e)})}else this.mesh.traverse(e=>{e.isMesh&&this.originalMaterials.has(e)&&(e.material=this.originalMaterials.get(e))})}setNitro(t){this.isNitro=t,t&&this.sound.playNitro(),this.mesh.userData.flames&&this.mesh.userData.flames.forEach(e=>{e.visible=t})}update(t){if(this.damageImmunityTimer=Math.max(0,this.damageImmunityTimer-t),this.isCrashed){this.sound.updateEngine(0,!1,!1),this.sound.updateDrift(0);return}const e=this.isNitro?this.maxForwardSpeed*1.7:this.maxForwardSpeed,n=this.isNitro?this.acceleration*1.8:this.acceleration;let i=!1;this.inputs.forward?(i=!0,this.speed=Math.min(e,this.speed+n*t)):this.inputs.reverse?this.speed=Math.max(this.maxReverseSpeed,this.speed-this.braking*t):this.speed>0?this.speed=Math.max(0,this.speed-this.friction*t):this.speed<0&&(this.speed=Math.min(0,this.speed+this.friction*t)),this.inputs.handbrake?(this.driftFactor=Math.min(1,this.driftFactor+t*3.5),this.speed*=Math.max(.75,1-t*.8)):this.driftFactor=Math.max(0,this.driftFactor-t*2.5);const r=(this.inputs.left?1:0)-(this.inputs.right?1:0),a=Math.abs(this.speed)/this.maxForwardSpeed;if(Math.abs(this.speed)>.5){const _=1+this.driftFactor*.6,p=this.speed>=0?1:-1;this.heading+=r*this.turnSpeed*_*p*t}const o=Math.sin(this.heading),c=Math.cos(this.heading),l=this.position.x+o*this.speed*t,h=this.position.z+c*this.speed*t;Math.hypot(l,h)<88?(this.position.x=l,this.position.z=h):(this.speed*=-.3,this.sound.playCrash(.4)),this.isAirborne&&(this.velocityY+=this.gravity*t,this.verticalY+=this.velocityY*t,this.verticalY<=0&&(this.verticalY=0,this.velocityY=0,this.isAirborne=!1,this.sound.playCrash(.8),this.camShake=.9)),this.mesh.position.set(this.position.x,this.verticalY,this.position.z),this.mesh.rotation.y=this.heading;const m=(this.inputs.forward?-.04:this.inputs.reverse?.05:0)+(this.isAirborne?this.velocityY*.015:0),g=-r*a*.08;if(this.mesh.rotation.x=m,this.mesh.rotation.z=g,this.mesh.userData.wheels){const _=this.speed/.45*t;this.mesh.userData.wheels.forEach((p,f)=>{p.children[0].rotation.x+=_,p.children[1].rotation.x+=_,f<2&&(p.rotation.y=r*.45)})}this.updateCamera(t),this.fireCooldown-=t,this.inputs.fire&&this.fireCooldown<=0&&!this.isCrashed&&this.mesh.visible&&(this.fireCannons(),this.fireCooldown=this.fireInterval),this.updateProjectiles(t,buildings,policeManager,destructionEngine),this.sound.updateEngine(a,i,!0),this.sound.updateDrift(this.driftFactor*(a>.3?1:0))}fireCannons(){if(this.isCrashed||!this.mesh.visible)return;const t=new C(Math.sin(this.heading),0,Math.cos(this.heading)),e=new C(Math.cos(this.heading),0,-Math.sin(this.heading)),n=new C(0,1,0),i=this.position.clone().add(t.clone().multiplyScalar(1.8)).sub(e.clone().multiplyScalar(.45)).add(n.clone().multiplyScalar(.65+this.verticalY)),r=this.position.clone().add(t.clone().multiplyScalar(1.8)).add(e.clone().multiplyScalar(.45)).add(n.clone().multiplyScalar(.65+this.verticalY));[i,r].forEach(a=>{const o=new qt(.08,.08,.9,6),c=new Ce({color:58879}),l=new G(o,c);l.position.copy(a),l.rotation.y=this.heading,l.rotation.x=Math.PI/2,this.projectilesGroup.add(l),this.projectiles.push({mesh:l,pos:a,velocity:t.clone().multiplyScalar(125),life:1.4})}),this.sound.playTurretFire()}updateProjectiles(t,e=[],n=null,i=null){for(let r=this.projectiles.length-1;r>=0;r--){const a=this.projectiles[r];a.life-=t,a.pos.addScaledVector(a.velocity,t),a.mesh.position.copy(a.pos);let o=!1;if(e&&i)for(let c of e){if(c.isDestroyed||!c.mesh)continue;const l=c.isMainGate?4.8:3.2;if(a.pos.distanceTo(c.mesh.position)<l){i.damageBuilding(c,65,e,n),o=!0;break}}if(!o&&n&&n.policeUnits){for(let c of n.policeUnits)if(!c.isDestroyed&&a.pos.distanceTo(c.position)<2.4){c.hp-=90,c.hp<=0&&n.destroyUnit(c),i&&i.spawnExplosion(a.pos.x,a.pos.y,a.pos.z,"small"),o=!0;break}}(o||a.life<=0)&&(this.projectilesGroup.remove(a.mesh),this.projectiles.splice(r,1))}}clearProjectiles(){this.projectiles.forEach(t=>{this.projectilesGroup.remove(t.mesh)}),this.projectiles=[]}updateCamera(t){const e=new C(Math.sin(this.heading),0,Math.cos(this.heading)),n=this.position.clone().add(e.clone().multiplyScalar(this.camLookAhead)).add(new C(0,1.5,0)),i=Math.abs(this.speed)/this.maxForwardSpeed*3.5,r=this.position.clone().sub(e.clone().multiplyScalar(this.camDistance+i)).add(new C(0,this.camHeight+this.verticalY*.4,0));if(this.camCurrentPos.lerp(r,t*6.5),this.camShake>0){const o=new C((Math.random()-.5)*this.camShake,(Math.random()-.5)*this.camShake,(Math.random()-.5)*this.camShake);this.camera.position.copy(this.camCurrentPos).add(o),this.camShake=Math.max(0,this.camShake-t*4)}else this.camera.position.copy(this.camCurrentPos);this.camera.lookAt(n);const a=this.isNitro?80:65;this.camera.fov=pl.lerp(this.camera.fov,a,t*5),this.camera.updateProjectionMatrix()}getSpeedMph(){return Math.round(Math.abs(this.speed)*2.237)}}class Hp{constructor(t,e,n,i){this.scene=t,this.assetFactory=e,this.sound=n,this.destruction=i,this.policeUnits=[],this.roadblocks=[],this.policeGroup=new Wt,this.policeGroup.name="police_pursuit_group",this.scene.add(this.policeGroup),this.totalWrecked=0,this.spawnTimer=0,this.maxPolice=4}spawnFromStations(t){!t||t.length===0||t.forEach(e=>{const n=e.mesh.position;this.spawnCruiser(n.x+(Math.random()-.5)*4,n.z+(Math.random()-.5)*4)})}spawnCruiser(t,e){if(this.policeUnits.length>=this.maxPolice)return;const n=this.assetFactory.createPoliceVehicle();n.position.set(t,0,e),this.policeGroup.add(n);const i={id:`cop_${Date.now()}_${Math.random()}`,mesh:n,position:new C(t,0,e),heading:Math.random()*Math.PI*2,speed:0,maxSpeed:16.5+Math.random()*2.5,acceleration:8.5,turnSpeed:1.5,hp:120,maxHp:120,ramCooldown:0,roadblockCooldown:4+Math.random()*6,isDestroyed:!1};this.policeUnits.push(i)}dropRoadblock(t,e,n){const i=this.assetFactory.createRoadblock();i.position.set(t,0,e),i.rotation.y=n,this.policeGroup.add(i);const r={mesh:i,position:new C(t,0,e),radius:2,hp:180,isDestroyed:!1};this.roadblocks.push(r),this.sound.playPlace()}update(t,e,n){if(!n)return;let i=1/0;for(let o=this.policeUnits.length-1;o>=0;o--){const c=this.policeUnits[o];if(c.isDestroyed)continue;const l=c.position.distanceTo(n.position);if(l<i&&(i=l),c.mesh.userData.redLight&&c.mesh.userData.blueLight){const h=Math.sin(e*16+o)>0;c.mesh.userData.redLight.material.emissiveIntensity=h?2.5:.2,c.mesh.userData.blueLight.material.emissiveIntensity=h?.2:2.5}if(n.isInvisible)c.speed=Math.max(5,c.speed-c.acceleration*t),c.heading+=Math.sin(e*2+o)*t*.8;else{let h=0,d=0;const u=7.2;for(let f=0;f<this.policeUnits.length;f++){if(o===f)continue;const M=this.policeUnits[f];if(M.isDestroyed)continue;const v=c.position.x-M.position.x,w=c.position.z-M.position.z,R=Math.hypot(v,w);if(R>.001&&R<u){const S=(u-R)/u;h+=v/R*S,d+=w/R*S}}const m=n.position.x-c.position.x+h*14,g=n.position.z-c.position.z+d*14;let p=Math.atan2(m,g)-c.heading;for(;p>Math.PI;)p-=Math.PI*2;for(;p<-Math.PI;)p+=Math.PI*2;if(c.heading+=Math.sign(p)*Math.min(Math.abs(p),c.turnSpeed*t),c.speed=Math.min(c.maxSpeed,c.speed+c.acceleration*t),c.roadblockCooldown-=t,c.roadblockCooldown<=0&&l>8&&l<22){const f=new C(Math.sin(c.heading),0,Math.cos(c.heading)),M=c.position.clone().add(f.multiplyScalar(4));this.dropRoadblock(M.x,M.z,c.heading+Math.PI/2),c.roadblockCooldown=12+Math.random()*6}if(c.ramCooldown=Math.max(0,(c.ramCooldown||0)-t),l<3.2&&!n.isAirborne){const f=c.position.clone().sub(n.position).normalize();if(f.length()<.1&&f.set(1,0,0),c.position.add(f.clone().multiplyScalar(3.2)),c.speed*=.35,c.ramCooldown<=0){const M=Math.round(18+Math.random()*6);if(n.takeDamage(M),c.hp-=35,c.ramCooldown=1.8,this.sound.playCrash(.7),c.hp<=0){this.destroyUnit(c);continue}}}}if(c.position.x+=Math.sin(c.heading)*c.speed*t,c.position.z+=Math.cos(c.heading)*c.speed*t,c.mesh.position.set(c.position.x,0,c.position.z),c.mesh.rotation.y=c.heading,c.mesh.userData.wheels){const h=c.speed/.38*t;c.mesh.userData.wheels.forEach(d=>{d.rotation.x+=h})}}const r=[];for(let o=0;o<this.policeUnits.length;o++){const c=this.policeUnits[o];if(!c.isDestroyed)for(let l=o+1;l<this.policeUnits.length;l++){const h=this.policeUnits[l];if(h.isDestroyed)continue;c.position.distanceTo(h.position)<2.8&&r.push([c,h])}}if(r.length>0){this.sound.playCrash(1.8);for(const[o,c]of r)if(!o.isDestroyed||!c.isDestroyed){const l=(o.position.x+c.position.x)/2,h=(o.position.z+c.position.z)/2;this.destruction&&this.destruction.spawnExplosion(l,1.2,h,"large"),this.sound.playExplosion("large"),o.isDestroyed||this.destroyUnit(o),c.isDestroyed||this.destroyUnit(c)}}if(this.policeUnits.filter(o=>!o.isDestroyed).length>0&&!n.isInvisible){const o=Math.max(.1,Math.min(1,1-i/90));this.sound.setSirenActive(!0,o)}else this.sound.setSirenActive(!1)}destroyUnit(t){if(t.isDestroyed)return;t.isDestroyed=!0,this.totalWrecked++,this.policeGroup.remove(t.mesh),this.destruction&&this.destruction.spawnExplosion(t.position.x,1,t.position.z,"medium"),this.sound.playExplosion("medium");const e=this.policeUnits.indexOf(t);e!==-1&&this.policeUnits.splice(e,1)}damageAt(t,e,n,i){const r=new xt(t,e);for(let a=this.policeUnits.length-1;a>=0;a--){const o=this.policeUnits[a];if(o.isDestroyed)continue;const c=new xt(o.position.x,o.position.z);r.distanceTo(c)<=n&&(o.hp-=i,o.hp<=0&&this.destroyUnit(o))}for(let a=this.roadblocks.length-1;a>=0;a--){const o=this.roadblocks[a];if(o.isDestroyed)continue;const c=new xt(o.position.x,o.position.z);r.distanceTo(c)<=n&&(o.hp-=i,o.hp<=0&&(o.isDestroyed=!0,this.policeGroup.remove(o.mesh),this.destruction&&this.destruction.spawnExplosion(o.position.x,.5,o.position.z,"small"),this.roadblocks.splice(a,1)))}}checkRoadblockCollisions(t){if(!t.isAirborne)for(let e=this.roadblocks.length-1;e>=0;e--){const n=this.roadblocks[e];if(n.isDestroyed)continue;t.position.distanceTo(n.position)<2.5&&(t.takeDamage(40),t.speed*=.3,n.hp-=100,n.hp<=0&&(n.isDestroyed=!0,this.policeGroup.remove(n.mesh),this.destruction&&this.destruction.spawnExplosion(n.position.x,.5,n.position.z,"small"),this.roadblocks.splice(e,1)))}}clear(){this.policeUnits.forEach(t=>{this.policeGroup.remove(t.mesh)}),this.policeUnits=[],this.roadblocks.forEach(t=>{this.policeGroup.remove(t.mesh)}),this.roadblocks=[],this.totalWrecked=0,this.sound.setSirenActive(!1)}}class Vp{constructor(t,e,n,i){this.scene=t,this.sound=e,this.destruction=n,this.police=i,this.cards=[{id:"invisibility",name:"Invisibility",icon:"👻",key:"1",hotkey:"1",cooldown:14,currentCooldown:0,duration:5,activeTimer:0,desc:"Cloak vehicle for 5s. Police & turrets lose lock-on."},{id:"bomb",name:"Drop Bomb",icon:"💣",key:"2",hotkey:"2",cooldown:7,currentCooldown:0,desc:"Eject heavy explosive behind vehicle to wipe pursuers."},{id:"missiles",name:"Twin Missiles",icon:"🚀",key:"3",hotkey:"3",cooldown:6,currentCooldown:0,desc:"Fire twin forward rockets that blast roadblocks & cruisers."},{id:"jump",name:"Big Jump",icon:"🦘",key:"SPACE / 4",hotkey:"4",cooldown:3.5,currentCooldown:0,desc:"Hydraulic booster launches vehicle high over roadblocks & police."},{id:"nitro",name:"Nitro Surge",icon:"🔥",key:"5",hotkey:"5",cooldown:9,currentCooldown:0,duration:3.5,activeTimer:0,desc:"Supercharge speed and ramming power for 3.5 seconds."}],this.droppedBombs=[],this.activeMissiles=[],this.inWorldCards=[],this.cardObjectsGroup=new Wt,this.cardObjectsGroup.name="card_abilities_group",this.scene.add(this.cardObjectsGroup),this.onCooldownUpdate=null,this.onCardCollected=null,this._initKeyboard()}_initKeyboard(){window.addEventListener("keydown",t=>{if(t.target.closest("input, textarea"))return;const e=this.cards.find(n=>n.hotkey===t.key||n.key===t.key);e&&this.playerRef&&!this.playerRef.isCrashed&&this.activateCard(e.id),(t.code==="Space"||t.code==="KeyJ")&&this.playerRef&&!this.playerRef.isCrashed&&(t.preventDefault(),this.activateCard("jump"))})}setPlayer(t,e){this.playerRef=t,this.buildingsList=e,this.playerRef&&(this.playerRef.onJumpRequested=()=>{this.activateCard("jump")})}canUse(t){const e=this.cards.find(n=>n.id===t);return e&&e.currentCooldown<=0&&this.playerRef&&!this.playerRef.isCrashed}activateCard(t){const e=this.cards.find(n=>n.id===t);return!e||!this.playerRef||this.playerRef.isCrashed?!1:e.id==="jump"&&e.currentCooldown>0?(this.playerRef.isAirborne||this.playerRef.triggerBigJump(-4,16.5),!1):e.currentCooldown>0?!1:(e.id==="invisibility"?(e.activeTimer=e.duration,this.playerRef.setInvisibility(!0)):e.id==="bomb"?this._spawnBomb():e.id==="missiles"?this._fireMissiles():e.id==="jump"?this.playerRef.triggerBigJump(14,25):e.id==="nitro"&&(e.activeTimer=e.duration,this.playerRef.setNitro(!0)),e.currentCooldown=e.cooldown,this.onCooldownUpdate&&this.onCooldownUpdate(this.cards),!0)}_spawnBomb(){const t=this.playerRef,e=new C(Math.sin(t.heading),0,Math.cos(t.heading)),n=t.position.clone().sub(e.multiplyScalar(2.6)).add(new C(0,.4,0)),i=new In(.55,12,12),r=new zt({color:2171169,metalness:.8,roughness:.3,emissive:16717636,emissiveIntensity:.5}),a=new G(i,r);a.position.copy(n),this.cardObjectsGroup.add(a),this.droppedBombs.push({mesh:a,pos:n,timer:1.5,flash:0}),this.sound.playBombDrop()}_fireMissiles(){const t=this.playerRef,e=new C(Math.sin(t.heading),0,Math.cos(t.heading)),n=new C(Math.cos(t.heading),0,-Math.sin(t.heading));[-.7,.7].forEach(r=>{const a=t.position.clone().add(n.clone().multiplyScalar(r)).add(new C(0,1.4,0)).add(e.clone().multiplyScalar(1.5)),o=new qt(.14,.14,1.1,8);o.rotateX(Math.PI/2);const c=new zt({color:3622735,emissive:16727296,emissiveIntensity:.8}),l=new G(o,c);l.position.copy(a),l.rotation.y=t.heading,this.cardObjectsGroup.add(l),this.activeMissiles.push({mesh:l,velocity:e.clone().multiplyScalar(48),life:2.2})}),this.sound.playMissileLaunch()}update(t,e){let n=!1;this.cards.forEach(i=>{i.currentCooldown>0&&(i.currentCooldown=Math.max(0,i.currentCooldown-t),n=!0),i.activeTimer>0&&(i.activeTimer-=t,i.activeTimer<=0&&(i.id==="invisibility"&&this.playerRef?this.playerRef.setInvisibility(!1):i.id==="nitro"&&this.playerRef&&this.playerRef.setNitro(!1)))}),n&&this.onCooldownUpdate&&this.onCooldownUpdate(this.cards);for(let i=this.droppedBombs.length-1;i>=0;i--){const r=this.droppedBombs[i];if(r.timer-=t,r.flash+=t*15,r.mesh.material.emissiveIntensity=Math.sin(r.flash)>0?2:.2,r.timer<=0){const a=r.pos;this.cardObjectsGroup.remove(r.mesh),this.droppedBombs.splice(i,1),this.destruction.spawnExplosion(a.x,1.2,a.z,"huge"),this.sound.playExplosion("huge");const o=14,c=350;this.police.damageAt(a.x,a.z,o,c),this.buildingsList&&this.buildingsList.forEach(l=>{!l.isDestroyed&&l.mesh&&a.distanceTo(l.mesh.position)<=o&&this.destruction.damageBuilding(l,c,this.buildingsList,this.police)})}}for(let i=this.activeMissiles.length-1;i>=0;i--){const r=this.activeMissiles[i];r.life-=t,r.mesh.position.addScaledVector(r.velocity,t);let a=!1;const o=r.mesh.position;for(let c of this.police.policeUnits)if(!c.isDestroyed&&o.distanceTo(c.position)<2.5){this.police.destroyUnit(c),a=!0;break}if(!a&&this.buildingsList){for(let c of this.buildingsList)if(!c.isDestroyed&&c.mesh&&o.distanceTo(c.mesh.position)<3.2){this.destruction.damageBuilding(c,300,this.buildingsList,this.police),a=!0;break}}(a||r.life<=0)&&(this.cardObjectsGroup.remove(r.mesh),this.activeMissiles.splice(i,1),a&&(this.destruction.spawnExplosion(o.x,o.y,o.z,"medium"),this.sound.playExplosion("medium")))}if(this.playerRef&&!this.playerRef.isCrashed){const i=this.playerRef.position;for(let r of this.inWorldCards)r.active?(r.mesh.rotation.y+=t*2.2,r.mesh.position.y=1.3+Math.sin(e*3.5+r.phase)*.35,i.distanceTo(r.mesh.position)<3&&this._collectInWorldCard(r)):(r.respawnTimer-=t,r.respawnTimer<=0&&(r.active=!0,r.mesh.visible=!0))}}_collectInWorldCard(t){if(t.active=!1,t.mesh.visible=!1,t.respawnTimer=14,this.sound.playUpgrade(),this.destruction&&this.destruction.spawnExplosion(t.mesh.position.x,1.4,t.mesh.position.z,"small"),t.type==="jump"){this.playerRef.triggerBigJump(16,27);const e=this.cards.find(n=>n.id==="jump");e&&(e.currentCooldown=0),this.onCardCollected&&this.onCardCollected({title:"🦘 MEGA JUMP CARD COLLECTED!",desc:"Catapulted high over all roadblocks and police cruisers!"})}else if(t.type==="nitro"){this.playerRef.setNitro(!0);const e=this.cards.find(n=>n.id==="nitro");e&&(e.activeTimer=4.5,e.currentCooldown=0),this.onCardCollected&&this.onCardCollected({title:"🔥 NITRO SURGE CARD COLLECTED!",desc:"Supercharged 4.5s turbo speed & ramming boost!"})}else if(t.type==="missiles"){this._fireMissiles();const e=this.cards.find(n=>n.id==="missiles");e&&(e.currentCooldown=0),this.onCardCollected&&this.onCardCollected({title:"🚀 MISSILES SALVO CARD COLLECTED!",desc:"Twin forward rockets blast path clear!"})}else if(t.type==="bomb"){this._spawnBomb();const e=this.cards.find(n=>n.id==="bomb");e&&(e.currentCooldown=0),this.onCardCollected&&this.onCardCollected({title:"💣 CLUSTER BOMB CARD COLLECTED!",desc:"Heavy explosive ejected behind to wipe pursuers!"})}else t.type==="shield"&&(this.playerRef.shield=this.playerRef.maxShield,this.onCardCollected&&this.onCardCollected({title:"🛡️ SHIELD REPAIR CARD COLLECTED!",desc:"Vehicle armor shields fully recharged to 100%!"}));this.onCooldownUpdate&&this.onCooldownUpdate(this.cards)}spawnInWorldCards(t,e=[]){this.clearInWorldCards();const n=[{type:"jump",icon:"🦘",color:58879,label:"BIG JUMP"},{type:"nitro",icon:"🔥",color:16748800,label:"NITRO"},{type:"missiles",icon:"🚀",color:7798531,label:"MISSILES"},{type:"bomb",icon:"💣",color:16717636,label:"BOMB"},{type:"shield",icon:"🛡️",color:2718207,label:"SHIELD"}],i=[];t&&t.getRoadSegments&&t.getRoadSegments().forEach(l=>{const h=(l.x1+l.x2)/2,d=(l.z1+l.z2)/2;Math.hypot(h,d)<78&&i.push(new C(h,1.3,d))}),[25,45,65].forEach((c,l)=>{const h=4+l*2;for(let d=0;d<h;d++){const u=d/h*Math.PI*2+l*.4,m=Math.cos(u)*c,g=Math.sin(u)*c;i.push(new C(m,1.3,g))}});const a=i.sort(()=>Math.random()-.5);a.slice(0,Math.min(12,a.length)).forEach((c,l)=>{const h=n[l%n.length],d=this._createInWorldCardMesh(h.icon,h.color,h.label);d.position.copy(c),this.cardObjectsGroup.add(d),this.inWorldCards.push({type:h.type,mesh:d,active:!0,respawnTimer:0,phase:Math.random()*Math.PI*2})})}_createInWorldCardMesh(t,e,n){const i=new Wt,r=new ct(1.6,2.3,.12),a=new zt({color:791588,metalness:.85,roughness:.25,emissive:e,emissiveIntensity:.35}),o=new G(r,a);i.add(o);const c=new ct(1.68,2.38,.14),l=new Ce({color:e,wireframe:!0}),h=new G(c,l);i.add(h);const d=document.createElement("canvas");d.width=256,d.height=360;const u=d.getContext("2d"),m=u.createLinearGradient(0,0,0,360);m.addColorStop(0,"#0d1829"),m.addColorStop(1,"#050b14"),u.fillStyle=m,u.fillRect(0,0,256,360);const g="#"+e.toString(16).padStart(6,"0");u.strokeStyle=g,u.lineWidth=12,u.strokeRect(6,6,244,348),u.font="84px system-ui, sans-serif",u.textAlign="center",u.textBaseline="middle",u.fillText(t,128,140),u.fillStyle="#ffffff",u.font="bold 26px system-ui, sans-serif",u.fillText(n,128,255),u.fillStyle=g,u.font="bold 18px system-ui, sans-serif",u.fillText("⚡ CITY POWERUP ⚡",128,295);const _=new mr(d),p=new on(1.5,2.2),f=new Ce({map:_,transparent:!0,side:Le}),M=new G(p,f);M.position.z=.07,i.add(M);const v=M.clone();v.position.z=-.07,v.rotation.y=Math.PI,i.add(v);const w=new Pi(1.1,1.4,24);w.rotateX(-Math.PI/2);const R=new Ce({color:e,side:Le,transparent:!0,opacity:.65}),S=new G(w,R);return S.position.y=-1.2,i.add(S),i}clearInWorldCards(){this.inWorldCards.forEach(t=>{this.cardObjectsGroup.remove(t.mesh)}),this.inWorldCards=[]}reset(){this.cards.forEach(t=>{t.currentCooldown=0,t.activeTimer=0}),this.droppedBombs.forEach(t=>this.cardObjectsGroup.remove(t.mesh)),this.droppedBombs=[],this.activeMissiles.forEach(t=>this.cardObjectsGroup.remove(t.mesh)),this.activeMissiles=[],this.clearInWorldCards(),this.onCooldownUpdate&&this.onCooldownUpdate(this.cards)}}class Wp{constructor(t,e){this.scene=t,this.sound=e,this.projectiles=[],this.turrets=[],this.projectileGroup=new Wt,this.projectileGroup.name="turret_projectiles",this.scene.add(this.projectileGroup),this.bulletGeo=new qt(.12,.12,.8,6),this.bulletGeo.rotateX(Math.PI/2),this.bulletMat=new Ce({color:16727296})}registerGates(t){this.turrets=[],t.forEach(e=>{e.mesh&&this.turrets.push({parent:e,pos:e.mesh.position.clone().add(new C(0,5.4,0)),range:35,cooldown:0,fireInterval:1.4,damage:22})})}update(t,e){if(!(!e||e.isCrashed)){this.turrets.forEach(n=>{n.parent.isDestroyed||(n.cooldown-=t,e.isInvisible||n.pos.distanceTo(e.position)<=n.range&&n.cooldown<=0&&(this.fireBullet(n.pos,e.position,n.damage),n.cooldown=n.fireInterval+Math.random()*.4))});for(let n=this.projectiles.length-1;n>=0;n--){const i=this.projectiles[n];if(i.life-=t,i.mesh.position.addScaledVector(i.velocity,t),i.mesh.position.distanceTo(e.position.clone().add(new C(0,.8,0)))<2&&!e.isAirborne){e.takeDamage(i.damage),this.removeProjectile(n);continue}(i.life<=0||i.mesh.position.y<=0)&&this.removeProjectile(n)}}}fireBullet(t,e,n){const i=new G(this.bulletGeo,this.bulletMat);i.position.copy(t);const r=e.clone().add(new C(0,.6,0));i.lookAt(r);const a=r.clone().sub(t).normalize(),o=42;this.projectileGroup.add(i),this.projectiles.push({mesh:i,velocity:a.multiplyScalar(o),damage:n,life:2}),this.sound.playTurretFire()}removeProjectile(t){const e=this.projectiles[t];e&&(this.projectileGroup.remove(e.mesh),this.projectiles.splice(t,1))}clear(){this.projectiles.forEach(t=>this.projectileGroup.remove(t.mesh)),this.projectiles=[],this.turrets=[]}}class Xp{constructor(t,e,n){this.scene=t,this.sound=e,this.assetFactory=n,this.particles=[],this.debris=[],this.particleGroup=new Wt,this.particleGroup.name="destruction_effects",this.scene.add(this.particleGroup),this.totalBuildingsCount=0,this.destroyedBuildingsCount=0,this.lootedResources={cash:0,iron:0,wood:0},this.onDestructionUpdate=null}reset(t){this.clearEffects(),this.totalBuildingsCount=t.filter(e=>!e.isMainGate).length,this.destroyedBuildingsCount=0,this.lootedResources={cash:0,iron:0,wood:0},t.forEach(e=>{e.isDestroyed=!1,e.hp=e.maxHp,e.mesh&&(e.mesh.visible=!0)}),this.onDestructionUpdate&&this.onDestructionUpdate(this.getStats())}getStats(){const t=this.totalBuildingsCount>0?Math.min(100,Math.round(this.destroyedBuildingsCount/this.totalBuildingsCount*100)):0;let e=0;return t>=25&&(e=1),t>=60&&(e=2),t>=95&&(e=3),{percentage:t,stars:e,destroyed:this.destroyedBuildingsCount,total:this.totalBuildingsCount,looted:{...this.lootedResources}}}spawnExplosion(t,e,n,i="medium"){const r=i==="huge"?6:i==="large"?4:2.5,a=i==="huge"?24:14,o=new In(r*.5,12,12),c=new Ce({color:16733986,transparent:!0,opacity:.95}),l=new G(o,c);l.position.set(t,e,n),this.particleGroup.add(l),this.particles.push({mesh:l,life:.6,maxLife:.6,update:(u,m)=>{const g=1-m.life/m.maxLife;l.scale.setScalar(1+g*2.5),c.opacity=Math.max(0,1-g),g>.4&&c.color.setHex(3355443)}});const h=new ct(.5,.5,.5),d=[this.assetFactory.materials.concrete,this.assetFactory.materials.brickRed,this.assetFactory.materials.woodDark,this.assetFactory.materials.steel];for(let u=0;u<a;u++){const m=d[Math.floor(Math.random()*d.length)],g=new G(h,m);g.position.set(t,e,n),g.castShadow=!0,this.particleGroup.add(g);const _=Math.random()*Math.PI*2,p=8+Math.random()*(i==="huge"?20:12),f=new C(Math.cos(_)*p,5+Math.random()*14,Math.sin(_)*p);this.debris.push({mesh:g,velocity:f,rotSpeed:new C(Math.random()*8,Math.random()*8,Math.random()*8),life:2.2})}}damageBuilding(t,e,n,i){t.isDestroyed||(t.hp-=e,t.hp<=0?this.destroyBuilding(t,n,i):(this.spawnExplosion(t.mesh.position.x,1.5,t.mesh.position.z,"small"),this.sound.playCrash(.7)))}destroyBuilding(t,e,n){if(t.isDestroyed)return;t.isDestroyed=!0,t.hp=0,t.mesh&&(t.mesh.visible=!1),t.isMainGate||this.destroyedBuildingsCount++;const i=t.mesh.position,r=t.isExplosive,a=t.level||1,o={cash:Math.round((t.isExplosive?250:120)*a),iron:Math.round(80*a),wood:Math.round(90*a)};if(this.lootedResources.cash+=o.cash,this.lootedResources.iron+=o.iron,this.lootedResources.wood+=o.wood,this.sound.playLoot(),r){this.spawnExplosion(i.x,2,i.z,"huge"),this.sound.playExplosion("huge");const c=16,l=350;n&&n.damageAt(i.x,i.z,c,l),e&&e.forEach(h=>{h!==t&&!h.isDestroyed&&h.mesh&&i.distanceTo(h.mesh.position)<=c&&this.damageBuilding(h,l,e,n)})}else this.spawnExplosion(i.x,2,i.z,"large"),this.sound.playExplosion("large");this.onDestructionUpdate&&this.onDestructionUpdate(this.getStats())}checkVehicleCollisions(t,e,n){if(t.isCrashed)return;const i=t.position,r=Math.abs(t.speed);for(let a=0;a<e.length;a++){const o=e[a];if(o.isDestroyed||!o.mesh)continue;const c=o.mesh.position,l=i.x-c.x,h=i.z-c.z,d=Math.hypot(l,h),u=o.isMainGate?4.8:3.2;if(d<u&&!t.isAirborne){const m=u-d,g=d>.001?l/d:0,_=d>.001?h/d:1;t.position.x+=g*m,t.position.z+=_*m,r>1.5&&(t.speed*=.45,this.sound.playCrash(Math.min(.7,r/28)),t.camShake=Math.min(1,t.camShake+.25))}}}update(t){for(let e=this.particles.length-1;e>=0;e--){const n=this.particles[e];n.life-=t,n.update(t,n),n.life<=0&&(this.particleGroup.remove(n.mesh),this.particles.splice(e,1))}for(let e=this.debris.length-1;e>=0;e--){const n=this.debris[e];n.life-=t,n.velocity.y-=26*t,n.mesh.position.addScaledVector(n.velocity,t),n.mesh.rotation.x+=n.rotSpeed.x*t,n.mesh.rotation.y+=n.rotSpeed.y*t,n.mesh.rotation.z+=n.rotSpeed.z*t,n.mesh.position.y<=.2&&(n.mesh.position.y=.2,n.velocity.y=-n.velocity.y*.4,n.velocity.x*=.7,n.velocity.z*=.7),n.life<=0&&(this.particleGroup.remove(n.mesh),this.debris.splice(e,1))}}clearEffects(){this.particles.forEach(t=>this.particleGroup.remove(t.mesh)),this.particles=[],this.debris.forEach(t=>this.particleGroup.remove(t.mesh)),this.debris=[]}}class qp{constructor({sceneManager:t,buildingManager:e,vehicleController:n,policeManager:i,cardSystem:r,turretSystem:a,destructionEngine:o,economyManager:c,soundManager:l,uiManager:h,assetFactory:d}){this.scene=t,this.buildings=e,this.vehicle=n,this.police=i,this.cards=r,this.turrets=a,this.destruction=o,this.economy=c,this.sound=l,this.ui=h,this.assetFactory=d,this.state="IDLE",this.selectedGate=null,this.beaconsGroup=new Wt,this.beaconsGroup.name="tactical_gate_beacons",this.scene.scene.add(this.beaconsGroup),this.raycaster=new Ka,this.mouse=new xt,this.attackStats={destroyedCount:0,looted:{cash:0,iron:0,wood:0},policeWrecked:0,stars:0,percentage:0},this.cards.onCardCollected=u=>{this.ui.showToast(`${u.title} ${u.desc}`,2600)},this._bindReconPointer()}_bindReconPointer(){window.addEventListener("pointerdown",t=>{if(this.state!=="RECON"||t.target.closest("#ui-container button"))return;this.mouse.x=t.clientX/window.innerWidth*2-1,this.mouse.y=-(t.clientY/window.innerHeight)*2+1,this.raycaster.setFromCamera(this.mouse,this.scene.activeCamera);const e=this.buildings.getMainGates(),n=[];e.forEach(r=>{r.mesh&&n.push(r.mesh)}),this.beaconsGroup.children.forEach(r=>{n.push(r)});const i=this.raycaster.intersectObjects(n,!0);if(i.length>0){let r=null;for(let a of i){let o=a.object;for(;o&&o!==this.scene.scene;){const c=e.find(l=>l.mesh===o||o.name&&o.name.includes(l.id));if(c){r=c;break}if(o.userData&&o.userData.parentGate){r=o.userData.parentGate;break}o=o.parent}if(r)break}r&&(this.sound.playClick(),this.triggerCinematicBreach(r))}})}startRecon(){for(this.state="RECON",this.sound.ensureStarted(),this.scene.setCameraMode("recon"),this.vehicle.mesh.visible=!1;this.beaconsGroup.children.length>0;)this.beaconsGroup.remove(this.beaconsGroup.children[0]);this.buildings.getMainGates().forEach(e=>{const n=this.assetFactory.createGateBeacon(e.name);n.position.copy(e.mesh.position),n.userData.parentGate=e,this.beaconsGroup.add(n)}),this.ui.showTacticalReconBanner(()=>{this.abortRecon()})}abortRecon(){this.clearBeacons(),this.state="IDLE",this.scene.setCameraMode("builder"),this.ui.hideTacticalReconBanner(),this.ui.showBuilderHUD()}triggerCinematicBreach(t){this.selectedGate=t,this.state="SWOOP",this.clearBeacons(),this.ui.hideTacticalReconBanner(),this.ui.showMappingScanEffect(t.name),this.sound.playUpgrade();const e=t.mesh.position,n=e.clone().normalize();n.length()<.1&&n.set(0,0,1);const i=16,r=e.x+n.x*i,a=e.z+n.z*i,o=Math.atan2(-n.x,-n.z);this.vehicle.spawnAt(r,a,o),this.vehicle.mesh.visible=!0;const c=this.scene.reconCamera.position.clone(),l=new C(0,0,0),h=new C(Math.sin(o),0,Math.cos(o)),d=this.vehicle.position.clone().sub(h.clone().multiplyScalar(this.vehicle.camDistance)).add(new C(0,this.vehicle.camHeight,0)),u=this.vehicle.position.clone().add(h.clone().multiplyScalar(this.vehicle.camLookAhead));this.scene.startCameraSwoop(c,l,d,u,1.5,()=>{this.launchBreach(t)})}launchBreach(t){this.state="COMBAT",this.ui.hideMappingScanEffect(),this.ui.showCombatHUD(),this.destruction.reset(this.buildings.buildings),this.cards.reset(),this.cards.setPlayer(this.vehicle,this.buildings.buildings),this.cards.spawnInWorldCards(this.buildings.roadNetwork,this.buildings.buildings),this.turrets.clear(),this.turrets.registerGates(this.buildings.getMainGates()),this.police.clear();const e=this.buildings.getPoliceStations();this.police.spawnFromStations(e),this.scene.setCameraMode("combat"),this.vehicle.speed=22,this.scene.setAlarmLighting(!0),this.sound.playExplosion("large"),this.sound.playCrash(1.5),t.mesh.userData.doors&&t.mesh.userData.doors.forEach(n=>{n.visible=!1})}clearBeacons(){for(;this.beaconsGroup.children.length>0;)this.beaconsGroup.remove(this.beaconsGroup.children[0])}update(t,e){if(this.state==="RECON"){this.beaconsGroup.children.forEach(i=>{i.userData&&i.userData.animator&&i.userData.animator(t,e)});return}if(this.state==="SWOOP"||this.state!=="COMBAT")return;this.vehicle.update(t,this.buildings.buildings,this.police,this.destruction),this.destruction.checkVehicleCollisions(this.vehicle,this.buildings.buildings,this.police),this.police.checkRoadblockCollisions(this.vehicle),this.police.update(t,e,this.vehicle),this.turrets.update(t,this.vehicle),this.cards.update(t,e),this.destruction.update(t),this.scene.setAlarmLighting(!0,e);const n=this.destruction.getStats();this.ui.updateCombatHUD({hp:this.vehicle.hp,maxHp:this.vehicle.maxHp,shield:this.vehicle.shield,maxShield:this.vehicle.maxShield,speed:this.vehicle.getSpeedMph(),destructionPct:n.percentage,stars:n.stars,looted:n.looted,policeWrecked:this.police.totalWrecked,playerPos:this.vehicle.position,playerHeading:this.vehicle.heading,policeUnits:this.police.policeUnits,roadblocks:this.police.roadblocks,buildings:this.buildings.buildings,roadNetwork:this.buildings.roadNetwork}),this.vehicle.isCrashed&&this.endAttack()}endAttack(){this.state="RESULT",this.scene.setAlarmLighting(!1);const t=this.destruction.getStats();this.attackStats={...t,policeWrecked:this.police.totalWrecked},this.economy.rewardLoot(t.looted),setTimeout(()=>{this.ui.showResultModal(this.attackStats,()=>{this.returnToBuilder()})},1200)}returnToBuilder(){this.state="IDLE",this.scene.setCameraMode("builder"),this.scene.setAlarmLighting(!1),this.police.clear(),this.turrets.clear(),this.cards.reset(),this.destruction.clearEffects(),this.buildings.buildings.forEach(t=>{t.mesh&&(t.mesh.visible=!0),t.isMainGate&&t.mesh.userData.doors&&t.mesh.userData.doors.forEach(e=>{e.visible=!0})}),this.vehicle.mesh.visible=!1,this.ui.showBuilderHUD()}}class Yp{constructor({economyManager:t,buildingManager:e,gridSystem:n,soundManager:i,sceneManager:r}){this.economy=t,this.buildings=e,this.grid=n,this.sound=i,this.sceneManager=r,this.currentScreen="HOME",this.shopCategory="all",this.onStartAttack=null,this.onCardActivated=null,this.onAbortRecon=null,this.currentInspectedBuilding=null,this._bindDOMElements(),this._initEconomyListeners(),this._initBuilderListeners(),this._initHomeNavigation(),this._initDesignMode(),this._initShop(),this._initHarvestAnimations(),this.economy.onUpdate&&this.economy.onUpdate(this.economy.getResources()),this.setScreen("HOME")}_bindDOMElements(){this.homeView=document.getElementById("home-view"),this.designView=document.getElementById("design-view"),this.combatHud=document.getElementById("combat-hud"),this.reconBanner=document.getElementById("tactical-recon-banner"),this.scanOverlay=document.getElementById("mapping-scan-overlay"),this.scanGateName=document.getElementById("scan-gate-name"),this.shopModal=document.getElementById("blueprint-shop-modal"),this.redesignModal=document.getElementById("redesign-modal"),this.inspectorModal=document.getElementById("inspector-modal"),this.resultModal=document.getElementById("result-modal"),this.resCash=document.getElementById("res-cash"),this.resIron=document.getElementById("res-iron"),this.resWood=document.getElementById("res-wood"),this.builderCountEl=document.getElementById("builder-count"),this.shopResCash=document.getElementById("shop-res-cash"),this.shopResIron=document.getElementById("shop-res-iron"),this.shopResWood=document.getElementById("shop-res-wood"),this.harvestContainer=document.getElementById("floating-harvest-container"),this.btnToggleSound=document.getElementById("btn-toggle-sound"),this.soundIcon=document.getElementById("sound-icon"),this.btnToggleSound&&this.btnToggleSound.addEventListener("click",()=>{const t=!this.sound.isMuted;this.sound.setMuted(t),this.soundIcon&&(this.soundIcon.textContent=t?"🔇":"🔊")}),this.barHp=document.getElementById("hud-hp-fill"),this.textHp=document.getElementById("hud-hp-text"),this.barShield=document.getElementById("hud-shield-fill"),this.speedText=document.getElementById("hud-speed-val"),this.barDestruction=document.getElementById("hud-destruct-fill"),this.destructText=document.getElementById("hud-destruct-text"),this.starsContainer=document.getElementById("hud-stars"),this.lootedCash=document.getElementById("loot-cash"),this.lootedIron=document.getElementById("loot-iron"),this.lootedWood=document.getElementById("loot-wood"),this.copsWreckedText=document.getElementById("cops-wrecked"),this.radarCanvas=document.getElementById("radar-canvas"),this.radarCtx=this.radarCanvas?this.radarCanvas.getContext("2d"):null,this.cardsContainer=document.getElementById("action-cards-container"),this.grid.onSelectBuilding=t=>{this.showBuildingInspector(t)},this.grid.onInventoryPlaced=()=>{this.renderDesignInventory()}}_initBuilderListeners(){this.updateBuilderHUD(),this.buildings.onBuildersChanged=()=>{this.updateBuilderHUD()},this.buildings.onConstructionFinished=t=>{this.sound.playUpgrade(),this.showToast(`🔨 ${t.name} finished upgrade!`),this.updateBuilderHUD(),this.currentInspectedBuilding===t&&this.showBuildingInspector(t)},setInterval(()=>{if(this.currentInspectedBuilding&&this.currentInspectedBuilding.isUnderConstruction){const t=this.currentInspectedBuilding.buildTask?Math.ceil(this.currentInspectedBuilding.buildTask.remaining):0,e=document.getElementById("inspector-timer-countdown");e&&(e.textContent=`${t}s`);const n=document.getElementById("inspector-progress-fill");if(n&&this.currentInspectedBuilding.buildTask){const i=this.currentInspectedBuilding.buildTask.total||1,r=Math.max(5,(1-this.currentInspectedBuilding.buildTask.remaining/i)*100);n.style.width=`${r}%`}}this.updateBuilderHUD()},400)}updateBuilderHUD(){if(!this.builderCountEl)return;const t=this.buildings.freeBuilders,e=this.buildings.totalBuilders;if(this.buildings.busyBuilders>0){let i=999999;this.buildings.activeBuildTasks.forEach(a=>{a.remaining<i&&(i=a.remaining)});const r=i<999999?` (${Math.ceil(i)}s)`:"";this.builderCountEl.textContent=`${t} / ${e} Labour Free${r}`,this.builderCountEl.style.color=t===0?"#ff5252":"#ffd700"}else this.builderCountEl.textContent=`${t} / ${e} Labour Free`,this.builderCountEl.style.color="#00e5ff"}_getTypeIcon(t){return{town_hall:"🏛️",vehicle_lab:"🏎️",weapons_lab:"💣",sniper_tower:"🏹",tesla_coil:"⚡",laser_obelisk:"🔴",main_gate:"⛩️",police_station:"🚓",petrol_pump:"⛽",lumber_mill:"🪵",iron_foundry:"⚙️",cash_mint:"🏦",builder_hut:"👷",spike_trap:"🪤",roadblock:"🚧",tree:"🌲",road:"🛣️"}[t]||"🏗️"}bindTouchControls(t){const e=(i,r)=>{const a=document.getElementById(i);if(!a)return;const o=l=>{l.preventDefault(),t.inputs[r]=!0},c=l=>{l.preventDefault(),t.inputs[r]=!1};a.addEventListener("pointerdown",o),a.addEventListener("pointerup",c),a.addEventListener("pointerleave",c),a.addEventListener("touchstart",o,{passive:!1}),a.addEventListener("touchend",c,{passive:!1})};e("touch-left","left"),e("touch-right","right"),e("touch-gas","forward"),e("touch-brake","reverse"),e("touch-drift","handbrake"),e("touch-fire","fire"),e("btn-fire-cannon","fire");const n=document.getElementById("touch-jump");if(n){const i=r=>{r.preventDefault(),this.onCardActivated?this.onCardActivated("jump"):t&&t.triggerBigJump()};n.addEventListener("pointerdown",i),n.addEventListener("touchstart",i,{passive:!1})}}setScreen(t){this.currentScreen=t,this.sceneManager&&this.sceneManager.setDesignGridVisible(t==="DESIGN"),this.homeView&&this.homeView.classList.add("hidden"),this.designView&&this.designView.classList.add("hidden"),this.combatHud&&this.combatHud.classList.add("hidden"),this.reconBanner&&this.reconBanner.classList.add("hidden"),this.shopModal&&this.shopModal.classList.add("hidden"),this.redesignModal&&this.redesignModal.classList.add("hidden"),this.inspectorModal&&this.inspectorModal.classList.add("hidden"),this.resultModal&&this.resultModal.classList.add("hidden"),t==="HOME"?(this.homeView&&this.homeView.classList.remove("hidden"),this.grid.setMode("home")):t==="DESIGN"?(this.designView&&this.designView.classList.remove("hidden"),this.grid.setMode("design_select"),this.renderDesignInventory(),this.updateRoadBadge&&this.updateRoadBadge()):t==="SHOP"?(this.homeView&&this.homeView.classList.remove("hidden"),this.shopModal&&this.shopModal.classList.remove("hidden"),this.renderShopCatalog()):t==="RECON"?this.reconBanner&&this.reconBanner.classList.remove("hidden"):t==="COMBAT"?this.combatHud&&this.combatHud.classList.remove("hidden"):t==="RESULT"&&this.resultModal&&this.resultModal.classList.remove("hidden")}_initHomeNavigation(){const t=document.getElementById("btn-attack-city");t&&t.addEventListener("click",()=>{this.sound.playClick(),this.onStartAttack&&this.onStartAttack()});const e=document.getElementById("btn-open-shop");e&&e.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("SHOP")});const n=document.getElementById("btn-open-design");n&&n.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("DESIGN")})}_initDesignMode(){const t=document.getElementById("btn-exit-design");t&&t.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("HOME")});const e=document.getElementById("btn-quick-shop");e&&e.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("SHOP")});const n=document.getElementById("btn-open-presets");n&&n.addEventListener("click",()=>{this.sound.playClick(),this.showRedesignModal()});const i=document.getElementById("btn-close-redesign");i&&i.addEventListener("click",()=>{this.hideRedesignModal()});const r=document.getElementById("btn-design-road"),a=document.getElementById("btn-design-erase"),o=document.getElementById("btn-design-select"),c=d=>{[r,a,o].forEach(u=>u&&u.classList.remove("active")),d&&d.classList.add("active")},l=()=>{const d=this.economy.getInventoryCount("road");r&&(r.innerHTML=`<span>🛣️</span> Draw Roads (${d} left)`,d<=0?r.style.borderColor="rgba(255, 82, 82, 0.6)":r.style.borderColor="")};this.updateRoadBadge=l,l();const h=document.getElementById("btn-clear-roads-design");h&&h.addEventListener("click",()=>{if(confirm("Clear all paved roads in the city? All road tiles will be refunded to your inventory.")){this.sound.playCrash(.6);const d=this.buildings.roadNetwork.clear();this.economy.addToInventory("road",d),l(),this.renderDesignInventory(),this.showToast(`🧹 Cleared and refunded +${d} Road Tiles to inventory!`)}}),document.querySelectorAll(".btn-apply-preset").forEach(d=>{d.addEventListener("click",u=>{const m=u.target.getAttribute("data-preset");m&&(this.sound.playUpgrade(),this.buildings.applyPreset(m),this.hideRedesignModal(),l(),this.renderDesignInventory())})}),r&&r.addEventListener("click",()=>{this.sound.playClick(),this.grid.setMode("draw_road"),c(r),document.querySelectorAll(".inv-card").forEach(u=>u.classList.remove("active-placement"));const d=document.querySelector('.inv-card[data-type="road"]');d&&d.classList.add("active-placement")}),a&&a.addEventListener("click",()=>{this.sound.playClick(),this.grid.setMode("erase_road"),c(a),document.querySelectorAll(".inv-card").forEach(d=>d.classList.remove("active-placement"))}),o&&o.addEventListener("click",()=>{this.sound.playClick(),this.grid.setMode("design_select"),c(o),document.querySelectorAll(".inv-card").forEach(d=>d.classList.remove("active-placement"))}),this.grid.onRoadUpdated=()=>{l(),this.renderDesignInventory()},this.grid.onOutOfRoads=()=>{this.sound.playCrash(.3),this.showToast("⚠️ Out of Road Tiles! Purchase more in the City Shop.")}}renderDesignInventory(){const t=document.getElementById("inventory-items-list");if(!t)return;t.innerHTML="";const e=this.economy.inventory||{},n=Object.keys(e).filter(i=>e[i]>0);if(n.length===0){t.innerHTML=`
        <div class="inv-empty-state">
          <span>Your construction inventory is empty. Visit the <strong>City Shop</strong> to purchase fortifications!</span>
          <button id="btn-empty-shop-cta" class="btn-primary" style="padding: 6px 14px; font-size: 11px;">OPEN SHOP 🛒</button>
        </div>
      `;const i=document.getElementById("btn-empty-shop-cta");i&&i.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("SHOP")});return}n.forEach(i=>{const r=this.buildings.catalog[i];if(!r)return;const a=e[i],o=document.createElement("div");o.className="inv-card",o.setAttribute("data-type",i),o.innerHTML=`
        <span class="inv-count-badge">x${a}</span>
        <div class="inv-card-icon">${this._getTypeIcon(i)}</div>
        <div class="inv-card-info">
          <span class="inv-card-name">${r.name}</span>
          <span style="font-size: 10px; color: var(--accent-cyan);">${i==="road"?"Draw Road Tiles":"Ready to Place"}</span>
        </div>
      `,o.addEventListener("click",()=>{if(this.sound.playClick(),document.querySelectorAll(".inv-card").forEach(c=>c.classList.remove("active-placement")),o.classList.add("active-placement"),i==="road"){this.grid.setMode("draw_road");const c=document.getElementById("btn-design-road");document.querySelectorAll(".left-tools-dock .tool-btn").forEach(l=>l.classList.remove("active")),c&&c.classList.add("active")}else this.grid.setMode("place_inventory",i)}),t.appendChild(o)})}_initShop(){const t=document.getElementById("btn-close-shop");t&&t.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("HOME")});const e=document.getElementById("btn-shop-to-design");e&&e.addEventListener("click",()=>{this.sound.playClick(),this.setScreen("DESIGN")}),document.querySelectorAll(".shop-tab-btn").forEach(n=>{n.addEventListener("click",i=>{document.querySelectorAll(".shop-tab-btn").forEach(r=>r.classList.remove("active")),i.target.classList.add("active"),this.shopCategory=i.target.getAttribute("data-cat")||"all",this.sound.playClick(),this.renderShopCatalog()})})}renderShopCatalog(){const t=document.getElementById("blueprint-items-container");if(!t)return;t.innerHTML="";const e=this.buildings.catalog,n=this.economy.getResources();this.shopResCash&&(this.shopResCash.textContent=n.cash.toLocaleString()),this.shopResIron&&(this.shopResIron.textContent=n.iron.toLocaleString()),this.shopResWood&&(this.shopResWood.textContent=n.wood.toLocaleString()),Object.keys(e).forEach(i=>{const r=e[i];if(this.shopCategory!=="all"&&r.category!==this.shopCategory)return;const a=n.cash>=(r.cost.cash||0),o=n.iron>=(r.cost.iron||0),c=n.wood>=(r.cost.wood||0),l=a&&o&&c,h=this.economy.getInventoryCount(i),d=r.packCount||1,u=l?r.packCount?`BUY (+${d} TO INVENTORY) 📦`:"BUY (+1 TO INVENTORY) 📦":"NEED MORE RESOURCES ⚠️",m=document.createElement("div");m.className="blueprint-card",m.innerHTML=`
        <div class="blueprint-header">
          <div class="blueprint-icon">${this._getTypeIcon(i)}</div>
          <div>
            <div class="blueprint-title">${r.name}</div>
            <span style="font-size:10px; color:var(--text-dim);">${r.category.toUpperCase()}</span>
            <div class="inv-owned-tag">In Inventory: ${h}</div>
          </div>
        </div>
        <p style="font-size:11px; color:var(--text-dim); margin-bottom:6px; min-height: 28px;">${r.desc}</p>
        <div class="blueprint-reqs">
          <div class="req-item">
            <span>💰 Cash:</span>
            <span class="${a?"req-status-ok":"req-status-need"}">${n.cash.toLocaleString()} / ${(r.cost.cash||0).toLocaleString()}</span>
          </div>
          <div class="req-item">
            <span>⚙️ Iron:</span>
            <span class="${o?"req-status-ok":"req-status-need"}">${n.iron.toLocaleString()} / ${(r.cost.iron||0).toLocaleString()}</span>
          </div>
          <div class="req-item">
            <span>🪵 Wood:</span>
            <span class="${c?"req-status-ok":"req-status-need"}">${n.wood.toLocaleString()} / ${(r.cost.wood||0).toLocaleString()}</span>
          </div>
        </div>
        <button class="btn-primary btn-buy-to-inv" ${l?"":'disabled style="opacity:0.4; cursor:not-allowed;"'}>
          ${u}
        </button>
      `,l&&m.querySelector(".btn-buy-to-inv").addEventListener("click",()=>{this.economy.deduct(r.cost)&&(this.economy.addToInventory(i,d),this.sound.playUpgrade(),this.renderShopCatalog(),this.showToast(`Purchased +${d} ${r.name}!`),this.updateRoadBadge&&this.updateRoadBadge())}),t.appendChild(m)})}_initHarvestAnimations(){this.grid.onHarvest=({type:t,amount:e,clientX:n,clientY:i})=>{this.spawnFloatingReward(n,i,t,e)}}spawnFloatingReward(t,e,n,i){if(!this.harvestContainer)return;let r="💰",a="#ffd700";n==="wood"?(r="🪵",a="#8bc34a"):n==="iron"&&(r="⚙️",a="#00e5ff");const o=document.createElement("div");o.className="floating-reward",o.style.left=`${t||window.innerWidth/2}px`,o.style.top=`${e||window.innerHeight/2}px`,o.style.color=a,o.textContent=`+${i} ${r}`,this.harvestContainer.appendChild(o),setTimeout(()=>{o.parentNode&&o.remove()},1300)}_initEconomyListeners(){this.economy.onUpdate=t=>{this.resCash&&(this.resCash.textContent=t.cash.toLocaleString()),this.resIron&&(this.resIron.textContent=t.iron.toLocaleString()),this.resWood&&(this.resWood.textContent=t.wood.toLocaleString()),this.shopResCash&&(this.shopResCash.textContent=t.cash.toLocaleString()),this.shopResIron&&(this.shopResIron.textContent=t.iron.toLocaleString()),this.shopResWood&&(this.shopResWood.textContent=t.wood.toLocaleString())},this.economy.onInventoryUpdate=()=>{this.currentScreen==="DESIGN"&&this.renderDesignInventory()}}showBuildingInspector(t){var A;if(!this.inspectorModal)return;if(!t){this.currentInspectedBuilding=null,this.inspectorModal.classList.add("hidden");return}this.currentInspectedBuilding=t,this.inspectorModal.classList.remove("hidden");const e=document.getElementById("inspector-content");if(!e)return;const n=this.buildings.getTownHallLevel(),r=(t.level||1)+1,a=t.isMainGate,o=t.type==="town_hall",c=o?r>12:r>12||r>n,l=!o&&r>n,h=this.buildings.getUpgradeCost(t),d=this.buildings.getBuildTime(t.type,r),u=this.currentScreen==="DESIGN",m=u&&!a&&!o,g=t.isUnderConstruction,_=this.buildings.freeBuilders;let p="";if(g){const I=t.buildTask||{remaining:10,total:10,targetLevel:r},y=Math.max(1,Math.ceil(I.remaining)),b=Math.max(5,Math.min(100,Math.round((1-I.remaining/(I.total||1))*100)));p=`
        <div style="background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.3); border-radius: 8px; padding: 12px; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 13px; color: #ffd700; font-weight: 600;">
              🔨 Upgrading to Tier ${I.targetLevel}...
            </span>
            <span id="inspector-timer-countdown" style="font-size: 13px; color: #00e5ff; font-weight: 700;">
              ${y}s
            </span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div id="inspector-progress-fill" style="height: 100%; width: ${b}%; background: linear-gradient(90deg, #00e5ff, #ffd700); transition: width 0.3s ease;"></div>
          </div>
        </div>
        <button id="btn-finish-instant" class="btn-primary" style="background: linear-gradient(135deg, #ffd700, #ff9800); color: #06101c; font-weight: bold; margin-bottom: 8px;">
          ⚡ FINISH NOW (INSTANT)
        </button>
      `}else if(!a&&!c){const I=this.economy.getResources(),y=I.cash>=h.cash&&I.iron>=h.iron&&I.wood>=h.wood,b=y&&_>0;let z=`🔨 Upgrade to Tier ${r} (⏱️${d}s)`;_<=0?z="ALL LABOURS BUSY (HIRE IN SHOP) ⚠️":y||(z="NEED MORE RESOURCES ⚠️"),p=`
        <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 6px;">
          Upgrade Cost: 💰${h.cash.toLocaleString()} &nbsp; ⚙️${h.iron.toLocaleString()} &nbsp; 🪵${h.wood.toLocaleString()}
        </div>
        <button id="btn-upgrade-building" class="btn-primary" ${b?"":'disabled style="opacity:0.5; cursor:not-allowed;"'}>
          ${z}
        </button>
      `}else l?p=`
        <div style="padding: 8px; background: rgba(255,82,82,0.15); border: 1px solid rgba(255,82,82,0.4); border-radius: 6px; font-size: 12px; color: #ff8a80; margin-bottom: 8px;">
          🔒 Requires Town Hall Tier ${r} to upgrade further!
        </div>
      `:c&&(p=`
        <div style="padding: 8px; background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.3); border-radius: 6px; font-size: 12px; color: #00e5ff; margin-bottom: 8px;">
          ⭐ Maximum Upgrade Tier Reached!
        </div>
      `);e.innerHTML=`
      <h3>${this._getTypeIcon(t.type)} ${t.name}</h3>
      <p class="desc">${((A=this.buildings.catalog[t.type])==null?void 0:A.desc)||""}</p>
      <div class="stats-row">
        <span>Tier: <strong>Level ${t.level||1}</strong></span>
        <span>HP: <strong>${Math.round(t.hp)} / ${Math.round(t.maxHp)}</strong></span>
        ${t.produceType?`<span>Stored: <strong>${Math.floor(t.stored||0)} / ${t.maxCapacity}</strong></span>`:""}
      </div>
      <div class="inspector-actions">
        ${p}
        ${u?`
          <button id="btn-relocate-building" class="btn-primary" style="background: linear-gradient(135deg, #00e5ff, #0091ea); color: #06101c;">
            ✋ Pick Up & Move
          </button>
        `:""}
        ${m?`
          <button id="btn-stow-building" class="btn-secondary">
            📦 Stow into Inventory
          </button>
        `:""}
        <button id="btn-demolish-building" class="btn-danger">Demolish</button>
        <button id="btn-close-inspector" class="btn-secondary">Close</button>
      </div>
    `;const f=document.getElementById("btn-finish-instant");f&&f.addEventListener("click",()=>{this.buildings.finishConstructionInstantly(t),this.sound.playUpgrade(),this.showToast("⚡ Instant construction completed!"),this.showBuildingInspector(t)});const M=document.getElementById("btn-upgrade-building");M&&M.addEventListener("click",()=>{const I=this.buildings.upgradeBuilding(t);I&&I.ok?(this.sound.playUpgrade(),this.showToast(`👷 Labour assigned to ${t.name} (${I.duration}s)!`),this.showBuildingInspector(t)):I&&I.reason==="NO_FREE_BUILDERS"?(this.sound.playCrash(.3),alert("All labours are currently busy! Wait for a construction task to finish or Hire a Labour in the City Shop.")):I&&I.reason==="TOWN_HALL_CAP"?alert(`Requires Town Hall Level ${I.requiredTH}! Upgrade Town Hall first.`):(this.sound.playCrash(.3),alert("Not enough resources to upgrade!"))});const v=document.getElementById("btn-relocate-building");v&&v.addEventListener("click",()=>{this.sound.playClick(),this.hideBuildingInspector(),this.grid.setMode("relocate",t)});const w=document.getElementById("btn-stow-building");w&&w.addEventListener("click",()=>{this.buildings.stowBuilding(t),this.sound.playPlace(),this.hideBuildingInspector(),this.renderDesignInventory()});const R=document.getElementById("btn-demolish-building");R&&R.addEventListener("click",()=>{this.buildings.removeBuilding(t),this.sound.playCrash(.5),this.hideBuildingInspector()});const S=document.getElementById("btn-close-inspector");S&&S.addEventListener("click",()=>{this.hideBuildingInspector()})}hideBuildingInspector(){this.currentInspectedBuilding=null,this.inspectorModal&&this.inspectorModal.classList.add("hidden")}showRedesignModal(){this.redesignModal&&this.redesignModal.classList.remove("hidden")}hideRedesignModal(){this.redesignModal&&this.redesignModal.classList.add("hidden")}showCombatHUD(){this.setScreen("COMBAT"),this.hideBuildingInspector()}showBuilderHUD(){this.setScreen("HOME")}showTacticalReconBanner(t){this.onAbortRecon=t,this.setScreen("RECON")}hideTacticalReconBanner(){this.reconBanner&&this.reconBanner.classList.add("hidden")}showMappingScanEffect(t){this.scanGateName&&(this.scanGateName.textContent=t.toUpperCase()),this.scanOverlay&&this.scanOverlay.classList.remove("hidden")}hideMappingScanEffect(){this.scanOverlay&&this.scanOverlay.classList.add("hidden")}updateCombatHUD(t){if(this.barHp){const e=Math.max(0,Math.min(100,t.hp/t.maxHp*100));this.barHp.style.width=`${e}%`,e<25?this.barHp.style.background="#f44336":e<55?this.barHp.style.background="#ff9800":this.barHp.style.background="#4caf50"}if(this.textHp&&(this.textHp.textContent=`${t.hp} / ${t.maxHp}`),this.barShield){const e=Math.max(0,Math.min(100,t.shield/t.maxShield*100));this.barShield.style.width=`${e}%`}if(this.speedText&&(this.speedText.textContent=`${t.speed} MPH`),this.barDestruction&&(this.barDestruction.style.width=`${t.destructionPct}%`),this.destructText&&(this.destructText.textContent=`${t.destructionPct}%`),this.starsContainer){const e=t.stars;this.starsContainer.innerHTML=`
        <span class="${e>=1?"star-gold":"star-dim"}">⭐</span>
        <span class="${e>=2?"star-gold":"star-dim"}">⭐</span>
        <span class="${e>=3?"star-gold":"star-dim"}">⭐</span>
      `}this.lootedCash&&(this.lootedCash.textContent=t.looted.cash.toLocaleString()),this.lootedIron&&(this.lootedIron.textContent=t.looted.iron.toLocaleString()),this.lootedWood&&(this.lootedWood.textContent=t.looted.wood.toLocaleString()),this.copsWreckedText&&(this.copsWreckedText.textContent=t.policeWrecked),t.playerPos&&this.drawRadar(t.playerPos,t.playerHeading,t.policeUnits,t.roadblocks,t.buildings,t.roadNetwork)}drawRadar(t,e,n=[],i=[],r=[],a=null){if(!this.radarCtx||!t)return;const o=this.radarCtx,c=this.radarCanvas.width,l=this.radarCanvas.height,h=c/2,d=l/2,u=c/2-4,m=u/80;if(o.clearRect(0,0,c,l),o.save(),o.beginPath(),o.arc(h,d,u,0,Math.PI*2),o.fillStyle="#06101c",o.fill(),o.lineWidth=2,o.strokeStyle="#00e5ff",o.stroke(),o.lineWidth=1,o.strokeStyle="rgba(0, 229, 255, 0.2)",[.33,.66,1].forEach(g=>{o.beginPath(),o.arc(h,d,u*g,0,Math.PI*2),o.stroke()}),o.beginPath(),o.moveTo(h,d-u),o.lineTo(h,d+u),o.moveTo(h-u,d),o.lineTo(h+u,d),o.stroke(),o.beginPath(),o.arc(h,d,u-1,0,Math.PI*2),o.clip(),a&&a.roads){o.fillStyle="#263238";const g=(a.tileSize||5.5)*m;a.roads.forEach(_=>{const p=_.gx*(a.tileSize||5.5),f=_.gz*(a.tileSize||5.5),M=(p-t.x)*m,v=(f-t.z)*m;Math.hypot(M,v)<u+10&&o.fillRect(h+M-g/2,d+v-g/2,g+1,g+1)})}if(r&&r.forEach(g=>{if(g.isDestroyed||!g.mesh)return;const _=(g.mesh.position.x-t.x)*m,p=(g.mesh.position.z-t.z)*m;Math.hypot(_,p)<u&&(g.isMainGate?(o.fillStyle="#ff9100",o.fillRect(h+_-4,d+p-4,8,8)):(o.fillStyle=g.isExplosive?"#ff1744":"#455a64",o.beginPath(),o.arc(h+_,d+p,2.5,0,Math.PI*2),o.fill()))}),i&&i.forEach(g=>{if(g.isDestroyed)return;const _=(g.position.x-t.x)*m,p=(g.position.z-t.z)*m;Math.hypot(_,p)<u&&(o.fillStyle="#ffd600",o.fillRect(h+_-2.5,d+p-2.5,5,5))}),n){const g=performance.now()*.008;n.forEach((_,p)=>{if(_.isDestroyed)return;const f=(_.position.x-t.x)*m,M=(_.position.z-t.z)*m;if(Math.hypot(f,M)<u){const v=Math.sin(g+p)>0;o.fillStyle=v?"#2979ff":"#ff1744",o.beginPath(),o.arc(h+f,d+M,4,0,Math.PI*2),o.fill(),o.strokeStyle=v?"rgba(41, 121, 255, 0.5)":"rgba(255, 23, 68, 0.5)",o.lineWidth=1.5,o.beginPath(),o.arc(h+f,d+M,7,0,Math.PI*2),o.stroke()}})}o.save(),o.translate(h,d),o.rotate(-e),o.fillStyle="#00e5ff",o.beginPath(),o.moveTo(0,-7),o.lineTo(5,6),o.lineTo(0,3),o.lineTo(-5,6),o.closePath(),o.fill(),o.restore(),o.restore()}renderCardsDeck(t,e){this.cardsContainer&&(this.cardsContainer.innerHTML="",t.forEach(n=>{const i=document.createElement("button");i.type="button",i.className=`action-card card-${n.id} ${n.currentCooldown>0?"on-cooldown":""}`,i.id=`card-${n.id}`,i.title=`${n.name}: ${n.desc||""}`;const r=n.currentCooldown>0?n.currentCooldown/n.cooldown*100:0;i.innerHTML=`
        <div class="card-key">${n.key}</div>
        <div class="card-icon">${n.icon}</div>
        <div class="card-name">${n.name}</div>
        <div class="card-cooldown-overlay" style="height: ${r}%"></div>
        ${n.currentCooldown>0?`<div class="card-timer">${Math.ceil(n.currentCooldown)}s</div>`:""}
      `,i.addEventListener("click",a=>{a.stopPropagation(),e&&e(n.id)}),this.cardsContainer.appendChild(i)}))}updateCardsDeck(t){t.forEach(e=>{const n=document.getElementById(`card-${e.id}`);if(!n)return;const i=n.querySelector(".card-cooldown-overlay"),r=n.querySelector(".card-timer");if(e.currentCooldown>0){n.classList.add("on-cooldown");const a=e.currentCooldown/e.cooldown*100;if(i&&(i.style.height=`${a}%`),r)r.textContent=`${Math.ceil(e.currentCooldown)}s`;else{const o=document.createElement("div");o.className="card-timer",o.textContent=`${Math.ceil(e.currentCooldown)}s`,n.appendChild(o)}}else n.classList.remove("on-cooldown"),i&&(i.style.height="0%"),r&&r.remove()})}showResultModal(t,e){if(!this.resultModal)return;this.resultModal.classList.remove("hidden");const n=document.getElementById("result-content");if(!n)return;n.innerHTML=`
      <div class="result-badge">💥 VEHICLE CRASHED - SIEGE COMPLETE! 💥</div>
      <div class="result-stars">
        <span class="${t.stars>=1?"star-gold":"star-dim"}">⭐</span>
        <span class="${t.stars>=2?"star-gold":"star-dim"}">⭐</span>
        <span class="${t.stars>=3?"star-gold":"star-dim"}">⭐</span>
      </div>
      <h2>Destruction: ${t.percentage}%</h2>
      <div class="result-grid">
        <div class="result-metric">
          <span class="label">Buildings Destroyed</span>
          <span class="val">${t.destroyed} / ${t.total}</span>
        </div>
        <div class="result-metric">
          <span class="label">Police Cruisers Wrecked</span>
          <span class="val">🚨 ${t.policeWrecked}</span>
        </div>
        <div class="result-metric">
          <span class="label">Cash Plundered</span>
          <span class="val">💰 +${t.looted.cash.toLocaleString()}</span>
        </div>
        <div class="result-metric">
          <span class="label">Iron & Wood Looted</span>
          <span class="val">⚙️ +${t.looted.iron} | 🪵 +${t.looted.wood}</span>
        </div>
      </div>
      <button id="btn-collect-loot" class="btn-primary btn-large">
        CLAIM LOOT & RETURN TO CITY 🏛️
      </button>
    `;const i=document.getElementById("btn-collect-loot");i&&i.addEventListener("click",()=>{this.sound.playClick(),e()})}showToast(t,e=2800){const n=document.getElementById("ui-toast");n&&(n.textContent=t,n.classList.remove("hidden"),n.classList.add("toast-show"),clearTimeout(this._toastTimer),this._toastTimer=setTimeout(()=>{n.classList.remove("toast-show"),n.classList.add("hidden")},e))}}class $p{constructor(){this.container=document.getElementById("canvas-container"),this.clock=new Pp,this.sceneManager=new Ip(this.container),this.assetFactory=new Up,this.soundManager=Fp,this.roadNetwork=new Bp(this.sceneManager.scene,this.assetFactory),this.economyManager=new Op,this.buildingManager=new Gp(this.sceneManager.scene,this.assetFactory,this.roadNetwork,this.economyManager),this.gridSystem=new zp(this.sceneManager.scene,this.sceneManager.builderCamera,this.roadNetwork,this.buildingManager,this.economyManager,this.soundManager,this.sceneManager),this.destructionEngine=new Xp(this.sceneManager.scene,this.soundManager,this.assetFactory),this.policeManager=new Hp(this.sceneManager.scene,this.assetFactory,this.soundManager,this.destructionEngine),this.turretSystem=new Wp(this.sceneManager.scene,this.soundManager),this.vehicleController=new kp(this.sceneManager.scene,this.sceneManager.combatCamera,this.assetFactory,this.soundManager),this.vehicleController.mesh.visible=!1,this.cardSystem=new Vp(this.sceneManager.scene,this.soundManager,this.destructionEngine,this.policeManager),this.uiManager=new Yp({economyManager:this.economyManager,buildingManager:this.buildingManager,gridSystem:this.gridSystem,soundManager:this.soundManager,sceneManager:this.sceneManager}),this.attackManager=new qp({sceneManager:this.sceneManager,buildingManager:this.buildingManager,vehicleController:this.vehicleController,policeManager:this.policeManager,cardSystem:this.cardSystem,turretSystem:this.turretSystem,destructionEngine:this.destructionEngine,economyManager:this.economyManager,soundManager:this.soundManager,uiManager:this.uiManager,assetFactory:this.assetFactory}),this.vehicleController.setRoadNetwork(this.roadNetwork),this.uiManager.onStartAttack=()=>{this.attackManager.startRecon()},this.uiManager.bindTouchControls(this.vehicleController),this.uiManager.onCardActivated=e=>{this.cardSystem.activateCard(e)},this.uiManager.renderCardsDeck(this.cardSystem.cards,e=>{this.cardSystem.activateCard(e)}),this.cardSystem.onCooldownUpdate=e=>{this.uiManager.updateCardsDeck(e)};const t=()=>{this.soundManager.ensureStarted(),window.removeEventListener("pointerdown",t),window.removeEventListener("keydown",t)};window.addEventListener("pointerdown",t),window.addEventListener("keydown",t),this.buildingManager.initDefaultCity(),this.animate=this.animate.bind(this),requestAnimationFrame(this.animate)}animate(){requestAnimationFrame(this.animate);const t=Math.min(this.clock.getDelta(),.1),e=this.clock.getElapsedTime();this.sceneManager.update(t),this.economyManager.update(t),this.buildingManager.update(t,e),this.attackManager.update(t,e),this.sceneManager.render()}}window.addEventListener("DOMContentLoaded",()=>{new $p});
//# sourceMappingURL=index-BHpgdtFN.js.map
