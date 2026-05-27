export type Question = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

export type SubjectMeta = {
  slug: string;
  title: string;
  shortLabel: string;
  emoji: string;
};

export const SUBJECTS: SubjectMeta[] = [
  { slug: "maths", title: "Maths", shortLabel: "Maths", emoji: "🧮" },
  { slug: "english", title: "English", shortLabel: "English", emoji: "📖" },
  { slug: "physics", title: "Physics", shortLabel: "Physics", emoji: "⚛️" },
  { slug: "chemistry", title: "Chemistry", shortLabel: "Chemistry", emoji: "🧪" },
  { slug: "biology", title: "Biology", shortLabel: "Biology", emoji: "🧬" },
  { slug: "government", title: "Government", shortLabel: "Govt", emoji: "🏛️" },
  { slug: "economics", title: "Economics", shortLabel: "Economics", emoji: "📊" },
  {
    slug: "agricultural_science",
    title: "Agricultural Science",
    shortLabel: "Agri Sci",
    emoji: "🌾" },
  {
    slug: "current_affairs",
    title: "Current Affairs",
    shortLabel: "Current",
    emoji: "📰",
  },
];

const MATHS: Question[] = [
  {
    id: "m1",
    question: "What is 7 + 8 × 2?",
    options: ["30", "23", "15", "22"],
    correctIndex: 1,
    explanation:
      "Multiplication comes before addition: 8 × 2 = 16, then 7 + 16 = 23.",
  },
  {
    id: "m2",
    question: "Solve for x: 2x + 5 = 13",
    options: ["x = 3", "x = 4", "x = 6", "x = 9"],
    correctIndex: 1,
    explanation: "Subtract 5: 2x = 8, then divide by 2: x = 4.",
  },
  {
    id: "m3",
    question: "What is the area of a rectangle 5 cm by 8 cm?",
    options: ["26 cm²", "40 cm²", "13 cm²", "35 cm²"],
    correctIndex: 1,
    explanation: "Area = length × width = 5 × 8 = 40 cm².",
  },
  {
    id: "m4",
    question: "Simplify the fraction 12/18 to lowest terms.",
    options: ["4/6", "2/3", "6/9", "3/4"],
    correctIndex: 1,
    explanation: "Divide numerator and denominator by their GCD, 6: 12÷6 / 18÷6 = 2/3.",
  },
  {
    id: "m5",
    question: "What is 25% of 80?",
    options: ["25", "20", "40", "15"],
    correctIndex: 1,
    explanation: "25% is one quarter: 80 ÷ 4 = 20.",
  },
  {
    id: "m6",
    question: "What is the perimeter of a square with side length 6 cm?",
    options: ["36 cm", "24 cm", "12 cm", "18 cm"],
    correctIndex: 1,
    explanation: "Perimeter of a square = 4 × side = 4 × 6 = 24 cm.",
  },
  {
    id: "m7",
    question: "Which number is prime?",
    options: ["9", "15", "13", "21"],
    correctIndex: 2,
    explanation: "13 has exactly two factors (1 and 13). The others are composite.",
  },
  {
    id: "m8",
    question: "What is ∛27 (cube root of 27)?",
    options: ["9", "6", "3", "4"],
    correctIndex: 2,
    explanation: "3 × 3 × 3 = 27, so the cube root of 27 is 3.",
  },
  {
    id: "m9",
    question: "Round 4.678 to two decimal places.",
    options: ["4.67", "4.68", "4.7", "4.66"],
    correctIndex: 1,
    explanation: "The third digit is 8 (≥5), so round the hundredths digit up: 4.68.",
  },
  {
    id: "m10",
    question: "What is the slope of a horizontal line?",
    options: ["1", "Undefined", "0", "−1"],
    correctIndex: 2,
    explanation: "A horizontal line has no rise, so slope = rise/run = 0.",
  },
];

