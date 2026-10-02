# PickleNepal — Product Requirements Document

> **Product:** PickleNepal  
> **Tagline:** Find your people. Find your game.  
> **Market:** Nepal  
> **Primary timezone:** `Asia/Kathmandu`  
> **Primary currency:** NPR  
> **Document type:** Product + Functional + Technical Requirements  
> **Status:** Initial master specification

---

## 1. Product Overview

### 1.1 Vision

PickleNepal is a Nepal-focused digital community for pickleball players, clubs, courts, coaches, tournament organizers, events, and equipment sellers.

The product should become the online home for pickleball in Nepal.

PickleNepal is **not only a court-booking website**. It is a community ecosystem centered around helping people answer:

> **How can I play pickleball today?**

The platform should help a user:

- Find a court
- Find nearby players
- Find an open game
- Create a game
- Join a game
- Follow players and clubs
- Discover events
- Discover and enter tournaments
- Track game and tournament statistics
- Participate in a community feed
- Message other users
- Receive notifications
- Eventually book courts online
- Eventually pay for bookings and tournaments
- Eventually buy/sell equipment

### 1.2 Product Principles

1. Community comes before monetization.
2. The core experience must be useful for free.
3. The application must be mobile-first.
4. No fake functionality.
5. Server-side business rules must be authoritative.
6. Public information should be discoverable and SEO-friendly.
7. User privacy should be respected.
8. The architecture should support future expansion without requiring a rewrite.
9. UI should feel like a real sports-community startup, not a generic CRUD dashboard.
10. Every major action should have a clear feedback state.

---

# 2. Goals

## 2.1 Primary Goals

### Goal A — Build the pickleball community

Allow players in Nepal to find each other based on:

- City
- Skill
- Game format
- Position
- Availability
- Club

### Goal B — Make finding games easy

A player should be able to open PickleNepal and quickly discover:

- Games today
- Games tomorrow
- Weekend games
- Beginner-friendly games
- Free games
- Nearby games

### Goal C — Build a trusted directory

Create reliable public profiles for:

- Courts
- Clubs
- Coaches
- Tournaments
- Events
- Players

### Goal D — Create recurring engagement

Encourage the loop:

`Join → Find players → Find/create game → Play → Record results → Improve statistics → Meet more players → Join tournaments → Invite friends → Repeat`

### Goal E — Enable future monetization

Prepare the product for:

- Court booking commission
- Tournament registration fees
- Club subscriptions
- Featured listings
- Sponsorships
- Marketplace commission
- Coach subscriptions
- Premium memberships
- Advertising

---

# 3. Non-Goals for the Initial Launch

These may be architected for future support but should not block the initial community launch:

- Official DUPR integration
- Full ecommerce checkout
- Complex AI recommendations
- Native iOS/Android applications
- Advanced league management
- Real-time live tournament streaming
- Complex loyalty programs

Do not fake integrations that are not actually connected.

---

# 4. Target Users

## 4.1 Player

The normal community member.

Can:

- Create a profile
- Find players
- Find games
- Create games
- Join games
- Join waitlists
- Follow users
- Follow clubs
- Post content
- Comment
- Like
- Save content
- Message users
- Attend events
- Register for tournaments
- View statistics
- Earn badges
- Review courts/clubs/coaches
- Create marketplace listings

## 4.2 Club

A verified organization operating one or more courts.

Can:

- Manage club profile
- Manage courts
- Manage availability
- Publish games
- Publish events
- Manage staff/coaches
- Manage pricing
- View analytics
- Manage bookings when enabled

## 4.3 Coach

A pickleball coach with a public profile.

Can:

- Publish bio
- Display experience
- Set location
- Set availability
- Publish lesson offerings
- Set pricing
- Receive messages
- Receive lesson requests
- Receive reviews

## 4.4 Tournament Organizer

Can:

- Create tournaments
- Configure categories
- Manage registration
- Add participants
- Create brackets
- Create matches
- Enter results
- Publish standings

## 4.5 Seller

Can:

- Create marketplace listings
- Manage products/listings
- Receive buyer messages
- Maintain seller profile

## 4.6 Admin

Has global management and moderation access.

Can:

- Manage users
- Manage roles
- Verify organizations
- Manage courts
- Moderate content
- Review reports
- Manage sponsors
- Manage payments
- Manage feature flags
- Review audit logs
- Configure platform settings

---

# 5. Nepal-Specific Requirements

## 5.1 Geography

Initial cities:

- Kathmandu
- Lalitpur
- Bhaktapur
- Pokhara
- Chitwan
- Biratnagar
- Butwal
- Dharan
- Other Nepal

Users must be able to manually select their city.

Do not require GPS.

If a user gives location permission, optional approximate-location features may include:

- Nearby courts
- Nearby games
- Nearby players

The manual city selection must always remain available.

## 5.2 Phone

Support Nepal numbers:

`+977`

Validation should be configurable rather than hardcoded into many components.

## 5.3 Currency

Display prices in NPR.

Examples:

- `NPR 500`
- `NPR 1,500`
- `NPR 10,000`

Store monetary amounts in a safe numeric representation such as integer minor units where appropriate.

## 5.4 Time

Primary timezone:

`Asia/Kathmandu`

All persisted times must be unambiguous.

User-facing times should follow Nepal local time.

## 5.5 Language

Primary UI language:

English

Architecture must make Nepali localization possible later.

Do not hardcode all user-facing strings directly into deeply nested components.

---

# 6. Product Navigation

## 6.1 Desktop Navigation

Top navigation:

- Logo
- Discover
- Find a Game
- Courts
- Events
- Community
- Rankings

Right side:

- Notifications
- Messages
- Profile

## 6.2 Mobile Navigation

Bottom navigation:

- Home
- Games
- Courts
- Community
- Profile

Use contextual floating actions where useful.

---

# 7. Visual & UI Requirements

## 7.1 Brand Direction

Visual personality:

- Energetic
- Friendly
- Sporty
- Modern
- Premium
- Social
- Nepal-focused

