import hummus from 'hummus';
import { IImageInfo, IPdfPage, IPageDrawing } from './interfaces';
import constants from './constants';

const { IS_IMAGE_INDEPENDENT_OF_EXISTING_GRAPHICS_STATE, DEFAULT_PAGE_SIZE } = constants;

function drawImageInPdf(context: any, drawingImage: IImageInfo): void {
  const { imgPath, position, transformation } = drawingImage;
  const options = (transformation) ? { transformation } : undefined;

  context.drawImage(position.left, position.bottom, imgPath, options);
}

export function drawAndCreatePdf(targetPath: string, drawingImages: IImageInfo[], pdfPage?: IPdfPage): void {

  const pdfWriter = hummus.createWriter(targetPath);
  const { bottom, left, width, height } = pdfPage || DEFAULT_PAGE_SIZE;

  const page = pdfWriter.createPage(bottom, left, width, height);
  const context = pdfWriter.startPageContentContext(page);

  drawingImages.forEach(drawingImage => drawImageInPdf(context, drawingImage));

  pdfWriter.writePage(page);
  pdfWriter.end();
}

export function drawAndModifyPdf(targetPath: string, drawings: IPageDrawing[]): void {
  const pdfWriter = hummus.createWriterToModify(targetPath, { modifiedFilePath: targetPath });

  drawings.forEach(draw => {
    const pageModifier = new hummus.PDFPageModifier(pdfWriter, draw.pageIndex || 0, IS_IMAGE_INDEPENDENT_OF_EXISTING_GRAPHICS_STATE);
    const context = pageModifier.startContext().getContext();

    draw.images.forEach((image: IImageInfo) => drawImageInPdf(context, image));

    pageModifier.endContext().writePage();
  });

  pdfWriter.end();
}
