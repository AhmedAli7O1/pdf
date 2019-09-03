import { CheckBox } from "./check-box";
import { ChoiceBox } from "./choice-box";
import { PushButton } from "./push-button";
import { RadioButton } from "./radio-button";
import { TextBox } from "./text-box";

export interface IAnnotation {
  checkBox: CheckBox[],
  choiceBox: ChoiceBox[],
  pushButton: PushButton[],
  radioButton: RadioButton[],
  textBox: TextBox[]
}