Suggested palette:

- Deep athletic green
- Warm yellow/orange
- Light neutral background
- Dark charcoal text
- Muted gray secondary text

Use theme tokens/CSS variables.

Do not scatter hardcoded colors across components.

## 7.2 UI Rules

Use:

- Rounded cards
- Clear hierarchy
- Strong CTA buttons
- Large readable typography
- Generous whitespace
- Responsive layouts
- Subtle motion
- Skeleton loading
- Polished empty states

Avoid:

- Excessive gradients
- Excessive glassmorphism
- Tiny text
- Overly dense screens
- Random animations
- Generic dashboard styling

## 7.3 Responsive Requirements

Must work on:

- Mobile
- Tablet
- Desktop
- Large desktop

Do not simply shrink desktop UI for mobile.

Use mobile-specific interactions where appropriate.

---

# 8. Landing Page

Route:

`/`

## 8.1 Hero

Headline:

> Find your people. Find your game.

Supporting copy:

> Connect with pickleball players across Nepal, discover courts, join open games, follow tournaments, and grow the community.

Primary CTA:

`Find a Game`

Secondary CTA:

`Explore Courts`

## 8.2 Sections

Homepage should contain:

1. Hero
2. Find a Game
3. Explore Courts
4. Meet Players
5. Upcoming Events
6. Tournament Spotlight
7. Popular Courts
8. Community Feed
9. Cities
10. Join PickleNepal CTA

## 8.3 Guest Experience

Guest users can browse public:

- Courts
- Clubs
- Players where profile privacy permits
- Events
- Tournaments
- Community posts where applicable

Actions requiring authentication should send users to login/register.

---

# 9. Authentication Requirements

## 9.1 Registration

Required:

- Full name
- Email
- Phone
- Password
- City

Optional:

- Profile photo
- Date of birth

## 9.2 Login

Support:

- Email/password
- Google OAuth where practical

## 9.3 Account Recovery

Implement:

- Forgot password
- Password reset
- Session invalidation where appropriate
- Secure token handling

## 9.4 Account Security

Requirements:

- Password hashing
- Secure session handling
- Secure cookies where applicable
- Rate limiting
- Server-side authorization
- No secrets in client bundles
- No password logging

---

# 10. Player Onboarding

After registration, show an onboarding flow.

## Step 1 — Location

- Kathmandu
- Lalitpur
- Bhaktapur
- Pokhara
- Chitwan
- Biratnagar
- Butwal
- Dharan
- Other Nepal

## Step 2 — Skill Level

- Complete Beginner
- Beginner
- Intermediate
- Upper Intermediate
- Advanced
- Competitive

## Step 3 — Format

- Singles
- Doubles
- Both

## Step 4 — Position

- Left
- Right
- Either

## Step 5 — Availability

- Early morning
- Morning
- Afternoon
- Evening
- Night
- Weekends

## Step 6 — Frequency

- Occasionally
- 1–2 times/week
- 3–4 times/week
- 5+ times/week

## Optional

- DUPR rating
- Bio
- Instagram
- Facebook
- Profile photo

Users may skip optional fields.

Save onboarding progress.

---

# 11. Player Profile

Route:

`/players/[username]`

## 11.1 Public Information

- Profile image
- Cover image if enabled
- Name
- Username
- City
- Skill level
- DUPR rating if available
- Preferred format
- Position
- Availability
- Bio
- Clubs
- Badges
- Statistics
- Tournament history
- Joined date

## 11.2 Actions

- Follow
- Invite to Game
- Message
- Share
- Report

## 11.3 Privacy

Profile visibility:

- Public
- Community only
- Private

Never publicly expose private:

- Email
- Phone
- Account identifiers
- Internal moderation information

---

# 12. Discover / Home

The signed-in home should answer:

> What can I do now?

Show:

- Next game
- Games near user
- Recommended games
- Nearby courts
- Upcoming tournament
- Upcoming event
- Players user may know
- Followed clubs
- Community posts
- Unread messages
- Notifications

The experience should prioritize action over analytics.

---

# 13. Find a Game

Route:

`/games`

This is the primary product feature.

## 13.1 Game States

- DRAFT
- OPEN
- FULL
- STARTED
- COMPLETED
- CANCELLED

## 13.2 Game Types

- Singles
- Doubles
- Open Play
- Friendly
- Competitive
- Drill Session
- King/Queen of the Court

## 13.3 Required Game Data

- Creator
- Date
- Start time
- End time
- Court
- City
- Format
- Skill level
- Capacity
- Participants
- Status

Optional:

- Price
- Description
- Ball information
- Equipment information
- Organizer note

---

# 14. Create Game

Create a multi-step flow.

## Step 1 — When

- Date
- Start time
- End time

Validation:

- Date must be valid
- End time must be after start time
- Past games cannot be created
- Timezone must be Asia/Kathmandu

## Step 2 — Where

Select court.

Show:

- Court image
- Court name
- City
- Indoor/outdoor
- Surface
- Indicative price

## Step 3 — Type

Choose game format/type.

## Step 4 — Skill

Choose:

- Complete Beginner
- Beginner
- Intermediate
- Upper Intermediate
- Advanced
- Competitive
- Open to All

## Step 5 — Capacity

Defaults:

Singles = 2  
Doubles = 4  
Open Play = configurable

## Step 6 — Details

Optional:

- Description
- Ball information
- Equipment information
- Special instructions

## Step 7 — Review

Show a complete game preview.

CTA:

`Publish Game`

---

# 15. Join Game

Game route:

`/games/[id]`

Display:

- Court
- Location
- Map
- Date
- Time
- Duration
- Format
- Skill
- Price
- Organizer
- Players
- Remaining slots

Example:

`3 / 4 players`

`1 spot remaining`

CTA:

`Join Game`

After joining:

`Leave Game`

If full:

`Join Waitlist`

---

# 16. Game Capacity

Default:

- Singles = 2
- Doubles = 4
- Open Play = organizer-defined

