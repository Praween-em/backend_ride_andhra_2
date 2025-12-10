import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    name: string;
}
