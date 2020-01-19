interface IPosition {
  bottom: number;
  left: number;
}

interface ISize {
  width: number;
  height: number;
}

export interface IPdfPage extends IPosition, ISize {
}

interface ITransformation extends Partial<ISize> {
  proportional?: boolean;
}

export interface IImageInfo {
  imgPath: string;
  position: IPosition;
  transformation?: ITransformation;
  pageIndex?: number;
}

export interface IPageDrawing {
  images: IImageInfo[];
  pageIndex?: number;
}