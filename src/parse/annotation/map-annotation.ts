import { PDFPageViewport } from 'pdfjs-dist';
import { IAnnotation, IOriginalAnnotation } from './interfaces';
import { RadioButton } from './radio-button';
import { CheckBox } from './check-box';
import { PushButton } from './push-button';
import { TextBox } from './text-box';
import { ChoiceBox } from './choice-box';

export function mapAnnotations (originalAnnotations: IOriginalAnnotation[], viewport: PDFPageViewport): IAnnotation {
  const annotations: IAnnotation = {
    radioButton: [],
    checkBox: [],
    choiceBox: [],
    pushButton: [],
    textBox: []
  };

  originalAnnotations.forEach(oAnnotation => {
    if (oAnnotation.fieldType === 'Btn') {
      if (oAnnotation.radioButton) {
        annotations.radioButton.push(new RadioButton(oAnnotation, viewport));
      }
      if (oAnnotation.checkBox) {
        const found = originalAnnotations.filter(x => x.fieldName === oAnnotation.fieldName);
        return found.length > 1 ?
          annotations.radioButton.push(new RadioButton(oAnnotation, viewport)) :
          annotations.checkBox.push(new CheckBox(oAnnotation, viewport));
      }
      else if (oAnnotation.pushButton) {
        annotations.pushButton.push(new PushButton(oAnnotation, viewport));
      }
    }
    else if (oAnnotation.fieldType === 'Tx') {
      annotations.textBox.push(new TextBox(oAnnotation, viewport));
    }
    else if (oAnnotation.fieldType === 'Ch') {
      annotations.choiceBox.push(new ChoiceBox(oAnnotation, viewport));
    }
  });

  return annotations;
}
