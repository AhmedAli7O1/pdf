export interface IFillFormFile {
  filePath: string,
  options: {
    modifiedFilePath: string
  }
}

export interface IFillFormData {
  [key: string]: string | number | boolean;
}

export interface IFillFormOptions {
  defaultTextOptions?: {
    font: string;
    size: number,
    colorspace: string,
    color: number,
  },
  debug?: boolean
}
