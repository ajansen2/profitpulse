'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, PieChart, Target, Zap, BarChart3 } from 'lucide-react';

// Feature accordion items for ProfitPulse
const accordionItems = [
  {
    id: 1,
    title: 'Real-Time Dashboard',
    description: 'Watch your profits update instantly as orders come in.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    icon: BarChart3,
  },
  {
    id: 2,
    title: 'Product COGS',
    description: 'Track cost of goods for every product and variant.',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
    icon: PieChart,
  },
  {
    id: 3,
    title: 'Fee Tracking',
    description: 'Automatically calculate payment and Shopify fees.',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2011&auto=format&fit=crop',
    icon: TrendingUp,
  },
  {
    id: 4,
    title: 'Profit Goals',
    description: 'Set daily and monthly targets with progress tracking.',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2071&auto=format&fit=crop',
    icon: Target,
  },
  {
    id: 5,
    title: 'AI Forecasting',
    description: '7-day profit predictions powered by AI.',
    imageUrl: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2032&auto=format&fit=crop',
    icon: Zap,
  },
];

// Accordion Item Component
const AccordionItem = ({
  item,
  isActive,
  onMouseEnter,
}: {
  item: typeof accordionItems[0];
  isActive: boolean;
  onMouseEnter: () => void;
}) => {
  const Icon = item.icon;

  return (
    <motion.div
      className={`
        relative h-[400px] rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-700 ease-in-out border
        ${isActive ? 'w-[350px] border-emerald-500/30' : 'w-[60px] border-white/10'}
      `}
      onMouseEnter={onMouseEnter}
      whileHover={{ scale: isActive ? 1 : 1.02 }}
    >
      {/* Background Image */}
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>

      {/* Active state content */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="absolute bottom-0 left-0 right-0 p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Feature</span>
          </div>
          <h3 className="text-white text-xl font-bold mb-2">{item.title}</h3>
          <p className="text-white/60 text-sm">{item.description}</p>
        </motion.div>
      )}

      {/* Inactive state - vertical text */}
      {!isActive && (
        <span
          className="absolute text-white text-base font-semibold whitespace-nowrap
            bottom-24 left-1/2 -translate-x-1/2 rotate-90 origin-center"
        >
          {item.title}
        </span>
      )}
    </motion.div>
  );
};

// Main Features Accordion Component
export function FeaturesAccordion() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="features" className="py-20 px-6 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left Side: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-2/5 text-center lg:text-left"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Everything you need to{' '}
              <span className="text-emerald-400">track profit</span>
            </h2>
            <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto lg:mx-0">
              Stop guessing your margins. Get precise profit calculations for every order,
              product, and time period.
            </p>
            <div className="mt-8">
              <a
                href="https://apps.shopify.com/profitpulse"
                className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-colors duration-300"
              >
                Start Free Trial
              </a>
            </div>
          </motion.div>

          {/* Right Side: Image Accordion */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-3/5"
          >
            <div className="flex flex-row items-center justify-center gap-3 overflow-x-auto p-4 scrollbar-hide">
              {accordionItems.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  isActive={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Alternative: Stacked Feature Cards with animation
export function FeatureCards() {
  return (
    <section className="py-20 px-6 bg-zinc-900/50">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-white text-center mb-12"
        >
          Powerful profit tracking features
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart3,
              title: 'Real-Time Dashboard',
              desc: 'See profit, revenue, and costs update instantly as orders come in.',
            },
            {
              icon: PieChart,
              title: 'Product-Level COGS',
              desc: 'Track cost of goods sold for every product and variant.',
            },
            {
              icon: TrendingUp,
              title: 'Fee Tracking',
              desc: 'Automatically calculate payment processing and Shopify fees.',
            },
            {
              icon: Target,
              title: 'Profit Goals',
              desc: 'Set daily and monthly targets with progress tracking.',
            },
            {
              icon: Zap,
              title: 'AI Forecasting',
              desc: '7-day profit predictions powered by AI insights.',
            },
            {
              icon: BarChart3,
              title: 'Order Breakdown',
              desc: 'See exactly why each order was profitable or not.',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-emerald-500/30 transition-colors"
            >
              <feature.icon className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-white/60 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
