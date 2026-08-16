// Real photographs sourced from Unsplash (free, legitimate web source)
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export type Plant = {
  id: string;
  name: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  image: string;
  description: string;
  light: string;
  water: string;

  sizes: {
    cover: string;
    price: number;
  }[];
};

export const PLANTS: Plant[] = [
  {
    id: "eugenia",
    name: "Eugenia",
    category: "Decorative",
    difficulty: "Easy",
    image: "eugenia.jpg",
    description:
      "An elegant ornamental shrub perfect for topiary, hedging and decorative landscaping. Glossy evergreen foliage.",
    light: "Full to Partial Sun",
    water: "Weekly",
    sizes: [
  {
    cover: "8×10",
    price: 350,
  },
  {
    cover: "10×10",
    price: 450,
  },
  {
    cover: "15×16",
    price: 200,
  },
]
  },
  {
    id: "aralia",
    name: "Ball Aralia",
    category: "Decorative",
    difficulty: "Medium",
    image: "ballaralia.JPG",
    description:
      "Lush rounded foliage that brings a sculptural touch to indoor and patio spaces.",
    light: "Bright Indirect",
    water: "Alternate Days",
    sizes: [
  {
    cover: "8×10",
    price: 350,
  },
  {
    cover: "10×10",
    price: 450,
  },
  {
    cover: "15×16",
    price: 700,
  },
]
  },
  {
    id: "jaboticaba",
    name: "Jaboticaba",
    category: "Fruit",
    difficulty: "Medium",
    image: "IM0.jpg",
    description:
      "The Brazilian grape tree — sweet, aromatic fruits grow directly on the trunk. A true conversation piece.",
    light: "Full Sun",
    water: "Weekly",
    sizes: [
  {
    cover: "8×10",
    price: 350,
  },
  {
    cover: "10×10",
    price: 450,
  },
  {
    cover: "15×16",
    price: 700,
  },
]
  },
  {
    id: "rambutan",
    name: "Rambutan",
    category: "Fruit",
    difficulty: "Medium",
    image: "ram.jpg",
    description:
      "Tropical favourite with hairy red fruit and a juicy, lychee-like interior. Thrives in Kerala's climate.",
    light: "Full Sun",
    water: "Alternate Days",
    sizes: [
  {
    cover: "8×10",
    price: 150,
  },
  {
    cover: "10×10",
    price: 450,
  },
  {
    cover: "15×16",
    price: 700,
  },
]
  },
  {
    id: "jackfruit",
    name: "Jackfruit",
    category: "Fruit",
    difficulty: "Easy",
    image:"Jackfruit.jpg",
    description:
      "Kerala's classic. Hardy, prolific, and rewarding with the world's largest tree fruit.",
    light: "Full Sun",
    water: "Weekly",
    sizes: [
  {
    cover: "8×10",
    price: 350,
  },
  {
    cover: "10×10",
    price: 450,
  },
  {
    cover: "15×16",
    price: 700,
  },
]
  },
  {
    id: "mangosteen",
    name: "Mangosteen",
    category: "Fruit",
    difficulty: "Hard",
    image: "Mangosteen.jpg",
    description:
      "The 'Queen of Fruits' — slow-growing but unmatched in flavour and elegance.",
    light: "Partial Sun",
    water: "Daily",
    sizes: [
  {
    cover: "8×10",
    price: 150,
  },
  {
    cover: "10×10",
    price: 450,
  },
  {
    cover: "15×16",
    price: 700,
  },
]
  },
];
export function Newsletter() {
  return null;
}
export const CATEGORIES = [
  { name: "Decorative Plants", count: 48, image: "/20221229104026_CRGK6645.JPG" },
  { name: "Office Plants", count: 32, image: "/Office.jpg"},
  { name: "Fruit Plants", count: 64, image: "/abiu.jpg" },
  { name: "Indoor Plants", count: 86, image: "/indoor.jpg" },
  { name: "Outdoor Plants", count: 52, image: "/20221229102104_CRGK6563.JPG" },
  { name: "Flowering Plants", count: 41, image: "/SundayMonday.jpg" },
];

export const HERO_SLIDES = [
  u("1466692476868-aef1dfb1e735", 1800),
  u("1416879595882-3373a0480b5b", 1800),
  u("1518531933037-91b2f5f229cc", 1800),
];

export const GALLERY = [
  { src:"/ram.jpg", cat: "Fruit", h: "tall" },
  { src:"/Mangosteen.jpg" , cat: "Fruit", h: "short" },
  { src:"/Jackfruit.jpg" , cat: "Fruit", h: "tall" },
  { src:"/IMG_20221229_105109.jpg" , cat: "Fruit", h: "short" },
  { src:"/IM0.jpg" , cat: "Fruit", h: "tall" },
  { src:"/eugenia.jpg" , cat: "outdoor", h: "tall" },
  { src:"/ballaralia.JPG" , cat: "Outdoor", h: "short" },
  { src:"/abiu.jpg" , cat: "Fruit", h: "short" },
  { src:"/20221229104026_CRGK6645.JPG" , cat: "Outdoor", h: "tall" },
  { src:"/20221229102104_CRGK6563.JPG" , cat: "Outdoor", h: "tall" },

];

export const TESTIMONIALS = [
  {
    name: "Priya Menon",
    avatar: u("1494790108377-be9c29b29330", 200),
    rating: 5,
    text: "Chandra Gardens transformed my balcony into a tropical retreat. The plants arrived healthy and the advice was priceless.",
  },
  {
    name: "Arjun Nair",
    avatar: u("1500648767791-00dcc994a43e", 200),
    rating: 5,
    text: "Bought a Jaboticaba sapling and it's thriving. The team genuinely knows their plants — best nursery in Kerala.",
  },
  {
    name: "Lakshmi Pillai",
    avatar: u("1438761681033-6461ffad8d80", 200),
    rating: 5,
    text: "Fast delivery, premium quality, and the packaging was thoughtful. My fruit garden has never looked better.",
  },
  {
    name: "Rahul Krishnan",
    avatar: u("1472099645785-5658abf4ff4e", 200),
    rating: 5,
    text: "Their wholesale support for our landscaping project was exceptional. Truly a partner, not just a supplier.",
  },
];
