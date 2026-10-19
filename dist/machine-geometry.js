'use strict';
// Closed, depth-tested machine meshes. X is the reel axle.
const MachineGeometry = (() => {
  const TAU=Math.PI*2;
  const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
  function translation(x=0,y=0,z=0){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function rotateX(a){const m=identity(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
  function rotateY(a){const m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
  function rotateZ(a){const m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
  const normalize=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function lookAt(eye,target){const z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
  function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
  function point(m,p,w=1){return [0,1,2,3].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]*w);}
  // Position / normal / UV. Profile segment boundaries preserve machined bevels.
  function lathe(profile,segments=192,flat=false){
    const out=[],lo=Math.min(...profile.map(p=>p[0])),hi=Math.max(...profile.map(p=>p[0]));
    for(let i=0;i<profile.length-1;i++){
      const [x0,r0]=profile[i],[x1,r1]=profile[i+1],dx=x1-x0,dr=r1-r0,len=Math.hypot(dx,dr);if(len<1e-7)continue;
      for(let j=0;j<segments;j++){
        const a=j/segments*TAU,b=(j+1)/segments*TAU;
        const v=(x,r,t)=>{const n=flat?(a+b)/2:t;return [x,Math.sin(t)*r,Math.cos(t)*r,-dr/len,dx/len*Math.sin(n),dx/len*Math.cos(n),(x-lo)/(hi-lo||1),t/TAU];};
        const A=v(x0,r0,a),B=v(x1,r1,a),C=v(x1,r1,b),D=v(x0,r0,b);out.push(...A,...B,...C,...A,...C,...D);
      }
    }return out;
  }
  function ring(x,width,inner,outer,bevel=2,segments=192){const a=x-width/2,b=x+width/2,v=Math.min(bevel,width*.45,(outer-inner)*.45);return lathe([[a,inner+v],[a,outer-v],[a+v,outer],[b-v,outer],[b,outer-v],[b,inner+v],[b-v,inner],[a+v,inner],[a,inner+v]],segments);}
  function box(w,h,d){
    const half=[w/2,h/2,d/2],out=[];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,n=[0,0,0];n[axis]=sign;
      const vertex=(a,b)=>{const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=a*half[u];p[v]=b*half[v];return [...p,...n,(a+1)/2,(b+1)/2];};
      const A=vertex(-1,-1),B=vertex(1,-1),C=vertex(1,1),D=vertex(-1,1);
      out.push(...A,...(sign>0?B:C),...(sign>0?C:B),...A,...(sign>0?C:D),...(sign>0?D:C));
    }return out;
  }
  function roundedBox(w,h,d,r=3){
    const half=[w/2,h/2,d/2],inner=half.map(x=>Math.max(0,x-r)),out=[];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,us=[-half[u],-inner[u],0,inner[u],half[u]],vs=[-half[v],-inner[v],0,inner[v],half[v]];
      function vertex(i,j){const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=us[i];p[v]=vs[j];const c=p.map((x,k)=>Math.max(-inner[k],Math.min(inner[k],x))),n=normalize(p.map((x,k)=>x-c[k]));return [...c.map((x,k)=>x+n[k]*r),...n,i/4,j/4];}
      for(let i=0;i<4;i++)for(let j=0;j<4;j++){const A=vertex(i,j),B=vertex(i+1,j),C=vertex(i+1,j+1),D=vertex(i,j+1);out.push(...A,...(sign>0?B:C),...(sign>0?C:B),...A,...(sign>0?C:D),...(sign>0?D:C));}
    }return out;
  }
  function append(target,vertices,m=identity()){for(let i=0;i<vertices.length;i+=8){const p=point(m,vertices.slice(i,i+3)),n=normalize(point(m,vertices.slice(i+3,i+6),0).slice(0,3));target.push(...p.slice(0,3),...n,vertices[i+6],vertices[i+7]);}}
  return {TAU,identity,multiply,translation,rotateX,rotateY,rotateZ,lookAt,perspective,ortho,point,lathe,ring,box,roundedBox,append};
})();
