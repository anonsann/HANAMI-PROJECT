/**
 * Presentation primitives built on top of the vendored ReactBits components.
 *
 * Everything the app renders visually goes through here (or `ui.tsx`) so the
 * ReactBits set stays swappable: swap one line in this file and every page
 * follows. Components are tuned to the VNDB-style palette in `lib/theme.ts`
 * and collapse to plain markup when the user asks for reduced motion.
 */
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { cls, clamp } from '../lib/utils';
import { useInView, useMediaQuery } from '../hooks';
import { useMotionAllowed, usePalette } from '../lib/theme';
import { Icon } from './icons';
import {
  AnimatedContent,
  AnimatedList,
  
  BlurText,
  BorderGlow,
  CircularText,
  CountUp as RbCountUp,
  CurvedLoop,
  DecryptedText,
  DotGrid,
  FadeContent,
  FallingText,
  FuzzyText,
  GlareHover,
  GlitchText,
  GradientText,
  
  Magnet,
  
  RotatingText,
  ScrambledText,
  ScrollFloat,
  ScrollReveal,
  ShinyText,
  SplitText,
  StarBorder,
  TextLoop,
  TextPressure,
  TextType,
  TrueFocus,
  VariableProximity,
} from '../reactbits';

/**
 * The WebGL-backed backdrops (`Aurora`, `Iridescence`, `Particles`, `Waves`)
 * pull in `ogl` (~48 kB). They are decorative, so they load as async chunks and
 * never block the first paint — the DOM-only `DotGrid` variant stays static.
 */
const LazyAurora = lazy(() => import('../reactbits/Aurora').then((m) => ({ default: m.default })));
const LazyIridescence = lazy(() =>
  import('../reactbits/Iridescence').then((m) => ({ default: m.default }))
);
const LazyParticles = lazy(() => import('../reactbits/Particles').then((m) => ({ default: m.default })));
const LazyWaves = lazy(() => import('../reactbits/Waves').then((m) => ({ default: m.default })));

