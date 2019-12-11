import { PDFAnnotationData } from 'pdfjs-dist';
import { CheckBox } from './check-box';
import { ChoiceBox } from './choice-box';
import { PushButton } from './push-button';
import { RadioButton } from './radio-button';
import { TextBox } from './text-box';

export interface IOriginalAnnotation extends PDFAnnotationData {
  annotationFlags: number;
  borderStyle: {
    width: number;
    style: number;
    dashArray: number[];
    horizontalCornerRadius: number;
    verticalCornerRadius: number;
  };
  color: number[];
  hasAppearance: boolean;
  id: string;
  rect: number[];
  subtype: string;
  annotationType: number;
  fieldName: string;
  fieldValue: string | string[];
  buttonValue: string;
  alternativeText: string;
  defaultAppearance: string;
  fieldType: string;
  fieldFlags: number;
  readOnly: boolean;
  textAlignment: number;
  maxLen: number;
  multiLine: boolean;
  multiSelect: boolean;
  comb: boolean;
  combo: boolean;
  checkBox: boolean;
  radioButton: boolean;
  pushButton: boolean;
  exportValue: string;
  options: [
    {
      exportValue: string;
      displayValue: string
    }
  ];
}

export interface IAnnotation {
  checkBox: CheckBox[],
  choiceBox: ChoiceBox[],
  pushButton: PushButton[],
  radioButton: RadioButton[],
  textBox: TextBox[]
}
