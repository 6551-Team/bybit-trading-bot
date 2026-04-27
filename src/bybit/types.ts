export type BybitRetCode = {
  retCode: number;
  retMsg: string;
  result?: unknown;
  time?: number;
};

export type KlineRow = {
  start: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  turnover: string;
};

export type PositionRow = {
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  positionIdx: number;
};
