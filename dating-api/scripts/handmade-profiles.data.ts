/**
 * 30 hand-written, realistic-style profiles for QA / enrichment review.
 * IDs stable for UI: /profiles?profileId=handmade_202604_01 and /profiles/compare?ids=...
 */
export interface HandmadeProfile {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}

export const HANDMADE_PROFILES: HandmadeProfile[] = [
  {
    id: 'handmade_202604_01',
    name: 'Noa K.',
    aboutMe:
      'Night-shift ER nurse. I sleep until noon three days a week and drink coffee on the porch before my first shift. I meal-prep lentil soup on Sundays because otherwise I eat vending machine food. I debrief hard cases with one close friend, not a group chat. I run stairs at the hospital when I cannot get outside.',
    aboutPartner:
      'Someone who does not take silence personally when I am decompressing after a shift. I am drawn to people who can name what they need without turning it into a performance. If you need constant texting between dates we will not fit.',
    aboutRelationship:
      'I want kids on a timeline we talk about openly—not assumed. After a tense conversation I need an hour alone before I can come back and repair; pushing for instant resolution makes me shut down. Prefer repair over blame once heads are cool.',
  },
  {
    id: 'handmade_202604_02',
    name: 'Yonatan R.',
    aboutMe:
      'I run yeast labs at a small brewery: smell of malt, sticky notebooks, and tasting panels on Friday afternoons. Weekends are either completely social—markets, friends’ rooftops—or I disappear into fermentation journals. Childfree by choice; I like my life loud and a little messy.',
    aboutPartner:
      'Curious palate helps but more importantly: you can say no to a party without guilt-tripping me. I like alternating social bursts and recharge; if you need every Saturday booked solid we will grate on each other.',
    aboutRelationship:
      'No games. If we are exclusive, we say it. If we are not, we say that too. I avoid drama but I do not avoid hard topics—I prefer direct repair when something lands wrong.',
  },
  {
    id: 'handmade_202604_03',
    name: 'Liat M.',
    aboutMe:
      'Wildfire lookout in summers, GIS contractor in winters. My strength training is hauling water jugs up a tower. I read topo maps for fun. I have lived in three countries for contracts and I am not tied to one place yet—remote work and a duffel bag.',
    aboutPartner:
      'Independent but connected: have your own projects so our time together is chosen, not default. I value alone time to reset after long solo weeks; clinginess reads as insecurity to me.',
    aboutRelationship:
      'Long stretches apart are normal in my line of work. We talk issues through on satellite calls when signal allows; I cannot do silent treatment across time zones. Open on kids timeline—depends on whether I ever stay put.',
  },
  {
    id: 'handmade_202604_04',
    name: 'Erez S.',
    aboutMe:
      'Patent litigator. Stable 9-5 on paper; reality is deposition prep at odd hours. I lift at 6am Tuesday/Thursday because it is the only slot that does not move. Family is everything to me in the sense of showing up—parents’ medical appointments, niece’s school plays.',
    aboutPartner:
      'Ambition is attractive; chaos without follow-through is not. I want someone who wants a family and means it—not a vague someday. Emotional maturity matters more than shared hobbies.',
    aboutRelationship:
      'Quality time over quantity: a real dinner beats three distracted evenings. I want kids soon enough that we are not postponing forever. When we fight, I cool down for twenty minutes then I want to talk it out calmly.',
  },
  {
    id: 'handmade_202604_05',
    name: 'Shani B.',
    aboutMe:
      'ASL interpreter for live events. My weekends are visual—deaf community board game nights, captioned film screenings. I cook one elaborate meal a week; the rest is tahini and cucumbers. I need space after crowded interpreting gigs to hear myself think.',
    aboutPartner:
      'Willingness to learn basic signs (even badly) matters more than perfection. I am not into performance dating—curated Instagram aesthetics do nothing for me. Kindness to service staff is my weird litmus test.',
    aboutRelationship:
      'Closeness without losing individuality: we can sit in the same room on laptops and call it a date. I need alone time to recharge after social interpreting; that is not rejection. Repair over blame when we misread each other.',
  },
  {
    id: 'handmade_202604_06',
    name: 'Tom D.',
    aboutMe:
      'Divorced dad of two elementary kids—50/50 custody. My apartment has Lego minefields and a wall calendar color-coded in three inks. I work as a municipal budget analyst; nine-to-five is sacred because pickups are sacred. I do not do nightlife; early bedtimes win.',
    aboutPartner:
      'You do not have to want your own kids but you have to respect that mine exist on a schedule. Patient with snack negotiations and occasional canceled dates when a kid spikes a fever.',
    aboutRelationship:
      'Already have kids is non-negotiable context—I am not hiding them to seem freer. I want emotional safety and honest communication about what blending lives could look like, without rushing introductions.',
  },
  {
    id: 'handmade_202604_07',
    name: 'Maya G.',
    aboutMe:
      'Marine technician—two weeks on a research vessel, one week home. I maintain ROVs; salt rust is a personality trait. When ashore I restore old fiberglass skiffs in my cousin’s yard (sanding until my arms buzz). Spontaneous trips if someone texts “tide’s right tomorrow.”',
    aboutPartner:
      'Flexible with rotations and last-minute sail dates. Not tied to traditional weekend rhythms. If you need daily in-person reassurance we will struggle; I am loyal but intermittent.',
    aboutRelationship:
      'Interdependence over fusion: we each have dangerous hobbies and we debrief them honestly. Prefer repair over blame when I come back irritable from sea legs. Maybe kids—would need land-based chapter first.',
  },
  {
    id: 'handmade_202604_08',
    name: 'Avigail H.',
    aboutMe:
      'Programs week-long silent retreats at a rural center—not monastic myself but I keep slow mornings and no phones at meals. I journal after each cohort leaves. I walk the same loop at dawn listening to birds, not podcasts.',
    aboutPartner:
      'Comfortable with quiet—not awkward silence, chosen silence. I am not here to fix you or be fixed. Someone who values reflection without making every date a therapy session.',
    aboutRelationship:
      'Slow pace on merging lives. I want emotional clarity before labels. Cool down after conflict works better for me than kitchen-sink fights at midnight.',
  },
  {
    id: 'handmade_202604_09',
    name: 'Rotem F.',
    aboutMe:
      'Pastry cook: 4am starts, flour in my hair, tasting spoons in my pocket. I compete in regional patisserie weekends twice a year—those weeks I am unreachable. I want a baby in the next few years; my body clock is loud about it.',
    aboutPartner:
      'You eat dessert without apologizing. You can handle my insane hours in season and not take it as disinterest. Family-oriented without expecting me to quit kitchens—negotiation, not ultimatums.',
    aboutRelationship:
      'Wants kids soon is the north star; I need a partner who will talk logistics without flinching. We prefer repair over blame when stress spikes during service season.',
  },
  {
    id: 'handmade_202604_10',
    name: 'Ido L.',
    aboutMe:
      'Lighting designer for small theater—load-ins until 2am, cues that live in muscle memory. I am a night owl; brunch is my social meal. I bike with a trailer of cables across town because parking is fiction.',
    aboutPartner:
      'Lives a life outside mine so we have stories to swap at 1am diners. No jealousy about cast parties—I am professional, not available. Direct communication beats guessing.',
    aboutRelationship:
      'Not into performance as a relationship style: grand gestures mean less than consistent check-ins. I need cooldown after conflict before I can listen; if you follow me room to room we escalate.',
  },
  {
    id: 'handmade_202604_11',
    name: 'Nitzan A.',
    aboutMe:
      'Urban mobility planner—I fight for bike lanes and document near-misses commuters send me. I ride rain or shine; my rain pants live behind my office door. Weekends I map new neighborhoods with a thermos of tea.',
    aboutPartner:
      'Okay with me disappearing for a long ride Saturday morning. Values independence: I do not want a passenger in every life decision. Kind to strangers in traffic—road rage is a dealbreaker.',
    aboutRelationship:
      'Independent together: shared calendar for big stuff, autonomy on small stuff. Talks issues through once we have both had coffee. Open on kids—depends on city we settle in.',
  },
  {
    id: 'handmade_202604_12',
    name: 'Tal E.',
    aboutMe:
      'Paper conservator at a university library. I spend hours with scalpels and wheat starch paste; I restore old maps until my neck cramps. Quiet home matters to me—low lighting, vinyl sometimes, no TV in the bedroom.',
    aboutPartner:
      'Patient with slow-burn plans. Interested in ideas—does not have to be books if you go deep on something (bread, fungi, transit). Not into performance dating or constant photo ops.',
    aboutRelationship:
      'Steady pace: I am not rushed into cohabiting. Emotional safety first. When we disagree I need to write a bullet list before I speak—I am not stonewalling, I am processing.',
  },
  {
    id: 'handmade_202604_13',
    name: 'Guy N.',
    aboutMe:
      'Pediatric surgeon—pager culture, very fast lifestyle during clusters, then crash days where I do not leave the couch. I batch cook on the one free Sunday a month. I value alone time to decompress after morbidity and mortality conference.',
    aboutPartner:
      'Does not take cancelations as abandonment. Can hold serious topics without flinching. Wants children is important—I hope to be a parent when my training chapter eases.',
    aboutRelationship:
      'Clear expectations: when I am on call I am not fully present—name it, do not test it. Prefer direct repair when hurt feelings happen; I do not have bandwidth for guessing games.',
  },
  {
    id: 'handmade_202604_14',
    name: 'Keren V.',
    aboutMe:
      'Contract translator EN/FR/HE—laptop in three time zones last year. Full remote; I pick cities by coworking noise level. I have lived in several countries and I like not being tied to one place. I cook one cuisine until I nail it, then pivot.',
    aboutPartner:
      'Location-flexible or at least curious about it. Can do long stretches solo without spiraling. Honest about whether you actually want travel or just the aesthetic.',
    aboutRelationship:
      'Maybe kids—flexible on timeline if the partnership is solid. Needs personal space after conflict—I will come back with notes. No drama policy on jealousy without evidence.',
  },
  {
    id: 'handmade_202604_15',
    name: 'Oren P.',
    aboutMe:
      'Organic CSA manager—dawn harvest Tuesdays, mud boots by the door, hands that smell like compost. Friday dinners with my extended family are non-negotiable. I build simple furniture from reclaimed barn wood when the season slows.',
    aboutPartner:
      'Okay with dirt under nails and early alarms in season. Family is everything level of showing up—not performative holidays, actual childcare for nephews when someone is sick.',
    aboutRelationship:
      'Wants a family with someone who means farm chaos and elders at the table. Closeness without losing individuality—I still need solo walks the orchard. Repair over blame when stress peaks at market.',
  },
  {
    id: 'handmade_202604_16',
    name: 'Dana C.',
    aboutMe:
      'On sabbatical from big tech—six months on trains, small repos, and learning pottery badly. Stable savings let me say no to grind mode for now. Slow mornings with bad coffee and long messages to friends abroad.',
    aboutPartner:
      'Curious about sabbatical headspace—not trying to “snap me back” to ambition theater. Comfortable with ambiguity; I am re-asking what I want including kids (open on kids timeline).',
    aboutRelationship:
      'Not rushing labels. Emotional literacy over vibes. When friction hits I want calm discussion, not escalation for sport.',
  },
  {
    id: 'handmade_202604_17',
    name: 'Michelle T.',
    aboutMe:
      'Immigration case worker. I take voice memos walking to court because my hands shake after hard hearings. I give to causes monthly—automatic transfers so I cannot negotiate with myself. Quiet evenings with soup and one show episode, not bars.',
    aboutPartner:
      'Politically grounded; kindness without savior complex. Respects emotional safety as something we build, not assume. Willing to split domestic labor without me running the checklist.',
    aboutRelationship:
      'Honest communication about capacity—sometimes I am full and it is not about you. Values alone time to recharge after heavy client weeks. Prefer repair over blame when we misattune.',
  },
  {
    id: 'handmade_202604_18',
    name: 'Yael K.',
    aboutMe:
      'Jazz bassist—gigs Thu-Sat, fingers taped, calluses in specific stripes. I transcribe solos on Sunday afternoons with coffee that went cold hours ago. Late nights are work, not partying; after shows I want food that is not ironic.',
    aboutPartner:
      'Does not need me at every gig but shows up sometimes with earplugs and zero complaints. Understands my sleep schedule is wrecked seasonally. Music taste can differ; respect cannot.',
    aboutRelationship:
      'Direct repair when jealousy or scheduling hurts—we name it same week. I am childfree; I need that to be explicit compatibility, not a debate topic.',
  },
  {
    id: 'handmade_202604_19',
    name: 'Amir W.',
    aboutMe:
      'Wind turbine technician—two weeks on sites in the Negev, one week home. Homebody rhythm when I am back: same takeout place, same walking loop with my dog. I am not a “travel as personality” person though I travel constantly for work.',
    aboutPartner:
      'Okay with rotational absence and dog hair. Values stability when I am home—no chaos tourism in my living room. Wants kids is a conversation I am ready for if logistics can work.',
    aboutRelationship:
      'Space after a fight before we debrief—I shut down if cornered. Talk it out once we are both fed. Traditional family structure appeals but only with emotional maturity attached.',
  },
  {
    id: 'handmade_202604_20',
    name: 'Hila R.',
    aboutMe:
      'Elementary art teacher—I teach fifth graders to mix glazes and not fear ugly first drafts. Education matters to me politically and personally. Weekends I volunteer at a community darkroom; silver stains on my cuffs are normal.',
    aboutPartner:
      'Patient with school-year energy dips. Values education in the broad sense—curiosity over credentials theater. Good with kids in my life professionally; wanting your own is negotiable but honesty is not.',
    aboutRelationship:
      'Clear communication about what we are building. I want emotional safety and playful rituals—Friday photowalks, not just Netflix. Open on kids timeline depending on partnership fit.',
  },
  {
    id: 'handmade_202604_21',
    name: 'Bar T.',
    aboutMe:
      'Narrative podcast editor—I listen to raw interviews at 1.25x and cut “ums” until the story breathes. I read longform scripts and transcripts more than novels lately. I host a monthly listening party with one speaker and floor cushions.',
    aboutPartner:
      'Audio-leaning or at least not allergic to headphones on walks. You can disagree with my taste without making it a referendum on my soul. Low drama; high specificity.',
    aboutRelationship:
      'Prefer repair over blame when edits become metaphors for us—yes that happened once. I need alone time to finish deep work without guilt. Maybe kids; need partner who understands creative schedules.',
  },
  {
    id: 'handmade_202604_22',
    name: 'Inbar S.',
    aboutMe:
      'Midwife—on-call clusters then two-day crashes. I want kids soon in my personal life while professionally I hold everyone else’s birth plans. I swim laps at 6am when off-call to get out of my head.',
    aboutPartner:
      'Not squeamish about birth talk. Emotionally steady—my job is intense and I cannot also be your therapist. Wants children aligned with a near-ish horizon.',
    aboutRelationship:
      'Talks issues through; I do not do subtext marathons. Emotional clarity on exclusivity early. Cool down after conflict then come back—my nervous system demands it.',
  },
  {
    id: 'handmade_202604_23',
    name: 'Roi B.',
    aboutMe:
      'Park ranger—dawn patrol, radio static, citation notebooks that smell like sunscreen. Early bird because the animals are. I meal-prep jerky and trail mix like a cliché because it is practical.',
    aboutPartner:
      'Likes dirt and early alarms occasionally. Respects rules that keep wild places wild—if you litter on a hike we are done. Independent but connected emotionally.',
    aboutRelationship:
      'Wants kids with someone who will camp before five-star. No games about exclusivity. Avoid drama—I see enough real emergencies at work.',
  },
  {
    id: 'handmade_202604_24',
    name: 'Stav M.',
    aboutMe:
      'Architectural model maker—balsa, laser cutter, tweezers until my eyes blur. I build furniture from plans I sketch on graph paper; sawdust in the hallway is a love language. Quiet at home: noise-canceling headphones and one lamp.',
    aboutPartner:
      'Okay with sharp tools and half-finished projects in the living room. Appreciates craft even if you do not share it. Not into performance couple branding online.',
    aboutRelationship:
      'Quality time over quantity: a real build session together beats seven distracted evenings. I value alone time to focus without being read as distant. Repair over blame when deadlines make me terse.',
  },
  {
    id: 'handmade_202604_25',
    name: 'Nadav I.',
    aboutMe:
      'Hospice social worker—notes in the car between visits, dark humor only with people who earn it. I give to causes supporting palliative access; it is not virtue signaling, it is the job leaking into budget. Evenings are quiet home and one slow meal.',
    aboutPartner:
      'Comfortable with mortality talk without making every date heavy. Emotionally literate—names feelings, does not perform depth. Authenticity over polish; I am not into performance in how we present as a couple.',
    aboutRelationship:
      'Emotional safety and honest communication about capacity—sometimes I am hollowed out and need grace. Want children maybe later; right now I need a partner who understands grief seasons. Prefer direct repair when we miss each other.',
  },
  {
    id: 'handmade_202604_26',
    name: 'Alon T.',
    aboutMe:
      'Replay operator for live sports broadcasts—frame-accurate cuts, headset chaos, and the weird calm of counting seconds until commercial. I work nights during season and flip to dead-quiet apartment mode off-season. I meal-prep shakshuka in one giant pan because I hate washing twice.',
    aboutPartner:
      'You do not need to care about sports; you need to care that my schedule is real. Childfree and not apologetic about it. If you need me to text back during a show truck build, we are incompatible.',
    aboutRelationship:
      'Labels without games: we say what we are. I need cooldown after conflict before I can hear feedback—cornering me mid-argument makes me go flat. Prefer repair over blame when the adrenaline drops.',
  },
  {
    id: 'handmade_202604_27',
    name: 'Roni L.',
    aboutMe:
      'Weekend mushroom foray guide; weekday lab tech doing spore prints and IDs for a small co-op. Slow mornings with tea and a dehydrator humming on the porch. I trade jars with neighbors; my fridge is half science experiment.',
    aboutPartner:
      'Curious about fungi or at least not phobic. Values alone time after social forays—I come back overstimulated and need quiet sorting time. Not into performance wellness culture; I like dirt under nails.',
    aboutRelationship:
      'Open on kids timeline if we ever leave city for land; not a prerequisite for loving each other now. Independent together: merge lives slowly. Talks issues through once I have showered the trail dust off.',
  },
  {
    id: 'handmade_202604_28',
    name: 'Dean M.',
    aboutMe:
      'Tandem paragliding instructor—dawn wind briefings, radio checks, and the ethics of saying no when conditions are pretty but unsafe. Very fast lifestyle on good weather days; on bad ones I am home by noon doing wing repairs in the garage.',
    aboutPartner:
      'Comfortable with risk literacy, not daredevil cosplay. I want kids in the next chapter if logistics stabilize; I need a partner who means that conversation. You respect when I ground students—and when I ground myself.',
    aboutRelationship:
      'Wants kids soon is directionally true once I reduce teaching load. Direct repair when jealousy or fear shows up; I do not do silent punishment. Quality over quantity for the days I am actually home.',
  },
  {
    id: 'handmade_202604_29',
    name: 'Shelly F.',
    aboutMe:
      'Freelance lexicographer—I read usage citations and corpus lines for dictionaries, not book-club novels. Color-coded spreadsheets of emerging slang; I argue about hyphenation at parties. One long walk daily with a voice memo app for stray entries.',
    aboutPartner:
      'Wordplay welcome; pedantry with kindness only. I value emotional maturity and clear communication when we disagree about… anything, including grammar. Not into performance intellect—curiosity beats showing off.',
    aboutRelationship:
      'Closeness without losing individuality: we can edit in parallel silence and call it intimacy. Childfree by choice—please be sure, not “maybe someday.” Prefer repair over blame when tone misreads happen.',
  },
  {
    id: 'handmade_202604_30',
    name: 'Orly S.',
    aboutMe:
      'Former dancer, now physio clinic aide—demonstrating stretches, sanitizing tables, learning names of every regular. Pickups revolve around my teenager’s rehearsal schedule; I am in bed by ten when I can. Meal prep is rotisserie chicken deconstructed three ways.',
    aboutPartner:
      'Patient with a coparenting calendar that is not optional. You do not have to co-parent my kid on day one but you have to respect the rhythm. Kind to service people; I notice.',
    aboutRelationship:
      'Already have kids context—I need emotional safety before anyone meets my teenager. Honest communication about pace. I need space after conflict; I come back ready to talk it out calmly.',
  },
];
