// Generates the Nuzz PWA icons (placeholder brand mark: a warm heart, no specific animal).
// Pure Node — no native deps. Run: node tools/make-icons.js
const zlib = require('zlib');
const fs = require('fs');

function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return (~c)>>>0;}
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,'ascii');
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crc]);
}
function encodePNG(w,h,rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6; // 8-bit, RGBA
  const raw=Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const ORANGE=hex('#EF9F27'), CREAM=hex('#FFF8EC');
// classic heart: (x^2+y^2-1)^3 - x^2 y^3 <= 0   (ny points up)
const inHeart=(nx,ny)=>{const v=Math.pow(nx*nx+ny*ny-1,3)-nx*nx*ny*ny*ny;return v<=0;};

function makeIcon(size,maskable){
  const rgba=Buffer.alloc(size*size*4);
  const cx=size/2, cy=size*0.40;
  const s=(maskable?0.27:0.31)*size;     // heart half-extent (maskable kept inside ~80% safe zone)
  const radius=size*0.22;                // corner rounding for the non-maskable icons
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let r,g,b,a=255,bgOn=true;
    if(!maskable){
      const dx=Math.max(radius-x, x-(size-radius),0);
      const dy=Math.max(radius-y, y-(size-radius),0);
      if(dx*dx+dy*dy>radius*radius) bgOn=false; // transparent outside rounded corners
    }
    if(!bgOn){r=g=b=0;a=0;}
    else{
      const nx=(x-cx)/s, ny=(cy-y)/s;
      [r,g,b]= inHeart(nx,ny)?CREAM:ORANGE;
    }
    const i=(y*size+x)*4; rgba[i]=r;rgba[i+1]=g;rgba[i+2]=b;rgba[i+3]=a;
  }
  return encodePNG(size,size,rgba);
}
fs.writeFileSync('icons/icon-192.png', makeIcon(192,false));
fs.writeFileSync('icons/icon-512.png', makeIcon(512,false));
fs.writeFileSync('icons/icon-512-maskable.png', makeIcon(512,true));
console.log('Wrote icons/icon-192.png, icon-512.png, icon-512-maskable.png');
