declare const __brand: unique symbol;
export type CommentBody = string & { [__brand]: "CommentBody" };
