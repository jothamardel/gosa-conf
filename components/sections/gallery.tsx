"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const galleryItems = [
  {
    id: 1,
    title: "Keynote Sessions",
    description: "Industry leaders sharing insights with alumni",
    image: "/images/DSC_7137.jpg",
    category: "convention"
  },
  {
    id: 2,
    title: "Class Reunions",
    description: "Decade groups reuniting after years",
    image: "/images/DSC_7252.jpg",
    category: "reunion"
  },
  {
    id: 3,
    title: "Networking Mixers",
    description: "Professional connections across generations",
    image: "/images/DSC_7718.jpg",
    category: "convention"
  },
  {
    id: 4,
    title: "Campus Tour",
    description: "Rediscovering our alma mater together",
    image: "/images/DSC_7546.jpg",
    category: "reunion"
  },
  {
    id: 5,
    title: "Award Ceremony",
    description: "Recognizing outstanding alumni achievements",
    image: "/images/DSC_7466.jpg",
    category: "convention"
  }
];

export function GallerySection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const nextCard = () => {
    setDirection("right");
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const prevCard = () => {
    setDirection("left");
    setCurrentIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const handleCardClick = (id: number) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const variants = {
    enter: (direction: string) => ({
      x: direction === "right" ? 100 : -100,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: (direction: string) => ({
      x: direction === "right" ? -100 : 100,
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.3 }
    })
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Moments That Define Us
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Relive past conventions and preview what awaits in 2025
          </p>
        </div>

        <div className="relative h-[500px] max-w-4xl mx-auto">
          <AnimatePresence custom={direction} initial={false}>
            {galleryItems.map((item, index) => {
              const position = (index - currentIndex + galleryItems.length) % galleryItems.length;
              const isActive = position === 0;
              const isExpanded = expandedCard === item.id;

              if (position > 2) return null;

              return (
                <motion.div
                  key={item.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate={isActive ? "center" : position === 1 ?
                    { x: direction === "right" ? 50 : -50, opacity: 0.7, scale: 0.9 } :
                    { x: direction === "right" ? 100 : -100, opacity: 0.5, scale: 0.8 }}
                  exit="exit"
                  className={`absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 ${isActive ? "z-10" : position === 1 ? "z-5" : "z-0"
                    }`}
                  style={{
                    transformOrigin: "center bottom",
                    left: `${position * 20}px`,
                    right: `${position * 20}px`
                  }}
                  onClick={() => isActive && handleCardClick(item.id)}
                >
                  {isExpanded ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-white p-6 z-20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 bg-primary-100 text-primary-800">
                            {item.category === "convention" ? "Convention" : "Reunion"}
                          </span>
                          <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCard(null);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Maximize className="w-5 h-5 rotate-45" />
                        </button>
                      </div>
                      <p className="text-gray-600 mb-4">{item.description}</p>
                      <div
                        className="bg-gray-100 w-full h-full rounded-lg bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.image})` }}
                      />
                    </motion.div>
                  ) : (
                    <>
                      <div
                        className="h-full bg-gray-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.image})` }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 bg-white/20">
                          {item.category === "convention" ? "Convention" : "Reunion"}
                        </span>
                        <h3 className="text-xl font-bold">{item.title}</h3>
                        <p className="text-sm opacity-90">{item.description}</p>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          <button
            onClick={prevCard}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextCard}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center mt-8 space-x-2">
          {galleryItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? "right" : "left");
                setCurrentIndex(index);
              }}
              className={`w-3 h-3 rounded-full transition-all ${index === currentIndex ? "bg-primary-600 w-6" : "bg-gray-300"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}