const ENGLISH: Question[] = [
  {
    id: "e1",
    question: "Choose the sentence with correct subject–verb agreement.",
    options: [
      "The team are winning.",
      "The team is winning.",
      "The team were winning.",
      "The team be winning.",
    ],
    correctIndex: 1,
    explanation:
      "Collective nouns like 'team' often take a singular verb in standard usage.",
  },
  {
    id: "e2",
    question: "Which word is a synonym for 'brief'?",
    options: ["Lengthy", "Concise", "Verbose", "Tedious"],
    correctIndex: 1,
    explanation: "'Concise' means short and clear, like 'brief'.",
  },
  {
    id: "e3",
    question: "Identify the figure of speech: 'The wind whispered through the trees.'",
    options: ["Simile", "Metaphor", "Personification", "Hyperbole"],
    correctIndex: 2,
    explanation: "The wind is given a human action (whispering), so it is personification.",
  },
  {
    id: "e4",
    question: "Which sentence uses 'their' correctly?",
    options: [
      "Their going to the park.",
      "The students lost there books.",
      "Their project won first place.",
      "I saw them over their.",
    ],
    correctIndex: 2,
    explanation: "'Their' is the possessive pronoun; 'there' and 'they're' are different words.",
  },
  {
    id: "e5",
    question: "What is the past participle of 'write'?",
    options: ["Wrote", "Writing", "Written", "Writed"],
    correctIndex: 2,
    explanation: "The past participle is 'written' (e.g. 'has written').",
  },
  {
    id: "e6",
    question: "Which word is an adverb in: 'She sang beautifully.'?",
    options: ["She", "Sang", "Beautifully", "None"],
    correctIndex: 2,
    explanation: "'Beautifully' describes how she sang, so it is an adverb.",
  },
  {
    id: "e7",
    question: "A paragraph that introduces the main idea of an essay is often called the ___ paragraph.",
    options: ["Concluding", "Body", "Introductory", "Transitional"],
    correctIndex: 2,
    explanation: "The opening paragraph sets up the topic and thesis.",
  },
  {
    id: "e8",
    question: "Choose the correctly punctuated sentence.",
    options: [
      "Its a beautiful day.",
      "It's a beautiful day.",
      "Its' a beautiful day.",
      "It,s a beautiful day.",
    ],
    correctIndex: 1,
    explanation: "'It's' means 'it is'; 'its' shows possession (no apostrophe).",
  },
  {
    id: "e9",
    question: "Which is a compound sentence?",
    options: [
      "Running fast.",
      "She studied hard, and she passed.",
      "Because it rained.",
      "The tall building.",
    ],
    correctIndex: 1,
    explanation: "Two independent clauses joined by a coordinating conjunction form a compound sentence.",
  },
  {
    id: "e10",
    question: "The opposite of 'opaque' is closest to:",
    options: ["Dark", "Translucent", "Transparent", "Heavy"],
    correctIndex: 2,
    explanation: "'Opaque' blocks light; 'transparent' lets light pass through clearly.",
  },
];

