import { toFormPoint } from './utils';

export class Viewport {

  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;

  constructor(pdfViewport: any) {
    this.scale = pdfViewport.scale;
    this.rotation = pdfViewport.rotation;
    this.offsetX = pdfViewport.offsetX;
    this.offsetY = pdfViewport.offsetY;
    this.width = toFormPoint(pdfViewport.width);
    this.height = toFormPoint(pdfViewport.height)
  }
}
