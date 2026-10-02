import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { slugify } from "../src/lib/slug";
import { seedBadges } from "../src/lib/badges";
import { AMENITIES } from "../src/lib/nepal";

/**
 * Development / demo seed data (REQUIREMENT.md §86).
 *
 * Every organisation, court and person below is fictional demo data. Nothing
 * here represents a real Nepalese business, address or individual.
 */

const DEMO_PASSWORD = "PickleNepal123";
const DATA_BANNER = "DEMO DATA — fictional clubs, coaches and players for local development.";

async function main() {
  console.log(DATA_BANNER);

  await prisma.analyticsEvent.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.sponsor.deleteMany({});
  await prisma.platformSettings.deleteMany({});
  await prisma.featureFlag.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.rateLimitEntry.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.marketplaceFavorite.deleteMany({});
  await prisma.savedItem.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.communityPost.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.verificationRequest.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.userBadge.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.matchResult.deleteMany({});
  await prisma.tournamentMatch.deleteMany({});
  await prisma.tournamentTeamMember.deleteMany({});
  await prisma.tournamentTeam.deleteMany({});
  await prisma.tournamentParticipant.deleteMany({});
  await prisma.tournamentCategory.deleteMany({});
  await prisma.tournament.deleteMany({});
  await prisma.eventParticipant.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.courtBooking.deleteMany({});
  await prisma.gameWaitlist.deleteMany({});
  await prisma.gameParticipant.deleteMany({});
  await prisma.game.deleteMany({});
  await prisma.courtAvailability.deleteMany({});
  await prisma.lessonRequest.deleteMany({});
  await prisma.coachProfile.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.clubMember.deleteMany({});
  await prisma.court.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.marketplaceListing.deleteMany({});
  await prisma.sellerProfile.deleteMany({});
  await prisma.playerProfile.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  await seedBadges();
  await seedFeatureFlags();
  await seedPlatformSettings();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Users ---------------------------------------------------------------
  type SeedUser = {
    key: string;
    fullName: string;
    username: string;
    email: string;
    phone: string;
    city: string;
    role?: "PLAYER" | "CLUB_ADMIN" | "COACH" | "ORGANIZER" | "SELLER" | "ADMIN" | "MODERATOR";
    skillLevel?: string;
    dupr?: number;
    formats?: string[];
    position?: string;
    availability?: string[];
    frequency?: string;
    bio?: string;
    visibility?: "PUBLIC" | "COMMUNITY_ONLY" | "PRIVATE";
    onboarded?: boolean;
  };

  const users: SeedUser[] = [
    {
      key: "admin",
      fullName: "Anisha Shrestha",
      username: "anisha",
      email: "admin@picklenepal.test",
      phone: "9800000001",
      city: "KATHMANDU",
      role: "ADMIN",
      onboarded: true,
      bio: "Community lead for PickleNepal. Demo account.",
    },
    {
      key: "moderator",
      fullName: "Bikash Tamang",
      username: "bikash",
      email: "moderator@picklenepal.test",
      phone: "9800000002",
      city: "KATHMANDU",
      role: "MODERATOR",
      skillLevel: "ADVANCED",
      formats: ["DOUBLES", "BOTH"],
      position: "EITHER",
      onboarded: true,
      bio: "Helps keep the feed friendly. Demo account.",
    },
    {
      key: "organizer",
      fullName: "Pratiksha Adhikari",
      username: "pratiksha",
      email: "organizer@picklenepal.test",
      phone: "9800000003",
      city: "KATHMANDU",
      role: "ORGANIZER",
      skillLevel: "COMPETITIVE",
      formats: ["DOUBLES"],
      position: "RIGHT",
      availability: ["MORNING", "EVENING"],
      onboarded: true,
      bio: "Runs community tournaments around the valley. Demo account.",
    },
    {
      key: "coach1",
      fullName: "Rajesh Maharjan",
      username: "rajesh",
      email: "coach@picklenepal.test",
      phone: "9800000004",
      city: "KATHMANDU",
      role: "COACH",
      skillLevel: "ADVANCED",
      formats: ["BOTH"],
      position: "EITHER",
      availability: ["EARLY_MORNING", "EVENING"],
      frequency: "THREE_TO_FOUR_WEEKLY",
      onboarded: true,
      bio: "Demo coach profile — 6 years playing, certified to teach beginners through advanced.",
    },
    {
      key: "coach2",
      fullName: "Sunita Rai",
      username: "sunita",
      email: "sunita@picklenepal.test",
      phone: "9800000005",
      city: "POKHARA",
      role: "COACH",
      skillLevel: "UPPER_INTERMEDIATE",
      formats: ["SINGLES", "DOUBLES"],
      position: "LEFT",
      availability: ["MORNING", "AFTERNOON"],
      onboarded: true,
      bio: "Demo coach profile based in Pokhara, focused on doubles strategy.",
    },
    {
      key: "seller",
      fullName: "Nirajan Karki",
      username: "nirajan",
      email: "seller@picklenepal.test",
      phone: "9800000006",
      city: "LALITPUR",
      role: "SELLER",
      onboarded: true,
      bio: "Demo seller profile for the marketplace.",
    },
    {
      key: "player1",
      fullName: "Aayush Karki",
      username: "aayush",
      email: "aayush@picklenepal.test",
      phone: "9800000011",
      city: "KATHMANDU",
      skillLevel: "UPPER_INTERMEDIATE",
      dupr: 3.85,
      formats: ["DOUBLES", "BOTH"],
      position: "RIGHT",
      availability: ["EVENING", "WEEKENDS"],
      frequency: "THREE_TO_FOUR_WEEKLY",
      onboarded: true,
      bio: "Weekend doubles player. Looking for regular partners in Lalitpur and Kathmandu.",
    },
    {
      key: "player2",
      fullName: "Manisha Gurung",
      username: "manisha",
      email: "manisha@picklenepal.test",
      phone: "9800000012",
      city: "KATHMANDU",
      skillLevel: "INTERMEDIATE",
      dupr: 3.32,
      formats: ["DOUBLES", "BOTH"],
      position: "LEFT",
      availability: ["MORNING", "EVENING"],
      frequency: "ONE_TO_TWO_WEEKLY",
      onboarded: true,
      bio: "Left-side player learning the serve. Always up for a friendly doubles game.",
    },
    {
      key: "player3",
      fullName: "Rohit Thapa",
      username: "rohit",
      email: "rohit@picklenepal.test",
      phone: "9800000013",
      city: "LALITPUR",
      skillLevel: "ADVANCED",
      dupr: 4.12,
      formats: ["SINGLES", "DOUBLES"],
      position: "RIGHT",
      availability: ["AFTERNOON", "EVENING", "WEEKENDS"],
      frequency: "FIVE_PLUS_WEEKLY",
      onboarded: true,
      bio: "Advanced competitive player. Open to practice partners and tournament entries.",
    },
    {
      key: "player4",
      fullName: "Sneha Lama",
      username: "sneha",
      email: "sneha@picklenepal.test",
      phone: "9800000014",
      city: "KATHMANDU",
      skillLevel: "BEGINNER",
      formats: ["BOTH"],
      position: "EITHER",
      availability: ["EVENING", "WEEKENDS"],
      frequency: "OCCASIONALLY",
      onboarded: true,
      bio: "New to pickleball in 2026. Here for beginner-friendly games and coaching.",
    },
    {
      key: "player5",
      fullName: "Deepak Sharma",
      username: "deepak",
      email: "deepak@picklenepal.test",
      phone: "9800000015",
      city: "POKHARA",
      skillLevel: "INTERMEDIATE",
      dupr: 3.45,
      formats: ["DOUBLES"],
      position: "EITHER",
      availability: ["MORNING", "AFTERNOON"],
      frequency: "THREE_TO_FOUR_WEEKLY",
      onboarded: true,
      bio: "Pokhara-based. Lakeside mornings are my favourite slot.",
    },
    {
      key: "player6",
      fullName: "Priyanka Joshi",
      username: "priyanka",
      email: "priyanka@picklenepal.test",
      phone: "9800000016",
      city: "BHAKTAPUR",
      skillLevel: "UPPER_INTERMEDIATE",
      dupr: 3.7,
      formats: ["SINGLES", "DOUBLES", "BOTH"],
      position: "RIGHT",
      availability: ["MORNING", "AFTERNOON", "EVENING"],
      frequency: "THREE_TO_FOUR_WEEKLY",
      onboarded: true,
      bio: "Plays across Bhaktapur and Kathmandu. Tournament competitor.",
    },
    {
      key: "player7",
      fullName: "Sujan Basnet",
      username: "sujan",
      email: "sujan@picklenepal.test",
      phone: "9800000017",
      city: "CHITWAN",
      skillLevel: "COMPLETE_BEGINNER",
      formats: ["BOTH"],
      position: "EITHER",
      availability: ["AFTERNOON", "WEEKENDS"],
      frequency: "OCCASIONALLY",
      onboarded: true,
      bio: "Just picked up a paddle. Looking for a friendly first games.",
    },
    {
      key: "player8",
      fullName: "Kabita Poudel",
      username: "kabita",
      email: "kabita@picklenepal.test",
      phone: "9800000018",
      city: "KATHMANDU",
      skillLevel: "COMPETITIVE",
      dupr: 4.35,
      formats: ["SINGLES"],
      position: "EITHER",
      availability: ["MORNING", "EVENING"],
      frequency: "FIVE_PLUS_WEEKLY",
      onboarded: true,
      bio: "Singles competitor. Chasing a national ranking.",
    },
    {
      key: "player9",
      fullName: "Arjun Bhattarai",
      username: "arjun",
      email: "arjun@picklenepal.test",
      phone: "9800000019",
      city: "BIRATNAGAR",
      skillLevel: "INTERMEDIATE",
      dupr: 3.21,
      formats: ["DOUBLES", "BOTH"],
      position: "LEFT",
      availability: ["EVENING"],
      frequency: "ONE_TO_TWO_WEEKLY",
      onboarded: true,
      bio: "Biratnagar local trying to build a local scene.",
    },
    {
      key: "player10",
      fullName: "Reshma Gurung",
      username: "reshma",
      email: "reshma@picklenepal.test",
      phone: "9800000020",
      city: "KATHMANDU",
      skillLevel: "INTERMEDIATE",
      formats: ["DOUBLES"],
      position: "RIGHT",
      availability: ["MORNING", "AFTERNOON"],
      frequency: "THREE_TO_FOUR_WEEKLY",
      bio: "Plays early before work. Demo profile.",
    },
    {
      key: "player11",
      fullName: "Nirmal Shakya",
      username: "nirmal",
      email: "nirmal@picklenepal.test",
      phone: "9800000021",
      city: "BUTWAL",
      skillLevel: "BEGINNER",
      formats: ["BOTH"],
      position: "EITHER",
      availability: ["EVENING", "WEEKENDS"],
      frequency: "OCCASIONALLY",
      onboarded: true,
      bio: "Butwal beginner, keen to meet other players.",
    },
    {
      key: "player12",
      fullName: "Anjali Dahal",
      username: "anjali",
      email: "anjali@picklenepal.test",
      phone: "9800000022",
      city: "DHARAN",
      skillLevel: "UPPER_INTERMEDIATE",
      dupr: 3.55,
      formats: ["DOUBLES", "BOTH"],
      position: "LEFT",
      availability: ["AFTERNOON", "EVENING"],
      frequency: "THREE_TO_FOUR_WEEKLY",
      onboarded: true,
      bio: "Dharan based, doubles-focused. Demo profile.",
    },
  ];

  const userIds = new Map<string, string>();

  for (const seed of users) {
    const user = await prisma.user.create({
      data: {
        fullName: seed.fullName,
        username: seed.username,
        email: seed.email,
        phone: seed.phone,
        passwordHash,
        city: seed.city as never,
        role: (seed.role ?? "PLAYER") as never,
        emailVerified: new Date(),
        isOnboarded: seed.onboarded ?? true,
        avatarUrl: null,
        referrerCode: `PN${seed.key.toUpperCase()}`,
        profile: {
          create: {
            bio: seed.bio,
            skillLevel: (seed.skillLevel as never) ?? null,
            duprRating: seed.dupr ?? null,
            preferredFormats: (seed.formats as never) ?? [],
            position: (seed.position as never) ?? null,
            availability: (seed.availability as never) ?? [],
            frequency: (seed.frequency as never) ?? null,
            visibility: (seed.visibility as never) ?? "PUBLIC",
            onboardingStep: 6,
          },
        },
        notificationPreference: { create: {} },
      },
      select: { id: true },
    });
    userIds.set(seed.key, user.id);
  }

  const id = (key: string) => {
    const value = userIds.get(key);
    if (!value) throw new Error(`Missing seeded user ${key}`);
    return value;
  };

  // --- Clubs ---------------------------------------------------------------
  type SeedClub = {
    key: string;
    name: string;
    slug: string;
    city: string;
    address: string;
    lat: number;
    lng: number;
    ownerKey: string;
    verified: boolean;
  };

  const clubs: SeedClub[] = [
    {
      key: "club1",
      name: "Demo Sports Hub",
      slug: "demo-sports-hub",
      city: "KATHMANDU",
      address: "Demo address, Kamal Pokhari (fictional)",
      lat: 27.7154,
      lng: 85.3123,
      ownerKey: "admin",
      verified: true,
    },
    {
      key: "club2",
      name: "Demo Valley Racquet Club",
      slug: "demo-valley-racquet-club",
      city: "LALITPUR",
      address: "Demo address, Jhamsikhel (fictional)",
      lat: 27.6695,
      lng: 85.3222,
      ownerKey: "admin",
      verified: true,
    },
    {
      key: "club3",
      name: "Demo Lakeside Pickleball",
      slug: "demo-lakeside-pickleball",
      city: "POKHARA",
      address: "Demo address, Lakeside (fictional)",
      lat: 28.2096,
      lng: 83.9571,
      ownerKey: "organizer",
      verified: false,
    },
    {
      key: "club4",
      name: "Demo Bhaktapur Community Club",
      slug: "demo-bhaktapur-community-club",
      city: "BHAKTAPUR",
      address: "Demo address, Bhaktapur (fictional)",
      lat: 27.671,
      lng: 85.4298,
      ownerKey: "moderator",
      verified: false,
    },
    {
      key: "club5",
      name: "Demo Chitwan Recreation Club",
      slug: "demo-chitwan-recreation-club",
      city: "CHITWAN",
      address: "Demo address, Bharatpur (fictional)",
      lat: 27.5291,
      lng: 84.3542,
      ownerKey: "coach1",
      verified: false,
    },
  ];

  const clubIds = new Map<string, string>();

  for (const seed of clubs) {
    const club = await prisma.club.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        description: `A fictional demo club used to exercise club management features locally. ${DATA_BANNER}`,
        city: seed.city as never,
        address: seed.address,
        latitude: seed.lat,
        longitude: seed.lng,
        phone: "9800000000",
        email: "demo@picklenepal.test",
        isVerified: seed.verified,
        verifiedAt: seed.verified ? new Date() : null,
        openingHours: { mon: "06:00-22:00", sat: "07:00-21:00" },
        ownerId: id(seed.ownerKey),
        members: {
          create: [
            { userId: id(seed.ownerKey), role: "OWNER" },
            ...(seed.key === "club1" ? [{ userId: id("coach1"), role: "COACH" as const }] : []),
          ],
        },
      },
      select: { id: true },
    });
    clubIds.set(seed.key, club.id);
  }

  function clubIdFor(key: string): string {
    const value = clubIds.get(key);
    if (!value) throw new Error(`Missing seeded club ${key}`);
    return value;
  }

  // --- Courts --------------------------------------------------------------
  type SeedCourt = {
    key: string;
    clubKey: string;
    name: string;
    slug: string;
    city: string;
    address: string;
    lat: number;
    lng: number;
    indoor: boolean;
    lighting: boolean;
    price: number;
    amenities: string[];
    surfaces: string[];
  };

  const courts: SeedCourt[] = [
    {
      key: "court1",
      clubKey: "club1",
      name: "Demo Sports Hub — Court 1",
      slug: "demo-sports-hub-court-1",
      city: "KATHMANDU",
      address: "Demo address, Kamal Pokhari (fictional)",
      lat: 27.7154,
      lng: 85.3123,
      indoor: true,
      lighting: true,
      price: 1200,
      amenities: ["Parking", "Washroom", "Changing room", "Drinking water", "Cafe", "Lighting", "Spectator area", "Equipment rental"],
      surfaces: ["ACRYLIC"],
    },
    {
      key: "court2",
      clubKey: "club1",
      name: "Demo Sports Hub — Court 2",
      slug: "demo-sports-hub-court-2",
      city: "KATHMANDU",
      address: "Demo address, Kamal Pokhari (fictional)",
      lat: 27.7158,
      lng: 85.3131,
      indoor: true,
      lighting: true,
      price: 1200,
      amenities: ["Parking", "Washroom", "Drinking water", "Lighting", "Equipment rental"],
      surfaces: ["ACRYLIC"],
    },
    {
      key: "court3",
      clubKey: "club2",
      name: "Demo Valley Racquet Club — Main Court",
      slug: "demo-valley-racquet-club-main",
      city: "LALITPUR",
      address: "Demo address, Jhamsikhel (fictional)",
      lat: 27.6695,
      lng: 85.3222,
      indoor: false,
      lighting: true,
      price: 800,
      amenities: ["Parking", "Washroom", "Drinking water", "Lighting", "Spectator area"],
      surfaces: ["CONCRETE"],
    },
    {
      key: "court4",
      clubKey: "club2",
      name: "Demo Valley Racquet Club — Court 2",
      slug: "demo-valley-racquet-club-court-2",
      city: "LALITPUR",
      address: "Demo address, Jhamsikhel (fictional)",
      lat: 27.6701,
      lng: 85.3229,
      indoor: false,
      lighting: false,
      price: 600,
      amenities: ["Parking", "Washroom"],
      surfaces: ["ASPHALT"],
    },
    {
      key: "court5",
      clubKey: "club3",
      name: "Demo Lakeside Courts",
      slug: "demo-lakeside-courts",
      city: "POKHARA",
      address: "Demo address, Lakeside (fictional)",
      lat: 28.2096,
      lng: 83.9571,
      indoor: false,
      lighting: true,
      price: 700,
      amenities: ["Parking", "Washroom", "Changing room", "Drinking water", "Cafe"],
      surfaces: ["CONCRETE"],
    },
    {
      key: "court6",
      clubKey: "club4",
      name: "Demo Bhaktapur Community Courts",
      slug: "demo-bhaktapur-community-courts",
      city: "BHAKTAPUR",
      address: "Demo address, Bhaktapur (fictional)",
      lat: 27.671,
      lng: 85.4298,
      indoor: false,
      lighting: false,
      price: 500,
      amenities: ["Parking", "Drinking water"],
      surfaces: ["CONCRETE"],
    },
    {
      key: "court7",
      clubKey: "club5",
      name: "Demo Chitwan Recreation Courts",
      slug: "demo-chitwan-recreation-courts",
      city: "CHITWAN",
      address: "Demo address, Bharatpur (fictional)",
      lat: 27.5291,
      lng: 84.3542,
      indoor: true,
      lighting: true,
      price: 900,
      amenities: ["Parking", "Washroom", "Changing room", "Cafe", "Lighting"],
      surfaces: ["ACRYLIC"],
    },
    {
      key: "court8",
      clubKey: null as unknown as string,
      name: "Demo Budhanilkantha Public Courts",
      slug: "demo-budhanilkantha-public-courts",
      city: "KATHMANDU",
      address: "Demo address, Budhanilkantha (fictional)",
      lat: 27.7295,
      lng: 85.3395,
      indoor: false,
      lighting: false,
      price: 400,
      amenities: ["Drinking water", "Parking"],
      surfaces: ["CONCRETE"],
    },
  ];

  const courtIds = new Map<string, string>();

  for (const seed of courts) {
    const court = await prisma.court.create({
      data: {
        slug: seed.slug,
        name: `${seed.name}`,
        description:
          "This is a fictional demo court created for local development. Hours, amenities and contact details are placeholders.",
        city: seed.city as never,
        address: seed.address,
        latitude: seed.lat,
        longitude: seed.lng,
        indoorOutdoor: seed.indoor ? "INDOOR" : "OUTDOOR",
        surface: (seed.surfaces[0] as never) ?? "CONCRETE",
        hasLighting: seed.lighting,
        amenities: seed.amenities.filter((a) => (AMENITIES as readonly string[]).includes(a)),
        numberOfCourts: 1,
        openingHours: { mon: "06:00-22:00", tue: "06:00-22:00", wed: "06:00-22:00", thu: "06:00-22:00", fri: "06:00-22:00", sat: "07:00-21:00", sun: "07:00-21:00" },
        pricePerHour: seed.price,
        paddleRentalPrice: 200,
        ballRentalPrice: 100,
        equipmentRental: seed.amenities.includes("Equipment rental"),
        clubId: seed.clubKey ? clubIdFor(seed.clubKey) : null,
      },
      select: { id: true },
    });
    courtIds.set(seed.key, court.id);

    // Standard opening hours for booking conflict checks.
    for (let day = 0; day < 7; day += 1) {
      await prisma.courtAvailability.create({
        data: {
          courtId: court.id,
          dayOfWeek: day,
          opensAt: day === 0 || day === 6 ? "07:00" : "06:00",
          closesAt: day === 0 || day === 6 ? "21:00" : "22:00",
          isClosed: false,
        },
      });
    }
  }

  const courtId = (key: string) => {
    const value = courtIds.get(key);
    if (!value) throw new Error(`Missing seeded court ${key}`);
    return value;
  };

  // --- Coaches -------------------------------------------------------------
  const coach1 = await prisma.coachProfile.create({
    data: {
      slug: "rajesh-maharjan",
      userId: id("coach1"),
      bio: "Demo coach profile. Six years of pickleball, teaching beginners through advanced doubles strategy.",
      experienceYears: 6,
      city: "KATHMANDU",
      latitude: 27.7154,
      longitude: 85.3123,
      skillLevelsTaught: ["COMPLETE_BEGINNER", "BEGINNER", "INTERMEDIATE", "UPPER_INTERMEDIATE"],
      availability: ["EARLY_MORNING", "EVENING"],
      pricePerSession: 2500,
      isVerified: true,
      verifiedAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.coachProfile.create({
    data: {
      slug: "sunita-rai",
      userId: id("coach2"),
      bio: "Demo coach profile based in Pokhara. Focus on doubles positioning and shot selection.",
      experienceYears: 4,
      city: "POKHARA",
      latitude: 28.2096,
      longitude: 83.9571,
      skillLevelsTaught: ["BEGINNER", "INTERMEDIATE", "UPPER_INTERMEDIATE"],
      availability: ["MORNING", "AFTERNOON"],
      pricePerSession: 1800,
      isVerified: false,
    },
    select: { id: true },
  });

  // --- Games ---------------------------------------------------------------
  const now = new Date();
  const at = (dayOffset: number, hour: number, durationHours = 2) => {
    const base = new Date(now);
    base.setUTCDate(base.getUTCDate() + dayOffset);
    base.setUTCHours(hour - 5, 45, 0, 0);
    const start = base;
    const end = new Date(start.getTime() + durationHours * 3600_000);
    return { start, end };
  };

  type SeedGame = {
    key: string;
    title: string;
    type: string;
    format: string;
    skill: string;
    openToAll?: boolean;
    courtKey: string;
    creatorKey: string;
    dayOffset: number;
    hour: number;
    capacity: number;
    price?: number;
    description: string;
    joinerKeys: string[];
    waitlistKeys?: string[];
  };

  const seedGames: SeedGame[] = [
    {
      key: "g1",
      title: "Tuesday evening doubles — all welcome",
      type: "DOUBLES",
      format: "DOUBLES",
      skill: "INTERMEDIATE",
      courtKey: "court1",
      creatorKey: "player1",
      dayOffset: 1,
      hour: 18,
      capacity: 4,
      description: "Casual rotating doubles. Bring water and a paddle if you have one.",
      joinerKeys: ["player2", "player3"],
    },
    {
      key: "g2",
      title: "Beginner friendly open play",
      type: "OPEN_PLAY",
      format: "BOTH",
      skill: "COMPLETE_BEGINNER",
      openToAll: true,
      courtKey: "court8",
      creatorKey: "player4",
      dayOffset: 0,
      hour: 17,
      capacity: 8,
      description: "No experience needed. A patient host will explain the basics.",
      joinerKeys: ["player7", "player11"],
    },
    {
      key: "g3",
      title: "Competitive doubles — advanced",
      type: "COMPETITIVE",
      format: "DOUBLES",
      skill: "ADVANCED",
      courtKey: "court3",
      creatorKey: "player3",
      dayOffset: 2,
      hour: 7,
      capacity: 4,
      price: 800,
      description: "Serious practice. Winners stay on.",
      joinerKeys: ["player8", "player6"],
    },
    {
      key: "g4",
      title: "Singles ladder practice",
      type: "SINGLES",
      format: "SINGLES",
      skill: "UPPER_INTERMEDIATE",
      courtKey: "court2",
      creatorKey: "player8",
      dayOffset: 3,
      hour: 6,
      capacity: 2,
      description: "Two players, focused serving and return practice.",
      joinerKeys: ["player1"],
    },
    {
      key: "g5",
      title: "Morning drills with a coach",
      type: "DRILL_SESSION",
      format: "BOTH",
      skill: "BEGINNER",
      courtKey: "court5",
      creatorKey: "coach1",
      dayOffset: 4,
      hour: 8,
      capacity: 6,
      price: 500,
      description: "Footwork, serving and dinking drills. Paddles available to rent.",
      joinerKeys: ["player5", "player10"],
    },
    {
      key: "g6",
      title: "Weekend morning doubles",
      type: "FRIENDLY",
      format: "DOUBLES",
      skill: "UPPER_INTERMEDIATE",
      courtKey: "court4",
      creatorKey: "player3",
      dayOffset: 5,
      hour: 9,
      capacity: 4,
      description: "Relaxed weekend doubles before the day gets busy.",
      joinerKeys: ["player1", "player6"],
    },
    {
      key: "g7",
      title: "King of the court — full bracket",
      type: "KING_OF_COURT",
      format: "DOUBLES",
      skill: "INTERMEDIATE",
      courtKey: "court6",
      creatorKey: "player6",
      dayOffset: 6,
      hour: 15,
      capacity: 4,
      description: "Four players, rotating winners.",
      joinerKeys: ["player4", "player3", "player8"],
      waitlistKeys: ["player10"],
    },
    {
      key: "g8",
      title: "Lalitpur indoor doubles (paid court)",
      type: "DOUBLES",
      format: "DOUBLES",
      skill: "INTERMEDIATE",
      courtKey: "court2",
      creatorKey: "player10",
      dayOffset: 2,
      hour: 19,
      capacity: 4,
      price: 1200,
      description: "Indoor court rental split four ways.",
      joinerKeys: ["player2"],
    },
    {
      key: "g9",
      title: "Early risers singles",
      type: "SINGLES",
      format: "SINGLES",
      skill: "ADVANCED",
      courtKey: "court7",
      creatorKey: "player8",
      dayOffset: 3,
      hour: 6,
      capacity: 2,
      price: 900,
      description: "Competitive singles in Chitwan.",
      joinerKeys: [],
    },
  ];

  const gameIds = new Map<string, string>();

  for (const seed of seedGames) {
    const { start, end } = at(seed.dayOffset, seed.hour);
    const game = await prisma.game.create({
      data: {
        title: seed.title,
        description: seed.description,
        type: seed.type as never,
        format: seed.format as never,
        skillLevel: seed.skill as never,
        skillOpenToAll: seed.openToAll ?? false,
        startsAt: start,
        endsAt: end,
        capacity: seed.capacity,
        city: courts.find((c) => c.key === seed.courtKey)!.city as never,
        pricePerPerson: seed.price ?? null,
        isFree: !seed.price,
        status: "OPEN",
        courtId: courtId(seed.courtKey),
        creatorId: id(seed.creatorKey),
        ballInfo: "Demo balls provided",
        equipmentInfo: "Bring your own paddle or rent one at the court",
        participants: {
          create: [
            { userId: id(seed.creatorKey), role: "CREATOR" },
            ...seed.joinerKeys.map((key) => ({ userId: id(key), role: "PLAYER" as const })),
          ],
        },
      },
      select: { id: true, capacity: true },
    });
    gameIds.set(seed.key, game.id);

    if (seed.waitlistKeys) {
      let position = 1;
      for (const key of seed.waitlistKeys) {
        await prisma.gameWaitlist.create({
          data: { gameId: game.id, userId: id(key), position, status: "WAITING" },
        });
        position += 1;
      }
    }

    // Mark games whose capacity is now met as FULL.
    const total = 1 + seed.joinerKeys.length;
    if (total >= game.capacity) {
      await prisma.game.update({ where: { id: game.id }, data: { status: "FULL" } });
    }
  }

  // --- Historical games + match results (drives stats & rankings) --------
  const historicalPlayers = ["player1", "player2", "player3", "player6", "player8", "player6", "player5"];
  let resultCounter = 0;
  for (let i = 0; i < 24; i += 1) {
    const a = historicalPlayers[i % historicalPlayers.length];
    const b = historicalPlayers[(i + 3) % historicalPlayers.length];
    if (a === b) continue;
    const { start, end } = at(-((i % 20) + 2), 18);
    const game = await prisma.game.create({
      data: {
        title: `Completed game #${i + 1}`,
        type: i % 3 === 0 ? "SINGLES" : "DOUBLES",
        format: i % 3 === 0 ? "SINGLES" : "DOUBLES",
        skillLevel: "INTERMEDIATE",
        startsAt: start,
        endsAt: end,
        capacity: 4,
        city: "KATHMANDU" as never,
        status: "COMPLETED",
        completedAt: end,
        courtId: courtId(i % 2 === 0 ? "court1" : "court3"),
        creatorId: id(a),
        participants: {
          create: [
            { userId: id(a), role: "CREATOR" },
            { userId: id(b), role: "PLAYER" },
          ],
        },
      },
      select: { id: true },
    });

    const aWins = resultCounter % 2 === 0;
    await prisma.matchResult.createMany({
      data: [
        {
          gameId: game.id,
          playerId: id(a),
          opponentId: id(b),
          scoreFor: aWins ? 11 : 7,
          scoreAgainst: aWins ? 7 : 11,
          isWin: aWins,
          playedAt: end,
        },
        {
          gameId: game.id,
          playerId: id(b),
          opponentId: id(a),
          scoreFor: aWins ? 7 : 11,
          scoreAgainst: aWins ? 11 : 7,
          isWin: !aWins,
          playedAt: end,
        },
      ],
    });
    resultCounter += 1;
  }

  // Recompute cached player counters from the recorded results.
  for (const key of historicalPlayers) {
    await recomputeStats(id(key));
  }
  for (const key of ["player4", "player10", "player7", "player11", "player12", "player9"]) {
    await recomputeStats(id(key));
  }

  // --- Events --------------------------------------------------------------
  const event1 = await prisma.event.create({
    data: {
      slug: "demo-social-night-thulopatan",
      title: "Demo Social Night — Thulopatan",
      description:
        "A relaxed evening of rotating doubles at a demo court. Demo event for local development.",
      type: "SOCIAL_NIGHT",
      city: "KATHMANDU",
      venue: "Demo Sports Hub (fictional)",
      latitude: 27.7154,
      longitude: 85.3123,
      startsAt: at(7, 19).start,
      endsAt: at(7, 21).end,
      capacity: 24,
      cost: 500,
      organizerId: id("organizer"),
      courtId: courtId("court1"),
      clubId: clubIdFor("club1"),
      participants: { create: [{ userId: id("player1") }, { userId: id("player2") }, { userId: id("player4") }] },
    },
    select: { id: true },
  });

  await prisma.event.create({
    data: {
      slug: "demo-beginner-clinic",
      title: "Demo Beginner Clinic",
      description: "Two-hour intro clinic with a demo coach. Bring indoor shoes.",
      type: "COACHING_SESSION",
      city: "LALITPUR",
      venue: "Demo Valley Racquet Club (fictional)",
      startsAt: at(9, 8).start,
      endsAt: at(9, 10).end,
      capacity: 12,
      cost: 800,
      organizerId: id("coach1"),
      courtId: courtId("court3"),
      participants: { create: [{ userId: id("player7") }] },
    },
  });

  await prisma.event.create({
    data: {
      slug: "demo-pokhara-meetup",
      title: "Demo Pokhara Players Meetup",
      description: "Casual meetup to introduce PickleNepal to Pokhara players.",
      type: "MEETUP",
      city: "POKHARA",
      venue: "Demo Lakeside Courts (fictional)",
      startsAt: at(12, 7).start,
      endsAt: at(12, 9).end,
      capacity: 30,
      cost: null,
      organizerId: id("organizer"),
      courtId: courtId("court5"),
      participants: { create: [{ userId: id("player5") }, { userId: id("coach2") }] },
    },
  });

  void event1;

  // --- Tournaments ---------------------------------------------------------
  const tournament = await prisma.tournament.create({
    data: {
      slug: "demo-valley-open-2026",
      name: "Demo Valley Open 2026",
      description:
        "A fictional demo tournament used to exercise registration, brackets and standings in local development.",
      rules:
        "1. Matches are best of three games to 11.\n2. Win by 2 points.\n3. Players must check in 30 minutes before their first match.\n4. Decisions by the organiser are final.",
      city: "KATHMANDU",
      venue: "Demo Sports Hub (fictional)",
      latitude: 27.7154,
      longitude: 85.3123,
      startsAt: at(20, 9).start,
      endsAt: at(21, 18).end,
      registrationDeadline: at(14, 23, 1).end,
      entryFee: 1500,
      prizeInfo: "Winner NPR 15,000 · Runner-up NPR 8,000 · Semifinalists NPR 3,000 each",
      contactInfo: "demo-organizer@picklenepal.test",
      format: "SINGLE_ELIMINATION",
      status: "REGISTRATION_OPEN",
      maxParticipants: 32,
      organizerId: id("organizer"),
      courtId: courtId("court1"),
      categories: {
        create: [
          { name: "Men's Singles", format: "SINGLES", maxEntries: 16 },
          { name: "Women's Singles", format: "SINGLES", maxEntries: 16 },
          { name: "Men's Doubles", format: "DOUBLES", maxEntries: 16 },
          { name: "Mixed Doubles", format: "DOUBLES", maxEntries: 16 },
        ],
      },
    },
    include: { categories: true },
  });

  const cat = (name: string) => tournament.categories.find((c) => c.name === name)!;

  const registrations: Array<{ userKey: string; category: string }> = [
    { userKey: "player8", category: "Women's Singles" },
    { userKey: "player6", category: "Women's Singles" },
    { userKey: "player1", category: "Men's Doubles" },
    { userKey: "player3", category: "Men's Doubles" },
  ];

  for (const registration of registrations) {
    const category = cat(registration.category);
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: tournament.id,
        categoryId: category.id,
        userId: id(registration.userKey),
        status: "REGISTERED",
        paidAt: tournament.entryFee > 0 ? new Date() : null,
      },
      select: { id: true },
    });
    void participant;
  }

  // Doubles team entity for the Men's Doubles pair (§29).
  const mensDoubles = cat("Men's Doubles");
  const existingDoubles = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: tournament.id, categoryId: mensDoubles.id },
    select: { userId: true },
  });
  if (existingDoubles.length === 2) {
    const team = await prisma.tournamentTeam.create({
      data: {
        tournamentId: tournament.id,
        categoryId: mensDoubles.id,
        name: "Demo Pair",
        createdById: existingDoubles[0].userId,
        members: {
          create: existingDoubles.map((p, index) => ({ playerId: p.userId, position: index + 1 })),
        },
      },
      select: { id: true },
    });

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        categoryId: mensDoubles.id,
        round: 1,
        position: 1,
        teamAId: team.id,
        status: "SCHEDULED",
        scheduledAt: tournament.startsAt,
      },
    });
  }

  await prisma.tournament.create({
    data: {
      slug: "demo-pokhara-cup-2026",
      name: "Demo Pokhara Cup 2026",
      description: "A second fictional demo tournament, currently open for registration.",
      rules: "Round robin. All matches to 15 points.",
      city: "POKHARA",
      venue: "Demo Lakeside Courts (fictional)",
      startsAt: at(35, 9).start,
      endsAt: at(35, 17).end,
      registrationDeadline: at(30, 23, 1).end,
      entryFee: 1000,
      format: "ROUND_ROBIN",
      status: "UPCOMING",
      maxParticipants: 24,
      organizerId: id("organizer"),
      courtId: courtId("court5"),
      categories: {
        create: [
          { name: "Open Singles", format: "SINGLES", maxEntries: 24 },
          { name: "Open Doubles", format: "DOUBLES", maxEntries: 24 },
        ],
      },
    },
  });

  // --- Community posts -----------------------------------------------------
  const posts = [
    {
      authorKey: "organizer",
      type: "ANNOUNCEMENT",
      content:
        "Demo announcement: registration for the Demo Valley Open 2026 is now open. This is fictional seed content for local development.",
    },
    {
      authorKey: "player4",
      type: "LOOKING_FOR_PLAYERS",
      content:
        "Looking for two more players for a relaxed beginner doubles game this week in Kathmandu. I am still learning the serve, so no pressure. Comment if you are free.",
    },
    {
      authorKey: "player3",
      type: "GEAR",
      content:
        "Bought a demo paddle I do not need anymore — will list it on the marketplace shortly. Sharing here first so local players get first refusal.",
    },
    {
      authorKey: "coach1",
      type: "COACHING",
      content:
        "Demo coaching post: the biggest beginner improvement is dinking consistency, not power. Bring a ball and a friend to the next clinic.",
    },
    {
      authorKey: "player6",
      type: "COURT",
      content:
        "The demo courts in Bhaktapur are in good shape this week. Lighting only runs until 8pm, so plan accordingly.",
    },
  ];

  const postIds: string[] = [];
  for (const post of posts) {
    const created = await prisma.communityPost.create({
      data: {
        content: post.content,
        type: post.type as never,
        authorId: id(post.authorKey),
      },
      select: { id: true },
    });
    postIds.push(created.id);
  }

  const firstPost = postIds[1];
  await prisma.comment.create({
    data: {
      content: "I am free on Thursday evenings — happy to join.",
      postId: firstPost,
      authorId: id("player1"),
      replies: {
        create: [{ content: "Great, I will add you.", postId: firstPost, authorId: id("player4") }],
      },
    },
  });

  await prisma.like.createMany({
    data: [
      { postId: firstPost, userId: id("player1") },
      { postId: firstPost, userId: id("player3") },
      { postId: postIds[0], userId: id("player2") },
      { postId: postIds[0], userId: id("player8") },
      { postId: postIds[2], userId: id("seller") },
    ],
  });

  // --- Follows -------------------------------------------------------------
  await prisma.follow.createMany({
    data: [
      // player3 -> player6 and player1 -> player3 overlap in meaning; use skipDuplicates
      // so re-running individual inserts cannot trip the (followerId, followingId) unique index.
      { followerId: id("player1"), followingId: id("player3") },
      { followerId: id("player1"), followingId: id("player6") },
      { followerId: id("player1"), followingId: id("player3") },
      { followerId: id("player2"), followingId: id("player1") },
      { followerId: id("player4"), followingId: id("player1") },
      { followerId: id("player3"), followingId: id("player1") },
      { followerId: id("player8"), followingId: id("player6") },
      { followerId: id("player1"), followingId: id("player8") },
      { followerId: id("player3"), followingId: id("coach1") },
      { followerId: id("player5"), followingId: id("coach2") },
    ],
    skipDuplicates: true,
  });

  // --- Reviews -------------------------------------------------------------
  await prisma.review.createMany({
    data: [
      {
        reviewerId: id("player1"),
        subjectType: "COURT",
        courtId: courtId("court1"),
        rating: 5,
        comment: "Demo review: clean indoor surface, good lighting, easy to book.",
        facilities: 5,
        courtQuality: 5,
        staffRating: 4,
        valueRating: 4,
        verified: true,
      },
      {
        reviewerId: id("player2"),
        subjectType: "COURT",
        courtId: courtId("court1"),
        rating: 4,
        comment: "Demo review: busy after 6pm, otherwise a great surface.",
        facilities: 4,
        courtQuality: 5,
        staffRating: 4,
        valueRating: 3,
      },
      {
        reviewerId: id("player3"),
        subjectType: "COURT",
        courtId: courtId("court3"),
        rating: 4,
        comment: "Demo review: great outdoor courts, bring your own lighting tolerance.",
      },
      {
        reviewerId: id("player4"),
        subjectType: "COACH",
        coachId: coach1.id,
        rating: 5,
        comment: "Demo review: patient explanations and genuinely helpful drills.",
        verified: true,
      },
      {
        reviewerId: id("player6"),
        subjectType: "COACH",
        coachId: coach1.id,
        rating: 5,
        comment: "Demo review: improved my serve in three sessions.",
        verified: true,
      },
      {
        reviewerId: id("player7"),
        subjectType: "CLUB",
        rating: 4,
        comment: "Demo review: welcoming club, will be back.",
      },
    ],
  });

  // --- Marketplace ---------------------------------------------------------
  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: id("seller"),
      businessName: "Demo Gear Traders",
      description: "Demo seller profile for local development. Not a real business.",
      city: "LALITPUR",
      phone: "9800000006",
      isVerified: true,
      verifiedAt: new Date(),
    },
    select: { userId: true },
  });

  const listings = [
    {
      title: "Demo paddle — unused, indoor use only",
      description:
        "A demo listing seeded for local development. Lightweight composite paddle, never used outdoors.",
      price: 4500,
      category: "PADDLES",
      condition: "NEW",
      city: "LALITPUR",
    },
    {
      title: "Demo ball bag — 12 balls",
      description: "Demo listing: a bag of practice balls, well used but in good shape.",
      price: 2200,
      category: "BALLS",
      condition: "GOOD",
      city: "KATHMANDU",
    },
    {
      title: "Demo court shoes — size 42",
      description: "Demo listing: indoor court shoes with good grip, used for a few months.",
      price: 3800,
      category: "SHOES",
      condition: "GOOD",
      city: "POKHARA",
    },
    {
      title: "Demo pickleball bag — waterproof",
      description: "Demo listing: padded bag with room for four paddles and a ball tube.",
      price: 3000,
      category: "BAGS",
      condition: "LIKE_NEW",
      city: "KATHMANDU",
    },
    {
      title: "Demo team apparel — two shirts",
      description: "Demo listing: two matching team shirts, size M and L.",
      price: 1500,
      category: "CLOTHING",
      condition: "LIKE_NEW",
      city: "BHAKTAPUR",
    },
  ];

  for (const listing of listings) {
    await prisma.marketplaceListing.create({
      data: {
        slug: slugify(listing.title),
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category as never,
        condition: listing.condition as never,
        city: listing.city as never,
        sellerId: sellerProfile.userId,
        isNegotiable: true,
      },
    });
  }

  // --- Notifications, conversation, sponsors, verification ---------------
  await prisma.notification.create({
    data: {
      userId: id("player1"),
      type: "GAME_JOINED",
      category: "GAME",
      title: "Rohit joined your game",
      body: "Rohit Thapa joined \"Weekend morning doubles\".",
      data: { gameId: gameIds.get("g6") },
    },
  });

  await prisma.conversation.create({
    data: {
      lastMessageAt: new Date(Date.now() - 3600_000),
      participants: {
        create: [
          { userId: id("player1"), unreadCount: 1, lastReadAt: new Date(Date.now() - 7200_000) },
          { userId: id("player3"), unreadCount: 0 },
        ],
      },
      messages: {
        create: [
          {
            content: "Are you up for the Thursday morning singles session?",
            senderId: id("player3"),
            createdAt: new Date(Date.now() - 7200_000),
          },
          {
            content: "Yes — I will be there at 6:30.",
            senderId: id("player1"),
            createdAt: new Date(Date.now() - 5400_000),
          },
          {
            content: "Great, I will book the court. See you there.",
            senderId: id("player3"),
            createdAt: new Date(Date.now() - 3600_000),
          },
        ],
      },
    },
  });

  await prisma.sponsor.createMany({
    data: [
      {
        name: "Demo Sportswear Co.",
        campaign: "Community kit drive",
        description: "Fictional demo sponsor for local development.",
        website: "https://example.com/demo-sponsor",
        placement: "HOMEPAGE",
        isActive: false,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 86400_000),
      },
    ],
  });

  await prisma.verificationRequest.createMany({
    data: [
      {
        applicantId: id("seller"),
        type: "SELLER",
        status: "APPROVED",
        name: "Nirajan Karki",
        organization: "Demo Gear Traders",
        description: "Demo verification request seeded for local development.",
        reviewerId: id("admin"),
        decidedAt: new Date(),
      },
      {
        applicantId: id("coach2"),
        type: "COACH",
        status: "PENDING",
        name: "Sunita Rai",
        description: "Demo verification request awaiting review in the admin dashboard.",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      adminId: id("admin"),
      action: "SELLER_VERIFIED",
      targetType: "USER",
      targetId: id("seller"),
      reason: "Demo seed record",
      metadata: { note: DATA_BANNER },
    },
  });

  await prisma.analyticsEvent.createMany({
    data: [
      { name: "SIGNUP", userId: id("player1"), createdAt: new Date(Date.now() - 30 * 86400_000) },
      { name: "SIGNUP", userId: id("player2"), createdAt: new Date(Date.now() - 20 * 86400_000) },
      { name: "SIGNUP", userId: id("player3"), createdAt: new Date(Date.now() - 10 * 86400_000) },
      { name: "GAME_CREATED", userId: id("player1"), createdAt: new Date(Date.now() - 5 * 86400_000) },
      { name: "GAME_JOINED", userId: id("player2"), createdAt: new Date(Date.now() - 4 * 86400_000) },
    ],
  });

  console.log("");
  console.log("Seed complete.");
  console.log(`  Users:      ${await prisma.user.count()}`);
  console.log(`  Clubs:      ${await prisma.club.count()}`);
  console.log(`  Courts:     ${await prisma.court.count()}`);
  console.log(`  Games:      ${await prisma.game.count()}`);
  console.log(`  Events:     ${await prisma.event.count()}`);
  console.log(`  Tournaments:${await prisma.tournament.count()}`);
  console.log(`  Posts:      ${await prisma.communityPost.count()}`);
  console.log("");
  console.log("Demo accounts (password: PickleNepal123):");
  console.log("  Admin      admin@picklenepal.test");
  console.log("  Moderator  moderator@picklenepal.test");
  console.log("  Organizer  organizer@picklenepal.test");
  console.log("  Player     aayush@picklenepal.test");
  console.log("  Coach      coach@picklenepal.test");
  console.log("");
  void slugify;
}

