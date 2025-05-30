
export interface Delivery {
  id: string;
  providerName: string;
  date: string; // YYYY-MM-DD format
  quantity: number;
}

export interface VendorTotal {
  originalName: string;
  totalQuantity: number;
}

export interface Provider {
  id: string;
  name: string;
  address: string;
  phone: string;
}