Server-side enforcement is mandatory.

The database transaction must prevent race-condition overbooking.

If two people attempt to claim the last slot at the same time, only one may succeed.

---

# 17. Game Waitlist

When a game is full:

- User may join waitlist
- User receives position
- User can leave waitlist

When a participant leaves:

1. Identify next eligible waitlisted user
2. Notify them
3. Reserve an acceptance window if configured
4. If not accepted, offer to next user

Do not hold a slot forever for a non-responsive user.

---

# 18. Game Cancellation

Only authorized users may cancel.

Cancellation should:

- Change status to CANCELLED
- Preserve game history
- Notify participants
- Notify waitlisted users where relevant
- Trigger refunds if payment support is active and refund rules apply

Do not hard-delete historical games.

---

# 19. Game Filters

Support:

- City
- Date
- Time
- Skill
- Format
- Court
- Price
- Indoor/outdoor

Quick filters:

- Today
- Tomorrow
- This Weekend
- Beginner Friendly
- Free
- Near Me

Sort:

- Soonest
- Newest
- Closest
- Most Players

Filters should be reflected in URL query parameters where practical.

Example:

`/games?city=kathmandu&skill=beginner&format=doubles`

---

# 20. Game Cards

Game cards should show:

- Court photo
- Court name
- City
- Date
- Time
- Duration
- Format
- Skill
- Price
- Participants
- Capacity
- Organizer

Visual states:

- Open
- Almost Full
- Full
- Starting Soon
- Completed
- Cancelled

---

# 21. Find Players

Route:

`/players`

Filters:

- City
- Skill level
- DUPR
- Format
- Position
- Availability
- Club

Player cards:

- Avatar
- Name
- City
- Skill
- DUPR if available
- Format
- Position
- Availability

Actions:

- View Profile
- Follow
- Invite to Game
- Message

---

# 22. Courts Directory

Route:

`/courts`

Each court profile must support:

- Name
- Logo
- Images
- Description
- Address
- City
- Latitude
- Longitude
- Number of courts
- Indoor/outdoor
- Surface
- Lighting
- Opening hours
- Pricing
- Amenities
- Equipment rental
- Paddle rental
- Ball rental
- Contact
- Website
- Social links
- Reviews

Amenities:

- Parking
- Washroom
- Changing room
- Drinking water
- Cafe
- Lighting
- Spectator area
- Equipment rental

---

# 23. Court Map

Provide:

- Map view
- List view
- Toggle between them

Marker popup:

- Court name
- Image
- Rating
- Price
- City

CTA:

`View Court`

Manual city selection must be supported even when GPS is unavailable.

---

# 24. Clubs

Route:

`/clubs`

Club profile:

- Name
- Logo
- Cover image
- Description
- City
- Address
- Map
- Courts
- Opening hours
- Pricing
- Membership information
- Events
- Games
- Coaches
- Reviews
- Contact
- Social links

Verified clubs display a verification badge.

---

# 25. Club Dashboard

Route:

`/club/dashboard`

Club administrators can manage:

- Profile
- Images
- Courts
- Court pricing
- Availability
- Games
- Events
- Coaches
- Announcements
- Staff

Metrics:

- Profile views
- Court views
- Games
- Bookings
- Event registrations
- Revenue when enabled

---

# 26. Court Booking

Booking entity must contain:

- User
- Club
- Court
- Date
- Start time
- End time
- Price
- Payment status
- Booking status

Booking statuses:

- PENDING
- CONFIRMED
- CANCELLED
- COMPLETED
- REFUNDED

Rules:

- No double bookings
- No booking in the past
- Booking must be within opening hours
- Booking must not overlap blocked periods

Use server-side conflict detection.

---

# 27. Events

Route:

`/events`

Event types:

- Open Play
- Social Night
- Meetup
- Coaching Session
- Demo Day
- Tournament
- Community Event

Event page:

- Title
- Image
- Organizer
- Venue
- City
- Date
- Time
- Description
- Capacity
- Participants
- Cost
- Registration status

Actions:

- Attend
- Cancel attendance
- Share

---

# 28. Tournaments

Route:

`/tournaments`

Tournament fields:

- Name
- Poster
- Organizer
- Venue
- City
- Start date
- End date
- Registration deadline
- Description
- Rules
- Entry fee
- Prize information
- Contact
- Status

Tournament statuses:

- DRAFT
- UPCOMING
- REGISTRATION_OPEN
- REGISTRATION_CLOSED
- LIVE
- COMPLETED
- CANCELLED

Categories may include:

- Men's Singles
- Women's Singles
- Men's Doubles
- Women's Doubles
- Mixed Doubles
- Custom organizer-defined categories

---

# 29. Tournament Registration

Players can:

- View tournament
- Read rules
- Select category
- Register
- Add partner
- Cancel according to rules

Prevent:

- Duplicate registration
- Invalid categories
- Registration after deadline
- Registration beyond capacity

Doubles teams must be represented as an explicit entity.

---

# 30. Tournament Organizer Dashboard

Organizer can:

- Create tournament
- Edit tournament
- Upload poster
- Define rules
- Define categories
- Set participant limits
- Set fees
- Open registration
- Close registration
- Approve participants where required
- Manage teams
- Generate brackets
- Create matches
- Enter scores
- Publish standings
- Publish winners

---

# 31. Tournament Brackets

Support:

- Round Robin
- Single Elimination
- Round Robin + Single Elimination

Match fields:

- Tournament
- Category
- Round
- Court
- Player/team A
- Player/team B
- Score A
- Score B
- Winner
- Scheduled time
- Status

Bracket UI:

Desktop:
Horizontal bracket

Mobile:
Scrollable/collapsible bracket

Results should advance the bracket where tournament rules allow.

---

# 32. Match Results

Record:

- Player/team
- Opponent
- Score
- Winner
- Date
- Tournament

Calculate:

- Games played
- Wins
- Losses
- Win rate
- Tournament appearances
- Tournament wins
- Podiums

Important:

