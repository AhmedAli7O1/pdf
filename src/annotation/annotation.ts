import {PDFPageViewport} from "pdfjs-dist";
import { Size } from './size';
import { IOriginalAnnotation } from "./original-annotation.interface";
import {Position} from "./position";
import { toFormPoint } from '../utils';
import constants from "../constants";


export class Annotation {
  name: string;
  required: boolean;
  readonly: boolean;
  position: Position;
  size: Size;
  value: string;

  constructor(originalAnnotation: IOriginalAnnotation, viewport: PDFPageViewport) {
    this.name = originalAnnotation.fieldName;
    this.required = this.isRequired(originalAnnotation);
    this.readonly = originalAnnotation.readOnly;
    const { position, size } = this.getPosition(originalAnnotation, viewport);
    this.position = position;
    this.size = size;

    if (Array.isArray(originalAnnotation.fieldValue)) {
      this.value = originalAnnotation.fieldValue[0];
    }
    else {
      this.value = <any>originalAnnotation.fieldValue;
    }
  }

  isRequired(originalAnnotation: IOriginalAnnotation) {
    let attributeMask = 0;

    if (originalAnnotation.fieldFlags & 0x00000002) {
      attributeMask |= constants.kFBARequired;
    }

    return attributeMask === 16;
  }

  private getPosition (originalAnnotation: IOriginalAnnotation, viewport: PDFPageViewport) {
    const fieldRect = viewport.convertToViewportRectangle(originalAnnotation.rect);
    const rect = this.normalizeRect(fieldRect);

    let height = rect[3] - rect[1];
    if (originalAnnotation.fieldType === 'Tx') {
      if (height > constants.kMinHeight + 2) {
        rect[1] += 2;
        height -= 2;
      }
    }
    else if (originalAnnotation.fieldType !== 'Ch') { //checkbox, radio button, and link button
      rect[1] -= 3;
    }

    height = (height >= constants.kMinHeight) ? height : constants.kMinHeight;

    return {
      position: new Position(
        toFormPoint(rect[0]),
        toFormPoint(rect[1])
      ),
      size: new Size(
        toFormPoint(rect[2] - rect[0]),
        toFormPoint(height)
      )
    };
  }

  private normalizeRect(rect: number[]) {
    let r = rect.slice(0);
    if (rect[0] > rect[2]) {
      r[0] = rect[2];
      r[2] = rect[0];
    }
    if (rect[1] > rect[3]) {
      r[1] = rect[3];
      r[3] = rect[1];
    }
    return r;
  }
}
