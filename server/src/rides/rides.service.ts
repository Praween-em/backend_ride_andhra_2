import { Injectable, ConflictException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { Ride, RideStatus } from './entities/ride.entity';
import { FareSetting, VehicleType } from './entities/fare-setting.entity';
import { RideRejection } from './entities/ride-rejection.entity';
import { Driver } from '../profile/entities/driver.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DriverSubscription } from '../profile/entities/driver-subscription.entity';
import { FareTier } from './entities/fare-tier.entity';
import { MoreThan } from 'typeorm';

@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(RideRejection)
    private readonly rideRejectionRepository: Repository<RideRejection>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(FareSetting)
    private readonly fareSettingRepository: Repository<FareSetting>,
    @InjectRepository(FareTier)
    private readonly fareTierRepository: Repository<FareTier>,
    private readonly entityManager: EntityManager,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) { }

  async create(createRideDto: CreateRideDto, userId?: string): Promise<Ride> {
    // Map fields for compatibility between Rider and Driver apps
    const rideData: any = {
      ...createRideDto,
      riderId: userId || createRideDto.riderId,
      pickupLocation: createRideDto.pickupLocation || createRideDto.pickup_address,
      pickupLatitude: createRideDto.pickupLatitude || createRideDto.pickup_latitude,
      pickupLongitude: createRideDto.pickupLongitude || createRideDto.pickup_longitude,
      dropoffLocation: createRideDto.dropoffLocation || createRideDto.dropoff_address,
      dropoffLatitude: createRideDto.dropoffLatitude || createRideDto.dropoff_latitude,
      dropoffLongitude: createRideDto.dropoffLongitude || createRideDto.dropoff_longitude,
      vehicleType: createRideDto.vehicleType || createRideDto.vehicle_type,
      status: RideStatus.PENDING,
    };

    const newRide = this.rideRepository.create(rideData as Partial<Ride>);
    const savedRide = await this.rideRepository.save(newRide);

    // Immediately notify the first available driver
    setImmediate(async () => {
      try {
        await this.notifyNextDriver(savedRide.id);
      } catch (error) {
        console.error('Error in initial driver notification:', error);
      }
    });

    return savedRide;
  }

  async findAll(): Promise<Ride[]> {
    return this.rideRepository.find();
  }

  async findOne(id: string): Promise<Ride> {
    return this.rideRepository.findOne({ where: { id }, relations: ['user', 'driver', 'driver.user'] });
  }

  async update(id: string, updateRideDto: UpdateRideDto): Promise<Ride> {
    const ride = await this.findOne(id);
    if (!ride) {
      return null;
    }
    ride.status = updateRideDto.status;
    return this.rideRepository.save(ride);
  }

  async cancelRide(rideId: string): Promise<Ride> {
    const ride = await this.findOne(rideId);
    if (!ride) throw new NotFoundException('Ride not found');

    ride.status = RideStatus.CANCELLED;
    ride.cancelledAt = new Date();
    // Logic for cancellation reason/fee could be added here
    return this.rideRepository.save(ride);
  }

  async getMyRides(userId: string): Promise<Ride[]> {
    return this.rideRepository.find({
      where: { riderId: userId },
      relations: ['driver', 'driver.user'],
      order: { createdAt: 'DESC' }
    });
  }

  async calculateFare(
    distanceKm: number,
    durationMin: number,
    vehicleTypeStr: string,
  ): Promise<number> {
    console.log(`[CalculateFare] Start: ${vehicleTypeStr}, Dist: ${distanceKm}, Dur: ${durationMin}`);
    try {
      // Normalize vehicle type
      const vehicleType = vehicleTypeStr.toLowerCase().replace('-', '_') as VehicleType;
      console.log(`[CalculateFare] Normalized type: ${vehicleType}`);

      const settings = await this.fareSettingRepository.findOne({
        where: { vehicle_type: vehicleType, is_active: true }
      });

      if (!settings) {
        console.warn(`[CalculateFare] No fare settings found for ${vehicleType}. Using default/zero.`);
        return 0;
      }
      console.log(`[CalculateFare] Found settings:`, settings);

      // Explicitly parse decimals to avoid string concatenation issues
      const baseFare = Number(settings.base_fare);
      const perKm = Number(settings.per_km_rate);
      const perMin = Number(settings.per_minute_rate);
      const minFare = Number(settings.minimum_fare);
      const surge = Number(settings.surge_multiplier || 1);

      let fare = baseFare;

      // Check for tiered pricing
      console.log(`[CalculateFare] Checking tiers for vehicle type: ${vehicleType}`);
      const tiers = await this.fareTierRepository.find({
        where: { fareSetting: { vehicle_type: vehicleType as any } },
        order: { km_from: 'ASC' }
      });
      console.log(`[CalculateFare] Found ${tiers.length} tiers`);

      if (tiers.length > 0) {
        let remainingDistance = distanceKm;
        let totalTierCost = 0;

        for (const tier of tiers) {
          if (remainingDistance <= 0) break;

          const distanceInTier = Math.min(remainingDistance, Number(tier.km_to) - Number(tier.km_from));
          totalTierCost += distanceInTier * Number(tier.per_km_rate);
          remainingDistance -= distanceInTier;
        }

        // If there's still distance left after the last tier, use the base per_km_rate
        if (remainingDistance > 0) {
          totalTierCost += remainingDistance * perKm;
        }
        fare += totalTierCost;
      } else {
        // Linear calculation fallback
        fare += (distanceKm * perKm);
      }

      fare += (durationMin * perMin);
      fare = Math.max(fare, minFare);
      fare = fare * surge;

      const finalFare = Number(fare.toFixed(2));
      console.log(`[CalculateFare] Final Fare: ${finalFare}`);
      return finalFare;

    } catch (error) {
      console.error('[CalculateFare] Error:', error);
      throw error;
    }
  }

  /**
   * Calculate fare estimates for all active vehicle types
   */
  async getFareEstimates(distanceKm: number, durationMin: number): Promise<any[]> {
    const settings = await this.fareSettingRepository.find({ where: { is_active: true } });
    const estimates = [];

    for (const setting of settings) {
      try {
        const fare = await this.calculateFare(distanceKm, durationMin, setting.vehicle_type);
        estimates.push({
          vehicleType: setting.vehicle_type,
          fare: fare,
          estimatedDuration: durationMin // This could be VehicleType specific if we had average speeds
        });
      } catch (error) {
        console.error(`Error calculating fare for ${setting.vehicle_type}:`, error);
      }
    }
    return estimates;
  }

  /**
   * Find nearby available drivers within specified radius
   * 
   * Requirements for a driver to receive ride notification:
   * 1. Driver must be ONLINE (isOnline = true)
   * 2. Driver must have location data (latitude/longitude set)
   * 3. Driver must be within the specified radius
   * 4. Driver must NOT have rejected this specific ride
   * 5. Driver must NOT have any active ride (accepted or in_progress)
   * 
   * Returns drivers ordered by distance (closest first)
   */
  async findNearbyDrivers(
    pickupLat: number,
    pickupLng: number,
    radiusKm: number = 5,
    rideId?: string,
    requiredVehicleType?: string,
  ): Promise<Array<Driver & { distance: number }>> {
    let query = this.driverRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('driver.isOnline = :isOnline', { isOnline: true })
      .andWhere('driver.currentLatitude IS NOT NULL')
      .andWhere('driver.currentLongitude IS NOT NULL')
      .andWhere(
        `ST_DWithin(
          driver.currentLocation::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        {
          lat: pickupLat,
          lng: pickupLng,
          radius: radiusKm * 1000, // Convert km to meters
        },
      );

    // Filter by vehicle type if specified
    if (requiredVehicleType) {
      // Logic: 
      // - 'parcel' rides go to 'bike' drivers (plus maybe 'bike_lite' if it exists, matching user request "drivers with bikes only")
      // - 'auto' rides go to 'auto' drivers
      // - 'bike' rides go to 'bike' drivers
      // - 'car'/'cab' rides go to 'car' drivers

      let targetDriverVehicleTypes: string[] = [];

      switch (requiredVehicleType.trim().toLowerCase()) {
        case 'parcel':
          targetDriverVehicleTypes = ['bike'];
          break;
        case 'bike':
          targetDriverVehicleTypes = ['bike'];
          break;
        case 'auto':
          targetDriverVehicleTypes = ['auto'];
          break;
        case 'car':
        case 'cab':
        case 'premium': // Assuming premium maps to car or specific premium type, defaulting to car for now if generic
          targetDriverVehicleTypes = ['car', 'premium'];
          break;
        default:
          // Fallback to exact match
          targetDriverVehicleTypes = [requiredVehicleType.toLowerCase()];
      }

      if (targetDriverVehicleTypes.length > 0) {
        query = query.andWhere('LOWER(driver.vehicleType) IN (:...vehicleTypes)', { vehicleTypes: targetDriverVehicleTypes });
      }
    }

    // Exclude drivers who already rejected this ride
    if (rideId) {
      query = query.andWhere(
        `driver.user_id NOT IN (
          SELECT driver_id FROM ride_rejections WHERE ride_id = :rideId
        )`,
        { rideId },
      );
    }

    // CRITICAL: Exclude drivers who already have an active ride
    // A driver can only handle one ride at a time
    // We check if the driver's user_id is present in the rides table with any active status
    /* 
      We need to be very careful here. The relation is:
      Ride -> Driver (ManyToOne)
      Driver -> User (OneToOne)
      
      So a ride has a driver_id which refers to driver.user_id
    */
    query = query.andWhere(
      `driver.user_id NOT IN (
        SELECT "driver_id" FROM "rides" 
        WHERE "driver_id" IS NOT NULL 
        AND "status" IN ('pending', 'accepted', 'in_progress')
      )`
    );

    // Add distance calculation and order by distance
    query = query
      .addSelect(
        `ST_Distance(
          driver.currentLocation::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'distance',
      )
      .orderBy('distance', 'ASC');

    const drivers = await query.getRawAndEntities();

    // Map the distance to each driver entity
    return drivers.entities.map((driver, index) => ({
      ...driver,
      distance: drivers.raw[index].distance,
    }));
  }

  /**
   * Notify the next available driver for a ride
   * Returns the notified driver or null if no drivers available
   */
  async notifyNextDriver(rideId: string): Promise<Driver | null> {
    const ride = await this.findOne(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.PENDING) {
      console.log(`Ride ${rideId} is no longer pending, skipping notification`);
      return null;
    }

    // Find nearby drivers
    const nearbyDrivers = await this.findNearbyDrivers(
      parseFloat(ride.pickupLatitude.toString()),
      parseFloat(ride.pickupLongitude.toString()),
      5, // 5km radius
      rideId,
      ride.vehicleType // Pass vehicle type for filtering
    );

    if (nearbyDrivers.length === 0) {
      console.log(`No available drivers found for ride ${rideId}`);
      // TODO: Notify user that no drivers are available
      return null;
    }

    // Get the closest driver
    const driver = nearbyDrivers[0];
    console.log(`Notifying driver ${driver.user_id} for ride ${rideId}, distance: ${driver.distance}m`);

    // Send push notification to driver
    await this.notificationsService.sendRideNotificationToDriver(driver, ride);

    return driver;
  }

  async acceptRide(rideId: string, userId: string): Promise<Ride> {
    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const ride = await transactionalEntityManager.findOne(Ride, {
        where: { id: rideId },
        relations: ['user', 'driver'],
      });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      if (ride.status !== RideStatus.PENDING) {
        throw new ConflictException('Ride has already been accepted.');
      }

      const driver = await transactionalEntityManager.findOne(Driver, {
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      // Check for active subscription
      const subscription = await transactionalEntityManager.findOne(DriverSubscription, {
        where: {
          driverId: userId,
          status: 'active',
          endDate: MoreThan(new Date())
        }
      });

      if (!subscription) {
        throw new ConflictException('Active subscription required to accept rides.');
      }

      ride.driver = driver;
      ride.status = RideStatus.ACCEPTED;

      const savedRide = await transactionalEntityManager.save(ride);

      // Notify user that driver accepted
      await this.notificationsService.notifyUserRideAccepted(ride.user.id, savedRide, driver);

      return savedRide;
    });
  }

  async declineRide(rideId: string, userId: string): Promise<any> {
    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const ride = await transactionalEntityManager.findOne(Ride, { where: { id: rideId } });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      const driver = await transactionalEntityManager.findOne(Driver, {
        where: { user: { id: userId } }
      });

      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      // Record the rejection
      const rejection = transactionalEntityManager.create(RideRejection, {
        ride,
        driver,
      });
      await transactionalEntityManager.save(rejection);

      console.log(`Driver ${userId} declined ride ${rideId}`);

      // Notify next available driver (outside transaction to avoid blocking)
      setImmediate(async () => {
        try {
          await this.notifyNextDriver(rideId);
        } catch (error) {
          console.error('Error notifying next driver:', error);
        }
      });

      return { message: 'Ride declined. Notifying next driver.' };
    });
  }

  async getPendingRidesForDriver(userId: string): Promise<Ride[]> {
    // For now, return all pending rides
    // In production, you might want to track which drivers were notified
    return this.rideRepository.find({
      where: { status: RideStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCurrentRide(driverId: string): Promise<Ride | null> {
    const driver = await this.driverRepository.findOne({ where: { user: { id: driverId } } });
    if (!driver) return null;

    return this.rideRepository.findOne({
      where: [
        { driver: { user_id: driver.user_id }, status: RideStatus.ACCEPTED },
        { driverId: driver.user_id, status: RideStatus.ACCEPTED },
        { driver: { user_id: driver.user_id }, status: RideStatus.IN_PROGRESS },
        { driverId: driver.user_id, status: RideStatus.IN_PROGRESS },
      ],
      relations: ['user'],
    });
  }

  async getDriverRideHistory(userId: string): Promise<Ride[]> {
    const driver = await this.driverRepository.findOne({ where: { user: { id: userId } } });
    if (!driver) {
      // If user is not a driver, return empty or throw error? 
      // For now return empty as they might just be a registered user checking history
      return [];
    }

    return this.rideRepository.find({
      where: [
        { driver: { user_id: driver.user_id } },
        { driverId: driver.user_id }
      ],
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  async startRide(rideId: string, driverId: string, pin: string): Promise<Ride> {
    const ride = await this.findOne(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.ACCEPTED) {
      throw new ConflictException(`Cannot start ride. Status is ${ride.status}`);
    }

    // Verify driver
    if (ride.driverId !== driverId && ride.driver?.user_id !== driverId) {
      // Check if the authenticated user is actually the driver
      const driver = await this.driverRepository.findOne({ where: { user: { id: driverId } } });
      if (!driver || (ride.driverId !== driver.user_id)) {
        throw new ConflictException('You are not the assigned driver for this ride');
      }
    }

    // Verify PIN
    // DEBUG LOGS
    const expectedPin = String(ride.user.ridePin || '').trim();
    const receivedPin = String(pin || '').trim();

    console.log(`[StartRide] Verifying PIN for ride ${ride.id}`);
    console.log(`[StartRide] Expected (Rider): '${expectedPin}' (Type: ${typeof ride.user.ridePin}), Received (Driver Input): '${receivedPin}' (Type: ${typeof pin})`);
    console.log(`[StartRide] Match Result: ${expectedPin === receivedPin}`);

    if (!expectedPin) {
      // Fallback if user has no PIN set yet
      console.warn(`User ${ride.user.id} has no PIN set. Allowing start without PIN verification.`);
    } else if (expectedPin !== receivedPin) {
      throw new BadRequestException(`Invalid PIN. Expected: ${expectedPin}, Received: ${receivedPin}`);
    }
    ride.status = RideStatus.IN_PROGRESS;
    ride.startedAt = new Date();

    const savedRide = await this.rideRepository.save(ride);

    // Notify user
    this.notificationsService.notifyUserRideStarted(ride.user.id, savedRide);

    return savedRide;
  }

  async completeRide(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.findOne(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new ConflictException(`Cannot complete ride. Status is ${ride.status}`);
    }

    // Verify driver logic (similar to startRide)
    const driver = await this.driverRepository.findOne({ where: { user: { id: driverId } } });
    if (!driver || (ride.driverId !== driver.user_id && ride.driver?.user_id !== driver.user_id)) {
      throw new ConflictException('You are not the assigned driver for this ride');
    }

    ride.status = RideStatus.COMPLETED;
    ride.completedAt = new Date();

    // Calculate final fare (Stub - ideally use distance/time)
    // For now, keep the estimated fare or implement logic here
    if (!ride.finalFare) {
      // Calculate actual fare based on recorded start/complete times and distance
      // If actualDistance is not set (e.g. from frontend), fallback to distance (estimated)
      const distance = Number(ride.actualDistance || ride.distance || 0);

      // Calculate duration in minutes from timestamps
      let duration = ride.actualDuration;
      if (!duration && ride.startedAt && ride.completedAt) {
        const diffMs = ride.completedAt.getTime() - ride.startedAt.getTime();
        duration = Math.ceil(diffMs / (1000 * 60));
      }
      duration = Number(duration || ride.duration || 0);

      try {
        const calculated = await this.calculateFare(distance, duration, ride.vehicleType);
        if (calculated > 0) {
          ride.finalFare = calculated;
        } else {
          ride.finalFare = ride.fare; // Fallback to estimated
        }
      } catch (e) {
        console.error("Fare calculation error:", e);
        ride.finalFare = ride.fare;
      }
    }

    const savedRide = await this.rideRepository.save(ride);

    // Update driver stats
    driver.totalRides = (driver.totalRides || 0) + 1;
    driver.earningsTotal = Number(driver.earningsTotal || 0) + Number(ride.finalFare || 0);
    await this.driverRepository.save(driver);

    // Notify user
    this.notificationsService.notifyUserRideCompleted(ride.user.id, savedRide);

    return savedRide;
  }

  async getHighBookingZones(): Promise<string[]> {
    try {
      // Raw SQL to group by pickup address and count occurrences in the last 7 days
      // We limit to top 5 locations
      const result = await this.rideRepository.query(`
        SELECT pickup_address, COUNT(*) as count
        FROM rides
        WHERE created_at >= NOW() - INTERVAL '7 days'
        AND pickup_address IS NOT NULL
        GROUP BY pickup_address
        ORDER BY count DESC
        LIMIT 5
      `);

      // Map the result to an array of address strings
      return result.map((row: any) => {
        // Simple cleanup: take the first part of the address (e.g., "Main St, City" -> "Main St")
        // This is a basic heuristic; can be improved with better address parsing
        const fullAddress = row.pickup_address;
        if (!fullAddress) return '';

        const parts = fullAddress.split(',');
        // If address has multiple parts, take first two for better context, else take the whole thing
        return parts.length > 1 ? `${parts[0].trim()}, ${parts[1].trim()}` : fullAddress.trim();
      }).filter((addr: string) => addr.length > 0);

    } catch (error) {
      console.error('Error fetching high booking zones:', error);
      return []; // Return empty array on error to prevent crashing
    }
  }
}
