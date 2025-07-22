'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Utensils, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function EventDetails() {
  const events = [
    {
      title: 'Opening Ceremony',
      date: 'November 15, 2024',
      time: '9:00 AM - 10:30 AM',
      location: 'Main Auditorium',
      description: 'Welcome address and keynote presentation',
      type: 'ceremony',
    },
    {
      title: 'Welcome Dinner',
      date: 'November 15, 2024',
      time: '7:00 PM - 10:00 PM',
      location: 'Grand Ballroom',
      description: 'Networking dinner with live entertainment',
      type: 'dinner',
      featured: true,
    },
    {
      title: 'Technical Sessions',
      date: 'November 16-17, 2024',
      time: '10:00 AM - 6:00 PM',
      location: 'Conference Halls',
      description: 'Industry expert presentations and workshops',
      type: 'sessions',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Convention
            <span className="gradient-text"> Schedule</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Three days packed with inspiring sessions, networking opportunities, and memorable experiences.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {events.map((event, index) => (
            <div 
              key={event.title}
              className={`relative p-8 rounded-2xl border transition-all duration-300 hover-lift animate-fade-in ${
                event.featured 
                  ? 'bg-gradient-to-br from-primary-600 to-secondary-600 text-white border-transparent shadow-2xl' 
                  : 'bg-white border-gray-200 hover:border-primary-200'
              }`}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {event.featured && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-300 fill-current" />
                    <span className="text-sm font-medium text-white">Featured</span>
                  </div>
                </div>
              )}
              
              <div className={`inline-flex p-3 rounded-xl mb-6 ${
                event.featured 
                  ? 'bg-white/20 backdrop-blur-sm' 
                  : 'bg-gradient-to-r from-primary-100 to-secondary-100'
              }`}>
                {event.type === 'dinner' && <Utensils className={`w-6 h-6 ${event.featured ? 'text-white' : 'text-primary-600'}`} />}
                {event.type === 'ceremony' && <Star className={`w-6 h-6 ${event.featured ? 'text-white' : 'text-primary-600'}`} />}
                {event.type === 'sessions' && <Calendar className={`w-6 h-6 ${event.featured ? 'text-white' : 'text-primary-600'}`} />}
              </div>
              
              <h3 className={`text-xl font-semibold mb-4 ${event.featured ? 'text-white' : 'text-gray-900'}`}>
                {event.title}
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className={`w-5 h-5 ${event.featured ? 'text-white/80' : 'text-gray-500'}`} />
                  <span className={`text-sm ${event.featured ? 'text-white/90' : 'text-gray-600'}`}>
                    {event.date}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className={`w-5 h-5 ${event.featured ? 'text-white/80' : 'text-gray-500'}`} />
                  <span className={`text-sm ${event.featured ? 'text-white/90' : 'text-gray-600'}`}>
                    {event.time}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className={`w-5 h-5 ${event.featured ? 'text-white/80' : 'text-gray-500'}`} />
                  <span className={`text-sm ${event.featured ? 'text-white/90' : 'text-gray-600'}`}>
                    {event.location}
                  </span>
                </div>
              </div>
              
              <p className={`text-sm leading-relaxed ${event.featured ? 'text-white/90' : 'text-gray-600'}`}>
                {event.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Link href="/agenda">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-700 hover:to-secondary-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover-lift"
            >
              View Complete Agenda
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}