const PHYSICS: Question[] = [
  {
    id: "p1",
    question: "What is the SI unit of force?",
    options: ["Joule", "Newton", "Watt", "Pascal"],
    correctIndex: 1,
    explanation: "Force is measured in newtons (N), named after Isaac Newton.",
  },
  {
    id: "p2",
    question: "Speed is defined as:",
    options: [
      "Mass × acceleration",
      "Distance ÷ time",
      "Force × distance",
      "Energy ÷ time",
    ],
    correctIndex: 1,
    explanation: "Average speed = total distance travelled divided by time taken.",
  },
  {
    id: "p3",
    question: "Which type of wave requires a medium to travel?",
    options: ["Light", "Radio (in vacuum)", "Sound", "X-rays"],
    correctIndex: 2,
    explanation: "Sound is a mechanical wave and needs a material medium; EM waves do not.",
  },
  {
    id: "p4",
    question: "Ohm's law relates voltage V, current I, and resistance R as:",
    options: ["V = I + R", "V = I × R", "V = I / R", "V = R / I"],
    correctIndex: 1,
    explanation: "Voltage (volts) equals current (amps) times resistance (ohms).",
  },
  {
    id: "p5",
    question: "Acceleration due to gravity on Earth is about:",
    options: ["9.8 m/s² downward", "9.8 m/s downward", "9.8 N", "98 m/s²"],
    correctIndex: 0,
    explanation: "Near Earth's surface, g ≈ 9.8 m/s² toward the centre of the Earth.",
  },
  {
    id: "p6",
    question: "Which quantity is scalar?",
    options: ["Velocity", "Displacement", "Speed", "Force"],
    correctIndex: 2,
    explanation: "Speed has magnitude only; velocity and displacement have direction.",
  },
  {
    id: "p7",
    question: "The law of reflection states that the angle of incidence equals:",
    options: [
      "The angle of refraction",
      "The angle of reflection",
      "90°",
      "0°",
    ],
    correctIndex: 1,
    explanation: "Angles are measured from the normal; incidence and reflection angles are equal.",
  },
  {
    id: "p8",
    question: "Power is the rate of doing work. Its SI unit is:",
    options: ["Newton", "Joule", "Watt", "Ampere"],
    correctIndex: 2,
    explanation: "One watt equals one joule per second.",
  },
  {
    id: "p9",
    question: "In a series circuit, the current is:",
    options: [
      "Different in each component",
      "The same everywhere",
      "Zero",
      "Only in the battery",
    ],
    correctIndex: 1,
    explanation: "There is a single path, so the same current flows through each component.",
  },
  {
    id: "p10",
    question: "Which particle has a negative charge?",
    options: ["Proton", "Neutron", "Electron", "Nucleus"],
    correctIndex: 2,
    explanation: "Electrons carry a negative charge; protons are positive; neutrons are neutral.",
  },
];

const CHEMISTRY: Question[] = [
  {
    id: "c1",
    question: "Water has the chemical formula:",
    options: ["CO₂", "H₂O", "NaCl", "O₂"],
    correctIndex: 1,
    explanation: "Two hydrogen atoms and one oxygen atom form a water molecule.",
  },
  {
    id: "c2",
    question: "What is the pH of a neutral solution at 25°C?",
    options: ["0", "7", "14", "1"],
    correctIndex: 1,
    explanation: "pH 7 is neutral; below 7 is acidic, above 7 is basic.",
  },
  {
    id: "c3",
    question: "Which gas makes up most of Earth's atmosphere?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    correctIndex: 2,
    explanation: "Dry air is roughly 78% nitrogen and 21% oxygen by volume.",
  },
  {
    id: "c4",
    question: "An acid turns blue litmus paper:",
    options: ["Blue", "Green", "Red", "Yellow"],
    correctIndex: 2,
    explanation: "Acids turn blue litmus red; bases turn red litmus blue.",
  },
  {
    id: "c5",
    question: "What type of bond involves sharing electron pairs?",
    options: ["Ionic", "Covalent", "Metallic", "Hydrogen"],
    correctIndex: 1,
    explanation: "Covalent bonding involves shared electrons between atoms.",
  },
  {
    id: "c6",
    question: "The smallest unit of an element that retains its properties is:",
    options: ["Molecule", "Atom", "Compound", "Mixture"],
    correctIndex: 1,
    explanation: "An atom is the basic unit of a chemical element.",
  },
  {
    id: "c7",
    question: "Which process is exothermic?",
    options: [
      "Melting ice",
      "Boiling water",
      "Burning fuel",
      "Evaporation",
    ],
    correctIndex: 2,
    explanation: "Combustion releases heat to the surroundings (exothermic).",
  },
  {
    id: "c8",
    question: "Avogadro's number is approximately:",
    options: ["6.02 × 10²³", "3.14", "9.8", "10⁶"],
    correctIndex: 0,
    explanation: "One mole contains about 6.02 × 10²³ particles.",
  },
  {
    id: "c9",
    question: "Isotopes of an element differ in:",
    options: [
      "Number of protons",
      "Number of electrons",
      "Number of neutrons",
      "Atomic number",
    ],
    correctIndex: 2,
    explanation: "Isotopes have the same atomic number but different mass numbers (neutrons).",
  },
  {
    id: "c10",
    question: "A catalyst speeds up a reaction by:",
    options: [
      "Being consumed",
      "Lowering activation energy",
      "Removing products",
      "Increasing temperature only",
    ],
    correctIndex: 1,
    explanation: "Catalysts provide an alternative pathway with lower activation energy.",
  },
];

