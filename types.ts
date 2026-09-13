
export interface HistoryItem {
  timestamp: string;
  from: string;
  to: string;
  amount: number;
  converted: number;
  rate: string;
}

export interface Currency {
  code: string;
  name: string;
  flag: string;
}
