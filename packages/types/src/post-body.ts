declare const __brand: unique symbol;
export type PostBody = string & { [__brand]: "PostBody" };
