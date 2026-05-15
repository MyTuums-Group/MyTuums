import { env } from "@workspace/config";
import { staffService } from "../services/staff/staff.production.js";

const email = readEmailArg(process.argv.slice(2));

if (!email) {
  console.error("Usage: pnpm --filter @workspace/api owner:bootstrap -- --email owner@example.com");
  process.exitCode = 1;
} else {
  const result = await staffService.bootstrapOwner({
    email,
    secret: env.OWNER_BOOTSTRAP_SECRET ?? "",
    expectedSecret: env.OWNER_BOOTSTRAP_SECRET,
  });

  if (!result.ok) {
    console.error(`Owner bootstrap failed: ${result.error.kind}`);
    process.exitCode = 1;
  } else if (result.value.alreadyOwner) {
    console.log(`Owner already bootstrapped for ${email}.`);
  } else {
    console.log(`Owner bootstrapped for ${email}.`);
  }
}

function readEmailArg(args: string[]): string | null {
  const emailFlagIndex = args.indexOf("--email");
  if (emailFlagIndex >= 0) {
    return args[emailFlagIndex + 1] ?? null;
  }

  return args[0] ?? null;
}