**Do not present internal statistics as official DUPR data.**

---

# 33. Rankings

Route:

`/rankings`

Ranking types:

- Nepal
- City

Filters:

- Singles
- Doubles
- Mixed
- Skill
- City
- Monthly
- All Time

Display:

- Rank
- Player
- Points/rating
- Games
- Wins
- Losses
- Win percentage

Clearly identify methodology.

Possible labels:

- PickleNepal Community Ranking
- Tournament Points
- DUPR

Never label an internal calculation as official DUPR.

---

# 34. Player Statistics

Automatically calculate:

- Games played
- Wins
- Losses
- Win percentage
- Games created
- Games joined
- Tournament appearances
- Tournament wins
- Podiums
- Favorite courts
- Events attended

Verified competition statistics must not be manually editable by ordinary players.

---

# 35. Badges and Achievements

Create automated badges.

Examples:

- First Game
- 10 Games Played
- 25 Games Played
- 50 Games Played
- Game Creator
- Tournament Debut
- Tournament Winner
- Court Explorer
- Weekend Warrior
- Community Builder
- Early Member

Badge awarding should be rule-driven.

---

# 36. Community Feed

Route:

`/community`

Post types:

- GENERAL
- LOOKING_FOR_PLAYERS
- TOURNAMENT
- COURT
- GEAR
- COACHING
- ANNOUNCEMENT

Posts support:

- Text
- Images
- Allowed links

---

# 37. Community Interactions

Support:

- Like
- Comment
- Reply
- Save
- Share
- Report

Authors may:

- Edit own post
- Delete own post

Admins may moderate.

Use optimistic UI only when rollback behavior is implemented.

---

# 38. Following

Users can follow:

- Players
- Clubs
- Coaches
- Organizers

Profiles should display:

- Followers
- Following

Personalized feed can prioritize followed accounts.

---

# 39. Comments

Support:

- Comments
- Replies
- Likes
- Reports

Use controlled nesting.

Prevent abuse and unbounded recursive structures.

---

# 40. Global Search

Search across:

- Players
- Courts
- Clubs
- Coaches
- Games
- Events
- Tournaments
- Posts

Results should be categorized.

Example:

`Players (8)`

`Courts (3)`

`Clubs (2)`

Include:

- Search suggestions
- Recent searches
- Useful empty states

Search must not expose private entities.

---

# 41. Messaging

Support private conversations between:

- Player → Player
- Player → Club
- Player → Coach
- Player → Organizer
- Player → Seller

Features:

- Conversation list
- Unread count
- Message text
- Timestamp
- Read state
- Block
- Report

Critical:

Users must not access conversations to which they are not participants.

---

# 42. Notifications

Notification types:

- Player joined your game
- Player left your game
- Waitlist available
- Game reminder
- Game cancelled
- Tournament registration
- Tournament reminder
- Event reminder
- Like
- Comment
- Follow
- Message
- Badge earned
- Verification result
- Booking status

Notification model:

- id
- recipient
- type
- title
- body
- read/unread
- createdAt
- related entity

---

# 43. Notification Preferences

Users can manage:

- Game notifications
- Tournament notifications
- Event notifications
- Social notifications
- Message notifications
- Marketing notifications

Channels:

- In-app
- Email
- Push

Notification delivery should be abstracted so channels can evolve independently.

---

# 44. Coaches

Verified coaches can create public profiles.

Coach fields:

- Name
- Photo
- Bio
- Experience
- City
- Location
- Skill levels taught
- Availability
- Pricing
- Lesson offerings
- Reviews

Player actions:

- View
- Message
- Request lesson
- Review

Unverified users must not receive misleading verification indicators.

---

# 45. Reviews

Allow reviews for:

- Courts
- Clubs
- Coaches

Review fields:

- Rating
- Comment
- Reviewer
- Created date

Optional categories:

- Overall
- Facilities
- Court quality
- Staff
- Value

Requirements:

- Server-side validation
- Duplicate abuse prevention
- Report functionality
- Moderation workflow

---

# 46. Marketplace

Route:

`/marketplace`

Initial categories:

- Paddles
- Balls
- Shoes
- Bags
- Clothing
- Accessories
- Court equipment

Listing fields:

- Title
- Images
- Description
- Price
- Condition
- Seller
- City
- Availability
- Created date

Initial version may be a classified marketplace.

Users can:

- Create listing
- Edit listing
- Delete listing
- Save listing
- Contact seller
- Report listing

Architecture should allow future ecommerce.

---

# 47. Seller Profiles

Seller profile:

- Business/seller name
- Logo
- Description
- City
- Products/listings
- Contact
- Social links
- Verification status

Admin can verify sellers.

---

# 48. Payment Architecture

Create a provider abstraction.

Potential providers:

- eSewa
- Khalti
- Stripe

Support:

- Payment initiation
- Callback handling
- Server-side payment verification
- Transaction ID
- Payment status
- Refund
- Receipt

Statuses:

- PENDING
- PROCESSING
- SUCCESS
- FAILED
- REFUNDED

Never mark payment successful based only on frontend state.

---

# 49. Monetization

The system must support future monetization.

Potential models:

1. Court booking commission
2. Tournament registration fees
3. Club subscriptions
4. Featured courts
5. Featured clubs
6. Featured tournaments
7. Sponsored events
8. Marketplace commission
9. Coach subscriptions
10. Premium membership
11. Advertising

Business rules should be configurable.

Do not hardcode commission values throughout the codebase.

---

# 50. Premium Membership Architecture

Prepare for future plans.

Potential premium features:

- Advanced player filters
- Advanced statistics
- Advanced matching
- Tournament analytics
- Profile customization
- Club tools
- Priority discovery

Core community functionality must not depend on paid membership.

---

# 51. Referrals

Each player can optionally have a referral code.

Track:

- Referrer
- Referred user
- Signup date
- Conversion state
- Reward state

Rewards should be configurable.

Do not promise monetary rewards without a real reward system.

---

# 52. Sharing

