MSG-001 [USER]

Archived: 2026-03-03T23:17:57.594503+00:00



PROJECT TITLE:
AURIA — Premium Emotional Companion (Frontend V1) — Multi-Page + Luxury Calm Animations

YOU ARE STARTING FROM SCRATCH.
There is NO existing repo connected.
Build the full FRONTEND inside:
/workspace/public

ABSOLUTE RULES:





Frontend only (static).



Do NOT use npm.



Do NOT use frameworks.



Do NOT create backend.



No Node server required.



Pure HTML/CSS/JS only.



No console errors.



Mobile-first + Desktop comfortable.



Multi-page website (real separate HTML pages).



All pages must share one global CSS and one global JS where possible.

FOLDER STRUCTURE (MUST CREATE EXACTLY):
/workspace/public/
index.html
pages/
splash.html
login.html
signup.html
chat.html
mood.html
about.html
what.html
history.html
settings.html
assets/
(no downloads needed, use remote URLs only)
css/
app.css
js/
app.js

(Only these files. Keep structure clean.)

==================================================

BRAND / VISUAL IDENTITY

Brand Name: AURIA
Tone: calm, spiritual, emotional, luxury SaaS
Style: modern glass + soft glow + cinematic calm
No childish emojis as decoration.
Replace "emoji decoration" with subtle particles / glow / soft gradients.

Avatar (must be used everywhere):
https://i.imgur.com/vtzAk7r.jpeg

BACKGROUND IMAGES (use as CSS backgrounds):





MAIN HERO BACKGROUND:
https://i.imgur.com/MKiW3y8.jpeg



CHAT AREA BACKGROUND:
https://i.imgur.com/F4sx2S1.jpeg



MOBILE CHAT VERSION:
https://i.imgur.com/RTkwPYd.jpeg



LOGIN / SIGNUP:
https://i.imgur.com/4WtXKe6.jpeg



SETTINGS:
https://i.imgur.com/14M8xUk.jpeg



HISTORY:
https://i.imgur.com/14M8xUk.jpeg



ABOUT:
https://i.imgur.com/CGlFBzi.jpeg



MOOD SELECTION:
https://i.imgur.com/83VtoCm.jpeg



SPLASH SCREEN:
https://i.imgur.com/If17DZh.jpeg



PREMIUM TEXTURE OVERLAY:
https://i.imgur.com/pqAQUkv.jpeg
Overlay subtly on ALL pages as pseudo-element with opacity 0.06–0.12.

==================================================

GLOBAL DESIGN SYSTEM (POINTS 1–3, 15, 17, 21, 22)

In css/app.css:





Define CSS variables for colors, spacing, shadows, radii



Use glass panels, soft borders, subtle gold/teal glow



Calm typography (system fonts only or Google Fonts via in each page):





Poppins for English (optional)



Inter fallback



Smooth, premium feel

GLOBAL ANIMATIONS (must be everywhere):





Breathing background (12s cycle, subtle scale + brightness)



Fade-in on page load (opacity + blur)



Smooth transitions on buttons and cards



Soft hover glows (no aggressive scaling)



Subtle particles layer using CSS (no heavy canvas)

REMOVE BASIC EMOJI DECOR:





No random sparkle emoji as UI decoration.



Use CSS glow and particles instead.

DESKTOP COMFORT MODE:





Add a toggle in settings that adds a class "comfort" to



Comfort mode increases spacing, reduces glow intensity, increases font size slightly



Must persist in localStorage

MOBILE EXPERIENCE:





All layouts responsive



Ensure chat is readable



No overflow issues



Buttons at least 44px height

==================================================

MULTI-PAGE NAVIGATION (POINT 13, 14, 20)

All pages share the same top nav (except splash).
Nav items:





Home



Chat



Mood



About



What AURIA Does



History



Settings

Use a minimal burger menu on mobile.
Use active state highlight.

==================================================

SPLASH INTRO (POINT 8, 10, 14)

pages/splash.html:





Background: SPLASH SCREEN



Center avatar in a glowing circle



Animate "AURIA" text with luxury reveal (shimmer + fade + slight blur to sharp)



Calm subtitle: "A calm space to breathe, talk, and heal."



