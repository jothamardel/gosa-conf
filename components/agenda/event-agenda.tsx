'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, Star, Coffee, Utensils, Mic } from 'lucide-react';

const agendaData = {
  'day-1': {
    date: 'November 15, 2024',
    title: 'Opening Day',
    events: [
      {
        time: '8:00 AM - 9:00 AM',
        title: 'Registration & Welcome Breakfast',
        type: 'networking',
        location: 'Main Lobby',
        speaker: '',
        description: 'Check-in, welcome packages, and networking breakfast',
        icon: Coffee,
      },
      {
        time: '9:00 AM - 10:30 AM',
        title: 'Opening Ceremony & Keynote',
        type: 'keynote',
        location: 'Main Auditorium',
        speaker: 'Dr. Sarah Johnson, CEO TechVision',
        description: 'Welcome address and opening keynote: "The Future of Innovation"',
        icon: Mic,
        featured: true,
      },
      {
        time: '10:30 AM - 11:00 AM',
        title: 'Networking Break',
        type: 'break',
        location: 'Exhibition Hall',
        speaker: '',
        description: 'Coffee, networking, and exhibition viewing',
        icon: Coffee,
      },
      {
        time: '11:00 AM - 12:30 PM',
        title: 'Panel Discussion: Industry Trends',
        type: 'panel',
        location: 'Main Auditorium',
        speaker: 'Various Industry Leaders',
        description: 'Panel discussion on current trends and future outlook',
        icon: User,
      },
      {
        time: '12:30 PM - 2:00 PM',
        title: 'Lunch & Networking',
        type: 'networking',
        location: 'Grand Ballroom',
        speaker: '',
        description: 'Lunch with structured networking activities',
        icon: Utensils,
      },
      {
        time: '2:00 PM - 3:30 PM',
        title: 'Workshop: Digital Transformation',
        type: 'workshop',
        location: 'Conference Room A',
        speaker: 'Mark Thompson, CTO InnovateCorp',
        description: 'Hands-on workshop on digital transformation strategies',
        icon: User,
      },
      {
        time: '7:00 PM - 10:00 PM',
        title: 'Welcome Dinner',
        type: 'dinner',
        location: 'Grand Ballroom',
        speaker: '',
        description: 'Elegant welcome dinner with entertainment',
        icon: Utensils,
        featured: true,
      },
    ],
  },
  'day-2': {
    date: 'November 16, 2024',
    title: 'Main Conference Day',
    events: [
      {
        time: '8:30 AM - 9:30 AM',
        title: 'Morning Networking Breakfast',
        type: 'networking',
        location: 'Exhibition Hall',
        speaker: '',
        description: 'Start your day with coffee and connections',
        icon: Coffee,
      },
      {
        time: '9:30 AM - 11:00 AM',
        title: 'Technical Session: AI & Machine Learning',
        type: 'technical',
        location: 'Main Auditorium',
        speaker: 'Prof. Maria Rodriguez, AI Research Institute',
        description: 'Deep dive into AI applications and machine learning trends',
        icon: User,
        featured: true,
      },
      {
        time: '11:00 AM - 11:30 AM',
        title: 'Coffee Break',
        type: 'break',
        location: 'Exhibition Hall',
        speaker: '',
        description: 'Refreshments and exhibition viewing',
        icon: Coffee,
      },
      {
        time: '11:30 AM - 1:00 PM',
        title: 'Breakout Sessions (3 Parallel Tracks)',
        type: 'breakout',
        location: 'Various Conference Rooms',
        speaker: 'Multiple Speakers',
        description: 'Choose from three specialized tracks based on your interests',
        icon: User,
      },
      {
        time: '1:00 PM - 2:30 PM',
        title: 'Lunch & Exhibition',
        type: 'networking',
        location: 'Exhibition Hall',
        speaker: '',
        description: 'Lunch with full access to exhibition booths',
        icon: Utensils,
      },
      {
        time: '2:30 PM - 4:00 PM',
        title: 'Case Study Presentations',
        type: 'presentation',
        location: 'Main Auditorium',
        speaker: 'Industry Partners',
        description: 'Real-world case studies and success stories',
        icon: User,
      },
      {
        time: '4:00 PM - 6:00 PM',
        title: 'Interactive Workshops',
        type: 'workshop',
        location: 'Various Rooms',
        speaker: 'Workshop Leaders',
        description: 'Hands-on workshops and skill-building sessions',
        icon: User,
      },
    ],
  },
  'day-3': {
    date: 'November 17, 2024',
    title: 'Closing Day',
    events: [
      {
        time: '9:00 AM - 10:30 AM',
        title: 'Future Vision Keynote',
        type: 'keynote',
        location: 'Main Auditorium',
        speaker: 'James Wilson, Futurist & Innovation Expert',
        description: 'Looking ahead: Preparing for tomorrow\'s challenges',
        icon: Mic,
        featured: true,
      },
      {
        time: '10:30 AM - 11:00 AM',
        title: 'Networking Break',
        type: 'break',
        location: 'Exhibition Hall',
        speaker: '',
        description: 'Final networking opportunity with exhibitors',
        icon: Coffee,
      },
      {
        time: '11:00 AM - 12:30 PM',
        title: 'Awards Ceremony',
        type: 'ceremony',
        location: 'Main Auditorium',
        speaker: 'Awards Committee',
        description: 'Recognition of outstanding contributions and innovations',
        icon: Star,
      },
      {
        time: '12:30 PM - 2:00 PM',
        title: 'Closing Lunch',
        type: 'networking',
        location: 'Grand Ballroom',
        speaker: '',
        description: 'Farewell lunch and final networking',
        icon: Utensils,
      },
      {
        time: '2:00 PM - 3:00 PM',
        title: 'Closing Remarks & Next Steps',
        type: 'ceremony',
        location: 'Main Auditorium',
        speaker: 'Conference Organizers',
        description: 'Closing remarks and announcement for next year',
        icon: Mic,
      },
    ],
  },
};

