import { eRangeTypeAll, eRangeTypeSpecific } from 'hummus';

export enum RangeType {
  allPages = eRangeTypeAll,
  SpecificRanges = eRangeTypeSpecific
}

export interface IMergingPdf {
  src: string | Buffer;
  pageRanges?: number[][];
}

export interface IPdfAppendOpts {
  type: RangeType;
  specificRanges?: number[][];
}
