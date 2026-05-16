const CONFIRM_PASSWORD_MESSAGE =
  "Confirm your password before creating your account."
const PASSWORD_MISMATCH_MESSAGE = "Passwords do not match."

export type RegistrationPasswordConfirmationResult =
  | { ok: true; password: string }
  | { ok: false; message: string }

export function isRegistrationPasswordConfirmationBlocking(
  password: string,
  confirmPassword: string
) {
  return confirmPassword.length === 0 || password !== confirmPassword
}

export function getRegistrationPasswordConfirmationMessage(
  password: string,
  confirmPassword: string
) {
  if (password.length > 0 && confirmPassword.length === 0) {
    return CONFIRM_PASSWORD_MESSAGE
  }

  if (confirmPassword.length > 0 && password !== confirmPassword) {
    return PASSWORD_MISMATCH_MESSAGE
  }

  return null
}

export function validateRegistrationPasswordConfirmation(
  password: FormDataEntryValue | null,
  confirmPassword: FormDataEntryValue | null
): RegistrationPasswordConfirmationResult {
  const passwordValue = typeof password === "string" ? password : ""
  const confirmPasswordValue =
    typeof confirmPassword === "string" ? confirmPassword : ""

  if (confirmPasswordValue.length === 0) {
    return { ok: false, message: CONFIRM_PASSWORD_MESSAGE }
  }

  if (passwordValue !== confirmPasswordValue) {
    return { ok: false, message: PASSWORD_MISMATCH_MESSAGE }
  }

  return { ok: true, password: passwordValue }
}
