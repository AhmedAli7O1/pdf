import hummus from 'hummus';
import { IImageInfo, IPageDrawing } from './interfaces';
import constants from './constants';

const { IS_IMAGE_INDEPENDENT_OF_EXISTING_GRAPHICS_STATE } = constants;

function drawImageInPdf(context: any, drawingImage: IImageInfo): void {
  const { imgPath, position, transformation } = drawingImage;
  const options = (transformation) ? { transformation } : undefined;

  context.drawImage(position.left, position.bottom, imgPath, options);
}

export function drawAndModifyPdf(pdfWriter: any, drawings: IPageDrawing[]): void {
  drawings.forEach(draw => {
    const pageModifier = new hummus.PDFPageModifier(pdfWriter, draw.pageIndex || 0, IS_IMAGE_INDEPENDENT_OF_EXISTING_GRAPHICS_STATE);
    const context = pageModifier.startContext().getContext();

    draw.images.forEach((image: IImageInfo) => drawImageInPdf(context, image));

    pageModifier.endContext().writePage();
  });
}
