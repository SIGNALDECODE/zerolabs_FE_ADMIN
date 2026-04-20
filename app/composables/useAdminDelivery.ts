export interface Carrier {
  id: number
  code?: string
  name: string
}

export interface TrackingEvent {
  status: string
  statusCode?: string
  location?: string
  description?: string
  trackedAt: string
}

export interface ShipmentTracking {
  shipmentId: number
  trackingNumber?: string
  carrierName?: string
  carrierCode?: string
  status?: string
  deliveryStatusCode?: string
  lastUpdated?: string
  events?: TrackingEvent[]
}

export interface ShipmentCreateBody {
  carrierId: number
  trackingNumber: string
  items: Array<{ orderItemId: number, quantity: number }>
}

export const useAdminDelivery = () => {
  const api = useApi()

  return {
    carriers: () => api.get<Carrier[]>('/admin/delivery/carriers'),
    createShipment: (orderId: number, body: ShipmentCreateBody) =>
      api.post<{ shipmentId: number }>(`/admin/delivery/orders/${orderId}/shipments`, body),

    tracking: (shipmentId: number) => api.get<ShipmentTracking>(`/admin/delivery/track/shipment/${shipmentId}`),
    trackingByOrder: (orderId: number) => api.get<ShipmentTracking[] | ShipmentTracking>(`/admin/delivery/track/order/${orderId}`),
    refreshTracking: (shipmentId: number) =>
      api.post<void>(`/admin/delivery/track/shipment/${shipmentId}/refresh`),
    refreshTrackingByOrder: (orderId: number) =>
      api.post<void>(`/admin/delivery/track/order/${orderId}/refresh`)
  }
}
