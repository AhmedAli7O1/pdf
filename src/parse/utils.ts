import {PDFPromise} from "pdfjs-dist";

const pixelPerGrid = 24;

export function pdfPromise <T>(pdfPromise: PDFPromise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pdfPromise.then(
      (res: T) => { resolve(res); },
      (err: any) => { reject(err); }
    );
  });
}


export function toFormPoint(viewport: number) {
  return toFixedFloat(viewport / pixelPerGrid);
}

export function toFixedFloat(fNum: number) {
  return parseFloat(fNum.toFixed(3));
}