const BIOLOGY: Question[] = [
  {
    id: "b1",
    question: "Which organelle is the main site of aerobic respiration?",
    options: ["Nucleus", "Mitochondrion", "Ribosome", "Golgi body"],
    correctIndex: 1,
    explanation: "Mitochondria produce ATP using oxygen in eukaryotic cells.",
  },
  {
    id: "b2",
    question: "Photosynthesis primarily occurs in:",
    options: ["Roots", "Stem", "Chloroplasts", "Vacuoles"],
    correctIndex: 2,
    explanation: "Chloroplasts contain chlorophyll and carry out photosynthesis.",
  },
  {
    id: "b3",
    question: "DNA stands for:",
    options: [
      "Dynamic nucleic acid",
      "Deoxyribonucleic acid",
      "Diribose nucleic acid",
      "Double nitrogen acid",
    ],
    correctIndex: 1,
    explanation: "DNA is deoxyribonucleic acid, the hereditary material in most organisms.",
  },
  {
    id: "b4",
    question: "Which blood cells help clotting?",
    options: ["Red blood cells", "Platelets", "Plasma", "Neutrophils only"],
    correctIndex: 1,
    explanation: "Platelets (thrombocytes) are essential for clot formation.",
  },
  {
    id: "b5",
    question: "The basic unit of life is:",
    options: ["Tissue", "Organ", "Cell", "Atom"],
    correctIndex: 2,
    explanation: "Cells are the smallest structural units that perform life's functions.",
  },
  {
    id: "b6",
    question: "Which process do plants use to lose water vapour through leaves?",
    options: ["Respiration", "Transpiration", "Fermentation", "Digestion"],
    correctIndex: 1,
    explanation: "Transpiration is evaporation of water from aerial plant parts.",
  },
  {
    id: "b7",
    question: "An organism that makes its own food is a:",
    options: ["Consumer", "Decomposer", "Producer", "Parasite"],
    correctIndex: 2,
    explanation: "Producers (e.g. plants) synthesise organic matter, often via photosynthesis.",
  },
  {
    id: "b8",
    question: "Which vitamin is produced in human skin with sunlight?",
    options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
    correctIndex: 2,
    explanation: "UVB exposure helps synthesise vitamin D from precursors in the skin.",
  },
  {
    id: "b9",
    question: "Meiosis produces:",
    options: [
      "Identical diploid cells",
      "Haploid gametes",
      "Only body cells",
      "Clones only",
    ],
    correctIndex: 1,
    explanation: "Meiosis halves chromosome number, producing haploid cells for sexual reproduction.",
  },
  {
    id: "b10",
    question: "The human heart has how many chambers?",
    options: ["Two", "Three", "Four", "Five"],
    correctIndex: 2,
    explanation: "Two atria and two ventricles — four chambers in total.",
  },
];

