import {
  Controller,
  Get,
  UseGuards,
  Req,
  Param,
  Post,
  Body,
  Patch,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Request } from 'express';
import { Ride, VehicleType } from './ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    phoneNumber: string;
    roles: UserRole[];
    [key: string]: any;
  };
}

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) { }

  @Post('fare')
  getFare(
    @Body()
    body: { distance: number; duration: number; vehicleType: string },
  ) {
    const vehicleType = body.vehicleType.replace('-', '_').toLowerCase() as VehicleType;
    return this.ridesService.calculateFare(
      body.distance,
      body.duration,
      vehicleType,
    );
  }

  @Post()
  @Roles(UserRole.RIDER)
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createRideDto: CreateRideDto, @Req() req: AuthenticatedRequest) {
    console.log('Received ride data:', createRideDto);
    return this.ridesService.createRide({ ...createRideDto, rider_id: req.user.id });
  }

  @Get('my-rides')
  getMyRides(@Req() req: AuthenticatedRequest) {
    return this.ridesService.getMyRides(req.user.id);
  }

  @Get(':id')
  getRideById(@Param('id') id: string) {
    return this.ridesService.getRideById(id);
  }

  @Patch(':id/accept')
  @Roles(UserRole.DRIVER)
  acceptRide(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const driverId = req.user.id;
    return this.ridesService.acceptRide(id, driverId);
  }

  @Patch(':id/cancel')
  cancelRide(@Param('id') id: string) {
    return this.ridesService.cancelRide(id);
  }
}