Every public resource needs a shareable route.

Examples:

- `/players/[username]`
- `/courts/[slug]`
- `/clubs/[slug]`
- `/games/[id]`
- `/events/[slug]`
- `/tournaments/[slug]`
- `/posts/[id]`

Actions:

- Copy link
- WhatsApp
- Native share

Generate appropriate OpenGraph metadata.

---

# 53. SEO

Public pages must have:

- Dynamic title
- Description
- Canonical URL
- OpenGraph metadata
- Social cards
- Sitemap
- Robots.txt
- Structured data where appropriate

Useful target topics include:

- Pickleball Nepal
- Pickleball Kathmandu
- Pickleball Lalitpur
- Pickleball Pokhara
- Pickleball courts Nepal
- Pickleball tournaments Nepal
- Pickleball clubs Nepal
- Pickleball players Nepal

Do not create keyword-stuffed spam pages.

---

# 54. Admin Dashboard

Route:

`/admin`

Sections:

- Overview
- Users
- Players
- Clubs
- Courts
- Coaches
- Organizers
- Sellers
- Games
- Bookings
- Events
- Tournaments
- Posts
- Comments
- Marketplace
- Reviews
- Reports
- Verification
- Sponsors
- Payments
- Settings
- Audit Logs

---

# 55. Admin Analytics

Dashboard metrics:

- Total users
- New users
- Active users
- Total players
- Clubs
- Courts
- Games created
- Games joined
- Events
- Tournaments
- Posts
- Reports
- Revenue

Charts:

- User growth
- Games/day
- Games by city
- Tournament registrations
- Popular courts
- Popular cities
- Active users

---

# 56. Admin User Management

Admin can:

- Search users
- Filter by role
- Filter by city
- View account
- View activity summary
- Suspend
- Ban
- Restore
- Review verification
- Manage eligible roles

Destructive actions require confirmation.

---

# 57. Verification

Verification types:

- Club
- Coach
- Organizer
- Seller

Request fields may include:

- Name
- Organization
- Description
- Contact
- Supporting documents where appropriate

Statuses:

- PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED
- MORE_INFORMATION_REQUIRED

Maintain verification history.

---

# 58. Moderation

Users can report:

- Users
- Posts
- Comments
- Games
- Courts
- Clubs
- Events
- Tournaments
- Reviews
- Marketplace listings

Reasons:

- Spam
- Harassment
- Scam
- Fake information
- Inappropriate content
- Other

Admin actions:

- Dismiss
- Remove
- Warn
- Suspend
- Ban

Every moderation action must create an audit log.

---

# 59. Sponsors

Sponsor fields:

- Name
- Logo
- Description
- Website
- Image
- Campaign
- Start date
- End date
- Placement

Potential placements:

- Homepage
- Tournament
- Event
- Community

Ads should not overwhelm the core experience.

---

# 60. Analytics Event Tracking

Track:

- `signup`
- `login`
- `profile_completed`
- `game_created`
- `game_joined`
- `game_left`
- `court_viewed`
- `player_viewed`
- `club_viewed`
- `tournament_viewed`
- `tournament_registered`
- `event_joined`
- `post_created`
- `post_liked`
- `message_sent`
- `booking_created`
- `booking_completed`

Do not collect unnecessary personal information.

---

# 61. Player Matching Foundation

Create an explainable matching foundation using:

- City
- Skill
- Game format
- Position
- Availability

Initial implementation may use deterministic compatibility filtering/scoring.

Do not market it as AI until actual AI functionality exists.

Architecture should allow future recommendation models.

---

# 62. DUPR Handling

Store optional DUPR information.

Never invent DUPR scores.

Never claim an internal PickleNepal score is an official DUPR score.

Future official integration should be implemented as a separate integration layer.

---

# 63. Feature Flags

Create feature flags for:

- `BOOKINGS`
- `PAYMENTS`
- `MARKETPLACE`
- `PREMIUM`
- `MESSAGING`
- `PUSH_NOTIFICATIONS`
- `DUPR_INTEGRATION`
- `SPONSOR_ADS`

Features should be safely disabled when not configured.

---

# 64. File Uploads

Support uploads for:

- Profile photos
- Cover photos
- Court images
- Club images
- Tournament posters
- Community images
- Marketplace listing images

Validate:

- MIME/type
- File size
- Dimensions
- Allowed extension

Use object storage such as Cloudflare R2/S3.

Do not store large image blobs directly in PostgreSQL.

---

# 65. Global UX States

Every async experience must have:

- Loading state
- Success state
- Error state
- Empty state

Examples:

### No Games

> No open games in Kathmandu right now.

CTA:

`Create a Game`

### No Players

> No players match your filters.

CTA:

`Clear Filters`

### No Messages

> Your conversations will appear here.

### No Notifications

> You're all caught up.

Do not display blank white pages.

---

# 66. Product Feedback

Important actions should provide confirmation.

Examples:

Game created:

> Your game is live.

Game joined:

> You're in! See you on court.

Waitlist:

> You're on the waitlist.

Post:

> Your post has been published.

Review:

> Thanks for your review.

Use toast or inline feedback appropriately.

---

# 67. Search Requirements

Initial search can use PostgreSQL search capabilities.

Search should support:

- Partial text
- Case-insensitive matching
- Relevant ranking
- Category grouping

Keep search implementation abstract enough that Meilisearch/Typesense/Elastic/etc. can be added later.

Do not expose private records.

---

# 68. Database Requirements

Use a normalized relational schema.

Minimum entities:

```text
User
Account
Session
PlayerProfile

Club
ClubMember

CoachProfile

Court
CourtAvailability
CourtBooking

Game
GameParticipant
GameWaitlist

Event
EventParticipant

Tournament
TournamentCategory
TournamentParticipant
TournamentTeam
TournamentMatch

CommunityPost
Comment
Like
Follow
SavedItem

Conversation
ConversationParticipant
Message

Notification
NotificationPreference

Badge
UserBadge

Review
Report

VerificationRequest

MarketplaceListing
MarketplaceFavorite

Payment
Transaction

Sponsor

Referral

AuditLog
```

