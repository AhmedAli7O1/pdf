import {Annotation} from "./annotation";
import {IOriginalAnnotation} from "./original-annotation.interface";
import {PDFPageViewport} from "pdfjs-dist";


export class ChoiceBox extends Annotation {

  alternativeText: string;
  values: string[];
  options: IChoiceOption[];
  multiSelect: boolean;
  combo: boolean;

  constructor(originalAnnotation: IOriginalAnnotation, viewPort: PDFPageViewport) {
    super(originalAnnotation, viewPort);
    this.alternativeText = originalAnnotation.alternativeText;
    this.options = this.mapOptions(originalAnnotation);
    this.multiSelect = originalAnnotation.multiSelect;
    this.values = <any>originalAnnotation.fieldValue;
    this.combo = originalAnnotation.combo;
  }

  private mapOptions(originalAnnotation: IOriginalAnnotation) {
    if (originalAnnotation.options.length) {
      return originalAnnotation.options.map(op => {
        return {
          option: op.exportValue,
          display: op.displayValue
        };
      });
    }
    else {
      return [];
    }
  }
}

export interface IChoiceOption {
  option: string;
  display: string
}

