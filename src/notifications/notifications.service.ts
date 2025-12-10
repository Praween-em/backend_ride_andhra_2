import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  sendRideUpdate(rideId: string, status: string, ride: any) {
    this.notificationsGateway.sendRideUpdate(rideId, status, ride);
  }
}
