export const CUP_SIZE = ["large", "small"] as const;
export type CupSize = (typeof CUP_SIZE)[number];

export const TEMP = ["hot", "iced"] as const;
export type Temp = (typeof TEMP)[number];

export const ICE_LEVEL = ["none", "light", "regular"] as const;
export type IceLevel = (typeof ICE_LEVEL)[number];

export const MATCHA = ["regular", "premium", "super premium"] as const;
export type Matcha = (typeof MATCHA)[number];

export const MILK = ["whole", "oat", "soy", "almond", "none"] as const;
export type Milk = (typeof MILK)[number];

export const FLAVOR = ["strawberry", "mango", "pandan", "none"] as const;
export type Flavor = (typeof FLAVOR)[number];

export const SWEETENER = ["honey", "agave", "equal", "none"] as const;
export type Sweetener = (typeof SWEETENER)[number];

export const SWEETNESS_LEVEL = ["none", "less", "perfect", "extra"] as const;
export type SweetnessLevel = (typeof SWEETNESS_LEVEL)[number];

export const CREAM_TOP = ["matcha", "ube", "vanilla", "yuzu", "none"] as const;
export type CreamTop = (typeof CREAM_TOP)[number];

export const POWDER = ["matcha", "hojicha", "kinako", "black sesame", "none"] as const;
export type Powder = (typeof POWDER)[number];

export const STATUS = ["waiting", "in_progress", "served", "expired"] as const;
export type Status = (typeof STATUS)[number];