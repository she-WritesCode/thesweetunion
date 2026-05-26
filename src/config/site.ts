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

export interface SiteConfig {
  couple: {
    person1: string;
    person2: string;
    hashtag: string;
  };
  weddingDate: string; // ISO format or parsing-friendly format
  rsvpCutoffDate: string;
  venue: {
    name: string;
    address: string;
    googleMapsEmbedUrl: string;
    googleMapsDirectionsUrl: string;
  };
  story: TimelineItem[];
  scheduleTraditional: ScheduleItem[];
  scheduleWhite: ScheduleItem[];
  faqs: FAQItem[];
  wishlistTeaser: {
    title: string;
    description: string;
  };
  rsvpPrompt: {
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
  weddingDate: "2026-10-15T13:00:00", // October 15, 2026, 1:00 PM
  rsvpCutoffDate: "2026-09-15T23:59:59", // September 15, 2026
  venue: {
    name: "The Oakwood Barn",
    address: "12 Meadow Lane, Oxfordshire, OX7 5UT, United Kingdom",
    // Standard secure Google Maps Embed URL
    googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2472.074474735234!2d-1.4646736233486307!3d51.89613147190899!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487127e4db7cc9e3%3A0xe54d6faee63b4f65!2sOxfordshire%20Cotswolds!5e0!3m2!1sen!2suk!4v1716682000000!5m2!1sen!2suk",
    googleMapsDirectionsUrl: "https://maps.google.com/?q=The+Oakwood+Barn+Oxfordshire+Cotswolds",
  },
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
  scheduleTraditional: [
    {
      time: "11:00 AM",
      title: "Traditional Welcome & Introduction",
      description: "Formal welcome of the groom's family by the bride's family, paying respect to cultural heritage and traditions.",
    },
    {
      time: "12:30 PM",
      title: "The Presentation & Dowry",
      description: "Formal introduction and symbolic presentation of gift items between both families.",
    },
    {
      time: "2:00 PM",
      title: "Traditional Feast & Dance",
      description: "A rich feast of authentic traditional cuisine, accompanied by cultural drumming, dancing, and celebrations.",
    },
  ],
  scheduleWhite: [
    {
      time: "1:00 PM",
      title: "The White Wedding Ceremony",
      description: "Join us as we exchange vows under the oak trees. Please arrive 15 minutes early.",
    },
    {
      time: "2:30 PM",
      title: "Cocktails & Cake Cutting",
      description: "Toast to the newly weds on the lawn with warm acoustic music and fresh-cut cakes.",
    },
    {
      time: "5:00 PM",
      title: "Dinner & Dancing Reception",
      description: "A cozy family-style dinner in the barn, followed by dancing, laughter, and celebrations late into the night.",
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
  rsvpPrompt: {
    title: "Will You Celebrate With Us?",
    description: "Please let us know if you can make it before the deadline so we can finalize our preparations. We would love nothing more than to share this day with you.",
  },
};