---

# 69. Database Integrity Rules

Mandatory constraints:

- User cannot join same game twice
- Game capacity cannot be exceeded
- Court cannot have overlapping confirmed bookings
- User cannot create unrestricted duplicate reviews
- Tournament participant must belong to valid category
- Doubles team must have correct member count
- Private messages require participant authorization
- Historical games must not disappear silently
- Important entities should have created/updated timestamps

Use:

- UUIDs
- Foreign keys
- Unique constraints
- Indexes
- Transactions
- Enums where appropriate
- Soft deletion where useful

---

# 70. Database Indexing

At minimum consider indexes on:

- User city
- Username
- Game date
- Game city
- Game status
- Court city
- Tournament date
- Event date
- Post created date
- Notifications recipient/read state
- Conversation participants
- Message created date
- Booking court/date/time

Review query plans for large collections.

---

# 71. API / Server Architecture

Organize server functionality by feature:

- Auth
- Players
- Games
- Courts
- Clubs
- Events
- Tournaments
- Community
- Messaging
- Notifications
- Bookings
- Payments
- Marketplace
- Admin

All server mutations should:

1. Authenticate
2. Authorize
3. Validate input
4. Execute business rules
5. Perform database operation
6. Trigger relevant side effects
7. Return predictable result/error

Do not expose raw database models unnecessarily.

---

# 72. Authorization Requirements

Examples:

### Player

Can edit own profile.

Cannot edit another player's profile.

### Game Creator

Can manage their own game.

Cannot manage another user's game.

### Participant

Can leave a joined game.

Cannot remove another participant unless explicitly authorized.

### Club Admin

Can manage their own club.

Cannot manage another club.

### Tournament Organizer

Can manage tournaments they own/have permission for.

### Seller

Can manage own listings.

### Admin

Can manage globally.

These checks must occur server-side.

---

# 73. Game Business Rules

A game cannot be joined when:

- Cancelled
- Completed
- Past
- Full, unless waitlist is available

A game cannot be edited freely after it begins.

Changing:

- Court
- Date
- Time
- Capacity

may require participant notifications.

Game creator leaving must not leave an orphaned game.

Possible handling:

- Transfer ownership to another participant
- Or cancel the game

Choose a clear business rule and document it.

---

# 74. Tournament Business Rules

Registration cannot happen:

- After deadline
- For invalid category
- Beyond capacity
- Twice for same eligible participant/team

Completed match results should be immutable to ordinary users.

Admin may correct results through a controlled workflow with an audit log.

---

# 75. Booking Business Rules

Reject:

- Past bookings
- Invalid time ranges
- Outside operating hours
- Blocked intervals
- Overlapping confirmed bookings

If payment fails:

Booking remains unconfirmed.

Do not release money or confirm service solely from client-side state.

---

# 76. Community Feed

Initial feed strategy:

- Newest posts
- Followed users/clubs
- Popular/recent engagement

Do not build an unnecessarily complex algorithm initially.

Create a feed service abstraction so ranking can later evolve.

---

# 77. Notifications Architecture

Create a notification service abstraction.

Example conceptual interface:

```text
NotificationService.send(...)
```

This service should support future channels such as:

- Database/in-app
- Email
- Push
- SMS

Do not embed notification delivery code throughout UI components.

---

# 78. Email Requirements

Templates should exist for:

- Welcome
- Verification
- Password reset
- Game joined
- Game reminder
- Game cancellation
- Tournament registration
- Event reminder
- Verification result

Email provider must be configured via environment variables.

---

# 79. PWA Requirements

Make PickleNepal installable as a Progressive Web App.

Implement:

- Web app manifest
- Icons
- Install metadata
- App-like navigation
- Offline fallback

Do not cache private account information insecurely.

---

# 80. Performance Requirements

Optimize:

- Images
- Fonts
- Database queries
- Server rendering
- Client-side JavaScript
- API requests
- Caching

Use:

- Pagination
- Cursor pagination where appropriate
- Lazy loading
- Skeleton states
- Optimized images
- Server rendering where beneficial

Community feed may use infinite scrolling.

Large administrative lists should use pagination.

---

# 81. Accessibility Requirements

Implement:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Form labels
- Accessible dialogs
- ARIA labels where needed
- Alt text
- Sufficient contrast
- Screen-reader-friendly states

Do not use color alone to communicate important states.

---

# 82. Security Requirements

Protect against:

- SQL injection
- XSS
- CSRF where applicable
- IDOR
- Privilege escalation
- Unauthorized admin access
- Brute force
- Spam
- Malicious uploads

Never trust client-provided:

- Role
- User ID
- Price
- Payment status
- Ownership
- Permissions

All critical fields must be verified server-side.

Never expose:

- Passwords
- Secret keys
- Private tokens
- Internal error stacks

---

# 83. Rate Limiting

Rate-limit abuse-prone operations:

- Login
- Signup
- Password reset
- Message sending
- Post creation
- Comment creation
- Reviews
- Reports
- Game creation
- Tournament registration

Use a hosting-compatible mechanism.

---

# 84. Moderation & Safety

Users must be able to:

- Block users
- Report users
- Report content
- Report games
- Report listings

Moderation interface should show:

- Reporter
- Target
- Reason
- Timestamp
- Status
- Admin actions

Do not reveal reporter identity unnecessarily.

---

# 85. SEO-Friendly URL Structure

Preferred:

```text
/players/[username]
/courts/[slug]
/clubs/[slug]
/games/[id]
/events/[slug]
/tournaments/[slug]
/posts/[id]
```

Use unique slugs.

Prevent collisions.

---

# 86. Seed Data

Create realistic development seed data.

Include:

- Multiple players
- Clubs
- Courts
- Games
- Events
- Tournaments
- Community posts
- Coaches
- Reviews

Use Nepal locations.

Seed data must clearly be development/demo data.

