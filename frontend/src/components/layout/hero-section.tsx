'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { animate, utils } from 'animejs';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Generate static positions outside component to avoid hydration mismatch
const STATIC_PARTICLE_POSITIONS = [
  { left: '15%', top: '20%' }, { left: '85%', top: '15%' },
  { left: '10%', top: '60%' }, { left: '90%', top: '70%' },
  { left: '25%', top: '80%' }, { left: '75%', top: '85%' },
  { left: '50%', top: '10%' }, { left: '30%', top: '40%' },
  { left: '70%', top: '45%' }, { left: '5%', top: '35%' },
  { left: '95%', top: '40%' }, { left: '40%', top: '75%' },
  { left: '60%', top: '25%' }, { left: '20%', top: '55%' },
  { left: '80%', top: '60%' }, { left: '45%', top: '90%' },
  { left: '55%', top: '5%' }, { left: '35%', top: '30%' },
  { left: '65%', top: '65%' }, { left: '12%', top: '88%' },
];

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  // Use static positions for SSR compatibility
  const [particlePositions] = useState(STATIC_PARTICLE_POSITIONS);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Main timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Badge animation with bounce
      tl.from(badgeRef.current, {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.7)',
      });

      // Title animation - split by lines
      if (titleRef.current) {
        const lines = titleRef.current.querySelectorAll('.line');
        tl.from(
          lines,
          {
            y: 40,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
          },
          '-=0.5'
        );
      }

      // CTA buttons
      tl.from(
        ctaRef.current?.children || [],
        {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
        },
        '-=0.4'
      );

      // Image reveal with scale
      tl.from(
        imageRef.current,
        {
          scale: 0.8,
          opacity: 0,
          duration: 1.2,
          ease: 'back.out(1.2)',
        },
        '-=1'
      );

      // Continuous floating animation for image
      gsap.to(imageRef.current, {
        y: -20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    }, heroRef);

    // Anime.js particle effect
    if (particlesRef.current) {
      const particles = particlesRef.current.querySelectorAll('.particle');
      
      animate(particles, {
        translateX: () => utils.random(-100, 100),
        translateY: () => utils.random(-100, 100),
        scale: () => utils.random(0.5, 1.5),
        opacity: [
          { to: 0.8, duration: 1000 },
          { to: 0.2, duration: 1000 },
        ],
        duration: 3000,
        ease: 'inOutSine',
        loop: true,
        delay: 200,
      });
    }

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-muted/50 to-background"
    >
      {/* Floating Particles Background */}
      <div
        ref={particlesRef}
        className="absolute inset-0 pointer-events-none opacity-30"
      >
        {particlePositions.map((pos, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 bg-primary rounded-full"
            style={{
              left: pos.left,
              top: pos.top,
            }}
          />
        ))}
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <span
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full"
            >
              Spring/Summer 2025
            </span>

            <h1 ref={titleRef} className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="line block">Discover Your</span>
              <span className="line block text-primary">Signature Style</span>
            </h1>

            <p className="line text-lg text-muted-foreground max-w-md">
              Curated fashion and lifestyle products for the modern individual.
              Shop the latest trends with confidence.
            </p>

            <div ref={ctaRef} className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/products">
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/products?sort=newest">New Arrivals</Link>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div ref={imageRef} className="relative aspect-square lg:aspect-[4/5] max-w-lg mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl transform rotate-6" />
            <div className="relative h-full w-full bg-gradient-to-br from-muted to-muted/50 rounded-3xl overflow-hidden shadow-2xl">
              {/* Placeholder for hero image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-6xl font-bold text-muted-foreground/20">STORE</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