const GOVERNMENT: Question[] = [
  {
    id: "g1",
    question: "Separation of powers typically divides government into:",
    options: [
      "Army, police, courts",
      "Federal, state, local",
      "Legislative, executive, judicial",
      "Public, private, civic",
    ],
    correctIndex: 2,
    explanation: "Montesquieu's model separates law-making, enforcement, and adjudication.",
  },
  {
    id: "g2",
    question: "A constitution is best described as:",
    options: [
      "Only traditions",
      "The supreme law framing government",
      "A political party manifesto",
      "International treaty only",
    ],
    correctIndex: 1,
    explanation: "A constitution establishes structures, powers, and limits of government.",
  },
  {
    id: "g3",
    question: "Universal adult suffrage means:",
    options: [
      "Only landowners vote",
      "All adult citizens can vote (subject to law)",
      "Only men vote",
      "Judges elect the president",
    ],
    correctIndex: 1,
    explanation: "Qualified adults have the right to vote without property tests, etc.",
  },
  {
    id: "g4",
    question: "Which is a feature of federalism?",
    options: [
      "Only one level of government",
      "Division of powers between tiers",
      "No written constitution",
      "Unlimited central power only",
    ],
    correctIndex: 1,
    explanation: "Federal systems share sovereignty between national and regional governments.",
  },
  {
    id: "g5",
    question: "The rule of law implies:",
    options: [
      "Leaders are above the law",
      "Laws apply equally and fairly",
      "Only courts make policy",
      "No need for courts",
    ],
    correctIndex: 1,
    explanation: "Government and citizens are bound by clear, predictable legal rules.",
  },
  {
    id: "g6",
    question: "Civil rights mainly protect individuals from:",
    options: [
      "Private companies only",
      "Unjust treatment by the state",
      "Paying taxes",
      "Casting a vote",
    ],
    correctIndex: 1,
    explanation: "Civil rights limit government overreach and secure equal treatment under law.",
  },
  {
    id: "g7",
    question: "A referendum is:",
    options: [
      "A court trial",
      "A direct vote by the people on an issue",
      "A military coup",
      "A census",
    ],
    correctIndex: 1,
    explanation: "Electors decide a specific proposal, often constitutional.",
  },
  {
    id: "g8",
    question: "An independent judiciary helps ensure:",
    options: [
      "Party control of courts",
      "Impartial dispute resolution",
      "No laws",
      "Executive law-making only",
    ],
    correctIndex: 1,
    explanation: "Judges decide cases according to law, not political commands.",
  },
  {
    id: "g9",
    question: "Pressure groups differ from political parties mainly because they:",
    options: [
      "Always form government",
      "Seek broad executive power",
      "Focus on specific interests or causes",
      "Never lobby",
    ],
    correctIndex: 2,
    explanation: "Pressure groups advocate on particular issues; parties contest elections broadly.",
  },
  {
    id: "g10",
    question: "Sovereignty refers to:",
    options: [
      "Local customs only",
      "Supreme authority within a territory",
      "Private property",
      "Diplomatic immunity only",
    ],
    correctIndex: 1,
    explanation: "A sovereign state has the final say over its affairs.",
  },
];

const ECONOMICS: Question[] = [
  {
    id: "ec1",
    question: "Scarcity in economics means:",
    options: [
      "Unlimited resources",
      "Wants exceed available resources",
      "No trade",
      "Only rich countries face choices",
    ],
    correctIndex: 1,
    explanation: "Scarcity forces choice because we cannot have everything we want.",
  },
  {
    id: "ec2",
    question: "Opportunity cost is:",
    options: [
      "Total money spent",
      "The next-best alternative given up",
      "Accounting profit",
      "Tax paid",
    ],
    correctIndex: 1,
    explanation: "Choosing one option means forgoing the value of the best alternative.",
  },
  {
    id: "ec3",
    question: "Demand curves usually slope downward because:",
    options: [
      "Higher price raises quantity demanded",
      "Lower price raises quantity demanded",
      "Supply fixes demand",
      "Government sets all prices",
    ],
    correctIndex: 1,
    explanation: "People tend to buy more at lower prices (law of demand, ceteris paribus).",
  },
  {
    id: "ec4",
    question: "GDP measures:",
    options: [
      "Only exports",
      "Total value of goods and services produced in a period",
      "Government debt only",
      "Stock market prices",
    ],
    correctIndex: 1,
    explanation: "GDP is a broad indicator of domestic production over a time span.",
  },
  {
    id: "ec5",
    question: "Inflation is a sustained increase in:",
    options: [
      "Unemployment only",
      "The general price level",
      "Interest rates only",
      "Exports only",
    ],
    correctIndex: 1,
    explanation: "Inflation means money buys less on average over time.",
  },
  {
    id: "ec6",
    question: "A progressive tax takes:",
    options: [
      "The same percentage from everyone",
      "A larger share from higher incomes",
      "Only from companies",
      "Nothing from the rich",
    ],
    correctIndex: 1,
    explanation: "Marginal rates rise with income in a progressive system.",
  },
  {
    id: "ec7",
    question: "The foreign exchange rate is:",
    options: [
      "Domestic inflation",
      "Price of one currency in terms of another",
      "GDP growth",
      "Tax on imports only",
    ],
    correctIndex: 1,
    explanation: "It tells how much of currency B one unit of currency A buys.",
  },
  {
    id: "ec8",
    question: "A monopoly is a market with:",
    options: [
      "Many small sellers",
      "One dominant seller",
      "Perfect information only",
      "No barriers to entry",
    ],
    correctIndex: 1,
    explanation: "A single seller (or tight cartel) faces the market demand curve.",
  },
  {
    id: "ec9",
    question: "Fiscal policy uses mainly:",
    options: [
      "Money supply only",
      "Government spending and taxation",
      "Exchange controls only",
      "Patents only",
    ],
    correctIndex: 1,
    explanation: "Budget decisions influence aggregate demand and distribution.",
  },
  {
    id: "ec10",
    question: "Elastic demand means quantity demanded is:",
    options: [
      "Unresponsive to price",
      "Highly responsive to price",
      "Fixed forever",
      "Equal to supply always",
    ],
    correctIndex: 1,
    explanation: "Elasticity > 1 (in absolute value) implies a sensitive response to price changes.",
  },
];

