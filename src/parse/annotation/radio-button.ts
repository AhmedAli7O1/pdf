import {Annotation} from './annotation';
import { IOriginalAnnotation } from './interfaces';
import {PDFPageViewport} from 'pdfjs-dist';

export class RadioButton extends Annotation {

  option: string;
  checked: boolean;

  constructor(originalAnnotation: IOriginalAnnotation, viewPort: PDFPageViewport) {
    super(originalAnnotation, viewPort);
    this.option = originalAnnotation.exportValue || originalAnnotation.buttonValue;
    this.checked = this.option === this.value;
  }
}
