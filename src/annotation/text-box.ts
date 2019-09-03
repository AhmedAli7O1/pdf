import {Annotation} from "./annotation";
import {IOriginalAnnotation} from "./original-annotation.interface";
import {PDFPageViewport} from "pdfjs-dist";

export class TextBox extends Annotation {

  alternativeText: string;
  comb: boolean;
  textAlignment: number;
  maxLength: number;
  multiLine: boolean;

  constructor(originalAnnotation: IOriginalAnnotation, viewPort: PDFPageViewport) {
    super(originalAnnotation, viewPort);
    this.alternativeText = originalAnnotation.alternativeText;
    this.comb = originalAnnotation.comb;
    this.textAlignment = originalAnnotation.textAlignment;
    this.maxLength = originalAnnotation.maxLen;
    this.multiLine = originalAnnotation.multiLine;

  }
}