function AmbientWebGL({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/* -------------------------------------------------------------------------- */
/* Backgrounds                                                                */
/* -------------------------------------------------------------------------- */

export type AmbientVariant = 'aurora' | 'particles' | 'dots' | 'iridescence' | 'waves';

/**
 * Full-bleed ambient background. Deliberately quiet — it sits behind content
 * and must never compete with cover art.
 */
export function AmbientBackground({
  variant = 'aurora',
  className,
  intensity = 1
}: {
  variant?: AmbientVariant;
  className?: string;
  intensity?: number;
}) {
  const palette = usePalette();
  const motion = useMotionAllowed();
  if (!motion) return null;

  const common = 'pointer-events-none absolute inset-0 -z-10 overflow-hidden';

  switch (variant) {
    case 'particles':
      return (
        <div className={cls(common, className)} aria-hidden="true">
          <AmbientWebGL>
          <LazyParticles
            particleCount={Math.round(120 * intensity)}
            particleColors={[palette.brand, palette.brand2, palette.sky]}
            particleSpread={12}
            speed={0.06}
            moveParticlesOnHover={false}
            particleHoverFactor={0}
            alphaParticles
            particleBaseSize={60}
            sizeRandomness={0.8}
            cameraDistance={22}
            disableRotation={false}
          />
          </AmbientWebGL>
        </div>
      );
    case 'dots':
      return (
        <div className={cls(common, className)} aria-hidden="true">
          <DotGrid
            dotSize={3}
            gap={26}
            baseColor={palette.line}
            activeColor={palette.brand}
            proximity={130}
            speedTrigger={60}
            shockRadius={220}
            shockStrength={3}
            maxSpeed={4000}
            resistance={700}
            returnDuration={1.2}
          />
        </div>
      );
    case 'iridescence':
      return (
        <div className={cls(common, className)} aria-hidden="true">
          <AmbientWebGL>
            <LazyIridescence color={[0.32, 0.52, 0.82]} speed={0.6} amplitude={0.08} mouseReact />
          </AmbientWebGL>
        </div>
      );
    case 'waves':
      return (
        <div className={cls(common, className)} aria-hidden="true">
          <AmbientWebGL>
          <LazyWaves
            lineColor={palette.isDark ? 'rgba(123,184,221,0.35)' : 'rgba(26,93,180,0.28)'}
            backgroundColor="transparent"
            waveSpeedX={0.008}
            waveSpeedY={0.004}
            waveAmpX={22}
            waveAmpY={10}
            friction={0.94}
            tension={0.005}
            maxCursorMove={70}
            xGap={18}
            yGap={42}
          />
          </AmbientWebGL>
        </div>
      );
    case 'aurora':
    default:
      return (
        <div className={cls(common, className)} aria-hidden="true">
          <AmbientWebGL>
          <LazyAurora
            colorStops={[palette.brand, palette.sky, palette.brand2]}
            blend={palette.isDark ? 0.55 : 0.22}
            amplitude={0.7}
            speed={0.35}
          />
          </AmbientWebGL>
        </div>
      );
  }
}

/** Soft spotlight strip used behind page heroes. */
export function HeroBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cls('pointer-events-none absolute inset-0 -z-10', className)}
      style={{
        background:
          'radial-gradient(120% 80% at 15% 0%, rgb(var(--c-brand) / 0.10) 0%, transparent 55%), linear-gradient(180deg, rgb(var(--c-panel2) / 0.55) 0%, transparent 60%)'
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Text                                                                       */
/* -------------------------------------------------------------------------- */

/** Large page heading — blur-in on first paint. */
export function PageTitle({
  children,
  className,
  as = 'h1'
}: {
  children: string;
  className?: string;
  as?: 'h1' | 'h2';
}) {
  const motion = useMotionAllowed();
  if (!motion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <BlurText
      text={children}
      delay={90}
      animateBy="words"
      direction="top"
      stepDuration={0.32}
      className={cls('font-display font-semibold', className)}
    />
  );
}

/** Section heading — per-character reveal as it scrolls into view. */
export function SectionHeading({
  children,
  className
}: {
  children: string;
  className?: string;
}) {
  const motion = useMotionAllowed();
  if (!motion) return <h2 className={className}>{children}</h2>;
  return (
    <SplitText
      text={children}
      tag="h2"
      delay={40}
      duration={0.55}
      ease="power3.out"
      splitType="chars"
      from={{ opacity: 0, y: 18 }}
      to={{ opacity: 1, y: 0 }}
      className={cls('font-display font-semibold', className)}
    />
  );
}

/** Animated gradient heading for hero moments. */
export function GradientHeading({ children, className }: { children: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{children}</span>;
  return (
    <GradientText
      colors={['#1a5db4', '#7bb8dd', '#b5761a', '#1a5db4']}
      animationSpeed={6}
      showBorder={false}
      className={cls('font-display font-semibold', className)}
    >
      {children}
    </GradientText>
  );
}

/** Rotating typewriter line (ReactBits TextType). */
export function Typewriter({
  phrases,
  className,
  typingSpeed = 42,
  pauseDuration = 2600,
  deletingSpeed = 26
}: {
  phrases: string[];
  className?: string;
  typingSpeed?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
}) {
  const motion = useMotionAllowed();
  if (phrases.length === 0) return null;
  if (!motion) return <span className={className}>{phrases[0]}</span>;
  return (
    <TextType
      text={phrases}
      typingSpeed={typingSpeed}
      pauseDuration={pauseDuration}
      deletingSpeed={deletingSpeed}
      loop
      showCursor
      cursorCharacter="|"
      cursorClassName="text-brand"
      className={cls('inline', className)}
    />
  );
}

/** Word carousel — ReactBits RotatingText. */
export function Rotating({ words, className }: { words: string[]; className?: string }) {
  const motion = useMotionAllowed();
  if (words.length === 0) return null;
  if (!motion) return <span className={className}>{words[0]}</span>;
  return (
    <RotatingText
      texts={words}
      mainClassName={cls('inline-flex overflow-hidden', className)}
      staggerFrom="last"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-120%' }}
      staggerDuration={0.02}
      splitLevelClassName="overflow-hidden pb-0.5"
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      rotationInterval={2400}
    />
  );
}

/** Sheen-swept label — ReactBits ShinyText. */
export function Shiny({ children, className }: { children: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{children}</span>;
  return (
    <ShinyText
      text={children}
      disabled={false}
      speed={3}
      className={cls('font-semibold uppercase tracking-[0.18em]', className)}
    />
  );
}

/** Character-scramble reveal — ReactBits DecryptedText. */
export function Scramble({
  text,
  className,
  animateOn = 'view'
}: {
  text: string;
  className?: string;
  animateOn?: 'view' | 'hover';
}) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{text}</span>;
  return (
    <DecryptedText
      text={text}
      animateOn={animateOn}
      speed={44}
      maxIterations={12}
      sequential
      revealDirection="start"
      className={className}
      encryptedClassName="text-mute"
      parentClassName="inline-block"
    />
  );
}

/** Physics-driven word drop — ReactBits FallingText. */
export function FallingWords({
  text,
  highlight = [],
  className
}: {
  text: string;
  highlight?: string[];
  className?: string;
}) {
  const motion = useMotionAllowed();
  if (!motion) return <p className={className}>{text}</p>;
  return (
    <div className={className}>
      <FallingText
        text={text}
        highlightWords={highlight}
        trigger="hover"
        backgroundColor="transparent"
        wireframes={false}
        gravity={0.5}
        fontSize="1rem"
        mouseConstraintStiffness={0.6}
      />
    </div>
  );
}

/** Glitch label for error surfaces — ReactBits GlitchText. */
export function Glitch({ children, className }: { children: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{children}</span>;
  return (
    <GlitchText speed={0.9} enableShadows enableOnHover={false} className={className}>
      {children}
    </GlitchText>
  );
}

/** Distorted headline, used on the 404 page — ReactBits FuzzyText. */
export function Fuzzy({ children, className }: { children: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{children}</span>;
  return (
    <FuzzyText
      fontSize="clamp(2.5rem, 9vw, 7rem)"
      fontWeight={800}
      fontFamily="inherit"
      color="rgb(var(--c-brand))"
      enableHover
      baseIntensity={0.16}
      hoverIntensity={0.4}
      className={className}
    >
      {children}
    </FuzzyText>
  );
}

/** Marquee strip — ReactBits CurvedLoop. */
export function Marquee({ text, className }: { text: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <p className={className}>{text}</p>;
  return (
    <CurvedLoop
      marqueeText={text}
      speed={1.4}
      curveAmount={280}
      direction="left"
      interactive
      className={cls('text-mute', className)}
    />
  );
}

/** Counting number — ReactBits CountUp (spring, starts when visible). */
export function CountUp({
  value,
  duration = 1.4,
  className,
  separator = ','
}: {
  value: number;
  duration?: number;
  className?: string;
  separator?: string;
}) {
  const motion = useMotionAllowed();
  const [tick, setTick] = useState(0);

  // CountUp updates via a spring on `to`; a keyed remount restarts it cleanly
  // when the underlying value changes (e.g. live DB stats).
  useEffect(() => setTick((t) => t + 1), [value]);

  if (!motion) return <span className={className}>{value.toLocaleString('en-US')}</span>;
  return (
    <RbCountUp
      key={tick}
      to={value}
      from={0}
      duration={duration}
      separator={separator}
      className={className}
    />
  );
}

/** Circular rotating badge — ReactBits CircularText. */
export function CircularBadge({ text, className }: { text: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return null;
  return (
    <CircularText
      text={text}
      spinDuration={22}
      onHover="speedUp"
      className={cls('text-faint', className)}
    />
  );
}

/** Pointer-pressure headline — ReactBits TextPressure. */
export function PressureText({ text, className }: { text: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{text}</span>;
  return (
    <TextPressure
      text={text}
      flex
      alpha={false}
      stroke={false}
      width
      weight
      italic={false}
      textColor="rgb(var(--c-brand2))"
      strokeColor="rgb(var(--c-brand))"
      minFontSize={28}
      className={className}
    />
  );
}

/** Focus-cycling wordmark — ReactBits TrueFocus. */
export function FocusWords({ words, className }: { words: string[]; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{words.join(' ')}</span>;
  return (
    <div className={className}>
      <TrueFocus
        sentence={words.join(' ')}
        manualMode={false}
        blurAmount={4}
        borderColor="rgb(var(--c-brand))"
        glowColor="rgba(var(--c-brand), 0.35)"
        animationDuration={0.4}
        pauseBetweenAnimations={1.1}
      />
    </div>
  );
}

/** Hover-proximity text — ReactBits VariableProximity. */
export function ProximityText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{text}</span>;
  return (
    <div ref={ref} className={className}>
      <VariableProximity
        label={text}
        containerRef={ref}
        fromFontVariationSettings="'wght' 400, 'opsz' 9"
        toFontVariationSettings="'wght' 700, 'opsz' 24"
        radius={90}
        falloff="linear"
      />
    </div>
  );
}

/** Scrubbing scroll reveal for long paragraphs — ReactBits ScrollReveal. */
export function ScrollWords({ children, className }: { children: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <p className={className}>{children}</p>;
  return (
    <ScrollReveal
      baseOpacity={0.16}
      baseRotation={2}
      blurStrength={5}
      containerClassName={className}
      textClassName="text-ink"
    >
      {children}
    </ScrollReveal>
  );
}

/** Word-by-word scroll float — ReactBits ScrollFloat. */
export function FloatHeading({ children, className }: { children: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <h2 className={className}>{children}</h2>;
  return (
    <ScrollFloat
      animationDuration={0.9}
      ease="back.inOut(2)"
      scrollStart="center bottom+=45%"
      scrollEnd="bottom bottom-=35%"
      stagger={0.02}
      containerClassName={className}
      textClassName="font-display font-semibold text-brand2"
    >
      {children}
    </ScrollFloat>
  );
}

/** Text ribbon travelling along an SVG path — ReactBits TextLoop. */
export function LoopRibbon({
  text,
  className,
  shape = 'wave'
}: {
  text: string;
  className?: string;
  shape?: 'wave' | 'circle' | 'infinity' | 'arch' | 'line';
}) {
  const palette = usePalette();
  const motion = useMotionAllowed();
  if (!motion) return <p className={className}>{text}</p>;
  return (
    <TextLoop
      text={text}
      shape={shape}
      speed={0.9}
      direction="forward"
      separator="•"
      fontSize={13}
      fontWeight={600}
      letterSpacing={2}
      uppercase
      color={palette.faint}
      pauseOnHover
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Motion wrappers                                                            */
/* -------------------------------------------------------------------------- */

/** Scroll-triggered fade/slide — ReactBits FadeContent. */
export function Reveal({
  children,
  className,
  delay = 0,
  blur = true,
  duration = 620
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  blur?: boolean;
  duration?: number;
}) {
  const motion = useMotionAllowed();
  if (!motion) return <div className={className}>{children}</div>;
  return (
    <FadeContent
      blur={blur}
      duration={duration}
      delay={delay}
      threshold={0.08}
      initialOpacity={0}
      className={className}
    >
      {children}
    </FadeContent>
  );
}

/** Slide-in on scroll — ReactBits AnimatedContent. */
export function SlideIn({
  children,
  className,
  direction = 'vertical',
  distance = 34,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal';
  distance?: number;
  delay?: number;
}) {
  const motion = useMotionAllowed();
  if (!motion) return <div className={className}>{children}</div>;
  return (
    <AnimatedContent
      distance={distance}
      direction={direction}
      reverse={false}
      duration={0.7}
      ease="power3.out"
      initialOpacity={0}
      animateOpacity
      scale={1}
      threshold={0.08}
      delay={delay}
      className={className}
    >
      {children}
    </AnimatedContent>
  );
}

/** Magnetic pull on hover — ReactBits Magnet. */
export function Magnetize({
  children,
  strength = 24,
  className
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const motion = useMotionAllowed();
  if (!motion) return <div className={className}>{children}</div>;
  return (
    <Magnet padding={40} disabled={false} magnetStrength={strength} className={cls('inline-flex', className)}>
      {children}
    </Magnet>
  );
}

/** Cursor-tracking glare — ReactBits GlareHover. */
export function Glare({
  children,
  className,
  glareColor,
  width = '320px'
}: {
  children: React.ReactNode;
  className?: string;
  glareColor?: string;
  width?: string;
}) {
  const palette = usePalette();
  const motion = useMotionAllowed();
  if (!motion) return <div className={className}>{children}</div>;
  return (
    <GlareHover
      glareColor={glareColor ?? (palette.isDark ? '#ffffff' : '#ffffff')}
      glareOpacity={palette.isDark ? 0.28 : 0.34}
      glareAngle={-30}
      glareSize={320}
      transitionDuration={600}
      playOnce={false}
      width={width}
      height="auto"
      background="transparent"
      borderRadius="2px"
      borderColor="transparent"
      className={className}
    >
      {children}
    </GlareHover>
  );
}

/** Animated border glow — ReactBits BorderGlow. */
export function GlowBox({
  children,
  className,
  color,
  radius = 2
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  radius?: number;
}) {
  const palette = usePalette();
  const motion = useMotionAllowed();
  if (!motion) return <div className={cls('rounded-sm border border-line', className)}>{children}</div>;
  return (
    <BorderGlow
      edgeSensitivity={30}
      glowColor={color ?? palette.brand}
      backgroundColor="transparent"
      borderRadius={radius}
      glowRadius={26}
      glowIntensity={0.7}
      coneSpread={28}
      animated
      className={className}
    >
      {children}
    </BorderGlow>
  );
}

/** Star-sweep border, used for the primary CTA — ReactBits StarBorder. */
export function StarButton({
  children,
  className,
  color,
  as = 'div'
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  as?: React.ElementType;
}) {
  const palette = usePalette();
  const motion = useMotionAllowed();
  if (!motion) return <div className={className}>{children}</div>;
  return (
    <StarBorder
      as={as}
      color={color ?? palette.sky}
      speed="7s"
      thickness={1}
      backgroundColor={palette.panel}
      className={className}
    >
      {children}
    </StarBorder>
  );
}

/** Staggered child list — ReactBits AnimatedList. */
export function StaggerList({
  items,
  onSelect,
  className,
  itemClassName
}: {
  items: string[];
  onSelect?: (item: string, index: number) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <AnimatedList
      items={items}
      onItemSelect={onSelect}
      showGradients={false}
      enableArrowNavigation
      displayScrollbar={false}
      className={className}
      itemClassName={itemClassName}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Tilt (ReactBits-style pointer tilt)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Pointer-tilt wrapper used by every cover tile. Hand-rolled rather than
 * vendored because `TiltedCard` owns its own image markup; this stays a
 * transparent container so cards keep control of their layout.
 */
export function TiltCard({
  children,
  className,
  max = 7,
  scale = 1.015
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionAllowed();

  useEffect(() => {
    const el = ref.current;
    if (!el || !motion) return;
    if (window.matchMedia?.('(hover: none)').matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * max * 2}deg) rotateX(${-py * max * 2}deg) scale(${scale})`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max, scale, motion]);

  return (
    <div
      ref={ref}
      className={cls('h-full [transform-style:preserve-3d] [transition:transform_180ms_ease]', className)}
      style={{ willChange: motion ? 'transform' : undefined }}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* VN-flavoured blocks                                                        */
/* -------------------------------------------------------------------------- */

/** Visual-novel dialogue box (kept from the original Hanami skin, re-tokened). */
export function DialogueBox({
  name,
  nameIcon,
  children,
  footer,
  className
}: {
  name?: React.ReactNode;
  nameIcon?: React.ComponentProps<typeof Icon>['name'];
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cls('dialogue-box', className)}>
      {name ? (
        <span className="nameplate inline-flex items-center gap-1.5">
          {nameIcon ? <Icon name={nameIcon} size={12} /> : null}
          {name}
        </span>
      ) : null}
      <div className="text-[13px] leading-relaxed text-mute">{children}</div>
      {footer ? <div className="mt-2 flex items-center justify-end">{footer}</div> : null}
      <span className="caret-down" aria-hidden="true">
        ▼
      </span>
    </div>
  );
}

/** Small chapter divider used above rails and sections. */
export function ChapterMarker({
  kana,
  title,
  subtitle,
  className
}: {
  kana?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cls('flex items-baseline gap-2.5', className)}>
      {kana ? (
        <span aria-hidden="true" className="font-jp text-[11px] uppercase tracking-[0.3em] text-brand">
          {kana}
        </span>
      ) : null}
      <h2 className="font-display text-[15px] font-semibold text-brand2">{title}</h2>
      {subtitle ? <span className="text-[11px] text-faint">{subtitle}</span> : null}
      <span aria-hidden="true" className="ml-1 h-px flex-1 bg-line" />
    </div>
  );
}

/** Circular rating dial. */
export function RatingGauge({
  rating,
  size = 120,
  label
}: {
  rating: number | null | undefined;
  size?: number;
  label?: string;
}) {
  const palette = usePalette();
  const value = clamp((rating ?? 0) / 10, 0, 1);
  const stroke = Math.max(6, size * 0.08);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  const { ref, inView } = useInView<HTMLDivElement>(0.25);

  useEffect(() => {
    if (!inView) return;
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [inView, value]);

  const color =
    rating == null
      ? palette.faint
      : rating >= 80
        ? palette.good
        : rating >= 70
          ? palette.sky
          : rating >= 60
            ? palette.gold
            : rating >= 50
              ? palette.warn
              : palette.bad;

  return (
    <div ref={ref} className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Rating ${((rating ?? 0) / 10).toFixed(2)} out of 10`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.line} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.34em"
          className="font-display font-semibold"
          fontSize={size * 0.26}
          fill={color}
        >
          {rating == null ? '—' : (rating / 10).toFixed(2)}
        </text>
      </svg>
      {label ? <span className="text-[11px] uppercase tracking-wider text-faint">{label}</span> : null}
    </div>
  );
}

/** Ten-point star row for user votes. */
export function VoteStars({ vote, size = 13 }: { vote: number | null | undefined; size?: number }) {
  const full = Math.round((vote ?? 0) / 10);
  return (
    <span className="inline-flex items-center gap-px" title={vote ? `Your vote: ${vote}` : 'Not voted'}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ fontSize: size, lineHeight: 1, color: i < full ? 'rgb(var(--c-gold))' : 'rgb(var(--c-line))' }}
        >
          ★
        </span>
      ))}
      <span className="sr-only">{vote ? `${vote} out of 100` : 'No vote'}</span>
    </span>
  );
}

/** Scrambled placeholder shown while data loads — ReactBits ScrambledText. */
export function LoadingScramble({ text = 'Loading', className }: { text?: string; className?: string }) {
  const motion = useMotionAllowed();
  if (!motion) return <span className={className}>{text}</span>;
  return (
    <ScrambledText
      className={cls('font-mono text-[13px]', className)}
      radius={80}
      duration={1}
      speed={0.4}
      scrambleChars=".:"
    >
      {text}
    </ScrambledText>
  );
}

/** True on small screens — kept here so pages can drop heavy effects. */
export function useIsSmall(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
