import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
];
const LM = {
  MOUTH_LEFT:61,MOUTH_RIGHT:291,FACE_LEFT:234,FACE_RIGHT:454,
  L_EYE_TOP:386,L_EYE_BOT:374,L_EYE_L:362,L_EYE_R:263,
  R_EYE_TOP:159,R_EYE_BOT:145,R_EYE_L:33,R_EYE_R:133,
  MOUTH_TOP:13,MOUTH_BOT:14,NOSE_TIP:4,CHIN:152,FOREHEAD:10,
};
function p(lm,i,W,H){return{x:lm[i].x*W,y:lm[i].y*H};}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`))return res();
    const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);
  });
}
function isHandClosed(lm){
  const w=lm[0];
  const tips=[8,12,16,20],mcps=[5,9,13,17];
  let c=0;
  for(let i=0;i<4;i++){
    const td=Math.hypot(lm[tips[i]].x-w.x,lm[tips[i]].y-w.y);
    const md=Math.hypot(lm[mcps[i]].x-w.x,lm[mcps[i]].y-w.y);
    if(td<md*1.1)c++;
  }
  return c>=3;
}

export default function FaceMoodMirror({ onClose, onGestureDetected, onHeadRotation, onAttentionChange, onWaveDetected, onMicChat, inlineMode=false, autoStart=false }) {
  const videoRef=useRef(null),canvasRef=useRef(null),cameraRef=useRef(null);
  const faceRef=useRef(null),handsRef=useRef(null),streamRef=useRef(null);
  const wristHist=useRef([]),waveCool=useRef(0),blinkF=useRef(0),lastBlink=useRef(0);
  const smileF=useRef(0),coverActive=useRef(false);
  const smoothHead=useRef(null); // EMA filter for head rotation
  // Attention tracking
  const lookAwayTimer=useRef(null),lookAwayFired=useRef(false),faceVisible=useRef(true);

  const [status,setStatus]=useState('loading');
  const autoStarted=useRef(false);
  const [mirroring,setMirroring]=useState(false);
  const [loadErr,setLoadErr]=useState('');
  const [dbg,setDbg]=useState({smile:0,ear:0,wave:0,headY:0,fist:false});
  // Mic videochat state
  const [micActive,setMicActive]=useState(false);
  const [micListening,setMicListening]=useState(false);
  const [micAnswer,setMicAnswer]=useState('');
  const [micAnswering,setMicAnswering]=useState(false);
  const micRecRef=useRef(null);
  const micAnswerTimer=useRef(null);

  const fire=useCallback((type,data={})=>onGestureDetected?.({type,...data}),[onGestureDetected]);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        for(const src of SCRIPTS)await loadScript(src);
        if(alive){
          setStatus('ready');
          // Auto-start camera immediately after scripts load
          if(!autoStarted.current){ autoStarted.current=true; setTimeout(()=>startCameraRef.current?.(), 100); }
        }
      }
      catch{if(alive){setLoadErr('MediaPipe failed to load.');setStatus('error');}}
    })();
    return()=>{alive=false;};
  },[]);

  // Register startCamera into ref for auto-start
  useEffect(()=>{
    startCameraRef.current=startCamera;
  });

  // If autoStart prop is passed, start immediately when ready
  useEffect(()=>{
    if(autoStart && status==='ready' && !mirroring){
      startCamera();
    }
  },[autoStart, status]);

  // Ref so auto-start can call startCamera before component fully renders
  const startCameraRef=useRef(null);
  const startCamera=async()=>{
    setStatus('starting');
    startCameraRef.current=null; // prevent double start
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'}});
      streamRef.current=stream;
      videoRef.current.srcObject=stream;
      await videoRef.current.play();
      const W=videoRef.current.videoWidth||640,H=videoRef.current.videoHeight||480;
      canvasRef.current.width=W;canvasRef.current.height=H;

      // ── FaceMesh ───────────────────────────────────────────────────────
      const fm=new window.FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
      fm.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
      fm.onResults(results=>{
        const hasFace=!!results.multiFaceLandmarks?.length;

        // ── ATTENTION TRACKING ──────────────────────────────────────────
        if(!hasFace){
          if(faceVisible.current){
            faceVisible.current=false;
            onAttentionChange?.('away');
            // After 2s of no face → fire look-away event
            lookAwayTimer.current=setTimeout(()=>{
              if(!lookAwayFired.current){
                lookAwayFired.current=true;
                fire('look_away');
                playBeep(380,0.4,0.18); // low tone = alert
              }
            },2000);
          }
          return;
        } else {
          if(!faceVisible.current){
            faceVisible.current=true;
            clearTimeout(lookAwayTimer.current);
            if(lookAwayFired.current){
              lookAwayFired.current=false;
              fire('look_return');
              onAttentionChange?.('here');
            }
          }
        }

        const lm=results.multiFaceLandmarks[0];
        const W2=canvasRef.current?.width||640,H2=canvasRef.current?.height||480;

        // Smile
        const mW=d(p(lm,LM.MOUTH_LEFT,W2,H2),p(lm,LM.MOUTH_RIGHT,W2,H2));
        const fW=d(p(lm,LM.FACE_LEFT,W2,H2),p(lm,LM.FACE_RIGHT,W2,H2));
        const smR=fW>0?mW/fW:0;
        const moR=d(p(lm,LM.MOUTH_TOP,W2,H2),p(lm,LM.MOUTH_BOT,W2,H2))/(fW||1);
        // Smile detection — debounced 3 frames, don't spam neutral
        if(smR>0.36){
          smileF.current++;
          if(smileF.current===3) fire('smile',{intensity:smR});
          // Do NOT fire repeatedly while sustained — mouth was constantly moving!
        }else{
          if(smileF.current>=3) fire('neutral'); // only fire neutral when coming down from smile
          smileF.current=0;
          if(moR>0.12&&smileF.current===0) fire('surprised');
        }

        // Blink EAR
        const lE=d(p(lm,LM.L_EYE_TOP,W2,H2),p(lm,LM.L_EYE_BOT,W2,H2))/Math.max(d(p(lm,LM.L_EYE_L,W2,H2),p(lm,LM.L_EYE_R,W2,H2)),1);
        const rE=d(p(lm,LM.R_EYE_TOP,W2,H2),p(lm,LM.R_EYE_BOT,W2,H2))/Math.max(d(p(lm,LM.R_EYE_L,W2,H2),p(lm,LM.R_EYE_R,W2,H2)),1);
        const avgE=(lE+rE)/2;
        if(avgE<0.22){blinkF.current++;}
        else{if(blinkF.current>=2&&blinkF.current<=10){const n=Date.now();if(n-lastBlink.current>400){lastBlink.current=n;fire('blink');}}blinkF.current=0;}

        // Head rotation — smoother calculation with exponential moving average
        const nose=p(lm,LM.NOSE_TIP,W2,H2),forehead=p(lm,LM.FOREHEAD,W2,H2),chin=p(lm,LM.CHIN,W2,H2);
        const lCh=p(lm,LM.FACE_LEFT,W2,H2),rCh=p(lm,LM.FACE_RIGHT,W2,H2);
        const fc={x:(lCh.x+rCh.x)/2,y:(forehead.y+chin.y)/2};
        const fH=d(forehead,chin)||1,fW2=d(lCh,rCh)||1;
        // Raw values — reduced multipliers for less aggressive tracking
        const rawHeadY=-(nose.x-fc.x)/fW2*0.9;
        const rawHeadX=-(nose.y-fc.y)/fH*0.6;
        const le=p(lm,LM.L_EYE_L,W2,H2),re=p(lm,LM.R_EYE_R,W2,H2);
        const rawHeadZ=-(Math.atan2(re.y-le.y,re.x-le.x))*0.5;
        // Exponential moving average — smooths jitter
        const alpha=0.25; // lower = smoother but more lag
        if(!smoothHead.current){smoothHead.current={x:rawHeadX,y:rawHeadY,z:rawHeadZ};}
        smoothHead.current.x = alpha*rawHeadX+(1-alpha)*smoothHead.current.x;
        smoothHead.current.y = alpha*rawHeadY+(1-alpha)*smoothHead.current.y;
        smoothHead.current.z = alpha*rawHeadZ+(1-alpha)*smoothHead.current.z;
        onHeadRotation?.({x:smoothHead.current.x,y:smoothHead.current.y,z:smoothHead.current.z});

        const headY=smoothHead.current.y; const headX=smoothHead.current.x;
        setDbg(d=>({...d,smile:parseFloat(smR.toFixed(3)),ear:parseFloat(avgE.toFixed(3)),headY:parseFloat(headY.toFixed(2))}));

        // Draw
        const ctx=canvasRef.current?.getContext('2d');
        if(ctx){
          ctx.clearRect(0,0,W2,H2);
          ctx.strokeStyle=smR>0.36?'#22c55e':'#00d4ff';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(p(lm,LM.MOUTH_LEFT,W2,H2).x,p(lm,LM.MOUTH_LEFT,W2,H2).y);ctx.lineTo(p(lm,LM.MOUTH_RIGHT,W2,H2).x,p(lm,LM.MOUTH_RIGHT,W2,H2).y);ctx.stroke();
          [[LM.L_EYE_L,LM.L_EYE_R,LM.L_EYE_TOP,LM.L_EYE_BOT],[LM.R_EYE_L,LM.R_EYE_R,LM.R_EYE_TOP,LM.R_EYE_BOT]].forEach(([l,r,t,b])=>{
            ctx.strokeStyle=avgE<0.22?'#f59e0b':'#00d4ff';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.moveTo(p(lm,l,W2,H2).x,p(lm,l,W2,H2).y);ctx.lineTo(p(lm,r,W2,H2).x,p(lm,r,W2,H2).y);ctx.stroke();
            ctx.beginPath();ctx.moveTo(p(lm,t,W2,H2).x,p(lm,t,W2,H2).y);ctx.lineTo(p(lm,b,W2,H2).x,p(lm,b,W2,H2).y);ctx.stroke();
          });
          // Head direction arrow
          ctx.strokeStyle='rgba(167,139,250,0.7)';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(fc.x,fc.y);ctx.lineTo(fc.x+headY*80,fc.y+headX*80);ctx.stroke();
        }
      });
      faceRef.current=fm;

      // ── Hands ──────────────────────────────────────────────────────────
      const hm=new window.Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
      hm.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
      hm.onResults(results=>{
        if(!results.multiHandLandmarks?.length){
          wristHist.current=[];
          if(coverActive.current){coverActive.current=false;fire('cover_face',{active:false});}
          setDbg(d=>({...d,wave:0,fist:false}));return;
        }
        const W2=canvasRef.current?.width||640,H2=canvasRef.current?.height||480;
        const hand=results.multiHandLandmarks[0];
        const wx=hand[0].x*W2;
        wristHist.current.push(wx);if(wristHist.current.length>12)wristHist.current.shift();
        if(wristHist.current.length>=8){
          const range=Math.max(...wristHist.current)-Math.min(...wristHist.current);
          setDbg(d=>({...d,wave:Math.round(range)}));
          if(range>90){const n=Date.now();if(n-waveCool.current>1500){waveCool.current=n;fire('wave');onWaveDetected?.();}}
        }
        const fist=isHandClosed(hand);
        setDbg(d=>({...d,fist}));
        if(fist&&!coverActive.current){coverActive.current=true;fire('cover_face',{active:true});playBeep(520,0.2,0.12);}
        else if(!fist&&coverActive.current){coverActive.current=false;fire('cover_face',{active:false});}
        // Draw hand
        const ctx=canvasRef.current?.getContext('2d');
        if(ctx){
          const C=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
          ctx.strokeStyle=fist?'#ef4444':'#f97316';ctx.lineWidth=2;
          C.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(hand[a].x*W2,hand[a].y*H2);ctx.lineTo(hand[b].x*W2,hand[b].y*H2);ctx.stroke();});
          ctx.fillStyle=fist?'#ef4444':'#fbbf24';
          hand.forEach(pt=>{ctx.beginPath();ctx.arc(pt.x*W2,pt.y*H2,4,0,Math.PI*2);ctx.fill();});
        }
      });
      handsRef.current=hm;

      const cam=new window.Camera(videoRef.current,{
        onFrame:async()=>{
          if(faceRef.current)await faceRef.current.send({image:videoRef.current});
          if(handsRef.current)await handsRef.current.send({image:videoRef.current});
        },width:W,height:H,
      });
      cameraRef.current=cam;cam.start();
      setMirroring(true);setStatus('running');
      startCameraRef.current=null;
    }catch(err){setLoadErr(err.name==='NotAllowedError'?'Camera access denied. Allow in browser settings.':err.message);setStatus('error');}
  };

  const stop=()=>{
    cameraRef.current?.stop();faceRef.current?.close();handsRef.current?.close();
    streamRef.current?.getTracks().forEach(t=>t.stop());
    clearTimeout(lookAwayTimer.current);
    onHeadRotation?.(null);onAttentionChange?.('here');
    setMirroring(false);setStatus('ready');fire('neutral');
  };
  useEffect(()=>()=>stop(),[]);

  const accent='#7c3aed';

  // Web Audio beep — instant, no speechSynthesis lag
  const playBeep=(freq=440,dur=0.3,vol=0.15)=>{
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=freq;o.type='sine';
      g.gain.setValueAtTime(vol,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
      o.start();o.stop(ctx.currentTime+dur);
    }catch(e){}
  };

  // inlineMode: when true, fills parent column. When false, floating panel.
  // ALL detection logic unchanged — only outermost container style differs.
  // inlineMode: fills parent container completely
  // IMPORTANT: parent must have explicit height for this to work
  const outerStyle = inlineMode
    ? { display:'flex', flexDirection:'column', height:'100%', minHeight:'300px',
        padding:'10px', overflow:'hidden auto', background:'transparent',
        boxSizing:'border-box' }
    : { position:'fixed', bottom:'80px', right:'20px', zIndex:500,
        background:'var(--bg-card)', border:`2px solid ${accent}55`,
        borderRadius:'20px', padding:'14px', width:'310px',
        boxShadow:`0 8px 40px ${accent}33`, backdropFilter:'blur(20px)' };

  const content_jsx = (
    <>
<div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
        <span style={{fontSize:'1.1rem'}}>🎭</span>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.62rem',fontWeight:'700',color:accent}}>FACE MIRROR</span>
        <span style={{fontSize:'0.58rem',color:status==='running'?'#22c55e':'#f59e0b',marginLeft:'4px'}}>● {status==='running'?'LIVE':'IDLE'}</span>
        <button onClick={()=>{stop();onClose();}} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'1rem'}}>✕</button>
      </div>

      <div style={{position:'relative',borderRadius:'10px',overflow:'hidden',background:'#000',marginBottom:'7px',flex:inlineMode?'1 1 0':'none',aspectRatio:inlineMode?'unset':'4/3',minHeight:inlineMode?'200px':'unset',maxHeight:inlineMode?'none':'none'}}>
        <video ref={videoRef} muted playsInline style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:mirroring?'block':'none'}}/>
        <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',transform:'scaleX(-1)',pointerEvents:'none',display:mirroring?'block':'none'}}/>
        {status!=='running'&&(
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px',background:'rgba(0,0,0,0.85)',padding:'16px',textAlign:'center'}}>
            {status==='loading'||status==='starting'?(
              <><motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}} style={{width:'28px',height:'28px',borderRadius:'50%',border:`3px solid ${accent}44`,borderTopColor:accent}}/><span style={{fontFamily:'Syne,sans-serif',fontSize:'0.72rem',color:'var(--text-muted)'}}>{status==='loading'?'Loading MediaPipe...':'Starting camera...'}</span></>
            ):status==='error'?(
              <><span style={{fontSize:'2rem'}}>📷</span><span style={{fontFamily:'Syne,sans-serif',fontSize:'0.70rem',color:'#ef4444',lineHeight:1.4}}>{loadErr}</span><button onClick={()=>{setLoadErr('');setStatus('ready');}} style={{background:`${accent}22`,border:`1px solid ${accent}55`,borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontFamily:'Orbitron,sans-serif',fontSize:'0.60rem',color:accent,fontWeight:'700'}}>🔄 Retry</button></>
            ):(
              <div style={{cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}} onClick={startCamera}>
                <div style={{width:'52px',height:'52px',borderRadius:'50%',background:`${accent}33`,border:`2px solid ${accent}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.6rem'}}>🎭</div>
                <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.62rem',color:accent,fontWeight:'700'}}>Click to Start</span>
              </div>
            )}
          </div>
        )}
        {mirroring&&(
          <div style={{position:'absolute',top:'8px',left:'8px',display:'flex',flexDirection:'column',gap:'4px'}}>
            {dbg.smile>0.36&&<motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} style={{background:'rgba(34,197,94,0.85)',borderRadius:'10px',padding:'2px 9px',fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',color:'white',fontWeight:'700'}}>😊 SMILE</motion.div>}
            {dbg.ear<0.22&&<div style={{background:'rgba(245,158,11,0.85)',borderRadius:'10px',padding:'2px 9px',fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',color:'white',fontWeight:'700'}}>😑 BLINK</div>}
            {dbg.wave>90&&<motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} style={{background:'rgba(249,115,22,0.85)',borderRadius:'10px',padding:'2px 9px',fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',color:'white',fontWeight:'700'}}>👋 WAVE</motion.div>}
            {dbg.fist&&<motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} style={{background:'rgba(239,68,68,0.85)',borderRadius:'10px',padding:'2px 9px',fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',color:'white',fontWeight:'700'}}>✊ FIST→COVER</motion.div>}
          </div>
        )}
      </div>

      {mirroring&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'4px',marginBottom:'10px'}}>
          {[{label:'SMILE',v:`${Math.round(dbg.smile*100)}%`,c:'#22c55e',f:dbg.smile/0.5},{label:'EAR',v:dbg.ear.toFixed(2),c:dbg.ear<0.22?'#f59e0b':'#00d4ff',f:dbg.ear/0.4},{label:'HEAD',v:`${dbg.headY.toFixed(1)}`,c:'#a78bfa',f:Math.abs(dbg.headY)},{label:'FIST',v:dbg.fist?'✊':'ok',c:dbg.fist?'#ef4444':'#94a3b8',f:dbg.fist?1:0}].map(m=>(
            <div key={m.label} style={{background:'var(--bg-secondary)',borderRadius:'8px',padding:'5px',textAlign:'center'}}>
              <p style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.45rem',color:'var(--text-muted)',margin:'0 0 2px'}}>{m.label}</p>
              <div style={{height:'3px',background:`${m.c}22`,borderRadius:'2px',overflow:'hidden',marginBottom:'2px'}}>
                <div style={{height:'100%',width:`${Math.min(100,m.f*100)}%`,background:m.c,transition:'width 0.1s'}}/>
              </div>
              <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.58rem',color:m.c,margin:0}}>{m.v}</p>
            </div>
          ))}
        </div>
      )}

      {status==='running'?(<motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={stop} style={{width:'100%',background:'rgba(239,68,68,0.15)',border:'1px solid #ef444455',borderRadius:'10px',padding:'9px',cursor:'pointer',fontFamily:'Orbitron,sans-serif',fontSize:'0.62rem',color:'#ef4444',fontWeight:'700'}}>⏹ Stop</motion.button>
      ):status==='ready'?(<motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startCamera} style={{width:'100%',background:`linear-gradient(135deg,${accent},${accent}aa)`,border:'none',borderRadius:'10px',padding:'9px',cursor:'pointer',fontFamily:'Orbitron,sans-serif',fontSize:'0.62rem',color:'white',fontWeight:'700'}}>🎭 Start Tracking</motion.button>):null}

      {/* ── MIC VIDEOCHAT BUTTON ── */}
      {mirroring&&(
        <div style={{marginTop:'8px'}}>
          {/* Video chat header */}
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
            <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',
              fontWeight:'700',color:accent,letterSpacing:'0.06em'}}>🎥 VIDEO CHAT MODE</span>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:'0.58rem',color:'var(--text-muted)'}}>
              — speak, avatar replies!
            </span>
          </div>
          <motion.button
            whileHover={{scale:micListening?1:1.02}} whileTap={{scale:0.97}}
            onClick={()=>{
              if(micListening){
                try{micRecRef.current?.stop();}catch{}
                setMicListening(false);setMicActive(false);setMicAnswer('');
                return;
              }
              const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
              if(!SR){alert('Voice input requires Chrome or Edge browser');return;}
              setMicActive(true);setMicListening(true);setMicAnswer('');
              const r=new SR();
              r.lang='en-US';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;
              r.onresult=e=>{
                const t=(e.results[0]?.[0]?.transcript||'').trim();
                setMicListening(false);
                if(!t){setMicActive(false);return;}
                // Show what was heard
                setMicAnswer(`💬 You said: "${t}" → Sending to avatar...`);
                setMicAnswering(true);
                // Dispatch to ChatBox — ChatBox will call send() which triggers full AI response + TTS
                // The avatar will reply in the chat AND speak it aloud
                if(onMicChat) {
                  onMicChat(t);
                } else {
                  // Fallback: dispatch custom event
                  window.dispatchEvent(new CustomEvent('facemirror-mic',{detail:{text:t}}));
                }
                // Clear status after 6s (give time for AI to respond)
                clearTimeout(micAnswerTimer.current);
                micAnswerTimer.current=setTimeout(()=>{
                  setMicAnswering(false);setMicActive(false);
                  setMicAnswer('✅ Avatar replied in chat!');
                  setTimeout(()=>setMicAnswer(''),3000);
                },6000);
              };
              r.onerror=e=>{
                setMicListening(false);setMicActive(false);setMicAnswer('');
                if(e.error==='not-allowed')alert('Microphone access denied. Please allow it in browser settings.');
                else if(e.error==='no-speech')setMicAnswer('No speech detected. Try again.');
              };
              r.onend=()=>setMicListening(false);
              micRecRef.current=r;
              try{r.start();}catch(e){
                console.error('Mic start failed:',e);
                setMicActive(false);setMicListening(false);
              }
            }}
            style={{
              width:'100%',borderRadius:'10px',padding:'10px 14px',cursor:'pointer',
              border:`2px solid ${micListening?'#ef4444':micAnswering?'#22c55e':accent}`,
              background:micListening?'rgba(239,68,68,0.14)':micAnswering?'rgba(34,197,94,0.10)':`${accent}14`,
              fontFamily:'Orbitron,sans-serif',fontSize:'0.62rem',fontWeight:'700',
              color:micListening?'#ef4444':micAnswering?'#22c55e':accent,
              display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
              transition:'all 0.2s',
            }}>
            <motion.span
              animate={micListening?{scale:[1,1.4,1],opacity:[1,0.6,1]}:{scale:1}}
              transition={{duration:0.5,repeat:Infinity}}>
              {micListening?'🔴':micAnswering?'⏳':'🎤'}
            </motion.span>
            <span>
              {micListening?'🎙 LISTENING — click to stop'
               :micAnswering?'Avatar is thinking...'
               :'Tap & Speak to Avatar'}
            </span>
          </motion.button>
          {/* Status / feedback */}
          {micAnswer&&(
            <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{marginTop:'6px',padding:'7px 10px',
                background:micAnswer.includes('✅')?'rgba(34,197,94,0.08)':`${accent}0a`,
                border:`1px solid ${micAnswer.includes('✅')?'#22c55e44':`${accent}28`}`,
                borderRadius:'8px',fontFamily:'Syne,sans-serif',
                fontSize:'0.64rem',
                color:micAnswer.includes('✅')?'#22c55e':accent,
                lineHeight:1.4}}>
              {micAnswer}
            </motion.div>
          )}
          {/* Tip */}
          {!micActive&&!micAnswer&&(
            <p style={{fontFamily:'Syne,sans-serif',fontSize:'0.58rem',
              color:'var(--text-muted)',margin:'5px 0 0',textAlign:'center'}}>
              Avatar's reply will appear in the chat with voice 🔊
            </p>
          )}
        </div>
      )}

      {mirroring&&(<div style={{marginTop:'8px',padding:'8px 10px',background:`${accent}0a`,border:`1px solid ${accent}22`,borderRadius:'8px'}}>
        {[['😊','Smile → avatar smiles',dbg.smile>0.36],['😑','Blink → avatar blinks',dbg.ear<0.22],['👋','Wave → avatar waves',dbg.wave>90],['🤚','Move head → avatar follows',Math.abs(dbg.headY)>0.1],['✊','Fist → avatar covers face',dbg.fist],['👀','Look away → avatar calls you!',false]].map(([icon,text,active])=>(
          <div key={icon} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px'}}>
            <span style={{fontSize:'0.8rem'}}>{icon}</span>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:'0.61rem',color:active?'#22c55e':'var(--text-muted)',fontWeight:active?'700':'400'}}>{text}</span>
            {active&&<span style={{marginLeft:'auto',fontSize:'0.6rem',color:'#22c55e'}}>✅</span>}
          </div>
        ))}
      </div>)}
    </>
  );
  if (inlineMode) return <div style={outerStyle}>{content_jsx}</div>;
  return <motion.div initial={{opacity:0,scale:0.9,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9}} style={outerStyle}>{content_jsx}</motion.div>;
}