'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronRight, TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react';
import { useScroll, motion } from 'framer-motion';

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden">
        <section>
          <div className="py-24 md:pb-32 lg:pb-36 lg:pt-72">
            <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
              <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-6"
                >
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  7-day free trial - No credit card required
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mt-4 max-w-2xl text-balance text-5xl md:text-6xl lg:mt-8 xl:text-7xl font-bold text-white leading-tight"
                >
                  Revenue is vanity.
                  <br />
                  <span className="text-emerald-400">Profit is sanity.</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-8 max-w-2xl text-balance text-lg text-white/60"
                >
                  See the real profit on every Shopify order. Track COGS, fees, and margins in real-time.
                  Know exactly which products make you money.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
                >
                  <Button
                    asChild
                    size="lg"
                    className="h-14 rounded-full pl-6 pr-4 text-base bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/25"
                  >
                    <a href="https://apps.shopify.com/profitpulse">
                      <span className="text-nowrap">Install on Shopify</span>
                      <ChevronRight className="ml-2" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-14 rounded-full px-6 text-base hover:bg-white/5"
                  >
                    <Link href="#features">
                      <span className="text-nowrap">See Features</span>
                    </Link>
                  </Button>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mt-4 text-white/40 text-sm lg:text-left text-center"
                >
                  $29.99/mo after trial
                </motion.p>
              </div>
            </div>
            <div className="absolute inset-1 overflow-hidden rounded-3xl border border-emerald-500/10 aspect-[2/3] sm:aspect-video lg:rounded-[3rem]">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-cover opacity-40"
                src="/videos/dna-video.mp4"
              ></video>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent"></div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="bg-zinc-950 pb-2">
          <div className="group relative m-auto max-w-7xl px-6">
            <div className="flex flex-col items-center md:flex-row">
              <div className="md:max-w-44 md:border-r md:border-white/10 md:pr-6">
                <p className="text-end text-sm text-white/60">Trusted by Shopify stores</p>
              </div>
              <div className="relative py-6 md:w-[calc(100%-11rem)]">
                <InfiniteSlider speedOnHover={20} speed={40} gap={80}>
                  <div className="flex items-center gap-2 text-white/40">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-semibold">Fashion Brands</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-semibold">DTC Stores</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-semibold">Dropshippers</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <PieChart className="h-5 w-5" />
                    <span className="font-semibold">Print on Demand</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-semibold">Beauty Brands</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-semibold">Electronics</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-semibold">Home & Garden</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <PieChart className="h-5 w-5" />
                    <span className="font-semibold">Food & Beverage</span>
                  </div>
                </InfiniteSlider>

                <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-zinc-950"></div>
                <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-zinc-950"></div>
                <ProgressiveBlur
                  className="pointer-events-none absolute left-0 top-0 h-full w-20"
                  direction="left"
                  blurIntensity={1}
                />
                <ProgressiveBlur
                  className="pointer-events-none absolute right-0 top-0 h-full w-20"
                  direction="right"
                  blurIntensity={1}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Privacy', href: '/privacy' },
];

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollYProgress } = useScroll();

  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="group fixed z-20 w-full pt-2"
      >
        <div
          className={cn(
            'mx-auto max-w-7xl rounded-3xl px-6 transition-all duration-300 lg:px-12',
            scrolled && 'bg-zinc-950/80 backdrop-blur-2xl'
          )}
        >
          <motion.div
            className={cn(
              'relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6',
              scrolled && 'lg:py-4'
            )}
          >
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 text-white duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 text-white -rotate-180 scale-0 opacity-0 duration-200" />
              </button>

              <div className="hidden lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-white/60 hover:text-white block duration-150"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-zinc-900 group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-white/10 p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-white/60 hover:text-white block duration-150"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                  <a href="https://apps.shopify.com/profitpulse">
                    <span>Install Free</span>
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
};

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.png"
        alt="ProfitPulse"
        className="h-8 w-auto"
      />
      <span className="text-white font-bold text-xl">ProfitPulse</span>
    </div>
  );
};
