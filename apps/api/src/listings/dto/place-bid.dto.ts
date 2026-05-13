import { IsNumber, Min } from 'class-validator'

export class PlaceBidDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number
}