const getEventTypeColor = (type: string) => {
  const colors = {
    keynote: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white',
    technical: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
    workshop: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
    panel: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
    networking: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
    dinner: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white',
    break: 'bg-gray-100 text-gray-600',
    presentation: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white',
    ceremony: 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white',
    breakout: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white',
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-600';
};

export function EventAgenda() {
  const [selectedDay, setSelectedDay] = useState('day-1');

  return (
    <div className="space-y-8">
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="day-1" className="text-center">
            <div>
              <div className="font-semibold">Day 1</div>
              <div className="text-xs text-gray-600">Nov 15, 2024</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="day-2" className="text-center">
            <div>
              <div className="font-semibold">Day 2</div>
              <div className="text-xs text-gray-600">Nov 16, 2024</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="day-3" className="text-center">
            <div>
              <div className="font-semibold">Day 3</div>
              <div className="text-xs text-gray-600">Nov 17, 2024</div>
            </div>
          </TabsTrigger>
        </TabsList>

        {Object.entries(agendaData).map(([dayKey, dayData]) => (
          <TabsContent key={dayKey} value={dayKey}>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{dayData.title}</h2>
              <p className="text-lg text-gray-600">{dayData.date}</p>
            </div>

            <div className="space-y-4">
              {dayData.events.map((event, index) => (
                <Card 
                  key={index} 
                  className={`glass-card transition-all duration-300 hover-lift ${
                    event.featured ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg ${getEventTypeColor(event.type)} flex-shrink-0`}>
                            <event.icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {event.title}
                              </h3>
                              {event.featured && (
                                <Badge variant="secondary" className="bg-secondary-100 text-secondary-800">
                                  <Star className="w-3 h-3 mr-1 fill-current" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{event.time}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                              {event.speaker && (
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span>{event.speaker}</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-gray-700">{event.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      {event.type !== 'break' && event.type !== 'networking' && (
                        <div className="lg:ml-6">
                          <Button variant="outline" size="sm" className="w-full lg:w-auto">
                            Add to Calendar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Download Schedule */}
      <div className="text-center pt-8">
        <Card className="glass-card max-w-md mx-auto">
          <CardContent className="p-6">
            <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Download Full Schedule
            </h3>
            <p className="text-gray-600 mb-4">
              Get the complete agenda as a PDF for offline viewing
            </p>
            <Button className="w-full bg-gradient-to-r from-primary-600 to-secondary-500">
              Download PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}