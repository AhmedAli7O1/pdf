import {Annotation} from './annotation';
import { IOriginalAnnotation } from './interfaces';
import {PDFPageViewport} from 'pdfjs-dist';

export class PushButton extends Annotation {

  alternativeText: string;

  constructor(originalAnnotation: IOriginalAnnotation, viewPort: PDFPageViewport) {
    super(originalAnnotation, viewPort);
    this.alternativeText = originalAnnotation.alternativeText;
  }
}
