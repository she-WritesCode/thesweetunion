export interface TimelineItem {
  key: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

export interface FAQItem {
  key: string;
  question: string;
  answer: string;
}

export interface VenueConfig {
  name: string;
  address: string;
  googleMapsEmbedUrl?: string;
  googleMapsDirectionsUrl?: string;
}

export interface EventConfig {
  key: string;
  name: string;
  date: string;
  venue?: VenueConfig;
  dressCode: string;
  schedule: ScheduleItem[];
  imageUrl: string;
  rsvpTeaser?: {
    title: string;
    description: string;
  };
  rsvpLink?: string;
}

export interface SiteConfig {
  couple: {
    person1: string;
    person2: string;
    hashtag: string;
  };
  weddingDate: string;
  rsvpCutoffDate: string;
  story: TimelineItem[];
  events: EventConfig[];
  faqs: FAQItem[];
  wishlistTeaser: {
    title: string;
    description: string;
  };
}

export const siteConfig: SiteConfig = {
  couple: {
    person1: "Adun",
    person2: "Uche",
    hashtag: "#TheSweetUnion",
  },
  weddingDate: "2026-10-24T13:00:00", // White Wedding day start
  rsvpCutoffDate: "2026-09-15T23:59:59",
  story: [
    {
      key: "met",
      label: "September 2016",
      title: "Teen Church Exco",
      description: "We met in the teens department at church, serving together on the Teen Church Executive Committee (Exco). We spent more time planning youth dramas and arguing over snack budget[...]",
      imageUrl: "/images/story-1.png",
    },
    {
      key: "friendship",
      label: "2018 - 2024",
      title: "The 'Brother & Sister' Era",
      description: "Through university and starting our careers, we remained close friends—sharing prayers, checking in on each other, and insisting to everyone who asked that we were strictly '[...]",
      imageUrl: "/images/story-2.png",
    },
    {
      key: "started-dating",
      label: "January 2025",
      title: "Only Started Dating Last Year",
      description: "After nearly a decade of being close friends, everything finally shifted last year. We stopped running from the obvious and finally admitted our feelings. It turned out the par[...]",
      imageUrl: "/images/story-3.png",
    },
    {
      key: "proposal",
      label: "August 2025",
      title: "The Quiet Proposal",
      description: "No flash mobs, no loud cameras. Just a quiet Sunday evening in our living room with hot chin-chin and Uche getting down on one knee. It was simple, real, and a joyful 'Yes' fro[...]",
      imageUrl: "/images/story-4.png",
    },
  ],
  events: [
    {
      key: "white-ceremony",
      name: "The Holy Matrimony Ceremony",
      date: "Saturday, October 24, 2026 at 1:00 PM",
      venue: {
        name: "Sanctuary Cathedral",
        address: "Exact church details will be shared privately upon RSVP confirmation.",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126846.02196655182!2d3.336184511520697!3d6.52437930335022!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x10[...]",
        googleMapsDirectionsUrl: "https://maps.google.com/?q=Lagos+Nigeria",
      },
      dressCode: "Strictly Formal / African Regal",
      schedule: [
        {
          time: "1:00 PM",
          title: "Church Vows & Matrimony",
          description: "Join us at the sanctuary for the solemnization of holy matrimony. Please arrive early to beat the Lagos traffic.",
        },
      ],
      imageUrl: "/images/white_couple.png",
      rsvpTeaser: {
        title: "Ceremony RSVP",
        description: "Please let us know if you will be attending our Holy Matrimony ceremony in the sanctuary.",
      },
      rsvpLink: "/rsvp",
    },
    {
      key: "white-reception",
      name: "The Wedding Reception",
      date: "Saturday, October 24, 2026 at 3:30 PM",
      venue: {
        name: "Grand Ballroom",
        address: "Exact reception hall details will be shared privately upon RSVP confirmation.",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126846.02196655182!2d3.336184511520697!3d6.52437930335022!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x10[...]",
        googleMapsDirectionsUrl: "https://maps.google.com/?q=Lagos+Nigeria",
      },
      dressCode: "Strictly Formal / African Regal",
      schedule: [
        {
          time: "3:30 PM",
          title: "Grand Reception Entrance",
          description: "The couple and bridal train make their grand, high-energy entrance into the hall.",
        },
        {
          time: "5:00 PM",
          title: "Dinner, Speeches & Dance Floor Lock",
          description: "Family-style dinner, toasts, and dancing until the DJ turns off the lights.",
        },
      ],
      imageUrl: "/images/white_couple.png",
      rsvpTeaser: {
        title: "Reception RSVP & Seating Details",
        description: "Verify your attendance for the reception hall banquet. Access cards will be issued to confirmed RSVP groups only.",
      },
      rsvpLink: "/rsvp",
    },
  ],
  faqs: [
    {
      key: "aso-ebi",
      question: "Is there a Dress Code?",
      answer: "Yes! For the White Wedding, the dress code is Strictly Formal / African Regal.",
    },
    {
      key: "kids",
      question: "Are children allowed?",
      answer: "We love our nieces, nephews, and little cousins, but due to venue capacity restrictions in the hall, our wedding reception is strictly an adult-only event. We hope you understand a[...]",
    },
    {
      key: "traffic",
      question: "What about Lagos traffic & security?",
      answer: "The venue has secure, armed security details and a gated parking yard. We highly recommend leaving early to avoid toll gate and bridge delays, especially on Thursday afternoon.",
    },
    {
      key: "accommodation",
      question: "Where can out-of-town guests stay?",
      answer: "We have partnered with hotels near the venue to offer discounted rates for our guests. Please check your invitation or contact our wedding planner for booking codes.",
    },
  ],
  wishlistTeaser: {
    title: "Support Our Union",
    description: "Your presence and prayers are everything we could ask for. If you wish to bless our home, we have put together a registry of items we'll need as we set up our life together in L[...]",
  },
};
