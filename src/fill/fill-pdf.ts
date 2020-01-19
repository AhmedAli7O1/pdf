import hummus from 'hummus';
import { IPageDrawing, drawAndModifyPdf } from './images';
import { IFillFormData, IFillFormOptions, fillForm } from './form-data';

export interface IFillForm {
  data: IFillFormData;
  options?: IFillFormOptions;
}

export function fillPdf(targetPath: string, fillingForm?: IFillForm, images?: IPageDrawing[]): void {
  const pdfWriter = hummus.createWriterToModify(targetPath, { modifiedFilePath: targetPath });

  if (fillingForm) {
    fillForm(pdfWriter, fillingForm.data, fillingForm.options);
  }

  if (images && images.length) {
    drawAndModifyPdf(pdfWriter, images);
  }

  pdfWriter.end();
}