async function recomputeStats(userId: string): Promise<void> {
  const [results, gamesCreated, gamesJoined, tournaments, wins, events] = await Promise.all([
    prisma.matchResult.findMany({ where: { playerId: userId }, select: { isWin: true } }),
    prisma.game.count({ where: { creatorId: userId } }),
    prisma.gameParticipant.count({ where: { userId } }),
    prisma.tournamentParticipant.count({ where: { userId } }),
    prisma.tournamentMatch.count({ where: { winnerId: userId, status: "COMPLETED" } }),
    prisma.eventParticipant.count({ where: { userId } }),
  ]);

  const played = results.length;
  const won = results.filter((r) => r.isWin).length;
  const points = played * 10 + won * 5 + gamesCreated * 8 + tournaments * 15 + wins * 40 + events * 3;

  await prisma.playerProfile.update({
    where: { userId },
    data: {
      gamesPlayed: played,
      gamesWon: won,
      gamesLost: played - won,
      gamesCreated,
      gamesJoined: gamesJoined,
      tournamentsPlayed: tournaments,
      tournamentWins: wins,
      eventsAttended: events,
      points,
    },
  });
}

async function seedFeatureFlags(): Promise<void> {
  const defaults: Array<[string, boolean, string]> = [
    ["BOOKINGS", false, "Court booking flows"],
    ["PAYMENTS", false, "Payment provider integration"],
    ["MARKETPLACE", true, "Classified marketplace"],
    ["PREMIUM", false, "Premium memberships"],
    ["MESSAGING", true, "Private messaging"],
    ["PUSH_NOTIFICATIONS", false, "Web push notifications"],
    ["DUPR_INTEGRATION", false, "Official DUPR integration (not implemented)"],
    ["SPONSOR_ADS", false, "Sponsor placements"],
  ];
  await prisma.featureFlag.createMany({ data: defaults.map(([key, enabled, description]) => ({ key, enabled, description })) });
}

async function seedPlatformSettings(): Promise<void> {
  await prisma.platformSettings.createMany({
    data: [
      { key: "commission_bps", value: Number(process.env.PLATFORM_COMMISSION_BPS ?? 1000) },
      { key: "default_game_duration_minutes", value: 120 },
      { key: "waitlist_reserve_minutes", value: 30 },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });