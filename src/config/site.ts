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
  googleMapsEmbedUrl: string;
  googleMapsDirectionsUrl: string;
}

export interface EventConfig {
  key: string;
  name: string;
  date: string;
  venue: VenueConfig;
  dressCode: string;
  schedule: ScheduleItem[];
  imageUrl: string;
  rsvpTeaser: {
    title: string;
    description: string;
  };
  rsvpLink: string;
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
  weddingDate: "2026-10-14T10:00:00", // Traditional day start
  rsvpCutoffDate: "2026-09-15T23:59:59",
  story: [
    {
      key: "met",
      label: "September 2016",
      title: "Teen Church Exco",
      description: "We met in the teens department at church, serving together on the Teen Church Executive Committee (Exco). We spent more time planning youth dramas and arguing over snack budgets than actual meeting notes, but a deep friendship took root.",
      imageUrl: "/images/story-1.png",
    },
    {
      key: "friendship",
      label: "2018 - 2024",
      title: "The 'Brother & Sister' Era",
      description: "Through university and starting our careers, we remained close friends—sharing prayers, checking in on each other, and insisting to everyone who asked that we were strictly 'brother and sister in Christ'. Our friends didn't believe us, and they were right.",
      imageUrl: "/images/story-2.png",
    },
    {
      key: "started-dating",
      label: "January 2025",
      title: "Only Started Dating Last Year",
      description: "After nearly a decade of being close friends, everything finally shifted last year. We stopped running from the obvious and finally admitted our feelings. It turned out the partner we had been praying for was standing right next to us the whole time.",
      imageUrl: "/images/story-3.png",
    },
    {
      key: "proposal",
      label: "August 2025",
      title: "The Quiet Proposal",
      description: "No flash mobs, no loud cameras. Just a quiet Sunday evening in our living room with hot chin-chin and Uche getting down on one knee. It was simple, real, and a joyful 'Yes' from Adun.",
      imageUrl: "/images/story-4.png",
    },
  ],
  events: [
    {
      key: "traditional",
      name: "The Traditional Engagement",
      date: "Wednesday, October 14, 2026 at 10:00 AM",
      venue: {
        name: "Lagos, Nigeria",
        address: "Exact location details will be sent privately with your invitation card.",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126846.02196655182!2d3.336184511520697!3d6.52437930335022!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b2ae68280c1%3A0xdc9e87a3da9c4a01!2sLagos%2C%20Nigeria!5e0!3m2!1sen!2sng!4v1716682000000!5m2!1sen!2sng",
        googleMapsDirectionsUrl: "https://maps.google.com/?q=Lagos+Nigeria",
      },
      dressCode: "Traditional Attire (Colors: Sage Green & Champagne Gold)",
      schedule: [
        {
          time: "10:00 AM",
          title: "Welcome & Family Introductions",
          description: "Formal arrival of the groom's family (the Igbo delegation) greeted warmly by the bride's Yoruba family.",
        },
        {
          time: "11:30 AM",
          title: "The Entrance & Respects (Idobale)",
          description: "Uche and his friends pay their respects by prostrating before Adun's parents. The presentation of the proposal letter (Leta Igbeyawo).",
        },
        {
          time: "1:00 PM",
          title: "Bride's Entrance & Igbo Wine Carrying",
          description: "Adun enters in her traditional attire, identifies Uche as her husband, and carries the palm wine to him for his blessing.",
        },
        {
          time: "2:30 PM",
          title: "Banquet & Spraying Ceremony",
          description: "Authentic Jollof, Pounded Yam with Egusi, and Ofe Nsala. Live band performance and the traditional spraying of the couple.",
        },
      ],
      imageUrl: "/images/traditional_couple.png",
      rsvpTeaser: {
        title: "Traditional RSVP & Aso Ebi",
        description: "Please RSVP for our Traditional Engagement. Details for Aso Ebi packaging and head ties (Gele) can be found in the RSVP details.",
      },
      rsvpLink: "#rsvp-traditional",
    },
    {
      key: "white",
      name: "The White Wedding Celebration",
      date: "Thursday, October 15, 2026 at 1:00 PM",
      venue: {
        name: "Lagos, Nigeria",
        address: "Exact church and reception hall details will be shared privately upon RSVP confirmation.",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126846.02196655182!2d3.336184511520697!3d6.52437930335022!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b2ae68280c1%3A0xdc9e87a3da9c4a01!2sLagos%2C%20Nigeria!5e0!3m2!1sen!2sng!4v1716682000000!5m2!1sen!2sng",
        googleMapsDirectionsUrl: "https://maps.google.com/?q=Lagos+Nigeria",
      },
      dressCode: "Strictly Formal / African Regal",
      schedule: [
        {
          time: "1:00 PM",
          title: "Church Vows & Matrimony",
          description: "Join us at the sanctuary for the solemnization of holy matrimony. Please arrive early to beat the Lagos traffic.",
        },
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
        description: "Verify your attendance for the church and reception hall banquet. Access cards will be issued to confirmed RSVP groups only.",
      },
      rsvpLink: "#rsvp-white",
    },
  ],
  faqs: [
    {
      key: "aso-ebi",
      question: "Is there Aso Ebi / Dress Code?",
      answer: "Yes! For the Traditional Engagement, our color codes are Sage Green & Champagne Gold. For the White Wedding, the dress code is Strictly Formal/African Regal. Aso Ebi packages can be ordered by contacting the mother of the bride.",
    },
    {
      key: "kids",
      question: "Are children allowed?",
      answer: "We love our nieces, nephews, and little cousins, but due to venue capacity restrictions in the hall, our wedding reception is strictly an adult-only event. We hope you understand and enjoy the night off!",
    },
    {
      key: "traffic",
      question: "What about Lagos traffic & security?",
      answer: "Both venues have secure, armed security details and gated parking yards. We highly recommend leaving early to avoid toll gate and bridge delays, especially on Thursday afternoon.",
    },
    {
      key: "accommodation",
      question: "Where can out-of-town guests stay?",
      answer: "We have partnered with hotels near the venues to offer discounted rates for our guests. Please check your invitation or contact our wedding planner for booking codes.",
    },
  ],
  wishlistTeaser: {
    title: "Support Our Union",
    description: "Your presence and prayers are everything we could ask for. If you wish to bless our home, we have put together a registry of items we'll need as we set up our life together in Lagos.",
  },
};