const AGRICULTURAL: Question[] = [
  {
    id: "a1",
    question: "Nitrogen-fixing bacteria in legume nodules help crops by:",
    options: [
      "Removing water",
      "Converting atmospheric N₂ into usable nitrogen",
      "Killing all pests",
      "Increasing soil salinity",
    ],
    correctIndex: 1,
    explanation: "Rhizobia symbiosis supplies nitrogen that supports plant protein synthesis.",
  },
  {
    id: "a2",
    question: "Crop rotation mainly helps to:",
    options: [
      "Eliminate weather",
      "Maintain soil fertility and reduce pests",
      "Remove all weeds forever",
      "Stop photosynthesis",
    ],
    correctIndex: 1,
    explanation: "Different crops use and replenish nutrients differently and break pest cycles.",
  },
  {
    id: "a3",
    question: "Organic matter in soil improves:",
    options: [
      "Only colour",
      "Structure, water retention, and nutrient supply",
      "Only sand content",
      "Nothing",
    ],
    correctIndex: 1,
    explanation: "Humus enhances tilth, moisture holding capacity, and microbial activity.",
  },
  {
    id: "a4",
    question: "Photosynthesis produces glucose and:",
    options: ["Nitrogen", "Oxygen", "Methane", "Ammonia"],
    correctIndex: 1,
    explanation: "Plants release oxygen as a by-product when splitting water in the light reactions.",
  },
  {
    id: "a5",
    question: "A herbicide is used to control:",
    options: ["Fungi", "Weeds", "Viruses", "Rodents only"],
    correctIndex: 1,
    explanation: "Herbicides target unwanted plants.",
  },
  {
    id: "a6",
    question: "Germination requires suitable:",
    options: [
      "Only darkness",
      "Temperature, moisture, and often oxygen",
      "Salt only",
      "Wind only",
    ],
    correctIndex: 1,
    explanation: "Seeds imbibed water and respire; temperature windows vary by species.",
  },
  {
    id: "a7",
    question: "Overgrazing can lead to:",
    options: [
      "Soil conservation",
      "Erosion and pasture degradation",
      "Automatic reforestation",
      "Higher groundwater always",
    ],
    correctIndex: 1,
    explanation: "Vegetation loss exposes soil to wind and water erosion.",
  },
  {
    id: "a8",
    question: "Composting converts organic waste into:",
    options: [
      "Plastic",
      "Stabilised humus-like material for soil",
      "Pure sand",
      "Rock only",
    ],
    correctIndex: 1,
    explanation: "Microbial decomposition yields a soil amendment rich in organic matter.",
  },
  {
    id: "a9",
    question: "Irrigation scheduling aims to:",
    options: [
      "Flood fields randomly",
      "Match water application to crop need and soil moisture",
      "Remove all fertiliser",
      "Stop root growth",
    ],
    correctIndex: 1,
    explanation: "Efficient irrigation reduces waste and salinity risk while meeting ET demand.",
  },
  {
    id: "a10",
    question: "Integrated pest management (IPM) emphasises:",
    options: [
      "Only chemical sprays",
      "Combining cultural, biological, and targeted chemical control",
      "Ignoring thresholds",
      "Eliminating all insects",
    ],
    correctIndex: 1,
    explanation: "IPM uses monitoring and multiple tactics to reduce economic and environmental harm.",
  },
];

