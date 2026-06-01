// Predefined automotive specs catalog used in /add-vehicle and filters.
// Keep these lists curated rather than free-text so listings stay clean.

export const FUELS = ["Essence", "Diesel", "Hybride", "Hybride Rechargeable", "Électrique", "GPL", "Éthanol"] as const;
export const TRANSMISSIONS = ["Manuelle", "Automatique", "Semi-automatique", "DSG/DCT"] as const;
export const BODY_TYPES = ["Berline", "Break", "Coupé", "Cabriolet", "SUV", "Crossover", "Citadine", "Compacte", "Monospace", "Pickup", "Utilitaire"] as const;
export const DRIVETRAINS = ["Traction (avant)", "Propulsion (arrière)", "4 roues motrices (AWD)", "4x4 intégral"] as const;
export const COLORS = ["Noir", "Blanc", "Gris", "Argent", "Bleu", "Rouge", "Vert", "Jaune", "Orange", "Marron", "Beige", "Violet"] as const;
export const CONDITIONS = ["Neuf", "Excellent", "Très bon", "Bon", "À rénover"] as const;

// Brand → models catalog (curated subset, expandable).
export const BRAND_MODELS: Record<string, string[]> = {
  "BMW": ["Série 1", "Série 2", "Série 3", "Série 4", "Série 5", "Série 7", "M2", "M3", "M340i", "M4", "M5", "X1", "X3", "X5", "X6", "i4", "iX"],
  "Audi": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "S3", "S4", "S5", "RS3", "RS6", "e-tron"],
  "Mercedes": ["Classe A", "Classe B", "Classe C", "Classe E", "Classe S", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "AMG GT", "EQE", "EQS"],
  "Volkswagen": ["Polo", "Golf", "Golf GTI", "Golf R", "Passat", "Arteon", "T-Roc", "Tiguan", "Touareg", "ID.3", "ID.4"],
  "Porsche": ["911", "718 Cayman", "718 Boxster", "Taycan", "Panamera", "Macan", "Cayenne"],
  "Tesla": ["Model 3", "Model Y", "Model S", "Model X"],
  "Renault": ["Clio", "Captur", "Megane", "Scenic", "Kadjar", "Arkana", "Espace", "Talisman", "Megane E-Tech"],
  "Peugeot": ["208", "2008", "308", "3008", "408", "508", "5008", "Rifter"],
  "Citroën": ["C3", "C4", "C5 Aircross", "C5 X", "DS3", "DS4", "DS7"],
  "Toyota": ["Yaris", "Corolla", "C-HR", "RAV4", "Camry", "Prius", "Supra", "Land Cruiser"],
  "Honda": ["Jazz", "Civic", "Civic Type R", "HR-V", "CR-V", "e:Ny1"],
  "Ford": ["Fiesta", "Focus", "Focus ST", "Mustang", "Puma", "Kuga", "Mustang Mach-E"],
  "Hyundai": ["i10", "i20", "i30", "Kona", "Tucson", "Santa Fe", "Ioniq 5", "Ioniq 6"],
  "Kia": ["Picanto", "Ceed", "Sportage", "Sorento", "EV6", "EV9"],
  "Volvo": ["XC40", "XC60", "XC90", "V60", "V90", "S60", "S90", "EX30"],
  "Mini": ["Cooper", "Cooper S", "John Cooper Works", "Countryman", "Clubman"],
  "Fiat": ["500", "500X", "500e", "Panda", "Tipo"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale"],
  "Jaguar": ["F-Pace", "I-Pace", "XE", "XF"],
  "Land Rover": ["Defender", "Discovery", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar"],
  "Lexus": ["UX", "NX", "RX", "IS", "ES", "LC"],
  "Mazda": ["Mazda2", "Mazda3", "Mazda6", "CX-3", "CX-5", "CX-30", "MX-5"],
  "Nissan": ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Ariya", "GT-R"],
  "Opel": ["Corsa", "Astra", "Mokka", "Grandland", "Crossland"],
  "Seat": ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco"],
  "Skoda": ["Fabia", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Enyaq"],
  "Cupra": ["Leon", "Formentor", "Born", "Ateca"],
  "Dacia": ["Sandero", "Duster", "Spring", "Jogger"],
};

export const BRANDS = Object.keys(BRAND_MODELS).sort();