Do not falsely represent invented organizations as real businesses.

---

# 87. Environment Configuration

Create:

`.env.example`

Potential variables:

```text
DATABASE_URL=
AUTH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

MAP_API_KEY=

EMAIL_API_KEY=

ESEWA_*
KHALTI_*
STRIPE_*
```

Never commit actual credentials.

---

# 88. Docker Requirements

Create:

```text
Dockerfile
docker-compose.yml
.dockerignore
```

Development stack should support:

- Web
- PostgreSQL

Do not put secrets into Docker images.

Use environment variables.

---

# 89. Database Migrations

Use Prisma migrations.

Document commands for:

- Generate Prisma client
- Create migration
- Apply migration
- Production deployment
- Seed database

Do not require destructive reset commands for normal development.

---

# 90. Testing Strategy

## 90.1 Unit Tests

Test:

- Validators
- Game capacity
- Waitlist logic
- Ranking calculation
- Tournament rules
- Booking conflict logic
- Permissions

## 90.2 Integration Tests

Test:

- Authentication
- Game creation
- Game joining
- Tournament registration
- Community interactions
- Messaging authorization
- Reviews
- Admin actions

## 90.3 E2E Tests

### Journey A — New Player

Register  
→ Onboarding  
→ Profile  
→ Find Game  
→ Join Game

### Journey B — Game Creator

Login  
→ Create Game  
→ Select Court  
→ Publish  
→ Another user joins

### Journey C — Tournament

Browse tournament  
→ Register  
→ Organizer sees participant

### Journey D — Community

Create post  
→ Another user likes/comment

### Journey E — Club

Club admin  
→ Manage club  
→ Add court  
→ Publish game

---

# 91. QA Checklist

Before release verify:

- Authentication
- Authorization
- Navigation
- Responsive layout
- Forms
- Validation
- Game workflows
- Court discovery
- Booking logic
- Tournament logic
- Community
- Messaging
- Notifications
- Search
- Admin
- Moderation
- Verification
- SEO
- Performance
- Security
- Accessibility

---

# 92. Mobile QA

Test common mobile widths.

Check:

- Bottom navigation
- Filters
- Modals
- Forms
- Game cards
- Court maps
- Tournament brackets
- Community feed
- Messaging

No accidental horizontal overflow.

---

# 93. Error Pages

Create:

- `404`
- `403`
- `500`

Also support friendly handling for:

- Validation errors
- Authentication errors
- Payment errors
- Network failures
- Database failures

Do not expose stack traces.

---

# 94. Admin Audit Log

Every important admin action should create an audit log.

Fields:

- Admin
- Action
- Target type
- Target ID
- Reason
- Timestamp
- Relevant metadata

Examples:

- User suspended
- Post removed
- Club verified
- Review removed
- Tournament cancelled

---

# 95. Product Growth Features

The product should encourage healthy community growth through:

- Invite friends
- Create games
- Follow players
- Follow clubs
- Join events
- Join tournaments
- Earn badges
- Share games
- Share tournaments

Avoid manipulative dark patterns.

---

# 96. Future Features

Architecture should support:

- Official DUPR integration
- AI player matching
- AI game recommendations
- Native iOS application
- Native Android application
- Real-time court availability
- League management
- Live scoring
- Live brackets
- Club memberships
- Loyalty points
- Equipment ecommerce
- Coach marketplace
- Sponsor marketplace
- Advertising
- City-based communities
- National rankings
- National league
- National championship

Do not implement fake future integrations.

---

# 97. Launch Priorities

Prioritize features in this order:

## Priority 1 — Community Core

- Authentication
- Onboarding
- Player profiles
- Find Players
- Courts
- Find a Game
- Create Game
- Join Game
- Waitlist
- Community
- Events

## Priority 2 — Competitive Ecosystem

- Clubs
- Coaches
- Tournaments
- Tournament registration
- Brackets
- Match results
- Statistics
- Rankings
- Badges

## Priority 3 — Communication & Business

- Messaging
- Notifications
- Club dashboard
- Court bookings
- Payments architecture
- Marketplace
- Seller profiles

## Priority 4 — Monetization & Scale

- Premium
- Featured listings
- Sponsorships
- Advertising
- Advanced analytics
- Advanced matching
- DUPR integration

The first release should be useful even if payment infrastructure is disabled.

---

# 98. Core User Flow

## New User

```text
Landing
  ↓
Register
  ↓
Onboarding
  ↓
Choose city
  ↓
Choose skill
  ↓
Explore games
  ↓
View court
  ↓
Join game
  ↓
Meet players
  ↓
Participate in community
```

## Returning User

```text
Home
  ↓
Next game / recommended game
  ↓
Court / event / tournament
  ↓
Community
  ↓
Messages / notifications
```

---

# 99. Core Community Loop

```text
JOIN
  ↓
CREATE PROFILE
  ↓
FIND PLAYERS
  ↓
FIND GAME
  ↓
PLAY
  ↓
RECORD RESULT
  ↓
UPDATE STATISTICS
  ↓
MEET MORE PLAYERS
  ↓
JOIN TOURNAMENT
  ↓
FOLLOW CLUBS
  ↓
CREATE MORE GAMES
  ↓
INVITE FRIENDS
  ↓
GROW PICKLENEPAL
```

---

# 100. Recommended Page Inventory

## Public Pages

```text
/
 /about
 /players
 /players/[username]
 /courts
 /courts/[slug]
 /clubs
 /clubs/[slug]
 /coaches
 /coaches/[slug]
 /games
 /games/[id]
 /events
 /events/[slug]
 /tournaments
 /tournaments/[slug]
 /community
 /community/[post]
 /rankings
 /marketplace
 /marketplace/[slug]
 /login
 /register
 /forgot-password
```

## Player Pages

```text
/dashboard
/profile
/profile/edit
/games/create
/games/my-games
/games/saved
/notifications
/messages
/messages/[conversation]
/settings
/settings/privacy
/settings/notifications
/settings/account
```

## Club Pages

