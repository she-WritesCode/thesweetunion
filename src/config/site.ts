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
  weddingDate: string; // Master target date for countdown (typically the first event)
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
  weddingDate: "2026-10-14T11:00:00", // Start countdown to the first event (Traditional)
  rsvpCutoffDate: "2026-09-15T23:59:59",
  story: [
    {
      key: "met",
      label: "September 2017",
      title: "The First Coffee",
      description: "We met at university during a library project. We spent three hours talking about everything except the assignment. A friendship was quietly born, and we became inseparable.",
      imageUrl: "/images/story-1.png",
    },
    {
      key: "memorable",
      label: "July 2019",
      title: "The Road Trip Disaster",
      description: "Our car broke down in the middle of Wales in pouring rain with no signal. Uche made Adun laugh for six hours eating cold beans. That was when things started blurring.",
      imageUrl: "/images/story-2.png",
    },
    {
      key: "shifted",
      label: "December 2021",
      title: "When Things Shifted",
      description: "After years of being advisor-friends, Adun finally admitted what everyone else already knew. It took a long time, but we finally got it right and started our romance.",
      imageUrl: "/images/story-3.png",
    },
    {
      key: "engagement",
      label: "August 2025",
      title: "The Quiet Promise",
      description: "No grand gestures, no flashing lights. Just a quiet walk by the lake on a Sunday evening, a question asked by Uche, and a simple, joyful 'Yes' from Adun.",
      imageUrl: "/images/story-4.png",
    },
  ],
  events: [
    {
      key: "traditional",
      name: "The Traditional Engagement",
      date: "Wednesday, October 14, 2026 at 11:00 AM",
      venue: {
        name: "The Oakwood Barn (Lawn)",
        address: "12 Meadow Lane, Oxfordshire, OX7 5UT, United Kingdom",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2472.074474735234!2d-1.4646736233486307!3d51.89613147190899!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487127e4db7cc9e3%3A0xe54d6faee63b4f65!2sOxfordshire%20Cotswolds!5e0!3m2!1sen!2suk!4v1716682000000!5m2!1sen!2suk",
        googleMapsDirectionsUrl: "https://maps.google.com/?q=The+Oakwood+Barn+Oxfordshire+Cotswolds",
      },
      schedule: [
        {
          time: "11:00 AM",
          title: "Formal Welcome & Introductions",
          description: "Greeting and welcome ceremonies between the bride's and groom's families, paying cultural respect.",
        },
        {
          time: "12:30 PM",
          title: "The Dowry & Presentation",
          description: "Formal introduction of the groom, reading of the proposal letter, and symbolic presentation of gifts.",
        },
        {
          time: "2:00 PM",
          title: "Traditional Banquet & Celebration",
          description: "A rich feast of authentic cuisine followed by drumming, dancing, and spraying of the couple.",
        },
      ],
      imageUrl: "/images/traditional_couple.png",
      rsvpTeaser: {
        title: "Attend the Traditional Ceremony",
        description: "Please RSVP for the Traditional Engagement Ceremony before September 15 so we can prepare our catering and arrangements accordingly.",
      },
      rsvpLink: "#rsvp-traditional",
    },
    {
      key: "white",
      name: "The White Wedding Celebration",
      date: "Thursday, October 15, 2026 at 1:00 PM",
      venue: {
        name: "St. Mary's Cotswold Church & The Oakwood Barn",
        address: "Church Street, Oxfordshire, OX7 5UT, United Kingdom",
        googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2472.074474735234!2d-1.4646736233486307!3d51.89613147190899!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487127e4db7cc9e3%3A0xe54d6faee63b4f65!2sOxfordshire%20Cotswolds!5e0!3m2!1sen!2suk!4v1716682000000!5m2!1sen!2suk",
        googleMapsDirectionsUrl: "https://maps.google.com/?q=The+Oakwood+Barn+Oxfordshire+Cotswolds",
      },
      schedule: [
        {
          time: "1:00 PM",
          title: "Holy Matrimony Ceremony",
          description: "The exchange of vows and rings in the chapel under the oak vaults. Please arrive early.",
        },
        {
          time: "2:30 PM",
          title: "Cocktails & Toast on the Lawn",
          description: "Champagne, small bites, acoustic music, and photo sessions with friends and families.",
        },
        {
          time: "5:00 PM",
          title: "Reception Banquet & Dance",
          description: "Formal dinner, couple's first dance, cake cutting, and celebrating late into the night.",
        },
      ],
      imageUrl: "/images/white_couple.png",
      rsvpTeaser: {
        title: "Attend the White Wedding",
        description: "Please RSVP for the White Wedding Ceremony and Banquet Reception. Individual seat reservations will be locked at cutoff.",
      },
      rsvpLink: "#rsvp-white",
    },
  ],
  faqs: [
    {
      key: "dress-code",
      question: "What is the dress code?",
      answer: "We would love for everyone to feel comfortable. The dress code is 'Garden Semi-Formal'—think warm tones, soft linens, flowing dresses, and comfortable shoes for walking on the lawn.",
    },
    {
      key: "kids",
      question: "Are children welcome?",
      answer: "To allow all guests, including parents, a night of relaxation and celebration, we have chosen for our wedding day to be an adult-only occasion. We hope you understand!",
    },
    {
      key: "parking",
      question: "Is there parking at the venue?",
      answer: "Yes, there is ample free parking available on-site at The Oakwood Barn. You are welcome to leave your car overnight, but please ensure it is collected by 10:00 AM the following morning.",
    },
    {
      key: "accommodation",
      question: "Where should I stay?",
      answer: "We have recommended a few cozy local B&Bs and hotels within a 10-minute drive of the venue. Detailed list will be shared in your confirmation email, or please contact us directly.",
    },
  ],
  wishlistTeaser: {
    title: "A Small Note on Gifts",
    description: "Your presence at our wedding is the greatest gift of all. If you would like to honour us with a gift, we have created a curated wishlist of items that will help us build our new home together.",
  },
};
