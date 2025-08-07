"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Star,
  Coffee,
  Utensils,
  Mic,
  Stethoscope,
  Trash2,
  ForkKnife,
} from "lucide-react";

const agendaData = {
  "day-1": {
    date: "October 29th, 2025",
    title: "Medical Outreach",
    events: [
      {
        time: "8:00 AM - 6:00 PM",
        title: "Medical Outreach",
        type: "networking",
        location: "Gindiri",
        speaker: "",
        description: "Medical outreach",
        icon: Stethoscope,
      },
    ],
  },
  "day-2": {
    date: "October 30th, 2025",
    title: "Community Social Responsibility",
    events: [
      {
        time: "8:00 AM - 10:00 AM (Morning)",
        title: "Community Social Responsibility Cleaning-up exercise",
        type: "networking",
        location: "Bukuru Market Jos South",
        speaker: "",
        description: "Cleaning-up exercise",
        icon: Trash2,
      },
      {
        time: "1:00 PM - 7:00 PM (Evening)",
        title: "Indoor Games/Table board games Art Exhibition and Gashi",
        type: "dinner",
        location: "GOSA National Secretariat",
        speaker: "",
        description: "Indoor Games/Table board games Art Exhibition and Gashi",
        icon: ForkKnife,
        featured: true,
      },
    ],
  },
  "day-3": {
    date: "November 31st, 2025",
    title:
      "Public Lecture | Mentoring and Synergy session | Cultural and Cuisine Night",
    events: [
      {
        time: "10:00 AM - 12:00 Noon (Morning)",
        title: "Public Lecture ",
        type: "keynote",
        location: "Crispan Events Centre",
        speaker: "James Wilson, Futurist & Innovation Expert",
        description: "Embracing Innovation and technology: The Place of GOSA",
        icon: Mic,
        featured: true,
      },
      {
        time: "12:00 Noon - 01:00 PM (Afternoon)",
        title: "Mentoring and Synergy session",
        type: "break",
        location: "Crispan Events Centre",
        speaker: "",
        description: "Mentoring and Synergy session",
        icon: User,
      },
      {
        time: "02:00 PM - 07:00 PM (Evening)",
        title: "Cultural and Cuisine Night",
        type: "ceremony",
        location: "Crispan Events Centre",
        speaker: "",
        description: "(Interhouse) with their cultural troops",
        icon: Star,
      },
    ],
  },
  "day-4": {
    date: "November 1st, 2025",
    title: "AGM Business Trade Fair",
    events: [
      {
        time: "09:00 AM - 06:00 PM",
        title: "Public Lecture ",
        type: "keynote",
        location: "Crispan Events Centre",
        speaker: "James Wilson, Futurist & Innovation Expert",
        description: "AGM Business Trade Fair",
        icon: Mic,
        featured: false,
      },
      {
        time: "04:00 PM - 09:00 PM",
        title: "Dinner and Award Night",
        type: "break",
        location: "Crispan Events Centre",
        speaker: "",
        description: "Dinner and Award Night",
        icon: ForkKnife,
        featured: true,
      },
    ],
  },
  "day-5": {
    date: "November 2nd, 2025",
    title: "Re-union service",
    events: [
      {
        time: "06:00 AM - 04:00 PM ",
        title: "Re-union service and Townhall meeeting ",
        type: "keynote",
        location: "Gindiri",
        speaker: "",
        description: "Re-union service and Townhall meeeting ",
        icon: Mic,
        featured: true,
      },
    ],
  },
};

const getEventTypeColor = (type: string) => {
  const colors = {
    keynote: "bg-gradient-to-r from-primary-500 to-primary-600 text-white",
    technical: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    workshop: "bg-gradient-to-r from-purple-500 to-purple-600 text-white",
    panel: "bg-gradient-to-r from-green-500 to-green-600 text-white",
    networking: "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
    dinner: "bg-gradient-to-r from-rose-500 to-rose-600 text-white",
    break: "bg-gray-100 text-gray-600",
    presentation: "bg-gradient-to-r from-teal-500 to-teal-600 text-white",
    ceremony: "bg-gradient-to-r from-secondary-500 to-secondary-600 text-white",
    breakout: "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white",
  };
  return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-600";
};

export function EventAgenda() {
  const [selectedDay, setSelectedDay] = useState("day-1");

  return (
    <div className="space-y-8">
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="grid w-full grid-cols-5 mb-8 border h-fit">
          <TabsTrigger value="day-1" className="text-center">
            <div>
              <div className="font-semibold">Day 1 (Wednesday)</div>
              <div className="text-xs text-gray-600">29th Oct. 2025</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="day-2" className="text-center">
            <div>
              <div className="font-semibold">Day 2 (Thursday)</div>
              <div className="text-xs text-gray-600">30th Oct., 2025</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="day-3" className="text-center">
            <div>
              <div className="font-semibold">Day 3 (Friday)</div>
              <div className="text-xs text-gray-600">31st Oct., 2025</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="day-4" className="text-center">
            <div>
              <div className="font-semibold">Day 4 (Saturday)</div>
              <div className="text-xs text-gray-600">1st Nov., 2025</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="day-5" className="text-center">
            <div>
              <div className="font-semibold">Day 5 (Sunday)</div>
              <div className="text-xs text-gray-600">2nd Nov., 2025</div>
            </div>
          </TabsTrigger>
        </TabsList>

        {Object.entries(agendaData).map(([dayKey, dayData]: any) => (
          <TabsContent key={dayKey} value={dayKey}>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {dayData.title}
              </h2>
              <p className="text-lg text-gray-600">{dayData.date}</p>
            </div>

            <div className="space-y-4">
              {dayData.events.map((event: any, index: number) => (
                <Card
                  key={index}
                  className={`glass-card transition-all duration-300 hover-lift ${
                    event.featured
                      ? "ring-2 ring-primary-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          <div
                            className={`p-2 rounded-lg ${getEventTypeColor(event.type)} flex-shrink-0`}
                          >
                            <event.icon className="w-5 h-5" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {event.title}
                              </h3>
                              {event.featured && (
                                <Badge
                                  variant="secondary"
                                  className="bg-secondary-100 text-secondary-800"
                                >
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

                      {event.type !== "break" &&
                        event.type !== "networking" && (
                          <div className="lg:ml-6">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full lg:w-auto"
                            >
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
