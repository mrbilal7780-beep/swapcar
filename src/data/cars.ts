import carBmw from "@/assets/car-bmw.jpg";
import carAudi from "@/assets/car-audi.jpg";
import carMercedes from "@/assets/car-mercedes.jpg";
import carPorsche from "@/assets/car-porsche.jpg";
import carTesla from "@/assets/car-tesla.jpg";
import carVw from "@/assets/car-vw.jpg";

export type Car = {
  id: string;
  brand: string;
  model: string;
  generation: string;
  year: number;
  mileage: number;
  fuel: "Essence" | "Diesel" | "Hybride" | "Électrique";
  transmission: "Manuelle" | "Automatique";
  color: string;
  price: number;
  city: string;
  distance: number;
  image: string;
  owner: string;
  ownerScore: number;
  scores: { body: number; interior: number; mechanical: number; confidence: number };
};

export const CARS: Car[] = [
  {
    id: "1", brand: "BMW", model: "M340i", generation: "G20", year: 2021, mileage: 72000,
    fuel: "Essence", transmission: "Automatique", color: "Bleu", price: 28500,
    city: "Paris", distance: 12, image: carBmw, owner: "Alexandre M.", ownerScore: 92,
    scores: { body: 94, interior: 91, mechanical: 89, confidence: 95 },
  },
  {
    id: "2", brand: "Audi", model: "S4", generation: "B9", year: 2020, mileage: 65000,
    fuel: "Essence", transmission: "Automatique", color: "Noir", price: 27250,
    city: "Lyon", distance: 38, image: carAudi, owner: "Julien R.", ownerScore: 88,
    scores: { body: 90, interior: 93, mechanical: 92, confidence: 94 },
  },
  {
    id: "3", brand: "Mercedes", model: "Classe C 300", generation: "W205", year: 2019, mileage: 88000,
    fuel: "Hybride", transmission: "Automatique", color: "Blanc", price: 24900,
    city: "Bordeaux", distance: 65, image: carMercedes, owner: "Sophie L.", ownerScore: 95,
    scores: { body: 88, interior: 90, mechanical: 87, confidence: 92 },
  },
  {
    id: "4", brand: "Porsche", model: "911 Carrera", generation: "991.2", year: 2018, mileage: 42000,
    fuel: "Essence", transmission: "Automatique", color: "Rouge", price: 78500,
    city: "Nice", distance: 120, image: carPorsche, owner: "Vincent D.", ownerScore: 97,
    scores: { body: 96, interior: 95, mechanical: 96, confidence: 98 },
  },
  {
    id: "5", brand: "Tesla", model: "Model 3 Performance", generation: "2021", year: 2021, mileage: 54000,
    fuel: "Électrique", transmission: "Automatique", color: "Gris", price: 35900,
    city: "Marseille", distance: 89, image: carTesla, owner: "Marc T.", ownerScore: 91,
    scores: { body: 92, interior: 89, mechanical: 95, confidence: 96 },
  },
  {
    id: "6", brand: "Volkswagen", model: "Golf 8 GTI", generation: "Mk8", year: 2022, mileage: 28000,
    fuel: "Essence", transmission: "Manuelle", color: "Bleu", price: 32500,
    city: "Lille", distance: 45, image: carVw, owner: "Thomas B.", ownerScore: 86,
    scores: { body: 95, interior: 93, mechanical: 94, confidence: 95 },
  },
];

export const BRANDS: Record<string, { models: Record<string, string[]> }> = {
  BMW: { models: { "Série 1": ["F40", "F20"], "Série 3": ["G20", "F30"], "Série 5": ["G30"], X1: ["U11"], X3: ["G01"], X5: ["G05"] } },
  Audi: { models: { A1: ["GB"], A3: ["8Y"], A4: ["B9"], A6: ["C8"], Q3: ["F3"], Q5: ["FY"] } },
  Mercedes: { models: { "Classe A": ["W177"], "Classe C": ["W205", "W206"], "Classe E": ["W213"], GLC: ["X253"], GLE: ["V167"] } },
  Volkswagen: { models: { Golf: ["Mk7", "Mk8"], Polo: ["AW"], Passat: ["B8"], Tiguan: ["AD1"] } },
  Porsche: { models: { "911": ["991.2", "992"], Cayenne: ["E3"], Macan: ["95B"] } },
  Tesla: { models: { "Model 3": ["2021"], "Model Y": ["2022"], "Model S": ["Plaid"] } },
};

export function findCar(id: string) {
  return CARS.find((c) => c.id === id);
}

export function matchScore(a: Car, b: Car) {
  const valDiff = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
  const valScore = Math.max(0, 100 - valDiff * 200);
  const distScore = Math.max(0, 100 - b.distance);
  const yearScore = 100 - Math.abs(a.year - b.year) * 5;
  return Math.round(valScore * 0.5 + distScore * 0.25 + yearScore * 0.25);
}