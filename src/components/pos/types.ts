export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  sale_price: string;
  tracking_mode: "none" | "lot" | "serial";
};

export type PosWarehouse = { id: string; code: string; name: string; is_active: boolean };
export type PosCustomer = { id: string; code: string; name: string; tax_id?: string | null; email?: string | null; phone?: string | null };
export type PosPaymentMethod = "cash" | "visa" | "mastercard" | "yape" | "plin";
export type PosPaymentMethodConfig = { id: string; method: PosPaymentMethod; cash_account_id: string; is_active: boolean };
export type PosCartLine = { product: PosProduct; quantity: number; serialText: string };
export type PosTender = { method: PosPaymentMethod; amount: number; reference: string };
export type PosCheckoutResult = {
  sale_id: string;
  sale_number: string;
  ticket_number: string;
  document_type: "ticket" | "01" | "03";
  customer_id: string;
  customer_identified: boolean;
  total: string;
  tender_total: string;
  balance_amount: string;
  payment_numbers: string[];
  electronic_document_status: "not_requested" | "pending_reservation";
};
