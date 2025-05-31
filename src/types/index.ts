
export interface Delivery {
  id: string;
  providerName: string; // Consider changing to providerId if linking directly
  date: string; // YYYY-MM-DD format
  quantity: number;
}

export interface VendorTotal {
  originalName: string; // To keep the exact name used in entries
  totalQuantity: number;
}

export interface Provider {
  id: string;
  name: string;
  address: string;
  phone: string;
  price: number; // Precio unitario al que se le compra al proveedor
}
