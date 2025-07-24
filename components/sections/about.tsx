    "use client";

import { GraduationCap, Users, Handshake, Calendar, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutSection() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Welcome to Your Alumni Hub
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Where Memories Meet New Beginnings
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform bridges generations of alumni through professional networking 
            and cherished reunions - all in one seamless experience.
          </p>
        </motion.div>

        {/* Value Propositions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-gray-50 p-6 rounded-xl border border-gray-200"
          >
            <GraduationCap className="w-10 h-10 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Legacy Reconnected</h3>
            <p className="text-gray-600">
              Rediscover your alma mater and classmates through digitized yearbooks 
              and class timelines.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-gray-50 p-6 rounded-xl border border-gray-200"
          >
            <Handshake className="w-10 h-10 text-secondary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Network</h3>
            <p className="text-gray-600">
              Leverage our alumni directory to find mentors, collaborators, or career opportunities.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-gray-50 p-6 rounded-xl border border-gray-200"
          >
            <Calendar className="w-10 h-10 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Annual Convention</h3>
            <p className="text-gray-600">
              Our flagship event combining professional development with milestone reunions.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-gray-50 p-6 rounded-xl border border-gray-200"
          >
            <Users className="w-10 h-10 text-secondary-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Community First</h3>
            <p className="text-gray-600">
              Give back through mentorship programs and scholarship initiatives.
            </p>
          </motion.div>
        </div>

        {/* Event Preview */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 md:p-12 border border-primary-200">
          <div className="md:flex items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Alumni Convention 2024
              </h3>
              <p className="text-gray-700 mb-6">
                This year's theme: <span className="font-semibold">"Bridging Generations"</span> 
                celebrates our shared history while building future connections through:
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
                  Keynote speeches from distinguished alumni
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary-500 rounded-full mr-3"></span>
                  Decade-specific reunion lounges
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
                  Interactive career workshops
                </li>
              </ul>
              <Link 
                href="/convention" 
                className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                Explore Convention Details
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
            <div className="md:w-1/2 md:pl-10">
              <div className="bg-white p-1 rounded-lg shadow-lg border border-gray-200">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md overflow-hidden">
                  <img 
                    src="/convention-preview.jpg" 
                    alt="2023 Alumni Convention Highlights"
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">2024 Convention Highlights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}