declare const __brand: unique symbol;
export type Username = string & { [__brand]: "Username" };
