import { Viewport } from './viewport';
import { IAnnotation } from './annotation';

export interface IPageExtract {
  images: boolean;
}

export interface IPageOptions {
  scale: number;
  extract: {
    images: boolean;
    imageMagic: { [key: string]: string };
  };
}

export interface IPage {
  pageNumber: number;
  viewport: Viewport;
  annotation: IAnnotation;
}
