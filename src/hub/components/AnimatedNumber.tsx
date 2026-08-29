"use client";
import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, motion } from "motion/react";

export default function AnimatedNumber({ value, className, style }: {
  value: number; className?: string; style?: React.CSSProperties;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span className={className} style={style}>{rounded}</motion.span>;
}
