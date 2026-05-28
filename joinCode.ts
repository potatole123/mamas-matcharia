const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_PATTERN = /^\d{6}$/;

export function validateJoinCode(joinCode: string): void {
  if (joinCode.length !== JOIN_CODE_LENGTH) {
    throw new Error(
      `Join code must be exactly ${JOIN_CODE_LENGTH} digits`,
    );
  }

  if (!JOIN_CODE_PATTERN.test(joinCode)) {
    throw new Error("Join code must contain only digits");
  }
}

export function isValidJoinCode(joinCode: string): boolean {
  try {
    validateJoinCode(joinCode);
    return true;
  } catch {
    return false;
  }
}
