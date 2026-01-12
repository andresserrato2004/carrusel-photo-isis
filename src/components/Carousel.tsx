"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CarouselImage } from "@/lib/s3";

interface CarouselProps {
  initialImages: CarouselImage[];
}

export default function Carousel({ initialImages }: CarouselProps) {
  const [images, setImages] = useState<CarouselImage[]>(initialImages);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch("/api/images");
        if (res.ok) {
          const newImages = await res.json();
          setImages(newImages);
        }
      } catch (error) {
        console.error("Failed to refresh images", error);
      }
    };

    const intervalId = setInterval(fetchImages, 10000); 
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 8000); // 8 seconds per slide

    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#990000] text-white">
        <p className="text-3xl font-serif">Esperando graduandos...</p>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-[#660000] to-[#330000]">
      {/* Background Pattern or Texture */}
      
      {/* Top Left Logo - Bigger */}
      <img 
        src="/logoescuela.png" 
        alt="Logo Escuela" 
        className="absolute top-8 left-12 h-80 object-contain z-20" 
      />

      {/* Top Right Title */}
      <h1 className="absolute top-124 left-24 text-6xl font-serif font-bold text-[#D4AF37] tracking-widest z-20">
        <p>GRADUADOS</p> <p> 2026-1</p>
      </h1>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentImage.key}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 flex items-center justify-end pr-24"
        >
          <div className="flex w-full max-w-6xl flex-row items-center gap-12 rounded-xl bg-gradient-to-r from-[#990000] via-[#7a0000] to-[#5c0000] p-8 shadow-2xl border-4 border-[#D4AF37]">
            
            {/* Left side: Photo */}
            <div className="relative h-[650px] flex-none shadow-lg">
                <img
                  src={currentImage.url}
                  alt={currentImage.studentName || "Graduando"}
                  className="h-full w-auto object-contain rounded-lg border-4 border-[#D4AF37] bg-black"
                />
            </div>

            {/* Right side: Info */}
            <div className="flex flex-1 flex-col justify-center text-left space-y-6">
              
              <div className="space-y-4">
                 <motion.h2 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.3 }}
                   className="text-7xl font-serif font-bold text-white tracking-wide leading-tight"
                 >
                   {/* Fallback to simple default text if data is missing, but try to use DB data first */}
                   {currentImage.studentName && currentImage.studentName !== "" ? currentImage.studentName : "Nombre del Estudiante"}
                 </motion.h2>
                 
                 <div className="h-2 w-48 bg-[#D4AF37] mt-6 mb-6"></div>

                 <motion.p 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.5 }}
                   className="text-4xl font-light text-white italic"
                 >
                   {/* Fallback to simple default text if data is missing, but try to use DB data first */}
                   {currentImage.studentCareer && currentImage.studentCareer !== "" ? currentImage.studentCareer : "Programa Académico"}
                 </motion.p>
              </div>

              {/* Decorative elements inside card */}
              <div className="absolute top-0 right-0 p-4">
                  <div className="w-32 h-32 border-t-4 border-r-4 border-[#D4AF37] rounded-tr-3xl opacity-50"></div>
              </div>
               <div className="absolute bottom-0 left-0 p-4">
                  <div className="w-32 h-32 border-b-4 border-l-4 border-[#D4AF37] rounded-bl-3xl opacity-50"></div>
              </div>

            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
