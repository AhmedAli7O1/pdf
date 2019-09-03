import {IAnnotation} from "./annotation/annotation.interface";
import {Viewport} from "./viewport";

export interface IPage {
  pageNumber: number;
  viewport: Viewport;
  annotation: IAnnotation;
}
