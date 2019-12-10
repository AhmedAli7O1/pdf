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

export interface IPageSize {
  top: number;
  left: number;
  width: number;
  height: number;
}
