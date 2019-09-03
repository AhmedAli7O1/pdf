import {Annotation} from "./annotation";
import {IOriginalAnnotation} from "./original-annotation.interface";
import {PDFPageViewport} from "pdfjs-dist";

export class CheckBox extends Annotation {
  checked: boolean;
  option: string;

  constructor(originalAnnotation: IOriginalAnnotation, viewPort: PDFPageViewport) {
    super(originalAnnotation, viewPort);
    this.option = originalAnnotation.exportValue || originalAnnotation.buttonValue;
    this.checked = this.option === this.value;
  }
}
