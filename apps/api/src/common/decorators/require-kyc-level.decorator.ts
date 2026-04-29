import { SetMetadata } from '@nestjs/common'

export const KYC_LEVEL_KEY = 'kycLevel'
export const RequireKycLevel = (level: number): ReturnType<typeof SetMetadata> =>
  SetMetadata(KYC_LEVEL_KEY, level)