```text
/club/dashboard
/club/profile
/club/courts
/club/bookings
/club/games
/club/events
/club/coaches
/club/settings
```

## Organizer Pages

```text
/organizer/dashboard
/organizer/tournaments
/organizer/tournaments/create
/organizer/tournaments/[id]/manage
```

## Admin

```text
/admin
/admin/users
/admin/players
/admin/clubs
/admin/courts
/admin/coaches
/admin/organizers
/admin/sellers
/admin/games
/admin/bookings
/admin/events
/admin/tournaments
/admin/community
/admin/marketplace
/admin/reviews
/admin/reports
/admin/verification
/admin/payments
/admin/sponsors
/admin/settings
/admin/audit-logs
```

---

# 101. Core Database Relationship Summary

```text
User
 ├── Account
 ├── Session
 ├── PlayerProfile
 ├── Notifications
 ├── Conversations
 ├── Reviews
 ├── Reports
 ├── MarketplaceListings
 └── Audit-related activity

Club
 ├── ClubMembers
 ├── Courts
 ├── Games
 ├── Events
 ├── Coaches
 └── Bookings

Court
 ├── Availability
 ├── Bookings
 ├── Games
 └── Reviews

Game
 ├── Creator
 ├── Participants
 ├── Waitlist
 └── Court

Tournament
 ├── Categories
 ├── Participants
 ├── Teams
 └── Matches

CommunityPost
 ├── Comments
 ├── Likes
 ├── Saves
 └── Reports

Conversation
 ├── Participants
 └── Messages
```

---

# 102. Implementation Rules for the AI Coding Agent

The coding agent must:

1. Inspect the existing repository before modifying anything.
2. Identify the current framework and package manager.
3. Reuse working infrastructure where practical.
4. Avoid unnecessary rewrites.
5. Use strict TypeScript.
6. Avoid unnecessary `any`.
7. Keep business logic out of UI components.
8. Validate on both client and server where relevant.
9. Make server-side authorization authoritative.
10. Use database transactions for concurrency-sensitive operations.
11. Keep files reasonably sized.
12. Build reusable components.
13. Write tests for business-critical logic.
14. Fix broken imports and build errors before proceeding.
15. Never commit secrets.
16. Never fake external integrations.
17. Use environment variables for configuration.
18. Add useful loading and empty states.
19. Maintain responsive UI.
20. Preserve accessibility.
21. Preserve existing working behavior.
22. Document non-obvious architectural decisions.

When a requirement is ambiguous, choose the simplest secure and maintainable implementation.

Do not repeatedly ask for approval for ordinary implementation details.

---

# 103. Acceptance Criteria

The application is considered functionally complete only when:

### Account

- User can register
- User can log in
- User can log out
- User can reset password
- User can manage profile
- User can manage privacy settings

### Games

- User can browse games
- User can filter games
- User can create a game
- User can join a game
- Capacity is enforced
- Waitlist works
- User can leave a game
- Creator can manage/cancel their game
- Participants receive relevant notifications

### Players

- User can find players
- User can view profiles
- User can follow players
- User can invite players
- User can message eligible players

### Courts

- User can browse courts
- User can use map/list view
- User can view court details
- Court data includes facilities and hours

### Clubs

- User can browse clubs
- Verified club profiles work
- Club admin can manage their club

### Events

- Users can browse events
- Users can attend/cancel attendance

### Tournaments

- Users can browse tournaments
- Users can register
- Organizers can manage participants
- Organizers can create matches
- Organizers can enter results
- Brackets update correctly
- Statistics are calculated

### Community

- Users can publish posts
- Users can like
- Users can comment
- Users can follow
- Users can save
- Users can report

### Messaging

- Users can start allowed conversations
- Users can send messages
- Read state works
- Unauthorized conversation access is blocked

### Notifications

- In-app notifications work
- Read/unread state works
- Preferences work

### Marketplace

- Users can create listings
- Users can edit/delete own listings
- Users can contact sellers
- Reports work

### Admin

- Admin dashboard works
- User management works
- Moderation works
- Verification works
- Reports work
- Audit logging works

### Technical

- TypeScript check passes
- Lint passes
- Tests pass
- Production build passes
- Docker build passes
- Environment setup is documented

---

# 104. Technical Definition of Done

Do not declare the application complete because the pages render.

The Definition of Done requires:

- UI implemented
- Database schema implemented
- Migrations implemented
- Server logic implemented
- Forms implemented
- Validation implemented
- Authorization implemented
- Error handling implemented
- Loading states implemented
- Empty states implemented
- Tests implemented for critical flows
- Production build works
- Docker build works
- README exists
- `.env.example` exists
- No critical TODOs remain
- No fake core buttons remain
- No known critical authorization issue remains

---

# 105. Final Product Statement

PickleNepal should feel like:

> **The home of pickleball in Nepal.**

It combines:

- Social network
- Player directory
- Game finder
- Court directory
- Club directory
- Coach directory
- Events
- Tournament platform
- Rankings
- Community feed
- Messaging
- Marketplace
- Future bookings and payments

Everything should reinforce:

# Find your people.
# Find your game.

The platform should launch with a strong free community experience and evolve into a sustainable Nepal-focused pickleball ecosystem.

---

# 106. Final Engineering Instruction

Treat this document as the product source of truth.

Before implementing:

- Inspect the current repository
- Map existing architecture
- Identify reusable code
- Identify missing infrastructure
- Confirm package manager
- Confirm database
- Confirm authentication
- Confirm deployment target

Then implement the application systematically.

Do not simply generate UI files.

Build the actual product.

After implementation, run:

- TypeScript checks
- Lint
- Unit tests
- Integration tests
- End-to-end tests where available
- Production build
- Docker build

Fix discovered issues before considering the project complete.

At the end, produce a concise implementation summary containing:

- What was implemented
- What works
- What external credentials/services are still required
- How to run locally
- How to run migrations
- How to seed data
- How to build
- How to deploy
- Any remaining non-critical limitations
