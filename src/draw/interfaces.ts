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

export interface IDrawingImage {
  imgPath: string;
  position: IPosition;
  transformation?: ITransformation;
}
