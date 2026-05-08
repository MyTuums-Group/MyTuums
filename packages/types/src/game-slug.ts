declare const __brand: unique symbol;
export type GameSlug = string & { [__brand]: "GameSlug" };
