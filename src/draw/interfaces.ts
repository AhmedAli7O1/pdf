interface ITransformation {
  width?: number;
  height?: number;
  proportional?: boolean;
}

export interface IDrawingImage {
  bottom: number;
  left: number;
  imgPath: string;
  transformation?: ITransformation;
}
