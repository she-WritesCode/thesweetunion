"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface RSVPData {
  group: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  attending: boolean;
  events: {
    ceremony: boolean;
    reception: boolean;
  };
  hasSpouse: boolean;
  spouseName: string;
  dietaryNotes: string;
  message: string;
  submittedAt: string;
}

interface GroupConfig {
  name: string;
  slug: string;
  capacity: number;
}

const GROUPS: GroupConfig[] = [
  { name: "RCF UNILAG", slug: "rcf-unilag", capacity: 30 },
  { name: "Victory Center Teens", slug: "victory-teens", capacity: 15 },
  { name: "Africa Missions", slug: "africa-missions", capacity: 25 },
  { name: "Bride's Extended Family", slug: "bride-family", capacity: 50 },
  { name: "Groom's Extended Family", slug: "groom-family", capacity: 50 },
  { name: "Friends of the Bride", slug: "bride-friends", capacity: 40 },
  { name: "Friends of the Groom", slug: "groom-friends", capacity: 40 },
  { name: "Other / Mutual Friends", slug: "mutual-friends", capacity: 20 }
];

function RSVPFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupQuery = searchParams.get("group");

  const [mounted, setMounted] = useState(false);
  const [existingRSVP, setExistingRSVP] = useState<RSVPData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Flow State (Step 2 = Attendance, Step 3 = Details, Step 4 = Message & Submit)
  const [currentStep, setCurrentStep] = useState(2);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});

  // Form State
  const [group, setGroup] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [events, setEvents] = useState({ ceremony: true, reception: true });
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseName, setSpouseName] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [message, setMessage] = useState("");
  
  // Modals / Flow states
  const [successModal, setSuccessModal] = useState<"submit" | "edit" | "cancel" | null>(null);
  const [groupFullError, setGroupFullError] = useState<string | null>(null);
  const [invalidLinkError, setInvalidLinkError] = useState(false);

  // Load RSVP and Capacities on mount
  useEffect(() => {
    // 1. Read existing RSVP
    const saved = localStorage.getItem("thesweetunion_rsvp");
    let parsed: RSVPData | null = null;
    if (saved) {
      try {
        parsed = JSON.parse(saved) as RSVPData;
        setExistingRSVP(parsed);
        populateStates(parsed);
      } catch (e) {
        console.error("Failed to parse saved RSVP", e);
      }
    }

    // 2. Load group seat counts
    const savedCounts = localStorage.getItem("thesweetunion_group_counts");
    let counts: Record<string, number> = {};
    if (savedCounts) {
      try {
        counts = JSON.parse(savedCounts);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Mock counts setup: RCF is close to full to test error limits
      GROUPS.forEach(g => {
        if (g.slug === "rcf-unilag") {
          counts[g.slug] = 29; // 1 spot left
        } else if (g.slug === "victory-teens") {
          counts[g.slug] = 15; // completely full!
        } else {
          counts[g.slug] = Math.floor(Math.random() * 8) + 5;
        }
      });
      localStorage.setItem("thesweetunion_group_counts", JSON.stringify(counts));
    }
    setGroupCounts(counts);

    // 3. Validate Group parameter from link URL
    if (groupQuery) {
      const selected = GROUPS.find(g => g.slug === groupQuery);
      if (selected) {
        setGroup(selected.name);
        
        // Capacity check immediately
        const currentCount = counts[selected.slug] || 0;
        let previousSeats = 0;
        if (parsed && parsed.group === selected.name && parsed.attending) {
          previousSeats = 1 + (parsed.hasSpouse ? 1 : 0);
        }

        if (currentCount - previousSeats >= selected.capacity) {
          setGroupFullError(selected.name);
        } else {
          setGroupFullError(null);
          setCurrentStep(2); // start on step 2 (attending check)
        }
      } else {
        setInvalidLinkError(true);
      }
    } else if (!parsed) {
      // No query group parameter and no existing local storage RSVP means they accessed /rsvp directly
      setInvalidLinkError(true);
    }

    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [groupQuery]);

  const populateStates = (data: RSVPData) => {
    setGroup(data.group);
    setLeadName(data.leadName);
    setLeadEmail(data.leadEmail);
    setLeadPhone(data.leadPhone || "");
    setAttending(data.attending);
    setEvents(data.events || { ceremony: true, reception: true });
    setHasSpouse(data.hasSpouse || false);
    setSpouseName(data.spouseName || "");
    setDietaryNotes(data.dietaryNotes || "");
    setMessage(data.message || "");
  };

  const handleAttendanceSelect = (isAttending: boolean) => {
    setAttending(isAttending);
    if (!isAttending) {
      // If declining, skip details step and go directly to step 4 message
      setCurrentStep(4);
    } else {
      setCurrentStep(3);
    }
  };

  const handleStepBack = () => {
    if (currentStep === 4 && attending === false) {
      setCurrentStep(2);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStep3Submit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) return;
    if (hasSpouse && !spouseName.trim()) return;
    if (!events.ceremony && !events.reception) return;

    // Check capacity for final submission seat count
    const selectedGroupConfig = GROUPS.find(g => g.name === group);
    if (selectedGroupConfig) {
      const currentCount = groupCounts[selectedGroupConfig.slug] || 0;
      let previousSeats = 0;
      if (existingRSVP && existingRSVP.group === group && existingRSVP.attending) {
        previousSeats = 1 + (existingRSVP.hasSpouse ? 1 : 0);
      }
      const newSeats = 1 + (hasSpouse ? 1 : 0);

      if (currentCount - previousSeats + newSeats > selectedGroupConfig.capacity) {
        setGroupFullError(selectedGroupConfig.name);
        return;
      }
    }

    setCurrentStep(4);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (attending === null) return;

    const payload: RSVPData = {
      group,
      leadName,
      leadEmail,
      leadPhone,
      attending,
      events: attending ? events : { ceremony: false, reception: false },
      hasSpouse: attending ? hasSpouse : false,
      spouseName: (attending && hasSpouse) ? spouseName : "",
      dietaryNotes: attending ? dietaryNotes : "",
      message,
      submittedAt: new Date().toISOString()
    };

    // Update seating counters in localStorage
    const selectedGroupConfig = GROUPS.find(g => g.name === group);
    if (selectedGroupConfig) {
      const updatedCounts = { ...groupCounts };
      
      // Remove previous seat allocations
      if (existingRSVP && existingRSVP.group === group && existingRSVP.attending) {
        const oldSeats = 1 + (existingRSVP.hasSpouse ? 1 : 0);
        updatedCounts[selectedGroupConfig.slug] = Math.max(0, (updatedCounts[selectedGroupConfig.slug] || 0) - oldSeats);
      }

      // Add new seats allocation
      if (attending) {
        const newSeats = 1 + (hasSpouse ? 1 : 0);
        updatedCounts[selectedGroupConfig.slug] = (updatedCounts[selectedGroupConfig.slug] || 0) + newSeats;
      }

      localStorage.setItem("thesweetunion_group_counts", JSON.stringify(updatedCounts));
      setGroupCounts(updatedCounts);
    }

    localStorage.setItem("thesweetunion_rsvp", JSON.stringify(payload));
    setExistingRSVP(payload);
    setSuccessModal(existingRSVP ? "edit" : "submit");
    setIsEditing(false);
  };

  const handleCancelRSVP = () => {
    if (confirm("Are you sure you want to cancel your RSVP? This will release your spots for others.")) {
      // Release capacity allocation
      const selectedGroupConfig = GROUPS.find(g => g.name === group);
      if (selectedGroupConfig && existingRSVP && existingRSVP.attending) {
        const updatedCounts = { ...groupCounts };
        const seats = 1 + (existingRSVP.hasSpouse ? 1 : 0);
        updatedCounts[selectedGroupConfig.slug] = Math.max(0, (updatedCounts[selectedGroupConfig.slug] || 0) - seats);
        localStorage.setItem("thesweetunion_group_counts", JSON.stringify(updatedCounts));
        setGroupCounts(updatedCounts);
      }

      localStorage.removeItem("thesweetunion_rsvp");
      setExistingRSVP(null);
      // Reset form states
      setGroup("");
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setAttending(null);
      setEvents({ ceremony: true, reception: true });
      setHasSpouse(false);
      setSpouseName("");
      setDietaryNotes("");
      setMessage("");
      setSuccessModal("cancel");
      setIsEditing(false);
      router.push("/rsvp", { scroll: false });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-warm-cream text-deep-espresso flex items-center justify-center select-none">
        <div className="text-sm font-semibold tracking-wider uppercase font-display-cinzel animate-pulse">Loading RSVP details...</div>
      </div>
    );
  }

  // Calculate progress on steps 2 to 4
  const getStepProgress = () => {
    return ((currentStep - 1) / 3) * 100;
  };

  const isFormActive = (!existingRSVP || isEditing) && !invalidLinkError && !groupFullError;

  return (
    <div className={`min-h-screen bg-warm-cream text-deep-espresso select-text flex flex-col ${isFormActive ? "justify-center" : "justify-between"}`}>
      
      {/* Conditionally show normal headers/navigation if not filling a full-screen form */}
      {!isFormActive && <Navigation />}

      {/* Main Section */}
      <main className={`flex-1 flex items-center justify-center p-6 ${isFormActive ? "pt-6 pb-6" : "pt-32 pb-16"}`}>
        <div className="w-full max-w-2xl">

          {/* 1. INVALID DIRECT LINK BLOCKER */}
          {invalidLinkError && !existingRSVP && (
            <div className="linen-card p-8 rounded-2xl border border-amber-gold/20 shadow-lg text-center space-y-5 animate-fade-in">
              <div className="text-4xl">✉️</div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display-cinzel text-deep-espresso">
                Personal Invitation Required
              </h2>
              <p className="font-body text-deep-espresso/80 text-sm leading-relaxed max-w-md mx-auto">
                To RSVP for our wedding, please click the personalized RSVP link sent directly to you by the couple. 
                This helps us manage guest capacity and seating charts.
              </p>
              <p className="text-xs text-deep-espresso/50 font-body">
                If you have any questions or did not receive your link, please contact Uche or Adun.
              </p>
            </div>
          )}

          {/* 2. CAPACITY ALLOCATION BLOCKER */}
          {groupFullError && (
            <div className="linen-card p-8 rounded-2xl border border-red-500/20 shadow-lg text-center space-y-5 animate-fade-in">
              <div className="text-4xl">⚠️</div>
              <h3 className="font-heading text-2xl font-bold text-deep-espresso">
                Allocation Limit Reached
              </h3>
              <p className="font-body text-deep-espresso/80 text-sm sm:text-base leading-relaxed">
                We are so sorry, but the allocation spots for this group invitation are completely filled. 
                Please reach out to the couple directly to coordinate manual adjustments.
              </p>
              {existingRSVP && (
                <button
                  type="button"
                  onClick={() => {
                    setGroupFullError(null);
                    setIsEditing(false);
                    if (existingRSVP) populateStates(existingRSVP);
                  }}
                  className="px-6 py-2 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow cursor-pointer"
                >
                  View My Current Confirmation
                </button>
              )}
            </div>
          )}

          {/* 3. CONFIRMED RSVP SUMMARY (No active form) */}
          {existingRSVP && !isEditing && !groupFullError && (
            <div className="linen-card p-6 sm:p-10 rounded-2xl border border-amber-gold/15 shadow-md space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-gold/10 pb-6">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-gold block mb-1">
                    RSVP Status
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3.5 h-3.5 rounded-full ${existingRSVP.attending ? "bg-emerald-500" : "bg-red-400 animate-pulse"}`} />
                    <h3 className="font-heading text-2xl font-bold text-deep-espresso">
                      {existingRSVP.attending ? "You're Attending! 🎉" : "Declined Attendance"}
                    </h3>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-deep-espresso/60 font-body">
                  Submitted: {new Date(existingRSVP.submittedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm font-body">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Guest</h4>
                    <p className="font-semibold text-base">{existingRSVP.leadName}</p>
                    <p className="text-deep-espresso/70">{existingRSVP.leadEmail}</p>
                    {existingRSVP.leadPhone && <p className="text-deep-espresso/70">{existingRSVP.leadPhone}</p>}
                  </div>
                </div>

                {existingRSVP.attending && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Events Selected</h4>
                      <ul className="space-y-1 bg-warm-cream/50 p-3 rounded-xl border border-amber-gold/5">
                        {existingRSVP.events?.ceremony && (
                          <li className="flex items-center gap-2 text-deep-espresso">
                            <span className="text-emerald-600">✓</span> Holy Matrimony Ceremony
                          </li>
                        )}
                        {existingRSVP.events?.reception && (
                          <li className="flex items-center gap-2 text-deep-espresso">
                            <span className="text-emerald-600">✓</span> Grand Reception Banquet
                          </li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Plus-One Details</h4>
                      {existingRSVP.hasSpouse && existingRSVP.spouseName ? (
                        <p className="text-deep-espresso/80">
                          Attending with spouse: <strong>{existingRSVP.spouseName}</strong>
                        </p>
                      ) : (
                        <p className="text-deep-espresso/50 italic">Attending solo</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {(existingRSVP.dietaryNotes || existingRSVP.message) && (
                <div className="border-t border-amber-gold/10 pt-6 space-y-4 text-sm font-body">
                  {existingRSVP.dietaryNotes && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Dietary Restrictions</h4>
                      <p className="text-deep-espresso/80 italic bg-amber-500/5 p-3 rounded-xl border border-amber-gold/10">
                        {existingRSVP.dietaryNotes}
                      </p>
                    </div>
                  )}

                  {existingRSVP.message && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Message to the Couple</h4>
                      <p className="text-deep-espresso/80 whitespace-pre-line bg-soft-pearl/50 p-4 rounded-xl border border-amber-gold/10">
                        &ldquo;{existingRSVP.message}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-amber-gold/10 pt-6 flex flex-wrap gap-4 items-center justify-between">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none cursor-pointer"
                >
                  Edit My RSVP
                </button>
                <button
                  onClick={handleCancelRSVP}
                  className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-700 font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-all duration-300 focus:outline-none cursor-pointer"
                >
                  Cancel RSVP
                </button>
              </div>
            </div>
          )}

          {/* 4. FULL SCREEN ACTIVE TYPEFORM FORM */}
          {isFormActive && (
            <form onSubmit={handleSubmit} className="linen-card w-full p-8 sm:p-12 rounded-3xl border border-amber-gold/15 shadow-2xl relative overflow-hidden select-text animate-fade-in">
              
              {/* Progress Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-gold/10">
                <div 
                  className="h-full bg-deep-terracotta transition-all duration-500" 
                  style={{ width: `${getStepProgress()}%` }}
                />
              </div>

              {/* Quiet branding / context */}
              <div className="flex justify-between items-center mb-10 text-xs font-bold uppercase tracking-widest text-deep-espresso/45">
                <span>#TheSweetUnion</span>
                {isEditing ? <span className="text-deep-terracotta">Editing Mode</span> : <span>RSVP Form</span>}
              </div>

              {/* STEP 2: ATTENDANCE STATUS */}
              {currentStep === 2 && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-bold font-heading text-deep-espresso leading-tight">
                      Will you be joining us?
                    </h2>
                    <p className="font-body text-sm text-deep-espresso/60">
                      We hope you can make the trip to celebrate our marriage vows with us.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => handleAttendanceSelect(true)}
                      className={`p-6 sm:p-8 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer ${
                        attending === true
                          ? "bg-deep-terracotta/5 border-deep-terracotta shadow-md scale-[1.01]"
                          : "bg-soft-pearl/30 border-amber-gold/15 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span className="text-4xl">🎉</span>
                      <span className="font-heading text-xl font-bold text-deep-espresso">Yes, I will be there</span>
                      <span className="text-xs font-body text-deep-espresso/50 text-center">We will set a plate for you!</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAttendanceSelect(false)}
                      className={`p-6 sm:p-8 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer ${
                        attending === false
                          ? "bg-muted-mauve/5 border-muted-mauve shadow-md scale-[1.01]"
                          : "bg-soft-pearl/30 border-amber-gold/15 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span className="text-4xl">✉️</span>
                      <span className="font-heading text-xl font-bold text-deep-espresso">Sadly, I cannot make it</span>
                      <span className="text-xs font-body text-deep-espresso/50 text-center">We will miss you.</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DETAILS */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-bold font-heading text-deep-espresso leading-tight">
                      Tell us about yourself
                    </h2>
                    <p className="font-body text-sm text-deep-espresso/60">
                      Please enter your contact information. This is an adult-only wedding.
                    </p>
                  </div>

                  <div className="space-y-5 pt-2">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Full Name (Required)</label>
                      <input
                        type="text"
                        required
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        className="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                        placeholder="Enter your first and last name"
                      />
                    </div>

                    {/* Contact details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Email Address (Required)</label>
                        <input
                          type="email"
                          required
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                          className="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                          placeholder="name@example.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Phone Number</label>
                        <input
                          type="tel"
                          value={leadPhone}
                          onChange={(e) => setLeadPhone(e.target.value)}
                          className="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                          placeholder="e.g. +234..."
                        />
                      </div>
                    </div>

                    {/* Events list */}
                    <div className="space-y-3 bg-soft-pearl/60 p-4 rounded-xl border border-amber-gold/15">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Which events are you joining?</h4>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                          <input
                            type="checkbox"
                            checked={events.ceremony}
                            onChange={(e) => setEvents({ ...events, ceremony: e.target.checked })}
                            className="w-4.5 h-4.5 accent-deep-terracotta rounded"
                          />
                          <span>Ceremony (1:00 PM)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                          <input
                            type="checkbox"
                            checked={events.reception}
                            onChange={(e) => setEvents({ ...events, reception: e.target.checked })}
                            className="w-4.5 h-4.5 accent-deep-terracotta rounded"
                          />
                          <span>Reception (3:30 PM)</span>
                        </label>
                      </div>
                    </div>

                    {/* Spouse Toggle and name input */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="hasSpouse"
                          checked={hasSpouse}
                          onChange={(e) => setHasSpouse(e.target.checked)}
                          className="w-4.5 h-4.5 accent-deep-terracotta rounded cursor-pointer"
                        />
                        <label htmlFor="hasSpouse" className="text-sm font-semibold cursor-pointer select-none">
                          I am attending with my spouse / plus-one
                        </label>
                      </div>

                      {hasSpouse && (
                        <div className="space-y-1 pl-7 animate-fade-in">
                          <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60 block">Spouse / Partner Name (Required)</label>
                          <input
                            type="text"
                            required
                            value={spouseName}
                            onChange={(e) => setSpouseName(e.target.value)}
                            className="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                            placeholder="Enter partner's name"
                          />
                        </div>
                      )}
                    </div>

                    {/* Dietary notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Dietary restrictions (Optional)</label>
                      <input
                        type="text"
                        value={dietaryNotes}
                        onChange={(e) => setDietaryNotes(e.target.value)}
                        className="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                        placeholder="Allergies, vegetarian, vegan, etc."
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleStep3Submit}
                      disabled={!leadName || !leadEmail || (hasSpouse && !spouseName.trim()) || (!events.ceremony && !events.reception)}
                      className={`px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow cursor-pointer ${
                        (!leadName || !leadEmail || (hasSpouse && !spouseName.trim()) || (!events.ceremony && !events.reception))
                          ? "bg-deep-espresso/10 text-deep-espresso/45 cursor-not-allowed shadow-none"
                          : "bg-deep-terracotta text-warm-cream hover:bg-burnt-sienna hover:shadow-md"
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: MESSAGE & SUBMIT */}
              {currentStep === 4 && (
                <div className="space-y-8 animate-fade-in">
                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-bold font-heading text-deep-espresso leading-tight">
                      Greetings for the couple
                    </h2>
                    <p className="font-body text-sm text-deep-espresso/60">
                      Leave a congratulatory message or prayer for Uche & Adun (Optional).
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Message</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={6}
                        className="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta resize-none"
                        placeholder="Share your congrats message..."
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end">
                    <button
                      type="submit"
                      className="px-8 py-3.5 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-widest hover:bg-burnt-sienna hover:shadow-lg transition-all duration-300 shadow cursor-pointer"
                    >
                      {isEditing ? "Save RSVP Changes" : "Submit My RSVP"}
                    </button>
                  </div>
                </div>
              )}

              {/* Back navigation buttons inside form wrapper */}
              <div className="border-t border-amber-gold/10 mt-8 pt-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                {currentStep > 2 ? (
                  <button
                    type="button"
                    onClick={handleStepBack}
                    className="text-deep-espresso/60 hover:text-deep-espresso transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (existingRSVP) {
                      populateStates(existingRSVP);
                    } else {
                      router.push("/rsvp", { scroll: false });
                    }
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Exit Form
                </button>
              </div>
            </form>
          )}

        </div>
      </main>

      {/* Conditionally show normal footer if not in full screen form mode */}
      {!isFormActive && <Footer />}

      {/* SUCCESS MODALS */}
      {successModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="linen-card w-full max-w-md p-8 rounded-2xl border border-amber-gold/20 shadow-2xl text-center relative animate-scale-up animate-duration-200">
            <div className="text-4xl mb-4">
              {successModal === "cancel" ? "🗑️" : "🎉"}
            </div>
            
            <h3 className="font-heading text-2xl font-bold text-deep-espresso mb-2">
              {successModal === "cancel" 
                ? "RSVP Removed" 
                : successModal === "edit" 
                  ? "RSVP Changes Saved!" 
                  : "Thank You So Much!"}
            </h3>

            <p className="font-body text-deep-espresso/80 text-sm leading-relaxed mb-6">
              {successModal === "cancel" && (
                <>Your RSVP registration details have been successfully deleted from this browser session.</>
              )}
              {successModal === "edit" && (
                <>Your details have been successfully updated. We look forward to celebrating together in Lagos.</>
              )}
              {successModal === "submit" && attending === true && (
                <>You&apos;re officially on the list! We cannot wait to celebrate our union with you. We have saved your confirmation card details.</>
              )}
              {successModal === "submit" && attending === false && (
                <>Thank you for letting us know. We will surely miss your presence, but we appreciate your thoughts and support!</>
              )}
            </p>

            <button
              onClick={() => setSuccessModal(null)}
              className="px-6 py-2.5 rounded-xl bg-deep-terracotta text-warm-cream font-bold text-xs uppercase tracking-wider hover:bg-burnt-sienna transition-all duration-300 shadow focus:outline-none cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function RSVPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-warm-cream text-deep-espresso flex flex-col relative select-text">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-sm font-semibold tracking-wider uppercase font-display-cinzel animate-pulse">Loading RSVP details...</div>
        </main>
        <Footer />
      </div>
    }>
      <RSVPFormContent />
    </Suspense>
  );
}