Auto redirect after 2.5s to index.html



No user click required

==================================================

HOME / HERO (POINT 1, 2, 3, 10, 15, 17)

index.html:





Background MAIN HERO



Glass hero card with:





Animated AURIA title (shimmer)



Short calm paragraph describing AURIA



Buttons:





Start Chat → pages/chat.html



Choose Mood → pages/mood.html



Add “What AURIA can do” highlights as premium cards:





Emotional support



Mood guidance



Reflection prompts



Focus mode



Use soft animations on scroll

==================================================

MOOD SYSTEM (POINT 16, 7)

pages/mood.html:





Background MOOD SELECTION



Allow user to pick a mood:
Sad, Anxious, Calm, Angry, Motivated



Save to localStorage key: auria_mood



After selection show a calm confirmation:
"I’m here with you. Let’s take it slowly."



Button: Go to Chat

Mood affects UI theme:





Change accent color by mood (CSS class on body):
mood-sad, mood-anxious, mood-calm, mood-angry, mood-motivated



Use subtle changes only.

==================================================

CHAT UI (POINT 6, 12, 18, 19, 9, 7)

pages/chat.html:





Background CHAT AREA



On mobile use MOBILE CHAT VERSION background (via media query).



Chat layout:





Header with avatar + AURIA name + small status “Calm companion”



Chat messages area in glass panel



User messages on right



AURIA messages on left with avatar next to every message (always visible)



Typing indicator:





Show 3-dot animation + avatar glow pulse



Welcome message:





If localStorage has user_name, greet by name:
“Welcome back, [Name]. I’m here.”



Otherwise:
“Welcome. I’m here with you.”

FOCUS MODE:





Add button “Focus Mode”



When enabled:





Hide nav/sidebar



Expand chat panel full width



Dim background glow



Persist in localStorage key: auria_focus

CHATBOT LOGIC (frontend prototype):





No real API.



Use a smart scripted flow:





When user sends message, detect mood from localStorage and respond with longer, calm messages.



Replies must NOT be short unless the question is short.



Emojis used subtly depending mood:
sad: 🤍😔
anxious: 🌿🫶
calm: 🌙✨
angry: 🌫️🧘
motivated: 🔥💪



Responses should feel supportive and structured:





validate feelings



short grounding step



2–3 actionable suggestions



gentle follow-up question

==================================================

LOGIN / SIGNUP UI (Point 4, 8, 9)

pages/login.html + pages/signup.html:





Background LOGIN/SIGNUP



Luxury glass card forms (frontend only)



Fields:





Name (on signup)



Email



Password



On submit:





store user_name in localStorage (auria_user_name)



redirect to splash.html then chat.html
No real auth; just UI demo.

==================================================

HISTORY PAGE (Point 5, 11, 20)

pages/history.html:





Background HISTORY



Show a “Conversation history” UI



Store conversations locally (localStorage)



Allow:





view past chats



delete one chat



clear all
Design must be premium.

==================================================

SETTINGS PAGE (Point 5, 21)

pages/settings.html:





Background SETTINGS



Settings toggles:





Comfort Mode (desktop)



Focus Mode default



Sound on/off (UI only)



Switch account (clears localStorage user_name)



Delete account (clears ALL localStorage + returns to signup)



All must work.

==================================================

ABOUT + WHAT AURIA DOES (Point 13, 20)

pages/about.html:





Background ABOUT



Spiritual calm story of AURIA (write it beautifully)



Include avatar and premium cards

pages/what.html:





Clear structured explanation:





What AURIA is



What it can help with



What it is not



Safety note: encourages real help for emergencies

==================================================

EXTRA REQUIREMENTS (Points 11, 15)





Use the Premium Texture Overlay on all pages.



Add subtle animated background particles layer (CSS).



Replace any UI emoji decoration with subtle shapes/glows.



Add small footer on every page: “AURIA — calm companion”.

==================================================

DELIVERABLE

Output the complete contents of all created files:





/workspace/public/index.html



/workspace/public/pages/*.html



/workspace/public/css/app.css



/workspace/public/js/app.js

Do not write explanations.
Just print each file with a clear header and its full content.
Ensure all links between pages work.
Ensure no console errors.
