/**
 * ChatPage — Final
 * Layout: [SVG Avatar 22%] [Chat 65%] [FaceMirror/ML sidebar 13%]
 * Test mode: Camera | Small Avatar | Chat
 * Proctor audio: cooldown 4s, no spam
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBox        from '../components/ChatBox';
import SVGAvatar      from '../components/SVGAvatar';
import FaceMoodMirror from '../components/FaceMoodMirror';
import ParticleBackground from '../components/ParticleBackground';
import MLInsightsPanel, { analyzeText } from '../components/MLInsightsPanel';
import VideoRecommendation from '../components/VideoRecommendation';
import ProctoringPanel    from '../components/ProctoringPanel';
import { useGestureAvatar } from '../hooks/useGestureAvatar';
import { useAvatar }  from '../context/AvatarContext';
import { AVATARS }    from '../context/AvatarContext';

function timeNow() { return new Date().toLocaleTimeString('en-IN',{hour12:false}); }

function playAlert(type='warning') {
  try {
    const ctx = new(window.AudioContext||window.webkitAudioContext)();
    const cfgs = {
      high:    [{f:880,t:0},{f:660,t:0.18},{f:880,t:0.36}],
      warning: [{f:500,t:0},{f:380,t:0.22}],
      info:    [{f:440,t:0}],
    };
    (cfgs[type]||cfgs.warning).forEach(({f,t})=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.frequency.value=f;o.type='sine';
      g.gain.setValueAtTime(0.25,ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.3);
      o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.35);
    });
  }catch{}
}

function useBehaviorTracker(){
  const h=useRef([]);
  const record=useCallback((a)=>{if(!a)return;h.current.push(a);if(h.current.length>50)h.current.shift();},[]);
  const getSummary=useCallback(()=>{
    if(!h.current.length)return null;
    const mc={};let tw=0;
    h.current.forEach(a=>{mc[a.mood]=(mc[a.mood]||0)+1;tw+=a.wordCount||0;});
    const dm=Object.entries(mc).sort((a,b)=>b[1]-a[1])[0]?.[0]||'neutral';
    return{messageCount:h.current.length,dominantMood:dm,avgWords:Math.round(tw/h.current.length),moodCounts:mc};
  },[]);
  return{record,getSummary};
}

function getHint(s,a){
  if(!s||!a)return null;
  if(s.messageCount>=3&&(a.mood==='sad'||a.mood==='frustrated'))return{text:`You seem ${a.mood} — want calming? 💙`,color:'#60a5fa'};
  if(s.messageCount>=3&&s.avgWords<6)return{text:"Keeping responses short! ✂️",color:'#a78bfa'};
  if(a.isSarcastic)return{text:"Detected sarcasm — adjusting! 😏",color:'#f59e0b'};
  if(a.mood==='excited')return{text:"Love the energy! ⚡",color:'#22c55e'};
  return null;
}

export default function ChatPage(){
  const{selectedAvatar,setSelectedAvatar}=useAvatar();
  const{handleGesture}=useGestureAvatar();
  const{record,getSummary}=useBehaviorTracker();
  const accent=selectedAvatar?.color||'#7c3aed';

  const[isSpeaking,setIsSpeaking]=useState(false);
  const[isLoading,setIsLoading]=useState(false);
  const[keywords,setKeywords]=useState([]);
  const[showMirror,setShowMirror]=useState(false);
  const[headRotation,setHeadRotation]=useState(null);
  const[mirrorSmile,setMirrorSmile]=useState(false);
  const[coverFace,setCoverFace]=useState(false);
  const[attentionBanner,setAttentionBanner]=useState(null);
  const[mlAnalysis,setMlAnalysis]=useState(null);
  const[showMLPanel,setShowMLPanel]=useState(false);
  const[testModeOn,setTestModeOn]=useState(false);
  const[proctoringEvents,setProctoringEvents]=useState([]);
  const[adaptiveHint,setAdaptiveHint]=useState(null);
  const[focusVideoTrigger,setFocusVideoTrigger]=useState(false);
  const focusVideoCooldown=useRef(0);
  const[avatarState,setAvatarState]=useState('idle');

  const chatAreaRef=useRef(null);
  const headTurnCount=useRef(0);
  const lastAlertTime=useRef(0);
  const attentionTimer=useRef(null);
  const bannerTimer=useRef(null);
  const audioUnlocked=useRef(false);

  const unlockAudio=useCallback(()=>{
    if(audioUnlocked.current)return;
    audioUnlocked.current=true;
    try{new(window.AudioContext||window.webkitAudioContext)().resume();}catch{}
  },[]);

  useEffect(()=>{
    if(isSpeaking)setAvatarState('speaking');
    else if(isLoading)setAvatarState('thinking');
    else setAvatarState('idle');
  },[isSpeaking,isLoading]);

  useEffect(()=>{
    if(testModeOn&&!showMirror)setShowMirror(true);
  },[testModeOn]);

  const voiceAlert=useCallback((msg)=>{
    if(!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(msg);
    u.rate=1.05;u.volume=1.0;u.pitch=selectedAvatar?.voice?.pitch||1.0;
    window.speechSynthesis.speak(u);
  },[selectedAvatar]);

  // addViolation with 4s cooldown — no spam
  const addViolation=useCallback((msg,severity='medium')=>{
    const now=Date.now();
    if(now-lastAlertTime.current<4000)return;
    lastAlertTime.current=now;
    setProctoringEvents(prev=>[...prev,{message:msg,severity,time:timeNow()}]);
    playAlert(severity);
    setTimeout(()=>voiceAlert(msg),200);
  },[voiceAlert]);

  const handleUserMessage=useCallback((txt)=>{
    const a=analyzeText(txt);if(!a)return;
    setMlAnalysis(a);record(a);
    const hint=getHint(getSummary(),a);
    setAdaptiveHint(hint);
    if(hint)setTimeout(()=>setAdaptiveHint(null),5000);
  },[record,getSummary]);

  // When FaceMirror detects user waving → trigger avatar wave back
  const [avatarWaveBack, setAvatarWaveBack] = useState(false);
  const waveBackTimer = useRef(null);
  const triggerAvatarWave = useCallback(()=>{
    setAvatarWaveBack(true);
    clearTimeout(waveBackTimer.current);
    waveBackTimer.current = setTimeout(()=>setAvatarWaveBack(false), 2500);
  },[]);

  const onGesture=useCallback((gesture)=>{
    if(gesture.type==='cover_face'){setCoverFace(gesture.active);return;}
    if(gesture.type==='smile'){setMirrorSmile(true);setTimeout(()=>setMirrorSmile(false),1500);}
    if(gesture.type==='look_away'){
      clearTimeout(bannerTimer.current);
      setAttentionBanner('away');
      bannerTimer.current=setTimeout(()=>setAttentionBanner(null),4000);
      const now=Date.now();
      const elapsed=now-lastAlertTime.current;
      // Always play soft beep (non-intrusive, no cooldown)
      playAlert('info');
      // Trigger focus video after sustained distraction (cooldown 30s)
      const now2=Date.now();
      if(now2-focusVideoCooldown.current>30000){
        focusVideoCooldown.current=now2;
        setFocusVideoTrigger(true);
        setTimeout(()=>setFocusVideoTrigger(false),15000);
      }
      if(testModeOn && elapsed>=3500){
        // Voice alert with cooldown in test mode
        lastAlertTime.current=now;
        setTimeout(()=>voiceAlert('Please look at the screen'),150);
        addViolation('Warning: User looked away from screen','medium');
      }
    }
    if(gesture.type==='look_return'){
      clearTimeout(bannerTimer.current);
      setAttentionBanner('here');
      bannerTimer.current=setTimeout(()=>setAttentionBanner(null),2500);
    }
    handleGesture(gesture);
  },[handleGesture,testModeOn,addViolation,voiceAlert]);

  const onHeadRotation=useCallback((rot)=>{
    setHeadRotation(rot);
    if(!rot||!testModeOn)return;
    const absY=Math.abs(rot.y||0);
    if(absY>0.60){
      clearTimeout(attentionTimer.current);
      attentionTimer.current=setTimeout(()=>{
        addViolation('Warning: Face not visible — face the screen!','high');
        voiceAlert('Face not detected. Please face the screen.');
      },1500);
    }else{clearTimeout(attentionTimer.current);}
    if(absY>0.40){
      headTurnCount.current++;
      if(headTurnCount.current===4)addViolation('Warning: Frequent head turning detected','medium');
      else if(headTurnCount.current>=8){addViolation('Warning: Suspicious movement!','high');headTurnCount.current=0;}
    }
  },[testModeOn,addViolation,voiceAlert]);

  const behaviorSummary=getSummary();
  const mirrorProps={
    onGestureDetected:onGesture,onHeadRotation,
    onAttentionChange:(v)=>{
      if(v==='away'){clearTimeout(bannerTimer.current);setAttentionBanner('away');bannerTimer.current=setTimeout(()=>setAttentionBanner(null),4000);}
    },
    // Wave detection → avatar waves back
    onWaveDetected: triggerAvatarWave,
    // Mic video chat → dispatch to ChatBox via custom event
    onMicChat:(text)=>{
      window.dispatchEvent(new CustomEvent('facemirror-mic',{detail:{text}}));
    },
    inlineMode:true,autoStart:testModeOn,
    onClose:()=>{setShowMirror(false);if(testModeOn)setTestModeOn(false);},
  };

  const MOOD_TO_EXPR={happy:'happy',excited:'excited',thinking:'thinking',surprised:'surprised',sad:'sad',explaining:'happy',nodding:'happy'};
  const{avatarMood}=useAvatar();
  const expr=MOOD_TO_EXPR[avatarMood]||'happy';

  const Btn=({active,onClick,children,activeColor})=>(
    <button onClick={onClick} style={{
      background:active?`${activeColor||accent}18`:'var(--bg-secondary)',
      border:`1px solid ${active?activeColor||accent:'var(--border-color)'}`,
      borderRadius:'8px',padding:'5px 9px',cursor:'pointer',
      fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',
      color:active?activeColor||accent:'var(--text-muted)',
      transition:'all 0.2s',whiteSpace:'nowrap',
    }}>{children}</button>
  );

  return(
    <div onClick={unlockAudio} style={{minHeight:'100vh',background:'var(--bg-primary)',paddingTop:'64px',position:'relative',overflow:'hidden'}}>
      <ParticleBackground/>
      <div style={{position:'fixed',top:'25%',left:'50%',transform:'translateX(-50%)',width:'700px',height:'350px',borderRadius:'50%',background:`radial-gradient(ellipse,${accent}07 0%,transparent 70%)`,filter:'blur(70px)',pointerEvents:'none',zIndex:0,transition:'all 1s'}}/>

      <div style={{maxWidth:'1440px',margin:'0 auto',padding:'10px 14px',position:'relative',zIndex:1,height:'calc(100vh - 64px)',display:'flex',flexDirection:'column',gap:'8px'}}>

        {/* ── TOP BAR ────────────────────────────────────────────── */}
        {/* ── COMBINED TOP BAR: Avatar selector + controls ─── */}
        <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}}
          style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',
            borderRadius:'14px',padding:'6px 12px',display:'flex',
            alignItems:'center',gap:'8px',flexShrink:0,
            backdropFilter:'blur(20px)',overflow:'hidden'}}>

          {/* Avatar selector — compact horizontal strip */}
          <div style={{display:'flex',gap:'5px',alignItems:'center',
            overflowX:'auto',scrollbarWidth:'none',flex:1,minWidth:0}}>
            <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.52rem',
              fontWeight:'700',color:'var(--text-muted)',letterSpacing:'0.1em',
              flexShrink:0,paddingRight:'4px'}}>AVATAR</span>
            {AVATARS.map(av=>(
              <motion.button key={av.id}
                whileHover={{scale:1.08}} whileTap={{scale:0.94}}
                onClick={()=>setSelectedAvatar(av)}
                style={{
                  display:'flex',flexDirection:'column',alignItems:'center',
                  gap:'2px',padding:'5px 8px',borderRadius:'10px',cursor:'pointer',
                  flexShrink:0,
                  border:`1.5px solid ${selectedAvatar?.id===av.id?av.color:'var(--border-color)'}`,
                  background:selectedAvatar?.id===av.id?`${av.color}18`:'var(--bg-secondary)',
                  transition:'all 0.18s',
                }}>
                <span style={{fontSize:'1.2rem',lineHeight:1}}>{av.emoji}</span>
                <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.44rem',
                  fontWeight:'700',color:selectedAvatar?.id===av.id?av.color:'var(--text-muted)',
                  letterSpacing:'0.03em'}}>{av.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Divider */}
          <div style={{width:'1px',height:'36px',background:'var(--border-color)',flexShrink:0}}/>

          {/* Controls */}
          {isSpeaking&&<motion.div animate={{scale:[1,1.4,1]}} transition={{duration:0.5,repeat:Infinity}}
            style={{width:'7px',height:'7px',borderRadius:'50%',background:accent,
              boxShadow:`0 0 8px ${accent}`,flexShrink:0}}/>}
          <Btn active={showMLPanel} onClick={()=>setShowMLPanel(!showMLPanel)} activeColor="#8b5cf6">🧠</Btn>
          <Btn active={showMirror}  onClick={()=>setShowMirror(!showMirror)}  activeColor={accent}>🎭</Btn>
          <Btn active={testModeOn}  activeColor="#ef4444"
            onClick={()=>{
              const en=!testModeOn;setTestModeOn(en);
              if(en){headTurnCount.current=0;lastAlertTime.current=0;setProctoringEvents([{message:'Test Mode active',severity:'info',time:timeNow()}]);}
            }}>
            {testModeOn?'🔴':'🎓'}
          </Btn>
        </motion.div>

        {/* ── BANNERS ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {attentionBanner&&(
            <motion.div key="ab" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{background:attentionBanner==='away'?'rgba(239,68,68,0.09)':'rgba(34,197,94,0.09)',border:`1px solid ${attentionBanner==='away'?'#ef444433':'#22c55e33'}`,borderRadius:'10px',padding:'5px 14px',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
              <span>{attentionBanner==='away'?'👀':'👋'}</span>
              <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',fontWeight:'700',color:attentionBanner==='away'?'#ef4444':'#22c55e'}}>
                {attentionBanner==='away'?`${selectedAvatar?.emoji} ${selectedAvatar?.name}: Hey, look at me! 👀`:`${selectedAvatar?.emoji} ${selectedAvatar?.name}: Welcome back! 😊`}
              </span>
            </motion.div>
          )}
          {adaptiveHint&&(
            <motion.div key="ah" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{background:`${adaptiveHint.color}0d`,border:`1px solid ${adaptiveHint.color}33`,borderRadius:'10px',padding:'5px 14px',display:'flex',alignItems:'center',gap:'7px',flexShrink:0}}>
              <span style={{fontFamily:'Syne,sans-serif',fontSize:'0.68rem',color:adaptiveHint.color,fontWeight:'600'}}>{selectedAvatar?.emoji} {adaptiveHint.text}</span>
            </motion.div>
          )}
        </AnimatePresence>



        {/* ── MAIN GRID ──────────────────────────────────────────── */}
        {testModeOn&&showMirror?(
          /* TEST MODE */
          <div style={{flex:1,display:'grid',minHeight:0,gap:'10px',gridTemplateColumns:'minmax(0,1fr) minmax(110px,0.4fr) minmax(0,1.5fr)'}}>
            <style>{`@media(max-width:720px){.tg{grid-template-columns:1fr !important;}}`}</style>
            {/* Camera */}
            <motion.div initial={{opacity:0,x:-18}} animate={{opacity:1,x:0}}
              style={{display:'flex',flexDirection:'column',minHeight:0,overflow:'hidden',background:'var(--bg-card)',border:'2px solid #ef444455',borderRadius:'16px'}}>
              <div style={{padding:'7px 12px',borderBottom:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.06)',display:'flex',alignItems:'center',gap:'7px',flexShrink:0}}>
                <motion.div animate={{scale:[1,1.5,1]}} transition={{duration:1.1,repeat:Infinity}} style={{width:'7px',height:'7px',borderRadius:'50%',background:'#ef4444'}}/>
                <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',fontWeight:'700',color:'#ef4444'}}>PROCTORING LIVE</span>
              </div>
              <div style={{flex:1,minHeight:'250px',height:'100%'}}><FaceMoodMirror {...mirrorProps}/></div>
            </motion.div>
            {/* Small avatar */}
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:'16px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 6px',overflow:'hidden'}}>
              <SVGAvatar size={90} state={avatarState} expression={expr} headRotation={headRotation} mirrorSmile={mirrorSmile} keywords={[]} forceWave={avatarWaveBack} coverFace={coverFace} containerRef={chatAreaRef}/>
            </motion.div>
            {/* Chat + panels */}
            <motion.div initial={{opacity:0,x:18}} animate={{opacity:1,x:0}}
              style={{display:'flex',flexDirection:'column',gap:'8px',minHeight:0,overflow:'hidden auto'}}>
              <div style={{flex:1,minHeight:0,overflow:'hidden',borderRadius:'16px'}}>
                <ChatBox onSpeakingChange={setIsSpeaking} onLoadingChange={setIsLoading} onKeywordsChange={setKeywords} onUserMessage={handleUserMessage}/>
              </div>
              <AnimatePresence>
                {showMLPanel&&(
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}>
                    <MLInsightsPanel analysis={mlAnalysis} behaviorData={behaviorSummary} isVisible={true} accentColor="#8b5cf6"/>
                  </motion.div>
                )}
              </AnimatePresence>
              <ProctoringPanel proctoringEvents={proctoringEvents} isEnabled={testModeOn} onToggle={()=>setTestModeOn(p=>!p)} accentColor={accent}/>
            </motion.div>
          </div>
        ):(
          /* NORMAL MODE */
          <div ref={chatAreaRef} style={{
            flex:1,display:'grid',minHeight:0,gap:'10px',
            gridTemplateColumns:showMirror||showMLPanel
              ?'minmax(110px,0.3fr) minmax(0,1.8fr) minmax(240px,0.65fr)'
              :'minmax(110px,0.3fr) minmax(0,1fr)',
          }}>
            <style>{`@media(max-width:860px){.ng{grid-template-columns:1fr !important;}.avcol{display:none !important;}}@media(max-width:600px){.ng{grid-template-columns:1fr !important;}}`}</style>

            {/* Avatar column */}
            <motion.div className="avcol" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}}
              style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',
                borderRadius:'16px',display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',
                padding:'12px 8px 8px',gap:'6px',overflow:'hidden',
                minHeight:0}}>
              {/* Avatar fills 85% of column height */}
              <div style={{flex:'1 1 0',width:'100%',minHeight:0,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <SVGAvatar size={180} state={avatarState} expression={expr}
                  headRotation={headRotation} mirrorSmile={mirrorSmile}
                  keywords={keywords} forceWave={avatarWaveBack}
                  coverFace={coverFace} containerRef={chatAreaRef}/>
              </div>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:'0.58rem',
                color:'var(--text-muted)',margin:0,textAlign:'center',
                lineHeight:1.5,padding:'0 2px',flexShrink:0}}>
                {selectedAvatar?.description}
              </p>
            </motion.div>

            {/* Chat */}
            <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{minHeight:0,overflow:'hidden',borderRadius:'16px'}}>
              <ChatBox onSpeakingChange={setIsSpeaking} onLoadingChange={setIsLoading} onKeywordsChange={setKeywords} onUserMessage={handleUserMessage}/>
            </motion.div>

            {/* Sidebar */}
            {(showMirror||showMLPanel||proctoringEvents.length>0)&&(
              <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}
                style={{display:'flex',flexDirection:'column',gap:'8px',minHeight:0,overflow:'hidden auto'}}>
                <AnimatePresence>
                  {showMirror&&(
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                      style={{background:'var(--bg-card)',border:`2px solid ${accent}44`,borderRadius:'16px',
                        overflow:'hidden',flexShrink:0,minHeight:'320px',height:'340px'}}>
                      <FaceMoodMirror {...mirrorProps}/>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showMLPanel&&(
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                      <MLInsightsPanel analysis={mlAnalysis} behaviorData={behaviorSummary} isVisible={true} accentColor="#8b5cf6"/>
                    </motion.div>
                  )}
                </AnimatePresence>
                <ProctoringPanel proctoringEvents={proctoringEvents} isEnabled={testModeOn} onToggle={()=>setTestModeOn(p=>!p)} accentColor={accent}/>
              </motion.div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
    </div>
  );
}