const CURRENT_AFFAIRS: Question[] = [
  {
    id: "ca1",
    question: "Who was the first President of Nigeria?",
    options: ["Nnamdi Azikiwe", "Obafemi Awolowo", "Tafawa Balewa", "Shehu Shagari"],
    correctIndex: 0,
    explanation: "Dr. Nnamdi Azikiwe served as the first President of Nigeria from 1963 to 1966.",
  },
  {
    id: "ca2",
    question: "Which city is the current capital of Nigeria?",
    options: ["Lagos", "Kano", "Abuja", "Ibadan"],
    correctIndex: 2,
    explanation: "Abuja officially became Nigeria's capital on December 12, 1991.",
  },
  {
    id: "ca3",
    question: "What is the official currency of Nigeria?",
    options: ["Dollar", "Cedi", "Naira", "Pound"],
    correctIndex: 2,
    explanation: "The Naira is the currency of Nigeria, introduced in 1973.",
  },
  {
    id: "ca4",
    question: "Nigeria gained independence from which country?",
    options: ["France", "USA", "United Kingdom", "Portugal"],
    correctIndex: 2,
    explanation: "Nigeria gained independence from the United Kingdom on October 1, 1960.",
  },
  {
    id: "ca5",
    question: "How many states are in Nigeria?",
    options: ["30", "36", "42", "25"],
    correctIndex: 1,
    explanation: "Nigeria is a federation of 36 states and 1 Federal Capital Territory.",
  },
  {
    id: "ca6",
    question: "Which of these is the largest river in Nigeria?",
    options: ["River Benue", "River Niger", "River Cross", "River Ogun"],
    correctIndex: 1,
    explanation: "The River Niger is the longest and largest river in Nigeria.",
  },
  {
    id: "ca7",
    question: "What does the green color on the Nigerian flag represent?",
    options: ["Peace", "Agriculture", "Unity", "Strength"],
    correctIndex: 1,
    explanation: "The green bands represent Nigeria's natural wealth and agriculture.",
  },
  {
    id: "ca8",
    question: "Who is the 'Father of Nigerian Nationalism'?",
    options: ["Herbert Macaulay", "Nnamdi Azikiwe", "Obafemi Awolowo", "Ahmadu Bello"],
    correctIndex: 0,
    explanation: "Herbert Macaulay is often referred to as the founder of Nigerian nationalism.",
  },
  {
    id: "ca9",
    question: "What is the highest peak in Nigeria?",
    options: ["Mount Patti", "Chappal Waddi", "Zuma Rock", "Olumo Rock"],
    correctIndex: 1,
    explanation: "Chappal Waddi (Gangirwal) is the highest point in Nigeria at 2,419m.",
  },
  {
    id: "ca10",
    question: "Which Nigerian won the Nobel Prize in Literature?",
    options: ["Chinua Achebe", "Wole Soyinka", "Chimamanda Ngozi Adichie", "Ben Okri"],
    correctIndex: 1,
    explanation: "Wole Soyinka won the Nobel Prize in Literature in 1986.",
  },
];

export const QUESTIONS_BY_SLUG: Record<string, Question[]> = {
  maths: MATHS,
  english: ENGLISH,
  physics: PHYSICS,
  chemistry: CHEMISTRY,
  biology: BIOLOGY,
  government: GOVERNMENT,
  economics: ECONOMICS,
  agricultural_science: AGRICULTURAL,
  current_affairs: CURRENT_AFFAIRS,
};

function shuffleArray<T>(array: T[]): T[] { 
  const arr = [...array]; 
  for (let i = arr.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [arr[i], arr[j]] = [arr[j], arr[i]]; 
  } 
  return arr; 
} 

export function getQuestionsForSubject(slug: string, shuffle = true): Question[] | null { 
  const list = QUESTIONS_BY_SLUG[slug]; 
  if (!list) return null; 
  return shuffle ? shuffleArray(list) : [...list]; 
} 

export function getSubjectMeta(slug: string): SubjectMeta | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}
