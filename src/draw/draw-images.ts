import hummus from 'hummus';
import { IDrawingImage, IPdfPage } from './interfaces';
import constants from './constants';

const { IS_IMAGE_INDEPENDENT_OF_EXISTING_GRAPHICS_STATE, DEFAULT_PAGE_SIZE } = constants;

function drawImageInPdf(context: any, drawingImage: IDrawingImage): void {
  const { imgPath, position, transformation } = drawingImage;
  const options = (transformation) ? { transformation } : undefined;

  context.drawImage(position.bottom, position.left, imgPath, options);
}

export function drawAndCreatePdf(targetPath: string, drawingImages: IDrawingImage[], pdfPage?: IPdfPage): void {

  const pdfWriter = hummus.createWriter(targetPath);
  const { bottom, left, width, height } = pdfPage || DEFAULT_PAGE_SIZE;

  const page = pdfWriter.createPage(bottom, left, width, height);
  const context = pdfWriter.startPageContentContext(page);

  drawingImages.forEach(drawingImage => drawImageInPdf(context, drawingImage));

  pdfWriter.writePage(page);
  pdfWriter.end();
}

export function drawAndModifyPdf(targetPath: string, drawingImages: IDrawingImage[], pageIndex: number = 0): void {

  const pdfWriter = hummus.createWriterToModify(targetPath, { modifiedFilePath: targetPath });
  const pageModifier = new hummus.PDFPageModifier(pdfWriter, pageIndex, IS_IMAGE_INDEPENDENT_OF_EXISTING_GRAPHICS_STATE);

  const context = pageModifier.startContext().getContext();

  drawingImages.forEach(drawingImage => drawImageInPdf(context, drawingImage));

  pageModifier.endContext().writePage();
  pdfWriter.end();
}
