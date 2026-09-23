import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CustomerDto {
  @ApiProperty() @IsString() @Length(2, 100) @Transform(trim) fullName!: string;
  @ApiProperty() @IsEmail() @MaxLength(254) @Transform(trim) email!: string;
  @ApiProperty() @IsString() @Matches(/^\d{10}$/) @Transform(({ value }) => typeof value === 'string' ? value.replace(/^\+57/, '').replace(/\s/g, '') : value) phone!: string;
}
export class AddressDto {
  @ApiProperty() @IsString() @Length(5, 160) @Transform(trim) addressLine1!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) @Transform(trim) addressLine2?: string;
  @ApiProperty() @IsString() @Length(2, 80) @Transform(trim) city!: string;
  @ApiProperty() @IsString() @Length(2, 80) @Transform(trim) region!: string;
  @ApiProperty() @IsIn(['CO']) country!: 'CO';
  @ApiProperty({ required: false }) @IsOptional() @Matches(/^\d{6}$/) postalCode?: string;
}
export class DraftCustomerDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) fullName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(254) email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) phone?: string;
}
export class DraftAddressDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) addressLine1?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) addressLine2?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) region?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsIn(['CO']) country?: 'CO';
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(6) postalCode?: string;
}
export class QuoteDto {
  @ApiProperty() @IsString() @Length(1, 100) productId!: string;
  @ApiProperty() @IsInt() @IsIn([1]) quantity!: 1;
}
export class CreateDto extends QuoteDto {
  @ApiProperty() @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) expectedTotalInCents!: number;
  @ApiProperty() @IsObject() @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @ApiProperty() @IsObject() @ValidateNested() @Type(() => AddressDto) delivery!: AddressDto;
}
export class DraftDto extends QuoteDto {
  @ApiProperty() @IsIn(['DETAILS', 'SUMMARY']) step!: 'DETAILS' | 'SUMMARY';
  @ApiProperty() @IsObject() @ValidateNested() @Type(() => DraftCustomerDto) customer!: DraftCustomerDto;
  @ApiProperty() @IsObject() @ValidateNested() @Type(() => DraftAddressDto) delivery!: DraftAddressDto;
}
export class PayDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(512) cardToken!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(36) installments!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(8192) acceptanceToken!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(8192) acceptPersonalAuth!: string;
}
export class EmptyDto {}
